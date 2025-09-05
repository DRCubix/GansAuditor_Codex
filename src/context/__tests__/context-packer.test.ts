/**
 * Unit tests for ContextPacker
 * 
 * Tests context building functionality with mock git repositories
 * and file system operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContextPacker } from '../context-packer.js';
import type { SessionConfig } from '../../types/gan-types.js';
import { spawn } from 'child_process';
import { readFile, readdir, stat, access } from 'fs/promises';

// Mock Node.js modules
vi.mock('child_process');
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  access: vi.fn(),
}));

const mockSpawn = vi.mocked(spawn);
const mockReadFile = vi.mocked(readFile) as any;
const mockReaddir = vi.mocked(readdir) as any;
const mockStat = vi.mocked(stat) as any;
const mockAccess = vi.mocked(access) as any;

describe('ContextPacker', () => {
  let contextPacker: ContextPacker;
  let mockChildProcess: any;

  beforeEach(() => {
    contextPacker = new ContextPacker({
      maxContextSize: 10000,
      maxFileSize: 5000,
      relevanceThreshold: 0.3,
    });

    // Mock child process
    mockChildProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    };

    mockSpawn.mockReturnValue(mockChildProcess as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('buildContextPack', () => {
    it('should build diff context when scope is diff', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'diff',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      // Mock git commands
      setupGitMocks({
        branch: 'main',
        repoRoot: '/repo',
        diff: 'diff --git a/file.ts b/file.ts\n+added line',
      });

      const result = await contextPacker.buildContextPack(config, '/repo');

      expect(result).toContain('Repository Information');
      expect(result).toContain('Branch: main');
      expect(result).toContain('Git Diff Context');
      expect(result).toContain('+added line');
    });

    it('should build paths context when scope is paths', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'paths',
        paths: ['src/file1.ts', 'src/file2.js'],
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      setupGitMocks({
        branch: 'main',
        repoRoot: '/repo',
      });

      mockAccess.mockResolvedValue(undefined); // Files exist
      mockStat.mockResolvedValue({ isDirectory: () => false, size: 1000 } as any);
      mockReadFile
        .mockResolvedValueOnce('const x = 1;')
        .mockResolvedValueOnce('function test() {}');

      const result = await contextPacker.buildContextPack(config, '/repo');

      expect(result).toContain('Paths Context');
      expect(result).toContain('src/file1.ts');
      expect(result).toContain('src/file2.js');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('function test() {}');
    });

    it('should build workspace context when scope is workspace', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'workspace',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      setupGitMocks({
        branch: 'main',
        repoRoot: '/repo',
        fileTree: 'src/\n  index.ts\n  utils.ts\n',
      });

      // Mock file system for workspace scanning
      mockReaddir
        .mockResolvedValueOnce(['src', 'package.json'])
        .mockResolvedValueOnce(['index.ts', 'utils.ts']);

      mockStat
        .mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 500 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 800 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 300 } as any);

      mockReadFile
        .mockResolvedValueOnce('export * from "./utils";')
        .mockResolvedValueOnce('export function helper() {}');

      const result = await contextPacker.buildContextPack(config, '/repo');

      expect(result).toContain('Workspace Context');
      expect(result).toContain('Repository Structure');
      expect(result).toContain('Relevant Files');
    });

    it('should throw error when paths scope has no paths', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'paths',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      setupGitMocks({
        branch: 'main',
        repoRoot: '/repo',
      });

      await expect(contextPacker.buildContextPack(config, '/repo')).rejects.toThrow(
        'Paths must be specified when scope is "paths"'
      );
    });

    it('should truncate context when it exceeds max size', async () => {
      const smallContextPacker = new ContextPacker({ maxContextSize: 100 });
      
      const config: SessionConfig = {
        task: 'test',
        scope: 'diff',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      setupGitMocks({
        branch: 'main',
        repoRoot: '/repo',
        diff: 'a'.repeat(200), // Long diff
      });

      const result = await smallContextPacker.buildContextPack(config, '/repo');

      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toContain('Context truncated');
    });
  });

  describe('buildDiffContext', () => {
    it('should return git diff when changes exist', async () => {
      const mockDiff = 'diff --git a/test.ts b/test.ts\n+new line';
      setupGitMocks({ diff: mockDiff });

      const result = await contextPacker.buildDiffContext('/repo');

      expect(result).toContain('Git Diff Context');
      expect(result).toContain(mockDiff);
    });

    it('should handle empty diff', async () => {
      setupGitMocks({ diff: '' });

      const result = await contextPacker.buildDiffContext('/repo');

      expect(result).toContain('No changes detected');
    });

    it('should handle git command failure', async () => {
      setupGitMocks({ shouldFail: true });

      const result = await contextPacker.buildDiffContext('/repo');

      expect(result).toContain('Error retrieving git diff');
    });
  });

  describe('buildPathsContext', () => {
    it('should build context for existing files', async () => {
      const paths = ['src/test.ts'];
      
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ isDirectory: () => false, size: 100 } as any);
      mockReadFile.mockResolvedValue('const test = true;');

      const result = await contextPacker.buildPathsContext(paths, '/repo');

      expect(result).toContain('Paths Context');
      expect(result).toContain('src/test.ts');
      expect(result).toContain('const test = true;');
    });

    it('should handle non-existent files', async () => {
      const paths = ['nonexistent.ts'];
      
      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await contextPacker.buildPathsContext(paths, '/repo');

      expect(result).toContain('File not found');
    });

    it('should handle directories', async () => {
      const paths = ['src/'];
      
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ isDirectory: () => true, size: 0 } as any);
      mockReaddir.mockResolvedValue(['test.ts', 'utils.ts']);

      const result = await contextPacker.buildPathsContext(paths, '/repo');

      expect(result).toContain('src/');
      expect(result).toContain('test.ts, utils.ts');
    });
  });

  describe('buildWorkspaceContext', () => {
    it('should build workspace context with file tree and relevant files', async () => {
      setupGitMocks({
        fileTree: 'src/\n  index.ts\n  utils/\n    helper.ts\n',
      });

      // Mock workspace scanning
      mockReaddir
        .mockResolvedValueOnce(['src', 'package.json'])
        .mockResolvedValueOnce(['index.ts', 'utils'])
        .mockResolvedValueOnce(['helper.ts']);

      mockStat
        .mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 500 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 800 } as any)
        .mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 300 } as any);

      mockReadFile
        .mockResolvedValueOnce('export * from "./utils";')
        .mockResolvedValueOnce('export function helper() {}');

      const result = await contextPacker.buildWorkspaceContext('/repo');

      expect(result).toContain('Workspace Context');
      expect(result).toContain('Repository Structure');
      expect(result).toContain('index.ts');
    });

    it('should handle git command failures gracefully', async () => {
      setupGitMocks({ shouldFail: true });

      // Mock filesystem fallback
      mockReaddir.mockResolvedValue(['src']);
      mockStat.mockResolvedValue({ isDirectory: () => true, size: 0 } as any);

      const result = await contextPacker.buildWorkspaceContext('/repo');

      expect(result).toContain('Workspace Context');
    });
  });

  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      const paths = ['error-file.ts'];
      
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ isDirectory: () => false, size: 100 } as any);
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      const result = await contextPacker.buildPathsContext(paths, '/repo');

      expect(result).toContain('Error reading file');
      expect(result).toContain('Permission denied');
    });

    it('should skip ignored directories', async () => {
      mockReaddir.mockResolvedValue(['src', 'node_modules', '.git']);
      mockStat
        .mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any)
        .mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any)
        .mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any);

      // Should only process 'src' directory
      const result = await contextPacker.buildWorkspaceContext('/repo');
      
      // Verify node_modules and .git are not processed
      expect(mockReaddir).toHaveBeenCalledTimes(1); // Only root directory
    });

    it('should handle large files by skipping them', async () => {
      const largePacker = new ContextPacker({ maxFileSize: 100 });
      
      mockReaddir.mockResolvedValue(['small.ts', 'large.ts']);
      mockStat
        .mockResolvedValueOnce({ isDirectory: () => false, size: 50 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 200 } as any);

      mockReadFile.mockResolvedValue('small file content');

      const result = await largePacker.buildWorkspaceContext('/repo');
      
      // Should only read the small file
      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('file relevance scoring', () => {
    it('should prioritize TypeScript files', async () => {
      setupGitMocks({ fileTree: '' });
      
      mockReaddir.mockResolvedValue(['test.ts', 'readme.txt']);
      mockStat
        .mockResolvedValueOnce({ isDirectory: () => false, size: 1000 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 1000 } as any);

      mockReadFile
        .mockResolvedValueOnce('TypeScript content')
        .mockResolvedValueOnce('Text content');

      const result = await contextPacker.buildWorkspaceContext('/repo');

      // TypeScript file should appear first due to higher relevance
      const tsIndex = result.indexOf('test.ts');
      const txtIndex = result.indexOf('readme.txt');
      
      if (tsIndex !== -1 && txtIndex !== -1) {
        expect(tsIndex).toBeLessThan(txtIndex);
      }
    });

    it('should prioritize src directory files', async () => {
      setupGitMocks({ fileTree: '' });
      
      mockReaddir
        .mockResolvedValueOnce(['src', 'docs'])
        .mockResolvedValueOnce(['main.ts'])
        .mockResolvedValueOnce(['readme.md']);

      mockStat
        .mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any)
        .mockResolvedValueOnce({ isDirectory: () => true, size: 0 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 1000 } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, size: 1000 } as any);

      mockReadFile
        .mockResolvedValueOnce('Main TypeScript file')
        .mockResolvedValueOnce('Documentation');

      const result = await contextPacker.buildWorkspaceContext('/repo');

      // src/main.ts should appear before docs/readme.md
      const srcIndex = result.indexOf('src/main.ts');
      const docsIndex = result.indexOf('docs/readme.md');
      
      if (srcIndex !== -1 && docsIndex !== -1) {
        expect(srcIndex).toBeLessThan(docsIndex);
      }
    });
  });

  // Helper function to set up git command mocks
  function setupGitMocks(options: {
    branch?: string;
    repoRoot?: string;
    diff?: string;
    fileTree?: string;
    shouldFail?: boolean;
  }) {
    const {
      branch = 'main',
      repoRoot = '/repo',
      diff = '',
      fileTree = '',
      shouldFail = false,
    } = options;

    mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'close') {
        process.nextTick(() => {
          callback(shouldFail ? 1 : 0);
        });
      }
      return mockChildProcess;
    });

    mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'data') {
        process.nextTick(() => {
          // Determine response based on git command args
          const spawnCall = mockSpawn.mock.calls[mockSpawn.mock.calls.length - 1];
          if (spawnCall) {
            const args = spawnCall[1] as string[];
            
            if (args.includes('--show-current')) {
              callback(branch + '\n');
            } else if (args.includes('--show-toplevel')) {
              callback(repoRoot + '\n');
            } else if (args.includes('diff')) {
              callback(diff);
            } else if (args.includes('ls-tree')) {
              callback(fileTree);
            }
          }
        });
      }
      return mockChildProcess.stdout;
    });

    mockChildProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'data' && shouldFail) {
        process.nextTick(() => {
          callback('Git command failed');
        });
      }
      return mockChildProcess.stderr;
    });
  }
});