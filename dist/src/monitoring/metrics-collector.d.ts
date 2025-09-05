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
import type { IterationData } from '../types/gan-types.js';
/**
 * Audit completion metrics
 */
export interface CompletionMetrics {
    totalAudits: number;
    completedAudits: number;
    failedAudits: number;
    timedOutAudits: number;
    completionRate: number;
    averageLoopsToCompletion: number;
    completionsByTier: {
        tier1: number;
        tier2: number;
        tier3: number;
        hardStop: number;
    };
}
/**
 * Loop statistics metrics
 */
export interface LoopStatistics {
    totalLoops: number;
    averageLoopsPerSession: number;
    maxLoopsReached: number;
    stagnationDetections: number;
    stagnationRate: number;
    loopDistribution: Record<number, number>;
    improvementTrends: {
        improving: number;
        stagnant: number;
        declining: number;
    };
}
/**
 * Audit performance metrics
 */
export interface AuditPerformanceMetrics {
    averageAuditDuration: number;
    medianAuditDuration: number;
    p95AuditDuration: number;
    p99AuditDuration: number;
    totalAuditTime: number;
    cacheHitRate: number;
    queueWaitTime: number;
    concurrentAudits: number;
    maxConcurrentAudits: number;
}
/**
 * Session tracking metrics
 */
export interface SessionTrackingMetrics {
    activeSessions: number;
    totalSessions: number;
    averageSessionDuration: number;
    sessionsByStatus: {
        active: number;
        completed: number;
        failed: number;
        abandoned: number;
    };
    averageIterationsPerSession: number;
    sessionCreationRate: number;
}
/**
 * Codex context window metrics
 */
export interface CodexContextMetrics {
    activeContexts: number;
    totalContextsCreated: number;
    contextCreationRate: number;
    averageContextDuration: number;
    contextsByStatus: {
        active: number;
        terminated: number;
        failed: number;
    };
    contextTerminationReasons: Record<string, number>;
    contextResourceUsage: {
        memoryUsage: number;
        cpuUsage: number;
    };
}
/**
 * System health metrics
 */
export interface SystemHealthMetrics {
    uptime: number;
    memoryUsage: {
        used: number;
        total: number;
        percentage: number;
    };
    errorRate: number;
    responseTime: number;
    serviceAvailability: number;
    lastHealthCheck: number;
}
/**
 * Comprehensive metrics snapshot
 */
export interface MetricsSnapshot {
    timestamp: number;
    completion: CompletionMetrics;
    loops: LoopStatistics;
    performance: AuditPerformanceMetrics;
    sessions: SessionTrackingMetrics;
    codex: CodexContextMetrics;
    health: SystemHealthMetrics;
}
/**
 * Metric event types
 */
export interface MetricEvents {
    auditStarted: {
        sessionId: string;
        thoughtNumber: number;
        timestamp: number;
    };
    auditCompleted: {
        sessionId: string;
        thoughtNumber: number;
        duration: number;
        verdict: string;
        score: number;
    };
    auditFailed: {
        sessionId: string;
        thoughtNumber: number;
        duration: number;
        error: string;
    };
    auditTimedOut: {
        sessionId: string;
        thoughtNumber: number;
        duration: number;
    };
    sessionCreated: {
        sessionId: string;
        loopId?: string;
        timestamp: number;
    };
    sessionUpdated: {
        sessionId: string;
        iteration: IterationData;
        timestamp: number;
    };
    sessionCompleted: {
        sessionId: string;
        totalLoops: number;
        duration: number;
        reason: string;
    };
    stagnationDetected: {
        sessionId: string;
        loop: number;
        similarityScore: number;
    };
    contextCreated: {
        loopId: string;
        contextId: string;
        timestamp: number;
    };
    contextTerminated: {
        loopId: string;
        contextId: string;
        reason: string;
        duration: number;
    };
    cacheHit: {
        sessionId: string;
        thoughtNumber: number;
    };
    cacheMiss: {
        sessionId: string;
        thoughtNumber: number;
    };
    queueEnqueued: {
        sessionId: string;
        queueSize: number;
    };
    queueDequeued: {
        sessionId: string;
        waitTime: number;
    };
}
/**
 * Comprehensive metrics collector for synchronous audit workflow
 */
export declare class MetricsCollector extends EventEmitter {
    private readonly componentLogger;
    private readonly startTime;
    private completionMetrics;
    private loopStatistics;
    private performanceMetrics;
    private sessionMetrics;
    private codexMetrics;
    private healthMetrics;
    private auditDurations;
    private sessionStartTimes;
    private contextStartTimes;
    private activeAudits;
    private errorCount;
    private lastErrorTime;
    private readonly maxStoredDurations;
    private readonly metricsRetentionPeriod;
    constructor();
    /**
     * Get current metrics snapshot
     */
    getMetricsSnapshot(): MetricsSnapshot;
    /**
     * Get specific metric category
     */
    getCompletionMetrics(): CompletionMetrics;
    getLoopStatistics(): LoopStatistics;
    getPerformanceMetrics(): AuditPerformanceMetrics;
    getSessionMetrics(): SessionTrackingMetrics;
    getCodexMetrics(): CodexContextMetrics;
    getHealthMetrics(): SystemHealthMetrics;
    /**
     * Record audit events
     */
    recordAuditStarted(sessionId: string, thoughtNumber: number): void;
    recordAuditCompleted(sessionId: string, thoughtNumber: number, duration: number, verdict: string, score: number): void;
    recordAuditFailed(sessionId: string, thoughtNumber: number, duration: number, error: string): void;
    recordAuditTimedOut(sessionId: string, thoughtNumber: number, duration: number): void;
    /**
     * Record session events
     */
    recordSessionCreated(sessionId: string, loopId?: string): void;
    recordSessionUpdated(sessionId: string, iteration: IterationData): void;
    recordSessionCompleted(sessionId: string, totalLoops: number, reason: string): void;
    recordStagnationDetected(sessionId: string, loop: number, similarityScore: number): void;
    /**
     * Record Codex context events
     */
    recordContextCreated(loopId: string, contextId: string): void;
    recordContextTerminated(loopId: string, contextId: string, reason: string): void;
    /**
     * Record cache events
     */
    recordCacheHit(sessionId: string, thoughtNumber: number): void;
    recordCacheMiss(sessionId: string, thoughtNumber: number): void;
    /**
     * Record queue events
     */
    recordQueueEnqueued(sessionId: string, queueSize: number): void;
    recordQueueDequeued(sessionId: string, waitTime: number): void;
    /**
     * Reset all metrics
     */
    resetMetrics(): void;
    /**
     * Get metrics summary for logging
     */
    getMetricsSummary(): string;
    private initializeMetrics;
    private setupEventListeners;
    private updateCalculatedMetrics;
    private updateCompletionMetrics;
    private updateLoopStatistics;
    private updatePerformanceMetrics;
    private updateSessionMetrics;
    private updateCodexMetrics;
    private updateHealthMetrics;
    private startHealthChecks;
}
/**
 * Global metrics collector instance
 */
export declare const metricsCollector: MetricsCollector;
/**
 * Convenience functions for recording metrics
 */
export declare const recordAuditStarted: (sessionId: string, thoughtNumber: number) => void;
export declare const recordAuditCompleted: (sessionId: string, thoughtNumber: number, duration: number, verdict: string, score: number) => void;
export declare const recordAuditFailed: (sessionId: string, thoughtNumber: number, duration: number, error: string) => void;
export declare const recordSessionCreated: (sessionId: string, loopId?: string) => void;
export declare const recordSessionCompleted: (sessionId: string, totalLoops: number, reason: string) => void;
export declare const recordStagnationDetected: (sessionId: string, loop: number, similarityScore: number) => void;
export declare const recordContextCreated: (loopId: string, contextId: string) => void;
export declare const recordContextTerminated: (loopId: string, contextId: string, reason: string) => void;
//# sourceMappingURL=metrics-collector.d.ts.map