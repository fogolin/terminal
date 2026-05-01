import terminalStyles from './styles/terminal.css';
import terminalFonts from './styles/fonts.css';
import terminalTemplate from './assets/template.html';
import { scrambleElement } from './functions/scramble';
const WIDGET_TAG = 'firelin-terminal';
const KONAMI_KEYS = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const KONAMI_MOBILE = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'doubletap'];
const SWIPE_THRESHOLD = 30;
const DOUBLE_TAP_WINDOW = 400;

function parseConfig(value) {
    if (!value) return {};
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function injectFonts() {
    if (document.getElementById('firelin-fonts')) return;
    const style = document.createElement('style');
    style.id = 'firelin-fonts';
    style.textContent = terminalFonts;
    document.head.appendChild(style);
}

function createTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `<style>${terminalStyles}</style>${terminalTemplate}`;
    return template;
}

class FirelinTerminalElement extends HTMLElement {
    constructor() {
        super();
        injectFonts();
        this.config = parseConfig(this.getAttribute('data-config'));
        this.touchStart = null;
        this.touchSequence = [];
        this.lastTap = 0;
        this.keySequence = [];
        this._positioned = false;
        this._dragState = null;
        this._shadow = this.attachShadow({ mode: 'open' });
        this._shadow.appendChild(createTemplate().content.cloneNode(true));
    }

    connectedCallback() {
        this.shell = this._shadow.querySelector('.terminal-window');
        this.closeButton = this._shadow.querySelector('.btn-close');
        this.minimizeButton = this._shadow.querySelector('.btn-minimize');

        this.toggleHandler = () => this.toggleShell();
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleShellTriggerClick = this.handleShellTriggerClick.bind(this);

        this.handleRestoreClick = (e) => {
            if (!this.shell.classList.contains('minimized')) return;
            const path = e.composedPath();
            if (!path.includes(this)) return;
            if (path.includes(this.closeButton) || path.includes(this.minimizeButton)) return;
            this.minimizeShell();
        };

        this.closeButton.addEventListener('click', this.toggleHandler);
        this.minimizeButton.addEventListener('click', () => this.minimizeShell());
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('pointerdown', this.handlePointerDown);
        window.addEventListener('pointerup', this.handlePointerUp);
        document.addEventListener('click', this.handleShellTriggerClick);
        document.addEventListener('click', this.handleRestoreClick);

        this.initDrag();
    }

    disconnectedCallback() {
        this.closeButton.removeEventListener('click', this.toggleHandler);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('pointerdown', this.handlePointerDown);
        window.removeEventListener('pointerup', this.handlePointerUp);
        document.removeEventListener('click', this.handleShellTriggerClick);
        document.removeEventListener('click', this.handleRestoreClick);
    }

    initDrag() {
        const titlebar = this._shadow.querySelector('.terminal-titlebar');

        titlebar.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || e.target.closest('.terminal-btn')) return;
            const rect = this.getBoundingClientRect();
            this._dragState = {
                startX: e.clientX,
                startY: e.clientY,
                origRight: window.innerWidth - rect.right,
                origBottom: window.innerHeight - rect.bottom
            };
            this.style.transition = 'none';
            this.style.left = 'auto';
            this.style.top = 'auto';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this._dragState) return;
            const dx = e.clientX - this._dragState.startX;
            const dy = e.clientY - this._dragState.startY;
            this.style.right = `${this._dragState.origRight - dx}px`;
            this.style.bottom = `${this._dragState.origBottom - dy}px`;
        });

        window.addEventListener('mouseup', () => {
            if (!this._dragState) return;
            this._dragState = null;
            this.style.transition = '';
        });
    }

    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        this.keySequence.push(key);
        if (!KONAMI_KEYS.slice(0, this.keySequence.length).every((expected, index) => expected.toLowerCase() === this.keySequence[index])) {
            this.keySequence = key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright' || key === 'b' || key === 'a' ? [key] : [];
            return;
        }
        if (this.keySequence.length === KONAMI_KEYS.length) {
            this.keySequence = [];
            this.activateTerminal();
        }
    }

    handlePointerDown(event) {
        this.touchStart = { x: event.clientX, y: event.clientY };
    }

    handlePointerUp(event) {
        if (!this.touchStart) return;
        const dx = event.clientX - this.touchStart.x;
        const dy = event.clientY - this.touchStart.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const isTap = absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD;
        let direction = null;

        if (isTap) {
            const now = Date.now();
            if (now - this.lastTap < DOUBLE_TAP_WINDOW) {
                direction = 'doubletap';
                this.lastTap = 0;
            } else {
                this.lastTap = now;
            }
        } else if (absX > absY) {
            direction = dx > 0 ? 'right' : 'left';
        } else {
            direction = dy > 0 ? 'down' : 'up';
        }

        if (direction) {
            this.touchSequence.push(direction);
            if (!KONAMI_MOBILE.slice(0, this.touchSequence.length).every((expected, index) => expected === this.touchSequence[index])) {
                this.touchSequence = direction === 'up' || direction === 'down' || direction === 'left' || direction === 'right' || direction === 'doubletap' ? [direction] : [];
                return;
            }
            if (this.touchSequence.length === KONAMI_MOBILE.length) {
                this.touchSequence = [];
                this.activateTerminal();
            }
        }
    }

    handleShellTriggerClick(event) {
        if (event.target.closest('.shell')) {
            this.activateTerminal();
        }
    }

    activateTerminal() {
        console.log('%cshell activated.', 'color: #00ff00; font-weight: bold;');
        this.showShell();
    }

    toggleShell() {
        this.shell.classList.toggle('hidden', !this.shell.classList.contains('hidden'));
    }

    showShell() {
        const wasHidden = this.shell.classList.contains('hidden');

        if (!this._positioned) {
            this.style.transition = 'none';
            this.style.left = 'auto';
            this.style.top = 'auto';
            this.shell.classList.remove('hidden');
            const h = this.offsetHeight;
            this.style.right = `${Math.max(16, (window.innerWidth - 480) / 2)}px`;
            this.style.bottom = `${window.innerHeight - 80 - h}px`;
            this._positioned = true;
            requestAnimationFrame(() => { this.style.transition = ''; });
        } else if (this.shell.classList.contains('minimized') && this._savedRight != null) {
            this.style.right = this._savedRight;
            this.style.bottom = this._savedBottom;
            this._savedRight = null;
            this._savedBottom = null;
        }

        this.shell.classList.remove('hidden');
        this.shell.classList.remove('minimized');

        if (wasHidden) this._scrambleLines();
    }

    _scrambleLines() {
        const allLines = [...this._shadow.querySelectorAll('.terminal-line')];
        const promptLine = allLines[allLines.length - 1];
        const textLines = allLines.filter(line => !line.querySelector('.terminal-cursor'));

        if (!promptLine) return;
        promptLine.style.visibility = 'hidden';

        const entries = textLines.map(line => {
            if (!line._origText) line._origText = line.textContent;
            return { el: line, text: line._origText };
        });

        const promises = entries.map(({ el, text }, i) =>
            new Promise(resolve => {
                setTimeout(() => scrambleElement(el, text).then(resolve), i * 120);
            })
        );

        Promise.all(promises).then(() => {
            promptLine.style.visibility = '';
        });
    }

    addLine(text) {
        const lines = this._shadow.querySelector('.terminal-lines');
        const promptLine = lines.querySelector('.terminal-line:last-child');
        const line = document.createElement('div');
        line.className = 'terminal-line';
        lines.insertBefore(line, promptLine);
        scrambleElement(line, text);
        this.scrollToBottom();
        return line;
    }

    minimizeShell() {
        if (this.shell.classList.contains('minimized')) {
            this.shell.classList.remove('minimized');
            this.style.right = this._savedRight != null ? this._savedRight : `${Math.max(16, (window.innerWidth - 480) / 2)}px`;
            this.style.bottom = this._savedBottom != null ? this._savedBottom : `${window.innerHeight - 80 - this.offsetHeight}px`;
            this._savedRight = null;
            this._savedBottom = null;
        } else {
            this._savedRight = this.style.right;
            this._savedBottom = this.style.bottom;
            this.style.right = '8px';
            this.style.bottom = '8px';
            this.shell.classList.add('minimized');
        }
    }

    scrollToBottom() {
        const lines = this._shadow.querySelector('.terminal-lines');
        lines.scrollTop = lines.scrollHeight;
    }
}

if (!customElements.get(WIDGET_TAG)) {
    customElements.define(WIDGET_TAG, FirelinTerminalElement);
}

function bootWidget() {
    if (document.querySelector(WIDGET_TAG)) return;
    const element = document.createElement(WIDGET_TAG);
    document.body.appendChild(element);
}

window.FirelinTerminal = {
    create: (config = {}) => {
        let instance = document.querySelector(WIDGET_TAG);
        if (!instance) {
            instance = document.createElement(WIDGET_TAG);
            instance.setAttribute('data-config', JSON.stringify(config));
            document.body.appendChild(instance);
        }
        return instance;
    },
    addLine: (text) => {
        const instance = document.querySelector(WIDGET_TAG);
        if (instance) return instance.addLine(text);
    }
};

document.addEventListener('DOMContentLoaded', bootWidget);
