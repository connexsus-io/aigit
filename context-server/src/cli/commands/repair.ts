import { repairLedger } from '../../repair/ledger';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args, workspacePath }) => {
    const target = args[0];
    if (target !== 'ledger') {
        console.error('⚠️  Error: Unknown repair target.');
        console.log('Usage: aigit repair ledger [--prune-noise] [--fix-task-files]');
        process.exit(1);
    }

    const result = await repairLedger(workspacePath, {
        pruneNoise: args.includes('--prune-noise'),
        fixTaskFiles: args.includes('--fix-task-files'),
    });

    console.log('\n🧰 [aigit repair ledger] Repair report');
    console.log(`   Memories backfilled: ${result.memoriesBackfilled}`);
    console.log(`   Decisions backfilled: ${result.decisionsBackfilled}`);
    console.log(`   Noisy memories found: ${result.noisyMemories}`);
    console.log(`   Noisy memories pruned: ${result.prunedNoisyMemories}`);
    console.log(`   Stale task files: ${result.staleTaskFiles.length}`);
    console.log(`   Task files updated: ${result.taskFilesUpdated}`);

    if (result.staleTaskFiles.length > 0 && result.taskFilesUpdated === 0) {
        console.log('   Run with --fix-task-files to sync task markdown status from the ledger.');
    }
    console.log();
};

export default handler;
