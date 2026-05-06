export default {
    name: 'calc',
    aliases: [],
    synopsis: 'calc  [then: calc> EXPRESSION]',
    description: 'Interactive calculator. Supports +  -  *  /  **  %  ()  Math.sqrt()  Math.PI  and all JS Math methods. Type "exit" or Ctrl+C to quit.',
    options: [],
    examples: [
        { command: 'calc',                      description: 'Start the interactive calculator.' },
        { command: 'calc> 2 + 2',               description: '→ 4' },
        { command: 'calc> 10 ** 3',             description: '→ 1000' },
        { command: 'calc> Math.sqrt(144)',       description: '→ 12' },
        { command: 'calc> Math.PI * 5 ** 2',    description: '→ 78.539... (area of circle r=5)' },
        { command: 'calc> exit',                description: 'Quit the calculator.' },
    ],

    async execute(args, ctx) {
        ctx.print('Interactive calculator. Type "exit" or Ctrl+C to quit.');

        while (true) {
            const line = await ctx.readline('calc> ');

            if (line.trim() === 'exit') break;
            if (!line.trim()) continue;

            try {
                // eslint-disable-next-line no-new-func
                const result = Function('"use strict"; return (' + line + ')')();
                ctx.print(String(result));
            } catch {
                ctx.error(`calc: invalid expression: ${line}`);
            }
        }
    },
};
