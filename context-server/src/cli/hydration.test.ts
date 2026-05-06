import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compileHydratedContext } from './hydration';
import { prisma } from '../db';
import { detectAgents } from '../agents/registry';

vi.mock('../db', () => ({
    prisma: {
        memory: { findMany: vi.fn() },
        decision: { findMany: vi.fn() },
    },
}));

vi.mock('./git', () => ({
    getActiveBranch: vi.fn(() => 'feature/memory'),
    getChangedFiles: vi.fn(() => ['context-server/src/cli/hydration.ts']),
}));

vi.mock('./environment', () => ({
    detectProjectType: vi.fn(() => 'node'),
}));

vi.mock('../agents/registry', () => ({
    detectAgents: vi.fn(),
}));

describe('compileHydratedContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(detectAgents).mockReturnValue([{
            tool: {
                id: 'cursor',
                name: 'Cursor',
                rulesFiles: ['.cursorrules'],
                memoryFiles: ['.cursorrules'],
                skillsDir: null,
                configDir: null,
            },
            foundFiles: ['.cursorrules'],
            rulesContent: [{ file: '.cursorrules', content: 'FULL RULE CONTENT SHOULD NOT LEAK' }],
        }]);
        vi.mocked(prisma.memory.findMany).mockResolvedValue([{
            id: 'memory-1',
            type: 'architecture',
            content: 'Use selective hydration by default.',
            filePath: null,
            lineNumber: null,
            symbolName: null,
        }] as never);
        vi.mocked(prisma.decision.findMany).mockResolvedValue([] as never);
    });

    it('omits full AI tool rule contents by default and includes branch context memories', async () => {
        const context = await compileHydratedContext('/repo');

        expect(context).toContain('Detected AI Tools');
        expect(context).toContain('Cursor');
        expect(context).not.toContain('FULL RULE CONTENT SHOULD NOT LEAK');
        expect(context).toContain('Use selective hydration by default.');
    });

    it('includes full AI tool rule contents only when explicitly requested', async () => {
        const context = await compileHydratedContext('/repo', undefined, { fullRules: true });

        expect(context).toContain('FULL RULE CONTENT SHOULD NOT LEAK');
    });
});
