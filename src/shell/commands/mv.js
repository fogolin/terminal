export default {
    name: 'mv',
    aliases: [],
    synopsis: 'mv SOURCE DEST',
    description: 'Move or rename a file or directory.',
    options: [],
    examples: [
        { command: 'mv old.txt new.txt',  description: 'Rename old.txt to new.txt.' },
        { command: 'mv file.txt /tmp/',   description: 'Move file into /tmp.' },
    ],
    execute(args, ctx) {
        if (args.positional.length < 2) return ctx.error('mv: missing destination operand');
        const [src, dest] = args.positional;
        try {
            ctx.vfs.move(src, dest, ctx.session);
        } catch (e) {
            ctx.error(`mv: ${e.message}`);
        }
    },
};
