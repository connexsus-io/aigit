import { Task, Memory, Decision } from '@prisma/client';

export function generateMermaidGraph(
    tasks: (Task & { decisions: Decision[] })[],
    memories: Memory[],
    decisions: Decision[]
): string {
    let m = '```mermaid\n';
    m += 'flowchart TD\n\n';
    m += '  %% Nodes\n';

    // Cache UUID replacements to avoid repeated regex operations
    const getCleanId = (id: string) => id.replace(/-/g, '');
    const cleanTaskIds = new Map<string, string>();
    for (const t of tasks) cleanTaskIds.set(t.id, getCleanId(t.id));

    const cleanMemIds = new Map<string, string>();
    for (const mem of memories) cleanMemIds.set(mem.id, getCleanId(mem.id));

    const cleanDecIds = new Map<string, string>();
    for (const d of decisions) cleanDecIds.set(d.id, getCleanId(d.id));

    // 1. Task Nodes
    for (const t of tasks) {
        const title = t.title.replace(/"/g, "'");
        m += `  Task_${cleanTaskIds.get(t.id)}["📋 ${title}"]:::task\n`;
    }

    // 2. Memory Nodes
    for (const mem of memories) {
        let cleanContent = mem.content.split('\n')[0].replace(/"/g, "'");
        cleanContent = cleanContent.length > 40 ? cleanContent.substring(0, 40) + '...' : cleanContent;
        m += `  Mem_${cleanMemIds.get(mem.id)}("🧠 ${cleanContent}"):::memory\n`;
    }

    // 3. Decision Nodes
    for (const d of decisions) {
        const chosen = d.chosen.replace(/"/g, "'");
        m += `  Dec_${cleanDecIds.get(d.id)}{"🧭 ${chosen}"}:::decision\n`;
    }

    m += '\n  %% Causal Links\n';

    // Link Tasks -> Decisions
    for (const t of tasks) {
        for (const d of t.decisions) {
            m += `  Task_${cleanTaskIds.get(t.id)} -->|Spawned| Dec_${cleanDecIds.get(d.id)}\n`;
        }
    }

    // Pre-group decisions by filePath for faster lookups
    const decisionsByFile = new Map<string, typeof decisions>();

    // ⚡ Bolt Performance Optimization:
    // Pre-group decisions by composite key (filePath + symbolName) to avoid O(N*M) filtering inside the loop
    const decisionsByFileAndSymbol = new Map<string, typeof decisions>();

    for (const d of decisions) {
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
    for (const mem of memories) {
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
    for (const mem of memories) {
        if (mem.filePath) {
            const key = `${mem.filePath}::${mem.symbolName || ''}`;
            const relatedDecisions = decisionsByFileAndSymbol.get(key) || [];
            for (const d of relatedDecisions) {
                m += `  Mem_${cleanMemIds.get(mem.id)} -.->|Influenced| Dec_${cleanDecIds.get(d.id)}\n`;
            }
        }
    }

    m += '\n  %% Subgraphs by File Path\n';
    const files = new Set<string>();
    for (const f of memoriesByFile.keys()) files.add(f);
    for (const f of decisionsByFile.keys()) files.add(f);

    const sortedFiles = Array.from(files);
    for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        m += `  subgraph File${i} ["📁 ${file}"]\n`;

        const fileMemories = memoriesByFile.get(file) || [];
        for (const mem of fileMemories) {
            m += `    Mem_${cleanMemIds.get(mem.id)}\n`;
        }

        const fileDecisions = decisionsByFile.get(file) || [];
        for (const d of fileDecisions) {
            m += `    Dec_${cleanDecIds.get(d.id)}\n`;
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
