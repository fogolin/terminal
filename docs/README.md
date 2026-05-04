# Firelin Terminal Documentation

Technical reference for the **Firelin Terminal** internals.

## Setup and Usage

Setting up the script to work on your website or project:

1. [Basic Implementation](SETUP.md): Basic installation and setup.
   - [Config: Themes](THEMES.md): Theme otpions available
   - [Config: cURL](CURL.md): Custom simulated `curl` endpoints
   - [Config: Packages](PACKAGES.md): Package manager configuration
2. [Commands](COMMANDS.md): List of available commands
3. [Activation](ACTIVATION.md): How to activate and use on your project

## Development

Documentation related to the development of the core terminal functionality:

1. [Roadmap (Legacy)](ROADMAP.md): The roadmap used to design and develop the project, phase-by-phase, including Parser, VFS, UI, Commands and Polish steps
2. [Virtual File System schema](VFS_SCHEMA.md): Data schema for the Virtual Filesystem — node types, permissions, tree structure, and path resolution rules
3. [Command module](COMMAND_MODULE.md): Interface contract for command modules

## Command Modules

The **Package Manager** for this terminal project lives in a separate repository [Firelin Registry](https://github.com/fogolin/firelin-registry). The documentation here is related to the **package manager develpment** and **command modules** that can be used to replicate more _bash-like_ fucntionality:

1. [APT Package Manager](APT_PACKAGE_MANAGER.md): Implementation plan for the package manager
2. [Package Authoring (External)](https://github.com/fogolin/firelin-terminal/blob/main/docs/README.md): How to build and distribute custom commands for **Firelin Terminal**.
3. [Command Module (Internal)](COMMAND_MODULE.md): Interface contract for command modules — how to author a new command, required fields, and the execution API

## APIs

Custom APIs that can be used to enhance the easter-egg like behavior on the terminal:

1. [Scramble Text](SCRAMBLE.md): How to use `FirelinTerminal.addLine()` to push lines into the terminal with the scramble animation effect

### Navigation

_Next up:_ **[Basic Implementation ➔](./Setup.md)**
