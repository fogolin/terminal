export default {
    name: 'help',
    aliases: ['?'],
    synopsis: 'help [COMMAND]',
    description: 'List available commands, or show help for a specific command.',
    options: [],
    examples: [
        { command: 'help', description: 'List all commands.' },
        { command: 'help ls', description: 'Show help for ls.' },
    ],
    execute(args, ctx) {
        // registry injected at boot — see commands/index.js
        const registry = this._registry;
        const target = args.positional[0];

        if (target) {
            const cmd = registry.get(target);
            if (!cmd) return ctx.error(`help: no entry for '${target}'`);
            ctx.print(cmd.synopsis);
            ctx.print(`  ${cmd.description}`);
            if (cmd.options.length) {
                ctx.print('');
                ctx.print('Options:');
                cmd.options.forEach(opt => {
                    const flags = [opt.flag, opt.long].filter(Boolean).join(', ');
                    ctx.print(`  ${flags.padEnd(20)} ${opt.description}`);
                });
            }
            if (cmd.examples && cmd.examples.length) {
                ctx.print('');
                ctx.print('Examples:');
                cmd.examples.forEach(ex => ctx.print(`  ${ex.command}`));
            }
            return;
        }

        const seen = new Set();
        const commands = [];
        registry.forEach(cmd => {
            if (!seen.has(cmd)) {
                seen.add(cmd);
                commands.push(cmd);
            }
        });
        commands.sort((a, b) => a.name.localeCompare(b.name));

        ctx.print('Available commands:');
        ctx.print('');
        commands.forEach(cmd => {
            const suffix = cmd.aliases.length ? `  (${cmd.aliases.join(', ')})` : '';
            ctx.print(`  ${(cmd.name + suffix).padEnd(28)} ${cmd.description}`);
        });
        ctx.print('');
        ctx.print("Type 'help <command>' for details.");
    },
};
