/**
 * Production Process Manager for Codex CLI execution
 *
 * This module implements robust process management with timeout handling,
 * resource management, concurrent process limiting, and proper cleanup.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */
import { EventEmitter } from 'events';
/**
 * Configuration options for process execution
 */
export interface ProcessExecutionOptions {
    workingDirectory: string;
    timeout: number;
    environment: Record<string, string>;
    input?: string;
    maxRetries?: number;
    retryDelay?: number;
}
/**
 * Result of process execution
 */
export interface ProcessResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    timedOut: boolean;
    processId?: number;
}
/**
 * Process health status information
 */
export interface ProcessHealthStatus {
    activeProcesses: number;
    queuedProcesses: number;
    totalProcessesExecuted: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutionTime: number | null;
    isHealthy: boolean;
}
/**
 * Configuration for the ProcessManager
 */
export interface ProcessManagerConfig {
    maxConcurrentProcesses: number;
    defaultTimeout: number;
    processCleanupTimeout: number;
    queueTimeout: number;
    healthCheckInterval: number;
    enableMetrics: boolean;
}
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
export declare class ProcessManager extends EventEmitter {
    private readonly config;
    private readonly activeProcesses;
    private readonly queuedProcesses;
    private readonly metrics;
    private healthCheckTimer?;
    private isShuttingDown;
    private nextProcessId;
    constructor(config?: Partial<ProcessManagerConfig>);
    /**
     * Execute a command with robust process management
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
     */
    executeCommand(executable: string, args: string[], options: ProcessExecutionOptions): Promise<ProcessResult>;
    /**
     * Get current process health status
     * Requirements: 6.5
     */
    getHealthStatus(): ProcessHealthStatus;
    /**
     * Get number of active processes
     * Requirements: 6.1
     */
    getActiveProcessCount(): number;
    /**
     * Get number of queued processes
     * Requirements: 6.3
     */
    getQueuedProcessCount(): number;
    /**
     * Terminate all active processes gracefully
     * Requirements: 6.2, 6.4
     */
    terminateAllProcesses(): Promise<void>;
    /**
     * Set maximum concurrent processes limit
     * Requirements: 6.3
     */
    setProcessLimit(limit: number): void;
    /**
     * Internal process execution with full monitoring
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
     */
    private executeProcessInternal;
    /**
     * Queue a process for later execution
     * Requirements: 6.3, 6.4
     */
    private queueProcess;
    /**
     * Process the queue when slots become available
     * Requirements: 6.3
     */
    private processQueue;
    /**
     * Set up timeout handling for a process
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
     */
    private setupProcessTimeout;
    /**
     * Handle process timeout with graceful and force termination
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
     */
    private handleProcessTimeout;
    /**
     * Set up process monitoring and event handling
     * Requirements: 6.1, 6.2, 6.5
     */
    private setupProcessMonitoring;
    /**
     * Complete a process execution successfully
     * Requirements: 6.1, 6.2, 6.5
     */
    private completeProcess;
    /**
     * Complete a process execution with error
     * Requirements: 6.1, 6.2
     */
    private completeProcessWithError;
    /**
     * Terminate a specific process
     * Requirements: 6.2, 6.4
     */
    private terminateProcess;
    /**
     * Clear the process queue
     * Requirements: 6.3
     */
    private clearProcessQueue;
    /**
     * Update execution metrics
     * Requirements: 6.5
     */
    private updateMetrics;
    /**
     * Check if the process manager is healthy
     * Requirements: 6.5
     */
    private isHealthy;
    /**
     * Start health monitoring
     * Requirements: 6.5
     */
    private startHealthMonitoring;
    /**
     * Set up cleanup handlers for graceful shutdown
     * Requirements: 6.2, 6.4
     *
     * Call this method manually in production environments where you want
     * automatic cleanup on process exit signals.
     */
    setupCleanupHandlers(): void;
}
/**
 * Create a ProcessManager instance with default configuration
 */
export declare function createProcessManager(config?: Partial<ProcessManagerConfig>): ProcessManager;
/**
 * Default ProcessManager instance for shared use
 */
export declare const defaultProcessManager: ProcessManager;
//# sourceMappingURL=process-manager.d.ts.map