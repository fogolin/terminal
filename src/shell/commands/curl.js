import data from './data/curl-responses.json';

function fmtHeaders(headers) {
    return Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
}

export default {
    name: 'curl',
    aliases: [],
    synopsis: 'curl [-I] [-i] [-s] URL',
    description: 'Transfer a URL. Responses are simulated.',
    options: [
        { flag: '-I', long: '--head',    description: 'Show response headers only.',          takesValue: false, valueHint: null },
        { flag: '-i', long: null,        description: 'Include headers in output.',             takesValue: false, valueHint: null },
        { flag: '-s', long: '--silent',  description: 'Silent mode (suppress progress info).',  takesValue: false, valueHint: null },
    ],
    examples: [
        { command: 'curl https://api.firelin.sh/status',       description: 'Check system status.' },
        { command: 'curl -I https://strucit.app',              description: 'Show headers only.' },
        { command: 'curl https://api.firelin.sh/coffee/status', description: 'Check coffee machine.' },
    ],
    async execute(args, ctx) {
        const url = args.positional[0];
        if (!url) return ctx.error('curl: no URL specified');

        const headOnly    = args.flags.has('-I') || args.flags.has('--head');
        const inclHeaders = args.flags.has('-i');
        const silent      = args.flags.has('-s') || args.flags.has('--silent');

        const ep = data.endpoints[url] || (() => {
            const host = url.replace(/^https?:\/\//, '').split('/')[0];
            const fb = Object.assign({}, data.fallback);
            fb.body = fb.body.replace('{host}', host);
            return fb;
        })();

        if (!silent) {
            ctx.print(`  % Total    % Received  Xferd  Average Speed`);
            ctx.print(`  0     0    0     0    0     0      0`);
        }

        await ctx.sleep(ep.delay || 500);
        if (ctx.abort.aborted) return;

        if (!silent) ctx.print('');

        if (headOnly || inclHeaders) {
            ctx.print(`HTTP/1.1 ${ep.status} ${ep.statusText}`);
            fmtHeaders(ep.headers).forEach(h => ctx.print(h));
            if (!headOnly) ctx.print('');
        }

        if (!headOnly) {
            ep.body.split('\n').forEach(l => ctx.print(l));
        }
    },
};
