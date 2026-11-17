import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from './cli.js';
import config, { locate as locateConfig } from './config.js';
import debug from './debug.js';
import humanize from './humanize.js';
import * as ssh from './ssh.js';

let backupPath = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Generate rsync filters.
 */
export function filters() {
    const { options } = parse(process.argv.slice(2));
    const filters = [];
    const includes = [];
    const excludes = ['/.frak', '/.frakignore', '/.git/', '/.svn/', '/frak.config.js'];

    // merge excludes via commandline
    if (options.ignore) {
        excludes.push.apply(excludes, options.ignore.split(/ +/));
    }

    // merge path
    if (options.path) {
        const paths = options.path
            .split(/((?<!\\) )+/)
            .map((p) => p.replace(/\\ /g, ' '))
            .map((p) => path.resolve(p))
            .map((p) => p) // TODO glob // paths.map! { |p| p[/[*?]/] ? Dir.glob(p) : p }
            .flat(Infinity)
            // make paths relative to .frak file
            .map((p) => p.replace(path.dirname(locateConfig()), ''));

        // include all parent directories to fix recursive rsync from excluding all
        paths.forEach((p) => {
            includes.push(p);

            while (path.dirname(p) !== '/') {
                excludes.push(`${path.dirname(p)}/*`);

                p = path.dirname(p);
                includes.push(p);
            }
        });

        excludes.push('/*');
    }

    // merge .frakignore file
    if (fs.existsSync(path.resolve(locateConfig(), '../.frakignore'))) {
        filters.push('.e .frakignore');
    }

    includes.forEach((include) => filters.push(`+ ${include}`));
    excludes.forEach((include) => filters.push(`- ${include}`));

    return filters;
}

/**
 * Execute the entire rsync command. Uses rsync's --files-from
 * parameter to deploy multiple paths at once.
 *
 * @param {String} source
 * @param {String} destination
 * @param {Object} options
 * @returns {Promise<{output: String, backupPath: String>}
 */
export function exec(options = {}) {
    // Get the current command
    const { command, options: commandOptions } = parse(process.argv.slice(2));
    let source, destination;

    // Flip the source and destination if this is a pull command
    if (command === 'pull') {
        // trailing slashes are important for pull
        source = `${config['server']}:${config['root']}/`;
        destination = './';
    } else {
        source = './';
        destination = `${config['server']}:${config['root']}/`;
    }

    let backup = [];
    let backupName =
        'name' in commandOptions
            ? `${commandOptions.name}_${new Date().toISOString()}`
            : new Date().toISOString();

    // Figure out backup options
    backup = ['--exclude=.backups/'];

    // Keep the same backup path for all rsync commands
    if (backupPath === null) {
        backupPath = `.backups/${backupName}`;
    }

    // This should only happen on push
    if (command === 'push') {
        backup = [...backup, '--backup', `--backup-dir=${backupPath}`];
    }

    const wrapperCommand = config.become
        ? path.resolve(__dirname, '../bin/frak-ssh-wrapper')
        : `ssh -o ControlMaster=auto -o ControlPath=${ssh.controlPath}`;

    const args = [
        'rsync',
        [
            '--archive',
            '--no-group',
            '--no-owner',
            '--no-perms',
            '--no-times',
            `--rsh=${wrapperCommand}`,
            '--human-readable',
            '--compress',
            '--checksum',
            '--itemize-changes',
            '--recursive',
            '--delete',
            // `--rsync-path=${rsync_path()}`,
            '--filter=. -',
            ...backup,
            ...(options.options || []),
            source,
            destination,
        ],
        {
            stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                SSH_CONTROL_PATH: ssh.controlPath,
                // The remote rsync should run as this user (empty means root).
                FRAK_BECOME: config.become === true ? 'root' : config.become || '',
            },
        },
    ];

    debug('rsync:', args);
    debug(args.slice(0, 2).flat().join(' '));
    debug('filters:', filters());

    let output = '',
        stderr = '';

    return new Promise((resolve, reject) => {
        const echo = spawn('echo', [filters().join('\n')]);

        const rsync = spawn.apply(null, args);

        rsync.stdout.on('data', (data) => {
            output += `${data}`;

            if (options.humanize) {
                const humanized = humanize(`${data}`);
                humanized && console.log(humanized.trim());
            }
        });
        rsync.stderr.on('data', (data) => {
            stderr += `${data}`;
        });

        /* node:coverage disable */
        rsync.stderr.on('data', (data) => {
            process.stderr.write(`${data}`); // Print any errors from the child process
        });
        /* node:coverage enable */

        rsync.on('exit', (code) => {
            if (code === 0) {
                resolve({
                    output,
                    backupPath,
                });
            } else {
                /* node:coverage disable */
                reject(`rsync exited with code ${code}: ${stderr}`);
                /* node:coverage enable */
            }
        });

        // Write the password on named-pipe 3. Use an empty line when no
        // password was collected (non-TTY), so the wrapper never sends the
        // literal string "undefined" to sudo.
        if (config.become) {
            rsync.stdio[3].end(`${config.password || ''}\n`);
        }

        // Write the filters to stdin
        echo.stdout.pipe(rsync.stdin);
        // rsync.stdin.write(filters().join('\n'));

        debug('wrote stdin');
    });
}
