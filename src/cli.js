import * as ansi from './ansi.js';

/**
 * @typedef {Object} CommandOptions
 *
 * @property {Boolean} colorize
 * @property {String}  command
 * @property {String}  env
 * @property {String}  ignore
 * @property {Boolean} interactive
 * @property {String}  path
 */

/**
 * Parse the arguments into command and options.
 *
 * @param {Array} args
 * @returns {{
 *     command: 'backups:list'|'console'|'help'|'pull'|'push'|'version',
 *     options: CommandOptions
 * }}
 */
export function parse(args) {
    let command = 'push';
    const options = {
        colorize: true,
    };

    for (let arg of args) {
        if (arg === '--yes' || arg === '-y') {
            options.interactive = false;
        } else if (arg === '--no-color') {
            options.colorize = false;
        } else if (arg.includes('=')) {
            const [option, value] = arg.split('=', 2);

            options[option] = value;
        } else {
            command = arg;
        }
    }

    return { command, options };
}

/**
 * Prompt the user with a string, returns a promise that resolves true/false.
 *
 * @param {String} string
 * @param {Object} [options={}]
 * @param {import('node:stream').Readable} [options.stdin]
 * @param {import('node:stream').Writable} [options.stdout]
 */
export async function agree(string, { stdin = null, stdout = null } = {}) {
    stdout = stdout || process.stdout;
    stdin = stdin || process.stdin;

    stdout.write(string);

    const answer = await new Promise((resolve) => {
        stdin.on('data', (data) => resolve(data));
    });

    return ['y', 'yes'].includes(`${answer}`.trim().toLowerCase());
}

/**
 * Build an ASCI table using column/row definitions.
 */
export class Table {
    /**
     * Define a table first by its columns.
     *
     * @param {Array<{header: String, width: Number}>} columns
     */
    constructor(columns) {
        this.columns = columns;
        this.rows = [];
    }

    /**
     * Push a row onto the table.
     *
     * @param {Array<any>} cells
     * @returns void
     */
    row(cells) {
        this.rows.push(cells);
    }

    /**
     * Outputs the table to the console.
     *
     * @returns void
     */
    print() {
        const { border, header } = this.columns.reduce(({ header, border }, column, i) => {
            const width = ansi.strip(column.header).length;
            const padding = Math.max(0, column.width - width - 2);
            const paddingString = new Array(padding + 1).join(' ');
            const borderString = new Array(column.width + 1).join('-');

            return {
                border: `${border || ''}+${borderString}${i === this.columns.length - 1 ? '+' : ''}`,
                header: `${header || ''}${ansi.gray('|')} ${ansi.bold(column.header)}${paddingString} ${i === this.columns.length - 1 ? ansi.gray('|') : ''}`,
            };
        }, {});

        console.log(ansi.gray(border));
        console.log(header);
        console.log(ansi.gray(border));

        this.rows.forEach((r) => {
            const rowString = r.reduce((row, cell, i) => {
                const width = ansi.strip(cell).length;
                const padding = Math.max(0, this.columns[i].width - width - 2);
                const paddingString = new Array(padding + 1).join(' ');

                return `${row || ''}${ansi.gray('|')} ${cell}${paddingString} ${i === r.length - 1 ? ansi.gray('|') : ''}`;
            }, '');

            console.log(rowString);
            console.log(ansi.gray(border));
        });
    }
}
