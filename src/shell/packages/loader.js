// Tracks src URLs already injected this session — prevents double-loading
const _loaded = new Set();

function loadScript(src, integrity) {
    if (_loaded.has(src)) return Promise.resolve();

    if (!integrity) {
        throw new Error(`loader: integrity hash required for registry package: ${src}`);
    }

    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.crossOrigin = 'anonymous';
        s.integrity = integrity;
        s.onload = () => {
            _loaded.add(src);
            resolve();
        };
        s.onerror = () => reject(new Error(`loader: failed to load script: ${src}`));
        document.head.appendChild(s);
    });
}

// Local-origin packages skip SRI — the host controls their own server
function loadLocalScript(src) {
    if (_loaded.has(src)) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => {
            _loaded.add(src);
            resolve();
        };
        s.onerror = () => reject(new Error(`loader: failed to load local script: ${src}`));
        document.head.appendChild(s);
    });
}

export { loadScript, loadLocalScript };
