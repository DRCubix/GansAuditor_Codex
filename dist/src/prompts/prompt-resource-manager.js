/**
 * Prompt Resource Manager
 *
 * Manages resource cleanup, memory monitoring, and garbage collection
 * for prompt execution and long-running sessions.
 *
 * Requirements: 10.6 - Resource cleanup and management
 */
import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger.js';
/**
 * Default resource manager configuration
 */
export const DEFAULT_RESOURCE_MANAGER_CONFIG = {
    monitoringInterval: 5000, // 5 seconds
    gcInterval: 30000, // 30 seconds
    cleanupTimeout: 10000, // 10 seconds
    enableAutoGC: true,
    enableMemoryPressure: true,
    resourceLimits: {
        maxHeapMemory: 512 * 1024 * 1024, // 512MB
        maxRssMemory: 1024 * 1024 * 1024, // 1GB
        maxFileDescriptors: 1000,
        maxActiveTimers: 100,
        memoryWarningThreshold: 80, // 80%
        memoryCriticalThreshold: 95, // 95%
    },
    enableDetailedLogging: false,
};
/**
 * Prompt Resource Manager Implementation
 *
 * Provides comprehensive resource management including memory monitoring,
 * automatic cleanup, and garbage collection for prompt execution.
 */
export class PromptResourceManager extends EventEmitter {
    config;
    componentLogger;
    cleanupTasks = new Map();
    temporaryArtifacts = new Set();
    monitoringTimer;
    gcTimer;
    isCleaningUp = false;
    lastResourceMetrics;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_RESOURCE_MANAGER_CONFIG, ...config };
        this.componentLogger = createComponentLogger('prompt-resource-manager');
        this.startResourceMonitoring();
        this.startGarbageCollection();
        // Register process cleanup handlers only in production
        if (process.env.NODE_ENV !== 'test') {
            this.registerProcessHandlers();
        }
        this.componentLogger.info('Prompt resource manager initialized', {
            monitoringInterval: this.config.monitoringInterval,
            gcInterval: this.config.gcInterval,
            maxHeapMemory: this.config.resourceLimits.maxHeapMemory,
            enableAutoGC: this.config.enableAutoGC,
        });
    }
    /**
     * Register cleanup task
     */
    registerCleanupTask(task) {
        this.cleanupTasks.set(task.id, task);
        this.componentLogger.debug('Cleanup task registered', {
            taskId: task.id,
            taskName: task.name,
            priority: task.priority,
            critical: task.critical,
        });
    }
    /**
     * Unregister cleanup task
     */
    unregisterCleanupTask(taskId) {
        const removed = this.cleanupTasks.delete(taskId);
        if (removed) {
            this.componentLogger.debug('Cleanup task unregistered', { taskId });
        }
        return removed;
    }
    /**
     * Register temporary artifact for cleanup
     */
    registerTemporaryArtifact(artifactPath) {
        this.temporaryArtifacts.add(artifactPath);
        this.componentLogger.debug('Temporary artifact registered', {
            artifactPath,
            totalArtifacts: this.temporaryArtifacts.size,
        });
    }
    /**
     * Unregister temporary artifact
     */
    unregisterTemporaryArtifact(artifactPath) {
        const removed = this.temporaryArtifacts.delete(artifactPath);
        if (removed) {
            this.componentLogger.debug('Temporary artifact unregistered', { artifactPath });
        }
        return removed;
    }
    /**
     * Get current resource metrics
     */
    getResourceMetrics() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return {
            memoryUsage: {
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external,
                rss: memoryUsage.rss,
            },
            cpuUsage: {
                user: cpuUsage.user,
                system: cpuUsage.system,
            },
            fileDescriptors: this.getFileDescriptorCount(),
            activeTimers: this.getActiveTimerCount(),
            activeHandles: this.getActiveHandleCount(),
        };
    }
    /**
     * Check if resource limits are exceeded
     */
    checkResourceLimits() {
        const metrics = this.getResourceMetrics();
        const limits = this.config.resourceLimits;
        const warnings = [];
        const critical = [];
        // Check heap memory
        const heapUsagePercent = (metrics.memoryUsage.heapUsed / limits.maxHeapMemory) * 100;
        if (heapUsagePercent > limits.memoryCriticalThreshold) {
            critical.push(`Heap memory usage critical: ${heapUsagePercent.toFixed(1)}%`);
        }
        else if (heapUsagePercent > limits.memoryWarningThreshold) {
            warnings.push(`Heap memory usage high: ${heapUsagePercent.toFixed(1)}%`);
        }
        // Check RSS memory
        const rssUsagePercent = (metrics.memoryUsage.rss / limits.maxRssMemory) * 100;
        if (rssUsagePercent > limits.memoryCriticalThreshold) {
            critical.push(`RSS memory usage critical: ${rssUsagePercent.toFixed(1)}%`);
        }
        else if (rssUsagePercent > limits.memoryWarningThreshold) {
            warnings.push(`RSS memory usage high: ${rssUsagePercent.toFixed(1)}%`);
        }
        // Check file descriptors
        if (metrics.fileDescriptors > limits.maxFileDescriptors) {
            critical.push(`File descriptor limit exceeded: ${metrics.fileDescriptors}`);
        }
        // Check active timers
        if (metrics.activeTimers > limits.maxActiveTimers) {
            warnings.push(`High number of active timers: ${metrics.activeTimers}`);
        }
        return {
            withinLimits: critical.length === 0,
            warnings,
            critical,
        };
    }
    /**
     * Force garbage collection
     */
    forceGarbageCollection() {
        if (global.gc) {
            const beforeMemory = process.memoryUsage();
            global.gc();
            const afterMemory = process.memoryUsage();
            const memoryFreed = beforeMemory.heapUsed - afterMemory.heapUsed;
            this.componentLogger.debug('Forced garbage collection', {
                memoryFreed,
                heapBefore: beforeMemory.heapUsed,
                heapAfter: afterMemory.heapUsed,
            });
            this.emit('garbageCollected', { memoryFreed });
        }
        else {
            this.componentLogger.warn('Garbage collection not available (run with --expose-gc)');
        }
    }
    /**
     * Execute cleanup tasks
     */
    async executeCleanup(force = false) {
        if (this.isCleaningUp && !force) {
            this.componentLogger.warn('Cleanup already in progress, skipping');
            return {
                success: false,
                tasksExecuted: 0,
                tasksFailed: 0,
                duration: 0,
                memoryFreed: 0,
                errors: [new Error('Cleanup already in progress')],
            };
        }
        this.isCleaningUp = true;
        const startTime = Date.now();
        const beforeMemory = process.memoryUsage();
        try {
            this.componentLogger.info('Starting resource cleanup', {
                cleanupTasks: this.cleanupTasks.size,
                temporaryArtifacts: this.temporaryArtifacts.size,
                force,
            });
            const result = await this.executeCleanupTasks();
            await this.cleanupTemporaryArtifacts();
            // Force garbage collection after cleanup
            if (this.config.enableAutoGC) {
                this.forceGarbageCollection();
            }
            const afterMemory = process.memoryUsage();
            const duration = Date.now() - startTime;
            const memoryFreed = beforeMemory.heapUsed - afterMemory.heapUsed;
            const cleanupResult = {
                ...result,
                duration,
                memoryFreed,
            };
            this.componentLogger.info('Resource cleanup completed', {
                success: cleanupResult.success,
                tasksExecuted: cleanupResult.tasksExecuted,
                tasksFailed: cleanupResult.tasksFailed,
                duration,
                memoryFreed,
            });
            this.emit('cleanupCompleted', cleanupResult);
            return cleanupResult;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.componentLogger.error('Resource cleanup failed', error, { duration });
            return {
                success: false,
                tasksExecuted: 0,
                tasksFailed: 0,
                duration,
                memoryFreed: 0,
                errors: [error],
            };
        }
        finally {
            this.isCleaningUp = false;
        }
    }
    /**
     * Get resource manager statistics
     */
    getStats() {
        const metrics = this.getResourceMetrics();
        const limitStatus = this.checkResourceLimits();
        return {
            cleanupTasks: this.cleanupTasks.size,
            temporaryArtifacts: this.temporaryArtifacts.size,
            lastCleanupDuration: 0, // Would need separate tracking
            memoryUsage: metrics.memoryUsage,
            resourceLimitStatus: limitStatus,
        };
    }
    /**
     * Destroy resource manager and cleanup all resources
     */
    async destroy() {
        this.componentLogger.info('Destroying prompt resource manager');
        // Stop monitoring
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = undefined;
        }
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
            this.gcTimer = undefined;
        }
        // Execute final cleanup
        await this.executeCleanup(true);
        // Remove all listeners
        this.removeAllListeners();
        this.componentLogger.info('Prompt resource manager destroyed');
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Start resource monitoring
     */
    startResourceMonitoring() {
        if (this.config.monitoringInterval <= 0) {
            return;
        }
        this.monitoringTimer = setInterval(() => {
            this.monitorResources();
        }, this.config.monitoringInterval);
    }
    /**
     * Start automatic garbage collection
     */
    startGarbageCollection() {
        if (!this.config.enableAutoGC || this.config.gcInterval <= 0) {
            return;
        }
        this.gcTimer = setInterval(() => {
            this.forceGarbageCollection();
        }, this.config.gcInterval);
    }
    /**
     * Monitor resource usage
     */
    monitorResources() {
        const metrics = this.getResourceMetrics();
        const limitStatus = this.checkResourceLimits();
        // Log detailed metrics if enabled
        if (this.config.enableDetailedLogging) {
            this.componentLogger.debug('Resource metrics', {
                heapUsed: metrics.memoryUsage.heapUsed,
                heapTotal: metrics.memoryUsage.heapTotal,
                rss: metrics.memoryUsage.rss,
                fileDescriptors: metrics.fileDescriptors,
                activeTimers: metrics.activeTimers,
            });
        }
        // Emit warnings
        for (const warning of limitStatus.warnings) {
            this.componentLogger.warn('Resource warning', { warning });
            this.emit('resourceWarning', warning, metrics);
        }
        // Emit critical alerts
        for (const critical of limitStatus.critical) {
            this.componentLogger.error('Resource critical', new Error(critical));
            this.emit('resourceCritical', critical, metrics);
        }
        // Trigger automatic cleanup if memory pressure is high
        if (this.config.enableMemoryPressure && limitStatus.critical.length > 0) {
            this.componentLogger.warn('High memory pressure detected, triggering cleanup');
            this.executeCleanup().catch(error => {
                this.componentLogger.error('Automatic cleanup failed', error);
            });
        }
        this.lastResourceMetrics = metrics;
        this.emit('resourceMetrics', metrics);
    }
    /**
     * Execute all cleanup tasks
     */
    async executeCleanupTasks() {
        const tasks = Array.from(this.cleanupTasks.values())
            .sort((a, b) => b.priority - a.priority); // Sort by priority (descending)
        let tasksExecuted = 0;
        let tasksFailed = 0;
        const errors = [];
        for (const task of tasks) {
            try {
                this.componentLogger.debug('Executing cleanup task', {
                    taskId: task.id,
                    taskName: task.name,
                    priority: task.priority,
                });
                await this.executeCleanupTaskWithTimeout(task);
                tasksExecuted++;
            }
            catch (error) {
                tasksFailed++;
                errors.push(error);
                this.componentLogger.error('Cleanup task failed', error, {
                    taskId: task.id,
                    taskName: task.name,
                    critical: task.critical,
                });
                // If critical task fails, stop cleanup
                if (task.critical) {
                    this.componentLogger.error('Critical cleanup task failed, stopping cleanup');
                    break;
                }
            }
        }
        return {
            success: tasksFailed === 0,
            tasksExecuted,
            tasksFailed,
            errors,
        };
    }
    /**
     * Execute cleanup task with timeout
     */
    async executeCleanupTaskWithTimeout(task) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Cleanup task '${task.name}' timed out after ${task.timeout}ms`));
            }, task.timeout);
            Promise.resolve(task.cleanup())
                .then(() => {
                clearTimeout(timeoutId);
                resolve();
            })
                .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    /**
     * Cleanup temporary artifacts
     */
    async cleanupTemporaryArtifacts() {
        const fs = await import('fs/promises');
        for (const artifactPath of this.temporaryArtifacts) {
            try {
                await fs.unlink(artifactPath);
                this.temporaryArtifacts.delete(artifactPath);
                this.componentLogger.debug('Temporary artifact cleaned up', { artifactPath });
            }
            catch (error) {
                // Ignore errors for missing files
                if (error.code !== 'ENOENT') {
                    this.componentLogger.warn('Failed to cleanup temporary artifact', {
                        artifactPath,
                        error: error.message,
                    });
                }
            }
        }
    }
    /**
     * Get file descriptor count (Unix-like systems)
     */
    getFileDescriptorCount() {
        try {
            // This is a rough estimate - would need platform-specific implementation
            return 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get active timer count
     */
    getActiveTimerCount() {
        // This would need access to internal Node.js timer tracking
        return 0;
    }
    /**
     * Get active handle count
     */
    getActiveHandleCount() {
        // This would need access to internal Node.js handle tracking
        return 0;
    }
    /**
     * Register process cleanup handlers
     */
    registerProcessHandlers() {
        const cleanup = async () => {
            this.componentLogger.info('Process cleanup triggered');
            await this.executeCleanup(true);
        };
        process.on('exit', () => {
            // Synchronous cleanup only
            this.componentLogger.info('Process exiting, performing synchronous cleanup');
        });
        process.on('SIGINT', async () => {
            this.componentLogger.info('SIGINT received, cleaning up...');
            await cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            this.componentLogger.info('SIGTERM received, cleaning up...');
            await cleanup();
            process.exit(0);
        });
        process.on('uncaughtException', async (error) => {
            this.componentLogger.error('Uncaught exception, cleaning up...', error);
            await cleanup();
            process.exit(1);
        });
        process.on('unhandledRejection', async (reason) => {
            this.componentLogger.error('Unhandled rejection, cleaning up...', reason);
            await cleanup();
            process.exit(1);
        });
    }
}
/**
 * Create prompt resource manager with default configuration
 */
export function createPromptResourceManager(config = {}) {
    return new PromptResourceManager(config);
}
//# sourceMappingURL=prompt-resource-manager.js.map