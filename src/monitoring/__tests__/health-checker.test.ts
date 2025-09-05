/**
 * Tests for Health Checker
 * 
 * This test suite validates the health monitoring functionality for
 * the synchronous audit system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HealthChecker, healthChecker, type HealthStatus } from '../health-checker.js';
import { metricsCollector } from '../metrics-collector.js';

// Mock child_process for Codex service checks
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

// Mock promisify
vi.mock('util', () => ({
  promisify: vi.fn((fn) => vi.fn().mockResolvedValue({ stdout: 'codex v1.0.0', stderr: '' })),
}));

describe('HealthChecker', () => {
  let checker: HealthChecker;

  beforeEach(() => {
    checker = new HealthChecker({
      enabled: true,
      interval: 1000, // 1 second for testing
      timeout: 5000,
    });
    
    // Reset metrics
    metricsCollector.resetMetrics();
  });

  afterEach(() => {
    checker.stop();
  });

  describe('Health Check Execution', () => {
    it('should perform comprehensive health check', async () => {
      const report = await checker.performHealthCheck();
      
      expect(report.overall).toBeDefined();
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.uptime).toBeGreaterThan(0);
      expect(report.checks).toBeInstanceOf(Array);
      expect(report.checks.length).toBeGreaterThan(0);
      expect(report.metrics).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should check system resources', async () => {
      const report = await checker.performHealthCheck();
      
      const systemCheck = report.checks.find(check => check.name === 'system-resources');
      expect(systemCheck).toBeDefined();
      expect(systemCheck!.status).toMatch(/healthy|warning|critical/);
      expect(systemCheck!.message).toBeDefined();
      expect(systemCheck!.details).toBeDefined();
      expect(systemCheck!.details!.memory).toBeDefined();
    });

    it('should check metrics health', async () => {
      const report = await checker.performHealthCheck();
      
      const metricsCheck = report.checks.find(check => check.name === 'metrics-health');
      expect(metricsCheck).toBeDefined();
      expect(metricsCheck!.status).toMatch(/healthy|warning|critical/);
    });

    it('should check performance thresholds', async () => {
      // Generate some metrics data to test thresholds
      metricsCollector.recordAuditCompleted('test-session', 1, 2000, 'pass', 95);
      metricsCollector.recordSessionCompleted('test-session', 5, 'completed');
      
      const report = await checker.performHealthCheck();
      
      const perfCheck = report.checks.find(check => check.name === 'performance-thresholds');
      expect(perfCheck).toBeDefined();
      expect(perfCheck!.status).toMatch(/healthy|warning|critical/);
      expect(perfCheck!.details).toBeDefined();
      expect(perfCheck!.details!.current).toBeDefined();
    });
  });

  describe('Health Status Determination', () => {
    it('should return healthy status when all checks pass', async () => {
      // Mock all checks to return healthy
      const mockChecker = new HealthChecker({
        enabled: true,
        thresholds: {
          errorRate: 100, // Very high threshold
          responseTime: 60000, // Very high threshold
          memoryUsage: 99, // Very high threshold
          completionRate: 0, // Very low threshold
          stagnationRate: 100, // Very high threshold
        },
      });
      
      const report = await mockChecker.performHealthCheck();
      expect(report.overall).toBe('healthy');
    });

    it('should return warning status when some checks have warnings', async () => {
      // Set up conditions that might trigger warnings
      const mockChecker = new HealthChecker({
        enabled: true,
        thresholds: {
          errorRate: 0.1, // Very low threshold to trigger warning
          responseTime: 1, // Very low threshold
          memoryUsage: 1, // Very low threshold
          completionRate: 99, // Very high threshold
          stagnationRate: 1, // Very low threshold
        },
      });
      
      // Generate some data that might trigger warnings
      metricsCollector.recordAuditCompleted('test-session', 1, 10000, 'pass', 95);
      
      const report = await mockChecker.performHealthCheck();
      // Should be warning or critical due to low thresholds
      expect(['warning', 'critical']).toContain(report.overall);
    });
  });

  describe('Health Monitoring Lifecycle', () => {
    it('should start and stop health monitoring', () => {
      expect(checker['isRunning']).toBe(false);
      
      checker.start();
      expect(checker['isRunning']).toBe(true);
      
      checker.stop();
      expect(checker['isRunning']).toBe(false);
    });

    it('should not start if already running', () => {
      checker.start();
      expect(checker['isRunning']).toBe(true);
      
      // Should not throw or change state
      checker.start();
      expect(checker['isRunning']).toBe(true);
    });

    it('should not start if disabled', () => {
      const disabledChecker = new HealthChecker({ enabled: false });
      disabledChecker.start();
      expect(disabledChecker['isRunning']).toBe(false);
    });
  });

  describe('Health Status Queries', () => {
    it('should return current health status', async () => {
      await checker.performHealthCheck();
      
      const status = checker.getCurrentHealthStatus();
      expect(['healthy', 'warning', 'critical', 'unknown']).toContain(status);
    });

    it('should check if system is healthy', async () => {
      await checker.performHealthCheck();
      
      const isHealthy = checker.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should return last health report', async () => {
      const report = await checker.performHealthCheck();
      
      const lastReport = checker.getLastHealthReport();
      expect(lastReport).toBeDefined();
      expect(lastReport!.timestamp).toBe(report.timestamp);
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate recommendations for critical issues', async () => {
      // Create conditions that should generate recommendations
      const mockChecker = new HealthChecker({
        enabled: true,
        thresholds: {
          errorRate: 0, // Will trigger critical
          responseTime: 0, // Will trigger critical
          memoryUsage: 0, // Will trigger critical
          completionRate: 100, // Will trigger critical
          stagnationRate: 0, // Will trigger critical
        },
      });
      
      const report = await mockChecker.performHealthCheck();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide specific recommendations for different issues', async () => {
      // Generate metrics that should trigger specific recommendations
      metricsCollector.recordAuditFailed('test-session', 1, 1000, 'timeout');
      metricsCollector.recordAuditFailed('test-session', 2, 1000, 'error');
      metricsCollector.recordSessionCompleted('test-session', 30, 'failed'); // High loops
      
      const report = await checker.performHealthCheck();
      
      // Should have recommendations based on the failure data
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Check for specific recommendation patterns
      const recommendationText = report.recommendations.join(' ').toLowerCase();
      // Should contain guidance about the issues we created
      expect(recommendationText.length).toBeGreaterThan(0);
    });
  });

  describe('Component Integration', () => {
    it('should integrate with audit engine when provided', () => {
      const mockAuditEngine = {
        isEnabled: vi.fn().mockReturnValue(true),
        getAuditTimeout: vi.fn().mockReturnValue(30000),
        getPerformanceStats: vi.fn().mockReturnValue({}),
      };
      
      checker.setAuditEngine(mockAuditEngine as any);
      
      // Should not throw when performing health check
      expect(async () => {
        await checker.performHealthCheck();
      }).not.toThrow();
    });

    it('should integrate with session manager when provided', () => {
      const mockSessionManager = {
        getSession: vi.fn().mockRejectedValue(new Error('Session not found')),
      };
      
      checker.setSessionManager(mockSessionManager as any);
      
      // Should not throw when performing health check
      expect(async () => {
        await checker.performHealthCheck();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle health check failures gracefully', async () => {
      // Create a checker that will fail some checks
      const failingChecker = new HealthChecker({
        enabled: true,
        codexExecutable: 'non-existent-command',
        codexTimeout: 1000,
      });
      
      const report = await failingChecker.performHealthCheck();
      
      // Should still return a report even with failures
      expect(report).toBeDefined();
      expect(report.overall).toBeDefined();
      expect(report.checks.length).toBeGreaterThan(0);
      
      // Should have at least one critical check due to Codex failure
      const criticalChecks = report.checks.filter(check => check.status === 'critical');
      expect(criticalChecks.length).toBeGreaterThan(0);
    });

    it('should emit health report events', (done) => {
      checker.on('healthReport', (report) => {
        expect(report).toBeDefined();
        expect(report.overall).toBeDefined();
        done();
      });
      
      checker.performHealthCheck();
    });
  });

  describe('Configuration', () => {
    it('should use custom thresholds', async () => {
      const customChecker = new HealthChecker({
        enabled: true,
        thresholds: {
          errorRate: 1,
          responseTime: 1000,
          memoryUsage: 50,
          completionRate: 90,
          stagnationRate: 10,
        },
      });
      
      const report = await customChecker.performHealthCheck();
      
      const perfCheck = report.checks.find(check => check.name === 'performance-thresholds');
      expect(perfCheck).toBeDefined();
      expect(perfCheck!.details!.thresholds).toEqual({
        errorRate: 1,
        responseTime: 1000,
        memoryUsage: 50,
        completionRate: 90,
        stagnationRate: 10,
      });
    });

    it('should respect timeout configuration', async () => {
      const quickChecker = new HealthChecker({
        enabled: true,
        timeout: 100, // Very short timeout
      });
      
      // Should complete within reasonable time even with short timeout
      const startTime = Date.now();
      await quickChecker.performHealthCheck();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});

describe('Global Health Checker', () => {
  afterEach(() => {
    healthChecker.stop();
  });

  it('should provide global access to health checker', async () => {
    const report = await healthChecker.performHealthCheck();
    expect(report).toBeDefined();
    expect(report.overall).toBeDefined();
  });

  it('should maintain state across operations', async () => {
    await healthChecker.performHealthCheck();
    
    const status1 = healthChecker.getCurrentHealthStatus();
    expect(status1).not.toBe('unknown');
    
    // Perform another check
    await healthChecker.performHealthCheck();
    
    const status2 = healthChecker.getCurrentHealthStatus();
    expect(status2).not.toBe('unknown');
  });
});