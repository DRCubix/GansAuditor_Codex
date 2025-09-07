/**
 * MCP Server Error Response Types and Builders
 *
 * This module provides structured error response types and builders for the MCP server,
 * ensuring proper error information is returned to clients for debugging.
 *
 * Requirements: 4.2, 4.3, 4.4, 4.5 - Structured error responses with diagnostic information
 */
import type { GansAuditorCodexToolResponse } from './gan-types.js';
/**
 * Error categories for structured error classification
 */
export type McpErrorCategory = 'validation' | 'configuration' | 'codex' | 'session' | 'filesystem' | 'timeout' | 'resource' | 'internal' | 'unknown';
/**
 * Error severity levels
 */
export type McpErrorSeverity = 'critical' | 'error' | 'warning' | 'info';
/**
 * Diagnostic information for error troubleshooting
 */
export interface McpErrorDiagnostic {
    /** Error category for classification */
    category: McpErrorCategory;
    /** Severity level */
    severity: McpErrorSeverity;
    /** Human-readable error message */
    message: string;
    /** Detailed technical description */
    details?: string;
    /** Suggested actions to resolve the error */
    suggestions: string[];
    /** Links to relevant documentation */
    documentationLinks?: string[];
    /** Additional context information */
    context?: Record<string, any>;
    /** Error code for programmatic handling */
    errorCode?: string;
    /** Timestamp when error occurred */
    timestamp: string;
    /** Request ID for tracing */
    requestId?: string;
}
/**
 * Structured error response for MCP clients
 */
export interface McpStructuredErrorResponse {
    /** Error flag */
    isError: true;
    /** Primary error message */
    error: string;
    /** Diagnostic information */
    diagnostic: McpErrorDiagnostic;
    /** HTTP-like status code for error type */
    statusCode: number;
    /** Whether the error is recoverable */
    recoverable: boolean;
    /** Retry information if applicable */
    retryInfo?: {
        canRetry: boolean;
        retryAfterMs?: number;
        maxRetries?: number;
    };
}
/**
 * Builder class for creating structured MCP error responses
 */
export declare class McpErrorResponseBuilder {
    private diagnostic;
    private statusCode;
    private recoverable;
    private retryInfo?;
    /**
     * Set error category
     */
    category(category: McpErrorCategory): this;
    /**
     * Set error severity
     */
    severity(severity: McpErrorSeverity): this;
    /**
     * Set error message
     */
    message(message: string): this;
    /**
     * Set detailed description
     */
    details(details: string): this;
    /**
     * Add suggestions for resolving the error
     */
    suggestions(suggestions: string[]): this;
    /**
     * Add documentation links
     */
    documentation(links: string[]): this;
    /**
     * Add context information
     */
    context(context: Record<string, any>): this;
    /**
     * Set error code
     */
    errorCode(code: string): this;
    /**
     * Set request ID for tracing
     */
    requestId(id: string): this;
    /**
     * Set HTTP-like status code
     */
    status(code: number): this;
    /**
     * Mark error as recoverable
     */
    isRecoverable(recoverable?: boolean): this;
    /**
     * Set retry information
     */
    retry(canRetry: boolean, retryAfterMs?: number, maxRetries?: number): this;
    /**
     * Build the structured error response
     */
    build(): McpStructuredErrorResponse;
}
/**
 * Create a validation error response
 */
export declare function createValidationError(message: string, details?: string, context?: Record<string, any>): McpStructuredErrorResponse;
/**
 * Create a Codex CLI error response
 */
export declare function createCodexError(message: string, details?: string, context?: Record<string, any>): McpStructuredErrorResponse;
/**
 * Create a configuration error response
 */
export declare function createConfigurationError(message: string, details?: string, context?: Record<string, any>): McpStructuredErrorResponse;
/**
 * Create a timeout error response
 */
export declare function createTimeoutError(operation: string, timeoutMs: number, context?: Record<string, any>): McpStructuredErrorResponse;
/**
 * Create a session error response
 */
export declare function createSessionError(message: string, sessionId?: string, context?: Record<string, any>): McpStructuredErrorResponse;
/**
 * Create an internal server error response
 */
export declare function createInternalError(message: string, error?: Error, context?: Record<string, any>): McpStructuredErrorResponse;
/**
 * Convert structured error response to MCP tool response format
 */
export declare function toMcpToolResponse(errorResponse: McpStructuredErrorResponse): GansAuditorCodexToolResponse;
/**
 * Create error response from generic error
 */
export declare function createErrorResponseFromError(error: unknown, context?: Record<string, any>): McpStructuredErrorResponse;
//# sourceMappingURL=mcp-error-response.d.ts.map