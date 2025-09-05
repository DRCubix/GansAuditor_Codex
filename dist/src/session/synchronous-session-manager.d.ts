/**
 * Synchronous Session Manager for GAN Auditor Integration
 *
 * Extends the base SessionManager with synchronous audit workflow capabilities
 * including iteration tracking, progress analysis, stagnation detection, and
 * Codex context window management.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4 (Synchronous Audit Workflow)
 */
import type { GansAuditorCodexSessionState, IterationData, ProgressAnalysis, StagnationResult, TerminationReason } from '../types/gan-types.js';
import type { IGansAuditorCodexSessionManager } from '../types/integration-types.js';
import { SessionManager, SessionManagerConfig } from './session-manager.js';
/**
 * Configuration for SynchronousSessionManager
 */
export interface SynchronousSessionManagerConfig extends SessionManagerConfig {
    stagnationThreshold: number;
    stagnationStartLoop: number;
    codexExecutable: string;
    codexTimeout: number;
}
/**
 * Default configuration for SynchronousSessionManager
 */
export declare const DEFAULT_SYNCHRONOUS_SESSION_MANAGER_CONFIG: SynchronousSessionManagerConfig;
/**
 * Enhanced SessionManager with synchronous audit workflow support
 *
 * Requirement 4.1: Session continuity across calls
 * Requirement 4.2: Iteration history and progress tracking
 * Requirement 4.3: LOOP_ID support for context continuity
 * Requirement 4.4: Codex context window management
 */
export declare class SynchronousSessionManager extends SessionManager implements IGansAuditorCodexSessionManager {
    private readonly syncConfig;
    private readonly syncComponentLogger;
    private readonly activeContexts;
    constructor(config?: Partial<SynchronousSessionManagerConfig>);
    /**
     * Get or create session with LOOP_ID support
     * Requirement 4.3: LOOP_ID support for context continuity
     */
    getOrCreateSession(sessionId: string, loopId?: string): Promise<GansAuditorCodexSessionState>;
    /**
     * Create new session with enhanced schema for synchronous workflow
     */
    private createEnhancedSession;
    /**
     * Analyze progress across iterations
     * Requirement 4.2: Progress tracking and analysis
     */
    analyzeProgress(sessionId: string): Promise<ProgressAnalysis>;
    /**
     * Detect stagnation in session responses
     * Requirement 4.2: Stagnation detection and prevention
     */
    detectStagnation(sessionId: string): Promise<StagnationResult>;
    /**
     * Calculate similarity between code strings
     */
    private calculateSimilarity;
    /**
     * Calculate string similarity using simple character-based approach
     */
    private stringSimilarity;
    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance;
    /**
     * Start Codex context window
     * Requirement 4.4: Codex context window management
     */
    startCodexContext(loopId: string): Promise<string>;
    /**
     * Maintain Codex context window
     * Requirement 4.4: Context window maintenance
     */
    maintainCodexContext(loopId: string, contextId: string): Promise<void>;
    /**
     * Terminate Codex context window
     * Requirement 4.4: Context window cleanup
     */
    terminateCodexContext(loopId: string, reason: TerminationReason): Promise<void>;
    /**
     * Add iteration data to session
     * Requirement 4.2: Iteration tracking
     */
    addIteration(sessionId: string, iteration: IterationData): Promise<void>;
    /**
     * Override updateSession to handle enhanced schema
     */
    updateSession(session: GansAuditorCodexSessionState): Promise<void>;
    /**
     * Override getSession to handle legacy session migration
     */
    getSession(id: string): Promise<GansAuditorCodexSessionState | null>;
    /**
     * Check if a session needs migration to enhanced schema
     */
    private needsMigration;
    /**
     * Migrate legacy session to enhanced schema
     */
    private migrateLegacySession;
    /**
     * Validate session integrity and detect corruption
     */
    validateSessionIntegrity(sessionId: string): Promise<{
        isValid: boolean;
        corruptionType?: string;
        issues: string[];
        recoverable: boolean;
    }>;
    /**
     * Attempt to recover a corrupted session (Requirement 7.3)
     */
    recoverCorruptedSession(sessionId: string, corruptionType: string): Promise<GansAuditorCodexSessionState | null>;
    /**
     * Recover session with missing fields
     */
    private recoverMissingFields;
    /**
     * Recover session with format mismatches
     */
    private recoverFormatMismatch;
    /**
     * Recover session with partial data corruption
     */
    private recoverPartialData;
    /**
     * Recover session with data inconsistencies
     */
    private recoverDataInconsistency;
    /**
     * Get active Codex contexts
     * Requirement 4.4: Context window monitoring
     */
    getActiveContexts(): Map<string, string>;
    /**
     * Check if a Codex context is active for a given loopId
     * Requirement 4.4: Context window status checking
     */
    isContextActive(loopId: string): boolean;
    /**
     * Get context ID for a given loopId
     * Requirement 4.4: Context window identification
     */
    getContextId(loopId: string): string | undefined;
    /**
     * Terminate all active Codex contexts
     * Requirement 4.4: Bulk context cleanup
     */
    terminateAllContexts(reason?: TerminationReason): Promise<void>;
    /**
     * Cleanup stale contexts (contexts that may have been orphaned)
     * Requirement 4.4: Context window resource management
     */
    cleanupStaleContexts(): Promise<void>;
    /**
     * Handle session timeout with context cleanup
     * Requirement 4.4: Redundant termination on session timeout/failure
     */
    handleSessionTimeout(sessionId: string): Promise<void>;
    /**
     * Handle session failure with context cleanup
     * Requirement 4.4: Redundant termination on session failure
     */
    handleSessionFailure(sessionId: string, error: Error): Promise<void>;
    /**
     * Clean up Codex contexts on destroy
     */
    destroy(): void;
}
//# sourceMappingURL=synchronous-session-manager.d.ts.map