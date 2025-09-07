/**
 * Codex Performance Metrics Collection
 * 
 * This module provides specialized performance metrics collection for Codex CLI operations,
 * including execution time tracking, resource usage monitoring, and success/failure rate tracking.
 * 
 * Requirements addressed:
 * - 7.3: Add execution time tracking and statistics
 * - 7.5: Implement resource usage monitoring
 * - 7.5: Add success/failure rate tracking
 */

import { EventEmitter } from 'events';
import { logger, createComponentLogger, PerformanceTimer } from '../utils/logger.js';
import type { ProcessResult } from '../codex/process-manager.js';
import type { CodexOperationType } from './codex-operation-logger.js';

// ============================================================================
// Performance Metrics Types
// ============================================================================

/**
 * Codex execution timing metrics
 */
export interface CodexExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timedOutExecutions: number;
  averageExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  fastestExecution: number;
  slowestExecution: number;
  executionTimeDistribution: {
    under1s: number;
    under5s: number;
    under10s: number;
    under30s: number;
    under60s: number;
    over60s: number;
  };
}

/**
 * Codex resource usage metrics
 */
export interface CodexResourceMetrics {
  memoryUsage: {
    current: number; // MB
    peak: number; // MB
    average: number; // MB
    samples: number[];
  };
  cpuUsage: {
    current: number; // percentage
    peak: number; // percentage
    average: number; // percentage
    samples: number[];
  };
  processCount: {
    current: number;
    peak: number;
    average: number;
  };
  queueMetrics: {
    currentSize: number;
    peakSize: number;
    averageWaitTime: number;
    totalProcessed: number;
  };
}

/**
 * Codex success/failure rate metrics
 */
export interface CodexReliabilityMetrics {
  successRate: number; // percentage
  failureRate: number; // percentage
  timeoutRate: number; // percentage
  retryRate: number; // percentage
  errorsByCategory: Record<string, number>;
  errorsByType: Record<CodexOperationType, number>;
  mtbf: number; // Mean Time Between Failures (ms)
  mttr: number; // Mean Time To Recovery (ms)
  availability: number; // percentage
  recentFailures: Array<{
    timestamp: number;
    operationType: CodexOperationType;
    error: string;
    duration: number;
  }>;
}

/**
 * Codex throughput metrics
 */
export interface CodexThroughputMetrics {
  operationsPerSecond: number;
  operationsPerMinute: number;
  operationsPerHour: number;
  peakThroughput: number;
  throughputTrend: Array<{
    timestamp: number;
    count: number;
    duration: number;
  }>;
  concurrencyMetrics: {
    averageConcurrency: number;
    peakConcurrency: number;
    concurrencyUtilization: number; // percentage of max concurrent processes used
  };
}

/**
 * Comprehensive Codex performance snapshot
 */
export interface CodexPerformanceSnapshot {
  timestamp: number;
  uptime: number;
  execution: CodexExecutionMetrics;
  resources: CodexResourceMetrics;
  reliability: CodexReliabilityMetrics;
  throughput: CodexThroughputMetrics;
  trends: {
    executionTimesTrend: 'improving' | 'stable' | 'degrading';
    successRateTrend: 'improving' | 'stable' | 'degrading';
    throughputTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

/**
 * Performance metrics configuration
 */
export interface CodexPerformanceConfig {
  enabled: boolean;
  sampleRetentionPeriod: number; // milliseconds
  maxSamples: number;
  metricsUpdateInterval: number; // milliseconds
  enableResourceMonitoring: boolean;
  enableThroughputTracking: boolean;
  enableTrendAnalysis: boolean;
  alertThresholds: {
    executionTime: number; // milliseconds
    successRate: number; // percentage
    memoryUsage: number; // MB
    errorRate: number; // errors per minute
  };
}

/**
 * Default performance metrics configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: CodexPerformanceConfig = {
  enabled: true,
  sampleRetentionPeriod: 60 * 60 * 1000, // 1 hour
  maxSamples: 1000,
  metricsUpdateInterval: 30000, // 30 seconds
  enableResourceMonitoring: true,
  enableThroughputTracking: true,
  enableTrendAnalysis: true,
  alertThresholds: {
    executionTime: 30000, // 30 seconds
    successRate: 80, // 80%
    memoryUsage: 500, // 500 MB
    errorRate: 5, // 5 errors per minute
  },
};

// ============================================================================
// Performance Sample Types
// ============================================================================

/**
 * Individual execution sample
 */
interface ExecutionSample {
  timestamp: number;
  operationType: CodexOperationType;
  duration: number;
  success: boolean;
  timedOut: boolean;
  retryCount: number;
  memoryUsage: number;
  cpuUsage?: number;
  error?: {
    category: string;
    type: string;
    message: string;
  };
}

/**
 * Resource usage sample
 */
interface ResourceSample {
  timestamp: number;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  activeProcesses: number;
  queueSize: number;
}

/**
 * Throughput sample
 */
interface ThroughputSample {
  timestamp: number;
  operationCount: number;
  duration: number; // time window duration
  concurrentProcesses: number;
}

// ============================================================================
// Codex Performance Metrics Collector
// ============================================================================

/**
 * Specialized performance metrics collector for Codex operations
 */
export class CodexPerformanceMetrics extends EventEmitter {
  private readonly config: CodexPerformanceConfig;
  private readonly componentLogger: typeof logger;
  private readonly startTime: number;

  // Sample storage
  private executionSamples: ExecutionSample[] = [];
  private resourceSamples: ResourceSample[] = [];
  private throughputSamples: ThroughputSample[] = [];

  // Current state tracking
  private currentMetrics: {
    activeProcesses: number;
    queueSize: number;
    peakMemoryUsage: number;
    peakCpuUsage: number;
    peakConcurrency: number;
    lastFailureTime: number;
    consecutiveFailures: number;
  };

  // Timers and intervals
  private metricsUpdateTimer?: NodeJS.Timeout;
  private resourceMonitorTimer?: NodeJS.Timeout;

  constructor(config: Partial<CodexPerformanceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.componentLogger = createComponentLogger('codex-performance-metrics');
    this.startTime = Date.now();

    this.currentMetrics = {
      activeProcesses: 0,
      queueSize: 0,
      peakMemoryUsage: 0,
      peakCpuUsage: 0,
      peakConcurrency: 0,
      lastFailureTime: 0,
      consecutiveFailures: 0,
    };

    if (this.config.enabled) {
      this.startMonitoring();
    }

    this.componentLogger.info('Codex performance metrics initialized', {
      enabled: this.config.enabled,
      sampleRetentionPeriod: this.config.sampleRetentionPeriod,
      maxSamples: this.config.maxSamples,
    });
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Record execution completion
   * Requirement 7.3: Add execution time tracking and statistics
   */
  recordExecution(
    operationType: CodexOperationType,
    duration: number,
    success: boolean,
    timedOut: boolean = false,
    retryCount: number = 0,
    error?: {
      category: string;
      type: string;
      message: string;
    }
  ): void {
    if (!this.config.enabled) return;

    const timestamp = Date.now();
    const memoryUsage = this.getCurrentMemoryUsage();
    const cpuUsage = this.getCurrentCpuUsage();

    const sample: ExecutionSample = {
      timestamp,
      operationType,
      duration,
      success,
      timedOut,
      retryCount,
      memoryUsage,
      cpuUsage,
      error,
    };

    this.executionSamples.push(sample);
    this.cleanupOldSamples();

    // Update current state
    if (!success) {
      this.currentMetrics.lastFailureTime = timestamp;
      this.currentMetrics.consecutiveFailures++;
    } else {
      this.currentMetrics.consecutiveFailures = 0;
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(sample);

    // Emit metrics event
    this.emit('execution-recorded', sample);

    this.componentLogger.debug('Execution recorded', {
      operationType,
      duration,
      success,
      timedOut,
      retryCount,
      memoryUsage,
    });
  }

  /**
   * Update process state
   * Requirement 7.5: Implement resource usage monitoring
   */
  updateProcessState(activeProcesses: number, queueSize: number): void {
    if (!this.config.enabled) return;

    this.currentMetrics.activeProcesses = activeProcesses;
    this.currentMetrics.queueSize = queueSize;
    this.currentMetrics.peakConcurrency = Math.max(
      this.currentMetrics.peakConcurrency,
      activeProcesses
    );

    // Record throughput sample if tracking is enabled
    if (this.config.enableThroughputTracking) {
      this.recordThroughputSample(activeProcesses);
    }
  }

  /**
   * Get current performance snapshot
   * Requirement 7.3: Add execution time tracking and statistics
   * Requirement 7.5: Add success/failure rate tracking
   */
  getPerformanceSnapshot(): CodexPerformanceSnapshot {
    const timestamp = Date.now();
    const uptime = timestamp - this.startTime;

    return {
      timestamp,
      uptime,
      execution: this.calculateExecutionMetrics(),
      resources: this.calculateResourceMetrics(),
      reliability: this.calculateReliabilityMetrics(),
      throughput: this.calculateThroughputMetrics(),
      trends: this.calculateTrends(),
    };
  }

  /**
   * Get execution statistics
   */
  getExecutionStatistics(): CodexExecutionMetrics {
    return this.calculateExecutionMetrics();
  }

  /**
   * Get resource usage statistics
   */
  getResourceStatistics(): CodexResourceMetrics {
    return this.calculateResourceMetrics();
  }

  /**
   * Get reliability statistics
   */
  getReliabilityStatistics(): CodexReliabilityMetrics {
    return this.calculateReliabilityMetrics();
  }

  /**
   * Get throughput statistics
   */
  getThroughputStatistics(): CodexThroughputMetrics {
    return this.calculateThroughputMetrics();
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.executionSamples = [];
    this.resourceSamples = [];
    this.throughputSamples = [];
    
    this.currentMetrics = {
      activeProcesses: 0,
      queueSize: 0,
      peakMemoryUsage: 0,
      peakCpuUsage: 0,
      peakConcurrency: 0,
      lastFailureTime: 0,
      consecutiveFailures: 0,
    };

    this.componentLogger.info('Performance metrics reset');
    this.emit('metrics-reset');
  }

  /**
   * Export metrics data
   */
  exportMetrics(): {
    config: CodexPerformanceConfig;
    snapshot: CodexPerformanceSnapshot;
    samples: {
      executions: ExecutionSample[];
      resources: ResourceSample[];
      throughput: ThroughputSample[];
    };
  } {
    return {
      config: this.config,
      snapshot: this.getPerformanceSnapshot(),
      samples: {
        executions: [...this.executionSamples],
        resources: [...this.resourceSamples],
        throughput: [...this.throughputSamples],
      },
    };
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.metricsUpdateTimer) {
      clearInterval(this.metricsUpdateTimer);
      this.metricsUpdateTimer = undefined;
    }

    if (this.resourceMonitorTimer) {
      clearInterval(this.resourceMonitorTimer);
      this.resourceMonitorTimer = undefined;
    }

    this.componentLogger.info('Codex performance metrics stopped');
    this.emit('stopped');
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Start monitoring timers
   */
  private startMonitoring(): void {
    // Start metrics update timer
    this.metricsUpdateTimer = setInterval(() => {
      this.updateMetrics();
    }, this.config.metricsUpdateInterval);

    // Start resource monitoring if enabled
    if (this.config.enableResourceMonitoring) {
      this.resourceMonitorTimer = setInterval(() => {
        this.recordResourceSample();
      }, 5000); // Every 5 seconds
    }

    this.componentLogger.debug('Performance monitoring started');
  }

  /**
   * Update metrics and emit events
   */
  private updateMetrics(): void {
    const snapshot = this.getPerformanceSnapshot();
    this.emit('metrics-updated', snapshot);

    // Log performance summary periodically
    if (this.executionSamples.length > 0) {
      this.componentLogger.debug('Performance metrics updated', {
        totalExecutions: snapshot.execution.totalExecutions,
        successRate: snapshot.reliability.successRate.toFixed(1) + '%',
        averageExecutionTime: snapshot.execution.averageExecutionTime.toFixed(0) + 'ms',
        activeProcesses: snapshot.resources.processCount.current,
        memoryUsage: snapshot.resources.memoryUsage.current + 'MB',
      });
    }
  }

  /**
   * Record resource usage sample
   */
  private recordResourceSample(): void {
    const timestamp = Date.now();
    const memoryUsage = this.getCurrentMemoryUsage();
    const cpuUsage = this.getCurrentCpuUsage();

    const sample: ResourceSample = {
      timestamp,
      memoryUsage,
      cpuUsage,
      activeProcesses: this.currentMetrics.activeProcesses,
      queueSize: this.currentMetrics.queueSize,
    };

    this.resourceSamples.push(sample);

    // Update peaks
    this.currentMetrics.peakMemoryUsage = Math.max(
      this.currentMetrics.peakMemoryUsage,
      memoryUsage
    );
    this.currentMetrics.peakCpuUsage = Math.max(
      this.currentMetrics.peakCpuUsage,
      cpuUsage
    );

    this.cleanupOldSamples();
  }

  /**
   * Record throughput sample
   */
  private recordThroughputSample(concurrentProcesses: number): void {
    const timestamp = Date.now();
    const windowDuration = 60000; // 1 minute window
    const windowStart = timestamp - windowDuration;

    // Count operations in the last minute
    const recentExecutions = this.executionSamples.filter(
      sample => sample.timestamp >= windowStart
    );

    const sample: ThroughputSample = {
      timestamp,
      operationCount: recentExecutions.length,
      duration: windowDuration,
      concurrentProcesses,
    };

    this.throughputSamples.push(sample);
    this.cleanupOldSamples();
  }

  /**
   * Calculate execution metrics
   */
  private calculateExecutionMetrics(): CodexExecutionMetrics {
    const samples = this.executionSamples;
    const durations = samples.map(s => s.duration).sort((a, b) => a - b);

    const totalExecutions = samples.length;
    const successfulExecutions = samples.filter(s => s.success).length;
    const failedExecutions = samples.filter(s => !s.success).length;
    const timedOutExecutions = samples.filter(s => s.timedOut).length;

    const averageExecutionTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const medianExecutionTime = durations.length > 0 
      ? durations[Math.floor(durations.length / 2)] 
      : 0;

    const p95ExecutionTime = durations.length > 0 
      ? durations[Math.floor(durations.length * 0.95)] 
      : 0;

    const p99ExecutionTime = durations.length > 0 
      ? durations[Math.floor(durations.length * 0.99)] 
      : 0;

    const fastestExecution = durations.length > 0 ? durations[0] : 0;
    const slowestExecution = durations.length > 0 ? durations[durations.length - 1] : 0;

    // Calculate execution time distribution
    const executionTimeDistribution = {
      under1s: durations.filter(d => d < 1000).length,
      under5s: durations.filter(d => d < 5000).length,
      under10s: durations.filter(d => d < 10000).length,
      under30s: durations.filter(d => d < 30000).length,
      under60s: durations.filter(d => d < 60000).length,
      over60s: durations.filter(d => d >= 60000).length,
    };

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      timedOutExecutions,
      averageExecutionTime,
      medianExecutionTime,
      p95ExecutionTime,
      p99ExecutionTime,
      fastestExecution,
      slowestExecution,
      executionTimeDistribution,
    };
  }

  /**
   * Calculate resource metrics
   */
  private calculateResourceMetrics(): CodexResourceMetrics {
    const resourceSamples = this.resourceSamples;
    const memorySamples = resourceSamples.map(s => s.memoryUsage);
    const cpuSamples = resourceSamples.map(s => s.cpuUsage);
    const processSamples = resourceSamples.map(s => s.activeProcesses);
    const queueSamples = resourceSamples.map(s => s.queueSize);

    const currentMemory = this.getCurrentMemoryUsage();
    const currentCpu = this.getCurrentCpuUsage();

    return {
      memoryUsage: {
        current: currentMemory,
        peak: this.currentMetrics.peakMemoryUsage,
        average: memorySamples.length > 0 
          ? memorySamples.reduce((sum, m) => sum + m, 0) / memorySamples.length 
          : currentMemory,
        samples: memorySamples.slice(-100), // Keep last 100 samples
      },
      cpuUsage: {
        current: currentCpu,
        peak: this.currentMetrics.peakCpuUsage,
        average: cpuSamples.length > 0 
          ? cpuSamples.reduce((sum, c) => sum + c, 0) / cpuSamples.length 
          : currentCpu,
        samples: cpuSamples.slice(-100), // Keep last 100 samples
      },
      processCount: {
        current: this.currentMetrics.activeProcesses,
        peak: this.currentMetrics.peakConcurrency,
        average: processSamples.length > 0 
          ? processSamples.reduce((sum, p) => sum + p, 0) / processSamples.length 
          : this.currentMetrics.activeProcesses,
      },
      queueMetrics: {
        currentSize: this.currentMetrics.queueSize,
        peakSize: Math.max(...queueSamples, 0),
        averageWaitTime: 0, // Would need additional tracking
        totalProcessed: this.executionSamples.length,
      },
    };
  }

  /**
   * Calculate reliability metrics
   */
  private calculateReliabilityMetrics(): CodexReliabilityMetrics {
    const samples = this.executionSamples;
    const totalExecutions = samples.length;

    if (totalExecutions === 0) {
      return {
        successRate: 100,
        failureRate: 0,
        timeoutRate: 0,
        retryRate: 0,
        errorsByCategory: {},
        errorsByType: {},
        mtbf: 0,
        mttr: 0,
        availability: 100,
        recentFailures: [],
      };
    }

    const successfulExecutions = samples.filter(s => s.success).length;
    const failedExecutions = samples.filter(s => !s.success).length;
    const timedOutExecutions = samples.filter(s => s.timedOut).length;
    const retriedExecutions = samples.filter(s => s.retryCount > 0).length;

    const successRate = (successfulExecutions / totalExecutions) * 100;
    const failureRate = (failedExecutions / totalExecutions) * 100;
    const timeoutRate = (timedOutExecutions / totalExecutions) * 100;
    const retryRate = (retriedExecutions / totalExecutions) * 100;

    // Group errors by category and type
    const errorsByCategory: Record<string, number> = {};
    const errorsByType: Record<CodexOperationType, number> = {};

    samples.filter(s => s.error).forEach(s => {
      const category = s.error!.category;
      const type = s.operationType;
      
      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    // Calculate MTBF and MTTR
    const failures = samples.filter(s => !s.success);
    const mtbf = failures.length > 1 
      ? (samples[samples.length - 1].timestamp - samples[0].timestamp) / failures.length
      : 0;

    const mttr = failures.length > 0 
      ? failures.reduce((sum, f) => sum + f.duration, 0) / failures.length
      : 0;

    // Recent failures (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 300000;
    const recentFailures = samples
      .filter(s => !s.success && s.timestamp >= fiveMinutesAgo)
      .slice(-10)
      .map(s => ({
        timestamp: s.timestamp,
        operationType: s.operationType,
        error: s.error?.message || 'Unknown error',
        duration: s.duration,
      }));

    const availability = successRate;

    return {
      successRate,
      failureRate,
      timeoutRate,
      retryRate,
      errorsByCategory,
      errorsByType,
      mtbf,
      mttr,
      availability,
      recentFailures,
    };
  }

  /**
   * Calculate throughput metrics
   */
  private calculateThroughputMetrics(): CodexThroughputMetrics {
    const samples = this.throughputSamples;
    const now = Date.now();

    // Calculate operations per time unit
    const lastMinute = samples.filter(s => now - s.timestamp < 60000);
    const lastHour = samples.filter(s => now - s.timestamp < 3600000);

    const operationsPerSecond = lastMinute.length > 0 
      ? lastMinute.reduce((sum, s) => sum + s.operationCount, 0) / 60
      : 0;

    const operationsPerMinute = lastMinute.length > 0 
      ? lastMinute.reduce((sum, s) => sum + s.operationCount, 0)
      : 0;

    const operationsPerHour = lastHour.length > 0 
      ? lastHour.reduce((sum, s) => sum + s.operationCount, 0)
      : 0;

    const peakThroughput = Math.max(...samples.map(s => s.operationCount), 0);

    const throughputTrend = samples.slice(-20).map(s => ({
      timestamp: s.timestamp,
      count: s.operationCount,
      duration: s.duration,
    }));

    const concurrencyMetrics = {
      averageConcurrency: samples.length > 0 
        ? samples.reduce((sum, s) => sum + s.concurrentProcesses, 0) / samples.length
        : 0,
      peakConcurrency: this.currentMetrics.peakConcurrency,
      concurrencyUtilization: this.currentMetrics.peakConcurrency > 0 
        ? (this.currentMetrics.activeProcesses / this.currentMetrics.peakConcurrency) * 100
        : 0,
    };

    return {
      operationsPerSecond,
      operationsPerMinute,
      operationsPerHour,
      peakThroughput,
      throughputTrend,
      concurrencyMetrics,
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): CodexPerformanceSnapshot['trends'] {
    const recentSamples = this.executionSamples.slice(-50); // Last 50 executions
    const olderSamples = this.executionSamples.slice(-100, -50); // Previous 50 executions

    if (recentSamples.length < 10 || olderSamples.length < 10) {
      return {
        executionTimesTrend: 'stable',
        successRateTrend: 'stable',
        throughputTrend: 'stable',
      };
    }

    // Execution times trend
    const recentAvgTime = recentSamples.reduce((sum, s) => sum + s.duration, 0) / recentSamples.length;
    const olderAvgTime = olderSamples.reduce((sum, s) => sum + s.duration, 0) / olderSamples.length;
    const timeDiff = (recentAvgTime - olderAvgTime) / olderAvgTime;

    const executionTimesTrend = timeDiff < -0.1 ? 'improving' : timeDiff > 0.1 ? 'degrading' : 'stable';

    // Success rate trend
    const recentSuccessRate = recentSamples.filter(s => s.success).length / recentSamples.length;
    const olderSuccessRate = olderSamples.filter(s => s.success).length / olderSamples.length;
    const successDiff = recentSuccessRate - olderSuccessRate;

    const successRateTrend = successDiff > 0.05 ? 'improving' : successDiff < -0.05 ? 'degrading' : 'stable';

    // Throughput trend
    const recentThroughput = this.throughputSamples.slice(-10);
    const olderThroughput = this.throughputSamples.slice(-20, -10);

    if (recentThroughput.length < 5 || olderThroughput.length < 5) {
      return {
        executionTimesTrend,
        successRateTrend,
        throughputTrend: 'stable',
      };
    }

    const recentAvgThroughput = recentThroughput.reduce((sum, s) => sum + s.operationCount, 0) / recentThroughput.length;
    const olderAvgThroughput = olderThroughput.reduce((sum, s) => sum + s.operationCount, 0) / olderThroughput.length;
    const throughputDiff = (recentAvgThroughput - olderAvgThroughput) / Math.max(olderAvgThroughput, 1);

    const throughputTrend = throughputDiff > 0.1 ? 'increasing' : throughputDiff < -0.1 ? 'decreasing' : 'stable';

    return {
      executionTimesTrend,
      successRateTrend,
      throughputTrend,
    };
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(sample: ExecutionSample): void {
    const alerts: string[] = [];

    // Check execution time threshold
    if (sample.duration > this.config.alertThresholds.executionTime) {
      alerts.push(`Slow execution: ${sample.duration}ms (threshold: ${this.config.alertThresholds.executionTime}ms)`);
    }

    // Check memory usage threshold
    if (sample.memoryUsage > this.config.alertThresholds.memoryUsage) {
      alerts.push(`High memory usage: ${sample.memoryUsage}MB (threshold: ${this.config.alertThresholds.memoryUsage}MB)`);
    }

    // Check success rate
    const recentSamples = this.executionSamples.slice(-20);
    if (recentSamples.length >= 10) {
      const successRate = recentSamples.filter(s => s.success).length / recentSamples.length * 100;
      if (successRate < this.config.alertThresholds.successRate) {
        alerts.push(`Low success rate: ${successRate.toFixed(1)}% (threshold: ${this.config.alertThresholds.successRate}%)`);
      }
    }

    // Emit alerts
    if (alerts.length > 0) {
      this.emit('performance-alert', {
        timestamp: sample.timestamp,
        operationType: sample.operationType,
        alerts,
        sample,
      });

      this.componentLogger.warn('Performance alert triggered', {
        operationType: sample.operationType,
        alerts,
        duration: sample.duration,
        memoryUsage: sample.memoryUsage,
      });
    }
  }

  /**
   * Clean up old samples
   */
  private cleanupOldSamples(): void {
    const cutoffTime = Date.now() - this.config.sampleRetentionPeriod;

    this.executionSamples = this.executionSamples
      .filter(s => s.timestamp > cutoffTime)
      .slice(-this.config.maxSamples);

    this.resourceSamples = this.resourceSamples
      .filter(s => s.timestamp > cutoffTime)
      .slice(-this.config.maxSamples);

    this.throughputSamples = this.throughputSamples
      .filter(s => s.timestamp > cutoffTime)
      .slice(-this.config.maxSamples);
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024);
  }

  /**
   * Get current CPU usage percentage
   */
  private getCurrentCpuUsage(): number {
    // This is a simplified CPU usage calculation
    // In a real implementation, you might want to use a more sophisticated method
    const cpuUsage = process.cpuUsage();
    return Math.round((cpuUsage.user + cpuUsage.system) / 1000); // Convert to percentage approximation
  }
}

// ============================================================================
// Global Instance and Exports
// ============================================================================

/**
 * Global Codex performance metrics instance
 */
export const codexPerformanceMetrics = new CodexPerformanceMetrics();

/**
 * Convenience functions for performance metrics
 */
export const recordCodexExecution = (
  operationType: CodexOperationType,
  duration: number,
  success: boolean,
  timedOut?: boolean,
  retryCount?: number,
  error?: Parameters<typeof codexPerformanceMetrics.recordExecution>[5]
) => codexPerformanceMetrics.recordExecution(operationType, duration, success, timedOut, retryCount, error);

export const updateCodexProcessState = (activeProcesses: number, queueSize: number) =>
  codexPerformanceMetrics.updateProcessState(activeProcesses, queueSize);

export const getCodexPerformanceSnapshot = () =>
  codexPerformanceMetrics.getPerformanceSnapshot();

export const getCodexExecutionStatistics = () =>
  codexPerformanceMetrics.getExecutionStatistics();

export const getCodexResourceStatistics = () =>
  codexPerformanceMetrics.getResourceStatistics();

export const getCodexReliabilityStatistics = () =>
  codexPerformanceMetrics.getReliabilityStatistics();

export const getCodexThroughputStatistics = () =>
  codexPerformanceMetrics.getThroughputStatistics();