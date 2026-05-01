import terminalStyles from './styles/terminal.css';
import terminalFonts  from './styles/fonts.css';
import terminalTemplate from './assets/template.html';
import { Shell }       from './shell/shell.js';
import { TerminalUI }  from './shell/ui.js';

const WIDGET_TAG = 'firelin-terminal';

const KONAMI_KEYS   = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
const KONAMI_MOBILE = ['up','up','down','down','left','right','left','right','doubletap'];
const SWIPE_THRESHOLD  = 30;
const DOUBLE_TAP_WINDOW = 400;

function parseConfig(value) {
    if (!value) return {};
    try { return JSON.parse(value); } catch { return {}; }
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
        this.config        = parseConfig(this.getAttribute('data-config'));
        this.touchStart    = null;
        this.touchSequence = [];
        this.lastTap       = 0;
        this.keySequence   = [];
        this._positioned   = false;
        this._dragState    = null;
        this._shellBooted  = false;
        this._ui           = null;
        this._shell        = null;

        this._shadow = this.attachShadow({ mode: 'open' });
        this._shadow.appendChild(createTemplate().content.cloneNode(true));
    }

    connectedCallback() {
        this.shell         = this._shadow.querySelector('.terminal-window');
        this.closeButton   = this._shadow.querySelector('.btn-close');
        this.minimizeButton = this._shadow.querySelector('.btn-minimize');

        this.toggleHandler          = () => this.toggleShell();
        this.handleKeyDown          = this.handleKeyDown.bind(this);
        this.handlePointerDown      = this.handlePointerDown.bind(this);
        this.handlePointerUp        = this.handlePointerUp.bind(this);
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
        this.initResize();
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
            const rect = this.shell.getBoundingClientRect();
            this._dragState = {
                startX: e.clientX, startY: e.clientY,
                origRight:  window.innerWidth  - rect.right,
                origBottom: window.innerHeight - rect.bottom,
            };
            this.shell.style.left = 'auto';
            this.shell.style.top  = 'auto';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this._dragState) return;
            const dx = e.clientX - this._dragState.startX;
            const dy = e.clientY - this._dragState.startY;
            this.shell.style.right  = `${this._dragState.origRight  - dx}px`;
            this.shell.style.bottom = `${this._dragState.origBottom - dy}px`;
        });

        window.addEventListener('mouseup', () => {
            if (!this._dragState) return;
            this._dragState = null;
        });
    }

    initResize() {
        const titlebar = this._shadow.querySelector('.terminal-titlebar');
        const body     = this._shadow.querySelector('.terminal-body');
        new ResizeObserver(() => {
            if (this.shell.classList.contains('minimized')) return;
            const h = this.shell.getBoundingClientRect().height
                    - titlebar.getBoundingClientRect().height;
            if (h > 0) body.style.height = h + 'px';
        }).observe(this.shell);
    }

    handleKeyDown(event) {
        // Don't advance Konami while terminal is open
        if (!this.shell.classList.contains('hidden')) {
            this.keySequence = [];
            return;
        }

        const key = event.key;
        this.keySequence.push(key);
        if (!KONAMI_KEYS.slice(0, this.keySequence.length)
                .every((expected, i) => expected.toLowerCase() === this.keySequence[i].toLowerCase())) {
            const validStart = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','b','a'];
            this.keySequence = validStart.some(k => k.toLowerCase() === key.toLowerCase()) ? [key] : [];
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
        const absX = Math.abs(dx), absY = Math.abs(dy);
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
            if (!KONAMI_MOBILE.slice(0, this.touchSequence.length)
                    .every((expected, i) => expected === this.touchSequence[i])) {
                const validStart = ['up','down','left','right','doubletap'];
                this.touchSequence = validStart.includes(direction) ? [direction] : [];
                return;
            }
            if (this.touchSequence.length === KONAMI_MOBILE.length) {
                this.touchSequence = [];
                this.activateTerminal();
            }
        }
    }

    handleShellTriggerClick(event) {
        if (event.target.closest('.shell')) this.activateTerminal();
    }

    activateTerminal() {
        console.log('%cshell activated.', 'color: #36ba2c; font-weight: bold;');
        this.showShell();
    }

    toggleShell() {
        if (this.shell.classList.contains('hidden')) {
            this.showShell();
        } else {
            this.shell.classList.add('hidden');
        }
    }

    showShell() {
        const wasHidden = this.shell.classList.contains('hidden');

        if (!this._positioned) {
            this.shell.classList.remove('hidden');
            const h = this.shell.offsetHeight;
            this.shell.style.right  = `${Math.max(16, (window.innerWidth - 480) / 2)}px`;
            this.shell.style.bottom = `${window.innerHeight - 80 - h}px`;
            this._positioned = true;
        } else if (this.shell.classList.contains('minimized') && this._savedRight != null) {
            this.shell.classList.add('animate');
            this.shell.style.right  = this._savedRight;
            this.shell.style.bottom = this._savedBottom;
            this._savedRight  = null;
            this._savedBottom = null;
            this.shell.addEventListener('transitionend', () => this.shell.classList.remove('animate'), { once: true });
        }

        this.shell.classList.remove('hidden');
        this.shell.classList.remove('minimized');

        if (wasHidden && !this._shellBooted) {
            this._shellBooted = true;
            this._bootShell();
        } else {
            if (this._ui) this._ui.focus();
        }
    }

    async _bootShell() {
        this._ui    = new TerminalUI(this._shadow);
        this._shell = new Shell();
        this._ui.setShell(this._shell);
        this._shell.setUI(this._ui);
        await this._shell.boot();
        this._ui.focus();
    }

    minimizeShell() {
        this.shell.classList.add('animate');
        this.shell.addEventListener('transitionend', () => this.shell.classList.remove('animate'), { once: true });

        if (this.shell.classList.contains('minimized')) {
            this.shell.classList.remove('minimized');
            this.shell.style.right  = this._savedRight  ?? `${Math.max(16, (window.innerWidth - 480) / 2)}px`;
            this.shell.style.bottom = this._savedBottom ?? `${window.innerHeight - 80 - this.shell.offsetHeight}px`;
            this._savedRight  = null;
            this._savedBottom = null;
            if (this._ui) this._ui.focus();
        } else {
            this._savedRight  = this.shell.style.right;
            this._savedBottom = this.shell.style.bottom;
            this.shell.style.right  = '8px';
            this.shell.style.bottom = '8px';
            this.shell.classList.add('minimized');
        }
    }

    // kept for external backward-compat
    addLine(text) {
        if (this._ui) this._ui.print(text);
    }
}

if (!customElements.get(WIDGET_TAG)) {
    customElements.define(WIDGET_TAG, FirelinTerminalElement);
}

window.FirelinTerminal = {
    create(config = {}) {
        let instance = document.querySelector(WIDGET_TAG);
        if (!instance) {
            instance = document.createElement(WIDGET_TAG);
            instance.setAttribute('data-config', JSON.stringify(config));
            document.body.appendChild(instance);
        }
        return instance;
    },
    addLine(text) {
        const instance = document.querySelector(WIDGET_TAG);
        if (instance) return instance.addLine(text);
    },
};

document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector(WIDGET_TAG)) {
        document.body.appendChild(document.createElement(WIDGET_TAG));
    }
});
