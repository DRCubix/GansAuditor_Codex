/**
 * Monitoring and Observability System for System Prompt Configuration
 *
 * This module provides comprehensive monitoring, metrics collection, alerting,
 * and dashboard capabilities for the system prompt configuration and deployment.
 *
 * Requirements: 11.3 - Monitoring and metrics
 */
import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
// ============================================================================
// Default Configuration
// ============================================================================
/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG = {
    enabled: true,
    metricsRetentionDays: 30,
    alertingEnabled: true,
    dashboardEnabled: true,
    exportInterval: 60000, // 1 minute
    logLevel: 'info',
    outputDirectory: './monitoring',
    webhookUrl: undefined,
};
/**
 * Default alerts for system prompt monitoring
 */
export const DEFAULT_ALERTS = [
    {
        id: 'config-validation-errors',
        name: 'Configuration Validation Errors',
        description: 'High rate of configuration validation errors',
        severity: 'error',
        condition: {
            metric: 'configValidationErrors',
            operator: 'gt',
            threshold: 5,
            windowMs: 300000, // 5 minutes
            aggregation: 'sum',
        },
        enabled: true,
        cooldownMs: 600000, // 10 minutes
    },
    {
        id: 'deployment-failures',
        name: 'Deployment Failures',
        description: 'Configuration deployment failures detected',
        severity: 'critical',
        condition: {
            metric: 'configDeploymentErrors',
            operator: 'gt',
            threshold: 2,
            windowMs: 600000, // 10 minutes
            aggregation: 'sum',
        },
        enabled: true,
        cooldownMs: 1800000, // 30 minutes
    },
    {
        id: 'migration-failures',
        name: 'Migration Failures',
        description: 'Configuration migration failures detected',
        severity: 'critical',
        condition: {
            metric: 'migrationErrors',
            operator: 'gt',
            threshold: 1,
            windowMs: 3600000, // 1 hour
            aggregation: 'sum',
        },
        enabled: true,
        cooldownMs: 3600000, // 1 hour
    },
    {
        id: 'audit-success-rate-low',
        name: 'Low Audit Success Rate',
        description: 'Audit success rate has dropped below acceptable threshold',
        severity: 'warning',
        condition: {
            metric: 'auditSuccessRate',
            operator: 'lt',
            threshold: 0.8, // 80%
            windowMs: 1800000, // 30 minutes
            aggregation: 'avg',
        },
        enabled: true,
        cooldownMs: 1800000, // 30 minutes
    },
    {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        description: 'System memory usage is critically high',
        severity: 'warning',
        condition: {
            metric: 'memoryUsage',
            operator: 'gt',
            threshold: 0.9, // 90%
            windowMs: 300000, // 5 minutes
            aggregation: 'avg',
        },
        enabled: true,
        cooldownMs: 600000, // 10 minutes
    },
];
// ============================================================================
// Monitoring System Class
// ============================================================================
export class SystemPromptMonitoringSystem extends EventEmitter {
    config;
    metrics;
    alerts;
    isRunning;
    exportTimer;
    startTime;
    constructor(config = DEFAULT_MONITORING_CONFIG) {
        super();
        this.config = config;
        this.metrics = new Map();
        this.alerts = new Map();
        this.isRunning = false;
        this.startTime = Date.now();
        // Initialize default alerts
        for (const alert of DEFAULT_ALERTS) {
            this.alerts.set(alert.id, alert);
        }
        // Create output directory if it doesn't exist
        if (!existsSync(this.config.outputDirectory)) {
            require('fs').mkdirSync(this.config.outputDirectory, { recursive: true });
        }
    }
    /**
     * Start monitoring system
     */
    start() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        this.startTime = Date.now();
        // Start periodic export
        if (this.config.exportInterval > 0) {
            this.exportTimer = setInterval(() => {
                this.exportMetrics();
                this.checkAlerts();
            }, this.config.exportInterval);
        }
        this.log('info', 'System prompt monitoring started');
        this.emit('started');
    }
    /**
     * Stop monitoring system
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.exportTimer) {
            clearInterval(this.exportTimer);
            this.exportTimer = undefined;
        }
        // Final export
        this.exportMetrics();
        this.log('info', 'System prompt monitoring stopped');
        this.emit('stopped');
    }
    /**
     * Record a metric data point
     */
    recordMetric(name, type, value, tags, metadata) {
        if (!this.config.enabled) {
            return;
        }
        const dataPoint = {
            name,
            type,
            value,
            timestamp: Date.now(),
            tags,
            metadata,
        };
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        const metricData = this.metrics.get(name);
        metricData.push(dataPoint);
        // Cleanup old data points
        this.cleanupOldMetrics(name);
        this.emit('metric', dataPoint);
    }
    /**
     * Record configuration validation metrics
     */
    recordConfigValidation(success, duration, errors) {
        this.recordMetric('configValidationCount', 'counter', 1);
        this.recordMetric('configValidationDuration', 'timer', duration);
        if (!success) {
            this.recordMetric('configValidationErrors', 'counter', 1, {
                errorCount: errors?.length.toString() || '1',
            });
        }
    }
    /**
     * Record configuration deployment metrics
     */
    recordConfigDeployment(environment, success, duration, backupCreated) {
        this.recordMetric('configDeploymentCount', 'counter', 1, { environment });
        this.recordMetric('configDeploymentDuration', 'timer', duration, { environment });
        if (!success) {
            this.recordMetric('configDeploymentErrors', 'counter', 1, { environment });
        }
        if (backupCreated) {
            this.recordMetric('backupCount', 'counter', 1, { environment });
        }
    }
    /**
     * Record migration metrics
     */
    recordMigration(fromVersion, toVersion, success, duration) {
        this.recordMetric('migrationCount', 'counter', 1, {
            fromVersion,
            toVersion,
        });
        this.recordMetric('migrationDuration', 'timer', duration, {
            fromVersion,
            toVersion,
        });
        if (!success) {
            this.recordMetric('migrationErrors', 'counter', 1, {
                fromVersion,
                toVersion,
            });
        }
    }
    /**
     * Record feature flag evaluation metrics
     */
    recordFeatureFlagEvaluation(flagName, enabled, cacheHit) {
        this.recordMetric('featureFlagEvaluations', 'counter', 1, {
            flagName,
            enabled: enabled.toString(),
        });
        if (cacheHit) {
            this.recordMetric('featureFlagCacheHits', 'counter', 1, { flagName });
        }
        else {
            this.recordMetric('featureFlagCacheMisses', 'counter', 1, { flagName });
        }
    }
    /**
     * Record audit quality metrics
     */
    recordAuditQuality(success, score, completionTime, iterations) {
        this.recordMetric('auditSuccessRate', 'gauge', success ? 1 : 0);
        this.recordMetric('auditAverageScore', 'gauge', score);
        this.recordMetric('auditCompletionTime', 'timer', completionTime);
        this.recordMetric('auditIterationCount', 'gauge', iterations);
    }
    /**
     * Record system health metrics
     */
    recordSystemHealth() {
        // Memory usage
        const memUsage = process.memoryUsage();
        const totalMem = require('os').totalmem();
        const memoryUsage = memUsage.heapUsed / totalMem;
        this.recordMetric('memoryUsage', 'gauge', memoryUsage);
        // CPU usage (simplified)
        const cpuUsage = process.cpuUsage();
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        this.recordMetric('cpuUsage', 'gauge', cpuPercent);
        // Disk usage (if available)
        try {
            const stats = require('fs').statSync(this.config.outputDirectory);
            this.recordMetric('diskUsage', 'gauge', stats.size);
        }
        catch (error) {
            // Ignore disk usage errors
        }
    }
    /**
     * Get current metrics summary
     */
    getMetricsSummary() {
        const now = Date.now();
        const windowMs = 3600000; // 1 hour window
        return {
            configValidationCount: this.getMetricValue('configValidationCount', 'sum', windowMs),
            configValidationErrors: this.getMetricValue('configValidationErrors', 'sum', windowMs),
            configValidationDuration: this.getMetricValue('configValidationDuration', 'avg', windowMs),
            configDeploymentCount: this.getMetricValue('configDeploymentCount', 'sum', windowMs),
            configDeploymentErrors: this.getMetricValue('configDeploymentErrors', 'sum', windowMs),
            configDeploymentDuration: this.getMetricValue('configDeploymentDuration', 'avg', windowMs),
            migrationCount: this.getMetricValue('migrationCount', 'sum', windowMs),
            migrationErrors: this.getMetricValue('migrationErrors', 'sum', windowMs),
            migrationDuration: this.getMetricValue('migrationDuration', 'avg', windowMs),
            backupCount: this.getMetricValue('backupCount', 'sum', windowMs),
            backupErrors: this.getMetricValue('backupErrors', 'sum', windowMs),
            featureFlagEvaluations: this.getMetricValue('featureFlagEvaluations', 'sum', windowMs),
            featureFlagCacheHits: this.getMetricValue('featureFlagCacheHits', 'sum', windowMs),
            featureFlagCacheMisses: this.getMetricValue('featureFlagCacheMisses', 'sum', windowMs),
            memoryUsage: this.getMetricValue('memoryUsage', 'avg', windowMs),
            cpuUsage: this.getMetricValue('cpuUsage', 'avg', windowMs),
            diskUsage: this.getMetricValue('diskUsage', 'avg', windowMs),
            auditSuccessRate: this.getMetricValue('auditSuccessRate', 'avg', windowMs),
            auditAverageScore: this.getMetricValue('auditAverageScore', 'avg', windowMs),
            auditCompletionTime: this.getMetricValue('auditCompletionTime', 'avg', windowMs),
            auditIterationCount: this.getMetricValue('auditIterationCount', 'avg', windowMs),
        };
    }
    /**
     * Generate dashboard data
     */
    generateDashboardData() {
        const metrics = this.getMetricsSummary();
        const recentAlerts = this.getRecentAlerts(3600000); // Last hour
        // Determine system health status
        let healthStatus = 'healthy';
        if (metrics.configDeploymentErrors > 0 || metrics.migrationErrors > 0) {
            healthStatus = 'critical';
        }
        else if (metrics.configValidationErrors > 5 || metrics.memoryUsage > 0.8) {
            healthStatus = 'degraded';
        }
        return {
            timestamp: Date.now(),
            metrics,
            alerts: recentAlerts,
            systemHealth: {
                status: healthStatus,
                uptime: Date.now() - this.startTime,
                version: '2.0.0',
                environment: process.env.NODE_ENV || 'development',
            },
            featureFlags: {
                enabled: [], // Would be populated from feature flag manager
                disabled: [],
                rolloutPercentages: {},
            },
            recentActivity: {
                deployments: metrics.configDeploymentCount,
                migrations: metrics.migrationCount,
                validations: metrics.configValidationCount,
                alerts: recentAlerts.length,
            },
        };
    }
    /**
     * Add or update alert
     */
    addAlert(alert) {
        this.alerts.set(alert.id, alert);
        this.log('info', `Alert added: ${alert.name}`);
    }
    /**
     * Remove alert
     */
    removeAlert(alertId) {
        if (this.alerts.delete(alertId)) {
            this.log('info', `Alert removed: ${alertId}`);
        }
    }
    /**
     * Get all alerts
     */
    getAlerts() {
        return Array.from(this.alerts.values());
    }
    /**
     * Export metrics to file
     */
    exportMetrics() {
        if (!this.config.enabled) {
            return;
        }
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const metricsFile = join(this.config.outputDirectory, `metrics-${timestamp}.json`);
            const exportData = {
                timestamp: Date.now(),
                metrics: this.getMetricsSummary(),
                rawMetrics: Object.fromEntries(Array.from(this.metrics.entries()).map(([name, data]) => [
                    name,
                    data.slice(-100), // Keep last 100 data points
                ])),
            };
            writeFileSync(metricsFile, JSON.stringify(exportData, null, 2), 'utf-8');
            this.log('debug', `Metrics exported to ${metricsFile}`);
        }
        catch (error) {
            this.log('error', `Failed to export metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Export dashboard data
     */
    exportDashboard() {
        if (!this.config.dashboardEnabled) {
            return;
        }
        try {
            const dashboardFile = join(this.config.outputDirectory, 'dashboard.json');
            const dashboardData = this.generateDashboardData();
            writeFileSync(dashboardFile, JSON.stringify(dashboardData, null, 2), 'utf-8');
            this.log('debug', `Dashboard data exported to ${dashboardFile}`);
        }
        catch (error) {
            this.log('error', `Failed to export dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check alerts and trigger if conditions are met
     */
    checkAlerts() {
        if (!this.config.alertingEnabled) {
            return;
        }
        const now = Date.now();
        for (const alert of this.alerts.values()) {
            if (!alert.enabled) {
                continue;
            }
            // Check cooldown
            if (alert.lastTriggered && (now - alert.lastTriggered) < alert.cooldownMs) {
                continue;
            }
            // Evaluate alert condition
            const metricValue = this.getMetricValue(alert.condition.metric, alert.condition.aggregation, alert.condition.windowMs);
            const conditionMet = this.evaluateAlertCondition(metricValue, alert.condition.operator, alert.condition.threshold);
            if (conditionMet) {
                this.triggerAlert(alert, metricValue);
            }
        }
    }
    /**
     * Trigger an alert
     */
    triggerAlert(alert, metricValue) {
        const alertEvent = {
            alertId: alert.id,
            alertName: alert.name,
            severity: alert.severity,
            message: `${alert.description} (value: ${metricValue}, threshold: ${alert.condition.threshold})`,
            timestamp: Date.now(),
            metricValue,
            threshold: alert.condition.threshold,
            metadata: alert.metadata,
        };
        // Update last triggered time
        alert.lastTriggered = Date.now();
        // Log alert
        this.log(alert.severity === 'critical' ? 'error' : 'warn', alertEvent.message);
        // Emit alert event
        this.emit('alert', alertEvent);
        // Send webhook if configured
        if (this.config.webhookUrl) {
            this.sendWebhook(alertEvent);
        }
        // Write alert to file
        this.writeAlertToFile(alertEvent);
    }
    /**
     * Get recent alerts
     */
    getRecentAlerts(windowMs) {
        const alertsFile = join(this.config.outputDirectory, 'alerts.json');
        if (!existsSync(alertsFile)) {
            return [];
        }
        try {
            const content = readFileSync(alertsFile, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            const cutoff = Date.now() - windowMs;
            return lines
                .map(line => JSON.parse(line))
                .filter(alert => alert.timestamp > cutoff)
                .sort((a, b) => b.timestamp - a.timestamp);
        }
        catch (error) {
            this.log('error', `Failed to read alerts file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }
    /**
     * Write alert to file
     */
    writeAlertToFile(alertEvent) {
        try {
            const alertsFile = join(this.config.outputDirectory, 'alerts.json');
            const alertLine = JSON.stringify(alertEvent) + '\n';
            appendFileSync(alertsFile, alertLine, 'utf-8');
        }
        catch (error) {
            this.log('error', `Failed to write alert to file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Send webhook notification
     */
    async sendWebhook(alertEvent) {
        if (!this.config.webhookUrl) {
            return;
        }
        try {
            const payload = {
                alert: alertEvent,
                system: 'system-prompt-monitoring',
                timestamp: alertEvent.timestamp,
            };
            // In a real implementation, you would use fetch or axios
            // For now, just log the webhook attempt
            this.log('info', `Webhook would be sent to ${this.config.webhookUrl}: ${JSON.stringify(payload)}`);
        }
        catch (error) {
            this.log('error', `Failed to send webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Evaluate alert condition
     */
    evaluateAlertCondition(value, operator, threshold) {
        switch (operator) {
            case 'gt': return value > threshold;
            case 'lt': return value < threshold;
            case 'eq': return value === threshold;
            case 'gte': return value >= threshold;
            case 'lte': return value <= threshold;
            case 'ne': return value !== threshold;
            default: return false;
        }
    }
    /**
     * Get aggregated metric value for a time window
     */
    getMetricValue(metricName, aggregation, windowMs) {
        const metricData = this.metrics.get(metricName);
        if (!metricData || metricData.length === 0) {
            return 0;
        }
        const cutoff = Date.now() - windowMs;
        const windowData = metricData.filter(point => point.timestamp > cutoff);
        if (windowData.length === 0) {
            return 0;
        }
        const values = windowData.map(point => point.value);
        switch (aggregation) {
            case 'sum':
                return values.reduce((sum, val) => sum + val, 0);
            case 'avg':
                return values.reduce((sum, val) => sum + val, 0) / values.length;
            case 'min':
                return Math.min(...values);
            case 'max':
                return Math.max(...values);
            case 'count':
                return values.length;
            default:
                return 0;
        }
    }
    /**
     * Clean up old metric data points
     */
    cleanupOldMetrics(metricName) {
        const metricData = this.metrics.get(metricName);
        if (!metricData) {
            return;
        }
        const cutoff = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
        const filteredData = metricData.filter(point => point.timestamp > cutoff);
        this.metrics.set(metricName, filteredData);
    }
    /**
     * Log message with appropriate level
     */
    log(level, message) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        const configLevel = levels[this.config.logLevel];
        const messageLevel = levels[level];
        if (messageLevel >= configLevel) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        }
    }
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Create default monitoring system
 */
export function createMonitoringSystem(config) {
    const fullConfig = { ...DEFAULT_MONITORING_CONFIG, ...config };
    return new SystemPromptMonitoringSystem(fullConfig);
}
/**
 * Global monitoring instance (singleton pattern)
 */
let globalMonitoringInstance = null;
/**
 * Get or create global monitoring instance
 */
export function getGlobalMonitoring(config) {
    if (!globalMonitoringInstance) {
        globalMonitoringInstance = createMonitoringSystem(config);
    }
    return globalMonitoringInstance;
}
/**
 * Quick metric recording functions
 */
export const Metrics = {
    recordConfigValidation: (success, duration, errors) => {
        getGlobalMonitoring().recordConfigValidation(success, duration, errors);
    },
    recordConfigDeployment: (environment, success, duration, backupCreated) => {
        getGlobalMonitoring().recordConfigDeployment(environment, success, duration, backupCreated);
    },
    recordMigration: (fromVersion, toVersion, success, duration) => {
        getGlobalMonitoring().recordMigration(fromVersion, toVersion, success, duration);
    },
    recordFeatureFlagEvaluation: (flagName, enabled, cacheHit) => {
        getGlobalMonitoring().recordFeatureFlagEvaluation(flagName, enabled, cacheHit);
    },
    recordAuditQuality: (success, score, completionTime, iterations) => {
        getGlobalMonitoring().recordAuditQuality(success, score, completionTime, iterations);
    },
    recordSystemHealth: () => {
        getGlobalMonitoring().recordSystemHealth();
    },
};
/**
 * Initialize monitoring from environment variables
 */
export function initializeMonitoringFromEnv() {
    const config = {
        enabled: process.env.GAN_AUDITOR_MONITORING_ENABLED !== 'false',
        metricsRetentionDays: parseInt(process.env.GAN_AUDITOR_METRICS_RETENTION_DAYS || '30', 10),
        alertingEnabled: process.env.GAN_AUDITOR_ALERTING_ENABLED !== 'false',
        dashboardEnabled: process.env.GAN_AUDITOR_DASHBOARD_ENABLED !== 'false',
        exportInterval: parseInt(process.env.GAN_AUDITOR_EXPORT_INTERVAL || '60000', 10),
        logLevel: process.env.GAN_AUDITOR_LOG_LEVEL || 'info',
        outputDirectory: process.env.GAN_AUDITOR_MONITORING_DIR || './monitoring',
        webhookUrl: process.env.GAN_AUDITOR_WEBHOOK_URL,
    };
    const monitoring = createMonitoringSystem(config);
    if (config.enabled) {
        monitoring.start();
    }
    return monitoring;
}
//# sourceMappingURL=monitoring-system.js.map