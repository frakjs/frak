import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import * as ansi from './ansi.js';
import * as cli from './cli.js';
import config from './config.js';
import debug from './debug.js';

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
        .map(line => {
            // Split line into action and file, preserving whitespace for filenames
            const [action, ...parts] = line.split(/\s+/);

            let file, target;

            // Links also have a target
            if (action === 'cL+++++++++' || action === 'cLc.T......') {
                const index = parts.indexOf('->');

                debug({ parts })

                file = parts.slice(0, index).join(' ');
                target = parts.slice(index + 1).join(' ');
            } else {
                file = parts.join(' ');
            }

            return [action, file, target];
        })
        .filter(([, file]) => file.slice(-1) !== '/');

    debug({ changes })

    let proceed = true;

    if (changes.length >= 50 && options.interactive) {
        proceed = await cli.agree(ansi.yellow(`${changes.length} file(s) will be compared. Continue?`))
    }

    if (!proceed) {
        return Promise.reject('Process canceled by user');
    }

    const files = changes.map(([, file]) => file);

    const diffs = changes.sort((a, b) => a[1].localeCompare(b[1])).map(change => {
        const [action, file] = change;
        const header = [
            `diff --git a/${file} b/${file}`,
        ];

        let diff = [];

        if (action === '*deleting') {
            header.push('deleted file mode 100644');
            header.push('index 0000000..0000000');

            diff = ['diff', '-Naurp', `--label=a/${file}`, `--label=/dev/null`, file, '/dev/null'];
        } else if (action === '<f+++++++++') {
            const { mode } = statSync(file);

            header.push(`new file mode ${mode.toString(8)}`);
            header.push('index 0000000..0000000');

            diff = ['diff', '-Naurp', `--label=/dev/null`, `--label=b/${file}`, '/dev/null', `<(tar xzOf $tarball --warning=no-unknown-keyword ${file} || cat /dev/null)`];
        } else if (action === 'cLc.T......') {
            const target = change[2];

            header.push('index 0000000..0000000');

            diff = ['diff', '-Naurp', `--label=a/${file}`, `--label=b/${file}`, `<(printf %s $(readlink ${file}))`, `<(printf %s ${target})`];
        } else if (action === 'cL+++++++++') {
            const target = change[2];

            header.push('new file mode 120000');
            header.push('index 0000000..0000000');

            diff = ['diff', '-Naurp', `--label=/dev/null`, `--label=b/${file}`, '/dev/null', `<(printf %s ${target})`];
        } else {
            const { mode } = statSync(file);

            header.push(`index 0000000..0000000  ${mode.toString(8)}`);

            diff = ['diff', '-Naurp', `--label=a/${file}`, `--label=b/${file}`, file, `<(tar xzOf $tarball --warning=no-unknown-keyword ${file} || cat /dev/null)`];
        }

        return [`printf "%s\\n" "${header.join('\n')}"`, ';', ...diff, ';'];
    });

    if (diffs.length > 0) {
        debug({ diffs, files });

        // Tarball the local files up to the server
        const tar = spawn('tar', ['cz', ...files]);
        const ssh = spawn('ssh', [
            config.server,
            '--',
            'tarball=$(mktemp /tmp/frak-diff-tarball.XXXXXXXX);',
            'cat > $tarball;',
            `cd ${config.root};`,
            ...diffs.reduce((commands, diff) => commands.concat(...diff), []),
            // `${diffs.join(';')};`,
            // 'rm $tarball',
        ])
        tar.stdout.pipe(ssh.stdin);

        let less;

        if (options.interactive) {
            less = spawn('less', ['-r'], { stdio: ['pipe', 'inherit', 'inherit'] });
        }

        if (options.interactive && options.colorize) {
            const colorize = spawn('sed', [
                // headers
                '-e', `s/^\\(diff --git .*\\)/${ansi.bold('\\1')}/`,
                '-e', `s/^\\(index .*\\)/${ansi.bold('\\1')}/`,
                '-e', `s/^\\(new file mode .*\\)/${ansi.bold('\\1')}/`,
                '-e', `s/^\\(deleted file mode .*\\)/${ansi.bold('\\1')}/`,
                '-e', `s/^\\(--- .*\\)/${ansi.bold('\\1')}/`,
                '-e', `s/^\\(+++ .*\\)/${ansi.bold('\\1')}/`,
                // additions
                '-e', `s/^\\(+[^+].*\\)/${ansi.green('\\1')}/`,
                '-e', `s/^\\(+\\)$/${ansi.green('\\1')}/`,
                // deletions
                '-e', `s/^\\(-[^-].*\\)/${ansi.red('\\1')}/`,
                '-e', `s/^\\(-\\)$/${ansi.red('\\1')}/`,
                // markers
                '-e', `s/^\\(@@ -[0-9][0-9]*,[0-9][0-9]* +[0-9][0-9]*,[0-9][0-9]* .*@@\\)/${ansi.blue('\\1')}/`,
                '-e', `s/^\\(@@ -[0-9][0-9]*,[0-9][0-9]* +[0-9][0-9]* .*@@\\)/${ansi.blue('\\1')}/`,
                '-e', `s/^\\(@@ -[0-9][0-9]* +[0-9][0-9]*,[0-9][0-9]* .*@@\\)/${ansi.blue('\\1')}/`,
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
                        reject(`exited with code ${code}`);
                    }
                });
            });
        } else {
            return await new Promise((resolve) => {
                let diff = '';

                ssh.stdout.on('data', (data) => diff += data);

                ssh.stderr.pipe(process.stderr);

                ssh.on('exit', () => {
                    resolve(diff);
                });
            });
        }
    } else if (options.interactive) {
        console.log(ansi.yellow('No changes detected.'));
    }
}
