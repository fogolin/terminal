function globToRegex(pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    return new RegExp('^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
}

function walk(vfs, dirPath, session, results, opts) {
    let nodes;
    try { nodes = vfs.list(dirPath, session); } catch (_) { return; }

    for (const node of nodes) {
        const nodePath = dirPath === '/' ? '/' + node.name : dirPath + '/' + node.name;

        let matches = true;
        if (opts.nameRe && !opts.nameRe.test(node.name)) matches = false;
        if (opts.type === 'f' && node.type !== 'file') matches = false;
        if (opts.type === 'd' && node.type !== 'directory') matches = false;

        if (matches) results.push(nodePath);

        if (node.type === 'directory') walk(vfs, nodePath, session, results, opts);
    }
}

export default {
    name: 'find',
    aliases: [],
    synopsis: 'find [PATH] [-name PATTERN] [-type f|d]',
    description: 'Search for files in a directory hierarchy.',
    options: [
        { flag: null, long: '-name', description: 'Filter by name pattern (supports * and ?).', takesValue: true, valueHint: 'PATTERN' },
        { flag: null, long: '-type', description: 'Filter by type: f (file) or d (directory).',  takesValue: true, valueHint: 'f|d'     },
    ],
    examples: [
        { command: 'find /home -name "*.txt"', description: 'Find all .txt files in /home.' },
        { command: 'find / -type d',           description: 'List all directories.' },
        { command: 'find . -name "*.log"',     description: 'Find logs in current dir.' },
    ],
    execute(args, ctx) {
        // find [PATH] -name PATTERN -type f|d
        // Positional[0] may be path; rest are ignored (we parse -name/-type via options)
        const startPath = args.positional[0] || ctx.session.cwd;
        const nameArg   = args.options.get('-name') || args.options.get('--name');
        const typeArg   = args.options.get('-type') || args.options.get('--type');

        const startNode = ctx.vfs.resolve(startPath, ctx.session);
        if (!startNode) return ctx.error(`find: '${startPath}': No such file or directory`);

        const opts = {
            nameRe: nameArg ? globToRegex(nameArg) : null,
            type:   typeArg || null,
        };

        const results = [];

        if (startNode.type === 'file') {
            if (!opts.nameRe || opts.nameRe.test(startNode.name)) {
                if (!opts.type || opts.type === 'f') results.push(ctx.vfs.absPath(startPath, ctx.session));
            }
        } else {
            // Print the root itself if it matches
            const rootAbs = ctx.vfs.absPath(startPath, ctx.session);
            let rootMatches = true;
            if (opts.nameRe && !opts.nameRe.test(startNode.name)) rootMatches = false;
            if (opts.type === 'f') rootMatches = false;
            if (rootMatches && !opts.nameRe) results.push(rootAbs);
            walk(ctx.vfs, rootAbs, ctx.session, results, opts);
        }

        results.forEach(r => ctx.print(r));
    },
};
