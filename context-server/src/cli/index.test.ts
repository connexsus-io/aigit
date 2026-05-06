import { execFileSync } from 'child_process';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Placeholder test to verify the setup
describe('CLI Sanity Check', () => {
    it('should pass a basic sanity test', () => {
        // This string simulates a basic assertion that guarantees the CLI test runner is functional.
        const message = 'aigit is running';
        expect(message).toContain('aigit');
    });

    it('keeps broad commands out of default help', () => {
        const cliPath = path.join(__dirname, 'index.ts');
        const output = execFileSync(process.execPath, ['-r', 'ts-node/register', cliPath, '--help'], {
            cwd: path.join(__dirname, '..', '..'),
            encoding: 'utf8',
            env: { ...process.env, AIGIT_TELEMETRY_OPTOUT: '1' },
        });

        expect(output).toContain('Git-native memory for AI coding agents');
        expect(output).toContain('init');
        expect(output).toContain('doctor');
        expect(output).toContain('hydrate');
        expect(output).toContain('repair');
        expect(output).toContain('advanced');
        expect(output).not.toMatch(/^\s+swarm\b/m);
        expect(output).not.toMatch(/^\s+heal\b/m);
        expect(output).not.toMatch(/^\s+deps-graph\b/m);
    });

    it('lists broad commands in advanced help', () => {
        const cliPath = path.join(__dirname, 'index.ts');
        const output = execFileSync(process.execPath, ['-r', 'ts-node/register', cliPath, 'advanced'], {
            cwd: path.join(__dirname, '..', '..'),
            encoding: 'utf8',
            env: { ...process.env, AIGIT_TELEMETRY_OPTOUT: '1' },
        });

        expect(output).toContain('Advanced / experimental commands');
        expect(output).toContain('swarm');
        expect(output).toContain('heal');
        expect(output).toContain('deps');
        expect(output).toContain('docs');
    });
});
