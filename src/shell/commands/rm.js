export default {
    name: 'rm',
    aliases: [],
    synopsis: 'rm [-r] [-f] FILE [FILE...]',
    description: 'Remove files or directories.',
    options: [
        { flag: '-r', long: '--recursive', description: 'Remove directories and their contents recursively.', takesValue: false, valueHint: null },
        { flag: '-f', long: '--force',     description: 'Ignore nonexistent files, suppress errors.',          takesValue: false, valueHint: null },
    ],
    examples: [
        { command: 'rm notes.txt',     description: 'Remove a file.' },
        { command: 'rm -r mydir',      description: 'Remove a directory recursively.' },
        { command: 'rm -rf /tmp/junk', description: 'Force-remove without errors.' },
    ],
    execute(args, ctx) {
        if (!args.positional.length) return ctx.error('rm: missing operand');
        const recursive = args.flags.has('-r') || args.flags.has('-R') || args.flags.has('--recursive') || args.flags.has('-rf') || args.flags.has('-fr');
        const force     = args.flags.has('-f') || args.flags.has('--force')     || args.flags.has('-rf') || args.flags.has('-fr');

        for (const path of args.positional) {
            try {
                ctx.vfs.remove(path, ctx.session, { recursive });
            } catch (e) {
                if (force && e.code === 'ENOENT') continue;
                ctx.error(`rm: ${e.message}`);
            }
        }
    },
};
