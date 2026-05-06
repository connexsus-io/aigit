import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { repairLedger } from './ledger';

vi.mock('../rag/embeddings', () => ({
    embedText: vi.fn(async () => [0.1, 0.2, 0.3]),
}));

describe('repairLedger', () => {
    let workspacePath: string;

    beforeEach(() => {
        workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigit-ledger-repair-'));
        fs.mkdirSync(path.join(workspacePath, '.aigit', 'tasks'), { recursive: true });
    });

    afterEach(() => {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    });

    function writeLedger() {
        fs.writeFileSync(path.join(workspacePath, '.aigit', 'ledger.json'), JSON.stringify({
            projects: [],
            agents: [],
            sessions: [],
            tasks: [{
                id: 'task-1',
                slug: 'memory-fidelity',
                projectId: 'project-1',
                title: 'Memory Fidelity',
                gitBranch: 'main',
                status: 'DONE',
                createdAt: '2026-03-11T21:48:05.315Z',
                updatedAt: '2026-03-11T21:53:37.195Z',
            }],
            decisions: [{
                id: 'decision-1',
                taskId: 'task-1',
                gitBranch: 'main',
                context: 'How should memory persist?',
                chosen: 'Ledger sync',
                rejected: [],
                reasoning: 'Git durability',
                embedding: null,
                createdAt: '2026-03-11T21:53:37.195Z',
            }],
            memories: [{
                id: 'memory-1',
                projectId: 'project-1',
                sessionId: null,
                gitBranch: 'main',
                type: 'architecture',
                content: 'Use a Git-tracked ledger for semantic memory.',
                embedding: null,
                createdAt: '2026-03-11T21:53:37.195Z',
            }, {
                id: 'memory-2',
                projectId: 'project-1',
                sessionId: null,
                gitBranch: 'main',
                type: 'capability',
                content: 'Automatic Git Commit Context (Staged Changes)\nFiles Changed:\nM\tfile.ts',
                embedding: null,
                createdAt: '2026-03-11T21:53:37.195Z',
            }],
            healingEvents: [],
        }, null, 2));

        fs.writeFileSync(
            path.join(workspacePath, '.aigit', 'tasks', 'memory-fidelity.md'),
            '# Memory Fidelity\n\n> **Status**: PLANNING | **Branch**: main | **ID**: task-1\n'
        );
    }

    it('backfills null embeddings and reports noisy memories and task status drift by default', async () => {
        writeLedger();

        const result = await repairLedger(workspacePath, {});
        const repaired = JSON.parse(fs.readFileSync(path.join(workspacePath, '.aigit', 'ledger.json'), 'utf8'));
        const taskFile = fs.readFileSync(path.join(workspacePath, '.aigit', 'tasks', 'memory-fidelity.md'), 'utf8');

        expect(result.memoriesBackfilled).toBe(2);
        expect(result.decisionsBackfilled).toBe(1);
        expect(result.noisyMemories).toBe(1);
        expect(result.prunedNoisyMemories).toBe(0);
        expect(result.staleTaskFiles).toEqual([{
            slug: 'memory-fidelity',
            ledgerStatus: 'DONE',
            fileStatus: 'PLANNING',
            filePath: path.join(workspacePath, '.aigit', 'tasks', 'memory-fidelity.md'),
        }]);
        expect(repaired.memories.every((memory: { embedding?: string }) => typeof memory.embedding === 'string')).toBe(true);
        expect(repaired.decisions[0].embedding).toBe('[0.1,0.2,0.3]');
        expect(taskFile).toContain('**Status**: PLANNING');
    });

    it('prunes noisy memories and fixes stale task status when flags are enabled', async () => {
        writeLedger();

        const result = await repairLedger(workspacePath, { pruneNoise: true, fixTaskFiles: true });
        const repaired = JSON.parse(fs.readFileSync(path.join(workspacePath, '.aigit', 'ledger.json'), 'utf8'));
        const taskFile = fs.readFileSync(path.join(workspacePath, '.aigit', 'tasks', 'memory-fidelity.md'), 'utf8');

        expect(result.prunedNoisyMemories).toBe(1);
        expect(result.taskFilesUpdated).toBe(1);
        expect(repaired.memories).toHaveLength(1);
        expect(repaired.memories[0].id).toBe('memory-1');
        expect(taskFile).toContain('**Status**: DONE');
    });
});
