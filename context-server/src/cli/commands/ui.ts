import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db';
import type { CommandHandler } from './types';
import chalk from 'chalk';
import path from 'path';
import { spawn } from 'child_process';
import { getActiveBranch } from '../git';
import { semanticSearch } from '../../rag/search';
import { buildDependencyGraph } from '../../diagnostics/depGraph';
const handler: CommandHandler = async ({ workspacePath }) => {
    const app = express();
    const port = 3001;

    app.use(express.json());

    // CORS for local Vite dev server
    app.use((req: Request, res: Response, next: NextFunction) => {
        const origin = req.headers.origin;
        if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
            res.header('Access-Control-Allow-Origin', origin);
        }
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    const currentBranch = getActiveBranch(workspacePath);

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
        try {
            const { type, id, action, content } = req.body;
            // action: 'assimilate' | 'discard' | 'synthesize'

            if (type === 'memory') {
                if (action === 'assimilate') {
                    await prisma.memory.update({ where: { id }, data: { originBranch: currentBranch } });
                } else if (action === 'discard') {
                    await prisma.memory.delete({ where: { id } });
                } else if (action === 'synthesize' && content) {
                    await prisma.memory.update({ where: { id }, data: { originBranch: currentBranch, content } });
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
                    where: { id: { in: emptyTasks.map(t => t.id) } }
                });
            }

            try { await prisma.$executeRawUnsafe(`VACUUM ANALYZE;`); } catch(e) {}
            
            res.json({ success: true, deleted: deletedMemories.count + emptyTasks.length });
        } catch (error) {
            console.error('[aigit] Server Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.listen(port, () => {
        console.log(chalk.cyan(`\\n🚀 Aigit API Server running on http://localhost:${port}`));
        
        // Start the Vite app
        const uiPath = path.resolve(__dirname, '../../../../context-ui');
        console.log(chalk.gray(`Starting UI from ${uiPath}...`));
        
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const vite = spawn(npmCmd, ['run', 'dev'], {
            cwd: uiPath,
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
