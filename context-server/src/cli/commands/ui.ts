import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db';
import type { CommandHandler } from './types';
import chalk from 'chalk';
import path from 'path';
import { spawn } from 'child_process';
import { randomBytes, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { getActiveBranch } from '../git';
import { semanticSearch } from '../../rag/search';
import { buildDependencyGraph } from '../../diagnostics/depGraph';

const API_HOST = '127.0.0.1';
const API_PORT = 3001;
const UI_HOST = '127.0.0.1';
const UI_PORT = 5173;
const MAX_SYNTHESIS_LENGTH = 10_000;

const MemoryResolveBody = z.object({
    type: z.literal('memory'),
    id: z.string().uuid(),
    action: z.enum(['assimilate', 'discard', 'synthesize']),
    content: z.string().trim().min(1).max(MAX_SYNTHESIS_LENGTH).optional(),
}).superRefine((value, ctx) => {
    if (value.action === 'synthesize' && !value.content) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['content'],
            message: 'content is required when synthesizing memory context',
        });
    }
    if (value.action !== 'synthesize' && value.content !== undefined) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['content'],
            message: 'content is only supported for memory synthesis',
        });
    }
});

const DecisionResolveBody = z.object({
    type: z.literal('decision'),
    id: z.string().uuid(),
    action: z.enum(['assimilate', 'discard']),
}).strict();

const ResolveBody = z.union([MemoryResolveBody, DecisionResolveBody]);

export interface UiAppOptions {
    workspacePath: string;
    currentBranch: string;
    uiOrigin: string;
    uiToken: string;
}

function isMatchingToken(provided: string | undefined, expected: string): boolean {
    if (!provided || provided.length !== expected.length) return false;
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function createUiApp({ workspacePath, currentBranch, uiOrigin, uiToken }: UiAppOptions) {
    const app = express();

    app.use(express.json());

    // CORS is intentionally scoped to the one Vite instance spawned by `aigit ui`.
    app.use((req: Request, res: Response, next: NextFunction) => {
        const origin = req.headers.origin;
        if (origin === uiOrigin) {
            res.header('Access-Control-Allow-Origin', uiOrigin);
            res.header('Vary', 'Origin');
        }
        res.header('Access-Control-Allow-Headers', 'Content-Type, X-Aigit-Ui-Token');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
        next();
    });

    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
        if (!isMatchingToken(req.header('X-Aigit-Ui-Token'), uiToken)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    });

    // API: Get Project Stats
    app.get('/api/stats', async (req: Request, res: Response) => {
        try {
            const [memoryCount, decisionCount, taskCount, memAgents, decAgents] = await Promise.all([
                prisma.memory.count(),
                prisma.decision.count(),
                prisma.task.count(),
                // Agent breakdown
                prisma.memory.groupBy({
                    by: ['agentName'],
                    _count: { agentName: true }
                }),
                prisma.decision.groupBy({
                    by: ['agentName'],
                    _count: { agentName: true }
                })
            ]);

            res.json({
                totalMemories: memoryCount,
                totalDecisions: decisionCount,
                totalTasks: taskCount,
                memoryAgents: memAgents,
                decisionAgents: decAgents,
                currentBranch
            });
        } catch (error) {
            console.error('[aigit] Server Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // API: Get Conflicts
    app.get('/api/conflicts', async (req: Request, res: Response) => {
        try {
            const [memories, decisions] = await Promise.all([
                prisma.memory.findMany({
                    where: {
                        gitBranch: currentBranch,
                        originBranch: { not: null, notIn: [currentBranch] }
                    }
                }),
                prisma.decision.findMany({
                    where: {
                        gitBranch: currentBranch,
                        originBranch: { not: null, notIn: [currentBranch] }
                    }
                })
            ]);

            res.json({ memories, decisions });
        } catch (error) {
            console.error('[aigit] Server Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // API: Resolve Conflict
    app.post('/api/resolve', async (req: Request, res: Response) => {
        const parsed = ResolveBody.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        try {
            const { type, id, action } = parsed.data;
            // action: 'assimilate' | 'discard' | 'synthesize'

            if (type === 'memory') {
                if (action === 'assimilate') {
                    await prisma.memory.update({ where: { id }, data: { originBranch: currentBranch } });
                } else if (action === 'discard') {
                    await prisma.memory.delete({ where: { id } });
                } else if (action === 'synthesize') {
                    await prisma.memory.update({ where: { id }, data: { originBranch: currentBranch, content: parsed.data.content } });
                }
            } else if (type === 'decision') {
                if (action === 'assimilate') {
                    await prisma.decision.update({ where: { id }, data: { originBranch: currentBranch } });
                } else if (action === 'discard') {
                    await prisma.decision.delete({ where: { id } });
                }
            }
            res.json({ success: true });
        } catch (error) {
            console.error('[aigit] Server Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // API: Search Semantic Memories
    app.get('/api/search', async (req: Request, res: Response) => {
        try {
            const query = req.query.q as string;
            if (!query) {
                return res.json([]);
            }
            const results = await semanticSearch({ query, topK: 20 });
            res.json(results);
        } catch (error) {
            console.error('[aigit] Server Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // API: Dependency Architecture Graph
    app.get('/api/graph', async (req: Request, res: Response) => {
        try {
            const graph = await buildDependencyGraph(workspacePath);
            res.json(graph);
        } catch (error) {
            console.error('[aigit] Server Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // API: Garbage Collection
    app.post('/api/gc', async (req: Request, res: Response) => {
        try {
            const keepDays = 30;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - keepDays);
            
            const [deletedMemories, emptyTasks] = await Promise.all([
                prisma.memory.deleteMany({
                    where: { type: { in: ['capability', 'context'] }, createdAt: { lt: cutoffDate } }
                }),
                prisma.task.findMany({
                    where: { decisions: { none: {} }, status: { in: ['DONE', 'CANCELLED'] } }
                })
            ]);

            if (emptyTasks.length > 0) {
                await prisma.task.deleteMany({
                    where: { id: { in: emptyTasks.map((t: { id: string }) => t.id) } }
                });
            }

            try { await prisma.$executeRawUnsafe(`VACUUM ANALYZE;`); } catch { }
            
            res.json({ success: true, deleted: deletedMemories.count + emptyTasks.length });
        } catch (error) {
            console.error('[aigit] Server Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return app;
}

const handler: CommandHandler = async ({ workspacePath }) => {
    const currentBranch = getActiveBranch(workspacePath);
    const uiToken = randomBytes(32).toString('hex');
    const apiOrigin = `http://${API_HOST}:${API_PORT}`;
    const uiOrigin = `http://${UI_HOST}:${UI_PORT}`;
    const app = createUiApp({ workspacePath, currentBranch, uiOrigin, uiToken });

    app.listen(API_PORT, API_HOST, () => {
        console.log(chalk.cyan(`\\n🚀 Aigit API Server running on ${apiOrigin}`));
        
        // Start the Vite app
        const uiPath = path.resolve(__dirname, '../../../../context-ui');
        console.log(chalk.gray(`Starting UI from ${uiPath}...`));
        
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const vite = spawn(npmCmd, ['run', 'dev', '--', '--host', UI_HOST, '--port', String(UI_PORT)], {
            cwd: uiPath,
            env: {
                ...process.env,
                VITE_API_URL: apiOrigin,
                VITE_AIGIT_UI_TOKEN: uiToken,
            },
            stdio: 'inherit',
            shell: false
        });

        vite.on('error', (err) => {
            console.error(chalk.red(`Failed to start Vite UI: ${err.message}`));
        });
    });
    
    // Keep process alive indefinitely
    await new Promise(() => {});
};

export default handler;
