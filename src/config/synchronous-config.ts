/**
 * Configuration system for synchronous audit workflow
 * 
 * This module provides environment variable parsing, runtime configuration,
 * and validation for the synchronous audit workflow features.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import type {
  CompletionCriteria,
  SynchronousWorkflowConfig,
  AuditTimeoutConfig,
  ConcurrencyConfig,
  RuntimeConfig,
  EnvironmentConfig,
} from '../types/synchronous-response-types.js';

// ============================================================================
// Default Configuration Values
// ============================================================================

/**
 * Default completion criteria for synchronous audit workflow
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.7
 */
export const DEFAULT_COMPLETION_CRITERIA: CompletionCriteria = {
  tier1: { score: 95, maxLoops: 10 },
  tier2: { score: 90, maxLoops: 15 },
  tier3: { score: 85, maxLoops: 20 },
  hardStop: { maxLoops: 25 },
  stagnationCheck: { 
    startLoop: 10, 
    similarityThreshold: 0.95 
  },
};

/**
 * Default audit timeout configuration
 * Requirements: 7.1, 7.2, 9.1
 */
export const DEFAULT_AUDIT_TIMEOUT_CONFIG: AuditTimeoutConfig = {
  auditTimeoutSeconds: 30,
  progressIndicatorInterval: 5000, // 5 seconds
  enableProgressIndicators: true,
  timeoutRetryAttempts: 1,
  partialResultsOnTimeout: true,
};

/**
 * Default concurrency configuration
 * Requirements: 9.2, 9.3
 */
export const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyConfig = {
  maxConcurrentAudits: 5,
  maxConcurrentSessions: 50,
  queueTimeout: 60000, // 1 minute
  enableAuditQueue: true,
  sessionCleanupInterval: 3600000, // 1 hour
  maxSessionAge: 86400000, // 24 hours
};

/**
 * Default synchronous workflow configuration
 * Requirements: 1.1, 1.2, 4.1, 4.2
 */
export const DEFAULT_SYNCHRONOUS_CONFIG: SynchronousWorkflowConfig = {
  enabled: false,
  enableStagnationDetection: true,
  enableCodexContextManagement: true,
  feedbackDetailLevel: 'detailed',
  enableAuditCaching: true,
  enableSessionPersistence: true,
  stateDirectory: '.mcp-gan-state',
  enableMetrics: false,
  enableHealthChecks: false,
};

// ============================================================================
// Environment Variable Parsing
// ============================================================================

/**
 * Parse boolean environment variable with default fallback
 */
function parseEnvBoolean(envVar: string | undefined, defaultValue: boolean): boolean {
  if (!envVar) return defaultValue;
  return envVar.toLowerCase() === 'true';
}

/**
 * Parse integer environment variable with validation
 */
function parseEnvInteger(
  envVar: string | undefined, 
  defaultValue: number, 
  min?: number, 
  max?: number
): number {
  if (!envVar) return defaultValue;
  
  const parsed = parseInt(envVar, 10);
  if (isNaN(parsed)) return defaultValue;
  
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  
  return parsed;
}

/**
 * Parse float environment variable with validation
 */
function parseEnvFloat(
  envVar: string | undefined, 
  defaultValue: number, 
  min?: number, 
  max?: number
): number {
  if (!envVar) return defaultValue;
  
  const parsed = parseFloat(envVar);
  if (isNaN(parsed)) return defaultValue;
  
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  
  return parsed;
}

/**
 * Parse string environment variable with validation
 */
function parseEnvString<T extends string>(
  envVar: string | undefined, 
  defaultValue: T, 
  validValues?: T[]
): T {
  if (!envVar) return defaultValue;
  
  if (validValues && !validValues.includes(envVar as T)) {
    return defaultValue;
  }
  
  return envVar as T;
}

// ============================================================================
// Configuration Builders
// ============================================================================

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
export function buildCompletionCriteriaFromEnv(): CompletionCriteria {
  return {
    tier1: {
      score: parseEnvInteger(process.env.SYNC_AUDIT_TIER1_SCORE, 95, 0, 100),
      maxLoops: parseEnvInteger(process.env.SYNC_AUDIT_TIER1_LOOPS, 10, 1, 100),
    },
    tier2: {
      score: parseEnvInteger(process.env.SYNC_AUDIT_TIER2_SCORE, 90, 0, 100),
      maxLoops: parseEnvInteger(process.env.SYNC_AUDIT_TIER2_LOOPS, 15, 1, 100),
    },
    tier3: {
      score: parseEnvInteger(process.env.SYNC_AUDIT_TIER3_SCORE, 85, 0, 100),
      maxLoops: parseEnvInteger(process.env.SYNC_AUDIT_TIER3_LOOPS, 20, 1, 100),
    },
    hardStop: {
      maxLoops: parseEnvInteger(process.env.SYNC_AUDIT_HARD_STOP_LOOPS, 25, 1, 1000),
    },
    stagnationCheck: {
      startLoop: parseEnvInteger(process.env.SYNC_AUDIT_STAGNATION_START_LOOP, 10, 1, 100),
      similarityThreshold: parseEnvFloat(process.env.SYNC_AUDIT_STAGNATION_THRESHOLD, 0.95, 0, 1),
    },
  };
}

/**
 * Build audit timeout configuration from environment variables
 * Environment variables:
 * - AUDIT_TIMEOUT_SECONDS (default: 30)
 * - AUDIT_PROGRESS_INDICATOR_INTERVAL (default: 5000)
 * - ENABLE_AUDIT_PROGRESS_INDICATORS (default: true)
 * - AUDIT_TIMEOUT_RETRY_ATTEMPTS (default: 1)
 * - AUDIT_PARTIAL_RESULTS_ON_TIMEOUT (default: true)
 */
export function buildAuditTimeoutConfigFromEnv(): AuditTimeoutConfig {
  return {
    auditTimeoutSeconds: parseEnvInteger(process.env.AUDIT_TIMEOUT_SECONDS, 30, 5, 300),
    progressIndicatorInterval: parseEnvInteger(process.env.AUDIT_PROGRESS_INDICATOR_INTERVAL, 5000, 1000, 30000),
    enableProgressIndicators: parseEnvBoolean(process.env.ENABLE_AUDIT_PROGRESS_INDICATORS, true),
    timeoutRetryAttempts: parseEnvInteger(process.env.AUDIT_TIMEOUT_RETRY_ATTEMPTS, 1, 0, 5),
    partialResultsOnTimeout: parseEnvBoolean(process.env.AUDIT_PARTIAL_RESULTS_ON_TIMEOUT, true),
  };
}

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
export function buildConcurrencyConfigFromEnv(): ConcurrencyConfig {
  return {
    maxConcurrentAudits: parseEnvInteger(process.env.MAX_CONCURRENT_AUDITS, 5, 1, 50),
    maxConcurrentSessions: parseEnvInteger(process.env.MAX_CONCURRENT_SESSIONS, 50, 1, 1000),
    queueTimeout: parseEnvInteger(process.env.AUDIT_QUEUE_TIMEOUT, 60000, 5000, 300000),
    enableAuditQueue: parseEnvBoolean(process.env.ENABLE_AUDIT_QUEUE, true),
    sessionCleanupInterval: parseEnvInteger(process.env.SESSION_CLEANUP_INTERVAL, 3600000, 60000, 86400000),
    maxSessionAge: parseEnvInteger(process.env.MAX_SESSION_AGE, 86400000, 300000, 604800000),
  };
}

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
export function buildSynchronousConfigFromEnv(): SynchronousWorkflowConfig {
  return {
    enabled: parseEnvBoolean(process.env.ENABLE_SYNCHRONOUS_AUDIT, false),
    enableStagnationDetection: parseEnvBoolean(process.env.ENABLE_STAGNATION_DETECTION, true),
    enableCodexContextManagement: parseEnvBoolean(process.env.ENABLE_CODEX_CONTEXT_MANAGEMENT, true),
    feedbackDetailLevel: parseEnvString(
      process.env.SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL, 
      'detailed', 
      ['basic', 'detailed', 'verbose']
    ),
    enableAuditCaching: parseEnvBoolean(process.env.ENABLE_AUDIT_CACHING, true),
    enableSessionPersistence: parseEnvBoolean(process.env.ENABLE_SESSION_PERSISTENCE, true),
    stateDirectory: process.env.SYNC_AUDIT_STATE_DIRECTORY || '.mcp-gan-state',
    enableMetrics: parseEnvBoolean(process.env.ENABLE_SYNC_AUDIT_METRICS, false),
    enableHealthChecks: parseEnvBoolean(process.env.ENABLE_SYNC_AUDIT_HEALTH_CHECKS, false),
  };
}

// ============================================================================
// Runtime Configuration Management
// ============================================================================

/**
 * Build complete runtime configuration from environment variables
 */
export function buildRuntimeConfigFromEnv(): RuntimeConfig {
  return {
    completionCriteria: buildCompletionCriteriaFromEnv(),
    auditTimeout: buildAuditTimeoutConfigFromEnv(),
    concurrency: buildConcurrencyConfigFromEnv(),
    synchronous: buildSynchronousConfigFromEnv(),
  };
}

/**
 * Validate runtime configuration for consistency and constraints
 */
export function validateRuntimeConfig(config: RuntimeConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate completion criteria consistency
  const { tier1, tier2, tier3, hardStop } = config.completionCriteria;
  
  if (tier1.score <= tier2.score) {
    warnings.push('Tier 1 score should be higher than Tier 2 score');
  }
  
  if (tier2.score <= tier3.score) {
    warnings.push('Tier 2 score should be higher than Tier 3 score');
  }
  
  if (tier1.maxLoops >= tier2.maxLoops) {
    warnings.push('Tier 1 max loops should be less than Tier 2 max loops');
  }
  
  if (tier2.maxLoops >= tier3.maxLoops) {
    warnings.push('Tier 2 max loops should be less than Tier 3 max loops');
  }
  
  if (tier3.maxLoops >= hardStop.maxLoops) {
    errors.push('Tier 3 max loops must be less than hard stop max loops');
  }

  // Validate timeout configuration
  if (config.auditTimeout.auditTimeoutSeconds < 5) {
    errors.push('Audit timeout must be at least 5 seconds');
  }
  
  if (config.auditTimeout.progressIndicatorInterval >= config.auditTimeout.auditTimeoutSeconds * 1000) {
    warnings.push('Progress indicator interval should be less than audit timeout');
  }

  // Validate concurrency configuration
  if (config.concurrency.maxConcurrentAudits < 1) {
    errors.push('Max concurrent audits must be at least 1');
  }
  
  if (config.concurrency.maxConcurrentSessions < config.concurrency.maxConcurrentAudits) {
    warnings.push('Max concurrent sessions should be at least equal to max concurrent audits');
  }

  // Validate synchronous configuration
  if (config.synchronous.enabled && !config.synchronous.enableSessionPersistence) {
    warnings.push('Synchronous mode without session persistence may cause data loss');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Merge runtime configuration with overrides
 */
export function mergeRuntimeConfig(
  base: RuntimeConfig,
  overrides: Partial<RuntimeConfig>
): RuntimeConfig {
  return {
    completionCriteria: {
      ...base.completionCriteria,
      ...overrides.completionCriteria,
    },
    auditTimeout: {
      ...base.auditTimeout,
      ...overrides.auditTimeout,
    },
    concurrency: {
      ...base.concurrency,
      ...overrides.concurrency,
    },
    synchronous: {
      ...base.synchronous,
      ...overrides.synchronous,
    },
  };
}

// ============================================================================
// Configuration Factory
// ============================================================================

/**
 * Create runtime configuration with validation
 */
export function createRuntimeConfig(overrides?: Partial<RuntimeConfig>): {
  config: RuntimeConfig;
  validation: ReturnType<typeof validateRuntimeConfig>;
} {
  const baseConfig = buildRuntimeConfigFromEnv();
  const config = overrides ? mergeRuntimeConfig(baseConfig, overrides) : baseConfig;
  const validation = validateRuntimeConfig(config);
  
  return { config, validation };
}

/**
 * Get environment configuration summary for debugging
 */
export function getEnvironmentConfigSummary(): EnvironmentConfig {
  return {
    // Core synchronous mode settings
    enableSynchronousAudit: parseEnvBoolean(process.env.ENABLE_SYNCHRONOUS_AUDIT, false),
    enableGanAuditing: parseEnvBoolean(process.env.ENABLE_GAN_AUDITING, false),
    
    // Timeout settings
    auditTimeoutSeconds: parseEnvInteger(process.env.AUDIT_TIMEOUT_SECONDS, 30, 5, 300),
    
    // Concurrency settings
    maxConcurrentAudits: parseEnvInteger(process.env.MAX_CONCURRENT_AUDITS, 5, 1, 50),
    maxConcurrentSessions: parseEnvInteger(process.env.MAX_CONCURRENT_SESSIONS, 50, 1, 1000),
    
    // Feature flags
    enableStagnationDetection: parseEnvBoolean(process.env.ENABLE_STAGNATION_DETECTION, true),
    enableCodexContextManagement: parseEnvBoolean(process.env.ENABLE_CODEX_CONTEXT_MANAGEMENT, true),
    enableAuditCaching: parseEnvBoolean(process.env.ENABLE_AUDIT_CACHING, true),
    enableSessionPersistence: parseEnvBoolean(process.env.ENABLE_SESSION_PERSISTENCE, true),
    
    // Directories and paths
    stateDirectory: process.env.SYNC_AUDIT_STATE_DIRECTORY || '.mcp-gan-state',
    
    // Monitoring and observability
    enableMetrics: parseEnvBoolean(process.env.ENABLE_SYNC_AUDIT_METRICS, false),
    enableHealthChecks: parseEnvBoolean(process.env.ENABLE_SYNC_AUDIT_HEALTH_CHECKS, false),
    
    // Legacy compatibility
    disableThoughtLogging: parseEnvBoolean(process.env.DISABLE_THOUGHT_LOGGING, false),
  };
}

// ============================================================================
// Configuration Validation Utilities
// ============================================================================

/**
 * Check if synchronous mode is properly configured
 */
export function isSynchronousModeReady(): {
  ready: boolean;
  issues: string[];
  recommendations: string[];
} {
  const config = getEnvironmentConfigSummary();
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!config.enableGanAuditing) {
    issues.push('GAN auditing is disabled (ENABLE_GAN_AUDITING=false)');
  }

  if (!config.enableSynchronousAudit) {
    issues.push('Synchronous audit mode is disabled (ENABLE_SYNCHRONOUS_AUDIT=false)');
  }

  if (config.auditTimeoutSeconds < 10) {
    recommendations.push('Consider increasing audit timeout for complex code reviews');
  }

  if (config.maxConcurrentAudits > 10) {
    recommendations.push('High concurrency may impact system performance');
  }

  if (!config.enableSessionPersistence) {
    recommendations.push('Enable session persistence for better reliability');
  }

  return {
    ready: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * Generate configuration migration recommendations
 */
export function generateMigrationRecommendations(): {
  currentConfig: EnvironmentConfig;
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    envVar?: string;
    suggestedValue?: string;
  }>;
} {
  const currentConfig = getEnvironmentConfigSummary();
  const recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    envVar?: string;
    suggestedValue?: string;
  }> = [];

  // High priority recommendations
  if (!currentConfig.enableGanAuditing) {
    recommendations.push({
      category: 'Core Features',
      priority: 'high',
      description: 'Enable GAN auditing to use synchronous workflow features',
      envVar: 'ENABLE_GAN_AUDITING',
      suggestedValue: 'true',
    });
  }

  if (!currentConfig.enableSynchronousAudit) {
    recommendations.push({
      category: 'Core Features',
      priority: 'high',
      description: 'Enable synchronous audit mode for iterative feedback',
      envVar: 'ENABLE_SYNCHRONOUS_AUDIT',
      suggestedValue: 'true',
    });
  }

  // Medium priority recommendations
  if (currentConfig.auditTimeoutSeconds < 30) {
    recommendations.push({
      category: 'Performance',
      priority: 'medium',
      description: 'Increase audit timeout for better reliability',
      envVar: 'AUDIT_TIMEOUT_SECONDS',
      suggestedValue: '30',
    });
  }

  if (!currentConfig.enableAuditCaching) {
    recommendations.push({
      category: 'Performance',
      priority: 'medium',
      description: 'Enable audit caching for faster repeated reviews',
      envVar: 'ENABLE_AUDIT_CACHING',
      suggestedValue: 'true',
    });
  }

  // Low priority recommendations
  if (!currentConfig.enableMetrics) {
    recommendations.push({
      category: 'Monitoring',
      priority: 'low',
      description: 'Enable metrics for performance monitoring',
      envVar: 'ENABLE_SYNC_AUDIT_METRICS',
      suggestedValue: 'true',
    });
  }

  if (!currentConfig.enableHealthChecks) {
    recommendations.push({
      category: 'Monitoring',
      priority: 'low',
      description: 'Enable health checks for system reliability',
      envVar: 'ENABLE_SYNC_AUDIT_HEALTH_CHECKS',
      suggestedValue: 'true',
    });
  }

  return {
    currentConfig,
    recommendations,
  };
}