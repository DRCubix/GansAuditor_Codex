/**
 * Tests for EnvironmentManager
 * 
 * Comprehensive test suite for environment management functionality
 * including working directory resolution, environment variable handling,
 * and path validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import {
  EnvironmentManager,
  createEnvironmentManager,
  defaultEnvironmentManager,
  CodexNotFoundError,
  WorkingDirectoryError,
  PathValidationError,
  type EnvironmentManagerConfig,
  type WorkingDirectoryResult,
  type EnvironmentResult,
  type CodexExecutableResult,
  type PathValidationResult,
} from '../environment-manager.js';

// Mock dependencies
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createTimer: vi.fn(() => ({
    end: vi.fn(),
    endWithError: vi.fn(),
  })),
}));

vi.mock('../utils/git-utils.js', () => ({
  isGitRepo: vi.fn().mockResolvedValue(false),
  getGitRepoInfo: vi.fn().mockResolvedValue({ isGitRepo: false }),
}));

vi.mock('../utils/file-utils.js', () => ({
  pathExists: vi.fn().mockResolvedValue(false),
}));

describe('EnvironmentManager', () => {
  let tempDir: string;
  let envManager: EnvironmentManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(join(tmpdir(), 'env-manager-test-'));
    
    // Save original environment
    originalEnv = { ...process.env };
    
    // Create fresh environment manager
    envManager = new EnvironmentManager({
      defaultWorkingDirectory: tempDir,
      enableDebugLogging: false,
    });
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clean up temporary directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
    
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default configuration', () => {
      const manager = new EnvironmentManager();
      expect(manager).toBeInstanceOf(EnvironmentManager);
    });

    it('should merge provided configuration with defaults', () => {
      const config: Partial<EnvironmentManagerConfig> = {
        defaultExecutableName: 'custom-codex',
        enableDebugLogging: true,
      };
      
      const manager = new EnvironmentManager(config);
      expect(manager).toBeInstanceOf(EnvironmentManager);
    });
  });

  describe('resolveWorkingDirectory', () => {
    it('should use provided path if valid', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      const { isGitRepo } = await import('../utils/git-utils.js');
      
      vi.mocked(pathExists).mockResolvedValue(true);
      vi.mocked(isGitRepo).mockResolvedValue(false); // Ensure no git repo detection
      
      // Mock fs.stat to return directory
      vi.spyOn(fs, 'stat').mockResolvedValue({
        isDirectory: () => true,
      } as any);

      const result = await envManager.resolveWorkingDirectory(tempDir);
      
      expect(result.success).toBe(true);
      expect(result.path).toBe(resolve(tempDir));
      expect(result.source).toBe('provided');
    });

    it('should detect repository root when available', async () => {
      const { isGitRepo, getGitRepoInfo } = await import('../utils/git-utils.js');
      const { pathExists } = await import('../utils/file-utils.js');
      
      vi.mocked(isGitRepo).mockResolvedValue(true);
      vi.mocked(getGitRepoInfo).mockResolvedValue({
        isGitRepo: true,
        rootPath: tempDir,
        currentBranch: 'main',
      });
      vi.mocked(pathExists).mockResolvedValue(true);

      const result = await envManager.resolveWorkingDirectory();
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('repository-root');
      expect(result.repositoryInfo).toBeDefined();
      expect(result.repositoryInfo?.isGitRepo).toBe(true);
    });

    it('should fallback to current directory when repository not found', async () => {
      const { isGitRepo, getGitRepoInfo } = await import('../utils/git-utils.js');
      const { pathExists } = await import('../utils/file-utils.js');
      
      vi.mocked(isGitRepo).mockResolvedValue(false);
      vi.mocked(getGitRepoInfo).mockResolvedValue({ isGitRepo: false });
      
      // Mock pathExists to return false for all .git directory checks
      vi.mocked(pathExists).mockImplementation((path: string) => {
        if (path.includes('.git')) {
          return Promise.resolve(false);
        }
        return Promise.resolve(true); // Other paths exist
      });

      // Create a manager that disables git repo detection
      const manager = new EnvironmentManager({
        defaultWorkingDirectory: tempDir,
        enableDebugLogging: false,
      });

      const result = await manager.resolveWorkingDirectory();
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('current-directory');
    });

    it('should use default directory as final fallback', async () => {
      const { isGitRepo, getGitRepoInfo } = await import('../utils/git-utils.js');
      const { pathExists } = await import('../utils/file-utils.js');
      
      vi.mocked(isGitRepo).mockResolvedValue(false);
      vi.mocked(getGitRepoInfo).mockResolvedValue({ isGitRepo: false });
      
      let callCount = 0;
      vi.mocked(pathExists).mockImplementation((path: string) => {
        callCount++;
        if (path.includes('.git')) {
          return Promise.resolve(false); // No .git directories
        }
        if (callCount <= 10) { // First several calls for current directory
          return Promise.resolve(false); // Current directory doesn't exist
        }
        return Promise.resolve(true); // Default directory exists
      });

      const result = await envManager.resolveWorkingDirectory();
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('fallback');
    });

    it('should fail when no valid directory found', async () => {
      const { isGitRepo, getGitRepoInfo } = await import('../utils/git-utils.js');
      const { pathExists } = await import('../utils/file-utils.js');
      
      vi.mocked(isGitRepo).mockResolvedValue(false);
      vi.mocked(getGitRepoInfo).mockResolvedValue({ isGitRepo: false });
      vi.mocked(pathExists).mockResolvedValue(false); // All directories and .git checks fail

      const result = await envManager.resolveWorkingDirectory();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.name).toBe('EnvironmentError');
    });

    it('should handle provided path that is not a directory', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      const { isGitRepo, getGitRepoInfo } = await import('../utils/git-utils.js');
      
      vi.mocked(pathExists).mockImplementation((path: string) => {
        if (path.includes('.git')) {
          return Promise.resolve(false); // No .git directories
        }
        if (path.includes('test-file.txt')) {
          return Promise.resolve(true); // Provided path exists
        }
        return Promise.resolve(true); // Other paths exist
      });
      
      // Mock fs.stat to return file (not directory) for provided path
      vi.spyOn(fs, 'stat')
        .mockResolvedValueOnce({
          isDirectory: () => false,
        } as any);
      
      vi.mocked(isGitRepo).mockResolvedValue(false);
      vi.mocked(getGitRepoInfo).mockResolvedValue({ isGitRepo: false });

      const filePath = join(tempDir, 'test-file.txt');
      const result = await envManager.resolveWorkingDirectory(filePath);
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('current-directory'); // Falls back
    });
  });

  describe('prepareEnvironment', () => {
    it('should preserve specified environment variables', async () => {
      process.env.PATH = '/usr/bin:/bin';
      process.env.HOME = '/home/user';
      process.env.CUSTOM_VAR = 'custom-value';

      const manager = new EnvironmentManager({
        preserveEnvironmentVars: ['PATH', 'HOME', 'CUSTOM_VAR', 'MISSING_VAR'],
        executableSearchPaths: [], // Disable search paths to avoid PATH modification
        enableDebugLogging: false,
      });

      const result = await manager.prepareEnvironment();
      
      expect(result.success).toBe(true);
      expect(result.environment?.PATH).toBe('/usr/bin:/bin');
      expect(result.environment?.HOME).toBe('/home/user');
      expect(result.environment?.CUSTOM_VAR).toBe('custom-value');
      expect(result.preservedVars).toContain('PATH');
      expect(result.preservedVars).toContain('HOME');
      expect(result.preservedVars).toContain('CUSTOM_VAR');
      expect(result.missingVars).toContain('MISSING_VAR');
    });

    it('should add additional environment variables', async () => {
      const manager = new EnvironmentManager({
        additionalEnvironmentVars: {
          CODEX_MODEL: 'gpt-4',
          CODEX_TIMEOUT: '120',
        },
        enableDebugLogging: false,
      });

      const result = await manager.prepareEnvironment();
      
      expect(result.success).toBe(true);
      expect(result.environment?.CODEX_MODEL).toBe('gpt-4');
      expect(result.environment?.CODEX_TIMEOUT).toBe('120');
      expect(result.addedVars).toContain('CODEX_MODEL');
      expect(result.addedVars).toContain('CODEX_TIMEOUT');
    });

    it('should ensure MCP-specific environment variables', async () => {
      process.env.HOME = '/home/user';
      delete process.env.NODE_ENV;
      delete process.env.CODEX_CONFIG_DIR;

      const result = await envManager.prepareEnvironment();
      
      expect(result.success).toBe(true);
      expect(result.environment?.CODEX_CONFIG_DIR).toBe('/home/user/.codex');
      expect(result.environment?.NODE_ENV).toBe('production');
      expect(result.addedVars).toContain('CODEX_CONFIG_DIR');
      expect(result.addedVars).toContain('NODE_ENV');
    });

    it('should enhance PATH with search paths', async () => {
      process.env.PATH = '/usr/bin';

      const manager = new EnvironmentManager({
        executableSearchPaths: ['/usr/local/bin', '/opt/homebrew/bin'],
        enableDebugLogging: false,
      });

      const result = await manager.prepareEnvironment();
      
      expect(result.success).toBe(true);
      expect(result.environment?.PATH).toContain('/usr/bin');
      expect(result.environment?.PATH).toContain('/usr/local/bin');
      expect(result.environment?.PATH).toContain('/opt/homebrew/bin');
    });

    it('should fail when critical environment variables are missing', async () => {
      delete process.env.PATH;

      const result = await envManager.prepareEnvironment();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.name).toBe('EnvironmentValidationError');
    });
  });

  describe('validateCodexPath', () => {
    it('should find executable in PATH', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      
      process.env.PATH = '/usr/bin:/usr/local/bin';
      
      vi.mocked(pathExists)
        .mockResolvedValueOnce(false) // /usr/bin/codex doesn't exist
        .mockResolvedValueOnce(true); // /usr/local/bin/codex exists
      
      // Mock fs.access for permission checks
      vi.spyOn(fs, 'access')
        .mockResolvedValueOnce(undefined) // readable
        .mockResolvedValueOnce(undefined) // writable
        .mockResolvedValueOnce(undefined); // executable

      // Mock spawn for version check
      const mockSpawn = vi.fn().mockImplementation(() => ({
        stdout: { on: vi.fn((event, cb) => cb('codex version 1.0.0\n')) },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      }));
      vi.doMock('child_process', () => ({ spawn: mockSpawn }));

      const result = await envManager.validateCodexPath();
      
      expect(result.success).toBe(true);
      expect(result.executablePath).toBe('/usr/local/bin/codex');
      expect(result.isAccessible).toBe(true);
      expect(result.isExecutable).toBe(true);
      expect(result.version).toContain('codex version 1.0.0');
    });

    it('should search in configured paths when not in PATH', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      
      process.env.PATH = '/usr/bin';
      
      const customPath = '/opt/custom/bin';
      const manager = new EnvironmentManager({
        executableSearchPaths: [customPath],
        enableDebugLogging: false,
      });

      vi.mocked(pathExists)
        .mockResolvedValueOnce(false) // not in PATH
        .mockResolvedValueOnce(true); // found in custom path
      
      // Mock fs.access for permission checks
      vi.spyOn(fs, 'access')
        .mockResolvedValueOnce(undefined) // readable
        .mockResolvedValueOnce(undefined) // writable
        .mockResolvedValueOnce(undefined); // executable

      const result = await manager.validateCodexPath();
      
      expect(result.success).toBe(true);
      expect(result.executablePath).toBe(join(customPath, 'codex'));
      expect(result.searchedPaths).toContain(join(customPath, 'codex'));
    });

    it('should fail when executable not found', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      
      process.env.PATH = '/usr/bin';
      vi.mocked(pathExists).mockResolvedValue(false);

      const result = await envManager.validateCodexPath();
      
      expect(result.success).toBe(false);
      expect(result.isAccessible).toBe(false);
      expect(result.isExecutable).toBe(false);
      expect(result.error?.name).toBe('CodexNotFoundError');
      expect(result.searchedPaths.length).toBeGreaterThan(0);
    });

    it('should fail when executable exists but is not executable', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      
      process.env.PATH = '/usr/bin';
      vi.mocked(pathExists).mockResolvedValue(true);
      
      // Mock fs.access to fail for executable permission
      vi.spyOn(fs, 'access')
        .mockResolvedValueOnce(undefined) // readable
        .mockResolvedValueOnce(undefined) // writable
        .mockRejectedValueOnce(new Error('Permission denied')); // not executable

      const result = await envManager.validateCodexPath();
      
      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('CodexNotFoundError');
    });

    it('should use custom executable name', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      
      process.env.PATH = '/usr/bin';
      vi.mocked(pathExists).mockResolvedValue(true);
      
      // Mock fs.access for permission checks
      vi.spyOn(fs, 'access')
        .mockResolvedValueOnce(undefined) // readable
        .mockResolvedValueOnce(undefined) // writable
        .mockResolvedValueOnce(undefined); // executable

      const result = await envManager.validateCodexPath('custom-codex');
      
      expect(result.success).toBe(true);
      expect(result.executablePath).toBe('/usr/bin/custom-codex');
    });
  });

  describe('validatePath', () => {
    it('should validate existing accessible file', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      
      const testPath = join(tempDir, 'test-file');
      vi.mocked(pathExists).mockResolvedValue(true);
      
      // Mock fs.access for permission checks
      vi.spyOn(fs, 'access')
        .mockResolvedValueOnce(undefined) // readable
        .mockResolvedValueOnce(undefined) // writable
        .mockResolvedValueOnce(undefined); // executable

      const result = await envManager.validatePath(testPath);
      
      expect(result.success).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.isAccessible).toBe(true);
      expect(result.isExecutable).toBe(true);
      expect(result.permissions?.readable).toBe(true);
      expect(result.permissions?.writable).toBe(true);
      expect(result.permissions?.executable).toBe(true);
    });

    it('should handle non-existent file', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      
      const testPath = join(tempDir, 'non-existent');
      vi.mocked(pathExists).mockResolvedValue(false);

      const result = await envManager.validatePath(testPath);
      
      expect(result.success).toBe(false);
      expect(result.exists).toBe(false);
      expect(result.isAccessible).toBe(false);
      expect(result.isExecutable).toBe(false);
    });

    it('should handle permission errors', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      
      const testPath = join(tempDir, 'restricted-file');
      vi.mocked(pathExists).mockResolvedValue(true);
      
      // Mock fs.access to fail for some permissions
      vi.spyOn(fs, 'access')
        .mockResolvedValueOnce(undefined) // readable
        .mockRejectedValueOnce(new Error('Permission denied')) // not writable
        .mockRejectedValueOnce(new Error('Permission denied')); // not executable

      const result = await envManager.validatePath(testPath);
      
      expect(result.success).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.isAccessible).toBe(true);
      expect(result.isExecutable).toBe(false);
      expect(result.permissions?.readable).toBe(true);
      expect(result.permissions?.writable).toBe(false);
      expect(result.permissions?.executable).toBe(false);
    });

    it('should resolve relative paths', async () => {
      const { pathExists } = await import('../utils/file-utils.js');
      
      vi.mocked(pathExists).mockResolvedValue(true);
      
      // Mock fs.access for permission checks
      vi.spyOn(fs, 'access').mockResolvedValue(undefined);

      const result = await envManager.validatePath('./relative-path');
      
      expect(result.success).toBe(true);
      expect(result.path).toBe(resolve('./relative-path'));
    });
  });

  describe('factory functions', () => {
    it('should create new instance with createEnvironmentManager', () => {
      const config: Partial<EnvironmentManagerConfig> = {
        defaultExecutableName: 'test-codex',
      };
      
      const manager = createEnvironmentManager(config);
      expect(manager).toBeInstanceOf(EnvironmentManager);
    });

    it('should provide default instance', () => {
      expect(defaultEnvironmentManager).toBeInstanceOf(EnvironmentManager);
    });
  });

  describe('error classes', () => {
    it('should create CodexNotFoundError', () => {
      const error = new CodexNotFoundError('Custom message');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('CodexNotFoundError');
      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('CODEX_NOT_FOUND');
    });

    it('should create WorkingDirectoryError', () => {
      const error = new WorkingDirectoryError('Custom message');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('WorkingDirectoryError');
      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('WORKING_DIRECTORY_ERROR');
    });

    it('should create PathValidationError', () => {
      const error = new PathValidationError('Custom message');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('PathValidationError');
      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('PATH_VALIDATION_ERROR');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete environment setup workflow', async () => {
      const { isGitRepo, getGitRepoInfo } = await import('../utils/git-utils.js');
      const { pathExists } = await import('../utils/file-utils.js');
      
      // Setup mocks for successful workflow
      vi.mocked(isGitRepo).mockResolvedValue(true);
      vi.mocked(getGitRepoInfo).mockResolvedValue({
        isGitRepo: true,
        rootPath: tempDir,
        currentBranch: 'main',
      });
      vi.mocked(pathExists).mockResolvedValue(true);
      
      // Mock fs.access for permission checks
      vi.spyOn(fs, 'access').mockResolvedValue(undefined);
      
      process.env.PATH = '/usr/bin';
      process.env.HOME = '/home/user';

      // Test working directory resolution
      const workingDirResult = await envManager.resolveWorkingDirectory();
      expect(workingDirResult.success).toBe(true);
      expect(workingDirResult.source).toBe('repository-root');

      // Test environment preparation
      const envResult = await envManager.prepareEnvironment();
      expect(envResult.success).toBe(true);
      expect(envResult.environment?.PATH).toBeDefined();
      expect(envResult.environment?.HOME).toBe('/home/user');

      // Test Codex path validation
      const codexResult = await envManager.validateCodexPath();
      expect(codexResult.success).toBe(true);
      expect(codexResult.executablePath).toBeDefined();
    });

    it('should handle MCP environment with missing git repository', async () => {
      const { isGitRepo, getGitRepoInfo } = await import('../utils/git-utils.js');
      const { pathExists } = await import('../utils/file-utils.js');
      
      // Setup mocks for MCP environment without git
      vi.mocked(isGitRepo).mockResolvedValue(false);
      vi.mocked(getGitRepoInfo).mockResolvedValue({ isGitRepo: false });
      
      let pathExistsCallCount = 0;
      vi.mocked(pathExists).mockImplementation((path: string) => {
        pathExistsCallCount++;
        if (path.includes('.git')) {
          return Promise.resolve(false); // No .git directories
        }
        if (pathExistsCallCount === 1) {
          return Promise.resolve(true); // Current directory exists
        }
        if (pathExistsCallCount === 2) {
          return Promise.resolve(false); // First codex path doesn't exist
        }
        if (pathExistsCallCount === 3) {
          return Promise.resolve(true); // Second codex path exists
        }
        return Promise.resolve(true); // Default for other paths
      });
      
      // Mock fs.access for permission checks
      vi.spyOn(fs, 'access').mockResolvedValue(undefined);
      
      process.env.PATH = '/usr/bin:/usr/local/bin';
      delete process.env.HOME;

      const manager = new EnvironmentManager({
        preserveEnvironmentVars: ['PATH', 'USER'],
        additionalEnvironmentVars: {
          CODEX_MODEL: 'gpt-4',
        },
        enableDebugLogging: false,
      });

      // Test working directory resolution
      const workingDirResult = await manager.resolveWorkingDirectory();
      expect(workingDirResult.success).toBe(true);
      expect(workingDirResult.source).toBe('current-directory');

      // Test environment preparation
      const envResult = await manager.prepareEnvironment();
      expect(envResult.success).toBe(true);
      expect(envResult.environment?.CODEX_MODEL).toBe('gpt-4');
      expect(envResult.environment?.NODE_ENV).toBe('production');

      // Test Codex path validation
      const codexResult = await manager.validateCodexPath();
      expect(codexResult.success).toBe(true);
    });
  });
});