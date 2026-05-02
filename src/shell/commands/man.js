const man = {
    name: 'man',
    aliases: [],
    synopsis: 'man COMMAND',
    description: 'Display manual page for a command.',
    options: [],
    examples: [
        { command: 'man ls',   description: 'Show ls manual page.' },
        { command: 'man curl', description: 'Show curl manual page.' },
    ],
    execute(args, ctx) {
        const name = args.positional[0];
        if (!name) {
            ctx.error('man: what manual page do you want?');
            return;
        }

        const cmd = man._registry.get(name);
        if (!cmd) {
            ctx.error(`man: no manual entry for ${name}`);
            return;
        }

        ctx.print('NAME');
        ctx.print(`    ${cmd.name}${cmd.description ? ' — ' + cmd.description : ''}`);
        ctx.print('');

        ctx.print('SYNOPSIS');
        ctx.print(`    ${cmd.synopsis || cmd.name}`);
        ctx.print('');

        if (cmd.options && cmd.options.length > 0) {
            ctx.print('OPTIONS');
            for (const opt of cmd.options) {
                const flags = [opt.flag, opt.long].filter(Boolean).join(', ');
                const hint  = opt.valueHint ? ' ' + opt.valueHint : '';
                ctx.print(`    ${flags}${hint}`);
                ctx.print(`        ${opt.description}`);
            }
            ctx.print('');
        }

        if (cmd.aliases && cmd.aliases.length > 0) {
            ctx.print('ALIASES');
            ctx.print(`    ${cmd.aliases.join(', ')}`);
            ctx.print('');
        }

        if (cmd.examples && cmd.examples.length > 0) {
            ctx.print('EXAMPLES');
            for (const ex of cmd.examples) {
                ctx.print(`    ${ex.command}`);
                if (ex.description) ctx.print(`        ${ex.description}`);
            }
        }
    },
};

export default man;
