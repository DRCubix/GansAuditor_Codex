/**
 * Audit Result Cache
 *
 * Implements caching for identical code submissions to improve performance
 * and reduce redundant audit operations.
 *
 * Requirements: 9.1 - Add audit result caching for identical code submissions
 */
import type { GansAuditorCodexReview, GansAuditorCodexThoughtData } from '../types/gan-types.js';
/**
 * Cache entry for audit results
 */
export interface AuditCacheEntry {
    /** Hash of the code content */
    codeHash: string;
    /** The audit review result */
    review: GansAuditorCodexReview;
    /** Timestamp when the entry was created */
    createdAt: number;
    /** Timestamp when the entry was last accessed */
    lastAccessedAt: number;
    /** Number of times this entry has been accessed */
    accessCount: number;
    /** Size of the cached data in bytes */
    size: number;
}
/**
 * Configuration for the audit cache
 */
export interface AuditCacheConfig {
    /** Maximum number of entries to keep in cache */
    maxEntries: number;
    /** Maximum age of cache entries in milliseconds */
    maxAge: number;
    /** Maximum total memory usage in bytes */
    maxMemoryUsage: number;
    /** Cleanup interval in milliseconds */
    cleanupInterval: number;
    /** Whether to enable cache statistics */
    enableStats: boolean;
}
/**
 * Cache statistics
 */
export interface AuditCacheStats {
    /** Total number of cache hits */
    hits: number;
    /** Total number of cache misses */
    misses: number;
    /** Current number of entries in cache */
    entries: number;
    /** Current memory usage in bytes */
    memoryUsage: number;
    /** Hit rate as a percentage */
    hitRate: number;
    /** Average access time in milliseconds */
    averageAccessTime: number;
}
/**
 * Default configuration for audit cache
 */
export declare const DEFAULT_AUDIT_CACHE_CONFIG: AuditCacheConfig;
/**
 * Audit Result Cache Implementation
 *
 * Provides efficient caching of audit results based on code content hash
 * with automatic cleanup and memory management.
 */
export declare class AuditCache {
    private readonly cache;
    private readonly config;
    private readonly componentLogger;
    private cleanupTimer?;
    private stats;
    constructor(config?: Partial<AuditCacheConfig>);
    /**
     * Get cached audit result for code content
     */
    get(thought: GansAuditorCodexThoughtData): Promise<GansAuditorCodexReview | null>;
    /**
     * Store audit result in cache
     */
    set(thought: GansAuditorCodexThoughtData, review: GansAuditorCodexReview): Promise<void>;
    /**
     * Check if audit result exists in cache
     */
    has(thought: GansAuditorCodexThoughtData): boolean;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get current cache statistics
     */
    getStats(): AuditCacheStats;
    /**
     * Manually trigger cache cleanup
     */
    cleanup(): Promise<void>;
    /**
     * Destroy cache and cleanup resources
     */
    destroy(): void;
    /**
     * Generate hash for code content
     */
    private generateCodeHash;
    /**
     * Extract code content from thought text
     */
    private extractCodeContent;
    /**
     * Check if cache entry has expired
     */
    private isExpired;
    /**
     * Calculate size of cache entry in bytes
     */
    private calculateEntrySize;
    /**
     * Ensure cache has capacity for new entry
     */
    private ensureCapacity;
    /**
     * Evict least recently used entries to make space
     */
    private evictLeastRecentlyUsed;
    /**
     * Enforce size limits during cleanup
     */
    private enforceSizeLimits;
    /**
     * Update memory usage statistics
     */
    private updateMemoryUsage;
    /**
     * Update cache statistics
     */
    private updateStats;
    /**
     * Record cache hit
     */
    private recordHit;
    /**
     * Record cache miss
     */
    private recordMiss;
    /**
     * Start automatic cleanup timer
     */
    private startCleanupTimer;
}
/**
 * Create audit cache with default configuration
 */
export declare function createAuditCache(config?: Partial<AuditCacheConfig>): AuditCache;
//# sourceMappingURL=audit-cache.d.ts.map