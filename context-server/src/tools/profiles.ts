/**
 * MCP Server tool profiles.
 *
 * Splitting tools into focused subsets improves LLM routing accuracy.
 * Default (no --profile flag) exposes the core memory workflow.
 * Use --profile all to preserve old full-tool exposure.
 *
 * Usage (claude_desktop_config.json):
 *   "args": ["mcp"]
 *   "args": ["mcp", "--profile", "all"]
 *   "args": ["mcp", "--profile", "swarm"]
 *   "args": ["mcp", "--profile", "ops"]
 */

export type ProfileName = 'core' | 'swarm' | 'ops' | 'all';

const DEFAULT_PROFILE: ProfileName = 'core';

/**
 * Core — Semantic memory, context hydration, AST anchoring.
 * Best for: general coding agents, context handoffs, query workflows.
 */
const CORE_TOOLS = [
    'get_project_history',
    'get_active_task_state',
    'commit_memory',
    'commit_decision',
    'commit_task',
    'take_note',
    'get_hydrated_context',
    'query_context',
    'query_historical',
    'get_symbol_context',
    'list_symbols',
    'anchor_file',
    'revert_context',
] as const;

/**
 * Swarm — Multi-agent coordination, messaging, conflict resolution.
 * Best for: orchestration agents, parallel workstreams.
 */
const SWARM_TOOLS = [
    'create_swarm',
    'register_agent',
    'unregister_agent',
    'update_agent_status',
    'get_swarm_status',
    'publish_message',
    'poll_messages',
    'report_conflict',
    'resolve_conflict',
    'check_conflicts',
    'merge_context',
    'scan_agents',
] as const;

/**
 * Ops — Self-healing, security auditing, dependency analysis, docs.
 * Best for: CI/CD agents, security reviewers, maintainers.
 */
const OPS_TOOLS = [
    'diagnose_test_failure',
    'get_healing_plan',
    'execute_healing',
    'get_healing_history',
    'audit_dependencies',
    'audit_semantic_decisions',
    'flag_vulnerability',
    'generate_architecture_docs',
] as const;

const PROFILE_MAP: Record<Exclude<ProfileName, 'all'>, ReadonlyArray<string>> = {
    core: CORE_TOOLS,
    swarm: SWARM_TOOLS,
    ops: OPS_TOOLS,
};

const VALID_PROFILES = new Set<ProfileName>(['core', 'swarm', 'ops', 'all']);

/**
 * Resolve --profile from process.argv.
 * Falls back to the memory-first core profile if not specified or unrecognized.
 */
export function resolveProfile(): ProfileName {
    const idx = process.argv.indexOf('--profile');
    if (idx === -1) return DEFAULT_PROFILE;
    const value = process.argv[idx + 1];
    if (value && VALID_PROFILES.has(value as ProfileName)) return value as ProfileName;
    return DEFAULT_PROFILE;
}

/**
 * Filter tool schemas to only those included in the active profile.
 */
export function filterByProfile<T extends { name: string }>(
    schemas: ReadonlyArray<T>,
    profile: ProfileName
): T[] {
    if (profile === 'all') return [...schemas];
    const allowed = new Set<string>(PROFILE_MAP[profile]);
    return schemas.filter(s => allowed.has(s.name));
}
