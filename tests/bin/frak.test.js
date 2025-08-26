import * as ansi from '../../src/ansi.js';
import assert from 'node:assert';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import test, { suite } from 'node:test';
import path from 'node:path';
import { tmpdir } from 'node:os';

suite('bin/frak.js', () => {
    suite('init', () => {
        test('can init', async () => {
            let stdout = '';
            const cwd = fs.mkdtempSync(path.join(tmpdir(), 'frak.'));
            const frak = spawn('node', ['/app/bin/frak.js', 'init'], { cwd });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdout.on('data', data => stdout += data);

            await promise;

            assert.strictEqual(stdout.trimEnd(), ansi.green('Configuration file created: frak.config.js'));
        });

        test('cannot re-init', async () => {
            let stderr = '';
            const frak = spawn('node', ['/app/bin/frak.js', 'init'], { cwd: './tests/fixtures/example' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stderr.on('data', data => stderr += data);

            await promise;

            assert.strictEqual(stderr.trimEnd(), ansi.red('Frak is already initialized in this directory.'));
        });
    });

    suite('console', () => {
        test('can execute remote commands', async () => {
            let stdout = '';
            const frak = spawn('node', ['/app/bin/frak.js', 'console', 'command=echo test'], { cwd: './tests/fixtures/example' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdout.on('data', data => stdout += data);

            await promise;

            assert.notStrictEqual(stdout, 'test');
        });

        test('console fails without server', async () => {
            let stderr = '';
            const frak = spawn('node', ['/app/bin/frak.js', 'console'], { cwd: './tests/fixtures/example.noserver' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stderr.on('data', data => stderr += data);

            await promise;

            assert.strictEqual(stderr.trimEnd(), 'No remote server configured. Add "server" to frak.config.js');
        });

        test('console fails when command fails', async () => {
            let stdout = '';
            const frak = spawn('node', ['/app/bin/frak.js', 'console', 'command=false'], { cwd: './tests/fixtures/example' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdout.on('data', data => stdout += data);

            await promise;

            assert.strictEqual(stdout.trimEnd(), '');
        });
    });

    suite('push', () => {
        test('prompts to continue after dry run', async () => {
            let stdout = '';
            const frak = spawn('node', ['/app/bin/frak.js'], { cwd: './tests/fixtures/example' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdin.write('no');
            frak.stdout.on('data', data => stdout += data);

            await promise;

            assert.notStrictEqual(stdout, ansi.strip(stdout));
            assert.strictEqual(ansi.strip(stdout).trimEnd(), fs.readFileSync('./tests/fixtures/dry-run.txt', 'utf-8').trimEnd());
        });

        test('can specify path', async () => {
            let stdout = '';
            const frak = spawn('node', ['/app/bin/frak.js', 'path=new\\ file new\\ folder/new\\ file'], { cwd: './tests/fixtures/example' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdin.write('no');
            frak.stdout.on('data', data => stdout += data);

            await promise;

            assert.notStrictEqual(stdout, ansi.strip(stdout));
            assert.strictEqual(ansi.strip(stdout).trimEnd(), fs.readFileSync('./tests/fixtures/dry-run.path.txt', 'utf-8').trimEnd());
        });

        test('can ignore files', async () => {
            let stdout = '';
            const frak = spawn('node', ['/app/bin/frak.js', 'ignore=new file'], { cwd: './tests/fixtures/example.ignore' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdin.write('no');
            frak.stdout.on('data', data => stdout += data);

            await promise;

            assert.notStrictEqual(stdout, ansi.strip(stdout));
            assert.strictEqual(ansi.strip(stdout).trimEnd(), fs.readFileSync('./tests/fixtures/dry-run.ignore.txt', 'utf-8').trimEnd());
        });

        test('runs command after push', async () => {
            let stdout = '';
            const frak = spawn('node', ['/app/bin/frak.js'], { cwd: './tests/fixtures/example.after' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdin.write('yes');
            frak.stdout.on('data', data => stdout += data);

            await promise;

            const expected = [
                '',
                'Run command: echo test',
                '',
                'The above actions will be taken. Continue? (This cannot be undone): ',
                '',
                'Executing commands on remote server.',
                'test',
                'Deployment complete.'
            ].join('\n');

            assert.strictEqual(ansi.strip(stdout).trimEnd(), expected);
        });

        test('works with legacy config', async () => {
            let stdout = '';
            const frak = spawn('node', ['/app/bin/frak.js'], { cwd: './tests/fixtures/example.legacy' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdin.write('no');
            frak.stdout.on('data', data => stdout += data);

            await promise;

            const expected = [
                'Delete      updated link',
                'Delete      updated file',
                'Delete      old link',
                'Delete      file with "quote"',
                'Delete      deleted file',
                '',
                'The above actions will be taken. Continue? (This cannot be undone):'
            ].join('\n');

            assert.strictEqual(ansi.strip(stdout).trimEnd(), expected);
        });
    });

    suite('pull', () => {
        test('can pull', async () => {
            let stdout = '';
            const frak = spawn('node', ['/app/bin/frak.js', 'path=updated\\ file', 'pull'], { cwd: './tests/fixtures/example' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdin.write('no');
            frak.stdout.on('data', data => stdout += data);

            await promise;

            assert.notStrictEqual(stdout, ansi.strip(stdout));
            assert.strictEqual(ansi.strip(stdout).trimEnd(), fs.readFileSync('./tests/fixtures/dry-run.pull.txt', 'utf-8').trimEnd());
        });
    });

    suite('backups:list', () => {
        test('can list backups', async() => {
            const frak = spawn('node', ['/app/bin/frak.js', 'backups:list'], { cwd: './tests/fixtures/example' });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            await promise;
        });
    });

    test('errors when load config fails', async () => {
        let stderr = '';
        const frak = spawn('node', ['bin/frak.js'], { cwd: './' });
        const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

        frak.stderr.on('data', data => stderr += data);

        await promise;

        assert.strictEqual(stderr.trimEnd(), ansi.red('Config file not found! Try running frak init.'));
    });

    test('displays usage', async () => {
        let stdout = '';
        const frak = spawn('node', ['bin/frak.js', '--help'], { cwd: './' });
        const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

        frak.stdout.on('data', data => stdout += data);

        await promise;

        assert.match(stdout, /^Usage: frak/);
    });

    test('displays usage and exits', async () => {
        let stdout = '';
        const frak = spawn('node', ['bin/frak.js', 'unknown'], { cwd: './' });
        const promise = new Promise((resolve) => frak.on('exit', (code) => resolve(code)));

        frak.stdout.on('data', data => stdout += data);

        const code = await promise;

        assert.match(stdout, /^Usage: frak/);
        assert.strictEqual(code, 1);
    });
});
