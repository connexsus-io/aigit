import fs from 'fs';
import path from 'path';

export const AIGIT_RULES_START = '<!-- AIGIT:START -->';
export const AIGIT_RULES_END = '<!-- AIGIT:END -->';

export type ManagedAgentsBlockStatus = 'missing' | 'absent' | 'current' | 'stale';
export type ManagedAgentsBlockAction = 'created' | 'inserted' | 'updated' | 'current';

export interface ManagedAgentsBlockState {
    status: ManagedAgentsBlockStatus;
    filePath: string;
}

export interface ManagedAgentsBlockInstallResult {
    action: ManagedAgentsBlockAction;
    filePath: string;
}

export function renderManagedAgentsBlock(): string {
    return `${AIGIT_RULES_START}
## Aigit Memory Workflow

1. At session start, run \`aigit load\` then \`aigit hydrate\`.
2. For complex work, create or use \`.aigit/tasks/<slug>.md\`.
3. Save durable reasoning with \`aigit commit memory "..."\`.
4. Before commit, run \`aigit repair ledger\` and \`npm run check:ledger\` when available.
5. Use \`aigit hydrate --full-rules\` only for setup/debugging.
6. Do not manually edit or delete \`.aigit/ledger.json\`.
${AIGIT_RULES_END}`;
}

function agentsPath(workspacePath: string): string {
    return path.join(workspacePath, 'AGENTS.md');
}

function findManagedBlock(content: string): { start: number; end: number } | null {
    const start = content.indexOf(AIGIT_RULES_START);
    const endMarkerStart = content.indexOf(AIGIT_RULES_END);
    if (start === -1 || endMarkerStart === -1 || endMarkerStart < start) return null;
    return { start, end: endMarkerStart + AIGIT_RULES_END.length };
}

export function getManagedAgentsBlockStatus(workspacePath: string): ManagedAgentsBlockState {
    const filePath = agentsPath(workspacePath);
    if (!fs.existsSync(filePath)) return { status: 'missing', filePath };

    const content = fs.readFileSync(filePath, 'utf8');
    const block = findManagedBlock(content);
    if (!block) return { status: 'absent', filePath };

    const existing = content.slice(block.start, block.end).trim();
    const expected = renderManagedAgentsBlock().trim();
    return { status: existing === expected ? 'current' : 'stale', filePath };
}

export function installManagedAgentsBlock(workspacePath: string): ManagedAgentsBlockInstallResult {
    const filePath = agentsPath(workspacePath);
    const expected = renderManagedAgentsBlock();

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, expected + '\n', 'utf8');
        return { action: 'created', filePath };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const block = findManagedBlock(content);
    if (!block) {
        const prefix = content.trimEnd();
        const updated = prefix.length > 0 ? `${prefix}\n\n${expected}\n` : `${expected}\n`;
        fs.writeFileSync(filePath, updated, 'utf8');
        return { action: 'inserted', filePath };
    }

    const existing = content.slice(block.start, block.end).trim();
    if (existing === expected.trim()) {
        return { action: 'current', filePath };
    }

    const updated = content.slice(0, block.start) + expected + content.slice(block.end);
    fs.writeFileSync(filePath, updated, 'utf8');
    return { action: 'updated', filePath };
}
