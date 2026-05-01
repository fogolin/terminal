class HistoryManager {
    constructor(maxSize = 200) {
        this._max = maxSize;
        this._entries = [];
        this._idx = -1;
        this._draft = '';
    }

    push(entry) {
        if (!entry.trim()) return;
        if (this._entries[this._entries.length - 1] === entry) return;
        this._entries.push(entry);
        if (this._entries.length > this._max) this._entries.shift();
        this._idx = -1;
        this._draft = '';
    }

    up(currentInput) {
        if (this._entries.length === 0) return null;
        if (this._idx === -1) {
            this._draft = currentInput;
            this._idx = this._entries.length - 1;
        } else if (this._idx > 0) {
            this._idx--;
        }
        return this._entries[this._idx];
    }

    down() {
        if (this._idx === -1) return null;
        if (this._idx < this._entries.length - 1) {
            this._idx++;
            return this._entries[this._idx];
        }
        this._idx = -1;
        return this._draft;
    }

    reset() {
        this._idx = -1;
        this._draft = '';
    }
}

export { HistoryManager };
