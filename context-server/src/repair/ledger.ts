import fs from 'fs/promises';
import path from 'path';
import { embedText } from '../rag/embeddings';
import { readTaskFileStatus, updateTaskFileStatus } from '../cli/taskFiles';

interface LedgerMemory {
    id: string;
    content: string;
    embedding?: string | null;
}

interface LedgerDecision {
    id: string;
    context: string;
    chosen: string;
    reasoning?: string | null;
    embedding?: string | null;
}

interface LedgerTask {
    slug: string;
    status: string;
}

interface LedgerDocument {
    memories?: LedgerMemory[];
    decisions?: LedgerDecision[];
    tasks?: LedgerTask[];
    [key: string]: unknown;
}

export interface TaskStatusDrift {
    slug: string;
    ledgerStatus: string;
    fileStatus: string;
    filePath: string;
}

export interface RepairLedgerOptions {
    pruneNoise?: boolean;
    fixTaskFiles?: boolean;
}

export interface RepairLedgerResult {
    memoriesBackfilled: number;
    decisionsBackfilled: number;
    noisyMemories: number;
    prunedNoisyMemories: number;
    staleTaskFiles: TaskStatusDrift[];
    taskFilesUpdated: number;
    ledgerChanged: boolean;
}

export interface LedgerQualityReport {
    exists: boolean;
    parseable: boolean;
    nullEmbeddings: number;
    noisyMemories: number;
    staleTaskFiles: TaskStatusDrift[];
    error?: string;
}

function isNoisyAutomaticMemory(memory: LedgerMemory): boolean {
    return memory.content.startsWith('Automatic Git Commit Context');
}

function formatEmbedding(vector: number[]): string {
    return `[${vector.join(',')}]`;
}

async function backfillMemory(memory: LedgerMemory): Promise<boolean> {
    if (memory.embedding || !memory.content) return false;
    memory.embedding = formatEmbedding(await embedText(memory.content));
    return true;
}

async function backfillDecision(decision: LedgerDecision): Promise<boolean> {
    if (decision.embedding || !decision.context || !decision.chosen) return false;
    const text = `[DECISION] ${decision.context} -> ${decision.chosen} (Reason: ${decision.reasoning ?? ''})`;
    decision.embedding = formatEmbedding(await embedText(text));
    return true;
}

export async function analyzeLedgerQuality(workspacePath: string): Promise<LedgerQualityReport> {
    const ledgerPath = path.join(workspacePath, '.aigit', 'ledger.json');
    let raw: string;

    try {
        raw = await fs.readFile(ledgerPath, 'utf8');
    } catch (error: unknown) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
            return {
                exists: false,
                parseable: false,
                nullEmbeddings: 0,
                noisyMemories: 0,
                staleTaskFiles: [],
            };
        }
        return {
            exists: true,
            parseable: false,
            nullEmbeddings: 0,
            noisyMemories: 0,
            staleTaskFiles: [],
            error: error instanceof Error ? error.message : String(error),
        };
    }

    let ledger: LedgerDocument;
    try {
        ledger = JSON.parse(raw) as LedgerDocument;
    } catch (error: unknown) {
        return {
            exists: true,
            parseable: false,
            nullEmbeddings: 0,
            noisyMemories: 0,
            staleTaskFiles: [],
            error: error instanceof Error ? error.message : String(error),
        };
    }

    const memories = ledger.memories ?? [];
    const decisions = ledger.decisions ?? [];

    // ⚡ Bolt Performance Optimization:
    // Using standard for-loops to count falsy elements avoids the memory allocation overhead
    // and closure execution cost of chained .map() and spread (...) followed by .filter().
    let nullEmbeddings = 0;
    for (let i = 0; i < memories.length; i++) {
        if (!memories[i].embedding) nullEmbeddings++;
    }
    for (let i = 0; i < decisions.length; i++) {
        if (!decisions[i].embedding) nullEmbeddings++;
    }

    const staleTaskFiles: TaskStatusDrift[] = [];
    for (const task of ledger.tasks ?? []) {
        const fileStatus = readTaskFileStatus(workspacePath, task.slug);
        if (!fileStatus || fileStatus === task.status) continue;
        staleTaskFiles.push({
            slug: task.slug,
            ledgerStatus: task.status,
            fileStatus,
            filePath: path.join(workspacePath, '.aigit', 'tasks', `${task.slug}.md`),
        });
    }

    return {
        exists: true,
        parseable: true,
        nullEmbeddings,
        noisyMemories: memories.filter(isNoisyAutomaticMemory).length,
        staleTaskFiles,
    };
}

export async function repairLedger(
    workspacePath: string,
    options: RepairLedgerOptions = {}
): Promise<RepairLedgerResult> {
    const ledgerPath = path.join(workspacePath, '.aigit', 'ledger.json');
    const raw = await fs.readFile(ledgerPath, 'utf8');
    const ledger = JSON.parse(raw) as LedgerDocument;

    let memoriesBackfilled = 0;
    let decisionsBackfilled = 0;
    let prunedNoisyMemories = 0;
    let ledgerChanged = false;

    const memories = ledger.memories ?? [];
    const noisyMemories = memories.filter(isNoisyAutomaticMemory).length;

    if (options.pruneNoise && noisyMemories > 0) {
        ledger.memories = memories.filter(memory => !isNoisyAutomaticMemory(memory));
        prunedNoisyMemories = noisyMemories;
        ledgerChanged = true;
    }

    for (const memory of ledger.memories ?? []) {
        if (await backfillMemory(memory)) {
            memoriesBackfilled += 1;
            ledgerChanged = true;
        }
    }

    for (const decision of ledger.decisions ?? []) {
        if (await backfillDecision(decision)) {
            decisionsBackfilled += 1;
            ledgerChanged = true;
        }
    }

    const staleTaskFiles: TaskStatusDrift[] = [];
    let taskFilesUpdated = 0;

    for (const task of ledger.tasks ?? []) {
        const fileStatus = readTaskFileStatus(workspacePath, task.slug);
        if (!fileStatus || fileStatus === task.status) continue;

        const filePath = path.join(workspacePath, '.aigit', 'tasks', `${task.slug}.md`);
        staleTaskFiles.push({
            slug: task.slug,
            ledgerStatus: task.status,
            fileStatus,
            filePath,
        });

        if (options.fixTaskFiles) {
            const update = updateTaskFileStatus(workspacePath, task.slug, task.status);
            if (update.status === 'updated') taskFilesUpdated += 1;
        }
    }

    if (ledgerChanged) {
        await fs.writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    }

    return {
        memoriesBackfilled,
        decisionsBackfilled,
        noisyMemories,
        prunedNoisyMemories,
        staleTaskFiles,
        taskFilesUpdated,
        ledgerChanged,
    };
}
