/**
 * Audit Performance and Session Tracking Logger
 *
 * This module provides specialized logging for audit performance metrics,
 * session lifecycle tracking, and detailed audit workflow monitoring.
 *
 * Requirements addressed:
 * - Create logging for audit performance and session tracking
 * - Add Codex context window usage monitoring
 * - Performance and reliability monitoring
 */
import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createComponentLogger, PerformanceTimer } from '../utils/logger.js';
import { metricsCollector } from './metrics-collector.js';
/**
 * Default audit logger configuration
 */
export const DEFAULT_AUDIT_LOGGER_CONFIG = {
    enabled: true,
    logDirectory: './logs/audit',
    maxLogFileSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 10,
    logLevel: 'info',
    enablePerformanceLogging: true,
    enableSessionTracking: true,
    enableCodexContextLogging: true,
    flushInterval: 5000, // 5 seconds
    compressionEnabled: false,
};
// ============================================================================
// Audit Logger Implementation
// ============================================================================
/**
 * Specialized logger for audit performance and session tracking
 */
export class AuditLogger {
    config;
    componentLogger;
    auditLogBuffer = [];
    sessionLogBuffer = [];
    performanceLogBuffer = [];
    codexLogBuffer = [];
    flushTimer;
    isInitialized = false;
    constructor(config = {}) {
        this.config = { ...DEFAULT_AUDIT_LOGGER_CONFIG, ...config };
        this.componentLogger = createComponentLogger('audit-logger');
        if (this.config.enabled) {
            this.initialize().catch(error => {
                this.componentLogger.error('Failed to initialize audit logger', error);
            });
        }
    }
    // ============================================================================
    // Public API Methods
    // ============================================================================
    /**
     * Log audit event
     */
    logAuditEvent(eventType, sessionId, data, options) {
        if (!this.config.enabled)
            return;
        const entry = {
            timestamp: Date.now(),
            eventType,
            sessionId,
            loopId: options?.loopId,
            thoughtNumber: options?.thoughtNumber,
            data,
            duration: options?.duration,
            performance: this.capturePerformanceSnapshot(),
        };
        this.auditLogBuffer.push(entry);
        this.componentLogger.debug(`Audit event logged: ${eventType}`, { sessionId, eventType });
        // Also record in metrics collector
        this.recordMetricsEvent(eventType, sessionId, data, options);
    }
    /**
     * Log session lifecycle event
     */
    logSessionEvent(sessionId, event, data, loopId, iteration) {
        if (!this.config.enabled || !this.config.enableSessionTracking)
            return;
        const entry = {
            timestamp: Date.now(),
            sessionId,
            loopId,
            event,
            iteration,
            data,
        };
        this.sessionLogBuffer.push(entry);
        this.componentLogger.debug(`Session event logged: ${event}`, { sessionId, event });
    }
    /**
     * Log performance metric
     */
    logPerformanceMetric(category, metric, value, unit, context = {}, threshold) {
        if (!this.config.enabled || !this.config.enablePerformanceLogging)
            return;
        const exceeded = threshold !== undefined && value > threshold;
        const entry = {
            timestamp: Date.now(),
            category,
            metric,
            value,
            unit,
            threshold,
            exceeded,
            context,
        };
        this.performanceLogBuffer.push(entry);
        if (exceeded) {
            this.componentLogger.warn(`Performance threshold exceeded: ${metric}`, {
                value,
                threshold,
                unit,
                category,
            });
        }
    }
    /**
     * Log Codex context event
     */
    logCodexContextEvent(loopId, contextId, event, options) {
        if (!this.config.enabled || !this.config.enableCodexContextLogging)
            return;
        const entry = {
            timestamp: Date.now(),
            loopId,
            contextId,
            event,
            duration: options?.duration,
            resourceUsage: options?.resourceUsage,
            terminationReason: options?.terminationReason,
            error: options?.error,
        };
        this.codexLogBuffer.push(entry);
        this.componentLogger.debug(`Codex context event logged: ${event}`, { loopId, contextId, event });
        // Also record in metrics collector
        if (event === 'created') {
            metricsCollector.recordContextCreated(loopId, contextId);
        }
        else if (event === 'terminated') {
            metricsCollector.recordContextTerminated(loopId, contextId, options?.terminationReason || 'unknown');
        }
    }
    /**
     * Log audit start
     */
    logAuditStart(sessionId, thoughtNumber, loopId) {
        this.logAuditEvent('audit_started', sessionId, { thoughtNumber }, { loopId, thoughtNumber });
        return new PerformanceTimer(`audit-${sessionId}-${thoughtNumber}`, 'audit-logger');
    }
    /**
     * Log audit completion
     */
    logAuditComplete(sessionId, thoughtNumber, review, duration, loopId) {
        this.logAuditEvent('audit_completed', sessionId, {
            thoughtNumber,
            verdict: review.verdict,
            score: review.overall,
            dimensions: review.dimensions,
            iterations: review.iterations,
        }, { loopId, thoughtNumber, duration });
        // Log performance metrics
        this.logPerformanceMetric('audit', 'duration', duration, 'ms', {
            sessionId,
            thoughtNumber,
            verdict: review.verdict,
            score: review.overall,
        }, 30000); // 30 second threshold
    }
    /**
     * Log audit failure
     */
    logAuditFailure(sessionId, thoughtNumber, error, duration, loopId) {
        this.logAuditEvent('audit_failed', sessionId, {
            thoughtNumber,
            error,
        }, { loopId, thoughtNumber, duration });
    }
    /**
     * Log session creation
     */
    logSessionCreation(sessionId, config, loopId) {
        this.logSessionEvent(sessionId, 'created', {
            currentLoop: 0,
            isComplete: false,
        }, loopId);
        this.logAuditEvent('session_created', sessionId, {
            config,
            loopId,
        }, { loopId });
    }
    /**
     * Log session update
     */
    logSessionUpdate(sessionId, iteration, currentLoop, loopId) {
        this.logSessionEvent(sessionId, 'updated', {
            currentLoop,
            auditScore: iteration.auditResult?.overall,
            auditVerdict: iteration.auditResult?.verdict,
        }, loopId, iteration.thoughtNumber);
        this.logAuditEvent('session_updated', sessionId, {
            iteration: iteration.thoughtNumber,
            currentLoop,
            auditResult: iteration.auditResult,
        }, { loopId, thoughtNumber: iteration.thoughtNumber });
    }
    /**
     * Log session completion
     */
    logSessionCompletion(sessionId, totalLoops, reason, duration, loopId) {
        this.logSessionEvent(sessionId, 'completed', {
            currentLoop: totalLoops,
            isComplete: true,
            completionReason: reason,
            duration,
        }, loopId);
        this.logAuditEvent('session_completed', sessionId, {
            totalLoops,
            reason,
            duration,
        }, { loopId, duration });
        // Log performance metrics
        this.logPerformanceMetric('session', 'total_loops', totalLoops, 'loops', {
            sessionId,
            reason,
            duration,
        }, 25); // 25 loop threshold
        this.logPerformanceMetric('session', 'duration', duration, 'ms', {
            sessionId,
            totalLoops,
            reason,
        });
    }
    /**
     * Log stagnation detection
     */
    logStagnationDetection(sessionId, loop, similarityScore, loopId) {
        this.logSessionEvent(sessionId, 'updated', {
            currentLoop: loop,
            stagnationDetected: true,
        }, loopId);
        this.logAuditEvent('stagnation_detected', sessionId, {
            loop,
            similarityScore,
        }, { loopId });
        this.componentLogger.warn('Stagnation detected', {
            sessionId,
            loop,
            similarityScore,
        });
    }
    /**
     * Flush all log buffers to files
     */
    async flush() {
        if (!this.isInitialized)
            return;
        try {
            const promises = [];
            if (this.auditLogBuffer.length > 0) {
                promises.push(this.writeLogFile('audit', this.auditLogBuffer));
                this.auditLogBuffer = [];
            }
            if (this.sessionLogBuffer.length > 0) {
                promises.push(this.writeLogFile('session', this.sessionLogBuffer));
                this.sessionLogBuffer = [];
            }
            if (this.performanceLogBuffer.length > 0) {
                promises.push(this.writeLogFile('performance', this.performanceLogBuffer));
                this.performanceLogBuffer = [];
            }
            if (this.codexLogBuffer.length > 0) {
                promises.push(this.writeLogFile('codex', this.codexLogBuffer));
                this.codexLogBuffer = [];
            }
            await Promise.all(promises);
            this.componentLogger.debug('Log buffers flushed successfully');
        }
        catch (error) {
            this.componentLogger.error('Failed to flush log buffers', error);
        }
    }
    /**
     * Get current buffer sizes
     */
    getBufferSizes() {
        return {
            audit: this.auditLogBuffer.length,
            session: this.sessionLogBuffer.length,
            performance: this.performanceLogBuffer.length,
            codex: this.codexLogBuffer.length,
        };
    }
    /**
     * Stop the audit logger and flush remaining logs
     */
    async stop() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }
        await this.flush();
        this.componentLogger.info('Audit logger stopped');
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Initialize the audit logger
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
            this.componentLogger.info('Audit logger initialized', {
                logDirectory: this.config.logDirectory,
                flushInterval: this.config.flushInterval,
            });
        }
        catch (error) {
            this.componentLogger.error('Failed to initialize audit logger', error);
            throw error;
        }
    }
    /**
     * Write log entries to file
     */
    async writeLogFile(type, entries) {
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `${type}-${timestamp}.jsonl`;
        const filepath = join(this.config.logDirectory, filename);
        const logLines = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
        try {
            await appendFile(filepath, logLines, 'utf-8');
        }
        catch (error) {
            // If append fails, try to create the file
            await writeFile(filepath, logLines, 'utf-8');
        }
    }
    /**
     * Capture current performance snapshot
     */
    capturePerformanceSnapshot() {
        const memUsage = process.memoryUsage();
        return {
            memoryUsage: memUsage.heapUsed,
            cpuUsage: process.cpuUsage(),
        };
    }
    /**
     * Record event in metrics collector
     */
    recordMetricsEvent(eventType, sessionId, data, options) {
        switch (eventType) {
            case 'audit_started':
                if (options?.thoughtNumber !== undefined) {
                    metricsCollector.recordAuditStarted(sessionId, options.thoughtNumber);
                }
                break;
            case 'audit_completed':
                if (options?.thoughtNumber !== undefined && options?.duration !== undefined) {
                    metricsCollector.recordAuditCompleted(sessionId, options.thoughtNumber, options.duration, data.verdict || 'unknown', data.score || 0);
                }
                break;
            case 'audit_failed':
                if (options?.thoughtNumber !== undefined && options?.duration !== undefined) {
                    metricsCollector.recordAuditFailed(sessionId, options.thoughtNumber, options.duration, data.error || 'unknown error');
                }
                break;
            case 'session_created':
                metricsCollector.recordSessionCreated(sessionId, options?.loopId);
                break;
            case 'session_completed':
                if (data.totalLoops !== undefined) {
                    metricsCollector.recordSessionCompleted(sessionId, data.totalLoops, data.reason || 'completed');
                }
                break;
            case 'stagnation_detected':
                if (data.loop !== undefined && data.similarityScore !== undefined) {
                    metricsCollector.recordStagnationDetected(sessionId, data.loop, data.similarityScore);
                }
                break;
            case 'cache_hit':
                if (options?.thoughtNumber !== undefined) {
                    metricsCollector.recordCacheHit(sessionId, options.thoughtNumber);
                }
                break;
            case 'cache_miss':
                if (options?.thoughtNumber !== undefined) {
                    metricsCollector.recordCacheMiss(sessionId, options.thoughtNumber);
                }
                break;
        }
    }
}
// ============================================================================
// Global Audit Logger Instance
// ============================================================================
/**
 * Global audit logger instance
 */
export const auditLogger = new AuditLogger();
/**
 * Convenience functions for audit logging
 */
export const logAuditStart = (sessionId, thoughtNumber, loopId) => auditLogger.logAuditStart(sessionId, thoughtNumber, loopId);
export const logAuditComplete = (sessionId, thoughtNumber, review, duration, loopId) => auditLogger.logAuditComplete(sessionId, thoughtNumber, review, duration, loopId);
export const logAuditFailure = (sessionId, thoughtNumber, error, duration, loopId) => auditLogger.logAuditFailure(sessionId, thoughtNumber, error, duration, loopId);
export const logSessionCreation = (sessionId, config, loopId) => auditLogger.logSessionCreation(sessionId, config, loopId);
export const logSessionUpdate = (sessionId, iteration, currentLoop, loopId) => auditLogger.logSessionUpdate(sessionId, iteration, currentLoop, loopId);
export const logSessionCompletion = (sessionId, totalLoops, reason, duration, loopId) => auditLogger.logSessionCompletion(sessionId, totalLoops, reason, duration, loopId);
export const logStagnationDetection = (sessionId, loop, similarityScore, loopId) => auditLogger.logStagnationDetection(sessionId, loop, similarityScore, loopId);
export const logCodexContextEvent = (loopId, contextId, event, options) => auditLogger.logCodexContextEvent(loopId, contextId, event, options);
export const logPerformanceMetric = (category, metric, value, unit, context, threshold) => auditLogger.logPerformanceMetric(category, metric, value, unit, context, threshold);
//# sourceMappingURL=audit-logger.js.map