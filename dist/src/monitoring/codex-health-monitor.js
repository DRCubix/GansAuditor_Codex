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
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createComponentLogger, createTimer } from '../utils/logger.js';
import { codexPerformanceMetrics } from './codex-performance-metrics.js';
const execFileAsync = promisify(execFile);
/**
 * Default health monitoring configuration
 */
export const DEFAULT_CODEX_HEALTH_CONFIG = {
    enabled: true,
    checkInterval: 30000, // 30 seconds
    healthCheckTimeout: 10000, // 10 seconds
    codexExecutable: 'codex',
    thresholds: {
        availabilityTimeout: 5000, // 5 seconds
        maxExecutionTime: 30000, // 30 seconds
        minSuccessRate: 80, // 80%
        maxErrorRate: 5, // 5 errors per minute
        maxMemoryUsage: 500, // 500 MB
        maxConcurrentProcesses: 10,
        maxQueueSize: 20,
    },
    alerting: {
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
        maxActiveAlerts: 50,
    },
    endpoints: {
        enabled: true,
        path: '/health/codex',
    },
};
// ============================================================================
// Codex Health Monitor Implementation
// ============================================================================
/**
 * Comprehensive health monitoring system for Codex operations
 */
export class CodexHealthMonitor extends EventEmitter {
    config;
    componentLogger;
    startTime;
    // Component references
    processManager;
    environmentManager;
    codexJudge;
    // Monitoring state
    isRunning = false;
    healthCheckInterval;
    lastHealthReport;
    activeAlerts = new Map();
    alertCooldowns = new Map();
    // Health check history
    healthHistory = [];
    maxHistorySize = 100;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CODEX_HEALTH_CONFIG, ...config };
        this.componentLogger = createComponentLogger('codex-health-monitor');
        this.startTime = Date.now();
        this.componentLogger.info('Codex health monitor initialized', {
            enabled: this.config.enabled,
            checkInterval: this.config.checkInterval,
            thresholds: this.config.thresholds,
            alertingEnabled: this.config.alerting.enabled,
        });
    }
    // ============================================================================
    // Public API Methods
    // ============================================================================
    /**
     * Start health monitoring
     * Requirement 7.5: Implement Codex CLI health checks and availability monitoring
     */
    start() {
        if (this.isRunning) {
            this.componentLogger.warn('Codex health monitor is already running');
            return;
        }
        if (!this.config.enabled) {
            this.componentLogger.info('Codex health monitor is disabled');
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
        }, this.config.checkInterval);
        this.componentLogger.info('Codex health monitoring started');
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
        this.componentLogger.info('Codex health monitoring stopped');
    }
    /**
     * Perform comprehensive health check
     * Requirement 7.5: Implement Codex CLI health checks and availability monitoring
     */
    async performHealthCheck() {
        const timer = createTimer('codex-health-check', 'codex-health-monitor');
        try {
            this.componentLogger.debug('Starting Codex health check');
            const checks = [];
            // Run all health checks in parallel
            const checkPromises = [
                this.checkCodexAvailability(),
                this.checkCodexVersion(),
                this.checkProcessManagerHealth(),
                this.checkEnvironmentHealth(),
                this.checkPerformanceThresholds(),
                this.checkResourceUsage(),
                this.checkReliabilityMetrics(),
            ];
            const checkResults = await Promise.allSettled(checkPromises);
            // Process results
            checkResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    checks.push(result.value);
                }
                else {
                    checks.push({
                        name: `health-check-${index}`,
                        status: 'critical',
                        message: `Health check failed: ${result.reason}`,
                        timestamp: Date.now(),
                        duration: 0,
                    });
                }
            });
            // Determine overall health status
            const overall = this.determineOverallHealth(checks);
            // Get performance metrics
            const performance = {
                executionMetrics: codexPerformanceMetrics.getExecutionStatistics(),
                resourceMetrics: codexPerformanceMetrics.getResourceStatistics(),
                reliabilityMetrics: codexPerformanceMetrics.getReliabilityStatistics(),
            };
            // Process alerts
            const alerts = this.processHealthAlerts(checks, performance);
            // Generate recommendations
            const recommendations = this.generateRecommendations(checks, performance);
            const report = {
                overall,
                timestamp: Date.now(),
                uptime: Date.now() - this.startTime,
                checks,
                performance,
                alerts: Array.from(this.activeAlerts.values()),
                recommendations,
            };
            this.lastHealthReport = report;
            timer.end({ status: overall, checksCount: checks.length, alertsCount: alerts.length });
            // Store health check results in history
            this.addToHealthHistory(checks);
            // Emit health report event
            this.emit('health-report', report);
            // Log health status
            this.logHealthStatus(report);
            return report;
        }
        catch (error) {
            timer.endWithError(error);
            this.componentLogger.error('Codex health check failed', error);
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
                performance: {
                    executionMetrics: codexPerformanceMetrics.getExecutionStatistics(),
                    resourceMetrics: codexPerformanceMetrics.getResourceStatistics(),
                    reliabilityMetrics: codexPerformanceMetrics.getReliabilityStatistics(),
                },
                alerts: Array.from(this.activeAlerts.values()),
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
        return this.lastHealthReport?.overall || 'unavailable';
    }
    /**
     * Check if Codex is healthy
     */
    isHealthy() {
        const status = this.getCurrentHealthStatus();
        return status === 'healthy' || status === 'warning';
    }
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            this.emit('alert-acknowledged', alert);
            this.componentLogger.info('Alert acknowledged', { alertId, title: alert.title });
            return true;
        }
        return false;
    }
    /**
     * Resolve alert
     */
    resolveAlert(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.resolvedAt = Date.now();
            this.activeAlerts.delete(alertId);
            this.emit('alert-resolved', alert);
            this.componentLogger.info('Alert resolved', { alertId, title: alert.title });
            return true;
        }
        return false;
    }
    /**
     * Get health history
     */
    getHealthHistory(limit) {
        const history = [...this.healthHistory];
        return limit ? history.slice(-limit) : history;
    }
    /**
     * Set component references for health monitoring
     */
    setComponents(components) {
        this.processManager = components.processManager;
        this.environmentManager = components.environmentManager;
        this.codexJudge = components.codexJudge;
        this.componentLogger.debug('Component references set for health monitoring', {
            processManager: !!this.processManager,
            environmentManager: !!this.environmentManager,
            codexJudge: !!this.codexJudge,
        });
    }
    // ============================================================================
    // Individual Health Check Methods
    // ============================================================================
    /**
     * Check Codex CLI availability
     */
    async checkCodexAvailability() {
        const timer = createTimer('codex-availability-check', 'codex-health-monitor');
        try {
            const { stdout, stderr } = await execFileAsync(this.config.codexExecutable, ['--help'], { timeout: this.config.thresholds.availabilityTimeout });
            let status = 'healthy';
            let message = 'Codex CLI is available and responding';
            if (stderr && stderr.trim()) {
                status = 'warning';
                message = `Codex CLI available with warnings: ${stderr.trim().substring(0, 100)}`;
            }
            const duration = timer.end();
            return {
                name: 'codex-availability',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    executable: this.config.codexExecutable,
                    helpOutput: stdout.substring(0, 200),
                    warnings: stderr ? stderr.trim() : null,
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            let status = 'critical';
            let message = `Codex CLI unavailable: ${error.message}`;
            const recommendations = ['Verify Codex CLI installation', 'Check PATH environment variable'];
            // Check if it's a timeout vs actual unavailability
            if (error.code === 'ETIMEDOUT') {
                status = 'warning';
                message = 'Codex CLI is slow to respond';
                recommendations.push('Consider increasing availability timeout');
            }
            else if (error.code === 'ENOENT') {
                message = 'Codex CLI executable not found';
                recommendations.push('Install Codex CLI', 'Verify executable path');
            }
            return {
                name: 'codex-availability',
                status,
                message,
                timestamp: Date.now(),
                duration: 0,
                details: {
                    executable: this.config.codexExecutable,
                    error: error.message,
                    errorCode: error.code,
                },
                recommendations,
            };
        }
    }
    /**
     * Check Codex CLI version
     */
    async checkCodexVersion() {
        const timer = createTimer('codex-version-check', 'codex-health-monitor');
        try {
            const { stdout, stderr } = await execFileAsync(this.config.codexExecutable, ['--version'], { timeout: this.config.healthCheckTimeout });
            const version = stdout.trim() || stderr.trim();
            let status = 'healthy';
            let message = `Codex CLI version: ${version}`;
            // You could add version compatibility checks here
            // For now, just check if we got a version
            if (!version) {
                status = 'warning';
                message = 'Could not determine Codex CLI version';
            }
            const duration = timer.end();
            return {
                name: 'codex-version',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    version,
                    versionOutput: stdout,
                    versionErrors: stderr,
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'codex-version',
                status: 'warning',
                message: `Could not check Codex CLI version: ${error.message}`,
                timestamp: Date.now(),
                duration: 0,
                details: {
                    error: error.message,
                },
                recommendations: ['Verify Codex CLI installation'],
            };
        }
    }
    /**
     * Check process manager health
     */
    async checkProcessManagerHealth() {
        const timer = createTimer('process-manager-health-check', 'codex-health-monitor');
        try {
            if (!this.processManager) {
                return {
                    name: 'process-manager',
                    status: 'warning',
                    message: 'Process manager not configured for health monitoring',
                    timestamp: Date.now(),
                    duration: 0,
                };
            }
            const healthStatus = this.processManager.getHealthStatus();
            let status = 'healthy';
            let message = 'Process manager is operating normally';
            const recommendations = [];
            // Check active processes
            if (healthStatus.activeProcesses >= this.config.thresholds.maxConcurrentProcesses) {
                status = 'warning';
                message = `High concurrent process count: ${healthStatus.activeProcesses}`;
                recommendations.push('Consider increasing process limits or investigating process bottlenecks');
            }
            // Check queue size
            if (healthStatus.queuedProcesses >= this.config.thresholds.maxQueueSize) {
                status = 'critical';
                message = `Process queue is full: ${healthStatus.queuedProcesses} queued`;
                recommendations.push('Investigate process execution delays', 'Consider scaling resources');
            }
            // Check if process manager is healthy
            if (!healthStatus.isHealthy) {
                status = 'critical';
                message = 'Process manager reports unhealthy status';
                recommendations.push('Check process manager logs', 'Restart process manager if necessary');
            }
            const duration = timer.end();
            return {
                name: 'process-manager',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: healthStatus,
                recommendations: recommendations.length > 0 ? recommendations : undefined,
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'process-manager',
                status: 'critical',
                message: `Process manager health check failed: ${error.message}`,
                timestamp: Date.now(),
                duration: 0,
                recommendations: ['Check process manager configuration', 'Restart process manager'],
            };
        }
    }
    /**
     * Check environment health
     */
    async checkEnvironmentHealth() {
        const timer = createTimer('environment-health-check', 'codex-health-monitor');
        try {
            if (!this.environmentManager) {
                return {
                    name: 'environment',
                    status: 'warning',
                    message: 'Environment manager not configured for health monitoring',
                    timestamp: Date.now(),
                    duration: 0,
                };
            }
            // Check working directory resolution
            const workingDirResult = await this.environmentManager.resolveWorkingDirectory();
            // Check environment preparation
            const envResult = await this.environmentManager.prepareEnvironment();
            // Check Codex path validation
            const pathResult = await this.environmentManager.validateCodexPath();
            let status = 'healthy';
            let message = 'Environment is properly configured';
            const recommendations = [];
            const issues = [];
            if (!workingDirResult.success) {
                issues.push('Working directory resolution failed');
                recommendations.push('Check repository structure and permissions');
            }
            if (!envResult.success) {
                issues.push('Environment preparation failed');
                recommendations.push('Check environment variables and PATH configuration');
            }
            if (!pathResult.success) {
                issues.push('Codex executable validation failed');
                recommendations.push('Verify Codex CLI installation and PATH');
            }
            if (issues.length > 0) {
                status = issues.length > 1 ? 'critical' : 'warning';
                message = `Environment issues detected: ${issues.join(', ')}`;
            }
            const duration = timer.end();
            return {
                name: 'environment',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    workingDirectory: workingDirResult,
                    environment: envResult,
                    codexPath: pathResult,
                },
                recommendations: recommendations.length > 0 ? recommendations : undefined,
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'environment',
                status: 'critical',
                message: `Environment health check failed: ${error.message}`,
                timestamp: Date.now(),
                duration: 0,
                recommendations: ['Check environment manager configuration'],
            };
        }
    }
    /**
     * Check performance thresholds
     */
    async checkPerformanceThresholds() {
        const timer = createTimer('performance-thresholds-check', 'codex-health-monitor');
        try {
            const executionMetrics = codexPerformanceMetrics.getExecutionStatistics();
            const reliabilityMetrics = codexPerformanceMetrics.getReliabilityStatistics();
            let status = 'healthy';
            const issues = [];
            const recommendations = [];
            // Check execution time
            if (executionMetrics.averageExecutionTime > this.config.thresholds.maxExecutionTime) {
                issues.push(`Slow execution time: ${executionMetrics.averageExecutionTime.toFixed(0)}ms`);
                recommendations.push('Investigate performance bottlenecks', 'Consider optimizing Codex operations');
            }
            // Check success rate
            if (reliabilityMetrics.successRate < this.config.thresholds.minSuccessRate) {
                issues.push(`Low success rate: ${reliabilityMetrics.successRate.toFixed(1)}%`);
                recommendations.push('Investigate failure causes', 'Review error logs');
            }
            // Check error rate
            const recentFailures = reliabilityMetrics.recentFailures.length;
            const errorRate = recentFailures * 12; // Convert to errors per hour (5-minute window * 12)
            if (errorRate > this.config.thresholds.maxErrorRate * 60) { // Convert threshold to per hour
                issues.push(`High error rate: ${recentFailures} errors in last 5 minutes`);
                recommendations.push('Investigate error patterns', 'Check system resources');
            }
            if (issues.length > 0) {
                status = issues.length > 2 ? 'critical' : 'warning';
            }
            const message = issues.length > 0
                ? `Performance issues detected: ${issues.join(', ')}`
                : 'All performance thresholds are within acceptable limits';
            const duration = timer.end();
            return {
                name: 'performance-thresholds',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    thresholds: this.config.thresholds,
                    current: {
                        averageExecutionTime: executionMetrics.averageExecutionTime,
                        successRate: reliabilityMetrics.successRate,
                        errorRate: recentFailures,
                    },
                    issues,
                },
                recommendations: recommendations.length > 0 ? recommendations : undefined,
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
    /**
     * Check resource usage
     */
    async checkResourceUsage() {
        const timer = createTimer('resource-usage-check', 'codex-health-monitor');
        try {
            const resourceMetrics = codexPerformanceMetrics.getResourceStatistics();
            let status = 'healthy';
            const issues = [];
            const recommendations = [];
            // Check memory usage
            if (resourceMetrics.memoryUsage.current > this.config.thresholds.maxMemoryUsage) {
                issues.push(`High memory usage: ${resourceMetrics.memoryUsage.current}MB`);
                recommendations.push('Monitor memory leaks', 'Consider increasing memory limits');
            }
            // Check process count
            if (resourceMetrics.processCount.current >= this.config.thresholds.maxConcurrentProcesses) {
                issues.push(`High process count: ${resourceMetrics.processCount.current}`);
                recommendations.push('Check for stuck processes', 'Consider increasing process limits');
            }
            // Check queue size
            if (resourceMetrics.queueMetrics.currentSize >= this.config.thresholds.maxQueueSize) {
                issues.push(`Large queue size: ${resourceMetrics.queueMetrics.currentSize}`);
                recommendations.push('Investigate processing delays', 'Scale processing capacity');
            }
            if (issues.length > 0) {
                status = issues.length > 2 ? 'critical' : 'warning';
            }
            const message = issues.length > 0
                ? `Resource usage issues detected: ${issues.join(', ')}`
                : 'Resource usage is within normal limits';
            const duration = timer.end();
            return {
                name: 'resource-usage',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    thresholds: {
                        maxMemoryUsage: this.config.thresholds.maxMemoryUsage,
                        maxConcurrentProcesses: this.config.thresholds.maxConcurrentProcesses,
                        maxQueueSize: this.config.thresholds.maxQueueSize,
                    },
                    current: {
                        memoryUsage: resourceMetrics.memoryUsage.current,
                        processCount: resourceMetrics.processCount.current,
                        queueSize: resourceMetrics.queueMetrics.currentSize,
                    },
                    issues,
                },
                recommendations: recommendations.length > 0 ? recommendations : undefined,
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'resource-usage',
                status: 'critical',
                message: `Resource usage check failed: ${error.message}`,
                timestamp: Date.now(),
                duration: 0,
            };
        }
    }
    /**
     * Check reliability metrics
     */
    async checkReliabilityMetrics() {
        const timer = createTimer('reliability-metrics-check', 'codex-health-monitor');
        try {
            const reliabilityMetrics = codexPerformanceMetrics.getReliabilityStatistics();
            let status = 'healthy';
            const issues = [];
            const recommendations = [];
            // Check availability
            if (reliabilityMetrics.availability < this.config.thresholds.minSuccessRate) {
                issues.push(`Low availability: ${reliabilityMetrics.availability.toFixed(1)}%`);
                recommendations.push('Investigate system reliability', 'Review failure patterns');
            }
            // Check timeout rate
            if (reliabilityMetrics.timeoutRate > 10) { // 10% timeout rate threshold
                issues.push(`High timeout rate: ${reliabilityMetrics.timeoutRate.toFixed(1)}%`);
                recommendations.push('Investigate timeout causes', 'Consider increasing timeout values');
            }
            // Check retry rate
            if (reliabilityMetrics.retryRate > 20) { // 20% retry rate threshold
                issues.push(`High retry rate: ${reliabilityMetrics.retryRate.toFixed(1)}%`);
                recommendations.push('Investigate retry causes', 'Optimize operation reliability');
            }
            // Check recent failures
            if (reliabilityMetrics.recentFailures.length > 5) {
                issues.push(`Multiple recent failures: ${reliabilityMetrics.recentFailures.length}`);
                recommendations.push('Review recent error logs', 'Check system stability');
            }
            if (issues.length > 0) {
                status = issues.length > 2 ? 'critical' : 'warning';
            }
            const message = issues.length > 0
                ? `Reliability issues detected: ${issues.join(', ')}`
                : 'System reliability is within acceptable limits';
            const duration = timer.end();
            return {
                name: 'reliability-metrics',
                status,
                message,
                timestamp: Date.now(),
                duration,
                details: {
                    metrics: reliabilityMetrics,
                    issues,
                },
                recommendations: recommendations.length > 0 ? recommendations : undefined,
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                name: 'reliability-metrics',
                status: 'critical',
                message: `Reliability metrics check failed: ${error.message}`,
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
        if (checks.some(check => check.status === 'unavailable')) {
            return 'unavailable';
        }
        if (checks.some(check => check.status === 'critical')) {
            return 'critical';
        }
        if (checks.some(check => check.status === 'warning')) {
            return 'warning';
        }
        if (checks.every(check => check.status === 'healthy')) {
            return 'healthy';
        }
        return 'unavailable';
    }
    /**
     * Process health alerts
     * Requirement 7.5: Create alerting for critical failures
     */
    processHealthAlerts(checks, performance) {
        if (!this.config.alerting.enabled) {
            return [];
        }
        const newAlerts = [];
        // Process check-based alerts
        for (const check of checks) {
            if (check.status === 'critical' || check.status === 'warning') {
                const alertId = `${check.name}-${check.status}`;
                // Check cooldown
                const lastAlert = this.alertCooldowns.get(alertId);
                if (lastAlert && Date.now() - lastAlert < this.config.alerting.cooldownPeriod) {
                    continue;
                }
                const alert = {
                    id: alertId,
                    severity: check.status === 'critical' ? 'critical' : 'warning',
                    title: `Codex Health Check: ${check.name}`,
                    message: check.message,
                    timestamp: Date.now(),
                    category: this.categorizeAlert(check.name),
                    acknowledged: false,
                    metadata: {
                        checkName: check.name,
                        checkDetails: check.details,
                        recommendations: check.recommendations,
                    },
                };
                this.activeAlerts.set(alertId, alert);
                this.alertCooldowns.set(alertId, Date.now());
                newAlerts.push(alert);
            }
        }
        // Process performance-based alerts
        const perfAlerts = this.generatePerformanceAlerts(performance);
        newAlerts.push(...perfAlerts);
        // Emit new alerts
        for (const alert of newAlerts) {
            this.emit('alert-created', alert);
            this.componentLogger.warn('Health alert created', {
                id: alert.id,
                severity: alert.severity,
                title: alert.title,
                category: alert.category,
            });
        }
        // Clean up old alerts
        this.cleanupOldAlerts();
        return newAlerts;
    }
    /**
     * Generate performance-based alerts
     */
    generatePerformanceAlerts(performance) {
        const alerts = [];
        // Memory usage alert
        if (performance.resourceMetrics.memoryUsage.current > this.config.thresholds.maxMemoryUsage) {
            const alertId = 'high-memory-usage';
            if (!this.alertCooldowns.has(alertId) ||
                Date.now() - this.alertCooldowns.get(alertId) > this.config.alerting.cooldownPeriod) {
                alerts.push({
                    id: alertId,
                    severity: 'warning',
                    title: 'High Memory Usage',
                    message: `Memory usage is ${performance.resourceMetrics.memoryUsage.current}MB (threshold: ${this.config.thresholds.maxMemoryUsage}MB)`,
                    timestamp: Date.now(),
                    category: 'resource',
                    acknowledged: false,
                    metadata: {
                        currentUsage: performance.resourceMetrics.memoryUsage.current,
                        threshold: this.config.thresholds.maxMemoryUsage,
                        peakUsage: performance.resourceMetrics.memoryUsage.peak,
                    },
                });
                this.alertCooldowns.set(alertId, Date.now());
            }
        }
        // Low success rate alert
        if (performance.reliabilityMetrics.successRate < this.config.thresholds.minSuccessRate) {
            const alertId = 'low-success-rate';
            if (!this.alertCooldowns.has(alertId) ||
                Date.now() - this.alertCooldowns.get(alertId) > this.config.alerting.cooldownPeriod) {
                alerts.push({
                    id: alertId,
                    severity: 'critical',
                    title: 'Low Success Rate',
                    message: `Success rate is ${performance.reliabilityMetrics.successRate.toFixed(1)}% (threshold: ${this.config.thresholds.minSuccessRate}%)`,
                    timestamp: Date.now(),
                    category: 'reliability',
                    acknowledged: false,
                    metadata: {
                        currentRate: performance.reliabilityMetrics.successRate,
                        threshold: this.config.thresholds.minSuccessRate,
                        recentFailures: performance.reliabilityMetrics.recentFailures.length,
                    },
                });
                this.alertCooldowns.set(alertId, Date.now());
            }
        }
        return alerts;
    }
    /**
     * Generate recommendations based on health check results
     */
    generateRecommendations(checks, performance) {
        const recommendations = [];
        // Collect recommendations from checks
        for (const check of checks) {
            if (check.recommendations) {
                recommendations.push(...check.recommendations);
            }
        }
        // Add performance-based recommendations
        if (performance.executionMetrics.averageExecutionTime > this.config.thresholds.maxExecutionTime) {
            recommendations.push('Consider optimizing Codex CLI operations for better performance');
        }
        if (performance.reliabilityMetrics.successRate < this.config.thresholds.minSuccessRate) {
            recommendations.push('Investigate and address the root causes of operation failures');
        }
        if (performance.resourceMetrics.memoryUsage.current > this.config.thresholds.maxMemoryUsage * 0.8) {
            recommendations.push('Monitor memory usage and consider increasing available memory');
        }
        // Remove duplicates and return
        return [...new Set(recommendations)];
    }
    /**
     * Categorize alert based on check name
     */
    categorizeAlert(checkName) {
        if (checkName.includes('availability') || checkName.includes('version')) {
            return 'availability';
        }
        if (checkName.includes('performance') || checkName.includes('execution')) {
            return 'performance';
        }
        if (checkName.includes('reliability') || checkName.includes('success')) {
            return 'reliability';
        }
        if (checkName.includes('resource') || checkName.includes('memory') || checkName.includes('process')) {
            return 'resource';
        }
        return 'availability';
    }
    /**
     * Clean up old alerts
     */
    cleanupOldAlerts() {
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const cutoffTime = Date.now() - maxAge;
        for (const [alertId, alert] of this.activeAlerts) {
            if (alert.resolvedAt && alert.resolvedAt < cutoffTime) {
                this.activeAlerts.delete(alertId);
            }
        }
        // Limit total active alerts
        if (this.activeAlerts.size > this.config.alerting.maxActiveAlerts) {
            const sortedAlerts = Array.from(this.activeAlerts.entries())
                .sort(([, a], [, b]) => a.timestamp - b.timestamp);
            const toRemove = sortedAlerts.slice(0, this.activeAlerts.size - this.config.alerting.maxActiveAlerts);
            for (const [alertId] of toRemove) {
                this.activeAlerts.delete(alertId);
            }
        }
    }
    /**
     * Add health check results to history
     */
    addToHealthHistory(checks) {
        this.healthHistory.push(...checks);
        // Maintain history size limit
        if (this.healthHistory.length > this.maxHistorySize) {
            this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
        }
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
            alerts: report.alerts.length,
            uptime: report.uptime,
            performance: {
                successRate: report.performance.reliabilityMetrics.successRate.toFixed(1) + '%',
                avgExecutionTime: report.performance.executionMetrics.averageExecutionTime.toFixed(0) + 'ms',
                memoryUsage: report.performance.resourceMetrics.memoryUsage.current + 'MB',
            },
        };
        switch (report.overall) {
            case 'healthy':
                this.componentLogger.info('Codex health check passed', logData);
                break;
            case 'warning':
                this.componentLogger.warn('Codex health check has warnings', logData);
                break;
            case 'critical':
                this.componentLogger.error('Codex health check failed', undefined, logData);
                break;
            case 'unavailable':
                this.componentLogger.error('Codex is unavailable', undefined, logData);
                break;
        }
        // Log individual critical issues
        report.checks
            .filter(check => check.status === 'critical')
            .forEach(check => {
            this.componentLogger.error(`Critical Codex health issue: ${check.name}`, undefined, {
                message: check.message,
                details: check.details,
                recommendations: check.recommendations,
            });
        });
    }
}
// ============================================================================
// Global Instance and Exports
// ============================================================================
/**
 * Global Codex health monitor instance
 */
export const codexHealthMonitor = new CodexHealthMonitor();
/**
 * Convenience functions for health monitoring
 */
export const startCodexHealthMonitoring = (config) => {
    if (config) {
        Object.assign(codexHealthMonitor['config'], config);
    }
    codexHealthMonitor.start();
};
export const stopCodexHealthMonitoring = () => codexHealthMonitor.stop();
export const getCodexHealthStatus = () => codexHealthMonitor.getCurrentHealthStatus();
export const isCodexHealthy = () => codexHealthMonitor.isHealthy();
export const getCodexHealthReport = () => codexHealthMonitor.performHealthCheck();
export const getCodexActiveAlerts = () => codexHealthMonitor.getActiveAlerts();
//# sourceMappingURL=codex-health-monitor.js.map