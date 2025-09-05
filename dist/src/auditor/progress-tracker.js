/**
 * Progress Tracker for Long-Running Audits
 *
 * Provides progress indicators and status updates for audit operations
 * that may take significant time to complete.
 *
 * Requirements: 9.2 - Implement progress indicators for long-running audits
 */
import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger.js';
/**
 * Audit stages for progress tracking
 */
export var AuditStage;
(function (AuditStage) {
    AuditStage["INITIALIZING"] = "initializing";
    AuditStage["PARSING_CODE"] = "parsing_code";
    AuditStage["ANALYZING_STRUCTURE"] = "analyzing_structure";
    AuditStage["RUNNING_CHECKS"] = "running_checks";
    AuditStage["EVALUATING_QUALITY"] = "evaluating_quality";
    AuditStage["GENERATING_FEEDBACK"] = "generating_feedback";
    AuditStage["FINALIZING"] = "finalizing";
    AuditStage["COMPLETED"] = "completed";
    AuditStage["FAILED"] = "failed";
})(AuditStage || (AuditStage = {}));
/**
 * Default configuration for progress tracker
 */
export const DEFAULT_PROGRESS_TRACKER_CONFIG = {
    progressThreshold: 5000, // 5 seconds
    updateInterval: 1000, // 1 second
    enableLogging: true,
    maxConcurrentAudits: 10,
};
/**
 * Progress Tracker Implementation
 *
 * Tracks and reports progress for long-running audit operations
 * with stage-based progress estimation and time remaining calculations.
 */
export class ProgressTracker extends EventEmitter {
    config;
    componentLogger;
    activeAudits = new Map();
    stageWeights = new Map();
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_PROGRESS_TRACKER_CONFIG, ...config };
        this.componentLogger = createComponentLogger('progress-tracker');
        this.initializeStageWeights();
        this.componentLogger.info('Progress tracker initialized', {
            progressThreshold: this.config.progressThreshold,
            updateInterval: this.config.updateInterval,
            maxConcurrentAudits: this.config.maxConcurrentAudits,
        });
    }
    /**
     * Start tracking progress for an audit operation
     */
    startTracking(auditId, thought) {
        // Check concurrent audit limit
        if (this.activeAudits.size >= this.config.maxConcurrentAudits) {
            this.componentLogger.warn('Maximum concurrent audits reached, not tracking progress', {
                auditId,
                activeCount: this.activeAudits.size,
                maxConcurrent: this.config.maxConcurrentAudits,
            });
            return;
        }
        const now = Date.now();
        const audit = {
            id: auditId,
            thought,
            startTime: now,
            currentStage: AuditStage.INITIALIZING,
            progress: 0,
            stageStartTimes: new Map([[AuditStage.INITIALIZING, now]]),
            stageDurations: new Map(),
            isTracking: false,
        };
        this.activeAudits.set(auditId, audit);
        // Start progress tracking after threshold delay
        setTimeout(() => {
            if (this.activeAudits.has(auditId)) {
                this.enableProgressTracking(auditId);
            }
        }, this.config.progressThreshold);
        this.componentLogger.debug('Started audit tracking', {
            auditId,
            thoughtNumber: thought.thoughtNumber,
        });
    }
    /**
     * Update the current stage of an audit
     */
    updateStage(auditId, stage, message) {
        const audit = this.activeAudits.get(auditId);
        if (!audit) {
            return;
        }
        const now = Date.now();
        // Record duration of previous stage
        if (audit.stageStartTimes.has(audit.currentStage)) {
            const stageDuration = now - audit.stageStartTimes.get(audit.currentStage);
            audit.stageDurations.set(audit.currentStage, stageDuration);
        }
        // Update to new stage
        audit.currentStage = stage;
        audit.stageStartTimes.set(stage, now);
        audit.progress = this.calculateProgress(stage);
        // Store custom message if provided
        if (message) {
            audit.customMessage = message;
        }
        else {
            // Clear custom message when stage changes without message
            delete audit.customMessage;
        }
        if (audit.isTracking) {
            this.emitProgressUpdate(audit, message);
        }
        this.componentLogger.debug('Audit stage updated', {
            auditId,
            stage,
            progress: audit.progress,
            message,
        });
    }
    /**
     * Update progress within current stage
     */
    updateProgress(auditId, stageProgress, message) {
        const audit = this.activeAudits.get(auditId);
        if (!audit || !audit.isTracking) {
            return;
        }
        // Calculate overall progress based on stage and stage progress
        const stageBaseProgress = this.calculateProgress(audit.currentStage);
        const stageWeight = this.stageWeights.get(audit.currentStage) || 10;
        const stageProgressContribution = (stageProgress / 100) * stageWeight;
        audit.progress = Math.min(100, stageBaseProgress + stageProgressContribution);
        // Store custom message if provided
        if (message) {
            audit.customMessage = message;
        }
        this.emitProgressUpdate(audit, message);
    }
    /**
     * Complete tracking for an audit
     */
    completeTracking(auditId, success = true) {
        const audit = this.activeAudits.get(auditId);
        if (!audit) {
            return;
        }
        // Clear update timer
        if (audit.updateTimer) {
            clearInterval(audit.updateTimer);
        }
        // Final progress update
        audit.currentStage = success ? AuditStage.COMPLETED : AuditStage.FAILED;
        audit.progress = success ? 100 : 0;
        if (audit.isTracking) {
            this.emitProgressUpdate(audit, success ? 'Audit completed successfully' : 'Audit failed');
        }
        // Record final metrics
        const totalDuration = Date.now() - audit.startTime;
        this.componentLogger.info('Audit tracking completed', {
            auditId,
            success,
            totalDuration,
            wasTracking: audit.isTracking,
            thoughtNumber: audit.thought.thoughtNumber,
        });
        // Remove from active audits
        this.activeAudits.delete(auditId);
    }
    /**
     * Get current progress for an audit
     */
    getProgress(auditId) {
        const audit = this.activeAudits.get(auditId);
        if (!audit || !audit.isTracking) {
            return null;
        }
        return this.createProgressUpdate(audit);
    }
    /**
     * Get all active audit progresses
     */
    getAllProgress() {
        return Array.from(this.activeAudits.values())
            .filter(audit => audit.isTracking)
            .map(audit => this.createProgressUpdate(audit));
    }
    /**
     * Cancel tracking for an audit
     */
    cancelTracking(auditId) {
        const audit = this.activeAudits.get(auditId);
        if (!audit) {
            return;
        }
        if (audit.updateTimer) {
            clearInterval(audit.updateTimer);
        }
        this.activeAudits.delete(auditId);
        this.componentLogger.debug('Audit tracking cancelled', { auditId });
    }
    /**
     * Get tracking statistics
     */
    getStats() {
        const activeCount = this.activeAudits.size;
        // Calculate average duration from completed audits
        // This would need to be tracked separately for accurate statistics
        return {
            activeAudits: activeCount,
            totalTracked: 0, // Would need separate tracking
            averageDuration: 0, // Would need separate tracking
        };
    }
    /**
     * Destroy progress tracker and cleanup resources
     */
    destroy() {
        // Cancel all active tracking
        for (const auditId of this.activeAudits.keys()) {
            this.cancelTracking(auditId);
        }
        this.removeAllListeners();
        this.componentLogger.info('Progress tracker destroyed');
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Initialize stage weights for progress calculation
     */
    initializeStageWeights() {
        this.stageWeights.set(AuditStage.INITIALIZING, 5);
        this.stageWeights.set(AuditStage.PARSING_CODE, 10);
        this.stageWeights.set(AuditStage.ANALYZING_STRUCTURE, 15);
        this.stageWeights.set(AuditStage.RUNNING_CHECKS, 40);
        this.stageWeights.set(AuditStage.EVALUATING_QUALITY, 20);
        this.stageWeights.set(AuditStage.GENERATING_FEEDBACK, 8);
        this.stageWeights.set(AuditStage.FINALIZING, 2);
    }
    /**
     * Calculate progress percentage based on current stage
     */
    calculateProgress(stage) {
        let progress = 0;
        const stageOrder = [
            AuditStage.INITIALIZING,
            AuditStage.PARSING_CODE,
            AuditStage.ANALYZING_STRUCTURE,
            AuditStage.RUNNING_CHECKS,
            AuditStage.EVALUATING_QUALITY,
            AuditStage.GENERATING_FEEDBACK,
            AuditStage.FINALIZING,
        ];
        for (const currentStage of stageOrder) {
            if (currentStage === stage) {
                break;
            }
            progress += this.stageWeights.get(currentStage) || 0;
        }
        return Math.min(100, progress);
    }
    /**
     * Enable progress tracking for an audit
     */
    enableProgressTracking(auditId) {
        const audit = this.activeAudits.get(auditId);
        if (!audit || audit.isTracking) {
            return;
        }
        audit.isTracking = true;
        // Start periodic progress updates
        audit.updateTimer = setInterval(() => {
            this.emitProgressUpdate(audit);
        }, this.config.updateInterval);
        // Emit initial progress update
        this.emitProgressUpdate(audit, 'Progress tracking started');
        this.componentLogger.debug('Progress tracking enabled', {
            auditId,
            elapsedTime: Date.now() - audit.startTime,
        });
    }
    /**
     * Create progress update object
     */
    createProgressUpdate(audit, message) {
        const now = Date.now();
        const elapsedTime = now - audit.startTime;
        const estimatedTimeRemaining = this.estimateTimeRemaining(audit);
        // Use provided message, stored custom message, or default stage message
        const finalMessage = message ||
            audit.customMessage ||
            this.getStageMessage(audit.currentStage);
        return {
            auditId: audit.id,
            percentage: Math.round(audit.progress),
            stage: audit.currentStage,
            message: finalMessage,
            estimatedTimeRemaining,
            elapsedTime,
            metadata: {
                thoughtNumber: audit.thought.thoughtNumber,
                codeLength: audit.thought.thought.length,
            },
        };
    }
    /**
     * Emit progress update event
     */
    emitProgressUpdate(audit, message) {
        const update = this.createProgressUpdate(audit, message);
        this.emit('progress', update);
        if (this.config.enableLogging) {
            this.componentLogger.debug('Progress update', {
                auditId: audit.id,
                percentage: update.percentage,
                stage: update.stage,
                elapsedTime: update.elapsedTime,
                estimatedTimeRemaining: update.estimatedTimeRemaining,
            });
        }
    }
    /**
     * Estimate time remaining for audit completion
     */
    estimateTimeRemaining(audit) {
        if (audit.progress <= 0) {
            return undefined;
        }
        const elapsedTime = Date.now() - audit.startTime;
        const estimatedTotalTime = (elapsedTime / audit.progress) * 100;
        const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
        return Math.round(remainingTime);
    }
    /**
     * Get default message for audit stage
     */
    getStageMessage(stage) {
        const messages = {
            [AuditStage.INITIALIZING]: 'Initializing audit process...',
            [AuditStage.PARSING_CODE]: 'Parsing code structure...',
            [AuditStage.ANALYZING_STRUCTURE]: 'Analyzing code architecture...',
            [AuditStage.RUNNING_CHECKS]: 'Running quality checks...',
            [AuditStage.EVALUATING_QUALITY]: 'Evaluating code quality...',
            [AuditStage.GENERATING_FEEDBACK]: 'Generating feedback...',
            [AuditStage.FINALIZING]: 'Finalizing audit results...',
            [AuditStage.COMPLETED]: 'Audit completed successfully',
            [AuditStage.FAILED]: 'Audit failed',
        };
        return messages[stage] || 'Processing...';
    }
}
/**
 * Create progress tracker with default configuration
 */
export function createProgressTracker(config = {}) {
    return new ProgressTracker(config);
}
//# sourceMappingURL=progress-tracker.js.map