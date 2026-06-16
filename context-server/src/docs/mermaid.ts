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
    // Caching repeated string replacements significantly speeds up the generation of the graph.
    const taskIds = new Map<string, string>();
    for (let i = 0; i < tasks.length; i++) {
        taskIds.set(tasks[i].id, tasks[i].id.replace(/-/g, ''));
    }
    const memIds = new Map<string, string>();
    for (let i = 0; i < memories.length; i++) {
        memIds.set(memories[i].id, memories[i].id.replace(/-/g, ''));
    }
    const decIds = new Map<string, string>();
    for (let i = 0; i < decisions.length; i++) {
        decIds.set(decisions[i].id, decisions[i].id.replace(/-/g, ''));
    }

    // 1. Task Nodes
    for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const title = t.title.replace(/"/g, "'");
        m += `  Task_${taskIds.get(t.id)}["📋 ${title}"]:::task\n`;
    }

    // 2. Memory Nodes
    for (let i = 0; i < memories.length; i++) {
        const mem = memories[i];
        let cleanContent = mem.content.split('\n')[0].replace(/"/g, "'");
        cleanContent = cleanContent.length > 40 ? cleanContent.substring(0, 40) + '...' : cleanContent;
        m += `  Mem_${memIds.get(mem.id)}("🧠 ${cleanContent}"):::memory\n`;
    }

    // 3. Decision Nodes
    for (let i = 0; i < decisions.length; i++) {
        const d = decisions[i];
        const chosen = d.chosen.replace(/"/g, "'");
        m += `  Dec_${decIds.get(d.id)}{"🧭 ${chosen}"}:::decision\n`;
    }

    m += '\n  %% Causal Links\n';

    // Link Tasks -> Decisions
    for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        for (let j = 0; j < t.decisions.length; j++) {
            const d = t.decisions[j];
            m += `  Task_${taskIds.get(t.id)} -->|Spawned| Dec_${decIds.get(d.id)}\n`;
        }
    }

    // Pre-group decisions by filePath for faster lookups
    const decisionsByFile = new Map<string, typeof decisions>();

    // ⚡ Bolt Performance Optimization:
    // Pre-group decisions by composite key (filePath + symbolName) to avoid O(N*M) filtering inside the loop
    const decisionsByFileAndSymbol = new Map<string, typeof decisions>();

    for (let i = 0; i < decisions.length; i++) {
        const d = decisions[i];
        if (!d.filePath) continue;
        let group = decisionsByFile.get(d.filePath);
        if (!group) {
            group = [];
            decisionsByFile.set(d.filePath, group);
        }
        group.push(d);

        const key = `${d.filePath}::${d.symbolName || ''}`;
        let symGroup = decisionsByFileAndSymbol.get(key);
        if (!symGroup) {
            symGroup = [];
            decisionsByFileAndSymbol.set(key, symGroup);
        }
        symGroup.push(d);
    }

    // Pre-group memories by filePath
    const memoriesByFile = new Map<string, typeof memories>();
    for (let i = 0; i < memories.length; i++) {
        const mem = memories[i];
        if (!mem.filePath) continue;
        let group = memoriesByFile.get(mem.filePath);
        if (!group) {
            group = [];
            memoriesByFile.set(mem.filePath, group);
        }
        group.push(mem);
    }

    // Link Memories -> Decisions (heuristic: if they share a file/symbol or just generic linkage)
    // For a cleaner graph, let's link Memories to Decisions if they share the same filePath and symbolName
    for (let i = 0; i < memories.length; i++) {
        const mem = memories[i];
        if (mem.filePath) {
            const key = `${mem.filePath}::${mem.symbolName || ''}`;
            const relatedDecisions = decisionsByFileAndSymbol.get(key) || [];
            for (let j = 0; j < relatedDecisions.length; j++) {
                const d = relatedDecisions[j];
                m += `  Mem_${memIds.get(mem.id)} -.->|Influenced| Dec_${decIds.get(d.id)}\n`;
            }
        }
    }

    m += '\n  %% Subgraphs by File Path\n';
    const files = new Set<string>();
    for (const f of memoriesByFile.keys()) files.add(f);
    for (const f of decisionsByFile.keys()) files.add(f);

    let fileIndex = 0;
    for (const file of files) {
        m += `  subgraph File${fileIndex} ["📁 ${file}"]\n`;

        const fileMemories = memoriesByFile.get(file) || [];
        for (let j = 0; j < fileMemories.length; j++) {
            const mem = fileMemories[j];
            m += `    Mem_${memIds.get(mem.id)}\n`;
        }

        const fileDecisions = decisionsByFile.get(file) || [];
        for (let j = 0; j < fileDecisions.length; j++) {
            const d = fileDecisions[j];
            m += `    Dec_${decIds.get(d.id)}\n`;
        }
        m += `  end\n\n`;
        fileIndex++;
    }

    m += '  %% Styling\n';
    m += '  classDef task fill:#4f46e5,stroke:#fff,stroke-width:2px,color:#fff,rx:5,ry:5\n';
    m += '  classDef memory fill:#059669,stroke:#fff,stroke-width:2px,color:#fff,rx:20,ry:20\n';
    m += '  classDef decision fill:#d97706,stroke:#fff,stroke-width:2px,color:#fff\n';

    m += '```\n';
    return m;
}
