import { describe, expect, it } from 'vitest';
import { COMMAND_REGISTRY } from './registry';

describe('CLI command registry focus compatibility', () => {
    it('keeps advanced commands callable through the registry', () => {
        expect(COMMAND_REGISTRY).toHaveProperty('swarm');
        expect(COMMAND_REGISTRY).toHaveProperty('heal');
        expect(COMMAND_REGISTRY).toHaveProperty('deps');
        expect(COMMAND_REGISTRY).toHaveProperty('docs');
        expect(COMMAND_REGISTRY).toHaveProperty('advanced');
    });
});
