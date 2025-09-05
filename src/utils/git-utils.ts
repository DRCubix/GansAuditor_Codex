/**
 * Git command wrappers with error handling for GAN Auditor Integration
 * 
 * This module provides safe git operations with proper error handling,
 * timeout management, and fallback strategies.
 * 
 * Requirements addressed:
 * - 4.5: Git integration for context building
 * - 7.3: Error handling for git command failures
 * - 7.4: Graceful degradation when git is unavailable
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { logger, createTimer } from './logger.js';
import { handleError, withRetry } from './error-handler.js';
import { pathExists } from './file-utils.js';
import type { GanAuditorError } from '../types/error-types.js';

const execAsync = promisify(exec);

// ============================================================================
// Git Configuration
// ============================================================================

/**
 * Configuration for git operations
 */
export interface GitConfig {
  timeout: number;
  maxOutputSize: number;
  retryAttempts: number;
  retryDelay: number;
  workingDirectory?: string;
  gitPath: string;
  enableFallback: boolean;
}

/**
 * Default git configuration
 */
const DEFAULT_GIT_CONFIG: GitConfig = {
  timeout: 30000, // 30 seconds
  maxOutputSize: 10 * 1024 * 1024, // 10MB
  retryAttempts: 2,
  retryDelay: 1000,
  gitPath: 'git',
  enableFallback: true,
};

// ============================================================================
// Git Command Results
// ============================================================================

/**
 * Result of a git command execution
 */
export interface GitCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  duration: number;
  error?: GanAuditorError;
}

/**
 * Git repository information
 */
export interface GitRepoInfo {
  isGitRepo: boolean;
  rootPath?: string;
  currentBranch?: string;
  remoteUrl?: string;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  status?: {
    staged: string[];
    unstaged: string[];
    untracked: string[];
    conflicted: string[];
  };
}

/**
 * Git diff information
 */
export interface GitDiffInfo {
  hasChanges: boolean;
  diff: string;
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
  files: Array<{
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    insertions: number;
    deletions: number;
  }>;
}

// ============================================================================
// Git Utilities Implementation
// ============================================================================

/**
 * Git command wrapper with error handling and timeouts
 */
export class GitUtils {
  private config: GitConfig;

  constructor(config: Partial<GitConfig> = {}) {
    this.config = { ...DEFAULT_GIT_CONFIG, ...config };
  }

  /**
   * Check if current directory is a git repository
   */
  async isGitRepository(path?: string): Promise<boolean> {
    const workingDir = path || this.config.workingDirectory || process.cwd();
    
    try {
      const result = await this.executeCommand(['rev-parse', '--git-dir'], { cwd: workingDir });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive repository information
   */
  async getRepoInfo(path?: string): Promise<GitRepoInfo> {
    const timer = createTimer('get-repo-info', 'git-utils');
    const workingDir = path || this.config.workingDirectory || process.cwd();

    try {
      // Check if it's a git repository
      const isRepo = await this.isGitRepository(workingDir);
      if (!isRepo) {
        timer.end({ success: false, reason: 'not-git-repo' });
        return { isGitRepo: false };
      }

      // Get repository root
      const rootResult = await this.executeCommand(['rev-parse', '--show-toplevel'], { cwd: workingDir });
      const rootPath = rootResult.success ? rootResult.stdout.trim() : undefined;

      // Get current branch
      const branchResult = await this.executeCommand(['branch', '--show-current'], { cwd: workingDir });
      const currentBranch = branchResult.success ? branchResult.stdout.trim() : undefined;

      // Get remote URL
      const remoteResult = await this.executeCommand(['remote', 'get-url', 'origin'], { cwd: workingDir });
      const remoteUrl = remoteResult.success ? remoteResult.stdout.trim() : undefined;

      // Get last commit info
      const lastCommit = await this.getLastCommitInfo(workingDir);

      // Get status
      const status = await this.getStatus(workingDir);

      const repoInfo: GitRepoInfo = {
        isGitRepo: true,
        rootPath,
        currentBranch,
        remoteUrl,
        lastCommit,
        status,
      };

      timer.end({ success: true });
      return repoInfo;
    } catch (error) {
      timer.endWithError(error as Error);
      
      if (this.config.enableFallback) {
        logger.warn('Failed to get git repo info, using fallback', undefined, 'git-utils');
        return { isGitRepo: false };
      }
      
      throw error;
    }
  }

  /**
   * Get git diff with various options
   */
  async getDiff(options: {
    staged?: boolean;
    cached?: boolean;
    target?: string;
    paths?: string[];
    contextLines?: number;
    path?: string;
  } = {}): Promise<GitDiffInfo> {
    const timer = createTimer('get-diff', 'git-utils');
    const workingDir = options.path || this.config.workingDirectory || process.cwd();

    try {
      const args = ['diff'];
      
      if (options.staged || options.cached) {
        args.push('--cached');
      }
      
      if (options.target) {
        args.push(options.target);
      }
      
      if (options.contextLines !== undefined) {
        args.push(`--unified=${options.contextLines}`);
      }
      
      // Add stat information
      args.push('--numstat');
      
      if (options.paths && options.paths.length > 0) {
        args.push('--', ...options.paths);
      }

      const result = await this.executeCommand(args, { cwd: workingDir });
      
      if (!result.success) {
        timer.end({ success: false, reason: 'command-failed' });
        return {
          hasChanges: false,
          diff: '',
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          files: [],
        };
      }

      // Parse diff output
      const diffInfo = this.parseDiffOutput(result.stdout);
      
      // Get actual diff content (without --numstat)
      const diffArgs = args.filter(arg => arg !== '--numstat');
      const diffResult = await this.executeCommand(diffArgs, { cwd: workingDir });
      diffInfo.diff = diffResult.success ? diffResult.stdout : '';

      timer.end({ success: true, hasChanges: diffInfo.hasChanges });
      return diffInfo;
    } catch (error) {
      timer.endWithError(error as Error);
      
      if (this.config.enableFallback) {
        logger.warn('Failed to get git diff, using fallback', undefined, 'git-utils');
        return {
          hasChanges: false,
          diff: '',
          stats: { filesChanged: 0, insertions: 0, deletions: 0 },
          files: [],
        };
      }
      
      throw error;
    }
  }

  /**
   * Get repository file tree
   */
  async getFileTree(options: {
    maxDepth?: number;
    includeIgnored?: boolean;
    path?: string;
  } = {}): Promise<{ success: boolean; tree?: string; files?: string[]; error?: GanAuditorError }> {
    const timer = createTimer('get-file-tree', 'git-utils');
    const workingDir = options.path || this.config.workingDirectory || process.cwd();

    try {
      const args = ['ls-tree', '-r', '--name-only'];
      
      if (options.includeIgnored) {
        args.push('--ignored');
      }
      
      args.push('HEAD');

      const result = await this.executeCommand(args, { cwd: workingDir });
      
      if (!result.success) {
        timer.end({ success: false, reason: 'command-failed' });
        return { success: false, error: result.error };
      }

      const files = result.stdout
        .split('\n')
        .filter(line => line.trim())
        .sort();

      // Create tree structure
      const tree = this.createTreeStructure(files, options.maxDepth);

      timer.end({ success: true, fileCount: files.length });
      return { success: true, tree, files };
    } catch (error) {
      timer.endWithError(error as Error);
      const errorResult = await handleError(error, 'git-file-tree');
      return { success: false, error: errorResult.error };
    }
  }

  /**
   * Get git log with formatting
   */
  async getLog(options: {
    maxCount?: number;
    since?: string;
    until?: string;
    author?: string;
    grep?: string;
    paths?: string[];
    path?: string;
  } = {}): Promise<{ success: boolean; commits?: any[]; error?: GanAuditorError }> {
    const timer = createTimer('get-log', 'git-utils');
    const workingDir = options.path || this.config.workingDirectory || process.cwd();

    try {
      const args = [
        'log',
        '--pretty=format:%H|%an|%ae|%ad|%s',
        '--date=iso',
      ];

      if (options.maxCount) {
        args.push(`-${options.maxCount}`);
      }

      if (options.since) {
        args.push(`--since=${options.since}`);
      }

      if (options.until) {
        args.push(`--until=${options.until}`);
      }

      if (options.author) {
        args.push(`--author=${options.author}`);
      }

      if (options.grep) {
        args.push(`--grep=${options.grep}`);
      }

      if (options.paths && options.paths.length > 0) {
        args.push('--', ...options.paths);
      }

      const result = await this.executeCommand(args, { cwd: workingDir });
      
      if (!result.success) {
        timer.end({ success: false, reason: 'command-failed' });
        return { success: false, error: result.error };
      }

      const commits = result.stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, author, email, date, message] = line.split('|');
          return { hash, author, email, date, message };
        });

      timer.end({ success: true, commitCount: commits.length });
      return { success: true, commits };
    } catch (error) {
      timer.endWithError(error as Error);
      const errorResult = await handleError(error, 'git-log');
      return { success: false, error: errorResult.error };
    }
  }

  /**
   * Check if git is available on the system
   */
  async isGitAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand(['--version']);
      return result.success;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Execute a git command with proper error handling
   */
  private async executeCommand(
    args: string[], 
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<GitCommandResult> {
    const command = `${this.config.gitPath} ${args.join(' ')}`;
    const cwd = options.cwd || this.config.workingDirectory || process.cwd();
    const timeout = options.timeout || this.config.timeout;

    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: this.config.maxOutputSize,
        encoding: 'utf8',
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
        command,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.debug(
        `Git command failed: ${command}`,
        { error: error.message, cwd, duration },
        'git-utils'
      );

      return {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        exitCode: error.code || 1,
        command,
        duration,
        error: error,
      };
    }
  }

  /**
   * Get last commit information
   */
  private async getLastCommitInfo(workingDir: string): Promise<any> {
    try {
      const result = await this.executeCommand([
        'log', '-1', '--pretty=format:%H|%an|%ad|%s', '--date=iso'
      ], { cwd: workingDir });

      if (!result.success || !result.stdout.trim()) {
        return undefined;
      }

      const [hash, author, date, message] = result.stdout.trim().split('|');
      return { hash, author, date, message };
    } catch {
      return undefined;
    }
  }

  /**
   * Get repository status
   */
  private async getStatus(workingDir: string): Promise<any> {
    try {
      const result = await this.executeCommand(['status', '--porcelain'], { cwd: workingDir });

      if (!result.success) {
        return undefined;
      }

      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];
      const conflicted: string[] = [];

      result.stdout.split('\n').forEach(line => {
        if (!line.trim()) return;

        const status = line.substring(0, 2);
        const filePath = line.substring(3);

        if (status.includes('U') || status.includes('A') && status.includes('A')) {
          conflicted.push(filePath);
        } else if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(filePath);
        } else if (status[1] !== ' ') {
          unstaged.push(filePath);
        } else if (status === '??') {
          untracked.push(filePath);
        }
      });

      return { staged, unstaged, untracked, conflicted };
    } catch {
      return undefined;
    }
  }

  /**
   * Parse diff output to extract statistics
   */
  private parseDiffOutput(output: string): GitDiffInfo {
    const lines = output.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return {
        hasChanges: false,
        diff: '',
        stats: { filesChanged: 0, insertions: 0, deletions: 0 },
        files: [],
      };
    }

    const files: GitDiffInfo['files'] = [];
    let totalInsertions = 0;
    let totalDeletions = 0;

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const insertions = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
        const deletions = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
        const path = parts[2];

        files.push({
          path,
          status: 'modified', // Simplified for now
          insertions,
          deletions,
        });

        totalInsertions += insertions;
        totalDeletions += deletions;
      }
    }

    return {
      hasChanges: files.length > 0,
      diff: '', // Will be filled by caller
      stats: {
        filesChanged: files.length,
        insertions: totalInsertions,
        deletions: totalDeletions,
      },
      files,
    };
  }

  /**
   * Create tree structure from file list
   */
  private createTreeStructure(files: string[], maxDepth?: number): string {
    const tree: Record<string, any> = {};

    // Build tree structure
    for (const file of files) {
      const parts = file.split('/');
      let current = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (maxDepth && i >= maxDepth) {
          break;
        }

        if (i === parts.length - 1) {
          // It's a file
          current[part] = null;
        } else {
          // It's a directory
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }

    // Convert tree to string representation
    return this.treeToString(tree);
  }

  /**
   * Convert tree object to string representation
   */
  private treeToString(tree: Record<string, any>, indent: string = ''): string {
    const lines: string[] = [];
    const entries = Object.entries(tree).sort(([a], [b]) => a.localeCompare(b));

    for (let i = 0; i < entries.length; i++) {
      const [name, subtree] = entries[i];
      const isLast = i === entries.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      
      lines.push(indent + prefix + name);

      if (subtree !== null) {
        const childIndent = indent + (isLast ? '    ' : '│   ');
        lines.push(this.treeToString(subtree, childIndent));
      }
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Global Git Utils Instance
// ============================================================================

/**
 * Global git utilities instance
 */
export const gitUtils = new GitUtils();

/**
 * Configure the global git utilities
 */
export function configureGitUtils(config: Partial<GitConfig>): void {
  (gitUtils as any).config = { ...DEFAULT_GIT_CONFIG, ...config };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if current directory is a git repository
 */
export async function isGitRepo(path?: string): Promise<boolean> {
  return gitUtils.isGitRepository(path);
}

/**
 * Get repository information
 */
export async function getGitRepoInfo(path?: string): Promise<GitRepoInfo> {
  return gitUtils.getRepoInfo(path);
}

/**
 * Get git diff
 */
export async function getGitDiff(options?: {
  staged?: boolean;
  cached?: boolean;
  target?: string;
  paths?: string[];
  contextLines?: number;
  path?: string;
}): Promise<GitDiffInfo> {
  return gitUtils.getDiff(options);
}

/**
 * Get git file tree
 */
export async function getGitFileTree(options?: {
  maxDepth?: number;
  includeIgnored?: boolean;
  path?: string;
}): Promise<{ success: boolean; tree?: string; files?: string[]; error?: GanAuditorError }> {
  return gitUtils.getFileTree(options);
}

/**
 * Get git log
 */
export async function getGitLog(options?: {
  maxCount?: number;
  since?: string;
  until?: string;
  author?: string;
  grep?: string;
  paths?: string[];
  path?: string;
}): Promise<{ success: boolean; commits?: any[]; error?: GanAuditorError }> {
  return gitUtils.getLog(options);
}

/**
 * Check if git is available
 */
export async function isGitAvailable(): Promise<boolean> {
  return gitUtils.isGitAvailable();
}