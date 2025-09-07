/**
 * Session Manager for GAN Auditor Integration
 *
 * Implements file-based persistence for audit sessions in .mcp-gan-state directory.
 * Provides session creation, loading, updating, and cleanup functionality with
 * error recovery for corrupted session files.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
import type { GansAuditorCodexSessionState, GansAuditorCodexSessionConfig, ProgressAnalysis, StagnationResult, TerminationReason, IterationData } from '../types/gan-types.js';
/**
 * Workflow step result for audit history tracking
 */
export interface WorkflowStepResult {
    success: boolean;
    evidence: string[];
    issues: Array<{
        severity: 'critical' | 'major' | 'minor';
        description: string;
        location?: string;
    }>;
    score?: number;
    duration?: number;
    metadata?: Record<string, any>;
}
/**
 * Workflow history entry for session tracking
 */
export interface WorkflowHistoryEntry {
    timestamp: number;
    thoughtNumber: number;
    stepName: string;
    stepResult: WorkflowStepResult;
    sessionLoop: number;
}
/**
 * Quality progression entry for tracking improvement
 */
export interface QualityProgressionEntry {
    timestamp: number;
    thoughtNumber: number;
    overallScore: number;
    dimensionalScores: Array<{
        name: string;
        score: number;
    }>;
    completionAnalysis?: {
        status: 'completed' | 'terminated' | 'in_progress';
        reason: string;
        nextThoughtNeeded: boolean;
    };
    criticalIssuesCount: number;
    improvementAreas: string[];
}
/**
 * Prompt context data for session continuity
 */
export interface PromptContextData {
    promptVersion: string;
    configHash: string;
    renderedPrompt: string;
    variables: Record<string, any>;
    projectContext?: {
        steering?: string;
        spec?: string;
        repository?: string;
    };
    storedAt?: number;
    sessionLoop?: number;
}
/**
 * Comprehensive audit progress analysis
 */
export interface AuditProgressAnalysis {
    sessionId: string;
    currentLoop: number;
    totalIterations: number;
    scoreProgression: Array<{
        thoughtNumber: number;
        score: number;
        timestamp: number;
    }>;
    averageImprovement: number;
    isStagnant: boolean;
    stagnationRisk: number;
    workflowStepStats: WorkflowStepStatistics;
    completionProbability: number;
    recommendedActions: string[];
}
/**
 * Workflow step statistics
 */
export interface WorkflowStepStatistics {
    totalSteps: number;
    stepBreakdown: Record<string, {
        count: number;
        averageDuration: number;
    }>;
    mostFrequentStep: string | null;
    averageStepsPerLoop: number;
}
/**
 * Session statistics for monitoring
 */
export interface SessionStatistics {
    sessionId: string;
    sessionDuration: number;
    lastActivity: number;
    timeSinceLastActivity: number;
    currentLoop: number;
    isComplete: boolean;
    completionReason?: string;
    qualityStats: {
        currentScore: number;
        highestScore: number;
        lowestScore: number;
        averageScore: number;
        scoreImprovement: number;
    };
    workflowStats: {
        totalSteps: number;
        uniqueSteps: number;
        averageStepDuration: number;
        mostFrequentStep: string | null;
    };
    memoryUsage: number;
}
import type { IGansAuditorCodexSessionManager } from '../types/integration-types.js';
/**
 * Configuration for SessionManager
 */
export interface SessionManagerConfig {
    stateDirectory: string;
    maxSessionAge: number;
    cleanupInterval: number;
}
/**
 * Default configuration for SessionManager
 */
export declare const DEFAULT_SESSION_MANAGER_CONFIG: SessionManagerConfig;
/**
 * SessionManager implementation with file-based persistence
 *
 * Requirement 3.1: Session creation and management
 * Requirement 3.2: File-based persistence in .mcp-gan-state directory
 * Requirement 3.3: Unique session ID generation
 * Requirement 3.4: Session state validation and error recovery
 * Requirement 3.5: Session cleanup functionality
 */
export declare class SessionManager implements IGansAuditorCodexSessionManager {
    private readonly config;
    private readonly stateDir;
    private cleanupTimer?;
    private readonly componentLogger;
    constructor(config?: Partial<SessionManagerConfig>);
    /**
     * Resolve the absolute path to the state directory
     */
    private resolveStateDirectory;
    /**
     * Ensure state directory exists
     */
    private ensureStateDirectory;
    /**
     * Get file path for session
     */
    private getSessionFilePath;
    /**
     * Generate unique session ID using hash of cwd + username + timestamp
     * Requirement 3.3: Unique session ID generation
     */
    generateSessionId(cwd?: string, username?: string): string;
    /**
     * Validate session state structure
     * Requirement 3.4: Session state validation
     */
    private validateSessionState;
    /**
     * Sanitize and repair session state
     * Requirement 3.4: Error recovery for corrupted files
     */
    private sanitizeSessionState;
    /**
     * Get existing session or return null
     * Requirement 3.1: Session loading
     */
    getSession(id: string): Promise<GansAuditorCodexSessionState | null>;
    /**
     * Create new session with configuration
     * Requirement 3.1: Session creation
     */
    createSession(id: string, config: GansAuditorCodexSessionConfig): Promise<GansAuditorCodexSessionState>;
    /**
     * Update existing session state
     * Requirement 3.2: File-based persistence
     */
    updateSession(session: GansAuditorCodexSessionState): Promise<void>;
    /**
     * Add audit result to session history
     */
    addAuditToHistory(sessionId: string, thoughtNumber: number, review: any, config: GansAuditorCodexSessionConfig): Promise<void>;
    /**
     * Record Codex failure in session state
     * Requirements: 4.1, 4.5 - Handle Codex failures properly without fallbacks
     */
    recordCodexFailure(sessionId: string, thoughtNumber: number, error: Error, context?: Record<string, any>): Promise<void>;
    /**
     * Check if session has recent Codex failures
     * Requirements: 4.1, 4.5 - Track Codex failure patterns
     */
    hasRecentCodexFailures(sessionId: string, withinMinutes?: number): Promise<boolean>;
    /**
     * Get Codex failure summary for session
     * Requirements: 4.1, 4.5 - Provide diagnostic information for Codex failures
     */
    getCodexFailureSummary(sessionId: string): Promise<{
        totalFailures: number;
        recentFailures: number;
        lastFailureTime?: number;
        commonErrorTypes: string[];
    }>;
    /**
     * Clean up old or corrupted sessions
     * Requirement 3.5: Session cleanup
     */
    cleanupSessions(maxAge?: number): Promise<void>;
    /**
     * Start automatic cleanup timer
     */
    private startCleanupTimer;
    /**
     * Stop automatic cleanup and release resources
     */
    destroy(): void;
    /**
     * Get all active sessions (for debugging/monitoring)
     */
    getAllSessions(): Promise<GansAuditorCodexSessionState[]>;
    /**
     * Delete specific session
     */
    deleteSession(sessionId: string): Promise<boolean>;
    /**
     * Add workflow step result to session history
     * Requirement 6.1: Add audit history tracking with workflow step results
     */
    addWorkflowStepResult(sessionId: string, stepName: string, stepResult: WorkflowStepResult, thoughtNumber: number): Promise<void>;
    /**
     * Track quality progression across iterations
     * Requirement 6.2: Implement quality progression tracking across iterations
     */
    trackQualityProgression(sessionId: string, qualityMetrics: QualityProgressionEntry): Promise<void>;
    /**
     * Store prompt context for session continuity
     * Requirement 6.3: Create session state persistence for prompt context
     */
    storePromptContext(sessionId: string, promptContext: PromptContextData): Promise<void>;
    /**
     * Retrieve prompt context for session continuity
     * Requirement 6.3: Create session state persistence for prompt context
     */
    getPromptContext(sessionId: string): Promise<PromptContextData | null>;
    /**
     * Analyze audit progress across iterations
     * Requirement 6.2: Implement quality progression tracking across iterations
     */
    analyzeAuditProgress(sessionId: string): Promise<AuditProgressAnalysis>;
    /**
     * Get session statistics for monitoring
     * Requirement 6.1: Add audit history tracking with workflow step results
     */
    getSessionStatistics(sessionId: string): Promise<SessionStatistics>;
    /**
     * Get or create session with LOOP_ID support (enhanced implementation)
     */
    getOrCreateSession(sessionId: string, loopId?: string): Promise<GansAuditorCodexSessionState>;
    /**
     * Analyze progress across iterations (enhanced implementation)
     */
    analyzeProgress(sessionId: string): Promise<ProgressAnalysis>;
    /**
     * Detect stagnation in session responses (enhanced implementation)
     */
    detectStagnation(sessionId: string): Promise<StagnationResult>;
    /**
     * Start Codex context window (enhanced implementation)
     */
    startCodexContext(loopId: string): Promise<string>;
    /**
     * Maintain Codex context window (enhanced implementation)
     */
    maintainCodexContext(loopId: string, contextId: string): Promise<void>;
    /**
     * Terminate Codex context window (enhanced implementation)
     */
    terminateCodexContext(loopId: string, reason: TerminationReason): Promise<void>;
    /**
     * Add iteration data to session (enhanced implementation)
     */
    addIteration(sessionId: string, iteration: IterationData): Promise<void>;
    /**
     * Detect progress stagnation based on score progression
     */
    private detectProgressStagnation;
    /**
     * Analyze workflow step completion patterns
     */
    private analyzeWorkflowSteps;
    /**
     * Calculate completion probability based on current progress
     */
    private calculateCompletionProbability;
    /**
     * Generate progress-based recommendations
     */
    private generateProgressRecommendations;
    /**
     * Calculate score similarity for stagnation detection
     */
    private calculateScoreSimilarity;
    /**
     * Generate stagnation-specific recommendations
     */
    private generateStagnationRecommendation;
    /**
     * Calculate average step duration from workflow history
     */
    private calculateAverageStepDuration;
    /**
     * Get the most frequently executed workflow step
     */
    private getMostFrequentStep;
    /**
     * Estimate memory usage of session data
     */
    private estimateSessionMemoryUsage;
}
//# sourceMappingURL=session-manager.d.ts.map