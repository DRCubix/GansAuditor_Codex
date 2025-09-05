/**
 * Feature Flag Manager for System Prompt Configuration
 *
 * This module provides feature flag support for gradual rollout,
 * A/B testing, and environment-specific feature control.
 *
 * Requirements: 11.2 - Feature flag support for prompt system activation
 */
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
/**
 * Default system prompt feature flags
 */
export declare const DEFAULT_SYSTEM_PROMPT_FLAGS: Record<string, FeatureFlag>;
export declare class FeatureFlagManager {
    private flags;
    private configPath?;
    private evaluationCache;
    private cacheTimeout;
    constructor(flags?: Record<string, FeatureFlag>, configPath?: string, cacheTimeout?: number);
    /**
     * Evaluate feature flag for given context
     */
    evaluate(flagName: string, context?: FeatureFlagContext): FeatureFlagEvaluationResult;
    /**
     * Check if feature is enabled (simple boolean check)
     */
    isEnabled(flagName: string, context?: FeatureFlagContext): boolean;
    /**
     * Get all flags
     */
    getAllFlags(): Record<string, FeatureFlag>;
    /**
     * Get flag by name
     */
    getFlag(flagName: string): FeatureFlag | undefined;
    /**
     * Update flag
     */
    updateFlag(flagName: string, updates: Partial<FeatureFlag>): void;
    /**
     * Add new flag
     */
    addFlag(flag: FeatureFlag): void;
    /**
     * Remove flag
     */
    removeFlag(flagName: string): void;
    /**
     * Load flags from configuration file
     */
    loadFromFile(filePath: string): {
        success: boolean;
        error?: string;
        flagsLoaded: number;
    };
    /**
     * Save flags to configuration file
     */
    saveToFile(filePath?: string): {
        success: boolean;
        error?: string;
        flagsSaved: number;
    };
    /**
     * Get flags for specific environment
     */
    getFlagsForEnvironment(environment: string): Record<string, FeatureFlagEvaluationResult>;
    /**
     * Get rollout status summary
     */
    getRolloutSummary(): {
        totalFlags: number;
        enabledFlags: number;
        flagsByEnvironment: Record<string, number>;
        averageRolloutPercentage: number;
    };
    /**
     * Clear evaluation cache
     */
    clearCache(): void;
    /**
     * Evaluate individual condition
     */
    private evaluateCondition;
    /**
     * Check rollout percentage using deterministic hash
     */
    private checkRolloutPercentage;
    /**
     * Generate cache key for evaluation result
     */
    private getCacheKey;
}
/**
 * Create default feature flag manager
 */
export declare function createFeatureFlagManager(configPath?: string): FeatureFlagManager;
/**
 * Quick feature flag check
 */
export declare function isFeatureEnabled(flagName: string, context?: FeatureFlagContext, configPath?: string): boolean;
/**
 * Get environment-specific feature flags from environment variables
 */
export declare function getFeatureFlagsFromEnv(): Record<string, boolean>;
//# sourceMappingURL=feature-flag-manager.d.ts.map