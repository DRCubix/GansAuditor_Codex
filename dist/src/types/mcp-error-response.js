/**
 * MCP Server Error Response Types and Builders
 *
 * This module provides structured error response types and builders for the MCP server,
 * ensuring proper error information is returned to clients for debugging.
 *
 * Requirements: 4.2, 4.3, 4.4, 4.5 - Structured error responses with diagnostic information
 */
// ============================================================================
// Error Response Builder
// ============================================================================
/**
 * Builder class for creating structured MCP error responses
 */
export class McpErrorResponseBuilder {
    diagnostic = {};
    statusCode = 500;
    recoverable = false;
    retryInfo;
    /**
     * Set error category
     */
    category(category) {
        this.diagnostic.category = category;
        return this;
    }
    /**
     * Set error severity
     */
    severity(severity) {
        this.diagnostic.severity = severity;
        return this;
    }
    /**
     * Set error message
     */
    message(message) {
        this.diagnostic.message = message;
        return this;
    }
    /**
     * Set detailed description
     */
    details(details) {
        this.diagnostic.details = details;
        return this;
    }
    /**
     * Add suggestions for resolving the error
     */
    suggestions(suggestions) {
        this.diagnostic.suggestions = suggestions;
        return this;
    }
    /**
     * Add documentation links
     */
    documentation(links) {
        this.diagnostic.documentationLinks = links;
        return this;
    }
    /**
     * Add context information
     */
    context(context) {
        this.diagnostic.context = { ...this.diagnostic.context, ...context };
        return this;
    }
    /**
     * Set error code
     */
    errorCode(code) {
        this.diagnostic.errorCode = code;
        return this;
    }
    /**
     * Set request ID for tracing
     */
    requestId(id) {
        this.diagnostic.requestId = id;
        return this;
    }
    /**
     * Set HTTP-like status code
     */
    status(code) {
        this.statusCode = code;
        return this;
    }
    /**
     * Mark error as recoverable
     */
    isRecoverable(recoverable = true) {
        this.recoverable = recoverable;
        return this;
    }
    /**
     * Set retry information
     */
    retry(canRetry, retryAfterMs, maxRetries) {
        this.retryInfo = { canRetry, retryAfterMs, maxRetries };
        return this;
    }
    /**
     * Build the structured error response
     */
    build() {
        const diagnostic = {
            category: this.diagnostic.category || 'unknown',
            severity: this.diagnostic.severity || 'error',
            message: this.diagnostic.message || 'An unknown error occurred',
            suggestions: this.diagnostic.suggestions || ['Contact support for assistance'],
            timestamp: new Date().toISOString(),
            ...this.diagnostic,
        };
        return {
            isError: true,
            error: diagnostic.message,
            diagnostic,
            statusCode: this.statusCode,
            recoverable: this.recoverable,
            retryInfo: this.retryInfo,
        };
    }
}
// ============================================================================
// Error Response Factory Functions
// ============================================================================
/**
 * Create a validation error response
 */
export function createValidationError(message, details, context) {
    return new McpErrorResponseBuilder()
        .category('validation')
        .severity('error')
        .message(message)
        .details(details)
        .suggestions([
        'Check the input parameters and ensure they meet the required format',
        'Refer to the tool documentation for correct parameter usage'
    ])
        .context(context)
        .status(400)
        .isRecoverable(true)
        .build();
}
/**
 * Create a Codex CLI error response
 */
export function createCodexError(message, details, context) {
    return new McpErrorResponseBuilder()
        .category('codex')
        .severity('critical')
        .message(message)
        .details(details)
        .suggestions([
        'Verify Codex CLI is installed and accessible in PATH',
        'Check CODEX_EXECUTABLE environment variable configuration',
        'Ensure proper file permissions for Codex CLI executable',
        'Review Codex CLI installation documentation'
    ])
        .documentation([
        'https://github.com/your-org/codex-cli/blob/main/README.md',
        'https://docs.your-org.com/codex-setup'
    ])
        .context(context)
        .status(503)
        .isRecoverable(false)
        .build();
}
/**
 * Create a configuration error response
 */
export function createConfigurationError(message, details, context) {
    return new McpErrorResponseBuilder()
        .category('configuration')
        .severity('critical')
        .message(message)
        .details(details)
        .suggestions([
        'Check environment variables are properly set',
        'Verify configuration file syntax and values',
        'Ensure all required configuration options are provided',
        'Review production deployment checklist'
    ])
        .documentation([
        'https://docs.your-org.com/configuration',
        'https://docs.your-org.com/deployment'
    ])
        .context(context)
        .status(500)
        .isRecoverable(false)
        .build();
}
/**
 * Create a timeout error response
 */
export function createTimeoutError(operation, timeoutMs, context) {
    return new McpErrorResponseBuilder()
        .category('timeout')
        .severity('error')
        .message(`Operation '${operation}' timed out after ${timeoutMs}ms`)
        .details(`The operation exceeded the configured timeout limit`)
        .suggestions([
        'Try reducing the complexity of the operation',
        'Increase timeout configuration if appropriate',
        'Check system resources and performance',
        'Consider breaking the operation into smaller parts'
    ])
        .context({ operation, timeoutMs, ...context })
        .status(408)
        .isRecoverable(true)
        .retry(true, 5000, 2)
        .build();
}
/**
 * Create a session error response
 */
export function createSessionError(message, sessionId, context) {
    return new McpErrorResponseBuilder()
        .category('session')
        .severity('error')
        .message(message)
        .suggestions([
        'Try creating a new session with a different branch_id',
        'Check session storage directory permissions',
        'Verify session state is not corrupted'
    ])
        .context({ sessionId, ...context })
        .status(422)
        .isRecoverable(true)
        .build();
}
/**
 * Create an internal server error response
 */
export function createInternalError(message, error, context) {
    return new McpErrorResponseBuilder()
        .category('internal')
        .severity('critical')
        .message(message)
        .details(error?.message)
        .suggestions([
        'This is an internal server error - please contact support',
        'Check server logs for more detailed error information',
        'Try the operation again after a brief delay'
    ])
        .context({
        errorType: error?.constructor.name,
        stack: error?.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
        ...context
    })
        .status(500)
        .isRecoverable(false)
        .retry(true, 10000, 1)
        .build();
}
// ============================================================================
// MCP Tool Response Conversion
// ============================================================================
/**
 * Convert structured error response to MCP tool response format
 */
export function toMcpToolResponse(errorResponse) {
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(errorResponse, null, 2)
            }],
        isError: true
    };
}
/**
 * Create error response from generic error
 */
export function createErrorResponseFromError(error, context) {
    if (error instanceof Error) {
        // Check error type and create appropriate response
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('codex') || errorMessage.includes('executable')) {
            return createCodexError(error.message, error.stack, context);
        }
        if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
            return createTimeoutError('audit', 30000, context);
        }
        if (errorMessage.includes('session') || errorMessage.includes('state')) {
            return createSessionError(error.message, undefined, context);
        }
        if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            return createValidationError(error.message, error.stack, context);
        }
        if (errorMessage.includes('config') || errorMessage.includes('environment')) {
            return createConfigurationError(error.message, error.stack, context);
        }
        // Default to internal error
        return createInternalError(error.message, error, context);
    }
    // Handle non-Error objects
    return createInternalError('An unknown error occurred', undefined, { originalError: String(error), ...context });
}
//# sourceMappingURL=mcp-error-response.js.map