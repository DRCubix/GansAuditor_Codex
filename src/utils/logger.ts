/**
 * Logging utility for GAN Auditor Integration
 * 
 * This module provides structured logging capabilities while maintaining
 * compatibility with existing console output formats.
 * 
 * Requirements addressed:
 * - 6.4: Add logging for debugging while maintaining existing console output format
 */

import type { ErrorCategory, ErrorSeverity, GanAuditorError } from '../types/error-types.js';

// ============================================================================
// Logger Configuration
// ============================================================================

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  component?: string;
  includeTimestamp: boolean;
  includeComponent: boolean;
  colorOutput: boolean;
  formatJson: boolean;
  maxMessageLength?: number;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  enabled: false,
  level: 'info',
  component: 'gan-auditor',
  includeTimestamp: true,
  includeComponent: true,
  colorOutput: true,
  formatJson: false,
  maxMessageLength: 1000,
};

// ============================================================================
// Color Utilities
// ============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
} as const;

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.gray,
  info: COLORS.blue,
  warn: COLORS.yellow,
  error: COLORS.red,
};

// ============================================================================
// Logger Implementation
// ============================================================================

/**
 * Structured logger with configurable output formats
 */
export class Logger {
  private config: LoggerConfig;
  private logHistory: LogEntry[] = [];
  private readonly maxHistorySize = 1000;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if logging is enabled for a specific level
   */
  isEnabled(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.config.level];
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any, component?: string): void {
    this.log('debug', message, data, component);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any, component?: string): void {
    this.log('info', message, data, component);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any, component?: string): void {
    this.log('warn', message, data, component);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | GanAuditorError, data?: any, component?: string): void {
    const errorData = error ? this.serializeError(error) : undefined;
    this.log('error', message, { ...data, error: errorData }, component);
  }

  /**
   * Log an error object directly
   */
  logError(error: Error | GanAuditorError, component?: string): void {
    const message = error.message || 'Unknown error occurred';
    this.error(message, error, undefined, component);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: any, component?: string): void {
    if (!this.isEnabled(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component: component || this.config.component || 'unknown',
      message: this.truncateMessage(message),
      data: this.sanitizeData(data),
    };

    // Add to history
    this.addToHistory(entry);

    // Output to console
    this.outputToConsole(entry);
  }

  /**
   * Serialize error object for logging
   */
  private serializeError(error: Error | GanAuditorError): any {
    const serialized: any = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    // Add GAN auditor specific fields
    if (error instanceof Error && 'category' in error) {
      const ganError = error as GanAuditorError;
      serialized.category = ganError.category;
      serialized.severity = ganError.severity;
      serialized.recoverable = ganError.recoverable;
      serialized.recovery_strategy = ganError.recovery_strategy;
      serialized.suggestions = ganError.suggestions;
      serialized.component = ganError.component;
    }

    return serialized;
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeData(data: any): any {
    if (!data) {
      return data;
    }

    try {
      // Clone to avoid modifying original, handling circular references
      const sanitized = this.deepClone(data);

      // Remove or mask sensitive fields
      this.maskSensitiveFields(sanitized);

      return sanitized;
    } catch (error) {
      // If cloning fails due to circular references or other issues, return a safe representation
      return '[Complex Object - Cannot Serialize]';
    }
  }

  /**
   * Deep clone object with circular reference handling
   */
  private deepClone(obj: any, seen = new WeakSet()): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (seen.has(obj)) {
      return '[Circular Reference]';
    }

    seen.add(obj);

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item, seen));
    }

    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        cloned[key] = this.deepClone(value, seen);
      }
      return cloned;
    }

    return obj;
  }

  /**
   * Mask sensitive fields in data
   */
  private maskSensitiveFields(obj: any, seen = new WeakSet()): void {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) {
      return;
    }

    seen.add(obj);

    const sensitiveFields = [
      'password',
      'token',
      'key',
      'secret',
      'auth',
      'credential',
    ];

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[MASKED]';
      } else if (typeof value === 'object' && value !== null) {
        this.maskSensitiveFields(value, seen);
      }
    }
  }

  /**
   * Truncate message if it exceeds maximum length
   */
  private truncateMessage(message: string): string {
    const maxLength = this.config.maxMessageLength;
    if (!maxLength || message.length <= maxLength) {
      return message;
    }

    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Add entry to log history
   */
  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);

    // Maintain history size limit
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    if (this.config.formatJson) {
      console.log(JSON.stringify(entry));
      return;
    }

    const parts: string[] = [];

    // Timestamp
    if (this.config.includeTimestamp) {
      const timestamp = new Date(entry.timestamp).toISOString();
      parts.push(this.colorize(`[${timestamp}]`, COLORS.gray));
    }

    // Component
    if (this.config.includeComponent) {
      parts.push(this.colorize(`[${entry.component.toUpperCase()}]`, COLORS.cyan));
    }

    // Level
    const levelColor = LEVEL_COLORS[entry.level];
    parts.push(this.colorize(`[${entry.level.toUpperCase()}]`, levelColor));

    // Message
    parts.push(entry.message);

    // Data (if present and not too large)
    if (entry.data && Object.keys(entry.data).length > 0) {
      const dataStr = this.formatData(entry.data);
      if (dataStr) {
        parts.push(this.colorize(dataStr, COLORS.dim));
      }
    }

    // Output using appropriate console method
    const output = parts.join(' ');
    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
        break;
    }
  }

  /**
   * Apply color to text if color output is enabled
   */
  private colorize(text: string, color: string): string {
    if (!this.config.colorOutput) {
      return text;
    }
    return `${color}${text}${COLORS.reset}`;
  }

  /**
   * Format data for console output
   */
  private formatData(data: any): string {
    try {
      // For simple objects, format inline
      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        if (keys.length <= 3) {
          const pairs = keys.map(key => `${key}=${JSON.stringify(data[key])}`);
          return `{${pairs.join(', ')}}`;
        }
      }

      // For complex data, format as JSON
      const jsonStr = JSON.stringify(data, null, 0);
      if (jsonStr.length <= 200) {
        return jsonStr;
      }

      // Too large, just indicate presence
      return '{...}';
    } catch {
      return '[unserializable data]';
    }
  }

  /**
   * Get recent log entries
   */
  getHistory(count?: number): LogEntry[] {
    if (!count) {
      return [...this.logHistory];
    }
    return this.logHistory.slice(-count);
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Get log statistics
   */
  getStats(): {
    totalEntries: number;
    byLevel: Record<LogLevel, number>;
    byComponent: Record<string, number>;
    timeRange: { start: number; end: number } | null;
  } {
    const stats = {
      totalEntries: this.logHistory.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 } as Record<LogLevel, number>,
      byComponent: {} as Record<string, number>,
      timeRange: null as { start: number; end: number } | null,
    };

    if (this.logHistory.length === 0) {
      return stats;
    }

    // Calculate statistics
    for (const entry of this.logHistory) {
      stats.byLevel[entry.level]++;
      stats.byComponent[entry.component] = (stats.byComponent[entry.component] || 0) + 1;
    }

    // Time range
    stats.timeRange = {
      start: this.logHistory[0].timestamp,
      end: this.logHistory[this.logHistory.length - 1].timestamp,
    };

    return stats;
  }
}

// ============================================================================
// Global Logger Instance
// ============================================================================

/**
 * Global logger instance for the GAN auditor system
 */
export const logger = new Logger();

/**
 * Configure the global logger
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  logger.configure(config);
}

/**
 * Create a component-specific logger
 */
export function createComponentLogger(component: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger({ ...config, component });
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Log debug message using global logger
 */
export function logDebug(message: string, data?: any, component?: string): void {
  logger.debug(message, data, component);
}

/**
 * Log info message using global logger
 */
export function logInfo(message: string, data?: any, component?: string): void {
  logger.info(message, data, component);
}

/**
 * Log warning message using global logger
 */
export function logWarn(message: string, data?: any, component?: string): void {
  logger.warn(message, data, component);
}

/**
 * Log error message using global logger
 */
export function logError(message: string, error?: Error | GanAuditorError, data?: any, component?: string): void {
  logger.error(message, error, data, component);
}

/**
 * Log error object using global logger
 */
export function logErrorObject(error: Error | GanAuditorError, component?: string): void {
  logger.logError(error, component);
}

// ============================================================================
// Performance Logging
// ============================================================================

/**
 * Performance timer for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private component: string;
  private operation: string;

  constructor(operation: string, component: string = 'performance') {
    this.startTime = Date.now();
    this.operation = operation;
    this.component = component;
    
    logDebug(`Started: ${operation}`, undefined, component);
  }

  /**
   * End the timer and log the duration
   */
  end(data?: any): number {
    const duration = Date.now() - this.startTime;
    logInfo(`Completed: ${this.operation}`, { 
      duration_ms: duration,
      ...data 
    }, this.component);
    return duration;
  }

  /**
   * End the timer with an error
   */
  endWithError(error: Error | GanAuditorError, data?: any): number {
    const duration = Date.now() - this.startTime;
    logError(`Failed: ${this.operation}`, error, { 
      duration_ms: duration,
      ...data 
    }, this.component);
    return duration;
  }
}

/**
 * Create a performance timer
 */
export function createTimer(operation: string, component?: string): PerformanceTimer {
  return new PerformanceTimer(operation, component);
}

/**
 * Measure the duration of an async operation
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  component?: string
): Promise<T> {
  const timer = createTimer(operation, component);
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    timer.endWithError(error as Error);
    throw error;
  }
}

/**
 * Measure the duration of a sync operation
 */
export function measureSync<T>(
  operation: string,
  fn: () => T,
  component?: string
): T {
  const timer = createTimer(operation, component);
  try {
    const result = fn();
    timer.end();
    return result;
  } catch (error) {
    timer.endWithError(error as Error);
    throw error;
  }
}

// ============================================================================
// Prompt-Driven Audit Logging (Requirement 6.4)
// ============================================================================

/**
 * Specialized logger for prompt execution tracking
 */
export class PromptExecutionLogger {
  private readonly componentLogger: Logger;
  private readonly executionHistory: PromptExecutionEntry[] = [];
  private readonly maxHistorySize = 100;

  constructor(component: string = 'prompt-execution') {
    this.componentLogger = createComponentLogger(component, {
      enabled: true,
      level: 'info',
    });
  }

  /**
   * Log prompt rendering start
   */
  logPromptRenderingStart(
    thoughtNumber: number,
    sessionId?: string,
    templatePath?: string
  ): PromptExecutionTimer {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    this.componentLogger.info('Prompt rendering started', {
      executionId,
      thoughtNumber,
      sessionId,
      templatePath,
    });

    return new PromptExecutionTimer(
      executionId,
      'prompt-rendering',
      startTime,
      this.componentLogger,
      (entry) => this.addExecutionEntry(entry)
    );
  }

  /**
   * Log workflow step execution
   */
  logWorkflowStepStart(
    stepName: string,
    thoughtNumber: number,
    sessionId?: string,
    stepIndex?: number
  ): PromptExecutionTimer {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    this.componentLogger.info(`Workflow step ${stepName} started`, {
      executionId,
      stepName,
      stepIndex,
      thoughtNumber,
      sessionId,
    });

    return new PromptExecutionTimer(
      executionId,
      'workflow-step',
      startTime,
      this.componentLogger,
      (entry) => this.addExecutionEntry(entry),
      { stepName, stepIndex }
    );
  }

  /**
   * Log completion analysis execution
   */
  logCompletionAnalysisStart(
    thoughtNumber: number,
    currentLoop: number,
    sessionId?: string
  ): PromptExecutionTimer {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    this.componentLogger.info('Completion analysis started', {
      executionId,
      thoughtNumber,
      currentLoop,
      sessionId,
    });

    return new PromptExecutionTimer(
      executionId,
      'completion-analysis',
      startTime,
      this.componentLogger,
      (entry) => this.addExecutionEntry(entry)
    );
  }

  /**
   * Log quality progression tracking
   */
  logQualityProgression(
    sessionId: string,
    thoughtNumber: number,
    overallScore: number,
    previousScore?: number,
    improvementAreas?: string[]
  ): void {
    const improvement = previousScore !== undefined ? overallScore - previousScore : 0;
    const improvementDirection = improvement > 0 ? '↗️' : improvement < 0 ? '↘️' : '➡️';

    this.componentLogger.info(`Quality progression tracked ${improvementDirection}`, {
      sessionId,
      thoughtNumber,
      overallScore,
      previousScore,
      improvement,
      improvementAreas: improvementAreas?.slice(0, 3), // Limit to first 3 areas
    });

    // Log warning if score is declining
    if (improvement < -5) {
      this.componentLogger.warn('Significant quality decline detected', {
        sessionId,
        thoughtNumber,
        scoreDecline: Math.abs(improvement),
        previousScore,
        currentScore: overallScore,
      });
    }

    // Log success if high score achieved
    if (overallScore >= 90) {
      this.componentLogger.info('High quality score achieved', {
        sessionId,
        thoughtNumber,
        overallScore,
        qualityLevel: overallScore >= 95 ? 'excellent' : 'high',
      });
    }
  }

  /**
   * Log session statistics update
   */
  logSessionStatistics(
    sessionId: string,
    statistics: {
      currentLoop: number;
      sessionDuration: number;
      qualityStats: {
        currentScore: number;
        averageScore: number;
        scoreImprovement: number;
      };
      workflowStats: {
        totalSteps: number;
        averageStepDuration: number;
      };
    }
  ): void {
    this.componentLogger.debug('Session statistics updated', {
      sessionId,
      currentLoop: statistics.currentLoop,
      sessionDurationMinutes: Math.round(statistics.sessionDuration / 60000),
      currentScore: statistics.qualityStats.currentScore,
      averageScore: Math.round(statistics.qualityStats.averageScore),
      totalSteps: statistics.workflowStats.totalSteps,
      avgStepDurationMs: Math.round(statistics.workflowStats.averageStepDuration),
    });

    // Log performance warnings
    if (statistics.sessionDuration > 600000) { // 10 minutes
      this.componentLogger.warn('Long-running audit session detected', {
        sessionId,
        durationMinutes: Math.round(statistics.sessionDuration / 60000),
        currentLoop: statistics.currentLoop,
      });
    }

    if (statistics.workflowStats.averageStepDuration > 5000) { // 5 seconds
      this.componentLogger.warn('Slow workflow step execution detected', {
        sessionId,
        averageStepDurationMs: Math.round(statistics.workflowStats.averageStepDuration),
        totalSteps: statistics.workflowStats.totalSteps,
      });
    }
  }

  /**
   * Log prompt context operations
   */
  logPromptContextOperation(
    operation: 'store' | 'retrieve' | 'validate',
    sessionId: string,
    success: boolean,
    contextSize?: number,
    error?: Error
  ): void {
    const logLevel = success ? 'debug' : 'warn';
    const message = `Prompt context ${operation} ${success ? 'succeeded' : 'failed'}`;

    if (success) {
      this.componentLogger.debug(message, {
        operation,
        sessionId,
        contextSizeBytes: contextSize,
      });
    } else {
      this.componentLogger.warn(message, {
        operation,
        sessionId,
        error: error?.message,
        contextSizeBytes: contextSize,
      });
    }
  }

  /**
   * Get execution history for analysis
   */
  getExecutionHistory(limit?: number): PromptExecutionEntry[] {
    const history = [...this.executionHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get execution statistics
   */
  getExecutionStatistics(): PromptExecutionStatistics {
    const entries = this.executionHistory;
    const now = Date.now();

    // Group by operation type
    const byType = entries.reduce((acc, entry) => {
      if (!acc[entry.operationType]) {
        acc[entry.operationType] = [];
      }
      acc[entry.operationType].push(entry);
      return acc;
    }, {} as Record<string, PromptExecutionEntry[]>);

    // Calculate statistics for each type
    const typeStats: Record<string, OperationTypeStats> = {};
    for (const [type, typeEntries] of Object.entries(byType)) {
      const durations = typeEntries.map(e => e.duration).filter(d => d !== undefined) as number[];
      const successCount = typeEntries.filter(e => e.success).length;

      typeStats[type] = {
        totalExecutions: typeEntries.length,
        successCount,
        failureCount: typeEntries.length - successCount,
        successRate: typeEntries.length > 0 ? successCount / typeEntries.length : 0,
        averageDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      };
    }

    return {
      totalExecutions: entries.length,
      timeRange: entries.length > 0 ? {
        start: entries[0].startTime,
        end: entries[entries.length - 1].endTime || now,
      } : null,
      operationTypes: typeStats,
      recentFailures: entries
        .filter(e => !e.success && (now - e.startTime) < 300000) // Last 5 minutes
        .slice(-10),
    };
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory.length = 0;
    this.componentLogger.debug('Execution history cleared');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addExecutionEntry(entry: PromptExecutionEntry): void {
    this.executionHistory.push(entry);

    // Maintain history size limit
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.splice(0, this.executionHistory.length - this.maxHistorySize);
    }
  }
}

/**
 * Timer for tracking prompt execution operations
 */
export class PromptExecutionTimer {
  constructor(
    private readonly executionId: string,
    private readonly operationType: string,
    private readonly startTime: number,
    private readonly logger: Logger,
    private readonly onComplete: (entry: PromptExecutionEntry) => void,
    private readonly metadata: Record<string, any> = {}
  ) {}

  /**
   * End the timer with success
   */
  end(result?: any): number {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    this.logger.info(`${this.operationType} completed successfully`, {
      executionId: this.executionId,
      durationMs: duration,
      ...this.metadata,
    });

    this.onComplete({
      executionId: this.executionId,
      operationType: this.operationType,
      startTime: this.startTime,
      endTime,
      duration,
      success: true,
      result,
      metadata: this.metadata,
    });

    return duration;
  }

  /**
   * End the timer with error
   */
  endWithError(error: Error, partialResult?: any): number {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    this.logger.error(`${this.operationType} failed`, error, {
      executionId: this.executionId,
      durationMs: duration,
      ...this.metadata,
    });

    this.onComplete({
      executionId: this.executionId,
      operationType: this.operationType,
      startTime: this.startTime,
      endTime,
      duration,
      success: false,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      result: partialResult,
      metadata: this.metadata,
    });

    return duration;
  }

  /**
   * Add metadata to the timer
   */
  addMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }
}

// ============================================================================
// Prompt Logging Types
// ============================================================================

/**
 * Prompt execution entry for history tracking
 */
export interface PromptExecutionEntry {
  executionId: string;
  operationType: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  result?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata: Record<string, any>;
}

/**
 * Statistics for prompt execution operations
 */
export interface PromptExecutionStatistics {
  totalExecutions: number;
  timeRange: {
    start: number;
    end: number;
  } | null;
  operationTypes: Record<string, OperationTypeStats>;
  recentFailures: PromptExecutionEntry[];
}

/**
 * Statistics for a specific operation type
 */
export interface OperationTypeStats {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
}

// ============================================================================
// Global Prompt Logger Instance
// ============================================================================

/**
 * Global prompt execution logger instance
 */
export const promptLogger = new PromptExecutionLogger('prompt-execution');

/**
 * Create a component-specific prompt logger
 */
export function createPromptLogger(component: string): PromptExecutionLogger {
  return new PromptExecutionLogger(component);
}

// ============================================================================
// Convenience Functions for Prompt Logging
// ============================================================================

/**
 * Log prompt rendering operation
 */
export function logPromptRendering<T>(
  operation: () => Promise<T>,
  thoughtNumber: number,
  sessionId?: string,
  templatePath?: string
): Promise<T> {
  const timer = promptLogger.logPromptRenderingStart(thoughtNumber, sessionId, templatePath);
  
  return operation()
    .then(result => {
      timer.end(result);
      return result;
    })
    .catch(error => {
      timer.endWithError(error);
      throw error;
    });
}

/**
 * Log workflow step execution
 */
export function logWorkflowStep<T>(
  operation: () => Promise<T>,
  stepName: string,
  thoughtNumber: number,
  sessionId?: string,
  stepIndex?: number
): Promise<T> {
  const timer = promptLogger.logWorkflowStepStart(stepName, thoughtNumber, sessionId, stepIndex);
  
  return operation()
    .then(result => {
      timer.end(result);
      return result;
    })
    .catch(error => {
      timer.endWithError(error);
      throw error;
    });
}

/**
 * Log completion analysis operation
 */
export function logCompletionAnalysis<T>(
  operation: () => Promise<T>,
  thoughtNumber: number,
  currentLoop: number,
  sessionId?: string
): Promise<T> {
  const timer = promptLogger.logCompletionAnalysisStart(thoughtNumber, currentLoop, sessionId);
  
  return operation()
    .then(result => {
      timer.end(result);
      return result;
    })
    .catch(error => {
      timer.endWithError(error);
      throw error;
    });
}