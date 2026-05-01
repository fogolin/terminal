const CHARS = '!<>-_\\/[]{}—=+*^?#';

class TextScramble {
    constructor(el) {
        this.el = el;
        this.update = this.update.bind(this);
    }

    setText(newText) {
        const oldText = this.el.textContent;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise(resolve => { this.resolve = resolve; });
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 12);
            const end = start + Math.floor(Math.random() * 12) + 4;
            this.queue.push({ from, to, start, end, char: '' });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';
        let complete = 0;
        for (let i = 0; i < this.queue.length; i++) {
            const item = this.queue[i];
            if (this.frame >= item.end) {
                complete++;
                output += item.to;
            } else if (this.frame >= item.start) {
                if (!item.char || Math.random() < 0.28) {
                    item.char = CHARS[Math.floor(Math.random() * CHARS.length)];
                }
                output += `<span class="scramble-char">${item.char}</span>`;
            } else {
                output += item.from;
            }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.el.innerHTML = this.queue.map(q => q.to).join('');
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
}

export function scrambleElement(el, text) {
    const fx = new TextScramble(el);
    el.textContent = '';
    return fx.setText(text);
}
