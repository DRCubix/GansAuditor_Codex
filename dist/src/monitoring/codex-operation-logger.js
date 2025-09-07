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
import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createComponentLogger } from '../utils/logger.js';
import { metricsCollector } from './metrics-collector.js';
/**
 * Default configuration for Codex operation logging
 */
export const DEFAULT_CODEX_LOGGER_CONFIG = {
    enabled: true,
    logDirectory: './logs/codex',
    maxLogFileSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 20,
    logLevel: 'info',
    enableCommandLogging: true,
    enableTimingLogging: true,
    enableErrorLogging: true,
    enableDebugLogging: process.env.NODE_ENV !== 'production' || process.env.CODEX_DEBUG === 'true',
    enablePerformanceLogging: true,
    flushInterval: 10000, // 10 seconds
    maxHistorySize: 1000,
    sensitiveArgsPatterns: [
        'password',
        'token',
        'key',
        'secret',
        'auth',
        'credential',
    ],
};
// ============================================================================
// Codex Operation Logger Implementation
// ============================================================================
/**
 * Specialized logger for Codex CLI operations
 */
export class CodexOperationLogger {
    config;
    componentLogger;
    operationHistory = [];
    logBuffer = [];
    flushTimer;
    isInitialized = false;
    nextExecutionId = 1;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CODEX_LOGGER_CONFIG, ...config };
        this.componentLogger = createComponentLogger('codex-operation-logger');
        if (this.config.enabled) {
            this.initialize().catch(error => {
                this.componentLogger.error('Failed to initialize Codex operation logger', error);
            });
        }
    }
    // ============================================================================
    // Public API Methods
    // ============================================================================
    /**
     * Start logging a Codex command execution
     * Requirement 7.1: Log all Codex CLI command executions with arguments and timing
     */
    startCommandExecution(executable, args, options, sessionId, thoughtNumber) {
        if (!this.config.enabled || !this.config.enableCommandLogging) {
            return new CodexOperationTimer('', () => { }, this.componentLogger);
        }
        const executionId = this.generateExecutionId();
        const startTime = Date.now();
        const logEntry = {
            timestamp: startTime,
            operationType: 'command_execution',
            sessionId,
            thoughtNumber,
            executionId,
            command: {
                executable,
                arguments: this.sanitizeArguments(args),
                workingDirectory: options.workingDirectory,
                timeout: options.timeout,
                environment: this.config.enableDebugLogging ?
                    this.sanitizeEnvironment(options.environment) : undefined,
            },
            timing: {
                startTime,
            },
            context: {
                activeProcesses: this.getActiveProcessCount(),
                queuedProcesses: this.getQueuedProcessCount(),
                systemMemory: this.getSystemMemoryUsage(),
                retryAttempt: 0,
                maxRetries: options.maxRetries || 0,
            },
            debug: this.config.enableDebugLogging ? {
                environmentVars: Object.keys(options.environment),
                processDetails: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    pid: process.pid,
                },
            } : undefined,
        };
        this.componentLogger.info('Codex command execution started', {
            executionId,
            executable,
            argsCount: args.length,
            workingDirectory: options.workingDirectory,
            timeout: options.timeout,
            sessionId,
            thoughtNumber,
        });
        return new CodexOperationTimer(executionId, (result) => this.completeCommandExecution(logEntry, result), this.componentLogger);
    }
    /**
     * Log Codex availability check
     * Requirement 7.1: Log all Codex CLI command executions with arguments and timing
     */
    logAvailabilityCheck(executable, success, duration, version, error) {
        if (!this.config.enabled)
            return;
        const executionId = this.generateExecutionId();
        const timestamp = Date.now();
        const logEntry = {
            timestamp,
            operationType: 'availability_check',
            executionId,
            command: {
                executable,
                arguments: ['--version'],
                workingDirectory: process.cwd(),
                timeout: 5000,
            },
            timing: {
                startTime: timestamp - duration,
                endTime: timestamp,
                duration,
            },
            result: {
                success,
                exitCode: success ? 0 : 1,
                stdout: version || '',
                stderr: error?.message || '',
            },
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                category: 'availability',
                recoverable: true,
            } : undefined,
            context: {
                systemMemory: this.getSystemMemoryUsage(),
            },
        };
        this.addLogEntry(logEntry);
        if (success) {
            this.componentLogger.info('Codex availability check passed', {
                executionId,
                executable,
                version,
                duration,
            });
        }
        else {
            this.componentLogger.warn('Codex availability check failed', {
                executionId,
                executable,
                duration,
                error: error?.message,
            });
        }
    }
    /**
     * Log audit execution with detailed context
     * Requirement 7.1: Log all Codex CLI command executions with arguments and timing
     */
    logAuditExecution(sessionId, thoughtNumber, auditRequest, duration, success, result, error) {
        if (!this.config.enabled)
            return;
        const executionId = this.generateExecutionId();
        const timestamp = Date.now();
        const logEntry = {
            timestamp,
            operationType: 'audit_execution',
            sessionId,
            thoughtNumber,
            executionId,
            timing: {
                startTime: timestamp - duration,
                endTime: timestamp,
                duration,
            },
            result: {
                success,
                stdout: success ? JSON.stringify(result, null, 2) : '',
                stderr: error?.message || '',
            },
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                category: this.categorizeError(error),
                recoverable: this.isRecoverableError(error),
            } : undefined,
            context: {
                activeProcesses: this.getActiveProcessCount(),
                systemMemory: this.getSystemMemoryUsage(),
            },
            debug: this.config.enableDebugLogging ? {
                performanceMetrics: {
                    auditRequestSize: JSON.stringify(auditRequest).length,
                    resultSize: result ? JSON.stringify(result).length : 0,
                },
            } : undefined,
        };
        this.addLogEntry(logEntry);
        if (success) {
            this.componentLogger.info('Audit execution completed', {
                executionId,
                sessionId,
                thoughtNumber,
                duration,
                resultScore: result?.overall,
                resultVerdict: result?.verdict,
            });
        }
        else {
            this.componentLogger.error('Audit execution failed', error, {
                executionId,
                sessionId,
                thoughtNumber,
                duration,
            });
        }
    }
    /**
     * Log process timeout with detailed context
     * Requirement 7.2: Add detailed error logging with context information
     */
    logProcessTimeout(executionId, timeout, processId, sessionId, thoughtNumber) {
        if (!this.config.enabled || !this.config.enableErrorLogging)
            return;
        const timestamp = Date.now();
        const logEntry = {
            timestamp,
            operationType: 'process_timeout',
            sessionId,
            thoughtNumber,
            executionId,
            timing: {
                startTime: timestamp - timeout,
                endTime: timestamp,
                duration: timeout,
            },
            result: {
                success: false,
                timedOut: true,
                processId,
            },
            error: {
                name: 'ProcessTimeoutError',
                message: `Process timed out after ${timeout}ms`,
                category: 'timeout',
                recoverable: true,
            },
            context: {
                activeProcesses: this.getActiveProcessCount(),
                queuedProcesses: this.getQueuedProcessCount(),
                systemMemory: this.getSystemMemoryUsage(),
            },
        };
        this.addLogEntry(logEntry);
        this.componentLogger.warn('Process timeout detected', {
            executionId,
            timeout,
            processId,
            sessionId,
            thoughtNumber,
        });
        // Record timeout in metrics
        metricsCollector.recordAuditTimedOut(sessionId || 'unknown', thoughtNumber || 0, timeout);
    }
    /**
     * Log error with comprehensive context
     * Requirement 7.2: Add detailed error logging with context information
     */
    logError(operationType, error, context) {
        if (!this.config.enabled || !this.config.enableErrorLogging)
            return;
        const executionId = context.executionId || this.generateExecutionId();
        const timestamp = Date.now();
        const logEntry = {
            timestamp,
            operationType,
            sessionId: context.sessionId,
            thoughtNumber: context.thoughtNumber,
            executionId,
            timing: {
                startTime: context.duration ? timestamp - context.duration : timestamp,
                endTime: timestamp,
                duration: context.duration,
            },
            result: {
                success: false,
            },
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                category: this.categorizeError(error),
                recoverable: this.isRecoverableError(error),
            },
            context: {
                activeProcesses: this.getActiveProcessCount(),
                queuedProcesses: this.getQueuedProcessCount(),
                systemMemory: this.getSystemMemoryUsage(),
                retryAttempt: context.retryAttempt,
            },
            debug: this.config.enableDebugLogging ? {
                ...context.additionalContext,
            } : undefined,
        };
        this.addLogEntry(logEntry);
        this.componentLogger.error(`Codex operation error: ${operationType}`, error, {
            executionId,
            operationType,
            sessionId: context.sessionId,
            thoughtNumber: context.thoughtNumber,
            command: context.command,
            duration: context.duration,
            retryAttempt: context.retryAttempt,
        });
    }
    /**
     * Log debug information for troubleshooting
     * Requirement 7.4: Implement debug logging for troubleshooting
     */
    logDebugInfo(operationType, message, debugData, context) {
        if (!this.config.enabled || !this.config.enableDebugLogging)
            return;
        const executionId = context?.executionId || this.generateExecutionId();
        const timestamp = Date.now();
        const logEntry = {
            timestamp,
            operationType,
            sessionId: context?.sessionId,
            thoughtNumber: context?.thoughtNumber,
            executionId,
            timing: {
                startTime: timestamp,
            },
            result: {
                success: true,
            },
            context: {
                activeProcesses: this.getActiveProcessCount(),
                queuedProcesses: this.getQueuedProcessCount(),
                systemMemory: this.getSystemMemoryUsage(),
            },
            debug: debugData,
        };
        this.addLogEntry(logEntry);
        this.componentLogger.debug(`Codex debug: ${message}`, {
            executionId,
            operationType,
            sessionId: context?.sessionId,
            thoughtNumber: context?.thoughtNumber,
            ...debugData,
        });
    }
    /**
     * Get operation statistics
     */
    getOperationStatistics() {
        const operations = this.operationHistory;
        const durations = operations
            .filter(op => op.timing.duration !== undefined)
            .map(op => op.timing.duration)
            .sort((a, b) => a - b);
        const operationsByType = operations.reduce((acc, op) => {
            acc[op.operationType] = (acc[op.operationType] || 0) + 1;
            return acc;
        }, {});
        const successfulOps = operations.filter(op => op.result?.success === true).length;
        const timedOutOps = operations.filter(op => op.result?.timedOut === true).length;
        const retriedOps = operations.filter(op => (op.context.retryAttempt || 0) > 0).length;
        const errorsByCategory = operations
            .filter(op => op.error)
            .reduce((acc, op) => {
            const category = op.error.category || 'unknown';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        const recentFailures = operations
            .filter(op => !op.result?.success && (Date.now() - op.timestamp) < 300000) // Last 5 minutes
            .slice(-10);
        return {
            totalOperations: operations.length,
            operationsByType,
            successRate: operations.length > 0 ? successfulOps / operations.length : 0,
            averageDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
            timeoutRate: operations.length > 0 ? timedOutOps / operations.length : 0,
            retryRate: operations.length > 0 ? retriedOps / operations.length : 0,
            errorsByCategory,
            recentFailures,
            performanceMetrics: {
                fastestOperation: durations.length > 0 ? durations[0] : 0,
                slowestOperation: durations.length > 0 ? durations[durations.length - 1] : 0,
                p50Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0,
                p95Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
                p99Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
            },
        };
    }
    /**
     * Get recent command summaries
     */
    getRecentCommandSummaries(limit = 10) {
        return this.operationHistory
            .filter(op => op.operationType === 'command_execution' && op.command)
            .slice(-limit)
            .map(op => ({
            executionId: op.executionId,
            command: op.command.executable,
            arguments: op.command.arguments,
            duration: op.timing.duration || 0,
            success: op.result?.success || false,
            exitCode: op.result?.exitCode,
            outputSize: {
                stdout: op.result?.stdout?.length || 0,
                stderr: op.result?.stderr?.length || 0,
            },
            retries: op.context.retryAttempt || 0,
            timedOut: op.result?.timedOut || false,
        }));
    }
    /**
     * Flush log buffer to files
     */
    async flush() {
        if (!this.isInitialized || this.logBuffer.length === 0)
            return;
        try {
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const filename = `codex-operations-${timestamp}.jsonl`;
            const filepath = join(this.config.logDirectory, filename);
            const logLines = this.logBuffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
            try {
                await appendFile(filepath, logLines, 'utf-8');
            }
            catch (error) {
                // If append fails, try to create the file
                await writeFile(filepath, logLines, 'utf-8');
            }
            this.logBuffer = [];
            this.componentLogger.debug('Codex operation log buffer flushed', {
                filename,
                entriesCount: this.logBuffer.length,
            });
        }
        catch (error) {
            this.componentLogger.error('Failed to flush Codex operation log buffer', error);
        }
    }
    /**
     * Stop the logger and flush remaining logs
     */
    async stop() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }
        await this.flush();
        this.componentLogger.info('Codex operation logger stopped');
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Initialize the logger
     */
    async initialize() {
        try {
            // Ensure log directory exists
            if (!existsSync(this.config.logDirectory)) {
                await mkdir(this.config.logDirectory, { recursive: true });
            }
            // Start periodic flush
            this.flushTimer = setInterval(() => {
                this.flush().catch(error => {
                    this.componentLogger.error('Periodic flush failed', error);
                });
            }, this.config.flushInterval);
            this.isInitialized = true;
            this.componentLogger.info('Codex operation logger initialized', {
                logDirectory: this.config.logDirectory,
                flushInterval: this.config.flushInterval,
                enableDebugLogging: this.config.enableDebugLogging,
            });
        }
        catch (error) {
            this.componentLogger.error('Failed to initialize Codex operation logger', error);
            throw error;
        }
    }
    /**
     * Complete command execution logging
     */
    completeCommandExecution(logEntry, result) {
        const endTime = Date.now();
        const duration = endTime - logEntry.timing.startTime;
        logEntry.timing.endTime = endTime;
        logEntry.timing.duration = duration;
        logEntry.result = {
            success: result.exitCode === 0 && !result.timedOut,
            exitCode: result.exitCode,
            stdout: this.truncateOutput(result.stdout),
            stderr: this.truncateOutput(result.stderr),
            timedOut: result.timedOut,
            processId: result.processId,
        };
        // Add performance metrics if enabled
        if (this.config.enablePerformanceLogging && logEntry.debug) {
            logEntry.debug.performanceMetrics = {
                executionTime: result.executionTime,
                stdoutSize: result.stdout.length,
                stderrSize: result.stderr.length,
                memoryUsage: this.getSystemMemoryUsage(),
            };
        }
        this.addLogEntry(logEntry);
        if (result.exitCode === 0 && !result.timedOut) {
            this.componentLogger.info('Codex command execution completed', {
                executionId: logEntry.executionId,
                duration,
                exitCode: result.exitCode,
                stdoutSize: result.stdout.length,
                stderrSize: result.stderr.length,
            });
        }
        else {
            this.componentLogger.warn('Codex command execution failed', {
                executionId: logEntry.executionId,
                duration,
                exitCode: result.exitCode,
                timedOut: result.timedOut,
                stderrPreview: result.stderr.substring(0, 200),
            });
        }
    }
    /**
     * Add log entry to buffer and history
     */
    addLogEntry(entry) {
        this.logBuffer.push(entry);
        this.operationHistory.push(entry);
        // Maintain history size limit
        if (this.operationHistory.length > this.config.maxHistorySize) {
            this.operationHistory = this.operationHistory.slice(-this.config.maxHistorySize);
        }
    }
    /**
     * Generate unique execution ID
     */
    generateExecutionId() {
        return `codex-${Date.now()}-${this.nextExecutionId++}`;
    }
    /**
     * Sanitize command arguments to remove sensitive information
     */
    sanitizeArguments(args) {
        return args.map(arg => {
            for (const pattern of this.config.sensitiveArgsPatterns) {
                if (arg.toLowerCase().includes(pattern)) {
                    return '[REDACTED]';
                }
            }
            return arg;
        });
    }
    /**
     * Sanitize environment variables
     */
    sanitizeEnvironment(env) {
        const sanitized = {};
        for (const [key, value] of Object.entries(env)) {
            const lowerKey = key.toLowerCase();
            let shouldRedact = false;
            for (const pattern of this.config.sensitiveArgsPatterns) {
                if (lowerKey.includes(pattern)) {
                    shouldRedact = true;
                    break;
                }
            }
            sanitized[key] = shouldRedact ? '[REDACTED]' : value;
        }
        return sanitized;
    }
    /**
     * Truncate output for logging
     */
    truncateOutput(output, maxLength = 1000) {
        if (output.length <= maxLength) {
            return output;
        }
        return output.substring(0, maxLength) + '... [truncated]';
    }
    /**
     * Categorize error for better organization
     */
    categorizeError(error) {
        const message = error.message.toLowerCase();
        const name = error.name.toLowerCase();
        if (name.includes('timeout') || message.includes('timeout')) {
            return 'timeout';
        }
        if (name.includes('notfound') || message.includes('not found') || message.includes('enoent')) {
            return 'not_found';
        }
        if (name.includes('permission') || message.includes('permission') || message.includes('eacces')) {
            return 'permission';
        }
        if (name.includes('network') || message.includes('network') || message.includes('connection')) {
            return 'network';
        }
        if (name.includes('parse') || message.includes('parse') || message.includes('json')) {
            return 'parsing';
        }
        if (name.includes('validation') || message.includes('validation')) {
            return 'validation';
        }
        return 'unknown';
    }
    /**
     * Determine if error is recoverable
     */
    isRecoverableError(error) {
        const category = this.categorizeError(error);
        const recoverableCategories = ['timeout', 'network', 'parsing'];
        return recoverableCategories.includes(category);
    }
    /**
     * Get active process count (placeholder - should be injected from ProcessManager)
     */
    getActiveProcessCount() {
        // This would be injected from ProcessManager in real implementation
        return 0;
    }
    /**
     * Get queued process count (placeholder - should be injected from ProcessManager)
     */
    getQueuedProcessCount() {
        // This would be injected from ProcessManager in real implementation
        return 0;
    }
    /**
     * Get system memory usage
     */
    getSystemMemoryUsage() {
        const memUsage = process.memoryUsage();
        return Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    }
}
// ============================================================================
// Codex Operation Timer
// ============================================================================
/**
 * Timer for tracking Codex operation execution
 */
export class CodexOperationTimer {
    executionId;
    onComplete;
    logger;
    startTime;
    constructor(executionId, onComplete, logger) {
        this.executionId = executionId;
        this.onComplete = onComplete;
        this.logger = logger;
        this.startTime = Date.now();
    }
    /**
     * Complete the operation with success
     */
    complete(result) {
        result.executionTime = Date.now() - this.startTime;
        this.onComplete(result);
    }
    /**
     * Complete the operation with error
     */
    completeWithError(error) {
        const result = {
            stdout: '',
            stderr: error.message,
            exitCode: -1,
            executionTime: Date.now() - this.startTime,
            timedOut: error.name === 'CodexTimeoutError',
        };
        this.onComplete(result);
    }
    /**
     * Get execution ID
     */
    getExecutionId() {
        return this.executionId;
    }
    /**
     * Get elapsed time
     */
    getElapsedTime() {
        return Date.now() - this.startTime;
    }
}
// ============================================================================
// Global Instance and Exports
// ============================================================================
/**
 * Global Codex operation logger instance
 */
export const codexOperationLogger = new CodexOperationLogger();
/**
 * Convenience functions for Codex operation logging
 */
export const logCodexCommand = (executable, args, options, sessionId, thoughtNumber) => codexOperationLogger.startCommandExecution(executable, args, options, sessionId, thoughtNumber);
export const logCodexAvailability = (executable, success, duration, version, error) => codexOperationLogger.logAvailabilityCheck(executable, success, duration, version, error);
export const logCodexAudit = (sessionId, thoughtNumber, auditRequest, duration, success, result, error) => codexOperationLogger.logAuditExecution(sessionId, thoughtNumber, auditRequest, duration, success, result, error);
export const logCodexTimeout = (executionId, timeout, processId, sessionId, thoughtNumber) => codexOperationLogger.logProcessTimeout(executionId, timeout, processId, sessionId, thoughtNumber);
export const logCodexError = (operationType, error, context) => codexOperationLogger.logError(operationType, error, context);
export const logCodexDebug = (operationType, message, debugData, context) => codexOperationLogger.logDebugInfo(operationType, message, debugData, context);
//# sourceMappingURL=codex-operation-logger.js.map