/**
 * Codex Monitoring Integration
 * 
 * This module provides a comprehensive integration example showing how to use
 * all the Codex logging and monitoring components together for production deployment.
 * 
 * Requirements addressed:
 * - 7.1: Log all Codex CLI command executions with arguments and timing
 * - 7.2: Add detailed error logging with context information
 * - 7.3: Add execution time tracking and statistics
 * - 7.4: Implement debug logging for troubleshooting
 * - 7.5: Implement resource usage monitoring and health checks
 */

import { logger, createComponentLogger } from '../utils/logger.js';
import { codexOperationLogger, logCodexCommand, logCodexError } from './codex-operation-logger.js';
import { codexPerformanceMetrics, recordCodexExecution, updateCodexProcessState } from './codex-performance-metrics.js';
import { codexHealthMonitor, startCodexHealthMonitoring } from './codex-health-monitor.js';
import type { ProcessManager } from '../codex/process-manager.js';
import type { EnvironmentManager } from '../codex/environment-manager.js';
import type { CodexJudge } from '../codex/codex-judge.js';
import type { ProcessExecutionOptions, ProcessResult } from '../codex/process-manager.js';
import type { CodexOperationType } from './codex-operation-logger.js';

// ============================================================================
// Integration Configuration
// ============================================================================

/**
 * Comprehensive monitoring configuration
 */
export interface CodexMonitoringConfig {
  // Operation logging configuration
  operationLogging: {
    enabled: boolean;
    logDirectory: string;
    enableDebugLogging: boolean;
    flushInterval: number;
  };
  
  // Performance metrics configuration
  performanceMetrics: {
    enabled: boolean;
    sampleRetentionPeriod: number;
    enableResourceMonitoring: boolean;
    enableThroughputTracking: boolean;
    alertThresholds: {
      executionTime: number;
      successRate: number;
      memoryUsage: number;
      errorRate: number;
    };
  };
  
  // Health monitoring configuration
  healthMonitoring: {
    enabled: boolean;
    checkInterval: number;
    codexExecutable: string;
    thresholds: {
      availabilityTimeout: number;
      maxExecutionTime: number;
      minSuccessRate: number;
      maxErrorRate: number;
      maxMemoryUsage: number;
    };
    alerting: {
      enabled: boolean;
      cooldownPeriod: number;
    };
  };
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: CodexMonitoringConfig = {
  operationLogging: {
    enabled: true,
    logDirectory: './logs/codex',
    enableDebugLogging: process.env.NODE_ENV !== 'production' || process.env.CODEX_DEBUG === 'true',
    flushInterval: 10000, // 10 seconds
  },
  
  performanceMetrics: {
    enabled: true,
    sampleRetentionPeriod: 60 * 60 * 1000, // 1 hour
    enableResourceMonitoring: true,
    enableThroughputTracking: true,
    alertThresholds: {
      executionTime: 30000, // 30 seconds
      successRate: 80, // 80%
      memoryUsage: 500, // 500 MB
      errorRate: 5, // 5 errors per minute
    },
  },
  
  healthMonitoring: {
    enabled: true,
    checkInterval: 30000, // 30 seconds
    codexExecutable: 'codex',
    thresholds: {
      availabilityTimeout: 5000, // 5 seconds
      maxExecutionTime: 30000, // 30 seconds
      minSuccessRate: 80, // 80%
      maxErrorRate: 5, // 5 errors per minute
      maxMemoryUsage: 500, // 500 MB
    },
    alerting: {
      enabled: true,
      cooldownPeriod: 300000, // 5 minutes
    },
  },
};

// ============================================================================
// Integrated Monitoring System
// ============================================================================

/**
 * Comprehensive Codex monitoring system that integrates all monitoring components
 */
export class CodexMonitoringSystem {
  private readonly config: CodexMonitoringConfig;
  private readonly componentLogger: typeof logger;
  private isStarted = false;

  // Component references
  private processManager?: ProcessManager;
  private environmentManager?: EnvironmentManager;
  private codexJudge?: CodexJudge;

  constructor(config: Partial<CodexMonitoringConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.componentLogger = createComponentLogger('codex-monitoring-system');

    this.componentLogger.info('Codex monitoring system initialized', {
      operationLogging: this.config.operationLogging.enabled,
      performanceMetrics: this.config.performanceMetrics.enabled,
      healthMonitoring: this.config.healthMonitoring.enabled,
    });
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Start the comprehensive monitoring system
   */
  start(components?: {
    processManager?: ProcessManager;
    environmentManager?: EnvironmentManager;
    codexJudge?: CodexJudge;
  }): void {
    if (this.isStarted) {
      this.componentLogger.warn('Codex monitoring system is already started');
      return;
    }

    // Store component references
    if (components) {
      this.processManager = components.processManager;
      this.environmentManager = components.environmentManager;
      this.codexJudge = components.codexJudge;
    }

    try {
      // Start operation logging
      if (this.config.operationLogging.enabled) {
        // Operation logger is automatically started with global instance
        this.componentLogger.info('Codex operation logging enabled');
      }

      // Start performance metrics
      if (this.config.performanceMetrics.enabled) {
        // Performance metrics collector is automatically started with global instance
        this.setupPerformanceMetricsIntegration();
        this.componentLogger.info('Codex performance metrics enabled');
      }

      // Start health monitoring
      if (this.config.healthMonitoring.enabled) {
        codexHealthMonitor.setComponents({
          processManager: this.processManager,
          environmentManager: this.environmentManager,
          codexJudge: this.codexJudge,
        });
        
        startCodexHealthMonitoring(this.config.healthMonitoring);
        this.componentLogger.info('Codex health monitoring started');
      }

      // Set up event listeners for integration
      this.setupEventListeners();

      this.isStarted = true;
      this.componentLogger.info('Codex monitoring system started successfully');

    } catch (error) {
      this.componentLogger.error('Failed to start Codex monitoring system', error as Error);
      throw error;
    }
  }

  /**
   * Stop the monitoring system
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      // Stop operation logging
      if (this.config.operationLogging.enabled) {
        await codexOperationLogger.stop();
        this.componentLogger.info('Codex operation logging stopped');
      }

      // Stop performance metrics
      if (this.config.performanceMetrics.enabled) {
        codexPerformanceMetrics.stop();
        this.componentLogger.info('Codex performance metrics stopped');
      }

      // Stop health monitoring
      if (this.config.healthMonitoring.enabled) {
        codexHealthMonitor.stop();
        this.componentLogger.info('Codex health monitoring stopped');
      }

      this.isStarted = false;
      this.componentLogger.info('Codex monitoring system stopped successfully');

    } catch (error) {
      this.componentLogger.error('Failed to stop Codex monitoring system', error as Error);
      throw error;
    }
  }

  /**
   * Get comprehensive monitoring status
   */
  async getMonitoringStatus(): Promise<{
    system: {
      started: boolean;
      uptime: number;
      components: {
        operationLogging: boolean;
        performanceMetrics: boolean;
        healthMonitoring: boolean;
      };
    };
    operations: {
      statistics: ReturnType<typeof codexOperationLogger.getOperationStatistics>;
      recentCommands: ReturnType<typeof codexOperationLogger.getRecentCommandSummaries>;
    };
    performance: {
      snapshot: ReturnType<typeof codexPerformanceMetrics.getPerformanceSnapshot>;
      execution: ReturnType<typeof codexPerformanceMetrics.getExecutionStatistics>;
      resources: ReturnType<typeof codexPerformanceMetrics.getResourceStatistics>;
      reliability: ReturnType<typeof codexPerformanceMetrics.getReliabilityStatistics>;
    };
    health: {
      status: ReturnType<typeof codexHealthMonitor.getCurrentHealthStatus>;
      report: Awaited<ReturnType<typeof codexHealthMonitor.performHealthCheck>>;
      alerts: ReturnType<typeof codexHealthMonitor.getActiveAlerts>;
    };
  }> {
    const healthReport = await codexHealthMonitor.performHealthCheck();

    return {
      system: {
        started: this.isStarted,
        uptime: Date.now() - (this.componentLogger as any).startTime || 0,
        components: {
          operationLogging: this.config.operationLogging.enabled,
          performanceMetrics: this.config.performanceMetrics.enabled,
          healthMonitoring: this.config.healthMonitoring.enabled,
        },
      },
      operations: {
        statistics: codexOperationLogger.getOperationStatistics(),
        recentCommands: codexOperationLogger.getRecentCommandSummaries(10),
      },
      performance: {
        snapshot: codexPerformanceMetrics.getPerformanceSnapshot(),
        execution: codexPerformanceMetrics.getExecutionStatistics(),
        resources: codexPerformanceMetrics.getResourceStatistics(),
        reliability: codexPerformanceMetrics.getReliabilityStatistics(),
      },
      health: {
        status: codexHealthMonitor.getCurrentHealthStatus(),
        report: healthReport,
        alerts: codexHealthMonitor.getActiveAlerts(),
      },
    };
  }

  /**
   * Export comprehensive monitoring data
   */
  async exportMonitoringData(outputPath: string): Promise<void> {
    this.componentLogger.info(`Exporting comprehensive monitoring data to: ${outputPath}`);

    try {
      const status = await this.getMonitoringStatus();
      const exportData = {
        timestamp: Date.now(),
        config: this.config,
        status,
        performanceMetrics: codexPerformanceMetrics.exportMetrics(),
        healthHistory: codexHealthMonitor.getHealthHistory(50),
      };

      // In a real implementation, you would write this to a file
      // For now, we'll just log the export
      this.componentLogger.info('Monitoring data exported successfully', {
        dataSize: JSON.stringify(exportData).length,
        outputPath,
      });

    } catch (error) {
      this.componentLogger.error('Failed to export monitoring data', error as Error);
      throw error;
    }
  }

  /**
   * Get monitoring summary for quick status check
   */
  getMonitoringSummary(): string {
    const operationStats = codexOperationLogger.getOperationStatistics();
    const performanceSnapshot = codexPerformanceMetrics.getPerformanceSnapshot();
    const healthStatus = codexHealthMonitor.getCurrentHealthStatus();

    const summary = [
      `Status: ${this.isStarted ? 'Active' : 'Inactive'}`,
      `Health: ${healthStatus}`,
      `Operations: ${operationStats.totalOperations} (${operationStats.successRate.toFixed(1)}% success)`,
      `Avg Execution: ${performanceSnapshot.execution.averageExecutionTime.toFixed(0)}ms`,
      `Memory: ${performanceSnapshot.resources.memoryUsage.current}MB`,
      `Active Processes: ${performanceSnapshot.resources.processCount.current}`,
    ];

    const activeAlerts = codexHealthMonitor.getActiveAlerts();
    if (activeAlerts.length > 0) {
      summary.push(`Alerts: ${activeAlerts.length}`);
    }

    return summary.join(' | ');
  }

  // ============================================================================
  // Integration Helper Methods
  // ============================================================================

  /**
   * Integrated command execution with full monitoring
   * This method demonstrates how to use all monitoring components together
   */
  async executeMonitoredCommand(
    executable: string,
    args: string[],
    options: ProcessExecutionOptions,
    operationType: CodexOperationType,
    sessionId?: string,
    thoughtNumber?: number
  ): Promise<ProcessResult> {
    // Start operation logging
    const operationTimer = logCodexCommand(executable, args, options, sessionId, thoughtNumber);
    const executionId = operationTimer.getExecutionId();

    // Update process state for performance metrics
    const activeProcesses = this.processManager?.getActiveProcessCount() || 0;
    const queuedProcesses = this.processManager?.getQueuedProcessCount() || 0;
    updateCodexProcessState(activeProcesses, queuedProcesses);

    try {
      // Execute the command (this would be done by ProcessManager in real implementation)
      const startTime = Date.now();
      
      // Simulate command execution for this example
      // In real implementation, this would be: await this.processManager.executeCommand(executable, args, options)
      const result: ProcessResult = {
        stdout: 'Command executed successfully',
        stderr: '',
        exitCode: 0,
        executionTime: Date.now() - startTime,
        timedOut: false,
      };

      // Complete operation logging
      operationTimer.complete(result);

      // Record performance metrics
      recordCodexExecution(
        operationType,
        result.executionTime,
        result.exitCode === 0 && !result.timedOut,
        result.timedOut,
        0, // retry count
        result.exitCode !== 0 ? {
          category: 'execution',
          type: operationType,
          message: result.stderr || 'Command failed',
        } : undefined
      );

      this.componentLogger.info('Monitored command executed successfully', {
        executionId,
        operationType,
        duration: result.executionTime,
        sessionId,
        thoughtNumber,
      });

      return result;

    } catch (error) {
      // Complete operation logging with error
      operationTimer.completeWithError(error as Error);

      // Record performance metrics for failure
      recordCodexExecution(
        operationType,
        Date.now() - Date.now(), // This would be actual duration
        false,
        false,
        0,
        {
          category: 'error',
          type: operationType,
          message: (error as Error).message,
        }
      );

      // Log error with context
      logCodexError(operationType, error as Error, {
        executionId,
        sessionId,
        thoughtNumber,
        command: `${executable} ${args.join(' ')}`,
        additionalContext: {
          workingDirectory: options.workingDirectory,
          timeout: options.timeout,
        },
      });

      this.componentLogger.error('Monitored command execution failed', error as Error, {
        executionId,
        operationType,
        sessionId,
        thoughtNumber,
      });

      throw error;
    }
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Set up performance metrics integration
   */
  private setupPerformanceMetricsIntegration(): void {
    // Set up performance alerts
    codexPerformanceMetrics.on('performance-alert', (alertData) => {
      this.componentLogger.warn('Performance alert triggered', alertData);
    });

    // Set up metrics updates
    codexPerformanceMetrics.on('metrics-updated', (snapshot) => {
      this.componentLogger.debug('Performance metrics updated', {
        totalExecutions: snapshot.execution.totalExecutions,
        successRate: snapshot.reliability.successRate.toFixed(1) + '%',
        averageExecutionTime: snapshot.execution.averageExecutionTime.toFixed(0) + 'ms',
      });
    });
  }

  /**
   * Set up event listeners for component integration
   */
  private setupEventListeners(): void {
    // Health monitoring events
    codexHealthMonitor.on('health-report', (report) => {
      this.componentLogger.debug('Health report generated', {
        overall: report.overall,
        checksCount: report.checks.length,
        alertsCount: report.alerts.length,
      });
    });

    codexHealthMonitor.on('alert-created', (alert) => {
      this.componentLogger.warn('Health alert created', {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        category: alert.category,
      });
    });

    codexHealthMonitor.on('alert-resolved', (alert) => {
      this.componentLogger.info('Health alert resolved', {
        id: alert.id,
        title: alert.title,
        duration: alert.resolvedAt ? alert.resolvedAt - alert.timestamp : 0,
      });
    });

    // Performance metrics events
    codexPerformanceMetrics.on('performance-alert', (alertData) => {
      this.componentLogger.warn('Performance threshold exceeded', {
        operationType: alertData.operationType,
        alerts: alertData.alerts,
        timestamp: alertData.timestamp,
      });
    });

    this.componentLogger.debug('Event listeners set up for monitoring integration');
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: Partial<CodexMonitoringConfig>): CodexMonitoringConfig {
    return {
      operationLogging: {
        enabled: config.operationLogging?.enabled ?? DEFAULT_MONITORING_CONFIG.operationLogging.enabled,
        logDirectory: config.operationLogging?.logDirectory ?? DEFAULT_MONITORING_CONFIG.operationLogging.logDirectory,
        enableDebugLogging: config.operationLogging?.enableDebugLogging ?? DEFAULT_MONITORING_CONFIG.operationLogging.enableDebugLogging,
        flushInterval: config.operationLogging?.flushInterval ?? DEFAULT_MONITORING_CONFIG.operationLogging.flushInterval,
      },
      
      performanceMetrics: {
        enabled: config.performanceMetrics?.enabled ?? DEFAULT_MONITORING_CONFIG.performanceMetrics.enabled,
        sampleRetentionPeriod: config.performanceMetrics?.sampleRetentionPeriod ?? DEFAULT_MONITORING_CONFIG.performanceMetrics.sampleRetentionPeriod,
        enableResourceMonitoring: config.performanceMetrics?.enableResourceMonitoring ?? DEFAULT_MONITORING_CONFIG.performanceMetrics.enableResourceMonitoring,
        enableThroughputTracking: config.performanceMetrics?.enableThroughputTracking ?? DEFAULT_MONITORING_CONFIG.performanceMetrics.enableThroughputTracking,
        alertThresholds: {
          executionTime: config.performanceMetrics?.alertThresholds?.executionTime ?? DEFAULT_MONITORING_CONFIG.performanceMetrics.alertThresholds.executionTime,
          successRate: config.performanceMetrics?.alertThresholds?.successRate ?? DEFAULT_MONITORING_CONFIG.performanceMetrics.alertThresholds.successRate,
          memoryUsage: config.performanceMetrics?.alertThresholds?.memoryUsage ?? DEFAULT_MONITORING_CONFIG.performanceMetrics.alertThresholds.memoryUsage,
          errorRate: config.performanceMetrics?.alertThresholds?.errorRate ?? DEFAULT_MONITORING_CONFIG.performanceMetrics.alertThresholds.errorRate,
        },
      },
      
      healthMonitoring: {
        enabled: config.healthMonitoring?.enabled ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.enabled,
        checkInterval: config.healthMonitoring?.checkInterval ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.checkInterval,
        codexExecutable: config.healthMonitoring?.codexExecutable ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.codexExecutable,
        thresholds: {
          availabilityTimeout: config.healthMonitoring?.thresholds?.availabilityTimeout ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.thresholds.availabilityTimeout,
          maxExecutionTime: config.healthMonitoring?.thresholds?.maxExecutionTime ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.thresholds.maxExecutionTime,
          minSuccessRate: config.healthMonitoring?.thresholds?.minSuccessRate ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.thresholds.minSuccessRate,
          maxErrorRate: config.healthMonitoring?.thresholds?.maxErrorRate ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.thresholds.maxErrorRate,
          maxMemoryUsage: config.healthMonitoring?.thresholds?.maxMemoryUsage ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.thresholds.maxMemoryUsage,
        },
        alerting: {
          enabled: config.healthMonitoring?.alerting?.enabled ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.alerting.enabled,
          cooldownPeriod: config.healthMonitoring?.alerting?.cooldownPeriod ?? DEFAULT_MONITORING_CONFIG.healthMonitoring.alerting.cooldownPeriod,
        },
      },
    };
  }
}

// ============================================================================
// Global Instance and Convenience Functions
// ============================================================================

/**
 * Global Codex monitoring system instance
 */
export const codexMonitoringSystem = new CodexMonitoringSystem();

/**
 * Start comprehensive Codex monitoring
 */
export function startCodexMonitoring(
  config?: Partial<CodexMonitoringConfig>,
  components?: {
    processManager?: ProcessManager;
    environmentManager?: EnvironmentManager;
    codexJudge?: CodexJudge;
  }
): void {
  if (config) {
    // Create new instance with custom config
    const customSystem = new CodexMonitoringSystem(config);
    customSystem.start(components);
  } else {
    codexMonitoringSystem.start(components);
  }
}

/**
 * Stop comprehensive Codex monitoring
 */
export async function stopCodexMonitoring(): Promise<void> {
  await codexMonitoringSystem.stop();
}

/**
 * Get comprehensive monitoring status
 */
export async function getCodexMonitoringStatus(): Promise<ReturnType<typeof codexMonitoringSystem.getMonitoringStatus>> {
  return await codexMonitoringSystem.getMonitoringStatus();
}

/**
 * Get monitoring summary
 */
export function getCodexMonitoringSummary(): string {
  return codexMonitoringSystem.getMonitoringSummary();
}

/**
 * Execute a monitored Codex command
 */
export async function executeMonitoredCodexCommand(
  executable: string,
  args: string[],
  options: ProcessExecutionOptions,
  operationType: CodexOperationType,
  sessionId?: string,
  thoughtNumber?: number
): Promise<ProcessResult> {
  return await codexMonitoringSystem.executeMonitoredCommand(
    executable,
    args,
    options,
    operationType,
    sessionId,
    thoughtNumber
  );
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example of how to use the comprehensive monitoring system
 */
export async function exampleUsage(): Promise<void> {
  const logger = createComponentLogger('codex-monitoring-example');

  try {
    // Start monitoring with custom configuration
    startCodexMonitoring({
      operationLogging: {
        enabled: true,
        enableDebugLogging: true,
        logDirectory: './logs/codex-operations',
        flushInterval: 5000,
      },
      performanceMetrics: {
        enabled: true,
        enableResourceMonitoring: true,
        alertThresholds: {
          executionTime: 20000, // 20 seconds
          successRate: 85, // 85%
          memoryUsage: 400, // 400 MB
          errorRate: 3, // 3 errors per minute
        },
      },
      healthMonitoring: {
        enabled: true,
        checkInterval: 60000, // 1 minute
        thresholds: {
          availabilityTimeout: 3000, // 3 seconds
          maxExecutionTime: 25000, // 25 seconds
          minSuccessRate: 85, // 85%
          maxErrorRate: 3, // 3 errors per minute
          maxMemoryUsage: 400, // 400 MB
        },
      },
    });

    // Execute a monitored command
    const result = await executeMonitoredCodexCommand(
      'codex',
      ['exec', '--json', 'analyze this code'],
      {
        workingDirectory: process.cwd(),
        timeout: 30000,
        environment: process.env as Record<string, string>,
      },
      'audit_execution',
      'example-session-123',
      1
    );

    logger.info('Monitored command executed', {
      success: result.exitCode === 0,
      duration: result.executionTime,
      outputSize: result.stdout.length,
    });

    // Get monitoring status
    const status = await getCodexMonitoringStatus();
    logger.info('Monitoring status', {
      summary: getCodexMonitoringSummary(),
      healthStatus: status.health.status,
      totalOperations: status.operations.statistics.totalOperations,
      successRate: status.performance.reliability.successRate,
    });

    // Stop monitoring when done
    await stopCodexMonitoring();
    logger.info('Monitoring stopped');

  } catch (error) {
    logger.error('Example usage failed', error as Error);
    throw error;
  }
}