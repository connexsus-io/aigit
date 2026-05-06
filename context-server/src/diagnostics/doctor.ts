import fs from 'fs';
import path from 'path';
import { detectAgents } from '../agents/registry';
import { ensureDefaultAigitSkills, getDefaultAigitSkillStatuses } from '../agents/defaultSkills';
import { getManagedAgentsBlockStatus, installManagedAgentsBlock, ManagedAgentsBlockStatus } from '../agents/rules';
import { getActiveBranch } from '../cli/git';
import { analyzeLedgerQuality, repairLedger } from '../repair/ledger';

export type DoctorStatus = 'healthy' | 'needs_attention' | 'error';
export type DoctorIssueSeverity = 'warning' | 'error';

export interface DoctorIssue {
    severity: DoctorIssueSeverity;
    message: string;
}

export interface DoctorReport {
    workspacePath: string;
    currentBranch: string;
    status: DoctorStatus;
    summary: {
        ok: number;
        warnings: number;
        errors: number;
    };
    fixesApplied: string[];
    checks: {
        aigit: {
            dirExists: boolean;
            tasksDirExists: boolean;
            memoryDbExists: boolean;
        };
        ledger: {
            exists: boolean;
            parseable: boolean;
            nullEmbeddings: number;
            noisyMemories: number;
            taskDrift: number;
        };
        hooks: {
            installed: string[];
            missing: string[];
        };
        agents: {
            detected: string[];
            mcpHint: string;
        };
        agentsRules: {
            status: ManagedAgentsBlockStatus;
        };
        skills: {
            present: string[];
            missing: string[];
        };
    };
    issues: DoctorIssue[];
}

export interface DoctorOptions {
    fix?: boolean;
}

const REQUIRED_HOOKS = ['pre-commit', 'post-checkout', 'post-merge'];

function hookDirectory(workspacePath: string): string | null {
    const gitPath = path.join(workspacePath, '.git');
    if (fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory()) {
        return path.join(gitPath, 'hooks');
    }
    if (fs.existsSync(gitPath) && fs.statSync(gitPath).isFile()) {
        const content = fs.readFileSync(gitPath, 'utf8').trim();
        const match = content.match(/^gitdir:\s*(.+)$/);
        if (!match) return null;
        const gitDir = path.isAbsolute(match[1])
            ? match[1]
            : path.resolve(workspacePath, match[1]);
        return path.join(gitDir, 'hooks');
    }
    return null;
}

function checkHooks(workspacePath: string): { installed: string[]; missing: string[] } {
    const hooksDir = hookDirectory(workspacePath);
    if (!hooksDir) return { installed: [], missing: REQUIRED_HOOKS };

    const installed: string[] = [];
    const missing: string[] = [];
    for (const hook of REQUIRED_HOOKS) {
        if (fs.existsSync(path.join(hooksDir, hook))) {
            installed.push(hook);
        } else {
            missing.push(hook);
        }
    }
    return { installed, missing };
}

function statusFromIssues(issues: DoctorIssue[]): DoctorStatus {
    if (issues.some(issue => issue.severity === 'error')) return 'error';
    if (issues.length > 0) return 'needs_attention';
    return 'healthy';
}

function summarizeIssues(issues: DoctorIssue[]): { ok: number; warnings: number; errors: number } {
    const warnings = issues.filter(issue => issue.severity === 'warning').length;
    const errors = issues.filter(issue => issue.severity === 'error').length;
    return { ok: Math.max(0, 8 - warnings - errors), warnings, errors };
}

function pushIssue(issues: DoctorIssue[], severity: DoctorIssueSeverity, message: string): void {
    issues.push({ severity, message });
}

export async function buildDoctorReport(
    workspacePath: string,
    options: DoctorOptions = {}
): Promise<DoctorReport> {
    const fixesApplied: string[] = [];
    const aigitDir = path.join(workspacePath, '.aigit');
    const tasksDir = path.join(aigitDir, 'tasks');

    if (options.fix) {
        fs.mkdirSync(tasksDir, { recursive: true });
        fixesApplied.push('ensured-tasks-directory');

        const agentsResult = installManagedAgentsBlock(workspacePath);
        if (agentsResult.action !== 'current') fixesApplied.push('installed-managed-agents-block');

        const skillsResult = ensureDefaultAigitSkills(workspacePath);
        if (skillsResult.created.length > 0) fixesApplied.push('created-default-aigit-skills');

        if (fs.existsSync(path.join(aigitDir, 'ledger.json'))) {
            await repairLedger(workspacePath, {});
            fixesApplied.push('repaired-ledger');
        }
    }

    const currentBranch = getActiveBranch(workspacePath);
    const agentsRules = getManagedAgentsBlockStatus(workspacePath);
    const skills = getDefaultAigitSkillStatuses(workspacePath);
    const ledgerQuality = await analyzeLedgerQuality(workspacePath);
    const hooks = checkHooks(workspacePath);
    const detectedAgents = detectAgents(workspacePath).map(agent => agent.tool.name);

    const checks: DoctorReport['checks'] = {
        aigit: {
            dirExists: fs.existsSync(aigitDir),
            tasksDirExists: fs.existsSync(tasksDir),
            memoryDbExists: fs.existsSync(path.join(aigitDir, 'memory.db')),
        },
        ledger: {
            exists: ledgerQuality.exists,
            parseable: ledgerQuality.parseable,
            nullEmbeddings: ledgerQuality.nullEmbeddings,
            noisyMemories: ledgerQuality.noisyMemories,
            taskDrift: ledgerQuality.staleTaskFiles.length,
        },
        hooks,
        agents: {
            detected: detectedAgents,
            mcpHint: `Configure MCP with \`aigit mcp ${workspacePath}\`.`,
        },
        agentsRules: {
            status: agentsRules.status,
        },
        skills,
    };

    const issues: DoctorIssue[] = [];
    if (!checks.aigit.dirExists) pushIssue(issues, 'error', '.aigit directory is missing.');
    if (!checks.aigit.tasksDirExists) pushIssue(issues, 'warning', '.aigit/tasks directory is missing.');
    if (!checks.aigit.memoryDbExists) pushIssue(issues, 'warning', '.aigit/memory.db is missing; run aigit init or aigit load.');
    if (!checks.ledger.exists) pushIssue(issues, 'warning', '.aigit/ledger.json is missing.');
    if (checks.ledger.exists && !checks.ledger.parseable) pushIssue(issues, 'error', '.aigit/ledger.json is not valid JSON.');
    if (checks.ledger.nullEmbeddings > 0) pushIssue(issues, 'warning', `${checks.ledger.nullEmbeddings} ledger entries have missing embeddings.`);
    if (checks.ledger.noisyMemories > 0) pushIssue(issues, 'warning', `${checks.ledger.noisyMemories} noisy automatic Git memories found.`);
    if (checks.ledger.taskDrift > 0) pushIssue(issues, 'warning', `${checks.ledger.taskDrift} task markdown file(s) drift from ledger status.`);
    if (checks.hooks.missing.length > 0) pushIssue(issues, 'warning', `Missing Git hooks: ${checks.hooks.missing.join(', ')}.`);
    if (checks.agentsRules.status !== 'current') pushIssue(issues, 'warning', `Aigit AGENTS block is ${checks.agentsRules.status}.`);
    if (checks.skills.missing.length > 0) pushIssue(issues, 'warning', `${checks.skills.missing.length} default Aigit skill(s) missing.`);

    return {
        workspacePath,
        currentBranch,
        status: statusFromIssues(issues),
        summary: summarizeIssues(issues),
        fixesApplied,
        checks,
        issues,
    };
}
