export default {
    name: 'pwd',
    aliases: [],
    synopsis: 'pwd',
    description: 'Print the current working directory.',
    options: [],
    examples: [{ command: 'pwd', description: 'Prints e.g. /home/guest' }],
    execute(args, ctx) {
        ctx.print(ctx.session.cwd);
    },
};
