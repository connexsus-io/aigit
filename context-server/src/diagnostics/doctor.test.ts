import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildDoctorReport } from './doctor';

vi.mock('../cli/git', () => ({
    getActiveBranch: vi.fn(() => 'detached:abc1234'),
}));

describe('buildDoctorReport', () => {
    let workspacePath: string;

    beforeEach(() => {
        workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigit-doctor-'));
    });

    afterEach(() => {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    });

    it('reports missing adoption assets and ledger health issues', async () => {
        fs.mkdirSync(path.join(workspacePath, '.aigit', 'tasks'), { recursive: true });
        fs.writeFileSync(path.join(workspacePath, '.aigit', 'memory.db'), '', 'utf8');
        fs.writeFileSync(path.join(workspacePath, 'AGENTS.md'), '# Existing\n', 'utf8');
        fs.writeFileSync(path.join(workspacePath, '.aigit', 'ledger.json'), JSON.stringify({
            projects: [],
            tasks: [{
                slug: 'sample-task',
                status: 'DONE',
            }],
            memories: [{
                id: 'memory-1',
                content: 'Automatic Git Commit Context\nFiles Changed:\nM file.ts',
                embedding: null,
            }],
            decisions: [{
                id: 'decision-1',
                context: 'Decision?',
                chosen: 'Choice',
                embedding: null,
            }],
        }, null, 2), 'utf8');
        fs.writeFileSync(
            path.join(workspacePath, '.aigit', 'tasks', 'sample-task.md'),
            '# Sample\n\n> **Status**: PLANNING | **Branch**: main\n',
            'utf8'
        );

        const report = await buildDoctorReport(workspacePath, { fix: false });

        expect(report.currentBranch).toBe('detached:abc1234');
        expect(report.checks.agentsRules.status).toBe('absent');
        expect(report.checks.skills.missing).toContain('aigit-context-start');
        expect(report.checks.ledger.nullEmbeddings).toBe(2);
        expect(report.checks.ledger.noisyMemories).toBe(1);
        expect(report.checks.ledger.taskDrift).toBe(1);
        expect(report.status).toBe('needs_attention');
    });

    it('applies safe fixes without pruning noisy ledger entries', async () => {
        fs.mkdirSync(path.join(workspacePath, '.aigit'), { recursive: true });
        fs.writeFileSync(path.join(workspacePath, '.aigit', 'ledger.json'), JSON.stringify({
            projects: [],
            tasks: [],
            memories: [{
                id: 'memory-1',
                content: 'Automatic Git Commit Context\nFiles Changed:\nM file.ts',
                embedding: '[0.1]',
            }],
            decisions: [],
        }, null, 2), 'utf8');

        const report = await buildDoctorReport(workspacePath, { fix: true });
        const ledger = JSON.parse(fs.readFileSync(path.join(workspacePath, '.aigit', 'ledger.json'), 'utf8'));

        expect(report.fixesApplied).toContain('installed-managed-agents-block');
        expect(report.fixesApplied).toContain('created-default-aigit-skills');
        expect(report.fixesApplied).toContain('ensured-tasks-directory');
        expect(fs.existsSync(path.join(workspacePath, 'AGENTS.md'))).toBe(true);
        expect(fs.existsSync(path.join(workspacePath, '.aigit', 'skills', 'aigit-context-start', 'SKILL.md'))).toBe(true);
        expect(fs.existsSync(path.join(workspacePath, '.aigit', 'tasks'))).toBe(true);
        expect(ledger.memories).toHaveLength(1);
    });

    it('detects hooks when .git is a worktree pointer file', async () => {
        const gitDir = path.join(workspacePath, 'actual-git-dir');
        fs.mkdirSync(path.join(gitDir, 'hooks'), { recursive: true });
        fs.writeFileSync(path.join(workspacePath, '.git'), `gitdir: ${gitDir}\n`, 'utf8');
        const preCommitPath = path.join(gitDir, 'hooks', 'pre-commit');
        fs.writeFileSync(preCommitPath, '#!/bin/sh\nnpx --no-install aigit commit staged\nnpx --no-install aigit dump\n', 'utf8');
        fs.chmodSync(preCommitPath, 0o755);

        const report = await buildDoctorReport(workspacePath, { fix: false });

        expect(report.checks.hooks.installed).toContain('pre-commit');
        expect(report.checks.hooks.missing).toContain('post-checkout');
    });

    it('treats non-executable or unrelated hook files as missing', async () => {
        const hooksDir = path.join(workspacePath, '.git', 'hooks');
        fs.mkdirSync(hooksDir, { recursive: true });
        const preCommitPath = path.join(hooksDir, 'pre-commit');
        const postMergePath = path.join(hooksDir, 'post-merge');
        fs.writeFileSync(preCommitPath, '#!/bin/sh\nnpx --no-install aigit commit staged\nnpx --no-install aigit dump\n', 'utf8');
        fs.chmodSync(preCommitPath, 0o644);
        fs.writeFileSync(postMergePath, '#!/bin/sh\necho custom hook\n', 'utf8');
        fs.chmodSync(postMergePath, 0o755);

        const report = await buildDoctorReport(workspacePath, { fix: false });

        expect(report.checks.hooks.installed).not.toContain('pre-commit');
        expect(report.checks.hooks.installed).not.toContain('post-merge');
        expect(report.checks.hooks.missing).toEqual(expect.arrayContaining(['pre-commit', 'post-merge']));
    });
});
