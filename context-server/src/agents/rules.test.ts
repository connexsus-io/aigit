import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    AIGIT_RULES_END,
    AIGIT_RULES_START,
    getManagedAgentsBlockStatus,
    installManagedAgentsBlock,
    renderManagedAgentsBlock,
} from './rules';

describe('managed Aigit AGENTS block', () => {
    let workspacePath: string;

    beforeEach(() => {
        workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigit-agents-rules-'));
    });

    afterEach(() => {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    });

    it('creates AGENTS.md with the managed block when the file is missing', () => {
        const result = installManagedAgentsBlock(workspacePath);
        const content = fs.readFileSync(path.join(workspacePath, 'AGENTS.md'), 'utf8');

        expect(result.action).toBe('created');
        expect(content).toBe(renderManagedAgentsBlock() + '\n');
        expect(getManagedAgentsBlockStatus(workspacePath).status).toBe('current');
    });

    it('appends the managed block without rewriting existing custom content', () => {
        const agentsPath = path.join(workspacePath, 'AGENTS.md');
        const custom = '# Custom Rules\n\nKeep this policy.\n';
        fs.writeFileSync(agentsPath, custom, 'utf8');

        const result = installManagedAgentsBlock(workspacePath);
        const content = fs.readFileSync(agentsPath, 'utf8');

        expect(result.action).toBe('inserted');
        expect(content).toContain(custom.trim());
        expect(content).toContain(AIGIT_RULES_START);
        expect(content).toContain(AIGIT_RULES_END);
    });

    it('updates only the existing managed block when stale', () => {
        const agentsPath = path.join(workspacePath, 'AGENTS.md');
        fs.writeFileSync(
            agentsPath,
            `# Custom Rules\n\n${AIGIT_RULES_START}\nold managed content\n${AIGIT_RULES_END}\n\nAfter block\n`,
            'utf8'
        );

        const result = installManagedAgentsBlock(workspacePath);
        const content = fs.readFileSync(agentsPath, 'utf8');

        expect(result.action).toBe('updated');
        expect(content).toContain('# Custom Rules');
        expect(content).toContain('After block');
        expect(content).not.toContain('old managed content');
        expect(content).toContain('At session start, run `aigit load` then `aigit hydrate`.');
    });
});
