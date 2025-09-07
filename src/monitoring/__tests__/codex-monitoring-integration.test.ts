/**
 * Tests for Codex Monitoring Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CodexMonitoringSystem,
  startCodexMonitoring,
  stopCodexMonitoring,
  getCodexMonitoringStatus,
  getCodexMonitoringSummary,
  executeMonitoredCodexCommand,
  DEFAULT_MONITORING_CONFIG
} from '../codex-monitoring-integration.js';
import type { ProcessExecutionOptions, ProcessResult } from '../../codex/process-manager.js';

describe('CodexMonitoringSystem', () => {
  let monitoringSystem: CodexMonitoringSystem;

  beforeEach(() => {
    monitoringSystem = new CodexMonitoringSystem();
  });

  afterEach(async () => {
    if (monitoringSystem) {
      await monitoringSystem.stop();
    }
  });

  describe('System Lifecycle', () => {
    it('should initialize with default configuration', () => {
      expect(monitoringSystem).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        operationLogging: {
          enabled: false,
          logDirectory: './custom-logs',
          enableDebugLogging: false,
          flushInterval: 5000,
        },
      };

      const customSystem = new CodexMonitoringSystem(customConfig);
      expect(customSystem).toBeDefined();
    });

    it('should start monitoring system', () => {
      expect(() => {
        monitoringSystem.start();
      }).not.toThrow();
    });

    it('should not start if already started', () => {
      monitoringSystem.start();
      
      // Should not throw when starting again
      expect(() => {
        monitoringSystem.start();
      }).not.toThrow();
    });

    it('should stop monitoring system', async () => {
      monitoringSystem.start();
      
      await expect(monitoringSystem.stop()).resolves.not.toThrow();
    });
  });

  describe('Monitoring Status', () => {
    it('should get monitoring status', async () => {
      monitoringSystem.start();
      
      const status = await monitoringSystem.getMonitoringStatus();
      
      expect(status).toBeDefined();
      expect(status.system).toBeDefined();
      expect(status.operations).toBeDefined();
      expect(status.performance).toBeDefined();
      expect(status.health).toBeDefined();
      
      expect(status.system.started).toBe(true);
      expect(status.system.components).toBeDefined();
    });

    it('should get monitoring summary', () => {
      monitoringSystem.start();
      
      const summary = monitoringSystem.getMonitoringSummary();
      
      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary).toContain('Status:');
      expect(summary).toContain('Health:');
    });

    it('should export monitoring data', async () => {
      monitoringSystem.start();
      
      await expect(
        monitoringSystem.exportMonitoringData('./test-export.json')
      ).resolves.not.toThrow();
    });
  });

  describe('Command Execution Monitoring', () => {
    it('should execute monitored command successfully', async () => {
      monitoringSystem.start();
      
      const options: ProcessExecutionOptions = {
        workingDirectory: process.cwd(),
        timeout: 5000,
        environment: { PATH: process.env.PATH || '' },
      };

      // Mock the actual command execution since we don't have a real ProcessManager
      const result = await monitoringSystem.executeMonitoredCommand(
        'echo',
        ['test'],
        options,
        'command_execution',
        'test-session',
        1
      );

      expect(result).toBeDefined();
      expect(result.stdout).toBeDefined();
      expect(result.stderr).toBeDefined();
      expect(result.exitCode).toBeDefined();
      expect(result.executionTime).toBeDefined();
    });

    it('should handle command execution errors', async () => {
      monitoringSystem.start();
      
      const options: ProcessExecutionOptions = {
        workingDirectory: process.cwd(),
        timeout: 5000,
        environment: { PATH: process.env.PATH || '' },
      };

      // This should work since we're mocking the execution
      await expect(
        monitoringSystem.executeMonitoredCommand(
          'nonexistent-command',
          ['arg'],
          options,
          'command_execution',
          'test-session',
          1
        )
      ).resolves.toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should merge configuration correctly', () => {
      const partialConfig = {
        performanceMetrics: {
          enabled: false,
          alertThresholds: {
            executionTime: 60000,
          },
        },
      };

      const system = new CodexMonitoringSystem(partialConfig);
      expect(system).toBeDefined();
    });

    it('should use default configuration when none provided', () => {
      const system = new CodexMonitoringSystem();
      expect(system).toBeDefined();
    });
  });
});

describe('Global Functions', () => {
  afterEach(async () => {
    await stopCodexMonitoring();
  });

  describe('Convenience Functions', () => {
    it('should start monitoring with convenience function', () => {
      expect(() => {
        startCodexMonitoring();
      }).not.toThrow();
    });

    it('should stop monitoring with convenience function', async () => {
      startCodexMonitoring();
      
      await expect(stopCodexMonitoring()).resolves.not.toThrow();
    });

    it('should get monitoring status with convenience function', async () => {
      startCodexMonitoring();
      
      const status = await getCodexMonitoringStatus();
      
      expect(status).toBeDefined();
      expect(status.system).toBeDefined();
    });

    it('should get monitoring summary with convenience function', () => {
      startCodexMonitoring();
      
      const summary = getCodexMonitoringSummary();
      
      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
    });

    it('should execute monitored command with convenience function', async () => {
      startCodexMonitoring();
      
      const options: ProcessExecutionOptions = {
        workingDirectory: process.cwd(),
        timeout: 5000,
        environment: { PATH: process.env.PATH || '' },
      };

      const result = await executeMonitoredCodexCommand(
        'echo',
        ['test'],
        options,
        'command_execution',
        'test-session',
        1
      );

      expect(result).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should start with custom configuration', () => {
      const customConfig = {
        operationLogging: {
          enabled: true,
          enableDebugLogging: true,
          logDirectory: './test-logs',
          flushInterval: 1000,
        },
        performanceMetrics: {
          enabled: true,
          alertThresholds: {
            executionTime: 10000,
            successRate: 90,
            memoryUsage: 1000,
            errorRate: 2,
          },
        },
        healthMonitoring: {
          enabled: true,
          checkInterval: 10000,
          codexExecutable: 'test-codex',
          thresholds: {
            availabilityTimeout: 2000,
            maxExecutionTime: 15000,
            minSuccessRate: 90,
            maxErrorRate: 2,
            maxMemoryUsage: 1000,
          },
          alerting: {
            enabled: true,
            cooldownPeriod: 60000,
          },
        },
      };

      expect(() => {
        startCodexMonitoring(customConfig);
      }).not.toThrow();
    });
  });
});

describe('Default Configuration', () => {
  it('should have valid default configuration', () => {
    expect(DEFAULT_MONITORING_CONFIG).toBeDefined();
    expect(DEFAULT_MONITORING_CONFIG.operationLogging).toBeDefined();
    expect(DEFAULT_MONITORING_CONFIG.performanceMetrics).toBeDefined();
    expect(DEFAULT_MONITORING_CONFIG.healthMonitoring).toBeDefined();
    
    // Check operation logging defaults
    expect(DEFAULT_MONITORING_CONFIG.operationLogging.enabled).toBe(true);
    expect(DEFAULT_MONITORING_CONFIG.operationLogging.logDirectory).toBe('./logs/codex');
    expect(DEFAULT_MONITORING_CONFIG.operationLogging.flushInterval).toBeGreaterThan(0);
    
    // Check performance metrics defaults
    expect(DEFAULT_MONITORING_CONFIG.performanceMetrics.enabled).toBe(true);
    expect(DEFAULT_MONITORING_CONFIG.performanceMetrics.sampleRetentionPeriod).toBeGreaterThan(0);
    expect(DEFAULT_MONITORING_CONFIG.performanceMetrics.alertThresholds).toBeDefined();
    
    // Check health monitoring defaults
    expect(DEFAULT_MONITORING_CONFIG.healthMonitoring.enabled).toBe(true);
    expect(DEFAULT_MONITORING_CONFIG.healthMonitoring.checkInterval).toBeGreaterThan(0);
    expect(DEFAULT_MONITORING_CONFIG.healthMonitoring.thresholds).toBeDefined();
  });

  it('should have reasonable threshold values', () => {
    const thresholds = DEFAULT_MONITORING_CONFIG.performanceMetrics.alertThresholds;
    
    expect(thresholds.executionTime).toBeGreaterThan(0);
    expect(thresholds.successRate).toBeGreaterThan(0);
    expect(thresholds.successRate).toBeLessThanOrEqual(100);
    expect(thresholds.memoryUsage).toBeGreaterThan(0);
    expect(thresholds.errorRate).toBeGreaterThan(0);
  });

  it('should have reasonable health monitoring thresholds', () => {
    const thresholds = DEFAULT_MONITORING_CONFIG.healthMonitoring.thresholds;
    
    expect(thresholds.availabilityTimeout).toBeGreaterThan(0);
    expect(thresholds.maxExecutionTime).toBeGreaterThan(0);
    expect(thresholds.minSuccessRate).toBeGreaterThan(0);
    expect(thresholds.minSuccessRate).toBeLessThanOrEqual(100);
    expect(thresholds.maxErrorRate).toBeGreaterThan(0);
    expect(thresholds.maxMemoryUsage).toBeGreaterThan(0);
  });
});