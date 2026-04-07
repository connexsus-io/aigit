import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildProjectStats } from './stats';
import { prisma } from '../../db';

vi.mock('../../db', () => ({
    prisma: {
        memory: {
            count: vi.fn(),
            findMany: vi.fn(),
            groupBy: vi.fn(),
        },
        decision: {
            count: vi.fn(),
            findMany: vi.fn(),
            groupBy: vi.fn(),
        },
        task: {
            count: vi.fn(),
            findMany: vi.fn(),
        },
        healingEvent: {
            count: vi.fn(),
        }
    }
}));

describe('buildProjectStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generates a formatted stats report', async () => {
        vi.mocked(prisma.memory.count).mockResolvedValue(10);
        vi.mocked(prisma.decision.count).mockResolvedValue(5);
        vi.mocked(prisma.task.count).mockResolvedValue(2);
        vi.mocked(prisma.healingEvent.count).mockResolvedValue(1);

        vi.mocked(prisma.memory.groupBy).mockImplementation(((args: any) => {
            if (args.by[0] === 'agentName') {
                return Promise.resolve([
                    { agentName: 'planner', _count: { id: 2 } },
                    { agentName: 'coder', _count: { id: 1 } }
                ]);
            }
            if (args.by[0] === 'gitBranch') {
                return Promise.resolve([{ gitBranch: 'main', _count: { id: 10 } }]);
            }
            return Promise.resolve([]);
        }) as any);

        vi.mocked(prisma.decision.groupBy).mockImplementation(((args: any) => {
            if (args.by[0] === 'agentName') {
                return Promise.resolve([
                    { agentName: 'planner', _count: { id: 1 } },
                    { agentName: 'coder', _count: { id: 1 } }
                ]);
            }
            if (args.by[0] === 'gitBranch') {
                return Promise.resolve([{ gitBranch: 'main', _count: { id: 5 } }]);
            }
            return Promise.resolve([]);
        }) as any);

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        vi.mocked(prisma.task.findMany).mockResolvedValue([
            { slug: 'test-task', title: 'Test Task', status: 'IN_PROGRESS', createdAt: yesterday, updatedAt: now, decisions: [{ id: '1' }] }
        ] as any);

        const result = await buildProjectStats(10);

        // Verification checks
        expect(result).toContain('Memories:       10');
        expect(result).toContain('Decisions:      5');
        expect(result).toContain('Tasks:          2');
        expect(result).toContain('Healing Events: 1');

        expect(result).toContain('planner');
        expect(result).toContain('coder');

        expect(result).toContain('test-task');
        expect(result).toContain('main');
    });

    it('handles empty database gracefully', async () => {
        vi.mocked(prisma.memory.count).mockResolvedValue(0);
        vi.mocked(prisma.decision.count).mockResolvedValue(0);
        vi.mocked(prisma.task.count).mockResolvedValue(0);
        vi.mocked(prisma.healingEvent.count).mockResolvedValue(0);

        vi.mocked(prisma.memory.groupBy).mockImplementation((() => Promise.resolve([])) as any);
        vi.mocked(prisma.decision.groupBy).mockImplementation((() => Promise.resolve([])) as any);
        vi.mocked(prisma.task.findMany).mockResolvedValue([]);

        const result = await buildProjectStats(10);

        expect(result).toContain('Memories:       0');
        expect(result).toContain('Decisions:      0');
        expect(result).not.toContain('Agent Contributions');
        expect(result).not.toContain('Task Velocity (Recent)');
        expect(result).not.toContain('Branch Distribution');
    });
});
