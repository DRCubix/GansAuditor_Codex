/**
 * System Prompt Integration for GansAuditor_Codex
 * 
 * This module integrates the system prompt manager with the existing
 * GansAuditor_Codex architecture, providing seamless prompt-driven auditing.
 */

import type {
  IGanAuditor,
  ICodexJudge,
  ISessionManager,
  IContextPacker,
} from '../types/integration-types.js';
import type {
  GansAuditorCodexThoughtData,
  GansAuditorCodexReview,
  GansAuditorCodexSessionState,
  AuditRequest,
} from '../types/gan-types.js';
import { SystemPromptManager, type CompletionAnalysis, type NextAction } from './system-prompt-manager.js';
import { logger, createComponentLogger } from '../utils/logger.js';
import { 
  errorHandler, 
  withTimeout,
  withGracefulDegradation,
} from '../utils/error-handler.js';

/**
 * Configuration for prompt-driven auditing
 */
export interface PromptDrivenAuditConfig {
  enableSystemPrompt: boolean;
  promptManagerConfig?: {
    promptTemplatePath?: string;
    enableCaching?: boolean;
    cacheMaxAge?: number;
  };
  integrationConfig?: {
    enhanceCodexRequests: boolean;
    processResponses: boolean;
    manageCompletion: boolean;
    trackProgress: boolean;
  };
}

/**
 * Enhanced audit request with system prompt context
 */
export interface PromptEnhancedAuditRequest extends AuditRequest {
  systemPrompt?: string;
  promptContext?: {
    variables: any;
    metadata: any;
  };
}

/**
 * Enhanced audit result with completion analysis
 */
export interface PromptEnhancedAuditResult {
  review: GansAuditorCodexReview;
  completionAnalysis: CompletionAnalysis;
  nextActions: NextAction[];
  promptMetadata?: {
    version: string;
    renderedAt: number;
    configHash: string;
  };
}

/**
 * Prompt-driven GAN Auditor
 * 
 * Wraps the existing GAN Auditor with system prompt capabilities,
 * providing enhanced audit requests and intelligent completion management.
 */
export class PromptDrivenGanAuditor implements IGanAuditor {
  private readonly baseAuditor: IGanAuditor;
  private readonly systemPromptManager: SystemPromptManager;
  private readonly config: Required<PromptDrivenAuditConfig>;
  private readonly componentLogger: typeof logger;

  constructor(
    baseAuditor: IGanAuditor,
    config: PromptDrivenAuditConfig = { enableSystemPrompt: true }
  ) {
    this.baseAuditor = baseAuditor;
    this.config = this.mergeConfig(config);
    
    this.systemPromptManager = new SystemPromptManager(
      this.config.promptManagerConfig
    );
    
    this.componentLogger = createComponentLogger('prompt-driven-gan-auditor', {
      enabled: true,
      level: 'info',
    });
    
    this.componentLogger.info('Prompt-driven GAN Auditor initialized', {
      enableSystemPrompt: this.config.enableSystemPrompt,
      enhanceCodexRequests: this.config.integrationConfig.enhanceCodexRequests,
      processResponses: this.config.integrationConfig.processResponses,
    });
  }

  /**
   * Audit thought with system prompt enhancement
   */
  async auditThought(
    thought: GansAuditorCodexThoughtData, 
    sessionId?: string
  ): Promise<GansAuditorCodexReview> {
    if (!this.config.enableSystemPrompt) {
      // Fallback to base auditor when system prompt is disabled
      return await this.baseAuditor.auditThought(thought, sessionId);
    }

    try {
      this.componentLogger.info(`Starting prompt-driven audit for thought ${thought.thoughtNumber}`, {
        sessionId,
        enableSystemPrompt: this.config.enableSystemPrompt,
      });

      // Get session state for context
      const session = sessionId ? await this.getSessionState(sessionId) : undefined;
      
      // Render system prompt with context
      const renderedPrompt = await withGracefulDegradation(
        () => this.renderSystemPromptWithContext(thought, session),
        () => this.createFallbackPrompt(thought, session),
        'system-prompt-rendering'
      );

      // Execute audit with enhanced context
      const auditResult = await this.executePromptEnhancedAudit(
        thought,
        session,
        renderedPrompt.result
      );

      // Process response with completion analysis
      const processedResult = await this.processAuditResponse(
        auditResult,
        renderedPrompt.result,
        session
      );

      // Update session with completion analysis
      if (session && this.config.integrationConfig.trackProgress) {
        await this.updateSessionWithCompletion(
          session,
          processedResult.completionAnalysis,
          processedResult.nextActions
        );
      }

      this.componentLogger.info(`Prompt-driven audit completed`, {
        thoughtNumber: thought.thoughtNumber,
        sessionId,
        verdict: processedResult.review.verdict,
        score: processedResult.review.overall,
        completionStatus: processedResult.completionAnalysis.status,
        nextThoughtNeeded: processedResult.completionAnalysis.nextThoughtNeeded,
      });

      return processedResult.review;

    } catch (error) {
      this.componentLogger.error(
        'Prompt-driven audit failed, falling back to base auditor',
        error as Error,
        { thoughtNumber: thought.thoughtNumber, sessionId }
      );

      // Fallback to base auditor on error
      return await this.baseAuditor.auditThought(thought, sessionId);
    }
  }

  /**
   * Extract inline configuration (delegate to base auditor)
   */
  extractInlineConfig(thought: string): any {
    return this.baseAuditor.extractInlineConfig(thought);
  }

  /**
   * Validate configuration (delegate to base auditor)
   */
  validateConfig(config: any): any {
    if (this.baseAuditor && typeof (this.baseAuditor as any).validateConfig === 'function') {
      return (this.baseAuditor as any).validateConfig(config);
    }
    
    // Fallback validation
    return config;
  }

  /**
   * Get system prompt manager for configuration
   */
  getSystemPromptManager(): SystemPromptManager {
    return this.systemPromptManager;
  }

  /**
   * Update prompt configuration
   */
  updatePromptConfig(config: Partial<PromptDrivenAuditConfig>): void {
    Object.assign(this.config, config);
    
    if (config.promptManagerConfig) {
      this.systemPromptManager.updateConfig(config.promptManagerConfig as any);
    }
    
    this.componentLogger.info('Prompt configuration updated', {
      changes: Object.keys(config),
    });
  }

  /**
   * Get prompt statistics and performance metrics
   */
  getPromptStats(): {
    cacheStats: any;
    configHash: string;
    enabledFeatures: string[];
  } {
    return {
      cacheStats: this.systemPromptManager.getCacheStats(),
      configHash: this.generateConfigHash(),
      enabledFeatures: this.getEnabledFeatures(),
    };
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Render system prompt with full context
   */
  private async renderSystemPromptWithContext(
    thought: GansAuditorCodexThoughtData,
    session?: GansAuditorCodexSessionState
  ) {
    // Gather project context
    const projectContext = await this.gatherProjectContext(session);
    
    // Render system prompt
    return await this.systemPromptManager.renderSystemPrompt(
      thought,
      session,
      projectContext
    );
  }

  /**
   * Create fallback prompt for error scenarios
   */
  private async createFallbackPrompt(
    thought: GansAuditorCodexThoughtData,
    session?: GansAuditorCodexSessionState
  ) {
    return {
      content: `# Fallback System Prompt\n\nYou are an AI code auditor. Review the provided code for quality, correctness, and best practices.\n\nProvide structured feedback with scores and actionable recommendations.`,
      variables: {
        MODEL_CONTEXT_TOKENS: 200000,
        AUDIT_TIMEOUT_MS: 30000,
        CURRENT_LOOP: session?.currentLoop || 0,
      },
      metadata: {
        version: 'fallback',
        renderedAt: Date.now(),
        configHash: 'fallback',
      },
    };
  }

  /**
   * Execute audit with enhanced prompt context
   */
  private async executePromptEnhancedAudit(
    thought: GansAuditorCodexThoughtData,
    session: GansAuditorCodexSessionState | undefined,
    renderedPrompt: any
  ): Promise<GansAuditorCodexReview> {
    if (this.config.integrationConfig.enhanceCodexRequests) {
      // Create enhanced audit request with system prompt
      const enhancedRequest = await this.createEnhancedAuditRequest(
        thought,
        session,
        renderedPrompt
      );
      
      // Execute with enhanced context (this would require extending the base auditor)
      // For now, we'll use the base auditor and inject context through session
      return await this.baseAuditor.auditThought(thought, session?.id);
    } else {
      // Use base auditor without enhancement
      return await this.baseAuditor.auditThought(thought, session?.id);
    }
  }

  /**
   * Process audit response with completion analysis
   */
  private async processAuditResponse(
    auditResult: GansAuditorCodexReview,
    renderedPrompt: any,
    session?: GansAuditorCodexSessionState
  ): Promise<PromptEnhancedAuditResult> {
    if (this.config.integrationConfig.processResponses) {
      const processed = this.systemPromptManager.processAuditResponse(
        auditResult,
        renderedPrompt,
        session
      );
      
      return {
        review: processed.enhancedResponse,
        completionAnalysis: processed.completionAnalysis,
        nextActions: processed.nextActions,
        promptMetadata: renderedPrompt.metadata,
      };
    } else {
      // Basic processing without prompt enhancement
      return {
        review: auditResult,
        completionAnalysis: {
          status: 'in_progress',
          reason: 'Basic processing - no completion analysis',
          nextThoughtNeeded: true,
        },
        nextActions: [],
        promptMetadata: renderedPrompt.metadata,
      };
    }
  }

  /**
   * Gather project context for prompt rendering
   */
  private async gatherProjectContext(
    session?: GansAuditorCodexSessionState
  ): Promise<{
    steering?: string;
    spec?: string;
    repository?: string;
  }> {
    // This would integrate with existing ContextPacker to gather:
    // - Steering documents from .kiro/steering/
    // - Spec documents from .kiro/specs/{feature}/
    // - Repository context based on session scope
    
    return {
      steering: 'Project steering rules and conventions',
      spec: 'Feature specifications and acceptance criteria',
      repository: 'Repository context and file structure',
    };
  }

  /**
   * Create enhanced audit request with system prompt
   */
  private async createEnhancedAuditRequest(
    thought: GansAuditorCodexThoughtData,
    session: GansAuditorCodexSessionState | undefined,
    renderedPrompt: any
  ): Promise<PromptEnhancedAuditRequest> {
    // This would create an enhanced request that includes the system prompt
    // The actual implementation would depend on extending the CodexJudge interface
    
    return {
      task: 'Enhanced audit with system prompt',
      candidate: thought.thought,
      contextPack: 'Repository context',
      rubric: { dimensions: [] },
      budget: { maxCycles: 1, candidates: 1, threshold: 85 },
      systemPrompt: renderedPrompt.content,
      promptContext: {
        variables: renderedPrompt.variables,
        metadata: renderedPrompt.metadata,
      },
    };
  }

  /**
   * Update session with completion analysis
   */
  private async updateSessionWithCompletion(
    session: GansAuditorCodexSessionState,
    completion: CompletionAnalysis,
    nextActions: NextAction[]
  ): Promise<void> {
    // Update session state with completion information
    session.isComplete = completion.status === 'completed';
    session.completionReason = completion.reason as any;
    
    // This would integrate with the existing SessionManager
    // to persist the updated session state
    
    this.componentLogger.debug('Session updated with completion analysis', {
      sessionId: session.id,
      completionStatus: completion.status,
      nextActionsCount: nextActions.length,
    });
  }

  /**
   * Get session state (would integrate with existing SessionManager)
   */
  private async getSessionState(sessionId: string): Promise<GansAuditorCodexSessionState | undefined> {
    // This would integrate with the existing SessionManager
    // For now, return undefined to indicate no session found
    return undefined;
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: PromptDrivenAuditConfig): Required<PromptDrivenAuditConfig> {
    return {
      enableSystemPrompt: config.enableSystemPrompt ?? true,
      promptManagerConfig: {
        enableCaching: true,
        cacheMaxAge: 300000,
        ...config.promptManagerConfig,
      },
      integrationConfig: {
        enhanceCodexRequests: true,
        processResponses: true,
        manageCompletion: true,
        trackProgress: true,
        ...config.integrationConfig,
      },
    };
  }

  /**
   * Generate configuration hash for tracking
   */
  private generateConfigHash(): string {
    const configStr = JSON.stringify(this.config, Object.keys(this.config).sort());
    let hash = 0;
    for (let i = 0; i < configStr.length; i++) {
      const char = configStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get list of enabled features
   */
  private getEnabledFeatures(): string[] {
    const features: string[] = [];
    
    if (this.config.enableSystemPrompt) {
      features.push('system-prompt');
    }
    
    if (this.config.integrationConfig.enhanceCodexRequests) {
      features.push('enhanced-requests');
    }
    
    if (this.config.integrationConfig.processResponses) {
      features.push('response-processing');
    }
    
    if (this.config.integrationConfig.manageCompletion) {
      features.push('completion-management');
    }
    
    if (this.config.integrationConfig.trackProgress) {
      features.push('progress-tracking');
    }
    
    return features;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.systemPromptManager.clearCache();
    
    if (this.baseAuditor && typeof (this.baseAuditor as any).destroy === 'function') {
      (this.baseAuditor as any).destroy();
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create prompt-driven GAN auditor with existing auditor
 */
export function createPromptDrivenGanAuditor(
  baseAuditor: IGanAuditor,
  config: PromptDrivenAuditConfig = { enableSystemPrompt: true }
): PromptDrivenGanAuditor {
  return new PromptDrivenGanAuditor(baseAuditor, config);
}

/**
 * Create prompt-driven GAN auditor from environment configuration
 */
export function createPromptDrivenGanAuditorFromEnv(
  baseAuditor: IGanAuditor
): PromptDrivenGanAuditor {
  const config: PromptDrivenAuditConfig = {
    enableSystemPrompt: process.env.GAN_AUDITOR_ENABLE_SYSTEM_PROMPT !== 'false',
    promptManagerConfig: {
      enableCaching: process.env.GAN_AUDITOR_ENABLE_PROMPT_CACHING !== 'false',
      cacheMaxAge: parseInt(process.env.GAN_AUDITOR_PROMPT_CACHE_MAX_AGE || '300000', 10),
    },
    integrationConfig: {
      enhanceCodexRequests: process.env.GAN_AUDITOR_ENHANCE_CODEX_REQUESTS !== 'false',
      processResponses: process.env.GAN_AUDITOR_PROCESS_RESPONSES !== 'false',
      manageCompletion: process.env.GAN_AUDITOR_MANAGE_COMPLETION !== 'false',
      trackProgress: process.env.GAN_AUDITOR_TRACK_PROGRESS !== 'false',
    },
  };
  
  return new PromptDrivenGanAuditor(baseAuditor, config);
}