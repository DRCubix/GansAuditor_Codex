/**
 * Monitoring and Observability Module
 *
 * This module provides comprehensive monitoring and observability for the
 * synchronous audit workflow, including metrics collection, health monitoring,
 * debugging tools, and specialized audit logging.
 *
 * Requirements addressed:
 * - Add metrics for completion rates and loop statistics
 * - Create logging for audit performance and session tracking
 * - Implement health checks for synchronous audit system
 * - Add debugging tools for session state inspection
 * - Add Codex context window usage monitoring
 * - Performance and reliability monitoring
 */
export * from './metrics-collector.js';
export * from './health-checker.js';
export * from './debug-tools.js';
export * from './audit-logger.js';
export type { MetricsSnapshot, CompletionMetrics, LoopStatistics, AuditPerformanceMetrics, SessionTrackingMetrics, CodexContextMetrics, SystemHealthMetrics, } from './metrics-collector.js';
export type { HealthStatus, HealthCheckResult, SystemHealthReport, HealthCheckConfig, } from './health-checker.js';
export type { SessionInspectionResult, SessionAnalysisResult, SystemDiagnosticResult, PerformanceAnalysisResult, DebugConfig, } from './debug-tools.js';
export type { AuditEventType, AuditLogEntry, SessionLogEntry, PerformanceLogEntry, CodexContextLogEntry, AuditLoggerConfig, } from './audit-logger.js';
import { metricsCollector } from './metrics-collector.js';
import { healthChecker } from './health-checker.js';
import { debugTools } from './debug-tools.js';
import { auditLogger } from './audit-logger.js';
import type { SynchronousAuditEngine } from '../auditor/synchronous-audit-engine.js';
import type { SynchronousSessionManager } from '../session/synchronous-session-manager.js';
/**
 * Comprehensive monitoring system configuration
 */
export interface MonitoringConfig {
    enabled: boolean;
    metrics: {
        enabled: boolean;
        retentionPeriod: number;
    };
    health: {
        enabled: boolean;
        checkInterval: number;
        thresholds: {
            errorRate: number;
            responseTime: number;
            memoryUsage: number;
            completionRate: number;
            stagnationRate: number;
        };
    };
    debug: {
        enabled: boolean;
        sessionStateDirectory: string;
        maxInspectionResults: number;
    };
    logging: {
        enabled: boolean;
        logDirectory: string;
        maxLogFileSize: number;
        flushInterval: number;
        enablePerformanceLogging: boolean;
        enableSessionTracking: boolean;
        enableCodexContextLogging: boolean;
    };
}
/**
 * Default monitoring configuration
 */
export declare const DEFAULT_MONITORING_CONFIG: MonitoringConfig;
/**
 * Comprehensive monitoring and observability system
 */
export declare class MonitoringSystem {
    private readonly config;
    private readonly componentLogger;
    private isStarted;
    private auditEngine?;
    private sessionManager?;
    constructor(config?: Partial<MonitoringConfig>);
    /**
     * Start the monitoring system
     */
    start(auditEngine?: SynchronousAuditEngine, sessionManager?: SynchronousSessionManager): void;
    /**
     * Stop the monitoring system
     */
    stop(): Promise<void>;
    /**
     * Get comprehensive system status
     */
    getSystemStatus(): Promise<{
        monitoring: {
            enabled: boolean;
            started: boolean;
            components: {
                metrics: boolean;
                health: boolean;
                debug: boolean;
                logging: boolean;
            };
        };
        metrics: ReturnType<typeof metricsCollector.getMetricsSnapshot>;
        health: Awaited<ReturnType<typeof healthChecker.performHealthCheck>>;
        performance: {
            bufferSizes: ReturnType<typeof auditLogger.getBufferSizes>;
            uptime: number;
            memoryUsage: NodeJS.MemoryUsage;
        };
    }>;
    /**
     * Get monitoring summary for quick status check
     */
    getMonitoringSummary(): string;
    /**
     * Export comprehensive diagnostics
     */
    exportDiagnostics(outputPath: string): Promise<void>;
    /**
     * Perform system health check
     */
    performHealthCheck(): Promise<ReturnType<typeof healthChecker.performHealthCheck>>;
    /**
     * Inspect session state
     */
    inspectSession(sessionId: string): Promise<ReturnType<typeof debugTools.inspectSession>>;
    /**
     * Analyze session performance
     */
    analyzeSession(sessionId: string): Promise<ReturnType<typeof debugTools.analyzeSession>>;
    /**
     * Get performance analysis
     */
    analyzePerformance(timeWindow?: number): Promise<ReturnType<typeof debugTools.analyzePerformance>>;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<MonitoringConfig>): void;
    /**
     * Check if monitoring is healthy
     */
    isHealthy(): boolean;
    /**
     * Merge configuration with defaults
     */
    private mergeConfig;
}
/**
 * Global monitoring system instance
 */
export declare const monitoringSystem: MonitoringSystem;
/**
 * Convenience function to start monitoring
 */
export declare function startMonitoring(config?: Partial<MonitoringConfig>, auditEngine?: SynchronousAuditEngine, sessionManager?: SynchronousSessionManager): void;
/**
 * Convenience function to stop monitoring
 */
export declare function stopMonitoring(): Promise<void>;
/**
 * Convenience function to get system status
 */
export declare function getSystemStatus(): Promise<ReturnType<typeof monitoringSystem.getSystemStatus>>;
/**
 * Convenience function to get monitoring summary
 */
export declare function getMonitoringSummary(): string;
/**
 * Convenience function to check if system is healthy
 */
export declare function isMonitoringHealthy(): boolean;
/**
 * Initialize monitoring for synchronous audit workflow
 */
export declare function initializeMonitoring(auditEngine: SynchronousAuditEngine, sessionManager: SynchronousSessionManager, config?: Partial<MonitoringConfig>): void;
/**
 * Cleanup monitoring resources
 */
export declare function cleanupMonitoring(): Promise<void>;
//# sourceMappingURL=index.d.ts.map