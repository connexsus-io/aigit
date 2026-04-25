import * as fs from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTelemetryState, isTelemetryOptedOut } from './telemetry';

vi.mock('fs');

describe('isTelemetryOptedOut', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    it.each(['1', 'true', 'TRUE'])('treats DO_NOT_TRACK=%s as opt-out', (value) => {
        vi.stubEnv('DO_NOT_TRACK', value);

        expect(isTelemetryOptedOut()).toBe(true);
    });

    it('allows telemetry when DO_NOT_TRACK is absent', () => {
        vi.stubEnv('DO_NOT_TRACK', undefined);

        expect(isTelemetryOptedOut()).toBe(false);
    });

    it('does not create telemetry IDs or clients when opted out', () => {
        const createPostHog = vi.fn();
        vi.stubEnv('DO_NOT_TRACK', '1');

        const state = createTelemetryState({
            posthogKey: 'posthog-key',
            sentryDsn: 'https://example.invalid/sentry',
            createPostHog: createPostHog as never,
        });

        expect(state).toMatchObject({
            phClient: null,
            telemetryId: null,
            isTelemetryEnabled: false,
            telemetryOptedOut: true,
        });
        expect(createPostHog).not.toHaveBeenCalled();
        expect(fs.existsSync).not.toHaveBeenCalled();
        expect(fs.readFileSync).not.toHaveBeenCalled();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
});
