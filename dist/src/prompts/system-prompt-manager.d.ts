/**
 * System Prompt Manager for GansAuditor_Codex
 *
 * This module manages the system prompt integration with the existing
 * GansAuditor_Codex architecture, providing prompt rendering, context
 * injection, and response processing.
 */
import type { SystemPromptConfig, QualityDimension, CompletionTier, KillSwitch } from './system-prompt-config.js';
import type { GansAuditorCodexThoughtData, GansAuditorCodexSessionState, GansAuditorCodexReview } from '../types/gan-types.js';
/**
 * System prompt template variables
 */
export interface PromptVariables {
    PROMPT_VERSION: string;
    MODEL_CONTEXT_TOKENS: number;
    AUDIT_TIMEOUT_MS: number;
    STAGNATION_THRESHOLD: number;
    MAX_ITERATIONS: number;
    CURRENT_LOOP: number;
    SESSION_ID?: string;
    IDENTITY_NAME: string;
    IDENTITY_ROLE: string;
    IDENTITY_STANCE: string;
    IDENTITY_AUTHORITY: string;
    QUALITY_FRAMEWORK_AGGREGATION: string;
    QUALITY_DIMENSIONS: QualityDimension[];
    COMPLETION_TIERS: CompletionTier[];
    KILL_SWITCHES: KillSwitch[];
    PROJECT_CONTEXT?: string;
    STEERING_RULES?: string;
    SPEC_REQUIREMENTS?: string;
    QUALITY_DIMENSIONS_RENDERED?: string;
    COMPLETION_TIERS_RENDERED?: string;
    KILL_SWITCHES_RENDERED?: string;
}
/**
 * Rendered system prompt with context
 */
export interface RenderedSystemPrompt {
    content: string;
    variables: PromptVariables;
    metadata: {
        version: string;
        renderedAt: number;
        configHash: string;
    };
}
/**
 * System prompt manager configuration
 */
export interface SystemPromptManagerConfig {
    promptTemplatePath?: string;
    config?: Partial<SystemPromptConfig>;
    enableCaching?: boolean;
    cacheMaxAge?: number;
}
/**
 * System Prompt Manager
 *
 * Manages system prompt rendering, caching, and integration with
 * the GansAuditor_Codex architecture.
 */
export declare class SystemPromptManager {
    private readonly config;
    private readonly componentLogger;
    private readonly promptTemplatePath;
    private readonly enableCaching;
    private readonly cacheMaxAge;
    private promptCache;
    constructor(config?: SystemPromptManagerConfig);
    /**
     * Render system prompt with context
     */
    renderSystemPrompt(thought: GansAuditorCodexThoughtData, session?: GansAuditorCodexSessionState, projectContext?: {
        steering?: string;
        spec?: string;
        repository?: string;
    }): Promise<RenderedSystemPrompt>;
    /**
     * Process audit response with system prompt context
     */
    processAuditResponse(response: GansAuditorCodexReview, promptContext: RenderedSystemPrompt, session?: GansAuditorCodexSessionState): {
        enhancedResponse: GansAuditorCodexReview;
        completionAnalysis: CompletionAnalysis;
        nextActions: NextAction[];
    };
    /**
     * Get current configuration
     */
    getConfig(): SystemPromptConfig;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<SystemPromptConfig>): void;
    /**
     * Clear prompt cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
        oldestEntry: number;
        newestEntry: number;
    };
    /**
     * Load system prompt template from file
     */
    private loadPromptTemplate;
    /**
     * Validate template file structure and required sections
     */
    private validateTemplateStructure;
    /**
     * Prepare variables for template rendering
     */
    private preparePromptVariables;
    /**
     * Render template with variables
     */
    private renderTemplate;
    /**
     * Format variable value for template substitution
     */
    private formatVariableValue;
    /**
     * Validate rendered template structure
     */
    private validateRenderedTemplate;
    /**
     * Generate cache key for prompt caching
     */
    private generateCacheKey;
    /**
     * Generate configuration hash for cache invalidation
     */
    private generateConfigHash;
    /**
     * Simple object hashing for cache keys
     */
    private hashObject;
    /**
     * Analyze completion status based on prompt criteria
     */
    private analyzeCompletion;
    /**
     * Evaluate kill switch condition
     */
    private evaluateKillSwitchCondition;
    /**
     * Detect stagnation in session iterations
     */
    private detectStagnation;
    /**
     * Generate next actions based on response and completion analysis
     */
    private generateNextActions;
    /**
     * Enhance response with prompt context
     */
    private enhanceResponse;
    /**
     * Render quality dimensions section
     */
    private renderQualityDimensions;
    /**
     * Render completion tiers section
     */
    private renderCompletionTiers;
    /**
     * Render kill switches section
     */
    private renderKillSwitches;
}
/**
 * Completion analysis result
 */
export interface CompletionAnalysis {
    status: 'completed' | 'terminated' | 'in_progress';
    reason: string;
    nextThoughtNeeded: boolean;
    tier?: CompletionTier;
    killSwitch?: KillSwitch;
}
/**
 * Next action recommendation
 */
export interface NextAction {
    type: 'complete' | 'escalate' | 'fix_critical' | 'improve' | 'continue';
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    commands: string[];
}
/**
 * Create system prompt manager with default configuration
 */
export declare function createSystemPromptManager(config?: SystemPromptManagerConfig): SystemPromptManager;
/**
 * Create system prompt manager from environment variables
 */
export declare function createSystemPromptManagerFromEnv(): SystemPromptManager;
//# sourceMappingURL=system-prompt-manager.d.ts.map