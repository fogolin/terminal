export default {
    name: 'whoami',
    aliases: [],
    synopsis: 'whoami',
    description: 'Print the current user name.',
    options: [],
    examples: [{ command: 'whoami', description: 'Prints "guest" or "root".' }],
    execute(args, ctx) {
        ctx.print(ctx.session.user);
    },
};
