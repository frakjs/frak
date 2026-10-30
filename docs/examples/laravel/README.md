## Example Laravel App

Deploying Laravel applications is easy. You will need the following prerequisites:

1. A Linux server with PHP installed.

## Application Overview

A sample Laravel application is not included in this repo. Create one in a fresh directory instead.

```sh
composer create-project laravel/laravel ~/Code/example-app # or wherever you create projects
```

Then copy your `frak` files into that folder.

```sh
cp {frak.config.js,.frakignore} ~/Code/example-app/
```

## The Config

The `frak` config is a bit more advanced. Obviously, Laravel has its own incantations in the "after" command. But we can also add an "init" environment to provision the app properly.

**frak.config.js**

```js
export default {
    server: 'server',
    root: '/var/www/com.example.app',
    after: 'composer install --no-dev ; php artisan migrate --force ; php artisan cache:clear ; php artisan view:clear ; php artisan route:clear',
    init: {
        after: 'composer install --no-dev ; [ -f .env ] || cp .env.example .env ; php artisan key:generate ; php artisan migrate --force',
    },
};
```

Obviously, replace `'server'` with your server and the appropriate path.

It's also crucial that you use a `.frakignore` file to train `frak` to send only the applicable files.

**.frakignore**

```
- /.env

# Order is important
+ /bootstrap/cache/.gitignore
- /bootstrap/cache/*

- /database/*.sqlite
- /phpunit.xml

# Order is important
+ /storage/app/private/.gitignore
- /storage/app/private/*
+ /storage/app/public/.gitignore
- /storage/app/public/*
+ /storage/app/framework/cache/data/.gitignore
- /storage/app/framework/cache/data/*
+ /storage/app/framework/cache/locks/.gitignore
- /storage/app/framework/cache/locks/*
+ /storage/app/framework/sessions/.gitignore
- /storage/app/framework/sessions/*
+ /storage/app/framework/testing/.gitignore
- /storage/app/framework/testing/*
+ /storage/app/framework/views/.gitignore
- /storage/app/framework/views/*
+ /storage/logs/.gitignore
- /storage/logs/*

- /tests/
- /vendor/
```

Reasons for ignoring the above files:

| File                 | Reason                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `.env`               | Production environment will be different from your local, and managed securely.                    |
| `bootstrap/cache/`   | These files are generated when the app runs.                                                       |
| `database/*.sqlite/` | The database, duh.                                                                                 |
| `phpunit.xml`        | Tests don't run in production because they expose attack vectors.                                  |
| `storage/...`        | Logs, cache, etc. We need the .gitignore so the directories exist, but we don't want what's inside |
| `tests/`             | No tests on production                                                                             |
| `vendor/`            | Dependencies are installed by composer after every push                                            |

## Deploying

On the first run we want to use our "init" environment, so the proper commands are run.

```sh
npx @frakjs/frak env=init
```

That will push the files and run the commands. The simplest way to serve the app is via `artisan`:

```sh
npx @frakjs/frak console command='php artisan serve'
npx @frakjs/frak console command='php artisan serve --host=[::]' # <- If you need to support IPv6
```

Subsequent deployments can omit the `env=` parameter:

```sh
npx @frakjs/frak
npx @frakjs/frak console command='php artisan serve'
```

## Closing Thoughts

Obviously, you won't want to use `php artisan serve` in production. This is simply a proof-of-concept.

In the real world, you should stand up a proper Apache or Nginx web serve to host your application. Then deploy your Laravel application to the document root.
