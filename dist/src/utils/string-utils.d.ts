/**
 * String processing utilities for GAN Auditor Integration
 *
 * This module provides string manipulation, formatting, truncation,
 * and escaping utilities for safe text processing.
 *
 * Requirements addressed:
 * - 4.5: String processing for context building and formatting
 * - 7.3: Safe text processing and escaping
 * - 7.4: Text truncation and size management
 */
/**
 * Configuration for string processing operations
 */
export interface StringProcessingConfig {
    maxLength: number;
    truncationSuffix: string;
    preserveWords: boolean;
    escapeHtml: boolean;
    normalizeWhitespace: boolean;
    removeControlChars: boolean;
}
/**
 * Truncate text to specified length with various strategies
 */
export declare class TextTruncator {
    private config;
    constructor(config?: Partial<StringProcessingConfig>);
    /**
     * Truncate text with smart word boundary preservation
     */
    truncate(text: string, maxLength?: number, options?: {
        suffix?: string;
        preserveWords?: boolean;
        strategy?: 'end' | 'middle' | 'start';
    }): string;
    /**
     * Truncate from the end (most common)
     */
    private truncateEnd;
    /**
     * Truncate from the start
     */
    private truncateStart;
    /**
     * Truncate from the middle
     */
    private truncateMiddle;
    /**
     * Truncate text to fit within token limits (approximate)
     */
    truncateToTokens(text: string, maxTokens: number, tokensPerChar?: number): string;
    /**
     * Smart truncation that preserves structure (e.g., code blocks, lists)
     */
    truncateStructured(text: string, maxLength: number): string;
}
/**
 * Text formatting and normalization utilities
 */
export declare class TextFormatter {
    private config;
    constructor(config?: Partial<StringProcessingConfig>);
    /**
     * Normalize whitespace in text
     */
    normalizeWhitespace(text: string): string;
    /**
     * Remove control characters from text
     */
    removeControlChars(text: string): string;
    /**
     * Escape HTML entities in text
     */
    escapeHtml(text: string): string;
    /**
     * Escape special regex characters
     */
    escapeRegex(text: string): string;
    /**
     * Escape shell command arguments
     */
    escapeShell(text: string): string;
    /**
     * Format text for display in console with proper indentation
     */
    formatForConsole(text: string, options?: {
        indent?: number;
        prefix?: string;
        width?: number;
        wrapLines?: boolean;
    }): string;
    /**
     * Format code snippet with syntax highlighting markers
     */
    formatCodeSnippet(code: string, language?: string, options?: {
        showLineNumbers?: boolean;
        startLine?: number;
        maxLines?: number;
    }): string;
    /**
     * Create a text summary with key information
     */
    createSummary(text: string, maxLength?: number, options?: {
        extractKeywords?: boolean;
        preserveStructure?: boolean;
    }): string;
    /**
     * Wrap a line to specified width
     */
    private wrapLine;
    /**
     * Split string into chunks of specified size
     */
    private chunkString;
}
/**
 * Utilities for processing paths and identifiers
 */
export declare class PathUtils {
    /**
     * Sanitize filename by removing invalid characters
     */
    static sanitizeFilename(filename: string): string;
    /**
     * Generate safe identifier from text
     */
    static toIdentifier(text: string): string;
    /**
     * Generate slug from text (URL-friendly)
     */
    static toSlug(text: string): string;
    /**
     * Extract relative path from absolute path
     */
    static makeRelative(absolutePath: string, basePath?: string): string;
}
/**
 * Global text truncator instance
 */
export declare const textTruncator: TextTruncator;
/**
 * Global text formatter instance
 */
export declare const textFormatter: TextFormatter;
/**
 * Configure global string processing utilities
 */
export declare function configureStringUtils(config: Partial<StringProcessingConfig>): void;
/**
 * Truncate text using global truncator
 */
export declare function truncateText(text: string, maxLength?: number, options?: {
    suffix?: string;
    preserveWords?: boolean;
    strategy?: 'end' | 'middle' | 'start';
}): string;
/**
 * Format text for console using global formatter
 */
export declare function formatForConsole(text: string, options?: {
    indent?: number;
    prefix?: string;
    width?: number;
    wrapLines?: boolean;
}): string;
/**
 * Normalize whitespace using global formatter
 */
export declare function normalizeWhitespace(text: string): string;
/**
 * Escape HTML using global formatter
 */
export declare function escapeHtml(text: string): string;
/**
 * Escape regex using global formatter
 */
export declare function escapeRegex(text: string): string;
/**
 * Escape shell command using global formatter
 */
export declare function escapeShell(text: string): string;
/**
 * Create text summary using global formatter
 */
export declare function createSummary(text: string, maxLength?: number, options?: {
    extractKeywords?: boolean;
    preserveStructure?: boolean;
}): string;
/**
 * Sanitize filename
 */
export declare function sanitizeFilename(filename: string): string;
/**
 * Convert text to identifier
 */
export declare function toIdentifier(text: string): string;
/**
 * Convert text to slug
 */
export declare function toSlug(text: string): string;
//# sourceMappingURL=string-utils.d.ts.map