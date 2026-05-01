import generators from './data/log-generators.json';

function renderTemplate(tpl) {
    const now = new Date();
    const ts = now.toISOString().slice(0, 19).replace('T', ' ');
    return tpl
        .replace(/\{ts\}/g, ts)
        .replace(/\{rand_float_(\d+)\}/g, (_, n) => (Math.random() * parseInt(n, 10)).toFixed(1))
        .replace(/\{rand_(\d+)\}/g, (_, n) => String(Math.floor(Math.random() * parseInt(n, 10))).padStart(2, '0'));
}

function pickLine(generatorKey) {
    const gen = generators.generators[generatorKey];
    if (!gen) return null;
    const msgs = gen.messages;
    return renderTemplate(msgs[Math.floor(Math.random() * msgs.length)]);
}

export default {
    name: 'tail',
    aliases: [],
    synopsis: 'tail [-n N] [-f] FILE',
    description: 'Print last N lines of a file. Use -f to follow live files.',
    options: [
        { flag: '-n', long: '--lines', description: 'Number of lines to show (default 10).', takesValue: true, valueHint: 'N' },
        { flag: '-f', long: '--follow', description: 'Follow a live file continuously.', takesValue: false, valueHint: null },
    ],
    examples: [
        { command: 'tail /logs/system.log',        description: 'Last 10 lines.' },
        { command: 'tail -n 20 /logs/deploy.log',  description: 'Last 20 lines.' },
        { command: 'tail -f /logs/system.log',     description: 'Follow live log.' },
    ],
    async execute(args, ctx) {
        const path = args.positional[0];
        if (!path) return ctx.error('tail: missing operand');

        const nRaw = args.options.get('-n') || args.options.get('--lines') || '10';
        const n     = Math.max(1, parseInt(nRaw, 10) || 10);
        const follow = args.flags.has('-f') || args.flags.has('--follow');

        let content;
        let stat;
        try {
            content = ctx.vfs.readFile(path, ctx.session);
            stat    = ctx.vfs.stat(path, ctx.session);
        } catch (e) {
            return ctx.error(`tail: ${e.message}`);
        }

        const lines = content.split('\n');
        const tail  = lines.slice(-n);
        tail.forEach(l => ctx.print(l));

        if (!follow || !stat._live || !stat._generator) return;

        await new Promise(resolve => {
            const interval = stat._interval || 3000;
            const timer = setInterval(() => {
                if (ctx.abort.aborted) { clearInterval(timer); resolve(); return; }
                const line = pickLine(stat._generator);
                if (line) ctx.print(line);
            }, interval);

            ctx.abort.addEventListener('abort', () => {
                clearInterval(timer);
                resolve();
            }, { once: true });
        });
    },
};
