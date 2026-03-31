import { generateArchitectureDocs } from './src/docs/generator';
import { prisma } from './src/db';
import { randomUUID } from 'crypto';

async function seedDatabase(projectId: string, branch: string) {
    console.log('Seeding database with mock data...');

    // Create 1000 tasks
    const tasks = Array.from({ length: 1000 }).map((_, i) => ({
        id: randomUUID(),
        projectId,
        title: `Task ${i}`,
        slug: `task-${projectId}-${i}`,
        status: 'DONE',
        gitBranch: branch,
    }));
    await prisma.task.createMany({ data: tasks });

    // Create 2000 memories
    const memories = Array.from({ length: 2000 }).map((_, i) => ({
        id: randomUUID(),
        projectId,
        content: `Memory content ${i}`,
        type: 'observation',
        gitBranch: branch,
    }));
    await prisma.memory.createMany({ data: memories });

    // Create 1500 decisions
    const decisions = Array.from({ length: 1500 }).map((_, i) => ({
        id: randomUUID(),
        taskId: tasks[i % tasks.length].id, // Link to a task
        context: `Context ${i}`,
        chosen: `Decision chosen ${i}`,
        rejected: [`Decision rejected ${i}`],
        reasoning: `Decision reasoning ${i}`,
        gitBranch: branch,
    }));
    await prisma.decision.createMany({ data: decisions });

    console.log('Database seeded successfully.');
}

async function runBenchmark() {
    console.log('--- Starting Docs Generator Benchmark ---');
    const projectName = `benchmark-project-${randomUUID()}`;
    const branch = 'main';

    // 1. Setup Project
    const project = await prisma.project.create({
        data: { name: projectName }
    });

    // 2. Seed Data
    await seedDatabase(project.id, branch);

    console.log('Warming up (running once)...');
    await generateArchitectureDocs(projectName, branch);

    console.log('Running benchmark (10 iterations)...');
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await generateArchitectureDocs(projectName, branch);
        const end = performance.now();
        times.push(end - start);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;

    console.log(`Average Execution Time: ${avgTime.toFixed(2)} ms`);
    console.log(`Min Time: ${Math.min(...times).toFixed(2)} ms`);
    console.log(`Max Time: ${Math.max(...times).toFixed(2)} ms`);
    console.log('---------------------------------------------------');

    // Cleanup
    await prisma.decision.deleteMany({ where: { task: { projectId: project.id } } });
    await prisma.memory.deleteMany({ where: { projectId: project.id } });
    await prisma.task.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
}

async function main() {
    const { initializeDatabase } = await import('./src/db');
    await initializeDatabase();
    await runBenchmark();
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
