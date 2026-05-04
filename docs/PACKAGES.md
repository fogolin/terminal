# Packages

Configures the built-in package manager (`apt`). All sub-fields are optional.

| Field      | Type       | Description                                                                  |
| ---------- | ---------- | ---------------------------------------------------------------------------- |
| `registry` | `string`   | Override the default public registry URL                                     |
| `preload`  | `string[]` | Public package names to auto-install on first load                           |
| `local`    | `object[]` | Private commands hosted on your own server — never published to the registry |

Each entry in `local`:

| Field         | Type       | Description                                                       |
| ------------- | ---------- | ----------------------------------------------------------------- |
| `name`        | `string`   | **Required.** Unique name — must not collide with public registry |
| `description` | `string`   | Short description shown in `apt list`                             |
| `version`     | `string`   | Version string                                                    |
| `src`         | `string`   | **Required.** URL or path to the command script                   |
| `commands`    | `string[]` | **Required.** Command names the script registers                  |

```js
FirelinTerminal.create({
	packages: {
		registry: "https://myregistry.com/index.json", // Optional, if you want to use a custom registry
		preload: ["hello"], // install from public registry on first load
		local: [
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
```

Public packages are fetched from the [firelin-registry](https://github.com/fogolin/firelin-registry). Use `apt update` inside the terminal to refresh the list, `apt list` to browse, and `apt install <name>` to install.

### Navigation

_Back to Docs home:_ **[Documentation Index ➔](./README.md)**
