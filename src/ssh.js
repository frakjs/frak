import { spawn } from 'node:child_process';
import debug from './debug.js';

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

    const cmd = `cd ${options.root || '.'}; sh`;

    const ssh = spawn('ssh', [options.server, '--', cmd]);

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
