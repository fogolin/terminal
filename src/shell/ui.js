import { renderHighlighted } from './highlighter.js';
import { scrambleElement } from '../functions/scramble.js';
import registry from './commands/index.js';

class TerminalUI {
    constructor(shadow) {
        this._shadow = shadow;
        this._shell = null;
        this._locked = false;
        this._maskMode = false;

        this._body = shadow.querySelector('.terminal-body');
        this._overlay = shadow.querySelector('.terminal-overlay');
        this._lines = shadow.querySelector('.terminal-lines');
        this._inputRow = shadow.querySelector('.terminal-input-row');
        this._promptEl = shadow.querySelector('.terminal-prompt');
        this._display = shadow.querySelector('.terminal-input-display');
        this._cursor = shadow.querySelector('.terminal-cursor');
        this._capture = shadow.querySelector('.terminal-input-capture');

        this._bindEvents();
    }

    setShell(shell) {
        this._shell = shell;
    }

    // ── Output ──────────────────────────────────────────────────────────────

    print(text, className = '') {
        const line = document.createElement('div');
        line.className = 'terminal-line' + (className ? ' ' + className : '');
        line.textContent = text === '' ? ' ' : text; // preserve blank lines
        this._lines.insertBefore(line, this._inputRow);
        this._scrollToBottom();
    }

    printBoot(text) {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        this._lines.insertBefore(line, this._inputRow);
        if (text === '') {
            line.textContent = ' ';
        } else {
            scrambleElement(line, text);
        }
        this._scrollToBottom();
    }

    printCommand(prompt, input) {
        const line = document.createElement('div');
        line.className = 'terminal-line line-command';

        const ps = document.createElement('span');
        ps.className = 'terminal-prompt';
        ps.textContent = prompt + ' ';
        line.appendChild(ps);

        const is = document.createElement('span');
        is.textContent = input;
        line.appendChild(is);

        this._lines.insertBefore(line, this._inputRow);
        this._scrollToBottom();
    }

    printSigint() {
        this.printCommand(this._promptEl.textContent.trimEnd(), '^C');
    }

    error(text) {
        this.print(text, 'line-error');
    }

    clear() {
        const outputLines = this._lines.querySelectorAll('.terminal-line');
        outputLines.forEach(l => l.remove());
    }

    // ── Input ───────────────────────────────────────────────────────────────

    setPrompt(text) {
        this._promptEl.textContent = text + ' ';
        this._updateDisplay();
    }

    setInput(value) {
        this._capture.value = value;
        this._updateDisplay();
        const len = value.length;
        try { this._capture.setSelectionRange(len, len); } catch (_) { }
    }

    setInputLocked(locked) {
        this._locked = locked;
    }

    setMaskMode(mask) {
        this._maskMode = mask;
        this._updateDisplay();
    }

    setInputRowVisible(visible) {
        this._inputRow.style.display = visible ? '' : 'none';
    }

    createBlock() {
        const ui = this;
        const el = document.createElement('div');
        el.style.whiteSpace = 'pre';
        el.className = 'terminal-block';
        this._lines.insertBefore(el, this._inputRow);
        this._scrollToBottom();
        return {
            update(text) { el.textContent = text; ui._scrollToBottom(); },
            remove() { el.remove(); },
        };
    }

    injectStyle(id, css) {
        let style = this._shadow.getElementById(id);
        if (!style) {
            style = document.createElement('style');
            style.id = id;
            this._shadow.appendChild(style);
        }
        style.textContent = css;
    }

    applyTheme(css) {
        const THEME_ID = 'firelin-active-theme';
        const existing = this._shadow.getElementById(THEME_ID);
        if (!css) {
            if (existing) existing.remove();
            return;
        }
        this.injectStyle(THEME_ID, css);
    }

    createOverlay() {
        if (!this._overlay) return null;
        this._overlay.textContent = '';
        this._body.classList.add('has-overlay');
        return this._overlay;
    }

    mountOverlay(el) {
        if (!this._overlay) return;
        if (el !== this._overlay) {
            this._overlay.appendChild(el);
        }
        this._body.classList.add('has-overlay');
    }

    unmountOverlay(el) {
        if (!this._overlay) return;
        if (el === this._overlay) {
            this._overlay.textContent = '';
            this._body.classList.remove('has-overlay');
            return;
        }

        el.remove();
        if (!this._overlay.hasChildNodes()) {
            this._body.classList.remove('has-overlay');
        }
    }

    focus() {
        this._capture.focus();
    }

    focusAndScroll() {
        this._capture.focus();
        this._scrollToBottom();
    }

    // ── Private ─────────────────────────────────────────────────────────────

    _bindEvents() {
        // Click anywhere in body → focus hidden input, but not when user is selecting text
        let _pointerMoved = false;
        this._body.addEventListener('mousedown', () => { _pointerMoved = false; });
        this._body.addEventListener('mousemove', () => { _pointerMoved = true; });
        this._body.addEventListener('click', () => {
            if (!_pointerMoved) this._capture.focus();
        });

        this._capture.addEventListener('input', () => this._onInput());
        this._capture.addEventListener('keydown', (e) => this._onKeyDown(e));
        this._capture.addEventListener('keyup', (e) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                this._updateDisplay();
            }
        });

        this._capture.addEventListener('focus', () => {
            this._cursor.classList.add('cursor-active');
            this._updateDisplay();
        });
        this._capture.addEventListener('blur', () => {
            this._cursor.classList.remove('cursor-active');
        });
    }

    _onInput() {
        this._updateDisplay();
    }

    _onKeyDown(e) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                if (!this._locked) this._shell.submit(this._capture.value);
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (!this._locked) {
                    const up = this._shell.history.up(this._capture.value);
                    if (up !== null) this.setInput(up);
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (!this._locked) {
                    const down = this._shell.history.down();
                    if (down !== null) this.setInput(down);
                }
                break;

            case 'Tab':
                e.preventDefault();
                // Phase 5: tab completion
                break;

            case 'c':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._shell.sigint();
                }
                break;

            case 'l':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.clear();
                }
                break;

            case 'a':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._capture.setSelectionRange(0, 0);
                }
                break;

            case 'e':
                if (e.ctrlKey) {
                    e.preventDefault();
                    const len = this._capture.value.length;
                    this._capture.setSelectionRange(len, len);
                }
                break;
        }
    }

    _updateDisplay() {
        const val = this._capture.value;
        const pos = this._capture.selectionStart ?? val.length;

        if (this._maskMode) {
            this._display.textContent = '•'.repeat(val.length);
        } else {
            const spans = renderHighlighted(val, registry);
            this._display.textContent = '';
            spans.forEach(s => this._display.appendChild(s));
        }

        this._positionCursor(val, pos);
    }

    _positionCursor(val, pos) {
        const rowRect = this._inputRow.getBoundingClientRect();
        const offsetX = 8;
        const offsetY = 2;

        if (!val.length) {
            const rect = this._promptEl.getBoundingClientRect();
            this._cursor.style.left = (rect.right - rowRect.left) + offsetX + 'px';
            this._cursor.style.top = (rect.top - rowRect.top) + offsetY + 'px';
            return;
        }

        const atEnd = pos >= val.length;
        const targetPos = atEnd ? val.length - 1 : pos;

        const walker = document.createTreeWalker(this._display, NodeFilter.SHOW_TEXT);
        let node, charCount = 0;

        while ((node = walker.nextNode())) {
            const nodeEnd = charCount + node.textContent.length;
            if (targetPos < nodeEnd) {
                const offset = targetPos - charCount;
                const range = document.createRange();
                range.setStart(node, offset);
                range.setEnd(node, offset + 1);
                const rect = range.getBoundingClientRect();
                this._cursor.style.left = ((atEnd ? rect.right : rect.left) - rowRect.left) + 'px';
                this._cursor.style.top = (rect.top - rowRect.top) + offsetY + 'px';
                return;
            }
            charCount = nodeEnd;
        }
    }

    _scrollToBottom() {
        this._body.scrollTop = this._body.scrollHeight;
    }
}

export { TerminalUI };
