import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => new Map<string, (request: any) => Promise<any>>());
const mockPersistWorkspaceLedger = vi.hoisted(() => vi.fn());
const mockCreateTaskPlanFile = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
    memory: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        createMany: vi.fn(),
    },
    decision: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
    },
    task: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        createMany: vi.fn(),
    },
    project: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
    },
    $executeRaw: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: class MockServer {
        setRequestHandler = vi.fn((schema: string, handler: (request: any) => Promise<any>) => {
            handlers.set(schema, handler);
        });
        connect = vi.fn();
    },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
    StdioServerTransport: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
    CallToolRequestSchema: 'call-tool',
    ListToolsRequestSchema: 'list-tools',
    ErrorCode: { MethodNotFound: 'MethodNotFound' },
    McpError: class McpError extends Error {
        code: string;
        constructor(code: string, message: string) {
            super(message);
            this.code = code;
        }
    },
}));

vi.mock('./db', () => ({
    prisma: mockPrisma,
    initializeDatabase: vi.fn(),
    findWorkspaceRoot: vi.fn(() => '/repo'),
}));

vi.mock('./cli/git', () => ({
    getActiveBranch: vi.fn(() => 'main'),
}));

vi.mock('./rag/embeddings', () => ({
    embedText: vi.fn(async () => [0.1, 0.2, 0.3]),
}));

vi.mock('./tools/persistence', () => ({
    persistWorkspaceLedger: mockPersistWorkspaceLedger,
}));

vi.mock('./cli/taskFiles', () => ({
    createTaskPlanFile: mockCreateTaskPlanFile,
}));

vi.mock('./tools/symbolUtils', () => ({
    resolveSymbolContext: vi.fn(() => ({ symName: null, symType: null, symRange: null })),
}));

describe('MCP context write durability', () => {
    beforeAll(async () => {
        await import('./index');
    });

    beforeEach(async () => {
        vi.clearAllMocks();
        mockPrisma.memory.create.mockResolvedValue({ id: 'memory-1' });
        mockPrisma.decision.create.mockResolvedValue({ id: 'decision-1' });
        mockPrisma.task.create.mockResolvedValue({ id: 'task-1', slug: 'memory-fidelity' });
        mockPrisma.memory.findUnique.mockResolvedValue({ id: 'memory-1' });
        mockPrisma.memory.findMany.mockResolvedValue([]);
        mockPrisma.decision.findMany.mockResolvedValue([]);
        mockPrisma.task.findMany.mockResolvedValue([]);
    });

    async function callTool(name: string, args: Record<string, unknown>) {
        const handler = handlers.get('call-tool');
        if (!handler) throw new Error('MCP call handler was not registered');
        return handler({ params: { name, arguments: args } });
    }

    it('persists the ledger after commit_memory writes semantic context', async () => {
        await callTool('commit_memory', {
            projectId: '123e4567-e89b-42d3-a456-426614174000',
            workspacePath: '/repo',
            type: 'architecture',
            content: 'Persist semantic memory into the Git ledger.',
        });

        expect(mockPersistWorkspaceLedger).toHaveBeenCalledWith('/repo');
    });

    it('persists the ledger after commit_decision writes semantic context', async () => {
        await callTool('commit_decision', {
            taskId: '123e4567-e89b-42d3-a456-426614174000',
            workspacePath: '/repo',
            context: 'How should MCP writes persist?',
            chosen: 'Dump the ledger',
            rejected: [],
            reasoning: 'Git durability requires a serialized ledger.',
        });

        expect(mockPersistWorkspaceLedger).toHaveBeenCalledWith('/repo');
    });

    it('creates a task plan file and persists the ledger after commit_task', async () => {
        await callTool('commit_task', {
            projectId: '123e4567-e89b-42d3-a456-426614174000',
            workspacePath: '/repo',
            slug: 'memory-fidelity',
            title: 'Memory Fidelity',
        });

        expect(mockCreateTaskPlanFile).toHaveBeenCalledWith('/repo', {
            id: 'task-1',
            title: 'Memory Fidelity',
            slug: 'memory-fidelity',
            gitBranch: 'main',
            status: 'PLANNING',
        });
        expect(mockPersistWorkspaceLedger).toHaveBeenCalledWith('/repo');
    });

    it('persists the ledger after revert_context deletes an entry', async () => {
        await callTool('revert_context', {
            id: 'memory-1',
            workspacePath: '/repo',
        });

        expect(mockPrisma.memory.delete).toHaveBeenCalledWith({ where: { id: 'memory-1' } });
        expect(mockPersistWorkspaceLedger).toHaveBeenCalledWith('/repo');
    });

    it('persists the ledger after merge_context copies branch context', async () => {
        await callTool('merge_context', {
            projectId: '123e4567-e89b-42d3-a456-426614174000',
            sourceBranch: 'feature/context',
            targetBranch: 'main',
            workspacePath: '/repo',
        });

        expect(mockPersistWorkspaceLedger).toHaveBeenCalledWith('/repo');
    });
});
