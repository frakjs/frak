import * as ansi from './ansi.js';

/**
 * Parse the arguments into command and options.
 *
 * @param {Array} args
 * @returns {{command: String, options: Object}}
 */
export function parse(args) {
    let command = 'push';
    const options = {
        colorize: true,
    };

    for (let arg of args) {
        if (arg.includes('=')) {
            const [option, value] = arg.split('=', 2);

            options[option] = value;
        } else {
            command = arg;
        }
    }

    return { command, options };
}

export async function agree(string) {
    process.stdout.write(string);

    const answer = await new Promise((resolve, reject) => {
        process.stdin.on('data', data => resolve(data));
    });

    return ['y', 'yes'].includes(`${answer}`.trim().toLowerCase());
}

export class Table {
    constructor(columns) {
        this.columns = columns;
        this.rows = [];
    }

    row(cells) {
        this.rows.push(cells);
    }

    print() {
        const { border, header } = this.columns.reduce(({ header, border }, column, i) => {
            const width = ansi.strip(column.header).length;
            const padding = Math.max(0, column.width - width - 2);
            const paddingString = (new Array(padding + 1)).join(' ');
            const borderString = (new Array(column.width + 1).join('-'));

            return {
                border: `${border || ''}+${borderString}${i === this.columns.length - 1 ? '+' : ''}`,
                header: `${header || ''}${ansi.gray('|')} ${ansi.bold(column.header)}${paddingString} ${i === this.columns.length - 1 ? ansi.gray('|') : ''}`,
            };
        }, {});

        console.log(ansi.gray(border));
        console.log(header);
        console.log(ansi.gray(border));

        this.rows.forEach(r => {
            const rowString = r.reduce((row, cell, i) => {
                const width = ansi.strip(cell).length
                const padding = Math.max(0, this.columns[i].width - width - 2);
                const paddingString = (new Array(padding + 1)).join(' ');
                const borderString = (new Array(this.columns[i].width + 1).join('-'));

                return `${row || ''}${ansi.gray('|')} ${cell}${paddingString} ${i === r.length - 1 ? ansi.gray('|') : ''}`
            }, '');

            console.log(rowString);
            console.log(ansi.gray(border));
        })
    }
}
