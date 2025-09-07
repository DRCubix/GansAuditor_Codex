/**
 * GAN Auditor Orchestration Layer
 *
 * This module implements the main GanAuditor class that coordinates session management,
 * context building, and judging to provide comprehensive code audit functionality.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4 - GAN auditor orchestration
 */
import type { IGanAuditor, ISessionManager, IContextPacker, ICodexJudge } from '../types/integration-types.js';
import type { ThoughtData, GanReview, SessionConfig } from '../types/gan-types.js';
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
export declare const DEFAULT_GAN_AUDITOR_CONFIG: Required<GanAuditorConfig>;
/**
 * Main GAN Auditor orchestration class
 *
 * Requirement 1.1: Coordinate session management, context building, and judging
 * Requirement 1.2: Implement audit workflow logic
 * Requirement 1.3: Process audit results and determine verdicts
 * Requirement 1.4: Integrate inline config parsing with session configuration
 */
export declare class GanAuditor implements IGanAuditor {
    private readonly sessionManager;
    private readonly contextPacker;
    private readonly codexJudge;
    private readonly config;
    private readonly componentLogger;
    constructor(config?: GanAuditorConfig, sessionManager?: ISessionManager, contextPacker?: IContextPacker, codexJudge?: ICodexJudge);
    /**
     * Audit a thought and return review results
     * Requirement 1.2: Implement audit workflow logic (load session → build context → execute audit → persist results)
     */
    auditThought(thought: ThoughtData, sessionId?: string): Promise<GanReview>;
    /**
     * Extract inline configuration from thought text
     * Requirement 1.4: Integration between inline config parsing and session configuration
     */
    extractInlineConfig(thought: string): Partial<SessionConfig> | null;
    /**
     * Validate audit configuration
     */
    validateConfig(config: Partial<SessionConfig>): SessionConfig;
    /**
     * Load existing session or create new one
     */
    private loadOrCreateSession;
    /**
     * Merge inline configuration with session configuration
     */
    private mergeInlineConfig;
    /**
     * Merge inline configuration with comprehensive error handling
     */
    private mergeInlineConfigWithErrorHandling;
    /**
     * Build repository context based on session configuration
     */
    private buildContext;
    /**
     * Create audit request from thought data and context
     */
    private createAuditRequest;
    /**
     * Execute audit using Codex judge - NO FALLBACKS
     * Requirements: 4.1, 4.5 - Remove graceful degradation and mock responses
     */
    private executeAudit;
    /**
     * Persist audit results to session
     */
    private persistAuditResults;
    /**
     * REMOVED: createFallbackReview method
     *
     * This method has been removed as part of the production fix to eliminate
     * all fallback response generation. In production, errors must be handled
     * explicitly without generating mock or fallback audit results.
     *
     * Requirements: 4.1, 5.1, 5.3, 5.5 - Remove all fallback response generation
     */
    /**
     * Merge configuration with defaults
     */
    private mergeConfig;
    /**
     * Logging utility (deprecated - use componentLogger instead)
     * @deprecated Use this.componentLogger instead
     */
    private log;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
/**
 * Create a new GAN Auditor instance with default configuration
 */
export declare function createGanAuditor(config?: GanAuditorConfig): IGanAuditor;
/**
 * Create a GAN Auditor instance with custom components
 */
export declare function createGanAuditorWithComponents(config: GanAuditorConfig, sessionManager: ISessionManager, contextPacker: IContextPacker, codexJudge: ICodexJudge): IGanAuditor;
//# sourceMappingURL=gan-auditor.d.ts.map