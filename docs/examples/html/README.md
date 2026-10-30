## Example HTML

Deploying static sites is very simple. You will need the following prerequisites:

1. A Linux server with Apache / Nginx / or similar installed.

## Application Overview

The example site is a simple "Hello, world", but yours can be anything you want.

**index.html**

```html
<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title></title>
    </head>
    <body>
        <h1>Hello, world!</h1>
        <p>Lorem ipsum dolor sit amet. Consectetur adipiscing il amet.</p>
    </body>
</html>
```

## The Config

This is the bare minimum config.

**frak.config.js**

```js
export default {
    server: 'server',
    root: '/var/www/com.example',
};
```

Obviously, replace `'server'` with your server and the appropriate path.

## Deploying

All you need to do is run `npx @frakjs/frak` in the project directory. `frak` will show you a dry-run and prompt before continuing with the deployment.

### Testing

You can test the deployment through [Docker](https://docker.com/) Compose.

**in root of project**

```sh
docker compose up -d
docker compose exec client sh
```

**inside shell on client container**

```sh
cd docs/examples/html
npx @frakjs/frak // Or if you are hacking: node ../../../bin/frak.js
```

Saying "yes" to the prompt, you will see that the files are uploaded to the `server` container.
