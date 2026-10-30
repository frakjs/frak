import * as ansi from '../../src/ansi.js';
import assert from 'node:assert';
import * as cli from '../../src/cli.js';
import fs from 'node:fs';
import stream from 'node:stream';
import test, { after, before, beforeEach, suite } from 'node:test';

suite('src/cli.js', () => {
    /**
     * Parse an empty command.
     */
    test('default command is "push"', () => {
        const { command, options } = cli.parse([]);

        assert.strictEqual(command, 'push');
        assert.deepStrictEqual(options, { colorize: true });
    });

    /**
     * Issue a command with some arguments.
     */
    test('can parse commandline arguments', () => {
        const args = 'pull ignore=test arg=another'.split(' ');
        const { command, options } = cli.parse(args);

        assert.strictEqual(command, 'pull');
        assert.deepStrictEqual(options, { arg: 'another', colorize: true, ignore: 'test' });
    });

    /**
     * Send a command twice, the second one should take over.
     */
    test('can override command', () => {
        const args = 'pull ignore=test arg=another diff'.split(' ');
        const { command, options } = cli.parse(args);

        assert.strictEqual(command, 'diff');

        assert.deepStrictEqual(options, { arg: 'another', colorize: true, ignore: 'test' });
    });

    /**
     * Call cli.agree() and check that it returns true when "yes" is given.
     */
    test('can prompt for agreement (yes)', async () => {
        let output = '';
        const stdin = new stream.Readable.from('yes');
        const stdout = new stream.Writable({
            write(data) {
                output += data.toString();
            },
        });
        const answer = new Promise((resolve) => {
            stdin.on('data', () => resolve());
        });
        const prompt = cli.agree('Do you agree? ', { stdin, stdout });

        const [result] = await Promise.all([prompt, answer]);

        assert.equal(output, 'Do you agree? ');
        assert.equal(result, true);
    });

    /**
     * Call cli.agree() and check that it returns false when "no" is given.
     */
    test('can prompt for agreement (no)', async () => {
        let output = '';
        const stdin = new stream.Readable.from('no');
        const stdout = new stream.Writable({
            write(data) {
                output += data.toString();
            },
        });
        const answer = new Promise((resolve) => {
            stdin.on('data', () => resolve());
        });
        const prompt = cli.agree('Do you agree? ', { stdin, stdout });

        const [result] = await Promise.all([prompt, answer]);

        assert.equal(output, 'Do you agree? ');
        assert.equal(result, false);
    });

    suite('Table', () => {
        let output = [];

        /**
         * Spy on console.log, accumulating in an array.
         */
        before(function () {
            console.log = ((original) => {
                let log = function () {
                    output.push([].join.call(arguments, ' '));
                };

                log.restore = function () {
                    console.log = original;
                };

                return log;
            })(console.log);
        });

        /**
         * Clear the output array before each test.
         */
        beforeEach(function () {
            output = [];
        });

        /**
         * Restore the spy when all tests are finished.
         */
        after(function () {
            console.log.restore();
        });

        /**
         * Construct a table using the cli.Table() class.
         */
        test('can output a table', () => {
            const table = new cli.Table([
                { header: 'A', width: 5 },
                { header: 'Another', width: 15 },
                { header: 'C', width: 10 },
            ]);

            table.row([1, 2, 3]);

            table.row([4, 5, 6]);

            table.print();

            assert.strictEqual(
                ansi.strip(output.join('\n')),
                fs.readFileSync('./tests/fixtures/table.txt', 'utf-8').trimEnd()
            );
        });
    });
});
