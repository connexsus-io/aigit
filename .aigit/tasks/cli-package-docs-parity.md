# Task: CLI Package Docs Parity
> **Agent Assigned**: backend-specialist
> **Status**: DONE

## 1. Context & Objective
The documented CLI surface must match the built and packaged `aigit-core` binary. A previous installed `aigit` binary rejected `doctor` even though the source and README documented it, so releases need a package-level parity check rather than source-only tests.

## 2. Requirements & Constraints
- Verify the built CLI help exposes documented default workflow commands.
- Verify documented core commands are present in packaged CLI help.
- Verify advanced commands remain hidden from default help and listed by `aigit advanced`.
- Verify `npm pack --dry-run` includes the built CLI entrypoint.
- Keep ledger safety checks intact.

## 3. Implementation Plan (Checklist)

- [x] Add package parity script for built CLI and pack file checks.
- [x] Wire package parity into package scripts and GitHub Actions.
- [x] Strengthen CLI help tests for documented default commands.
- [x] Document the release parity check in both READMEs.
- [x] Run build, tests, pack dry-run, and ledger guard.

## 4. Verification
- `npm run build --prefix context-server`
- `node context-server/dist/cli/index.js --help`
- `node context-server/dist/cli/index.js doctor --json`
- `npm test --prefix context-server -- src/cli/index.test.ts src/cli/advancedHelp.test.ts`
- `npm run check:cli-package --prefix context-server`
- `(cd context-server && npm pack --dry-run --json)`
- `npm run check:ledger`

## 5. Handoff Notes / Blockers
- `npm ci --prefix context-server` needs a writable npm cache. In this workspace, the global cache was root-owned, so verification used `--cache .context/npm-cache`.
- With npm 11.12.0, `npm pack --dry-run --json --prefix context-server` packed the repo root; use `(cd context-server && npm pack --dry-run --json)`.
