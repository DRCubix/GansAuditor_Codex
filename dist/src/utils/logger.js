/**
 * Logging utility for GAN Auditor Integration
 *
 * This module provides structured logging capabilities while maintaining
 * compatibility with existing console output formats.
 *
 * Requirements addressed:
 * - 6.4: Add logging for debugging while maintaining existing console output format
 */
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_LOGGER_CONFIG = {
    enabled: false,
    level: 'info',
    component: 'gan-auditor',
    includeTimestamp: true,
    includeComponent: true,
    colorOutput: true,
    formatJson: false,
    maxMessageLength: 1000,
};
// ============================================================================
// Color Utilities
// ============================================================================
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};
const LEVEL_COLORS = {
    debug: COLORS.gray,
    info: COLORS.blue,
    warn: COLORS.yellow,
    error: COLORS.red,
};
// ============================================================================
// Logger Implementation
// ============================================================================
/**
 * Structured logger with configurable output formats
 */
export class Logger {
    config;
    logHistory = [];
    maxHistorySize = 1000;
    constructor(config = {}) {
        this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    }
    /**
     * Update logger configuration
     */
    configure(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Check if logging is enabled for a specific level
     */
    isEnabled(level) {
        if (!this.config.enabled) {
            return false;
        }
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
        };
        return levels[level] >= levels[this.config.level];
    }
    /**
     * Log a debug message
     */
    debug(message, data, component) {
        this.log('debug', message, data, component);
    }
    /**
     * Log an info message
     */
    info(message, data, component) {
        this.log('info', message, data, component);
    }
    /**
     * Log a warning message
     */
    warn(message, data, component) {
        this.log('warn', message, data, component);
    }
    /**
     * Log an error message
     */
    error(message, error, data, component) {
        const errorData = error ? this.serializeError(error) : undefined;
        this.log('error', message, { ...data, error: errorData }, component);
    }
    /**
     * Log an error object directly
     */
    logError(error, component) {
        const message = error.message || 'Unknown error occurred';
        this.error(message, error, undefined, component);
    }
    /**
     * Core logging method
     */
    log(level, message, data, component) {
        if (!this.isEnabled(level)) {
            return;
        }
        const entry = {
            timestamp: Date.now(),
            level,
            component: component || this.config.component || 'unknown',
            message: this.truncateMessage(message),
            data: this.sanitizeData(data),
        };
        // Add to history
        this.addToHistory(entry);
        // Output to console
        this.outputToConsole(entry);
    }
    /**
     * Serialize error object for logging
     */
    serializeError(error) {
        const serialized = {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
        // Add GAN auditor specific fields
        if (error instanceof Error && 'category' in error) {
            const ganError = error;
            serialized.category = ganError.category;
            serialized.severity = ganError.severity;
            serialized.recoverable = ganError.recoverable;
            serialized.recovery_strategy = ganError.recovery_strategy;
            serialized.suggestions = ganError.suggestions;
            serialized.component = ganError.component;
        }
        return serialized;
    }
    /**
     * Sanitize data for logging (remove sensitive information)
     */
    sanitizeData(data) {
        if (!data) {
            return data;
        }
        try {
            // Clone to avoid modifying original, handling circular references
            const sanitized = this.deepClone(data);
            // Remove or mask sensitive fields
            this.maskSensitiveFields(sanitized);
            return sanitized;
        }
        catch (error) {
            // If cloning fails due to circular references or other issues, return a safe representation
            return '[Complex Object - Cannot Serialize]';
        }
    }
    /**
     * Deep clone object with circular reference handling
     */
    deepClone(obj, seen = new WeakSet()) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (seen.has(obj)) {
            return '[Circular Reference]';
        }
        seen.add(obj);
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item, seen));
        }
        if (typeof obj === 'object') {
            const cloned = {};
            for (const [key, value] of Object.entries(obj)) {
                cloned[key] = this.deepClone(value, seen);
            }
            return cloned;
        }
        return obj;
    }
    /**
     * Mask sensitive fields in data
     */
    maskSensitiveFields(obj, seen = new WeakSet()) {
        if (!obj || typeof obj !== 'object' || seen.has(obj)) {
            return;
        }
        seen.add(obj);
        const sensitiveFields = [
            'password',
            'token',
            'key',
            'secret',
            'auth',
            'credential',
        ];
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveFields.some(field => lowerKey.includes(field))) {
                obj[key] = '[MASKED]';
            }
            else if (typeof value === 'object' && value !== null) {
                this.maskSensitiveFields(value, seen);
            }
        }
    }
    /**
     * Truncate message if it exceeds maximum length
     */
    truncateMessage(message) {
        const maxLength = this.config.maxMessageLength;
        if (!maxLength || message.length <= maxLength) {
            return message;
        }
        return message.substring(0, maxLength - 3) + '...';
    }
    /**
     * Add entry to log history
     */
    addToHistory(entry) {
        this.logHistory.push(entry);
        // Maintain history size limit
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory = this.logHistory.slice(-this.maxHistorySize);
        }
    }
    /**
     * Output log entry to console
     */
    outputToConsole(entry) {
        if (this.config.formatJson) {
            console.log(JSON.stringify(entry));
            return;
        }
        const parts = [];
        // Timestamp
        if (this.config.includeTimestamp) {
            const timestamp = new Date(entry.timestamp).toISOString();
            parts.push(this.colorize(`[${timestamp}]`, COLORS.gray));
        }
        // Component
        if (this.config.includeComponent) {
            parts.push(this.colorize(`[${entry.component.toUpperCase()}]`, COLORS.cyan));
        }
        // Level
        const levelColor = LEVEL_COLORS[entry.level];
        parts.push(this.colorize(`[${entry.level.toUpperCase()}]`, levelColor));
        // Message
        parts.push(entry.message);
        // Data (if present and not too large)
        if (entry.data && Object.keys(entry.data).length > 0) {
            const dataStr = this.formatData(entry.data);
            if (dataStr) {
                parts.push(this.colorize(dataStr, COLORS.dim));
            }
        }
        // Output using appropriate console method
        const output = parts.join(' ');
        switch (entry.level) {
            case 'error':
                console.error(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            default:
                console.log(output);
                break;
        }
    }
    /**
     * Apply color to text if color output is enabled
     */
    colorize(text, color) {
        if (!this.config.colorOutput) {
            return text;
        }
        return `${color}${text}${COLORS.reset}`;
    }
    /**
     * Format data for console output
     */
    formatData(data) {
        try {
            // For simple objects, format inline
            if (typeof data === 'object' && data !== null) {
                const keys = Object.keys(data);
                if (keys.length <= 3) {
                    const pairs = keys.map(key => `${key}=${JSON.stringify(data[key])}`);
                    return `{${pairs.join(', ')}}`;
                }
            }
            // For complex data, format as JSON
            const jsonStr = JSON.stringify(data, null, 0);
            if (jsonStr.length <= 200) {
                return jsonStr;
            }
            // Too large, just indicate presence
            return '{...}';
        }
        catch {
            return '[unserializable data]';
        }
    }
    /**
     * Get recent log entries
     */
    getHistory(count) {
        if (!count) {
            return [...this.logHistory];
        }
        return this.logHistory.slice(-count);
    }
    /**
     * Clear log history
     */
    clearHistory() {
        this.logHistory = [];
    }
    /**
     * Get log statistics
     */
    getStats() {
        const stats = {
            totalEntries: this.logHistory.length,
            byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
            byComponent: {},
            timeRange: null,
        };
        if (this.logHistory.length === 0) {
            return stats;
        }
        // Calculate statistics
        for (const entry of this.logHistory) {
            stats.byLevel[entry.level]++;
            stats.byComponent[entry.component] = (stats.byComponent[entry.component] || 0) + 1;
        }
        // Time range
        stats.timeRange = {
            start: this.logHistory[0].timestamp,
            end: this.logHistory[this.logHistory.length - 1].timestamp,
        };
        return stats;
    }
}
// ============================================================================
// Global Logger Instance
// ============================================================================
/**
 * Global logger instance for the GAN auditor system
 */
export const logger = new Logger();
/**
 * Configure the global logger
 */
export function configureLogger(config) {
    logger.configure(config);
}
/**
 * Create a component-specific logger
 */
export function createComponentLogger(component, config) {
    return new Logger({ ...config, component });
}
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Log debug message using global logger
 */
export function logDebug(message, data, component) {
    logger.debug(message, data, component);
}
/**
 * Log info message using global logger
 */
export function logInfo(message, data, component) {
    logger.info(message, data, component);
}
/**
 * Log warning message using global logger
 */
export function logWarn(message, data, component) {
    logger.warn(message, data, component);
}
/**
 * Log error message using global logger
 */
export function logError(message, error, data, component) {
    logger.error(message, error, data, component);
}
/**
 * Log error object using global logger
 */
export function logErrorObject(error, component) {
    logger.logError(error, component);
}
// ============================================================================
// Performance Logging
// ============================================================================
/**
 * Performance timer for measuring operation duration
 */
export class PerformanceTimer {
    startTime;
    component;
    operation;
    constructor(operation, component = 'performance') {
        this.startTime = Date.now();
        this.operation = operation;
        this.component = component;
        logDebug(`Started: ${operation}`, undefined, component);
    }
    /**
     * End the timer and log the duration
     */
    end(data) {
        const duration = Date.now() - this.startTime;
        logInfo(`Completed: ${this.operation}`, {
            duration_ms: duration,
            ...data
        }, this.component);
        return duration;
    }
    /**
     * End the timer with an error
     */
    endWithError(error, data) {
        const duration = Date.now() - this.startTime;
        logError(`Failed: ${this.operation}`, error, {
            duration_ms: duration,
            ...data
        }, this.component);
        return duration;
    }
}
/**
 * Create a performance timer
 */
export function createTimer(operation, component) {
    return new PerformanceTimer(operation, component);
}
/**
 * Measure the duration of an async operation
 */
export async function measureAsync(operation, fn, component) {
    const timer = createTimer(operation, component);
    try {
        const result = await fn();
        timer.end();
        return result;
    }
    catch (error) {
        timer.endWithError(error);
        throw error;
    }
}
/**
 * Measure the duration of a sync operation
 */
export function measureSync(operation, fn, component) {
    const timer = createTimer(operation, component);
    try {
        const result = fn();
        timer.end();
        return result;
    }
    catch (error) {
        timer.endWithError(error);
        throw error;
    }
}
// ============================================================================
// Prompt-Driven Audit Logging (Requirement 6.4)
// ============================================================================
/**
 * Specialized logger for prompt execution tracking
 */
export class PromptExecutionLogger {
    componentLogger;
    executionHistory = [];
    maxHistorySize = 100;
    constructor(component = 'prompt-execution') {
        this.componentLogger = createComponentLogger(component, {
            enabled: true,
            level: 'info',
        });
    }
    /**
     * Log prompt rendering start
     */
    logPromptRenderingStart(thoughtNumber, sessionId, templatePath) {
        const executionId = this.generateExecutionId();
        const startTime = Date.now();
        this.componentLogger.info('Prompt rendering started', {
            executionId,
            thoughtNumber,
            sessionId,
            templatePath,
        });
        return new PromptExecutionTimer(executionId, 'prompt-rendering', startTime, this.componentLogger, (entry) => this.addExecutionEntry(entry));
    }
    /**
     * Log workflow step execution
     */
    logWorkflowStepStart(stepName, thoughtNumber, sessionId, stepIndex) {
        const executionId = this.generateExecutionId();
        const startTime = Date.now();
        this.componentLogger.info(`Workflow step ${stepName} started`, {
            executionId,
            stepName,
            stepIndex,
            thoughtNumber,
            sessionId,
        });
        return new PromptExecutionTimer(executionId, 'workflow-step', startTime, this.componentLogger, (entry) => this.addExecutionEntry(entry), { stepName, stepIndex });
    }
    /**
     * Log completion analysis execution
     */
    logCompletionAnalysisStart(thoughtNumber, currentLoop, sessionId) {
        const executionId = this.generateExecutionId();
        const startTime = Date.now();
        this.componentLogger.info('Completion analysis started', {
            executionId,
            thoughtNumber,
            currentLoop,
            sessionId,
        });
        return new PromptExecutionTimer(executionId, 'completion-analysis', startTime, this.componentLogger, (entry) => this.addExecutionEntry(entry));
    }
    /**
     * Log quality progression tracking
     */
    logQualityProgression(sessionId, thoughtNumber, overallScore, previousScore, improvementAreas) {
        const improvement = previousScore !== undefined ? overallScore - previousScore : 0;
        const improvementDirection = improvement > 0 ? '↗️' : improvement < 0 ? '↘️' : '➡️';
        this.componentLogger.info(`Quality progression tracked ${improvementDirection}`, {
            sessionId,
            thoughtNumber,
            overallScore,
            previousScore,
            improvement,
            improvementAreas: improvementAreas?.slice(0, 3), // Limit to first 3 areas
        });
        // Log warning if score is declining
        if (improvement < -5) {
            this.componentLogger.warn('Significant quality decline detected', {
                sessionId,
                thoughtNumber,
                scoreDecline: Math.abs(improvement),
                previousScore,
                currentScore: overallScore,
            });
        }
        // Log success if high score achieved
        if (overallScore >= 90) {
            this.componentLogger.info('High quality score achieved', {
                sessionId,
                thoughtNumber,
                overallScore,
                qualityLevel: overallScore >= 95 ? 'excellent' : 'high',
            });
        }
    }
    /**
     * Log session statistics update
     */
    logSessionStatistics(sessionId, statistics) {
        this.componentLogger.debug('Session statistics updated', {
            sessionId,
            currentLoop: statistics.currentLoop,
            sessionDurationMinutes: Math.round(statistics.sessionDuration / 60000),
            currentScore: statistics.qualityStats.currentScore,
            averageScore: Math.round(statistics.qualityStats.averageScore),
            totalSteps: statistics.workflowStats.totalSteps,
            avgStepDurationMs: Math.round(statistics.workflowStats.averageStepDuration),
        });
        // Log performance warnings
        if (statistics.sessionDuration > 600000) { // 10 minutes
            this.componentLogger.warn('Long-running audit session detected', {
                sessionId,
                durationMinutes: Math.round(statistics.sessionDuration / 60000),
                currentLoop: statistics.currentLoop,
            });
        }
        if (statistics.workflowStats.averageStepDuration > 5000) { // 5 seconds
            this.componentLogger.warn('Slow workflow step execution detected', {
                sessionId,
                averageStepDurationMs: Math.round(statistics.workflowStats.averageStepDuration),
                totalSteps: statistics.workflowStats.totalSteps,
            });
        }
    }
    /**
     * Log prompt context operations
     */
    logPromptContextOperation(operation, sessionId, success, contextSize, error) {
        const logLevel = success ? 'debug' : 'warn';
        const message = `Prompt context ${operation} ${success ? 'succeeded' : 'failed'}`;
        if (success) {
            this.componentLogger.debug(message, {
                operation,
                sessionId,
                contextSizeBytes: contextSize,
            });
        }
        else {
            this.componentLogger.warn(message, {
                operation,
                sessionId,
                error: error?.message,
                contextSizeBytes: contextSize,
            });
        }
    }
    /**
     * Get execution history for analysis
     */
    getExecutionHistory(limit) {
        const history = [...this.executionHistory];
        return limit ? history.slice(-limit) : history;
    }
    /**
     * Get execution statistics
     */
    getExecutionStatistics() {
        const entries = this.executionHistory;
        const now = Date.now();
        // Group by operation type
        const byType = entries.reduce((acc, entry) => {
            if (!acc[entry.operationType]) {
                acc[entry.operationType] = [];
            }
            acc[entry.operationType].push(entry);
            return acc;
        }, {});
        // Calculate statistics for each type
        const typeStats = {};
        for (const [type, typeEntries] of Object.entries(byType)) {
            const durations = typeEntries.map(e => e.duration).filter(d => d !== undefined);
            const successCount = typeEntries.filter(e => e.success).length;
            typeStats[type] = {
                totalExecutions: typeEntries.length,
                successCount,
                failureCount: typeEntries.length - successCount,
                successRate: typeEntries.length > 0 ? successCount / typeEntries.length : 0,
                averageDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
                minDuration: durations.length > 0 ? Math.min(...durations) : 0,
                maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
            };
        }
        return {
            totalExecutions: entries.length,
            timeRange: entries.length > 0 ? {
                start: entries[0].startTime,
                end: entries[entries.length - 1].endTime || now,
            } : null,
            operationTypes: typeStats,
            recentFailures: entries
                .filter(e => !e.success && (now - e.startTime) < 300000) // Last 5 minutes
                .slice(-10),
        };
    }
    /**
     * Clear execution history
     */
    clearHistory() {
        this.executionHistory.length = 0;
        this.componentLogger.debug('Execution history cleared');
    }
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    generateExecutionId() {
        return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    addExecutionEntry(entry) {
        this.executionHistory.push(entry);
        // Maintain history size limit
        if (this.executionHistory.length > this.maxHistorySize) {
            this.executionHistory.splice(0, this.executionHistory.length - this.maxHistorySize);
        }
    }
}
/**
 * Timer for tracking prompt execution operations
 */
export class PromptExecutionTimer {
    executionId;
    operationType;
    startTime;
    logger;
    onComplete;
    metadata;
    constructor(executionId, operationType, startTime, logger, onComplete, metadata = {}) {
        this.executionId = executionId;
        this.operationType = operationType;
        this.startTime = startTime;
        this.logger = logger;
        this.onComplete = onComplete;
        this.metadata = metadata;
    }
    /**
     * End the timer with success
     */
    end(result) {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        this.logger.info(`${this.operationType} completed successfully`, {
            executionId: this.executionId,
            durationMs: duration,
            ...this.metadata,
        });
        this.onComplete({
            executionId: this.executionId,
            operationType: this.operationType,
            startTime: this.startTime,
            endTime,
            duration,
            success: true,
            result,
            metadata: this.metadata,
        });
        return duration;
    }
    /**
     * End the timer with error
     */
    endWithError(error, partialResult) {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        this.logger.error(`${this.operationType} failed`, error, {
            executionId: this.executionId,
            durationMs: duration,
            ...this.metadata,
        });
        this.onComplete({
            executionId: this.executionId,
            operationType: this.operationType,
            startTime: this.startTime,
            endTime,
            duration,
            success: false,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            result: partialResult,
            metadata: this.metadata,
        });
        return duration;
    }
    /**
     * Add metadata to the timer
     */
    addMetadata(key, value) {
        this.metadata[key] = value;
    }
}
// ============================================================================
// Global Prompt Logger Instance
// ============================================================================
/**
 * Global prompt execution logger instance
 */
export const promptLogger = new PromptExecutionLogger('prompt-execution');
/**
 * Create a component-specific prompt logger
 */
export function createPromptLogger(component) {
    return new PromptExecutionLogger(component);
}
// ============================================================================
// Convenience Functions for Prompt Logging
// ============================================================================
/**
 * Log prompt rendering operation
 */
export function logPromptRendering(operation, thoughtNumber, sessionId, templatePath) {
    const timer = promptLogger.logPromptRenderingStart(thoughtNumber, sessionId, templatePath);
    return operation()
        .then(result => {
        timer.end(result);
        return result;
    })
        .catch(error => {
        timer.endWithError(error);
        throw error;
    });
}
/**
 * Log workflow step execution
 */
export function logWorkflowStep(operation, stepName, thoughtNumber, sessionId, stepIndex) {
    const timer = promptLogger.logWorkflowStepStart(stepName, thoughtNumber, sessionId, stepIndex);
    return operation()
        .then(result => {
        timer.end(result);
        return result;
    })
        .catch(error => {
        timer.endWithError(error);
        throw error;
    });
}
/**
 * Log completion analysis operation
 */
export function logCompletionAnalysis(operation, thoughtNumber, currentLoop, sessionId) {
    const timer = promptLogger.logCompletionAnalysisStart(thoughtNumber, currentLoop, sessionId);
    return operation()
        .then(result => {
        timer.end(result);
        return result;
    })
        .catch(error => {
        timer.endWithError(error);
        throw error;
    });
}
//# sourceMappingURL=logger.js.map