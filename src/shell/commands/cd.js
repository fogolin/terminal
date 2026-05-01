export default {
    name: 'cd',
    aliases: [],
    synopsis: 'cd [PATH]',
    description: 'Change the current working directory.',
    options: [],
    examples: [
        { command: 'cd /home/guest', description: 'Absolute path.' },
        { command: 'cd ..',          description: 'Go up one level.' },
        { command: 'cd',             description: 'Go to home directory.' },
        { command: 'cd ~',           description: 'Go to home directory.' },
    ],
    execute(args, ctx) {
        const user = ctx.session.user;
        const home = user === 'root' ? '/root' : `/home/${user}`;
        const target = args.positional[0] || home;

        const node = ctx.vfs.resolve(target, ctx.session);
        if (!node) return ctx.error(`cd: ${target}: No such file or directory`);
        if (node.type !== 'directory') return ctx.error(`cd: ${target}: Not a directory`);
        if (!ctx.vfs.canExec(target, ctx.session)) return ctx.error(`cd: ${target}: Permission denied`);

        ctx.setCwd(ctx.vfs.absPath(target, ctx.session));
    },
};
