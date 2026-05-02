import terminalStyles from './styles/terminal.css';
import terminalFonts from './styles/fonts.css';
import terminalTemplate from './templates/terminal.html';
import { Shell } from './shell/shell.js';
import { TerminalUI } from './shell/ui.js';

const WIDGET_TAG = 'firelin-terminal';

const KONAMI_KEYS = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const KONAMI_MOBILE = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'doubletap'];
const SWIPE_THRESHOLD = 30;
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
        this.config = parseConfig(this.getAttribute('data-config'));
        this.touchStart = null;
        this.touchSequence = [];
        this.lastTap = 0;
        this.keySequence = [];
        this._positioned = false;
        this._dragState = null;
        this._shellBooted = false;
        this._ui = null;
        this._shell = null;
        this._savedRight = '24px';
        this._savedBottom = '24px';
        this._savedWidth = null;
        this._savedHeight = null;

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
                startX: e.clientX,
                startY: e.clientY,
                startLeft: rect.left,
                startTop: rect.top,
            };

            this.shell.style.position = 'fixed';
            this.shell.style.left = `${rect.left}px`;
            this.shell.style.top = `${rect.top}px`;
            this.shell.style.right = 'auto';
            this.shell.style.bottom = 'auto';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this._dragState) return;
            const dx = e.clientX - this._dragState.startX;
            const dy = e.clientY - this._dragState.startY;
            // const newLeft = Math.min(
            //     Math.max(0, this._dragState.startLeft + dx),
            //     window.innerWidth - this.shell.offsetWidth
            // );
            // const newTop = Math.min(
            //     Math.max(0, this._dragState.startTop + dy),
            //     window.innerHeight - this.shell.offsetHeight
            // );

            const newLeft = this._dragState.startLeft + dx;
            const newTop = this._dragState.startTop + dy;
            this.shell.style.left = `${newLeft}px`;
            this.shell.style.top = `${newTop}px`;
        });

        window.addEventListener('mouseup', () => {
            if (!this._dragState) return;
            this._dragState = null;
        });
    }

    initResize() {
        const resizeHandles = this._shadow.querySelectorAll('.resize-handle');
        let resizeState = null;

        const startResize = (e, direction) => {
            e.preventDefault();
            e.stopPropagation();

            const rect = this.shell.getBoundingClientRect();
            resizeState = {
                direction,
                startX: e.clientX,
                startY: e.clientY,
                startWidth: rect.width,
                startHeight: rect.height,
                startLeft: rect.left,
                startTop: rect.top,
                startRight: window.innerWidth - rect.right,
                startBottom: window.innerHeight - rect.bottom
            };

            // Switch to position: fixed with explicit coordinates during resize
            this.shell.style.position = 'fixed';
            this.shell.style.left = `${rect.left}px`;
            this.shell.style.top = `${rect.top}px`;
            this.shell.style.right = 'auto';
            this.shell.style.bottom = 'auto';

            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', endResize);
        };

        const doResize = (e) => {
            if (!resizeState) return;

            const dx = e.clientX - resizeState.startX;
            const dy = e.clientY - resizeState.startY;
            let newWidth = resizeState.startWidth;
            let newHeight = resizeState.startHeight;
            let newLeft = resizeState.startLeft;
            let newTop = resizeState.startTop;

            // Handle horizontal resizing
            if (resizeState.direction.includes('right')) {
                newWidth = Math.max(200, resizeState.startWidth + dx);
            } else if (resizeState.direction.includes('left')) {
                const potentialWidth = resizeState.startWidth - dx;
                if (potentialWidth >= 200) {
                    newWidth = potentialWidth;
                    newLeft = resizeState.startLeft + dx;
                }
            }

            // Handle vertical resizing
            if (resizeState.direction.includes('bottom')) {
                newHeight = Math.max(100, resizeState.startHeight + dy);
            } else if (resizeState.direction.includes('top')) {
                const potentialHeight = resizeState.startHeight - dy;
                if (potentialHeight >= 100) {
                    newHeight = potentialHeight;
                    newTop = resizeState.startTop + dy;
                }
            }

            // Apply constraints to keep window on screen
            const maxLeft = window.innerWidth - 200;
            const maxTop = window.innerHeight - 100;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            this.shell.style.width = `${newWidth}px`;
            this.shell.style.height = `${newHeight}px`;
            this.shell.style.left = `${newLeft}px`;
            this.shell.style.top = `${newTop}px`;
        };

        const endResize = () => {
            if (!resizeState) return;

            // Keep fixed left/top positioning after resize to avoid shifting.
            this.shell.style.position = 'fixed';

            resizeState = null;
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', endResize);
        };

        // Attach event listeners to resize handles
        resizeHandles.forEach(handle => {
            const direction = Array.from(handle.classList)
                .find(cls => cls.startsWith('resize-') && cls !== 'resize-handle')
            handle.addEventListener('mousedown', (e) => startResize(e, direction));
        });

        // Keep the existing ResizeObserver for body height adjustment
        const titlebar = this._shadow.querySelector('.terminal-titlebar');
        const body = this._shadow.querySelector('.terminal-body');
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
            const validStart = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
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
                const validStart = ['up', 'down', 'left', 'right', 'doubletap'];
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
            this.shell.style.right = `${Math.max(16, (window.innerWidth - 480) / 2)}px`;
            this.shell.style.bottom = `${window.innerHeight - 80 - h}px`;
            this._positioned = true;
        } else if (this.shell.classList.contains('minimized') && this._savedRight != null) {
            this.shell.classList.add('animate');
            this.shell.style.right = this._savedRight;
            this.shell.style.bottom = this._savedBottom;
            this._savedRight = null;
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
        this._ui = new TerminalUI(this._shadow);
        this._shell = new Shell(this.config);
        this._ui.setShell(this._shell);
        this._shell.setUI(this._ui);
        if (this.config.title) this._ui.setTitle(this.config.title);
        await this._shell.boot();
        this._ui.focus();
    }

    minimizeShell() {
        this.shell.classList.add('animate');
        this.shell.addEventListener('transitionend', () => this.shell.classList.remove('animate'), { once: true });

        // Ensure position is in right/bottom for smooth animation
        const rect = this.shell.getBoundingClientRect();
        const currentRight = (this.shell.style.right && this.shell.style.right !== 'auto')
            ? this.shell.style.right
            : `${window.innerWidth - rect.right}px`;
        const currentBottom = (this.shell.style.bottom && this.shell.style.bottom !== 'auto')
            ? this.shell.style.bottom
            : `${window.innerHeight - rect.bottom}px`;
        this.shell.style.right = currentRight;
        this.shell.style.bottom = currentBottom;
        this.shell.style.left = 'auto';
        this.shell.style.top = 'auto';

        if (this.shell.classList.contains('minimized')) {
            // Restoring: animate from minimized state back to saved position/size.
            const targetRight = this._savedRight;
            const targetBottom = this._savedBottom;
            const targetWidth = this._savedWidth || '';
            const targetHeight = this._savedHeight || '';

            this._savedRight = null;
            this._savedBottom = null;
            this._savedWidth = null;
            this._savedHeight = null;

            requestAnimationFrame(() => {
                this.shell.style.right = targetRight;
                this.shell.style.bottom = targetBottom;
                this.shell.style.width = targetWidth;
                this.shell.style.height = targetHeight;

                requestAnimationFrame(() => {
                    this.shell.classList.remove('minimized');
                    if (this._ui) this._ui.focus();
                });
            });
        } else {
            // Minimizing
            this._savedRight = currentRight;
            this._savedBottom = currentBottom;
            this._savedWidth = this.shell.style.width || getComputedStyle(this.shell).width;
            this._savedHeight = this.shell.style.height || getComputedStyle(this.shell).height;

            this.shell.style.right = '8px';
            this.shell.style.bottom = '8px';
            this.shell.style.width = '220px';
            this.shell.style.height = '38px';
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
            document.body.appendChild(instance);
        }
        instance.config = config;
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
