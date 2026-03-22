import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveProfile, filterByProfile, ProfileName } from './profiles';

describe('profiles', () => {
    describe('resolveProfile', () => {
        let originalArgv: string[];

        beforeEach(() => {
            // Save original process.argv
            originalArgv = [...process.argv];
        });

        afterEach(() => {
            // Restore original process.argv
            process.argv = originalArgv;
        });

        it('should return "all" by default if --profile is not specified', () => {
            process.argv = ['node', 'script.js'];
            expect(resolveProfile()).toBe('all');
        });

        it('should return the specified profile if it is valid (core)', () => {
            process.argv = ['node', 'script.js', '--profile', 'core'];
            expect(resolveProfile()).toBe('core');
        });

        it('should return the specified profile if it is valid (swarm)', () => {
            process.argv = ['node', 'script.js', '--profile', 'swarm'];
            expect(resolveProfile()).toBe('swarm');
        });

        it('should return the specified profile if it is valid (ops)', () => {
            process.argv = ['node', 'script.js', '--profile', 'ops'];
            expect(resolveProfile()).toBe('ops');
        });

        it('should return "all" if --profile value is unrecognized', () => {
            process.argv = ['node', 'script.js', '--profile', 'invalid_profile'];
            expect(resolveProfile()).toBe('all');
        });

        it('should return "all" if --profile is the last argument (no value provided)', () => {
            process.argv = ['node', 'script.js', '--profile'];
            expect(resolveProfile()).toBe('all');
        });

        it('should correctly handle multiple arguments before and after the flag', () => {
            process.argv = ['node', 'script.js', '--other-flag', 'value', '--profile', 'core', '--yet-another-flag'];
            expect(resolveProfile()).toBe('core');
        });
    });

    describe('filterByProfile', () => {
        const mockSchemas = [
            { name: 'get_project_history' }, // Core
            { name: 'create_swarm' },        // Swarm
            { name: 'audit_dependencies' },  // Ops
            { name: 'unknown_tool' },        // Not in any profile
        ];

        it('should return all schemas when profile is "all"', () => {
            const result = filterByProfile(mockSchemas, 'all');
            expect(result).toHaveLength(4);
            expect(result).toEqual(mockSchemas);
            // Ensure a new array is returned, not the original reference
            expect(result).not.toBe(mockSchemas);
        });

        it('should filter correctly for "core" profile', () => {
            const result = filterByProfile(mockSchemas, 'core');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('get_project_history');
        });

        it('should filter correctly for "swarm" profile', () => {
            const result = filterByProfile(mockSchemas, 'swarm');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('create_swarm');
        });

        it('should filter correctly for "ops" profile', () => {
            const result = filterByProfile(mockSchemas, 'ops');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('audit_dependencies');
        });

        it('should return an empty array if no schemas match the profile', () => {
            const onlyUnknown = [{ name: 'unknown_tool' }];
            const result = filterByProfile(onlyUnknown, 'core');
            expect(result).toHaveLength(0);
        });
    });
});
