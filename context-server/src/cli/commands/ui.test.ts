import { createServer } from 'http';
import type { AddressInfo } from 'net';
import type { Express } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUiApp } from './ui';
import { prisma } from '../../db';

vi.mock('../../db', () => ({
    prisma: {
        memory: {
            count: vi.fn(),
            groupBy: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn(),
        },
        decision: {
            count: vi.fn(),
            groupBy: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        task: {
            count: vi.fn(),
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        $executeRawUnsafe: vi.fn(),
    }
}));

vi.mock('../git', () => ({
    getActiveBranch: vi.fn(() => 'main')
}));

vi.mock('../../rag/search', () => ({
    semanticSearch: vi.fn(() => Promise.resolve([]))
}));

vi.mock('../../diagnostics/depGraph', () => ({
    buildDependencyGraph: vi.fn(() => Promise.resolve({ nodes: [], totalFiles: 0, totalLinks: 0, mermaid: 'flowchart LR\n' }))
}));

interface TestResponse {
    status: number;
    body: string;
    headers: Record<string, string | string[] | undefined>;
}

async function requestApp(app: Express, options: {
    path: string;
    method?: string;
    token?: string;
    origin?: string;
    body?: unknown;
}): Promise<TestResponse> {
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;

    try {
        const response = await fetch(`http://127.0.0.1:${address.port}${options.path}`, {
            method: options.method ?? 'GET',
            headers: {
                ...(options.origin ? { Origin: options.origin } : {}),
                ...(options.token ? { 'X-Aigit-Ui-Token': options.token } : {}),
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        return {
            status: response.status,
            body: await response.text(),
            headers: Object.fromEntries(response.headers.entries()),
        };
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
}

describe('createUiApp', () => {
    const uiToken = 'test-token';
    const uiOrigin = 'http://127.0.0.1:5173';
    const validId = '123e4567-e89b-12d3-a456-426614174000';

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.memory.count).mockResolvedValue(1);
        vi.mocked(prisma.decision.count).mockResolvedValue(2);
        vi.mocked(prisma.task.count).mockResolvedValue(3);
        vi.mocked(prisma.memory.groupBy).mockResolvedValue([]);
        vi.mocked(prisma.decision.groupBy).mockResolvedValue([]);
        vi.mocked(prisma.memory.deleteMany).mockResolvedValue({ count: 0 } as never);
        vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    });

    it('rejects missing and wrong UI tokens on API routes', async () => {
        const app = createUiApp({ workspacePath: '/repo', currentBranch: 'main', uiOrigin, uiToken });

        const missing = await requestApp(app, { path: '/api/stats', origin: uiOrigin });
        const wrong = await requestApp(app, { path: '/api/stats', origin: uiOrigin, token: 'wrong-token' });
        const missingResolve = await requestApp(app, {
            path: '/api/resolve',
            method: 'POST',
            origin: uiOrigin,
            body: { type: 'memory', id: validId, action: 'discard' },
        });
        const missingGc = await requestApp(app, {
            path: '/api/gc',
            method: 'POST',
            origin: uiOrigin,
        });

        expect(missing.status).toBe(401);
        expect(wrong.status).toBe(401);
        expect(missingResolve.status).toBe(401);
        expect(missingGc.status).toBe(401);
        expect(prisma.memory.count).not.toHaveBeenCalled();
        expect(prisma.memory.delete).not.toHaveBeenCalled();
        expect(prisma.memory.deleteMany).not.toHaveBeenCalled();
    });

    it('allows normal dashboard API requests with the correct UI token and exact UI origin', async () => {
        const app = createUiApp({ workspacePath: '/repo', currentBranch: 'main', uiOrigin, uiToken });

        const stats = await requestApp(app, { path: '/api/stats', origin: uiOrigin, token: uiToken });
        const resolve = await requestApp(app, {
            path: '/api/resolve',
            method: 'POST',
            origin: uiOrigin,
            token: uiToken,
            body: { type: 'memory', id: validId, action: 'discard' },
        });
        const gc = await requestApp(app, {
            path: '/api/gc',
            method: 'POST',
            origin: uiOrigin,
            token: uiToken,
        });

        expect(stats.status).toBe(200);
        expect(stats.headers['access-control-allow-origin']).toBe(uiOrigin);
        expect(JSON.parse(stats.body)).toMatchObject({
            totalMemories: 1,
            totalDecisions: 2,
            totalTasks: 3,
        });
        expect(resolve.status).toBe(200);
        expect(gc.status).toBe(200);
        expect(prisma.memory.delete).toHaveBeenCalledWith({ where: { id: validId } });
        expect(prisma.memory.deleteMany).toHaveBeenCalled();
    });

    it('rejects invalid resolve payloads without mutating context', async () => {
        const app = createUiApp({ workspacePath: '/repo', currentBranch: 'main', uiOrigin, uiToken });

        const response = await requestApp(app, {
            path: '/api/resolve',
            method: 'POST',
            origin: uiOrigin,
            token: uiToken,
            body: {
                type: 'decision',
                id: 'not-a-uuid',
                action: 'synthesize',
                content: 'should not write',
            },
        });

        expect(response.status).toBe(400);
        expect(prisma.memory.update).not.toHaveBeenCalled();
        expect(prisma.memory.delete).not.toHaveBeenCalled();
        expect(prisma.decision.update).not.toHaveBeenCalled();
        expect(prisma.decision.delete).not.toHaveBeenCalled();
    });
});
