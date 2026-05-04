# cURL endpoints

Each entry in the `curl` array defines a simulated HTTP response for a specific URL. Custom entries take priority over the built-in ones, so you can also override defaults.

| Field        | Type     | Default | Description                       |
| ------------ | -------- | ------- | --------------------------------- |
| `url`        | `string` | —       | **Required.** Full URL to match   |
| `status`     | `number` | `200`   | HTTP status code                  |
| `statusText` | `string` | `'OK'`  | HTTP status text                  |
| `delay`      | `number` | `500`   | Simulated latency in milliseconds |
| `headers`    | `object` | `{}`    | Response headers map              |
| `body`       | `string` | `''`    | Raw response body                 |

```js
FirelinTerminal.create({
	curl: [
		{
			url: "https://api.mysite.com/status",
			status: 200,
			statusText: "OK",
			delay: 400,
			headers: { "Content-Type": "application/json" },
			body: '{"status": "ok", "version": "1.0.0"}',
		},
		{
			url: "https://api.mysite.com/error",
			status: 500,
			statusText: "Internal Server Error",
			delay: 800,
			headers: { "Content-Type": "application/json" },
			body: '{"error": "something went wrong"}',
		},
	],
});
```

### Navigation

_Back to Docs home:_ **[Documentation Index ➔](./README.md)**
