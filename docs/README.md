# Documentation

Technical reference for the Firelin Terminal internals.

| Document                                      | Description                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [APT PACKAGE MANAGER](APT_PACKAGE_MANAGER.md) | Implementation plan for the package manager                                                                  |
| [PACKAGE AUTHORING](PACKAGE_AUTHORING.md)     | How to build and distribute custom commands for Firelin Terminal.                                            |
| [VFS SCHEMA](VFS_SCHEMA.md)                   | Data schema for the Virtual Filesystem — node types, permissions, tree structure, and path resolution rules  |
| [COMMAND MODULE](COMMAND_MODULE.md)           | Interface contract for command modules — how to author a new command, required fields, and the execution API |
| [ROADMAP](ROADMAP.md)                         | Phase-by-phase implementation roadmap: Parser → VFS → UI → Commands → Polish                                 |
| [SCRAMBLE](SCRAMBLE.md)                       | How to use `FirelinTerminal.addLine()` to push lines into the terminal with the scramble animation effect    |
