import nanoTemplate from '../../templates/overlay.html';

export default {
    name: 'nano',
    aliases: [],
    synopsis: 'nano [FILE]',
    description: 'Simple in-terminal text editor. Ctrl+S to save, Ctrl+X to exit.',
    options: [],
    examples: [
        { command: 'nano notes.txt', description: 'Edit (or create) notes.txt.' },
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
            }
        }

        await new Promise(resolve => {
            const overlay = ctx.createOverlay();
            overlay.setAttribute('role', 'dialog');

            const template = document.createElement('template');
            template.innerHTML = nanoTemplate;
            const fragment = template.content.cloneNode(true);
            const header = fragment.querySelector('.nano-header');
            const textarea = fragment.querySelector('textarea');
            const statusbar = fragment.querySelector('.nano-statusbar');

            header.textContent = `GNU nano 7.2  ${path || '[New File]'}`;
            textarea.value = content;

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
                    if (!path) { setStatus('No filename — pass path as argument: nano myfile.txt'); return; }
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

            overlay.appendChild(fragment);

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
