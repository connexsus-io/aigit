import fs from 'fs';
import path from 'path';

export function installGitHook(workspacePath: string) {
    const hooksDir = path.join(workspacePath, '.git', 'hooks');

    if (!fs.existsSync(hooksDir)) {
        console.error('⚠️  No .git/hooks directory found. Is this a Git repository? Please initialize git first.');
        return;
    }

    // 1. post-checkout hook (Runs after git checkout)
    const postCheckoutPath = path.join(hooksDir, 'post-checkout');
    const postCheckoutContent = `#!/bin/sh
# aigit post-checkout hook
# Restores local agent memory from the Git-tracked ledger when switching branches.

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "[aigit] Memory shifted to branch: $BRANCH"

npx --no-install aigit load || npx --no-install aigit load || true
`;

    // 2. post-merge hook (Runs after git pull / git merge)
    const postMergePath = path.join(hooksDir, 'post-merge');
    const postMergeContent = `#!/bin/sh
# aigit post-merge hook
# Restores local agent memory after pulling updates from remote.

echo "[aigit] Loading Git-tracked memory ledger..."

npx --no-install aigit load || npx --no-install aigit load || true
`;

    // 3. pre-commit hook (Runs before git commit)
    const preCommitPath = path.join(hooksDir, 'pre-commit');
    const preCommitContent = `#!/bin/sh
# aigit pre-commit hook
# Verifies semantic memory requirements, then serializes memory into the Git-tracked ledger before committing.

echo "[aigit] Checking semantic memory for staged files..."
if ! npx --no-install aigit commit staged; then
    exit 1
fi

echo "[aigit] Serializing active memory into ledger.json..."
npx --no-install aigit dump || npx --no-install aigit dump || true

# Automatically stage the updated ledger if it exists
if [ -f .aigit/ledger.json ]; then
    git add .aigit/ledger.json
fi
`;

    const postCommitPath = path.join(hooksDir, 'post-commit');
    const prePushPath = path.join(hooksDir, 'pre-push');

    try {
        fs.writeFileSync(postCheckoutPath, postCheckoutContent, { mode: 0o755 });
        fs.writeFileSync(postMergePath, postMergeContent, { mode: 0o755 });
        fs.writeFileSync(preCommitPath, preCommitContent, { mode: 0o755 });

        // Remove legacy post-commit hook if it exists to fix the infinite dirtiness loop
        if (fs.existsSync(postCommitPath)) {
            fs.unlinkSync(postCommitPath);
        }

        // Remove legacy aigit pre-push hooks that ran broad automation by default.
        if (fs.existsSync(prePushPath)) {
            const prePushContent = fs.readFileSync(prePushPath, 'utf8');
            if (prePushContent.includes('aigit pre-push hook') || prePushContent.includes('aigit heal')) {
                fs.unlinkSync(prePushPath);
            }
        }

        console.log(`✅ [aigit] Git hooks successfully installed at .git/hooks (post-checkout, post-merge, pre-commit)`);

        // Ensure .aigit is ignored properly, but track ledger.json
        const gitignorePath = path.join(workspacePath, '.gitignore');
        const ignoreEntries = ['\n# aigit local database', '.aigit/memory.db*', '!.aigit/ledger.json', ''];

        let shouldAppendIgnore = true;
        if (fs.existsSync(gitignorePath)) {
            const ignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            if (ignoreContent.includes('.aigit/memory.db')) {
                shouldAppendIgnore = false;
            }
        }

        if (shouldAppendIgnore) {
            fs.appendFileSync(gitignorePath, ignoreEntries.join('\n'), 'utf8');
            console.log(`✅ [aigit] Updated .gitignore to exclude local PGlite binaries but keep ledger.json tracked.`);
        }

    } catch (error) {
        console.error('❌ Failed to install Git hooks:', error);
    }
}
