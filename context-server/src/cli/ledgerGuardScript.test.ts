import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, test } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'context-server/scripts/check-ledger-regression.mjs');

interface LedgerEntry {
    id: string;
    [key: string]: unknown;
}

interface LedgerSnapshot {
    projects: LedgerEntry[];
    tasks: LedgerEntry[];
    memories: LedgerEntry[];
}

function writeLedger(filePath: string, ledger: LedgerSnapshot) {
    fs.writeFileSync(filePath, JSON.stringify(ledger, null, 2), 'utf8');
}

function createLedger(ids: { projects: string[]; tasks: string[]; memories: string[] }): LedgerSnapshot {
    return {
        projects: ids.projects.map((id) => ({ id })),
        tasks: ids.tasks.map((id) => ({ id })),
        memories: ids.memories.map((id) => ({ id })),
    };
}

describe('ledger regression guard script', () => {
    test('allows additive ledger changes', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-guard-'));
        const basePath = path.join(tempDir, 'base.json');
        const headPath = path.join(tempDir, 'head.json');

        writeLedger(basePath, createLedger({
            projects: ['project-a'],
            tasks: ['task-a'],
            memories: ['memory-a'],
        }));
        writeLedger(headPath, createLedger({
            projects: ['project-a'],
            tasks: ['task-a'],
            memories: ['memory-a', 'memory-b'],
        }));

        const output = execFileSync(process.execPath, [
            scriptPath,
            '--base-file',
            basePath,
            '--head-file',
            headPath,
        ], { encoding: 'utf8' });

        expect(output).toContain('Ledger regression check passed');
    });

    test('rejects removed historical ledger records', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-guard-'));
        const basePath = path.join(tempDir, 'base.json');
        const headPath = path.join(tempDir, 'head.json');

        writeLedger(basePath, createLedger({
            projects: ['project-a'],
            tasks: ['task-a'],
            memories: ['memory-a', 'memory-b'],
        }));
        writeLedger(headPath, createLedger({
            projects: ['project-a'],
            tasks: ['task-a'],
            memories: ['memory-b'],
        }));

        const result = spawnSync(process.execPath, [
            scriptPath,
            '--base-file',
            basePath,
            '--head-file',
            headPath,
        ], { encoding: 'utf8' });

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('memories removed 1 historical id');
        expect(result.stderr).toContain('memory-a');
    });
});
