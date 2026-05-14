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
    // Replaced O(N²) nested loops and repeated JSON.parse calls with O(N) hash map lookups.
    // Group decisions by filePath and symbolName in a single pass to dramatically reduce comparisons.

    const fileGroups = new Map<string, Array<{ d: typeof decisions[0]; payload: any }>>();
    const symbolGroups = new Map<string, Array<{ d: typeof decisions[0]; payload: any }>>();

    for (const d of decisions) {
        try {
            const payload = JSON.parse(d.payload);
            const item = { d, payload };

            if (payload.filePath) {
                const group = fileGroups.get(payload.filePath) || [];
                group.push(item);
                fileGroups.set(payload.filePath, group);
            }
            if (payload.symbolName) {
                const group = symbolGroups.get(payload.symbolName) || [];
                group.push(item);
                symbolGroups.set(payload.symbolName, group);
            }
        } catch {
            // Skip unparseable payloads
        }
    }

    const seenPairs = new Set<string>();

    const checkGroup = (group: Array<{ d: typeof decisions[0]; payload: any }>, isSymbol: boolean) => {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const a = group[i];
                const b = group[j];

                // Skip same-agent decisions
                if (a.d.fromAgentId === b.d.fromAgentId) continue;

                // Ensure we don't add the same conflict twice if they match both file and symbol
                const key = a.d.id < b.d.id ? `${a.d.id}-${b.d.id}` : `${b.d.id}-${a.d.id}`;
                if (seenPairs.has(key)) continue;
                seenPairs.add(key);

                conflicts.push({
                    a: a.d,
                    b: b.d,
                    reason: isSymbol
                        ? `Both agents modified symbol @${a.payload.symbolName}`
                        : `Both agents modified file ${a.payload.filePath}`,
                });
            }
        }
    };

    for (const group of symbolGroups.values()) {
        if (group.length > 1) checkGroup(group, true);
    }

    for (const group of fileGroups.values()) {
        if (group.length > 1) checkGroup(group, false);
    }

    return conflicts;
}
