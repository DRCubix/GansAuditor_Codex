/**
 * Error handling types and utilities for GansAuditor_Codex
 *
 * This module defines comprehensive error categorization, structured error responses,
 * and graceful degradation strategies for the GansAuditor_Codex system.
 *
 * Requirements addressed:
 * - 6.4: Graceful degradation for non-critical failures
 * - 7.5: Structured error responses with actionable suggestions
 */
/**
 * Error categories for structured error handling
 */
export type ErrorCategory = "config" | "codex" | "filesystem" | "session";
/**
 * Error severity levels
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";
/**
 * Recovery strategies for different error types
 */
export type RecoveryStrategy = "retry" | "fallback" | "skip" | "abort" | "user_intervention";
/**
 * Detailed error information with actionable suggestions
 */
export interface ErrorDetails {
    category: ErrorCategory;
    severity: ErrorSeverity;
    recoverable: boolean;
    recovery_strategy: RecoveryStrategy;
    suggestions: string[];
    context?: Record<string, any>;
    timestamp: number;
    component: string;
}
/**
 * Structured error response format
 */
export interface StructuredErrorResponse {
    error: string;
    status: "failed";
    details: ErrorDetails;
    fallback_data?: any;
}
/**
 * Base class for all GansAuditor_Codex errors
 */
export declare abstract class GanAuditorError extends Error {
    readonly category: ErrorCategory;
    readonly severity: ErrorSeverity;
    readonly recoverable: boolean;
    readonly recovery_strategy: RecoveryStrategy;
    readonly suggestions: string[];
    readonly context: Record<string, any>;
    readonly timestamp: number;
    readonly component: string;
    constructor(message: string, category: ErrorCategory, severity?: ErrorSeverity, recoverable?: boolean, recovery_strategy?: RecoveryStrategy, suggestions?: string[], context?: Record<string, any>, component?: string);
    /**
     * Convert error to structured response format
     */
    toStructuredResponse(fallback_data?: any): StructuredErrorResponse;
}
/**
 * Configuration parsing and validation errors
 */
export declare class ConfigurationError extends GanAuditorError {
    constructor(message: string, suggestions?: string[], context?: Record<string, any>, component?: string);
}
/**
 * Invalid configuration value error
 */
export declare class InvalidConfigValueError extends ConfigurationError {
    constructor(field: string, value: any, validRange?: string);
}
/**
 * Missing required configuration error
 */
export declare class MissingConfigError extends ConfigurationError {
    constructor(field: string, scope?: string);
}
/**
 * Codex CLI availability and execution errors
 */
export declare class CodexError extends GanAuditorError {
    constructor(message: string, severity?: ErrorSeverity, recovery_strategy?: RecoveryStrategy, suggestions?: string[], context?: Record<string, any>, component?: string);
}
/**
 * Codex CLI not available error
 */
export declare class CodexNotAvailableError extends CodexError {
    constructor(executable?: string);
}
/**
 * Codex CLI execution timeout error
 */
export declare class CodexTimeoutError extends CodexError {
    constructor(timeout: number, command?: string);
}
/**
 * Codex CLI response parsing error
 */
export declare class CodexResponseError extends CodexError {
    constructor(message: string, rawResponse?: string);
}
/**
 * File system operation errors
 */
export declare class FileSystemError extends GanAuditorError {
    constructor(message: string, severity?: ErrorSeverity, recovery_strategy?: RecoveryStrategy, suggestions?: string[], context?: Record<string, any>, component?: string);
}
/**
 * File not found error
 */
export declare class FileNotFoundError extends FileSystemError {
    constructor(path: string);
}
/**
 * File access permission error
 */
export declare class FileAccessError extends FileSystemError {
    constructor(path: string, operation: string);
}
/**
 * Directory creation error
 */
export declare class DirectoryCreationError extends FileSystemError {
    constructor(path: string, reason?: string);
}
/**
 * Session management and persistence errors
 */
export declare class SessionError extends GanAuditorError {
    constructor(message: string, severity?: ErrorSeverity, recovery_strategy?: RecoveryStrategy, suggestions?: string[], context?: Record<string, any>, component?: string);
}
/**
 * Session not found error
 */
export declare class SessionNotFoundError extends SessionError {
    constructor(sessionId: string);
}
/**
 * Session persistence error
 */
export declare class SessionPersistenceError extends SessionError {
    constructor(sessionId: string, operation: string, reason?: string);
}
/**
 * Audit service unavailable error (Requirement 7.1)
 */
export declare class AuditServiceUnavailableError extends CodexError {
    constructor(service?: string, details?: string);
}
/**
 * Invalid code format error (Requirement 7.2)
 */
export declare class InvalidCodeFormatError extends GanAuditorError {
    constructor(format: string, expectedFormats?: string[], codeSnippet?: string);
}
/**
 * Session corruption error with recovery options (Requirement 7.3)
 */
export declare class SessionCorruptionError extends SessionError {
    constructor(sessionId: string, corruptionType: string, recoveryOptions?: string[]);
    /**
     * Get available recovery options for this corruption
     */
    getRecoveryOptions(): string[];
    /**
     * Check if automatic recovery is possible
     */
    canAutoRecover(): boolean;
}
/**
 * Audit timeout error with partial results (Requirement 7.4)
 */
export declare class AuditTimeoutError extends CodexError {
    constructor(timeoutMs: number, partialResults?: any, completionPercentage?: number, operation?: string);
    /**
     * Get partial results if available
     */
    getPartialResults(): any;
    /**
     * Get completion percentage
     */
    getCompletionPercentage(): number;
    /**
     * Check if partial results are available
     */
    hasPartialResults(): boolean;
}
/**
 * Error classification utility
 */
export declare class ErrorClassifier {
    /**
     * Classify an unknown error into appropriate category
     */
    static classify(error: unknown): GanAuditorError;
    private static isConfigError;
    private static isCodexError;
    private static isFileSystemError;
    private static isSessionError;
    private static isPromptError;
    private static isWorkflowError;
    private static isAnalysisError;
}
/**
 * Error recovery utility
 */
export declare class ErrorRecovery {
    /**
     * Determine if an error is recoverable
     */
    static isRecoverable(error: GanAuditorError): boolean;
    /**
     * Get recovery suggestions for an error
     */
    static getRecoverySuggestions(error: GanAuditorError): string[];
    /**
     * Create fallback data for an error
     */
    static createFallbackData(error: GanAuditorError): any;
}
/**
 * Error aggregation for batch operations
 */
export declare class ErrorAggregator {
    private errors;
    private warnings;
    /**
     * Add an error to the aggregator
     */
    addError(error: unknown): void;
    /**
     * Add a warning message
     */
    addWarning(message: string): void;
    /**
     * Check if there are any critical errors
     */
    hasCriticalErrors(): boolean;
    /**
     * Check if there are any errors
     */
    hasErrors(): boolean;
    /**
     * Get all errors
     */
    getErrors(): GanAuditorError[];
    /**
     * Get all warnings
     */
    getWarnings(): string[];
    /**
     * Get summary of all issues
     */
    getSummary(): {
        errorCount: number;
        warningCount: number;
        criticalCount: number;
        recoverableCount: number;
    };
    /**
     * Clear all errors and warnings
     */
    clear(): void;
}
/**
 * Error thrown when system prompt rendering fails
 */
export declare class PromptRenderingError extends GanAuditorError {
    constructor(message: string, templatePath?: string, variables?: Record<string, any>);
}
/**
 * Error thrown when workflow step execution fails
 */
export declare class WorkflowStepError extends GanAuditorError {
    constructor(message: string, stepName: string, stepIndex?: number, canSkip?: boolean);
}
/**
 * Error thrown when completion analysis fails
 */
export declare class CompletionAnalysisError extends GanAuditorError {
    constructor(message: string, currentLoop?: number, scoreHistory?: number[]);
}
/**
 * Error thrown when prompt context operations fail
 */
export declare class PromptContextError extends GanAuditorError {
    constructor(message: string, operation: 'store' | 'retrieve' | 'validate', sessionId?: string);
}
/**
 * Error thrown when quality progression tracking fails
 */
export declare class QualityProgressionError extends GanAuditorError {
    constructor(message: string, sessionId?: string, thoughtNumber?: number);
}
/**
 * Error category for workflow-related errors
 */
export type WorkflowErrorCategory = 'workflow';
/**
 * Error category for analysis-related errors
 */
export type AnalysisErrorCategory = 'analysis';
declare module './error-types.js' {
    interface ErrorCategoryMap {
        workflow: WorkflowErrorCategory;
        analysis: AnalysisErrorCategory;
    }
}
//# sourceMappingURL=error-types.d.ts.map