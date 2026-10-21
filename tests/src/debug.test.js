import assert from 'node:assert';
import debug from '../../src/debug.js';
import test, { afterEach, beforeEach, suite } from 'node:test';
import * as ansi from '../../src/ansi.js';

suite('src/debug.js', () => {
    let output = '';
    let env = {};

    beforeEach(() => {
        console.log = ((original) => {
            const log = function () {
                output += Array.prototype.join.call(arguments, ' ');
            };

            log.restore = () => {
                console.log = original;
            };

            return log;
        })(console.log);

        output = '';

        env = process.env;
    });

    afterEach(() => {
        console.log.restore();
        process.env = env;
    });

    test('suppresses debug messages', () => {
        debug('Hello');

        assert.equal(output, '');
    });

    test('outputs debug messages', () => {
        process.env.DEBUG = true;

        debug('Hello');

        assert.equal(output, ansi.bold(ansi.cyan('DEBUG:')) + ' Hello');
    });
});
