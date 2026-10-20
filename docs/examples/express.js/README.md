## Example Express.js App

Deploying an [Express.js](https://expressjs.com/) application is very simple. You will need the following prerequisites:

1. A Linux server with [Nodes.js](https://nodejs.org/) and [NPM](https://www.npmjs.com/) installed.

## Application Overview

The example application is a simple "Hello, world" app, but yours can be anything you want.

**app.js**

```js
import express from 'express';

const app = express();

const port = 3000;

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Application listening on port ${port}`);
});
```

The application is started using `npm start`, which fires off a call to [`pm2`](https://pm2.io/).

## The Config

The important part of the `frak.config.js` is the `after` option. It tells our server to install dependencies and then start-or-reload the PM2 process.

**frak.config.js**

```js
export default {
    server: 'server',
    root: '/var/www/com.example',
    after: 'npm ci ; npm start',
};
```

Obviously, replace `'server'` with your server and the appropriate path.

## Deploying

All you need to do is run `npx @frakjs/frak` in the project directory. `frak` will show you a dry-run and prompt before continuing with the deployment.

The proper way to do that with this example is through [Docker](https://docker.com/) Compose.

**in root of project**

```sh
docker compose up -d
docker compose exec client sh
```

**inside shell on client container**

```sh
cd docs/examples/express.js
npx @frakjs/frak // Or if you are hacking: node ../../../bin/frak.js
```

Saying "yes" to the prompt, you will see that the files are uploaded to the `server` container, and `pm2` reloads the service (or starts it if you're running for the first time).
