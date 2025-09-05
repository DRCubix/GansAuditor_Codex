/**
 * Tests for Monitoring System
 * 
 * This test suite validates the comprehensive monitoring and observability
 * system integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  MonitoringSystem, 
  monitoringSystem,
  startMonitoring,
  stopMonitoring,
  getSystemStatus,
  getMonitoringSummary,
  isMonitoringHealthy,
  initializeMonitoring,
  cleanupMonitoring,
} from '../index.js';

// Mock the individual monitoring components
vi.mock('../metrics-collector.js', () => ({
  metricsCollector: {
    getMetricsSnapshot: vi.fn().mockReturnValue({
      timestamp: Date.now(),
      completion: { totalAudits: 10, completedAudits: 8, completionRate: 80 },
      loops: { averageLoopsPerSession: 5.5, stagnationRate: 10 },
      performance: { averageAuditDuration: 2500, cacheHitRate: 75 },
      sessions: { activeSessions: 3, totalSessions: 15 },
      codex: { activeContexts: 2, totalContextsCreated: 8 },
      health: { uptime: 3600000, memoryUsage: { percentage: 65 } },
    }),
    getMetricsSummary: vi.fn().mockReturnValue('Completion: 80.0% (8/10), Avg Loops: 5.5'),
    resetMetrics: vi.fn(),
  },
}));

vi.mock('../health-checker.js', () => ({
  healthChecker: {
    performHealthCheck: vi.fn().mockResolvedValue({
      overall: 'healthy',
      timestamp: Date.now(),
      uptime: 3600000,
      checks: [
        { name: 'system-resources', status: 'healthy', message: 'All good' },
        { name: 'audit-engine', status: 'healthy', message: 'Operating normally' },
      ],
      metrics: {},
      recommendations: [],
    }),
    getCurrentHealthStatus: vi.fn().mockReturnValue('healthy'),
    isHealthy: vi.fn().mockReturnValue(true),
    start: vi.fn(),
    stop: vi.fn(),
    setAuditEngine: vi.fn(),
    setSessionManager: vi.fn(),
  },
  startHealthMonitoring: vi.fn(),
  stopHealthMonitoring: vi.fn(),
}));

vi.mock('../debug-tools.js', () => ({
  debugTools: {
    exportDiagnostics: vi.fn().mockResolvedValue(undefined),
    inspectSession: vi.fn().mockResolvedValue({
      sessionId: 'test-session',
      exists: true,
      isValid: true,
      issues: [],
      recommendations: [],
    }),
    analyzeSession: vi.fn().mockResolvedValue({
      sessionId: 'test-session',
      summary: { totalIterations: 5, currentLoop: 5 },
      progressAnalysis: { improvementTrend: 'improving' },
      performanceMetrics: { averageAuditDuration: 2000 },
      issues: [],
      recommendations: [],
    }),
    analyzePerformance: vi.fn().mockResolvedValue({
      timeRange: { start: Date.now() - 3600000, end: Date.now(), duration: 3600000 },
      auditPerformance: { totalAudits: 10, averageDuration: 2500 },
      sessionPerformance: { totalSessions: 5, averageLoops: 6 },
      resourceUsage: { peakMemoryUsage: 128, memoryTrend: 'stable' },
      bottlenecks: [],
    }),
  },
}));

vi.mock('../audit-logger.js', () => ({
  auditLogger: {
    stop: vi.fn().mockResolvedValue(undefined),
    getBufferSizes: vi.fn().mockReturnValue({
      audit: 5,
      session: 3,
      performance: 2,
      codex: 1,
    }),
  },
}));

describe('MonitoringSystem', () => {
  let system: MonitoringSystem;

  beforeEach(() => {
    system = new MonitoringSystem({
      enabled: true,
      metrics: { enabled: true, retentionPeriod: 3600000 },
      health: { enabled: true, checkInterval: 60000, thresholds: {} },
      debug: { enabled: true, sessionStateDirectory: '.test-state', maxInspectionResults: 50 },
      logging: { enabled: true, logDirectory: './test-logs', flushInterval: 5000 },
    });
    
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await system.stop();
  });

  describe('System Lifecycle', () => {
    it('should start monitoring system', () => {
      const mockAuditEngine = { isEnabled: vi.fn(), getAuditTimeout: vi.fn() };
      const mockSessionManager = { getSession: vi.fn() };

      system.start(mockAuditEngine as any, mockSessionManager as any);

      expect(system['isStarted']).toBe(true);
    });

    it('should not start if already started', () => {
      system.start();
      expect(system['isStarted']).toBe(true);

      // Should not throw or change state
      system.start();
      expect(system['isStarted']).toBe(true);
    });

    it('should not start if disabled', () => {
      const disabledSystem = new MonitoringSystem({ enabled: false });
      disabledSystem.start();
      expect(disabledSystem['isStarted']).toBe(false);
    });

    it('should stop monitoring system', async () => {
      system.start();
      expect(system['isStarted']).toBe(true);

      await system.stop();
      expect(system['isStarted']).toBe(false);
    });

    it('should handle stop when not started', async () => {
      expect(system['isStarted']).toBe(false);
      
      // Should not throw
      await expect(system.stop()).resolves.not.toThrow();
    });
  });

  describe('System Status', () => {
    it('should get comprehensive system status', async () => {
      system.start();

      const status = await system.getSystemStatus();

      expect(status.monitoring).toBeDefined();
      expect(status.monitoring.enabled).toBe(true);
      expect(status.monitoring.started).toBe(true);
      expect(status.monitoring.components).toBeDefined();
      expect(status.monitoring.components.metrics).toBe(true);
      expect(status.monitoring.components.health).toBe(true);
      expect(status.monitoring.components.debug).toBe(true);
      expect(status.monitoring.components.logging).toBe(true);

      expect(status.metrics).toBeDefined();
      expect(status.health).toBeDefined();
      expect(status.performance).toBeDefined();
      expect(status.performance.bufferSizes).toBeDefined();
      expect(status.performance.uptime).toBeGreaterThan(0);
      expect(status.performance.memoryUsage).toBeDefined();
    });

    it('should get monitoring summary', () => {
      system.start();

      const summary = system.getMonitoringSummary();

      expect(typeof summary).toBe('string');
      expect(summary).toContain('Monitoring: Active');
      expect(summary).toContain('Health: healthy');
      expect(summary).toContain('Metrics:');
    });

    it('should check if monitoring is healthy', () => {
      system.start();

      const isHealthy = system.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
      expect(isHealthy).toBe(true); // Based on mocked health checker
    });
  });

  describe('Diagnostic Operations', () => {
    it('should export diagnostics', async () => {
      const outputPath = '/tmp/test-diagnostics.json';

      await system.exportDiagnostics(outputPath);

      const { debugTools } = await import('../debug-tools.js');
      expect(debugTools.exportDiagnostics).toHaveBeenCalledWith(outputPath);
    });

    it('should perform health check', async () => {
      const report = await system.performHealthCheck();

      expect(report).toBeDefined();
      expect(report.overall).toBe('healthy');
      expect(report.checks).toBeDefined();
    });

    it('should inspect session', async () => {
      const result = await system.inspectSession('test-session');

      expect(result).toBeDefined();
      expect(result.sessionId).toBe('test-session');
      expect(result.exists).toBe(true);
    });

    it('should analyze session', async () => {
      const result = await system.analyzeSession('test-session');

      expect(result).toBeDefined();
      expect(result.sessionId).toBe('test-session');
      expect(result.summary).toBeDefined();
      expect(result.progressAnalysis).toBeDefined();
    });

    it('should analyze performance', async () => {
      const result = await system.analyzePerformance(3600000);

      expect(result).toBeDefined();
      expect(result.timeRange).toBeDefined();
      expect(result.auditPerformance).toBeDefined();
      expect(result.sessionPerformance).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        health: {
          enabled: false,
          checkInterval: 120000,
        },
      };

      system.updateConfig(newConfig);

      expect(system['config'].health.enabled).toBe(false);
      expect(system['config'].health.checkInterval).toBe(120000);
    });

    it('should merge configuration with defaults', () => {
      const partialConfig = {
        metrics: { enabled: false },
      };

      const customSystem = new MonitoringSystem(partialConfig);

      expect(customSystem['config'].metrics.enabled).toBe(false);
      expect(customSystem['config'].health.enabled).toBe(true); // Should use default
      expect(customSystem['config'].debug.enabled).toBe(true); // Should use default
    });
  });

  describe('Error Handling', () => {
    it('should handle start errors gracefully', () => {
      const { startHealthMonitoring } = require('../health-checker.js');
      startHealthMonitoring.mockImplementation(() => {
        throw new Error('Health monitoring failed to start');
      });

      expect(() => system.start()).toThrow('Health monitoring failed to start');
    });

    it('should handle stop errors gracefully', async () => {
      const { auditLogger } = await import('../audit-logger.js');
      auditLogger.stop.mockRejectedValue(new Error('Failed to stop audit logger'));

      system.start();

      await expect(system.stop()).rejects.toThrow('Failed to stop audit logger');
    });

    it('should handle diagnostic export errors', async () => {
      const { debugTools } = await import('../debug-tools.js');
      debugTools.exportDiagnostics.mockRejectedValue(new Error('Export failed'));

      await expect(system.exportDiagnostics('/invalid/path')).rejects.toThrow('Export failed');
    });
  });
});

describe('Global Monitoring System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await stopMonitoring();
  });

  it('should provide global access to monitoring system', () => {
    expect(monitoringSystem).toBeDefined();
    expect(typeof monitoringSystem.start).toBe('function');
    expect(typeof monitoringSystem.stop).toBe('function');
  });

  it('should start monitoring with convenience function', () => {
    const config = { enabled: true };
    const mockAuditEngine = { isEnabled: vi.fn() };
    const mockSessionManager = { getSession: vi.fn() };

    startMonitoring(config, mockAuditEngine as any, mockSessionManager as any);

    expect(monitoringSystem['isStarted']).toBe(true);
  });

  it('should stop monitoring with convenience function', async () => {
    startMonitoring();
    expect(monitoringSystem['isStarted']).toBe(true);

    await stopMonitoring();
    expect(monitoringSystem['isStarted']).toBe(false);
  });

  it('should get system status with convenience function', async () => {
    startMonitoring();

    const status = await getSystemStatus();

    expect(status).toBeDefined();
    expect(status.monitoring).toBeDefined();
    expect(status.metrics).toBeDefined();
    expect(status.health).toBeDefined();
  });

  it('should get monitoring summary with convenience function', () => {
    startMonitoring();

    const summary = getMonitoringSummary();

    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('should check health with convenience function', () => {
    startMonitoring();

    const isHealthy = isMonitoringHealthy();

    expect(typeof isHealthy).toBe('boolean');
  });
});

describe('Integration Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupMonitoring();
  });

  it('should initialize monitoring for synchronous audit workflow', () => {
    const mockAuditEngine = { 
      isEnabled: vi.fn().mockReturnValue(true),
      getAuditTimeout: vi.fn().mockReturnValue(30000),
    };
    const mockSessionManager = { 
      getSession: vi.fn().mockResolvedValue(null),
    };
    const config = { enabled: true };

    initializeMonitoring(mockAuditEngine as any, mockSessionManager as any, config);

    expect(monitoringSystem['isStarted']).toBe(true);
  });

  it('should handle initialization errors', () => {
    const mockAuditEngine = null;
    const mockSessionManager = null;

    // Should throw due to missing required components
    expect(() => {
      initializeMonitoring(mockAuditEngine as any, mockSessionManager as any);
    }).toThrow();
  });

  it('should cleanup monitoring resources', async () => {
    initializeMonitoring({} as any, {} as any);
    expect(monitoringSystem['isStarted']).toBe(true);

    await cleanupMonitoring();
    expect(monitoringSystem['isStarted']).toBe(false);
  });

  it('should handle cleanup errors gracefully', async () => {
    const { auditLogger } = await import('../audit-logger.js');
    auditLogger.stop.mockRejectedValue(new Error('Cleanup failed'));

    initializeMonitoring({} as any, {} as any);

    await expect(cleanupMonitoring()).rejects.toThrow('Cleanup failed');
  });
});

describe('Configuration Merging', () => {
  it('should merge partial configuration correctly', () => {
    const partialConfig = {
      enabled: false,
      metrics: {
        enabled: false,
      },
      health: {
        thresholds: {
          errorRate: 10,
          responseTime: 8000,
        },
      },
    };

    const system = new MonitoringSystem(partialConfig);
    const config = system['config'];

    expect(config.enabled).toBe(false);
    expect(config.metrics.enabled).toBe(false);
    expect(config.metrics.retentionPeriod).toBeDefined(); // Should use default
    expect(config.health.enabled).toBe(true); // Should use default
    expect(config.health.thresholds.errorRate).toBe(10);
    expect(config.health.thresholds.responseTime).toBe(8000);
    expect(config.health.thresholds.memoryUsage).toBeDefined(); // Should use default
    expect(config.debug.enabled).toBe(true); // Should use default
    expect(config.logging.enabled).toBe(true); // Should use default
  });

  it('should handle empty configuration', () => {
    const system = new MonitoringSystem({});
    const config = system['config'];

    // Should use all defaults
    expect(config.enabled).toBe(true);
    expect(config.metrics.enabled).toBe(true);
    expect(config.health.enabled).toBe(true);
    expect(config.debug.enabled).toBe(true);
    expect(config.logging.enabled).toBe(true);
  });
});

describe('Component Integration', () => {
  it('should integrate all monitoring components', async () => {
    const system = new MonitoringSystem({ enabled: true });
    
    system.start();

    // Should have started all components
    expect(system['isStarted']).toBe(true);

    // Should be able to get comprehensive status
    const status = await system.getSystemStatus();
    expect(status.monitoring.components.metrics).toBe(true);
    expect(status.monitoring.components.health).toBe(true);
    expect(status.monitoring.components.debug).toBe(true);
    expect(status.monitoring.components.logging).toBe(true);

    await system.stop();
  });

  it('should handle selective component disabling', () => {
    const system = new MonitoringSystem({
      enabled: true,
      metrics: { enabled: false },
      health: { enabled: false },
      debug: { enabled: false },
      logging: { enabled: false },
    });

    system.start();

    const config = system['config'];
    expect(config.metrics.enabled).toBe(false);
    expect(config.health.enabled).toBe(false);
    expect(config.debug.enabled).toBe(false);
    expect(config.logging.enabled).toBe(false);
  });
});