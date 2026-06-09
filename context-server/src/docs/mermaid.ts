import { Task, Memory, Decision } from '@prisma/client';

export function generateMermaidGraph(
    tasks: (Task & { decisions: Decision[] })[],
    memories: Memory[],
    decisions: Decision[]
): string {
    let m = '```mermaid\n';
    m += 'flowchart TD\n\n';
    m += '  %% Nodes\n';

    // ⚡ Bolt Performance Optimization:
    // Pre-calculate mapped IDs and replace Array.forEach with simple for loops
    // to avoid massive closure allocation overhead and repeated string replacements (regex execution)

    const tasksLen = tasks.length;
    const taskIds = new Array(tasksLen);
    for (let i = 0; i < tasksLen; i++) {
        const t = tasks[i];
        taskIds[i] = t.id.replace(/-/g, '');
        const title = t.title.replace(/"/g, "'");
        m += `  Task_${taskIds[i]}["📋 ${title}"]:::task\n`;
    }

    const memLen = memories.length;
    const memIds = new Array(memLen);
    for (let i = 0; i < memLen; i++) {
        const mem = memories[i];
        memIds[i] = mem.id.replace(/-/g, '');
        let cleanContent = mem.content.split('\n')[0].replace(/"/g, "'");
        cleanContent = cleanContent.length > 40 ? cleanContent.substring(0, 40) + '...' : cleanContent;
        m += `  Mem_${memIds[i]}("🧠 ${cleanContent}"):::memory\n`;
    }

    const decLen = decisions.length;
    const decIds = new Array(decLen);
    for (let i = 0; i < decLen; i++) {
        const d = decisions[i];
        decIds[i] = d.id.replace(/-/g, '');
        const chosen = d.chosen.replace(/"/g, "'");
        m += `  Dec_${decIds[i]}{"🧭 ${chosen}"}:::decision\n`;
    }

    m += '\n  %% Causal Links\n';

    for (let i = 0; i < tasksLen; i++) {
        const t = tasks[i];
        const tid = taskIds[i];
        const decs = t.decisions;
        const decsLen = decs.length;
        for (let j = 0; j < decsLen; j++) {
            m += `  Task_${tid} -->|Spawned| Dec_${decs[j].id.replace(/-/g, '')}\n`;
        }
    }

    const decisionsByFile = new Map<string, string[]>();
    const decisionsByFileAndSymbol = new Map<string, string[]>();

    for (let i = 0; i < decLen; i++) {
        const d = decisions[i];
        const dId = decIds[i];
        if (!d.filePath) continue;
        let group = decisionsByFile.get(d.filePath);
        if (!group) {
            group = [];
            decisionsByFile.set(d.filePath, group);
        }
        group.push(dId);

        const key = `${d.filePath}::${d.symbolName || ''}`;
        let symGroup = decisionsByFileAndSymbol.get(key);
        if (!symGroup) {
            symGroup = [];
            decisionsByFileAndSymbol.set(key, symGroup);
        }
        symGroup.push(dId);
    }

    const memoriesByFile = new Map<string, string[]>();
    for (let i = 0; i < memLen; i++) {
        const mem = memories[i];
        const mId = memIds[i];
        if (!mem.filePath) continue;
        let group = memoriesByFile.get(mem.filePath);
        if (!group) {
            group = [];
            memoriesByFile.set(mem.filePath, group);
        }
        group.push(mId);
    }

    for (let i = 0; i < memLen; i++) {
        const mem = memories[i];
        if (mem.filePath) {
            const key = `${mem.filePath}::${mem.symbolName || ''}`;
            const relatedDecisions = decisionsByFileAndSymbol.get(key) || [];
            const relLen = relatedDecisions.length;
            if (relLen > 0) {
                const memId = memIds[i];
                for (let j = 0; j < relLen; j++) {
                    m += `  Mem_${memId} -.->|Influenced| Dec_${relatedDecisions[j]}\n`;
                }
            }
        }
    }

    m += '\n  %% Subgraphs by File Path\n';
    const files = new Set<string>();
    for (const f of memoriesByFile.keys()) files.add(f);
    for (const f of decisionsByFile.keys()) files.add(f);

    const filesArr = Array.from(files);
    const filesArrLen = filesArr.length;
    for (let i = 0; i < filesArrLen; i++) {
        const file = filesArr[i];
        m += `  subgraph File${i} ["📁 ${file}"]\n`;

        const fileMemories = memoriesByFile.get(file) || [];
        const fmLen = fileMemories.length;
        for (let j = 0; j < fmLen; j++) {
            m += `    Mem_${fileMemories[j]}\n`;
        }

        const fileDecisions = decisionsByFile.get(file) || [];
        const fdLen = fileDecisions.length;
        for (let j = 0; j < fdLen; j++) {
            m += `    Dec_${fileDecisions[j]}\n`;
        }
        m += `  end\n\n`;
    }

    m += '  %% Styling\n';
    m += '  classDef task fill:#4f46e5,stroke:#fff,stroke-width:2px,color:#fff,rx:5,ry:5\n';
    m += '  classDef memory fill:#059669,stroke:#fff,stroke-width:2px,color:#fff,rx:20,ry:20\n';
    m += '  classDef decision fill:#d97706,stroke:#fff,stroke-width:2px,color:#fff\n';

    m += '```\n';
    return m;
}
