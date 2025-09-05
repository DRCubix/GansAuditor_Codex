/**
 * Synchronous Audit Engine
 * 
 * This module implements the SynchronousAuditEngine class that provides
 * synchronous audit functionality with timeout handling and blocking
 * until completion, as specified in requirements 1.1, 1.2, 1.3, 1.4.
 */

import type {
  IGanAuditor,
  IGansAuditorCodexAuditor,
} from '../types/integration-types.js';
import type {
  ThoughtData,
  GanReview,
  GansAuditorCodexThoughtData,
  GansAuditorCodexReview,
} from '../types/gan-types.js';
import { GanAuditor } from './gan-auditor.js';
import { logger, createComponentLogger, createTimer } from '../utils/logger.js';
import { 
  errorHandler, 
  withTimeout,
  createErrorResponse,
  handleAuditServiceUnavailable,
  handleAuditTimeout,
  handleInvalidCodeFormat,
} from '../utils/error-handler.js';
import {
  AuditServiceUnavailableError,
  AuditTimeoutError,
  InvalidCodeFormatError,
} from '../types/error-types.js';
import { AuditCache, type AuditCacheConfig } from './audit-cache.js';
import { ProgressTracker, type ProgressTrackerConfig, AuditStage } from './progress-tracker.js';
import { AuditQueue, type AuditQueueConfig } from './audit-queue.js';

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
export const DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG: Required<SynchronousAuditEngineConfig> = {
  auditTimeout: 30000, // 30 seconds
  enabled: true,
  performance: {
    enableCaching: true,
    enableProgressTracking: true,
    enableQueueManagement: true,
    cacheConfig: {},
    progressConfig: {},
    queueConfig: {},
  },
  ganAuditorConfig: {
    sessionManager: {
      stateDirectory: '.mcp-gan-state',
      maxSessionAge: 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: 60 * 60 * 1000, // 1 hour
    },
    contextPacker: {
      maxContextSize: 50000, // 50KB
      maxFileSize: 1024 * 1024, // 1MB
      relevanceThreshold: 0.3,
    },
    codexJudge: {
      executable: 'codex',
      timeout: 30000, // 30 seconds
      retries: 2,
    },
    logging: {
      enabled: false,
      level: 'info',
    },
  },
};

/**
 * Synchronous Audit Engine Implementation
 * 
 * Requirement 1.1: Synchronous audit response - waits for audit completion before responding
 * Requirement 1.2: Audit waiting mechanism that blocks until completion
 * Requirement 1.3: Audit timeout configuration with 30 seconds default
 * Requirement 1.4: Error handling for audit failures and timeouts
 * Requirements 9.1-9.4: Performance optimizations
 */
export class SynchronousAuditEngine {
  private readonly config: Required<SynchronousAuditEngineConfig>;
  private readonly ganAuditor: IGansAuditorCodexAuditor;
  private readonly componentLogger: typeof logger;
  
  // Performance optimization components
  private readonly auditCache?: AuditCache;
  private readonly progressTracker?: ProgressTracker;
  private readonly auditQueue?: AuditQueue;

  constructor(
    config: Partial<SynchronousAuditEngineConfig> = {},
    ganAuditor?: IGansAuditorCodexAuditor
  ) {
    this.config = this.mergeConfig(config);
    this.componentLogger = createComponentLogger('synchronous-audit-engine', {
      enabled: this.config.ganAuditorConfig?.logging?.enabled ?? false,
      level: this.config.ganAuditorConfig?.logging?.level ?? 'info',
    });
    
    // Use provided auditor or create new one
    this.ganAuditor = ganAuditor || new GanAuditor(this.config.ganAuditorConfig);
    
    // Initialize performance optimization components
    this.initializePerformanceComponents();
    
    this.componentLogger.info('Synchronous Audit Engine initialized', {
      enabled: this.config.enabled,
      timeout: this.config.auditTimeout,
      caching: !!this.auditCache,
      progressTracking: !!this.progressTracker,
      queueManagement: !!this.auditQueue,
    });
  }

  /**
   * Audit a thought synchronously and wait for completion
   * 
   * Requirement 1.1: Return audit results in the same response
   * Requirement 1.2: Wait for audit completion before responding
   * Requirements 7.1-7.4: Comprehensive error handling and recovery
   * Requirements 9.1-9.4: Performance optimizations
   */
  async auditAndWait(
    thought: GansAuditorCodexThoughtData, 
    sessionId?: string
  ): Promise<SynchronousAuditResult> {
    const timer = createTimer(`sync-audit-${thought.thoughtNumber}`, 'synchronous-audit-engine');
    const startTime = Date.now();
    
    try {
      this.componentLogger.info(`Starting synchronous audit for thought ${thought.thoughtNumber}`, { 
        sessionId,
        timeout: this.config.auditTimeout 
      });

      // Check if synchronous auditing is enabled
      if (!this.config.enabled) {
        this.componentLogger.debug('Synchronous auditing is disabled, skipping audit');
        return this.createDisabledResult(thought, sessionId);
      }

      // Validate code format before processing (Requirement 7.2)
      const formatValidation = await this.validateCodeFormat(thought);
      if (!formatValidation.isValid) {
        this.componentLogger.warn('Invalid code format detected', {
          thoughtNumber: thought.thoughtNumber,
          issues: formatValidation.issues,
        });
        
        // Handle format error but continue with cleaned code
        const formatError = new InvalidCodeFormatError(
          formatValidation.detectedFormat || 'unknown',
          ['markdown', 'typescript', 'javascript', 'python'],
          thought.thought.substring(0, 200)
        );
        
        const formatResult = await handleInvalidCodeFormat(
          formatError,
          thought.thought,
          ['markdown', 'typescript', 'javascript', 'python']
        );

        // Use cleaned code if available
        if (formatResult.formattedCode) {
          thought = { ...thought, thought: formatResult.formattedCode };
        }
      }

      // Check if audit is required for this thought
      if (!this.isAuditRequired(thought)) {
        this.componentLogger.debug('Audit not required for this thought, skipping');
        return this.createSkippedResult(thought, sessionId);
      }

      // Requirement 9.1: Check cache for identical code submissions
      if (this.auditCache && await this.auditCache.has(thought)) {
        const cachedResult = await this.auditCache.get(thought);
        if (cachedResult) {
          const duration = Date.now() - startTime;
          timer.end({ verdict: cachedResult.verdict, duration, cached: true });

          this.componentLogger.info('Audit result served from cache', {
            thoughtNumber: thought.thoughtNumber,
            sessionId,
            verdict: cachedResult.verdict,
            score: cachedResult.overall,
            duration,
          });

          return {
            review: cachedResult,
            success: true,
            timedOut: false,
            duration,
            sessionId,
          };
        }
      }

      // Execute audit with performance optimizations
      let review: GansAuditorCodexReview;
      let partialResults: any = null;
      let completionPercentage = 0;

      try {
        // Execute audit with queue management and progress tracking
        review = await this.executeOptimizedAudit(thought, sessionId);
      } catch (auditError) {
        const duration = Date.now() - startTime;
        
        // Handle specific error types (Requirements 7.1, 7.4)
        if (this.isServiceUnavailableError(auditError)) {
          return await this.handleServiceUnavailableError(auditError, thought, sessionId, duration);
        }
        
        if (this.isTimeoutError(auditError)) {
          return await this.handleTimeoutError(auditError, thought, sessionId, duration, partialResults, completionPercentage);
        }

        // Handle other errors with fallback
        return await this.handleGenericAuditError(auditError, thought, sessionId, duration);
      }

      // Requirement 9.1: Cache successful audit results
      if (this.auditCache && review) {
        try {
          await this.auditCache.set(thought, review);
        } catch (cacheError) {
          this.componentLogger.warn('Failed to cache audit result', {
            error: (cacheError as Error).message,
          });
        }
      }

      const duration = Date.now() - startTime;
      timer.end({ verdict: review.verdict, duration });

      this.componentLogger.info(`Synchronous audit completed successfully`, {
        thoughtNumber: thought.thoughtNumber,
        sessionId,
        verdict: review.verdict,
        score: review.overall,
        duration,
      });

      return {
        review,
        success: true,
        timedOut: false,
        duration,
        sessionId,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      timer.endWithError(error as Error);

      this.componentLogger.error(
        `Synchronous audit failed with unexpected error`, 
        error as Error, 
        {
          thoughtNumber: thought.thoughtNumber,
          sessionId,
          duration,
        }
      );

      // Create fallback result for unexpected errors
      const fallbackReview = this.createFallbackReview(error as Error, false);

      return {
        review: fallbackReview,
        success: false,
        timedOut: false,
        duration,
        error: (error as Error).message,
        sessionId,
      };
    }
  }

  /**
   * Determine if a thought requires auditing
   * 
   * Requirement 1.4: Return standard response without audit delay when no code is detected
   */
  isAuditRequired(thought: GansAuditorCodexThoughtData): boolean {
    // Check if thought contains code patterns that warrant auditing
    const codePatterns = [
      /```[\s\S]*?```/g, // Code blocks
      /`[^`]+`/g, // Inline code
      /function\s+\w+/g, // Function declarations
      /class\s+\w+/g, // Class declarations
      /import\s+.*from/g, // Import statements
      /export\s+/g, // Export statements
      /const\s+\w+\s*=/g, // Const declarations
      /let\s+\w+\s*=/g, // Let declarations
      /var\s+\w+\s*=/g, // Var declarations
      /\w+\s*:\s*\w+/g, // Type annotations
      /\/\*[\s\S]*?\*\//g, // Block comments
      /\/\/.*$/gm, // Line comments
    ];

    const hasCode = codePatterns.some(pattern => pattern.test(thought.thought));
    
    this.componentLogger.debug(`Audit requirement check for thought ${thought.thoughtNumber}`, {
      hasCode,
      thoughtLength: thought.thought.length,
    });

    return hasCode;
  }

  /**
   * Get the configured audit timeout
   * 
   * Requirement 1.3: Audit timeout configuration (30 seconds default)
   */
  getAuditTimeout(): number {
    return this.config.auditTimeout;
  }

  /**
   * Check if synchronous auditing is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Update the audit timeout configuration
   */
  setAuditTimeout(timeout: number): void {
    if (timeout <= 0) {
      throw new Error('Audit timeout must be greater than 0');
    }
    
    this.config.auditTimeout = timeout;
    this.componentLogger.info(`Audit timeout updated to ${timeout}ms`);
  }

  /**
   * Enable or disable synchronous auditing
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.componentLogger.info(`Synchronous auditing ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Initialize performance optimization components
   * Requirements 9.1-9.4: Performance optimizations
   */
  private initializePerformanceComponents(): void {
    const perfConfig = this.config.performance;

    // Initialize audit cache (Requirement 9.1)
    if (perfConfig?.enableCaching) {
      (this as any).auditCache = new AuditCache(perfConfig.cacheConfig);
      this.componentLogger.info('Audit cache initialized');
    }

    // Initialize progress tracker (Requirement 9.2)
    if (perfConfig?.enableProgressTracking) {
      (this as any).progressTracker = new ProgressTracker(perfConfig.progressConfig);
      this.componentLogger.info('Progress tracker initialized');
    }

    // Initialize audit queue (Requirement 9.3)
    if (perfConfig?.enableQueueManagement) {
      (this as any).auditQueue = new AuditQueue(
        (thought, sessionId) => this.executeDirectAudit(thought, sessionId),
        perfConfig.queueConfig
      );
      this.componentLogger.info('Audit queue initialized');
    }
  }

  /**
   * Execute audit with performance optimizations
   * Requirements 9.2, 9.3: Progress tracking and queue management
   */
  private async executeOptimizedAudit(
    thought: GansAuditorCodexThoughtData,
    sessionId?: string
  ): Promise<GansAuditorCodexReview> {
    // Use queue management if available (Requirement 9.3)
    if (this.auditQueue) {
      return await this.auditQueue.enqueue(thought, sessionId, {
        priority: 'normal',
        timeout: this.config.auditTimeout,
      });
    }

    // Use progress tracking if available (Requirement 9.2)
    if (this.progressTracker) {
      const auditId = `audit-${thought.thoughtNumber}-${Date.now()}`;
      
      try {
        this.progressTracker.startTracking(auditId, thought);
        this.progressTracker.updateStage(auditId, AuditStage.INITIALIZING);
        
        const result = await this.executeDirectAudit(thought, sessionId);
        
        this.progressTracker.completeTracking(auditId, true);
        return result;
      } catch (error) {
        this.progressTracker.completeTracking(auditId, false);
        throw error;
      }
    }

    // Fallback to direct execution
    return await this.executeDirectAudit(thought, sessionId);
  }

  /**
   * Execute audit directly without optimizations
   */
  private async executeDirectAudit(
    thought: GansAuditorCodexThoughtData,
    sessionId?: string
  ): Promise<GansAuditorCodexReview> {
    return await withTimeout(
      () => this.ganAuditor.auditThought(thought, sessionId),
      this.config.auditTimeout,
      'Audit operation timed out'
    );
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: Partial<SynchronousAuditEngineConfig>): Required<SynchronousAuditEngineConfig> {
    return {
      auditTimeout: config.auditTimeout ?? DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.auditTimeout,
      enabled: config.enabled ?? DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.enabled,
      performance: {
        enableCaching: config.performance?.enableCaching ?? DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.performance.enableCaching,
        enableProgressTracking: config.performance?.enableProgressTracking ?? DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.performance.enableProgressTracking,
        enableQueueManagement: config.performance?.enableQueueManagement ?? DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.performance.enableQueueManagement,
        cacheConfig: {
          ...DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.performance.cacheConfig,
          ...config.performance?.cacheConfig,
        },
        progressConfig: {
          ...DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.performance.progressConfig,
          ...config.performance?.progressConfig,
        },
        queueConfig: {
          ...DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.performance.queueConfig,
          ...config.performance?.queueConfig,
        },
      },
      ganAuditorConfig: {
        sessionManager: {
          ...DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.ganAuditorConfig.sessionManager,
          ...config.ganAuditorConfig?.sessionManager,
        },
        contextPacker: {
          ...DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.ganAuditorConfig.contextPacker,
          ...config.ganAuditorConfig?.contextPacker,
        },
        codexJudge: {
          ...DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.ganAuditorConfig.codexJudge,
          ...config.ganAuditorConfig?.codexJudge,
        },
        logging: {
          ...DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.ganAuditorConfig.logging,
          ...config.ganAuditorConfig?.logging,
        },
      },
    };
  }

  /**
   * Create result for when synchronous auditing is disabled
   */
  private createDisabledResult(
    thought: GansAuditorCodexThoughtData, 
    sessionId?: string
  ): SynchronousAuditResult {
    return {
      review: this.createSkippedReview('Synchronous auditing is disabled'),
      success: true,
      timedOut: false,
      duration: 0,
      sessionId,
    };
  }

  /**
   * Create result for when audit is not required
   */
  private createSkippedResult(
    thought: GansAuditorCodexThoughtData, 
    sessionId?: string
  ): SynchronousAuditResult {
    return {
      review: this.createSkippedReview('No code detected, audit not required'),
      success: true,
      timedOut: false,
      duration: 0,
      sessionId,
    };
  }

  /**
   * Create a skipped review for non-code thoughts
   */
  private createSkippedReview(reason: string): GansAuditorCodexReview {
    return {
      overall: 100, // Perfect score for non-code content
      dimensions: [
        { name: 'accuracy', score: 100 },
        { name: 'completeness', score: 100 },
        { name: 'clarity', score: 100 },
        { name: 'actionability', score: 100 },
        { name: 'human_likeness', score: 100 },
      ],
      verdict: 'pass',
      review: {
        summary: reason,
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 0,
      judge_cards: [{
        model: 'synchronous-audit-engine',
        score: 100,
        notes: reason,
      }],
    };
  }

  /**
   * Create fallback review for error scenarios
   * 
   * Requirement 1.4: Error handling for audit failures and timeouts
   */
  private createFallbackReview(error: Error, isTimeout: boolean): GansAuditorCodexReview {
    const fallbackScore = 50; // Neutral score for error cases
    const errorType = isTimeout ? 'timeout' : 'failure';
    const errorMessage = isTimeout 
      ? `Audit timed out after ${this.config.auditTimeout}ms. Please review the code manually and ensure all dependencies are properly configured.`
      : `Audit failed due to an error: ${error.message}. Please review the code manually and ensure all dependencies are properly configured.`;

    return {
      overall: fallbackScore,
      dimensions: [
        { name: 'accuracy', score: fallbackScore },
        { name: 'completeness', score: fallbackScore },
        { name: 'clarity', score: fallbackScore },
        { name: 'actionability', score: fallbackScore },
        { name: 'human_likeness', score: fallbackScore },
      ],
      verdict: 'revise',
      review: {
        summary: errorMessage,
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 1,
      judge_cards: [{
        model: 'synchronous-audit-engine-fallback',
        score: fallbackScore,
        notes: `Fallback response due to audit ${errorType}: ${error.message}`,
      }],
    };
  }

  // ============================================================================
  // Error Handling Methods (Requirements 7.1-7.4)
  // ============================================================================

  /**
   * Validate code format before processing (Requirement 7.2)
   */
  private async validateCodeFormat(thought: GansAuditorCodexThoughtData): Promise<{
    isValid: boolean;
    detectedFormat?: string;
    issues: string[];
  }> {
    const issues: string[] = [];
    let detectedFormat = 'text';

    // Check for code blocks
    const codeBlockPattern = /```(\w+)?\s*\n([\s\S]*?)\n\s*```/g;
    const codeBlocks = [...thought.thought.matchAll(codeBlockPattern)];

    if (codeBlocks.length > 0) {
      detectedFormat = 'markdown';
      
      // Validate each code block
      for (const [fullMatch, language, content] of codeBlocks) {
        if (!content || content.trim().length === 0) {
          issues.push('Empty code block detected');
        }
        
        if (language && !this.isSupportedLanguage(language)) {
          issues.push(`Unsupported language identifier: ${language}`);
        }
        
        // Check for common syntax issues
        if (content.includes('```')) {
          issues.push('Nested code blocks detected');
        }
      }
    }

    // Check for inline code
    const inlineCodePattern = /`[^`]+`/g;
    const inlineCode = thought.thought.match(inlineCodePattern);
    if (inlineCode && inlineCode.length > 0) {
      detectedFormat = detectedFormat === 'text' ? 'markdown' : detectedFormat;
    }

    // Check for programming language patterns
    const languagePatterns = [
      { pattern: /function\s+\w+|const\s+\w+\s*=|class\s+\w+/, language: 'javascript' },
      { pattern: /def\s+\w+|import\s+\w+|from\s+\w+\s+import/, language: 'python' },
      { pattern: /interface\s+\w+|type\s+\w+\s*=|export\s+/, language: 'typescript' },
    ];

    for (const { pattern, language } of languagePatterns) {
      if (pattern.test(thought.thought)) {
        detectedFormat = language;
        break;
      }
    }

    return {
      isValid: issues.length === 0,
      detectedFormat,
      issues,
    };
  }

  /**
   * Check if a language identifier is supported
   */
  private isSupportedLanguage(language: string): boolean {
    const supportedLanguages = [
      'typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'c',
      'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'html',
      'css', 'json', 'yaml', 'xml', 'sql', 'bash', 'shell', 'powershell'
    ];
    return supportedLanguages.includes(language.toLowerCase());
  }

  /**
   * Execute audit with recovery mechanisms
   */
  private async executeAuditWithRecovery(
    thought: GansAuditorCodexThoughtData,
    sessionId?: string
  ): Promise<GansAuditorCodexReview> {
    // First attempt with full timeout
    try {
      return await withTimeout(
        () => this.ganAuditor.auditThought(thought, sessionId),
        this.config.auditTimeout,
        'Audit operation timed out'
      );
    } catch (error) {
      // If it's a service unavailable error, don't retry
      if (this.isServiceUnavailableError(error)) {
        throw error;
      }

      // For other errors, attempt retry with reduced timeout
      this.componentLogger.warn('First audit attempt failed, retrying with reduced timeout', {
        error: (error as Error).message,
        originalTimeout: this.config.auditTimeout,
      });

      const reducedTimeout = Math.floor(this.config.auditTimeout * 0.7);
      
      try {
        return await withTimeout(
          () => this.ganAuditor.auditThought(thought, sessionId),
          reducedTimeout,
          'Audit retry timed out'
        );
      } catch (retryError) {
        // If retry also fails, throw the original error
        throw error;
      }
    }
  }

  /**
   * Check if error indicates service unavailability (Requirement 7.1)
   */
  private isServiceUnavailableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('service unavailable') ||
             message.includes('connection refused') ||
             message.includes('network error') ||
             message.includes('econnrefused') ||
             message.includes('service not found') ||
             message.includes('codex not available');
    }
    return false;
  }

  /**
   * Check if error indicates timeout (Requirement 7.4)
   */
  private isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('timed out') ||
             message.includes('timeout') ||
             message.includes('etimedout');
    }
    return false;
  }

  /**
   * Handle service unavailable error (Requirement 7.1)
   */
  private async handleServiceUnavailableError(
    error: unknown,
    thought: GansAuditorCodexThoughtData,
    sessionId: string | undefined,
    duration: number
  ): Promise<SynchronousAuditResult> {
    this.componentLogger.error('Audit service unavailable', error as Error, {
      thoughtNumber: thought.thoughtNumber,
      sessionId,
      duration,
    });

    const serviceError = new AuditServiceUnavailableError(
      'GAN Auditor Service',
      (error as Error).message
    );

    const result = await handleAuditServiceUnavailable(serviceError, 'GAN Auditor Service');

    return {
      review: result.fallbackAudit || this.createFallbackReview(error as Error, false),
      success: false,
      timedOut: false,
      duration,
      error: serviceError.message,
      sessionId,
    };
  }

  /**
   * Handle timeout error with partial results (Requirement 7.4)
   */
  private async handleTimeoutError(
    error: unknown,
    thought: GansAuditorCodexThoughtData,
    sessionId: string | undefined,
    duration: number,
    partialResults?: any,
    completionPercentage?: number
  ): Promise<SynchronousAuditResult> {
    this.componentLogger.error('Audit operation timed out', error as Error, {
      thoughtNumber: thought.thoughtNumber,
      sessionId,
      duration,
      completionPercentage,
    });

    const timeoutError = new AuditTimeoutError(
      this.config.auditTimeout,
      partialResults,
      completionPercentage,
      'audit'
    );

    const result = await handleAuditTimeout(
      timeoutError,
      this.config.auditTimeout,
      partialResults,
      completionPercentage
    );

    return {
      review: result.partialAudit || this.createFallbackReview(error as Error, true),
      success: false,
      timedOut: true,
      duration,
      error: timeoutError.message,
      sessionId,
    };
  }

  /**
   * Handle generic audit errors
   */
  private async handleGenericAuditError(
    error: unknown,
    thought: GansAuditorCodexThoughtData,
    sessionId: string | undefined,
    duration: number
  ): Promise<SynchronousAuditResult> {
    this.componentLogger.error('Generic audit error', error as Error, {
      thoughtNumber: thought.thoughtNumber,
      sessionId,
      duration,
    });

    const fallbackReview = this.createFallbackReview(error as Error, false);

    return {
      review: fallbackReview,
      success: false,
      timedOut: false,
      duration,
      error: (error as Error).message,
      sessionId,
    };
  }

  /**
   * Get performance statistics
   * Requirements 9.1-9.4: Performance monitoring
   */
  getPerformanceStats(): {
    cache?: any;
    queue?: any;
    progress?: any;
  } {
    return {
      cache: this.auditCache?.getStats(),
      queue: this.auditQueue?.getStats(),
      progress: this.progressTracker?.getStats(),
    };
  }

  /**
   * Clear performance caches
   * Requirement 9.1: Cache management
   */
  clearCache(): void {
    if (this.auditCache) {
      this.auditCache.clear();
      this.componentLogger.info('Audit cache cleared');
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Cleanup performance components
    if (this.auditCache) {
      this.auditCache.destroy();
    }
    if (this.progressTracker) {
      this.progressTracker.destroy();
    }
    if (this.auditQueue) {
      this.auditQueue.destroy();
    }

    if (this.ganAuditor && typeof (this.ganAuditor as any).destroy === 'function') {
      (this.ganAuditor as any).destroy();
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new Synchronous Audit Engine instance with default configuration
 */
export function createSynchronousAuditEngine(
  config: Partial<SynchronousAuditEngineConfig> = {}
): SynchronousAuditEngine {
  return new SynchronousAuditEngine(config);
}

/**
 * Create a Synchronous Audit Engine instance with custom GAN auditor
 */
export function createSynchronousAuditEngineWithAuditor(
  config: Partial<SynchronousAuditEngineConfig>,
  ganAuditor: IGansAuditorCodexAuditor
): SynchronousAuditEngine {
  return new SynchronousAuditEngine(config, ganAuditor);
}