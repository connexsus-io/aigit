import { prisma } from '../db';
import { haltSwarm } from './swarm';

/**
 * Report a conflict within a swarm. Halts the swarm automatically.
 */
export async function reportConflict(
    agentId: string,
    reason: string,
    blockedDecision: string,
    filePath?: string,
    symbolName?: string
) {
    const agent = await prisma.swarmAgent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    // Block the agent
    await prisma.swarmAgent.update({
        where: { id: agentId },
        data: { status: 'BLOCKED' },
    });

    // Create a conflict message
    const message = await prisma.swarmMessage.create({
        data: {
            swarmId: agent.swarmId,
            fromAgentId: agentId,
            type: 'conflict',
            channel: 'broadcast',
            payload: JSON.stringify({
                reason,
                blockedDecision,
                filePath: filePath || null,
                symbolName: symbolName || null,
                reportedBy: agent.role,
            }),
            isConflict: true,
            resolved: false,
        },
    });

    // Halt the swarm
    await haltSwarm(agent.swarmId);

    return message;
}

/**
 * Resolve a conflict message and optionally resume the swarm.
 */
export async function resolveConflict(
    messageId: string,
    resolution: string,
    resumeSwarm = true
) {
    const message = await prisma.swarmMessage.update({
        where: { id: messageId },
        data: { resolved: true, resolution },
    });

    if (resumeSwarm) {
        // Check if all conflicts in the swarm are resolved
        const unresolvedCount = await prisma.swarmMessage.count({
            where: { swarmId: message.swarmId, isConflict: true, resolved: false },
        });

        if (unresolvedCount === 0) {
            // Resume the swarm — set the blocked agent back to WORKING
            await prisma.swarmAgent.updateMany({
                where: { swarmId: message.swarmId, status: 'BLOCKED' },
                data: { status: 'WORKING' },
            });

            await prisma.swarmSession.update({
                where: { id: message.swarmId },
                data: { status: 'ACTIVE' },
            });
        }
    }

    return message;
}

/**
 * List unresolved conflicts in a swarm.
 */
export async function listConflicts(swarmId?: string) {
    return prisma.swarmMessage.findMany({
        where: {
            ...(swarmId ? { swarmId } : {}),
            isConflict: true,
            resolved: false
        },
        include: {
            fromAgent: { select: { role: true, agentName: true } },
            swarm: { select: { goal: true } } // include swarm goal since callers might need it if swarmId isn't known
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Auto-detect conflicts: find decisions that touch the same file or symbol from different agents.
 */
export async function detectConflicts(swarmId: string) {
    const decisions = await prisma.swarmMessage.findMany({
        where: { swarmId, type: 'decision', isConflict: false },
        include: { fromAgent: { select: { role: true, id: true } } },
    });

    const conflicts: Array<{ a: typeof decisions[0]; b: typeof decisions[0]; reason: string }> = [];

    // ⚡ Bolt Performance Optimization:
    // Parse payloads once outside the O(N^2) comparison loop to avoid redundant JSON.parse calls.
    const parsedDecisions = [];
    for (const d of decisions) {
        try {
            parsedDecisions.push({ original: d, parsedPayload: JSON.parse(d.payload) });
        } catch {
            // Skip unparseable payloads
        }
    }

    for (let i = 0; i < parsedDecisions.length; i++) {
        for (let j = i + 1; j < parsedDecisions.length; j++) {
            const a = parsedDecisions[i];
            const b = parsedDecisions[j];

            // Skip same-agent decisions
            if (a.original.fromAgentId === b.original.fromAgentId) continue;

            const payloadA = a.parsedPayload;
            const payloadB = b.parsedPayload;

            const sameFile = payloadA.filePath && payloadB.filePath && payloadA.filePath === payloadB.filePath;
            const sameSymbol = payloadA.symbolName && payloadB.symbolName && payloadA.symbolName === payloadB.symbolName;

            if (sameFile || sameSymbol) {
                conflicts.push({
                    a: a.original,
                    b: b.original,
                    reason: sameSymbol
                        ? `Both agents modified symbol @${payloadA.symbolName}`
                        : `Both agents modified file ${payloadA.filePath}`,
                });
            }
        }
    }

    return conflicts;
}
