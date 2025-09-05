/**
 * Memory-Efficient Session Manager
 *
 * Extends the SynchronousSessionManager with memory optimization features
 * including session history compression, intelligent cleanup, and memory monitoring.
 *
 * Requirements: 9.4 - Create memory-efficient session history management
 */
import { SynchronousSessionManager, type SynchronousSessionManagerConfig } from './synchronous-session-manager.js';
import type { GansAuditorCodexSessionState, IterationData } from '../types/gan-types.js';
/**
 * Memory usage statistics
 */
export interface MemoryStats {
    /** Total memory usage in bytes */
    totalMemoryUsage: number;
    /** Number of active sessions */
    activeSessions: number;
    /** Number of compressed iterations */
    compressedIterations: number;
    /** Total compression savings in bytes */
    compressionSavings: number;
    /** Average compression ratio */
    averageCompressionRatio: number;
    /** Memory usage per session in bytes */
    memoryPerSession: number;
}
/**
 * Configuration for memory-efficient session manager
 */
export interface MemoryEfficientSessionManagerConfig extends SynchronousSessionManagerConfig {
    /** Maximum memory usage in bytes before cleanup */
    maxMemoryUsage: number;
    /** Maximum iterations to keep in memory per session */
    maxIterationsInMemory: number;
    /** Minimum age before iteration can be compressed (ms) */
    compressionAge: number;
    /** Memory monitoring interval in milliseconds */
    memoryMonitoringInterval: number;
    /** Whether to enable automatic compression */
    enableCompression: boolean;
    /** Whether to enable memory monitoring */
    enableMemoryMonitoring: boolean;
    /** Compression threshold - iterations larger than this will be compressed */
    compressionThreshold: number;
}
/**
 * Default configuration for memory-efficient session manager
 */
export declare const DEFAULT_MEMORY_EFFICIENT_CONFIG: MemoryEfficientSessionManagerConfig;
/**
 * Memory-Efficient Session Manager Implementation
 *
 * Provides memory optimization through iteration compression, intelligent cleanup,
 * and memory usage monitoring to handle large session histories efficiently.
 */
export declare class MemoryEfficientSessionManager extends SynchronousSessionManager {
    private readonly memoryConfig;
    private readonly memoryLogger;
    private readonly compressedIterations;
    private memoryMonitoringTimer?;
    private memoryStats;
    constructor(config?: Partial<MemoryEfficientSessionManagerConfig>);
    /**
     * Add iteration with memory optimization
     */
    addIteration(sessionId: string, iteration: IterationData): Promise<void>;
    /**
     * Get session with decompression support
     */
    getSession(id: string): Promise<GansAuditorCodexSessionState | null>;
    /**
     * Get memory usage statistics
     */
    getMemoryStats(): MemoryStats;
    /**
     * Manually trigger memory optimization for all sessions
     */
    optimizeAllSessions(): Promise<void>;
    /**
     * Force cleanup of old sessions and compressed data
     */
    forceCleanup(): Promise<void>;
    /**
     * Get detailed memory breakdown by session
     */
    getMemoryBreakdown(): Promise<Array<{
        sessionId: string;
        memoryUsage: number;
        iterationCount: number;
        compressedIterations: number;
        compressionSavings: number;
        lastAccessed: number;
    }>>;
    /**
     * Destroy with cleanup
     */
    destroy(): void;
    /**
     * Optimize memory usage for a specific session
     */
    private optimizeSessionMemory;
    /**
     * Compress old iterations to save memory
     */
    private compressOldIterations;
    /**
     * Trim iterations to stay within memory limits
     */
    private trimIterations;
    /**
     * Compress iteration data
     */
    private compressIteration;
    /**
     * Decompress iteration data
     */
    private decompressIteration;
    /**
     * Decompress session iterations if needed
     */
    private decompressSessionIterations;
    /**
     * Calculate memory usage of a session
     */
    private calculateSessionMemoryUsage;
    /**
     * Calculate memory usage of an iteration
     */
    private calculateIterationSize;
    /**
     * Update memory statistics
     */
    private updateMemoryStats;
    /**
     * Perform emergency cleanup when memory limit is exceeded
     */
    private performEmergencyCleanup;
    /**
     * Start memory monitoring
     */
    private startMemoryMonitoring;
    /**
     * Get all session IDs (placeholder - would need implementation in base class)
     */
    private getAllSessionIds;
    /**
     * Delete session (placeholder - would need implementation in base class)
     */
    deleteSession(sessionId: string): Promise<boolean>;
}
/**
 * Create memory-efficient session manager with default configuration
 */
export declare function createMemoryEfficientSessionManager(config?: Partial<MemoryEfficientSessionManagerConfig>): MemoryEfficientSessionManager;
//# sourceMappingURL=memory-efficient-session-manager.d.ts.map