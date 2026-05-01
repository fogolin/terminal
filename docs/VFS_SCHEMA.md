# Virtual Filesystem (VFS) — Data Schema

## Node Types

Every node in the tree is either a **directory** or a **file**.

```json
{
  "type": "directory" | "file",
  "name": "string",
  "owner": "root" | "guest",
  "permissions": "string (octal, e.g. '755')",
  "modified": "ISO 8601 timestamp"
}
```

**File** nodes add:
```json
{
  "content": "string",
  "size": "number (bytes, auto-computed)"
}
```

**Directory** nodes add:
```json
{
  "children": { "<name>": <Node> }
}
```

---

## Full Tree Example

```json
{
  "type": "directory",
  "name": "/",
  "owner": "root",
  "permissions": "755",
  "modified": "2026-01-01T00:00:00Z",
  "children": {
    "bin": {
      "type": "directory",
      "name": "bin",
      "owner": "root",
      "permissions": "755",
      "modified": "2026-01-01T00:00:00Z",
      "children": {}
    },
    "etc": {
      "type": "directory",
      "name": "etc",
      "owner": "root",
      "permissions": "755",
      "modified": "2026-01-01T00:00:00Z",
      "children": {
        "passwd": {
          "type": "file",
          "name": "passwd",
          "owner": "root",
          "permissions": "644",
          "modified": "2026-01-01T00:00:00Z",
          "content": "root:x:0:0:root:/root:/bin/bash\nguest:x:1000:1000:Guest:/home/guest:/bin/bash",
          "size": 74
        },
        "hostname": {
          "type": "file",
          "name": "hostname",
          "owner": "root",
          "permissions": "644",
          "modified": "2026-01-01T00:00:00Z",
          "content": "firelin",
          "size": 7
        }
      }
    },
    "home": {
      "type": "directory",
      "name": "home",
      "owner": "root",
      "permissions": "755",
      "modified": "2026-01-01T00:00:00Z",
      "children": {
        "guest": {
          "type": "directory",
          "name": "guest",
          "owner": "guest",
          "permissions": "700",
          "modified": "2026-01-01T00:00:00Z",
          "children": {
            "readme.txt": {
              "type": "file",
              "name": "readme.txt",
              "owner": "guest",
              "permissions": "644",
              "modified": "2026-01-01T00:00:00Z",
              "content": "Welcome to Firelin Terminal.\nType `help` to list available commands.",
              "size": 61
            },
            "projects": {
              "type": "directory",
              "name": "projects",
              "owner": "guest",
              "permissions": "755",
              "modified": "2026-01-01T00:00:00Z",
              "children": {}
            }
          }
        }
      }
    },
    "root": {
      "type": "directory",
      "name": "root",
      "owner": "root",
      "permissions": "700",
      "modified": "2026-01-01T00:00:00Z",
      "children": {
        "secrets.txt": {
          "type": "file",
          "name": "secrets.txt",
          "owner": "root",
          "permissions": "600",
          "modified": "2026-01-01T00:00:00Z",
          "content": "You found the Easter Egg. 🐣",
          "size": 27
        }
      }
    },
    "tmp": {
      "type": "directory",
      "name": "tmp",
      "owner": "root",
      "permissions": "1777",
      "modified": "2026-01-01T00:00:00Z",
      "children": {}
    }
  }
}
```

---

## Permission Model

Permissions mirror UNIX octal notation as strings (`"755"`, `"644"`, `"700"`).

| Octal | User | Group | Other |
|-------|------|-------|-------|
| 7     | rwx  | —     | —     |
| 6     | rw-  | —     | —     |
| 5     | r-x  | —     | —     |
| 4     | r--  | —     | —     |
| 0     | ---  | —     | —     |

**Resolution rules (simplified UNIX):**
1. If `session.user === node.owner` → apply first digit.
2. If `session.user === 'root'` → full access regardless of permissions.
3. Otherwise → apply third digit (other).

**Relevant checks per operation:**
- `read` (cat, ls, grep, find): requires `r` bit
- `write` (touch, mkdir, rm, mv, cp, nano): requires `w` bit  
- `execute` / `cd` into directory: requires `x` bit

---

## Path Resolution

```
resolveAbsolute("/home/guest/projects") → Node | null
resolveRelative("../etc", cwd)          → Node | null
```

**Algorithm:**
1. If path starts with `/` → resolve from root.
2. Otherwise → join `cwd + "/" + path`, then normalize.
3. Normalize: collapse `./`, resolve `..` segments, strip trailing `/`.
4. Special tokens: `.` = current, `..` = parent, `~` = `/home/{user}`.

**VFS API (internal, not exposed to commands directly):**
```js
vfs.resolve(path)         // → Node | null
vfs.stat(path)            // → { type, owner, permissions, size, modified }
vfs.canRead(path, user)   // → boolean
vfs.canWrite(path, user)  // → boolean
vfs.readFile(path)        // → string content | PermissionError
vfs.writeFile(path, data) // → void | PermissionError | NotFoundError
vfs.list(path)            // → Node[] | PermissionError
vfs.mkdir(path, user)     // → void | PermissionError
vfs.remove(path, user)    // → void | PermissionError
vfs.move(src, dest, user) // → void | PermissionError
vfs.copy(src, dest, user) // → void | PermissionError
```
