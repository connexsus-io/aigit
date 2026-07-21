🚨 Severity: CRITICAL
💡 Vulnerability: The task file generation in `context-server/src/cli/taskFiles.ts` used un-sanitized user input (`slug`) to construct file paths via `path.join()`. This allowed path traversal (e.g., passing `../../etc/passwd` as a slug), potentially enabling arbitrary file overwrites or creation outside the intended `.aigit/tasks` directory.
🎯 Impact: Attackers or malicious inputs could overwrite arbitrary files or create sensitive system files outside of the intended workspace subdirectory, leading to code execution or data corruption.
🔧 Fix: Sanitized the `slug` variable in `getTaskFilePath` using `path.basename(slug)` to ensure that any directory paths are stripped out, confining file generation strictly to the `.aigit/tasks` directory.
✅ Verification: Ran unit tests via `cd context-server && pnpm test` to ensure task file generation functions properly and the test suite passes. Also documented the learning in `.jules/sentinel.md`.
