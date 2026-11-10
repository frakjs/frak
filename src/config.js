import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import * as cli from './cli.js';

// Cached config object. The config is stored in here so it can
// be loaded once and imported across all modules.
/**
 * @type {{
 *     after: String,
 *     root: String,
 *     server: String,
 *     become: String | Boolean,
 * }}
 */
let config = {};

/**
 * Determine the rsync path from the config. In this order:
 *
 * 1. if rsync_path is declared in config
 * 2. if become is declared, use sudo_command
 * 3. otherwise, just plain rsync
 */
export function rsync_path() {
    if ('rsync_path' in config) {
        return config.rsync_path;
    }

    if (config.become) {
        return `${sudo_command()} rsync`;
    }

    return 'rsync';
}

/**
 * Determine the sudo_command to use, based on config.become.
 */
export function sudo_command() {
    const askpass = config.password
        ? `export SUDO_ASKPASS=~/.tmp/frak-ask-pass; mkdir -p ~/.tmp; echo '#!/bin/sh\necho ${config.password}; rm $0' > ~/.tmp/frak-ask-pass; chmod +x ~/.tmp/frak-ask-pass;`
        : '';

    if (config.become === true) {
        return `${askpass} sudo --prompt= ${config.password ? ' -A' : ''} `;
    } else if (config.become) {
        return `${askpass} sudo -u ${config.become} --prompt= ${config.password ? ' -A' : ''} `;
    } else {
        return '';
    }
}

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
        Object.assign(config, yaml.parse(fs.readFileSync(configPath).toString('utf-8')));
    }

    if (env in config) {
        Object.assign(config, { ...config[env] });

        delete config[env];
    } else if (env) {
        throw new Error(`Missing configuration for environment "${env}"!`);
    }

    // Support legacy config, remote_path instead of root
    if ('remote_path' in config) {
        config.root = config.remote_path;

        delete config.remote_path;
    }

    // Prompt for password if become is true
    if (config.become && process.stdin.isTTY) {
        config.password = await cli.password('[sudo] password: ');
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
