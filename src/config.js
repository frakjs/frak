import fs from 'node:fs';
import path from 'node:path';

// Cached config object. The config is stored in here so it can
// be loaded once and imported across all modules.
let config = {};

/**
 * Locate a config file in the current working directory or its parents.
 *
 * @returns {String}
 */
export function locate() {
    for (let dir = process.cwd(); dir; dir = path.dirname(dir)) {
        const configPath = path.join(dir, 'frak.config.js');

        if (fs.existsSync(configPath)) {
            return configPath;
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

    if (fs.existsSync(configPath)) {
        Object.assign(config, (await import(configPath)).default);

        if (env in config) {
            return Object.assign(config, {...config[env]});
        }

        if (env) {
            throw new RuntimeError(`Missing configuration for environment "${env}"!`);
        }

        return config;
    }

    throw new RuntimeError('Config file not found!');
}

export default config;

