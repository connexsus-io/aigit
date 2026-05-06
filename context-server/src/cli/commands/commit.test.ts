import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import commitHandler from './commit';
import { prisma } from '../../db';

vi.mock('../../db', () => ({
    prisma: {
        project: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        task: {
            create: vi.fn(),
            findFirst: vi.fn(),
            updateMany: vi.fn(),
        },
        memory: {
            create: vi.fn(),
            findFirst: vi.fn(),
        },
        decision: {
            create: vi.fn(),
        },
        $executeRaw: vi.fn(),
    },
}));

vi.mock('../git', () => ({
    getActiveBranch: vi.fn(() => 'main'),
}));

vi.mock('../sync', () => ({
    dumpContextLedger: vi.fn(),
}));

vi.mock('../../rag/embeddings', () => ({
    embedText: vi.fn(async () => [0.1, 0.2, 0.3]),
}));

describe('commit command task file sync', () => {
    let workspacePath: string;

    beforeEach(() => {
        vi.clearAllMocks();
        workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigit-commit-task-'));
        fs.mkdirSync(path.join(workspacePath, '.aigit', 'tasks'), { recursive: true });
        vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: 'project-1', name: 'repo' } as never);
    });

    afterEach(() => {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    });

    it('updates task markdown status when the DB task status changes', async () => {
        fs.writeFileSync(
            path.join(workspacePath, '.aigit', 'tasks', 'memory-fidelity.md'),
            '# Memory Fidelity\n\n> **Status**: PLANNING | **Branch**: main | **ID**: task-1\n'
        );
        vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 } as never);

        await commitHandler({
            args: ['update', 'task', 'memory-fidelity', 'DONE'],
            workspacePath,
            command: 'commit',
        });

        expect(fs.readFileSync(path.join(workspacePath, '.aigit', 'tasks', 'memory-fidelity.md'), 'utf8'))
            .toContain('**Status**: DONE');
    });
});
