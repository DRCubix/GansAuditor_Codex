/**
 * Audit Performance and Session Tracking Logger
 * 
 * This module provides specialized logging for audit performance metrics,
 * session lifecycle tracking, and detailed audit workflow monitoring.
 * 
 * Requirements addressed:
 * - Create logging for audit performance and session tracking
 * - Add Codex context window usage monitoring
 * - Performance and reliability monitoring
 */

import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { logger, createComponentLogger, PerformanceTimer } from '../utils/logger.js';
import { metricsCollector } from './metrics-collector.js';
import type {
  GansAuditorCodexSessionState,
  GansAuditorCodexReview,
  IterationData,
} from '../types/gan-types.js';

// ============================================================================
// Audit Logging Types and Interfaces
// ============================================================================

/**
 * Audit event types for structured logging
 */
export type AuditEventType = 
  | 'audit_started'
  | 'audit_completed'
  | 'audit_failed'
  | 'audit_timeout'
  | 'session_created'
  | 'session_updated'
  | 'session_completed'
  | 'session_terminated'
  | 'stagnation_detected'
  | 'completion_criteria_met'
  | 'context_created'
  | 'context_maintained'
  | 'context_terminated'
  | 'cache_hit'
  | 'cache_miss'
  | 'queue_enqueued'
  | 'queue_dequeued'
  | 'performance_threshold_exceeded';

/**
 * Structured audit log entry
 */
export interface AuditLogEntry {
  timestamp: number;
  eventType: AuditEventType;
  sessionId: string;
  loopId?: string;
  thoughtNumber?: number;
  data: Record<string, any>;
  duration?: number;
  performance?: {
    memoryUsage: number;
    cpuUsage?: NodeJS.CpuUsage;
    activeConnections?: number;
  };
}

/**
 * Session lifecycle log entry
 */
export interface SessionLogEntry {
  timestamp: number;
  sessionId: string;
  loopId?: string;
  event: 'created' | 'updated' | 'completed' | 'terminated' | 'error';
  iteration?: number;
  data: {
    currentLoop?: number;
    isComplete?: boolean;
    completionReason?: string;
    stagnationDetected?: boolean;
    auditScore?: number;
    auditVerdict?: string;
    duration?: number;
    error?: string;
  };
}

/**
 * Performance log entry
 */
export interface PerformanceLogEntry {
  timestamp: number;
  category: 'audit' | 'session' | 'context' | 'system';
  metric: string;
  value: number;
  unit: string;
  threshold?: number;
  exceeded?: boolean;
  context: Record<string, any>;
}

/**
 * Codex context log entry
 */
export interface CodexContextLogEntry {
  timestamp: number;
  loopId: string;
  contextId: string;
  event: 'created' | 'maintained' | 'terminated' | 'error';
  duration?: number;
  resourceUsage?: {
    memoryMB: number;
    cpuPercent: number;
  };
  terminationReason?: string;
  error?: string;
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  enabled: boolean;
  logDirectory: string;
  maxLogFileSize: number; // bytes
  maxLogFiles: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enablePerformanceLogging: boolean;
  enableSessionTracking: boolean;
  enableCodexContextLogging: boolean;
  flushInterval: number; // milliseconds
  compressionEnabled: boolean;
}

/**
 * Default audit logger configuration
 */
export const DEFAULT_AUDIT_LOGGER_CONFIG: AuditLoggerConfig = {
  enabled: true,
  logDirectory: './logs/audit',
  maxLogFileSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 10,
  logLevel: 'info',
  enablePerformanceLogging: true,
  enableSessionTracking: true,
  enableCodexContextLogging: true,
  flushInterval: 5000, // 5 seconds
  compressionEnabled: false,
};

// ============================================================================
// Audit Logger Implementation
// ============================================================================

/**
 * Specialized logger for audit performance and session tracking
 */
export class AuditLogger {
  private readonly config: AuditLoggerConfig;
  private readonly componentLogger: typeof logger;
  
  private auditLogBuffer: AuditLogEntry[] = [];
  private sessionLogBuffer: SessionLogEntry[] = [];
  private performanceLogBuffer: PerformanceLogEntry[] = [];
  private codexLogBuffer: CodexContextLogEntry[] = [];
  
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = { ...DEFAULT_AUDIT_LOGGER_CONFIG, ...config };
    this.componentLogger = createComponentLogger('audit-logger');
    
    if (this.config.enabled) {
      this.initialize().catch(error => {
        this.componentLogger.error('Failed to initialize audit logger', error);
      });
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Log audit event
   */
  logAuditEvent(
    eventType: AuditEventType,
    sessionId: string,
    data: Record<string, any>,
    options?: {
      loopId?: string;
      thoughtNumber?: number;
      duration?: number;
    }
  ): void {
    if (!this.config.enabled) return;

    const entry: AuditLogEntry = {
      timestamp: Date.now(),
      eventType,
      sessionId,
      loopId: options?.loopId,
      thoughtNumber: options?.thoughtNumber,
      data,
      duration: options?.duration,
      performance: this.capturePerformanceSnapshot(),
    };

    this.auditLogBuffer.push(entry);
    this.componentLogger.debug(`Audit event logged: ${eventType}`, { sessionId, eventType });

    // Also record in metrics collector
    this.recordMetricsEvent(eventType, sessionId, data, options);
  }

  /**
   * Log session lifecycle event
   */
  logSessionEvent(
    sessionId: string,
    event: SessionLogEntry['event'],
    data: SessionLogEntry['data'],
    loopId?: string,
    iteration?: number
  ): void {
    if (!this.config.enabled || !this.config.enableSessionTracking) return;

    const entry: SessionLogEntry = {
      timestamp: Date.now(),
      sessionId,
      loopId,
      event,
      iteration,
      data,
    };

    this.sessionLogBuffer.push(entry);
    this.componentLogger.debug(`Session event logged: ${event}`, { sessionId, event });
  }

  /**
   * Log performance metric
   */
  logPerformanceMetric(
    category: PerformanceLogEntry['category'],
    metric: string,
    value: number,
    unit: string,
    context: Record<string, any> = {},
    threshold?: number
  ): void {
    if (!this.config.enabled || !this.config.enablePerformanceLogging) return;

    const exceeded = threshold !== undefined && value > threshold;

    const entry: PerformanceLogEntry = {
      timestamp: Date.now(),
      category,
      metric,
      value,
      unit,
      threshold,
      exceeded,
      context,
    };

    this.performanceLogBuffer.push(entry);

    if (exceeded) {
      this.componentLogger.warn(`Performance threshold exceeded: ${metric}`, {
        value,
        threshold,
        unit,
        category,
      });
    }
  }

  /**
   * Log Codex context event
   */
  logCodexContextEvent(
    loopId: string,
    contextId: string,
    event: CodexContextLogEntry['event'],
    options?: {
      duration?: number;
      resourceUsage?: CodexContextLogEntry['resourceUsage'];
      terminationReason?: string;
      error?: string;
    }
  ): void {
    if (!this.config.enabled || !this.config.enableCodexContextLogging) return;

    const entry: CodexContextLogEntry = {
      timestamp: Date.now(),
      loopId,
      contextId,
      event,
      duration: options?.duration,
      resourceUsage: options?.resourceUsage,
      terminationReason: options?.terminationReason,
      error: options?.error,
    };

    this.codexLogBuffer.push(entry);
    this.componentLogger.debug(`Codex context event logged: ${event}`, { loopId, contextId, event });

    // Also record in metrics collector
    if (event === 'created') {
      metricsCollector.recordContextCreated(loopId, contextId);
    } else if (event === 'terminated') {
      metricsCollector.recordContextTerminated(loopId, contextId, options?.terminationReason || 'unknown');
    }
  }

  /**
   * Log audit start
   */
  logAuditStart(sessionId: string, thoughtNumber: number, loopId?: string): PerformanceTimer {
    this.logAuditEvent('audit_started', sessionId, { thoughtNumber }, { loopId, thoughtNumber });
    return new PerformanceTimer(`audit-${sessionId}-${thoughtNumber}`, 'audit-logger');
  }

  /**
   * Log audit completion
   */
  logAuditComplete(
    sessionId: string,
    thoughtNumber: number,
    review: GansAuditorCodexReview,
    duration: number,
    loopId?: string
  ): void {
    this.logAuditEvent('audit_completed', sessionId, {
      thoughtNumber,
      verdict: review.verdict,
      score: review.overall,
      dimensions: review.dimensions,
      iterations: review.iterations,
    }, { loopId, thoughtNumber, duration });

    // Log performance metrics
    this.logPerformanceMetric('audit', 'duration', duration, 'ms', {
      sessionId,
      thoughtNumber,
      verdict: review.verdict,
      score: review.overall,
    }, 30000); // 30 second threshold
  }

  /**
   * Log audit failure
   */
  logAuditFailure(
    sessionId: string,
    thoughtNumber: number,
    error: string,
    duration: number,
    loopId?: string
  ): void {
    this.logAuditEvent('audit_failed', sessionId, {
      thoughtNumber,
      error,
    }, { loopId, thoughtNumber, duration });
  }

  /**
   * Log session creation
   */
  logSessionCreation(sessionId: string, config: any, loopId?: string): void {
    this.logSessionEvent(sessionId, 'created', {
      currentLoop: 0,
      isComplete: false,
    }, loopId);

    this.logAuditEvent('session_created', sessionId, {
      config,
      loopId,
    }, { loopId });
  }

  /**
   * Log session update
   */
  logSessionUpdate(
    sessionId: string,
    iteration: IterationData,
    currentLoop: number,
    loopId?: string
  ): void {
    this.logSessionEvent(sessionId, 'updated', {
      currentLoop,
      auditScore: iteration.auditResult?.overall,
      auditVerdict: iteration.auditResult?.verdict,
    }, loopId, iteration.thoughtNumber);

    this.logAuditEvent('session_updated', sessionId, {
      iteration: iteration.thoughtNumber,
      currentLoop,
      auditResult: iteration.auditResult,
    }, { loopId, thoughtNumber: iteration.thoughtNumber });
  }

  /**
   * Log session completion
   */
  logSessionCompletion(
    sessionId: string,
    totalLoops: number,
    reason: string,
    duration: number,
    loopId?: string
  ): void {
    this.logSessionEvent(sessionId, 'completed', {
      currentLoop: totalLoops,
      isComplete: true,
      completionReason: reason,
      duration,
    }, loopId);

    this.logAuditEvent('session_completed', sessionId, {
      totalLoops,
      reason,
      duration,
    }, { loopId, duration });

    // Log performance metrics
    this.logPerformanceMetric('session', 'total_loops', totalLoops, 'loops', {
      sessionId,
      reason,
      duration,
    }, 25); // 25 loop threshold

    this.logPerformanceMetric('session', 'duration', duration, 'ms', {
      sessionId,
      totalLoops,
      reason,
    });
  }

  /**
   * Log stagnation detection
   */
  logStagnationDetection(
    sessionId: string,
    loop: number,
    similarityScore: number,
    loopId?: string
  ): void {
    this.logSessionEvent(sessionId, 'updated', {
      currentLoop: loop,
      stagnationDetected: true,
    }, loopId);

    this.logAuditEvent('stagnation_detected', sessionId, {
      loop,
      similarityScore,
    }, { loopId });

    this.componentLogger.warn('Stagnation detected', {
      sessionId,
      loop,
      similarityScore,
    });
  }

  /**
   * Flush all log buffers to files
   */
  async flush(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const promises: Promise<void>[] = [];

      if (this.auditLogBuffer.length > 0) {
        promises.push(this.writeLogFile('audit', this.auditLogBuffer));
        this.auditLogBuffer = [];
      }

      if (this.sessionLogBuffer.length > 0) {
        promises.push(this.writeLogFile('session', this.sessionLogBuffer));
        this.sessionLogBuffer = [];
      }

      if (this.performanceLogBuffer.length > 0) {
        promises.push(this.writeLogFile('performance', this.performanceLogBuffer));
        this.performanceLogBuffer = [];
      }

      if (this.codexLogBuffer.length > 0) {
        promises.push(this.writeLogFile('codex', this.codexLogBuffer));
        this.codexLogBuffer = [];
      }

      await Promise.all(promises);
      this.componentLogger.debug('Log buffers flushed successfully');

    } catch (error) {
      this.componentLogger.error('Failed to flush log buffers', error as Error);
    }
  }

  /**
   * Get current buffer sizes
   */
  getBufferSizes(): {
    audit: number;
    session: number;
    performance: number;
    codex: number;
  } {
    return {
      audit: this.auditLogBuffer.length,
      session: this.sessionLogBuffer.length,
      performance: this.performanceLogBuffer.length,
      codex: this.codexLogBuffer.length,
    };
  }

  /**
   * Stop the audit logger and flush remaining logs
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    await this.flush();
    this.componentLogger.info('Audit logger stopped');
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Initialize the audit logger
   */
  private async initialize(): Promise<void> {
    try {
      // Ensure log directory exists
      if (!existsSync(this.config.logDirectory)) {
        await mkdir(this.config.logDirectory, { recursive: true });
      }

      // Start periodic flush
      this.flushTimer = setInterval(() => {
        this.flush().catch(error => {
          this.componentLogger.error('Periodic flush failed', error);
        });
      }, this.config.flushInterval);

      this.isInitialized = true;
      this.componentLogger.info('Audit logger initialized', {
        logDirectory: this.config.logDirectory,
        flushInterval: this.config.flushInterval,
      });

    } catch (error) {
      this.componentLogger.error('Failed to initialize audit logger', error as Error);
      throw error;
    }
  }

  /**
   * Write log entries to file
   */
  private async writeLogFile(type: string, entries: any[]): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${type}-${timestamp}.jsonl`;
    const filepath = join(this.config.logDirectory, filename);

    const logLines = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';

    try {
      await appendFile(filepath, logLines, 'utf-8');
    } catch (error) {
      // If append fails, try to create the file
      await writeFile(filepath, logLines, 'utf-8');
    }
  }

  /**
   * Capture current performance snapshot
   */
  private capturePerformanceSnapshot(): AuditLogEntry['performance'] {
    const memUsage = process.memoryUsage();
    
    return {
      memoryUsage: memUsage.heapUsed,
      cpuUsage: process.cpuUsage(),
    };
  }

  /**
   * Record event in metrics collector
   */
  private recordMetricsEvent(
    eventType: AuditEventType,
    sessionId: string,
    data: Record<string, any>,
    options?: { loopId?: string; thoughtNumber?: number; duration?: number }
  ): void {
    switch (eventType) {
      case 'audit_started':
        if (options?.thoughtNumber !== undefined) {
          metricsCollector.recordAuditStarted(sessionId, options.thoughtNumber);
        }
        break;
      
      case 'audit_completed':
        if (options?.thoughtNumber !== undefined && options?.duration !== undefined) {
          metricsCollector.recordAuditCompleted(
            sessionId,
            options.thoughtNumber,
            options.duration,
            data.verdict || 'unknown',
            data.score || 0
          );
        }
        break;
      
      case 'audit_failed':
        if (options?.thoughtNumber !== undefined && options?.duration !== undefined) {
          metricsCollector.recordAuditFailed(
            sessionId,
            options.thoughtNumber,
            options.duration,
            data.error || 'unknown error'
          );
        }
        break;
      
      case 'session_created':
        metricsCollector.recordSessionCreated(sessionId, options?.loopId);
        break;
      
      case 'session_completed':
        if (data.totalLoops !== undefined) {
          metricsCollector.recordSessionCompleted(sessionId, data.totalLoops, data.reason || 'completed');
        }
        break;
      
      case 'stagnation_detected':
        if (data.loop !== undefined && data.similarityScore !== undefined) {
          metricsCollector.recordStagnationDetected(sessionId, data.loop, data.similarityScore);
        }
        break;
      
      case 'cache_hit':
        if (options?.thoughtNumber !== undefined) {
          metricsCollector.recordCacheHit(sessionId, options.thoughtNumber);
        }
        break;
      
      case 'cache_miss':
        if (options?.thoughtNumber !== undefined) {
          metricsCollector.recordCacheMiss(sessionId, options.thoughtNumber);
        }
        break;
    }
  }
}

// ============================================================================
// Global Audit Logger Instance
// ============================================================================

/**
 * Global audit logger instance
 */
export const auditLogger = new AuditLogger();

/**
 * Convenience functions for audit logging
 */
export const logAuditStart = (sessionId: string, thoughtNumber: number, loopId?: string) =>
  auditLogger.logAuditStart(sessionId, thoughtNumber, loopId);

export const logAuditComplete = (sessionId: string, thoughtNumber: number, review: GansAuditorCodexReview, duration: number, loopId?: string) =>
  auditLogger.logAuditComplete(sessionId, thoughtNumber, review, duration, loopId);

export const logAuditFailure = (sessionId: string, thoughtNumber: number, error: string, duration: number, loopId?: string) =>
  auditLogger.logAuditFailure(sessionId, thoughtNumber, error, duration, loopId);

export const logSessionCreation = (sessionId: string, config: any, loopId?: string) =>
  auditLogger.logSessionCreation(sessionId, config, loopId);

export const logSessionUpdate = (sessionId: string, iteration: IterationData, currentLoop: number, loopId?: string) =>
  auditLogger.logSessionUpdate(sessionId, iteration, currentLoop, loopId);

export const logSessionCompletion = (sessionId: string, totalLoops: number, reason: string, duration: number, loopId?: string) =>
  auditLogger.logSessionCompletion(sessionId, totalLoops, reason, duration, loopId);

export const logStagnationDetection = (sessionId: string, loop: number, similarityScore: number, loopId?: string) =>
  auditLogger.logStagnationDetection(sessionId, loop, similarityScore, loopId);

export const logCodexContextEvent = (loopId: string, contextId: string, event: CodexContextLogEntry['event'], options?: Parameters<typeof auditLogger.logCodexContextEvent>[3]) =>
  auditLogger.logCodexContextEvent(loopId, contextId, event, options);

export const logPerformanceMetric = (category: PerformanceLogEntry['category'], metric: string, value: number, unit: string, context?: Record<string, any>, threshold?: number) =>
  auditLogger.logPerformanceMetric(category, metric, value, unit, context, threshold);