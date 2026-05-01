export default {
    name: 'nano',
    aliases: [],
    synopsis: 'nano [FILE]',
    description: 'Simple in-terminal text editor. Ctrl+S to save, Ctrl+X to exit.',
    options: [],
    examples: [
        { command: 'nano notes.txt',          description: 'Edit (or create) notes.txt.' },
        { command: 'nano /home/guest/readme.txt', description: 'Open absolute path.' },
    ],
    async execute(args, ctx) {
        const path = args.positional[0] || null;
        let content = '';

        if (path) {
            try {
                content = ctx.vfs.readFile(path, ctx.session);
            } catch (e) {
                if (e.code !== 'ENOENT') return ctx.error(`nano: ${e.message}`);
                // ENOENT → new file, content stays ''
            }
        }

        await new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = [
                'position:absolute', 'inset:0', 'display:flex', 'flex-direction:column',
                'background:var(--term-bg,#040805)', 'color:var(--term-text,#36ba2c)',
                'font-family:var(--term-font,monospace)', 'font-size:var(--term-font-size,13px)',
                'font-weight:var(--term-font-weight,600)', 'z-index:10',
            ].join(';');

            const header = document.createElement('div');
            header.style.cssText = 'padding:3px 10px;opacity:0.6;border-bottom:1px solid currentColor;flex-shrink:0';
            header.textContent = `GNU nano 7.2  ${path || '[New File]'}`;

            const textarea = document.createElement('textarea');
            textarea.style.cssText = [
                'flex:1', 'background:transparent', 'color:inherit', 'font:inherit',
                'border:none', 'outline:none', 'padding:8px 10px', 'resize:none',
                'caret-color:currentColor', 'line-height:1.6',
            ].join(';');
            textarea.value = content;
            textarea.spellcheck = false;

            const statusbar = document.createElement('div');
            statusbar.style.cssText = 'padding:3px 10px;opacity:0.6;border-top:1px solid currentColor;flex-shrink:0';
            statusbar.textContent = '^X Exit  ^S Save';

            let modified = false;

            function setStatus(msg) {
                statusbar.textContent = msg;
                setTimeout(() => { statusbar.textContent = '^X Exit  ^S Save'; }, 2000);
            }

            textarea.addEventListener('input', () => {
                if (!modified) {
                    modified = true;
                    header.textContent = `GNU nano 7.2  ${path || '[New File]'}  [Modified]`;
                }
            });

            textarea.addEventListener('keydown', e => {
                if (!e.ctrlKey) return;
                if (e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!path) { setStatus('No filename — provide path as argument: nano myfile.txt'); return; }
                    try {
                        ctx.vfs.writeFile(path, textarea.value, ctx.session);
                        modified = false;
                        header.textContent = `GNU nano 7.2  ${path}`;
                        setStatus(`Wrote ${textarea.value.length} bytes to ${path}`);
                    } catch (err) {
                        setStatus(`Error: ${err.message}`);
                    }
                } else if (e.key === 'x' || e.key === 'X') {
                    e.preventDefault();
                    e.stopPropagation();
                    ctx.unmountOverlay(overlay);
                    ctx.setInputRowVisible(true);
                    resolve();
                }
            });

            overlay.appendChild(header);
            overlay.appendChild(textarea);
            overlay.appendChild(statusbar);

            ctx.setInputRowVisible(false);
            ctx.mountOverlay(overlay);

            requestAnimationFrame(() => {
                textarea.focus();
                const len = textarea.value.length;
                textarea.setSelectionRange(len, len);
            });
        });
    },
};
