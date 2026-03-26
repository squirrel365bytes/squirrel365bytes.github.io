# Hello World — Self-Hosted Extension

This package contains everything you need to host the **Hello World** Tableau extension
on your own web server (Apache, Nginx, IIS, Node, Python, etc.).

## Contents

| File | Purpose |
|------|---------|
| `index.html` | The extension UI — **fully self-contained, no external dependencies** |
| `tableau.extensions.1.latest.min.js` | Tableau Extensions API library |
| `hello-world.trex` | Tableau manifest (edit before use) |
| `README.md` | This file |

## Quick Start

1. **Edit the .trex manifest** — replace every occurrence of `http://YOUR_HOST`
   with the actual URL where you will serve the files.
   Example: `https://intranet.company.com/tableau-extensions/hello-world`

2. **Copy all files to your web server** under the path you chose above.

3. **Verify CORS / HTTPS** — Tableau Server/Cloud requires HTTPS for external extensions.
   Tableau Desktop allows HTTP with a prompt.

4. **Open the .trex in Tableau** — In Tableau Desktop open a workbook,
   add an Extension object to a dashboard or worksheet, and browse to the
   edited `hello-world.trex` file.

## Self-Contained

All CSS and JavaScript is **inlined directly inside `index.html`** — no external
network requests are made at runtime (other than to Tableau itself).
The only separate file needed is `tableau.extensions.1.latest.min.js` which is
included in this package.

## Support

For questions or issues visit https://devizable.com
