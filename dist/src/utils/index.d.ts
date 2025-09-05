/**
 * Utility functions and helpers for GAN Auditor Integration
 *
 * This module exports all utility functions including file system operations,
 * string processing, git commands, JSON parsing, and validation helpers.
 *
 * Requirements addressed:
 * - 4.5: Comprehensive utility functions for all components
 * - 7.3: Error handling and safe operations
 * - 7.4: Graceful degradation and fallback strategies
 */
export * from './error-handler.js';
export * from './logger.js';
export * from './file-utils.js';
export * from './string-utils.js';
export * from './git-utils.js';
export * from './json-utils.js';
export * from './validation-utils.js';
import { type ErrorHandlerConfig } from './error-handler.js';
import { type LoggerConfig } from './logger.js';
import { type FileSystemConfig } from './file-utils.js';
import { type StringProcessingConfig } from './string-utils.js';
import { type GitConfig } from './git-utils.js';
import { type JsonParsingConfig } from './json-utils.js';
import { type ValidationConfig } from './validation-utils.js';
/**
 * Global configuration for all utilities
 */
export interface UtilsConfig {
    errorHandler?: Partial<ErrorHandlerConfig>;
    logger?: Partial<LoggerConfig>;
    fileUtils?: Partial<FileSystemConfig>;
    stringUtils?: Partial<StringProcessingConfig>;
    gitUtils?: Partial<GitConfig>;
    jsonUtils?: Partial<JsonParsingConfig>;
    validationUtils?: Partial<ValidationConfig>;
}
/**
 * Configure all utilities with a single configuration object
 */
export declare function configureAllUtils(config: UtilsConfig): void;
/**
 * Get default configuration for development environment
 */
export declare function getDevConfig(): UtilsConfig;
/**
 * Get default configuration for production environment
 */
export declare function getProdConfig(): UtilsConfig;
/**
 * Initialize utilities with environment-appropriate configuration
 */
export declare function initializeUtils(environment?: 'development' | 'production' | 'test'): void;
/**
 * Health check for all utilities
 */
export declare function checkUtilsHealth(): Promise<{
    healthy: boolean;
    checks: Record<string, {
        status: 'ok' | 'error';
        message?: string;
    }>;
}>;
//# sourceMappingURL=index.d.ts.map