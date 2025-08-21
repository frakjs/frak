const ansi = {
    CLEAR: '\u001b[0m',
    BOLD: '\u001b[1m',
    UNDERLINE: '\u001b[4m',

    BLACK: '\u001b[30m',
    GRAY: '\u001b[90m',
    RED: '\u001b[31m',
    GREEN: '\u001b[32m',
    YELLOW: '\u001b[33m',
    BLUE: '\u001b[34m',
    MAGENTA: '\u001b[35m',
    CYAN: '\u001b[36m',
    WHITE: '\u001b[37m',
};

export function strip(string) {
    return `${string}`
        .replace(new RegExp(ansi.CLEAR.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.BOLD.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.UNDERLINE.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.BLACK.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.GRAY.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.RED.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.GREEN.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.YELLOW.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.BLUE.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.MAGENTA.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.CYAN.replace('[', '\\['), 'g'), '')
        .replace(new RegExp(ansi.WHITE.replace('[', '\\['), 'g'), '');
}

export function bold(string) {
    return `${ansi.BOLD}${string}${ansi.CLEAR}`;
}

export function underline(string) {
    return `${ansi.UNDERLINE}${string}${ansi.CLEAR}`;
}

export function black(string) {
    return `${ansi.BLACK}${string}${ansi.CLEAR}`;
}

export function gray(string) {
    return `${ansi.GRAY}${string}${ansi.CLEAR}`;
}

export function red(string) {
    return `${ansi.RED}${string}${ansi.CLEAR}`;
}

export function green(string) {
    return `${ansi.GREEN}${string}${ansi.CLEAR}`;
}

export function yellow(string) {
    return `${ansi.YELLOW}${string}${ansi.CLEAR}`;
}

export function blue(string) {
    return `${ansi.BLUE}${string}${ansi.CLEAR}`;
}

export function magenta(string) {
    return `${ansi.MAGENTA}${string}${ansi.CLEAR}`;
}

export function cyan(string) {
    return `${ansi.CYAN}${string}${ansi.CLEAR}`;
}

export function white(string) {
    return `${ansi.WHITE}${string}${ansi.CLEAR}`;
}

export default ansi;
