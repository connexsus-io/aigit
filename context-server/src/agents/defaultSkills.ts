import fs from 'fs';
import path from 'path';

export interface DefaultAigitSkill {
    name: string;
    description: string;
    content: string;
}

export interface DefaultSkillInstallResult {
    created: DefaultAigitSkill[];
    existing: DefaultAigitSkill[];
}

export interface DefaultSkillStatus {
    present: string[];
    missing: string[];
}

function skillContent(name: string, description: string, body: string): string {
    return `---
name: ${name}
description: ${description}
---

# ${name}

${body}
`;
}

export const DEFAULT_AIGIT_SKILLS: DefaultAigitSkill[] = [
    {
        name: 'aigit-context-start',
        description: 'Start an agent session by loading Git-tracked Aigit memory and hydrating focused branch context.',
        content: skillContent(
            'aigit-context-start',
            'Start an agent session by loading Git-tracked Aigit memory and hydrating focused branch context.',
            `Use at the beginning of an AI coding session.

1. Run \`aigit load\` to restore \`.aigit/ledger.json\` into the local memory DB.
2. Run \`aigit hydrate\` for focused branch-aware context.
3. Check active task state with \`aigit status\` or \`aigit handoff <slug>\` when a task is known.
4. Use \`aigit hydrate --full-rules\` only when debugging setup or rule-file ingestion.`
        ),
    },
    {
        name: 'aigit-memory-capture',
        description: 'Capture only durable reasoning, decisions, constraints, and handoff context in Aigit memory.',
        content: skillContent(
            'aigit-memory-capture',
            'Capture only durable reasoning, decisions, constraints, and handoff context in Aigit memory.',
            `Use during implementation when context should survive the current chat.

Save:
- architectural decisions and tradeoffs
- constraints that future agents must preserve
- failed approaches that would waste time if repeated
- file ownership or task handoff notes

Avoid saving raw diffs, obvious status updates, or noisy summaries that can be recovered from Git.`
        ),
    },
    {
        name: 'aigit-release-safety',
        description: 'Run Aigit memory and ledger checks before committing, merging, or handing work off.',
        content: skillContent(
            'aigit-release-safety',
            'Run Aigit memory and ledger checks before committing, merging, or handing work off.',
            `Use before committing, merging, or handing work to another agent.

1. Run \`aigit repair ledger\` to backfill safe memory metadata and report drift.
2. Run \`npm run check:ledger\` when available before staging \`.aigit/ledger.json\`.
3. Run \`aigit check-conflicts main\` before merging branch context.
4. Record the final architectural summary with \`aigit commit memory "..."\`.`
        ),
    },
];

function skillFilePath(workspacePath: string, skillName: string): string {
    return path.join(workspacePath, '.aigit', 'skills', skillName, 'SKILL.md');
}

export function getDefaultAigitSkillStatuses(workspacePath: string): DefaultSkillStatus {
    const present: string[] = [];
    const missing: string[] = [];

    for (const skill of DEFAULT_AIGIT_SKILLS) {
        if (fs.existsSync(skillFilePath(workspacePath, skill.name))) {
            present.push(skill.name);
        } else {
            missing.push(skill.name);
        }
    }

    return { present, missing };
}

export function ensureDefaultAigitSkills(workspacePath: string): DefaultSkillInstallResult {
    const created: DefaultAigitSkill[] = [];
    const existing: DefaultAigitSkill[] = [];

    for (const skill of DEFAULT_AIGIT_SKILLS) {
        const filePath = skillFilePath(workspacePath, skill.name);
        if (fs.existsSync(filePath)) {
            existing.push(skill);
            continue;
        }

        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, skill.content, 'utf8');
        created.push(skill);
    }

    return { created, existing };
}
