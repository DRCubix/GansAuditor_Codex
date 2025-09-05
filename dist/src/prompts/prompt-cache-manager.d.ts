/**
 * Prompt Cache Manager
 *
 * Integrates with existing AuditCache for prompt-specific result caching
 * with prompt-specific cache key generation and management.
 *
 * Requirements: 10.3, 10.4, 10.5 - Performance optimizations and caching
 */
import { type AuditCacheConfig } from '../auditor/audit-cache.js';
import type { GansAuditorCodexReview } from '../types/gan-types.js';
/**
 * Prompt execution context for caching
 */
export interface PromptCacheContext {
    /** System prompt template */
    promptTemplate: string;
    /** Workflow configuration */
    workflowConfig: any;
    /** Quality assessment configuration */
    qualityConfig: any;
    /** Code content being audited */
    codeContent: string;
    /** Session context */
    sessionContext?: any;
    /** Additional metadata */
    metadata?: Record<string, any>;
}
/**
 * Cached prompt result
 */
export interface CachedPromptResult {
    /** Audit review result */
    review: GansAuditorCodexReview;
    /** Prompt execution metadata */
    executionMetadata: {
        /** Execution duration in milliseconds */
        duration: number;
        /** Timestamp when cached */
        cachedAt: number;
        /** Prompt template version */
        promptVersion: string;
        /** Workflow steps executed */
        workflowSteps: string[];
        /** Quality dimensions assessed */
        qualityDimensions: string[];
    };
    /** Cache metadata */
    cacheMetadata: {
        /** Cache key used */
        cacheKey: string;
        /** Hit count */
        hitCount: number;
        /** Last accessed timestamp */
        lastAccessed: number;
    };
}
/**
 * Prompt cache configuration
 */
export interface PromptCacheConfig extends AuditCacheConfig {
    /** Whether to include session context in cache key */
    includeSessionContext: boolean;
    /** Whether to include workflow config in cache key */
    includeWorkflowConfig: boolean;
    /** Whether to include quality config in cache key */
    includeQualityConfig: boolean;
    /** Cache key version for invalidation */
    cacheKeyVersion: string;
    /** Whether to enable prompt-specific metrics */
    enablePromptMetrics: boolean;
}
/**
 * Prompt cache statistics
 */
export interface PromptCacheStats {
    /** Total prompt cache hits */
    promptHits: number;
    /** Total prompt cache misses */
    promptMisses: number;
    /** Prompt-specific hit rate */
    promptHitRate: number;
    /** Average prompt execution time saved */
    averageTimeSaved: number;
    /** Total execution time saved */
    totalTimeSaved: number;
    /** Cache efficiency by prompt template */
    templateEfficiency: Record<string, {
        hits: number;
        misses: number;
        hitRate: number;
        averageTimeSaved: number;
    }>;
}
/**
 * Default prompt cache configuration
 */
export declare const DEFAULT_PROMPT_CACHE_CONFIG: PromptCacheConfig;
/**
 * Prompt Cache Manager Implementation
 *
 * Provides prompt-specific caching with intelligent cache key generation
 * and integration with existing audit cache infrastructure.
 */
export declare class PromptCacheManager {
    private readonly auditCache;
    private readonly config;
    private readonly componentLogger;
    private readonly promptStats;
    constructor(config?: Partial<PromptCacheConfig>);
    /**
     * Get cached prompt result
     */
    getCachedResult(context: PromptCacheContext): Promise<CachedPromptResult | null>;
    /**
     * Cache prompt result
     */
    cacheResult(context: PromptCacheContext, result: GansAuditorCodexReview, executionDuration: number): Promise<void>;
    /**
     * Check if result exists in cache
     */
    hasResult(context: PromptCacheContext): Promise<boolean>;
    /**
     * Invalidate cache entries for specific prompt template
     */
    invalidateTemplate(promptTemplate: string): Promise<number>;
    /**
     * Get prompt cache statistics
     */
    getPromptStats(): PromptCacheStats;
    /**
     * Get combined cache statistics
     */
    getCombinedStats(): {
        auditCache: any;
        promptCache: PromptCacheStats;
    };
    /**
     * Clear all cached results
     */
    clear(): void;
    /**
     * Cleanup expired entries
     */
    cleanup(): Promise<void>;
    /**
     * Destroy cache and cleanup resources
     */
    destroy(): void;
    /**
     * Generate cache key for prompt context
     */
    private generatePromptCacheKey;
    /**
     * Hash content for cache key generation
     */
    private hashContent;
    /**
     * Create mock thought data for audit cache compatibility
     */
    private createMockThoughtData;
    /**
     * Get template identifier for logging
     */
    private getTemplateIdentifier;
    /**
     * Enhance result with prompt-specific metadata
     */
    private enhanceResultWithMetadata;
    /**
     * Extract execution metadata from cached result
     */
    private extractExecutionMetadata;
    /**
     * Record prompt cache hit
     */
    private recordPromptHit;
    /**
     * Record prompt cache miss
     */
    private recordPromptMiss;
    /**
     * Update prompt statistics
     */
    private updatePromptStats;
}
/**
 * Create prompt cache manager with default configuration
 */
export declare function createPromptCacheManager(config?: Partial<PromptCacheConfig>): PromptCacheManager;
//# sourceMappingURL=prompt-cache-manager.d.ts.map