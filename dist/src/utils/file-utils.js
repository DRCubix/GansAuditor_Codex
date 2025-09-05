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
import { promises as fs, constants as fsConstants } from 'fs';
import { join, dirname, resolve, relative, basename, extname } from 'path';
import { createHash } from 'crypto';
import { logger, createTimer } from './logger.js';
import { handleFileSystemError } from './error-handler.js';
/**
 * Default file system configuration
 */
const DEFAULT_FS_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.ts', '.js', '.json', '.md', '.txt', '.yml', '.yaml'],
    blockedPaths: ['node_modules', '.git', 'dist', 'build'],
    createMissingDirectories: true,
    backupOnOverwrite: false,
    encoding: 'utf8',
    retryAttempts: 3,
    retryDelay: 100,
};
// ============================================================================
// File System Utilities
// ============================================================================
/**
 * Safe file system operations with error handling
 */
export class FileSystemUtils {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_FS_CONFIG, ...config };
    }
    /**
     * Safely read a file with error handling
     */
    async readFile(filePath) {
        const timer = createTimer(`read-file-${basename(filePath)}`, 'file-utils');
        try {
            // Validate file path
            const validation = await this.validateFilePath(filePath, 'read');
            if (!validation.valid) {
                timer.end({ success: false, reason: validation.reason });
                return { success: false, error: validation.error };
            }
            // Check file size
            const stats = await fs.stat(filePath);
            if (stats.size > this.config.maxFileSize) {
                const error = new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
                timer.endWithError(error);
                return {
                    success: false,
                    error: {
                        name: 'FileSystemError',
                        message: error.message,
                    }
                };
            }
            // Read file content
            const content = await fs.readFile(filePath, this.config.encoding);
            timer.end({ success: true, size: content.length });
            return { success: true, content };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                success: false,
                error: {
                    name: 'FileSystemError',
                    message: error.message,
                }
            };
        }
    }
    /**
     * Safely write a file with error handling
     */
    async writeFile(filePath, content, options = {}) {
        const timer = createTimer(`write-file-${basename(filePath)}`, 'file-utils');
        try {
            // Validate file path
            const validation = await this.validateFilePath(filePath, 'write');
            if (!validation.valid) {
                timer.end({ success: false, reason: validation.reason });
                return { success: false, error: validation.error };
            }
            // Create directories if needed
            if (options.createDirectories ?? this.config.createMissingDirectories) {
                await this.ensureDirectory(dirname(filePath));
            }
            // Create backup if requested
            if (options.backup ?? this.config.backupOnOverwrite) {
                await this.createBackup(filePath);
            }
            // Write file content
            await fs.writeFile(filePath, content, this.config.encoding);
            timer.end({ success: true, size: content.length });
            return { success: true };
        }
        catch (error) {
            timer.endWithError(error);
            return handleFileSystemError(error, filePath);
        }
    }
    /**
     * Safely append to a file with error handling
     */
    async appendFile(filePath, content) {
        const timer = createTimer(`append-file-${basename(filePath)}`, 'file-utils');
        try {
            // Validate file path
            const validation = await this.validateFilePath(filePath, 'write');
            if (!validation.valid) {
                timer.end({ success: false, reason: validation.reason });
                return { success: false, error: validation.error };
            }
            // Ensure directory exists
            await this.ensureDirectory(dirname(filePath));
            // Append content
            await fs.appendFile(filePath, content, this.config.encoding);
            timer.end({ success: true, size: content.length });
            return { success: true };
        }
        catch (error) {
            timer.endWithError(error);
            return handleFileSystemError(error, filePath);
        }
    }
    /**
     * Check if a file or directory exists
     */
    async exists(path) {
        try {
            await fs.access(path, fsConstants.F_OK);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get file or directory stats safely
     */
    async getStats(path) {
        try {
            const stats = await fs.stat(path);
            return { success: true, stats };
        }
        catch (error) {
            return handleFileSystemError(error, path);
        }
    }
    /**
     * Ensure a directory exists, creating it if necessary
     */
    async ensureDirectory(dirPath) {
        const timer = createTimer(`ensure-directory-${basename(dirPath)}`, 'file-utils');
        try {
            // Check if directory already exists
            const exists = await this.exists(dirPath);
            if (exists) {
                timer.end({ success: true, created: false });
                return { success: true, created: false };
            }
            // Create directory recursively
            await fs.mkdir(dirPath, { recursive: true });
            timer.end({ success: true, created: true });
            return { success: true, created: true };
        }
        catch (error) {
            timer.endWithError(error);
            return handleFileSystemError(error, dirPath);
        }
    }
    /**
     * List directory contents safely
     */
    async listDirectory(dirPath, options = {}) {
        const timer = createTimer(`list-directory-${basename(dirPath)}`, 'file-utils');
        try {
            // Validate directory path
            const validation = await this.validateFilePath(dirPath, 'read');
            if (!validation.valid) {
                timer.end({ success: false, reason: validation.reason });
                return { success: false, error: validation.error };
            }
            let entries;
            if (options.recursive) {
                entries = await this.listDirectoryRecursive(dirPath);
            }
            else {
                const dirEntries = await fs.readdir(dirPath);
                entries = dirEntries.map(entry => join(dirPath, entry));
            }
            timer.end({ success: true, count: entries.length });
            return { success: true, entries };
        }
        catch (error) {
            timer.endWithError(error);
            return handleFileSystemError(error, dirPath);
        }
    }
    /**
     * Delete a file or directory safely
     */
    async delete(path, options = {}) {
        const timer = createTimer(`delete-${basename(path)}`, 'file-utils');
        try {
            // Check if path exists
            const exists = await this.exists(path);
            if (!exists) {
                timer.end({ success: true, reason: 'not-found' });
                return { success: true }; // Not an error if it doesn't exist
            }
            // Get stats to determine if it's a file or directory
            const statsResult = await this.getStats(path);
            if (!statsResult.success) {
                return statsResult;
            }
            if (statsResult.stats.isDirectory()) {
                await fs.rmdir(path, { recursive: options.recursive });
            }
            else {
                await fs.unlink(path);
            }
            timer.end({ success: true });
            return { success: true };
        }
        catch (error) {
            timer.endWithError(error);
            return handleFileSystemError(error, path);
        }
    }
    /**
     * Copy a file or directory safely
     */
    async copy(sourcePath, destPath, options = {}) {
        const timer = createTimer(`copy-${basename(sourcePath)}`, 'file-utils');
        try {
            // Validate source path
            const sourceValidation = await this.validateFilePath(sourcePath, 'read');
            if (!sourceValidation.valid) {
                timer.end({ success: false, reason: sourceValidation.reason });
                return { success: false, error: sourceValidation.error };
            }
            // Validate destination path
            const destValidation = await this.validateFilePath(destPath, 'write');
            if (!destValidation.valid) {
                timer.end({ success: false, reason: destValidation.reason });
                return { success: false, error: destValidation.error };
            }
            // Check if destination exists and handle overwrite
            const destExists = await this.exists(destPath);
            if (destExists && !options.overwrite) {
                const error = new Error(`Destination already exists: ${destPath}`);
                timer.endWithError(error);
                return handleFileSystemError(error, destPath);
            }
            // Ensure destination directory exists
            await this.ensureDirectory(dirname(destPath));
            // Copy file
            await fs.copyFile(sourcePath, destPath);
            // Preserve timestamps if requested
            if (options.preserveTimestamps) {
                const sourceStats = await fs.stat(sourcePath);
                await fs.utimes(destPath, sourceStats.atime, sourceStats.mtime);
            }
            timer.end({ success: true });
            return { success: true };
        }
        catch (error) {
            timer.endWithError(error);
            return handleFileSystemError(error, sourcePath);
        }
    }
    /**
     * Create a temporary file
     */
    async createTempFile(prefix = 'gan-auditor', suffix = '.tmp') {
        const timer = createTimer('create-temp-file', 'file-utils');
        try {
            const tempDir = process.env.TMPDIR || process.env.TEMP || '/tmp';
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2);
            const filename = `${prefix}-${timestamp}-${random}${suffix}`;
            const tempPath = join(tempDir, filename);
            // Create empty file
            await fs.writeFile(tempPath, '', this.config.encoding);
            timer.end({ success: true, path: tempPath });
            return { success: true, path: tempPath };
        }
        catch (error) {
            timer.endWithError(error);
            return handleFileSystemError(error, 'temp-file');
        }
    }
    /**
     * Calculate file hash
     */
    async calculateHash(filePath, algorithm = 'sha256') {
        const timer = createTimer(`hash-${basename(filePath)}`, 'file-utils');
        try {
            const readResult = await this.readFile(filePath);
            if (!readResult.success) {
                return readResult;
            }
            const hash = createHash(algorithm);
            hash.update(readResult.content);
            const hashValue = hash.digest('hex');
            timer.end({ success: true, algorithm });
            return { success: true, hash: hashValue };
        }
        catch (error) {
            timer.endWithError(error);
            return handleFileSystemError(error, filePath);
        }
    }
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    /**
     * Validate file path for operations
     */
    async validateFilePath(filePath, operation) {
        try {
            // Resolve path to absolute
            const absolutePath = resolve(filePath);
            // Check for blocked paths
            const relativePath = relative(process.cwd(), absolutePath);
            for (const blockedPath of this.config.blockedPaths) {
                if (relativePath.startsWith(blockedPath)) {
                    const error = new Error(`Access denied to blocked path: ${blockedPath}`);
                    return {
                        valid: false,
                        reason: 'blocked-path',
                        error: { name: 'FileSystemError', message: error.message }
                    };
                }
            }
            // Check file extension for allowed types
            const ext = extname(filePath).toLowerCase();
            if (ext && !this.config.allowedExtensions.includes(ext)) {
                const error = new Error(`File extension not allowed: ${ext}`);
                return {
                    valid: false,
                    reason: 'invalid-extension',
                    error: { name: 'FileSystemError', message: error.message }
                };
            }
            // For read operations, check if file exists
            if (operation === 'read') {
                const exists = await this.exists(filePath);
                if (!exists) {
                    const error = new Error(`File not found: ${filePath}`);
                    return {
                        valid: false,
                        reason: 'not-found',
                        error: { name: 'FileSystemError', message: error.message }
                    };
                }
            }
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                reason: 'validation-error',
                error: { name: 'FileSystemError', message: error.message }
            };
        }
    }
    /**
     * List directory contents recursively
     */
    async listDirectoryRecursive(dirPath) {
        const entries = [];
        const processDirectory = async (currentPath) => {
            const dirEntries = await fs.readdir(currentPath);
            for (const entry of dirEntries) {
                const fullPath = join(currentPath, entry);
                const stats = await fs.stat(fullPath);
                if (stats.isDirectory()) {
                    // Skip blocked directories
                    const relativePath = relative(process.cwd(), fullPath);
                    const isBlocked = this.config.blockedPaths.some(blocked => relativePath.includes(blocked));
                    if (!isBlocked) {
                        entries.push(fullPath);
                        await processDirectory(fullPath);
                    }
                }
                else {
                    entries.push(fullPath);
                }
            }
        };
        await processDirectory(dirPath);
        return entries;
    }
    /**
     * Create backup of existing file
     */
    async createBackup(filePath) {
        const exists = await this.exists(filePath);
        if (!exists) {
            return; // No backup needed if file doesn't exist
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${filePath}.backup-${timestamp}`;
        await fs.copyFile(filePath, backupPath);
        logger.debug(`Created backup: ${backupPath}`, { original: filePath, backup: backupPath }, 'file-utils');
    }
}
// ============================================================================
// Global File System Utils Instance
// ============================================================================
/**
 * Global file system utilities instance
 */
export const fileUtils = new FileSystemUtils();
/**
 * Configure the global file system utilities
 */
export function configureFileUtils(config) {
    fileUtils.config = { ...DEFAULT_FS_CONFIG, ...config };
}
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Safely read a file using global file utils
 */
export async function readFileSafe(filePath) {
    return fileUtils.readFile(filePath);
}
/**
 * Safely write a file using global file utils
 */
export async function writeFileSafe(filePath, content, options) {
    return fileUtils.writeFile(filePath, content, options);
}
/**
 * Ensure directory exists using global file utils
 */
export async function ensureDirectorySafe(dirPath) {
    return fileUtils.ensureDirectory(dirPath);
}
/**
 * Check if path exists using global file utils
 */
export async function pathExists(path) {
    return fileUtils.exists(path);
}
/**
 * List directory contents using global file utils
 */
export async function listDirectorySafe(dirPath, options) {
    return fileUtils.listDirectory(dirPath, options);
}
/**
 * Delete path using global file utils
 */
export async function deleteSafe(path, options) {
    return fileUtils.delete(path, options);
}
/**
 * Copy file using global file utils
 */
export async function copySafe(sourcePath, destPath, options) {
    return fileUtils.copy(sourcePath, destPath, options);
}
//# sourceMappingURL=file-utils.js.map