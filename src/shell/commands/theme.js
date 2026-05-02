import { THEMES, saveTheme } from '../themes.js';

export default {
    name: 'theme',
    aliases: [],
    synopsis: 'theme [NAME]',
    description: 'List available themes or switch to a theme.',
    options: [],
    examples: [
        { command: 'theme',         description: 'List all available themes.' },
        { command: 'theme noctis',  description: 'Switch to the Noctis theme.' },
        { command: 'theme phosphor', description: 'Reset to the default Phosphor theme.' },
    ],
    execute(args, ctx) {
        const target = args.positional[0];

        if (!target) {
            const current = ctx.session.theme || 'phosphor';
            ctx.print('Available themes:');
            ctx.print('');
            THEMES.forEach((theme, id) => {
                const marker = id === current ? ' *' : '  ';
                ctx.print(`${marker} ${id.padEnd(12)} ${theme.name} — ${theme.description}`);
            });
            ctx.print('');
            ctx.print(`Active: ${current}`);
            return;
        }

        const id = target.toLowerCase();
        const theme = THEMES.get(id);
        if (!theme) {
            ctx.error(`theme: unknown theme '${target}'. Run 'theme' to list options.`);
            return;
        }

        ctx.applyTheme(id, theme.css);
        ctx.session.theme = id;
        saveTheme(id);
        ctx.print(`Theme set to ${theme.name}.`);
    },
};
