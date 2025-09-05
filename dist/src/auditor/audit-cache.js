/**
 * Audit Result Cache
 *
 * Implements caching for identical code submissions to improve performance
 * and reduce redundant audit operations.
 *
 * Requirements: 9.1 - Add audit result caching for identical code submissions
 */
import crypto from 'crypto';
import { createComponentLogger } from '../utils/logger.js';
/**
 * Default configuration for audit cache
 */
export const DEFAULT_AUDIT_CACHE_CONFIG = {
    maxEntries: 1000,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    enableStats: true,
};
/**
 * Audit Result Cache Implementation
 *
 * Provides efficient caching of audit results based on code content hash
 * with automatic cleanup and memory management.
 */
export class AuditCache {
    cache = new Map();
    config;
    componentLogger;
    cleanupTimer;
    stats;
    constructor(config = {}) {
        this.config = { ...DEFAULT_AUDIT_CACHE_CONFIG, ...config };
        this.componentLogger = createComponentLogger('audit-cache');
        this.stats = {
            hits: 0,
            misses: 0,
            entries: 0,
            memoryUsage: 0,
            hitRate: 0,
            averageAccessTime: 0,
        };
        this.startCleanupTimer();
        this.componentLogger.info('Audit cache initialized', {
            maxEntries: this.config.maxEntries,
            maxAge: this.config.maxAge,
            maxMemoryUsage: this.config.maxMemoryUsage,
        });
    }
    /**
     * Get cached audit result for code content
     */
    async get(thought) {
        const startTime = Date.now();
        const codeHash = this.generateCodeHash(thought);
        const entry = this.cache.get(codeHash);
        if (!entry) {
            this.recordMiss();
            return null;
        }
        // Check if entry has expired
        if (this.isExpired(entry)) {
            this.cache.delete(codeHash);
            this.updateMemoryUsage();
            this.recordMiss();
            return null;
        }
        // Update access statistics
        entry.lastAccessedAt = Date.now();
        entry.accessCount++;
        this.recordHit(Date.now() - startTime);
        this.componentLogger.debug('Cache hit for code hash', {
            codeHash: codeHash.substring(0, 8),
            accessCount: entry.accessCount,
            age: Date.now() - entry.createdAt,
        });
        return entry.review;
    }
    /**
     * Store audit result in cache
     */
    async set(thought, review) {
        const codeHash = this.generateCodeHash(thought);
        const now = Date.now();
        const size = this.calculateEntrySize(review);
        // Check if we need to make space
        await this.ensureCapacity(size);
        const entry = {
            codeHash,
            review,
            createdAt: now,
            lastAccessedAt: now,
            accessCount: 1,
            size,
        };
        this.cache.set(codeHash, entry);
        this.updateMemoryUsage();
        this.componentLogger.debug('Cached audit result', {
            codeHash: codeHash.substring(0, 8),
            size,
            verdict: review.verdict,
            score: review.overall,
        });
    }
    /**
     * Check if audit result exists in cache
     */
    has(thought) {
        const codeHash = this.generateCodeHash(thought);
        const entry = this.cache.get(codeHash);
        return entry !== undefined && !this.isExpired(entry);
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.updateMemoryUsage();
        this.componentLogger.info('Cache cleared');
    }
    /**
     * Get current cache statistics
     */
    getStats() {
        this.updateStats();
        return { ...this.stats };
    }
    /**
     * Manually trigger cache cleanup
     */
    async cleanup() {
        const startTime = Date.now();
        const initialSize = this.cache.size;
        // Remove expired entries
        const expiredKeys = [];
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                expiredKeys.push(key);
            }
        }
        for (const key of expiredKeys) {
            this.cache.delete(key);
        }
        // Remove least recently used entries if over capacity
        await this.enforceSizeLimits();
        this.updateMemoryUsage();
        const duration = Date.now() - startTime;
        const removedCount = initialSize - this.cache.size;
        this.componentLogger.info('Cache cleanup completed', {
            removedCount,
            remainingEntries: this.cache.size,
            duration,
            memoryUsage: this.stats.memoryUsage,
        });
    }
    /**
     * Destroy cache and cleanup resources
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.clear();
        this.componentLogger.info('Audit cache destroyed');
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Generate hash for code content
     */
    generateCodeHash(thought) {
        // Extract code content from thought
        const codeContent = this.extractCodeContent(thought.thought);
        // Create hash including relevant metadata
        const hashInput = JSON.stringify({
            code: codeContent,
            thoughtNumber: thought.thoughtNumber,
            // Include any other factors that should affect caching
        });
        return crypto.createHash('sha256').update(hashInput).digest('hex');
    }
    /**
     * Extract code content from thought text
     */
    extractCodeContent(thoughtText) {
        // Remove markdown formatting and extract just the code
        const codeBlocks = thoughtText.match(/```[\s\S]*?```/g) || [];
        const inlineCode = thoughtText.match(/`[^`]+`/g) || [];
        // Normalize whitespace and remove comments for better cache hits
        const allCode = [...codeBlocks, ...inlineCode]
            .map(code => {
            // Remove markdown code block markers
            let cleanCode = code.replace(/```\w*\n?/g, '').replace(/`/g, '');
            // Remove comments
            cleanCode = cleanCode
                .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
                .replace(/\/\/.*$/gm, '') // Remove line comments
                .replace(/#.*$/gm, '') // Remove Python/shell comments
                .replace(/<!--[\s\S]*?-->/g, ''); // Remove HTML comments
            // Normalize whitespace - collapse all whitespace to single spaces
            cleanCode = cleanCode
                .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
                .replace(/\s*([{}();,])\s*/g, '$1') // Remove spaces around punctuation
                .trim();
            return cleanCode;
        })
            .join('\n')
            .trim();
        return allCode;
    }
    /**
     * Check if cache entry has expired
     */
    isExpired(entry) {
        return Date.now() - entry.createdAt > this.config.maxAge;
    }
    /**
     * Calculate size of cache entry in bytes
     */
    calculateEntrySize(review) {
        return JSON.stringify(review).length * 2; // Rough estimate (UTF-16)
    }
    /**
     * Ensure cache has capacity for new entry
     */
    async ensureCapacity(newEntrySize) {
        // Check memory limit
        if (this.stats.memoryUsage + newEntrySize > this.config.maxMemoryUsage) {
            await this.evictLeastRecentlyUsed(newEntrySize);
        }
        // Check entry count limit
        if (this.cache.size >= this.config.maxEntries) {
            await this.evictLeastRecentlyUsed(0);
        }
    }
    /**
     * Evict least recently used entries to make space
     */
    async evictLeastRecentlyUsed(requiredSpace) {
        const entries = Array.from(this.cache.entries())
            .map(([key, entry]) => ({ key, entry }))
            .sort((a, b) => a.entry.lastAccessedAt - b.entry.lastAccessedAt);
        let freedSpace = 0;
        let evictedCount = 0;
        for (const { key, entry } of entries) {
            this.cache.delete(key);
            freedSpace += entry.size;
            evictedCount++;
            // Stop if we've freed enough space and are under entry limit
            if (freedSpace >= requiredSpace && this.cache.size < this.config.maxEntries) {
                break;
            }
        }
        this.componentLogger.debug('Evicted LRU entries', {
            evictedCount,
            freedSpace,
            remainingEntries: this.cache.size,
        });
    }
    /**
     * Enforce size limits during cleanup
     */
    async enforceSizeLimits() {
        if (this.cache.size <= this.config.maxEntries &&
            this.stats.memoryUsage <= this.config.maxMemoryUsage) {
            return;
        }
        const targetSize = Math.floor(this.config.maxEntries * 0.8); // Leave 20% headroom
        const targetMemory = Math.floor(this.config.maxMemoryUsage * 0.8);
        if (this.cache.size > targetSize || this.stats.memoryUsage > targetMemory) {
            const excessSpace = Math.max(0, this.stats.memoryUsage - targetMemory);
            await this.evictLeastRecentlyUsed(excessSpace);
        }
    }
    /**
     * Update memory usage statistics
     */
    updateMemoryUsage() {
        this.stats.memoryUsage = Array.from(this.cache.values())
            .reduce((total, entry) => total + entry.size, 0);
        this.stats.entries = this.cache.size;
    }
    /**
     * Update cache statistics
     */
    updateStats() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    }
    /**
     * Record cache hit
     */
    recordHit(accessTime) {
        if (this.config.enableStats) {
            this.stats.hits++;
            // Update rolling average access time
            const totalAccesses = this.stats.hits + this.stats.misses;
            this.stats.averageAccessTime =
                (this.stats.averageAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses;
        }
    }
    /**
     * Record cache miss
     */
    recordMiss() {
        if (this.config.enableStats) {
            this.stats.misses++;
        }
    }
    /**
     * Start automatic cleanup timer
     */
    startCleanupTimer() {
        if (this.config.cleanupInterval > 0) {
            this.cleanupTimer = setInterval(() => {
                this.cleanup().catch(error => {
                    this.componentLogger.error('Automatic cache cleanup failed', error);
                });
            }, this.config.cleanupInterval);
        }
    }
}
/**
 * Create audit cache with default configuration
 */
export function createAuditCache(config = {}) {
    return new AuditCache(config);
}
//# sourceMappingURL=audit-cache.js.map