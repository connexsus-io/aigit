import { dumpContextLedger } from '../cli/sync';

export async function persistWorkspaceLedger(workspacePath: string | undefined): Promise<void> {
    if (!workspacePath) return;
    await dumpContextLedger(workspacePath, { disconnect: false });
}
