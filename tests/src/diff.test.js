import * as ansi from '../../src/ansi.js';
import assert from 'node:assert';
import diff from '../../src/diff.js';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import test, { afterEach, beforeEach, suite } from 'node:test';

suite('src/diff.js', () => {
    let output = '';

    /**
     * Spy on console.log to capture its output without writing to the stdout
     * of the test process. Clear the output variable before each test runs.
     */
    beforeEach(function () {
        console.log = ((original) => {
            let log = function () {
                output += [].join.call(arguments, ' ');
            };

            log.restore = function () {
                console.log = original;
            };

            return log;
        })(console.log);

        output = '';
    });

    /**
     * Restore the console.log spy
     */
    afterEach(function () {
        console.log.restore();
    });

    /**
     * A yellow "no changes detected" message should appear when there are no changes in the diff.
     */
    test('displays message when there are no changes', async () => {
        await diff('');

        assert.equal(output, ansi.yellow('No changes detected.'));
    });

    /**
     * Run an empty diff in non-interactive mode. Assert there is no output.
     */
    test('does nothing when there are no changes in non-interactive mode', async () => {
        await diff('', { interactive: false });

        assert.equal(output, '');
    });

    suite('example project', () => {
        /**
         * Run the diff command in the example project. Match the output to tests/fixtures/patch.diff.
         */
        test('outputs diff when there are changes', async () => {
            let stdout = '';
            const frak = spawn('node', ['../../../bin/frak.js', 'diff'], {
                cwd: './tests/fixtures/example',
            });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdout.on('data', (data) => (stdout += data));

            await promise;

            assert.notStrictEqual(stdout, ansi.strip(stdout));
            assert.strictEqual(
                ansi.strip(stdout),
                fs.readFileSync('./tests/fixtures/patch.diff', 'utf-8')
            );
        });

        /**
         * Run the diff command with a --no-color flag. Output should not have ANSI codes.
         */
        test('outputs diff when there are changes (no color)', async () => {
            let stdout = '';
            const frak = spawn('node', ['../../../bin/frak.js', '--no-color', 'diff'], {
                cwd: './tests/fixtures/example',
            });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdout.on('data', (data) => (stdout += data));

            await promise;

            assert.strictEqual(stdout, ansi.strip(stdout));
            assert.strictEqual(
                ansi.strip(stdout),
                fs.readFileSync('./tests/fixtures/patch.diff', 'utf-8')
            );
        });

        /**
         * Run the diff command in a project with more than 50 changed files. It should prompt
         * before running the comparison.
         */
        test('prompts when there are more than 50 changes', async () => {
            let stdout = '';
            const frak = spawn('node', ['../../../bin/frak.js', 'diff'], {
                cwd: './tests/fixtures/example.50',
            });
            const promise = new Promise((resolve) => frak.on('exit', () => resolve()));

            frak.stdout.on('data', (data) => (stdout += data));
            frak.stdin.write('no');

            await promise;

            assert.strictEqual(stdout, ansi.yellow(`55 file(s) will be compared. Continue? `));
        });
    });
});
