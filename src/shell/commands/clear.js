export default {
    name: 'clear',
    aliases: ['cls'],
    synopsis: 'clear',
    description: 'Clear the terminal screen.',
    options: [],
    examples: [],
    execute(args, ctx) {
        ctx.clear();
    },
};
