import child_process from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import config from './config.js';
import debug from './debug.js';

export const controlPath = `${process.env.HOME}/.ssh/control/frak-%C-${process.pid}`;

const CONTROL_CHECK_INTERVAL_MS = 100;
const CONTROL_CHECK_TIMEOUT_MS = 10000;

/**
 * Quote a value for a POSIX shell.
 */
export function quote(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * Run a short remote command as the SSH user with stdin attached to a pipe.
 * This intentionally does not apply sudo/become.
 *
 * @param {String} command
 * @param {{server: String}} options
 * @param {String} [input]
 * @returns {Promise<String>} stdout
 */
function run(command, options, input = '') {
    return new Promise((resolve, reject) => {
        const ssh = child_process.spawn(
            'ssh',
            [
                '-q',
                '-T',
                '-o ControlMaster=auto',
                `-o ControlPath=${controlPath}`,
                options.server,
                '--',
                command,
            ],
            { stdio: ['pipe', 'pipe', 'pipe'] }
        );

        let stdout = '',
            stderr = '';

        ssh.stdout.on('data', (data) => (stdout += `${data}`));
        ssh.stderr.on('data', (data) => (stderr += `${data}`));

        ssh.on('error', reject);
        ssh.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                /* node:coverage disable */
                reject(new Error(`ssh exited with code ${code}: ${stderr}`));
                /* node:coverage enable */
            }
        });

        ssh.stdin.end(input);
    });
}

/**
 * Create a private remote directory holding the sudo password and an askpass
 * helper. The password never appears in rsync's stdin stream.
 *
 * @param {String} password
 * @param {{server: String}} options
 * @returns {Promise<String>} remote directory path
 */
export function createSudoAuth(password, options = {}) {
    const command = [
        'set -e',
        'd=$(mktemp -d "${HOME:-/tmp}/.frak-sudo.XXXXXX")',
        'chmod 700 "$d"',
        'cat > "$d/password"',
        'cat > "$d/askpass" <<EOF',
        '#!/bin/sh',
        'cat "$d/password"',
        'EOF',
        'chmod 700 "$d/askpass"',
        'printf \'%s\' "$d"',
    ].join('\n');

    return run(command, options, `${password || ''}\n`).then((out) => out.trim());
}

/**
 * Remove a remote directory created by createSudoAuth().
 *
 * @param {String} directory
 * @param {{server: String}} options
 * @returns {Promise}
 */
export function removeSudoAuth(directory, options = {}) {
    return run(`rm -rf ${quote(directory)}`, options);
}

/**
 * Wait until ssh -O check can use the control master socket. Clients that are
 * started before the master has finished creating it can emit a
 * "ControlSocket ... already exists" warning and disable multiplexing.
 *
 * @param {ChildProcess} ssh The process that owns the control master
 * @returns {Promise<{
 *     stdin: Stream.Writable,
 *     stdout: Stream.Readable,
 *     stderr: Stream.Readable,
 * }>}
 */
function waitForControlMaster(ssh) {
    debug('waiting for control master socket');

    const promise = new Promise((resolve, reject) => {
        let activeCheck;
        let retryTimer;
        let timeoutTimer;
        let finished = false;
        let masterExited = false;
        let masterError = null;
        let lastError = '';

        const finish = (error) => {
            if (finished) {
                return;
            }

            finished = true;
            clearTimeout(retryTimer);
            clearTimeout(timeoutTimer);

            if (activeCheck && !activeCheck.killed) {
                activeCheck.kill();
            }

            ssh.removeListener('exit', onExit);
            ssh.removeListener('error', onError);

            if (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
            } else {
                debug('control master socket is ready');
                resolve();
            }
        };

        const scheduleCheck = () => {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(runCheck, CONTROL_CHECK_INTERVAL_MS);
        };

        const runCheck = () => {
            if (finished) {
                return;
            }

            if (masterError) {
                finish(masterError);
                return;
            }

            if (masterExited) {
                finish('control master exited before its socket was ready');
                return;
            }

            let attemptDone = false;
            let stderr = '';

            const check = child_process.spawn(
                'ssh',
                ['-O', 'check', '-S', controlPath, config.server],
                {
                    stdio: ['ignore', 'ignore', 'pipe'],
                }
            );

            activeCheck = check;
            check.stderr.on('data', (data) => (stderr += `${data}`));

            const done = (code, error) => {
                if (attemptDone || finished) {
                    return;
                }

                attemptDone = true;

                if (activeCheck === check) {
                    activeCheck = undefined;
                }

                if (code === 0) {
                    finish();
                } else {
                    lastError =
                        (error && error.message) ||
                        stderr.trim() ||
                        `ssh -O check exited with code ${code}`;
                    scheduleCheck();
                }
            };

            check.on('error', (error) => done(null, error));
            check.on('close', (code) => done(code));
        };

        const onExit = (code) => {
            masterExited = true;
            finish(
                new Error(`control master exited with code ${code} before its socket was ready`)
            );
        };

        const onError = (error) => {
            masterError = error;
            finish(error);
        };

        ssh.on('exit', onExit);
        ssh.on('error', onError);

        timeoutTimer = setTimeout(() => {
            const detail = lastError ? `: ${lastError}` : '';
            finish(new Error(`timed out waiting for control master socket${detail}`));
        }, CONTROL_CHECK_TIMEOUT_MS);

        runCheck();
    });

    return promise;
}

/**
 * Establish a control master socket for the SSH connections
 *
 * @returns {Promise<{
 *     close: Promise,
 *     stdin: Stream.Writable,
 *     stdout: Stream.Readable,
 *     stderr: Stream.Readable,
 * }>}
 */
export function control() {
    debug('establishing control master');

    mkdirSync(dirname(controlPath), { recursive: true });

    const ssh = child_process.spawn(
        'ssh',
        [
            '-tt',
            '-o ControlMaster=yes',
            '-o ControlPersist=no',
            `-o ControlPath=${controlPath}`,
            config.server,
        ],
        {
            stdio: ['pipe', 'pipe', 'pipe'],
        }
    );

    let exited = false;
    let exitCode = null;
    let exitError = null;
    let closeRequested = false;
    let closePromise;

    ssh.on('error', (error) => (exitError = error));
    ssh.on('exit', (code) => {
        exited = true;
        exitCode = code;
    });

    const close = () => {
        if (closePromise) {
            return closePromise;
        }

        closePromise = new Promise((resolve, reject) => {
            const finish = (code) =>
                code === 0 ? resolve(true) : reject(`exited with code ${code}`);

            if (exitError) {
                reject(exitError);
                return;
            }

            if (exited) {
                finish(exitCode);
                return;
            }

            const onExit = (code) => {
                ssh.removeListener('error', onError);
                finish(code);
            };

            const onError = (error) => {
                ssh.removeListener('exit', onExit);
                reject(error);
            };

            closeRequested = true;
            ssh.once('exit', onExit);
            ssh.once('error', onError);

            if (ssh.stdin.writable) {
                ssh.stdin.write('exit\n');
            }
        });

        return closePromise;
    };

    process.once('exit', () => {
        if (!closeRequested && !exited && ssh.stdin.writable) {
            ssh.stdin.write('exit\n');
        }
    });

    // Sudo authentication is handled by the command that actually needs it
    // (the rsync wrapper or sudo_command()), so there is no "sudo -v" warm-up
    // here. Not every sudoers configuration permits "sudo -v".

    const promise = waitForControlMaster(ssh);

    promise.close = close;
    promise.stdin = ssh.stdin;
    promise.stdout = ssh.stdout;
    promise.stderr = ssh.stderr;

    return promise;
}

/**
 * Execute a command on a remote server (interactive).
 *
 * @param {String} command
 * @param {{
 *     root: String,
 *     server: String,
 *     sudo_command: String,
 *     input: String,
 * }} [options={}]
 * @returns {Promise}
 */
export function exec(command, options = {}) {
    debug({ command, options });

    const prefix = options.sudo_command ? `${options.sudo_command} ` : '';
    const cmd = `set -e; cd ${quote(options.root || '.')}; ${prefix}sh -c ${quote(command)}`;

    return new Promise((resolve, reject) => {
        const ssh = child_process.spawn(
            'ssh',
            [
                '-tt',
                '-o ControlMaster=auto',
                `-o ControlPath=${controlPath}`,
                options.server,
                '--',
                cmd,
            ],
            {
                stdio: ['pipe', 'inherit', 'inherit'],
            }
        );

        // 1. Put local terminal into raw mode so arrow keys pass through without local echo
        const wasRaw = process.stdin.isRaw;
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();

        // 2. Write the initial input without closing stdin. When sudo is used,
        //    this is the password consumed by sudo_command() on the remote end.
        if (options.input !== undefined || options.sudo_command) {
            const formattedInput = `${String(options.input || '').replace(/\r?\n$/, '')}\n`;
            ssh.stdin.write(formattedInput);
        }

        // 3. Keep stdin open and pipe interactive keystrokes (arrows, Ctrl+C, etc.)
        process.stdin.pipe(ssh.stdin);

        const cleanup = () => {
            process.stdin.unpipe(ssh.stdin);
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(Boolean(wasRaw));
            }
            process.stdin.pause();
        };

        ssh.on('error', (err) => {
            cleanup();
            reject(err);
        });

        ssh.on('close', (code) => {
            cleanup();
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });
    });
}

/**
 * Spawn a command on a remote server.
 *
 * @param {String} command
 * @param {{
 *     quiet: Boolean,
 *     root: String,
 *     server: String,
 *     sudo_command: string,
 * }} [options={}]
 * @returns {Promise & { stderr: Readable, stdout: Readable }}
 */
export function spawn(command, options = {}) {
    debug({ command });

    const prefix = options.sudo_command ? `${options.sudo_command} ` : '';
    const cmd = `cd ${quote(options.root || '.')}; ${prefix}sh`;

    debug({ cmd });

    const ssh = child_process.spawn('ssh', [
        '-o ControlMaster=auto',
        `-o ControlPath=${controlPath}`,
        options.server,
        '--',
        cmd,
    ]);

    // const echo = child_process.spawn('echo', [ command ]);

    // echo.stdout.pipe(ssh.stdin);

    // The first line is consumed by sudo_command(); the rest is the script
    // that the remote shell executes.
    if (options.sudo_command) {
        ssh.stdin.write(`${String(options.password || '').replace(/\r?\n$/, '')}\n`);
    }

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

/**
 * Write contents to a file on the remote server.
 *
 * @param {String} destination Path relative to options.root
 * @param {String} contents
 * @param {{
 *     server: String,
 *     root: String,
 *     password: String,
 *     sudo_command: String,
 * }} [options={}]
 * @returns {Promise}
 */
export function upload(destination, contents, options = {}) {
    debug({ destination, bytes: String(contents).length });

    const prefix = options.sudo_command ? `${options.sudo_command} ` : '';
    const script = `mkdir -p ${quote(dirname(destination))} && cat > ${quote(destination)}`;
    const cmd = `set -e; cd ${quote(options.root || '.')}; ${prefix}sh -c ${quote(script)}`;

    return new Promise((resolve, reject) => {
        const ssh = child_process.spawn(
            'ssh',
            ['-o ControlMaster=auto', `-o ControlPath=${controlPath}`, options.server, '--', cmd],
            { stdio: ['pipe', 'pipe', 'pipe'] }
        );

        let stderr = '';

        ssh.stderr.on('data', (data) => {
            stderr += `${data}`;
        });
        ssh.stdout.on('data', (data) => debug('' + data));

        ssh.on('error', reject);
        ssh.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                /* node:coverage disable */
                reject(new Error(`ssh exited with code ${code}: ${stderr}`));
                /* node:coverage enable */
            }
        });

        if (options.sudo_command) {
            ssh.stdin.write(`${String(options.password || '').replace(/\r?\n$/, '')}\n`);
        }

        ssh.stdin.end(contents);
    });
}
