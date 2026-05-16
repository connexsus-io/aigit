import { describe, expect, it } from 'vitest';

import { parseCoreCommandSpecs } from './packageParity';

describe('package parity README command parsing', () => {
    it('preserves documented nested command paths', () => {
        const markdown = `
## Core Commands

| Command | Purpose |
| --- | --- |
| \`aigit doctor --fix\` | Apply fixes. |
| \`aigit commit task "..."\` | Create a tracked task. |
| \`aigit update task <slug> DONE\` | Update task status. |
| \`aigit repair ledger --prune-noise --fix-task-files\` | Repair ledger metadata. |
| \`aigit mcp <repo> --profile all\` | Start the MCP server. |

## Other Section
`;

        expect(parseCoreCommandSpecs(markdown, 'README.md')).toEqual([
            { displayName: 'doctor', helpArgs: ['doctor', '--help'] },
            { displayName: 'commit task', helpArgs: ['commit', 'task', '--help'] },
            { displayName: 'update task', helpArgs: ['update', 'task', '--help'] },
            { displayName: 'repair ledger', helpArgs: ['repair', 'ledger', '--help'] },
            { displayName: 'mcp', helpArgs: ['mcp', '--help'] },
        ]);
    });
});
