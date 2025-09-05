/**
 * Prompt Execution Timeout Manager
 * 
 * Manages timeout and resource constraints for system prompt execution,
 * integrating with existing SynchronousAuditEngine timeout handling.
 * 
 * Requirements: 10.1 - Timeout and resource management for prompt execution
 */

import { EventEmitter } from 'events';
import { logger, createComponentLogger, createTimer } from '../utils/logger.js';
import { withTimeout } from '../utils/error-handler.js';

/**
 * Prompt execution context
 */
export interface PromptExecutionContext {
  /** Unique execution identifier */
  executionId: string;
  /** Prompt template being executed */
  promptTemplate: string;
  /** Session ID for context */
  sessionId?: string;
  /** Start timestamp */
  startTime: number;
  /** Timeout in milliseconds */
  timeout: number;
  /** Current execution stage */
  stage: PromptExecutionStage;
  /** Resource usage tracking */
  resourceUsage: ResourceUsage;
  /** Partial results if timeout occurs */
  partialResults?: any;
  /** Completion percentage */
  completionPercentage: number;
}

/**
 * Prompt execution stages
 */
export enum PromptExecutionStage {
  INITIALIZING = 'initializing',
  TEMPLATE_RENDERING = 'template_rendering',
  CONTEXT_BUILDING = 'context_building',
  WORKFLOW_EXECUTION = 'workflow_execution',
  QUALITY_ASSESSMENT = 'quality_assessment',
  FEEDBACK_GENERATION = 'feedback_generation',
  RESPONSE_FORMATTING = 'response_formatting',
  COMPLETED = 'completed',
  TIMED_OUT = 'timed_out',
  FAILED = 'failed',
}

/**
 * Resource usage tracking
 */
export interface ResourceUsage {
  /** Memory usage in bytes */
  memoryUsage: number;
  /** CPU time in milliseconds */
  cpuTime: number;
  /** Number of file operations */
  fileOperations: number;
  /** Context size in characters */
  contextSize: number;
  /** Number of external calls */
  externalCalls: number;
}

/**
 * Timeout configuration
 */
export interface PromptTimeoutConfig {
  /** Default timeout for prompt execution in milliseconds */
  defaultTimeout: number;
  /** Timeout for template rendering in milliseconds */
  templateTimeout: number;
  /** Timeout for context building in milliseconds */
  contextTimeout: number;
  /** Timeout for workflow execution in milliseconds */
  workflowTimeout: number;
  /** Maximum memory usage in bytes */
  maxMemoryUsage: number;
  /** Maximum context size in characters */
  maxContextSize: number;
  /** Resource monitoring interval in milliseconds */
  monitoringInterval: number;
  /** Whether to enable graceful timeout handling */
  enableGracefulTimeout: boolean;
}

/**
 * Timeout result
 */
export interface TimeoutResult {
  /** Whether execution completed successfully */
  success: boolean;
  /** Whether execution timed out */
  timedOut: boolean;
  /** Execution duration in milliseconds */
  duration: number;
  /** Final stage reached */
  finalStage: PromptExecutionStage;
  /** Resource usage at completion/timeout */
  resourceUsage: ResourceUsage;
  /** Partial results if available */
  partialResults?: any;
  /** Completion percentage */
  completionPercentage: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Default timeout configuration
 */
export const DEFAULT_PROMPT_TIMEOUT_CONFIG: PromptTimeoutConfig = {
  defaultTimeout: 30000, // 30 seconds - matches SynchronousAuditEngine
  templateTimeout: 5000, // 5 seconds
  contextTimeout: 10000, // 10 seconds
  workflowTimeout: 20000, // 20 seconds
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  maxContextSize: 100000, // 100K characters
  monitoringInterval: 1000, // 1 second
  enableGracefulTimeout: true,
};

/**
 * Prompt Timeout Manager Implementation
 * 
 * Manages execution timeouts and resource constraints for system prompt execution,
 * providing graceful timeout handling with partial results.
 */
export class PromptTimeoutManager extends EventEmitter {
  private readonly config: PromptTimeoutConfig;
  private readonly componentLogger: typeof logger;
  private readonly activeExecutions = new Map<string, PromptExecutionContext>();
  private monitoringTimer?: NodeJS.Timeout;
  private executionCounter = 0;

  constructor(config: Partial<PromptTimeoutConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PROMPT_TIMEOUT_CONFIG, ...config };
    this.componentLogger = createComponentLogger('prompt-timeout-manager');
    
    this.startResourceMonitoring();
    
    this.componentLogger.info('Prompt timeout manager initialized', {
      defaultTimeout: this.config.defaultTimeout,
      maxMemoryUsage: this.config.maxMemoryUsage,
      maxContextSize: this.config.maxContextSize,
    });
  }

  /**
   * Execute function with timeout and resource monitoring
   */
  async executeWithTimeout<T>(
    executionFn: (context: PromptExecutionContext) => Promise<T>,
    options: {
      promptTemplate?: string;
      sessionId?: string;
      timeout?: number;
      stage?: PromptExecutionStage;
    } = {}
  ): Promise<{ result: T; timeoutResult: TimeoutResult }> {
    const executionId = this.generateExecutionId();
    const timeout = options.timeout || this.config.defaultTimeout;
    const timer = createTimer(`prompt-execution-${executionId}`, 'prompt-timeout-manager');
    
    const context: PromptExecutionContext = {
      executionId,
      promptTemplate: options.promptTemplate || 'unknown',
      sessionId: options.sessionId,
      startTime: Date.now(),
      timeout,
      stage: options.stage || PromptExecutionStage.INITIALIZING,
      resourceUsage: this.createInitialResourceUsage(),
      completionPercentage: 0,
    };

    this.activeExecutions.set(executionId, context);

    try {
      this.componentLogger.debug('Starting prompt execution with timeout', {
        executionId,
        timeout,
        stage: context.stage,
      });

      // Execute with timeout using existing utility
      const result = await withTimeout(
        async () => {
          try {
            return await executionFn(context);
          } catch (error) {
            // Update context on error
            context.stage = PromptExecutionStage.FAILED;
            throw error;
          }
        },
        timeout,
        `Prompt execution timed out after ${timeout}ms`
      );

      // Successful completion
      context.stage = PromptExecutionStage.COMPLETED;
      context.completionPercentage = 100;
      
      const duration = Date.now() - context.startTime;
      timer.end({ stage: context.stage, duration });

      const timeoutResult: TimeoutResult = {
        success: true,
        timedOut: false,
        duration,
        finalStage: context.stage,
        resourceUsage: context.resourceUsage,
        completionPercentage: context.completionPercentage,
      };

      this.componentLogger.info('Prompt execution completed successfully', {
        executionId,
        duration,
        stage: context.stage,
        memoryUsage: context.resourceUsage.memoryUsage,
      });

      return { result, timeoutResult };

    } catch (error) {
      const duration = Date.now() - context.startTime;
      const isTimeout = (error as Error).message.includes('timed out');
      
      context.stage = isTimeout ? PromptExecutionStage.TIMED_OUT : PromptExecutionStage.FAILED;
      
      timer.endWithError(error as Error);

      const timeoutResult: TimeoutResult = {
        success: false,
        timedOut: isTimeout,
        duration,
        finalStage: context.stage,
        resourceUsage: context.resourceUsage,
        partialResults: context.partialResults,
        completionPercentage: context.completionPercentage,
        error: (error as Error).message,
      };

      if (isTimeout) {
        this.componentLogger.warn('Prompt execution timed out', {
          executionId,
          duration,
          timeout,
          completionPercentage: context.completionPercentage,
          partialResults: !!context.partialResults,
        });

        // Emit timeout event for handling
        this.emit('executionTimeout', context, timeoutResult);
      } else {
        this.componentLogger.error('Prompt execution failed', error as Error, {
          executionId,
          duration,
          stage: context.stage,
        });
      }

      // For timeout with graceful handling, return partial results if available
      if (isTimeout && this.config.enableGracefulTimeout && context.partialResults) {
        return { result: context.partialResults as T, timeoutResult };
      }

      throw error;

    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Update execution stage and progress
   */
  updateExecutionStage(
    executionId: string, 
    stage: PromptExecutionStage, 
    completionPercentage?: number,
    partialResults?: any
  ): void {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      return;
    }

    context.stage = stage;
    
    if (completionPercentage !== undefined) {
      context.completionPercentage = Math.min(100, Math.max(0, completionPercentage));
    }

    if (partialResults !== undefined) {
      context.partialResults = partialResults;
    }

    this.componentLogger.debug('Execution stage updated', {
      executionId,
      stage,
      completionPercentage: context.completionPercentage,
      hasPartialResults: !!context.partialResults,
    });

    this.emit('stageUpdate', context);
  }

  /**
   * Update resource usage for execution
   */
  updateResourceUsage(executionId: string, usage: Partial<ResourceUsage>): void {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      return;
    }

    Object.assign(context.resourceUsage, usage);

    // Check resource limits
    this.checkResourceLimits(context);
  }

  /**
   * Get current execution context
   */
  getExecutionContext(executionId: string): PromptExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): PromptExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId: string, reason: string = 'Cancelled by user'): boolean {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      return false;
    }

    context.stage = PromptExecutionStage.FAILED;
    this.activeExecutions.delete(executionId);

    this.componentLogger.info('Execution cancelled', {
      executionId,
      reason,
      duration: Date.now() - context.startTime,
    });

    this.emit('executionCancelled', context, reason);
    return true;
  }

  /**
   * Get timeout statistics
   */
  getStats(): {
    activeExecutions: number;
    averageExecutionTime: number;
    timeoutRate: number;
    resourceUtilization: {
      memoryUsage: number;
      contextSize: number;
    };
  } {
    const activeCount = this.activeExecutions.size;
    
    // Calculate average resource usage from active executions
    const totalMemory = Array.from(this.activeExecutions.values())
      .reduce((sum, ctx) => sum + ctx.resourceUsage.memoryUsage, 0);
    const totalContext = Array.from(this.activeExecutions.values())
      .reduce((sum, ctx) => sum + ctx.resourceUsage.contextSize, 0);

    return {
      activeExecutions: activeCount,
      averageExecutionTime: 0, // Would need separate tracking
      timeoutRate: 0, // Would need separate tracking
      resourceUtilization: {
        memoryUsage: activeCount > 0 ? totalMemory / activeCount : 0,
        contextSize: activeCount > 0 ? totalContext / activeCount : 0,
      },
    };
  }

  /**
   * Destroy timeout manager and cleanup resources
   */
  destroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    // Cancel all active executions
    for (const [executionId, context] of this.activeExecutions.entries()) {
      this.cancelExecution(executionId, 'Timeout manager destroyed');
    }

    this.removeAllListeners();
    this.componentLogger.info('Prompt timeout manager destroyed');
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `prompt-exec-${++this.executionCounter}-${Date.now()}`;
  }

  /**
   * Create initial resource usage tracking
   */
  private createInitialResourceUsage(): ResourceUsage {
    return {
      memoryUsage: 0,
      cpuTime: 0,
      fileOperations: 0,
      contextSize: 0,
      externalCalls: 0,
    };
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    if (this.config.monitoringInterval <= 0) {
      return;
    }

    this.monitoringTimer = setInterval(() => {
      this.monitorActiveExecutions();
    }, this.config.monitoringInterval);
  }

  /**
   * Monitor active executions for resource usage
   */
  private monitorActiveExecutions(): void {
    for (const context of this.activeExecutions.values()) {
      // Update resource usage
      this.updateExecutionResourceUsage(context);
      
      // Check resource limits
      this.checkResourceLimits(context);
      
      // Check for stalled executions
      this.checkForStalledExecution(context);
    }
  }

  /**
   * Update resource usage for execution context
   */
  private updateExecutionResourceUsage(context: PromptExecutionContext): void {
    // Update memory usage (rough estimate)
    const memoryUsage = process.memoryUsage();
    context.resourceUsage.memoryUsage = memoryUsage.heapUsed;
    
    // Update CPU time
    const cpuUsage = process.cpuUsage();
    context.resourceUsage.cpuTime = (cpuUsage.user + cpuUsage.system) / 1000; // Convert to ms
  }

  /**
   * Check resource limits for execution
   */
  private checkResourceLimits(context: PromptExecutionContext): void {
    // Check memory limit
    if (context.resourceUsage.memoryUsage > this.config.maxMemoryUsage) {
      this.componentLogger.warn('Memory limit exceeded', {
        executionId: context.executionId,
        memoryUsage: context.resourceUsage.memoryUsage,
        maxMemoryUsage: this.config.maxMemoryUsage,
      });

      this.emit('resourceLimitExceeded', context, 'memory');
    }

    // Check context size limit
    if (context.resourceUsage.contextSize > this.config.maxContextSize) {
      this.componentLogger.warn('Context size limit exceeded', {
        executionId: context.executionId,
        contextSize: context.resourceUsage.contextSize,
        maxContextSize: this.config.maxContextSize,
      });

      this.emit('resourceLimitExceeded', context, 'context');
    }
  }

  /**
   * Check for stalled executions
   */
  private checkForStalledExecution(context: PromptExecutionContext): void {
    const elapsedTime = Date.now() - context.startTime;
    const timeoutThreshold = context.timeout * 0.9; // 90% of timeout

    if (elapsedTime > timeoutThreshold && context.completionPercentage < 50) {
      this.componentLogger.warn('Execution appears stalled', {
        executionId: context.executionId,
        elapsedTime,
        completionPercentage: context.completionPercentage,
        stage: context.stage,
      });

      this.emit('executionStalled', context);
    }
  }
}

/**
 * Create prompt timeout manager with default configuration
 */
export function createPromptTimeoutManager(
  config: Partial<PromptTimeoutConfig> = {}
): PromptTimeoutManager {
  return new PromptTimeoutManager(config);
}