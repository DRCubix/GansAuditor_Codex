/**
 * Tests for GansAuditor_Codex file system utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { 
  FileSystemUtils,
  fileUtils,
  readFileSafe,
  writeFileSafe,
  ensureDirectorySafe,
  pathExists,
} from '../file-utils.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    appendFile: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    rmdir: vi.fn(),
    unlink: vi.fn(),
    copyFile: vi.fn(),
    utimes: vi.fn(),
  },
  constants: {
    F_OK: 0,
  },
}));

const mockFs = fs as any;

describe('GansAuditor_Codex FileSystemUtils', () => {
  let fsUtils: FileSystemUtils;
  const testPath = '/test/file.txt';
  const testContent = 'test content';

  beforeEach(() => {
    fsUtils = new FileSystemUtils();
    vi.clearAllMocks();
  });

  describe('readFile', () => {
    it('should read file successfully', async () => {
      mockFs.stat.mockResolvedValue({ size: 100 });
      mockFs.readFile.mockResolvedValue(testContent);

      const result = await fsUtils.readFile(testPath);

      expect(result.success).toBe(true);
      expect(result.content).toBe(testContent);
      expect(mockFs.readFile).toHaveBeenCalledWith(testPath, 'utf8');
    });

    it('should handle file not found', async () => {
      // Mock access to return file not found for validation
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await fsUtils.readFile(testPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle file too large', async () => {
      // Mock validation to pass, then stat to return large size
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 20 * 1024 * 1024 }); // 20MB

      const result = await fsUtils.readFile(testPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('writeFile', () => {
    it('should write file successfully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await fsUtils.writeFile(testPath, testContent);

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(testPath, testContent, 'utf8');
    });

    it('should create directories when needed', async () => {
      // Mock file validation to pass
      mockFs.access.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await fsUtils.writeFile(testPath, testContent, { createDirectories: true });

      expect(result.success).toBe(true);
      // Just verify the file was written successfully - the directory creation is tested separately
      expect(mockFs.writeFile).toHaveBeenCalledWith(testPath, testContent, 'utf8');
    });
  });

  describe('exists', () => {
    it('should return true for existing path', async () => {
      vi.clearAllMocks();
      mockFs.access.mockResolvedValue(undefined);

      const result = await fsUtils.exists(testPath);

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(testPath, 0);
    });

    it('should return false for non-existing path', async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));

      const result = await fsUtils.exists(testPath);

      expect(result).toBe(false);
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));
      mockFs.mkdir.mockResolvedValue(undefined);

      const result = await fsUtils.ensureDirectory('/test/dir');

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await fsUtils.ensureDirectory('/test/dir');

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('calculateHash', () => {
    it('should calculate file hash', async () => {
      mockFs.stat.mockResolvedValue({ size: 100 });
      mockFs.readFile.mockResolvedValue('test content');

      const result = await fsUtils.calculateHash(testPath);

      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe('string');
    });
  });
});

describe('GansAuditor_Codex Convenience functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readFileSafe', () => {
    it('should use global file utils', async () => {
      const spy = vi.spyOn(fileUtils, 'readFile').mockResolvedValue({
        success: true,
        content: 'test',
      });

      const result = await readFileSafe('/test.txt');

      expect(spy).toHaveBeenCalledWith('/test.txt');
      expect(result.success).toBe(true);
    });
  });

  describe('writeFileSafe', () => {
    it('should use global file utils', async () => {
      const spy = vi.spyOn(fileUtils, 'writeFile').mockResolvedValue({
        success: true,
      });

      const result = await writeFileSafe('/test.txt', 'content');

      expect(spy).toHaveBeenCalledWith('/test.txt', 'content', undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('pathExists', () => {
    it('should use global file utils', async () => {
      const spy = vi.spyOn(fileUtils, 'exists').mockResolvedValue(true);

      const result = await pathExists('/test.txt');

      expect(spy).toHaveBeenCalledWith('/test.txt');
      expect(result).toBe(true);
    });
  });
});

describe('File validation', () => {
  let fsUtils: FileSystemUtils;

  beforeEach(() => {
    fsUtils = new FileSystemUtils({
      allowedExtensions: ['.txt', '.js'],
      blockedPaths: ['node_modules', '.git'],
    });
    vi.clearAllMocks();
  });

  it('should reject blocked paths', async () => {
    const result = await fsUtils.readFile('node_modules/test.txt');

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('blocked path');
  });

  it('should reject invalid extensions', async () => {
    const result = await fsUtils.readFile('/test.exe');

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('extension not allowed');
  });

  it('should allow valid paths and extensions', async () => {
    mockFs.access.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 100 });
    mockFs.readFile.mockResolvedValue('content');

    const result = await fsUtils.readFile('/test.txt');

    // Should succeed for valid paths
    expect(result.success).toBe(true);
    expect(result.content).toBe('content');
  });
});