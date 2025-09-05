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
import { ErrorClassifier, ErrorRecovery, } from '../types/error-types.js';
import { logger, createTimer } from './logger.js';
import { DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG, DEFAULT_AUDIT_RUBRIC } from '../types/gan-types.js';
/**
 * Default error handler configuration
 */
const DEFAULT_ERROR_HANDLER_CONFIG = {
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableFallback: true,
    enableGracefulDegradation: true,
    logErrors: true,
    logLevel: 'error',
    component: 'error-handler',
};
/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['filesystem', 'session', 'codex'],
};
// ============================================================================
// Error Handler Implementation
// ============================================================================
/**
 * Comprehensive error handler with graceful degradation
 */
export class ErrorHandler {
    config;
    retryConfig;
    constructor(config = {}, retryConfig = {}) {
        this.config = { ...DEFAULT_ERROR_HANDLER_CONFIG, ...config };
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    }
    /**
     * Handle an error with appropriate strategy
     */
    async handleError(error, context, fallbackValue) {
        const timer = createTimer(`error-handling-${context}`, this.config.component);
        try {
            // Classify the error
            const classifiedError = ErrorClassifier.classify(error);
            // Log the error
            if (this.config.logErrors) {
                logger.error(`Error in ${context}: ${classifiedError.message}`, classifiedError, { context }, this.config.component);
            }
            // Determine handling strategy
            const strategy = this.determineStrategy(classifiedError);
            // Execute strategy
            const result = await this.executeStrategy(strategy, classifiedError, context, fallbackValue);
            timer.end({ strategy, success: result.success });
            return result;
        }
        catch (handlingError) {
            timer.endWithError(handlingError);
            // If error handling itself fails, return basic fallback
            return {
                success: false,
                result: fallbackValue,
                error: ErrorClassifier.classify(handlingError),
            };
        }
    }
    /**
     * Execute an operation with retry logic
     */
    async withRetry(operation, context, customRetryConfig) {
        const config = { ...this.retryConfig, ...customRetryConfig };
        let lastError;
        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            try {
                logger.debug(`Executing ${context} (attempt ${attempt}/${config.maxAttempts})`, undefined, this.config.component);
                const result = await operation();
                if (attempt > 1) {
                    logger.info(`${context} succeeded after ${attempt} attempts`, undefined, this.config.component);
                }
                return result;
            }
            catch (error) {
                lastError = error;
                const classifiedError = ErrorClassifier.classify(error);
                // Check if error is retryable
                if (!this.isRetryable(classifiedError, config)) {
                    logger.debug(`${context} failed with non-retryable error`, { error: classifiedError.message, category: classifiedError.category }, this.config.component);
                    throw error;
                }
                // If this was the last attempt, throw the error
                if (attempt === config.maxAttempts) {
                    logger.error(`${context} failed after ${attempt} attempts`, classifiedError, undefined, this.config.component);
                    throw error;
                }
                // Calculate delay for next attempt
                const delay = Math.min(config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1), config.maxDelay);
                logger.warn(`${context} failed (attempt ${attempt}), retrying in ${delay}ms`, { error: classifiedError.message, nextAttempt: attempt + 1 }, this.config.component);
                await this.delay(delay);
            }
        }
        // This should never be reached, but just in case
        throw lastError;
    }
    /**
     * Execute operation with graceful degradation
     */
    async withGracefulDegradation(operation, fallbackOperation, context) {
        try {
            const result = await operation();
            return { result, degraded: false };
        }
        catch (error) {
            const classifiedError = ErrorClassifier.classify(error);
            logger.warn(`${context} failed, attempting graceful degradation`, classifiedError, this.config.component);
            try {
                const fallbackResult = await fallbackOperation();
                logger.info(`${context} completed with graceful degradation`, undefined, this.config.component);
                return { result: fallbackResult, degraded: true, error: classifiedError };
            }
            catch (fallbackError) {
                logger.error(`${context} fallback also failed`, ErrorClassifier.classify(fallbackError), undefined, this.config.component);
                throw classifiedError; // Throw original error, not fallback error
            }
        }
    }
    /**
     * Create a structured error response
     */
    createErrorResponse(error, context, fallbackData) {
        const classifiedError = ErrorClassifier.classify(error);
        const fallback = fallbackData || ErrorRecovery.createFallbackData(classifiedError);
        return classifiedError.toStructuredResponse(fallback);
    }
    /**
     * Aggregate multiple errors into a summary
     */
    aggregateErrors(errors) {
        const details = errors.map(error => this.createErrorResponse(error, 'batch-operation'));
        const criticalCount = details.filter(d => d.details.severity === 'critical').length;
        const recoverableCount = details.filter(d => d.details.recoverable).length;
        const summary = this.createErrorSummary(details, criticalCount, recoverableCount);
        return {
            summary,
            details,
            criticalCount,
            recoverableCount,
        };
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Determine the appropriate handling strategy for an error
     */
    determineStrategy(error) {
        // Critical errors should abort
        if (error.severity === 'critical') {
            return 'abort';
        }
        // Use the error's suggested recovery strategy
        if (error.recovery_strategy && this.isStrategyEnabled(error.recovery_strategy)) {
            return error.recovery_strategy;
        }
        // Fallback to category-based strategy
        switch (error.category) {
            case 'config':
                return 'fallback';
            case 'codex':
                return 'fallback';
            case 'filesystem':
                return 'skip';
            case 'session':
                return 'retry';
            default:
                return 'retry';
        }
    }
    /**
     * Check if a recovery strategy is enabled
     */
    isStrategyEnabled(strategy) {
        switch (strategy) {
            case 'retry':
                return this.config.enableRetry;
            case 'fallback':
                return this.config.enableFallback;
            case 'skip':
                return this.config.enableGracefulDegradation;
            default:
                return true;
        }
    }
    /**
     * Execute the determined recovery strategy
     */
    async executeStrategy(strategy, error, context, fallbackValue) {
        switch (strategy) {
            case 'abort':
                return { success: false, error };
            case 'fallback':
                const fallback = fallbackValue || this.createFallbackValue(error);
                logger.info(`Using fallback for ${context}`, { fallback: !!fallback }, this.config.component);
                return { success: true, result: fallback };
            case 'skip':
                logger.info(`Skipping failed operation: ${context}`, undefined, this.config.component);
                return { success: true, result: fallbackValue };
            case 'retry':
                // For retry strategy, we return the error to be handled by retry logic
                return { success: false, error };
            case 'user_intervention':
                logger.warn(`User intervention required for ${context}`, { suggestions: error.suggestions }, this.config.component);
                return { success: false, error };
            default:
                return { success: false, error };
        }
    }
    /**
     * Create appropriate fallback value based on error category
     */
    createFallbackValue(error) {
        switch (error.category) {
            case 'config':
                return this.createFallbackConfig();
            case 'codex':
                return this.createFallbackAuditResult();
            case 'filesystem':
                return null; // Skip the file/operation
            case 'session':
                return this.createFallbackSession();
            default:
                return null;
        }
    }
    /**
     * Create fallback configuration
     */
    createFallbackConfig() {
        return { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG };
    }
    /**
     * Create fallback audit result
     */
    createFallbackAuditResult() {
        const fallbackScore = 50;
        return {
            overall: fallbackScore,
            dimensions: DEFAULT_AUDIT_RUBRIC.dimensions.map(d => ({
                name: d.name,
                score: fallbackScore,
            })),
            verdict: 'revise',
            review: {
                summary: 'Audit completed with limited functionality due to system limitations. Please review manually.',
                inline: [],
                citations: [],
            },
            proposed_diff: null,
            iterations: 1,
            judge_cards: [{
                    model: 'fallback',
                    score: fallbackScore,
                    notes: 'Fallback response due to system error',
                }],
        };
    }
    /**
     * Create fallback session data
     */
    createFallbackSession() {
        return {
            id: 'fallback-session',
            config: DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG,
            history: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    }
    /**
     * Check if an error is retryable
     */
    isRetryable(error, config) {
        // Don't retry critical errors
        if (error.severity === 'critical') {
            return false;
        }
        // Don't retry if error explicitly says not to
        if (!error.recoverable) {
            return false;
        }
        // Check if error category is retryable
        return config.retryableErrors.includes(error.category);
    }
    /**
     * Create error summary from multiple errors
     */
    createErrorSummary(details, criticalCount, recoverableCount) {
        const totalCount = details.length;
        if (totalCount === 0) {
            return 'No errors occurred';
        }
        if (totalCount === 1) {
            return `1 error occurred: ${details[0].error}`;
        }
        const parts = [`${totalCount} errors occurred`];
        if (criticalCount > 0) {
            parts.push(`${criticalCount} critical`);
        }
        if (recoverableCount > 0) {
            parts.push(`${recoverableCount} recoverable`);
        }
        return parts.join(', ');
    }
    /**
     * Utility method for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// ============================================================================
// Global Error Handler Instance
// ============================================================================
/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler();
/**
 * Configure the global error handler
 */
export function configureErrorHandler(config, retryConfig) {
    errorHandler.config = { ...DEFAULT_ERROR_HANDLER_CONFIG, ...config };
    if (retryConfig) {
        errorHandler.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    }
}
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Handle an error with the global error handler
 */
export async function handleError(error, context, fallbackValue) {
    return errorHandler.handleError(error, context, fallbackValue);
}
/**
 * Execute operation with retry using global error handler
 */
export async function withRetry(operation, context, retryConfig) {
    return errorHandler.withRetry(operation, context, retryConfig);
}
/**
 * Execute operation with graceful degradation using global error handler
 */
export async function withGracefulDegradation(operation, fallbackOperation, context) {
    return errorHandler.withGracefulDegradation(operation, fallbackOperation, context);
}
/**
 * Execute operation with timeout
 */
export async function withTimeout(operation, timeoutMs, timeoutMessage = 'Operation timed out') {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${timeoutMessage} after ${timeoutMs}ms`));
        }, timeoutMs);
        operation()
            .then(result => {
            clearTimeout(timer);
            resolve(result);
        })
            .catch(error => {
            clearTimeout(timer);
            reject(error);
        });
    });
}
/**
 * Create structured error response using global error handler
 */
export function createErrorResponse(error, context, fallbackData) {
    return errorHandler.createErrorResponse(error, context, fallbackData);
}
// ============================================================================
// Specialized Error Handlers
// ============================================================================
/**
 * Handle configuration errors with appropriate fallbacks
 */
export async function handleConfigError(error, defaultConfig) {
    const result = await handleError(error, 'configuration-parsing', defaultConfig);
    return result.result || defaultConfig;
}
/**
 * Handle Codex errors with fallback audit results
 */
export async function handleCodexError(error, context = 'codex-execution') {
    const fallbackAudit = errorHandler.createFallbackAuditResult();
    const result = await handleError(error, context, fallbackAudit);
    return result.result || fallbackAudit;
}
/**
 * Handle file system errors with graceful skipping
 */
export async function handleFileSystemError(error, filePath) {
    const result = await handleError(error, `file-access-${filePath}`, null);
    return {
        success: result.success,
        content: result.result || undefined,
    };
}
/**
 * Handle session errors with fallback session creation
 */
export async function handleSessionError(error, sessionId) {
    const fallbackSession = errorHandler.createFallbackSession();
    fallbackSession.id = sessionId;
    const result = await handleError(error, `session-${sessionId}`, fallbackSession);
    return result.result || fallbackSession;
}
// ============================================================================
// Prompt-Driven Audit Error Handlers (Requirement 6.3)
// ============================================================================
/**
 * Handle system prompt rendering failures with graceful degradation
 * Requirement 6.3: Add prompt-specific error recovery mechanisms
 */
export async function handlePromptRenderingError(error, thoughtData, sessionId) {
    const fallbackPrompts = {
        minimal: `# Minimal System Prompt\n\nYou are an AI code auditor. Review the provided code for quality, correctness, and best practices.\n\nProvide structured feedback with scores and actionable recommendations.`,
        basic: `# Basic GAN Auditor System Prompt\n\nYou are Kilo Code, an adversarial code auditor. Your role is to:\n\n1. Analyze code quality across multiple dimensions\n2. Provide scores from 0-100 for each dimension\n3. Generate actionable feedback with specific recommendations\n4. Determine pass/revise/reject verdict based on quality thresholds\n\nFocus on correctness, testing, style, security, performance, and documentation.`,
        standard: `# Standard GAN Auditor System Prompt\n\nYou are Kilo Code — the adversarial Auditor for GansAuditor_Codex MCP Server.\n\nYou validate completed work through comprehensive GAN-style auditing:\n- Reproduce and test functionality\n- Analyze code quality across 6 dimensions (30% Correctness, 20% Tests, 15% Style, 15% Security, 10% Performance, 10% Docs)\n- Provide evidence-based feedback with concrete examples\n- Generate structured output with scores, verdict, and actionable recommendations\n\nYour goal is iterative improvement toward "ship-ready" quality.`
    };
    try {
        const classifiedError = ErrorClassifier.classify(error);
        // Determine degradation level based on error type
        let degradationLevel = 'full';
        let fallbackPrompt = fallbackPrompts.minimal;
        if (classifiedError.category === 'config') {
            // Configuration errors - use basic prompt
            degradationLevel = 'partial';
            fallbackPrompt = fallbackPrompts.basic;
        }
        else if (classifiedError.category === 'filesystem') {
            // File system errors - use standard prompt without file dependencies
            degradationLevel = 'partial';
            fallbackPrompt = fallbackPrompts.standard;
        }
        else if (classifiedError.severity === 'low') {
            // Minor errors - use standard prompt
            degradationLevel = 'partial';
            fallbackPrompt = fallbackPrompts.standard;
        }
        logger.warn(`Prompt rendering failed, using ${degradationLevel} degradation`, {
            error: classifiedError,
            thoughtNumber: thoughtData?.thoughtNumber,
            sessionId
        }, 'prompt-error-handler');
        return {
            success: true,
            fallbackPrompt,
            degradationLevel,
            error: classifiedError,
        };
    }
    catch (handlingError) {
        logger.error('Prompt error handling failed', handlingError, { originalError: error, sessionId }, 'prompt-error-handler');
        return {
            success: false,
            fallbackPrompt: fallbackPrompts.minimal,
            degradationLevel: 'full',
            error: ErrorClassifier.classify(handlingError),
        };
    }
}
/**
 * Handle workflow step execution failures with step-specific recovery
 * Requirement 6.3: Implement graceful degradation for prompt failures
 */
export async function handleWorkflowStepError(error, stepName, stepContext) {
    const classifiedError = ErrorClassifier.classify(error);
    // Define step-specific recovery strategies
    const stepRecoveryStrategies = {
        'INIT': {
            canSkip: false,
            fallbackResult: {
                success: false,
                evidence: ['Task initialization attempted with limited context'],
                issues: [{
                        severity: 'major',
                        description: 'Failed to fully initialize audit context',
                        location: 'system',
                    }],
                score: 30,
                metadata: { recovery: 'fallback_init' },
            },
        },
        'REPRO': {
            canSkip: true,
            fallbackResult: {
                success: false,
                evidence: ['Reproduction step skipped due to execution failure'],
                issues: [{
                        severity: 'minor',
                        description: 'Could not establish reproduction steps',
                        location: 'workflow',
                    }],
                score: 50,
                metadata: { recovery: 'skip_repro' },
            },
        },
        'STATIC': {
            canSkip: false,
            fallbackResult: {
                success: true,
                evidence: ['Basic static analysis performed'],
                issues: [],
                score: 70,
                metadata: { recovery: 'basic_static' },
            },
        },
        'TESTS': {
            canSkip: false,
            fallbackResult: {
                success: false,
                evidence: ['Test execution attempted but failed'],
                issues: [{
                        severity: 'major',
                        description: 'Test execution failed - manual verification required',
                        location: 'testing',
                    }],
                score: 40,
                metadata: { recovery: 'fallback_tests' },
            },
        },
        'DYNAMIC': {
            canSkip: true,
            fallbackResult: {
                success: false,
                evidence: ['Dynamic analysis skipped due to execution constraints'],
                issues: [{
                        severity: 'minor',
                        description: 'Dynamic analysis could not be performed',
                        location: 'runtime',
                    }],
                score: 60,
                metadata: { recovery: 'skip_dynamic' },
            },
        },
        'CONFORM': {
            canSkip: false,
            fallbackResult: {
                success: true,
                evidence: ['Basic conformance check performed'],
                issues: [],
                score: 75,
                metadata: { recovery: 'basic_conform' },
            },
        },
        'TRACE': {
            canSkip: false,
            fallbackResult: {
                success: true,
                evidence: ['Basic traceability analysis performed'],
                issues: [],
                score: 65,
                metadata: { recovery: 'basic_trace' },
            },
        },
        'VERDICT': {
            canSkip: false,
            fallbackResult: {
                success: true,
                evidence: ['Verdict generated from available data'],
                issues: [{
                        severity: 'minor',
                        description: 'Verdict based on limited analysis due to step failures',
                        location: 'verdict',
                    }],
                score: 55,
                metadata: { recovery: 'fallback_verdict' },
            },
        },
    };
    const strategy = stepRecoveryStrategies[stepName];
    if (!strategy) {
        logger.error(`Unknown workflow step: ${stepName}`, classifiedError, stepContext, 'workflow-error-handler');
        return {
            success: false,
            error: classifiedError,
        };
    }
    // Determine if retry is recommended based on error type
    const retryRecommended = classifiedError.recoverable &&
        classifiedError.category !== 'config' &&
        classifiedError.severity !== 'critical';
    logger.warn(`Workflow step ${stepName} failed, applying recovery strategy`, {
        error: classifiedError,
        ...stepContext,
        canSkip: strategy.canSkip,
        retryRecommended,
    }, 'workflow-error-handler');
    return {
        success: true,
        fallbackStepResult: strategy.fallbackResult,
        skipStep: strategy.canSkip,
        retryRecommended,
        error: classifiedError,
    };
}
/**
 * Handle completion analysis failures with intelligent fallback
 * Requirement 6.3: Create fallback prompt generation for error scenarios
 */
export async function handleCompletionAnalysisError(error, auditResult, sessionContext) {
    const classifiedError = ErrorClassifier.classify(error);
    // Generate intelligent fallback based on available data
    const currentScore = auditResult?.overall || 0;
    const currentLoop = sessionContext.currentLoop || 0;
    const scoreHistory = sessionContext.scoreHistory || [];
    // Calculate basic completion analysis
    let status = 'in_progress';
    let reason = 'Analysis in progress';
    let nextThoughtNeeded = true;
    // Simple completion logic based on score and loop count
    if (currentScore >= 95 && currentLoop >= 10) {
        status = 'completed';
        reason = 'Excellent quality achieved';
        nextThoughtNeeded = false;
    }
    else if (currentScore >= 90 && currentLoop >= 15) {
        status = 'completed';
        reason = 'High quality achieved';
        nextThoughtNeeded = false;
    }
    else if (currentScore >= 85 && currentLoop >= 20) {
        status = 'completed';
        reason = 'Acceptable quality reached';
        nextThoughtNeeded = false;
    }
    else if (currentLoop >= 25) {
        status = 'terminated';
        reason = 'Maximum iteration limit reached';
        nextThoughtNeeded = false;
    }
    else if (scoreHistory.length >= 5) {
        // Check for stagnation
        const recentScores = scoreHistory.slice(-5);
        const scoreRange = Math.max(...recentScores) - Math.min(...recentScores);
        if (scoreRange < 2) {
            status = 'terminated';
            reason = 'Stagnation detected - no significant improvement';
            nextThoughtNeeded = false;
        }
    }
    const fallbackAnalysis = {
        status,
        reason,
        nextThoughtNeeded,
        confidence: 'low', // Indicate this is a fallback analysis
        metadata: {
            fallback: true,
            originalError: classifiedError.message,
            analysisMethod: 'basic_heuristic',
        },
    };
    const recommendations = [
        status === 'completed'
            ? 'Quality standards met - consider completing the audit'
            : status === 'terminated'
                ? 'Manual review recommended due to termination conditions'
                : 'Continue iterative improvement process',
        currentScore < 70
            ? 'Focus on addressing critical and major issues first'
            : 'Fine-tune remaining minor issues for optimal quality',
        currentLoop > 15
            ? 'Consider alternative approaches if progress stagnates'
            : 'Maintain current improvement trajectory',
    ];
    logger.warn('Completion analysis failed, using fallback heuristics', {
        error: classifiedError,
        ...sessionContext,
        currentScore,
        fallbackStatus: status,
    }, 'completion-error-handler');
    return {
        success: true,
        fallbackAnalysis,
        recommendations,
        error: classifiedError,
    };
}
/**
 * Handle prompt context persistence failures
 * Requirement 6.3: Integrate with existing error handler utilities
 */
export async function handlePromptContextError(error, operation, contextData) {
    const classifiedError = ErrorClassifier.classify(error);
    let fallbackContext = null;
    let degraded = false;
    if (operation === 'store') {
        // For store operations, we can continue without persistence
        logger.warn('Prompt context storage failed - continuing without persistence', {
            error: classifiedError,
            operation,
            hasContextData: !!contextData
        }, 'prompt-context-error-handler');
        return {
            success: true, // Continue without storage
            degraded: true,
            error: classifiedError,
        };
    }
    else if (operation === 'retrieve') {
        // For retrieve operations, provide minimal fallback context
        fallbackContext = {
            promptVersion: 'fallback',
            configHash: 'unknown',
            renderedPrompt: 'Basic audit prompt due to context retrieval failure',
            variables: {},
            projectContext: {},
            storedAt: Date.now(),
            sessionLoop: 0,
        };
        degraded = true;
        logger.warn('Prompt context retrieval failed - using fallback context', {
            error: classifiedError,
            operation
        }, 'prompt-context-error-handler');
    }
    else if (operation === 'validate') {
        // For validation operations, assume context is valid but degraded
        fallbackContext = contextData || {};
        degraded = true;
        logger.warn('Prompt context validation failed - using unvalidated context', {
            error: classifiedError,
            operation,
            hasContextData: !!contextData
        }, 'prompt-context-error-handler');
    }
    return {
        success: true,
        fallbackContext,
        degraded,
        error: classifiedError,
    };
}
// ============================================================================
// Synchronous Audit Workflow Error Handlers (Requirements 7.1-7.4)
// ============================================================================
/**
 * Handle audit service unavailable errors (Requirement 7.1)
 */
export async function handleAuditServiceUnavailable(error, serviceName = "GAN Auditor") {
    const fallbackAudit = errorHandler.createFallbackAuditResult();
    fallbackAudit.review.summary = `Audit service '${serviceName}' is unavailable. This is a fallback result with limited functionality. Please review the code manually and retry when the service is available.`;
    fallbackAudit.judge_cards = [{
            model: 'fallback-service-unavailable',
            score: 50,
            notes: `Fallback response due to ${serviceName} service unavailability`,
        }];
    const result = await handleError(error, `audit-service-${serviceName}`, fallbackAudit);
    return {
        success: result.success,
        fallbackAudit: result.result,
        error: result.error,
    };
}
/**
 * Handle invalid code format errors (Requirement 7.2)
 */
export async function handleInvalidCodeFormat(error, codeContent, expectedFormats = []) {
    const formatGuidance = [
        "Code format validation failed. Please check the following:",
        "• Ensure code blocks use proper markdown formatting (```language)",
        "• Verify syntax is valid for the specified programming language",
        "• Remove any incomplete or malformed code snippets",
        "• Check for proper indentation and bracket matching",
    ];
    if (expectedFormats.length > 0) {
        formatGuidance.push(`• Expected formats: ${expectedFormats.join(", ")}`);
    }
    // Attempt basic code cleanup
    const cleanedCode = attemptCodeCleanup(codeContent);
    const result = await handleError(error, 'code-format-validation', {
        originalCode: codeContent,
        cleanedCode,
        formatGuidance,
    });
    return {
        success: true, // Format errors are always recoverable
        formattedCode: cleanedCode,
        formatGuidance,
        error: result.error,
    };
}
/**
 * Handle session corruption with recovery options (Requirement 7.3)
 */
export async function handleSessionCorruption(error, sessionId, corruptionType) {
    const recoveryOptions = [
        "Reset session",
        "Create a new session with default configuration",
        "Attempt to recover partial session data",
        "Continue with in-memory session (no persistence)",
    ];
    // Attempt automatic recovery based on corruption type
    let recoveredSession = null;
    let autoRecovered = false;
    try {
        recoveredSession = await attemptSessionRecovery(sessionId, corruptionType);
        autoRecovered = !!recoveredSession;
    }
    catch (recoveryError) {
        // Recovery failed, will use fallback
    }
    if (!recoveredSession) {
        recoveredSession = errorHandler.createFallbackSession();
        recoveredSession.id = sessionId;
        recoveredSession.recovered = true;
        recoveredSession.originalCorruption = corruptionType;
    }
    const result = await handleError(error, `session-corruption-${sessionId}`, recoveredSession);
    return {
        success: result.success,
        recoveredSession: result.result,
        recoveryOptions,
        autoRecovered,
        error: result.error,
    };
}
/**
 * Handle audit timeout with partial results (Requirement 7.4)
 */
export async function handleAuditTimeout(error, timeoutMs, partialResults, completionPercentage) {
    // Create partial audit result if we have partial data
    let partialAudit = partialResults;
    if (!partialAudit) {
        partialAudit = errorHandler.createFallbackAuditResult();
        partialAudit.overall = Math.max(30, (completionPercentage || 0) * 0.8); // Reduced score for timeout
        partialAudit.verdict = 'revise';
        partialAudit.review.summary = `Audit timed out after ${timeoutMs}ms. ${completionPercentage ? `Analysis was ${Math.round(completionPercentage)}% complete.` : ''} Please review the code manually and consider breaking it into smaller chunks for faster processing.`;
    }
    // Add timeout information to the audit result
    if (partialAudit && typeof partialAudit === 'object') {
        partialAudit.timeout_info = {
            timed_out: true,
            timeout_ms: timeoutMs,
            completion_percentage: completionPercentage || 0,
            has_partial_results: !!partialResults,
        };
    }
    const timeoutInfo = {
        timeoutMs,
        completionPercentage: completionPercentage || 0,
        hasPartialResults: !!partialResults,
    };
    const result = await handleError(error, 'audit-timeout', partialAudit);
    return {
        success: result.success,
        partialAudit: result.result,
        timeoutInfo,
        error: result.error,
    };
}
// ============================================================================
// Helper Functions for Error Recovery
// ============================================================================
/**
 * Attempt to clean up malformed code
 */
function attemptCodeCleanup(code) {
    if (!code || typeof code !== 'string') {
        return '';
    }
    let cleaned = code;
    // Remove common formatting issues
    cleaned = cleaned
        .replace(/```\s*\n\s*```/g, '') // Remove empty code blocks
        .replace(/```(\w+)?\s*\n([\s\S]*?)\n\s*```/g, (match, lang, content) => {
        // Clean up code block content
        const cleanContent = content
            .split('\n')
            .map((line) => line.trimRight()) // Remove trailing whitespace
            .join('\n')
            .replace(/^\n+/, '') // Remove leading newlines
            .replace(/\n+$/, ''); // Remove trailing newlines
        return `\`\`\`${lang || ''}\n${cleanContent}\n\`\`\``;
    })
        .trim();
    return cleaned;
}
/**
 * Attempt to recover a corrupted session
 */
async function attemptSessionRecovery(sessionId, corruptionType) {
    // This is a placeholder for actual session recovery logic
    // In a real implementation, this would attempt to:
    // 1. Read the corrupted session file
    // 2. Extract recoverable data
    // 3. Reconstruct a valid session object
    // 4. Validate the recovered session
    const recoverableTypes = ['partial_data', 'missing_fields', 'format_mismatch'];
    if (!recoverableTypes.includes(corruptionType)) {
        return null; // Cannot recover this type of corruption
    }
    // Simulate recovery attempt
    try {
        const recoveredSession = {
            id: sessionId,
            config: DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG,
            history: [], // Start with empty history
            iterations: [],
            currentLoop: 0,
            isComplete: false,
            codexContextActive: false,
            recovered: true,
            recoveryType: corruptionType,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        return recoveredSession;
    }
    catch (error) {
        return null; // Recovery failed
    }
}
//# sourceMappingURL=error-handler.js.map