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
import { PerformanceTimer } from '../utils/logger.js';
import type { GansAuditorCodexReview, IterationData } from '../types/gan-types.js';
/**
 * Audit event types for structured logging
 */
export type AuditEventType = 'audit_started' | 'audit_completed' | 'audit_failed' | 'audit_timeout' | 'session_created' | 'session_updated' | 'session_completed' | 'session_terminated' | 'stagnation_detected' | 'completion_criteria_met' | 'context_created' | 'context_maintained' | 'context_terminated' | 'cache_hit' | 'cache_miss' | 'queue_enqueued' | 'queue_dequeued' | 'performance_threshold_exceeded';
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
    maxLogFileSize: number;
    maxLogFiles: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enablePerformanceLogging: boolean;
    enableSessionTracking: boolean;
    enableCodexContextLogging: boolean;
    flushInterval: number;
    compressionEnabled: boolean;
}
/**
 * Default audit logger configuration
 */
export declare const DEFAULT_AUDIT_LOGGER_CONFIG: AuditLoggerConfig;
/**
 * Specialized logger for audit performance and session tracking
 */
export declare class AuditLogger {
    private readonly config;
    private readonly componentLogger;
    private auditLogBuffer;
    private sessionLogBuffer;
    private performanceLogBuffer;
    private codexLogBuffer;
    private flushTimer?;
    private isInitialized;
    constructor(config?: Partial<AuditLoggerConfig>);
    /**
     * Log audit event
     */
    logAuditEvent(eventType: AuditEventType, sessionId: string, data: Record<string, any>, options?: {
        loopId?: string;
        thoughtNumber?: number;
        duration?: number;
    }): void;
    /**
     * Log session lifecycle event
     */
    logSessionEvent(sessionId: string, event: SessionLogEntry['event'], data: SessionLogEntry['data'], loopId?: string, iteration?: number): void;
    /**
     * Log performance metric
     */
    logPerformanceMetric(category: PerformanceLogEntry['category'], metric: string, value: number, unit: string, context?: Record<string, any>, threshold?: number): void;
    /**
     * Log Codex context event
     */
    logCodexContextEvent(loopId: string, contextId: string, event: CodexContextLogEntry['event'], options?: {
        duration?: number;
        resourceUsage?: CodexContextLogEntry['resourceUsage'];
        terminationReason?: string;
        error?: string;
    }): void;
    /**
     * Log audit start
     */
    logAuditStart(sessionId: string, thoughtNumber: number, loopId?: string): PerformanceTimer;
    /**
     * Log audit completion
     */
    logAuditComplete(sessionId: string, thoughtNumber: number, review: GansAuditorCodexReview, duration: number, loopId?: string): void;
    /**
     * Log audit failure
     */
    logAuditFailure(sessionId: string, thoughtNumber: number, error: string, duration: number, loopId?: string): void;
    /**
     * Log session creation
     */
    logSessionCreation(sessionId: string, config: any, loopId?: string): void;
    /**
     * Log session update
     */
    logSessionUpdate(sessionId: string, iteration: IterationData, currentLoop: number, loopId?: string): void;
    /**
     * Log session completion
     */
    logSessionCompletion(sessionId: string, totalLoops: number, reason: string, duration: number, loopId?: string): void;
    /**
     * Log stagnation detection
     */
    logStagnationDetection(sessionId: string, loop: number, similarityScore: number, loopId?: string): void;
    /**
     * Flush all log buffers to files
     */
    flush(): Promise<void>;
    /**
     * Get current buffer sizes
     */
    getBufferSizes(): {
        audit: number;
        session: number;
        performance: number;
        codex: number;
    };
    /**
     * Stop the audit logger and flush remaining logs
     */
    stop(): Promise<void>;
    /**
     * Initialize the audit logger
     */
    private initialize;
    /**
     * Write log entries to file
     */
    private writeLogFile;
    /**
     * Capture current performance snapshot
     */
    private capturePerformanceSnapshot;
    /**
     * Record event in metrics collector
     */
    private recordMetricsEvent;
}
/**
 * Global audit logger instance
 */
export declare const auditLogger: AuditLogger;
/**
 * Convenience functions for audit logging
 */
export declare const logAuditStart: (sessionId: string, thoughtNumber: number, loopId?: string) => PerformanceTimer;
export declare const logAuditComplete: (sessionId: string, thoughtNumber: number, review: GansAuditorCodexReview, duration: number, loopId?: string) => void;
export declare const logAuditFailure: (sessionId: string, thoughtNumber: number, error: string, duration: number, loopId?: string) => void;
export declare const logSessionCreation: (sessionId: string, config: any, loopId?: string) => void;
export declare const logSessionUpdate: (sessionId: string, iteration: IterationData, currentLoop: number, loopId?: string) => void;
export declare const logSessionCompletion: (sessionId: string, totalLoops: number, reason: string, duration: number, loopId?: string) => void;
export declare const logStagnationDetection: (sessionId: string, loop: number, similarityScore: number, loopId?: string) => void;
export declare const logCodexContextEvent: (loopId: string, contextId: string, event: CodexContextLogEntry["event"], options?: Parameters<typeof auditLogger.logCodexContextEvent>[3]) => void;
export declare const logPerformanceMetric: (category: PerformanceLogEntry["category"], metric: string, value: number, unit: string, context?: Record<string, any>, threshold?: number) => void;
//# sourceMappingURL=audit-logger.d.ts.map