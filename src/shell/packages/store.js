const LS_PACKAGES = 'firelin_packages';
const LS_REGISTRY = 'firelin_registry_cache';

function _read(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

function _write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (_) { }
}

function _remove(key) {
    try {
        localStorage.removeItem(key);
    } catch (_) { }
}

const Store = {
    // --- Installed packages ---

    getAll() {
        return _read(LS_PACKAGES) || {};
    },

    get(name) {
        const all = this.getAll();
        return all[name] || null;
    },

    set(name, entry) {
        const all = this.getAll();
        all[name] = entry;
        _write(LS_PACKAGES, all);
    },

    // Soft-delete: unregisters commands but keeps metadata for fast reinstall
    markRemoved(name) {
        const entry = this.get(name);
        if (!entry) return;
        entry.removed = true;
        this.set(name, entry);
    },

    // Hard-delete: removes all stored data for the package
    purge(name) {
        const all = this.getAll();
        delete all[name];
        _write(LS_PACKAGES, all);
    },

    // True only if entry exists and has not been soft-deleted
    isInstalled(name) {
        const entry = this.get(name);
        return !!entry && entry.removed !== true;
    },

    // --- Registry cache ---

    getRegistryCache() {
        return _read(LS_REGISTRY);
    },

    setRegistryCache(data) {
        _write(LS_REGISTRY, data);
    },

    isCacheStale() {
        const cache = this.getRegistryCache();
        if (!cache || !cache.fetchedAt || !cache.ttlSeconds) return true;
        const age = (Date.now() - new Date(cache.fetchedAt).getTime()) / 1000;
        return age > cache.ttlSeconds;
    },

    clearRegistryCache() {
        _remove(LS_REGISTRY);
    },
};

export { Store };
