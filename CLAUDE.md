Act as a Senior Software Architect specializing in Web-based System Emulations. I want to build a highly functional Bash-like "Easter Egg" terminal for my website.

### Core Architecture Requirements:

1. **The Dispatcher/Modular Pattern:** Each command must be an isolated module/function. Design a pattern where adding a new "program" is as simple as adding a new file that exports a standard interface (name, aliases, man page, and execution logic).
2. **The Parser:** Build a parser that supports syntax highlighting (distinct colors for commands vs. arguments) and handles flags/options (e.g., `-a` or `--all`).
3. **The Virtual Filesystem (VFS):** I need a JSON-based file tree structure that supports basic permissions (root vs user) and path resolution (absolute vs relative).
4. **State & History Management:**
   - Implement a command history that ignores sequential duplicates.
   - Support standard Bash hotkeys (Ctrl+C to SIGINT, Up/Down arrows for history, Tab for completion).
5. **UI Layer:** We already have a terminal window for this project, this terminal should live inside it, but, it should use a styling strategy that allows for easy "theming." as well

### Command List to Implement:

`help, cd, ls, pwd, su, whoami, touch, mkdir, cp, mv, rm, cat, tail, nano, ping, curl, find, grep, print, clear, top`

### Your Task:

1. **Technical Stack** Vanilla JS. This should be as simple and as compatible as possible
2. Provide a **Data Schema** for the Virtual Filesystem and the Command Modules. Do it on a Docs folder.
3. Design a **Step-by-Step Implementation Roadmap** broken down into 4-5 phases (Parser, VFS, UI, Commands, Polish).
4. Do not write the full code yet; start by confirming the architecture and asking me any clarifying questions about the UI behavior.
