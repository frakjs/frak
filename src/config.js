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

    if (config.become === true) {
        return `sudo rsync`;
    } else if (config.become) {
        return `sudo -u ${config.become}`;
    }

    return 'rsync';
}

/**
 * Build the remote shell prefix that runs the following command via sudo.
 *
 * The sudo password is read from the first line of stdin; everything after it
 * is left untouched for the command itself (rsync protocol data, patch
 * contents, or a shell script). sudo gets the password through an askpass
 * helper in a private temporary directory, so it never consumes command input
 * and no fixed remote FIFO is left behind.
 */
export function sudo_command() {
    if (!config.become) {
        return '';
    }

    const becomeUser = config.become === true ? '' : String(config.become);

    if (becomeUser && !/^[A-Za-z0-9._-]+$/.test(becomeUser)) {
        throw new Error(`Invalid become user: ${becomeUser}`);
    }

    const userArgs = becomeUser ? `-u ${becomeUser}` : '';

    return [
        '[ -t 0 ] && stty -echo 2>/dev/null || true',
        "IFS= read -r FRAK_SUDO_PASS || FRAK_SUDO_PASS=''",
        '[ -t 0 ] && stty echo 2>/dev/null || true',
        'FRAK_ASKPASS_DIR=$(mktemp -d "${HOME:-/tmp}/.frak-askpass.XXXXXX" 2>/dev/null || mktemp -d "${TMPDIR:-/tmp}/frak-askpass.XXXXXX") || exit 1',
        'trap \'rm -rf "$FRAK_ASKPASS_DIR"\' EXIT',
        'FRAK_ASKPASS="$FRAK_ASKPASS_DIR/askpass"',
        'printf \'#!/bin/sh\\nprintf "%%s\\\\n" "$FRAK_SUDO_PASS"\\n\' > "$FRAK_ASKPASS" || exit 1',
        'chmod 700 "$FRAK_ASKPASS" || exit 1',
        'export FRAK_SUDO_PASS SUDO_ASKPASS="$FRAK_ASKPASS"',
        `sudo -A -p '' -k ${userArgs} -- `,
    ].join('\n');
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
