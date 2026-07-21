import fs from 'fs';
import path from 'path';

const TASK_STATUS_PATTERN = /(\*\*Status\*\*:\s*)([A-Z_]+)/;

export interface TaskFileUpdateResult {
    status: 'updated' | 'unchanged' | 'missing' | 'unparseable';
    filePath: string;
    previousStatus?: string;
}

export interface TaskPlanInput {
    id: string;
    title: string;
    slug: string;
    gitBranch: string;
    status: string;
}

export function getTaskFilePath(workspacePath: string, slug: string): string {
    const safeSlug = path.basename(slug);
    return path.join(workspacePath, '.aigit', 'tasks', `${safeSlug}.md`);
}

export function readTaskFileStatus(workspacePath: string, slug: string): string | null {
    const filePath = getTaskFilePath(workspacePath, slug);
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(TASK_STATUS_PATTERN);
    return match?.[2] ?? null;
}

export function updateTaskFileStatus(workspacePath: string, slug: string, status: string): TaskFileUpdateResult {
    const filePath = getTaskFilePath(workspacePath, slug);
    if (!fs.existsSync(filePath)) {
        return { status: 'missing', filePath };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(TASK_STATUS_PATTERN);
    if (!match) {
        return { status: 'unparseable', filePath };
    }

    const previousStatus = match[2];
    if (previousStatus === status) {
        return { status: 'unchanged', filePath, previousStatus };
    }

    const updated = content.replace(TASK_STATUS_PATTERN, `$1${status}`);
    fs.writeFileSync(filePath, updated, 'utf8');
    return { status: 'updated', filePath, previousStatus };
}

export function createTaskPlanFile(workspacePath: string, task: TaskPlanInput): string {
    const tasksDir = path.join(workspacePath, '.aigit', 'tasks');
    if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });

    const filePath = getTaskFilePath(workspacePath, task.slug);
    const content = `# ${task.title}

> **Status**: ${task.status} | **Branch**: ${task.gitBranch} | **ID**: ${task.id}

## Objective

<!-- What does this task accomplish? What is the success criterion? -->

## Sub-tasks

- [ ] Sub-task 1
- [ ] Sub-task 2

## Notes

<!-- Agent handoff notes go here -->
`;

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
}
