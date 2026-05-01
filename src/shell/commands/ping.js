export default {
    name: 'ping',
    aliases: [],
    synopsis: 'ping [-c N] HOST',
    description: 'Send simulated ICMP ECHO_REQUEST to a host.',
    options: [
        { flag: '-c', long: '--count', description: 'Number of packets to send (default 4).', takesValue: true, valueHint: 'N' },
    ],
    examples: [
        { command: 'ping google.com',     description: 'Ping 4 times.' },
        { command: 'ping -c 3 8.8.8.8',  description: 'Ping 3 times.' },
    ],
    async execute(args, ctx) {
        const host = args.positional[0];
        if (!host) return ctx.error('ping: missing host operand');

        const countRaw = args.options.get('-c') || args.options.get('--count') || '4';
        const count    = Math.min(100, Math.max(1, parseInt(countRaw, 10) || 4));

        ctx.print(`PING ${host} (127.0.0.1): 56 data bytes`);

        let received = 0;
        for (let i = 1; i <= count; i++) {
            if (ctx.abort.aborted) break;
            await ctx.sleep(700 + Math.random() * 200);
            if (ctx.abort.aborted) break;
            const ms = (Math.random() * 20 + 8).toFixed(3);
            ctx.print(`64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${ms} ms`);
            received++;
        }

        if (!ctx.abort.aborted) {
            const loss = Math.round(((count - received) / count) * 100);
            ctx.print('');
            ctx.print(`--- ${host} ping statistics ---`);
            ctx.print(`${count} packets transmitted, ${received} received, ${loss}% packet loss`);
        }
    },
};
