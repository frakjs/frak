import assert from 'node:assert';
import debug from '../../src/debug.js';
import test, { afterEach, beforeEach, suite } from 'node:test';
import * as ansi from '../../src/ansi.js';

suite('src/debug.js', () => {
    let output = '';
    let env = {};

    /**
     * Spy on console.log so we can capture output. And keep track of the env because
     * we use it to trigger debug mode.
     */
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

    /**
     * Restore the console spy and the environment after each test.
     */
    afterEach(() => {
        console.log.restore();
        process.env = env;
    });

    /**
     * Debug won't print when the env variable is not set.
     */
    test('suppresses debug messages', () => {
        debug('Hello');

        assert.equal(output, '');
    });

    /**
     * Debug will print when DEBUG is true in the environment.
     */
    test('outputs debug messages', () => {
        process.env.DEBUG = true;

        debug('Hello');

        assert.equal(output, ansi.bold(ansi.cyan('DEBUG:')) + ' Hello');
    });
});
