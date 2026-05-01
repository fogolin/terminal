const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function permStr(type, perm) {
    const s = String(perm);
    const d = s.length === 4 ? s.slice(1) : s.padStart(3, '0');
    function bits(n) {
        const v = parseInt(n, 10);
        return (v & 4 ? 'r' : '-') + (v & 2 ? 'w' : '-') + (v & 1 ? 'x' : '-');
    }
    return (type === 'directory' ? 'd' : '-') + bits(d[0]) + bits(d[1]) + bits(d[2]);
}

function fmtDate(iso) {
    const d = new Date(iso);
    const mon = MONTHS[d.getMonth()];
    const day = String(d.getDate()).padStart(2, ' ');
    const h   = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mon} ${day} ${h}:${min}`;
}

export default {
    name: 'ls',
    aliases: ['dir'],
    synopsis: 'ls [-a] [-l] [PATH]',
    description: 'List directory contents.',
    options: [
        { flag: '-a', long: '--all',  description: 'Include hidden entries (dotfiles).', takesValue: false, valueHint: null },
        { flag: '-l', long: null,     description: 'Long listing format.',               takesValue: false, valueHint: null },
    ],
    examples: [
        { command: 'ls',          description: 'List current directory.' },
        { command: 'ls -la /etc', description: 'Long listing with hidden files.' },
    ],
    execute(args, ctx) {
        const path = args.positional[0] || ctx.session.cwd;
        const showAll  = args.flags.has('-a') || args.flags.has('--all');
        const longFmt  = args.flags.has('-l');

        let nodes;
        try {
            nodes = ctx.vfs.list(path, ctx.session);
        } catch (e) {
            return ctx.error(`ls: ${e.message}`);
        }

        // Filter dotfiles unless -a
        if (!showAll) nodes = nodes.filter(n => !n.name.startsWith('.'));

        // Sort: dirs first, then files, both alphabetical
        nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        if (!nodes.length) return;

        if (longFmt) {
            nodes.forEach(n => {
                const perm  = permStr(n.type, n.permissions);
                const owner = (n.owner || 'root').padEnd(8);
                const size  = String(n.type === 'directory' ? 0 : (n.size || 0)).padStart(6);
                const date  = fmtDate(n.modified);
                const name  = n.type === 'directory' ? n.name + '/' : n.name;
                ctx.print(`${perm}  ${owner}  ${size}  ${date}  ${name}`);
            });
        } else {
            const names = nodes.map(n => n.type === 'directory' ? n.name + '/' : n.name);
            // Simple column layout: 4 per row or all on one line if few
            const cols = 4;
            for (let i = 0; i < names.length; i += cols) {
                ctx.print(names.slice(i, i + cols).map(n => n.padEnd(22)).join('').trimEnd());
            }
        }
    },
};
