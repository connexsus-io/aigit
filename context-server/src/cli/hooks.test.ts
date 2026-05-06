import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installGitHook } from './hooks';

describe('installGitHook', () => {
    let workspacePath: string;

    beforeEach(() => {
        workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigit-hooks-'));
        fs.mkdirSync(path.join(workspacePath, '.git', 'hooks'), { recursive: true });
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(workspacePath, { recursive: true, force: true });
    });

    it('installs memory fidelity hooks without self-healing pre-push automation', () => {
        installGitHook(workspacePath);

        const hooksDir = path.join(workspacePath, '.git', 'hooks');
        expect(fs.existsSync(path.join(hooksDir, 'post-checkout'))).toBe(true);
        expect(fs.existsSync(path.join(hooksDir, 'post-merge'))).toBe(true);
        expect(fs.existsSync(path.join(hooksDir, 'pre-commit'))).toBe(true);
        expect(fs.existsSync(path.join(hooksDir, 'pre-push'))).toBe(false);

        const preCommit = fs.readFileSync(path.join(hooksDir, 'pre-commit'), 'utf8');
        expect(preCommit).toContain('aigit commit staged');
        expect(preCommit).toContain('aigit dump');
        expect(preCommit).not.toContain('aigit heal');
    });
});
