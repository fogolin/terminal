export default {
    name: 'testpanel',
    aliases: [],
    synopsis: 'testpanel',
    description: 'Tests ctx.openPanel and ctx.fetch.',
    options: [],
    examples: [],

    async execute(args, ctx) {
        const panel = ctx.openPanel({
            top: 'Panel Test',
            bottom: '^C to quit',
        });

        panel.print('Panel open. Type something:');
        const val = await panel.readline('> ');
        panel.print(`Got: ${val}`);

        panel.setBottom('Fetching...');
        try {
            const res = await ctx.fetch('https://httpbin.org/get');
            const json = await res.json();
            panel.print('fetch OK: ' + json.url);
        } catch (e) {
            panel.error('fetch failed: ' + e.message);
        }

        panel.setBottom('^C Quit  — press Enter to close');
        await panel.readline('close> ');
        panel.close();
    },
};
