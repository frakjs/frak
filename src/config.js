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
 * Determine the sudo_command to use, based on config.become.
 */
export function sudo_command() {
    const scriptTemplate = `#!/bin/sh
f='%s'
[ ! -p "$f" ] && exit 1
IFS= read -r p < "$f" ;
echo "$p" ;
rm "$f" 2>/dev/null ;
`
        .replace(/([$])/g, '\\$1')
        .replace(/\n/g, '\\n');

    const askpass = config.password
        ? `IFS= read -rs pw
mkdir -p ~/.tmp
export FIFO=~/.tmp/frak-ask-pass.fifo
export SUDO_ASKPASS=~/.tmp/frak-ask-pass
rm "$FIFO" 2>/dev/null || true
mkfifo -m 600 "$FIFO"

# Create sudo password script
printf "${scriptTemplate}" "$FIFO" > "$SUDO_ASKPASS"
chmod 700 "$SUDO_ASKPASS"

# Feed password into FIFO in background (blocks until askpass.sh reads it)
( printf "%s\\n" "$pw" > "$FIFO" ) & unset pw
` //.replace(/([$"|\\])/g, '\\$1')
        : '';

    if (config.become === true) {
        return `${askpass} exec sudo --prompt= ${config.password ? ' -A' : ''} -k `;
    } else if (config.become) {
        // return `${askpass} exec sudo -C 4 -u ${config.become} --prompt= ${config.password ? ' -A' : ''} `;
        return `${askpass} exec sudo -u ${config.become} --prompt= ${config.password ? ' -A' : ''} -k `;
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
