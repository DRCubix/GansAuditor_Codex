/**
 * System Prompt Integration for GansAuditor_Codex
 *
 * This module integrates the system prompt manager with the existing
 * GansAuditor_Codex architecture, providing seamless prompt-driven auditing.
 */
import { SystemPromptManager } from './system-prompt-manager.js';
import { createComponentLogger } from '../utils/logger.js';
/**
 * Prompt-driven GAN Auditor
 *
 * Wraps the existing GAN Auditor with system prompt capabilities,
 * providing enhanced audit requests and intelligent completion management.
 */
export class PromptDrivenGanAuditor {
    baseAuditor;
    systemPromptManager;
    config;
    componentLogger;
    constructor(baseAuditor, config = { enableSystemPrompt: true }) {
        this.baseAuditor = baseAuditor;
        this.config = this.mergeConfig(config);
        this.systemPromptManager = new SystemPromptManager(this.config.promptManagerConfig);
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
    async auditThought(thought, sessionId) {
        if (!this.config.enableSystemPrompt) {
            throw new Error('System prompt is disabled - cannot perform audit without system prompt');
        }
        try {
            this.componentLogger.info(`Starting prompt-driven audit for thought ${thought.thoughtNumber}`, {
                sessionId,
                enableSystemPrompt: this.config.enableSystemPrompt,
            });
            // Get session state for context
            const session = sessionId ? await this.getSessionState(sessionId) : undefined;
            // Render system prompt with context - fail fast on errors
            const renderedPrompt = await this.renderSystemPromptWithContext(thought, session);
            // Execute audit with enhanced context
            const auditResult = await this.executePromptEnhancedAudit(thought, session, renderedPrompt.result);
            // Process response with completion analysis
            const processedResult = await this.processAuditResponse(auditResult, renderedPrompt.result, session);
            // Update session with completion analysis
            if (session && this.config.integrationConfig.trackProgress) {
                await this.updateSessionWithCompletion(session, processedResult.completionAnalysis, processedResult.nextActions);
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
        }
        catch (error) {
            this.componentLogger.error('Prompt-driven audit failed, falling back to base auditor', error, { thoughtNumber: thought.thoughtNumber, sessionId });
            // Re-throw the error - no fallback available
            throw error;
        }
    }
    /**
     * Extract inline configuration (delegate to base auditor)
     */
    extractInlineConfig(thought) {
        return this.baseAuditor.extractInlineConfig(thought);
    }
    /**
     * Validate configuration (delegate to base auditor)
     */
    validateConfig(config) {
        if (this.baseAuditor && typeof this.baseAuditor.validateConfig === 'function') {
            return this.baseAuditor.validateConfig(config);
        }
        // Fallback validation
        return config;
    }
    /**
     * Get system prompt manager for configuration
     */
    getSystemPromptManager() {
        return this.systemPromptManager;
    }
    /**
     * Update prompt configuration
     */
    updatePromptConfig(config) {
        Object.assign(this.config, config);
        if (config.promptManagerConfig) {
            this.systemPromptManager.updateConfig(config.promptManagerConfig);
        }
        this.componentLogger.info('Prompt configuration updated', {
            changes: Object.keys(config),
        });
    }
    /**
     * Get prompt statistics and performance metrics
     */
    getPromptStats() {
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
    async renderSystemPromptWithContext(thought, session) {
        // Gather project context
        const projectContext = await this.gatherProjectContext(session);
        // Render system prompt
        return await this.systemPromptManager.renderSystemPrompt(thought, session, projectContext);
    }
    // createFallbackPrompt method removed - production code must fail fast on errors
    /**
     * Execute audit with enhanced prompt context
     */
    async executePromptEnhancedAudit(thought, session, renderedPrompt) {
        if (this.config.integrationConfig.enhanceCodexRequests) {
            // Create enhanced audit request with system prompt
            const enhancedRequest = await this.createEnhancedAuditRequest(thought, session, renderedPrompt);
            // Execute with enhanced context (this would require extending the base auditor)
            // For now, we'll use the base auditor and inject context through session
            return await this.baseAuditor.auditThought(thought, session?.id);
        }
        else {
            // Use base auditor without enhancement
            return await this.baseAuditor.auditThought(thought, session?.id);
        }
    }
    /**
     * Process audit response with completion analysis
     */
    async processAuditResponse(auditResult, renderedPrompt, session) {
        if (this.config.integrationConfig.processResponses) {
            const processed = this.systemPromptManager.processAuditResponse(auditResult, renderedPrompt, session);
            return {
                review: processed.enhancedResponse,
                completionAnalysis: processed.completionAnalysis,
                nextActions: processed.nextActions,
                promptMetadata: renderedPrompt.metadata,
            };
        }
        else {
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
    async gatherProjectContext(session) {
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
    async createEnhancedAuditRequest(thought, session, renderedPrompt) {
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
    async updateSessionWithCompletion(session, completion, nextActions) {
        // Update session state with completion information
        session.isComplete = completion.status === 'completed';
        session.completionReason = completion.reason;
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
    async getSessionState(sessionId) {
        // This would integrate with the existing SessionManager
        // For now, return undefined to indicate no session found
        return undefined;
    }
    /**
     * Merge configuration with defaults
     */
    mergeConfig(config) {
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
    generateConfigHash() {
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
    getEnabledFeatures() {
        const features = [];
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
    destroy() {
        this.systemPromptManager.clearCache();
        if (this.baseAuditor && typeof this.baseAuditor.destroy === 'function') {
            this.baseAuditor.destroy();
        }
    }
}
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create prompt-driven GAN auditor with existing auditor
 */
export function createPromptDrivenGanAuditor(baseAuditor, config = { enableSystemPrompt: true }) {
    return new PromptDrivenGanAuditor(baseAuditor, config);
}
/**
 * Create prompt-driven GAN auditor from environment configuration
 */
export function createPromptDrivenGanAuditorFromEnv(baseAuditor) {
    const config = {
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
//# sourceMappingURL=prompt-integration.js.map