import assert from 'node:assert';
import * as crypto from '../../src/crypto.js';
import test, { suite } from 'node:test';

suite('src/crypto.js', () => {
    test('can generate sha256', () => {
        const hash = crypto.sha256('hello');

        assert.equal(hash.length, 64);
    });
});
