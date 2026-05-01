import { parse } from './parser.js';
import { HistoryManager } from './history.js';
import registry from './commands/index.js';
import { VFS } from './vfs/vfs.js';

const MOTD = [
    'Welcome to Firelin OS 1.0.0 LTS (Phosphor)',
    '',
    "Type 'help' to list available commands.",
    "Type 'ls /projects' to see what's been built.",
    '',
];

class Shell {
    constructor() {
        this._ui = null;
        this.history = new HistoryManager();
        this.vfs = new VFS();
        this._running = false;
        this._currentAbort = null;
        this._readline = null;
        this.session = {
            user: 'guest',
            cwd: '/home/guest',
            hostname: 'firelin',
            env: new Map([
                ['HOME',  '/home/guest'],
                ['PATH',  '/bin:/usr/bin'],
                ['USER',  'guest'],
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
        for (let i = 0; i < MOTD.length; i++) {
            await new Promise(r => setTimeout(r, i * 90));
            this._ui.printBoot(MOTD[i]);
        }
        this._ui.setPrompt(this.prompt);
    }

    async submit(input) {
        // Readline mode: a command is waiting for interactive input
        if (this._readline) {
            const { resolve, mask } = this._readline;
            this._readline = null;
            this._ui.setMaskMode(false);
            this._ui.setInput('');
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
            error(text)      { shell._ui.error(text); },
            clear()          { shell._ui.clear(); },
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
            vfs: shell.vfs,
            readline(prompt, mask = false) {
                return new Promise(resolve => {
                    shell._readline = { resolve, mask };
                    shell._ui.setPrompt(prompt);
                    shell._ui.setMaskMode(mask);
                    shell._ui.setInput('');
                    shell._ui.setInputLocked(false);
                });
            },
            createBlock()               { return shell._ui.createBlock(); },
            setInputRowVisible(visible) { shell._ui.setInputRowVisible(visible); },
            mountOverlay(el)            { shell._ui.mountOverlay(el); },
            unmountOverlay(el)          { shell._ui.unmountOverlay(el); },
            injectStyle(id, css)        { shell._ui.injectStyle(id, css); },
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
