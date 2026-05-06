import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    DEFAULT_AIGIT_SKILLS,
    ensureDefaultAigitSkills,
    getDefaultAigitSkillStatuses,
} from './defaultSkills';

describe('default Aigit skills', () => {
    let workspacePath: string;

    beforeEach(() => {
        workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigit-default-skills-'));
    });

    afterEach(() => {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    });

    it('creates all default skill templates idempotently', () => {
        const first = ensureDefaultAigitSkills(workspacePath);
        const second = ensureDefaultAigitSkills(workspacePath);

        expect(first.created.map(skill => skill.name).sort()).toEqual(DEFAULT_AIGIT_SKILLS.map(skill => skill.name).sort());
        expect(second.created).toEqual([]);
        expect(second.existing.map(skill => skill.name).sort()).toEqual(DEFAULT_AIGIT_SKILLS.map(skill => skill.name).sort());

        for (const skill of DEFAULT_AIGIT_SKILLS) {
            const skillPath = path.join(workspacePath, '.aigit', 'skills', skill.name, 'SKILL.md');
            expect(fs.existsSync(skillPath)).toBe(true);
            expect(fs.readFileSync(skillPath, 'utf8')).toContain(`name: ${skill.name}`);
        }
    });

    it('reports present and missing default skills', () => {
        const skill = DEFAULT_AIGIT_SKILLS[0];
        fs.mkdirSync(path.join(workspacePath, '.aigit', 'skills', skill.name), { recursive: true });
        fs.writeFileSync(path.join(workspacePath, '.aigit', 'skills', skill.name, 'SKILL.md'), skill.content, 'utf8');

        const status = getDefaultAigitSkillStatuses(workspacePath);

        expect(status.present).toEqual([skill.name]);
        expect(status.missing.sort()).toEqual(DEFAULT_AIGIT_SKILLS.slice(1).map(item => item.name).sort());
    });
});
