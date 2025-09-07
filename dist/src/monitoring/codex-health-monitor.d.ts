/**
 * Codex Health Monitoring System
 *
 * This module provides specialized health monitoring for Codex CLI operations,
 * including availability monitoring, system health endpoints, and alerting for critical failures.
 *
 * Requirements addressed:
 * - 7.5: Implement Codex CLI health checks and availability monitoring
 * - 7.5: Add system health endpoints for monitoring
 * - 7.5: Create alerting for critical failures
 */
import { EventEmitter } from 'events';
import { codexPerformanceMetrics } from './codex-performance-metrics.js';
import type { ProcessManager } from '../codex/process-manager.js';
import type { EnvironmentManager } from '../codex/environment-manager.js';
import type { CodexJudge } from '../codex/codex-judge.js';
/**
 * Codex health status levels
 */
export type CodexHealthStatus = 'healthy' | 'warning' | 'critical' | 'unavailable';
/**
 * Individual Codex health check result
 */
export interface CodexHealthCheckResult {
    name: string;
    status: CodexHealthStatus;
    message: string;
    timestamp: number;
    duration: number;
    details?: Record<string, any>;
    recommendations?: string[];
}
/**
 * Comprehensive Codex health report
 */
export interface CodexHealthReport {
    overall: CodexHealthStatus;
    timestamp: number;
    uptime: number;
    checks: CodexHealthCheckResult[];
    performance: {
        executionMetrics: ReturnType<typeof codexPerformanceMetrics.getExecutionStatistics>;
        resourceMetrics: ReturnType<typeof codexPerformanceMetrics.getResourceStatistics>;
        reliabilityMetrics: ReturnType<typeof codexPerformanceMetrics.getReliabilityStatistics>;
    };
    alerts: CodexHealthAlert[];
    recommendations: string[];
}
/**
 * Codex health alert
 */
export interface CodexHealthAlert {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    timestamp: number;
    category: 'availability' | 'performance' | 'reliability' | 'resource';
    acknowledged: boolean;
    resolvedAt?: number;
    metadata?: Record<string, any>;
}
/**
 * Health monitoring configuration
 */
export interface CodexHealthMonitorConfig {
    enabled: boolean;
    checkInterval: number;
    healthCheckTimeout: number;
    codexExecutable: string;
    thresholds: {
        availabilityTimeout: number;
        maxExecutionTime: number;
        minSuccessRate: number;
        maxErrorRate: number;
        maxMemoryUsage: number;
        maxConcurrentProcesses: number;
        maxQueueSize: number;
    };
    alerting: {
        enabled: boolean;
        cooldownPeriod: number;
        maxActiveAlerts: number;
        webhookUrl?: string;
        emailRecipients?: string[];
    };
    endpoints: {
        enabled: boolean;
        port?: number;
        path: string;
    };
}
/**
 * Default health monitoring configuration
 */
export declare const DEFAULT_CODEX_HEALTH_CONFIG: CodexHealthMonitorConfig;
/**
 * Comprehensive health monitoring system for Codex operations
 */
export declare class CodexHealthMonitor extends EventEmitter {
    private readonly config;
    private readonly componentLogger;
    private readonly startTime;
    private processManager?;
    private environmentManager?;
    private codexJudge?;
    private isRunning;
    private healthCheckInterval?;
    private lastHealthReport?;
    private activeAlerts;
    private alertCooldowns;
    private healthHistory;
    private readonly maxHistorySize;
    constructor(config?: Partial<CodexHealthMonitorConfig>);
    /**
     * Start health monitoring
     * Requirement 7.5: Implement Codex CLI health checks and availability monitoring
     */
    start(): void;
    /**
     * Stop health monitoring
     */
    stop(): void;
    /**
     * Perform comprehensive health check
     * Requirement 7.5: Implement Codex CLI health checks and availability monitoring
     */
    performHealthCheck(): Promise<CodexHealthReport>;
    /**
     * Get last health report
     */
    getLastHealthReport(): CodexHealthReport | undefined;
    /**
     * Get current health status
     */
    getCurrentHealthStatus(): CodexHealthStatus;
    /**
     * Check if Codex is healthy
     */
    isHealthy(): boolean;
    /**
     * Get active alerts
     */
    getActiveAlerts(): CodexHealthAlert[];
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId: string): boolean;
    /**
     * Resolve alert
     */
    resolveAlert(alertId: string): boolean;
    /**
     * Get health history
     */
    getHealthHistory(limit?: number): CodexHealthCheckResult[];
    /**
     * Set component references for health monitoring
     */
    setComponents(components: {
        processManager?: ProcessManager;
        environmentManager?: EnvironmentManager;
        codexJudge?: CodexJudge;
    }): void;
    /**
     * Check Codex CLI availability
     */
    private checkCodexAvailability;
    /**
     * Check Codex CLI version
     */
    private checkCodexVersion;
    /**
     * Check process manager health
     */
    private checkProcessManagerHealth;
    /**
     * Check environment health
     */
    private checkEnvironmentHealth;
    /**
     * Check performance thresholds
     */
    private checkPerformanceThresholds;
    /**
     * Check resource usage
     */
    private checkResourceUsage;
    /**
     * Check reliability metrics
     */
    private checkReliabilityMetrics;
    /**
     * Determine overall health status from individual checks
     */
    private determineOverallHealth;
    /**
     * Process health alerts
     * Requirement 7.5: Create alerting for critical failures
     */
    private processHealthAlerts;
    /**
     * Generate performance-based alerts
     */
    private generatePerformanceAlerts;
    /**
     * Generate recommendations based on health check results
     */
    private generateRecommendations;
    /**
     * Categorize alert based on check name
     */
    private categorizeAlert;
    /**
     * Clean up old alerts
     */
    private cleanupOldAlerts;
    /**
     * Add health check results to history
     */
    private addToHealthHistory;
    /**
     * Log health status information
     */
    private logHealthStatus;
}
/**
 * Global Codex health monitor instance
 */
export declare const codexHealthMonitor: CodexHealthMonitor;
/**
 * Convenience functions for health monitoring
 */
export declare const startCodexHealthMonitoring: (config?: Partial<CodexHealthMonitorConfig>) => void;
export declare const stopCodexHealthMonitoring: () => void;
export declare const getCodexHealthStatus: () => CodexHealthStatus;
export declare const isCodexHealthy: () => boolean;
export declare const getCodexHealthReport: () => Promise<CodexHealthReport>;
export declare const getCodexActiveAlerts: () => CodexHealthAlert[];
//# sourceMappingURL=codex-health-monitor.d.ts.map