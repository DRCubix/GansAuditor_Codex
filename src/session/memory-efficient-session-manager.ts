/**
 * Memory-Efficient Session Manager
 * 
 * Extends the SynchronousSessionManager with memory optimization features
 * including session history compression, intelligent cleanup, and memory monitoring.
 * 
 * Requirements: 9.4 - Create memory-efficient session history management
 */

import { SynchronousSessionManager, type SynchronousSessionManagerConfig, DEFAULT_SYNCHRONOUS_SESSION_MANAGER_CONFIG } from './synchronous-session-manager.js';
import type {
  GansAuditorCodexSessionState,
  IterationData,
  GansAuditorCodexReview,
} from '../types/gan-types.js';
import { logger, createComponentLogger } from '../utils/logger.js';
import { gzipSync, gunzipSync } from 'zlib';

/**
 * Compressed iteration data for memory efficiency
 */
interface CompressedIterationData {
  /** Compressed iteration data */
  compressed: Buffer;
  /** Original size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Timestamp when compressed */
  compressedAt: number;
}

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
export const DEFAULT_MEMORY_EFFICIENT_CONFIG: MemoryEfficientSessionManagerConfig = {
  ...DEFAULT_SYNCHRONOUS_SESSION_MANAGER_CONFIG,
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  maxIterationsInMemory: 20,
  compressionAge: 5 * 60 * 1000, // 5 minutes
  memoryMonitoringInterval: 30 * 1000, // 30 seconds
  enableCompression: true,
  enableMemoryMonitoring: true,
  compressionThreshold: 1024, // 1KB
};

/**
 * Memory-Efficient Session Manager Implementation
 * 
 * Provides memory optimization through iteration compression, intelligent cleanup,
 * and memory usage monitoring to handle large session histories efficiently.
 */
export class MemoryEfficientSessionManager extends SynchronousSessionManager {
  private readonly memoryConfig: MemoryEfficientSessionManagerConfig;
  private readonly memoryLogger: typeof logger;
  private readonly compressedIterations = new Map<string, Map<number, CompressedIterationData>>();
  private memoryMonitoringTimer?: NodeJS.Timeout;
  private memoryStats: MemoryStats;

  constructor(config: Partial<MemoryEfficientSessionManagerConfig> = {}) {
    const fullConfig = { ...DEFAULT_MEMORY_EFFICIENT_CONFIG, ...config };
    super(fullConfig);
    this.memoryConfig = fullConfig;
    this.memoryLogger = createComponentLogger('memory-efficient-session-manager');
    this.memoryStats = {
      totalMemoryUsage: 0,
      activeSessions: 0,
      compressedIterations: 0,
      compressionSavings: 0,
      averageCompressionRatio: 0,
      memoryPerSession: 0,
    };

    if (this.memoryConfig.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }

    this.memoryLogger.info('Memory-efficient session manager initialized', {
      maxMemoryUsage: this.memoryConfig.maxMemoryUsage,
      maxIterationsInMemory: this.memoryConfig.maxIterationsInMemory,
      enableCompression: this.memoryConfig.enableCompression,
    });
  }

  /**
   * Add iteration with memory optimization
   */
  public async addIteration(sessionId: string, iteration: IterationData): Promise<void> {
    // Add iteration normally first
    await super.addIteration(sessionId, iteration);

    // Apply memory optimizations immediately
    try {
      await this.optimizeSessionMemory(sessionId);
    } catch (error) {
      this.memoryLogger.warn('Failed to optimize session memory', {
        sessionId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get session with decompression support
   */
  public async getSession(id: string): Promise<GansAuditorCodexSessionState | null> {
    const session = await super.getSession(id);
    if (!session) {
      return null;
    }

    // Decompress iterations if needed
    await this.decompressSessionIterations(session);
    
    return session;
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): MemoryStats {
    this.updateMemoryStats();
    return { ...this.memoryStats };
  }

  /**
   * Manually trigger memory optimization for all sessions
   */
  public async optimizeAllSessions(): Promise<void> {
    const startTime = Date.now();
    let optimizedCount = 0;

    try {
      // Get all session IDs (this would need to be implemented in base class)
      const sessionIds = await this.getAllSessionIds();
      
      for (const sessionId of sessionIds) {
        try {
          await this.optimizeSessionMemory(sessionId);
          optimizedCount++;
        } catch (error) {
          this.memoryLogger.warn(`Failed to optimize session ${sessionId}`, {
            error: (error as Error).message,
          });
        }
      }

      const duration = Date.now() - startTime;
      this.memoryLogger.info('Memory optimization completed', {
        optimizedCount,
        duration,
        memoryUsage: this.memoryStats.totalMemoryUsage,
      });

    } catch (error) {
      this.memoryLogger.error('Memory optimization failed', error as Error);
    }
  }

  /**
   * Force cleanup of old sessions and compressed data
   */
  public async forceCleanup(): Promise<void> {
    const startTime = Date.now();
    let cleanedSessions = 0;
    let freedMemory = 0;

    try {
      // Clean up expired sessions
      const sessionIds = await this.getAllSessionIds();
      const now = Date.now();

      for (const sessionId of sessionIds) {
        const session = await super.getSession(sessionId);
        if (!session) continue;

        const sessionAge = now - session.createdAt;
        if (sessionAge > this.memoryConfig.maxSessionAge) {
          const sessionMemory = this.calculateSessionMemoryUsage(session);
          await this.deleteSession(sessionId);
          this.compressedIterations.delete(sessionId);
          
          cleanedSessions++;
          freedMemory += sessionMemory;
        }
      }

      // Clean up orphaned compressed iterations
      for (const [sessionId, compressions] of this.compressedIterations.entries()) {
        const session = await super.getSession(sessionId);
        if (!session) {
          this.compressedIterations.delete(sessionId);
        }
      }

      const duration = Date.now() - startTime;
      this.memoryLogger.info('Force cleanup completed', {
        cleanedSessions,
        freedMemory,
        duration,
      });

    } catch (error) {
      this.memoryLogger.error('Force cleanup failed', error as Error);
    }
  }

  /**
   * Get detailed memory breakdown by session
   */
  public async getMemoryBreakdown(): Promise<Array<{
    sessionId: string;
    memoryUsage: number;
    iterationCount: number;
    compressedIterations: number;
    compressionSavings: number;
    lastAccessed: number;
  }>> {
    const breakdown: Array<{
      sessionId: string;
      memoryUsage: number;
      iterationCount: number;
      compressedIterations: number;
      compressionSavings: number;
      lastAccessed: number;
    }> = [];

    try {
      const sessionIds = await this.getAllSessionIds();

      for (const sessionId of sessionIds) {
        const session = await super.getSession(sessionId);
        if (!session) continue;

        const memoryUsage = this.calculateSessionMemoryUsage(session);
        const compressedData = this.compressedIterations.get(sessionId);
        const compressedCount = compressedData?.size || 0;
        const compressionSavings = Array.from(compressedData?.values() || [])
          .reduce((sum, data) => sum + (data.originalSize - data.compressedSize), 0);

        breakdown.push({
          sessionId,
          memoryUsage,
          iterationCount: session.iterations?.length || 0,
          compressedIterations: compressedCount,
          compressionSavings,
          lastAccessed: session.updatedAt,
        });
      }

      // Sort by memory usage (highest first)
      breakdown.sort((a, b) => b.memoryUsage - a.memoryUsage);

    } catch (error) {
      this.memoryLogger.error('Failed to get memory breakdown', error as Error);
    }

    return breakdown;
  }

  /**
   * Destroy with cleanup
   */
  public destroy(): void {
    if (this.memoryMonitoringTimer) {
      clearInterval(this.memoryMonitoringTimer);
      this.memoryMonitoringTimer = undefined;
    }

    this.compressedIterations.clear();
    super.destroy();
    this.memoryLogger.info('Memory-efficient session manager destroyed');
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Optimize memory usage for a specific session
   */
  private async optimizeSessionMemory(sessionId: string): Promise<void> {
    const session = await super.getSession(sessionId);
    if (!session || !session.iterations) {
      return;
    }

    let iterations = session.iterations;
    const now = Date.now();

    // Always compress old iterations if compression is enabled
    if (this.memoryConfig.enableCompression && iterations.length > 0) {
      await this.compressOldIterations(sessionId, iterations);
    }

    // Check if we need to trim iterations
    if (iterations.length > this.memoryConfig.maxIterationsInMemory) {
      await this.trimIterations(sessionId, iterations);
    }

    // Update memory stats
    this.updateMemoryStats();

    // Check overall memory usage
    if (this.memoryStats.totalMemoryUsage > this.memoryConfig.maxMemoryUsage) {
      await this.performEmergencyCleanup();
    }
  }

  /**
   * Compress old iterations to save memory
   */
  private async compressOldIterations(sessionId: string, iterations: IterationData[]): Promise<void> {
    if (!this.memoryConfig.enableCompression) {
      return;
    }

    const now = Date.now();
    const compressionMap = this.compressedIterations.get(sessionId) || new Map();
    let compressedCount = 0;

    for (let i = 0; i < iterations.length; i++) {
      const iteration = iterations[i];
      const iterationAge = now - iteration.timestamp;

      // Skip if too recent or already compressed
      if (iterationAge < this.memoryConfig.compressionAge || 
          compressionMap.has(iteration.thoughtNumber)) {
        continue;
      }

      // Check if iteration is large enough to benefit from compression
      const iterationSize = this.calculateIterationSize(iteration);
      if (iterationSize < this.memoryConfig.compressionThreshold) {
        continue;
      }

      try {
        const compressed = this.compressIteration(iteration);
        compressionMap.set(iteration.thoughtNumber, compressed);
        compressedCount++;

        this.memoryLogger.debug('Iteration compressed', {
          sessionId,
          thoughtNumber: iteration.thoughtNumber,
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
          ratio: compressed.compressionRatio,
        });

      } catch (error) {
        this.memoryLogger.warn('Failed to compress iteration', {
          sessionId,
          thoughtNumber: iteration.thoughtNumber,
          error: (error as Error).message,
        });
      }
    }

    if (compressedCount > 0) {
      this.compressedIterations.set(sessionId, compressionMap);
      this.memoryLogger.debug('Compressed iterations for session', {
        sessionId,
        compressedCount,
        totalCompressed: compressionMap.size,
      });
    }
  }

  /**
   * Trim iterations to stay within memory limits
   */
  private async trimIterations(sessionId: string, iterations: IterationData[]): Promise<void> {
    const maxIterations = this.memoryConfig.maxIterationsInMemory;
    
    if (iterations.length <= maxIterations) {
      return;
    }

    // Keep the most recent iterations
    const iterationsToRemove = iterations.length - maxIterations;
    const removedIterations = iterations.splice(0, iterationsToRemove);

    // Update session with trimmed iterations
    const session = await super.getSession(sessionId);
    if (session) {
      session.iterations = iterations;
      await this.updateSession(session);
    }

    this.memoryLogger.debug('Trimmed iterations for session', {
      sessionId,
      removedCount: removedIterations.length,
      remainingCount: iterations.length,
    });
  }

  /**
   * Compress iteration data
   */
  private compressIteration(iteration: IterationData): CompressedIterationData {
    const iterationJson = JSON.stringify(iteration);
    const originalBuffer = Buffer.from(iterationJson, 'utf8');
    const compressedBuffer = gzipSync(originalBuffer);

    const originalSize = originalBuffer.length;
    const compressedSize = compressedBuffer.length;
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

    return {
      compressed: compressedBuffer,
      originalSize,
      compressedSize,
      compressionRatio,
      compressedAt: Date.now(),
    };
  }

  /**
   * Decompress iteration data
   */
  private decompressIteration(compressed: CompressedIterationData): IterationData {
    const decompressedBuffer = gunzipSync(compressed.compressed);
    const iterationJson = decompressedBuffer.toString('utf8');
    return JSON.parse(iterationJson);
  }

  /**
   * Decompress session iterations if needed
   */
  private async decompressSessionIterations(session: GansAuditorCodexSessionState): Promise<void> {
    const compressionMap = this.compressedIterations.get(session.id);
    if (!compressionMap || compressionMap.size === 0) {
      return;
    }

    const iterations = session.iterations || [];
    let decompressedCount = 0;

    // Find iterations that need decompression
    for (const [thoughtNumber, compressed] of compressionMap.entries()) {
      // Check if iteration is already in memory
      const existingIteration = iterations.find(iter => iter.thoughtNumber === thoughtNumber);
      if (existingIteration) {
        continue;
      }

      try {
        const decompressed = this.decompressIteration(compressed);
        iterations.push(decompressed);
        decompressedCount++;

        this.memoryLogger.debug('Iteration decompressed', {
          sessionId: session.id,
          thoughtNumber,
          originalSize: compressed.originalSize,
        });

      } catch (error) {
        this.memoryLogger.warn('Failed to decompress iteration', {
          sessionId: session.id,
          thoughtNumber,
          error: (error as Error).message,
        });
      }
    }

    if (decompressedCount > 0) {
      // Sort iterations by thought number
      iterations.sort((a, b) => a.thoughtNumber - b.thoughtNumber);
      session.iterations = iterations;

      this.memoryLogger.debug('Decompressed iterations for session', {
        sessionId: session.id,
        decompressedCount,
      });
    }
  }

  /**
   * Calculate memory usage of a session
   */
  private calculateSessionMemoryUsage(session: GansAuditorCodexSessionState): number {
    const sessionJson = JSON.stringify(session);
    let sessionSize = Buffer.byteLength(sessionJson, 'utf8');

    // Add compressed iterations size
    const compressionMap = this.compressedIterations.get(session.id);
    if (compressionMap) {
      for (const compressed of compressionMap.values()) {
        sessionSize += compressed.compressedSize;
      }
    }

    return sessionSize;
  }

  /**
   * Calculate memory usage of an iteration
   */
  private calculateIterationSize(iteration: IterationData): number {
    const iterationJson = JSON.stringify(iteration);
    return Buffer.byteLength(iterationJson, 'utf8');
  }

  /**
   * Update memory statistics
   */
  private updateMemoryStats(): void {
    let totalMemory = 0;
    let compressedCount = 0;
    let compressionSavings = 0;
    let totalCompressionRatio = 0;

    // Calculate from compressed iterations
    for (const compressionMap of this.compressedIterations.values()) {
      for (const compressed of compressionMap.values()) {
        totalMemory += compressed.compressedSize;
        compressedCount++;
        compressionSavings += (compressed.originalSize - compressed.compressedSize);
        totalCompressionRatio += compressed.compressionRatio;
      }
    }

    this.memoryStats = {
      totalMemoryUsage: totalMemory,
      activeSessions: this.compressedIterations.size,
      compressedIterations: compressedCount,
      compressionSavings,
      averageCompressionRatio: compressedCount > 0 ? totalCompressionRatio / compressedCount : 0,
      memoryPerSession: this.compressedIterations.size > 0 ? totalMemory / this.compressedIterations.size : 0,
    };
  }

  /**
   * Perform emergency cleanup when memory limit is exceeded
   */
  private async performEmergencyCleanup(): Promise<void> {
    this.memoryLogger.warn('Memory limit exceeded, performing emergency cleanup', {
      currentUsage: this.memoryStats.totalMemoryUsage,
      limit: this.memoryConfig.maxMemoryUsage,
    });

    // Get memory breakdown to identify largest sessions
    const breakdown = await this.getMemoryBreakdown();
    
    // Remove oldest sessions until under limit
    const targetUsage = this.memoryConfig.maxMemoryUsage * 0.8; // Target 80% of limit
    let currentUsage = this.memoryStats.totalMemoryUsage;
    let cleanedCount = 0;

    for (const session of breakdown) {
      if (currentUsage <= targetUsage) {
        break;
      }

      try {
        await this.deleteSession(session.sessionId);
        this.compressedIterations.delete(session.sessionId);
        currentUsage -= session.memoryUsage;
        cleanedCount++;

        this.memoryLogger.debug('Emergency cleanup removed session', {
          sessionId: session.sessionId,
          freedMemory: session.memoryUsage,
        });

      } catch (error) {
        this.memoryLogger.warn('Failed to cleanup session during emergency', {
          sessionId: session.sessionId,
          error: (error as Error).message,
        });
      }
    }

    this.memoryLogger.info('Emergency cleanup completed', {
      cleanedSessions: cleanedCount,
      newUsage: currentUsage,
      targetUsage,
    });
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitoringTimer = setInterval(() => {
      this.updateMemoryStats();
      
      if (this.memoryStats.totalMemoryUsage > this.memoryConfig.maxMemoryUsage) {
        this.performEmergencyCleanup().catch(error => {
          this.memoryLogger.error('Emergency cleanup failed', error as Error);
        });
      }

    }, this.memoryConfig.memoryMonitoringInterval);
  }

  /**
   * Get all session IDs (placeholder - would need implementation in base class)
   */
  private async getAllSessionIds(): Promise<string[]> {
    // For testing purposes, return the session IDs we're tracking
    return Array.from(this.compressedIterations.keys());
  }

  /**
   * Delete session (placeholder - would need implementation in base class)
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    // This would need to be implemented in the base SessionManager class
    this.memoryLogger.debug('Session deletion requested', { sessionId });
    return false; // Placeholder return
  }
}

/**
 * Create memory-efficient session manager with default configuration
 */
export function createMemoryEfficientSessionManager(
  config: Partial<MemoryEfficientSessionManagerConfig> = {}
): MemoryEfficientSessionManager {
  return new MemoryEfficientSessionManager(config);
}