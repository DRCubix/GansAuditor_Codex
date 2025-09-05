/**
 * Metrics Collector for Synchronous Audit Workflow
 *
 * This module provides comprehensive metrics collection for monitoring
 * completion rates, loop statistics, audit performance, and system health.
 *
 * Requirements addressed:
 * - Add metrics for completion rates and loop statistics
 * - Create logging for audit performance and session tracking
 * - Add Codex context window usage monitoring
 */
import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger.js';
// ============================================================================
// Metrics Collector Implementation
// ============================================================================
/**
 * Comprehensive metrics collector for synchronous audit workflow
 */
export class MetricsCollector extends EventEmitter {
    componentLogger;
    startTime;
    // Metric storage
    completionMetrics = {
        totalAudits: 0,
        completedAudits: 0,
        failedAudits: 0,
        timedOutAudits: 0,
        completionRate: 0,
        averageLoopsToCompletion: 0,
        completionsByTier: {
            tier1: 0,
            tier2: 0,
            tier3: 0,
            hardStop: 0,
        },
    };
    loopStatistics = {
        totalLoops: 0,
        averageLoopsPerSession: 0,
        maxLoopsReached: 0,
        stagnationDetections: 0,
        stagnationRate: 0,
        loopDistribution: {},
        improvementTrends: {
            improving: 0,
            stagnant: 0,
            declining: 0,
        },
    };
    performanceMetrics = {
        averageAuditDuration: 0,
        medianAuditDuration: 0,
        p95AuditDuration: 0,
        p99AuditDuration: 0,
        totalAuditTime: 0,
        cacheHitRate: 0,
        queueWaitTime: 0,
        concurrentAudits: 0,
        maxConcurrentAudits: 0,
    };
    sessionMetrics = {
        activeSessions: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        sessionsByStatus: {
            active: 0,
            completed: 0,
            failed: 0,
            abandoned: 0,
        },
        averageIterationsPerSession: 0,
        sessionCreationRate: 0,
    };
    codexMetrics = {
        activeContexts: 0,
        totalContextsCreated: 0,
        contextCreationRate: 0,
        averageContextDuration: 0,
        contextsByStatus: {
            active: 0,
            terminated: 0,
            failed: 0,
        },
        contextTerminationReasons: {},
        contextResourceUsage: {
            memoryUsage: 0,
            cpuUsage: 0,
        },
    };
    healthMetrics = {
        uptime: 0,
        memoryUsage: {
            used: 0,
            total: 0,
            percentage: 0,
        },
        errorRate: 0,
        responseTime: 0,
        serviceAvailability: 100,
        lastHealthCheck: Date.now(),
    };
    // Tracking data
    auditDurations = [];
    sessionStartTimes = new Map();
    contextStartTimes = new Map();
    activeAudits = new Set();
    errorCount = 0;
    lastErrorTime = 0;
    // Configuration
    maxStoredDurations = 1000;
    metricsRetentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
    constructor() {
        super();
        this.componentLogger = createComponentLogger('metrics-collector');
        this.startTime = Date.now();
        // Initialize metrics
        this.initializeMetrics();
        // Set up event listeners
        this.setupEventListeners();
        // Start periodic health checks
        this.startHealthChecks();
        this.componentLogger.info('Metrics collector initialized');
    }
    // ============================================================================
    // Public API Methods
    // ============================================================================
    /**
     * Get current metrics snapshot
     */
    getMetricsSnapshot() {
        this.updateCalculatedMetrics();
        return {
            timestamp: Date.now(),
            completion: { ...this.completionMetrics },
            loops: { ...this.loopStatistics },
            performance: { ...this.performanceMetrics },
            sessions: { ...this.sessionMetrics },
            codex: { ...this.codexMetrics },
            health: { ...this.healthMetrics },
        };
    }
    /**
     * Get specific metric category
     */
    getCompletionMetrics() {
        this.updateCompletionMetrics();
        return { ...this.completionMetrics };
    }
    getLoopStatistics() {
        this.updateLoopStatistics();
        return { ...this.loopStatistics };
    }
    getPerformanceMetrics() {
        this.updatePerformanceMetrics();
        return { ...this.performanceMetrics };
    }
    getSessionMetrics() {
        this.updateSessionMetrics();
        return { ...this.sessionMetrics };
    }
    getCodexMetrics() {
        this.updateCodexMetrics();
        return { ...this.codexMetrics };
    }
    getHealthMetrics() {
        this.updateHealthMetrics();
        return { ...this.healthMetrics };
    }
    /**
     * Record audit events
     */
    recordAuditStarted(sessionId, thoughtNumber) {
        const auditKey = `${sessionId}-${thoughtNumber}`;
        this.activeAudits.add(auditKey);
        this.emit('auditStarted', { sessionId, thoughtNumber, timestamp: Date.now() });
        this.componentLogger.debug('Audit started', { sessionId, thoughtNumber });
    }
    recordAuditCompleted(sessionId, thoughtNumber, duration, verdict, score) {
        const auditKey = `${sessionId}-${thoughtNumber}`;
        this.activeAudits.delete(auditKey);
        // Store duration for performance metrics
        this.auditDurations.push(duration);
        if (this.auditDurations.length > this.maxStoredDurations) {
            this.auditDurations = this.auditDurations.slice(-this.maxStoredDurations);
        }
        // Update completion metrics
        this.completionMetrics.totalAudits++;
        this.completionMetrics.completedAudits++;
        this.performanceMetrics.totalAuditTime += duration;
        this.emit('auditCompleted', { sessionId, thoughtNumber, duration, verdict, score });
        this.componentLogger.debug('Audit completed', { sessionId, thoughtNumber, duration, verdict, score });
    }
    recordAuditFailed(sessionId, thoughtNumber, duration, error) {
        const auditKey = `${sessionId}-${thoughtNumber}`;
        this.activeAudits.delete(auditKey);
        this.completionMetrics.totalAudits++;
        this.completionMetrics.failedAudits++;
        this.errorCount++;
        this.lastErrorTime = Date.now();
        this.emit('auditFailed', { sessionId, thoughtNumber, duration, error });
        this.componentLogger.warn('Audit failed', { sessionId, thoughtNumber, duration, error });
    }
    recordAuditTimedOut(sessionId, thoughtNumber, duration) {
        const auditKey = `${sessionId}-${thoughtNumber}`;
        this.activeAudits.delete(auditKey);
        this.completionMetrics.totalAudits++;
        this.completionMetrics.timedOutAudits++;
        this.emit('auditTimedOut', { sessionId, thoughtNumber, duration });
        this.componentLogger.warn('Audit timed out', { sessionId, thoughtNumber, duration });
    }
    /**
     * Record session events
     */
    recordSessionCreated(sessionId, loopId) {
        this.sessionStartTimes.set(sessionId, Date.now());
        this.sessionMetrics.totalSessions++;
        this.sessionMetrics.sessionsByStatus.active++;
        this.emit('sessionCreated', { sessionId, loopId, timestamp: Date.now() });
        this.componentLogger.debug('Session created', { sessionId, loopId });
    }
    recordSessionUpdated(sessionId, iteration) {
        this.emit('sessionUpdated', { sessionId, iteration, timestamp: Date.now() });
        this.componentLogger.debug('Session updated', { sessionId, thoughtNumber: iteration.thoughtNumber });
    }
    recordSessionCompleted(sessionId, totalLoops, reason) {
        const startTime = this.sessionStartTimes.get(sessionId);
        const duration = startTime ? Date.now() - startTime : 0;
        this.sessionStartTimes.delete(sessionId);
        this.sessionMetrics.sessionsByStatus.active--;
        if (reason === 'completed') {
            this.sessionMetrics.sessionsByStatus.completed++;
            // Update completion tier metrics
            if (totalLoops <= 10) {
                this.completionMetrics.completionsByTier.tier1++;
            }
            else if (totalLoops <= 15) {
                this.completionMetrics.completionsByTier.tier2++;
            }
            else if (totalLoops <= 20) {
                this.completionMetrics.completionsByTier.tier3++;
            }
            else {
                this.completionMetrics.completionsByTier.hardStop++;
            }
        }
        else if (reason === 'failed') {
            this.sessionMetrics.sessionsByStatus.failed++;
        }
        else {
            this.sessionMetrics.sessionsByStatus.abandoned++;
        }
        // Update loop statistics
        this.loopStatistics.totalLoops += totalLoops;
        this.loopStatistics.maxLoopsReached = Math.max(this.loopStatistics.maxLoopsReached, totalLoops);
        // Update loop distribution
        this.loopStatistics.loopDistribution[totalLoops] =
            (this.loopStatistics.loopDistribution[totalLoops] || 0) + 1;
        this.emit('sessionCompleted', { sessionId, totalLoops, duration, reason });
        this.componentLogger.info('Session completed', { sessionId, totalLoops, duration, reason });
    }
    recordStagnationDetected(sessionId, loop, similarityScore) {
        this.loopStatistics.stagnationDetections++;
        this.emit('stagnationDetected', { sessionId, loop, similarityScore });
        this.componentLogger.warn('Stagnation detected', { sessionId, loop, similarityScore });
    }
    /**
     * Record Codex context events
     */
    recordContextCreated(loopId, contextId) {
        this.contextStartTimes.set(contextId, Date.now());
        this.codexMetrics.totalContextsCreated++;
        this.codexMetrics.contextsByStatus.active++;
        this.emit('contextCreated', { loopId, contextId, timestamp: Date.now() });
        this.componentLogger.debug('Codex context created', { loopId, contextId });
    }
    recordContextTerminated(loopId, contextId, reason) {
        const startTime = this.contextStartTimes.get(contextId);
        const duration = startTime ? Date.now() - startTime : 0;
        this.contextStartTimes.delete(contextId);
        this.codexMetrics.contextsByStatus.active--;
        if (reason === 'failed') {
            this.codexMetrics.contextsByStatus.failed++;
        }
        else {
            this.codexMetrics.contextsByStatus.terminated++;
        }
        // Update termination reasons
        this.codexMetrics.contextTerminationReasons[reason] =
            (this.codexMetrics.contextTerminationReasons[reason] || 0) + 1;
        this.emit('contextTerminated', { loopId, contextId, reason, duration });
        this.componentLogger.debug('Codex context terminated', { loopId, contextId, reason, duration });
    }
    /**
     * Record cache events
     */
    recordCacheHit(sessionId, thoughtNumber) {
        this.emit('cacheHit', { sessionId, thoughtNumber });
        this.componentLogger.debug('Cache hit', { sessionId, thoughtNumber });
    }
    recordCacheMiss(sessionId, thoughtNumber) {
        this.emit('cacheMiss', { sessionId, thoughtNumber });
        this.componentLogger.debug('Cache miss', { sessionId, thoughtNumber });
    }
    /**
     * Record queue events
     */
    recordQueueEnqueued(sessionId, queueSize) {
        this.emit('queueEnqueued', { sessionId, queueSize });
        this.componentLogger.debug('Audit enqueued', { sessionId, queueSize });
    }
    recordQueueDequeued(sessionId, waitTime) {
        this.emit('queueDequeued', { sessionId, waitTime });
        this.componentLogger.debug('Audit dequeued', { sessionId, waitTime });
    }
    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.initializeMetrics();
        this.auditDurations = [];
        this.sessionStartTimes.clear();
        this.contextStartTimes.clear();
        this.activeAudits.clear();
        this.errorCount = 0;
        this.lastErrorTime = 0;
        this.componentLogger.info('Metrics reset');
    }
    /**
     * Get metrics summary for logging
     */
    getMetricsSummary() {
        const snapshot = this.getMetricsSnapshot();
        return [
            `Completion: ${snapshot.completion.completionRate.toFixed(1)}% (${snapshot.completion.completedAudits}/${snapshot.completion.totalAudits})`,
            `Avg Loops: ${snapshot.loops.averageLoopsPerSession.toFixed(1)}`,
            `Stagnation: ${snapshot.loops.stagnationRate.toFixed(1)}%`,
            `Avg Duration: ${snapshot.performance.averageAuditDuration.toFixed(0)}ms`,
            `Cache Hit: ${snapshot.performance.cacheHitRate.toFixed(1)}%`,
            `Active Sessions: ${snapshot.sessions.activeSessions}`,
            `Active Contexts: ${snapshot.codex.activeContexts}`,
        ].join(', ');
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    initializeMetrics() {
        this.completionMetrics = {
            totalAudits: 0,
            completedAudits: 0,
            failedAudits: 0,
            timedOutAudits: 0,
            completionRate: 0,
            averageLoopsToCompletion: 0,
            completionsByTier: {
                tier1: 0,
                tier2: 0,
                tier3: 0,
                hardStop: 0,
            },
        };
        this.loopStatistics = {
            totalLoops: 0,
            averageLoopsPerSession: 0,
            maxLoopsReached: 0,
            stagnationDetections: 0,
            stagnationRate: 0,
            loopDistribution: {},
            improvementTrends: {
                improving: 0,
                stagnant: 0,
                declining: 0,
            },
        };
        this.performanceMetrics = {
            averageAuditDuration: 0,
            medianAuditDuration: 0,
            p95AuditDuration: 0,
            p99AuditDuration: 0,
            totalAuditTime: 0,
            cacheHitRate: 0,
            queueWaitTime: 0,
            concurrentAudits: 0,
            maxConcurrentAudits: 0,
        };
        this.sessionMetrics = {
            activeSessions: 0,
            totalSessions: 0,
            averageSessionDuration: 0,
            sessionsByStatus: {
                active: 0,
                completed: 0,
                failed: 0,
                abandoned: 0,
            },
            averageIterationsPerSession: 0,
            sessionCreationRate: 0,
        };
        this.codexMetrics = {
            activeContexts: 0,
            totalContextsCreated: 0,
            contextCreationRate: 0,
            averageContextDuration: 0,
            contextsByStatus: {
                active: 0,
                terminated: 0,
                failed: 0,
            },
            contextTerminationReasons: {},
            contextResourceUsage: {
                memoryUsage: 0,
                cpuUsage: 0,
            },
        };
        this.healthMetrics = {
            uptime: 0,
            memoryUsage: {
                used: 0,
                total: 0,
                percentage: 0,
            },
            errorRate: 0,
            responseTime: 0,
            serviceAvailability: 100,
            lastHealthCheck: Date.now(),
        };
    }
    setupEventListeners() {
        // Listen to our own events for additional processing
        this.on('auditStarted', () => {
            this.performanceMetrics.concurrentAudits = this.activeAudits.size;
            this.performanceMetrics.maxConcurrentAudits = Math.max(this.performanceMetrics.maxConcurrentAudits, this.activeAudits.size);
        });
        this.on('sessionCreated', () => {
            this.sessionMetrics.activeSessions = this.sessionStartTimes.size;
        });
        this.on('contextCreated', () => {
            this.codexMetrics.activeContexts = this.contextStartTimes.size;
        });
    }
    updateCalculatedMetrics() {
        this.updateCompletionMetrics();
        this.updateLoopStatistics();
        this.updatePerformanceMetrics();
        this.updateSessionMetrics();
        this.updateCodexMetrics();
        this.updateHealthMetrics();
    }
    updateCompletionMetrics() {
        if (this.completionMetrics.totalAudits > 0) {
            this.completionMetrics.completionRate =
                (this.completionMetrics.completedAudits / this.completionMetrics.totalAudits) * 100;
        }
        const totalCompletedSessions = this.completionMetrics.completionsByTier.tier1 +
            this.completionMetrics.completionsByTier.tier2 +
            this.completionMetrics.completionsByTier.tier3 +
            this.completionMetrics.completionsByTier.hardStop;
        if (totalCompletedSessions > 0) {
            const weightedLoops = (this.completionMetrics.completionsByTier.tier1 * 10) +
                (this.completionMetrics.completionsByTier.tier2 * 15) +
                (this.completionMetrics.completionsByTier.tier3 * 20) +
                (this.completionMetrics.completionsByTier.hardStop * 25);
            this.completionMetrics.averageLoopsToCompletion = weightedLoops / totalCompletedSessions;
        }
    }
    updateLoopStatistics() {
        const totalSessions = this.sessionMetrics.sessionsByStatus.completed +
            this.sessionMetrics.sessionsByStatus.failed +
            this.sessionMetrics.sessionsByStatus.abandoned;
        if (totalSessions > 0) {
            this.loopStatistics.averageLoopsPerSession = this.loopStatistics.totalLoops / totalSessions;
            this.loopStatistics.stagnationRate = (this.loopStatistics.stagnationDetections / totalSessions) * 100;
        }
    }
    updatePerformanceMetrics() {
        if (this.auditDurations.length > 0) {
            const sorted = [...this.auditDurations].sort((a, b) => a - b);
            this.performanceMetrics.averageAuditDuration =
                this.auditDurations.reduce((sum, duration) => sum + duration, 0) / this.auditDurations.length;
            this.performanceMetrics.medianAuditDuration =
                sorted[Math.floor(sorted.length / 2)];
            this.performanceMetrics.p95AuditDuration =
                sorted[Math.floor(sorted.length * 0.95)];
            this.performanceMetrics.p99AuditDuration =
                sorted[Math.floor(sorted.length * 0.99)];
        }
        this.performanceMetrics.concurrentAudits = this.activeAudits.size;
    }
    updateSessionMetrics() {
        this.sessionMetrics.activeSessions = this.sessionStartTimes.size;
        const uptime = Date.now() - this.startTime;
        if (uptime > 0) {
            this.sessionMetrics.sessionCreationRate =
                (this.sessionMetrics.totalSessions / uptime) * (60 * 60 * 1000); // per hour
        }
    }
    updateCodexMetrics() {
        this.codexMetrics.activeContexts = this.contextStartTimes.size;
        const uptime = Date.now() - this.startTime;
        if (uptime > 0) {
            this.codexMetrics.contextCreationRate =
                (this.codexMetrics.totalContextsCreated / uptime) * (60 * 60 * 1000); // per hour
        }
    }
    updateHealthMetrics() {
        this.healthMetrics.uptime = Date.now() - this.startTime;
        this.healthMetrics.lastHealthCheck = Date.now();
        // Calculate error rate (errors per minute)
        const timeSinceLastError = Date.now() - this.lastErrorTime;
        const minutesSinceLastError = timeSinceLastError / (60 * 1000);
        if (minutesSinceLastError < 60) { // Only count recent errors
            this.healthMetrics.errorRate = this.errorCount / Math.max(minutesSinceLastError, 1);
        }
        else {
            this.healthMetrics.errorRate = 0;
        }
        // Update memory usage
        const memUsage = process.memoryUsage();
        this.healthMetrics.memoryUsage = {
            used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        };
        // Calculate service availability
        const totalRequests = this.completionMetrics.totalAudits;
        const successfulRequests = this.completionMetrics.completedAudits;
        if (totalRequests > 0) {
            this.healthMetrics.serviceAvailability = (successfulRequests / totalRequests) * 100;
        }
    }
    startHealthChecks() {
        // Perform health check every 30 seconds
        setInterval(() => {
            this.updateHealthMetrics();
            // Log metrics summary periodically
            if (this.completionMetrics.totalAudits > 0) {
                this.componentLogger.info('Metrics summary', {
                    summary: this.getMetricsSummary(),
                    uptime: this.healthMetrics.uptime,
                    memoryUsage: this.healthMetrics.memoryUsage.percentage.toFixed(1) + '%',
                });
            }
        }, 30000);
    }
}
// ============================================================================
// Global Metrics Instance
// ============================================================================
/**
 * Global metrics collector instance
 */
export const metricsCollector = new MetricsCollector();
/**
 * Convenience functions for recording metrics
 */
export const recordAuditStarted = (sessionId, thoughtNumber) => metricsCollector.recordAuditStarted(sessionId, thoughtNumber);
export const recordAuditCompleted = (sessionId, thoughtNumber, duration, verdict, score) => metricsCollector.recordAuditCompleted(sessionId, thoughtNumber, duration, verdict, score);
export const recordAuditFailed = (sessionId, thoughtNumber, duration, error) => metricsCollector.recordAuditFailed(sessionId, thoughtNumber, duration, error);
export const recordSessionCreated = (sessionId, loopId) => metricsCollector.recordSessionCreated(sessionId, loopId);
export const recordSessionCompleted = (sessionId, totalLoops, reason) => metricsCollector.recordSessionCompleted(sessionId, totalLoops, reason);
export const recordStagnationDetected = (sessionId, loop, similarityScore) => metricsCollector.recordStagnationDetected(sessionId, loop, similarityScore);
export const recordContextCreated = (loopId, contextId) => metricsCollector.recordContextCreated(loopId, contextId);
export const recordContextTerminated = (loopId, contextId, reason) => metricsCollector.recordContextTerminated(loopId, contextId, reason);
//# sourceMappingURL=metrics-collector.js.map