const BASE_PROCS = [
    { pid: 1, user: 'root', cmd: 'init', baseCpu: 0.0, baseMem: 0.1 },
    { pid: 2, user: 'root', cmd: 'kthreadd', baseCpu: 0.0, baseMem: 0.0 },
    { pid: 12, user: 'root', cmd: 'ksoftirqd/0', baseCpu: 0.0, baseMem: 0.0 },
    { pid: 88, user: 'root', cmd: 'sshd', baseCpu: 0.0, baseMem: 0.2 },
    { pid: 92, user: 'root', cmd: 'cron', baseCpu: 0.0, baseMem: 0.1 },
    { pid: 98, user: 'root', cmd: 'coffee-daemon', baseCpu: 0.1, baseMem: 0.3 },
    { pid: 101, user: 'guest', cmd: 'bash', baseCpu: 0.2, baseMem: 0.8 },
    { pid: 104, user: 'root', cmd: 'deploy-agent', baseCpu: 0.5, baseMem: 1.2 },
    { pid: 109, user: 'guest', cmd: 'strucit-worker', baseCpu: 2.1, baseMem: 3.4 },
    { pid: 114, user: 'root', cmd: 'log-rotated', baseCpu: 0.0, baseMem: 0.1 },
    { pid: 120, user: 'guest', cmd: 'webpack', baseCpu: 4.3, baseMem: 5.2 },
    { pid: 130, user: 'guest', cmd: 'node', baseCpu: 1.8, baseMem: 4.1 },
    { pid: 199, user: 'guest', cmd: 'top', baseCpu: 0.1, baseMem: 0.2 },
];

function drift(base, spread) {
    return Math.max(0, base + (Math.random() - 0.5) * spread).toFixed(1);
}

function fmtTime(d) {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function buildFrame() {
    const now = new Date();
    const procs = BASE_PROCS.map(p => ({
        pid: p.pid,
        user: p.user,
        cpu: drift(p.baseCpu, 0.8),
        mem: drift(p.baseMem, 0.4),
        cmd: p.cmd,
    }));
    procs.sort((a, b) => parseFloat(b.cpu) - parseFloat(a.cpu));

    const totalCpu = procs.reduce((s, p) => s + parseFloat(p.cpu), 0).toFixed(1);
    const idleCpu = Math.max(0, 100 - parseFloat(totalCpu)).toFixed(1);
    const usedMem = procs.reduce((s, p) => s + parseFloat(p.mem), 0).toFixed(0);

    const lines = [
        `top - ${fmtTime(now)} up 42 days, 3:14,  1 user,  load average: ${drift(0.42, 0.2)}, ${drift(0.38, 0.2)}, ${drift(0.41, 0.2)}`,
        `Tasks:  ${procs.length} total,   1 running,  ${procs.length - 1} sleeping`,
        `%Cpu(s):  ${String(totalCpu).padStart(5)} us,  0.0 sy,  0.0 ni, ${String(idleCpu).padStart(5)} id`,
        `MiB Mem:   8192.0 total,   ${(8192 - parseInt(usedMem, 10)).toFixed(1).padStart(6)} free,   ${usedMem.padStart(6)} used`,
        '',
        `  PID USER       %CPU %MEM  COMMAND`,
        ...procs.map(p =>
            `${String(p.pid).padStart(5)} ${p.user.padEnd(9)} ${String(p.cpu).padStart(5)} ${String(p.mem).padStart(4)}  ${p.cmd}`
        ),
    ];
    return lines.join('\n');
}

export default {
    name: 'top',
    aliases: [],
    synopsis: 'top',
    description: 'Display live process activity. Press Ctrl+C to exit.',
    options: [],
    examples: [{ command: 'top', description: 'Show live process table.' }],
    async execute(args, ctx) {
        const block = ctx.createBlock();
        block.update(buildFrame());

        await new Promise(resolve => {
            const timer = setInterval(() => {
                if (ctx.abort.aborted) { clearInterval(timer); resolve(); return; }
                block.update(buildFrame());
            }, 1000);

            ctx.abort.addEventListener('abort', () => {
                clearInterval(timer);
                block.remove();
                resolve();
            }, { once: true });
        });
    },
};
