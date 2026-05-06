import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readTaskFileStatus, updateTaskFileStatus } from './taskFiles';

describe('task file helpers', () => {
    let workspacePath: string;

    beforeEach(() => {
        workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigit-task-files-'));
        fs.mkdirSync(path.join(workspacePath, '.aigit', 'tasks'), { recursive: true });
    });

    afterEach(() => {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    });

    it('reads task status from the task markdown metadata line', () => {
        fs.writeFileSync(
            path.join(workspacePath, '.aigit', 'tasks', 'example.md'),
            '# Example\n\n> **Status**: IN_PROGRESS | **Branch**: main\n'
        );

        expect(readTaskFileStatus(workspacePath, 'example')).toBe('IN_PROGRESS');
    });

    it('updates the first task status marker without changing the rest of the file', () => {
        const taskPath = path.join(workspacePath, '.aigit', 'tasks', 'example.md');
        fs.writeFileSync(taskPath, '# Example\n\n> **Status**: PLANNING | **Branch**: main\n\nBody\n');

        const result = updateTaskFileStatus(workspacePath, 'example', 'DONE');
        const content = fs.readFileSync(taskPath, 'utf8');

        expect(result).toEqual({ status: 'updated', filePath: taskPath, previousStatus: 'PLANNING' });
        expect(content).toContain('**Status**: DONE');
        expect(content).toContain('Body');
    });

    it('reports missing task files without creating one during status updates', () => {
        expect(updateTaskFileStatus(workspacePath, 'missing', 'DONE')).toEqual({
            status: 'missing',
            filePath: path.join(workspacePath, '.aigit', 'tasks', 'missing.md'),
        });
    });
});
