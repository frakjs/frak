# Frak

**Frak** is an agentless deployment tool for web apps. Powered by `rsync` over SSH, it tracks file changes, creates patch backups, and supports dry-run diffs, interactive confirmations, and post-deploy hooks.

> “Frak it, ship it.”

&nbsp;

## 🚀 Features

- 🔌 **Init once, deploy anytime**
- 🔎 **Interactive diffs** before every push/pull
- 📦 **Patch-based backups** stored on your server
- 🧾 **Post-deploy commands** (e.g. restart services)
- 📡 **SSH console access** into deploy root
- 🔁 **Pull support** for syncing back changes
- 📋 **Backup inspection** with additions/deletions summary

## 📦 Installation

```bash
npm install -g @frakjs/frak
```

Or run it on-demand with `npx`

```bash
npx @frakjs/frak <command>
```

## 🛠️ Setup

```bash
frak init
```

This creates a `frak.config.js` file:

```js
export default {
    server: "user@example.com",
    root: "/var/www/html",
    after: "npm run restart" // optional post-deploy hook
};
```

## 🧩 Commands

```
frak init              # Create config file
frak console           # SSH into the deploy root
frak diff              # Show dry-run changes
frak push              # Deploy changes (with confirmation)
frak pull              # Download changes from remote
frak backups:list      # List previous patch deployments
```

## 🔐 Authentication

Frak uses SSH. Make sure your public key is in `~/.ssh/authorized_keys` on the remote server.

## 🧪 Example: Deployment Flow

```bash
frak diff          # See what will change
frak push          # Sync files, confirm, deploy
```

Behind the scenes:

- Files are compared with a dry-run rsync
- If approved, a patch file is generated and saved
- Files are synced live
- Optional after script is run remotely

## 💾 Backups

Each deployment saves a `.patch` file on the server under `.backups/`. You can list them with:

```bash
frak backups:list
```

Output shows:

- Timestamp
- Filename
- Additions and deletions in the patch

## 🧠 Design Philosophy

- Minimal dependencies
- Pure CLI
- Patch-based history
- No Docker or Node on server
- Human-friendly

## 🧰 Advanced Config (optional)

```js
export default {
    server: 'user@host',
    root: '/srv/www',
    after: 'sudo systemctl reload nginx',

    dev: {
        root: '/srv/www-dev',
    },

    production: {
        root: '/srv/www-prod',
    },
};
```

```bash
frak push                   # uses default root-level properties
frak push env=dev           # uses properties in "dev" to override
frak push env=production    # uses properties in "production" to override
```

## 🐛 Debugging

Enable debug output by setting `DEBUG=1`:

```bash
DEBUG=1 frak push
```

## 📄 License

MIT

## 🧑‍💻 Author

Built by [Frank Strube](https://github.com/fstrube)

Contributions and suggestions welcome!
