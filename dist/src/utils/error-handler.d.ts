/**
 * Error handling utilities for GAN Auditor Integration
 *
 * This module provides comprehensive error handling strategies including
 * graceful degradation, retry logic, and fallback mechanisms.
 *
 * Requirements addressed:
 * - 6.4: Graceful degradation for non-critical failures
 * - 7.5: Structured error responses with actionable suggestions
 */
import type { GanAuditorError, ErrorCategory, StructuredErrorResponse } from '../types/error-types.js';
import { type ExecutionContext, type CodexDiagnostic } from './error-diagnostic-system.js';
import { type InstallationGuidance, type VersionInfo } from './installation-guidance.js';
import { type LogLevel } from './logger.js';
import type { SessionConfig } from '../types/gan-types.js';
/**
 * Configuration for error handling behavior
 */
export interface ErrorHandlerConfig {
    enableRetry: boolean;
    maxRetries: number;
    retryDelay: number;
    enableFallback: boolean;
    enableGracefulDegradation: boolean;
    logErrors: boolean;
    logLevel: LogLevel;
    component: string;
}
/**
 * Retry configuration for specific operations
 */
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: ErrorCategory[];
}
/**
 * Comprehensive error handler with graceful degradation
 */
export declare class ErrorHandler {
    private config;
    private retryConfig;
    constructor(config?: Partial<ErrorHandlerConfig>, retryConfig?: Partial<RetryConfig>);
    /**
     * Handle an error with appropriate strategy
     */
    handleError<T>(error: unknown, context: string, fallbackValue?: T): Promise<{
        success: boolean;
        result?: T;
        error?: GanAuditorError;
    }>;
    /**
     * Execute an operation with retry logic
     */
    withRetry<T>(operation: () => Promise<T>, context: string, customRetryConfig?: Partial<RetryConfig>): Promise<T>;
    /**
     * Execute operation with graceful degradation
     */
    withGracefulDegradation<T>(operation: () => Promise<T>, fallbackOperation: () => Promise<T>, context: string): Promise<{
        result: T;
        degraded: boolean;
        error?: GanAuditorError;
    }>;
    /**
     * Create a structured error response
     */
    createErrorResponse(error: unknown, context: string, fallbackData?: any): StructuredErrorResponse;
    /**
     * Create comprehensive diagnostic response for Codex errors
     */
    createDiagnosticResponse(error: unknown, executionContext: ExecutionContext): Promise<{
        diagnostic: CodexDiagnostic;
        structuredResponse: StructuredErrorResponse;
    }>;
    /**
     * Aggregate multiple errors into a summary
     */
    aggregateErrors(errors: unknown[]): {
        summary: string;
        details: StructuredErrorResponse[];
        criticalCount: number;
        recoverableCount: number;
    };
    /**
     * Determine the appropriate handling strategy for an error
     */
    private determineStrategy;
    /**
     * Check if a recovery strategy is enabled
     */
    private isStrategyEnabled;
    /**
     * Execute the determined recovery strategy
     */
    private executeStrategy;
    /**
     * Create appropriate fallback value based on error category
     */
    private createFallbackValue;
    /**
     * Create fallback configuration
     */
    private createFallbackConfig;
    /**
     * Create fallback session data
     */
    private createFallbackSession;
    /**
     * Check if an error is retryable
     */
    private isRetryable;
    /**
     * Create error summary from multiple errors
     */
    private createErrorSummary;
    /**
     * Utility method for delays
     */
    private delay;
}
/**
 * Global error handler instance
 */
export declare const errorHandler: ErrorHandler;
/**
 * Configure the global error handler
 */
export declare function configureErrorHandler(config: Partial<ErrorHandlerConfig>, retryConfig?: Partial<RetryConfig>): void;
/**
 * Handle an error with the global error handler
 */
export declare function handleError<T>(error: unknown, context: string, fallbackValue?: T): Promise<{
    success: boolean;
    result?: T;
    error?: GanAuditorError;
}>;
/**
 * Execute operation with retry using global error handler
 */
export declare function withRetry<T>(operation: () => Promise<T>, context: string, retryConfig?: Partial<RetryConfig>): Promise<T>;
/**
 * Execute operation with graceful degradation using global error handler
 */
export declare function withGracefulDegradation<T>(operation: () => Promise<T>, fallbackOperation: () => Promise<T>, context: string): Promise<{
    result: T;
    degraded: boolean;
    error?: GanAuditorError;
}>;
/**
 * Execute operation with timeout
 */
export declare function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number, timeoutMessage?: string): Promise<T>;
/**
 * Create structured error response using global error handler
 */
export declare function createErrorResponse(error: unknown, context: string, fallbackData?: any): StructuredErrorResponse;
/**
 * Create comprehensive diagnostic response for Codex errors
 */
export declare function createDiagnosticResponse(error: unknown, executionContext: ExecutionContext): Promise<{
    diagnostic: CodexDiagnostic;
    structuredResponse: StructuredErrorResponse;
}>;
/**
 * Generate comprehensive installation guidance for Codex CLI
 */
export declare function getInstallationGuidance(): Promise<InstallationGuidance>;
/**
 * Check Codex CLI version compatibility
 */
export declare function getVersionCompatibility(): Promise<VersionInfo>;
/**
 * Create troubleshooting guide for common issues
 */
export declare function getTroubleshootingGuide(): Promise<{
    commonIssues: Array<{
        issue: string;
        symptoms: string[];
        solutions: string[];
        prevention: string[];
    }>;
    diagnosticCommands: Array<{
        command: string;
        purpose: string;
        expectedOutput: string;
    }>;
    emergencyRecovery: string[];
}>;
/**
 * Handle configuration errors with appropriate fallbacks
 */
export declare function handleConfigError(error: unknown, defaultConfig: SessionConfig): Promise<SessionConfig>;
/**
 * Handle file system errors with graceful skipping
 */
export declare function handleFileSystemError(error: unknown, filePath: string): Promise<{
    success: boolean;
    content?: string;
}>;
/**
 * Handle session errors with fallback session creation
 */
export declare function handleSessionError(error: unknown, sessionId: string): Promise<any>;
/**
 * Handle system prompt rendering failures with graceful degradation
 * Requirement 6.3: Add prompt-specific error recovery mechanisms
 */
export declare function handlePromptRenderingError(error: unknown, thoughtData: any, sessionId?: string): Promise<{
    success: boolean;
    fallbackPrompt?: string;
    degradationLevel: 'none' | 'partial' | 'full';
    error?: GanAuditorError;
}>;
/**
 * Handle workflow step execution failures with step-specific recovery
 * Requirement 6.3: Implement graceful degradation for prompt failures
 */
export declare function handleWorkflowStepError(error: unknown, stepName: string, stepContext: {
    thoughtNumber: number;
    sessionId?: string;
    previousSteps?: string[];
}): Promise<{
    success: boolean;
    fallbackStepResult?: any;
    skipStep?: boolean;
    retryRecommended?: boolean;
    error?: GanAuditorError;
}>;
/**
 * Handle completion analysis failures with intelligent fallback
 * Requirement 6.3: Create fallback prompt generation for error scenarios
 */
export declare function handleCompletionAnalysisError(error: unknown, auditResult: any, sessionContext: {
    currentLoop: number;
    sessionId?: string;
    scoreHistory?: number[];
}): Promise<{
    success: boolean;
    fallbackAnalysis?: any;
    recommendations?: string[];
    error?: GanAuditorError;
}>;
/**
 * Handle prompt context persistence failures
 * Requirement 6.3: Integrate with existing error handler utilities
 */
export declare function handlePromptContextError(error: unknown, operation: 'store' | 'retrieve' | 'validate', contextData?: any): Promise<{
    success: boolean;
    fallbackContext?: any;
    degraded?: boolean;
    error?: GanAuditorError;
}>;
/**
 * Handle audit service unavailable errors (Requirement 7.1)
 */
export declare function handleAuditServiceUnavailable(error: unknown, serviceName?: string): Promise<{
    success: boolean;
    fallbackAudit?: any;
    error?: GanAuditorError;
}>;
/**
 * Handle invalid code format errors (Requirement 7.2)
 */
export declare function handleInvalidCodeFormat(error: unknown, codeContent: string, expectedFormats?: string[]): Promise<{
    success: boolean;
    formattedCode?: string;
    formatGuidance?: string[];
    error?: GanAuditorError;
}>;
/**
 * Handle session corruption with recovery options (Requirement 7.3)
 */
export declare function handleSessionCorruption(error: unknown, sessionId: string, corruptionType: string): Promise<{
    success: boolean;
    recoveredSession?: any;
    recoveryOptions?: string[];
    autoRecovered?: boolean;
    error?: GanAuditorError;
}>;
/**
 * Handle audit timeout with partial results (Requirement 7.4)
 */
export declare function handleAuditTimeout(error: unknown, timeoutMs: number, partialResults?: any, completionPercentage?: number): Promise<{
    success: boolean;
    partialAudit?: any;
    timeoutInfo?: {
        timeoutMs: number;
        completionPercentage: number;
        hasPartialResults: boolean;
    };
    error?: GanAuditorError;
}>;
//# sourceMappingURL=error-handler.d.ts.map