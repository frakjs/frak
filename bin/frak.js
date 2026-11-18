#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ansi from '../src/ansi.js';
import * as cli from '../src/cli.js';
import config, { load as loadConfig, sudo_command } from '../src/config.js';
import { sha256 } from '../src/crypto.js';
import debug from '../src/debug.js';
import diff from '../src/diff.js';
import * as rsync from '../src/rsync.js';
import * as ssh from '../src/ssh.js';
import * as date from '../src/date.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATUS_SUCCESS = 0b00000000;
const ERROR_CANCELED = 0b00000001;
const ERROR_CONFIG = 0b00000010;
const ERROR_CONTROL = 0b00000100;
const ERROR_DIFF = 0b00001000;
const ERROR_RSYNC = 0b00010000;
const ERROR_PATCH = 0b00100000;
const ERROR_USAGE = 0b01000000;
const ERROR_DRY_RUN = 0b10000000;

/**
 * Try to load config. If it fails, print error message in red.
 *
 * @param {String} env
 */
async function tryLoadConfig(env) {
    return await loadConfig(env).catch((e) => {
        console.error(ansi.red(e.message));

        process.exit(ERROR_CONFIG);
    });
}

/**
 * Establish a control socket for the server. Exits if there's an error.
 *
 * @param {Boolean} strict
 * @returns {Promise<{
 *     close: Promise,
 *     stdin: Stream.Writable,
 *     stdout: Stream.Readable,
 *     stderr: Stream.Readable
 * }>}
 */
function establishControl(strict = true) {
    let stderr = '';
    let stdout = '';
    const control = ssh.control();

    control.stdout.on('data', (data) => (stdout += data));
    control.stderr.on('data', (data) => (stderr += data));

    return control.catch((error) => {
        debug(error);
        console.error(ansi.red(error.message || error));

        if (stdout) {
            console.log(stdout);
        }

        if (stderr) {
            console.error(stderr);
        }

        strict && process.exit(ERROR_CONTROL);
    });
}

/**
 * Print command usage instructions.
 */
function usage() {
    console.log('Usage: frak <command>');
    console.log('Commands:');
    console.log('  init          Initialize the current directory for frak deployment');
    console.log('  console       Connect to the remote server via SSH');
    console.log('  diff          Show differences between local and remote files');
    console.log('  pull          Download the remote file(s)');
    console.log('  push          Deploy website via rsync');
    console.log('  backups:list  List backups on the server');
    console.log('');
    console.log('Options:');
    console.log('  --help        Display the command usage');
    console.log('  --version     Show the current version');
}

/**
 * Print the current version
 */
function version() {
    const { version } = JSON.parse(readFileSync(path.join(__dirname, '../package.json')));

    console.log('Version:', version);
}

/**
 * Execute the command.
 *
 * @param {Array} args
 */
async function main(args) {
    const { command, options } = cli.parse(args.slice(2));
    let control;

    debug('parsed:', { command, options });

    if (command === 'init') {
        // Initialize Frak in the current directory
        const configPath = path.join(process.cwd(), 'frak.config.js');

        if (!existsSync(configPath)) {
            writeFileSync(
                configPath,
                `export default ${JSON.stringify({ server: 'example.com', root: '/var/www/html' }, null, 4)}`
            );
            console.info(ansi.green('Configuration file created: frak.config.js'));
        } else {
            console.error(ansi.red('Frak is already initialized in this directory.'));
        }
    } else if (command === 'console') {
        // Start a console session, or run the provided command on
        // the remote server.
        await tryLoadConfig(options.env);

        if (!config.server) {
            console.error('No remote server configured. Add "server" to frak.config.js');
            process.exit(ERROR_CONFIG);
        }

        try {
            await ssh.exec(options.command ? options.command : '$SHELL -i', {
                server: config.server,
                root: config.root,
                sudo_command: sudo_command(),
                input: config.password,
            });
        } catch (e) {
            debug(e);

            process.exit(e.status || 1);
        }
    } else if (command === 'diff') {
        // Show the differences between local files and remote server
        await tryLoadConfig(options.env);

        // Establish ssh control master
        control = await establishControl();

        try {
            const { output } = await rsync.exec({ options: ['--dry-run'] });

            debug({ output });

            await diff(output, options);
        } catch (e) {
            debug(e);

            console.error(e.message);
        }
    } else if (command === 'push' || command === 'pull') {
        // Push or pull changes to remote server
        await tryLoadConfig(options.env);

        let output;

        // Establish ssh control master
        control = await establishControl();

        // Execute dry-run
        const result = await rsync.exec({ humanize: true, options: ['--dry-run'] }).catch((e) => {
            console.error(ansi.red(e.message || e));

            process.exit(ERROR_DRY_RUN);
        });

        output = result.output;

        console.log('');

        debug({ output });

        if (command === 'push' && config.after) {
            console.log(ansi.blue('Run command:'), config.after);
            console.log('');
        }

        const proceed = await cli
            .agree(
                ansi.yellow('The above actions will be taken. Continue? (This cannot be undone): ')
            )
            .catch(console.error);

        if (!proceed) {
            process.exit(ERROR_CANCELED);
        }

        // Prepare patch file
        let patch = '';

        if (command === 'push') {
            patch = await diff(output, { interactive: false })
                /* node:coverage disable */
                .catch((e) => {
                    console.error(e.message || e);

                    process.exit(ERROR_DIFF);
                });
            /* node:coverage enable */
        }

        console.log('');

        // Execute actual rsync command
        const { backupPath, output: actualOutput } = await rsync
            .exec({ humanize: true })
            .catch((e) => {
                console.error(ansi.red(e.message || e));

                process.exit(ERROR_RSYNC);
            });

        if (actualOutput.trim()) {
            console.log('');
        }

        // Place patch file in backup dir
        if (command === 'push') {
            const hash = sha256(patch).slice(0, 7);

            await ssh
                .upload(`${backupPath}/${hash}.patch`, patch, {
                    server: config.server,
                    root: config.root,
                    sudo_command: sudo_command(),
                    password: config.password,
                })
                .catch((e) => {
                    console.error(ansi.red(e.message || e));

                    process.exit(ERROR_PATCH);
                });
        }

        // Execute "after" command
        if (command === 'push' && config.after) {
            if (config.become === true) {
                console.log(
                    ansi.blue(`Executing commands on remote server as ${ansi.red('root')}.`)
                );
            } else if (config.become) {
                console.log(
                    ansi.blue(
                        `Executing commands on remote server as ${ansi.yellow(config.become)}.`
                    )
                );
            } else {
                console.log(ansi.yellow(`Executing commands on remote server.`));
            }

            console.log('');

            debug({ command: config.after });

            await ssh
                .spawn(config.after, {
                    server: config.server,
                    root: config.root,
                    sudo_command: sudo_command(),
                    password: config.password,
                })
                .catch((e) => console.error(e.message || e));

            console.log('');
        }

        // TODO Webhook

        if (command === 'push') {
            console.log(ansi.green('Deployment complete.'));
        }
    } else if (command === 'backups:list') {
        await tryLoadConfig(options.env);

        // Establish ssh control master
        control = await establishControl();

        const delimeter = '------Separator--';
        const grep = {
            additions: `[ -f "$NAME"/*.patch ] && grep -e '^+' "$NAME"/*.patch || cat /dev/null | grep -v '^+++' | wc -l`,
            deletions: `[ -f "$NAME"/*.patch ] && grep -e '^-' "$NAME"/*.patch || cat /dev/null | grep -v '^---' | wc -l`,
        };
        const ls = `stat -c '%Y %n' .backups/* | sort -r`;

        const list = ssh.spawn(
            `${ls} | xargs -I {} sh -c 'TIMESTAMP=$(echo {} | cut -d" " -f1); NAME=$(echo {} | cut -d" " -f2-); echo $TIMESTAMP${delimeter}$NAME${delimeter}$(${grep.additions})${delimeter}$(${grep.deletions})'`,
            {
                quiet: true,
                server: config.server,
                root: config.root,
                sudo_command: sudo_command(),
                password: config.password,
            }
        );
        let backups = '';

        list.stdout.on('data', (data) => (backups += data));

        await list;

        const table = new cli.Table([
            {
                header: 'Name',
                width: 55,
            },
            {
                header: 'Date',
                width: 25,
            },
            {
                header: 'Changes',
                width: 30,
            },
        ]);

        backups
            .trim()
            .split(/\n/)
            .forEach((backup) => {
                const [timestamp, name, additions, deletions] = backup.split(delimeter);
                debug(backup);
                table.row([
                    name.replace(/^.backups\//, ''),
                    date.relative(timestamp * 1000),
                    ansi.green(`${additions} addition${additions == 1 ? '' : 's'}`) +
                        ', ' +
                        ansi.red(`${deletions} deletion${deletions == 1 ? '' : 's'}`),
                ]);
            });

        table.print();
    } else if (command === '--version' || command === 'version') {
        version();
    } else {
        usage();

        if (command !== '--help') {
            process.exit(ERROR_USAGE);
        }
    }

    if (control) {
        debug('closing control socket');

        await control.close().catch((error) => console.error(ansi.red(error.message || error)));
    }

    process.exit(STATUS_SUCCESS);
}

main(process.argv);
