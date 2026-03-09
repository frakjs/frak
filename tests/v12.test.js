import assert from 'node:assert';
import { spawn } from 'node:child_process';

import { bold, green, strip } from '../src/ansi.js';
import diff from './helpers/diff.js';

async function main() {
    try {
        const frak = spawn('node', ['../../../bin/frak.js'], {
            cwd: 'tests/fixtures/example',
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '',
            stderr = '';

        frak.stdout.on('data', (data) => {
            stdout += data;
        });

        frak.stderr.on('data', (data) => {
            stderr += data;
        });

        frak.stdin.write('n\n');

        const code = await new Promise((resolve, reject) => {
            frak.on('exit', resolve);

            frak.on('error', reject);
        });

        assert.strictEqual(code, 1, 'Expected exit code 1');
        assert.strictEqual(stderr, '', 'Expected stderr to be empty');
        assert.strictEqual(
            strip(stdout),
            [
                'Delete      deleted file',
                'Update      file with "quote"',
                'New File    new file',
                'New Link    new link -> updated file',
                'Update      updated file',
                'Update      updated link -> new file',
                'New Folder  new folder/',
                'New File    new folder/new file',
                '',
                'The above actions will be taken. Continue? (This cannot be undone): ',
            ].join('\n'),
            'Unexpected output'
        );

        console.log(green(bold('✔ Success!')));

        process.exit(0);
    } catch (error) {
        console.error(error.stack);

        console.log(
            diff(error.expected, error.actual, {
                labelA: 'expected',
                labelB: 'actual',
            })
        );

        process.exit(1);
    }
}

main();
