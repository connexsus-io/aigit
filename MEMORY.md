# MEMORY.md - Project History & Architecture Decision Records (ADRs)

> This document acts as the living memory for the repository. Agents MUST update this file when concluding a task or making an architectural decision to avoid the "Memento" amnesia effect. It works in tandem with the Context MCP Server.

## 1. Project Directives
- **Core Mission**: Centralize and decouple AI agent state into the repository structure.
- **Current Phase**: Production hardening — performance, security, and code health across core CLI and server layers.
- **Linear Project**: [Aigit](https://linear.app/connexsus/project/aigit-a88d6a99d685) (ID: `37daa892-53ca-435b-ad1a-20436b2b7ead`)

## 2. Architecture Decision Records (ADRs)

### ADR-001: Decoupling Agent from Memory
- **Context**: Every AI session loses context, resulting in massive repetitive setup ("Context Tax").
- **Decision**: Embed the intelligence into the file system (`AGENTS.md`, `.agent/`) and use `.cursorrules`/`.windsurfrules` to redirect the LLM to read the repository.
- **Status**: Implemented.

### ADR-002: `.aigit/tasks/{task-slug}.md` Handoff API
- **Context**: Inter-agent and inter-IDEs need a standardized format to hand off tasks.
- **Decision**: Agents must create a localized `.aigit/tasks/{task-slug}.md` derived from `.agent/templates/task-template.md`. This file holds the actionable `[ ]` checklist, bridging state between tools.
- **Status**: Implemented.

### ADR-003: Vector-Backed Context Server
- **Context**: Over time, `MEMORY.md` forms a bottleneck contextually.
- **Decision**: Developed `context-server` utilizing embedded WASM PostgreSQL (`@electric-sql/pglite` + `pgvector`) instead of Docker-based Postgres. Exposes MCP endpoints (`get_project_history`, `commit_decision`) for semantic project history querying.
- **Status**: Fully operational. Zero external dependencies (local-first).

### ADR-004: Concurrent DB Query Pattern
- **Context**: Sequential `await` chains in `/api/stats`, `/api/conflicts`, `/api/gc`, and the docs generator caused unnecessary serial I/O latency.
- **Decision**: Replace all independent sequential awaits with `Promise.all(...)` across `ui.ts` and `generator.ts`. A `benchmark-ui-stats.ts` script was added to validate the improvement empirically.
- **Status**: Implemented in v1.1.9 (PRs #47, #48).

### ADR-005: Structured CLI Output Over Raw `console.log`
- **Context**: `registry.ts` and `sync.ts` were using raw `console.log` calls, bypassing the project's structured CLI output formatter (`output.ts`), making logs inconsistent and harder to filter.
- **Decision**: All CLI-facing output must route through the project-standard `output` module. `console.log` is banned for user-facing messages.
- **Status**: Implemented in v1.1.9 (PRs #44, #46).

### ADR-006: Input Validation & XSS Hardening
- **Context**: The feedback API lacked input length limits; the Graph renderer was vulnerable to XSS via unsanitized user data injected into SVG/HTML.
- **Decision**: Add Zod-based length constraints to the feedback API (PR #43). Sanitize all user-controlled strings before DOM injection in Graph rendering (PRs #41, #42).
- **Status**: Implemented in v1.1.9.

## 3. Rejected Approaches
- **Relying Solely on Custom Instructions in UI**: Rejected because it fragments the identity across Cursor, Windsurf, Cline, and other interfaces. Repository must be the single source of truth.
- **Docker-based Postgres for Local Dev**: Rejected in favour of `@electric-sql/pglite` (WASM Postgres) — zero external dependencies, no Docker required, `pgvector` still supported.

## 4. Release History

### v1.1.9 — 2026-04-01
- **perf**: Parallelized DB queries with `Promise.all` across UI API endpoints and docs generator (PRs #47, #48)
- **fix**: Replaced `console.log` with structured `output` formatter in `registry.ts` and `sync.ts` (PRs #44, #46)
- **security**: Fixed HIGH XSS vulnerability in Graph renderer (PRs #41, #42)
- **security**: Added input validation + length limits to feedback API (PR #43)
- **a11y**: Added ARIA labels and `aria-live` to Search Input (PR #49)
- **chore**: Removed stale `context-server-1.0.0.tgz` pack artifact

### v1.1.8 — Previous release baseline
