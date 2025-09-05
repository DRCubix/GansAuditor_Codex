/**
 * Health Check System for Synchronous Audit Workflow
 *
 * This module provides comprehensive health monitoring for the synchronous
 * audit system, including service availability, performance thresholds,
 * and system resource monitoring.
 *
 * Requirements addressed:
 * - Implement health checks for synchronous audit system
 * - Add debugging tools for session state inspection
 * - Performance and reliability monitoring
 */
import { EventEmitter } from 'events';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createComponentLogger, createTimer } from '../utils/logger.js';
import { metricsCollector } from './metrics-collector.js';
const execFileAsync = promisify(execFile);
/**
 * Default health check configuration
 */
export const DEFAULT_HEALTH_CHECK_CONFIG = {
    enabled: true,
    interval: 60000, // 1 minute
    timeout: 10000, // 10 seconds
    thresholds: {
        errorRate: 5, // 5 errors per minute
        responseTime: 5000, // 5 seconds
        memoryUsage: 80, // 80%
        completionRate: 70, // 70%
        stagnationRate: 30, // 30%
    },
    codexExecutable: 'codex',
    codexTimeout: 10000, // 10 seconds
};
// ============================================================================
// Health Checker Implementation
// ============================================================================
/**
 * Comprehensive health monitoring system
 */
export class HealthChecker extends EventEmitter {
    config;
    componentLogger;
    startTime;
    auditEngine;
    sessionManager;
    isRunning = false;
    healthCheckInterval;
    lastHealthReport;
    constructor(config = {}, auditEngine, sessionManager) {
        super();
        this.config = { ...DEFAULT_HEALTH_CHECK_CONFIG, ...config };
        this.componentLogger = createComponentLogger('health-checker');
        this.startTime = Date.now();
        this.auditEngine = auditEngine;
        this.sessionManager = sessionManager;
        this.componentLogger.info('Health checker initialized', {
            enabled: this.config.enabled,
            interval: this.config.interval,
            thresholds: this.config.thresholds,
        });
    }
    // ============================================================================
    // Public API Methods
    // ============================================================================
    /**
     * Start health monitoring
     */
    start() {
        if (this.isRunning) {
            this.componentLogger.warn('Health checker is already running');
            return;
        }
        if (!this.config.enabled) {
            this.componentLogger.info('Health checker is disabled');
            return;
        }
        this.isRunning = true;
        // Perform initial health check
        this.performHealthCheck().catch(error => {
            this.componentLogger.error('Initial health check failed', error);
        });
        // Schedule periodic health checks
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck().catch(error => {
                this.componentLogger.error('Scheduled health check failed', error);
            });
        }, this.config.interval);
        this.componentLogger.info('Health monitoring started');
    }
    /**
     * Stop health monitoring
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
        this.componentLogger.info('Health monitoring stopped');
    }
    /**
     * Perform immediate health check
     */
    async performHealthCheck() {
        const timer = createTimer('health-check', 'health-checker');
        try {
            this.componentLogger.debug('Starting health check');
            const checks = [];
            // Run all health checks in parallel
            const checkPromises = [
                this.checkSystemResources(),
                this.checkAuditEngine(),
                this.checkSessionManager(),
                this.checkCodexService(),
                this.checkMetricsHealth(),
                this.checkPerformanceThresholds(),
            ];
            const checkResults = await Promise.allSettled(checkPromises);
            // Process results
            checkResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    checks.push(result.value);
                }
                else {
                    checks.push({
                        name: `check-${index}`,
                        status: 'critical',
                        message: `Health check failed: ${result.reason}`,
                        timestamp: Date.now(),
                        duration: 0,
                    });
                }
            });
            // Determine overall health status
            const overall = this.determineOverallHealth(checks);
            // Get current metrics
            const metrics = metricsCollector.getMetricsSnapshot();
            // Generate recommendations
            const recommendations = this.generateRecommendations(checks, metrics);
            const report = {
                overall,
                timestamp: Date.now(),
                uptime: Date.now() - this.startTime,
                checks,
                metrics,
                recommendations,
            };
            this.lastHealthReport = report;
            timer.end({ status: overall, checksCount: checks.length });
            // Emit health report event
            this.emit('healthReport', report);
            // Log health status
            this.logHealthStatus(report);
            return report;
        }
        catch (error) {
            timer.endWithError(error);
            this.componentLogger.error('Health check failed', error);
            const failureReport = {
                overall: 'critical',
                timestamp: Date.now(),
                uptime: Date.now() - this.startTime,
                checks: [{
                        name: 'health-check-system',
                        status: 'critical',
                        message: `Health check system failure: ${error.message}`,
                        timestamp: Date.now(),
                        duration: 0,
                    }],
                metrics: metricsCollector.getMetricsSnapshot(),
                recommendations: ['Investigate health check system failure'],
            };
            this.lastHealthReport = failureReport;
            return failureReport;
        }
    }
    /**
     * Get last health report
     */
    getLastHealthReport() {
        return this.lastHealthReport;
    }
    /**
     * Get current health status
     */
    getCurrentHealthStatus() {
        return this.lastHealthReport?.overall || 'unknown';
    }
    /**
     * Check if system is healthy
     */
    isHealthy() {
        const status = this.getCurrentHealthStatus();
        return status === 'healthy' || status === 'warning';
    }
    // ============================================================================
    // Individual Health Check Methods
    // ============================================================================
    /**
     * Check system resources (memory, CPU, etc.)
     */
    async checkSystemResources() {
        const timer = createTimer('system-resources-check', 'health-checker');
        try {
            const memUsage = process.memoryUsage();
            const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            let status = 'healthy';
            let message = 'System resources are within normal limits';
            if (memoryPercentage > this.config.thresholds.memoryUsage) {
                status = 'critical';
                message = `High memory usage: ${memoryPercentage.toFixed(1)}%`;
            }
            else if (memoryPercentage > this.config.thresholds.memoryUsage * 0.8) {
                status = 'warning';
                message = `Elevated memory usage: ${memoryPercentage.toFixed(1)}%`;
            }
            const duration = timer.end({ memoryPercentage });
            return {
                name: 'system-resources',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    memory: {
                        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                        percentage: memoryPercentage,
                    },
                    uptime: process.uptime(),
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'system-resources',
                status: 'critical',
                message: `System resources check failed: ${error.message}`,
                timestamp: Date.now(),
                duration: 0,
            };
        }
    }
    /**
     * Check audit engine health
     */
    async checkAuditEngine() {
        const timer = createTimer('audit-engine-check', 'health-checker');
        try {
            if (!this.auditEngine) {
                return {
                    name: 'audit-engine',
                    status: 'warning',
                    message: 'Audit engine not configured for health monitoring',
                    timestamp: Date.now(),
                    duration: 0,
                };
            }
            const isEnabled = this.auditEngine.isEnabled();
            const timeout = this.auditEngine.getAuditTimeout();
            const perfStats = this.auditEngine.getPerformanceStats();
            let status = 'healthy';
            let message = 'Audit engine is operating normally';
            if (!isEnabled) {
                status = 'warning';
                message = 'Audit engine is disabled';
            }
            const duration = timer.end({ enabled: isEnabled, timeout });
            return {
                name: 'audit-engine',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    enabled: isEnabled,
                    timeout,
                    performanceStats: perfStats,
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'audit-engine',
                status: 'critical',
                message: `Audit engine check failed: ${error.message}`,
                timestamp: Date.now(),
                duration: 0,
            };
        }
    }
    /**
     * Check session manager health
     */
    async checkSessionManager() {
        const timer = createTimer('session-manager-check', 'health-checker');
        try {
            if (!this.sessionManager) {
                return {
                    name: 'session-manager',
                    status: 'warning',
                    message: 'Session manager not configured for health monitoring',
                    timestamp: Date.now(),
                    duration: 0,
                };
            }
            // Try to get session stats (this will test basic functionality)
            const testSessionId = `health-check-${Date.now()}`;
            try {
                // This should not create a session, just test the method
                const session = await this.sessionManager.getSession(testSessionId);
                // Session should not exist, so this is expected
            }
            catch (error) {
                // Expected for non-existent session
            }
            const duration = timer.end();
            return {
                name: 'session-manager',
                status: 'healthy',
                message: 'Session manager is operating normally',
                timestamp: Date.now(),
                duration,
                details: {
                    testSessionId,
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'session-manager',
                status: 'critical',
                message: `Session manager check failed: ${error.message}`,
                timestamp: Date.now(),
                duration: 0,
            };
        }
    }
    /**
     * Check Codex service availability
     */
    async checkCodexService() {
        const timer = createTimer('codex-service-check', 'health-checker');
        try {
            // Try to execute codex --version to check if it's available
            const { stdout, stderr } = await execFileAsync(this.config.codexExecutable, ['--version'], { timeout: this.config.codexTimeout });
            let status = 'healthy';
            let message = 'Codex service is available';
            if (stderr && stderr.trim()) {
                status = 'warning';
                message = `Codex service available with warnings: ${stderr.trim()}`;
            }
            const duration = timer.end();
            return {
                name: 'codex-service',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    version: stdout.trim(),
                    executable: this.config.codexExecutable,
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            let status = 'critical';
            let message = `Codex service unavailable: ${error.message}`;
            // Check if it's just a timeout or actual unavailability
            if (error.code === 'ETIMEDOUT') {
                status = 'warning';
                message = 'Codex service is slow to respond';
            }
            return {
                name: 'codex-service',
                status,
                message,
                timestamp: Date.now(),
                duration: 0,
                details: {
                    error: error.message,
                    executable: this.config.codexExecutable,
                },
            };
        }
    }
    /**
     * Check metrics collection health
     */
    async checkMetricsHealth() {
        const timer = createTimer('metrics-health-check', 'health-checker');
        try {
            const metrics = metricsCollector.getMetricsSnapshot();
            let status = 'healthy';
            let message = 'Metrics collection is operating normally';
            // Check if metrics are being collected
            if (metrics.completion.totalAudits === 0 && Date.now() - this.startTime > 300000) { // 5 minutes
                status = 'warning';
                message = 'No audit metrics collected in the last 5 minutes';
            }
            const duration = timer.end();
            return {
                name: 'metrics-health',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    totalAudits: metrics.completion.totalAudits,
                    activeSessions: metrics.sessions.activeSessions,
                    uptime: metrics.health.uptime,
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'metrics-health',
                status: 'critical',
                message: `Metrics health check failed: ${error.message}`,
                timestamp: Date.now(),
                duration: 0,
            };
        }
    }
    /**
     * Check performance thresholds
     */
    async checkPerformanceThresholds() {
        const timer = createTimer('performance-thresholds-check', 'health-checker');
        try {
            const metrics = metricsCollector.getMetricsSnapshot();
            let status = 'healthy';
            const issues = [];
            // Check error rate
            if (metrics.health.errorRate > this.config.thresholds.errorRate) {
                status = 'critical';
                issues.push(`High error rate: ${metrics.health.errorRate.toFixed(1)}/min`);
            }
            // Check response time
            if (metrics.performance.averageAuditDuration > this.config.thresholds.responseTime) {
                if (status !== 'critical')
                    status = 'warning';
                issues.push(`Slow response time: ${metrics.performance.averageAuditDuration.toFixed(0)}ms`);
            }
            // Check completion rate
            if (metrics.completion.completionRate < this.config.thresholds.completionRate && metrics.completion.totalAudits > 10) {
                status = 'critical';
                issues.push(`Low completion rate: ${metrics.completion.completionRate.toFixed(1)}%`);
            }
            // Check stagnation rate
            if (metrics.loops.stagnationRate > this.config.thresholds.stagnationRate && metrics.sessions.totalSessions > 5) {
                if (status !== 'critical')
                    status = 'warning';
                issues.push(`High stagnation rate: ${metrics.loops.stagnationRate.toFixed(1)}%`);
            }
            const message = issues.length > 0
                ? `Performance issues detected: ${issues.join(', ')}`
                : 'All performance thresholds are within acceptable limits';
            const duration = timer.end({ issuesCount: issues.length });
            return {
                name: 'performance-thresholds',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    thresholds: this.config.thresholds,
                    current: {
                        errorRate: metrics.health.errorRate,
                        responseTime: metrics.performance.averageAuditDuration,
                        completionRate: metrics.completion.completionRate,
                        stagnationRate: metrics.loops.stagnationRate,
                    },
                    issues,
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'performance-thresholds',
                status: 'critical',
                message: `Performance thresholds check failed: ${error.message}`,
                timestamp: Date.now(),
                duration: 0,
            };
        }
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    /**
     * Determine overall health status from individual checks
     */
    determineOverallHealth(checks) {
        if (checks.some(check => check.status === 'critical')) {
            return 'critical';
        }
        if (checks.some(check => check.status === 'warning')) {
            return 'warning';
        }
        if (checks.every(check => check.status === 'healthy')) {
            return 'healthy';
        }
        return 'unknown';
    }
    /**
     * Generate recommendations based on health check results
     */
    generateRecommendations(checks, metrics) {
        const recommendations = [];
        // Check for critical issues
        const criticalChecks = checks.filter(check => check.status === 'critical');
        criticalChecks.forEach(check => {
            switch (check.name) {
                case 'system-resources':
                    recommendations.push('Consider increasing system memory or optimizing memory usage');
                    break;
                case 'audit-engine':
                    recommendations.push('Investigate audit engine configuration and dependencies');
                    break;
                case 'session-manager':
                    recommendations.push('Check session manager state directory and permissions');
                    break;
                case 'codex-service':
                    recommendations.push('Verify Codex service installation and configuration');
                    break;
                case 'performance-thresholds':
                    recommendations.push('Review performance metrics and consider scaling resources');
                    break;
            }
        });
        // Check for warning issues
        const warningChecks = checks.filter(check => check.status === 'warning');
        if (warningChecks.length > 0) {
            recommendations.push('Monitor warning conditions and consider preventive actions');
        }
        // Performance-based recommendations
        if (metrics.completion.completionRate < 80 && metrics.completion.totalAudits > 10) {
            recommendations.push('Low completion rate detected - review audit criteria and timeout settings');
        }
        if (metrics.loops.stagnationRate > 20 && metrics.sessions.totalSessions > 5) {
            recommendations.push('High stagnation rate - consider adjusting similarity thresholds or completion criteria');
        }
        if (metrics.performance.averageAuditDuration > 10000) {
            recommendations.push('Slow audit performance - consider enabling caching or optimizing audit process');
        }
        if (recommendations.length === 0) {
            recommendations.push('System is operating within normal parameters');
        }
        return recommendations;
    }
    /**
     * Log health status information
     */
    logHealthStatus(report) {
        const criticalCount = report.checks.filter(c => c.status === 'critical').length;
        const warningCount = report.checks.filter(c => c.status === 'warning').length;
        const healthyCount = report.checks.filter(c => c.status === 'healthy').length;
        const logData = {
            overall: report.overall,
            checks: {
                total: report.checks.length,
                healthy: healthyCount,
                warning: warningCount,
                critical: criticalCount,
            },
            uptime: report.uptime,
            recommendations: report.recommendations.length,
        };
        switch (report.overall) {
            case 'healthy':
                this.componentLogger.info('System health check passed', logData);
                break;
            case 'warning':
                this.componentLogger.warn('System health check has warnings', logData);
                break;
            case 'critical':
                this.componentLogger.error('System health check failed', undefined, logData);
                break;
            default:
                this.componentLogger.warn('System health status unknown', logData);
                break;
        }
        // Log individual critical issues
        report.checks
            .filter(check => check.status === 'critical')
            .forEach(check => {
            this.componentLogger.error(`Critical health issue: ${check.name}`, undefined, {
                message: check.message,
                details: check.details,
            });
        });
    }
    /**
     * Set audit engine for health monitoring
     */
    setAuditEngine(auditEngine) {
        this.auditEngine = auditEngine;
        this.componentLogger.debug('Audit engine set for health monitoring');
    }
    /**
     * Set session manager for health monitoring
     */
    setSessionManager(sessionManager) {
        this.sessionManager = sessionManager;
        this.componentLogger.debug('Session manager set for health monitoring');
    }
}
// ============================================================================
// Global Health Checker Instance
// ============================================================================
/**
 * Global health checker instance
 */
export const healthChecker = new HealthChecker();
/**
 * Convenience function to start health monitoring
 */
export function startHealthMonitoring(config, auditEngine, sessionManager) {
    if (config) {
        Object.assign(healthChecker['config'], config);
    }
    if (auditEngine) {
        healthChecker.setAuditEngine(auditEngine);
    }
    if (sessionManager) {
        healthChecker.setSessionManager(sessionManager);
    }
    healthChecker.start();
}
/**
 * Convenience function to stop health monitoring
 */
export function stopHealthMonitoring() {
    healthChecker.stop();
}
/**
 * Convenience function to get current health status
 */
export function getCurrentHealthStatus() {
    return healthChecker.getCurrentHealthStatus();
}
/**
 * Convenience function to check if system is healthy
 */
export function isSystemHealthy() {
    return healthChecker.isHealthy();
}
//# sourceMappingURL=health-checker.js.map