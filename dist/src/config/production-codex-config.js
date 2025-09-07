/**
 * Production Codex CLI Configuration
 *
 * This module defines production-specific configuration for Codex CLI integration,
 * removing all mock functionality and adding strict validation requirements.
 *
 * Requirements: 1.4 - Production configuration validation
 */
import { z } from 'zod';
// ============================================================================
// Production Codex Configuration Schema
// ============================================================================
/**
 * Production Codex CLI configuration schema with strict validation
 */
export const ProductionCodexConfigSchema = z.object({
    // Executable configuration
    executable: z.string().min(1, 'Codex executable path is required'),
    executablePaths: z.array(z.string()).default([
        '/usr/local/bin/codex',
        '/usr/bin/codex',
        'codex'
    ]),
    // Process management
    timeout: z.number().min(1000).max(300000).default(30000), // 1s to 5min
    maxConcurrentProcesses: z.number().min(1).max(20).default(5),
    processCleanupTimeout: z.number().min(1000).max(30000).default(5000),
    // Environment
    preserveEnvironmentVars: z.array(z.string()).default([
        'PATH',
        'HOME',
        'USER',
        'SHELL',
        'LANG',
        'LC_ALL'
    ]),
    additionalEnvironmentVars: z.record(z.string(), z.string()).default({}),
    // Error handling - NO FALLBACKS ALLOWED
    maxRetries: z.number().min(0).max(3).default(1),
    retryDelay: z.number().min(100).max(10000).default(1000),
    failFast: z.literal(true).default(true), // Must be true in production
    // Monitoring
    healthCheckInterval: z.number().min(5000).max(300000).default(30000),
    performanceMetricsEnabled: z.boolean().default(true),
    // Validation requirements
    requireCodexAvailable: z.literal(true).default(true), // Must be true
    validateOnStartup: z.literal(true).default(true), // Must be true
    allowMockFallback: z.literal(false).default(false), // Must be false
});
/**
 * Default production configuration
 */
export const DEFAULT_PRODUCTION_CODEX_CONFIG = {
    executable: 'codex',
    executablePaths: [
        '/usr/local/bin/codex',
        '/usr/bin/codex',
        'codex'
    ],
    timeout: 30000,
    maxConcurrentProcesses: 5,
    processCleanupTimeout: 5000,
    preserveEnvironmentVars: [
        'PATH',
        'HOME',
        'USER',
        'SHELL',
        'LANG',
        'LC_ALL'
    ],
    additionalEnvironmentVars: {},
    maxRetries: 1,
    retryDelay: 1000,
    failFast: true,
    healthCheckInterval: 30000,
    performanceMetricsEnabled: true,
    requireCodexAvailable: true,
    validateOnStartup: true,
    allowMockFallback: false,
};
// ============================================================================
// Environment Variable Mapping
// ============================================================================
/**
 * Environment variable names for production Codex configuration
 */
export const PRODUCTION_CODEX_ENV_VARS = {
    CODEX_EXECUTABLE: 'CODEX_EXECUTABLE',
    CODEX_EXECUTABLE_PATHS: 'CODEX_EXECUTABLE_PATHS',
    CODEX_TIMEOUT: 'CODEX_TIMEOUT',
    CODEX_MAX_CONCURRENT_PROCESSES: 'CODEX_MAX_CONCURRENT_PROCESSES',
    CODEX_PROCESS_CLEANUP_TIMEOUT: 'CODEX_PROCESS_CLEANUP_TIMEOUT',
    CODEX_PRESERVE_ENV_VARS: 'CODEX_PRESERVE_ENV_VARS',
    CODEX_ADDITIONAL_ENV_VARS: 'CODEX_ADDITIONAL_ENV_VARS',
    CODEX_MAX_RETRIES: 'CODEX_MAX_RETRIES',
    CODEX_RETRY_DELAY: 'CODEX_RETRY_DELAY',
    CODEX_FAIL_FAST: 'CODEX_FAIL_FAST',
    CODEX_HEALTH_CHECK_INTERVAL: 'CODEX_HEALTH_CHECK_INTERVAL',
    CODEX_PERFORMANCE_METRICS_ENABLED: 'CODEX_PERFORMANCE_METRICS_ENABLED',
    CODEX_REQUIRE_AVAILABLE: 'CODEX_REQUIRE_AVAILABLE',
    CODEX_VALIDATE_ON_STARTUP: 'CODEX_VALIDATE_ON_STARTUP',
    CODEX_ALLOW_MOCK_FALLBACK: 'CODEX_ALLOW_MOCK_FALLBACK',
};
/**
 * Parse production Codex configuration from environment variables
 */
export function parseProductionCodexConfigFromEnv() {
    const config = {
        executable: process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_EXECUTABLE] || DEFAULT_PRODUCTION_CODEX_CONFIG.executable,
        executablePaths: process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_EXECUTABLE_PATHS]
            ? process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_EXECUTABLE_PATHS].split(',').map(p => p.trim())
            : DEFAULT_PRODUCTION_CODEX_CONFIG.executablePaths,
        timeout: parseInt(process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_TIMEOUT] || '30000', 10),
        maxConcurrentProcesses: parseInt(process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_MAX_CONCURRENT_PROCESSES] || '5', 10),
        processCleanupTimeout: parseInt(process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_PROCESS_CLEANUP_TIMEOUT] || '5000', 10),
        preserveEnvironmentVars: process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_PRESERVE_ENV_VARS]
            ? process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_PRESERVE_ENV_VARS].split(',').map(v => v.trim())
            : DEFAULT_PRODUCTION_CODEX_CONFIG.preserveEnvironmentVars,
        additionalEnvironmentVars: process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_ADDITIONAL_ENV_VARS]
            ? JSON.parse(process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_ADDITIONAL_ENV_VARS])
            : DEFAULT_PRODUCTION_CODEX_CONFIG.additionalEnvironmentVars,
        maxRetries: parseInt(process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_MAX_RETRIES] || '1', 10),
        retryDelay: parseInt(process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_RETRY_DELAY] || '1000', 10),
        failFast: true, // Always true in production
        healthCheckInterval: parseInt(process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_HEALTH_CHECK_INTERVAL] || '30000', 10),
        performanceMetricsEnabled: process.env[PRODUCTION_CODEX_ENV_VARS.CODEX_PERFORMANCE_METRICS_ENABLED] !== 'false',
        requireCodexAvailable: true, // Always true in production
        validateOnStartup: true, // Always true in production
        allowMockFallback: false, // Always false in production
    };
    // Validate the configuration
    const result = ProductionCodexConfigSchema.safeParse(config);
    if (!result.success) {
        const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Invalid production Codex configuration: ${errors}`);
    }
    return result.data;
}
/**
 * Validate that production configuration meets requirements
 */
export function validateProductionCodexConfig(config) {
    // Ensure no mock functionality is enabled
    if (config.allowMockFallback) {
        throw new Error('Mock fallback is not allowed in production configuration');
    }
    // Ensure fail-fast is enabled
    if (!config.failFast) {
        throw new Error('Fail-fast must be enabled in production configuration');
    }
    // Ensure Codex availability is required
    if (!config.requireCodexAvailable) {
        throw new Error('Codex availability must be required in production configuration');
    }
    // Ensure startup validation is enabled
    if (!config.validateOnStartup) {
        throw new Error('Startup validation must be enabled in production configuration');
    }
    // Validate timeout ranges
    if (config.timeout < 1000 || config.timeout > 300000) {
        throw new Error('Timeout must be between 1 second and 5 minutes');
    }
    // Validate process limits
    if (config.maxConcurrentProcesses < 1 || config.maxConcurrentProcesses > 20) {
        throw new Error('Max concurrent processes must be between 1 and 20');
    }
    // Validate executable path is provided
    if (!config.executable || config.executable.trim().length === 0) {
        throw new Error('Codex executable path is required');
    }
}
/**
 * Create production configuration with validation
 */
export function createProductionCodexConfig(overrides = {}) {
    const config = {
        ...DEFAULT_PRODUCTION_CODEX_CONFIG,
        ...overrides,
        // Force production-only values
        failFast: true,
        requireCodexAvailable: true,
        validateOnStartup: true,
        allowMockFallback: false,
    };
    validateProductionCodexConfig(config);
    return config;
}
//# sourceMappingURL=production-codex-config.js.map