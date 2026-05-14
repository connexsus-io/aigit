#!/usr/bin/env node
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..');
const cliPath = path.join(packageRoot, 'dist', 'cli', 'index.js');
const mainPath = path.join(packageRoot, 'dist', 'index.js');
const packageJsonPath = path.join(packageRoot, 'package.json');

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

function parseCoreCommands(readmePath) {
    const content = fs.readFileSync(readmePath, 'utf8');
    const section = content.match(/## Core Commands[\s\S]*?(?=\n## |\n$)/);
    if (!section) fail(`missing Core Commands section in ${path.relative(repoRoot, readmePath)}`);

    const commands = new Set();
    const commandRegex = /\|\s+`aigit\s+([^`]+)`\s+\|/g;
    for (const match of section[0].matchAll(commandRegex)) {
        const topLevelCommand = match[1].trim().split(/\s+/)[0];
        commands.add(topLevelCommand);
    }
    return [...commands];
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
        for (const command of parseCoreCommands(readme)) {
            if (!commandPattern(command).test(defaultHelp)) {
                fail(`${path.relative(repoRoot, readme)} documents "${command}" but built help does not list it`);
            }
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

    const defaultHelp = run(process.execPath, [cliPath, '--help']);
    verifyHelpSurface(defaultHelp);
    verifyDoctorJson();
    verifyPackManifest();

    console.log('CLI package parity check passed.');
}

main();
