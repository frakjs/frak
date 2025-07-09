import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from './cli.js';
import config, { locate as locateConfig } from './config.js';
import debug from './debug.js';

let backupPath = null;

/**
 * Generate rsync filters.
 */
export function filters() {
    const { options } = parse(process.argv.slice(2));
    const filters = [];
    const includes = [];
    const excludes = [
        '.frak*',
        '.git*',
        '.svn*',
        '.tags*',
        'Capfile',
        'Gemfile*',
        'Vagrantfile*',
    ];

    // merge excludes via commandline
    if (options.ignore) {
        excludes.push.apply(excludes, options.ignore.split(/ +/));
    }

    // merge path
    if (options.path) {
        const paths = options.path.split(/ +/)
            .map(p => path.resolve(p))
            .map(p => p) // TODO glob // paths.map! { |p| p[/[*?]/] ? Dir.glob(p) : p }
            .flat(Infinity)
            // make paths relative to .frak file
            .map(p => p.replace(path.dirname(locateConfig()), ''));

        // include all parent directories to fix recursive rsync from excluding all
        paths.forEach(p => {
            includes.push(p);

            while (path.dirname(p) !== '/') {
                excludes.push(`${path.dirname(p)}/*`);

                p = path.dirname(p);
                includes.push(p)
            }
        });

        excludes.push('/*');
    }

    // merge .frakignore file
    if (fs.existsSync(path.resolve(locateConfig(), '../.frakignore'))) {
        filters.push('.e .frakignore');
    }

    includes.forEach(include => filters.push(`+ ${include}`));
    excludes.forEach(include => filters.push(`- ${include}`));

    return filters;
}

/**
 * Execute the entire rsync command. Uses rsync's --files-from
 * parameter to deploy multiple paths at once.
 *
 * @param {String} source
 * @param {String} destination
 * @param {Object} options
 */
export function exec(...options) {
    // Get the current command
    const { command } = parse(process.argv.slice(2));
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

    // Figure out backup options
    backup = [
        '--exclude=.backups/',
    ];

    // Keep the same backup path for all rsync commands
    if (backupPath === null) {
        backupPath = `.backups/${(new Date()).toISOString()}`
    }

    // This should only happen on push
    if (command === 'push') {
        backup = [...backup, '--backup', `--backup-dir=${backupPath}`]
    }

    const args = [
        'rsync',
        [
            '--archive', '--no-group', '--no-owner', '--no-perms', '--no-times', '--human-readable',
            '--compress', '--checksum', '--itemize-changes', '--recursive', '--delete',
            `--rsync-path=${config['rsync_path'] ? config['rsync_path'] : 'rsync'}`,
            '--filter=. -',
            ...backup,
            ...options,
            source, destination,
        ],
    ];

    debug('rsync:', args);
    debug(args.flat().join(' '));
    debug('filters:', filters());

    let stdout = '';

    const rsync = spawn.apply(null, args);

    const echo = spawn('echo', [ filters().join('\n') ]);

    echo.stdout.pipe(rsync.stdin);

    rsync.stdout.on('data', (data) => {
        stdout += `${data}`;
    });

    rsync.stderr.on('data', (data) => {
        process.stderr.write(`${data}`); // Print any errors from the child process
    });

    return new Promise((resolve, reject) => {
        rsync.on('exit', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(`rsync exited with code ${code}`);
            }
        });
    });
}
