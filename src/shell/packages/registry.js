import { Store } from './store.js';

const DEFAULT_REGISTRY_URL = 'https://fogolin.github.io/firelin-registry/registry/v1/index.json';
const DEFAULT_TTL_SECONDS = 3600;

const REQUIRED_FIELDS = ['name', 'version', 'src', 'integrity', 'commands'];

function _validateShape(data) {
    if (!data || !Array.isArray(data.packages)) {
        throw new Error('Invalid registry response: missing "packages" array');
    }
    for (const pkg of data.packages) {
        for (const field of REQUIRED_FIELDS) {
            if (!pkg[field]) {
                throw new Error(`Registry entry for "${pkg.name || '?'}" missing field: "${field}"`);
            }
        }
    }
}

async function fetchRegistry(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Registry fetch failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    _validateShape(data);
    return data;
}

async function getRegistry(url) {
    const registryUrl = url || DEFAULT_REGISTRY_URL;

    if (!Store.isCacheStale()) {
        return Store.getRegistryCache().packages;
    }

    const data = await fetchRegistry(registryUrl);

    Store.setRegistryCache({
        fetchedAt: new Date().toISOString(),
        ttlSeconds: DEFAULT_TTL_SECONDS,
        packages: data.packages,
    });

    return data.packages;
}

function findPackage(packages, name) {
    return packages.find(p => p.name === name) || null;
}

export { getRegistry, fetchRegistry, findPackage, DEFAULT_REGISTRY_URL };
