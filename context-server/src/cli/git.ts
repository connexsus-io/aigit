import { execFileSync, execSync } from 'child_process';

export function getActiveBranch(workspacePath: string): string {
    try {
        // First try the standard approach
        return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { 
            cwd: workspacePath, 
            encoding: 'utf-8', 
            stdio: 'pipe' 
        }).trim();
    } catch (e) {
        // If that fails, try alternative approaches
        try {
            // Try getting branch from symbolic-ref
            const branch = execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], { 
                cwd: workspacePath, 
                encoding: 'utf-8', 
                stdio: 'pipe' 
            }).trim();
            if (branch) return branch;
        } catch (e2) {
            // Try getting branch from refs
            try {
                const branchOutput = execFileSync('git', ['for-each-ref', '--format=%(refname:short)', '--contains', 'HEAD'], { 
                    cwd: workspacePath, 
                    encoding: 'utf-8', 
                    stdio: 'pipe' 
                }).trim();
                const branches = branchOutput.split('\n').filter(b => b.trim() !== '');
                if (branches.length === 1) {
                    return branches[0];
                }
            } catch (e3) {
                // fallback to next block
            }
            // Final fallback: try to get any branch info
            try {
                const branchOutput = execFileSync('git', ['branch', '--show-current'], {
                    cwd: workspacePath,
                    encoding: 'utf-8',
                    stdio: 'pipe'
                }).trim();
                if (branchOutput) return branchOutput;
            } catch (e4) {
                // If all else fails, return unknown
                return 'unknown';
            }
        }
        return 'unknown';
    }
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