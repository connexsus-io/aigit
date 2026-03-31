import { prisma, initializeDatabase } from './src/db';

async function generateMockData() {
    console.log('Generating mock data...');
    const project = await prisma.project.create({
        data: {
            id: 'mock-project-1',
            name: 'Mock Project'
        }
    });

    const tasksData = [];
    const memoryData = [];
    const decisionData = [];

    for (let i = 0; i < 50; i++) {
        tasksData.push({
            id: `task-${i}`,
            projectId: project.id,
            slug: `task-slug-${i}`,
            title: `Task Title ${i}`,
            status: 'OPEN',
            gitBranch: 'main'
        });
    }

    await prisma.task.createMany({ data: tasksData });
    const tasks = await prisma.task.findMany();

    const agents = ['Agent Alpha', 'Agent Beta', 'Agent Gamma'];

    for (let i = 0; i < 200; i++) {
        memoryData.push({
            id: `memory-${i}`,
            projectId: project.id,
            type: 'context',
            content: `Mock memory content ${i}`,
            agentName: agents[i % agents.length],
            gitBranch: 'main'
        });

        decisionData.push({
            id: `decision-${i}`,
            taskId: tasks[i % tasks.length].id,
            context: `Context for decision ${i}`,
            chosen: `Chosen path ${i}`,
            rejected: [`Rejected path ${i} A`, `Rejected path ${i} B`],
            reasoning: `Reasoning ${i}`,
            agentName: agents[i % agents.length],
            gitBranch: 'main'
        });
    }

    await prisma.memory.createMany({ data: memoryData });
    await prisma.decision.createMany({ data: decisionData });
    console.log('Mock data generation complete.');
}

async function runBenchmarkSequential() {
    const iterations = 50;
    const times = [];

    console.log(`Running sequential benchmark for ${iterations} iterations...`);

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Simulating the sequential queries in /api/stats
        const memoryCount = await prisma.memory.count();
        const decisionCount = await prisma.decision.count();
        const taskCount = await prisma.task.count();

        const memAgents = await prisma.memory.groupBy({
            by: ['agentName'],
            _count: { agentName: true }
        });
        const decAgents = await prisma.decision.groupBy({
            by: ['agentName'],
            _count: { agentName: true }
        });

        const end = performance.now();
        times.push(end - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / iterations;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`Sequential - Avg: ${avg.toFixed(2)}ms, Min: ${min.toFixed(2)}ms, Max: ${max.toFixed(2)}ms`);
    return avg;
}

async function runBenchmarkParallel() {
    const iterations = 50;
    const times = [];

    console.log(`Running parallel benchmark for ${iterations} iterations...`);

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Simulating the parallel queries in /api/stats
        const [memoryCount, decisionCount, taskCount, memAgents, decAgents] = await Promise.all([
            prisma.memory.count(),
            prisma.decision.count(),
            prisma.task.count(),
            prisma.memory.groupBy({
                by: ['agentName'],
                _count: { agentName: true }
            }),
            prisma.decision.groupBy({
                by: ['agentName'],
                _count: { agentName: true }
            })
        ]);

        const end = performance.now();
        times.push(end - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / iterations;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`Parallel - Avg: ${avg.toFixed(2)}ms, Min: ${min.toFixed(2)}ms, Max: ${max.toFixed(2)}ms`);
    return avg;
}


async function main() {
    console.log('Initializing database...');
    await initializeDatabase();

    // Clear existing data to ensure consistent benchmarking environment
    await prisma.memory.deleteMany();
    await prisma.decision.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();

    await generateMockData();

    // Warmup
    await runBenchmarkSequential();

    console.log('\n--- Benchmarks ---');
    const seqAvg = await runBenchmarkSequential();
    const parAvg = await runBenchmarkParallel();

    const improvement = ((seqAvg - parAvg) / seqAvg * 100).toFixed(2);
    console.log(`\nImprovement: ${improvement}% faster with Promise.all`);

    process.exit(0);
}

main().catch(console.error);
