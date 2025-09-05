/**
 * Monitoring and Observability System for System Prompt Configuration
 *
 * This module provides comprehensive monitoring, metrics collection, alerting,
 * and dashboard capabilities for the system prompt configuration and deployment.
 *
 * Requirements: 11.3 - Monitoring and metrics
 */
import { EventEmitter } from 'events';
/**
 * Metric types for system prompt monitoring
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer' | 'rate';
/**
 * Metric data point
 */
export interface MetricDataPoint {
    name: string;
    type: MetricType;
    value: number;
    timestamp: number;
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
}
/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
/**
 * Alert definition
 */
export interface Alert {
    id: string;
    name: string;
    description: string;
    severity: AlertSeverity;
    condition: AlertCondition;
    enabled: boolean;
    cooldownMs: number;
    lastTriggered?: number;
    metadata?: Record<string, any>;
}
/**
 * Alert condition
 */
export interface AlertCondition {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
    threshold: number;
    windowMs: number;
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
}
/**
 * Alert event
 */
export interface AlertEvent {
    alertId: string;
    alertName: string;
    severity: AlertSeverity;
    message: string;
    timestamp: number;
    metricValue: number;
    threshold: number;
    metadata?: Record<string, any>;
}
/**
 * Performance metrics for system prompt operations
 */
export interface SystemPromptMetrics {
    configValidationCount: number;
    configValidationErrors: number;
    configValidationDuration: number;
    configDeploymentCount: number;
    configDeploymentErrors: number;
    configDeploymentDuration: number;
    migrationCount: number;
    migrationErrors: number;
    migrationDuration: number;
    backupCount: number;
    backupErrors: number;
    featureFlagEvaluations: number;
    featureFlagCacheHits: number;
    featureFlagCacheMisses: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    auditSuccessRate: number;
    auditAverageScore: number;
    auditCompletionTime: number;
    auditIterationCount: number;
}
/**
 * Dashboard data structure
 */
export interface DashboardData {
    timestamp: number;
    metrics: SystemPromptMetrics;
    alerts: AlertEvent[];
    systemHealth: {
        status: 'healthy' | 'degraded' | 'critical';
        uptime: number;
        version: string;
        environment: string;
    };
    featureFlags: {
        enabled: string[];
        disabled: string[];
        rolloutPercentages: Record<string, number>;
    };
    recentActivity: {
        deployments: number;
        migrations: number;
        validations: number;
        alerts: number;
    };
}
/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
    enabled: boolean;
    metricsRetentionDays: number;
    alertingEnabled: boolean;
    dashboardEnabled: boolean;
    exportInterval: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    outputDirectory: string;
    webhookUrl?: string;
}
/**
 * Default monitoring configuration
 */
export declare const DEFAULT_MONITORING_CONFIG: MonitoringConfig;
/**
 * Default alerts for system prompt monitoring
 */
export declare const DEFAULT_ALERTS: Alert[];
export declare class SystemPromptMonitoringSystem extends EventEmitter {
    private config;
    private metrics;
    private alerts;
    private isRunning;
    private exportTimer?;
    private startTime;
    constructor(config?: MonitoringConfig);
    /**
     * Start monitoring system
     */
    start(): void;
    /**
     * Stop monitoring system
     */
    stop(): void;
    /**
     * Record a metric data point
     */
    recordMetric(name: string, type: MetricType, value: number, tags?: Record<string, string>, metadata?: Record<string, any>): void;
    /**
     * Record configuration validation metrics
     */
    recordConfigValidation(success: boolean, duration: number, errors?: string[]): void;
    /**
     * Record configuration deployment metrics
     */
    recordConfigDeployment(environment: string, success: boolean, duration: number, backupCreated: boolean): void;
    /**
     * Record migration metrics
     */
    recordMigration(fromVersion: string, toVersion: string, success: boolean, duration: number): void;
    /**
     * Record feature flag evaluation metrics
     */
    recordFeatureFlagEvaluation(flagName: string, enabled: boolean, cacheHit: boolean): void;
    /**
     * Record audit quality metrics
     */
    recordAuditQuality(success: boolean, score: number, completionTime: number, iterations: number): void;
    /**
     * Record system health metrics
     */
    recordSystemHealth(): void;
    /**
     * Get current metrics summary
     */
    getMetricsSummary(): SystemPromptMetrics;
    /**
     * Generate dashboard data
     */
    generateDashboardData(): DashboardData;
    /**
     * Add or update alert
     */
    addAlert(alert: Alert): void;
    /**
     * Remove alert
     */
    removeAlert(alertId: string): void;
    /**
     * Get all alerts
     */
    getAlerts(): Alert[];
    /**
     * Export metrics to file
     */
    exportMetrics(): void;
    /**
     * Export dashboard data
     */
    exportDashboard(): void;
    /**
     * Check alerts and trigger if conditions are met
     */
    private checkAlerts;
    /**
     * Trigger an alert
     */
    private triggerAlert;
    /**
     * Get recent alerts
     */
    private getRecentAlerts;
    /**
     * Write alert to file
     */
    private writeAlertToFile;
    /**
     * Send webhook notification
     */
    private sendWebhook;
    /**
     * Evaluate alert condition
     */
    private evaluateAlertCondition;
    /**
     * Get aggregated metric value for a time window
     */
    private getMetricValue;
    /**
     * Clean up old metric data points
     */
    private cleanupOldMetrics;
    /**
     * Log message with appropriate level
     */
    private log;
}
/**
 * Create default monitoring system
 */
export declare function createMonitoringSystem(config?: Partial<MonitoringConfig>): SystemPromptMonitoringSystem;
/**
 * Get or create global monitoring instance
 */
export declare function getGlobalMonitoring(config?: Partial<MonitoringConfig>): SystemPromptMonitoringSystem;
/**
 * Quick metric recording functions
 */
export declare const Metrics: {
    recordConfigValidation: (success: boolean, duration: number, errors?: string[]) => void;
    recordConfigDeployment: (environment: string, success: boolean, duration: number, backupCreated: boolean) => void;
    recordMigration: (fromVersion: string, toVersion: string, success: boolean, duration: number) => void;
    recordFeatureFlagEvaluation: (flagName: string, enabled: boolean, cacheHit: boolean) => void;
    recordAuditQuality: (success: boolean, score: number, completionTime: number, iterations: number) => void;
    recordSystemHealth: () => void;
};
/**
 * Initialize monitoring from environment variables
 */
export declare function initializeMonitoringFromEnv(): SystemPromptMonitoringSystem;
//# sourceMappingURL=monitoring-system.d.ts.map