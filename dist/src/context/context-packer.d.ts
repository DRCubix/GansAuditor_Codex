/**
 * Repository Context Packer for GAN Auditor Integration
 *
 * This module implements context building functionality for different scope modes,
 * git integration, file relevance scoring, and context size management.
 *
 * Requirements: 4.1-4.5 - Repository context analysis
 */
import type { SessionConfig } from '../types/gan-types.js';
import type { IContextPacker } from '../types/integration-types.js';
/**
 * Repository context packer implementation
 * Requirement 4.1-4.5: Context building for different scope modes
 */
export declare class ContextPacker implements IContextPacker {
    private gitHelper;
    private fsHelper;
    private maxContextSize;
    private maxFileSize;
    private relevanceThreshold;
    constructor(options?: {
        maxContextSize?: number;
        maxFileSize?: number;
        relevanceThreshold?: number;
    });
    /**
     * Build context pack based on session configuration
     * Requirement 4.1: Different scope modes support
     */
    buildContextPack(config: SessionConfig, cwd?: string): Promise<string>;
    /**
     * Build git diff context
     * Requirement 4.2: Git integration functions
     */
    buildDiffContext(cwd?: string): Promise<string>;
    /**
     * Build context from specific file paths
     * Requirement 4.3: File relevance scoring algorithm
     */
    buildPathsContext(paths: string[], cwd?: string): Promise<string>;
    /**
     * Build workspace context using heuristics
     * Requirement 4.4: Context size management with truncation
     */
    buildWorkspaceContext(cwd?: string): Promise<string>;
    /**
     * Get git repository header information
     * Requirement 4.2: Git integration functions
     */
    private getGitHeader;
    /**
     * Pick relevant files using scoring algorithm
     * Requirement 4.3: File relevance scoring algorithm
     */
    private pickRelevantFiles;
    /**
     * Collect code snippets from top files
     * Requirement 4.4: Context size management with truncation
     */
    private collectTopSnippets;
    /**
     * Create a file snippet with appropriate truncation
     */
    private createFileSnippet;
    /**
     * Get language identifier for syntax highlighting
     */
    private getLanguageFromPath;
    /**
     * Build context for a directory
     */
    private buildDirectoryContext;
    /**
     * Build context for a single file
     */
    private buildFileContext;
    /**
     * Truncate context to fit within size limits
     * Requirement 4.5: Context size management with truncation
     */
    private truncateContext;
}
/**
 * Create a new ContextPacker instance with optional configuration
 */
export declare function createContextPacker(options?: {
    maxContextSize?: number;
    maxFileSize?: number;
    relevanceThreshold?: number;
}): IContextPacker;
//# sourceMappingURL=context-packer.d.ts.map