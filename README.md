<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/frakjs/frak">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud-upload-icon lucide-cloud-upload"><path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/></svg>
  </a>

  <h3 align="center">frak</h3>

  <p align="center">
    Deploy from point A → point B, without the drama.
    <br />
    <br />
    <a href="https://github.com/frakjs/frak/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/frakjs/frak/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https://frakjs.com)

**`frak`** is a tiny JavaScript binary for deployments that don’t need containers or repos—just fast, reliable file transfer from point A to point B.

It leverages `rsync` over SSH to push files to a remote server, and is able to visualize file changes in a developer-friendly way. **`frak`** has a number of advanced features beyond syncing files to a remote server, such as keeping a history of deployments for easy rollback, showing file differences prior to pushing, and executing post-deploy hooks.

### 🚀 Features

🔌 **Init once, deploy anytime**<br>
🔎 **Interactive diffs** before every push/pull<br>
📦 **Patch-based backups** stored on your server<br>
🧾 **Post-deploy commands** (e.g. restart services)<br>
📡 **Quick SSH console access** into deploy root<br>
🔁 **Pull support** for syncing back changes<br>
📋 **Backup inspection** with additions/deletions summary

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

Using **`frak`** is simple. All you need is a [Node.js](https://nodejs.org) environment with `npx`.

### Prerequisites

Make sure you have Node.js and `npx` installed.

```bash
node --version
npm --version
npx --version
```

[![Node.js and NPM Screenshot][prerequisites-screenshot]]()

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

The recommended way to run **`frak`** is via the `npx` command.

```bash
npx @frakjs/frak --help
```

If you're prompted to install the package, say _yes_.

```
Need to install the following packages:
@frakjs/frak@0.1.0
Ok to proceed? (y)
```

**`frak`** needs to be initialized in your project directory with the `init` command.

```bash
cd project-folder
npx @frakjs/frak init
```

[![frak init][frak-init-screenshot]]()

This creates a `frak.config.js` file that looks something like this:

```js
export default {
    server: "user@example.com",
    root: "/var/www/html",
};
```

You can replace `server` and `root` with the appropriate values for your environment.

With the configuration in place, you can now start <b>`frak`</b>ing files to your server. It's as simple as the basic command without any arguments.

```bash
npx @frakjs/frak
```

The results of the command will show you a dry-run preview of the changes that will be synced to the remote server. You will be prompted before it proceeds with the actual file transfer.

If you'd like, you can cancel the sync by typing "no" or any non-"yes" value. Perhaps you want to see the changes line-by-line. **`frak`** can do this too!

```bash
npx @frakjs/frak diff
```

The command above will compare all the changes, and present a colorful git-style patch that you can inspect in your terminal.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [ ] Send an alert via Slack after push events
- [ ] Parallel deployments to multiple environments at once

See the [open issues](https://github.com/frakjs/frak/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Top contributors:

<a href="https://github.com/frakjs/frak/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=frakjs/frak" alt="contrib.rocks image" />
</a>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Frank Strube - [@strube](https://x.com/strube) - contact@frakjs.com

Project Link: [https://github.com/frakjs/frak](https://github.com/frakjs/frak)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/frakjs/frak.svg?style=for-the-badge
[contributors-url]: https://github.com/frakjs/frak/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/frakjs/frak.svg?style=for-the-badge
[forks-url]: https://github.com/frakjs/frak/network/members
[stars-shield]: https://img.shields.io/github/stars/frakjs/frak.svg?style=for-the-badge
[stars-url]: https://github.com/frakjs/frak/stargazers
[issues-shield]: https://img.shields.io/github/issues/frakjs/frak.svg?style=for-the-badge
[issues-url]: https://github.com/frakjs/frak/issues
[license-shield]: https://img.shields.io/github/license/frakjs/frak.svg?style=for-the-badge
[license-url]: https://github.com/frakjs/frak/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
[prerequisites-screenshot]: images/node-npm-version.png
[frak-init-screenshot]: images/frak-init-screenshot.png
