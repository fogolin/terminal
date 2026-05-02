# <img src="./public/favicon.png" alt="logo" width="20"/> Firelin Terminal

A bash-like easter egg terminal widget for websites. Drop one script tag in — users unlock it with the Konami code.

![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)

## Installation

No package manager needed. Copy the built file into your project:

```
dist/{version}/firelin.widget.min.js
```

Then include it in your HTML. Two integration patterns are supported.

## How To Use

### Option A — HTML custom element

```html
<script defer src="/dist/v1/firelin.widget.min.js"></script>
```

### Option B — Script injection (recommended for production)

Loads the script once, configures the widget on load. Safe to paste into any `<head>`.

```html
<script>
	(function (d, s, id, config) {
		var js,
			el = d.getElementsByTagName(s)[0];
		if (d.getElementById(id)) return;
		js = d.createElement(s);
		js.id = id;
		js.src = "/dist/v1/firelin.widget.min.js";
		js.defer = true;
		el.parentNode.insertBefore(js, el);
		js.onload = function () {
			if (window.FirelinTerminal) {
				window.FirelinTerminal.create(config);
			}
		};
	})(document, "script", "firelin-terminal-js", {
		theme: "phosphor",
		title: "mysite — bash",
		osName: "mysite",
		user: "guest",
		welcomeMessage: "Welcome! Type help to get started.",
		history: ["ls /projects", "whoami"],
	});
</script>
```

## Activation

The terminal is hidden by default and revealed through:

| Method        | Trigger                                                              |
| ------------- | -------------------------------------------------------------------- |
| **Desktop**   | `↑ ↑ ↓ ↓ ← → ← → B A` (Konami code)                                  |
| **Mobile**    | Swipe up, up, down, down, left, right, left, right — then double-tap |
| **CSS class** | Any element with class `shell` clicked by the user                   |

```html
<!-- Button that opens the terminal -->
<button class="shell">Open terminal</button>
```

## Configuration

All options are optional.

| Option           | Type                 | Default             | Description                                     |
| ---------------- | -------------------- | ------------------- | ----------------------------------------------- |
| `theme`          | `string`             | `'phosphor'`        | Active color theme                              |
| `title`          | `string`             | `'Terminal — bash'` | Titlebar label                                  |
| `osName`         | `string`             | `'firelin'`         | OS name shown in prompts and `uname`            |
| `user`           | `string`             | `'guest'`           | Default logged-in username                      |
| `welcomeMessage` | `string \| string[]` | —                   | Message(s) shown on boot                        |
| `history`        | `string[]`           | `[]`                | Pre-seeded command history (Up arrow to access) |

## Themes

Switch at runtime with the `theme` command, or set via config.

| ID         | Name                                                    | Style                        |
| ---------- | ------------------------------------------------------- | ---------------------------- |
| `phosphor` | Phosphor                                                | Classic green CRT (default)  |
| `amber`    | Amber                                                   | Warm amber phosphor CRT      |
| `ayu`      | [Ayu Dark](https://terminalcolors.com/themes/ayu/dark/) | Modern dark with warm accent |
| `noctis`   | [Noctis](https://terminalcolors.com/themes/noctis/)     | Cool teal dark theme         |

Inside the terminal, you can view and set themes using:

```bash
theme       # Shows a list of themes an the currently selected one
theme amber # Sets the "amber" theme
```

Theme persists across sessions via `localStorage`.

> Themes AYU and NOCTIS were provided by [TerminalColors](https://terminalcolors.com/).

## Commands

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `help`                  | List available commands        |
| `man <cmd>`             | Show manual page for a command |
| `ls [path]`             | List directory contents        |
| `cd [path]`             | Change directory               |
| `pwd`                   | Print working directory        |
| `cat <file>`            | Print file contents            |
| `tail <file>`           | Print last lines of a file     |
| `find <path> [name]`    | Search for files               |
| `grep <pattern> <file>` | Search file contents           |
| `touch <file>`          | Create empty file              |
| `mkdir <dir>`           | Create directory               |
| `cp <src> <dest>`       | Copy file or directory         |
| `mv <src> <dest>`       | Move / rename                  |
| `rm [-r] <path>`        | Remove file or directory       |
| `nano <file>`           | Basic text editor              |
| `whoami`                | Print current user             |
| `su [user]`             | Switch user                    |
| `top`                   | Live process table             |
| `ping <host>`           | Ping a host                    |
| `curl <url>`            | Fetch a URL                    |
| `print <text>`          | Print text to terminal         |
| `theme [name]`          | Switch color theme             |
| `clear`                 | Clear terminal output          |

### Keyboard shortcuts

| Key       | Action                          |
| --------- | ------------------------------- |
| `↑` / `↓` | Browse command history          |
| `Tab`     | Autocomplete command or path    |
| `Ctrl+C`  | Cancel running command (SIGINT) |

## Example page

`example/index.html` shows both integration methods with live demos. Serve it locally alongside the built widget:

```bash
npm run dev
# then open http://localhost:8080/example/
```

## Development

```bash
npm install          # install dev dependencies
npm run dev          # start dev server with hot reload
npm run build        # produce dist/v1/firelin.widget.min.js
```

Built with vanilla JS + Webpack. No runtime dependencies.

## License

GPL-3.0 — see [LICENSE](LICENSE).
