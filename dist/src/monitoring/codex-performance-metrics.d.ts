/**
 * Codex Performance Metrics Collection
 *
 * This module provides specialized performance metrics collection for Codex CLI operations,
 * including execution time tracking, resource usage monitoring, and success/failure rate tracking.
 *
 * Requirements addressed:
 * - 7.3: Add execution time tracking and statistics
 * - 7.5: Implement resource usage monitoring
 * - 7.5: Add success/failure rate tracking
 */
import { EventEmitter } from 'events';
import type { CodexOperationType } from './codex-operation-logger.js';
/**
 * Codex execution timing metrics
 */
export interface CodexExecutionMetrics {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    timedOutExecutions: number;
    averageExecutionTime: number;
    medianExecutionTime: number;
    p95ExecutionTime: number;
    p99ExecutionTime: number;
    fastestExecution: number;
    slowestExecution: number;
    executionTimeDistribution: {
        under1s: number;
        under5s: number;
        under10s: number;
        under30s: number;
        under60s: number;
        over60s: number;
    };
}
/**
 * Codex resource usage metrics
 */
export interface CodexResourceMetrics {
    memoryUsage: {
        current: number;
        peak: number;
        average: number;
        samples: number[];
    };
    cpuUsage: {
        current: number;
        peak: number;
        average: number;
        samples: number[];
    };
    processCount: {
        current: number;
        peak: number;
        average: number;
    };
    queueMetrics: {
        currentSize: number;
        peakSize: number;
        averageWaitTime: number;
        totalProcessed: number;
    };
}
/**
 * Codex success/failure rate metrics
 */
export interface CodexReliabilityMetrics {
    successRate: number;
    failureRate: number;
    timeoutRate: number;
    retryRate: number;
    errorsByCategory: Record<string, number>;
    errorsByType: Record<CodexOperationType, number>;
    mtbf: number;
    mttr: number;
    availability: number;
    recentFailures: Array<{
        timestamp: number;
        operationType: CodexOperationType;
        error: string;
        duration: number;
    }>;
}
/**
 * Codex throughput metrics
 */
export interface CodexThroughputMetrics {
    operationsPerSecond: number;
    operationsPerMinute: number;
    operationsPerHour: number;
    peakThroughput: number;
    throughputTrend: Array<{
        timestamp: number;
        count: number;
        duration: number;
    }>;
    concurrencyMetrics: {
        averageConcurrency: number;
        peakConcurrency: number;
        concurrencyUtilization: number;
    };
}
/**
 * Comprehensive Codex performance snapshot
 */
export interface CodexPerformanceSnapshot {
    timestamp: number;
    uptime: number;
    execution: CodexExecutionMetrics;
    resources: CodexResourceMetrics;
    reliability: CodexReliabilityMetrics;
    throughput: CodexThroughputMetrics;
    trends: {
        executionTimesTrend: 'improving' | 'stable' | 'degrading';
        successRateTrend: 'improving' | 'stable' | 'degrading';
        throughputTrend: 'increasing' | 'stable' | 'decreasing';
    };
}
/**
 * Performance metrics configuration
 */
export interface CodexPerformanceConfig {
    enabled: boolean;
    sampleRetentionPeriod: number;
    maxSamples: number;
    metricsUpdateInterval: number;
    enableResourceMonitoring: boolean;
    enableThroughputTracking: boolean;
    enableTrendAnalysis: boolean;
    alertThresholds: {
        executionTime: number;
        successRate: number;
        memoryUsage: number;
        errorRate: number;
    };
}
/**
 * Default performance metrics configuration
 */
export declare const DEFAULT_PERFORMANCE_CONFIG: CodexPerformanceConfig;
/**
 * Individual execution sample
 */
interface ExecutionSample {
    timestamp: number;
    operationType: CodexOperationType;
    duration: number;
    success: boolean;
    timedOut: boolean;
    retryCount: number;
    memoryUsage: number;
    cpuUsage?: number;
    error?: {
        category: string;
        type: string;
        message: string;
    };
}
/**
 * Resource usage sample
 */
interface ResourceSample {
    timestamp: number;
    memoryUsage: number;
    cpuUsage: number;
    activeProcesses: number;
    queueSize: number;
}
/**
 * Throughput sample
 */
interface ThroughputSample {
    timestamp: number;
    operationCount: number;
    duration: number;
    concurrentProcesses: number;
}
/**
 * Specialized performance metrics collector for Codex operations
 */
export declare class CodexPerformanceMetrics extends EventEmitter {
    private readonly config;
    private readonly componentLogger;
    private readonly startTime;
    private executionSamples;
    private resourceSamples;
    private throughputSamples;
    private currentMetrics;
    private metricsUpdateTimer?;
    private resourceMonitorTimer?;
    constructor(config?: Partial<CodexPerformanceConfig>);
    /**
     * Record execution completion
     * Requirement 7.3: Add execution time tracking and statistics
     */
    recordExecution(operationType: CodexOperationType, duration: number, success: boolean, timedOut?: boolean, retryCount?: number, error?: {
        category: string;
        type: string;
        message: string;
    }): void;
    /**
     * Update process state
     * Requirement 7.5: Implement resource usage monitoring
     */
    updateProcessState(activeProcesses: number, queueSize: number): void;
    /**
     * Get current performance snapshot
     * Requirement 7.3: Add execution time tracking and statistics
     * Requirement 7.5: Add success/failure rate tracking
     */
    getPerformanceSnapshot(): CodexPerformanceSnapshot;
    /**
     * Get execution statistics
     */
    getExecutionStatistics(): CodexExecutionMetrics;
    /**
     * Get resource usage statistics
     */
    getResourceStatistics(): CodexResourceMetrics;
    /**
     * Get reliability statistics
     */
    getReliabilityStatistics(): CodexReliabilityMetrics;
    /**
     * Get throughput statistics
     */
    getThroughputStatistics(): CodexThroughputMetrics;
    /**
     * Reset all metrics
     */
    resetMetrics(): void;
    /**
     * Export metrics data
     */
    exportMetrics(): {
        config: CodexPerformanceConfig;
        snapshot: CodexPerformanceSnapshot;
        samples: {
            executions: ExecutionSample[];
            resources: ResourceSample[];
            throughput: ThroughputSample[];
        };
    };
    /**
     * Stop metrics collection
     */
    stop(): void;
    /**
     * Start monitoring timers
     */
    private startMonitoring;
    /**
     * Update metrics and emit events
     */
    private updateMetrics;
    /**
     * Record resource usage sample
     */
    private recordResourceSample;
    /**
     * Record throughput sample
     */
    private recordThroughputSample;
    /**
     * Calculate execution metrics
     */
    private calculateExecutionMetrics;
    /**
     * Calculate resource metrics
     */
    private calculateResourceMetrics;
    /**
     * Calculate reliability metrics
     */
    private calculateReliabilityMetrics;
    /**
     * Calculate throughput metrics
     */
    private calculateThroughputMetrics;
    /**
     * Calculate performance trends
     */
    private calculateTrends;
    /**
     * Check for performance alerts
     */
    private checkPerformanceAlerts;
    /**
     * Clean up old samples
     */
    private cleanupOldSamples;
    /**
     * Get current memory usage in MB
     */
    private getCurrentMemoryUsage;
    /**
     * Get current CPU usage percentage
     */
    private getCurrentCpuUsage;
}
/**
 * Global Codex performance metrics instance
 */
export declare const codexPerformanceMetrics: CodexPerformanceMetrics;
/**
 * Convenience functions for performance metrics
 */
export declare const recordCodexExecution: (operationType: CodexOperationType, duration: number, success: boolean, timedOut?: boolean, retryCount?: number, error?: Parameters<typeof codexPerformanceMetrics.recordExecution>[5]) => void;
export declare const updateCodexProcessState: (activeProcesses: number, queueSize: number) => void;
export declare const getCodexPerformanceSnapshot: () => CodexPerformanceSnapshot;
export declare const getCodexExecutionStatistics: () => CodexExecutionMetrics;
export declare const getCodexResourceStatistics: () => CodexResourceMetrics;
export declare const getCodexReliabilityStatistics: () => CodexReliabilityMetrics;
export declare const getCodexThroughputStatistics: () => CodexThroughputMetrics;
export {};
//# sourceMappingURL=codex-performance-metrics.d.ts.map