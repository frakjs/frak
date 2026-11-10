import { spawn } from 'node:child_process';
import fs, { mkdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path, { dirname } from 'node:path';
import * as cli from './cli.js';
import config from './config.js';
import debug from './debug.js';
import { stdout } from 'node:process';

export const controlPath = `${process.env.HOME}/.ssh/control/frak-%C`;

/**
 * Establish a control master socket for the SSH connections
 */
export async function control() {
    debug('establishing control master');

    mkdirSync(dirname(controlPath), { recursive: true });

    const ssh = spawn(
        'ssh',
        [
            '-o ControlMaster=yes',
            '-o ControlPersist=no',
            `-o ControlPath=${controlPath}`,
            config.server,
        ],
        {
            stdio: ['pipe', 'pipe', 'pipe'],
        }
    );

    const close = () => {
        return new Promise((resolve, reject) => {
            ssh.on('exit', (code) =>
                code === 0 ? resolve(true) : reject(`exited with code ${code}`)
            );
            ssh.stdin.write('exit\n');
        });
    };

    return {
        close: async () => await close(),
        stdout: ssh.stdout,
        stdin: ssh.stdin,
        stderr: ssh.stderr,
    };
}

/**
 * Execute a command on a remote server.
 *
 * @param {String} command
 * @param {{
 *     quiet: Boolean,
 *     root: String,
 *     server: String
 * }} [options={}]
 * @returns {Promise & { stderr: Readable, stdout: Readable }}
 */
export function exec(command, options = {}) {
    debug({ command });

    let cmd;

    if (options.sudo_command) {
        cmd = `cd ${options.root || '.'}; ${options.sudo_command} sh`;
    } else {
        cmd = `cd ${options.root || '.'}; sh`;
    }

    const ssh = spawn('ssh', [
        '-o ControlMaster=auto',
        `-o ControlPath=${controlPath}`,
        options.server,
        '--',
        cmd,
    ]);

    // const echo = spawn('echo', [ command ]);

    // echo.stdout.pipe(ssh.stdin);

    ssh.stdin.write(command);
    ssh.stdin.end();

    ssh.stdout.on('data', (data) => {
        debug('' + data);

        options.quiet || process.stdout.write(`${data}`);
    });

    ssh.stderr.on('data', (data) => {
        debug('' + data);

        options.quiet || process.stderr.write(`${data}`);
    });

    const promise = new Promise((resolve, reject) => {
        ssh.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                /* node:coverage disable */
                reject(`exited with code ${code}`);
                /* node:coverage enable */
            }
        });
    });

    promise.stdout = ssh.stdout;
    promise.stderr = ssh.stderr;

    return promise;
}
