import { beforeEach, describe, expect, it, vi } from 'vitest';
import doctorHandler from './doctor';
import { buildDoctorReport } from '../../diagnostics/doctor';

vi.mock('../../diagnostics/doctor', () => ({
    buildDoctorReport: vi.fn(),
}));

describe('doctor command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(buildDoctorReport).mockResolvedValue({
            workspacePath: '/repo',
            currentBranch: 'main',
            status: 'needs_attention',
            summary: { ok: 2, warnings: 1, errors: 0 },
            fixesApplied: [],
            checks: {
                aigit: { dirExists: true, tasksDirExists: true, memoryDbExists: true },
                ledger: { exists: true, parseable: true, nullEmbeddings: 1, noisyMemories: 0, taskDrift: 0 },
                hooks: { installed: ['pre-commit'], missing: ['post-checkout'] },
                agents: { detected: ['Cursor'], mcpHint: 'Configure MCP with `aigit mcp /repo`.' },
                agentsRules: { status: 'current' },
                skills: { present: ['aigit-context-start'], missing: ['aigit-memory-capture'] },
            },
            issues: [{ severity: 'warning', message: 'One default Aigit skill is missing.' }],
        } as never);
    });

    it('prints stable JSON when --json is requested', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await doctorHandler({ args: ['--json'], workspacePath: '/repo', command: 'doctor' });

        const printed = JSON.parse(String(consoleSpy.mock.calls[0][0]));
        expect(printed.status).toBe('needs_attention');
        expect(printed.checks.ledger.nullEmbeddings).toBe(1);
        expect(buildDoctorReport).toHaveBeenCalledWith('/repo', { fix: false });
        consoleSpy.mockRestore();
    });

    it('passes --fix through to the diagnostic layer', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await doctorHandler({ args: ['--fix'], workspacePath: '/repo', command: 'doctor' });

        expect(buildDoctorReport).toHaveBeenCalledWith('/repo', { fix: true });
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[aigit doctor]'));
        consoleSpy.mockRestore();
    });
});
