/**
 * Prompt Execution Timeout Manager
 *
 * Manages timeout and resource constraints for system prompt execution,
 * integrating with existing SynchronousAuditEngine timeout handling.
 *
 * Requirements: 10.1 - Timeout and resource management for prompt execution
 */
import { EventEmitter } from 'events';
import { createComponentLogger, createTimer } from '../utils/logger.js';
import { withTimeout } from '../utils/error-handler.js';
/**
 * Prompt execution stages
 */
export var PromptExecutionStage;
(function (PromptExecutionStage) {
    PromptExecutionStage["INITIALIZING"] = "initializing";
    PromptExecutionStage["TEMPLATE_RENDERING"] = "template_rendering";
    PromptExecutionStage["CONTEXT_BUILDING"] = "context_building";
    PromptExecutionStage["WORKFLOW_EXECUTION"] = "workflow_execution";
    PromptExecutionStage["QUALITY_ASSESSMENT"] = "quality_assessment";
    PromptExecutionStage["FEEDBACK_GENERATION"] = "feedback_generation";
    PromptExecutionStage["RESPONSE_FORMATTING"] = "response_formatting";
    PromptExecutionStage["COMPLETED"] = "completed";
    PromptExecutionStage["TIMED_OUT"] = "timed_out";
    PromptExecutionStage["FAILED"] = "failed";
})(PromptExecutionStage || (PromptExecutionStage = {}));
/**
 * Default timeout configuration
 */
export const DEFAULT_PROMPT_TIMEOUT_CONFIG = {
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
    config;
    componentLogger;
    activeExecutions = new Map();
    monitoringTimer;
    executionCounter = 0;
    constructor(config = {}) {
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
    async executeWithTimeout(executionFn, options = {}) {
        const executionId = this.generateExecutionId();
        const timeout = options.timeout || this.config.defaultTimeout;
        const timer = createTimer(`prompt-execution-${executionId}`, 'prompt-timeout-manager');
        const context = {
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
            const result = await withTimeout(async () => {
                try {
                    return await executionFn(context);
                }
                catch (error) {
                    // Update context on error
                    context.stage = PromptExecutionStage.FAILED;
                    throw error;
                }
            }, timeout, `Prompt execution timed out after ${timeout}ms`);
            // Successful completion
            context.stage = PromptExecutionStage.COMPLETED;
            context.completionPercentage = 100;
            const duration = Date.now() - context.startTime;
            timer.end({ stage: context.stage, duration });
            const timeoutResult = {
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
        }
        catch (error) {
            const duration = Date.now() - context.startTime;
            const isTimeout = error.message.includes('timed out');
            context.stage = isTimeout ? PromptExecutionStage.TIMED_OUT : PromptExecutionStage.FAILED;
            timer.endWithError(error);
            const timeoutResult = {
                success: false,
                timedOut: isTimeout,
                duration,
                finalStage: context.stage,
                resourceUsage: context.resourceUsage,
                partialResults: context.partialResults,
                completionPercentage: context.completionPercentage,
                error: error.message,
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
            }
            else {
                this.componentLogger.error('Prompt execution failed', error, {
                    executionId,
                    duration,
                    stage: context.stage,
                });
            }
            // For timeout with graceful handling, return partial results if available
            if (isTimeout && this.config.enableGracefulTimeout && context.partialResults) {
                return { result: context.partialResults, timeoutResult };
            }
            throw error;
        }
        finally {
            this.activeExecutions.delete(executionId);
        }
    }
    /**
     * Update execution stage and progress
     */
    updateExecutionStage(executionId, stage, completionPercentage, partialResults) {
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
    updateResourceUsage(executionId, usage) {
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
    getExecutionContext(executionId) {
        return this.activeExecutions.get(executionId);
    }
    /**
     * Get all active executions
     */
    getActiveExecutions() {
        return Array.from(this.activeExecutions.values());
    }
    /**
     * Cancel execution
     */
    cancelExecution(executionId, reason = 'Cancelled by user') {
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
    getStats() {
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
    destroy() {
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
    generateExecutionId() {
        return `prompt-exec-${++this.executionCounter}-${Date.now()}`;
    }
    /**
     * Create initial resource usage tracking
     */
    createInitialResourceUsage() {
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
    startResourceMonitoring() {
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
    monitorActiveExecutions() {
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
    updateExecutionResourceUsage(context) {
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
    checkResourceLimits(context) {
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
    checkForStalledExecution(context) {
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
export function createPromptTimeoutManager(config = {}) {
    return new PromptTimeoutManager(config);
}
//# sourceMappingURL=prompt-timeout-manager.js.map