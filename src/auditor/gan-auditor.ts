/**
 * GAN Auditor Orchestration Layer
 * 
 * This module implements the main GanAuditor class that coordinates session management,
 * context building, and judging to provide comprehensive code audit functionality.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4 - GAN auditor orchestration
 */

import type {
  IGanAuditor,
  ISessionManager,
  IContextPacker,
  ICodexJudge,
} from '../types/integration-types.js';
import type {
  ThoughtData,
  GanReview,
  SessionConfig,
  SessionState,
  AuditRequest,
  AuditRubric,
  AuditBudget,
  InlineConfig,
} from '../types/gan-types.js';
import { DEFAULT_SESSION_CONFIG, DEFAULT_AUDIT_RUBRIC } from '../types/gan-types.js';
import { extractInlineConfig, validateAndSanitizeConfig } from '../config/config-parser.js';
import { SessionManager } from '../session/session-manager.js';
import { ContextPacker } from '../context/context-packer.js';
import { CodexJudge } from '../codex/codex-judge.js';
import { 
  errorHandler, 
  withRetry, 
  withGracefulDegradation,
  handleConfigError,
  handleCodexError,
  handleSessionError,
  createErrorResponse,
} from '../utils/error-handler.js';
import { logger, createComponentLogger, createTimer } from '../utils/logger.js';
import type { GanAuditorError } from '../types/error-types.js';

/**
 * Configuration for GAN Auditor
 */
export interface GanAuditorConfig {
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
}

/**
 * Default configuration for GAN Auditor
 */
export const DEFAULT_GAN_AUDITOR_CONFIG: Required<GanAuditorConfig> = {
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
};

/**
 * Main GAN Auditor orchestration class
 * 
 * Requirement 1.1: Coordinate session management, context building, and judging
 * Requirement 1.2: Implement audit workflow logic
 * Requirement 1.3: Process audit results and determine verdicts
 * Requirement 1.4: Integrate inline config parsing with session configuration
 */
export class GanAuditor implements IGanAuditor {
  private readonly sessionManager: ISessionManager;
  private readonly contextPacker: IContextPacker;
  private readonly codexJudge: ICodexJudge;
  private readonly config: Required<GanAuditorConfig>;
  private readonly componentLogger: typeof logger;

  constructor(
    config: GanAuditorConfig = {},
    sessionManager?: ISessionManager,
    contextPacker?: IContextPacker,
    codexJudge?: ICodexJudge
  ) {
    this.config = this.mergeConfig(config);
    
    // Create component-specific logger
    this.componentLogger = createComponentLogger('gan-auditor', {
      enabled: this.config.logging.enabled,
      level: this.config.logging.level,
    });
    
    // Use provided instances or create new ones
    this.sessionManager = sessionManager || new SessionManager(this.config.sessionManager);
    this.contextPacker = contextPacker || new ContextPacker(this.config.contextPacker);
    this.codexJudge = codexJudge || new CodexJudge(this.config.codexJudge);
  }

  /**
   * Audit a thought and return review results
   * Requirement 1.2: Implement audit workflow logic (load session → build context → execute audit → persist results)
   */
  async auditThought(thought: ThoughtData, sessionId?: string): Promise<GanReview> {
    const timer = createTimer(`audit-thought-${thought.thoughtNumber}`, 'gan-auditor');
    
    try {
      this.componentLogger.info(`Starting audit for thought ${thought.thoughtNumber}`, { sessionId });

      // Step 1: Load or create session with error handling
      const session = await withGracefulDegradation(
        () => this.loadOrCreateSession(thought, sessionId),
        () => this.createFallbackSession(thought, sessionId),
        'session-loading'
      );
      
      if (session.degraded) {
        this.componentLogger.warn('Using fallback session due to loading issues', { sessionId });
      }
      
      this.componentLogger.debug(`Loaded session ${session.result.id}`, { 
        sessionConfig: session.result.config,
        degraded: session.degraded 
      });

      // Step 2: Extract and merge inline configuration with error handling
      const mergedConfig = await this.mergeInlineConfigWithErrorHandling(
        thought.thought, 
        session.result.config
      );
      
      if (JSON.stringify(mergedConfig) !== JSON.stringify(session.result.config)) {
        session.result.config = mergedConfig;
        
        // Try to update session, but don't fail if it doesn't work
        await withGracefulDegradation(
          () => this.sessionManager.updateSession(session.result),
          () => Promise.resolve(), // No-op fallback
          'session-config-update'
        );
        
        this.componentLogger.debug('Updated session config with inline configuration', { 
          newConfig: mergedConfig 
        });
      }

      // Step 3: Build repository context with error handling
      const contextResult = await withGracefulDegradation(
        () => this.buildContext(session.result.config),
        () => this.buildFallbackContext(),
        'context-building'
      );
      
      this.componentLogger.debug(`Built context pack (${contextResult.result.length} characters)`, { 
        scope: session.result.config.scope,
        degraded: contextResult.degraded 
      });

      // Step 4: Execute audit with comprehensive error handling
      const auditRequest = this.createAuditRequest(thought, contextResult.result, session.result.config);
      const auditResult = await withGracefulDegradation(
        () => this.executeAudit(auditRequest),
        () => this.createFallbackAuditResult(auditRequest, contextResult.error),
        'audit-execution'
      );
      
      this.componentLogger.info(`Audit completed with verdict: ${auditResult.result.verdict}`, { 
        overall: auditResult.result.overall, 
        iterations: auditResult.result.iterations,
        degraded: auditResult.degraded
      });

      // Step 5: Process and persist results (non-critical, continue on failure)
      await this.persistAuditResultsWithErrorHandling(session.result, thought, auditResult.result);

      timer.end({ 
        verdict: auditResult.result.verdict,
        degraded: auditResult.degraded || contextResult.degraded || session.degraded 
      });
      
      return auditResult.result;
    } catch (error) {
      timer.endWithError(error as Error);
      
      // Create and return fallback audit result instead of throwing
      const fallbackResult = await handleCodexError(error, 'audit-thought-fallback');
      
      this.componentLogger.error('Audit failed, returning fallback result', error as Error, {
        thoughtNumber: thought.thoughtNumber,
        sessionId
      });
      
      return fallbackResult;
    }
  }

  /**
   * Extract inline configuration from thought text
   * Requirement 1.4: Integration between inline config parsing and session configuration
   */
  extractInlineConfig(thought: string): Partial<SessionConfig> | null {
    try {
      const parseResult = extractInlineConfig(thought);
      
      if (!parseResult.success) {
        this.componentLogger.debug('No inline config found or parsing failed', { error: parseResult.error });
        return null;
      }

      const validationResult = validateAndSanitizeConfig(parseResult.config);
      
      if (!validationResult.isValid) {
        this.componentLogger.warn('Inline config validation failed', { 
          errors: validationResult.errors,
          warnings: validationResult.warnings 
        });
        // Return the sanitized config even if there were validation errors
        return validationResult.data || null;
      }

      this.componentLogger.debug('Successfully extracted inline config', { config: validationResult.data });
      return validationResult.data || null;
    } catch (error) {
      this.componentLogger.error('Failed to extract inline config', error as Error);
      return null;
    }
  }

  /**
   * Validate audit configuration
   */
  validateConfig(config: Partial<SessionConfig>): SessionConfig {
    const validationResult = validateAndSanitizeConfig(config, DEFAULT_SESSION_CONFIG);
    
    if (!validationResult.isValid) {
      this.log('warn', 'Config validation issues', { 
        errors: validationResult.errors,
        warnings: validationResult.warnings 
      });
    }

    return validationResult.data || DEFAULT_SESSION_CONFIG;
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Load existing session or create new one
   */
  private async loadOrCreateSession(thought: ThoughtData, sessionId?: string): Promise<SessionState> {
    // Determine session ID
    const effectiveSessionId = sessionId || 
                              thought.branchId || 
                              this.sessionManager.generateSessionId();

    // Try to load existing session
    let session = await this.sessionManager.getSession(effectiveSessionId);
    
    if (session) {
      this.log('debug', `Loaded existing session ${effectiveSessionId}`);
      return session;
    }

    // Create new session with default configuration
    this.log('debug', `Creating new session ${effectiveSessionId}`);
    session = await this.sessionManager.createSession(effectiveSessionId, DEFAULT_SESSION_CONFIG);
    
    return session;
  }

  /**
   * Merge inline configuration with session configuration
   */
  private async mergeInlineConfig(thoughtText: string, sessionConfig: SessionConfig): Promise<SessionConfig> {
    const inlineConfig = this.extractInlineConfig(thoughtText);
    
    if (!inlineConfig) {
      return sessionConfig;
    }

    // Merge inline config with session config
    const validationResult = validateAndSanitizeConfig(inlineConfig, sessionConfig);
    
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      this.componentLogger.warn('Configuration merge warnings', { warnings: validationResult.warnings });
    }

    return validationResult.data || sessionConfig;
  }

  /**
   * Merge inline configuration with comprehensive error handling
   */
  private async mergeInlineConfigWithErrorHandling(
    thoughtText: string, 
    sessionConfig: SessionConfig
  ): Promise<SessionConfig> {
    try {
      return await this.mergeInlineConfig(thoughtText, sessionConfig);
    } catch (error) {
      return await handleConfigError(error, sessionConfig);
    }
  }

  /**
   * Create fallback session for error scenarios
   */
  private async createFallbackSession(thought: ThoughtData, sessionId?: string): Promise<SessionState> {
    const effectiveSessionId = sessionId || 
                              thought.branchId || 
                              `fallback-${Date.now()}`;

    this.componentLogger.warn(`Creating fallback session ${effectiveSessionId}`);
    
    return {
      id: effectiveSessionId,
      config: DEFAULT_SESSION_CONFIG,
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // Enhanced fields for synchronous workflow
      iterations: [],
      currentLoop: 0,
      isComplete: false,
      codexContextActive: false,
    };
  }

  /**
   * Build fallback context when normal context building fails
   */
  private async buildFallbackContext(): Promise<string> {
    return `# Fallback Context\n\nContext Build Failed. Proceeding with minimal context.\n\nTimestamp: ${new Date().toISOString()}\n`;
  }

  /**
   * Create fallback audit result
   */
  private async createFallbackAuditResult(
    request: AuditRequest, 
    contextError?: GanAuditorError
  ): Promise<GanReview> {
    const fallbackScore = 50;
    const errorMessage = contextError ? 
      `Context building failed: ${contextError.message}` : 
      'Codex execution failed';
    
    return {
      overall: fallbackScore,
      dimensions: DEFAULT_AUDIT_RUBRIC.dimensions.map(d => ({
        name: d.name,
        score: fallbackScore,
      })),
      verdict: 'revise',
      review: {
        summary: `Audit could not be completed due to an error: ${errorMessage}. Please review the code manually and ensure all dependencies are properly configured.`,
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 1,
      judge_cards: [{
        model: 'fallback',
        score: fallbackScore,
        notes: `Fallback response: ${errorMessage}`,
      }],
    };
  }

  /**
   * Persist audit results with error handling
   */
  private async persistAuditResultsWithErrorHandling(
    session: SessionState, 
    thought: ThoughtData, 
    review: GanReview
  ): Promise<void> {
    try {
      await this.persistAuditResults(session, thought, review);
    } catch (error) {
      // Log the error but don't fail the audit
      this.componentLogger.error('Failed to persist audit results, continuing without persistence', 
        error as Error, { 
          sessionId: session.id,
          thoughtNumber: thought.thoughtNumber 
        });
    }
  }

  /**
   * Build repository context based on session configuration
   */
  private async buildContext(config: SessionConfig): Promise<string> {
    return await withRetry(
      () => this.contextPacker.buildContextPack(config),
      'context-building',
      { maxAttempts: 2, retryableErrors: ['filesystem'] }
    );
  }

  /**
   * Create audit request from thought data and context
   */
  private createAuditRequest(
    thought: ThoughtData, 
    contextPack: string, 
    config: SessionConfig
  ): AuditRequest {
    const rubric: AuditRubric = DEFAULT_AUDIT_RUBRIC;
    
    const budget: AuditBudget = {
      maxCycles: config.maxCycles,
      candidates: config.candidates,
      threshold: config.threshold,
    };

    return {
      task: config.task,
      candidate: thought.thought,
      contextPack,
      rubric,
      budget,
    };
  }

  /**
   * Execute audit using Codex judge
   */
  private async executeAudit(request: AuditRequest): Promise<GanReview> {
    // Execute once; rely on graceful degradation upstream to provide fallback
    return await this.codexJudge.executeAudit(request);
  }

  /**
   * Persist audit results to session
   */
  private async persistAuditResults(
    session: SessionState, 
    thought: ThoughtData, 
    review: GanReview
  ): Promise<void> {
    await withRetry(
      () => this.sessionManager.addAuditToHistory(
        session.id,
        thought.thoughtNumber,
        review,
        session.config
      ),
      'session-persistence',
      { maxAttempts: 2, retryableErrors: ['session', 'filesystem'] }
    );
  }

  /**
   * Create fallback review for error scenarios
   */
  private createFallbackReview(errorMessage: string): GanReview {
    const fallbackScore = 50; // Neutral score for error cases
    
    return {
      overall: fallbackScore,
      dimensions: DEFAULT_AUDIT_RUBRIC.dimensions.map(d => ({
        name: d.name,
        score: fallbackScore,
      })),
      verdict: 'revise',
      review: {
        summary: `Audit could not be completed due to an error: ${errorMessage}. Please review the code manually and ensure all dependencies are properly configured.`,
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 1,
      judge_cards: [{
        model: 'fallback',
        score: fallbackScore,
        notes: `Fallback response due to: ${errorMessage}`,
      }],
    };
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: GanAuditorConfig): Required<GanAuditorConfig> {
    return {
      sessionManager: { ...DEFAULT_GAN_AUDITOR_CONFIG.sessionManager, ...config.sessionManager },
      contextPacker: { ...DEFAULT_GAN_AUDITOR_CONFIG.contextPacker, ...config.contextPacker },
      codexJudge: { ...DEFAULT_GAN_AUDITOR_CONFIG.codexJudge, ...config.codexJudge },
      logging: { ...DEFAULT_GAN_AUDITOR_CONFIG.logging, ...config.logging },
    };
  }

  /**
   * Logging utility (deprecated - use componentLogger instead)
   * @deprecated Use this.componentLogger instead
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    // Delegate to component logger for consistency
    switch (level) {
      case 'debug':
        this.componentLogger.debug(message, data);
        break;
      case 'info':
        this.componentLogger.info(message, data);
        break;
      case 'warn':
        this.componentLogger.warn(message, data);
        break;
      case 'error':
        this.componentLogger.error(message, undefined, data);
        break;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.sessionManager && typeof (this.sessionManager as any).destroy === 'function') {
      (this.sessionManager as any).destroy();
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new GAN Auditor instance with default configuration
 */
export function createGanAuditor(config: GanAuditorConfig = {}): IGanAuditor {
  return new GanAuditor(config);
}

/**
 * Create a GAN Auditor instance with custom components
 */
export function createGanAuditorWithComponents(
  config: GanAuditorConfig,
  sessionManager: ISessionManager,
  contextPacker: IContextPacker,
  codexJudge: ICodexJudge
): IGanAuditor {
  return new GanAuditor(config, sessionManager, contextPacker, codexJudge);
}
