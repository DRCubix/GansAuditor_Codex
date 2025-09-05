/**
 * Audit Queue Manager
 * 
 * Implements concurrent audit limiting and queue management to prevent
 * system overload and ensure fair resource allocation.
 * 
 * Requirements: 9.3 - Add concurrent audit limiting and queue management
 */

import { EventEmitter } from 'events';
import type { 
  GansAuditorCodexThoughtData, 
  GansAuditorCodexReview 
} from '../types/gan-types.js';
import { logger, createComponentLogger } from '../utils/logger.js';

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
 * Job execution result
 */
interface JobResult {
  job: AuditJob;
  result?: GansAuditorCodexReview;
  error?: Error;
  executionTime: number;
}

/**
 * Default configuration for audit queue
 */
export const DEFAULT_AUDIT_QUEUE_CONFIG: AuditQueueConfig = {
  maxConcurrent: 3,
  maxQueueSize: 50,
  defaultTimeout: 30000, // 30 seconds
  defaultMaxRetries: 2,
  processingInterval: 100, // 100ms
  enableStats: true,
  priorityLevels: {
    high: 100,
    normal: 50,
    low: 10,
  },
};

/**
 * Audit Queue Manager Implementation
 * 
 * Manages concurrent audit execution with priority-based queuing,
 * retry logic, and comprehensive statistics tracking.
 */
export class AuditQueue extends EventEmitter {
  private readonly config: AuditQueueConfig;
  private readonly componentLogger: typeof logger;
  private readonly pendingJobs: AuditJob[] = [];
  private readonly runningJobs = new Map<string, AuditJob>();
  private readonly completedJobs: JobResult[] = [];
  private processingTimer?: NodeJS.Timeout;
  private stats: QueueStats;
  private jobIdCounter = 0;

  constructor(
    private readonly auditFunction: (
      thought: GansAuditorCodexThoughtData, 
      sessionId?: string
    ) => Promise<GansAuditorCodexReview>,
    config: Partial<AuditQueueConfig> = {}
  ) {
    super();
    this.config = { ...DEFAULT_AUDIT_QUEUE_CONFIG, ...config };
    this.componentLogger = createComponentLogger('audit-queue');
    this.stats = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0,
      utilization: 0,
    };

    this.startProcessing();
    this.componentLogger.info('Audit queue initialized', {
      maxConcurrent: this.config.maxConcurrent,
      maxQueueSize: this.config.maxQueueSize,
      defaultTimeout: this.config.defaultTimeout,
    });
  }

  /**
   * Add audit job to queue
   */
  async enqueue(
    thought: GansAuditorCodexThoughtData,
    sessionId?: string,
    options: {
      priority?: 'high' | 'normal' | 'low';
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): Promise<GansAuditorCodexReview> {
    // Check queue capacity
    if (this.pendingJobs.length >= this.config.maxQueueSize) {
      throw new Error(`Queue is full (${this.config.maxQueueSize} jobs)`);
    }

    const jobId = this.generateJobId();
    const priority = this.config.priorityLevels[options.priority || 'normal'];
    const timeout = options.timeout || this.config.defaultTimeout;
    const maxRetries = options.maxRetries || this.config.defaultMaxRetries;

    return new Promise<GansAuditorCodexReview>((resolve, reject) => {
      const job: AuditJob = {
        id: jobId,
        thought,
        sessionId,
        priority,
        createdAt: Date.now(),
        timeout,
        retryCount: 0,
        maxRetries,
        resolve,
        reject,
      };

      // Insert job in priority order
      this.insertJobByPriority(job);
      this.updateStats();

      this.componentLogger.debug('Job enqueued', {
        jobId,
        priority: options.priority || 'normal',
        queueSize: this.pendingJobs.length,
        thoughtNumber: thought.thoughtNumber,
      });

      this.emit('jobEnqueued', job);
    });
  }

  /**
   * Get current queue statistics
   */
  getStats(): QueueStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get queue status information
   */
  getStatus(): {
    isProcessing: boolean;
    pendingJobs: number;
    runningJobs: number;
    capacity: number;
    utilization: number;
  } {
    return {
      isProcessing: this.processingTimer !== undefined,
      pendingJobs: this.pendingJobs.length,
      runningJobs: this.runningJobs.size,
      capacity: this.config.maxConcurrent,
      utilization: (this.runningJobs.size / this.config.maxConcurrent) * 100,
    };
  }

  /**
   * Clear all pending jobs
   */
  clearQueue(): void {
    const clearedCount = this.pendingJobs.length;
    
    // Reject all pending jobs
    for (const job of this.pendingJobs) {
      job.reject(new Error('Queue cleared'));
    }
    
    this.pendingJobs.length = 0;
    this.updateStats();

    this.componentLogger.info('Queue cleared', { clearedCount });
    this.emit('queueCleared', clearedCount);
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
      this.componentLogger.info('Queue processing paused');
      this.emit('queuePaused');
    }
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (!this.processingTimer) {
      this.startProcessing();
      this.componentLogger.info('Queue processing resumed');
      this.emit('queueResumed');
    }
  }

  /**
   * Destroy queue and cleanup resources
   */
  destroy(): void {
    this.pause();
    this.clearQueue();
    
    // Cancel running jobs
    for (const job of this.runningJobs.values()) {
      job.reject(new Error('Queue destroyed'));
    }
    this.runningJobs.clear();

    this.removeAllListeners();
    this.componentLogger.info('Audit queue destroyed');
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `audit-job-${++this.jobIdCounter}-${Date.now()}`;
  }

  /**
   * Insert job in queue maintaining priority order
   */
  private insertJobByPriority(job: AuditJob): void {
    let insertIndex = this.pendingJobs.length;
    
    // Find insertion point to maintain priority order
    for (let i = 0; i < this.pendingJobs.length; i++) {
      if (job.priority > this.pendingJobs[i].priority) {
        insertIndex = i;
        break;
      }
    }

    this.pendingJobs.splice(insertIndex, 0, job);
  }

  /**
   * Start queue processing
   */
  private startProcessing(): void {
    if (this.processingTimer) {
      return;
    }

    this.processingTimer = setInterval(() => {
      this.processQueue();
    }, this.config.processingInterval);
  }

  /**
   * Process pending jobs in queue
   */
  private processQueue(): void {
    // Check if we can start more jobs
    const availableSlots = this.config.maxConcurrent - this.runningJobs.size;
    if (availableSlots <= 0 || this.pendingJobs.length === 0) {
      return;
    }

    // Start jobs up to available slots
    const jobsToStart = Math.min(availableSlots, this.pendingJobs.length);
    
    for (let i = 0; i < jobsToStart; i++) {
      const job = this.pendingJobs.shift();
      if (job) {
        this.startJob(job);
      }
    }

    this.updateStats();
  }

  /**
   * Start executing a job
   */
  private async startJob(job: AuditJob): Promise<void> {
    job.startedAt = Date.now();
    this.runningJobs.set(job.id, job);

    this.componentLogger.debug('Job started', {
      jobId: job.id,
      waitTime: job.startedAt - job.createdAt,
      runningJobs: this.runningJobs.size,
    });

    this.emit('jobStarted', job);

    try {
      // Execute audit with timeout
      const result = await this.executeWithTimeout(job);
      await this.handleJobSuccess(job, result);
    } catch (error) {
      await this.handleJobError(job, error as Error);
    }
  }

  /**
   * Execute job with timeout
   */
  private async executeWithTimeout(job: AuditJob): Promise<GansAuditorCodexReview> {
    return new Promise<GansAuditorCodexReview>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Job timed out after ${job.timeout}ms`));
      }, job.timeout);

      this.auditFunction(job.thought, job.sessionId)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful job completion
   */
  private async handleJobSuccess(job: AuditJob, result: GansAuditorCodexReview): Promise<void> {
    const executionTime = Date.now() - (job.startedAt || job.createdAt);
    
    this.runningJobs.delete(job.id);
    
    const jobResult: JobResult = {
      job,
      result,
      executionTime,
    };
    
    this.completedJobs.push(jobResult);
    this.trimCompletedJobs();

    job.resolve(result);

    this.componentLogger.debug('Job completed successfully', {
      jobId: job.id,
      executionTime,
      verdict: result.verdict,
      score: result.overall,
    });

    this.emit('jobCompleted', jobResult);
    this.updateStats();
  }

  /**
   * Handle job error with retry logic
   */
  private async handleJobError(job: AuditJob, error: Error): Promise<void> {
    const executionTime = Date.now() - (job.startedAt || job.createdAt);
    
    this.runningJobs.delete(job.id);

    // Check if we should retry
    if (job.retryCount < job.maxRetries) {
      job.retryCount++;
      job.startedAt = undefined; // Reset start time for retry
      
      this.componentLogger.warn('Job failed, retrying', {
        jobId: job.id,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        error: error.message,
      });

      // Re-queue for retry
      this.insertJobByPriority(job);
      this.emit('jobRetry', job, error);
      return;
    }

    // Max retries exceeded, fail the job
    const jobResult: JobResult = {
      job,
      error,
      executionTime,
    };
    
    this.completedJobs.push(jobResult);
    this.trimCompletedJobs();

    job.reject(error);

    this.componentLogger.error('Job failed after max retries', error, {
      jobId: job.id,
      retryCount: job.retryCount,
      executionTime,
    });

    this.emit('jobFailed', jobResult);
    this.updateStats();
  }

  /**
   * Update queue statistics
   */
  private updateStats(): void {
    this.stats.pending = this.pendingJobs.length;
    this.stats.running = this.runningJobs.size;
    this.stats.utilization = (this.runningJobs.size / this.config.maxConcurrent) * 100;

    if (this.config.enableStats && this.completedJobs.length > 0) {
      // Calculate averages from completed jobs
      const successfulJobs = this.completedJobs.filter(job => !job.error);
      const failedJobs = this.completedJobs.filter(job => job.error);

      this.stats.completed = successfulJobs.length;
      this.stats.failed = failedJobs.length;

      if (successfulJobs.length > 0) {
        // Calculate average wait time
        const totalWaitTime = successfulJobs.reduce((sum, jobResult) => {
          const waitTime = (jobResult.job.startedAt || jobResult.job.createdAt) - jobResult.job.createdAt;
          return sum + waitTime;
        }, 0);
        this.stats.averageWaitTime = totalWaitTime / successfulJobs.length;

        // Calculate average execution time
        const totalExecutionTime = successfulJobs.reduce((sum, jobResult) => sum + jobResult.executionTime, 0);
        this.stats.averageExecutionTime = totalExecutionTime / successfulJobs.length;
      }
    }
  }

  /**
   * Trim completed jobs to prevent memory growth
   */
  private trimCompletedJobs(): void {
    const maxCompletedJobs = 100; // Keep last 100 completed jobs for stats
    if (this.completedJobs.length > maxCompletedJobs) {
      this.completedJobs.splice(0, this.completedJobs.length - maxCompletedJobs);
    }
  }
}

/**
 * Create audit queue with default configuration
 */
export function createAuditQueue(
  auditFunction: (thought: GansAuditorCodexThoughtData, sessionId?: string) => Promise<GansAuditorCodexReview>,
  config: Partial<AuditQueueConfig> = {}
): AuditQueue {
  return new AuditQueue(auditFunction, config);
}