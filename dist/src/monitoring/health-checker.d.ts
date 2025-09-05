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
import { type MetricsSnapshot } from './metrics-collector.js';
import type { SynchronousAuditEngine } from '../auditor/synchronous-audit-engine.js';
import type { SynchronousSessionManager } from '../session/synchronous-session-manager.js';
/**
 * Health check status levels
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';
/**
 * Individual health check result
 */
export interface HealthCheckResult {
    name: string;
    status: HealthStatus;
    message: string;
    timestamp: number;
    duration: number;
    details?: Record<string, any>;
}
/**
 * Comprehensive system health report
 */
export interface SystemHealthReport {
    overall: HealthStatus;
    timestamp: number;
    uptime: number;
    checks: HealthCheckResult[];
    metrics: MetricsSnapshot;
    recommendations: string[];
}
/**
 * Health check configuration
 */
export interface HealthCheckConfig {
    enabled: boolean;
    interval: number;
    timeout: number;
    thresholds: {
        errorRate: number;
        responseTime: number;
        memoryUsage: number;
        completionRate: number;
        stagnationRate: number;
    };
    codexExecutable: string;
    codexTimeout: number;
}
/**
 * Default health check configuration
 */
export declare const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig;
/**
 * Comprehensive health monitoring system
 */
export declare class HealthChecker extends EventEmitter {
    private readonly config;
    private readonly componentLogger;
    private readonly startTime;
    private auditEngine?;
    private sessionManager?;
    private isRunning;
    private healthCheckInterval?;
    private lastHealthReport?;
    constructor(config?: Partial<HealthCheckConfig>, auditEngine?: SynchronousAuditEngine, sessionManager?: SynchronousSessionManager);
    /**
     * Start health monitoring
     */
    start(): void;
    /**
     * Stop health monitoring
     */
    stop(): void;
    /**
     * Perform immediate health check
     */
    performHealthCheck(): Promise<SystemHealthReport>;
    /**
     * Get last health report
     */
    getLastHealthReport(): SystemHealthReport | undefined;
    /**
     * Get current health status
     */
    getCurrentHealthStatus(): HealthStatus;
    /**
     * Check if system is healthy
     */
    isHealthy(): boolean;
    /**
     * Check system resources (memory, CPU, etc.)
     */
    private checkSystemResources;
    /**
     * Check audit engine health
     */
    private checkAuditEngine;
    /**
     * Check session manager health
     */
    private checkSessionManager;
    /**
     * Check Codex service availability
     */
    private checkCodexService;
    /**
     * Check metrics collection health
     */
    private checkMetricsHealth;
    /**
     * Check performance thresholds
     */
    private checkPerformanceThresholds;
    /**
     * Determine overall health status from individual checks
     */
    private determineOverallHealth;
    /**
     * Generate recommendations based on health check results
     */
    private generateRecommendations;
    /**
     * Log health status information
     */
    private logHealthStatus;
    /**
     * Set audit engine for health monitoring
     */
    setAuditEngine(auditEngine: SynchronousAuditEngine): void;
    /**
     * Set session manager for health monitoring
     */
    setSessionManager(sessionManager: SynchronousSessionManager): void;
}
/**
 * Global health checker instance
 */
export declare const healthChecker: HealthChecker;
/**
 * Convenience function to start health monitoring
 */
export declare function startHealthMonitoring(config?: Partial<HealthCheckConfig>, auditEngine?: SynchronousAuditEngine, sessionManager?: SynchronousSessionManager): void;
/**
 * Convenience function to stop health monitoring
 */
export declare function stopHealthMonitoring(): void;
/**
 * Convenience function to get current health status
 */
export declare function getCurrentHealthStatus(): HealthStatus;
/**
 * Convenience function to check if system is healthy
 */
export declare function isSystemHealthy(): boolean;
//# sourceMappingURL=health-checker.d.ts.map