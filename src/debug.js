import * as ansi from '../src/ansi.js';

/**
 * Wrapper for console.log, only prints in DEBUG mode.
 */
export default function debug() {
    if (process.env.DEBUG) {
        console.log.apply(console, [ansi.bold(ansi.cyan('DEBUG:')), ...arguments]);
    }
}
