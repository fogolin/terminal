# terminal

A modern javascript terminal with a retro feel.

## Widget usage

This project builds a reusable widget that registers a custom HTML tag: `<firelin-terminal>`.

### Example

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<title>Firelin Terminal Demo</title>
	</head>
	<body>
		<firelin-terminal></firelin-terminal>
		<script defer src="/dist/v1/firelin.widget.js"></script>
	</body>
</html>
```

The widget listens for the Konami code:

- desktop keyboard: `↑ ↑ ↓ ↓ ← → ← → B A`
- mobile swipe version: `up up down down left right left right` + double tap

### Adding scrambled lines

Use `FirelinTerminal.addLine(text)` to append a line to the terminal with the scramble effect:

```js
FirelinTerminal.addLine('Scanning network interfaces...');
```

To scramble text in any arbitrary element on your page, import `scrambleElement` directly:

```js
import { scrambleElement } from './src/functions/scramble.js';

const el = document.querySelector('#my-element');
scrambleElement(el, 'Hello, world.'); // returns a Promise that resolves when done
```

Or chain multiple lines sequentially:

```js
const lines = ['Initializing...', 'Loading config.', 'Ready.'];
lines.reduce((p, text) => p.then(() => scrambleElement(el, text)), Promise.resolve());
```

`scrambleElement(el, text)` clears the element's content and animates each character through random glyphs before resolving to `text`. It returns a `Promise` that resolves when the animation completes.

### Build commands

- `npm run dev` — start local development server
- `npm run build` — produce `dist/v1/firelin.widget.min.js`
