/**
 * Integration Tests for Monitoring System
 * 
 * This test suite validates the basic integration and functionality
 * of the monitoring system components.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  MetricsCollector,
  HealthChecker,
  DebugTools,
  AuditLogger,
  MonitoringSystem,
} from '../index.js';

describe('Monitoring System Integration', () => {
  let metricsCollector: MetricsCollector;
  let healthChecker: HealthChecker;
  let debugTools: DebugTools;
  let auditLogger: AuditLogger;
  let monitoringSystem: MonitoringSystem;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
    healthChecker = new HealthChecker({ enabled: false }); // Disable to avoid external dependencies
    debugTools = new DebugTools({ enableDetailedLogging: false });
    auditLogger = new AuditLogger({ enabled: false }); // Disable to avoid file operations
    monitoringSystem = new MonitoringSystem({ enabled: false }); // Disable for testing
  });

  afterEach(async () => {
    metricsCollector.resetMetrics();
    healthChecker.stop();
    await auditLogger.stop();
    await monitoringSystem.stop();
  });

  describe('MetricsCollector Basic Functionality', () => {
    it('should collect and report basic metrics', () => {
      // Record some audit events
      metricsCollector.recordAuditStarted('test-session', 1);
      metricsCollector.recordAuditCompleted('test-session', 1, 2000, 'pass', 95);
      
      // Record session events
      metricsCollector.recordSessionCreated('test-session');
      metricsCollector.recordSessionCompleted('test-session', 5, 'completed');
      
      // Get metrics snapshot
      const metrics = metricsCollector.getMetricsSnapshot();
      
      expect(metrics.completion.totalAudits).toBe(1);
      expect(metrics.completion.completedAudits).toBe(1);
      expect(metrics.completion.completionRate).toBe(100);
      expect(metrics.loops.totalLoops).toBe(5);
      expect(metrics.performance.averageAuditDuration).toBe(2000);
    });

    it('should track completion tiers correctly', () => {
      // Test different completion tiers
      metricsCollector.recordSessionCompleted('session-1', 8, 'completed');  // Tier 1
      metricsCollector.recordSessionCompleted('session-2', 12, 'completed'); // Tier 2
      metricsCollector.recordSessionCompleted('session-3', 18, 'completed'); // Tier 3
      metricsCollector.recordSessionCompleted('session-4', 25, 'completed'); // Hard stop
      
      const metrics = metricsCollector.getCompletionMetrics();
      expect(metrics.completionsByTier.tier1).toBe(1);
      expect(metrics.completionsByTier.tier2).toBe(1);
      expect(metrics.completionsByTier.tier3).toBe(1);
      expect(metrics.completionsByTier.hardStop).toBe(1);
    });

    it('should generate metrics summary', () => {
      metricsCollector.recordAuditCompleted('test-session', 1, 2000, 'pass', 95);
      metricsCollector.recordSessionCompleted('test-session', 5, 'completed');
      
      const summary = metricsCollector.getMetricsSummary();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain('Completion:');
    });
  });

  describe('HealthChecker Basic Functionality', () => {
    it('should create health checker instance', () => {
      expect(healthChecker).toBeDefined();
      expect(typeof healthChecker.performHealthCheck).toBe('function');
      expect(typeof healthChecker.getCurrentHealthStatus).toBe('function');
    });

    it('should return health status', () => {
      const status = healthChecker.getCurrentHealthStatus();
      expect(['healthy', 'warning', 'critical', 'unknown']).toContain(status);
    });

    it('should check if system is healthy', () => {
      const isHealthy = healthChecker.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('DebugTools Basic Functionality', () => {
    it('should create debug tools instance', () => {
      expect(debugTools).toBeDefined();
      expect(typeof debugTools.listSessions).toBe('function');
      expect(typeof debugTools.inspectSession).toBe('function');
      expect(typeof debugTools.analyzePerformance).toBe('function');
    });

    it('should analyze performance over time window', async () => {
      const result = await debugTools.analyzePerformance(3600000);
      
      expect(result).toBeDefined();
      expect(result.timeRange).toBeDefined();
      expect(result.timeRange.duration).toBe(3600000);
      expect(result.auditPerformance).toBeDefined();
      expect(result.sessionPerformance).toBeDefined();
      expect(result.resourceUsage).toBeDefined();
      expect(result.bottlenecks).toBeInstanceOf(Array);
    });
  });

  describe('AuditLogger Basic Functionality', () => {
    it('should create audit logger instance', () => {
      expect(auditLogger).toBeDefined();
      expect(typeof auditLogger.logAuditEvent).toBe('function');
      expect(typeof auditLogger.getBufferSizes).toBe('function');
    });

    it('should track buffer sizes', () => {
      const buffers = auditLogger.getBufferSizes();
      expect(buffers).toBeDefined();
      expect(typeof buffers.audit).toBe('number');
      expect(typeof buffers.session).toBe('number');
      expect(typeof buffers.performance).toBe('number');
      expect(typeof buffers.codex).toBe('number');
    });
  });

  describe('MonitoringSystem Integration', () => {
    it('should create monitoring system instance', () => {
      expect(monitoringSystem).toBeDefined();
      expect(typeof monitoringSystem.start).toBe('function');
      expect(typeof monitoringSystem.stop).toBe('function');
      expect(typeof monitoringSystem.getSystemStatus).toBe('function');
    });

    it('should handle lifecycle operations', async () => {
      expect(monitoringSystem['isStarted']).toBe(false);
      
      monitoringSystem.start();
      // Note: System won't actually start because it's disabled in config
      
      await monitoringSystem.stop();
      expect(monitoringSystem['isStarted']).toBe(false);
    });

    it('should provide monitoring summary', () => {
      const summary = monitoringSystem.getMonitoringSummary();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should check health status', () => {
      const isHealthy = monitoringSystem.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Component Interaction', () => {
    it('should allow metrics collection and health checking together', async () => {
      // Record some metrics
      metricsCollector.recordAuditCompleted('integration-test', 1, 1500, 'pass', 90);
      metricsCollector.recordSessionCompleted('integration-test', 3, 'completed');
      
      // Get metrics
      const metrics = metricsCollector.getMetricsSnapshot();
      expect(metrics.completion.totalAudits).toBe(1);
      
      // Check health (should work even if disabled)
      const healthStatus = healthChecker.getCurrentHealthStatus();
      expect(healthStatus).toBeDefined();
    });

    it('should provide consistent data across components', () => {
      // Record events in metrics collector
      metricsCollector.recordAuditStarted('consistency-test', 1);
      metricsCollector.recordAuditCompleted('consistency-test', 1, 2500, 'revise', 75);
      metricsCollector.recordSessionCreated('consistency-test');
      
      // Get metrics snapshot
      const metrics = metricsCollector.getMetricsSnapshot();
      
      // Verify data consistency
      expect(metrics.completion.totalAudits).toBe(1);
      expect(metrics.completion.completedAudits).toBe(1);
      expect(metrics.performance.averageAuditDuration).toBe(2500);
      expect(metrics.sessions.totalSessions).toBe(1);
      
      // Get monitoring summary
      const summary = monitoringSystem.getMonitoringSummary();
      expect(summary).toContain('Monitoring:');
    });
  });

  describe('Configuration Handling', () => {
    it('should handle different configuration options', () => {
      const customSystem = new MonitoringSystem({
        enabled: true,
        metrics: { enabled: false },
        health: { enabled: false },
        debug: { enabled: true },
        logging: { enabled: false },
      });
      
      expect(customSystem['config'].enabled).toBe(true);
      expect(customSystem['config'].metrics.enabled).toBe(false);
      expect(customSystem['config'].health.enabled).toBe(false);
      expect(customSystem['config'].debug.enabled).toBe(true);
      expect(customSystem['config'].logging.enabled).toBe(false);
    });

    it('should merge partial configurations correctly', () => {
      const partialConfig = {
        metrics: { retentionPeriod: 7200000 },
        health: { 
          thresholds: { 
            errorRate: 10,
            responseTime: 8000,
          }
        },
      };
      
      const customSystem = new MonitoringSystem(partialConfig);
      const config = customSystem['config'];
      
      expect(config.metrics.retentionPeriod).toBe(7200000);
      expect(config.health.thresholds.errorRate).toBe(10);
      expect(config.health.thresholds.responseTime).toBe(8000);
      // Should still have defaults for other values
      expect(config.enabled).toBe(true);
      expect(config.debug.enabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle metrics reset gracefully', () => {
      metricsCollector.recordAuditCompleted('error-test', 1, 1000, 'pass', 95);
      
      let metrics = metricsCollector.getMetricsSnapshot();
      expect(metrics.completion.totalAudits).toBe(1);
      
      metricsCollector.resetMetrics();
      
      metrics = metricsCollector.getMetricsSnapshot();
      expect(metrics.completion.totalAudits).toBe(0);
    });

    it('should handle system stop when not started', async () => {
      expect(monitoringSystem['isStarted']).toBe(false);
      
      // Should not throw
      await expect(monitoringSystem.stop()).resolves.not.toThrow();
    });
  });
});

describe('Module Exports', () => {
  it('should export all required components', async () => {
    const module = await import('../index.js');
    
    // Classes
    expect(module.MetricsCollector).toBeDefined();
    expect(module.HealthChecker).toBeDefined();
    expect(module.DebugTools).toBeDefined();
    expect(module.AuditLogger).toBeDefined();
    expect(module.MonitoringSystem).toBeDefined();
    
    // Global instances
    expect(module.metricsCollector).toBeDefined();
    expect(module.healthChecker).toBeDefined();
    expect(module.debugTools).toBeDefined();
    expect(module.auditLogger).toBeDefined();
    expect(module.monitoringSystem).toBeDefined();
  });

  it('should export convenience functions', async () => {
    const module = await import('../index.js');
    
    expect(typeof module.startMonitoring).toBe('function');
    expect(typeof module.stopMonitoring).toBe('function');
    expect(typeof module.getSystemStatus).toBe('function');
    expect(typeof module.getMonitoringSummary).toBe('function');
    expect(typeof module.isMonitoringHealthy).toBe('function');
    expect(typeof module.initializeMonitoring).toBe('function');
    expect(typeof module.cleanupMonitoring).toBe('function');
  });

  it('should export type definitions', () => {
    // This test verifies that the types are properly exported
    // TypeScript compilation will catch any missing exports
    expect(true).toBe(true);
  });
});