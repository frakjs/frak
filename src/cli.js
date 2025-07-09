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
