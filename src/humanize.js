import * as ansi from './ansi.js';

export default function humanize(changes) {
    return changes
        .replace(/cL\+\+\+\+\+\+\+\+\+/g,   ansi.blue('New Link   '))
        .replace(/<f\+\+\+\+\+\+\+\+\+/g,  ansi.green('New File   '))
        .replace(/>f\+\+\+\+\+\+\+\+\+/g,  ansi.green('New File   '))
        .replace(/cd\+\+\+\+\+\+\+\+\+/g,  ansi.green('New Folder '))
        .replace(/<fc..\.\.\.\.\.\./g,    ansi.yellow('Update     '))
        .replace(/>fc..\.\.\.\.\.\./g,    ansi.yellow('Update     '))
        .replace(/cLc\.T\.\.\.\.\.\./g,   ansi.yellow('Update     '))
        .replace(/\*deleting {2}/g,          ansi.red('Delete     '))
}
