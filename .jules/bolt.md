## 2024-04-24 - Cross-Branch Conflict Resolution O(N*M)
**Learning:** During cross-branch context merge, matching target decisions against current branch decisions using `filePath` AND `symbolName` triggered an O(N*M) overlapping matches problem when relying on separate `Map` lookups (which found the Cartesian product of all files/symbols rather than exact composite matches).
**Action:** Always pre-group cross-dimensional data (like files and symbols) using an exact composite key (`${filePath}::${symbolName}`) in a `Map`, while preserving single-attribute fallback Maps to gracefully handle partial matches.
## 2024-03-20 - Time Travel Enrichment Reverted
**Learning:** In V8/Node, trying to manually map an array inside a loop (with type casting) instead of just using the spread operator and a subsequent `new Map(arr.map(...))` was demonstrably slower in benchmark runs (203ms vs 187ms baseline). The overhead of multiple `push` and `set` calls in a single loop exceeded the overhead of array copies for small data sets.
**Action:** When mapping arrays into `Map` structures, prefer bulk Map constructors over manual loops unless the array is excessively large or there are secondary operations. Always trust the benchmark over theoretical O(n) vs O(2n) optimizations when constant factors dominate.

## 2024-03-20 - Batch Operations O(N*M)
**Learning:** Filtering a large array of relations (decisions) inside a loop of entities (tasks) caused severe performance degradation ($O(N \times M)$) during merge operations.
**Action:** Always pre-group one-to-many relationships into a Map before iterating over the parent entities. This reduces complexity to $O(N+M)$ and provides massive speedups (2050ms -> 365ms in benchmarks).

## 2024-03-24 - ts-morph Project Re-instantiation Bottleneck
**Learning:** Instantiating a new `Project` from `ts-morph` per file in a loop (e.g., during drift detection where `extractAllSymbols` is called for every database memory) caused immense latency (e.g. ~50s for 50 records). The overhead of initializing the TypeScript compiler wrapper repeatedly is massive (~10-20ms per file).
**Action:** Always cache and reuse the `Project` instance at the module level when performing batch AST parsing. Use `project.getSourceFile(path) || project.addSourceFileAtPath(path)` and optionally `sourceFile.refreshFromFileSystemSync()` to ensure data freshness without the compiler initialization penalty, reducing 50 parses from 50s down to ~15ms.

## 2024-04-04 - Database Aggregation Overhead
**Learning:** Fetching all records into memory using `findMany` solely to aggregate counts (e.g., counting memories/decisions per agent) incurs massive Node.js memory footprint and computational overhead.
**Action:** Always use Prisma's native `groupBy` capabilities to let the database handle aggregation. Also, parallelize independent database queries (like stats counters) using `Promise.all` to minimize latency by overlapping I/O-bound operations.

## 2024-03-25 - GroupBy Query Aggregation
**Learning:** When trying to build aggregate statistics for agents, using `findMany` followed by a JS array map and group adds a substantial performance hit and memory load in the app server, scaling with $O(N)$. Furthermore, when counting rows in Prisma where certain fields may be nullable, counting by the specific field ignores null rows (changing behavior).
**Action:** Always utilize Prisma's native `groupBy` functionality paired with `_count: { _all: true }` to offload aggregation $O(N)$ calculations to the underlying engine. Mocking these appropriately requires inspecting the `args.by[0]` parameter.

## 2024-04-05 - File-Based Filtering O(N*M)
**Learning:** During Markdown architecture generation, filtering a large array of `memories` and `decisions` by `filePath` inside a loop iterating over all unique files caused severe performance degradation ($O(N \times F)$ where F is the number of files). The same occurred inside the Mermaid graph generation.
**Action:** Pre-group memories and decisions by `filePath` into a `Map` prior to iterating. This shifts complexity to $O(N)$ and yields major speedups (e.g. 640ms -> 240ms for Markdown generation; effectively instantaneous for Mermaid).

## 2024-04-06 - Prisma UpdateMany vs Transactions
**Learning:** Performing multiple individual `prisma.model.update` calls mapped from a list of objects inside a `$transaction` arrays resolves synchronously, triggering an N+1 query overhead in Prisma and the DB.
**Action:** When updating multiple records with identical data (like updating `symbolName` for multiple memories/decisions mapping to the same AST symbol), group the IDs by their shared update data and use `prisma.model.updateMany({ where: { id: { in: ids } } })` inside `Promise.all` to batch the operations and minimize latency.

## 2024-04-10 - Task Insertion N+1 Issue
**Learning:** During cross-branch merge, inserting tasks sequentially in a `for` loop, then their decisions, caused massive N+1 delays. Since `uuid` is mapped in Prisma schema natively, we can pre-generate IDs and use `createMany` bulk operations instead of sequential `create`.
**Action:** Always prefer bulk insertions using `createMany` over `create` inside loops, generating IDs proactively if the schema natively relies on them.

## 2024-04-19 - Redundant DB Queries During Data Merge
**Learning:** In the `merge_context` handler, we were executing `Promise.all` to fetch `targetMemories` and `targetTasks` up-front, but then ignoring these values and sequentially awaiting `prisma.memory.findMany` and `prisma.task.findMany` again for the same target branch inside the processing loops. This caused unnecessary I/O bounds and blocked the event loop during merges.
**Action:** When data is pre-fetched via `Promise.all` for a specific entity or branch, always utilize the pre-fetched objects (e.g. `new Set(targetMemories.map(m => m.content))`) rather than performing redundant queries.

## 2024-05-15 - Redundant I/O and Parsing in Drift Detection
**Learning:** During drift detection, iterating over all memories and decisions and individually calling `fs.existsSync` and `extractAllSymbols` for each record's anchored file results in massive redundant disk I/O and AST parsing. Multiple records often anchor to the exact same file, causing the expensive extraction process to run repeatedly for the same source file.
**Action:** When performing batch verifications or diagnostics over records that reference files, always implement a file-level cache (e.g., using `Map`) for file existence checks and parsed AST symbols to avoid O(N) repetitive operations.
