#!/usr/bin/env node
import { execFileSync } from 'child_process';
import fs from 'fs';

const DEFAULT_BASE = 'origin/main:.aigit/ledger.json';
const DEFAULT_HEAD = '.aigit/ledger.json';
const CHECKED_COLLECTIONS = ['projects', 'tasks', 'memories'];

function parseArgs(argv) {
    const options = {
        base: DEFAULT_BASE,
        baseFile: null,
        headFile: DEFAULT_HEAD,
        allowLedgerDeletions: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (arg === '--base') {
            options.base = requireValue(argv, index, arg);
            index += 1;
            continue;
        }

        if (arg === '--base-file') {
            options.baseFile = requireValue(argv, index, arg);
            index += 1;
            continue;
        }

        if (arg === '--head-file') {
            options.headFile = requireValue(argv, index, arg);
            index += 1;
            continue;
        }

        if (arg === '--allow-ledger-deletions') {
            options.allowLedgerDeletions = true;
            continue;
        }

        if (arg === '--help' || arg === '-h') {
            printUsage();
            process.exit(0);
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    return options;
}

function requireValue(argv, index, flag) {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
        throw new Error(`${flag} requires a value`);
    }
    return value;
}

function printUsage() {
    console.log(`Usage: node context-server/scripts/check-ledger-regression.mjs [options]

Options:
  --base <ref:path|file>       Base ledger source. Default: ${DEFAULT_BASE}
  --base-file <file>           Read the base ledger from a file.
  --head-file <file>           Read the candidate ledger from a file. Default: ${DEFAULT_HEAD}
  --allow-ledger-deletions     Report deleted records without failing.
`);
}

function readLedgerFromSource(source) {
    if (fs.existsSync(source)) {
        return readJsonFile(source);
    }

    try {
        return JSON.parse(execFileSync('git', ['show', source], { encoding: 'utf8' }));
    } catch (error) {
        throw new Error(`Could not read base ledger from ${source}: ${error.message}`);
    }
}

function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        throw new Error(`Could not read ledger file ${filePath}: ${error.message}`);
    }
}

function normalizeCollection(ledger, collectionName) {
    const collection = ledger[collectionName];
    if (!Array.isArray(collection)) {
        throw new Error(`Ledger field "${collectionName}" must be an array`);
    }

    return collection
        .map((entry, index) => {
            if (!entry || typeof entry.id !== 'string' || entry.id.length === 0) {
                throw new Error(`Ledger field "${collectionName}" has an entry without a string id at index ${index}`);
            }
            return entry.id;
        });
}

function findDeletedIds(baseLedger, headLedger) {
    return CHECKED_COLLECTIONS.flatMap((collectionName) => {
        const baseIds = normalizeCollection(baseLedger, collectionName);
        const headIds = new Set(normalizeCollection(headLedger, collectionName));
        const deletedIds = baseIds.filter((id) => !headIds.has(id));

        if (deletedIds.length === 0) {
            return [];
        }

        return [{
            collectionName,
            deletedIds,
        }];
    });
}

function pluralize(count, singular, plural = `${singular}s`) {
    return count === 1 ? singular : plural;
}

function formatFailure(deletions) {
    return [
        'Ledger regression detected. Historical .aigit/ledger.json records were removed.',
        ...deletions.flatMap(({ collectionName, deletedIds }) => [
            `- ${collectionName} removed ${deletedIds.length} historical ${pluralize(deletedIds.length, 'id')}:`,
            ...deletedIds.map((id) => `  - ${id}`),
        ]),
        '',
        'If this deletion is intentional, rerun with --allow-ledger-deletions and document the reason in the PR.',
    ].join('\n');
}

function formatSuccess(baseLedger, headLedger) {
    const counts = CHECKED_COLLECTIONS
        .map((collectionName) => `${collectionName}: ${normalizeCollection(baseLedger, collectionName).length} -> ${normalizeCollection(headLedger, collectionName).length}`)
        .join(', ');

    return `Ledger regression check passed (${counts}).`;
}

function main() {
    try {
        const options = parseArgs(process.argv.slice(2));
        const baseLedger = options.baseFile ? readJsonFile(options.baseFile) : readLedgerFromSource(options.base);
        const headLedger = readJsonFile(options.headFile);
        const deletions = findDeletedIds(baseLedger, headLedger);

        if (deletions.length > 0) {
            const message = formatFailure(deletions);
            if (options.allowLedgerDeletions) {
                console.warn(message);
                process.exit(0);
            }

            console.error(message);
            process.exit(1);
        }

        console.log(formatSuccess(baseLedger, headLedger));
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

main();
