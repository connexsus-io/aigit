# aigit

Git-native memory for AI coding agents.

This package contains the Aigit CLI and MCP server published as `aigit-core`.

AI agents forget why the code works. Aigit stores that reasoning in Git.

Aigit helps AI coding agents remember the durable parts of a project: architectural decisions, task handoffs, branch context, and reasoning that should survive a single chat session. It stores that memory locally, serializes it into Git, and exposes it to agents through CLI and MCP tools.

Aigit is not a replacement for Git, your editor, or your agent. It is a repo-local memory layer for AI-assisted development.

## Why Aigit Exists

AI coding agents are useful, but they usually lose:

- why a design was chosen
- what a previous agent already tried
- which task is active
- what changed on a feature branch
- which context belongs to this repo instead of another tool session

Aigit keeps that project memory next to the code.

## What Aigit Does

- Stores semantic memories, decisions, tasks, and handoff notes in `.aigit/memory.db`.
- Serializes durable memory to `.aigit/ledger.json` so Git can track it.
- Hydrates focused branch-aware context with `aigit hydrate`.
- Lets agents write and query memory through MCP tools.
- Installs lightweight managed `AGENTS.md` guidance and default Aigit skills.
- Checks setup and memory health with `aigit doctor`.
- Helps repair stale or noisy memory with `aigit repair ledger`.

## What Aigit Does Not Do

- It does not replace Git history or code review.
- It does not automatically understand every code change.
- It does not require a hosted service.
- It does not force a heavy agent-governance framework.
- It does not make agents perfect; it gives them a better memory substrate.

## How It Works

Aigit has two layers:

- Local memory DB: `.aigit/memory.db`
  Stores active semantic memory using embedded PGlite and vector search.
- Git ledger: `.aigit/ledger.json`
  Stores durable memory in a Git-trackable format so branches can carry their own AI context.

Agents interact through:

- CLI commands such as `aigit hydrate`, `aigit commit memory`, and `aigit repair ledger`
- MCP tools exposed by `aigit mcp`
- managed `AGENTS.md` workflow rules
- optional repo-local skills under `.aigit/skills`

## Install

Install globally:

```bash
npm install -g aigit-core
```

Or run it without installing:

```bash
npx aigit-core init
```

## Quick Start

Inside an existing Git repo:

```bash
aigit init
aigit doctor
```

If doctor reports missing adoption assets:

```bash
aigit doctor --fix
```

Install Git hooks:

```bash
aigit init-hook
```

The hooks keep memory synchronized on checkout/merge and enforce semantic commit summaries before Git commits.

## Recommended Agent Workflow

At the start of a session:

```bash
aigit load
aigit hydrate
```

For complex work:

```bash
aigit commit task "Implement billing retry logic"
aigit update task implement-billing-retry-logic IN_PROGRESS
```

During work, save durable reasoning:

```bash
aigit commit memory "Billing retries treat processor timeouts as retryable and card declines as terminal."
aigit commit decision "Retry policy" "Use capped exponential backoff" --reasoning "Avoids charge storms while recovering transient processor failures."
```

Before handing work off:

```bash
aigit handoff implement-billing-retry-logic
```

Before commit or merge:

```bash
aigit repair ledger
npm run check:ledger
aigit check-conflicts main
```

## Recommended Developer Workflow

1. Run `aigit init` once per repo.
2. Add the MCP config printed by init to your agent tool.
3. Let agents start with `aigit load` and `aigit hydrate`.
4. Ask agents to record durable reasoning with `aigit commit memory`.
5. Review `.aigit/ledger.json` like any other tracked project artifact.
6. Use `aigit doctor` when setup or memory quality feels off.

## Core Commands

| Command | Purpose |
| --- | --- |
| `aigit init` | Initialize `.aigit`, managed rules, and default skills. |
| `aigit init-hook` | Install Git hooks for memory sync and commit safety. |
| `aigit doctor` | Check adoption health and memory quality. |
| `aigit doctor --fix` | Apply safe setup fixes without pruning memory. |
| `aigit load` | Rebuild local memory DB from `.aigit/ledger.json`. |
| `aigit dump` | Serialize local memory DB to `.aigit/ledger.json`. |
| `aigit hydrate` | Produce focused branch-aware context for an agent. |
| `aigit hydrate --full-rules` | Include full detected rule files for setup/debugging. |
| `aigit commit memory "..."` | Save durable project reasoning. |
| `aigit commit decision "..." "..."` | Save an architectural decision. |
| `aigit commit task "..."` | Create a tracked task and task markdown file. |
| `aigit update task <slug> DONE` | Update task status and task markdown. |
| `aigit query "..."` | Search semantic project memory. |
| `aigit handoff <slug>` | Generate an agent handoff block for a task. |
| `aigit repair ledger` | Backfill safe ledger metadata and report drift. |
| `aigit repair ledger --prune-noise --fix-task-files` | Explicitly clean noisy memories and sync task files. |
| `aigit check-conflicts main` | Check branch memory conflicts before merge. |
| `aigit mcp <repo>` | Start the core MCP memory server for agent tools. |
| `aigit mcp <repo> --profile all` | Explicitly expose advanced MCP tools. |
| `aigit advanced` | Show secondary advanced/experimental commands. |

## Release Parity Check

Before publishing or linking a release, verify the built package surface matches the documented CLI:

```bash
npm run build --prefix context-server
npm run check:cli-package --prefix context-server
(cd context-server && npm pack --dry-run --json)
```

## MCP Setup

`aigit init` prints a config snippet. A typical MCP config looks like:

```json
{
  "mcpServers": {
    "aigit": {
      "command": "aigit",
      "args": ["mcp", "/absolute/path/to/your/repo"]
    }
  }
}
```

By default, `aigit mcp` exposes the core memory tools. Once connected, agents can hydrate context, query memory, commit memories, create tasks, and inspect active task state. Use `--profile all` only when you explicitly need advanced tools.

## Managed Agent Rules and Skills

Aigit adds a small managed block to `AGENTS.md`:

```md
<!-- AIGIT:START -->
## Aigit Memory Workflow

1. At session start, run `aigit load` then `aigit hydrate`.
2. For complex work, create or use `.aigit/tasks/<slug>.md`.
3. Save durable reasoning with `aigit commit memory "..."`.
4. Before commit, run `aigit repair ledger` and `npm run check:ledger` when available.
5. Use `aigit hydrate --full-rules` only for setup/debugging.
6. Do not manually edit or delete `.aigit/ledger.json`.
<!-- AIGIT:END -->
```

Aigit only manages content between those markers.

It also creates three optional repo-local skills:

- `aigit-context-start`
- `aigit-memory-capture`
- `aigit-release-safety`

These keep agent behavior consistent without forcing every project into a large governance template.

## Safety Model

Aigit treats `.aigit/ledger.json` as protected shared state.

Before staging ledger changes, run:

```bash
npm run check:ledger
```

Use repair mode conservatively:

```bash
aigit repair ledger
```

Use destructive cleanup only when you explicitly intend it:

```bash
aigit repair ledger --prune-noise
```

## Local-First Architecture

Aigit is local-first:

- Embedded PGlite database
- Local vector embeddings
- Git-tracked JSON ledger
- No Docker requirement
- No hosted service requirement

## Status

Aigit is best understood as a memory layer for AI-assisted development. The practical value is simple:

Your agents can stop rediscovering the same project facts every session.

## License

MIT
