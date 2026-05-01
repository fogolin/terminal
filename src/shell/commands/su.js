// Hardcoded credentials for the Easter egg. root/root, guest has no password.
const USERS = {
    root:  { password: 'root',  home: '/root' },
    guest: { password: '',      home: '/home/guest' },
};

export default {
    name: 'su',
    aliases: [],
    synopsis: 'su [USER]',
    description: 'Switch to another user. Default is root.',
    options: [],
    examples: [
        { command: 'su',       description: 'Switch to root (prompts for password).' },
        { command: 'su guest', description: 'Switch back to guest.' },
    ],
    async execute(args, ctx) {
        const targetUser = args.positional[0] || 'root';

        if (!USERS[targetUser]) {
            return ctx.error(`su: user ${targetUser} does not exist`);
        }

        if (ctx.session.user === targetUser) {
            return; // already that user
        }

        // root can switch without a password
        const needsPassword = ctx.session.user !== 'root' && USERS[targetUser].password !== '';

        if (needsPassword) {
            const password = await ctx.readline('Password: ', true);
            if (password !== USERS[targetUser].password) {
                await ctx.sleep(600);
                return ctx.error('su: Authentication failure');
            }
        }

        ctx.setUser(targetUser);
        ctx.print(`su: switched to ${targetUser}`);
    },
};
