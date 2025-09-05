/**
 * Logging utility for GAN Auditor Integration
 *
 * This module provides structured logging capabilities while maintaining
 * compatibility with existing console output formats.
 *
 * Requirements addressed:
 * - 6.4: Add logging for debugging while maintaining existing console output format
 */
import type { ErrorCategory, ErrorSeverity, GanAuditorError } from '../types/error-types.js';
/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/**
 * Logger configuration options
 */
export interface LoggerConfig {
    enabled: boolean;
    level: LogLevel;
    component?: string;
    includeTimestamp: boolean;
    includeComponent: boolean;
    colorOutput: boolean;
    formatJson: boolean;
    maxMessageLength?: number;
}
/**
 * Log entry structure
 */
export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    component: string;
    message: string;
    data?: any;
    error?: {
        name: string;
        message: string;
        stack?: string;
        category?: ErrorCategory;
        severity?: ErrorSeverity;
    };
}
/**
 * Structured logger with configurable output formats
 */
export declare class Logger {
    private config;
    private logHistory;
    private readonly maxHistorySize;
    constructor(config?: Partial<LoggerConfig>);
    /**
     * Update logger configuration
     */
    configure(config: Partial<LoggerConfig>): void;
    /**
     * Check if logging is enabled for a specific level
     */
    isEnabled(level: LogLevel): boolean;
    /**
     * Log a debug message
     */
    debug(message: string, data?: any, component?: string): void;
    /**
     * Log an info message
     */
    info(message: string, data?: any, component?: string): void;
    /**
     * Log a warning message
     */
    warn(message: string, data?: any, component?: string): void;
    /**
     * Log an error message
     */
    error(message: string, error?: Error | GanAuditorError, data?: any, component?: string): void;
    /**
     * Log an error object directly
     */
    logError(error: Error | GanAuditorError, component?: string): void;
    /**
     * Core logging method
     */
    private log;
    /**
     * Serialize error object for logging
     */
    private serializeError;
    /**
     * Sanitize data for logging (remove sensitive information)
     */
    private sanitizeData;
    /**
     * Deep clone object with circular reference handling
     */
    private deepClone;
    /**
     * Mask sensitive fields in data
     */
    private maskSensitiveFields;
    /**
     * Truncate message if it exceeds maximum length
     */
    private truncateMessage;
    /**
     * Add entry to log history
     */
    private addToHistory;
    /**
     * Output log entry to console
     */
    private outputToConsole;
    /**
     * Apply color to text if color output is enabled
     */
    private colorize;
    /**
     * Format data for console output
     */
    private formatData;
    /**
     * Get recent log entries
     */
    getHistory(count?: number): LogEntry[];
    /**
     * Clear log history
     */
    clearHistory(): void;
    /**
     * Get log statistics
     */
    getStats(): {
        totalEntries: number;
        byLevel: Record<LogLevel, number>;
        byComponent: Record<string, number>;
        timeRange: {
            start: number;
            end: number;
        } | null;
    };
}
/**
 * Global logger instance for the GAN auditor system
 */
export declare const logger: Logger;
/**
 * Configure the global logger
 */
export declare function configureLogger(config: Partial<LoggerConfig>): void;
/**
 * Create a component-specific logger
 */
export declare function createComponentLogger(component: string, config?: Partial<LoggerConfig>): Logger;
/**
 * Log debug message using global logger
 */
export declare function logDebug(message: string, data?: any, component?: string): void;
/**
 * Log info message using global logger
 */
export declare function logInfo(message: string, data?: any, component?: string): void;
/**
 * Log warning message using global logger
 */
export declare function logWarn(message: string, data?: any, component?: string): void;
/**
 * Log error message using global logger
 */
export declare function logError(message: string, error?: Error | GanAuditorError, data?: any, component?: string): void;
/**
 * Log error object using global logger
 */
export declare function logErrorObject(error: Error | GanAuditorError, component?: string): void;
/**
 * Performance timer for measuring operation duration
 */
export declare class PerformanceTimer {
    private startTime;
    private component;
    private operation;
    constructor(operation: string, component?: string);
    /**
     * End the timer and log the duration
     */
    end(data?: any): number;
    /**
     * End the timer with an error
     */
    endWithError(error: Error | GanAuditorError, data?: any): number;
}
/**
 * Create a performance timer
 */
export declare function createTimer(operation: string, component?: string): PerformanceTimer;
/**
 * Measure the duration of an async operation
 */
export declare function measureAsync<T>(operation: string, fn: () => Promise<T>, component?: string): Promise<T>;
/**
 * Measure the duration of a sync operation
 */
export declare function measureSync<T>(operation: string, fn: () => T, component?: string): T;
/**
 * Specialized logger for prompt execution tracking
 */
export declare class PromptExecutionLogger {
    private readonly componentLogger;
    private readonly executionHistory;
    private readonly maxHistorySize;
    constructor(component?: string);
    /**
     * Log prompt rendering start
     */
    logPromptRenderingStart(thoughtNumber: number, sessionId?: string, templatePath?: string): PromptExecutionTimer;
    /**
     * Log workflow step execution
     */
    logWorkflowStepStart(stepName: string, thoughtNumber: number, sessionId?: string, stepIndex?: number): PromptExecutionTimer;
    /**
     * Log completion analysis execution
     */
    logCompletionAnalysisStart(thoughtNumber: number, currentLoop: number, sessionId?: string): PromptExecutionTimer;
    /**
     * Log quality progression tracking
     */
    logQualityProgression(sessionId: string, thoughtNumber: number, overallScore: number, previousScore?: number, improvementAreas?: string[]): void;
    /**
     * Log session statistics update
     */
    logSessionStatistics(sessionId: string, statistics: {
        currentLoop: number;
        sessionDuration: number;
        qualityStats: {
            currentScore: number;
            averageScore: number;
            scoreImprovement: number;
        };
        workflowStats: {
            totalSteps: number;
            averageStepDuration: number;
        };
    }): void;
    /**
     * Log prompt context operations
     */
    logPromptContextOperation(operation: 'store' | 'retrieve' | 'validate', sessionId: string, success: boolean, contextSize?: number, error?: Error): void;
    /**
     * Get execution history for analysis
     */
    getExecutionHistory(limit?: number): PromptExecutionEntry[];
    /**
     * Get execution statistics
     */
    getExecutionStatistics(): PromptExecutionStatistics;
    /**
     * Clear execution history
     */
    clearHistory(): void;
    private generateExecutionId;
    private addExecutionEntry;
}
/**
 * Timer for tracking prompt execution operations
 */
export declare class PromptExecutionTimer {
    private readonly executionId;
    private readonly operationType;
    private readonly startTime;
    private readonly logger;
    private readonly onComplete;
    private readonly metadata;
    constructor(executionId: string, operationType: string, startTime: number, logger: Logger, onComplete: (entry: PromptExecutionEntry) => void, metadata?: Record<string, any>);
    /**
     * End the timer with success
     */
    end(result?: any): number;
    /**
     * End the timer with error
     */
    endWithError(error: Error, partialResult?: any): number;
    /**
     * Add metadata to the timer
     */
    addMetadata(key: string, value: any): void;
}
/**
 * Prompt execution entry for history tracking
 */
export interface PromptExecutionEntry {
    executionId: string;
    operationType: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    success: boolean;
    result?: any;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    metadata: Record<string, any>;
}
/**
 * Statistics for prompt execution operations
 */
export interface PromptExecutionStatistics {
    totalExecutions: number;
    timeRange: {
        start: number;
        end: number;
    } | null;
    operationTypes: Record<string, OperationTypeStats>;
    recentFailures: PromptExecutionEntry[];
}
/**
 * Statistics for a specific operation type
 */
export interface OperationTypeStats {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
}
/**
 * Global prompt execution logger instance
 */
export declare const promptLogger: PromptExecutionLogger;
/**
 * Create a component-specific prompt logger
 */
export declare function createPromptLogger(component: string): PromptExecutionLogger;
/**
 * Log prompt rendering operation
 */
export declare function logPromptRendering<T>(operation: () => Promise<T>, thoughtNumber: number, sessionId?: string, templatePath?: string): Promise<T>;
/**
 * Log workflow step execution
 */
export declare function logWorkflowStep<T>(operation: () => Promise<T>, stepName: string, thoughtNumber: number, sessionId?: string, stepIndex?: number): Promise<T>;
/**
 * Log completion analysis operation
 */
export declare function logCompletionAnalysis<T>(operation: () => Promise<T>, thoughtNumber: number, currentLoop: number, sessionId?: string): Promise<T>;
//# sourceMappingURL=logger.d.ts.map