# Implementation Roadmap

## Phase Overview

| Phase | Name     | Output                                       | Depends On |
| ----- | -------- | -------------------------------------------- | ---------- |
| 1     | Parser   | Tokenizer, flag parser, syntax highlighter   | —          |
| 2     | VFS      | JSON tree engine, path resolver, permissions | —          |
| 3     | UI Layer | Input line, history, hotkeys, theming        | Phase 1    |
| 4     | Commands | All 20 commands wired to VFS + shell         | 1, 2, 3    |
| 5     | Polish   | Tab completion, man pages, boot sequence     | 1–4        |

Phases 1 and 2 are independent — can be built in parallel.

---

## Phase 1 — Parser

**Goal:** Transform raw input string → structured `ParsedArgs`.

### Steps

1. **Tokenizer** — split input respecting quoting rules:
   - `"hello world"` → one token
   - `'it\'s'` → one token (escaped)
   - bare words split on whitespace
2. **Flag classifier** — for each token:
   - starts with `--` → long flag
   - starts with `-` (single char) → short flag(s); support clustering `-la` → `-l -a`
   - `--` alone → all subsequent tokens go to `rest`
   - otherwise → positional
3. **Option value binding** — if a flag's `OptionDef.takesValue === true`, consume next token as its value into `args.options`
4. **Alias resolution** — lookup command token in registry; resolve to canonical name
5. **Syntax highlighter** — run on raw string as user types:
   - token 0 (command): apply `--color-cmd` if in registry, `--color-error` if unknown
   - flags (`-x`, `--foo`): apply `--color-flag`
   - quoted strings: apply `--color-string`
   - positional args: apply `--color-arg`

### Files

```
src/shell/parser.js        ← tokenizer + ParsedArgs builder
src/shell/highlighter.js   ← maps token types → CSS class names
```

### Test vectors (no framework needed — plain assertions)

```
"ls -la /home"      → { command:"ls", flags:{"-l","-a"}, positional:["/home"] }
"cat 'my file.txt'" → { command:"cat", positional:["my file.txt"] }
"find . -- -name"   → { command:"find", positional:["."], rest:"-name" }
"badcmd"            → { command:"badcmd" } + highlighter marks red
```

---

## Phase 2 — Virtual Filesystem

**Goal:** In-memory, mutable JSON tree with UNIX-like semantics.

### Steps

1. **Static tree** — define initial VFS state as `vfs.json` (see VFS_SCHEMA.md); import and deep-clone at boot so each session gets a fresh tree
2. **Node resolver** — `resolve(path, cwd)` returns reference into live tree or `null`:
   - normalise path (collapse `..`, `.`, strip trailing `/`)
   - expand `~` → `/home/{user}`
   - walk tree segment by segment
3. **Permission checker** — `canRead(node, user)`, `canWrite(node, user)`, `canExec(node, user)` implement octal logic
4. **Mutating operations** — `writeFile`, `mkdir`, `remove`, `move`, `copy` all:
   - resolve target
   - permission-check the parent directory
   - mutate the live tree
5. **VFSError types** — `NotFoundError`, `PermissionError`, `NotDirectoryError`, `AlreadyExistsError` — plain JS classes extending `Error`

### Files

```
src/shell/vfs/
  tree.json          ← initial filesystem state
  vfs.js             ← VFS class, all API methods
  errors.js          ← error types
```

---

## Phase 3 — UI Layer

**Goal:** Interactive input line that plugs into the existing terminal window.

### Steps

1. **Input component** — add `<div class="terminal-input-row">` below `.terminal-lines`:
   - prompt span: `guest@firelin:~$`
   - hidden `<input>` captures keystrokes (never visible)
   - overlay `<span>` renders highlighted input text (from Phase 1 highlighter)
   - blinking cursor span appended after overlay content
2. **History manager**:
   - ring buffer, max 200 entries
   - on submit: push if non-empty AND differs from last entry (no sequential dupes)
   - Up/Down arrows walk the buffer; Escape restores in-progress draft
3. **Hotkeys**:
   - `Enter` → submit → dispatch → scroll to bottom
   - `Up` / `Down` → history navigation
   - `Tab` → trigger completion (Phase 5; stub in Phase 3)
   - `Ctrl+C` → fire `AbortController`, print `^C`, reset input
   - `Ctrl+L` → `clear`
   - `Ctrl+A` / `Ctrl+E` → cursor to start/end (input.setSelectionRange)
4. **Output renderer** — `print(text, className)` creates a `.terminal-line` span, appends to `.terminal-lines`, scrolls to bottom; supports ANSI-lite (bold, dim via CSS classes)
5. **Theming** — shell adds CSS custom properties on top of existing terminal tokens:
   ```css
   :host {
   	--color-cmd: var(--terminal-text); /* known command */
   	--color-error: #e06c75; /* unknown command / errors */
   	--color-flag: #61afef; /* -x --flags */
   	--color-string: #98c379; /* "quoted strings" */
   	--color-arg: var(--terminal-text); /* positional args */
   	--color-prompt: var(--terminal-accent); /* prompt $ glyph */
   }
   ```

### Files

```
src/shell/
  history.js         ← HistoryManager class
  ui.js              ← InputComponent, OutputRenderer, hotkey bindings
```

---

## Phase 4 — Commands

**Goal:** Implement all 20 commands against VFS + context.

### Implementation order (dependency-first)

| Batch | Commands                           | Notes                                          |
| ----- | ---------------------------------- | ---------------------------------------------- |
| A     | `whoami`, `pwd`, `clear`, `print`  | No VFS reads; easiest smoke-test               |
| B     | `ls`, `cd`, `cat`, `tail`          | Read-only VFS                                  |
| C     | `touch`, `mkdir`, `rm`, `cp`, `mv` | Mutating VFS                                   |
| D     | `find`, `grep`                     | Recursive VFS traversal                        |
| E     | `nano`                             | Modal inline editor (biggest UI lift)          |
| F     | `su`, `help`                       | Session mutation, registry introspection       |
| G     | `ping`, `curl`                     | Async, simulated network, abort-aware          |
| H     | `top`                              | Live-updating output, interval, Ctrl+C to exit |

### `nano` approach

- On execute: hide normal input row, inject a full-screen editor overlay inside `.terminal-body`
- Simple `<textarea>` styled to match terminal theme
- Status bar: `^X Exit  ^S Save  ^G Help`
- On save: `ctx.vfs.writeFile(path, textarea.value)` then tear down overlay

### `curl` approach

- All responses are simulated from `src/shell/commands/data/curl-responses.json`
- Known endpoints: `strucit.com`, `api.firelin.sh/*`, `fogol.in`, `bitsti.com.br`, `github.com/fogolin`
- Unknown hosts → fallback entry with helpful hint listing known hosts
- Add new endpoints by editing the JSON; no code changes needed

### `top` approach

- Live-updating: clears previous top block and redraws every second via `setInterval`
- Processes are randomized fiction; CPU/memory values drift subtly each redraw
- `Ctrl+C` fires `AbortController` → clears interval → restores prompt

### `tail -f` approach

- Static files: print last N lines then return (no live mode)
- Files with `_live: true` in VFS: print content then start `setInterval` pulling random messages from `log-generators.json` matching `_generator` key
- `_interval` field on the node controls cadence; default 3000ms
- `Ctrl+C` stops the interval

### Files

```
src/shell/commands/
  whoami.js  pwd.js  clear.js  print.js
  ls.js      cd.js   cat.js    tail.js
  touch.js   mkdir.js rm.js    cp.js   mv.js
  find.js    grep.js
  nano.js
  su.js      help.js
  ping.js    curl.js  top.js
src/shell/commands/index.js   ← registry builder
```

---

## Phase 5 — Polish

**Goal:** Completions, man pages, boot sequence, edge cases.

### Steps

1. **Tab completion**:
   - token 0: complete against command registry names
   - token 1+: complete against VFS paths (relative to cwd), respecting read permissions
   - on single match: fill in remainder + trailing space (or `/` for directories)
   - on multiple matches: print all candidates on next line, restore input
2. **`man` command** — render full help page using `OptionDef` and `ExampleDef` from module:
   ```
   NAME
       ls — list directory contents
   SYNOPSIS
       ls [OPTION]... [FILE]...
   DESCRIPTION
       ...
   OPTIONS
       -a, --all    do not ignore entries starting with .
   EXAMPLES
       ls -la /home
   ```
3. **Boot sequence** — when terminal opens, run scripted init:
   ```
   Firelin OS v1.0.0 (tty1)
   Login: guest
   Password: ••••••••
   Last login: ...
   Type `help` to get started.
   ```
   Use `ctx.sleep()` between lines for dramatic effect; honour Ctrl+C to skip.
4. **`motd`** — message of the day file in `/etc/motd`, printed after login
5. **Edge cases**:
   - Empty input → re-prompt silently
   - Command not found → `bash: <cmd>: command not found`
   - Deeply nested `..` beyond root → clamp at `/`
   - Symlink-like aliases in VFS (stretch goal)
6. **Persistence** — serialize live VFS tree to `localStorage` key `firelin_vfs` on every mutation; restore on next visit. On corrupt/missing data, reset to `tree.json`. Tree is deep-cloned from `tree.json` at boot if no localStorage found.

---

## File Tree (Final)

```
src/
  shell/
    parser.js
    highlighter.js
    history.js
    ui.js
    vfs/
      tree.json
      vfs.js
      errors.js
    commands/
      index.js
      whoami.js  pwd.js    clear.js  print.js
      ls.js      cd.js     cat.js    tail.js
      touch.js   mkdir.js  rm.js     cp.js    mv.js
      find.js    grep.js
      nano.js
      su.js      help.js   man.js
      ping.js    curl.js   top.js
  app.js         ← integrates shell into existing FirelinTerminalElement
```

Total estimated new files: ~28. No new dependencies.

### Navigation

_Back to Docs home:_ **[Documentation Index ➔](./README.md)**
