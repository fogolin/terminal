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

### Build commands

- `npm run dev` — start local development server
- `npm run build` — produce `dist/v1/firelin.widget.min.js`
