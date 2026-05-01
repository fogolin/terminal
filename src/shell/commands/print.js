export default {
    name: 'print',
    aliases: ['echo'],
    synopsis: 'print [TEXT]...',
    description: 'Print text to the terminal.',
    options: [],
    examples: [
        { command: 'print hello world', description: 'Prints "hello world".' },
    ],
    execute(args, ctx) {
        ctx.print(args.positional.join(' '));
    },
};
