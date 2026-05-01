export default {
    name: 'mkdir',
    aliases: [],
    synopsis: 'mkdir [-p] DIR [DIR...]',
    description: 'Create directories.',
    options: [
        { flag: '-p', long: '--parents', description: 'Create parent directories as needed, no error if exists.', takesValue: false, valueHint: null },
    ],
    examples: [
        { command: 'mkdir projects',           description: 'Create a single directory.' },
        { command: 'mkdir -p a/b/c',           description: 'Create nested directories.' },
    ],
    execute(args, ctx) {
        if (!args.positional.length) return ctx.error('mkdir: missing operand');
        const recursive = args.flags.has('-p') || args.flags.has('--parents');

        for (const path of args.positional) {
            try {
                ctx.vfs.mkdir(path, ctx.session, { recursive });
            } catch (e) {
                if (e.code === 'EEXIST' && recursive) continue; // -p suppresses EEXIST
                ctx.error(`mkdir: ${e.message}`);
            }
        }
    },
};
