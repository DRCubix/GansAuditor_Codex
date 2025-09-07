/**
 * Production Process Manager for Codex CLI execution
 *
 * This module implements robust process management with timeout handling,
 * resource management, concurrent process limiting, and proper cleanup.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
/**
 * Production-ready process manager for Codex CLI execution
 *
 * Features:
 * - Concurrent process limiting with queue management
 * - Robust timeout handling with graceful and force termination
 * - Process health monitoring and metrics collection
 * - Proper cleanup on shutdown
 * - Backpressure handling for queue management
 */
export class ProcessManager extends EventEmitter {
    config;
    activeProcesses = new Map();
    queuedProcesses = [];
    metrics;
    healthCheckTimer;
    isShuttingDown = false;
    nextProcessId = 1;
    constructor(config = {}) {
        super();
        this.config = {
            maxConcurrentProcesses: 3,
            defaultTimeout: 120000, // 2 minutes
            processCleanupTimeout: 5000, // 5 seconds for graceful shutdown
            queueTimeout: 300000, // 5 minutes max queue wait
            healthCheckInterval: 30000, // 30 seconds
            enableMetrics: true,
            ...config,
        };
        this.metrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalExecutionTime: 0,
            executionTimes: [],
            lastExecutionTime: null,
        };
        // Start health monitoring
        if (this.config.enableMetrics) {
            this.startHealthMonitoring();
        }
        // Note: Cleanup handlers are not set up automatically to avoid issues in test environments
        // Call setupCleanupHandlers() manually if needed in production
    }
    /**
     * Execute a command with robust process management
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
     */
    async executeCommand(executable, args, options) {
        if (this.isShuttingDown) {
            throw new Error('ProcessManager is shutting down, cannot execute new processes');
        }
        // Check if we can execute immediately or need to queue
        if (this.activeProcesses.size >= this.config.maxConcurrentProcesses) {
            return this.queueProcess(executable, args, options);
        }
        return this.executeProcessInternal(executable, args, options);
    }
    /**
     * Get current process health status
     * Requirements: 6.5
     */
    getHealthStatus() {
        const averageExecutionTime = this.metrics.executionTimes.length > 0
            ? this.metrics.executionTimes.reduce((sum, time) => sum + time, 0) / this.metrics.executionTimes.length
            : 0;
        return {
            activeProcesses: this.activeProcesses.size,
            queuedProcesses: this.queuedProcesses.length,
            totalProcessesExecuted: this.metrics.totalExecutions,
            successfulExecutions: this.metrics.successfulExecutions,
            failedExecutions: this.metrics.failedExecutions,
            averageExecutionTime,
            lastExecutionTime: this.metrics.lastExecutionTime,
            isHealthy: this.isHealthy(),
        };
    }
    /**
     * Get number of active processes
     * Requirements: 6.1
     */
    getActiveProcessCount() {
        return this.activeProcesses.size;
    }
    /**
     * Get number of queued processes
     * Requirements: 6.3
     */
    getQueuedProcessCount() {
        return this.queuedProcesses.length;
    }
    /**
     * Terminate all active processes gracefully
     * Requirements: 6.2, 6.4
     */
    async terminateAllProcesses() {
        this.isShuttingDown = true;
        // Stop accepting new processes
        this.clearProcessQueue();
        // Terminate all active processes
        const terminationPromises = [];
        for (const [processId, processInfo] of this.activeProcesses) {
            terminationPromises.push(this.terminateProcess(processId, processInfo));
        }
        // Wait for all processes to terminate
        await Promise.allSettled(terminationPromises);
        // Stop health monitoring
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = undefined;
        }
        this.emit('shutdown-complete');
    }
    /**
     * Set maximum concurrent processes limit
     * Requirements: 6.3
     */
    setProcessLimit(limit) {
        if (limit < 1) {
            throw new Error('Process limit must be at least 1');
        }
        this.config.maxConcurrentProcesses = limit;
        this.emit('process-limit-changed', limit);
        // Process queue if we increased the limit
        this.processQueue();
    }
    /**
     * Internal process execution with full monitoring
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
     */
    async executeProcessInternal(executable, args, options) {
        const processId = this.nextProcessId++;
        const startTime = Date.now();
        const timeout = options.timeout || this.config.defaultTimeout;
        return new Promise((resolve, reject) => {
            try {
                // Spawn the process
                const child = spawn(executable, args, {
                    cwd: options.workingDirectory,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: options.environment,
                });
                if (!child.pid) {
                    throw new Error('Failed to spawn process');
                }
                // Create process info for tracking
                const processInfo = {
                    process: child,
                    startTime,
                    timeout,
                    resolve,
                    reject,
                    options,
                };
                // Track the process
                this.activeProcesses.set(processId, processInfo);
                this.emit('process-started', processId, child.pid);
                // Set up timeout handling
                this.setupProcessTimeout(processId, processInfo);
                // Set up process monitoring
                this.setupProcessMonitoring(processId, processInfo);
                // Handle input if provided
                if (options.input && child.stdin) {
                    child.stdin.write(options.input);
                    child.stdin.end();
                }
            }
            catch (error) {
                this.metrics.failedExecutions++;
                reject(error);
            }
        });
    }
    /**
     * Queue a process for later execution
     * Requirements: 6.3, 6.4
     */
    async queueProcess(executable, args, options) {
        return new Promise((resolve, reject) => {
            const queuedProcess = {
                executable,
                args,
                options,
                resolve,
                reject,
                queuedAt: Date.now(),
            };
            this.queuedProcesses.push(queuedProcess);
            this.emit('process-queued', this.queuedProcesses.length);
            // Set up queue timeout
            const queueTimeout = setTimeout(() => {
                const index = this.queuedProcesses.indexOf(queuedProcess);
                if (index !== -1) {
                    this.queuedProcesses.splice(index, 1);
                    reject(new Error(`Process queue timeout after ${this.config.queueTimeout}ms`));
                }
            }, this.config.queueTimeout);
            // Clear timeout when process is dequeued
            queuedProcess.resolve = (result) => {
                clearTimeout(queueTimeout);
                resolve(result);
            };
            queuedProcess.reject = (error) => {
                clearTimeout(queueTimeout);
                reject(error);
            };
        });
    }
    /**
     * Process the queue when slots become available
     * Requirements: 6.3
     */
    processQueue() {
        while (this.queuedProcesses.length > 0 &&
            this.activeProcesses.size < this.config.maxConcurrentProcesses &&
            !this.isShuttingDown) {
            const queuedProcess = this.queuedProcesses.shift();
            if (queuedProcess) {
                this.executeProcessInternal(queuedProcess.executable, queuedProcess.args, queuedProcess.options)
                    .then(queuedProcess.resolve)
                    .catch(queuedProcess.reject);
            }
        }
    }
    /**
     * Set up timeout handling for a process
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
     */
    setupProcessTimeout(processId, processInfo) {
        if (processInfo.timeout > 0) {
            processInfo.timeoutId = setTimeout(() => {
                this.handleProcessTimeout(processId, processInfo);
            }, processInfo.timeout);
        }
    }
    /**
     * Handle process timeout with graceful and force termination
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
     */
    handleProcessTimeout(processId, processInfo) {
        const { process: child } = processInfo;
        this.emit('process-timeout', processId, processInfo.timeout);
        // First attempt: graceful termination with SIGTERM
        if (!child.killed) {
            child.kill('SIGTERM');
            // Set up force kill timeout
            processInfo.forceKillTimeoutId = setTimeout(() => {
                if (!child.killed) {
                    this.emit('process-force-kill', processId);
                    child.kill('SIGKILL');
                }
            }, this.config.processCleanupTimeout);
        }
        // Mark as timed out and resolve
        const executionTime = Date.now() - processInfo.startTime;
        this.completeProcess(processId, {
            stdout: '',
            stderr: 'Process timed out',
            exitCode: -1,
            executionTime,
            timedOut: true,
            processId: child.pid,
        });
    }
    /**
     * Set up process monitoring and event handling
     * Requirements: 6.1, 6.2, 6.5
     */
    setupProcessMonitoring(processId, processInfo) {
        const { process: child } = processInfo;
        let stdout = '';
        let stderr = '';
        // Collect output
        if (child.stdout) {
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        }
        if (child.stderr) {
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
        }
        // Handle process completion
        child.on('close', (code) => {
            const executionTime = Date.now() - processInfo.startTime;
            this.completeProcess(processId, {
                stdout,
                stderr,
                exitCode: code || 0,
                executionTime,
                timedOut: false,
                processId: child.pid,
            });
        });
        // Handle process errors
        child.on('error', (error) => {
            this.emit('process-error', processId, error);
            this.completeProcessWithError(processId, error);
        });
    }
    /**
     * Complete a process execution successfully
     * Requirements: 6.1, 6.2, 6.5
     */
    completeProcess(processId, result) {
        const processInfo = this.activeProcesses.get(processId);
        if (!processInfo) {
            return;
        }
        // Clear timeouts
        if (processInfo.timeoutId) {
            clearTimeout(processInfo.timeoutId);
        }
        if (processInfo.forceKillTimeoutId) {
            clearTimeout(processInfo.forceKillTimeoutId);
        }
        // Update metrics
        this.updateMetrics(result);
        // Remove from active processes
        this.activeProcesses.delete(processId);
        // Emit completion event
        this.emit('process-completed', processId, result);
        // Resolve the promise
        processInfo.resolve(result);
        // Process queue
        this.processQueue();
    }
    /**
     * Complete a process execution with error
     * Requirements: 6.1, 6.2
     */
    completeProcessWithError(processId, error) {
        const processInfo = this.activeProcesses.get(processId);
        if (!processInfo) {
            return;
        }
        // Clear timeouts
        if (processInfo.timeoutId) {
            clearTimeout(processInfo.timeoutId);
        }
        if (processInfo.forceKillTimeoutId) {
            clearTimeout(processInfo.forceKillTimeoutId);
        }
        // Update metrics
        this.metrics.failedExecutions++;
        // Remove from active processes
        this.activeProcesses.delete(processId);
        // Emit error event
        this.emit('process-failed', processId, error);
        // Reject the promise
        processInfo.reject(error);
        // Process queue
        this.processQueue();
    }
    /**
     * Terminate a specific process
     * Requirements: 6.2, 6.4
     */
    async terminateProcess(processId, processInfo) {
        return new Promise((resolve) => {
            const { process: child } = processInfo;
            if (child.killed) {
                resolve();
                return;
            }
            // Set up completion handler
            const onExit = () => {
                resolve();
            };
            child.once('exit', onExit);
            child.once('close', onExit);
            // Graceful termination
            child.kill('SIGTERM');
            // Force kill after timeout
            setTimeout(() => {
                if (!child.killed) {
                    child.kill('SIGKILL');
                }
            }, this.config.processCleanupTimeout);
        });
    }
    /**
     * Clear the process queue
     * Requirements: 6.3
     */
    clearProcessQueue() {
        while (this.queuedProcesses.length > 0) {
            const queuedProcess = this.queuedProcesses.shift();
            if (queuedProcess) {
                queuedProcess.reject(new Error('ProcessManager is shutting down'));
            }
        }
    }
    /**
     * Update execution metrics
     * Requirements: 6.5
     */
    updateMetrics(result) {
        if (!this.config.enableMetrics) {
            return;
        }
        this.metrics.totalExecutions++;
        this.metrics.lastExecutionTime = Date.now();
        this.metrics.totalExecutionTime += result.executionTime;
        if (result.exitCode === 0 && !result.timedOut) {
            this.metrics.successfulExecutions++;
        }
        else {
            this.metrics.failedExecutions++;
        }
        // Keep only last 100 execution times for average calculation
        this.metrics.executionTimes.push(result.executionTime);
        if (this.metrics.executionTimes.length > 100) {
            this.metrics.executionTimes.shift();
        }
    }
    /**
     * Check if the process manager is healthy
     * Requirements: 6.5
     */
    isHealthy() {
        const totalExecutions = this.metrics.totalExecutions;
        if (totalExecutions === 0) {
            return true; // No executions yet, consider healthy
        }
        const successRate = this.metrics.successfulExecutions / totalExecutions;
        const hasRecentActivity = this.metrics.lastExecutionTime &&
            (Date.now() - this.metrics.lastExecutionTime) < 300000; // 5 minutes
        return successRate >= 0.8 && (hasRecentActivity || totalExecutions < 5);
    }
    /**
     * Start health monitoring
     * Requirements: 6.5
     */
    startHealthMonitoring() {
        this.healthCheckTimer = setInterval(() => {
            const healthStatus = this.getHealthStatus();
            this.emit('health-check', healthStatus);
            if (!healthStatus.isHealthy) {
                this.emit('health-warning', healthStatus);
            }
        }, this.config.healthCheckInterval);
    }
    /**
     * Set up cleanup handlers for graceful shutdown
     * Requirements: 6.2, 6.4
     *
     * Call this method manually in production environments where you want
     * automatic cleanup on process exit signals.
     */
    setupCleanupHandlers() {
        const cleanup = async () => {
            await this.terminateAllProcesses();
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('beforeExit', cleanup);
    }
}
/**
 * Create a ProcessManager instance with default configuration
 */
export function createProcessManager(config) {
    return new ProcessManager(config);
}
/**
 * Default ProcessManager instance for shared use
 */
export const defaultProcessManager = createProcessManager();
//# sourceMappingURL=process-manager.js.map