/**
 * Progress Tracker for Long-Running Audits
 *
 * Provides progress indicators and status updates for audit operations
 * that may take significant time to complete.
 *
 * Requirements: 9.2 - Implement progress indicators for long-running audits
 */
import { EventEmitter } from 'events';
import type { GansAuditorCodexThoughtData } from '../types/gan-types.js';
/**
 * Progress update information
 */
export interface ProgressUpdate {
    /** Unique identifier for the audit operation */
    auditId: string;
    /** Current progress percentage (0-100) */
    percentage: number;
    /** Current stage of the audit process */
    stage: AuditStage;
    /** Descriptive message about current progress */
    message: string;
    /** Estimated time remaining in milliseconds */
    estimatedTimeRemaining?: number;
    /** Elapsed time since audit started */
    elapsedTime: number;
    /** Additional metadata */
    metadata?: Record<string, any>;
}
/**
 * Audit stages for progress tracking
 */
export declare enum AuditStage {
    INITIALIZING = "initializing",
    PARSING_CODE = "parsing_code",
    ANALYZING_STRUCTURE = "analyzing_structure",
    RUNNING_CHECKS = "running_checks",
    EVALUATING_QUALITY = "evaluating_quality",
    GENERATING_FEEDBACK = "generating_feedback",
    FINALIZING = "finalizing",
    COMPLETED = "completed",
    FAILED = "failed"
}
/**
 * Configuration for progress tracking
 */
export interface ProgressTrackerConfig {
    /** Minimum audit duration to trigger progress tracking (ms) */
    progressThreshold: number;
    /** Interval between progress updates (ms) */
    updateInterval: number;
    /** Whether to enable detailed progress logging */
    enableLogging: boolean;
    /** Maximum number of concurrent tracked audits */
    maxConcurrentAudits: number;
}
/**
 * Default configuration for progress tracker
 */
export declare const DEFAULT_PROGRESS_TRACKER_CONFIG: ProgressTrackerConfig;
/**
 * Progress Tracker Implementation
 *
 * Tracks and reports progress for long-running audit operations
 * with stage-based progress estimation and time remaining calculations.
 */
export declare class ProgressTracker extends EventEmitter {
    private readonly config;
    private readonly componentLogger;
    private readonly activeAudits;
    private readonly stageWeights;
    constructor(config?: Partial<ProgressTrackerConfig>);
    /**
     * Start tracking progress for an audit operation
     */
    startTracking(auditId: string, thought: GansAuditorCodexThoughtData): void;
    /**
     * Update the current stage of an audit
     */
    updateStage(auditId: string, stage: AuditStage, message?: string): void;
    /**
     * Update progress within current stage
     */
    updateProgress(auditId: string, stageProgress: number, message?: string): void;
    /**
     * Complete tracking for an audit
     */
    completeTracking(auditId: string, success?: boolean): void;
    /**
     * Get current progress for an audit
     */
    getProgress(auditId: string): ProgressUpdate | null;
    /**
     * Get all active audit progresses
     */
    getAllProgress(): ProgressUpdate[];
    /**
     * Cancel tracking for an audit
     */
    cancelTracking(auditId: string): void;
    /**
     * Get tracking statistics
     */
    getStats(): {
        activeAudits: number;
        totalTracked: number;
        averageDuration: number;
    };
    /**
     * Destroy progress tracker and cleanup resources
     */
    destroy(): void;
    /**
     * Initialize stage weights for progress calculation
     */
    private initializeStageWeights;
    /**
     * Calculate progress percentage based on current stage
     */
    private calculateProgress;
    /**
     * Enable progress tracking for an audit
     */
    private enableProgressTracking;
    /**
     * Create progress update object
     */
    private createProgressUpdate;
    /**
     * Emit progress update event
     */
    private emitProgressUpdate;
    /**
     * Estimate time remaining for audit completion
     */
    private estimateTimeRemaining;
    /**
     * Get default message for audit stage
     */
    private getStageMessage;
}
/**
 * Create progress tracker with default configuration
 */
export declare function createProgressTracker(config?: Partial<ProgressTrackerConfig>): ProgressTracker;
//# sourceMappingURL=progress-tracker.d.ts.map