/**
 * File system utilities for GAN Auditor Integration
 *
 * This module provides safe file operations, directory creation, and
 * file system utilities with proper error handling.
 *
 * Requirements addressed:
 * - 4.5: Safe file operations and directory management
 * - 7.3: Error handling for file access issues
 * - 7.4: Graceful degradation for file system failures
 */
import type { GanAuditorError } from '../types/error-types.js';
/**
 * Configuration for file system operations
 */
export interface FileSystemConfig {
    maxFileSize: number;
    allowedExtensions: string[];
    blockedPaths: string[];
    createMissingDirectories: boolean;
    backupOnOverwrite: boolean;
    encoding: BufferEncoding;
    retryAttempts: number;
    retryDelay: number;
}
/**
 * Safe file system operations with error handling
 */
export declare class FileSystemUtils {
    private config;
    constructor(config?: Partial<FileSystemConfig>);
    /**
     * Safely read a file with error handling
     */
    readFile(filePath: string): Promise<{
        success: boolean;
        content?: string;
        error?: GanAuditorError;
    }>;
    /**
     * Safely write a file with error handling
     */
    writeFile(filePath: string, content: string, options?: {
        createDirectories?: boolean;
        backup?: boolean;
    }): Promise<{
        success: boolean;
        error?: GanAuditorError;
    }>;
    /**
     * Safely append to a file with error handling
     */
    appendFile(filePath: string, content: string): Promise<{
        success: boolean;
        error?: GanAuditorError;
    }>;
    /**
     * Check if a file or directory exists
     */
    exists(path: string): Promise<boolean>;
    /**
     * Get file or directory stats safely
     */
    getStats(path: string): Promise<{
        success: boolean;
        stats?: any;
        error?: GanAuditorError;
    }>;
    /**
     * Ensure a directory exists, creating it if necessary
     */
    ensureDirectory(dirPath: string): Promise<{
        success: boolean;
        created?: boolean;
        error?: GanAuditorError;
    }>;
    /**
     * List directory contents safely
     */
    listDirectory(dirPath: string, options?: {
        recursive?: boolean;
        includeStats?: boolean;
    }): Promise<{
        success: boolean;
        entries?: string[];
        error?: GanAuditorError;
    }>;
    /**
     * Delete a file or directory safely
     */
    delete(path: string, options?: {
        recursive?: boolean;
    }): Promise<{
        success: boolean;
        error?: GanAuditorError;
    }>;
    /**
     * Copy a file or directory safely
     */
    copy(sourcePath: string, destPath: string, options?: {
        overwrite?: boolean;
        preserveTimestamps?: boolean;
    }): Promise<{
        success: boolean;
        error?: GanAuditorError;
    }>;
    /**
     * Create a temporary file
     */
    createTempFile(prefix?: string, suffix?: string): Promise<{
        success: boolean;
        path?: string;
        error?: GanAuditorError;
    }>;
    /**
     * Calculate file hash
     */
    calculateHash(filePath: string, algorithm?: string): Promise<{
        success: boolean;
        hash?: string;
        error?: GanAuditorError;
    }>;
    /**
     * Validate file path for operations
     */
    private validateFilePath;
    /**
     * List directory contents recursively
     */
    private listDirectoryRecursive;
    /**
     * Create backup of existing file
     */
    private createBackup;
}
/**
 * Global file system utilities instance
 */
export declare const fileUtils: FileSystemUtils;
/**
 * Configure the global file system utilities
 */
export declare function configureFileUtils(config: Partial<FileSystemConfig>): void;
/**
 * Safely read a file using global file utils
 */
export declare function readFileSafe(filePath: string): Promise<{
    success: boolean;
    content?: string;
    error?: GanAuditorError;
}>;
/**
 * Safely write a file using global file utils
 */
export declare function writeFileSafe(filePath: string, content: string, options?: {
    createDirectories?: boolean;
    backup?: boolean;
}): Promise<{
    success: boolean;
    error?: GanAuditorError;
}>;
/**
 * Ensure directory exists using global file utils
 */
export declare function ensureDirectorySafe(dirPath: string): Promise<{
    success: boolean;
    created?: boolean;
    error?: GanAuditorError;
}>;
/**
 * Check if path exists using global file utils
 */
export declare function pathExists(path: string): Promise<boolean>;
/**
 * List directory contents using global file utils
 */
export declare function listDirectorySafe(dirPath: string, options?: {
    recursive?: boolean;
    includeStats?: boolean;
}): Promise<{
    success: boolean;
    entries?: string[];
    error?: GanAuditorError;
}>;
/**
 * Delete path using global file utils
 */
export declare function deleteSafe(path: string, options?: {
    recursive?: boolean;
}): Promise<{
    success: boolean;
    error?: GanAuditorError;
}>;
/**
 * Copy file using global file utils
 */
export declare function copySafe(sourcePath: string, destPath: string, options?: {
    overwrite?: boolean;
    preserveTimestamps?: boolean;
}): Promise<{
    success: boolean;
    error?: GanAuditorError;
}>;
//# sourceMappingURL=file-utils.d.ts.map