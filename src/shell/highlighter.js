import { tokenize } from './parser.js';

const CLS = {
    CMD_KNOWN:   'hl-cmd-known',
    CMD_UNKNOWN: 'hl-cmd-unknown',
    FLAG:        'hl-flag',
    STRING:      'hl-string',
    ARG:         'hl-arg',
};

function buildSpans(input, registry = new Map()) {
    if (!input) return [];

    const tokens = tokenize(input);
    const spans = [];
    let charPos = 0;
    let tokenIdx = 0;
    let restMode = false;

    while (charPos < input.length) {
        // capture whitespace between tokens
        const wsStart = charPos;
        while (charPos < input.length && /\s/.test(input[charPos])) charPos++;
        if (charPos > wsStart) {
            spans.push({ text: input.slice(wsStart, charPos), className: '' });
        }

        if (charPos >= input.length || tokenIdx >= tokens.length) break;

        const tok = tokens[tokenIdx++];
        let className;

        if (tokenIdx === 1) {
            className = registry.has(tok.value.toLowerCase()) ? CLS.CMD_KNOWN : CLS.CMD_UNKNOWN;
        } else if (restMode) {
            className = CLS.ARG;
        } else if (tok.type === 'string') {
            className = CLS.STRING;
        } else if (tok.value === '--') {
            className = CLS.FLAG;
            restMode = true;
        } else if (tok.value.startsWith('-') && tok.value.length > 1) {
            className = CLS.FLAG;
        } else {
            className = CLS.ARG;
        }

        spans.push({ text: tok.raw, className });
        charPos += tok.raw.length;
    }

    return spans;
}

function renderHighlighted(input, registry = new Map()) {
    const spans = buildSpans(input, registry);
    return spans.map(({ text, className }) => {
        const el = document.createElement('span');
        el.textContent = text;
        if (className) el.className = className;
        return el;
    });
}

export { buildSpans, renderHighlighted };
