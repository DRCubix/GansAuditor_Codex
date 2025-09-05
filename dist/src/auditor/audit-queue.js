/**
 * Audit Queue Manager
 *
 * Implements concurrent audit limiting and queue management to prevent
 * system overload and ensure fair resource allocation.
 *
 * Requirements: 9.3 - Add concurrent audit limiting and queue management
 */
import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger.js';
/**
 * Default configuration for audit queue
 */
export const DEFAULT_AUDIT_QUEUE_CONFIG = {
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
    auditFunction;
    config;
    componentLogger;
    pendingJobs = [];
    runningJobs = new Map();
    completedJobs = [];
    processingTimer;
    stats;
    jobIdCounter = 0;
    constructor(auditFunction, config = {}) {
        super();
        this.auditFunction = auditFunction;
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
    async enqueue(thought, sessionId, options = {}) {
        // Check queue capacity
        if (this.pendingJobs.length >= this.config.maxQueueSize) {
            throw new Error(`Queue is full (${this.config.maxQueueSize} jobs)`);
        }
        const jobId = this.generateJobId();
        const priority = this.config.priorityLevels[options.priority || 'normal'];
        const timeout = options.timeout || this.config.defaultTimeout;
        const maxRetries = options.maxRetries || this.config.defaultMaxRetries;
        return new Promise((resolve, reject) => {
            const job = {
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
    getStats() {
        this.updateStats();
        return { ...this.stats };
    }
    /**
     * Get queue status information
     */
    getStatus() {
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
    clearQueue() {
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
    pause() {
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
    resume() {
        if (!this.processingTimer) {
            this.startProcessing();
            this.componentLogger.info('Queue processing resumed');
            this.emit('queueResumed');
        }
    }
    /**
     * Destroy queue and cleanup resources
     */
    destroy() {
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
    generateJobId() {
        return `audit-job-${++this.jobIdCounter}-${Date.now()}`;
    }
    /**
     * Insert job in queue maintaining priority order
     */
    insertJobByPriority(job) {
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
    startProcessing() {
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
    processQueue() {
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
    async startJob(job) {
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
        }
        catch (error) {
            await this.handleJobError(job, error);
        }
    }
    /**
     * Execute job with timeout
     */
    async executeWithTimeout(job) {
        return new Promise((resolve, reject) => {
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
    async handleJobSuccess(job, result) {
        const executionTime = Date.now() - (job.startedAt || job.createdAt);
        this.runningJobs.delete(job.id);
        const jobResult = {
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
    async handleJobError(job, error) {
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
        const jobResult = {
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
    updateStats() {
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
    trimCompletedJobs() {
        const maxCompletedJobs = 100; // Keep last 100 completed jobs for stats
        if (this.completedJobs.length > maxCompletedJobs) {
            this.completedJobs.splice(0, this.completedJobs.length - maxCompletedJobs);
        }
    }
}
/**
 * Create audit queue with default configuration
 */
export function createAuditQueue(auditFunction, config = {}) {
    return new AuditQueue(auditFunction, config);
}
//# sourceMappingURL=audit-queue.js.map