import {
    aptUpdate,
    aptInstall,
    aptRemove,
    aptPurge,
    aptUpgrade,
    aptApplyUpgrade,
    aptList,
} from '../packages/index.js';

export default {
    name: 'apt',
    aliases: [],
    synopsis: 'apt <subcommand> [package...]',
    description: 'Package manager. Fetch, install, and remove external commands from the Firelin registry.',
    options: [
        { flag: null, long: '--installed', description: 'With apt list: show only installed packages.', takesValue: false, valueHint: null },
    ],
    examples: [
        { command: 'apt update', description: 'Refresh the package list from the registry.' },
        { command: 'apt install <package>', description: 'Download and install the "git" package.' },
        { command: 'apt remove <package>', description: 'Unregister <package> commands (keeps metadata).' },
        { command: 'apt purge <package>', description: 'Unregister <package> commands and delete all stored data.' },
        { command: 'apt upgrade', description: 'Upgrade all installed packages to latest versions.' },
        { command: 'apt list', description: 'List all available packages.' },
        { command: 'apt list --installed', description: 'List installed packages only.' },
    ],

    async execute(args, ctx) {
        const sub = args.positional[0];

        if (!sub) {
            return ctx.error('apt: missing subcommand. Try: update, install, remove, purge, upgrade, list');
        }

        switch (sub) {

            case 'update': {
                ctx.print('Fetching package list...');
                try {
                    const count = await aptUpdate();
                    ctx.print(`OK. ${count} package${count !== 1 ? 's' : ''} available.`);
                } catch (e) {
                    ctx.error(`apt: update failed — ${e.message}`);
                }
                break;
            }

            case 'install': {
                const names = args.positional.slice(1);
                if (names.length === 0) {
                    return ctx.error('apt: install requires at least one package name');
                }
                ctx.print('Reading package lists... Done');
                const results = await aptInstall(names);
                for (const r of results) {
                    if (r.status === 'already-installed') {
                        ctx.print(`${r.name} is already installed.`);
                    } else if (r.status === 'not-found') {
                        ctx.error(`apt: package not found: "${r.name}"`);
                    } else if (r.status === 'error') {
                        ctx.error(`apt: failed to install "${r.name}" — ${r.message}`);
                    } else {
                        const cmds = r.entry.commands.join(', ');
                        ctx.print(`Installed ${r.name} (${r.entry.version}). New command${r.entry.commands.length !== 1 ? 's' : ''}: ${cmds}`);
                    }
                }
                break;
            }

            case 'remove': {
                const name = args.positional[1];
                if (!name) return ctx.error('apt: remove requires a package name');
                try {
                    aptRemove(name);
                    ctx.print(`Removed ${name}. Run 'apt install ${name}' to reinstall.`);
                } catch (e) {
                    ctx.error(e.message);
                }
                break;
            }

            case 'purge': {
                const name = args.positional[1];
                if (!name) return ctx.error('apt: purge requires a package name');
                try {
                    aptPurge(name);
                    ctx.print(`Purged ${name}. All data removed.`);
                } catch (e) {
                    ctx.error(e.message);
                }
                break;
            }

            case 'upgrade': {
                ctx.print('Reading package lists... Done');
                let upgradeable;
                try {
                    upgradeable = await aptUpgrade();
                } catch (e) {
                    return ctx.error(`apt: upgrade failed — ${e.message}`);
                }

                if (upgradeable.length === 0) {
                    ctx.print('All packages up to date.');
                    break;
                }

                const summary = upgradeable
                    .map(u => `${u.current.name} (${u.current.version} → ${u.latest.version})`)
                    .join(', ');
                ctx.print(`${upgradeable.length} package${upgradeable.length !== 1 ? 's' : ''} can be upgraded: ${summary}`);

                const answer = await ctx.readline('Upgrade all? [Y/n] ');
                if (answer.trim().toLowerCase() === 'n') {
                    ctx.print('Upgrade cancelled.');
                    break;
                }

                for (const { current, latest } of upgradeable) {
                    if (ctx.abort.aborted) break;
                    try {
                        await aptApplyUpgrade(current.name, latest);
                        ctx.print(`Upgraded ${current.name} ${current.version} → ${latest.version}`);
                    } catch (e) {
                        ctx.error(`apt: failed to upgrade "${current.name}" — ${e.message}`);
                    }
                }
                break;
            }

            case 'list': {
                const installedOnly = args.flags.has('--installed');
                const packages = aptList(installedOnly);

                if (packages.length === 0) {
                    ctx.print(installedOnly
                        ? 'No packages installed. Run "apt install <package>" to get started.'
                        : 'Package list is empty. Run "apt update" to fetch the registry.');
                    break;
                }

                for (const pkg of packages) {
                    const status = installedOnly ? '' : ' [installed]';
                    ctx.print(`${pkg.name}/${pkg.version}  ${pkg.description}${installedOnly ? '' : ''}`);
                }
                break;
            }

            default:
                ctx.error(`apt: unknown subcommand "${sub}". Try: update, install, remove, purge, upgrade, list`);
        }
    },
};
