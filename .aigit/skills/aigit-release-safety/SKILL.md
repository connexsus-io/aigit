---
name: aigit-release-safety
description: Run Aigit memory and ledger checks before committing, merging, or handing work off.
---

# aigit-release-safety

Use before committing, merging, or handing work to another agent.

1. Run `aigit repair ledger` to backfill safe memory metadata and report drift.
2. Run `npm run check:ledger` when available before staging `.aigit/ledger.json`.
3. Run `aigit check-conflicts main` before merging branch context.
4. Record the final architectural summary with `aigit commit memory "..."`.
