import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { detectAgents, printScanReport } from './registry';

// Mock fs module
vi.mock('fs');

describe('registry', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('detectAgents', () => {
        it('should return an empty array when no agents are detected', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(false);

            const result = detectAgents('/mock/workspace');

            expect(result).toEqual([]);
        });

        it('should detect an agent by its rules and memory files', () => {
            // Mock file existence for Claude Code ('CLAUDE.md')
            vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
                const fp = filePath as string;
                return fp.includes('CLAUDE.md') || fp.includes('.claude');
            });

            // Mock statSync to treat 'CLAUDE.md' as a file
            vi.spyOn(fs, 'statSync').mockImplementation((filePath) => {
                const fp = filePath as string;
                if (fp.includes('CLAUDE.md')) {
                    return { isFile: () => true } as any;
                }
                return { isFile: () => false } as any;
            });

            vi.spyOn(fs, 'readFileSync').mockReturnValue('Claude rules content');

            const result = detectAgents('/mock/workspace');

            // Claude should be detected
            const claude = result.find(r => r.tool.id === 'claude');
            expect(claude).toBeDefined();

            if (claude) {
                // Assert properties
                expect(claude.foundFiles).toContain('CLAUDE.md');
                expect(claude.foundFiles).toContain('.claude/'); // config dir
                expect(claude.foundFiles).toContain('.claude/skills/'); // skills dir
                expect(claude.rulesContent).toEqual([
                    { file: 'CLAUDE.md', content: 'Claude rules content' }
                ]);
            }
        });

        it('should handle multiple agents in the same workspace', () => {
             // Mock existence for Cursor and Gemini files
            vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
                const fp = filePath as string;
                return fp.includes('.cursorrules') || fp.includes('GEMINI.md');
            });

            vi.spyOn(fs, 'statSync').mockImplementation((filePath) => {
                const fp = filePath as string;
                return { isFile: () => fp.includes('.cursorrules') || fp.includes('GEMINI.md') } as any;
            });

            vi.spyOn(fs, 'readFileSync').mockReturnValue('some content');

            const result = detectAgents('/mock/workspace');

            expect(result.length).toBe(2);
            expect(result.some(r => r.tool.id === 'cursor')).toBe(true);
            expect(result.some(r => r.tool.id === 'gemini')).toBe(true);
        });

        it('should ignore directories named as files (e.g., a directory named CLAUDE.md)', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);

            // Mock everything as NOT a file (so rulesFiles and memoryFiles should be ignored)
            vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => false } as any);

            const result = detectAgents('/mock/workspace');

            // Even though 'CLAUDE.md' exists, statSync says it's not a file.
            // However, configDirs and skillsDirs will still be matched because they only check existsSync!
            // Let's find one that ONLY has configDir/skillsDir or verify those are the only files found.
            const claude = result.find(r => r.tool.id === 'claude');
            expect(claude).toBeDefined();
            if (claude) {
                // Should not contain 'CLAUDE.md' because it's not a file
                expect(claude.foundFiles).not.toContain('CLAUDE.md');
                // Should contain configDir and skillsDir
                expect(claude.foundFiles).toContain('.claude/');
                expect(claude.foundFiles).toContain('.claude/skills/');
            }
        });

        it('should avoid duplicate entries in foundFiles when memoryFiles overlap with rulesFiles', () => {
            // Claude Code uses 'CLAUDE.md' for both rulesFiles and memoryFiles
            vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
                const fp = filePath as string;
                return fp.includes('CLAUDE.md');
            });

            vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as any);
            vi.spyOn(fs, 'readFileSync').mockReturnValue('content');

            const result = detectAgents('/mock/workspace');

            const claude = result.find(r => r.tool.id === 'claude');
            expect(claude).toBeDefined();

            if (claude) {
                // Ensure 'CLAUDE.md' is only added once
                const occurrences = claude.foundFiles.filter(f => f === 'CLAUDE.md').length;
                expect(occurrences).toBe(1);
            }
        });

        it('should handle unreadable rules files gracefully (skip reading but still detect agent)', () => {
            vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
                const fp = filePath as string;
                return fp.includes('.windsurfrules'); // Windsurf agent
            });

            vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as any);

            // Mock readFileSync to throw an error (e.g., EACCES)
            vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
                throw new Error('EACCES: permission denied');
            });

            const result = detectAgents('/mock/workspace');

            const windsurf = result.find(r => r.tool.id === 'windsurf');
            expect(windsurf).toBeDefined();

            if (windsurf) {
                // It should detect the file
                expect(windsurf.foundFiles).toContain('.windsurfrules');
                // But rulesContent should be empty since reading failed
                expect(windsurf.rulesContent).toEqual([]);
            }
        });

        it('should correctly detect configDir and skillsDir if they exist', () => {
            vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
                const fp = filePath as string;
                // Mock existence for the 'aider' agent config dir ONLY
                return fp.endsWith('.aider');
            });

            // Make sure rule/memory files pretend to not exist or not be files to isolate this test
            vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => false } as any);

            const result = detectAgents('/mock/workspace');

            const aider = result.find(r => r.tool.id === 'aider');
            expect(aider).toBeDefined();
            if (aider) {
                // Aider has no skillsDir but has configDir '.aider'
                expect(aider.foundFiles).toContain('.aider/');
                expect(aider.foundFiles).not.toContain('CONVENTIONS.md');
            }
        });
    });

    describe('printScanReport', () => {
        it('should print a message when no agents are detected', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            printScanReport([]);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No AI coding tools detected'));
        });

        it('should print details for detected agents', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const mockDetectedAgents = [
                {
                    tool: {
                        id: 'gemini',
                        name: 'Google Gemini',
                        rulesFiles: ['GEMINI.md'],
                        memoryFiles: [],
                        skillsDir: '.agent/skills',
                        configDir: null,
                    },
                    foundFiles: ['GEMINI.md', '.agent/skills/'],
                    rulesContent: [{ file: 'GEMINI.md', content: 'test content' }]
                }
            ];

            printScanReport(mockDetectedAgents);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[aigit scan] Detected 1 AI tool(s):'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Google Gemini (gemini)'));
            // Check file list
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('• GEMINI.md'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('• .agent/skills/'));
        });
    });
});
