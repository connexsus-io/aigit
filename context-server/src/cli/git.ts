import { execFileSync, execSync } from 'child_process';

function runGit(workspacePath: string, args: string[]): string | null {
    try {
        return execFileSync('git', args, {
            cwd: workspacePath,
            encoding: 'utf-8',
            stdio: 'pipe',
        }).trim();
    } catch {
        return null;
    }
}

function parsePointingBranches(output: string | null): string[] {
    if (!output) return [];
    return output
        .split('\n')
        .map(branch => branch.trim())
        .filter(branch => branch.length > 0 && branch !== 'HEAD');
}

export function getActiveBranch(workspacePath: string): string {
    const branch = runGit(workspacePath, ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (branch && branch !== 'HEAD') return branch;

    const symbolicBranch = runGit(workspacePath, ['symbolic-ref', '--short', 'HEAD']);
    if (symbolicBranch && symbolicBranch !== 'HEAD') return symbolicBranch;

    const exactBranches = parsePointingBranches(
        runGit(workspacePath, ['branch', '--format=%(refname:short)', '--points-at', 'HEAD'])
    );
    if (exactBranches.length === 1) return exactBranches[0];

    const shortSha = runGit(workspacePath, ['rev-parse', '--short', 'HEAD']);
    if (shortSha) return `detached:${shortSha}`;

    return 'unknown';
}

export function getChangedFiles(workspacePath: string): string[] {
    try {
        const diff = execFileSync('git', ['diff', '--name-only', 'HEAD'], { 
            cwd: workspacePath, 
            encoding: 'utf-8', 
            stdio: 'pipe' 
        });
        return diff.split('\n').filter(Boolean);
    } catch (e) {
        return [];
    }
}
