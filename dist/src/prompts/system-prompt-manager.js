/**
 * System Prompt Manager for GansAuditor_Codex
 *
 * This module manages the system prompt integration with the existing
 * GansAuditor_Codex architecture, providing prompt rendering, context
 * injection, and response processing.
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_QUALITY_DIMENSIONS, DEFAULT_COMPLETION_TIERS, DEFAULT_KILL_SWITCHES, mergeSystemPromptConfig, validateSystemPromptConfig, } from './system-prompt-config.js';
import { createComponentLogger } from '../utils/logger.js';
// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * System Prompt Manager
 *
 * Manages system prompt rendering, caching, and integration with
 * the GansAuditor_Codex architecture.
 */
export class SystemPromptManager {
    config;
    componentLogger;
    promptTemplatePath;
    enableCaching;
    cacheMaxAge;
    // Cache for rendered prompts
    promptCache = new Map();
    constructor(config = {}) {
        this.config = mergeSystemPromptConfig(config.config || {});
        this.promptTemplatePath = config.promptTemplatePath ||
            join(__dirname, 'gan-auditor-system-prompt.md');
        this.enableCaching = config.enableCaching ?? true;
        this.cacheMaxAge = config.cacheMaxAge ?? 300000; // 5 minutes
        this.componentLogger = createComponentLogger('system-prompt-manager', {
            enabled: true,
            level: 'info',
        });
        // Validate configuration
        const validation = validateSystemPromptConfig(this.config);
        if (!validation.isValid) {
            throw new Error(`Invalid system prompt configuration: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
            this.componentLogger.warn('System prompt configuration warnings', {
                warnings: validation.warnings,
            });
        }
        if (validation.recommendations.length > 0) {
            this.componentLogger.info('System prompt configuration recommendations', {
                recommendations: validation.recommendations,
            });
        }
        this.componentLogger.info('System Prompt Manager initialized', {
            identity: this.config.identity.name,
            stance: this.config.identity.stance,
            dimensions: this.config.qualityFramework.dimensions,
            maxIterations: this.config.completionCriteria.maxIterations,
        });
    }
    /**
     * Render system prompt with context
     */
    async renderSystemPrompt(thought, session, projectContext) {
        const cacheKey = this.generateCacheKey(thought, session, projectContext);
        // Check cache first
        if (this.enableCaching) {
            const cached = this.promptCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheMaxAge) {
                this.componentLogger.debug('System prompt served from cache', { cacheKey });
                return cached.prompt;
            }
        }
        // Load template
        const template = await this.loadPromptTemplate();
        // Prepare variables
        const variables = this.preparePromptVariables(thought, session, projectContext);
        // Render template
        const content = this.renderTemplate(template, variables);
        // Create rendered prompt
        const renderedPrompt = {
            content,
            variables,
            metadata: {
                version: '2.0',
                renderedAt: Date.now(),
                configHash: this.generateConfigHash(),
            },
        };
        // Cache result
        if (this.enableCaching) {
            this.promptCache.set(cacheKey, {
                prompt: renderedPrompt,
                timestamp: Date.now(),
            });
        }
        this.componentLogger.debug('System prompt rendered', {
            thoughtNumber: thought.thoughtNumber,
            sessionId: session?.id,
            contentLength: content.length,
            variableCount: Object.keys(variables).length,
        });
        return renderedPrompt;
    }
    /**
     * Process audit response with system prompt context
     */
    processAuditResponse(response, promptContext, session) {
        // Analyze completion status
        const completionAnalysis = this.analyzeCompletion(response, session, promptContext.variables);
        // Generate next actions
        const nextActions = this.generateNextActions(response, completionAnalysis, session);
        // Enhance response with prompt context
        const enhancedResponse = this.enhanceResponse(response, completionAnalysis, promptContext);
        this.componentLogger.info('Audit response processed', {
            verdict: response.verdict,
            score: response.overall,
            completionStatus: completionAnalysis.status,
            nextActionsCount: nextActions.length,
        });
        return {
            enhancedResponse,
            completionAnalysis,
            nextActions,
        };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        const mergedConfig = mergeSystemPromptConfig(newConfig);
        const validation = validateSystemPromptConfig(mergedConfig);
        if (!validation.isValid) {
            throw new Error(`Invalid configuration update: ${validation.errors.join(', ')}`);
        }
        Object.assign(this.config, mergedConfig);
        // Clear cache on configuration change
        this.promptCache.clear();
        this.componentLogger.info('System prompt configuration updated', {
            changes: Object.keys(newConfig),
            warnings: validation.warnings,
        });
    }
    /**
     * Clear prompt cache
     */
    clearCache() {
        this.promptCache.clear();
        this.componentLogger.info('System prompt cache cleared');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const entries = Array.from(this.promptCache.values());
        const now = Date.now();
        return {
            size: this.promptCache.size,
            hitRate: 0, // TODO: Implement hit rate tracking
            oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : now,
            newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : now,
        };
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Load system prompt template from file
     */
    async loadPromptTemplate() {
        try {
            const template = await readFile(this.promptTemplatePath, 'utf-8');
            // Validate template structure
            this.validateTemplateStructure(template);
            return template;
        }
        catch (error) {
            this.componentLogger.error('Failed to load system prompt template', error, {
                path: this.promptTemplatePath,
            });
            throw new Error(`Failed to load system prompt template: ${error.message}`);
        }
    }
    /**
     * Validate template file structure and required sections
     */
    validateTemplateStructure(template) {
        const requiredSections = [
            '# GansAuditor_Codex System Prompt',
            '## Identity & Role Definition',
            '## Audit Workflow',
            '## Multi-Dimensional Quality Assessment',
            '## Intelligent Completion Criteria',
            '## Structured Output Format',
        ];
        const requiredVariables = [
            'IDENTITY_NAME',
            'IDENTITY_ROLE',
            'IDENTITY_STANCE',
            'MODEL_CONTEXT_TOKENS',
            'CURRENT_LOOP',
            'MAX_ITERATIONS',
        ];
        // Check for required sections
        const missingSections = requiredSections.filter(section => !template.includes(section));
        if (missingSections.length > 0) {
            throw new Error(`Template missing required sections: ${missingSections.join(', ')}`);
        }
        // Check for required variables
        const missingVariables = requiredVariables.filter(variable => !template.includes(`\${${variable}}`) && !template.includes(`\${${variable} |`));
        if (missingVariables.length > 0) {
            this.componentLogger.warn('Template missing recommended variables', {
                missingVariables,
            });
        }
        // Validate template syntax
        const variablePattern = /\${([^}]+)}/g;
        const variables = template.match(variablePattern);
        if (variables) {
            for (const variable of variables) {
                // Check for valid variable syntax
                if (!variable.match(/^\${[A-Z_][A-Z0-9_]*(\s*\|\s*default:\s*[^}]+)?}$/)) {
                    this.componentLogger.warn('Invalid variable syntax detected', {
                        variable,
                    });
                }
            }
        }
        this.componentLogger.debug('Template structure validation passed', {
            sectionsFound: requiredSections.length - missingSections.length,
            variablesFound: variables?.length || 0,
        });
    }
    /**
     * Prepare variables for template rendering
     */
    preparePromptVariables(thought, session, projectContext) {
        const baseVariables = {
            // Core configuration
            PROMPT_VERSION: '2.0',
            MODEL_CONTEXT_TOKENS: this.config.performance.contextTokenLimit,
            AUDIT_TIMEOUT_MS: this.config.performance.auditTimeoutMs,
            STAGNATION_THRESHOLD: this.config.completionCriteria.stagnationThreshold,
            MAX_ITERATIONS: this.config.completionCriteria.maxIterations,
            CURRENT_LOOP: session?.currentLoop || 0,
            SESSION_ID: session?.id,
            // Identity configuration
            IDENTITY_NAME: this.config.identity.name,
            IDENTITY_ROLE: this.config.identity.role,
            IDENTITY_STANCE: this.config.identity.stance,
            IDENTITY_AUTHORITY: this.config.identity.authority,
            // Quality framework
            QUALITY_FRAMEWORK_AGGREGATION: this.config.qualityFramework.aggregationMethod,
            QUALITY_DIMENSIONS: DEFAULT_QUALITY_DIMENSIONS,
            COMPLETION_TIERS: DEFAULT_COMPLETION_TIERS,
            KILL_SWITCHES: DEFAULT_KILL_SWITCHES,
            // Context
            PROJECT_CONTEXT: projectContext?.repository || 'Repository context not available',
            STEERING_RULES: projectContext?.steering || 'No steering rules loaded',
            SPEC_REQUIREMENTS: projectContext?.spec || 'No specification loaded',
        };
        // Add rendered sections
        return {
            ...baseVariables,
            QUALITY_DIMENSIONS_RENDERED: this.renderQualityDimensions(baseVariables.QUALITY_DIMENSIONS),
            COMPLETION_TIERS_RENDERED: this.renderCompletionTiers(baseVariables.COMPLETION_TIERS),
            KILL_SWITCHES_RENDERED: this.renderKillSwitches(baseVariables.KILL_SWITCHES),
        };
    }
    /**
     * Render template with variables
     */
    renderTemplate(template, variables) {
        let rendered = template;
        // Replace variable placeholders with enhanced substitution
        for (const [key, value] of Object.entries(variables)) {
            // Handle default values with pipe syntax: ${VAR | default: value}
            const defaultRegex = new RegExp(`\\\${${key}\\s*\\|\\s*default:\\s*([^}]+)}`, 'g');
            rendered = rendered.replace(defaultRegex, (match, defaultValue) => {
                if (value !== undefined && value !== null && value !== '') {
                    return this.formatVariableValue(value);
                }
                return defaultValue.trim();
            });
            // Simple replacement for variables without defaults
            const simpleRegex = new RegExp(`\\\${${key}}`, 'g');
            rendered = rendered.replace(simpleRegex, () => {
                return this.formatVariableValue(value);
            });
        }
        // Validate template structure after rendering
        this.validateRenderedTemplate(rendered);
        return rendered;
    }
    /**
     * Format variable value for template substitution
     */
    formatVariableValue(value) {
        if (value === undefined || value === null) {
            return '';
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        if (Array.isArray(value)) {
            return value.map(item => String(item)).join(', ');
        }
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    }
    /**
     * Validate rendered template structure
     */
    validateRenderedTemplate(rendered) {
        const requiredSections = [
            '## Identity & Role Definition',
            '## Audit Workflow',
            '## Multi-Dimensional Quality Assessment',
            '## Intelligent Completion Criteria',
            '## Structured Output Format',
        ];
        const missingSections = requiredSections.filter(section => !rendered.includes(section));
        if (missingSections.length > 0) {
            this.componentLogger.warn('Template missing required sections', {
                missingSections,
            });
        }
        // Check for unresolved variables
        const unresolvedVariables = rendered.match(/\${[^}]+}/g);
        if (unresolvedVariables && unresolvedVariables.length > 0) {
            this.componentLogger.warn('Template contains unresolved variables', {
                unresolvedVariables,
            });
        }
        // Validate template length
        if (rendered.length < 1000) {
            this.componentLogger.warn('Rendered template seems too short', {
                length: rendered.length,
            });
        }
        if (rendered.length > 50000) {
            this.componentLogger.warn('Rendered template is very long', {
                length: rendered.length,
            });
        }
    }
    /**
     * Generate cache key for prompt caching
     */
    generateCacheKey(thought, session, projectContext) {
        const keyParts = [
            `thought-${thought.thoughtNumber}`,
            `session-${session?.id || 'none'}`,
            `loop-${session?.currentLoop || 0}`,
            `config-${this.generateConfigHash()}`,
        ];
        if (projectContext) {
            keyParts.push(`context-${this.hashObject(projectContext)}`);
        }
        return keyParts.join('|');
    }
    /**
     * Generate configuration hash for cache invalidation
     */
    generateConfigHash() {
        return this.hashObject(this.config);
    }
    /**
     * Simple object hashing for cache keys
     */
    hashObject(obj) {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Analyze completion status based on prompt criteria
     */
    analyzeCompletion(response, session, variables) {
        const currentLoop = session?.currentLoop || 0;
        const score = response.overall;
        // Check completion tiers
        for (const tier of DEFAULT_COMPLETION_TIERS) {
            if (score >= tier.scoreThreshold && currentLoop >= tier.iterationThreshold) {
                return {
                    status: 'completed',
                    reason: tier.name,
                    tier: tier,
                    nextThoughtNeeded: false,
                };
            }
        }
        // Check kill switches
        for (const killSwitch of DEFAULT_KILL_SWITCHES) {
            if (this.evaluateKillSwitchCondition(killSwitch, response, session)) {
                return {
                    status: 'terminated',
                    reason: killSwitch.name,
                    killSwitch: killSwitch,
                    nextThoughtNeeded: false,
                };
            }
        }
        // Continue iteration
        return {
            status: 'in_progress',
            reason: 'Quality threshold not met',
            nextThoughtNeeded: true,
        };
    }
    /**
     * Evaluate kill switch condition
     */
    evaluateKillSwitchCondition(killSwitch, response, session) {
        const currentLoop = session?.currentLoop || 0;
        const criticalIssues = response.review.inline.filter(issue => issue.comment.toLowerCase().includes('critical'));
        switch (killSwitch.name) {
            case 'Hard Stop':
                return currentLoop >= this.config.completionCriteria.maxIterations;
            case 'Stagnation Detection':
                return currentLoop >= 10 && this.detectStagnation(session);
            case 'Critical Issues Persist':
                return criticalIssues.length > 0 && currentLoop >= 15;
            default:
                return false;
        }
    }
    /**
     * Detect stagnation in session iterations
     */
    detectStagnation(session) {
        if (!session || session.iterations.length < 3) {
            return false;
        }
        const recentIterations = session.iterations.slice(-3);
        const scores = recentIterations.map(iter => iter.auditResult.overall);
        // Check if scores are not improving
        const improvement = scores[scores.length - 1] - scores[0];
        return improvement < 2; // Less than 2 point improvement over 3 iterations
    }
    /**
     * Generate next actions based on response and completion analysis
     */
    generateNextActions(response, completion, session) {
        const actions = [];
        if (completion.status === 'completed') {
            actions.push({
                type: 'complete',
                priority: 'high',
                description: 'Mark task as complete - quality standards met',
                commands: [],
            });
        }
        else if (completion.status === 'terminated') {
            actions.push({
                type: 'escalate',
                priority: 'critical',
                description: `Escalate for manual review - ${completion.reason}`,
                commands: [],
            });
        }
        else {
            // Generate improvement actions from response
            const criticalIssues = response.review.inline.filter(issue => issue.comment.toLowerCase().includes('critical'));
            if (criticalIssues.length > 0) {
                actions.push({
                    type: 'fix_critical',
                    priority: 'critical',
                    description: `Address ${criticalIssues.length} critical issues`,
                    commands: criticalIssues.map(issue => `Fix: ${issue.comment}`),
                });
            }
            // Add other improvement actions based on dimensional scores
            const lowScoreDimensions = response.dimensions.filter(d => d.score < 70);
            for (const dimension of lowScoreDimensions) {
                actions.push({
                    type: 'improve',
                    priority: 'medium',
                    description: `Improve ${dimension.name} (score: ${dimension.score})`,
                    commands: [],
                });
            }
        }
        return actions;
    }
    /**
     * Enhance response with prompt context
     */
    enhanceResponse(response, completion, promptContext) {
        // Add completion analysis to judge cards
        const enhancedJudgeCards = [
            ...response.judge_cards,
            {
                model: 'system-prompt-manager',
                score: response.overall,
                notes: `Completion Status: ${completion.status} - ${completion.reason}`,
            },
        ];
        // Enhance review summary with completion context
        const enhancedSummary = completion.status === 'completed'
            ? `${response.review.summary}\n\n✅ COMPLETION: ${completion.reason}`
            : completion.status === 'terminated'
                ? `${response.review.summary}\n\n⚠️ TERMINATED: ${completion.reason}`
                : response.review.summary;
        return {
            ...response,
            judge_cards: enhancedJudgeCards,
            review: {
                ...response.review,
                summary: enhancedSummary,
            },
        };
    }
    /**
     * Render quality dimensions section
     */
    renderQualityDimensions(dimensions) {
        return dimensions.map(dim => {
            const percentage = Math.round(dim.weight * 100);
            const criteria = dim.criteria.map(c => `- ${c}`).join('\n');
            return `### ${dim.name} (${percentage}%)\n${criteria}`;
        }).join('\n\n');
    }
    /**
     * Render completion tiers section
     */
    renderCompletionTiers(tiers) {
        return tiers.map(tier => {
            return `- **${tier.name}**: Score ≥ ${tier.scoreThreshold}% at ${tier.iterationThreshold}+ loops → "${tier.verdict}" (${tier.message})`;
        }).join('\n');
    }
    /**
     * Render kill switches section
     */
    renderKillSwitches(killSwitches) {
        return killSwitches.map(ks => {
            return `- **${ks.name}**: ${ks.condition} → ${ks.action} (${ks.message})`;
        }).join('\n');
    }
}
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create system prompt manager with default configuration
 */
export function createSystemPromptManager(config = {}) {
    return new SystemPromptManager(config);
}
/**
 * Create system prompt manager from environment variables
 */
export function createSystemPromptManagerFromEnv() {
    const envConfig = {
        // Load from environment variables
        enableCaching: process.env.GAN_AUDITOR_ENABLE_PROMPT_CACHING !== 'false',
        cacheMaxAge: parseInt(process.env.GAN_AUDITOR_PROMPT_CACHE_MAX_AGE || '300000', 10),
    };
    return new SystemPromptManager(envConfig);
}
//# sourceMappingURL=system-prompt-manager.js.map