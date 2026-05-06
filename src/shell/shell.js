import { parse } from './parser.js';
import capitalize from '../functions/capitalize.js';
import pkg from '../../package.json';
const { version } = pkg;
import { HistoryManager } from './history.js';
import registry from './commands/index.js';
import { VFS } from './vfs/vfs.js';
import { THEMES, loadTheme } from './themes.js';
import { boot as bootPackages } from './packages/index.js';

class Shell {
    constructor(config = {}) {
        this.config = config;
        this._ui = null;
        this.history = new HistoryManager();
        this.vfs = new VFS();
        this._running = false;
        this._currentAbort = null;
        this._readline = null;
        this.session = {
            user: config?.user || 'guest',
            cwd: '/home/guest',
            hostname: config?.osName || 'firelin',
            theme: config?.theme || 'phosphor',
            env: new Map([
                ['HOME', '/home/guest'],
                ['PATH', '/bin:/usr/bin'],
                ['USER', config?.user || 'guest'],
                ['SHELL', '/bin/bash'],
            ]),
        };
    }

    setUI(ui) {
        this._ui = ui;
    }

    get prompt() {
        const home = this.session.env.get('HOME') || '/home/' + this.session.user;
        const cwd = this.session.cwd === home
            ? '~'
            : this.session.cwd.startsWith(home + '/')
                ? '~' + this.session.cwd.slice(home.length)
                : this.session.cwd;
        const symbol = this.session.user === 'root' ? '#' : '$';
        return `${this.session.user}@${this.session.hostname}:${cwd}${symbol}`;
    }

    async boot() {
        if (Array.isArray(this.config.history)) {
            this.config.history.forEach(entry => this.history.push(entry));
        }

        const userTheme = (() => { try { return localStorage.getItem('firelin_theme'); } catch (_) { return null; } })();
        const themeId = userTheme || this.config.theme || 'phosphor';
        if (themeId !== 'phosphor') {
            const theme = THEMES.get(themeId);
            if (theme && theme.css) {
                this._ui.applyTheme(theme.css);
                this.session.theme = themeId;
            }
        }

        const DEFAULT_MOTD = [
            `Welcome to ${capitalize(this.session.hostname)} OS ${version} LTS (${capitalize(this.session.theme)})`,
            '',
            "Type 'help' to list available commands.",
            "Type 'ls /projects' to see what's been built.",
            '',
        ];

        const motd = this.config.welcomeMessage
            ? (Array.isArray(this.config.welcomeMessage) ? this.config.welcomeMessage : [this.config.welcomeMessage])
            : DEFAULT_MOTD;

        await bootPackages(this.config.packages, registry);

        for (let i = 0; i < motd.length; i++) {
            await new Promise(r => setTimeout(r, i * 90));
            this._ui.printBoot(motd[i]);
        }
        this._ui.setPrompt(this.prompt);
    }

    async submit(input) {
        // Readline mode: a command is waiting for interactive input
        if (this._readline) {
            const { resolve, mask, prompt: rlPrompt } = this._readline;
            this._readline = null;
            this._ui.setMaskMode(false);
            this._ui.setInput('');
            if (!mask) this._ui.printCommand(rlPrompt, input);
            this._ui.setPrompt(this.prompt);
            resolve(input);
            return;
        }

        if (this._running) return;

        this._ui.printCommand(this.prompt, input);
        this._ui.setInput('');

        const trimmed = input.trim();
        if (!trimmed) return;

        this.history.push(trimmed);

        const args = parse(trimmed, registry);
        const cmd = registry.get(args.command);

        if (!cmd) {
            this._ui.error(`bash: ${args.command}: command not found`);
            return;
        }

        const ac = new AbortController();
        this._currentAbort = ac;
        this._running = true;
        this._ui.setInputLocked(true);

        const ctx = this._makeContext(ac.signal);
        try {
            await cmd.execute(args, ctx);
        } catch (e) {
            if (e.name !== 'AbortError' && !ac.signal.aborted) {
                this._ui.error(`${args.command}: ${e.message}`);
            }
        } finally {
            this._running = false;
            this._currentAbort = null;
            this._ui.setInputLocked(false);
            this._ui.setPrompt(this.prompt);
            this._ui.focusAndScroll();
        }
    }

    sigint() {
        if (this._currentAbort) {
            this._currentAbort.abort();
        }
        this._ui.printSigint();
        this._ui.setInput('');
        if (!this._running) {
            this._ui.setPrompt(this.prompt);
        }
    }

    _makeContext(abortSignal) {
        const shell = this;
        return {
            print(text, cls) { shell._ui.print(text, cls); },
            printSpans(segments) { shell._ui.printSpans(segments); },
            error(text) { shell._ui.error(text); },
            clear() { shell._ui.clear(); },
            session: shell.session,
            setCwd(path) {
                shell.session.cwd = path;
                shell._ui.setPrompt(shell.prompt);
            },
            setUser(user) {
                shell.session.user = user;
                shell.session.env.set('USER', user);
                const home = user === 'root' ? '/root' : `/home/${user}`;
                shell.session.env.set('HOME', home);
                shell.session.cwd = home;
                shell._ui.setPrompt(shell.prompt);
            },
            config: shell.config,
            vfs: shell.vfs,
            readline(prompt, mask = false) {
                return new Promise((resolve, reject) => {
                    shell._readline = { resolve, mask, prompt };
                    shell._ui.setPrompt(prompt);
                    shell._ui.setMaskMode(mask);
                    shell._ui.setInput('');
                    shell._ui.setInputLocked(false);
                    abortSignal.addEventListener('abort', () => {
                        shell._readline = null;
                        shell._ui.setMaskMode(false);
                        shell._ui.setInputLocked(true);
                        const err = new Error('Aborted');
                        err.name = 'AbortError';
                        reject(err);
                    }, { once: true });
                });
            },
            createBlock() { return shell._ui.createBlock(); },
            createOverlay() { return shell._ui.createOverlay(); },
            setInputRowVisible(visible) { shell._ui.setInputRowVisible(visible); },
            mountOverlay(el) { shell._ui.mountOverlay(el); },
            unmountOverlay(el) { shell._ui.unmountOverlay(el); },
            injectStyle(id, css) { shell._ui.injectStyle(id, css); },
            applyTheme(id, css) { shell._ui.applyTheme(css); },
            openPanel(options = {}) {
                const overlay = shell._ui.createOverlay();
                shell._ui.setInputRowVisible(false);

                const wrapper = document.createElement('div');
                wrapper.className = 'panel-overlay';

                const topBar = document.createElement('div');
                topBar.className = 'terminal-overlay-bar terminal-overlay-bar-top panel-overlay-top';

                const main = document.createElement('div');
                main.className = 'panel-overlay-main';

                const bottomBar = document.createElement('div');
                bottomBar.className = 'terminal-overlay-bar terminal-overlay-bar-bottom panel-overlay-bottom';

                function applyContent(el, content) {
                    if (content == null) { el.style.display = 'none'; return; }
                    el.style.display = '';
                    if (content instanceof HTMLElement) {
                        el.textContent = '';
                        el.appendChild(content);
                    } else {
                        el.innerHTML = content;
                    }
                }

                applyContent(topBar, options.top ?? null);
                applyContent(bottomBar, options.bottom ?? null);

                wrapper.appendChild(topBar);
                wrapper.appendChild(main);
                wrapper.appendChild(bottomBar);
                overlay.appendChild(wrapper);

                let _pendingReadlineReject = null;

                const panel = {
                    print(text, cls) {
                        const line = document.createElement('div');
                        line.className = 'terminal-line' + (cls ? ' ' + cls : '');
                        line.textContent = text === '' ? ' ' : text;
                        main.appendChild(line);
                        main.scrollTop = main.scrollHeight;
                    },
                    error(text) { panel.print(text, 'line-error'); },
                    clear() { main.textContent = ''; },
                    readline(prompt, mask = false) {
                        return new Promise((resolve, reject) => {
                            _pendingReadlineReject = reject;

                            const row = document.createElement('div');
                            row.className = 'panel-readline-row';

                            const promptEl = document.createElement('span');
                            promptEl.className = 'panel-readline-prompt';
                            promptEl.textContent = prompt;

                            const input = document.createElement('input');
                            input.className = 'panel-readline-input';
                            if (mask) input.type = 'password';

                            row.appendChild(promptEl);
                            row.appendChild(input);
                            main.appendChild(row);
                            main.scrollTop = main.scrollHeight;
                            requestAnimationFrame(() => input.focus());

                            function settle() { _pendingReadlineReject = null; }

                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = input.value;
                                    if (!mask) {
                                        const echo = document.createElement('span');
                                        echo.textContent = val;
                                        row.replaceChild(echo, input);
                                    } else {
                                        input.remove();
                                    }
                                    settle();
                                    resolve(val.trim());
                                } else if (e.key === 'c' && e.ctrlKey) {
                                    e.preventDefault();
                                    input.remove();
                                    shell.sigint(); // fires abort signal → auto-close + reject
                                }
                            });

                            abortSignal.addEventListener('abort', () => {
                                settle();
                                const err = new Error('Aborted');
                                err.name = 'AbortError';
                                reject(err);
                            }, { once: true });
                        });
                    },
                    setTop(content) { applyContent(topBar, content); },
                    setBottom(content) { applyContent(bottomBar, content); },
                    close() {
                        if (_pendingReadlineReject) {
                            const err = new Error('Aborted');
                            err.name = 'AbortError';
                            _pendingReadlineReject(err);
                            _pendingReadlineReject = null;
                        }
                        shell._ui.unmountOverlay(overlay);
                        shell._ui.setInputRowVisible(true);
                    },
                };

                abortSignal.addEventListener('abort', () => panel.close(), { once: true });

                return panel;
            },
            fetch(url, options = {}) {
                if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
                    return Promise.reject(new Error('fetch: not supported in this environment'));
                }
                return window.fetch(url, { ...options, signal: abortSignal });
            },
            abort: abortSignal,
            sleep(ms) {
                return new Promise((resolve, reject) => {
                    const t = setTimeout(resolve, ms);
                    abortSignal.addEventListener('abort', () => {
                        clearTimeout(t);
                        const err = new Error('Aborted');
                        err.name = 'AbortError';
                        reject(err);
                    }, { once: true });
                });
            },
        };
    }
}

export { Shell };
