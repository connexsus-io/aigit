export interface AdvancedCommandInfo {
    name: string;
    usage: string;
    description: string;
}

export const ADVANCED_COMMANDS: AdvancedCommandInfo[] = [
    { name: 'sync', usage: 'aigit sync [--dry-run] [--skills]', description: 'Sync detected AI tool rules and skills.' },
    { name: 'scan', usage: 'aigit scan', description: 'Detect AI tool configuration files in the workspace.' },
    { name: 'conflicts', usage: 'aigit conflicts', description: 'Show unresolved rule sync conflicts.' },
    { name: 'merge', usage: 'aigit merge <source> [target]', description: 'Port context between branches.' },
    { name: 'anchor', usage: 'aigit anchor <file>', description: 'Re-anchor memories to code symbols after refactoring.' },
    { name: 'replay', usage: 'aigit replay <path>', description: 'Show a memory timeline for a file or module.' },
    { name: 'docs', usage: 'aigit docs [--out <path>]', description: 'Generate architecture docs from memory.' },
    { name: 'export-docs', usage: 'aigit export-docs', description: 'Alias for docs generation.' },
    { name: 'swarm', usage: 'aigit swarm [goal]', description: 'Create or manage multi-agent coordination sessions.' },
    { name: 'heal', usage: 'aigit heal [--auto]', description: 'Diagnose test failures and optionally apply fixes.' },
    { name: 'deps', usage: 'aigit deps [--auto]', description: 'Audit npm dependencies and optionally apply fixes.' },
    { name: 'bisect', usage: 'aigit bisect <query>', description: 'Search Git history for when context appeared.' },
    { name: 'stats', usage: 'aigit stats', description: 'Show project and agent activity statistics.' },
    { name: 'deps-graph', usage: 'aigit deps-graph', description: 'Generate a semantic dependency graph.' },
    { name: 'ci-report', usage: 'aigit ci-report', description: 'Generate CI context reports.' },
    { name: 'resolve', usage: 'aigit resolve', description: 'Resolve context imported from other branches.' },
    { name: 'gc', usage: 'aigit gc', description: 'Garbage collect old context entries.' },
    { name: 'ui', usage: 'aigit ui', description: 'Launch the local dashboard.' },
    { name: 'telemetry', usage: 'aigit telemetry <command>', description: 'Manage anonymous usage telemetry.' },
];

export function formatAdvancedHelp(): string {
    const lines = [
        'Advanced / experimental commands',
        '',
        'These commands remain available for compatibility, but they are secondary to the v1 memory workflow.',
        'Default workflow: init -> doctor -> load -> hydrate -> commit memory/task -> repair ledger.',
        '',
        'Commands:',
    ];

    for (const command of ADVANCED_COMMANDS) {
        lines.push(`  ${command.usage.padEnd(34)} ${command.description}`);
    }

    lines.push('');
    lines.push('Use `aigit --help` for the default memory-first command list.');
    return lines.join('\n');
}
