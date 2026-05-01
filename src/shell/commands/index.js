import clear from './clear.js';
import help  from './help.js';
import print from './print.js';

const ALL_COMMANDS = [clear, help, print];

const registry = new Map();

ALL_COMMANDS.forEach(cmd => {
    registry.set(cmd.name, cmd);
    (cmd.aliases || []).forEach(alias => registry.set(alias, cmd));
});

// Inject registry into help so it can introspect without circular import
help._registry = registry;

export default registry;
