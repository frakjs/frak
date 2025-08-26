import assert from 'node:assert';
import * as config from '../../src/config.js';
import path from 'node:path';
import test, { afterEach, beforeEach, suite } from 'node:test';

suite('src/config.js', () => {
    beforeEach(() => {
        config.reset();
    })

    test('returns null if it cannot locate a config', () => {
        assert.rejects(async () => await config.load(), new Error('Config file not found! Try running frak init.'));
    });

    test('thows if it cannot load a config', () => {
        const located = config.locate();

        assert.equal(located, null);
    });

    suite('legacy project', () => {
        const originalDirectory = process.cwd();

        afterEach(() => {
            process.chdir(originalDirectory);
        });

        beforeEach(() => {
            process.chdir('./tests/fixtures/example.legacy');
        });

        test('can locate a config', () => {
            const expected = path.resolve(process.cwd(), '.frak');
            const located = config.locate();

            assert.equal(located, expected);
        });

        test('can load a config', async () => {
            const loaded = await config.load();

            assert.deepStrictEqual(loaded, {
                root: '/var/www/html',
                server: 'server',
                staging: {
                    server: 'staging',
                },
            });
        });
    });

    suite('example project', () => {
        const originalDirectory = process.cwd();

        afterEach(() => {
            process.chdir(originalDirectory);
        });

        beforeEach(() => {
            process.chdir('./tests/fixtures/example');
        });

        test('can locate a config', () => {
            const expected = path.resolve(process.cwd(), 'frak.config.js');
            const located = config.locate();

            assert.equal(located, expected);
        });

        test('can load a config', async () => {
            const loaded = await config.load();

            assert.deepStrictEqual(loaded, {
                root: '/var/www/html',
                server: 'server',
                staging: {
                    server: 'staging.frakjs.com',
                },
            });
        });

        test('loading config updates imported config', async () => {
            await config.load();

            assert.deepStrictEqual(config.default, {
                root: '/var/www/html',
                server: 'server',
                staging: {
                    server: 'staging.frakjs.com',
                },
            });
        });

        test('can load a config environment', async () => {
            const loaded = await config.load('staging');

            assert.deepStrictEqual(loaded, {
                root: '/var/www/html',
                server: 'staging.frakjs.com',
            });
        });

        test('throws error when environment is not found', async () => {
            assert.rejects(async () => await config.load('production'), new Error('Missing configuration for environment "production"!'));
        });
    });
});
