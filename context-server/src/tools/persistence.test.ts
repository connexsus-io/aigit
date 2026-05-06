import { describe, it, expect, vi, beforeEach } from 'vitest';
import { persistWorkspaceLedger } from './persistence';
import { dumpContextLedger } from '../cli/sync';

vi.mock('../cli/sync', () => ({
    dumpContextLedger: vi.fn(),
}));

describe('persistWorkspaceLedger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('dumps the ledger without disconnecting the long-running MCP Prisma client', async () => {
        await persistWorkspaceLedger('/repo');

        expect(dumpContextLedger).toHaveBeenCalledWith('/repo', { disconnect: false });
    });

    it('skips persistence when no workspace path is available', async () => {
        await persistWorkspaceLedger(undefined);

        expect(dumpContextLedger).not.toHaveBeenCalled();
    });
});
