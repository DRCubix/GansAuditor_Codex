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
// Export all monitoring components
export * from './metrics-collector.js';
export * from './health-checker.js';
export * from './debug-tools.js';
export * from './audit-logger.js';
export * from './codex-operation-logger.js';
export * from './codex-performance-metrics.js';
export * from './codex-health-monitor.js';
export * from './codex-monitoring-integration.js';
import { createComponentLogger } from '../utils/logger.js';
import { metricsCollector } from './metrics-collector.js';
import { healthChecker, startHealthMonitoring, stopHealthMonitoring } from './health-checker.js';
import { debugTools } from './debug-tools.js';
import { auditLogger } from './audit-logger.js';
/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG = {
    enabled: true,
    metrics: {
        enabled: true,
        retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    },
    health: {
        enabled: true,
        checkInterval: 60000, // 1 minute
        thresholds: {
            errorRate: 5, // 5 errors per minute
            responseTime: 5000, // 5 seconds
            memoryUsage: 80, // 80%
            completionRate: 70, // 70%
            stagnationRate: 30, // 30%
        },
    },
    debug: {
        enabled: true,
        sessionStateDirectory: '.mcp-gan-state',
        maxInspectionResults: 100,
    },
    logging: {
        enabled: true,
        logDirectory: './logs/audit',
        maxLogFileSize: 10 * 1024 * 1024, // 10MB
        flushInterval: 5000, // 5 seconds
        enablePerformanceLogging: true,
        enableSessionTracking: true,
        enableCodexContextLogging: true,
    },
};
// ============================================================================
// Monitoring System Implementation
// ============================================================================
/**
 * Comprehensive monitoring and observability system
 */
export class MonitoringSystem {
    config;
    componentLogger;
    isStarted = false;
    auditEngine;
    sessionManager;
    constructor(config = {}) {
        this.config = this.mergeConfig(config);
        this.componentLogger = createComponentLogger('monitoring-system');
        this.componentLogger.info('Monitoring system initialized', {
            enabled: this.config.enabled,
            components: {
                metrics: this.config.metrics.enabled,
                health: this.config.health.enabled,
                debug: this.config.debug.enabled,
                logging: this.config.logging.enabled,
            },
        });
    }
    // ============================================================================
    // Public API Methods
    // ============================================================================
    /**
     * Start the monitoring system
     */
    start(auditEngine, sessionManager) {
        if (this.isStarted) {
            this.componentLogger.warn('Monitoring system is already started');
            return;
        }
        if (!this.config.enabled) {
            this.componentLogger.info('Monitoring system is disabled');
            return;
        }
        this.auditEngine = auditEngine;
        this.sessionManager = sessionManager;
        try {
            // Start health monitoring
            if (this.config.health.enabled) {
                startHealthMonitoring({
                    enabled: true,
                    interval: this.config.health.checkInterval,
                    thresholds: this.config.health.thresholds,
                }, auditEngine, sessionManager);
                this.componentLogger.info('Health monitoring started');
            }
            // Metrics collection is automatically started with the global instance
            if (this.config.metrics.enabled) {
                this.componentLogger.info('Metrics collection enabled');
            }
            // Debug tools are available on-demand
            if (this.config.debug.enabled) {
                this.componentLogger.info('Debug tools enabled');
            }
            // Audit logging is automatically started with the global instance
            if (this.config.logging.enabled) {
                this.componentLogger.info('Audit logging enabled');
            }
            this.isStarted = true;
            this.componentLogger.info('Monitoring system started successfully');
        }
        catch (error) {
            this.componentLogger.error('Failed to start monitoring system', error);
            throw error;
        }
    }
    /**
     * Stop the monitoring system
     */
    async stop() {
        if (!this.isStarted) {
            return;
        }
        try {
            // Stop health monitoring
            if (this.config.health.enabled) {
                stopHealthMonitoring();
                this.componentLogger.info('Health monitoring stopped');
            }
            // Flush and stop audit logging
            if (this.config.logging.enabled) {
                await auditLogger.stop();
                this.componentLogger.info('Audit logging stopped');
            }
            this.isStarted = false;
            this.componentLogger.info('Monitoring system stopped successfully');
        }
        catch (error) {
            this.componentLogger.error('Failed to stop monitoring system', error);
            throw error;
        }
    }
    /**
     * Get comprehensive system status
     */
    async getSystemStatus() {
        const [metrics, health] = await Promise.all([
            Promise.resolve(metricsCollector.getMetricsSnapshot()),
            healthChecker.performHealthCheck(),
        ]);
        return {
            monitoring: {
                enabled: this.config.enabled,
                started: this.isStarted,
                components: {
                    metrics: this.config.metrics.enabled,
                    health: this.config.health.enabled,
                    debug: this.config.debug.enabled,
                    logging: this.config.logging.enabled,
                },
            },
            metrics,
            health,
            performance: {
                bufferSizes: auditLogger.getBufferSizes(),
                uptime: process.uptime() * 1000,
                memoryUsage: process.memoryUsage(),
            },
        };
    }
    /**
     * Get monitoring summary for quick status check
     */
    getMonitoringSummary() {
        const summary = [
            `Monitoring: ${this.isStarted ? 'Active' : 'Inactive'}`,
            `Health: ${healthChecker.getCurrentHealthStatus()}`,
            `Metrics: ${metricsCollector.getMetricsSummary()}`,
        ];
        const bufferSizes = auditLogger.getBufferSizes();
        const totalBuffered = Object.values(bufferSizes).reduce((sum, size) => sum + size, 0);
        if (totalBuffered > 0) {
            summary.push(`Buffered Logs: ${totalBuffered}`);
        }
        return summary.join(' | ');
    }
    /**
     * Export comprehensive diagnostics
     */
    async exportDiagnostics(outputPath) {
        this.componentLogger.info(`Exporting comprehensive diagnostics to: ${outputPath}`);
        try {
            await debugTools.exportDiagnostics(outputPath);
            this.componentLogger.info('Diagnostics exported successfully');
        }
        catch (error) {
            this.componentLogger.error('Failed to export diagnostics', error);
            throw error;
        }
    }
    /**
     * Perform system health check
     */
    async performHealthCheck() {
        return await healthChecker.performHealthCheck();
    }
    /**
     * Inspect session state
     */
    async inspectSession(sessionId) {
        return await debugTools.inspectSession(sessionId);
    }
    /**
     * Analyze session performance
     */
    async analyzeSession(sessionId) {
        return await debugTools.analyzeSession(sessionId);
    }
    /**
     * Get performance analysis
     */
    async analyzePerformance(timeWindow) {
        return await debugTools.analyzePerformance(timeWindow);
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        Object.assign(this.config, config);
        this.componentLogger.info('Monitoring configuration updated', { config });
    }
    /**
     * Check if monitoring is healthy
     */
    isHealthy() {
        return this.isStarted && healthChecker.isHealthy();
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Merge configuration with defaults
     */
    mergeConfig(config) {
        return {
            enabled: config.enabled ?? DEFAULT_MONITORING_CONFIG.enabled,
            metrics: {
                enabled: config.metrics?.enabled ?? DEFAULT_MONITORING_CONFIG.metrics.enabled,
                retentionPeriod: config.metrics?.retentionPeriod ?? DEFAULT_MONITORING_CONFIG.metrics.retentionPeriod,
            },
            health: {
                enabled: config.health?.enabled ?? DEFAULT_MONITORING_CONFIG.health.enabled,
                checkInterval: config.health?.checkInterval ?? DEFAULT_MONITORING_CONFIG.health.checkInterval,
                thresholds: {
                    errorRate: config.health?.thresholds?.errorRate ?? DEFAULT_MONITORING_CONFIG.health.thresholds.errorRate,
                    responseTime: config.health?.thresholds?.responseTime ?? DEFAULT_MONITORING_CONFIG.health.thresholds.responseTime,
                    memoryUsage: config.health?.thresholds?.memoryUsage ?? DEFAULT_MONITORING_CONFIG.health.thresholds.memoryUsage,
                    completionRate: config.health?.thresholds?.completionRate ?? DEFAULT_MONITORING_CONFIG.health.thresholds.completionRate,
                    stagnationRate: config.health?.thresholds?.stagnationRate ?? DEFAULT_MONITORING_CONFIG.health.thresholds.stagnationRate,
                },
            },
            debug: {
                enabled: config.debug?.enabled ?? DEFAULT_MONITORING_CONFIG.debug.enabled,
                sessionStateDirectory: config.debug?.sessionStateDirectory ?? DEFAULT_MONITORING_CONFIG.debug.sessionStateDirectory,
                maxInspectionResults: config.debug?.maxInspectionResults ?? DEFAULT_MONITORING_CONFIG.debug.maxInspectionResults,
            },
            logging: {
                enabled: config.logging?.enabled ?? DEFAULT_MONITORING_CONFIG.logging.enabled,
                logDirectory: config.logging?.logDirectory ?? DEFAULT_MONITORING_CONFIG.logging.logDirectory,
                maxLogFileSize: config.logging?.maxLogFileSize ?? DEFAULT_MONITORING_CONFIG.logging.maxLogFileSize,
                flushInterval: config.logging?.flushInterval ?? DEFAULT_MONITORING_CONFIG.logging.flushInterval,
                enablePerformanceLogging: config.logging?.enablePerformanceLogging ?? DEFAULT_MONITORING_CONFIG.logging.enablePerformanceLogging,
                enableSessionTracking: config.logging?.enableSessionTracking ?? DEFAULT_MONITORING_CONFIG.logging.enableSessionTracking,
                enableCodexContextLogging: config.logging?.enableCodexContextLogging ?? DEFAULT_MONITORING_CONFIG.logging.enableCodexContextLogging,
            },
        };
    }
}
// ============================================================================
// Global Monitoring System Instance
// ============================================================================
/**
 * Global monitoring system instance
 */
export const monitoringSystem = new MonitoringSystem();
/**
 * Convenience function to start monitoring
 */
export function startMonitoring(config, auditEngine, sessionManager) {
    if (config) {
        monitoringSystem.updateConfig(config);
    }
    monitoringSystem.start(auditEngine, sessionManager);
}
/**
 * Convenience function to stop monitoring
 */
export async function stopMonitoring() {
    await monitoringSystem.stop();
}
/**
 * Convenience function to get system status
 */
export async function getSystemStatus() {
    return await monitoringSystem.getSystemStatus();
}
/**
 * Convenience function to get monitoring summary
 */
export function getMonitoringSummary() {
    return monitoringSystem.getMonitoringSummary();
}
/**
 * Convenience function to check if system is healthy
 */
export function isMonitoringHealthy() {
    return monitoringSystem.isHealthy();
}
// ============================================================================
// Integration Helpers
// ============================================================================
/**
 * Initialize monitoring for synchronous audit workflow
 */
export function initializeMonitoring(auditEngine, sessionManager, config) {
    const logger = createComponentLogger('monitoring-init');
    try {
        // Start monitoring system
        startMonitoring(config, auditEngine, sessionManager);
        // Log initialization success
        logger.info('Monitoring system initialized for synchronous audit workflow', {
            auditEngine: !!auditEngine,
            sessionManager: !!sessionManager,
            config: config ? 'custom' : 'default',
        });
    }
    catch (error) {
        logger.error('Failed to initialize monitoring system', error);
        throw error;
    }
}
/**
 * Cleanup monitoring resources
 */
export async function cleanupMonitoring() {
    const logger = createComponentLogger('monitoring-cleanup');
    try {
        await stopMonitoring();
        logger.info('Monitoring system cleaned up successfully');
    }
    catch (error) {
        logger.error('Failed to cleanup monitoring system', error);
        throw error;
    }
}
//# sourceMappingURL=index.js.map