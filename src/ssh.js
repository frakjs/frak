import { spawn } from 'node:child_process';

export async function exec(command, options = {}) {
    const cmd = `cd ${options.root || '.'}; sh`;

    const ssh = spawn('ssh', [ options.server, '--', cmd ]);

    const echo = spawn('echo', [ command ]);

    echo.stdout.pipe(ssh.stdin);

    ssh.stdout.on('data', (data) => {
        process.stdout.write(`${data}`);
    });

    ssh.stderr.on('data', (data) => {
        process.stderr.write(`${data}`);
    });

    return new Promise((resolve, reject) => {
        ssh.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(`exited with code ${code}`);
            }
        });
    });
}
