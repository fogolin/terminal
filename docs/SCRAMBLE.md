# Adding scrambled lines

Use `FirelinTerminal.addLine(text)` to append a line to the terminal with the scramble effect:

```js
FirelinTerminal.addLine("Scanning network interfaces...");
```

To scramble text in any arbitrary element on your page, import `scrambleElement` directly:

```js
import { scrambleElement } from "./src/functions/scramble.js";

const el = document.querySelector("#my-element");
scrambleElement(el, "Hello, world."); // returns a Promise that resolves when done
```

Or chain multiple lines sequentially:

```js
const lines = ["Initializing...", "Loading config.", "Ready."];
lines.reduce(
	(p, text) => p.then(() => scrambleElement(el, text)),
	Promise.resolve(),
);
```

`scrambleElement(el, text)` clears the element's content and animates each character through random glyphs before resolving to `text`. It returns a `Promise` that resolves when the animation completes.

### Navigation

_Back to Docs home:_ **[Documentation Index ➔](./README.md)**
