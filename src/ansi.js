const ansi = {
    CLEAR: '\u001b[0m',
    BOLD: '\u001b[1m',
    UNDERLINE: '\u001b[4m',

    BLACK: '\u001b[30m',
    RED: '\u001b[31m',
    GREEN: '\u001b[32m',
    YELLOW: '\u001b[33m',
    BLUE: '\u001b[34m',
    MAGENTA: '\u001b[35m',
    CYAN: '\u001b[36m',
    WHITE: '\u001b[37m',
};

export function bold(string) {
    return `${ansi.BOLD}${string}${ansi.CLEAR}`;
}

export function underline(string) {
    return `${ansi.UNDERLINE}${string}${ansi.CLEAR}`;
}

export function black(string) {
    return `${ansi.BLACK}${string}${ansi.CLEAR}`;
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
