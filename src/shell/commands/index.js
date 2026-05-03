import clear   from './clear.js';
import help    from './help.js';
import print   from './print.js';
import whoami  from './whoami.js';
import pwd     from './pwd.js';
import ls      from './ls.js';
import cd      from './cd.js';
import cat     from './cat.js';
import tail    from './tail.js';
import touch   from './touch.js';
import mkdir   from './mkdir.js';
import rm      from './rm.js';
import cp      from './cp.js';
import mv      from './mv.js';
import find    from './find.js';
import grep    from './grep.js';
import su      from './su.js';
import ping    from './ping.js';
import curl    from './curl.js';
import top     from './top.js';
import nano    from './nano.js';
import theme   from './theme.js';
import man     from './man.js';
import apt     from './apt.js';

const ALL_COMMANDS = [
    clear, help, print,
    whoami, pwd, ls, cd,
    cat, tail,
    touch, mkdir, rm, cp, mv,
    find, grep,
    su, ping, curl, top, nano, theme, man,
    apt,
];

const registry = new Map();

ALL_COMMANDS.forEach(cmd => {
    registry.set(cmd.name, cmd);
    (cmd.aliases || []).forEach(alias => registry.set(alias, cmd));
});

// Inject registry into help/man for introspection without circular import
help._registry = registry;
man._registry  = registry;

export default registry;
