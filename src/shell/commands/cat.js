export default {
    name: 'cat',
    aliases: [],
    synopsis: 'cat FILE [FILE...]',
    description: 'Print file contents to stdout.',
    options: [
        { flag: '-n', long: '--number', description: 'Number output lines.', takesValue: false, valueHint: null },
    ],
    examples: [
        { command: 'cat /etc/hostname',   description: 'Print hostname.' },
        { command: 'cat -n readme.txt',   description: 'Print with line numbers.' },
    ],
    execute(args, ctx) {
        if (!args.positional.length) return ctx.error('cat: missing operand');
        const numbered = args.flags.has('-n') || args.flags.has('--number');

        for (const path of args.positional) {
            let content;
            try {
                content = ctx.vfs.readFile(path, ctx.session);
            } catch (e) {
                ctx.error(`cat: ${e.message}`);
                continue;
            }

            const lines = content.split('\n');
            lines.forEach((line, i) => {
                if (numbered) {
                    ctx.print(`${String(i + 1).padStart(6)}  ${line}`);
                } else {
                    ctx.print(line);
                }
            });
        }
    },
};
