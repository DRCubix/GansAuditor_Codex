/**
 * Prompt Execution Timeout Manager
 *
 * Manages timeout and resource constraints for system prompt execution,
 * integrating with existing SynchronousAuditEngine timeout handling.
 *
 * Requirements: 10.1 - Timeout and resource management for prompt execution
 */
import { EventEmitter } from 'events';
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
export declare enum PromptExecutionStage {
    INITIALIZING = "initializing",
    TEMPLATE_RENDERING = "template_rendering",
    CONTEXT_BUILDING = "context_building",
    WORKFLOW_EXECUTION = "workflow_execution",
    QUALITY_ASSESSMENT = "quality_assessment",
    FEEDBACK_GENERATION = "feedback_generation",
    RESPONSE_FORMATTING = "response_formatting",
    COMPLETED = "completed",
    TIMED_OUT = "timed_out",
    FAILED = "failed"
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
export declare const DEFAULT_PROMPT_TIMEOUT_CONFIG: PromptTimeoutConfig;
/**
 * Prompt Timeout Manager Implementation
 *
 * Manages execution timeouts and resource constraints for system prompt execution,
 * providing graceful timeout handling with partial results.
 */
export declare class PromptTimeoutManager extends EventEmitter {
    private readonly config;
    private readonly componentLogger;
    private readonly activeExecutions;
    private monitoringTimer?;
    private executionCounter;
    constructor(config?: Partial<PromptTimeoutConfig>);
    /**
     * Execute function with timeout and resource monitoring
     */
    executeWithTimeout<T>(executionFn: (context: PromptExecutionContext) => Promise<T>, options?: {
        promptTemplate?: string;
        sessionId?: string;
        timeout?: number;
        stage?: PromptExecutionStage;
    }): Promise<{
        result: T;
        timeoutResult: TimeoutResult;
    }>;
    /**
     * Update execution stage and progress
     */
    updateExecutionStage(executionId: string, stage: PromptExecutionStage, completionPercentage?: number, partialResults?: any): void;
    /**
     * Update resource usage for execution
     */
    updateResourceUsage(executionId: string, usage: Partial<ResourceUsage>): void;
    /**
     * Get current execution context
     */
    getExecutionContext(executionId: string): PromptExecutionContext | undefined;
    /**
     * Get all active executions
     */
    getActiveExecutions(): PromptExecutionContext[];
    /**
     * Cancel execution
     */
    cancelExecution(executionId: string, reason?: string): boolean;
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
    };
    /**
     * Destroy timeout manager and cleanup resources
     */
    destroy(): void;
    /**
     * Generate unique execution ID
     */
    private generateExecutionId;
    /**
     * Create initial resource usage tracking
     */
    private createInitialResourceUsage;
    /**
     * Start resource monitoring
     */
    private startResourceMonitoring;
    /**
     * Monitor active executions for resource usage
     */
    private monitorActiveExecutions;
    /**
     * Update resource usage for execution context
     */
    private updateExecutionResourceUsage;
    /**
     * Check resource limits for execution
     */
    private checkResourceLimits;
    /**
     * Check for stalled executions
     */
    private checkForStalledExecution;
}
/**
 * Create prompt timeout manager with default configuration
 */
export declare function createPromptTimeoutManager(config?: Partial<PromptTimeoutConfig>): PromptTimeoutManager;
//# sourceMappingURL=prompt-timeout-manager.d.ts.map