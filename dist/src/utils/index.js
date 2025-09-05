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
// Error handling utilities
export * from './error-handler.js';
// Logging utilities
export * from './logger.js';
// File system utilities
export * from './file-utils.js';
// String processing utilities
export * from './string-utils.js';
// Git command utilities
export * from './git-utils.js';
// JSON parsing utilities
export * from './json-utils.js';
// Validation utilities
export * from './validation-utils.js';
// ============================================================================
// Utility Configuration
// ============================================================================
import { configureErrorHandler, } from './error-handler.js';
import { configureLogger, } from './logger.js';
import { configureFileUtils, } from './file-utils.js';
import { configureStringUtils, } from './string-utils.js';
import { configureGitUtils, } from './git-utils.js';
import { configureJsonUtils, } from './json-utils.js';
import { configureValidationUtils, } from './validation-utils.js';
/**
 * Configure all utilities with a single configuration object
 */
export function configureAllUtils(config) {
    if (config.errorHandler) {
        configureErrorHandler(config.errorHandler);
    }
    if (config.logger) {
        configureLogger(config.logger);
    }
    if (config.fileUtils) {
        configureFileUtils(config.fileUtils);
    }
    if (config.stringUtils) {
        configureStringUtils(config.stringUtils);
    }
    if (config.gitUtils) {
        configureGitUtils(config.gitUtils);
    }
    if (config.jsonUtils) {
        configureJsonUtils(config.jsonUtils);
    }
    if (config.validationUtils) {
        configureValidationUtils(config.validationUtils);
    }
}
/**
 * Get default configuration for development environment
 */
export function getDevConfig() {
    return {
        logger: {
            enabled: true,
            level: 'debug',
            colorOutput: true,
            includeTimestamp: true,
        },
        errorHandler: {
            enableRetry: true,
            maxRetries: 2,
            enableFallback: true,
            enableGracefulDegradation: true,
            logErrors: true,
        },
        fileUtils: {
            createMissingDirectories: true,
            backupOnOverwrite: false,
            maxFileSize: 5 * 1024 * 1024, // 5MB for dev
        },
        stringUtils: {
            maxLength: 5000,
            preserveWords: true,
            normalizeWhitespace: true,
        },
        gitUtils: {
            timeout: 15000, // 15 seconds for dev
            enableFallback: true,
        },
        jsonUtils: {
            enableGreedyParsing: true,
            enableRepairAttempts: true,
            strictMode: false,
        },
        validationUtils: {
            strictMode: false,
            allowUnknownProperties: true,
            coerceTypes: true,
        },
    };
}
/**
 * Get default configuration for production environment
 */
export function getProdConfig() {
    return {
        logger: {
            enabled: false, // Disable logging in production by default
            level: 'error',
            colorOutput: false,
            includeTimestamp: true,
        },
        errorHandler: {
            enableRetry: true,
            maxRetries: 3,
            enableFallback: true,
            enableGracefulDegradation: true,
            logErrors: false, // Don't log errors in production
        },
        fileUtils: {
            createMissingDirectories: true,
            backupOnOverwrite: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB for prod
        },
        stringUtils: {
            maxLength: 10000,
            preserveWords: true,
            normalizeWhitespace: true,
        },
        gitUtils: {
            timeout: 30000, // 30 seconds for prod
            enableFallback: true,
        },
        jsonUtils: {
            enableGreedyParsing: true,
            enableRepairAttempts: true,
            strictMode: false,
        },
        validationUtils: {
            strictMode: true,
            allowUnknownProperties: false,
            coerceTypes: true,
        },
    };
}
/**
 * Initialize utilities with environment-appropriate configuration
 */
export function initializeUtils(environment = 'production') {
    let config;
    switch (environment) {
        case 'development':
            config = getDevConfig();
            break;
        case 'test':
            config = {
                ...getDevConfig(),
                logger: { enabled: false }, // Disable logging in tests
            };
            break;
        case 'production':
        default:
            config = getProdConfig();
            break;
    }
    configureAllUtils(config);
}
// ============================================================================
// Utility Health Check
// ============================================================================
/**
 * Health check for all utilities
 */
export async function checkUtilsHealth() {
    const checks = {};
    // Check git availability
    try {
        const { isGitAvailable } = await import('./git-utils.js');
        const gitAvailable = await isGitAvailable();
        checks.git = gitAvailable
            ? { status: 'ok' }
            : { status: 'error', message: 'Git not available' };
    }
    catch (error) {
        checks.git = { status: 'error', message: error.message };
    }
    // Check file system access
    try {
        const { pathExists } = await import('./file-utils.js');
        const canAccessCwd = await pathExists(process.cwd());
        checks.filesystem = canAccessCwd
            ? { status: 'ok' }
            : { status: 'error', message: 'Cannot access current directory' };
    }
    catch (error) {
        checks.filesystem = { status: 'error', message: error.message };
    }
    // Check JSON parsing
    try {
        const { parseJsonSafe } = await import('./json-utils.js');
        const testResult = await parseJsonSafe('{"test": true}');
        checks.json = testResult.success
            ? { status: 'ok' }
            : { status: 'error', message: 'JSON parsing failed' };
    }
    catch (error) {
        checks.json = { status: 'error', message: error.message };
    }
    // Check validation
    try {
        const { validateData } = await import('./validation-utils.js');
        const testResult = validateData('test', { type: 'string' });
        checks.validation = testResult.valid
            ? { status: 'ok' }
            : { status: 'error', message: 'Validation failed' };
    }
    catch (error) {
        checks.validation = { status: 'error', message: error.message };
    }
    const healthy = Object.values(checks).every(check => check.status === 'ok');
    return { healthy, checks };
}
//# sourceMappingURL=index.js.map