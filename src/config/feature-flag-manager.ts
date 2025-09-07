/**
 * Feature Flag Manager for System Prompt Configuration
 * 
 * This module provides feature flag support for gradual rollout,
 * A/B testing, and environment-specific feature control.
 * 
 * Requirements: 11.2 - Feature flag support for prompt system activation
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  environments: string[];
  conditions?: FeatureFlagCondition[];
  metadata?: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    tags?: string[];
  };
}

/**
 * Feature flag condition
 */
export interface FeatureFlagCondition {
  type: 'environment' | 'user' | 'session' | 'time' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'matches';
  value: any;
  field?: string;
}

/**
 * Feature flag evaluation context
 */
export interface FeatureFlagContext {
  environment?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  customProperties?: Record<string, any>;
}

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagEvaluationResult {
  enabled: boolean;
  reason: string;
  rolloutPercentage: number;
  matchedConditions: string[];
}

/**
 * Feature flag configuration file
 */
export interface FeatureFlagConfigFile {
  version: string;
  flags: Record<string, FeatureFlag>;
  globalSettings: {
    defaultRolloutPercentage: number;
    enabledEnvironments: string[];
    evaluationLogging: boolean;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    description?: string;
  };
}

// ============================================================================
// Default Feature Flags
// ============================================================================

/**
 * Default system prompt feature flags
 */
export const DEFAULT_SYSTEM_PROMPT_FLAGS: Record<string, FeatureFlag> = {
  systemPromptEnabled: {
    name: 'systemPromptEnabled',
    description: 'Enable system prompt functionality',
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['core', 'system-prompt'],
    },
  },
  
  advancedWorkflow: {
    name: 'advancedWorkflow',
    description: 'Enable advanced 8-step audit workflow',
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    conditions: [
      {
        type: 'environment',
        operator: 'in',
        value: ['staging', 'production'],
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['workflow', 'advanced'],
    },
  },
  
  enhancedSecurity: {
    name: 'enhancedSecurity',
    description: 'Enable enhanced security features (PII sanitization, command validation)',
    enabled: true,
    rolloutPercentage: 100,
    environments: ['staging', 'production'],
    conditions: [
      {
        type: 'environment',
        operator: 'not_equals',
        value: 'development',
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['security', 'production'],
    },
  },
  
  performanceOptimizations: {
    name: 'performanceOptimizations',
    description: 'Enable performance optimizations (caching, context optimization)',
    enabled: true,
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production'],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['performance', 'optimization'],
    },
  },
  
  experimentalFeatures: {
    name: 'experimentalFeatures',
    description: 'Enable experimental features and new algorithms',
    enabled: false,
    rolloutPercentage: 10,
    environments: ['development'],
    conditions: [
      {
        type: 'environment',
        operator: 'equals',
        value: 'development',
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['experimental', 'beta'],
    },
  },
  
  gradualRollout: {
    name: 'gradualRollout',
    description: 'Gradual rollout of system prompt to percentage of sessions',
    enabled: true,
    rolloutPercentage: 50,
    environments: ['production'],
    conditions: [
      {
        type: 'environment',
        operator: 'equals',
        value: 'production',
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['rollout', 'production'],
    },
  },
  
  debugMode: {
    name: 'debugMode',
    description: 'Enable debug logging and verbose output',
    enabled: false,
    rolloutPercentage: 100,
    environments: ['development'],
    conditions: [
      {
        type: 'environment',
        operator: 'equals',
        value: 'development',
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['debug', 'development'],
    },
  },
  
  metricsCollection: {
    name: 'metricsCollection',
    description: 'Enable metrics collection and performance monitoring',
    enabled: true,
    rolloutPercentage: 100,
    environments: ['staging', 'production'],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['metrics', 'monitoring'],
    },
  },
};

// ============================================================================
// Feature Flag Manager Class
// ============================================================================

export class FeatureFlagManager {
  private flags: Record<string, FeatureFlag>;
  private configPath?: string;
  private evaluationCache: Map<string, { result: FeatureFlagEvaluationResult; timestamp: number }>;
  private cacheTimeout: number;

  constructor(
    flags: Record<string, FeatureFlag> = DEFAULT_SYSTEM_PROMPT_FLAGS,
    configPath?: string,
    cacheTimeout: number = 60000 // 1 minute
  ) {
    this.flags = flags;
    this.configPath = configPath;
    this.evaluationCache = new Map();
    this.cacheTimeout = cacheTimeout;
  }

  /**
   * Evaluate feature flag for given context
   */
  evaluate(flagName: string, context: FeatureFlagContext = {}): FeatureFlagEvaluationResult {
    const cacheKey = this.getCacheKey(flagName, context);
    
    // Check cache first
    const cached = this.evaluationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    const flag = this.flags[flagName];
    if (!flag) {
      const result: FeatureFlagEvaluationResult = {
        enabled: false,
        reason: 'Flag not found',
        rolloutPercentage: 0,
        matchedConditions: [],
      };
      this.evaluationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      const result: FeatureFlagEvaluationResult = {
        enabled: false,
        reason: 'Flag globally disabled',
        rolloutPercentage: flag.rolloutPercentage,
        matchedConditions: [],
      };
      this.evaluationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // Check environment restrictions
    if (context.environment && flag.environments.length > 0) {
      if (!flag.environments.includes(context.environment)) {
        const result: FeatureFlagEvaluationResult = {
          enabled: false,
          reason: `Environment '${context.environment}' not in allowed environments`,
          rolloutPercentage: flag.rolloutPercentage,
          matchedConditions: [],
        };
        this.evaluationCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }
    }

    // Evaluate conditions
    const matchedConditions: string[] = [];
    if (flag.conditions) {
      for (const condition of flag.conditions) {
        if (this.evaluateCondition(condition, context)) {
          matchedConditions.push(`${condition.type}:${condition.operator}:${condition.value}`);
        } else {
          const result: FeatureFlagEvaluationResult = {
            enabled: false,
            reason: `Condition not met: ${condition.type} ${condition.operator} ${condition.value}`,
            rolloutPercentage: flag.rolloutPercentage,
            matchedConditions,
          };
          this.evaluationCache.set(cacheKey, { result, timestamp: Date.now() });
          return result;
        }
      }
    }

    // Check rollout percentage
    const rolloutEnabled = this.checkRolloutPercentage(flag.rolloutPercentage, context);
    
    const result: FeatureFlagEvaluationResult = {
      enabled: rolloutEnabled,
      reason: rolloutEnabled ? 'All conditions met' : 'Outside rollout percentage',
      rolloutPercentage: flag.rolloutPercentage,
      matchedConditions,
    };

    this.evaluationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  /**
   * Check if feature is enabled (simple boolean check)
   */
  isEnabled(flagName: string, context: FeatureFlagContext = {}): boolean {
    return this.evaluate(flagName, context).enabled;
  }

  /**
   * Get all flags
   */
  getAllFlags(): Record<string, FeatureFlag> {
    return { ...this.flags };
  }

  /**
   * Get flag by name
   */
  getFlag(flagName: string): FeatureFlag | undefined {
    return this.flags[flagName];
  }

  /**
   * Update flag
   */
  updateFlag(flagName: string, updates: Partial<FeatureFlag>): void {
    if (this.flags[flagName]) {
      this.flags[flagName] = {
        ...this.flags[flagName],
        ...updates,
        metadata: {
          createdAt: this.flags[flagName].metadata?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: this.flags[flagName].metadata?.createdBy,
          tags: this.flags[flagName].metadata?.tags,
        },
      };
      this.clearCache();
    }
  }

  /**
   * Add new flag
   */
  addFlag(flag: FeatureFlag): void {
    this.flags[flag.name] = {
      ...flag,
      metadata: {
        ...flag.metadata,
        createdAt: flag.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    this.clearCache();
  }

  /**
   * Remove flag
   */
  removeFlag(flagName: string): void {
    delete this.flags[flagName];
    this.clearCache();
  }

  /**
   * Load flags from configuration file
   */
  loadFromFile(filePath: string): {
    success: boolean;
    error?: string;
    flagsLoaded: number;
  } {
    try {
      if (!existsSync(filePath)) {
        return {
          success: false,
          error: 'Configuration file not found',
          flagsLoaded: 0,
        };
      }

      const content = readFileSync(filePath, 'utf-8');
      const config: FeatureFlagConfigFile = JSON.parse(content);

      this.flags = config.flags;
      this.configPath = filePath;
      this.clearCache();

      return {
        success: true,
        flagsLoaded: Object.keys(config.flags).length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        flagsLoaded: 0,
      };
    }
  }

  /**
   * Save flags to configuration file
   */
  saveToFile(filePath?: string): {
    success: boolean;
    error?: string;
    flagsSaved: number;
  } {
    const targetPath = filePath || this.configPath;
    if (!targetPath) {
      return {
        success: false,
        error: 'No file path specified',
        flagsSaved: 0,
      };
    }

    try {
      const config: FeatureFlagConfigFile = {
        version: '1.0.0',
        flags: this.flags,
        globalSettings: {
          defaultRolloutPercentage: 100,
          enabledEnvironments: ['development', 'staging', 'production'],
          evaluationLogging: false,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: 'System prompt feature flags configuration',
        },
      };

      writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf-8');
      this.configPath = targetPath;

      return {
        success: true,
        flagsSaved: Object.keys(this.flags).length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        flagsSaved: 0,
      };
    }
  }

  /**
   * Get flags for specific environment
   */
  getFlagsForEnvironment(environment: string): Record<string, FeatureFlagEvaluationResult> {
    const context: FeatureFlagContext = { environment };
    const results: Record<string, FeatureFlagEvaluationResult> = {};

    for (const flagName of Object.keys(this.flags)) {
      results[flagName] = this.evaluate(flagName, context);
    }

    return results;
  }

  /**
   * Get rollout status summary
   */
  getRolloutSummary(): {
    totalFlags: number;
    enabledFlags: number;
    flagsByEnvironment: Record<string, number>;
    averageRolloutPercentage: number;
  } {
    const totalFlags = Object.keys(this.flags).length;
    const enabledFlags = Object.values(this.flags).filter(f => f.enabled).length;
    
    const flagsByEnvironment: Record<string, number> = {};
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      const envResults = this.getFlagsForEnvironment(env);
      flagsByEnvironment[env] = Object.values(envResults).filter(r => r.enabled).length;
    }

    const averageRolloutPercentage = totalFlags > 0 
      ? Object.values(this.flags).reduce((sum, flag) => sum + flag.rolloutPercentage, 0) / totalFlags
      : 0;

    return {
      totalFlags,
      enabledFlags,
      flagsByEnvironment,
      averageRolloutPercentage,
    };
  }

  /**
   * Clear evaluation cache
   */
  clearCache(): void {
    this.evaluationCache.clear();
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(condition: FeatureFlagCondition, context: FeatureFlagContext): boolean {
    let contextValue: any;

    switch (condition.type) {
      case 'environment':
        contextValue = context.environment;
        break;
      case 'user':
        contextValue = context.userId;
        break;
      case 'session':
        contextValue = context.sessionId;
        break;
      case 'time':
        contextValue = context.timestamp || Date.now();
        break;
      case 'custom':
        contextValue = condition.field ? context.customProperties?.[condition.field] : context.customProperties;
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'not_equals':
        return contextValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);
      case 'greater_than':
        return typeof contextValue === 'number' && contextValue > condition.value;
      case 'less_than':
        return typeof contextValue === 'number' && contextValue < condition.value;
      case 'matches':
        return typeof contextValue === 'string' && new RegExp(condition.value).test(contextValue);
      default:
        return false;
    }
  }

  /**
   * Check rollout percentage using deterministic hash
   */
  private checkRolloutPercentage(percentage: number, context: FeatureFlagContext): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    // Use session ID or user ID for consistent rollout
    const identifier = context.sessionId || context.userId || 'anonymous';
    
    // Simple hash function for deterministic percentage
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const normalizedHash = Math.abs(hash) % 100;
    return normalizedHash < percentage;
  }

  /**
   * Generate cache key for evaluation result
   */
  private getCacheKey(flagName: string, context: FeatureFlagContext): string {
    const contextStr = JSON.stringify({
      environment: context.environment,
      userId: context.userId,
      sessionId: context.sessionId,
      // Don't include timestamp in cache key as it changes constantly
    });
    return `${flagName}:${contextStr}`;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create default feature flag manager
 */
export function createFeatureFlagManager(configPath?: string): FeatureFlagManager {
  const manager = new FeatureFlagManager(DEFAULT_SYSTEM_PROMPT_FLAGS, configPath);
  
  // Load from file if it exists
  if (configPath && existsSync(configPath)) {
    manager.loadFromFile(configPath);
  }
  
  return manager;
}

/**
 * Quick feature flag check
 */
export function isFeatureEnabled(
  flagName: string,
  context: FeatureFlagContext = {},
  configPath?: string
): boolean {
  const manager = createFeatureFlagManager(configPath);
  return manager.isEnabled(flagName, context);
}

/**
 * Get environment-specific feature flags from environment variables
 */
export function getFeatureFlagsFromEnv(): Record<string, boolean> {
  return {
    systemPromptEnabled: process.env.GAN_AUDITOR_PROMPT_ENABLED === 'true',
    advancedWorkflow: process.env.GAN_AUDITOR_ADVANCED_WORKFLOW !== 'false',
    enhancedSecurity: process.env.GAN_AUDITOR_ENHANCED_SECURITY !== 'false',
    performanceOptimizations: process.env.GAN_AUDITOR_PERFORMANCE_OPTIMIZATIONS !== 'false',
    experimentalFeatures: process.env.GAN_AUDITOR_EXPERIMENTAL_FEATURES === 'true',
    debugMode: process.env.GAN_AUDITOR_DEBUG_MODE === 'true',
    metricsCollection: process.env.GAN_AUDITOR_METRICS_COLLECTION !== 'false',
  };
}