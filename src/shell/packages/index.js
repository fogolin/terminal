import { Store } from './store.js';
import { getRegistry, fetchRegistry, findPackage, DEFAULT_REGISTRY_URL } from './registry.js';
import { loadScript, loadLocalScript } from './loader.js';
import { install, remove, purge, upgrade, applyUpgrade, _registerCommands } from './installer.js';

let _commandRegistry = null;
let _registryUrl = DEFAULT_REGISTRY_URL;

// Pending install resolvers keyed by package name.
// loadScript fires the IIFE synchronously on load, which calls _registerPackage
// before the script's onload fires — so we resolve immediately in _registerPackage.
const _pending = new Map();

// Global hook called by every external package script
function _registerPackage(pkgName, commandDefs) {
    try {
        _registerCommands(commandDefs, _commandRegistry);
    } catch (e) {
        const reject = _pending.get(pkgName);
        if (reject) { reject.reject(new Error(e.message)); _pending.delete(pkgName); }
        return;
    }
    const resolver = _pending.get(pkgName);
    if (resolver) { resolver.resolve(); _pending.delete(pkgName); }
}

function _awaitRegistration(pkgName) {
    return new Promise((resolve, reject) => {
        _pending.set(pkgName, { resolve, reject });
    });
}

async function _loadAndRegister(pkgEntry) {
    const registration = _awaitRegistration(pkgEntry.name);
    if (pkgEntry.origin === 'local') {
        loadLocalScript(pkgEntry.src).catch(e => {
            const r = _pending.get(pkgEntry.name);
            if (r) { r.reject(e); _pending.delete(pkgEntry.name); }
        });
    } else {
        loadScript(pkgEntry.src, pkgEntry.integrity).catch(e => {
            const r = _pending.get(pkgEntry.name);
            if (r) { r.reject(e); _pending.delete(pkgEntry.name); }
        });
    }
    await registration;
}

async function boot(packagesConfig, commandRegistry) {
    _commandRegistry = commandRegistry;
    if (packagesConfig && packagesConfig.registry) {
        _registryUrl = packagesConfig.registry;
    }

    // Expose global hook before any scripts load
    if (typeof window !== 'undefined') {
        if (!window.FirelinTerminal) window.FirelinTerminal = {};
        window.FirelinTerminal._registerPackage = _registerPackage;
    }

    const installed = Store.getAll();

    // Restore previously-installed packages from localStorage (no network)
    const restorePromises = Object.values(installed)
        .filter(e => !e.removed)
        .map(entry => _loadAndRegister(entry).catch(() => {}));
    await Promise.all(restorePromises);

    if (!packagesConfig) return;

    // Load local (private) packages from config
    const localEntries = packagesConfig.local || [];
    for (const local of localEntries) {
        if (Store.isInstalled(local.name)) continue;
        const entry = { ...local, origin: 'local', integrity: null };
        try {
            await _loadAndRegister(entry);
            await install(entry, _commandRegistry);
        } catch (_) {}
    }

    // Auto-install preload packages (first visit only)
    const preload = packagesConfig.preload || [];
    if (preload.length === 0) return;

    let packages;
    try {
        packages = await getRegistry(_registryUrl);
    } catch (_) { return; }

    for (const name of preload) {
        if (Store.isInstalled(name)) continue;
        const pkgEntry = findPackage(packages, name);
        if (!pkgEntry) continue;
        try {
            await _loadAndRegister({ ...pkgEntry, origin: 'registry' });
            await install({ ...pkgEntry, origin: 'registry' }, _commandRegistry);
        } catch (_) {}
    }
}

// --- apt command operations ---

async function aptUpdate() {
    Store.clearRegistryCache();
    const data = await fetchRegistry(_registryUrl);
    Store.setRegistryCache({
        fetchedAt: new Date().toISOString(),
        ttlSeconds: 3600,
        packages: data.packages,
    });
    return data.packages.length;
}

async function aptInstall(names) {
    const packages = await getRegistry(_registryUrl);
    const results = [];

    for (const name of names) {
        if (Store.isInstalled(name)) {
            results.push({ name, status: 'already-installed' });
            continue;
        }
        const pkgEntry = findPackage(packages, name);
        if (!pkgEntry) {
            results.push({ name, status: 'not-found' });
            continue;
        }
        try {
            await _loadAndRegister({ ...pkgEntry, origin: 'registry' });
            await install({ ...pkgEntry, origin: 'registry' }, _commandRegistry);
            results.push({ name, status: 'installed', entry: pkgEntry });
        } catch (e) {
            results.push({ name, status: 'error', message: e.message });
        }
    }
    return results;
}

function aptRemove(name) {
    remove(name, _commandRegistry);
}

function aptPurge(name) {
    purge(name, _commandRegistry);
}

async function aptUpgrade() {
    return upgrade(_registryUrl, _commandRegistry);
}

async function aptApplyUpgrade(pkgName, latest) {
    return applyUpgrade(pkgName, latest, _commandRegistry);
}

function aptList(installedOnly) {
    if (installedOnly) {
        return Object.values(Store.getAll()).filter(e => !e.removed);
    }
    const cache = Store.getRegistryCache();
    return cache ? cache.packages : [];
}

export {
    boot,
    aptUpdate,
    aptInstall,
    aptRemove,
    aptPurge,
    aptUpgrade,
    aptApplyUpgrade,
    aptList,
};
