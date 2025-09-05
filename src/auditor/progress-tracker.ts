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
import { logger, createComponentLogger } from '../utils/logger.js';

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
export enum AuditStage {
  INITIALIZING = 'initializing',
  PARSING_CODE = 'parsing_code',
  ANALYZING_STRUCTURE = 'analyzing_structure',
  RUNNING_CHECKS = 'running_checks',
  EVALUATING_QUALITY = 'evaluating_quality',
  GENERATING_FEEDBACK = 'generating_feedback',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  FAILED = 'failed',
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
 * Active audit tracking information
 */
interface ActiveAudit {
  /** Unique audit identifier */
  id: string;
  /** Thought data being audited */
  thought: GansAuditorCodexThoughtData;
  /** Start timestamp */
  startTime: number;
  /** Current stage */
  currentStage: AuditStage;
  /** Current progress percentage */
  progress: number;
  /** Stage start times for duration estimation */
  stageStartTimes: Map<AuditStage, number>;
  /** Stage durations for estimation */
  stageDurations: Map<AuditStage, number>;
  /** Update timer */
  updateTimer?: NodeJS.Timeout;
  /** Whether progress tracking is active */
  isTracking: boolean;
}

/**
 * Default configuration for progress tracker
 */
export const DEFAULT_PROGRESS_TRACKER_CONFIG: ProgressTrackerConfig = {
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
  private readonly config: ProgressTrackerConfig;
  private readonly componentLogger: typeof logger;
  private readonly activeAudits = new Map<string, ActiveAudit>();
  private readonly stageWeights = new Map<AuditStage, number>();

  constructor(config: Partial<ProgressTrackerConfig> = {}) {
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
  startTracking(auditId: string, thought: GansAuditorCodexThoughtData): void {
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
    const audit: ActiveAudit = {
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
  updateStage(auditId: string, stage: AuditStage, message?: string): void {
    const audit = this.activeAudits.get(auditId);
    if (!audit) {
      return;
    }

    const now = Date.now();
    
    // Record duration of previous stage
    if (audit.stageStartTimes.has(audit.currentStage)) {
      const stageDuration = now - audit.stageStartTimes.get(audit.currentStage)!;
      audit.stageDurations.set(audit.currentStage, stageDuration);
    }

    // Update to new stage
    audit.currentStage = stage;
    audit.stageStartTimes.set(stage, now);
    audit.progress = this.calculateProgress(stage);

    // Store custom message if provided
    if (message) {
      (audit as any).customMessage = message;
    } else {
      // Clear custom message when stage changes without message
      delete (audit as any).customMessage;
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
  updateProgress(auditId: string, stageProgress: number, message?: string): void {
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
      (audit as any).customMessage = message;
    }

    this.emitProgressUpdate(audit, message);
  }

  /**
   * Complete tracking for an audit
   */
  completeTracking(auditId: string, success: boolean = true): void {
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
  getProgress(auditId: string): ProgressUpdate | null {
    const audit = this.activeAudits.get(auditId);
    if (!audit || !audit.isTracking) {
      return null;
    }

    return this.createProgressUpdate(audit);
  }

  /**
   * Get all active audit progresses
   */
  getAllProgress(): ProgressUpdate[] {
    return Array.from(this.activeAudits.values())
      .filter(audit => audit.isTracking)
      .map(audit => this.createProgressUpdate(audit));
  }

  /**
   * Cancel tracking for an audit
   */
  cancelTracking(auditId: string): void {
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
  getStats(): {
    activeAudits: number;
    totalTracked: number;
    averageDuration: number;
  } {
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
  destroy(): void {
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
  private initializeStageWeights(): void {
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
  private calculateProgress(stage: AuditStage): number {
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
  private enableProgressTracking(auditId: string): void {
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
  private createProgressUpdate(audit: ActiveAudit, message?: string): ProgressUpdate {
    const now = Date.now();
    const elapsedTime = now - audit.startTime;
    const estimatedTimeRemaining = this.estimateTimeRemaining(audit);

    // Use provided message, stored custom message, or default stage message
    const finalMessage = message || 
                        (audit as any).customMessage || 
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
  private emitProgressUpdate(audit: ActiveAudit, message?: string): void {
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
  private estimateTimeRemaining(audit: ActiveAudit): number | undefined {
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
  private getStageMessage(stage: AuditStage): string {
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
export function createProgressTracker(config: Partial<ProgressTrackerConfig> = {}): ProgressTracker {
  return new ProgressTracker(config);
}