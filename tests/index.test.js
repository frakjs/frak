import fs from 'node:fs';
import path from 'node:path';
import { run } from 'node:test';
import { junit, spec } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stream = run({
    files: [
        `${__dirname}/bin/frak.test.js`,
        `${__dirname}/src/ansi.test.js`,
        `${__dirname}/src/cli.test.js`,
        `${__dirname}/src/config.test.js`,
        `${__dirname}/src/crypto.test.js`,
        `${__dirname}/src/date.test.js`,
        `${__dirname}/src/debug.test.js`,
        `${__dirname}/src/diff.test.js`,
    ],
});

stream.compose(new spec()).pipe(process.stdout);
stream.compose(junit).pipe(fs.createWriteStream(`${__dirname}/junit.xml`));
