#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as ansi from '../src/ansi.js';
import * as cli from '../src/cli.js';
import config, { load as loadConfig } from '../src/config.js';
import debug from '../src/debug.js';
import humanize from '../src/humanize.js';
import * as rsync from '../src/rsync.js';
import * as ssh from '../src/ssh.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Execute the command.
 *
 * @param {Array} args
 */
async function main(args) {
    const { command, options } = cli.parse(args.slice(2));

    debug('parsed:', { command, options });


    // Initialize Frak in the current directory
    if (command === 'init') {
        const configPath = path.join(process.cwd(), 'frak.config.js');

        if (!existsSync(configPath)) {
            writeFileSync(configPath, `export default ${JSON.stringify({ server: 'example.com', root: '/var/www/html' }, null, 4)}`);
            console.info(ansi.green('Configuration file created: frak.config.js'));
        } else {
            console.error(ansi.red('Frak is already initialized in this directory.'));
        }

    // Start a console session, or run the provided command on
    // the remote server.
    } else if (command === 'console') {
        await loadConfig(options.env);

        if (!config.server) {
            console.error('No remote server configured. Add "server" to frak.config.js');
            process.exit(1);
        }

        try {
            const cmd = options.command ?? '\\$SHELL -l -i';

            execSync(`ssh -t ${config.server} -- cd ${config.root} \\&\\& ${cmd}`, { stdio: 'inherit' });
        } catch (e) {
            debug(e)
        }
    // Show the differences between local files and remote server
    } else if (command === 'diff') {
        await loadConfig(options.env);

        // Get changes from an rsync dry-run
        const changes = (await rsync.exec('--dry-run'))
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
            .filter(([action, file]) => file.slice(-1) !== '/');

        debug({ changes })

        let proceed = true;

        if (changes.length >= 50) {
            proceed = await cli.agree(ansi.yellow(`${changes.length} file(s) will be compared. Continue?`))
        }

        if (!proceed) {
            process.exit(1);
        }

        const files = changes.map(([action, file]) => file);

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
            const less = spawn('less', ['-r'], { stdio: ['pipe', 'inherit', 'inherit'] });

            tar.stdout.pipe(ssh.stdin);

            if (options.colorize) {
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
            } else {
                ssh.stdout.pipe(less.stdin);
            }

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
            console.log(ansi.yellow('No changes detected.'));
        }
    // Push or pull changes to remote server
    } else if (command === 'push' || command === 'pull') {
        await loadConfig(options.env);

        // Execute dry-run
        const output = await rsync.exec('--dry-run');

        console.log(humanize(output));

        if (command === 'push' && config.after) {
            console.log(ansi.blue('Run command:'), config.after, '\n');
        }

        const proceed = await cli.agree(ansi.yellow('The above actions will be taken. Continue? (This cannot be undone): '));

        if (!proceed) {
            process.exit(1);
        }

        // Execute actual rsync command
        await rsync.exec()

        // Execute "after" command
        if (command === 'push' && config.after) {
            console.log(ansi.yellow('Executing commands on remote server.'));

            debug({ command: config.after });

            try {
                await ssh.exec(config.after, { server: config.server, root: config.root });
            } catch (e) {
                debug(e);
            }
        }

        // TODO Webhook

        if (command === 'push') {
            console.log(ansi.green('Deployment complete.'));
        }
    } else if (command === 'backups:list') {
        console.log('Listing backups...');
    } else if (command === 'backups:purge') {
        console.log('Purging backups...');
    } else {
        console.log('Usage: frak <command>');
        console.log('Commands:');
        console.log('  init          Initialize the current directory for frak deployment');
        console.log('  console       Connect to the remote server via SSH');
        console.log('  diff          Show differences between local and remote files');
        console.log('  pull          Download the remote file(s)');
        console.log('  push          Deploy website via rsync');
        console.log('  backups:list  List backups on the server');
        console.log('  backups:purge Purge all backups');

        if (command !== '--help') {
            process.exit(1);
        }
    }

    process.exit(0);
}

main(process.argv);
