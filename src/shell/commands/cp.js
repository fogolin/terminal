export default {
    name: 'cp',
    aliases: [],
    synopsis: 'cp SOURCE DEST',
    description: 'Copy a file to a destination path or directory.',
    options: [],
    examples: [
        { command: 'cp readme.txt backup.txt', description: 'Copy readme.txt to backup.txt.' },
        { command: 'cp notes.txt /tmp/',       description: 'Copy into a directory.' },
    ],
    execute(args, ctx) {
        if (args.positional.length < 2) return ctx.error('cp: missing destination operand');
        const [src, dest] = args.positional;
        try {
            ctx.vfs.copy(src, dest, ctx.session);
        } catch (e) {
            ctx.error(`cp: ${e.message}`);
        }
    },
};
