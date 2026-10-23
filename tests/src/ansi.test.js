import * as ansi from '../../src/ansi.js';
import assert from 'node:assert';
import test, { suite } from 'node:test';

suite('src/ansi.js', () => {
    /**
     * Build an ANSI string, then strip the characters from it.
     */
    test('can strip ansi control characters', () => {
        assert.equal(`${ansi.default.RED}hello${ansi.default.CLEAR}`, ansi.red('hello'));
        assert.equal('hello', ansi.strip(ansi.red('hello')));
    });

    /**
     * Call every ANSI function and verify they end with the "clear" sequence.
     */
    test('ansi control sequences are cleared', () => {
        const functions = [
            'bold',
            'underline',
            'black',
            'gray',
            'red',
            'green',
            'yellow',
            'blue',
            'magenta',
            'cyan',
            'white',
        ];

        for (let name of functions) {
            assert.equal(ansi.default.CLEAR, ansi[name]('hello').slice(-4));
        }
    });
});
