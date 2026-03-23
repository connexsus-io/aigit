# Semantic Dependency Graph

This graph shows the relationships between files in your project, combining both code imports and AI semantic links (Memories & Decisions).

```mermaid
flowchart LR
  F0["benchmarkTimeTravel.ts"]
  F1["conflicts.ts"]
  F2["migration.ts"]
  F3["parsers.test.ts"]
  F4["storyteller.test.ts"]
  F5["storyteller.ts"]
  F6["sync.ts"]
  F7["fallback.ts"]
  F8["resolver.ts"]
  F9["benchmark_merge.ts"]
  F10["anchor.ts"]
  F11["bisect.test.ts"]
  F12["bisect.ts"]
  F13["branch.ts"]
  F14["ci.test.ts"]
  F15["ci.ts"]
  F16["commit.ts"]
  F17["deps-graph.ts"]
  F18["deps.ts"]
  F19["docs.ts"]
  F20["gc.ts"]
  F21["handoff.ts"]
  F22["heal.ts"]
  F23["history.ts"]
  F24["hydrate.ts"]
  F25["init.ts"]
  F26["note.ts"]
  F27["query.ts"]
  F28["replay.ts"]
  F29["resolve.test.ts"]
  F4 --> F5
  F6 --> F1
  F8 --> F7
  F10 --> F8
  F11 --> F12
  F14 --> F15
  F28 --> F5

```

> Note: Nodes indicate the number of Memories (M) and Decisions (D) linked to each file.
