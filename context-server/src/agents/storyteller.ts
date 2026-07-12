import { prisma } from '../db';

export interface TimelineEntry {
    date: Date;
    type: 'memory' | 'decision';
    content: string;
    filePath: string | null;
    symbolName: string | null;
}

/**
 * Build a chronological timeline of all memories and decisions
 * anchored to a given path (or its children).
 */
export async function buildTimeline(targetPath: string): Promise<TimelineEntry[]> {
    const [memories, decisions] = await Promise.all([
        prisma.memory.findMany({
            where: { filePath: { contains: targetPath } },
            orderBy: { createdAt: 'asc' }
        }),
        prisma.decision.findMany({
            where: { filePath: { contains: targetPath } },
            orderBy: { createdAt: 'asc' }
        })
    ]);

    const timeline: TimelineEntry[] = [];

    // ⚡ Bolt Performance Optimization:
    // Using standard for-loops and .push() avoids the overhead of intermediate array
    // allocations and closure execution caused by .map() followed by spread syntax (...).
    const memLen = memories.length;
    for (let i = 0; i < memLen; i++) {
        const m = memories[i];
        timeline.push({
            date: m.createdAt,
            type: 'memory' as const,
            content: `[${m.type.toUpperCase()}] ${m.content}`,
            filePath: m.filePath,
            symbolName: m.symbolName,
        });
    }

    const decLen = decisions.length;
    for (let i = 0; i < decLen; i++) {
        const d = decisions[i];
        timeline.push({
            date: d.createdAt,
            type: 'decision' as const,
            content: `Context: ${d.context} → Chosen: ${d.chosen}${d.reasoning ? ` (Reason: ${d.reasoning})` : ''}`,
            filePath: d.filePath,
            symbolName: d.symbolName,
        });
    }

    // Sort by date ascending (chronological)
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    return timeline;
}

/**
 * Format a timeline into a human-readable Markdown narrative.
 */
export function formatReplayNarrative(targetPath: string, timeline: TimelineEntry[]): string {
    if (timeline.length === 0) {
        return `\n📖 [aigit replay] No semantic context found for: ${targetPath}\n   Try running \`aigit note\` or committing code to build context.\n`;
    }

    let output = `\n📖 [aigit replay] Evolution of: ${targetPath}\n`;
    output += `   ${timeline.length} context entries found.\n`;
    output += `   ─────────────────────────────────────────────\n\n`;

    for (const entry of timeline) {
        const dateStr = entry.date.toISOString().substring(0, 16).replace('T', ' ');
        const icon = entry.type === 'decision' ? '🔀' : '📝';
        const anchor = entry.symbolName ? ` ⚓ @${entry.symbolName}` : '';

        output += `   ${icon} [${dateStr}] ${entry.content}${anchor}\n`;
    }

    output += `\n   ─────────────────────────────────────────────\n`;
    output += `   Timeline spans: ${timeline[0].date.toISOString().substring(0, 10)} → ${timeline[timeline.length - 1].date.toISOString().substring(0, 10)}\n`;

    return output;
}
