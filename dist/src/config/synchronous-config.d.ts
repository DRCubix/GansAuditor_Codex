/**
 * Configuration system for synchronous audit workflow
 *
 * This module provides environment variable parsing, runtime configuration,
 * and validation for the synchronous audit workflow features.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
import type { CompletionCriteria, SynchronousWorkflowConfig, AuditTimeoutConfig, ConcurrencyConfig, RuntimeConfig, EnvironmentConfig } from '../types/synchronous-response-types.js';
/**
 * Default completion criteria for synchronous audit workflow
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.7
 */
export declare const DEFAULT_COMPLETION_CRITERIA: CompletionCriteria;
/**
 * Default audit timeout configuration
 * Requirements: 7.1, 7.2, 9.1
 */
export declare const DEFAULT_AUDIT_TIMEOUT_CONFIG: AuditTimeoutConfig;
/**
 * Default concurrency configuration
 * Requirements: 9.2, 9.3
 */
export declare const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyConfig;
/**
 * Default synchronous workflow configuration
 * Requirements: 1.1, 1.2, 4.1, 4.2
 */
export declare const DEFAULT_SYNCHRONOUS_CONFIG: SynchronousWorkflowConfig;
/**
 * Build completion criteria from environment variables
 * Environment variables:
 * - SYNC_AUDIT_TIER1_SCORE (default: 95)
 * - SYNC_AUDIT_TIER1_LOOPS (default: 10)
 * - SYNC_AUDIT_TIER2_SCORE (default: 90)
 * - SYNC_AUDIT_TIER2_LOOPS (default: 15)
 * - SYNC_AUDIT_TIER3_SCORE (default: 85)
 * - SYNC_AUDIT_TIER3_LOOPS (default: 20)
 * - SYNC_AUDIT_HARD_STOP_LOOPS (default: 25)
 * - SYNC_AUDIT_STAGNATION_START_LOOP (default: 10)
 * - SYNC_AUDIT_STAGNATION_THRESHOLD (default: 0.95)
 */
export declare function buildCompletionCriteriaFromEnv(): CompletionCriteria;
/**
 * Build audit timeout configuration from environment variables
 * Environment variables:
 * - AUDIT_TIMEOUT_SECONDS (default: 30)
 * - AUDIT_PROGRESS_INDICATOR_INTERVAL (default: 5000)
 * - ENABLE_AUDIT_PROGRESS_INDICATORS (default: true)
 * - AUDIT_TIMEOUT_RETRY_ATTEMPTS (default: 1)
 * - AUDIT_PARTIAL_RESULTS_ON_TIMEOUT (default: true)
 */
export declare function buildAuditTimeoutConfigFromEnv(): AuditTimeoutConfig;
/**
 * Build concurrency configuration from environment variables
 * Environment variables:
 * - MAX_CONCURRENT_AUDITS (default: 5)
 * - MAX_CONCURRENT_SESSIONS (default: 50)
 * - AUDIT_QUEUE_TIMEOUT (default: 60000)
 * - ENABLE_AUDIT_QUEUE (default: true)
 * - SESSION_CLEANUP_INTERVAL (default: 3600000)
 * - MAX_SESSION_AGE (default: 86400000)
 */
export declare function buildConcurrencyConfigFromEnv(): ConcurrencyConfig;
/**
 * Build synchronous workflow configuration from environment variables
 * Environment variables:
 * - ENABLE_SYNCHRONOUS_AUDIT (default: false)
 * - ENABLE_STAGNATION_DETECTION (default: true)
 * - ENABLE_CODEX_CONTEXT_MANAGEMENT (default: true)
 * - SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL (default: 'detailed')
 * - ENABLE_AUDIT_CACHING (default: true)
 * - ENABLE_SESSION_PERSISTENCE (default: true)
 * - SYNC_AUDIT_STATE_DIRECTORY (default: '.mcp-gan-state')
 * - ENABLE_SYNC_AUDIT_METRICS (default: false)
 * - ENABLE_SYNC_AUDIT_HEALTH_CHECKS (default: false)
 */
export declare function buildSynchronousConfigFromEnv(): SynchronousWorkflowConfig;
/**
 * Build complete runtime configuration from environment variables
 */
export declare function buildRuntimeConfigFromEnv(): RuntimeConfig;
/**
 * Validate runtime configuration for consistency and constraints
 */
export declare function validateRuntimeConfig(config: RuntimeConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
};
/**
 * Merge runtime configuration with overrides
 */
export declare function mergeRuntimeConfig(base: RuntimeConfig, overrides: Partial<RuntimeConfig>): RuntimeConfig;
/**
 * Create runtime configuration with validation
 */
export declare function createRuntimeConfig(overrides?: Partial<RuntimeConfig>): {
    config: RuntimeConfig;
    validation: ReturnType<typeof validateRuntimeConfig>;
};
/**
 * Get environment configuration summary for debugging
 */
export declare function getEnvironmentConfigSummary(): EnvironmentConfig;
/**
 * Check if synchronous mode is properly configured
 */
export declare function isSynchronousModeReady(): {
    ready: boolean;
    issues: string[];
    recommendations: string[];
};
/**
 * Generate configuration migration recommendations
 */
export declare function generateMigrationRecommendations(): {
    currentConfig: EnvironmentConfig;
    recommendations: Array<{
        category: string;
        priority: 'high' | 'medium' | 'low';
        description: string;
        envVar?: string;
        suggestedValue?: string;
    }>;
};
//# sourceMappingURL=synchronous-config.d.ts.map