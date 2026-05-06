import { describe, expect, it } from 'vitest';
import { ADVANCED_COMMANDS, formatAdvancedHelp } from './advancedHelp';

describe('advanced help', () => {
    it('labels advanced commands as secondary and experimental', () => {
        const help = formatAdvancedHelp();

        expect(help).toContain('Advanced / experimental commands');
        expect(help).toContain('secondary to the v1 memory workflow');
    });

    it('lists broad commands outside the default memory workflow', () => {
        const commandNames = ADVANCED_COMMANDS.map((command) => command.name);

        expect(commandNames).toEqual(expect.arrayContaining([
            'swarm',
            'heal',
            'deps',
            'deps-graph',
            'gc',
            'docs',
        ]));
    });
});
