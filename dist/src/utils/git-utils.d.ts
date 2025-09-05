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
import type { GanAuditorError } from '../types/error-types.js';
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
/**
 * Git command wrapper with error handling and timeouts
 */
export declare class GitUtils {
    private config;
    constructor(config?: Partial<GitConfig>);
    /**
     * Check if current directory is a git repository
     */
    isGitRepository(path?: string): Promise<boolean>;
    /**
     * Get comprehensive repository information
     */
    getRepoInfo(path?: string): Promise<GitRepoInfo>;
    /**
     * Get git diff with various options
     */
    getDiff(options?: {
        staged?: boolean;
        cached?: boolean;
        target?: string;
        paths?: string[];
        contextLines?: number;
        path?: string;
    }): Promise<GitDiffInfo>;
    /**
     * Get repository file tree
     */
    getFileTree(options?: {
        maxDepth?: number;
        includeIgnored?: boolean;
        path?: string;
    }): Promise<{
        success: boolean;
        tree?: string;
        files?: string[];
        error?: GanAuditorError;
    }>;
    /**
     * Get git log with formatting
     */
    getLog(options?: {
        maxCount?: number;
        since?: string;
        until?: string;
        author?: string;
        grep?: string;
        paths?: string[];
        path?: string;
    }): Promise<{
        success: boolean;
        commits?: any[];
        error?: GanAuditorError;
    }>;
    /**
     * Check if git is available on the system
     */
    isGitAvailable(): Promise<boolean>;
    /**
     * Execute a git command with proper error handling
     */
    private executeCommand;
    /**
     * Get last commit information
     */
    private getLastCommitInfo;
    /**
     * Get repository status
     */
    private getStatus;
    /**
     * Parse diff output to extract statistics
     */
    private parseDiffOutput;
    /**
     * Create tree structure from file list
     */
    private createTreeStructure;
    /**
     * Convert tree object to string representation
     */
    private treeToString;
}
/**
 * Global git utilities instance
 */
export declare const gitUtils: GitUtils;
/**
 * Configure the global git utilities
 */
export declare function configureGitUtils(config: Partial<GitConfig>): void;
/**
 * Check if current directory is a git repository
 */
export declare function isGitRepo(path?: string): Promise<boolean>;
/**
 * Get repository information
 */
export declare function getGitRepoInfo(path?: string): Promise<GitRepoInfo>;
/**
 * Get git diff
 */
export declare function getGitDiff(options?: {
    staged?: boolean;
    cached?: boolean;
    target?: string;
    paths?: string[];
    contextLines?: number;
    path?: string;
}): Promise<GitDiffInfo>;
/**
 * Get git file tree
 */
export declare function getGitFileTree(options?: {
    maxDepth?: number;
    includeIgnored?: boolean;
    path?: string;
}): Promise<{
    success: boolean;
    tree?: string;
    files?: string[];
    error?: GanAuditorError;
}>;
/**
 * Get git log
 */
export declare function getGitLog(options?: {
    maxCount?: number;
    since?: string;
    until?: string;
    author?: string;
    grep?: string;
    paths?: string[];
    path?: string;
}): Promise<{
    success: boolean;
    commits?: any[];
    error?: GanAuditorError;
}>;
/**
 * Check if git is available
 */
export declare function isGitAvailable(): Promise<boolean>;
//# sourceMappingURL=git-utils.d.ts.map