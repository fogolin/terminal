import { Store } from './store.js';
import { loadScript, loadLocalScript } from './loader.js';
import { getRegistry, findPackage } from './registry.js';

// Built-in command names that packages cannot override
const BUILT_IN_COMMANDS = new Set([
    'clear', 'help', 'print', 'whoami', 'pwd', 'ls', 'cd', 'cat', 'tail',
    'touch', 'mkdir', 'rm', 'cp', 'mv', 'find', 'grep', 'su', 'ping',
    'curl', 'top', 'nano', 'theme', 'man', 'apt',
]);

function _registerCommands(commandDefs, commandRegistry) {
    for (const def of commandDefs) {
        if (BUILT_IN_COMMANDS.has(def.name)) {
            throw new Error(`Package cannot override built-in command: "${def.name}"`);
        }
        commandRegistry.set(def.name, def);
        (def.aliases || []).forEach(alias => commandRegistry.set(alias, def));
    }
}

function _unregisterCommands(commandDefs, commandRegistry) {
    for (const def of commandDefs) {
        commandRegistry.delete(def.name);
        (def.aliases || []).forEach(alias => commandRegistry.delete(alias));
    }
}

async function install(pkgEntry, commandRegistry) {
    const loader = pkgEntry.origin === 'local'
        ? loadLocalScript(pkgEntry.src)
        : loadScript(pkgEntry.src, pkgEntry.integrity);

    await loader;

    Store.set(pkgEntry.name, {
        name: pkgEntry.name,
        version: pkgEntry.version,
        src: pkgEntry.src,
        integrity: pkgEntry.integrity || null,
        commands: pkgEntry.commands,
        installedAt: new Date().toISOString(),
        origin: pkgEntry.origin,
        removed: false,
    });
}

function remove(name, commandRegistry) {
    const entry = Store.get(name);
    if (!entry) throw new Error(`apt: package not installed: "${name}"`);

    const defs = [...commandRegistry.values()].filter(
        def => entry.commands.includes(def.name)
    );
    _unregisterCommands(defs, commandRegistry);
    Store.markRemoved(name);
}

function purge(name, commandRegistry) {
    const entry = Store.get(name);
    if (!entry) throw new Error(`apt: package not found: "${name}"`);

    const defs = [...commandRegistry.values()].filter(
        def => entry.commands.includes(def.name)
    );
    _unregisterCommands(defs, commandRegistry);
    Store.purge(name);
}

async function upgrade(registryUrl, commandRegistry) {
    const packages = await getRegistry(registryUrl);
    const installed = Store.getAll();
    const upgradeable = [];

    for (const [name, entry] of Object.entries(installed)) {
        if (entry.removed || entry.origin !== 'registry') continue;
        const latest = findPackage(packages, name);
        if (latest && latest.version !== entry.version) {
            upgradeable.push({ current: entry, latest });
        }
    }

    return upgradeable;
}

async function applyUpgrade(pkgName, latest, commandRegistry) {
    const current = Store.get(pkgName);
    if (!current) return;

    // Unload old script commands from registry before loading new version
    const oldDefs = [...commandRegistry.values()].filter(
        def => current.commands.includes(def.name)
    );
    _unregisterCommands(oldDefs, commandRegistry);

    await install({ ...latest, origin: 'registry' }, commandRegistry);
}

export { install, remove, purge, upgrade, applyUpgrade, _registerCommands, BUILT_IN_COMMANDS };
