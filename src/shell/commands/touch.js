export default {
    name: 'touch',
    aliases: [],
    synopsis: 'touch FILE [FILE...]',
    description: 'Create an empty file or update its modification timestamp.',
    options: [],
    examples: [
        { command: 'touch notes.txt',   description: 'Create or update notes.txt.' },
    ],
    execute(args, ctx) {
        if (!args.positional.length) return ctx.error('touch: missing file operand');
        for (const path of args.positional) {
            try {
                ctx.vfs.touch(path, ctx.session);
            } catch (e) {
                ctx.error(`touch: ${e.message}`);
            }
        }
    },
};
