# How To Use

The project is a browser component ready to use. It is possible to customize the app behavior to fit your needs, style and lore for your project.

Index:

1. Installation:
   - [Option A - HTML custom element](#option-a---html-custom-element)
   - [Option B - Script injection](#option-b---script-injection-recommended-for-production)
2. [Activation](#activation): How to enable it on Desktop, Mobile and using CSS Class
3. [Configuration](#configuration)

## Option A - HTML custom element

```html
<script defer src="/dist/firelin.min.js"></script>
```

## Option B - Script injection (recommended for production)

Loads the script once, configures the widget on load. Safe to paste into any `<head>`.

```html
<script>
	(function (d, s, id, config) {
		var js,
			el = d.getElementsByTagName(s)[0];
		if (d.getElementById(id)) return;
		js = d.createElement(s);
		js.id = id;
		js.src =
			"https://cdn.jsdelivr.net/npm/firelin-terminal/dist/firelin.min.js";
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
		packages: {
			preload: ["hello"], // auto-install from public registry on first load
			local: [
				// private commands — never published to public registry
				{
					name: "myapp",
					description: "My company commands",
					version: "1.0.0",
					src: "/js/myapp-cmd.js",
					commands: ["myapp"],
				},
			],
		},
	});
</script>
```

> [!NOTE]
> This project automatically delivers to NPM under [firelin-terminal](https://www.npmjs.com/package/firelin-terminal). This also means that the script is available on its latest version through fast and reliable CDNs, including:
>
> - Unpkg: `https://unpkg.com/firelin-terminal@latest/dist/firelin.min.js`
> - JSDeliver: `https://cdn.jsdelivr.net/npm/firelin-terminal/dist/firelin.min.js`
> - Skypack: `https://cdn.skypack.dev/firelin-terminal/dist`

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

All options are optional, but can help you make the terminal feel mor like your own project.

| Option                    | Type                 | Default             | Description                                     |
| ------------------------- | -------------------- | ------------------- | ----------------------------------------------- |
| [`theme`](THEMES.md)      | `string`             | `'phosphor'`        | Active color theme                              |
| `title`                   | `string`             | `'Terminal — bash'` | Titlebar label                                  |
| `osName`                  | `string`             | `'firelin'`         | OS name shown in prompts and `uname`            |
| `user`                    | `string`             | `'guest'`           | Default logged-in username                      |
| `welcomeMessage`          | `string \| string[]` | —                   | Message(s) shown on boot                        |
| `history`                 | `string[]`           | `[]`                | Pre-seeded command history (Up arrow to access) |
| [`curl`](CURL.md)         | `object[]`           | `[]`                | Custom simulated `curl` endpoints               |
| [`packages`](PACKAGES.md) | `object`             | —                   | Package manager config (preload + local)        |

> [!NOTE]
> Each configuration option has its own documentation link. Please check each one individually as needed.

### Navigation

_Next up:_ **[Commands ➔](./COMMANDS.md)**

_Back to Docs home:_ **[Documentation Index ➔](./README.md)**
