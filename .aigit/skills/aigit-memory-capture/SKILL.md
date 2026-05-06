---
name: aigit-memory-capture
description: Capture only durable reasoning, decisions, constraints, and handoff context in Aigit memory.
---

# aigit-memory-capture

Use during implementation when context should survive the current chat.

Save:
- architectural decisions and tradeoffs
- constraints that future agents must preserve
- failed approaches that would waste time if repeated
- file ownership or task handoff notes

Avoid saving raw diffs, obvious status updates, or noisy summaries that can be recovered from Git.
