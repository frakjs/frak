import assert from 'node:assert';
import * as config from '../../src/config.js';
import path from 'node:path';
import test, { afterEach, beforeEach, suite } from 'node:test';

suite('src/config.js', () => {
    /**
     * Reset the config before each test, so that changes don't leak across tests.
     */
    beforeEach(() => {
        config.reset();
    });

    /**
     * When a config is not found, an error is thrown.
     */
    test('thows if it cannot load a config', () => {
        assert.rejects(
            async () => await config.load(),
            new Error('Config file not found! Try running frak init.')
        );
    });

    /**
     * When a config is not located, null is returned.
     */
    test('returns null if it cannot locate a config', () => {
        const located = config.locate();

        assert.equal(located, null);
    });

    suite('legacy project', () => {
        const originalDirectory = process.cwd();

        /**
         * After each test, change dir back to the original directory, so that changes
         * are not leaked across tests.
         */
        afterEach(() => {
            process.chdir(originalDirectory);
        });

        /**
         * Every test should run from the example.legacy project.
         */
        beforeEach(() => {
            process.chdir('./tests/fixtures/example.legacy');
        });

        /**
         * The .frak file can be located.
         */
        test('can locate a config', () => {
            const expected = path.resolve(process.cwd(), '.frak');
            const located = config.locate();

            assert.equal(located, expected);
        });

        /**
         * Load the .frak file and parse it.
         */
        test('can load a config', async () => {
            const loaded = await config.load();

            assert.deepStrictEqual(loaded, {
                root: '/var/www/html',
                server: 'server',
                staging: {
                    server: 'staging',
                    remote_path: '/var/www/staging',
                },
            });
        });

        /**
         * Load a specific environment in the config.
         */
        test('can load a config environment', async () => {
            const loaded = await config.load('staging');

            assert.deepStrictEqual(loaded, {
                root: '/var/www/staging',
                server: 'staging',
            });
        });
    });

    suite('example project', () => {
        const originalDirectory = process.cwd();

        /**
         * After each test, change dir back to the original directory, so that changes
         * are not leaked across tests.
         */
        afterEach(() => {
            process.chdir(originalDirectory);
        });

        /**
         * Every test should run from the example.legacy project.
         */
        beforeEach(() => {
            process.chdir('./tests/fixtures/example');
        });

        /**
         * The frak.config.js file can be located.
         */
        test('can locate a config', () => {
            const expected = path.resolve(process.cwd(), 'frak.config.js');
            const located = config.locate();

            assert.equal(located, expected);
        });

        /**
         * Load the frak.config.js file and parse it.
         */
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

        /**
         * The loaded config can be accessed at `config.default`.
         */
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

        /**
         * Load the staging environment in the frak.config.js file.
         */
        test('can load a config environment', async () => {
            const loaded = await config.load('staging');

            assert.deepStrictEqual(loaded, {
                root: '/var/www/html',
                server: 'staging.frakjs.com',
            });
        });

        /**
         * Try to load an environment that isn't defined.
         */
        test('throws error when environment is not found', async () => {
            assert.rejects(
                async () => await config.load('production'),
                new Error('Missing configuration for environment "production"!')
            );
        });
    });
});
