/**
 * Synchronous Audit Engine
 *
 * This module implements the SynchronousAuditEngine class that provides
 * synchronous audit functionality with timeout handling and blocking
 * until completion, as specified in requirements 1.1, 1.2, 1.3, 1.4.
 */
import type { IGansAuditorCodexAuditor } from '../types/integration-types.js';
import type { GansAuditorCodexThoughtData, GansAuditorCodexReview } from '../types/gan-types.js';
import { type AuditCacheConfig } from './audit-cache.js';
import { type ProgressTrackerConfig } from './progress-tracker.js';
import { type AuditQueueConfig } from './audit-queue.js';
/**
 * Configuration for the Synchronous Audit Engine
 */
export interface SynchronousAuditEngineConfig {
    /**
     * Timeout for audit operations in milliseconds
     * Default: 30000 (30 seconds)
     */
    auditTimeout: number;
    /**
     * Whether to enable synchronous auditing
     * Default: true
     */
    enabled: boolean;
    /**
     * Performance optimization configuration
     */
    performance?: {
        /** Enable audit result caching */
        enableCaching?: boolean;
        /** Enable progress tracking for long audits */
        enableProgressTracking?: boolean;
        /** Enable concurrent audit limiting */
        enableQueueManagement?: boolean;
        /** Audit cache configuration */
        cacheConfig?: Partial<AuditCacheConfig>;
        /** Progress tracker configuration */
        progressConfig?: Partial<ProgressTrackerConfig>;
        /** Audit queue configuration */
        queueConfig?: Partial<AuditQueueConfig>;
    };
    /**
     * Configuration for the underlying GAN auditor
     */
    ganAuditorConfig?: {
        sessionManager?: {
            stateDirectory?: string;
            maxSessionAge?: number;
            cleanupInterval?: number;
        };
        contextPacker?: {
            maxContextSize?: number;
            maxFileSize?: number;
            relevanceThreshold?: number;
        };
        codexJudge?: {
            executable?: string;
            timeout?: number;
            retries?: number;
        };
        logging?: {
            enabled?: boolean;
            level?: 'debug' | 'info' | 'warn' | 'error';
        };
    };
}
/**
 * Result of a synchronous audit operation
 */
export interface SynchronousAuditResult {
    /**
     * The audit review result
     */
    review: GansAuditorCodexReview;
    /**
     * Whether the audit completed successfully
     */
    success: boolean;
    /**
     * Whether the audit timed out
     */
    timedOut: boolean;
    /**
     * Duration of the audit in milliseconds
     */
    duration: number;
    /**
     * Error message if the audit failed
     */
    error?: string;
    /**
     * Session ID used for the audit
     */
    sessionId?: string;
}
/**
 * Default configuration for the Synchronous Audit Engine
 */
export declare const DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG: Required<SynchronousAuditEngineConfig>;
/**
 * Synchronous Audit Engine Implementation
 *
 * Requirement 1.1: Synchronous audit response - waits for audit completion before responding
 * Requirement 1.2: Audit waiting mechanism that blocks until completion
 * Requirement 1.3: Audit timeout configuration with 30 seconds default
 * Requirement 1.4: Error handling for audit failures and timeouts
 * Requirements 9.1-9.4: Performance optimizations
 */
export declare class SynchronousAuditEngine {
    private readonly config;
    private readonly ganAuditor;
    private readonly componentLogger;
    private readonly auditCache?;
    private readonly progressTracker?;
    private readonly auditQueue?;
    constructor(config?: Partial<SynchronousAuditEngineConfig>, ganAuditor?: IGansAuditorCodexAuditor);
    /**
     * Audit a thought synchronously and wait for completion
     *
     * Requirement 1.1: Return audit results in the same response
     * Requirement 1.2: Wait for audit completion before responding
     * Requirements 7.1-7.4: Comprehensive error handling and recovery
     * Requirements 9.1-9.4: Performance optimizations
     */
    auditAndWait(thought: GansAuditorCodexThoughtData, sessionId?: string): Promise<SynchronousAuditResult>;
    /**
     * Determine if a thought requires auditing
     *
     * Requirement 1.4: Return standard response without audit delay when no code is detected
     */
    isAuditRequired(thought: GansAuditorCodexThoughtData): boolean;
    /**
     * Get the configured audit timeout
     *
     * Requirement 1.3: Audit timeout configuration (30 seconds default)
     */
    getAuditTimeout(): number;
    /**
     * Check if synchronous auditing is enabled
     */
    isEnabled(): boolean;
    /**
     * Update the audit timeout configuration
     */
    setAuditTimeout(timeout: number): void;
    /**
     * Enable or disable synchronous auditing
     */
    setEnabled(enabled: boolean): void;
    /**
     * Initialize performance optimization components
     * Requirements 9.1-9.4: Performance optimizations
     */
    private initializePerformanceComponents;
    /**
     * Execute audit with performance optimizations
     * Requirements 9.2, 9.3: Progress tracking and queue management
     */
    private executeOptimizedAudit;
    /**
     * Execute audit directly without optimizations
     */
    private executeDirectAudit;
    /**
     * Merge configuration with defaults
     */
    private mergeConfig;
    /**
     * Create result for when synchronous auditing is disabled
     */
    private createDisabledResult;
    /**
     * Create result for when audit is not required
     */
    private createSkippedResult;
    /**
     * Create a skipped review for non-code thoughts
     */
    private createSkippedReview;
    /**
     * Validate code format before processing (Requirement 7.2)
     */
    private validateCodeFormat;
    /**
     * Check if a language identifier is supported
     */
    private isSupportedLanguage;
    /**
     * Execute audit with recovery mechanisms
     */
    private executeAuditWithRecovery;
    /**
     * Check if error indicates service unavailability (Requirement 7.1)
     */
    private isServiceUnavailableError;
    /**
     * Check if error indicates timeout (Requirement 7.4)
     */
    private isTimeoutError;
    /**
     * Handle service unavailable error (Requirement 7.1)
     */
    private handleServiceUnavailableError;
    /**
     * Handle timeout error with partial results (Requirement 7.4)
     */
    private handleTimeoutError;
    /**
     * Handle generic audit errors
     */
    private handleGenericAuditError;
    /**
     * Get performance statistics
     * Requirements 9.1-9.4: Performance monitoring
     */
    getPerformanceStats(): {
        cache?: any;
        queue?: any;
        progress?: any;
    };
    /**
     * Clear performance caches
     * Requirement 9.1: Cache management
     */
    clearCache(): void;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
/**
 * Create a new Synchronous Audit Engine instance with default configuration
 */
export declare function createSynchronousAuditEngine(config?: Partial<SynchronousAuditEngineConfig>): SynchronousAuditEngine;
/**
 * Create a Synchronous Audit Engine instance with custom GAN auditor
 */
export declare function createSynchronousAuditEngineWithAuditor(config: Partial<SynchronousAuditEngineConfig>, ganAuditor: IGansAuditorCodexAuditor): SynchronousAuditEngine;
//# sourceMappingURL=synchronous-audit-engine.d.ts.map