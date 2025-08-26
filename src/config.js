import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// Cached config object. The config is stored in here so it can
// be loaded once and imported across all modules.
let config = {};

/**
 * Locate a config file in the current working directory or its parents.
 *
 * @returns {String}
 */
export function locate() {
    for (let dir = process.cwd(); dir != '/'; dir = path.dirname(dir)) {
        const configPath = path.join(dir, 'frak.config.js');
        const yamlPath = path.join(dir, '.frak');

        if (fs.existsSync(configPath)) {
            return configPath;
        }

        if (fs.existsSync(yamlPath)) {
            return yamlPath;
        }
    }

    return null;
}

/**
 * Load the config values.
 *
 * @returns {Object}
 */
export async function load(env = null) {
    const configPath = locate();

    if (!fs.existsSync(configPath)) {
        throw new Error('Config file not found! Try running frak init.');
    }

    if (path.basename(configPath) === 'frak.config.js') {
        Object.assign(config, (await import(configPath)).default);
    } else if (path.basename(configPath) === '.frak') {
        Object.assign(config, parse(fs.readFileSync(configPath).toString('utf-8')));
    }

    if (env in config) {
        Object.assign(config, {...config[env]});

        delete config[env];

        return config;
    }

    if (env) {
        throw new Error(`Missing configuration for environment "${env}"!`);
    }

    // Support legacy config, remote_path instead of root
    if ('remote_path' in config) {
        config.root = config.remote_path;

        delete config.remote_path;
    }

    return config;
}

/**
 * Reset the config, useful when unit testing.
 *
 * @returns {Object}
 */
export function reset() {
    const old = { ...config };

    Object.entries(config).forEach(([key]) => {
        delete config[key];
    });

    return old;
}

export default config;

