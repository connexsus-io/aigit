import { Task, Memory, Decision } from '@prisma/client';

export function generateMermaidGraph(
    tasks: (Task & { decisions: Decision[] })[],
    memories: Memory[],
    decisions: Decision[]
): string {
    let m = '```mermaid\n';
    m += 'flowchart TD\n\n';
    m += '  %% Nodes\n';

    // 1. Task Nodes
    tasks.forEach(t => {
        const title = t.title.replace(/"/g, "'");
        m += `  Task_${t.id.replace(/-/g, '')}["📋 ${title}"]:::task\n`;
    });

    // 2. Memory Nodes
    memories.forEach(mem => {
        let cleanContent = mem.content.split('\n')[0].replace(/"/g, "'");
        cleanContent = cleanContent.length > 40 ? cleanContent.substring(0, 40) + '...' : cleanContent;
        m += `  Mem_${mem.id.replace(/-/g, '')}("🧠 ${cleanContent}"):::memory\n`;
    });

    // 3. Decision Nodes
    decisions.forEach(d => {
        const chosen = d.chosen.replace(/"/g, "'");
        m += `  Dec_${d.id.replace(/-/g, '')}{"🧭 ${chosen}"}:::decision\n`;
    });

    m += '\n  %% Causal Links\n';

    // Link Tasks -> Decisions
    tasks.forEach(t => {
        t.decisions.forEach(d => {
            m += `  Task_${t.id.replace(/-/g, '')} -->|Spawned| Dec_${d.id.replace(/-/g, '')}\n`;
        });
    });

    // Pre-group decisions by filePath for faster lookups
    const decisionsByFile = new Map<string, typeof decisions>();
    for (const d of decisions) {
        if (!d.filePath) continue;
        let group = decisionsByFile.get(d.filePath);
        if (!group) {
            group = [];
            decisionsByFile.set(d.filePath, group);
        }
        group.push(d);
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
    memories.forEach(mem => {
        if (mem.filePath) {
            const fileDecisions = decisionsByFile.get(mem.filePath) || [];
            const relatedDecisions = fileDecisions.filter(d => d.symbolName === mem.symbolName);
            relatedDecisions.forEach(d => {
                m += `  Mem_${mem.id.replace(/-/g, '')} -.->|Influenced| Dec_${d.id.replace(/-/g, '')}\n`;
            });
        }
    });

    m += '\n  %% Subgraphs by File Path\n';
    const files = new Set<string>();
    for (const f of memoriesByFile.keys()) files.add(f);
    for (const f of decisionsByFile.keys()) files.add(f);

    Array.from(files).forEach((file, i) => {
        m += `  subgraph File${i} ["📁 ${file}"]\n`;

        const fileMemories = memoriesByFile.get(file) || [];
        fileMemories.forEach(mem => {
            m += `    Mem_${mem.id.replace(/-/g, '')}\n`;
        });

        const fileDecisions = decisionsByFile.get(file) || [];
        fileDecisions.forEach(d => {
            m += `    Dec_${d.id.replace(/-/g, '')}\n`;
        });
        m += `  end\n\n`;
    });

    m += '  %% Styling\n';
    m += '  classDef task fill:#4f46e5,stroke:#fff,stroke-width:2px,color:#fff,rx:5,ry:5\n';
    m += '  classDef memory fill:#059669,stroke:#fff,stroke-width:2px,color:#fff,rx:20,ry:20\n';
    m += '  classDef decision fill:#d97706,stroke:#fff,stroke-width:2px,color:#fff\n';

    m += '```\n';
    return m;
}
