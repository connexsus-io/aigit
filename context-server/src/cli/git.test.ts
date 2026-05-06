import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execFileSync } from 'child_process';
import { getActiveBranch } from './git';

vi.mock('child_process', () => ({
    execFileSync: vi.fn(),
    execSync: vi.fn(),
}));

const mockedExecFileSync = vi.mocked(execFileSync);

describe('getActiveBranch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns the named branch when HEAD is attached', () => {
        mockedExecFileSync.mockReturnValue('feature/memory-fidelity\n' as never);

        expect(getActiveBranch('/repo')).toBe('feature/memory-fidelity');
        expect(mockedExecFileSync).toHaveBeenCalledWith(
            'git',
            ['rev-parse', '--abbrev-ref', 'HEAD'],
            expect.objectContaining({ cwd: '/repo' })
        );
    });

    it('returns the exact matching branch when HEAD is detached but unambiguous', () => {
        mockedExecFileSync.mockImplementation((_cmd: string, args: readonly string[] = []) => {
            const key = args.join(' ');
            if (key === 'rev-parse --abbrev-ref HEAD') return 'HEAD\n' as never;
            if (key === 'branch --format=%(refname:short) --points-at HEAD') return 'release/1.1\n' as never;
            throw new Error(`unexpected git args: ${key}`);
        });

        expect(getActiveBranch('/repo')).toBe('release/1.1');
    });

    it('returns a detached short-sha label when detached branch matching is ambiguous', () => {
        mockedExecFileSync.mockImplementation((_cmd: string, args: readonly string[] = []) => {
            const key = args.join(' ');
            if (key === 'rev-parse --abbrev-ref HEAD') return 'HEAD\n' as never;
            if (key === 'branch --format=%(refname:short) --points-at HEAD') return 'main\nfeature/context\n' as never;
            if (key === 'rev-parse --short HEAD') return 'abc1234\n' as never;
            throw new Error(`unexpected git args: ${key}`);
        });

        expect(getActiveBranch('/repo')).toBe('detached:abc1234');
    });

    it('falls back to unknown when git cannot resolve repository state', () => {
        mockedExecFileSync.mockImplementation(() => {
            throw new Error('not a git repository');
        });

        expect(getActiveBranch('/repo')).toBe('unknown');
    });
});
