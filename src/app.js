import terminalStyles from './styles/terminal.css';

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

function createTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>${terminalStyles}</style>
      <div class="terminal-wrapper">
        <div class="terminal-shell hidden" role="dialog" aria-label="Firelin terminal window">
          <div class="terminal-header">
            <span class="terminal-title">Firelin Terminal</span>
            <button class="terminal-close" type="button" aria-label="Close terminal">×</button>
          </div>
          <div class="terminal-body">
            <div class="terminal-lines">
              <div class="terminal-line">Welcome to Firelin.</div>
              <div class="terminal-line">Enter the Konami code to open this terminal.</div>
              <div class="terminal-line">Desktop: ↑ ↑ ↓ ↓ ← → ← → B A</div>
              <div class="terminal-line">Mobile: swipe up, up, down, down, left, right, left, right, double tap</div>
            </div>
            <div class="terminal-input">
              <span>&gt;</span>
              <input type="text" placeholder="Type help and hit Enter" aria-label="Terminal command input">
            </div>
          </div>
          <div class="terminal-hint">Use keyboard or gesture sequence to toggle this widget.</div>
        </div>
        <span class="terminal-open-hint">Konami mode enabled</span>
      </div>
    `;
    return template;
}

class FirelinTerminalElement extends HTMLElement {
    constructor() {
        super();
        this.config = parseConfig(this.getAttribute('data-config'));
        this.touchStart = null;
        this.touchSequence = [];
        this.lastTap = 0;
        this.keySequence = [];
        this._shadow = this.attachShadow({ mode: 'open' });
        this._shadow.appendChild(createTemplate().content.cloneNode(true));
    }

    connectedCallback() {
        this.shell = this._shadow.querySelector('.terminal-shell');
        this.input = this._shadow.querySelector('.terminal-input input');
        this.closeButton = this._shadow.querySelector('.terminal-close');

        this.toggleHandler = () => this.toggleShell();
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleInputSubmit = this.handleInputSubmit.bind(this);
        this.handleShellTriggerClick = this.handleShellTriggerClick.bind(this);

        this.closeButton.addEventListener('click', this.toggleHandler);
        this.input.addEventListener('keydown', this.handleInputSubmit);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('pointerdown', this.handlePointerDown);
        window.addEventListener('pointerup', this.handlePointerUp);
        document.addEventListener('click', this.handleShellTriggerClick);
    }

    disconnectedCallback() {
        this.closeButton.removeEventListener('click', this.toggleHandler);
        this.input.removeEventListener('keydown', this.handleInputSubmit);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('pointerdown', this.handlePointerDown);
        window.removeEventListener('pointerup', this.handlePointerUp);
        document.removeEventListener('click', this.handleShellTriggerClick);
    }

    handleInputSubmit(event) {
        if (event.key !== 'Enter') return;
        const value = event.target.value.trim();
        if (!value) return;
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.textContent = `> ${value}`;
        this._shadow.querySelector('.terminal-lines').appendChild(line);
        event.target.value = '';
        this.scrollToBottom();
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
        this.touchStart = { x: event.clientX, y: event.clientY, time: Date.now() };
    }

    handlePointerUp(event) {
        if (!this.touchStart) return;
        const dx = event.clientX - this.touchStart.x;
        const dy = event.clientY - this.touchStart.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const elapsed = Date.now() - this.touchStart.time;
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
        this.input.focus();
    }

    toggleShell() {
        const isHidden = this.shell.classList.contains('hidden');
        this.shell.classList.toggle('hidden', !isHidden);
        if (!isHidden) return;
        this.input.focus();
    }

    showShell() {
        this.shell.classList.remove('hidden');
        this.input.focus();
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
    }
};

document.addEventListener('DOMContentLoaded', bootWidget);
