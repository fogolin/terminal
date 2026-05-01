# Command Module — Data Schema & Interface

## Module Contract

Every command is a plain JS object (or default export from a file) conforming to this interface:

```js
{
  // Identity
  name:        String,          // canonical name, e.g. "ls"
  aliases:     String[],        // e.g. ["dir", "ll"] — may be empty []

  // Help / man page
  synopsis:    String,          // one-liner with usage pattern
  description: String,          // paragraph shown in `man` / `help <cmd>`
  options:     OptionDef[],     // flag definitions (used by parser + man page)
  examples:    ExampleDef[],    // optional, shown at bottom of man page

  // Execution
  execute:     Function,        // (args: ParsedArgs, ctx: ShellContext) => Promise<void> | void
}
```

---

## Supporting Types

### OptionDef
```js
{
  flag:        String | null,   // short form, e.g. "-a"  (null if no short form)
  long:        String | null,   // long form,  e.g. "--all" (null if no long form)
  description: String,
  takesValue:  Boolean,         // true if flag consumes next token, e.g. "--output FILE"
  valueHint:   String | null,   // shown in synopsis, e.g. "FILE", "PATTERN"
}
```

### ExampleDef
```js
{
  command:     String,          // literal command string, e.g. "ls -la /home"
  description: String,          // what it does
}
```

---

## ParsedArgs (what `execute` receives as first argument)

The parser normalises raw input into this shape before dispatching:

```js
{
  raw:        String,           // original full input string
  command:    String,           // resolved command name (after alias lookup)
  flags:      Set<String>,      // all active short/long flags, e.g. Set {"-a", "--all"}
  options:    Map<String, String>, // flags that consumed a value, e.g. Map { "--output" → "file.txt" }
  positional: String[],         // non-flag tokens in order, e.g. ["/home", "file.txt"]
  rest:       String | null,    // everything after `--` (double-dash separator)
}
```

---

## ShellContext (what `execute` receives as second argument)

Context is the bridge between a command and the shell runtime. Commands **must not** mutate state directly; they use context methods.

```js
{
  // Output
  print(text, className?)       // append line to terminal output; optional CSS class for styling
  error(text)                   // print error line (styled as stderr)
  clear()                       // clear terminal output

  // VFS
  vfs: VFSInstance,             // full VFS API (see VFS_SCHEMA.md)

  // Session state
  session: {
    user:   String,             // current user, e.g. "guest" or "root"
    cwd:    String,             // current working directory, e.g. "/home/guest"
    env:    Map<String, String>,// environment variables
    hostname: String,
  },

  // State mutators (commands use these, not direct assignment)
  setCwd(path),                 // updates session.cwd after validation
  setUser(user),                // used by `su`

  // Shell control
  abort: AbortSignal,           // fires on Ctrl+C; long-running cmds must respect this
  prompt(),                     // re-render the prompt (after state changes)

  // Async helper
  sleep(ms): Promise,           // for simulated network delay etc.
}
```

---

## File Layout Convention

```
src/
  shell/
    commands/
      ls.js
      cd.js
      cat.js
      nano.js
      ... (one file per command)
    index.js        ← imports all commands, exports Map<name, Module>
```

`index.js` auto-registers aliases:
```js
import ls from './commands/ls.js';
// ...

const registry = new Map();

[ls, cd, cat /*, ... */].forEach(cmd => {
  registry.set(cmd.name, cmd);
  cmd.aliases.forEach(alias => registry.set(alias, cmd));
});

export default registry;
```

---

## Minimal Example — `whoami`

```js
// src/shell/commands/whoami.js
export default {
  name: 'whoami',
  aliases: [],
  synopsis: 'whoami',
  description: 'Print the current user name.',
  options: [],
  examples: [
    { command: 'whoami', description: 'Prints "guest" or "root".' }
  ],

  execute(args, ctx) {
    ctx.print(ctx.session.user);
  }
};
```

---

## Async Example — `ping`

```js
// src/shell/commands/ping.js
export default {
  name: 'ping',
  aliases: [],
  synopsis: 'ping [-c count] HOST',
  description: 'Send simulated ICMP echo requests to HOST.',
  options: [
    { flag: '-c', long: '--count', description: 'Number of packets.', takesValue: true, valueHint: 'N' }
  ],
  examples: [
    { command: 'ping -c 3 google.com', description: 'Ping 3 times.' }
  ],

  async execute(args, ctx) {
    const host = args.positional[0];
    if (!host) return ctx.error('ping: missing host operand');

    const count = parseInt(args.options.get('-c') ?? args.options.get('--count') ?? '4', 10);

    ctx.print(`PING ${host}: 56 data bytes`);

    for (let i = 1; i <= count; i++) {
      if (ctx.abort.aborted) break;           // respect Ctrl+C
      await ctx.sleep(800);
      const ms = (Math.random() * 20 + 10).toFixed(3);
      ctx.print(`64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${ms} ms`);
    }

    if (!ctx.abort.aborted) {
      ctx.print(`\n--- ${host} ping statistics ---`);
      ctx.print(`${count} packets transmitted, ${count} received, 0% packet loss`);
    }
  }
};
```

---

## Error Conventions

Commands use `ctx.error()` for all user-visible errors, following Bash message style:

```
ls: cannot access '/nope': No such file or directory
cat: /etc/shadow: Permission denied
cd: not a directory: readme.txt
```

Commands **never throw** — catch internally and route to `ctx.error()`.
