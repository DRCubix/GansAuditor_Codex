/**
 * Tests for System Prompt Monitoring System
 * 
 * This test suite validates the monitoring, metrics collection, alerting,
 * and dashboard functionality for the system prompt configuration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  SystemPromptMonitoringSystem,
  createMonitoringSystem,
  getGlobalMonitoring,
  Metrics,
  initializeMonitoringFromEnv,
  DEFAULT_ALERTS,
  DEFAULT_MONITORING_CONFIG,
  Alert,
  AlertEvent,
  MetricDataPoint,
} from '../monitoring-system.js';

describe('System Prompt Monitoring System', () => {
  const testDir = join(process.cwd(), 'test-monitoring');
  const originalEnv = process.env;

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('SystemPromptMonitoringSystem', () => {
    let monitoring: SystemPromptMonitoringSystem;

    beforeEach(() => {
      monitoring = new SystemPromptMonitoringSystem({
        ...DEFAULT_MONITORING_CONFIG,
        outputDirectory: testDir,
        exportInterval: 0, // Disable auto-export for tests
      });
    });

    afterEach(() => {
      if (monitoring) {
        monitoring.stop();
      }
    });

    describe('lifecycle management', () => {
      it('should start and stop monitoring system', () => {
        const startSpy = vi.fn();
        const stopSpy = vi.fn();
        
        monitoring.on('started', startSpy);
        monitoring.on('stopped', stopSpy);

        monitoring.start();
        expect(startSpy).toHaveBeenCalled();

        monitoring.stop();
        expect(stopSpy).toHaveBeenCalled();
      });

      it('should not start if already running', () => {
        monitoring.start();
        const initialStartTime = (monitoring as any).startTime;
        
        // Try to start again
        monitoring.start();
        expect((monitoring as any).startTime).toBe(initialStartTime);
      });

      it('should not stop if not running', () => {
        // Should not throw error
        expect(() => monitoring.stop()).not.toThrow();
      });
    });

    describe('metric recording', () => {
      it('should record basic metrics', () => {
        const metricSpy = vi.fn();
        monitoring.on('metric', metricSpy);

        monitoring.recordMetric('test_counter', 'counter', 1, { tag: 'test' });

        expect(metricSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'test_counter',
            type: 'counter',
            value: 1,
            tags: { tag: 'test' },
          })
        );
      });

      it('should record configuration validation metrics', () => {
        monitoring.recordConfigValidation(true, 1500);
        monitoring.recordConfigValidation(false, 2000, ['Error 1', 'Error 2']);

        const summary = monitoring.getMetricsSummary();
        expect(summary.configValidationCount).toBe(2);
        expect(summary.configValidationErrors).toBe(1);
        expect(summary.configValidationDuration).toBeGreaterThan(0);
      });

      it('should record deployment metrics', () => {
        monitoring.recordConfigDeployment('production', true, 5000, true);
        monitoring.recordConfigDeployment('staging', false, 3000, false);

        const summary = monitoring.getMetricsSummary();
        expect(summary.configDeploymentCount).toBe(2);
        expect(summary.configDeploymentErrors).toBe(1);
        expect(summary.backupCount).toBe(1);
      });

      it('should record migration metrics', () => {
        monitoring.recordMigration('1.0.0', '2.0.0', true, 10000);
        monitoring.recordMigration('2.0.0', '2.1.0', false, 8000);

        const summary = monitoring.getMetricsSummary();
        expect(summary.migrationCount).toBe(2);
        expect(summary.migrationErrors).toBe(1);
        expect(summary.migrationDuration).toBeGreaterThan(0);
      });

      it('should record feature flag evaluation metrics', () => {
        monitoring.recordFeatureFlagEvaluation('testFlag', true, true);
        monitoring.recordFeatureFlagEvaluation('testFlag', false, false);

        const summary = monitoring.getMetricsSummary();
        expect(summary.featureFlagEvaluations).toBe(2);
        expect(summary.featureFlagCacheHits).toBe(1);
        expect(summary.featureFlagCacheMisses).toBe(1);
      });

      it('should record audit quality metrics', () => {
        monitoring.recordAuditQuality(true, 85.5, 30000, 5);
        monitoring.recordAuditQuality(false, 65.0, 45000, 8);

        const summary = monitoring.getMetricsSummary();
        expect(summary.auditSuccessRate).toBeGreaterThan(0);
        expect(summary.auditAverageScore).toBeGreaterThan(0);
        expect(summary.auditCompletionTime).toBeGreaterThan(0);
        expect(summary.auditIterationCount).toBeGreaterThan(0);
      });

      it('should record system health metrics', () => {
        monitoring.recordSystemHealth();

        const summary = monitoring.getMetricsSummary();
        expect(summary.memoryUsage).toBeGreaterThanOrEqual(0);
        expect(summary.cpuUsage).toBeGreaterThanOrEqual(0);
      });

      it('should not record metrics when disabled', () => {
        const disabledMonitoring = new SystemPromptMonitoringSystem({
          ...DEFAULT_MONITORING_CONFIG,
          enabled: false,
        });

        const metricSpy = vi.fn();
        disabledMonitoring.on('metric', metricSpy);

        disabledMonitoring.recordMetric('test', 'counter', 1);
        expect(metricSpy).not.toHaveBeenCalled();
      });
    });

    describe('alert management', () => {
      it('should add and remove alerts', () => {
        const testAlert: Alert = {
          id: 'test-alert',
          name: 'Test Alert',
          description: 'Test alert description',
          severity: 'warning',
          condition: {
            metric: 'test_metric',
            operator: 'gt',
            threshold: 10,
            windowMs: 60000,
            aggregation: 'sum',
          },
          enabled: true,
          cooldownMs: 300000,
        };

        monitoring.addAlert(testAlert);
        const alerts = monitoring.getAlerts();
        expect(alerts.some(a => a.id === 'test-alert')).toBe(true);

        monitoring.removeAlert('test-alert');
        const alertsAfterRemoval = monitoring.getAlerts();
        expect(alertsAfterRemoval.some(a => a.id === 'test-alert')).toBe(false);
      });

      it('should have default alerts configured', () => {
        const alerts = monitoring.getAlerts();
        expect(alerts.length).toBeGreaterThan(0);
        
        const alertIds = alerts.map(a => a.id);
        expect(alertIds).toContain('config-validation-errors');
        expect(alertIds).toContain('deployment-failures');
        expect(alertIds).toContain('migration-failures');
      });

      it('should trigger alerts when conditions are met', (done) => {
        const alertSpy = vi.fn();
        monitoring.on('alert', alertSpy);

        // Add a test alert with low threshold
        const testAlert: Alert = {
          id: 'test-trigger',
          name: 'Test Trigger Alert',
          description: 'Test alert that should trigger',
          severity: 'warning',
          condition: {
            metric: 'test_metric',
            operator: 'gt',
            threshold: 1,
            windowMs: 60000,
            aggregation: 'sum',
          },
          enabled: true,
          cooldownMs: 1000,
        };

        monitoring.addAlert(testAlert);

        // Record metrics that should trigger the alert
        monitoring.recordMetric('test_metric', 'counter', 5);
        monitoring.recordMetric('test_metric', 'counter', 3);

        // Manually trigger alert check
        (monitoring as any).checkAlerts();

        // Give some time for async operations
        setTimeout(() => {
          expect(alertSpy).toHaveBeenCalled();
          const alertEvent = alertSpy.mock.calls[0][0] as AlertEvent;
          expect(alertEvent.alertId).toBe('test-trigger');
          expect(alertEvent.severity).toBe('warning');
          done();
        }, 100);
      });

      it('should respect alert cooldown periods', () => {
        const alertSpy = vi.fn();
        monitoring.on('alert', alertSpy);

        const testAlert: Alert = {
          id: 'cooldown-test',
          name: 'Cooldown Test Alert',
          description: 'Test alert cooldown',
          severity: 'info',
          condition: {
            metric: 'cooldown_metric',
            operator: 'gt',
            threshold: 1,
            windowMs: 60000,
            aggregation: 'sum',
          },
          enabled: true,
          cooldownMs: 60000, // 1 minute cooldown
        };

        monitoring.addAlert(testAlert);

        // Trigger alert first time
        monitoring.recordMetric('cooldown_metric', 'counter', 5);
        (monitoring as any).checkAlerts();

        // Try to trigger again immediately (should be blocked by cooldown)
        monitoring.recordMetric('cooldown_metric', 'counter', 5);
        (monitoring as any).checkAlerts();

        // Should only be called once due to cooldown
        expect(alertSpy).toHaveBeenCalledTimes(1);
      });

      it('should not trigger disabled alerts', () => {
        const alertSpy = vi.fn();
        monitoring.on('alert', alertSpy);

        const disabledAlert: Alert = {
          id: 'disabled-alert',
          name: 'Disabled Alert',
          description: 'This alert is disabled',
          severity: 'error',
          condition: {
            metric: 'disabled_metric',
            operator: 'gt',
            threshold: 1,
            windowMs: 60000,
            aggregation: 'sum',
          },
          enabled: false, // Disabled
          cooldownMs: 1000,
        };

        monitoring.addAlert(disabledAlert);

        monitoring.recordMetric('disabled_metric', 'counter', 10);
        (monitoring as any).checkAlerts();

        expect(alertSpy).not.toHaveBeenCalled();
      });
    });

    describe('metrics aggregation', () => {
      beforeEach(() => {
        // Record some test metrics
        monitoring.recordMetric('sum_test', 'counter', 10);
        monitoring.recordMetric('sum_test', 'counter', 20);
        monitoring.recordMetric('sum_test', 'counter', 30);

        monitoring.recordMetric('avg_test', 'gauge', 10);
        monitoring.recordMetric('avg_test', 'gauge', 20);
        monitoring.recordMetric('avg_test', 'gauge', 30);
      });

      it('should calculate sum aggregation correctly', () => {
        const sumValue = (monitoring as any).getMetricValue('sum_test', 'sum', 3600000);
        expect(sumValue).toBe(60); // 10 + 20 + 30
      });

      it('should calculate average aggregation correctly', () => {
        const avgValue = (monitoring as any).getMetricValue('avg_test', 'avg', 3600000);
        expect(avgValue).toBe(20); // (10 + 20 + 30) / 3
      });

      it('should calculate min aggregation correctly', () => {
        const minValue = (monitoring as any).getMetricValue('avg_test', 'min', 3600000);
        expect(minValue).toBe(10);
      });

      it('should calculate max aggregation correctly', () => {
        const maxValue = (monitoring as any).getMetricValue('avg_test', 'max', 3600000);
        expect(maxValue).toBe(30);
      });

      it('should calculate count aggregation correctly', () => {
        const countValue = (monitoring as any).getMetricValue('sum_test', 'count', 3600000);
        expect(countValue).toBe(3);
      });

      it('should return 0 for non-existent metrics', () => {
        const value = (monitoring as any).getMetricValue('non_existent', 'sum', 3600000);
        expect(value).toBe(0);
      });
    });

    describe('data export and persistence', () => {
      it('should export metrics to file', () => {
        monitoring.recordMetric('export_test', 'counter', 42);
        monitoring.exportMetrics();

        // Check if metrics file was created
        const files = require('fs').readdirSync(testDir);
        const metricsFiles = files.filter((f: string) => f.startsWith('metrics-'));
        expect(metricsFiles.length).toBeGreaterThan(0);

        // Verify file content
        const metricsFile = join(testDir, metricsFiles[0]);
        const content = JSON.parse(require('fs').readFileSync(metricsFile, 'utf-8'));
        expect(content.timestamp).toBeDefined();
        expect(content.metrics).toBeDefined();
        expect(content.rawMetrics).toBeDefined();
      });

      it('should export dashboard data', () => {
        monitoring.recordMetric('dashboard_test', 'gauge', 75);
        monitoring.exportDashboard();

        const dashboardFile = join(testDir, 'dashboard.json');
        expect(existsSync(dashboardFile)).toBe(true);

        const dashboardData = JSON.parse(require('fs').readFileSync(dashboardFile, 'utf-8'));
        expect(dashboardData.timestamp).toBeDefined();
        expect(dashboardData.metrics).toBeDefined();
        expect(dashboardData.systemHealth).toBeDefined();
      });

      it('should handle export errors gracefully', () => {
        // Mock writeFileSync to throw error
        vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => {
          throw new Error('Permission denied');
        });

        // Should not throw error
        expect(() => monitoring.exportMetrics()).not.toThrow();
        expect(() => monitoring.exportDashboard()).not.toThrow();

        vi.restoreAllMocks();
      });
    });

    describe('dashboard data generation', () => {
      it('should generate complete dashboard data', () => {
        monitoring.recordConfigValidation(true, 1000);
        monitoring.recordConfigDeployment('production', true, 5000, true);
        monitoring.recordAuditQuality(true, 85, 30000, 5);

        const dashboardData = monitoring.generateDashboardData();

        expect(dashboardData.timestamp).toBeDefined();
        expect(dashboardData.metrics).toBeDefined();
        expect(dashboardData.systemHealth).toBeDefined();
        expect(dashboardData.systemHealth.status).toMatch(/healthy|degraded|critical/);
        expect(dashboardData.systemHealth.uptime).toBeGreaterThan(0);
        expect(dashboardData.recentActivity).toBeDefined();
      });

      it('should determine system health status correctly', () => {
        // Test healthy status
        monitoring.recordConfigValidation(true, 1000);
        let dashboardData = monitoring.generateDashboardData();
        expect(dashboardData.systemHealth.status).toBe('healthy');

        // Test degraded status (high validation errors)
        for (let i = 0; i < 10; i++) {
          monitoring.recordConfigValidation(false, 1000, ['Error']);
        }
        dashboardData = monitoring.generateDashboardData();
        expect(dashboardData.systemHealth.status).toBe('degraded');

        // Test critical status (deployment errors)
        monitoring.recordConfigDeployment('production', false, 5000, false);
        dashboardData = monitoring.generateDashboardData();
        expect(dashboardData.systemHealth.status).toBe('critical');
      });
    });

    describe('metric cleanup', () => {
      it('should clean up old metrics based on retention policy', () => {
        const shortRetentionMonitoring = new SystemPromptMonitoringSystem({
          ...DEFAULT_MONITORING_CONFIG,
          metricsRetentionDays: 0.001, // Very short retention for testing
          outputDirectory: testDir,
        });

        // Record a metric
        shortRetentionMonitoring.recordMetric('cleanup_test', 'counter', 1);
        
        // Wait a bit
        setTimeout(() => {
          // Record another metric (should trigger cleanup)
          shortRetentionMonitoring.recordMetric('cleanup_test', 'counter', 2);
          
          // Check that old data was cleaned up
          const metricData = (shortRetentionMonitoring as any).metrics.get('cleanup_test');
          expect(metricData.length).toBeLessThanOrEqual(1);
        }, 10);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('createMonitoringSystem', () => {
      it('should create monitoring system with default config', () => {
        const monitoring = createMonitoringSystem();
        expect(monitoring).toBeInstanceOf(SystemPromptMonitoringSystem);
      });

      it('should create monitoring system with custom config', () => {
        const monitoring = createMonitoringSystem({
          enabled: false,
          outputDirectory: testDir,
        });
        expect(monitoring).toBeInstanceOf(SystemPromptMonitoringSystem);
      });
    });

    describe('getGlobalMonitoring', () => {
      it('should return singleton instance', () => {
        const monitoring1 = getGlobalMonitoring();
        const monitoring2 = getGlobalMonitoring();
        expect(monitoring1).toBe(monitoring2);
      });
    });

    describe('Metrics utility functions', () => {
      it('should record metrics through utility functions', () => {
        const monitoring = getGlobalMonitoring();
        const metricSpy = vi.fn();
        monitoring.on('metric', metricSpy);

        Metrics.recordConfigValidation(true, 1500);
        Metrics.recordConfigDeployment('test', true, 3000, true);
        Metrics.recordMigration('1.0.0', '2.0.0', true, 5000);
        Metrics.recordFeatureFlagEvaluation('testFlag', true, false);
        Metrics.recordAuditQuality(true, 90, 25000, 3);
        Metrics.recordSystemHealth();

        expect(metricSpy).toHaveBeenCalledTimes(13); // Multiple metrics per call
      });
    });

    describe('initializeMonitoringFromEnv', () => {
      it('should initialize monitoring from environment variables', () => {
        process.env.GAN_AUDITOR_MONITORING_ENABLED = 'true';
        process.env.GAN_AUDITOR_METRICS_RETENTION_DAYS = '7';
        process.env.GAN_AUDITOR_EXPORT_INTERVAL = '30000';
        process.env.GAN_AUDITOR_LOG_LEVEL = 'debug';
        process.env.GAN_AUDITOR_MONITORING_DIR = testDir;

        const monitoring = initializeMonitoringFromEnv();
        expect(monitoring).toBeInstanceOf(SystemPromptMonitoringSystem);
      });

      it('should use default values when env vars not set', () => {
        // Clear relevant env vars
        delete process.env.GAN_AUDITOR_MONITORING_ENABLED;
        delete process.env.GAN_AUDITOR_METRICS_RETENTION_DAYS;

        const monitoring = initializeMonitoringFromEnv();
        expect(monitoring).toBeInstanceOf(SystemPromptMonitoringSystem);
      });

      it('should start monitoring when enabled', () => {
        process.env.GAN_AUDITOR_MONITORING_ENABLED = 'true';
        
        const monitoring = initializeMonitoringFromEnv();
        expect((monitoring as any).isRunning).toBe(true);
        
        monitoring.stop();
      });
    });
  });

  describe('Default Configuration', () => {
    it('should have reasonable default monitoring config', () => {
      expect(DEFAULT_MONITORING_CONFIG.enabled).toBe(true);
      expect(DEFAULT_MONITORING_CONFIG.metricsRetentionDays).toBeGreaterThan(0);
      expect(DEFAULT_MONITORING_CONFIG.exportInterval).toBeGreaterThan(0);
      expect(DEFAULT_MONITORING_CONFIG.alertingEnabled).toBe(true);
      expect(DEFAULT_MONITORING_CONFIG.dashboardEnabled).toBe(true);
    });

    it('should have comprehensive default alerts', () => {
      expect(DEFAULT_ALERTS.length).toBeGreaterThan(0);
      
      const alertIds = DEFAULT_ALERTS.map(a => a.id);
      expect(alertIds).toContain('config-validation-errors');
      expect(alertIds).toContain('deployment-failures');
      expect(alertIds).toContain('migration-failures');
      expect(alertIds).toContain('audit-success-rate-low');
      expect(alertIds).toContain('memory-usage-high');

      // Check that all alerts have required fields
      for (const alert of DEFAULT_ALERTS) {
        expect(alert.id).toBeDefined();
        expect(alert.name).toBeDefined();
        expect(alert.description).toBeDefined();
        expect(alert.severity).toMatch(/info|warning|error|critical/);
        expect(alert.condition).toBeDefined();
        expect(alert.condition.metric).toBeDefined();
        expect(alert.condition.operator).toMatch(/gt|lt|eq|gte|lte|ne/);
        expect(alert.condition.threshold).toBeDefined();
        expect(alert.condition.windowMs).toBeGreaterThan(0);
        expect(alert.condition.aggregation).toMatch(/avg|sum|min|max|count/);
        expect(alert.cooldownMs).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid metric names gracefully', () => {
      const monitoring = createMonitoringSystem({ outputDirectory: testDir });
      
      // Should not throw errors
      expect(() => monitoring.recordMetric('', 'counter', 1)).not.toThrow();
      expect(() => monitoring.recordMetric('valid-name', 'counter', NaN)).not.toThrow();
      expect(() => monitoring.recordMetric('valid-name', 'counter', Infinity)).not.toThrow();
    });

    it('should handle file system errors during alert writing', () => {
      const monitoring = createMonitoringSystem({ outputDirectory: '/invalid/path' });
      
      const testAlert: Alert = {
        id: 'fs-error-test',
        name: 'FS Error Test',
        description: 'Test filesystem error handling',
        severity: 'error',
        condition: {
          metric: 'fs_test',
          operator: 'gt',
          threshold: 1,
          windowMs: 60000,
          aggregation: 'sum',
        },
        enabled: true,
        cooldownMs: 1000,
      };

      monitoring.addAlert(testAlert);
      monitoring.recordMetric('fs_test', 'counter', 5);
      
      // Should not throw error even with invalid path
      expect(() => (monitoring as any).checkAlerts()).not.toThrow();
    });

    it('should handle webhook errors gracefully', async () => {
      const monitoring = createMonitoringSystem({
        outputDirectory: testDir,
        webhookUrl: 'http://invalid-webhook-url',
      });

      const alertEvent: AlertEvent = {
        alertId: 'test',
        alertName: 'Test Alert',
        severity: 'error',
        message: 'Test message',
        timestamp: Date.now(),
        metricValue: 10,
        threshold: 5,
      };

      // Should not throw error
      await expect((monitoring as any).sendWebhook(alertEvent)).resolves.toBeUndefined();
    });

    it('should handle malformed alert conditions', () => {
      const monitoring = createMonitoringSystem({ outputDirectory: testDir });
      
      const malformedAlert: Alert = {
        id: 'malformed-alert',
        name: 'Malformed Alert',
        description: 'Alert with malformed condition',
        severity: 'warning',
        condition: {
          metric: 'test_metric',
          operator: 'invalid' as any,
          threshold: 10,
          windowMs: 60000,
          aggregation: 'sum',
        },
        enabled: true,
        cooldownMs: 1000,
      };

      monitoring.addAlert(malformedAlert);
      monitoring.recordMetric('test_metric', 'counter', 15);
      
      // Should not throw error and should not trigger alert
      expect(() => (monitoring as any).checkAlerts()).not.toThrow();
    });
  });
});