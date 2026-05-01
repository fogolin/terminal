function grepFile(content, re, numbered, path, multiFile, ctx) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (re.test(line)) {
            const lineNum = numbered ? `${i + 1}:` : '';
            const prefix  = multiFile ? `${path}:` : '';
            ctx.print(`${prefix}${lineNum}${line}`);
        }
    });
}

function walkGrep(vfs, dirPath, session, re, numbered, ctx) {
    let nodes;
    try { nodes = vfs.list(dirPath, session); } catch (_) { return; }
    for (const node of nodes) {
        const p = dirPath === '/' ? '/' + node.name : dirPath + '/' + node.name;
        if (node.type === 'directory') {
            walkGrep(vfs, p, session, re, numbered, ctx);
        } else {
            try {
                const content = vfs.readFile(p, session);
                grepFile(content, re, numbered, p, true, ctx);
            } catch (_) {}
        }
    }
}

export default {
    name: 'grep',
    aliases: [],
    synopsis: 'grep [-i] [-n] [-r] PATTERN [FILE...]',
    description: 'Print lines in files matching PATTERN.',
    options: [
        { flag: '-i', long: '--ignore-case', description: 'Case-insensitive match.',       takesValue: false, valueHint: null },
        { flag: '-n', long: '--line-number',  description: 'Prefix output with line number.', takesValue: false, valueHint: null },
        { flag: '-r', long: '--recursive',    description: 'Recurse into directories.',      takesValue: false, valueHint: null },
    ],
    examples: [
        { command: 'grep root /etc/passwd',       description: 'Find lines with "root".' },
        { command: 'grep -in error /logs/*.log',  description: 'Case-insensitive, numbered.' },
        { command: 'grep -r guest /etc',          description: 'Recursive search in /etc.' },
    ],
    execute(args, ctx) {
        if (!args.positional.length) return ctx.error('grep: missing pattern');
        const [pattern, ...paths] = args.positional;

        const ignoreCase = args.flags.has('-i') || args.flags.has('--ignore-case');
        const numbered   = args.flags.has('-n') || args.flags.has('--line-number');
        const recursive  = args.flags.has('-r') || args.flags.has('--recursive');

        let re;
        try { re = new RegExp(pattern, ignoreCase ? 'i' : ''); }
        catch (e) { return ctx.error(`grep: invalid regex: ${e.message}`); }

        if (!paths.length) return ctx.error('grep: missing file operand');

        const multiFile = paths.length > 1;

        for (const p of paths) {
            const node = ctx.vfs.resolve(p, ctx.session);
            if (!node) { ctx.error(`grep: ${p}: No such file or directory`); continue; }

            if (node.type === 'directory') {
                if (recursive) {
                    walkGrep(ctx.vfs, ctx.vfs.absPath(p, ctx.session), ctx.session, re, numbered, ctx);
                } else {
                    ctx.error(`grep: ${p}: Is a directory`);
                }
                continue;
            }

            let content;
            try { content = ctx.vfs.readFile(p, ctx.session); }
            catch (e) { ctx.error(`grep: ${e.message}`); continue; }

            grepFile(content, re, numbered, p, multiFile, ctx);
        }
    },
};
