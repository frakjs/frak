#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as ansi from '../src/ansi.js';
import * as cli from '../src/cli.js';
import config, { load as loadConfig } from '../src/config.js';
import { sha256 } from '../src/crypto.js';
import debug from '../src/debug.js';
import diff from '../src/diff.js';
import humanize from '../src/humanize.js';
import * as rsync from '../src/rsync.js';
import * as ssh from '../src/ssh.js';
import * as date from '../src/date.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Try to load config. If it fails, print error message in red.
 *
 * @param {String} env
 */
async function tryLoadConfig(env) {
    try {
        await loadConfig(env);
    } catch (e) {
        console.log(ansi.red(e.message));

        process.exit(1);
    }

    return;
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
}

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
        await tryLoadConfig(options.env);

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
        await tryLoadConfig(options.env);

        const { output } = await rsync.exec('--dry-run');

        await diff(output, options);

    // Push or pull changes to remote server
    } else if (command === 'push' || command === 'pull') {
        await tryLoadConfig(options.env);

        // Execute dry-run
        const { output } = await rsync.exec('--dry-run');

        console.log(humanize(output));

        if (command === 'push' && config.after) {
            console.log(ansi.blue('Run command:'), config.after, '\n');
        }

        const proceed = await cli.agree(ansi.yellow('The above actions will be taken. Continue? (This cannot be undone): '));

        if (!proceed) {
            process.exit(1);
        }

        // Prepare patch file
        let patch;

        try {
            patch = await diff(output, { interactive: false });
        } catch (e) {
            console.error(e);

            process.exit(1);
        }

        // Execute actual rsync command
        const { backupPath, output: actualOutput } = await rsync.exec();

        console.log('');
        console.log(humanize(actualOutput));

        // Place patch file in backup dir
        const hash = sha256(patch).slice(0, 7);
        const copy = spawn('ssh', [config.server, '--', `cat > '${config.root || '.'}/${backupPath}/${hash}.patch'`]);

        copy.stdout.on('data', (data) => debug('' + data));
        copy.stderr.on('data', (data) => debug('' + data));
        copy.stdin.write(patch);

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
        await tryLoadConfig(options.env);

        const delimeter = '------Separator--';
        const grep = {
            additions: `grep -e '^+' "$NAME"/*.patch | grep -v '^+++' | wc -l`,
            deletions: `grep -e '^-' "$NAME"/*.patch | grep -v '^---' | wc -l`,
        }
        const ls = `stat --format='%Y %n' .backups/* | sort -r`;

        const list = ssh.exec(`${ls} | xargs -I {} sh -c 'TIMESTAMP=$(echo {} | cut -d" " -f1); NAME=$(echo {} | cut -d" " -f2-); echo $TIMESTAMP${delimeter}$NAME${delimeter}$(${grep.additions})${delimeter}$(${grep.deletions})'`, { quiet: true, server: config.server, root: config.root });
        let backups = '';

        list.stdout.on('data', data => backups += data);

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
            }
        ]);

        backups.trim().split(/\n/).forEach(backup => {
            const [ timestamp, name, additions, deletions ] = backup.split(delimeter);
            table.row([
                name.replace(/^.backups\//, ''),
                date.relative(timestamp * 1000),
                ansi.green(`${additions} addition${additions == 1 ? '' : 's'}`) + ', ' + ansi.red(`${deletions} deletion${deletions == 1 ? '' : 's'}`),
            ]);
        });

        table.print();
    } else {
        usage();

        if (command !== '--help') {
            process.exit(1);
        }
    }

    process.exit(0);
}

main(process.argv);
