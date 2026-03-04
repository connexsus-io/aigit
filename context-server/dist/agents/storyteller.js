"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTimeline = buildTimeline;
exports.formatReplayNarrative = formatReplayNarrative;
const db_1 = require("../db");
/**
 * Build a chronological timeline of all memories and decisions
 * anchored to a given path (or its children).
 */
async function buildTimeline(targetPath) {
    const [memories, decisions] = await Promise.all([
        db_1.prisma.memory.findMany({
            where: { filePath: { contains: targetPath } },
            orderBy: { createdAt: 'asc' }
        }),
        db_1.prisma.decision.findMany({
            where: { filePath: { contains: targetPath } },
            orderBy: { createdAt: 'asc' }
        })
    ]);
    const timeline = [
        ...memories.map(m => ({
            date: m.createdAt,
            type: 'memory',
            content: `[${m.type.toUpperCase()}] ${m.content}`,
            filePath: m.filePath,
            symbolName: m.symbolName,
        })),
        ...decisions.map(d => ({
            date: d.createdAt,
            type: 'decision',
            content: `Context: ${d.context} → Chosen: ${d.chosen}${d.reasoning ? ` (Reason: ${d.reasoning})` : ''}`,
            filePath: d.filePath,
            symbolName: d.symbolName,
        }))
    ];
    // Sort by date ascending (chronological)
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    return timeline;
}
/**
 * Format a timeline into a human-readable Markdown narrative.
 */
function formatReplayNarrative(targetPath, timeline) {
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
