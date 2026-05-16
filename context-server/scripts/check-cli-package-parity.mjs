#!/usr/bin/env node
import { execFileSync } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..');
const cliPath = path.join(packageRoot, 'dist', 'cli', 'index.js');
const mainPath = path.join(packageRoot, 'dist', 'index.js');
const packageParityPath = path.join(packageRoot, 'dist', 'cli', 'packageParity.js');
const packageJsonPath = path.join(packageRoot, 'package.json');
const require = createRequire(import.meta.url);

const defaultCommands = ['doctor', 'repair', 'advanced', 'hydrate', 'load', 'dump'];
const hiddenCommands = ['swarm', 'heal', 'deps-graph', 'ci-report', 'resolve', 'gc', 'ui'];
const expectedPackFiles = [
    'dist/cli/index.js',
    'dist/index.js',
    'package.json',
    'prisma/schema.prisma',
    'prisma.config.ts',
];

function fail(message) {
    console.error(`CLI package parity check failed: ${message}`);
    process.exit(1);
}

function run(command, args, options = {}) {
    try {
        return execFileSync(command, args, {
            cwd: packageRoot,
            encoding: 'utf8',
            env: { ...process.env, AIGIT_TELEMETRY_OPTOUT: '1' },
            stdio: ['pipe', 'pipe', 'pipe'],
            ...options,
        });
    } catch (error) {
        const stderr = error.stderr ? error.stderr.toString() : '';
        const stdout = error.stdout ? error.stdout.toString() : '';
        fail(`${command} ${args.join(' ')} exited non-zero\n${stdout}${stderr}`);
    }
}

function commandPattern(commandName) {
    return new RegExp(`^\\s+${commandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'm');
}

function usagePattern(commandName) {
    return new RegExp(`^Usage:\\s+aigit\\s+${commandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'm');
}

function parseReadmeCommandSpecs(readmePath) {
    const content = fs.readFileSync(readmePath, 'utf8');
    try {
        const { parseCoreCommandSpecs } = require(packageParityPath);
        return parseCoreCommandSpecs(content, path.relative(repoRoot, readmePath));
    } catch (error) {
        fail(error.message);
    }
}

function verifyDocumentedCommand(readmePath, commandSpec, defaultHelp) {
    const topLevelCommand = commandSpec.helpArgs[0];
    if (!commandPattern(topLevelCommand).test(defaultHelp)) {
        fail(`${path.relative(repoRoot, readmePath)} documents "${commandSpec.displayName}" but built help does not list "${topLevelCommand}"`);
    }

    const commandHelp = run(process.execPath, [cliPath, ...commandSpec.helpArgs]);
    if (commandSpec.helpArgs.length > 2 && !usagePattern(commandSpec.displayName).test(commandHelp)) {
        const [, documentedTail] = commandSpec.displayName.match(/^\S+\s+(.+)$/) ?? [];
        if (!documentedTail || !commandHelp.includes(documentedTail)) {
            fail(`${path.relative(repoRoot, readmePath)} documents "${commandSpec.displayName}" but built help does not expose that command path`);
        }
    }
}

function verifyHelpSurface(defaultHelp) {
    for (const command of defaultCommands) {
        if (!commandPattern(command).test(defaultHelp)) {
            fail(`default help does not list documented command "${command}"`);
        }
    }

    for (const command of hiddenCommands) {
        if (commandPattern(command).test(defaultHelp)) {
            fail(`advanced command "${command}" leaked into default help`);
        }
    }

    for (const readme of [path.join(repoRoot, 'README.md'), path.join(packageRoot, 'README.md')]) {
        for (const commandSpec of parseReadmeCommandSpecs(readme)) {
            verifyDocumentedCommand(readme, commandSpec, defaultHelp);
        }
    }
}

function verifyDoctorJson() {
    const stdout = run(process.execPath, [cliPath, 'doctor', '--json']);
    try {
        JSON.parse(stdout);
    } catch {
        fail('doctor --json did not produce parseable JSON on stdout');
    }
}

function verifyPackManifest() {
    const output = run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts']);
    let pack;
    try {
        pack = JSON.parse(output)[0];
    } catch {
        fail('npm pack --dry-run --json did not produce parseable JSON');
    }

    const files = new Set((pack.files ?? []).map(file => file.path));
    for (const expectedFile of expectedPackFiles) {
        if (!files.has(expectedFile)) {
            fail(`package dry-run is missing ${expectedFile}`);
        }
    }
}

function main() {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg.bin?.aigit !== 'dist/cli/index.js') {
        fail('package.json bin.aigit must point to dist/cli/index.js');
    }

    if (!fs.existsSync(cliPath)) fail('dist/cli/index.js is missing; run npm run build first');
    if (!fs.existsSync(mainPath)) fail('dist/index.js is missing; run npm run build first');
    if (!fs.existsSync(packageParityPath)) fail('dist/cli/packageParity.js is missing; run npm run build first');

    const defaultHelp = run(process.execPath, [cliPath, '--help']);
    verifyHelpSurface(defaultHelp);
    verifyDoctorJson();
    verifyPackManifest();

    console.log('CLI package parity check passed.');
}

main();
