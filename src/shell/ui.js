import { renderHighlighted } from './highlighter.js';
import { scrambleElement } from '../functions/scramble.js';
import registry from './commands/index.js';

class TerminalUI {
    constructor(shadow) {
        this._shadow   = shadow;
        this._shell    = null;
        this._locked   = false;

        this._body     = shadow.querySelector('.terminal-body');
        this._lines    = shadow.querySelector('.terminal-lines');
        this._inputRow = shadow.querySelector('.terminal-input-row');
        this._promptEl = shadow.querySelector('.terminal-prompt');
        this._display  = shadow.querySelector('.terminal-input-display');
        this._cursor   = shadow.querySelector('.terminal-cursor');
        this._capture  = shadow.querySelector('.terminal-input-capture');

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
    }

    setInput(value) {
        this._capture.value = value;
        this._updateDisplay();
        const len = value.length;
        try { this._capture.setSelectionRange(len, len); } catch (_) {}
    }

    setInputLocked(locked) {
        this._locked = locked;
    }

    focus() {
        this._capture.focus();
    }

    // ── Private ─────────────────────────────────────────────────────────────

    _bindEvents() {
        // Click anywhere in body → focus hidden input
        this._body.addEventListener('click', () => this._capture.focus());

        this._capture.addEventListener('input',   () => this._onInput());
        this._capture.addEventListener('keydown', (e) => this._onKeyDown(e));

        this._capture.addEventListener('focus', () => {
            this._cursor.classList.add('cursor-active');
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
        const spans = renderHighlighted(val, registry);
        this._display.textContent = '';
        spans.forEach(span => this._display.appendChild(span));
    }

    _scrollToBottom() {
        this._body.scrollTop = this._body.scrollHeight;
    }
}

export { TerminalUI };
