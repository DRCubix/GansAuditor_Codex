/**
 * Audit Queue Manager
 *
 * Implements concurrent audit limiting and queue management to prevent
 * system overload and ensure fair resource allocation.
 *
 * Requirements: 9.3 - Add concurrent audit limiting and queue management
 */
import { EventEmitter } from 'events';
import type { GansAuditorCodexThoughtData, GansAuditorCodexReview } from '../types/gan-types.js';
/**
 * Audit job in the queue
 */
export interface AuditJob {
    /** Unique job identifier */
    id: string;
    /** Thought data to audit */
    thought: GansAuditorCodexThoughtData;
    /** Session ID for context */
    sessionId?: string;
    /** Job priority (higher = more important) */
    priority: number;
    /** Timestamp when job was created */
    createdAt: number;
    /** Timestamp when job was started */
    startedAt?: number;
    /** Maximum execution time in milliseconds */
    timeout: number;
    /** Retry count */
    retryCount: number;
    /** Maximum retry attempts */
    maxRetries: number;
    /** Promise resolve function */
    resolve: (result: GansAuditorCodexReview) => void;
    /** Promise reject function */
    reject: (error: Error) => void;
}
/**
 * Queue statistics
 */
export interface QueueStats {
    /** Number of jobs waiting in queue */
    pending: number;
    /** Number of jobs currently executing */
    running: number;
    /** Number of completed jobs */
    completed: number;
    /** Number of failed jobs */
    failed: number;
    /** Average wait time in milliseconds */
    averageWaitTime: number;
    /** Average execution time in milliseconds */
    averageExecutionTime: number;
    /** Current queue utilization percentage */
    utilization: number;
}
/**
 * Configuration for audit queue
 */
export interface AuditQueueConfig {
    /** Maximum number of concurrent audits */
    maxConcurrent: number;
    /** Maximum queue size */
    maxQueueSize: number;
    /** Default job timeout in milliseconds */
    defaultTimeout: number;
    /** Default maximum retries */
    defaultMaxRetries: number;
    /** Queue processing interval in milliseconds */
    processingInterval: number;
    /** Whether to enable queue statistics */
    enableStats: boolean;
    /** Priority levels configuration */
    priorityLevels: {
        high: number;
        normal: number;
        low: number;
    };
}
/**
 * Default configuration for audit queue
 */
export declare const DEFAULT_AUDIT_QUEUE_CONFIG: AuditQueueConfig;
/**
 * Audit Queue Manager Implementation
 *
 * Manages concurrent audit execution with priority-based queuing,
 * retry logic, and comprehensive statistics tracking.
 */
export declare class AuditQueue extends EventEmitter {
    private readonly auditFunction;
    private readonly config;
    private readonly componentLogger;
    private readonly pendingJobs;
    private readonly runningJobs;
    private readonly completedJobs;
    private processingTimer?;
    private stats;
    private jobIdCounter;
    constructor(auditFunction: (thought: GansAuditorCodexThoughtData, sessionId?: string) => Promise<GansAuditorCodexReview>, config?: Partial<AuditQueueConfig>);
    /**
     * Add audit job to queue
     */
    enqueue(thought: GansAuditorCodexThoughtData, sessionId?: string, options?: {
        priority?: 'high' | 'normal' | 'low';
        timeout?: number;
        maxRetries?: number;
    }): Promise<GansAuditorCodexReview>;
    /**
     * Get current queue statistics
     */
    getStats(): QueueStats;
    /**
     * Get queue status information
     */
    getStatus(): {
        isProcessing: boolean;
        pendingJobs: number;
        runningJobs: number;
        capacity: number;
        utilization: number;
    };
    /**
     * Clear all pending jobs
     */
    clearQueue(): void;
    /**
     * Pause queue processing
     */
    pause(): void;
    /**
     * Resume queue processing
     */
    resume(): void;
    /**
     * Destroy queue and cleanup resources
     */
    destroy(): void;
    /**
     * Generate unique job ID
     */
    private generateJobId;
    /**
     * Insert job in queue maintaining priority order
     */
    private insertJobByPriority;
    /**
     * Start queue processing
     */
    private startProcessing;
    /**
     * Process pending jobs in queue
     */
    private processQueue;
    /**
     * Start executing a job
     */
    private startJob;
    /**
     * Execute job with timeout
     */
    private executeWithTimeout;
    /**
     * Handle successful job completion
     */
    private handleJobSuccess;
    /**
     * Handle job error with retry logic
     */
    private handleJobError;
    /**
     * Update queue statistics
     */
    private updateStats;
    /**
     * Trim completed jobs to prevent memory growth
     */
    private trimCompletedJobs;
}
/**
 * Create audit queue with default configuration
 */
export declare function createAuditQueue(auditFunction: (thought: GansAuditorCodexThoughtData, sessionId?: string) => Promise<GansAuditorCodexReview>, config?: Partial<AuditQueueConfig>): AuditQueue;
//# sourceMappingURL=audit-queue.d.ts.map