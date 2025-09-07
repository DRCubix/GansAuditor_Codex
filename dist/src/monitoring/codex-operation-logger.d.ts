/**
 * Codex Operation Logger for Comprehensive CLI Monitoring
 *
 * This module provides specialized logging for all Codex CLI operations,
 * including command execution, timing, error handling, and debugging capabilities.
 *
 * Requirements addressed:
 * - 7.1: Log all Codex CLI command executions with arguments and timing
 * - 7.2: Add detailed error logging with context information
 * - 7.4: Implement debug logging for troubleshooting
 */
import type { ProcessExecutionOptions, ProcessResult } from '../codex/process-manager.js';
/**
 * Codex operation types for structured logging
 */
export type CodexOperationType = 'command_execution' | 'availability_check' | 'version_check' | 'audit_execution' | 'response_parsing' | 'environment_setup' | 'working_directory_resolution' | 'executable_validation' | 'process_timeout' | 'process_cleanup' | 'error_recovery';
/**
 * Codex operation log entry
 */
export interface CodexOperationLogEntry {
    timestamp: number;
    operationType: CodexOperationType;
    sessionId?: string;
    thoughtNumber?: number;
    executionId: string;
    command?: {
        executable: string;
        arguments: string[];
        workingDirectory: string;
        timeout: number;
        environment?: Record<string, string>;
    };
    timing: {
        startTime: number;
        endTime?: number;
        duration?: number;
        queueTime?: number;
    };
    result?: {
        success: boolean;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
        timedOut?: boolean;
        processId?: number;
    };
    error?: {
        name: string;
        message: string;
        stack?: string;
        category?: string;
        recoverable?: boolean;
    };
    context: {
        activeProcesses?: number;
        queuedProcesses?: number;
        systemMemory?: number;
        retryAttempt?: number;
        maxRetries?: number;
    };
    debug?: {
        environmentVars?: string[];
        pathResolution?: string[];
        processDetails?: Record<string, any>;
        performanceMetrics?: Record<string, number>;
    };
}
/**
 * Codex command execution summary
 */
export interface CodexCommandSummary {
    executionId: string;
    command: string;
    arguments: string[];
    duration: number;
    success: boolean;
    exitCode?: number;
    outputSize: {
        stdout: number;
        stderr: number;
    };
    retries: number;
    timedOut: boolean;
}
/**
 * Codex operation statistics
 */
export interface CodexOperationStatistics {
    totalOperations: number;
    operationsByType: Record<CodexOperationType, number>;
    successRate: number;
    averageDuration: number;
    timeoutRate: number;
    retryRate: number;
    errorsByCategory: Record<string, number>;
    recentFailures: CodexOperationLogEntry[];
    performanceMetrics: {
        fastestOperation: number;
        slowestOperation: number;
        p50Duration: number;
        p95Duration: number;
        p99Duration: number;
    };
}
/**
 * Configuration for Codex operation logging
 */
export interface CodexOperationLoggerConfig {
    enabled: boolean;
    logDirectory: string;
    maxLogFileSize: number;
    maxLogFiles: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableCommandLogging: boolean;
    enableTimingLogging: boolean;
    enableErrorLogging: boolean;
    enableDebugLogging: boolean;
    enablePerformanceLogging: boolean;
    flushInterval: number;
    maxHistorySize: number;
    sensitiveArgsPatterns: string[];
}
/**
 * Default configuration for Codex operation logging
 */
export declare const DEFAULT_CODEX_LOGGER_CONFIG: CodexOperationLoggerConfig;
/**
 * Specialized logger for Codex CLI operations
 */
export declare class CodexOperationLogger {
    private readonly config;
    private readonly componentLogger;
    private operationHistory;
    private logBuffer;
    private flushTimer?;
    private isInitialized;
    private nextExecutionId;
    constructor(config?: Partial<CodexOperationLoggerConfig>);
    /**
     * Start logging a Codex command execution
     * Requirement 7.1: Log all Codex CLI command executions with arguments and timing
     */
    startCommandExecution(executable: string, args: string[], options: ProcessExecutionOptions, sessionId?: string, thoughtNumber?: number): CodexOperationTimer;
    /**
     * Log Codex availability check
     * Requirement 7.1: Log all Codex CLI command executions with arguments and timing
     */
    logAvailabilityCheck(executable: string, success: boolean, duration: number, version?: string, error?: Error): void;
    /**
     * Log audit execution with detailed context
     * Requirement 7.1: Log all Codex CLI command executions with arguments and timing
     */
    logAuditExecution(sessionId: string, thoughtNumber: number, auditRequest: any, duration: number, success: boolean, result?: any, error?: Error): void;
    /**
     * Log process timeout with detailed context
     * Requirement 7.2: Add detailed error logging with context information
     */
    logProcessTimeout(executionId: string, timeout: number, processId?: number, sessionId?: string, thoughtNumber?: number): void;
    /**
     * Log error with comprehensive context
     * Requirement 7.2: Add detailed error logging with context information
     */
    logError(operationType: CodexOperationType, error: Error, context: {
        executionId?: string;
        sessionId?: string;
        thoughtNumber?: number;
        command?: string;
        duration?: number;
        retryAttempt?: number;
        additionalContext?: Record<string, any>;
    }): void;
    /**
     * Log debug information for troubleshooting
     * Requirement 7.4: Implement debug logging for troubleshooting
     */
    logDebugInfo(operationType: CodexOperationType, message: string, debugData: Record<string, any>, context?: {
        executionId?: string;
        sessionId?: string;
        thoughtNumber?: number;
    }): void;
    /**
     * Get operation statistics
     */
    getOperationStatistics(): CodexOperationStatistics;
    /**
     * Get recent command summaries
     */
    getRecentCommandSummaries(limit?: number): CodexCommandSummary[];
    /**
     * Flush log buffer to files
     */
    flush(): Promise<void>;
    /**
     * Stop the logger and flush remaining logs
     */
    stop(): Promise<void>;
    /**
     * Initialize the logger
     */
    private initialize;
    /**
     * Complete command execution logging
     */
    private completeCommandExecution;
    /**
     * Add log entry to buffer and history
     */
    private addLogEntry;
    /**
     * Generate unique execution ID
     */
    private generateExecutionId;
    /**
     * Sanitize command arguments to remove sensitive information
     */
    private sanitizeArguments;
    /**
     * Sanitize environment variables
     */
    private sanitizeEnvironment;
    /**
     * Truncate output for logging
     */
    private truncateOutput;
    /**
     * Categorize error for better organization
     */
    private categorizeError;
    /**
     * Determine if error is recoverable
     */
    private isRecoverableError;
    /**
     * Get active process count (placeholder - should be injected from ProcessManager)
     */
    private getActiveProcessCount;
    /**
     * Get queued process count (placeholder - should be injected from ProcessManager)
     */
    private getQueuedProcessCount;
    /**
     * Get system memory usage
     */
    private getSystemMemoryUsage;
}
/**
 * Timer for tracking Codex operation execution
 */
export declare class CodexOperationTimer {
    private readonly executionId;
    private readonly onComplete;
    private readonly logger;
    private startTime;
    constructor(executionId: string, onComplete: (result: ProcessResult) => void, logger: typeof logger);
    /**
     * Complete the operation with success
     */
    complete(result: ProcessResult): void;
    /**
     * Complete the operation with error
     */
    completeWithError(error: Error): void;
    /**
     * Get execution ID
     */
    getExecutionId(): string;
    /**
     * Get elapsed time
     */
    getElapsedTime(): number;
}
/**
 * Global Codex operation logger instance
 */
export declare const codexOperationLogger: CodexOperationLogger;
/**
 * Convenience functions for Codex operation logging
 */
export declare const logCodexCommand: (executable: string, args: string[], options: ProcessExecutionOptions, sessionId?: string, thoughtNumber?: number) => CodexOperationTimer;
export declare const logCodexAvailability: (executable: string, success: boolean, duration: number, version?: string, error?: Error) => void;
export declare const logCodexAudit: (sessionId: string, thoughtNumber: number, auditRequest: any, duration: number, success: boolean, result?: any, error?: Error) => void;
export declare const logCodexTimeout: (executionId: string, timeout: number, processId?: number, sessionId?: string, thoughtNumber?: number) => void;
export declare const logCodexError: (operationType: CodexOperationType, error: Error, context: Parameters<typeof codexOperationLogger.logError>[2]) => void;
export declare const logCodexDebug: (operationType: CodexOperationType, message: string, debugData: Record<string, any>, context?: Parameters<typeof codexOperationLogger.logDebugInfo>[3]) => void;
//# sourceMappingURL=codex-operation-logger.d.ts.map