# Package Authoring Guide

How to build and distribute custom commands for Firelin Terminal.

## Table of Contents

1. [Overview](#overview)
2. [Package File Structure](#package-file-structure)
3. [The IIFE Contract](#the-iife-contract)
4. [Command Definition](#command-definition)
5. [ParsedArgs Reference](#parsedargs-reference)
6. [ShellContext Reference](#shellcontext-reference)
7. [Package Manifest (`package.json`)](#package-manifest-packagejson)
8. [Testing Locally](#testing-locally)
9. [Complete Example](#complete-example)
10. [Publishing to the Registry](#publishing-to-the-registry)
11. [Reserved Command Names](#reserved-command-names)

## Overview

A Firelin package is a self-contained JavaScript file (IIFE format) that registers one or more commands into the live terminal at runtime. No build tools or bundlers are required on your end — just a plain `.js` file and a `package.json` manifest.

Two distribution paths:

| Path                 | When to use                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Local package**    | Private commands for your own site. Loaded directly from your server. No PR needed.                |
| **Registry package** | Public commands submitted to `fogolin/firelin-registry`. Available to all users via `apt install`. |

## Package File Structure

A package always consists of exactly two files in a versioned folder:

```
packages/
└── my-pkg/
    └── 1.0.0/
        ├── index.js       ← package script (IIFE)
        └── package.json   ← manifest
```

For local packages you can host these files anywhere — only `index.js` is loaded at runtime. The `package.json` is consumed by the registry build pipeline, not the browser.

## The IIFE Contract

Every package script must be a self-invoking function expression (IIFE) that calls `window.FirelinTerminal._registerPackage` as its only side effect.

```
Structure: (function(register) { ... })(window.FirelinTerminal._registerPackage);
```

The callback signature:

```js
register(packageName, commandDefs);
```

| Parameter     | Type           | Description                                     |
| ------------- | -------------- | ----------------------------------------------- |
| `packageName` | `String`       | Must match the `name` field in `package.json`   |
| `commandDefs` | `CommandDef[]` | Array of command definition objects (see below) |

**Why IIFE?** The core bundle is compiled to ES5 — there is no native module graph. IIFE scripts are universally compatible and work with SRI enforcement natively.

**Why call `_registerPackage` synchronously?** The callback resolves the pending install promise. Async registration is not supported — all commands must be registered before `register()` returns.

## Command Definition

Each entry in `commandDefs` must conform to this shape (same interface as built-in commands):

```js
{
  // Identity
  name:        String,          // canonical command name, e.g. "myapp"
  aliases:     String[],        // alternate names, e.g. ["ma"] — may be []

  // Help
  synopsis:    String,          // usage pattern shown in help, e.g. "myapp [OPTIONS] ARG"
  description: String,          // paragraph shown in `help myapp`
  options:     OptionDef[],     // flag definitions
  examples:    ExampleDef[],    // shown at bottom of help output

  // Execution
  execute:     Function,        // (args: ParsedArgs, ctx: ShellContext) => Promise<void> | void
}
```

### OptionDef

```js
{
  flag:        String | null,   // short form, e.g. "-v"  (null if none)
  long:        String | null,   // long form,  e.g. "--verbose" (null if none)
  description: String,
  takesValue:  Boolean,         // true if flag consumes the next token
  valueHint:   String | null,   // shown in synopsis, e.g. "FILE", "N"
}
```

### ExampleDef

```js
{
  command:     String,          // literal command string shown to user
  description: String,          // what it does
}
```

## ParsedArgs Reference

The first argument to `execute`. The shell parser normalises raw input before dispatch.

```js
{
  raw:        String,              // original full input string
  command:    String,              // resolved command name (after alias lookup)
  flags:      Set<String>,         // active flags, e.g. Set { "-v", "--verbose" }
  options:    Map<String, String>, // flags that consumed a value, e.g. Map { "--output" → "file.txt" }
  positional: String[],            // non-flag tokens in order
  rest:       String | null,       // everything after `--`
}
```

Flags that have both a short and long form appear twice in `flags` when either form is used. Check both:

```js
const verbose = args.flags.has("-v") || args.flags.has("--verbose");
const output =
	args.options.get("-o") ?? args.options.get("--output") ?? "default.txt";
```

## ShellContext Reference

The second argument to `execute`. Commands **must not** mutate shell state directly — use the methods provided.

```js
{
  // Output
  print(text, className?)       // append a line to terminal output; optional CSS class
  error(text)                   // print error line (styled as stderr)
  clear()                       // clear all terminal output

  // Filesystem
  vfs: VFSInstance              // full VFS API (see VFS_SCHEMA.md)

  // Session state (read-only)
  session: {
    user:     String,           // current user, e.g. "guest" or "root"
    cwd:      String,           // current working directory, e.g. "/home/guest"
    env:      Map<String, String>,
    hostname: String,
  },

  // State mutators
  setCwd(path),                 // update cwd after validation
  setUser(user),                // used by su

  // Shell control
  abort: AbortSignal,           // fires on Ctrl+C — long-running commands must check this
  prompt(),                     // re-render the prompt (call after state changes)

  // Utility
  sleep(ms): Promise,           // simulated delay
}
```

### Error conventions

Use `ctx.error()` for all user-visible errors. Follow Bash message style:

```
commandname: short description of problem: offending value
```

Commands must never throw — catch internally and route to `ctx.error()`.

```js
if (!args.positional[0]) {
	return ctx.error("myapp: missing required argument: NAME");
}
```

### Respecting Ctrl+C

Any command with a loop or `await` must check `ctx.abort.aborted`:

```js
for (const item of items) {
	if (ctx.abort.aborted) break;
	await ctx.sleep(200);
	ctx.print(item);
}
```

## Package Manifest (`package.json`)

Placed alongside `index.js`. Not loaded by the browser — consumed by the registry build pipeline and by `apt` when displaying package info.

```json
{
	"name": "my-pkg",
	"version": "1.0.0",
	"description": "Short one-line description shown in apt list",
	"author": "your-github-username",
	"license": "MIT",
	"tags": ["category", "keyword"],
	"commands": ["myapp"],
	"requires": []
}
```

| Field         | Required | Notes                                                                        |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| `name`        | Yes      | Lowercase, hyphens OK. Must match folder name. No collisions with built-ins. |
| `version`     | Yes      | Semver. Must match version folder name.                                      |
| `description` | Yes      | Shown in `apt list` and `apt install` output.                                |
| `author`      | Yes      | GitHub username or real name.                                                |
| `license`     | Yes      | SPDX identifier, e.g. `"MIT"`.                                               |
| `tags`        | No       | Used for `apt search` (future).                                              |
| `commands`    | Yes      | All command names registered by this package (including aliases).            |
| `requires`    | No       | Dependency resolution deferred — leave `[]` for now.                         |

`src`, `integrity`, and `sizeBytes` are injected by `build-registry.js` at build time. Do not include them in the manifest.

## Testing Locally

Use the `local` config key to load a package directly from your server, bypassing the registry entirely. No PR or SRI hash needed.

```js
FirelinTerminal.create({
	packages: {
		local: [
			{
				name: "my-pkg",
				description: "My custom commands",
				version: "1.0.0",
				src: "/js/my-pkg.js", // served from your own host
				commands: ["myapp"],
			},
		],
	},
});
```

The package loads on boot. Changes to `src` take effect on next page load.

For faster iteration during development, serve `index.js` with a dev server and point `src` at `http://localhost:PORT/index.js`. The terminal will load it fresh each time (the `loaded` Set dedup is per-session).

## Complete Example

A package that adds a `greet` command — prints a greeting with optional shouting.

### `packages/greet/1.0.0/package.json`

```json
{
	"name": "greet",
	"version": "1.0.0",
	"description": "Print a personalised greeting",
	"author": "your-username",
	"license": "MIT",
	"tags": ["fun"],
	"commands": ["greet"],
	"requires": []
}
```

### `packages/greet/1.0.0/index.js`

```js
(function (register) {
	register("greet", [
		{
			name: "greet",
			aliases: ["hi"],
			synopsis: "greet [-u] NAME",
			description: "Print a greeting. Pass -u to shout.",
			options: [
				{
					flag: "-u",
					long: "--upper",
					description: "Uppercase the output.",
					takesValue: false,
					valueHint: null,
				},
			],
			examples: [
				{ command: "greet Alice", description: 'Prints "Hello, Alice!"' },
				{ command: "greet -u Bob", description: 'Prints "HELLO, BOB!"' },
			],

			execute(args, ctx) {
				const name = args.positional[0];
				if (!name) {
					return ctx.error("greet: missing operand: NAME");
				}

				const upper = args.flags.has("-u") || args.flags.has("--upper");
				let msg = `Hello, ${name}!`;
				if (upper) msg = msg.toUpperCase();
				ctx.print(msg);
			},
		},
	]);
})(window.FirelinTerminal._registerPackage);
```

## Publishing to the Registry

1. Fork `fogolin/firelin-registry`.
2. Create `packages/{name}/{version}/index.js` and `packages/{name}/{version}/package.json`.
3. Open a pull request against `main`.
4. CI runs `scripts/validate-package.js` — your PR cannot merge if it fails.
5. On merge, `publish.yml` runs `build-registry.js`, computes SRI hashes, and deploys to GitHub Pages.
6. Package becomes available via `apt install your-pkg`.

### What `validate-package.js` checks

- `package.json` has all required fields.
- Version folder name matches `package.json` `version`.
- `index.js` is an IIFE that calls `window.FirelinTerminal._registerPackage`.
- No command name collisions with built-ins or existing registry packages.

## Reserved Command Names

These names are taken by built-in commands and cannot be used in packages:

```
apt, cat, cd, clear, cp, echo, env, exit, grep, head, help, history,
ls, man, mkdir, mv, pwd, rm, rmdir, set, su, tail, touch, unset, whoami
```

Aliases are also reserved — a package cannot register an alias that collides with any built-in name or alias.

The registry CI blocks any package that attempts to claim a reserved name.
