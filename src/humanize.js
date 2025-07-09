import * as ansi from './ansi.js';

export default function humanize(changes) {
    return changes
        .replace(/cL\+\+\+\+\+\+\+\+\+/g,   ansi.blue('New Link   '))
        .replace(/<f\+\+\+\+\+\+\+\+\+/g,  ansi.green('New File   '))
        .replace(/>f\+\+\+\+\+\+\+\+\+/g,  ansi.green('New File   '))
        .replace(/cd\+\+\+\+\+\+\+\+\+/g,  ansi.green('New Folder '))
        .replace(/<fcsT\.\.\.\.\.\./g,    ansi.yellow('Changed    '))
        .replace(/>fcsT\.\.\.\.\.\./g,    ansi.yellow('Changed    '))
        .replace(/cLc\.T\.\.\.\.\.\./g,   ansi.yellow('Changed    '))
        .replace(/\*deleting  /g,            ansi.red('Delete     '))
}
