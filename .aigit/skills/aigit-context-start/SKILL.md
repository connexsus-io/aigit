---
name: aigit-context-start
description: Start an agent session by loading Git-tracked Aigit memory and hydrating focused branch context.
---

# aigit-context-start

Use at the beginning of an AI coding session.

1. Run `aigit load` to restore `.aigit/ledger.json` into the local memory DB.
2. Run `aigit hydrate` for focused branch-aware context.
3. Check active task state with `aigit status` or `aigit handoff <slug>` when a task is known.
4. Use `aigit hydrate --full-rules` only when debugging setup or rule-file ingestion.
