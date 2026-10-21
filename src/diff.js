import { spawn } from 'node:child_process';
import { existsSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import * as ansi from './ansi.js';
import * as cli from './cli.js';
import * as crypto from './crypto.js';
import config from './config.js';
import debug from './debug.js';

/**
 * Computes a unified diff based on the dry-run output and command options. Invokes a single
 * round-trip to the server, sending a tarball of the files in the dry-run and piping through
 * a collection of diff commands on the server.
 *
 * @param {String} dryRunOutput
 * @param {{
 *     interactive: Boolean,
 *     colorize: Boolean,
 * }} options
 */
export default async function diff(dryRunOutput, options) {
    // Default options
    options = {
        interactive: true,
        ...options,
    };

    // Get changes from an rsync dry-run
    const changes = dryRunOutput
        .split(/\r?\n/)
        .filter(Boolean)
        .filter((line) => !/^created directory .*/.test(line))
        .filter((line) => !/^cannot delete non-empty directory:.*/.test(line))
        .map((line) => {
            // Split line into action and file, preserving whitespace for filenames
            const [action, ...parts] = line.split(/\s+/);

            let file, target;

            // Links also have a target, cL+++++++++ or cLc.T......
            if (action.match(/^cL.+/)) {
                const index = parts.indexOf('->');

                debug({ parts });

                file = parts.slice(0, index).join(' ');
                target = parts.slice(index + 1).join(' ');
            } else {
                file = parts.join(' ');
            }

            return [action, file, target];
        })
        .filter(([, file]) => file.slice(-1) !== '/');

    debug({ changes });

    let proceed = true;

    if (changes.length >= 50 && options.interactive) {
        proceed = await cli.agree(
            ansi.yellow(`${changes.length} file(s) will be compared. Continue? `)
        );
    }

    if (!proceed) {
        return Promise.reject('Process canceled by user');
    }

    const files = changes.map(([, file]) => file).filter((file) => existsSync(file));

    const diffs = changes
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map((change) => {
            const [action, file] = change;

            // Escape double quotes in file
            const fileEscaped = file.replace(/"/g, '\\"');

            const header = [
                file.match(/"/)
                    ? `diff --git "a/${fileEscaped}" "b/${fileEscaped}"`
                    : `diff --git a/${file} b/${file}`,
            ];

            let diff = '';

            if (action === '*deleting') {
                header.push('deleted file mode 100644');
                header.push('index 0000000..0000000');

                diff = `diff -Naurp --label="a/${fileEscaped}" --label=/dev/null "${fileEscaped}" /dev/null`;
            } else if (action.match(/^<f\++/)) {
                const { mode } = statSync(file);

                header.push(`new file mode ${mode.toString(8)}`);
                header.push('index 0000000..0000000');

                diff = `diff -Naurp --label=/dev/null --label="b/${fileEscaped}" /dev/null <(tar xzOf $tarball "${fileEscaped}" || cat /dev/null)`;
            } else if (action.match(/^cL\++/)) {
                const target = change[2];

                header.push('new file mode 120000');
                header.push('index 0000000..0000000');

                diff = `diff -Naurp --label=/dev/null --label="b/${fileEscaped}" /dev/null <(printf %s "${target}")`;
            } else if (action.match(/^cL.+/)) {
                const target = change[2];

                header.push('index 0000000..0000000');

                diff = `diff -Naurp --label="a/${fileEscaped}" --label="b/${fileEscaped}" <(printf %s "$(readlink "${fileEscaped}")") <(printf %s "${target}")`;
            } else {
                const { mode } = statSync(file);

                header.push(`index 0000000..0000000  ${mode.toString(8)}`);

                diff = `diff -Naurp --label="a/${fileEscaped}" --label="b/${fileEscaped}" "${fileEscaped}" <(tar xzOf $tarball "${fileEscaped}" || cat /dev/null)`;
            }

            return `printf "%s\\n" '${header.join('\n')}'; ${diff}`;
        });

    if (diffs.length > 0) {
        debug({ diffs, files });

        const diffsScriptFilename = `.frak-diffs-${crypto.sha256(Date.now())}.sh`;

        writeFileSync(`/tmp/${diffsScriptFilename}`, diffs.join(';'));

        // Tarball the local files up to the server
        const tar = spawn('tar', ['cz', ...files, `/tmp/${diffsScriptFilename}`]);

        // Handle tar errors
        tar.on('error', (error) => {
            throw error;
        });

        // Cleanup the diffs script
        tar.on('exit', () => {
            unlinkSync(`/tmp/${diffsScriptFilename}`);
        });

        // Run ssh, it takes the tarball through stdin, and expands it inline to generate diffs.
        // Don't forget, each command after the -- needs to end in a semicolon (;).
        const ssh = spawn('ssh', [
            config.server,
            '--',
            // Save the incoming tarball to /tmp
            'export tarball=$(mktemp /tmp/frak-diff-tarball.XXXXXX);',
            'cat > $tarball;',
            // Save the diffs script to the /tmp folder
            `tar xzOf $tarball "tmp/${diffsScriptFilename}" > /tmp/${diffsScriptFilename};`,
            process.env.DEBUG ? 'tar tf $tarball;' : '',
            // Fixes missing root directory by jumping to an empty /tmp folder
            `if [ -d "${config.root}" ] ; then cd "${config.root}"; else fakeroot=$(mktemp -d /tmp/frak-fake-root.XXXXXX); cd $fakeroot; fi ;`,
            // Run the diffs script
            `sh /tmp/${diffsScriptFilename};`,
            // Clean up diffs script
            `rm /tmp/${diffsScriptFilename};`,
            // Clean up the tarball
            'rm $tarball;',
            // Clean up the fake root fix
            'if [ -d "$fakeroot" ] ; then rmdir "$fakeroot" ; fi;',
        ]);

        // Pipe the tar output to SSH
        tar.stdout.pipe(ssh.stdin);

        let less;

        if (options.interactive) {
            less = spawn('less', ['-R'], { stdio: ['pipe', process.stdout, process.stderr] });
        }

        if (options.interactive && options.colorize) {
            const colorize = spawn('sed', [
                // headers
                '-e',
                `s/^\\(diff --git .*\\)/${ansi.bold('\\1')}/`,
                '-e',
                `s/^\\(index .*\\)/${ansi.bold('\\1')}/`,
                '-e',
                `s/^\\(new file mode .*\\)/${ansi.bold('\\1')}/`,
                '-e',
                `s/^\\(deleted file mode .*\\)/${ansi.bold('\\1')}/`,
                '-e',
                `s/^\\(--- .*\\)/${ansi.bold('\\1')}/`,
                '-e',
                `s/^\\(+++ .*\\)/${ansi.bold('\\1')}/`,
                // additions
                '-e',
                `s/^\\(+[^+].*\\)/${ansi.green('\\1')}/`,
                '-e',
                `s/^\\(+\\)$/${ansi.green('\\1')}/`,
                // deletions
                '-e',
                `s/^\\(-[^-].*\\)/${ansi.red('\\1')}/`,
                '-e',
                `s/^\\(-\\)$/${ansi.red('\\1')}/`,
                // markers
                '-e',
                `s/^\\(@@ -[0-9][0-9]*,[0-9][0-9]* +[0-9][0-9]*,[0-9][0-9]* .*@@\\)/${ansi.blue('\\1')}/`,
                '-e',
                `s/^\\(@@ -[0-9][0-9]*,[0-9][0-9]* +[0-9][0-9]* .*@@\\)/${ansi.blue('\\1')}/`,
                '-e',
                `s/^\\(@@ -[0-9][0-9]* +[0-9][0-9]*,[0-9][0-9]* .*@@\\)/${ansi.blue('\\1')}/`,
            ]);
            ssh.stdout.pipe(colorize.stdin);
            colorize.stdout.pipe(less.stdin);
        } else if (options.interactive) {
            ssh.stdout.pipe(less.stdin);
        }

        if (options.interactive) {
            await new Promise((resolve, reject) => {
                less.on('exit', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        /* node :coverage disable */
                        reject(`exited with code ${code}`);
                        /* node:coverage enable */
                    }
                });
            });
        } else {
            /* node:coverage disable */
            return await new Promise((resolve, reject) => {
                let diff = '';

                ssh.stdout.on('data', (data) => (diff += data));

                ssh.stderr.pipe(process.stderr);

                ssh.on('exit', () => {
                    resolve(diff);
                });

                ssh.on('error', (error) => {
                    reject(error);
                });
            });
            /* node:coverage enable */
        }
    } else if (options.interactive) {
        console.log(ansi.yellow('No changes detected.'));
    }

    return '';
}
