/**
 * System Prompt Integration for GansAuditor_Codex
 *
 * This module integrates the system prompt manager with the existing
 * GansAuditor_Codex architecture, providing seamless prompt-driven auditing.
 */
import type { IGanAuditor } from '../types/integration-types.js';
import type { GansAuditorCodexThoughtData, GansAuditorCodexReview, AuditRequest } from '../types/gan-types.js';
import { SystemPromptManager, type CompletionAnalysis, type NextAction } from './system-prompt-manager.js';
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
export declare class PromptDrivenGanAuditor implements IGanAuditor {
    private readonly baseAuditor;
    private readonly systemPromptManager;
    private readonly config;
    private readonly componentLogger;
    constructor(baseAuditor: IGanAuditor, config?: PromptDrivenAuditConfig);
    /**
     * Audit thought with system prompt enhancement
     */
    auditThought(thought: GansAuditorCodexThoughtData, sessionId?: string): Promise<GansAuditorCodexReview>;
    /**
     * Extract inline configuration (delegate to base auditor)
     */
    extractInlineConfig(thought: string): any;
    /**
     * Validate configuration (delegate to base auditor)
     */
    validateConfig(config: any): any;
    /**
     * Get system prompt manager for configuration
     */
    getSystemPromptManager(): SystemPromptManager;
    /**
     * Update prompt configuration
     */
    updatePromptConfig(config: Partial<PromptDrivenAuditConfig>): void;
    /**
     * Get prompt statistics and performance metrics
     */
    getPromptStats(): {
        cacheStats: any;
        configHash: string;
        enabledFeatures: string[];
    };
    /**
     * Render system prompt with full context
     */
    private renderSystemPromptWithContext;
    /**
     * Create fallback prompt for error scenarios
     */
    private createFallbackPrompt;
    /**
     * Execute audit with enhanced prompt context
     */
    private executePromptEnhancedAudit;
    /**
     * Process audit response with completion analysis
     */
    private processAuditResponse;
    /**
     * Gather project context for prompt rendering
     */
    private gatherProjectContext;
    /**
     * Create enhanced audit request with system prompt
     */
    private createEnhancedAuditRequest;
    /**
     * Update session with completion analysis
     */
    private updateSessionWithCompletion;
    /**
     * Get session state (would integrate with existing SessionManager)
     */
    private getSessionState;
    /**
     * Merge configuration with defaults
     */
    private mergeConfig;
    /**
     * Generate configuration hash for tracking
     */
    private generateConfigHash;
    /**
     * Get list of enabled features
     */
    private getEnabledFeatures;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
/**
 * Create prompt-driven GAN auditor with existing auditor
 */
export declare function createPromptDrivenGanAuditor(baseAuditor: IGanAuditor, config?: PromptDrivenAuditConfig): PromptDrivenGanAuditor;
/**
 * Create prompt-driven GAN auditor from environment configuration
 */
export declare function createPromptDrivenGanAuditorFromEnv(baseAuditor: IGanAuditor): PromptDrivenGanAuditor;
//# sourceMappingURL=prompt-integration.d.ts.map