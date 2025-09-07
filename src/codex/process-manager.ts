/**
 * Production Process Manager for Codex CLI execution
 * 
 * This module implements robust process management with timeout handling,
 * resource management, concurrent process limiting, and proper cleanup.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { spawn, ChildProcess } from 'child_process';
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
 * Internal process tracking information
 */
interface ProcessInfo {
  process: ChildProcess;
  startTime: number;
  timeout: number;
  timeoutId?: NodeJS.Timeout;
  forceKillTimeoutId?: NodeJS.Timeout;
  resolve: (result: ProcessResult) => void;
  reject: (error: Error) => void;
  options: ProcessExecutionOptions;
}

/**
 * Queued process request
 */
interface QueuedProcess {
  executable: string;
  args: string[];
  options: ProcessExecutionOptions;
  resolve: (result: ProcessResult) => void;
  reject: (error: Error) => void;
  queuedAt: number;
}

/**
 * Process execution metrics
 */
interface ProcessMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalExecutionTime: number;
  executionTimes: number[];
  lastExecutionTime: number | null;
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
export class ProcessManager extends EventEmitter {
  private readonly config: ProcessManagerConfig;
  private readonly activeProcesses = new Map<number, ProcessInfo>();
  private readonly queuedProcesses: QueuedProcess[] = [];
  private readonly metrics: ProcessMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private isShuttingDown = false;
  private nextProcessId = 1;

  constructor(config: Partial<ProcessManagerConfig> = {}) {
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
  async executeCommand(
    executable: string,
    args: string[],
    options: ProcessExecutionOptions
  ): Promise<ProcessResult> {
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
  getHealthStatus(): ProcessHealthStatus {
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
  getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }

  /**
   * Get number of queued processes
   * Requirements: 6.3
   */
  getQueuedProcessCount(): number {
    return this.queuedProcesses.length;
  }

  /**
   * Terminate all active processes gracefully
   * Requirements: 6.2, 6.4
   */
  async terminateAllProcesses(): Promise<void> {
    this.isShuttingDown = true;

    // Stop accepting new processes
    this.clearProcessQueue();

    // Terminate all active processes
    const terminationPromises: Promise<void>[] = [];

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
  setProcessLimit(limit: number): void {
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
  private async executeProcessInternal(
    executable: string,
    args: string[],
    options: ProcessExecutionOptions
  ): Promise<ProcessResult> {
    const processId = this.nextProcessId++;
    const startTime = Date.now();
    const timeout = options.timeout || this.config.defaultTimeout;

    return new Promise<ProcessResult>((resolve, reject) => {
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
        const processInfo: ProcessInfo = {
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

      } catch (error) {
        this.metrics.failedExecutions++;
        reject(error);
      }
    });
  }

  /**
   * Queue a process for later execution
   * Requirements: 6.3, 6.4
   */
  private async queueProcess(
    executable: string,
    args: string[],
    options: ProcessExecutionOptions
  ): Promise<ProcessResult> {
    return new Promise<ProcessResult>((resolve, reject) => {
      const queuedProcess: QueuedProcess = {
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
      queuedProcess.resolve = (result: ProcessResult) => {
        clearTimeout(queueTimeout);
        resolve(result);
      };

      queuedProcess.reject = (error: Error) => {
        clearTimeout(queueTimeout);
        reject(error);
      };
    });
  }

  /**
   * Process the queue when slots become available
   * Requirements: 6.3
   */
  private processQueue(): void {
    while (
      this.queuedProcesses.length > 0 &&
      this.activeProcesses.size < this.config.maxConcurrentProcesses &&
      !this.isShuttingDown
    ) {
      const queuedProcess = this.queuedProcesses.shift();
      if (queuedProcess) {
        this.executeProcessInternal(
          queuedProcess.executable,
          queuedProcess.args,
          queuedProcess.options
        )
          .then(queuedProcess.resolve)
          .catch(queuedProcess.reject);
      }
    }
  }

  /**
   * Set up timeout handling for a process
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  private setupProcessTimeout(processId: number, processInfo: ProcessInfo): void {
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
  private handleProcessTimeout(processId: number, processInfo: ProcessInfo): void {
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
  private setupProcessMonitoring(processId: number, processInfo: ProcessInfo): void {
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
  private completeProcess(processId: number, result: ProcessResult): void {
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
  private completeProcessWithError(processId: number, error: Error): void {
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
  private async terminateProcess(processId: number, processInfo: ProcessInfo): Promise<void> {
    return new Promise<void>((resolve) => {
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
  private clearProcessQueue(): void {
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
  private updateMetrics(result: ProcessResult): void {
    if (!this.config.enableMetrics) {
      return;
    }

    this.metrics.totalExecutions++;
    this.metrics.lastExecutionTime = Date.now();
    this.metrics.totalExecutionTime += result.executionTime;

    if (result.exitCode === 0 && !result.timedOut) {
      this.metrics.successfulExecutions++;
    } else {
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
  private isHealthy(): boolean {
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
  private startHealthMonitoring(): void {
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
  setupCleanupHandlers(): void {
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
export function createProcessManager(config?: Partial<ProcessManagerConfig>): ProcessManager {
  return new ProcessManager(config);
}

/**
 * Default ProcessManager instance for shared use
 */
export const defaultProcessManager = createProcessManager();