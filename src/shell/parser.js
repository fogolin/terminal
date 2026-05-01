function tokenize(input) {
    const tokens = [];
    let i = 0;

    while (i < input.length) {
        while (i < input.length && /\s/.test(input[i])) i++;
        if (i >= input.length) break;

        const ch = input[i];
        if (ch === '"' || ch === "'") {
            const quote = ch;
            const rawStart = i;
            i++;
            let str = '';
            while (i < input.length && input[i] !== quote) {
                if (input[i] === '\\' && i + 1 < input.length) {
                    i++;
                    str += input[i];
                } else {
                    str += input[i];
                }
                i++;
            }
            i++; // closing quote
            tokens.push({ type: 'string', value: str, raw: input.slice(rawStart, i) });
        } else {
            const start = i;
            while (i < input.length && !/\s/.test(input[i])) i++;
            const word = input.slice(start, i);
            tokens.push({ type: 'word', value: word, raw: word });
        }
    }

    return tokens;
}

function parse(input, registry = new Map()) {
    const tokens = tokenize(input);
    const result = {
        raw: input,
        command: '',
        flags: new Set(),
        options: new Map(),
        positional: [],
        rest: null,
    };

    if (tokens.length === 0) return result;

    result.command = tokens[0].value.toLowerCase();

    const cmdModule = registry.get(result.command);
    const valueFlagSet = new Set();
    if (cmdModule) {
        for (const opt of (cmdModule.options || [])) {
            if (opt.takesValue) {
                if (opt.flag) valueFlagSet.add(opt.flag);
                if (opt.long) valueFlagSet.add(opt.long);
            }
        }
    }

    let restMode = false;
    let i = 1;

    while (i < tokens.length) {
        const tok = tokens[i];

        if (restMode) {
            result.rest = result.rest !== null ? result.rest + ' ' + tok.value : tok.value;
            i++;
            continue;
        }

        if (tok.type === 'string') {
            result.positional.push(tok.value);
            i++;
            continue;
        }

        if (tok.value === '--') {
            restMode = true;
            i++;
            continue;
        }

        if (tok.value.startsWith('--')) {
            const flag = tok.value;
            if (valueFlagSet.has(flag) && i + 1 < tokens.length) {
                result.options.set(flag, tokens[i + 1].value);
                i += 2;
            } else {
                result.flags.add(flag);
                i++;
            }
        } else if (tok.value.startsWith('-') && tok.value.length > 1) {
            const chars = tok.value.slice(1);
            for (let j = 0; j < chars.length; j++) {
                const flag = '-' + chars[j];
                if (valueFlagSet.has(flag) && j === chars.length - 1 && i + 1 < tokens.length) {
                    result.options.set(flag, tokens[i + 1].value);
                    i++;
                    break;
                } else {
                    result.flags.add(flag);
                }
            }
            i++;
        } else {
            result.positional.push(tok.value);
            i++;
        }
    }

    return result;
}

export { tokenize, parse };
