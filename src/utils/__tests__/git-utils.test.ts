/**
 * Tests for GansAuditor_Codex git command utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exec } from 'child_process';
import { 
  GitUtils,
  gitUtils,
  isGitRepo,
  getGitRepoInfo,
  getGitDiff,
  getGitFileTree,
  isGitAvailable,
} from '../git-utils.js';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
}));

// Mock util
vi.mock('util', () => ({
  promisify: (fn: any) => vi.fn().mockImplementation(async (...args: any[]) => {
    return new Promise((resolve, reject) => {
      fn(...args, (error: any, stdout: string, stderr: string) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }),
}));

const mockExec = exec as any;

describe('GansAuditor_Codex GitUtils', () => {
  let gitUtilsInstance: GitUtils;

  beforeEach(() => {
    gitUtilsInstance = new GitUtils();
    vi.clearAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true for git repository', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, '.git', '');
      });

      const result = await gitUtilsInstance.isGitRepository();
      expect(result).toBe(true);
    });

    it('should return false for non-git directory', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        const error = new Error('Not a git repository');
        error.code = 128;
        callback(error, '', 'fatal: not a git repository');
      });

      const result = await gitUtilsInstance.isGitRepository();
      expect(result).toBe(false);
    });
  });

  describe('getRepoInfo', () => {
    it('should get comprehensive repo information', async () => {
      // Mock multiple git commands
      mockExec
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          // rev-parse --git-dir
          callback(null, '.git', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          // rev-parse --show-toplevel
          callback(null, '/home/user/project', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          // branch --show-current
          callback(null, 'main', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          // remote get-url origin
          callback(null, 'https://github.com/user/repo.git', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          // log -1 --pretty=format
          callback(null, 'abc123|John Doe|2024-01-01T12:00:00Z|Initial commit', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          // status --porcelain
          callback(null, ' M file1.txt\n?? file2.txt', '');
        });

      const result = await gitUtilsInstance.getRepoInfo();

      expect(result.isGitRepo).toBe(true);
      expect(result.rootPath).toBe('/home/user/project');
      expect(result.currentBranch).toBe('main');
      expect(result.remoteUrl).toBe('https://github.com/user/repo.git');
      expect(result.lastCommit).toEqual({
        hash: 'abc123',
        author: 'John Doe',
        date: '2024-01-01T12:00:00Z',
        message: 'Initial commit',
      });
      expect(result.status?.unstaged).toContain('file1.txt');
      expect(result.status?.untracked).toContain('file2.txt');
    });

    it('should handle non-git repository', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        const error = new Error('Not a git repository');
        error.code = 128;
        callback(error, '', 'fatal: not a git repository');
      });

      const result = await gitUtilsInstance.getRepoInfo();

      expect(result.isGitRepo).toBe(false);
      expect(result.rootPath).toBeUndefined();
    });
  });

  describe('getDiff', () => {
    it('should get diff with statistics', async () => {
      mockExec
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          // diff --numstat
          callback(null, '5\t2\tfile1.txt\n10\t0\tfile2.txt', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          // diff (without --numstat)
          callback(null, 'diff --git a/file1.txt b/file1.txt\n+added line', '');
        });

      const result = await gitUtilsInstance.getDiff();

      expect(result.hasChanges).toBe(true);
      expect(result.stats.filesChanged).toBe(2);
      expect(result.stats.insertions).toBe(15);
      expect(result.stats.deletions).toBe(2);
      expect(result.files).toHaveLength(2);
      expect(result.diff).toContain('diff --git');
    });

    it('should handle no changes', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, '', '');
      });

      const result = await gitUtilsInstance.getDiff();

      expect(result.hasChanges).toBe(false);
      expect(result.stats.filesChanged).toBe(0);
      expect(result.files).toHaveLength(0);
    });

    it('should handle staged changes', async () => {
      mockExec
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          expect(cmd).toContain('--cached');
          callback(null, '3\t1\tfile1.txt', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          callback(null, 'staged diff content', '');
        });

      const result = await gitUtilsInstance.getDiff({ staged: true });

      expect(result.hasChanges).toBe(true);
    });
  });

  describe('getFileTree', () => {
    it('should get repository file tree', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, 'src/file1.ts\nsrc/file2.ts\nREADME.md\npackage.json', '');
      });

      const result = await gitUtilsInstance.getFileTree();

      expect(result.success).toBe(true);
      expect(result.files).toEqual([
        'README.md',
        'package.json',
        'src/file1.ts',
        'src/file2.ts',
      ]);
      expect(result.tree).toContain('README.md');
      expect(result.tree).toContain('src');
    });

    it('should handle git command failure', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        const error = new Error('Git command failed');
        callback(error, '', 'error message');
      });

      const result = await gitUtilsInstance.getFileTree();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getLog', () => {
    it('should get commit log', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        const logOutput = [
          'abc123|John Doe|john@example.com|2024-01-01T12:00:00Z|Initial commit',
          'def456|Jane Doe|jane@example.com|2024-01-02T12:00:00Z|Second commit',
        ].join('\n');
        callback(null, logOutput, '');
      });

      const result = await gitUtilsInstance.getLog({ maxCount: 2 });

      expect(result.success).toBe(true);
      expect(result.commits).toHaveLength(2);
      expect(result.commits![0]).toEqual({
        hash: 'abc123',
        author: 'John Doe',
        email: 'john@example.com',
        date: '2024-01-01T12:00:00Z',
        message: 'Initial commit',
      });
    });

    it('should handle log options', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        expect(cmd).toContain('--since=2024-01-01');
        expect(cmd).toContain('--author=John');
        expect(cmd).toContain('-10');
        callback(null, '', '');
      });

      await gitUtilsInstance.getLog({
        maxCount: 10,
        since: '2024-01-01',
        author: 'John',
      });
    });
  });

  describe('isGitAvailable', () => {
    it('should return true when git is available', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, 'git version 2.34.1', '');
      });

      const result = await gitUtilsInstance.isGitAvailable();
      expect(result).toBe(true);
    });

    it('should return false when git is not available', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: any) => {
        const error = new Error('Command not found');
        callback(error, '', 'git: command not found');
      });

      const result = await gitUtilsInstance.isGitAvailable();
      expect(result).toBe(false);
    });
  });
});

describe('GansAuditor_Codex Convenience functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isGitRepo', () => {
    it('should use global git utils', async () => {
      const spy = vi.spyOn(gitUtils, 'isGitRepository').mockResolvedValue(true);

      const result = await isGitRepo('/test/path');

      expect(spy).toHaveBeenCalledWith('/test/path');
      expect(result).toBe(true);
    });
  });

  describe('getGitRepoInfo', () => {
    it('should use global git utils', async () => {
      const mockInfo = { isGitRepo: true, currentBranch: 'main' };
      const spy = vi.spyOn(gitUtils, 'getRepoInfo').mockResolvedValue(mockInfo);

      const result = await getGitRepoInfo('/test/path');

      expect(spy).toHaveBeenCalledWith('/test/path');
      expect(result).toEqual(mockInfo);
    });
  });

  describe('isGitAvailable', () => {
    it('should use global git utils', async () => {
      const spy = vi.spyOn(gitUtils, 'isGitAvailable').mockResolvedValue(true);

      const result = await isGitAvailable();

      expect(spy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});

describe('Git command parsing', () => {
  let gitUtilsInstance: GitUtils;

  beforeEach(() => {
    gitUtilsInstance = new GitUtils();
  });

  describe('status parsing', () => {
    it('should parse git status output correctly', async () => {
      mockExec
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          callback(null, '.git', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          callback(null, '/project', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          callback(null, 'main', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          callback(null, 'origin', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          callback(null, 'abc|author|date|message', '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          // Complex status output
          const statusOutput = [
            'M  staged-modified.txt',    // staged
            ' M unstaged-modified.txt',  // unstaged
            'A  new-file.txt',          // staged new
            '?? untracked.txt',         // untracked
            'UU conflicted.txt',        // conflicted
          ].join('\n');
          callback(null, statusOutput, '');
        });

      const result = await gitUtilsInstance.getRepoInfo();

      expect(result.status?.staged).toContain('staged-modified.txt');
      expect(result.status?.staged).toContain('new-file.txt');
      expect(result.status?.unstaged).toContain('unstaged-modified.txt');
      expect(result.status?.untracked).toContain('untracked.txt');
      expect(result.status?.conflicted).toContain('conflicted.txt');
    });
  });

  describe('diff parsing', () => {
    it('should parse numstat output correctly', async () => {
      mockExec
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          const numstatOutput = [
            '10\t5\tfile1.txt',
            '0\t3\tfile2.txt',
            '-\t-\tbinary-file.png',
          ].join('\n');
          callback(null, numstatOutput, '');
        })
        .mockImplementationOnce((cmd: string, options: any, callback: any) => {
          callback(null, 'diff content', '');
        });

      const result = await gitUtilsInstance.getDiff();

      expect(result.files).toHaveLength(3);
      expect(result.files[0]).toEqual({
        path: 'file1.txt',
        status: 'modified',
        insertions: 10,
        deletions: 5,
      });
      expect(result.files[1]).toEqual({
        path: 'file2.txt',
        status: 'modified',
        insertions: 0,
        deletions: 3,
      });
      expect(result.files[2]).toEqual({
        path: 'binary-file.png',
        status: 'modified',
        insertions: 0,
        deletions: 0,
      });
      expect(result.stats.insertions).toBe(10);
      expect(result.stats.deletions).toBe(8);
    });
  });
});