import initialTree from './tree.json';
import { NotFoundError, PermissionError, NotDirectoryError, AlreadyExistsError, IsDirectoryError } from './errors.js';

const LS_KEY = 'firelin_vfs';

class VFS {
    constructor() {
        this._tree = this._loadTree();
    }

    _loadTree() {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.type === 'directory') return parsed;
            }
        } catch (_) {}
        return JSON.parse(JSON.stringify(initialTree));
    }

    reset() {
        this._tree = JSON.parse(JSON.stringify(initialTree));
        try { localStorage.removeItem(LS_KEY); } catch (_) {}
    }

    _save() {
        try { localStorage.setItem(LS_KEY, JSON.stringify(this._tree)); } catch (_) {}
    }

    // Returns normalized segments array for the given path.
    _normalize(path, session) {
        const user = session.user;
        const cwd  = session.cwd;
        const home = user === 'root' ? '/root' : `/home/${user}`;

        if (path === '~') path = home;
        else if (path.startsWith('~/')) path = home + path.slice(1);

        const abs = path.startsWith('/') ? path : cwd + '/' + path;

        const segs = [];
        for (const part of abs.split('/')) {
            if (!part || part === '.') continue;
            if (part === '..') { if (segs.length > 0) segs.pop(); }
            else segs.push(part);
        }
        return segs;
    }

    // Walk segments from root; returns node or null.
    _walk(segs) {
        let node = this._tree;
        for (const seg of segs) {
            if (node.type !== 'directory' || !node.children) return null;
            node = node.children[seg];
            if (!node) return null;
        }
        return node;
    }

    // Like _walk but also returns parent and final name.
    _walkWithParent(segs) {
        if (segs.length === 0) return { parent: null, name: '', node: this._tree };
        const parentSegs = segs.slice(0, -1);
        const name = segs[segs.length - 1];
        const parent = parentSegs.length === 0 ? this._tree : this._walk(parentSegs);
        const node = (parent && parent.type === 'directory' && parent.children)
            ? (parent.children[name] || null)
            : null;
        return { parent, name, node };
    }

    _parsePerm(perm) {
        const s = String(perm);
        const digits = s.length === 4 ? s.slice(1) : s;
        const o = parseInt(digits[0] || '0', 10);
        const x = parseInt(digits[2] || '0', 10);
        return { ownerR: !!(o & 4), ownerW: !!(o & 2), ownerX: !!(o & 1),
                 otherR: !!(x & 4), otherW: !!(x & 2), otherX: !!(x & 1) };
    }

    _canRead(node, user)  {
        if (user === 'root') return true;
        const p = this._parsePerm(node.permissions);
        return user === node.owner ? p.ownerR : p.otherR;
    }
    _canWrite(node, user) {
        if (user === 'root') return true;
        const p = this._parsePerm(node.permissions);
        return user === node.owner ? p.ownerW : p.otherW;
    }
    _canExec(node, user)  {
        if (user === 'root') return true;
        const p = this._parsePerm(node.permissions);
        return user === node.owner ? p.ownerX : p.otherX;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    // Returns absolute path string for given (possibly relative) path.
    absPath(path, session) {
        const segs = this._normalize(path, session);
        return segs.length === 0 ? '/' : '/' + segs.join('/');
    }

    // Returns node or null (never throws).
    resolve(path, session) {
        return this._walk(this._normalize(path, session));
    }

    stat(path, session) {
        const node = this.resolve(path, session);
        if (!node) throw new NotFoundError(path);
        return {
            type: node.type,
            name: node.name,
            owner: node.owner,
            permissions: node.permissions,
            size: node.size || 0,
            modified: node.modified,
            _live: node._live || false,
            _generator: node._generator || null,
            _interval: node._interval || 3000,
        };
    }

    canRead(path, session) {
        const node = this.resolve(path, session);
        return node ? this._canRead(node, session.user) : false;
    }
    canWrite(path, session) {
        const node = this.resolve(path, session);
        return node ? this._canWrite(node, session.user) : false;
    }
    canExec(path, session) {
        const node = this.resolve(path, session);
        return node ? this._canExec(node, session.user) : false;
    }

    readFile(path, session) {
        const node = this.resolve(path, session);
        if (!node) throw new NotFoundError(path);
        if (node.type === 'directory') throw new IsDirectoryError(path);
        if (!this._canRead(node, session.user)) throw new PermissionError(path);
        return node.content || '';
    }

    writeFile(path, content, session) {
        const segs = this._normalize(path, session);
        const { parent, name, node } = this._walkWithParent(segs);

        if (!parent) throw new NotFoundError(path);
        if (parent.type !== 'directory') throw new NotDirectoryError(path);

        if (node) {
            if (node.type === 'directory') throw new IsDirectoryError(path);
            if (!this._canWrite(node, session.user)) throw new PermissionError(path);
            node.content  = content;
            node.size     = content.length;
            node.modified = new Date().toISOString();
        } else {
            if (!this._canWrite(parent, session.user)) throw new PermissionError(path);
            parent.children[name] = {
                type: 'file', name,
                owner: session.user, permissions: '644',
                modified: new Date().toISOString(),
                content, size: content.length,
            };
        }
        this._save();
    }

    touch(path, session) {
        const segs = this._normalize(path, session);
        const { parent, name, node } = this._walkWithParent(segs);
        if (!parent) throw new NotFoundError(path);
        if (parent.type !== 'directory') throw new NotDirectoryError(path);

        if (node) {
            if (!this._canWrite(node, session.user)) throw new PermissionError(path);
            node.modified = new Date().toISOString();
        } else {
            if (!this._canWrite(parent, session.user)) throw new PermissionError(path);
            parent.children[name] = {
                type: 'file', name,
                owner: session.user, permissions: '644',
                modified: new Date().toISOString(),
                content: '', size: 0,
            };
        }
        this._save();
    }

    list(path, session) {
        const node = this.resolve(path, session);
        if (!node) throw new NotFoundError(path);
        if (node.type !== 'directory') throw new NotDirectoryError(path);
        if (!this._canRead(node, session.user)) throw new PermissionError(path);
        return Object.values(node.children || {});
    }

    mkdir(path, session, opts = {}) {
        const segs = this._normalize(path, session);
        if (!opts.recursive) {
            this._mkdirOne(segs, session);
        } else {
            // mkdir -p: create each segment in turn
            for (let i = 1; i <= segs.length; i++) {
                const partial = segs.slice(0, i);
                const existing = this._walk(partial);
                if (!existing) this._mkdirOne(partial, session);
                else if (existing.type !== 'directory') throw new NotDirectoryError('/' + partial.join('/'));
            }
        }
    }

    _mkdirOne(segs, session) {
        const { parent, name, node } = this._walkWithParent(segs);
        if (!parent) throw new NotFoundError('/' + segs.join('/'));
        if (parent.type !== 'directory') throw new NotDirectoryError('/' + segs.join('/'));
        if (node) throw new AlreadyExistsError('/' + segs.join('/'));
        if (!this._canWrite(parent, session.user)) throw new PermissionError('/' + segs.join('/'));

        parent.children[name] = {
            type: 'directory', name,
            owner: session.user, permissions: '755',
            modified: new Date().toISOString(),
            children: {},
        };
        this._save();
    }

    remove(path, session, opts = {}) {
        const segs = this._normalize(path, session);
        if (segs.length === 0) throw new PermissionError('/');

        const { parent, name, node } = this._walkWithParent(segs);
        if (!node) throw new NotFoundError(path);
        if (!parent) throw new PermissionError(path);

        if (node.type === 'directory') {
            if (!opts.recursive) throw new IsDirectoryError(path);
        }
        if (!this._canWrite(parent, session.user)) throw new PermissionError(path);

        delete parent.children[name];
        this._save();
    }

    move(src, dest, session) {
        const srcSegs  = this._normalize(src, session);
        const destSegs = this._normalize(dest, session);
        if (srcSegs.length === 0) throw new PermissionError(src);

        const { parent: srcParent, name: srcName, node: srcNode } = this._walkWithParent(srcSegs);
        if (!srcNode) throw new NotFoundError(src);
        if (!srcParent) throw new PermissionError(src);
        if (!this._canWrite(srcParent, session.user)) throw new PermissionError(src);

        let destParent, destName;
        const destNode = this._walk(destSegs);
        if (destNode && destNode.type === 'directory') {
            destParent = destNode;
            destName   = srcName;
        } else {
            const { parent, name } = this._walkWithParent(destSegs);
            if (!parent) throw new NotFoundError(dest);
            destParent = parent;
            destName   = name;
        }
        if (!this._canWrite(destParent, session.user)) throw new PermissionError(dest);

        const moving = srcParent.children[srcName];
        moving.name = destName;
        delete srcParent.children[srcName];
        destParent.children[destName] = moving;
        this._save();
    }

    copy(src, dest, session) {
        const srcSegs  = this._normalize(src, session);
        const destSegs = this._normalize(dest, session);

        const srcNode = this._walk(srcSegs);
        if (!srcNode) throw new NotFoundError(src);
        if (!this._canRead(srcNode, session.user)) throw new PermissionError(src);
        if (srcNode.type === 'directory') throw new IsDirectoryError(src); // no -r for now

        let destParent, destName;
        const destNode = this._walk(destSegs);
        if (destNode && destNode.type === 'directory') {
            destParent = destNode;
            destName   = this._walkWithParent(srcSegs).name;
        } else {
            const { parent, name } = this._walkWithParent(destSegs);
            if (!parent) throw new NotFoundError(dest);
            destParent = parent;
            destName   = name;
        }
        if (!this._canWrite(destParent, session.user)) throw new PermissionError(dest);

        const clone = JSON.parse(JSON.stringify(srcNode));
        clone.name     = destName;
        clone.owner    = session.user;
        clone.modified = new Date().toISOString();
        destParent.children[destName] = clone;
        this._save();
    }
}

export { VFS };
