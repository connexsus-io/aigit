import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import initHandler from './init';
import { installManagedAgentsBlock } from '../../agents/rules';
import { ensureDefaultAigitSkills } from '../../agents/defaultSkills';

vi.mock('../../db', () => ({
    initializeDatabase: vi.fn(),
    prisma: {
        project: {
            findFirst: vi.fn(async () => ({ id: 'project-1', name: 'repo' })),
            create: vi.fn(),
        },
    },
}));

vi.mock('../hooks', () => ({
    installGitHook: vi.fn(),
}));

vi.mock('../../agents/rules', () => ({
    installManagedAgentsBlock: vi.fn(() => ({ action: 'inserted', filePath: '/repo/AGENTS.md' })),
}));

vi.mock('../../agents/defaultSkills', () => ({
    ensureDefaultAigitSkills: vi.fn(() => ({ created: [{ name: 'aigit-context-start' }], existing: [] })),
}));

vi.mock('../output', () => ({
    spinner: vi.fn(() => ({
        succeed: vi.fn(),
        warn: vi.fn(),
    })),
    ok: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    c: {
        bold: (value: string) => value,
        muted: (value: string) => value,
        highlight: (value: string) => value,
        id: (value: string) => value,
        warn: (value: string) => value,
        info: (value: string) => value,
    },
}));

describe('init command adoption assets', () => {
    let workspacePath: string;

    beforeEach(() => {
        vi.clearAllMocks();
        workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigit-init-'));
        fs.writeFileSync(path.join(workspacePath, 'package.json'), JSON.stringify({ name: 'repo' }), 'utf8');
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(workspacePath, { recursive: true, force: true });
    });

    it('installs the managed AGENTS block and default Aigit skills', async () => {
        await initHandler({ args: [], workspacePath, command: 'init' });

        expect(installManagedAgentsBlock).toHaveBeenCalledWith(workspacePath);
        expect(ensureDefaultAigitSkills).toHaveBeenCalledWith(workspacePath);
    });
});
