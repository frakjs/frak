import * as ansi from '../../src/ansi.js';
import assert from 'node:assert';
import * as cli from '../../src/cli.js';
import stream from 'node:stream';
import test, { after, before, beforeEach, suite } from 'node:test';

suite('src/cli.js', () => {
    test('default command is "push"', () => {
        const { command, options } = cli.parse([]);

        assert.strictEqual(command, 'push');
        assert.deepStrictEqual(options, { colorize: true });
    });

    test('can parse commandline arguments', () => {
        const args = 'pull ignore=test arg=another'.split(' ');
        const { command, options } = cli.parse(args);

        assert.strictEqual(command, 'pull');
        assert.deepStrictEqual(options, { arg: 'another', colorize: true, ignore: 'test' });
    });

    test('can override command', () => {
        const args = 'pull ignore=test arg=another diff'.split(' ');
        const { command, options } = cli.parse(args);

        assert.strictEqual(command, 'diff');

        assert.deepStrictEqual(options, { arg: 'another', colorize: true, ignore: 'test' });
    });

    test('can prompt for agreement (yes)', async () => {
        let output = '';
        const stdin = new stream.Readable.from('yes');
        const stdout = new stream.Writable({
            write(data) {
                output += data.toString();
            }
        });
        const answer = new Promise((resolve) => {
            stdin.on('data', () => resolve());
        });
        const prompt = cli.agree('Do you agree? ', { stdin, stdout });

        const [ result ] = await Promise.all([ prompt, answer ]);

        assert.equal(output, 'Do you agree? ');
        assert.equal(result, true);
    });

    test('can prompt for agreement (no)', async () => {
        let output = '';
        const stdin = new stream.Readable.from('no');
        const stdout = new stream.Writable({
            write(data) {
                output += data.toString();
            }
        });
        const answer = new Promise((resolve) => {
            stdin.on('data', () => resolve());
        });
        const prompt = cli.agree('Do you agree? ', { stdin, stdout });

        const [ result ] = await Promise.all([ prompt, answer ]);

        assert.equal(output, 'Do you agree? ');
        assert.equal(result, false);
    });

    suite('Table', () => {
        let output = [];

        before(function() {
            console.log = ((original) => {
                let log = function() {
                    output.push([].join.call(arguments, ' '));
                };

                log.restore = function() {
                    console.log = original;
                }

                return log;
            })(console.log);
        });

        beforeEach(function() {
            output = [];
        });

        after(function() {
            console.log.restore();
        });

        test('can output a table', () => {
            const table = new cli.Table([
                { header: 'A', width: 5 },
                { header: 'Another', width: 15 },
                { header: 'C', width: 10 },
            ]);

            table.row([
                1, 2, 3
            ]);

            table.row([
                4, 5, 6
            ]);

            table.print();

            assert.strictEqual(
                output.join('\n'),
                [
                    ansi.gray('+-----+---------------+----------+'),
                    ansi.gray('|') + ' ' + ansi.bold('A') + '   ' +
                    ansi.gray('|') + ' ' + ansi.bold('Another') + '       ' +
                    ansi.gray('|') + ' ' + ansi.bold('C') + '        ' +
                    ansi.gray('|'),
                    ansi.gray('+-----+---------------+----------+'),
                    ansi.gray('|') + ' 1   ' +
                    ansi.gray('|') + ' 2             ' +
                    ansi.gray('|') + ' 3        ' +
                    ansi.gray('|'),
                    ansi.gray('+-----+---------------+----------+'),
                    ansi.gray('|') + ' 4   ' +
                    ansi.gray('|') + ' 5             ' +
                    ansi.gray('|') + ' 6        ' +
                    ansi.gray('|'),
                    ansi.gray('+-----+---------------+----------+'),
                ].join('\n'),
            );
        });
    });
});
