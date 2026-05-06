import path from 'path';
import { getActiveBranch, getChangedFiles } from './git';
import { detectProjectType } from './environment';
import { prisma } from '../db';
import { detectAgents } from '../agents/registry';

interface HydrationOptions {
    fullRules?: boolean;
}

function branchScope(branch: string): string[] {
    if (branch === 'main') return ['main'];
    return ['main', branch];
}

function isNoisyMemory(content: string): boolean {
    return content.startsWith('Automatic Git Commit Context');
}

export async function compileHydratedContext(
    workspacePath: string,
    activeFile?: string,
    options: HydrationOptions = {}
): Promise<string> {
    let payload = '';
    const branch = getActiveBranch(workspacePath);

    // Detect ALL AI tool config files (Gemini, Claude, Cursor, Cline, Codex, Windsurf, Copilot, Aider)
    const agents = detectAgents(workspacePath);

    if (options.fullRules && agents.length > 0) {
        // Collect all unique rules content across detected tools
        const ingested: string[] = [];

        for (const agent of agents) {
            for (const rc of agent.rulesContent) {
                payload += `# ${agent.tool.name} — ${rc.file}\n\n`;
                payload += rc.content + '\n\n';
                ingested.push(`${agent.tool.name}/${rc.file}`);
            }
        }

        payload += `> 🔍 aigit hydrate: Ingested ${ingested.length} rule file(s) from ${agents.length} AI tool(s): ${agents.map(a => a.tool.name).join(', ')}\n\n`;
    } else {
        payload += '# AIGIT CONTEXT AUTOMATION\n\n';
        if (agents.length > 0) {
            payload += '## Detected AI Tools\n';
            for (const agent of agents) {
                payload += `- ${agent.tool.name}: ${agent.foundFiles.join(', ')}\n`;
            }
            payload += '\n';
        } else {
            payload += '> No AI tool config files detected (checked AGENTS.md, GEMINI.md, CLAUDE.md, .cursorrules, .clinerules, CODEX.md, .windsurfrules, copilot-instructions.md, .aider.conf.yml, CONVENTIONS.md).\n\n';
        }
    }

    payload += '## CURRENT ENVIRONMENT\n';
    payload += `- **Git Branch**: ${branch}\n`;
    const changed = getChangedFiles(workspacePath);
    if (changed.length > 0) {
        payload += `- **Changed Files**: ${changed.slice(0, 5).join(', ')}${changed.length > 5 ? '...' : ''}\n`;
    }

    const projectType = detectProjectType(workspacePath);
    payload += `- **Detected Project Type**: ${projectType}\n`;

    if (activeFile) {
        payload += `- **Active File**: ${activeFile}\n`;
    }
    payload += '\n';

    // Phase 23: AST-Anchored Context Retrieval
    if (activeFile) {
        try {
            const relPath = path.relative(workspacePath, activeFile);
            const { extractAllSymbols } = await import('../ast/resolver');

            // Extract symbols from the active file
            const symbols = extractAllSymbols(activeFile);
            const symbolNames = symbols.map(s => s.qualifiedName);

            // Query by symbol name (deep link) + fallback to filePath
            const symbolWhere = symbolNames.length > 0
                ? { OR: [{ symbolName: { in: symbolNames } }, { filePath: { contains: relPath } }] }
                : { filePath: { contains: relPath } };

            const [anchoredMemories, anchoredDecisions] = await Promise.all([
                prisma.memory.findMany({ where: symbolWhere, orderBy: { createdAt: 'desc' }, take: 15 }),
                prisma.decision.findMany({ where: symbolWhere, orderBy: { createdAt: 'desc' }, take: 15 }),
            ]);

            if (anchoredMemories.length > 0 || anchoredDecisions.length > 0) {
                payload += `## 📌 FILE-ANCHORED CONTEXT (${relPath})\n`;
                for (const m of anchoredMemories) {
                    const anchor = m.symbolName ? `@${m.symbolName}` : (m.lineNumber ? `L${m.lineNumber}` : '');
                    payload += `- [MEMORY ${anchor}] ${m.content}\n`;
                }
                for (const d of anchoredDecisions) {
                    const anchor = d.symbolName ? `@${d.symbolName}` : (d.lineNumber ? `L${d.lineNumber}` : '');
                    payload += `- [DECISION ${anchor}] ${d.context} ➔ ${d.chosen}\n`;
                }
                payload += '\n';
            }
        } catch {
            // DB may not be initialized yet, gracefully skip
        }
    }

    if (!activeFile) {
        try {
            const scopedBranches = branchScope(branch);
            const [recentMemories, recentDecisions] = await Promise.all([
                prisma.memory.findMany({
                    where: { gitBranch: { in: scopedBranches } },
                    orderBy: { createdAt: 'desc' },
                    take: 8,
                }),
                prisma.decision.findMany({
                    where: { gitBranch: { in: scopedBranches } },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                }),
            ]);

            const semanticMemories = recentMemories.filter(memory => !isNoisyMemory(memory.content));
            if (semanticMemories.length > 0 || recentDecisions.length > 0) {
                payload += `## BRANCH CONTEXT\n`;
                for (const memory of semanticMemories) {
                    const file = memory.filePath ? ` (${memory.filePath})` : '';
                    payload += `- [MEMORY:${memory.type}]${file} ${memory.content}\n`;
                }
                for (const decision of recentDecisions) {
                    const file = decision.filePath ? ` (${decision.filePath})` : '';
                    payload += `- [DECISION]${file} ${decision.context} ➔ ${decision.chosen}\n`;
                }
                payload += '\n';
            }
        } catch {
            // DB may not be initialized yet, gracefully skip
        }
    }

    payload += `## CONTEXT HYDRATION\n`;
    payload += `The environment features above have been auto-detected. Please follow the rules and protocols from the ingested AI tool configuration files and target your execution accordingly.\n`;

    return payload;
}
