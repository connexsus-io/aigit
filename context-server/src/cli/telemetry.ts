import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PostHog } from 'posthog-node';

export interface TelemetryState {
    phClient: PostHog | null;
    telemetryId: string | null;
    isTelemetryEnabled: boolean;
    telemetryOptedOut: boolean;
}

export function isTelemetryOptedOut(): boolean {
    const value = process.env.DO_NOT_TRACK?.toLowerCase();
    return value === '1' || value === 'true';
}

export function getOrGenerateTelemetryId(): string {
    const configDir = path.join(os.homedir(), '.aigit');
    const configFile = path.join(configDir, 'telemetry.json');
    try {
        if (fs.existsSync(configFile)) {
            const data = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
            if (data.distinctId) return data.distinctId;
        } else {
            if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        }
        const distinctId = crypto.randomUUID();
        fs.writeFileSync(configFile, JSON.stringify({ distinctId }));
        return distinctId;
    } catch {
        return 'anonymous_cli_user_fallback';
    }
}

export function createTelemetryState(options: {
    posthogKey?: string;
    sentryDsn?: string;
    createPostHog?: (key: string) => PostHog;
}): TelemetryState {
    const telemetryOptedOut = isTelemetryOptedOut();
    if (telemetryOptedOut) {
        return {
            phClient: null,
            telemetryId: null,
            isTelemetryEnabled: false,
            telemetryOptedOut: true,
        };
    }

    const phClient = options.posthogKey
        ? (options.createPostHog ?? ((key: string) => new PostHog(key, { host: 'https://eu.i.posthog.com' })))(options.posthogKey)
        : null;
    const telemetryId = phClient || options.sentryDsn ? getOrGenerateTelemetryId() : null;

    return {
        phClient,
        telemetryId,
        isTelemetryEnabled: phClient !== null,
        telemetryOptedOut: false,
    };
}
