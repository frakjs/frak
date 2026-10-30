## Getting Started

Frak.js is designed to run with minimal dependencies. You can run it directly via `npx`:

```sh
npx @frakjs/frak --help
```

[![screenshot][product-screenshot]](<>)

```sh
npx @frakjs/frak init
```

[![frak-init-screenshot][init-screenshot]](<>)

## Configuration

You can configure your `frak.js` environment by editing the `frak.config.js` and `.frakignore` files.

**frak.config.js (minimal)**

```js
export default {
    server: 'user@server',
    root: '/var/www/html',
};
```

The `server` property will inherit your SSH config, so you can add hosts, ports, and other properties to `~/.ssh/config` if you need to.

If you have multiple environments, such as staging and production, you can specify them in your `frak.config.js` as well:

**frak.config.js (multi-environment)**

```js
export default {
    server: 'user@server',
    root: '/var/www/html',
    staging: {
        server: 'user@staging-server',
    },
    production: {
        server: 'user@production-server',
    },
};
```

The `.frakignore` file can be created if you need to ignore certain files during push/pull operations:

**.frakignore**

```
- /node_modules/
- /vendor/
```

The file uses the same syntax as [rsync filter rules](https://download.samba.org/pub/rsync/rsync.1#FILTER_RULES). Basically, lines starting with `-` will exclude that path, and lines with `+` will include the path.

## Examples

Frak.js can be used in just about any environment. See the following links for examples:

- [Plain HTML](./examples/html/README.md)
- [Express.js](./examples/express.js/README.md)
- [Laravel](./examples/laravel/README.md)

## Reference

### `frak.config.js`

| property   | type                | note                                                                  |
| ---------- | ------------------- | --------------------------------------------------------------------- |
| `server`   | `string` (required) | The hostname of the remote server                                     |
| `root`     | `string` (required) | The path on the remote server where files will go                     |
| `after`    | `string`            | The commands to run on the server after a push                        |
| `[string]` | `object`            | Define an optional environment. Selected by the `env=[string]` option |

### Commands

**push (default)**

```js
npx @frakjs/frak
```

| option            | note                                                     |
| ----------------- | -------------------------------------------------------- |
| `env=[string]`    | Specify which environment to load from `frak.config.js`. |
| `ignore=[string]` | A space-separated list of files/folders to ignore.       |
| `path=[string]`   | A space-separated list of files/folders to include.      |

**backups:list**

```js
npx @frakjs/frak backups:list
```

| option         | note                                                     |
| -------------- | -------------------------------------------------------- |
| `env=[string]` | Specify which environment to load from `frak.config.js`. |

**console**

```js
npx @frakjs/frak console
```

| option             | note                                                     |
| ------------------ | -------------------------------------------------------- |
| `env=[string]`     | Specify which environment to load from `frak.config.js`. |
| `command=[string]` | An optional command to run (defaults to a login shell).  |

**diff**

```js
npx @frakjs/frak diff
```

| option            | note                                                     |
| ----------------- | -------------------------------------------------------- |
| `env=[string]`    | Specify which environment to load from `frak.config.js`. |
| `ignore=[string]` | A space-separated list of files/folders to ignore.       |
| `env=[string]`    | Specify which environment to load from `frak.config.js`. |

**init**

```js
npx @frakjs/frak init
```

**pull**

```js
npx @frakjs/frak
```

| option            | note                                                     |
| ----------------- | -------------------------------------------------------- |
| `env=[string]`    | Specify which environment to load from `frak.config.js`. |
| `ignore=[string]` | A space-separated list of files/folders to ignore.       |
| `path=[string]`   | A space-separated list of files/folders to include.      |

[product-screenshot]: ../images/screenshots/screenshot.png
[init-screenshot]: ../images/screenshots/frak-init-screenshot.png
