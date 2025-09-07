/**
 * Codex Monitoring Integration
 *
 * This module provides a comprehensive integration example showing how to use
 * all the Codex logging and monitoring components together for production deployment.
 *
 * Requirements addressed:
 * - 7.1: Log all Codex CLI command executions with arguments and timing
 * - 7.2: Add detailed error logging with context information
 * - 7.3: Add execution time tracking and statistics
 * - 7.4: Implement debug logging for troubleshooting
 * - 7.5: Implement resource usage monitoring and health checks
 */
import { codexOperationLogger } from './codex-operation-logger.js';
import { codexPerformanceMetrics } from './codex-performance-metrics.js';
import { codexHealthMonitor } from './codex-health-monitor.js';
import type { ProcessManager } from '../codex/process-manager.js';
import type { EnvironmentManager } from '../codex/environment-manager.js';
import type { CodexJudge } from '../codex/codex-judge.js';
import type { ProcessExecutionOptions, ProcessResult } from '../codex/process-manager.js';
import type { CodexOperationType } from './codex-operation-logger.js';
/**
 * Comprehensive monitoring configuration
 */
export interface CodexMonitoringConfig {
    operationLogging: {
        enabled: boolean;
        logDirectory: string;
        enableDebugLogging: boolean;
        flushInterval: number;
    };
    performanceMetrics: {
        enabled: boolean;
        sampleRetentionPeriod: number;
        enableResourceMonitoring: boolean;
        enableThroughputTracking: boolean;
        alertThresholds: {
            executionTime: number;
            successRate: number;
            memoryUsage: number;
            errorRate: number;
        };
    };
    healthMonitoring: {
        enabled: boolean;
        checkInterval: number;
        codexExecutable: string;
        thresholds: {
            availabilityTimeout: number;
            maxExecutionTime: number;
            minSuccessRate: number;
            maxErrorRate: number;
            maxMemoryUsage: number;
        };
        alerting: {
            enabled: boolean;
            cooldownPeriod: number;
        };
    };
}
/**
 * Default monitoring configuration
 */
export declare const DEFAULT_MONITORING_CONFIG: CodexMonitoringConfig;
/**
 * Comprehensive Codex monitoring system that integrates all monitoring components
 */
export declare class CodexMonitoringSystem {
    private readonly config;
    private readonly componentLogger;
    private isStarted;
    private processManager?;
    private environmentManager?;
    private codexJudge?;
    constructor(config?: Partial<CodexMonitoringConfig>);
    /**
     * Start the comprehensive monitoring system
     */
    start(components?: {
        processManager?: ProcessManager;
        environmentManager?: EnvironmentManager;
        codexJudge?: CodexJudge;
    }): void;
    /**
     * Stop the monitoring system
     */
    stop(): Promise<void>;
    /**
     * Get comprehensive monitoring status
     */
    getMonitoringStatus(): Promise<{
        system: {
            started: boolean;
            uptime: number;
            components: {
                operationLogging: boolean;
                performanceMetrics: boolean;
                healthMonitoring: boolean;
            };
        };
        operations: {
            statistics: ReturnType<typeof codexOperationLogger.getOperationStatistics>;
            recentCommands: ReturnType<typeof codexOperationLogger.getRecentCommandSummaries>;
        };
        performance: {
            snapshot: ReturnType<typeof codexPerformanceMetrics.getPerformanceSnapshot>;
            execution: ReturnType<typeof codexPerformanceMetrics.getExecutionStatistics>;
            resources: ReturnType<typeof codexPerformanceMetrics.getResourceStatistics>;
            reliability: ReturnType<typeof codexPerformanceMetrics.getReliabilityStatistics>;
        };
        health: {
            status: ReturnType<typeof codexHealthMonitor.getCurrentHealthStatus>;
            report: Awaited<ReturnType<typeof codexHealthMonitor.performHealthCheck>>;
            alerts: ReturnType<typeof codexHealthMonitor.getActiveAlerts>;
        };
    }>;
    /**
     * Export comprehensive monitoring data
     */
    exportMonitoringData(outputPath: string): Promise<void>;
    /**
     * Get monitoring summary for quick status check
     */
    getMonitoringSummary(): string;
    /**
     * Integrated command execution with full monitoring
     * This method demonstrates how to use all monitoring components together
     */
    executeMonitoredCommand(executable: string, args: string[], options: ProcessExecutionOptions, operationType: CodexOperationType, sessionId?: string, thoughtNumber?: number): Promise<ProcessResult>;
    /**
     * Set up performance metrics integration
     */
    private setupPerformanceMetricsIntegration;
    /**
     * Set up event listeners for component integration
     */
    private setupEventListeners;
    /**
     * Merge configuration with defaults
     */
    private mergeConfig;
}
/**
 * Global Codex monitoring system instance
 */
export declare const codexMonitoringSystem: CodexMonitoringSystem;
/**
 * Start comprehensive Codex monitoring
 */
export declare function startCodexMonitoring(config?: Partial<CodexMonitoringConfig>, components?: {
    processManager?: ProcessManager;
    environmentManager?: EnvironmentManager;
    codexJudge?: CodexJudge;
}): void;
/**
 * Stop comprehensive Codex monitoring
 */
export declare function stopCodexMonitoring(): Promise<void>;
/**
 * Get comprehensive monitoring status
 */
export declare function getCodexMonitoringStatus(): Promise<ReturnType<typeof codexMonitoringSystem.getMonitoringStatus>>;
/**
 * Get monitoring summary
 */
export declare function getCodexMonitoringSummary(): string;
/**
 * Execute a monitored Codex command
 */
export declare function executeMonitoredCodexCommand(executable: string, args: string[], options: ProcessExecutionOptions, operationType: CodexOperationType, sessionId?: string, thoughtNumber?: number): Promise<ProcessResult>;
/**
 * Example of how to use the comprehensive monitoring system
 */
export declare function exampleUsage(): Promise<void>;
//# sourceMappingURL=codex-monitoring-integration.d.ts.map