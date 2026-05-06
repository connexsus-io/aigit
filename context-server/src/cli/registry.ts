import type { CommandHandler } from './commands/types';

// Eagerly import all command handlers.
// Each handler is a small module — no benefit from lazy dynamic import here
// since initializeDatabase() already runs before dispatch.
import initHandler from './commands/init';
import hydrateHandler from './commands/hydrate';
import historyHandler from './commands/history';
import syncHandler from './commands/sync';
import queryHandler from './commands/query';
import noteHandler from './commands/note';
import commitHandler from './commands/commit';
import anchorHandler from './commands/anchor';
import scanHandler from './commands/scan';
import swarmHandler from './commands/swarm';
import healHandler from './commands/heal';
import depsHandler from './commands/deps';
import docsHandler from './commands/docs';
import replayHandler from './commands/replay';
import telemetryHandler from './commands/telemetry';
import branchHandler from './commands/branch';
import { formatAdvancedHelp } from './advancedHelp';

export const COMMAND_REGISTRY: Record<string, CommandHandler> = {
    // Bootstrap
    init: initHandler,
    'init-hook': initHandler,

    // Context access
    hydrate: hydrateHandler,
    log: historyHandler,
    status: historyHandler,
    revert: historyHandler,

    // Storage
    dump: syncHandler,
    load: syncHandler,
    sync: syncHandler,
    conflicts: syncHandler,

    // Branch operations
    'check-conflicts': branchHandler,
    merge: branchHandler,

    // Semantic memory
    query: queryHandler,
    note: noteHandler,
    commit: commitHandler,

    // Code analysis
    anchor: anchorHandler,
    scan: scanHandler,
    replay: replayHandler,

    // Docs
    docs: docsHandler,
    'export-docs': docsHandler,

    // Swarm
    swarm: swarmHandler,

    // Self-healing
    heal: healHandler,
    deps: depsHandler,

    // Other
    advanced: async () => {
        console.log(formatAdvancedHelp());
    },
    telemetry: telemetryHandler,
    mcp: async () => {
        // MCP server start is handled before registry dispatch in main cli/index.ts
    },
};

export const GLOBAL_HELP = `
aigit — Git-native memory for AI coding agents

Commands:
  init                          Initialize aigit in current repo
  doctor                        Check adoption health and memory quality
  hydrate [file]                Compile focused branch-aware context
  dump                          Serialize memory DB → .aigit/ledger.json
  load                          Reconstruct memory DB ← .aigit/ledger.json
  log                           Show semantic memory timeline
  status                        Show pending AI tasks
  revert <id>                   Remove a specific context entry
  check-conflicts [branch]      Check for semantic conflicts vs branch
  init-hook                     Install Git hooks only
  query "<question>"            Semantic search across memory
  handoff <slug>                Generate a task handoff block
  repair ledger                 Repair and report ledger quality
  mcp [directory]               Start the core MCP memory server

Context:
  note "<message>"              Instantly capture a manual context note
  commit memory "<text>"        Commit a memory entry to current branch
  commit decision "<ctx>" "<chosen>"  Record an architectural decision
  commit task "<title>"         Create a tracked task
  update task <slug> <status>   Update tracked task status

Other:
  advanced                      Show secondary advanced/experimental commands
`;
