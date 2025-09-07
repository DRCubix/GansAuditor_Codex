/**
 * Core data types and interfaces for GansAuditor_Codex
 *
 * This module defines the TypeScript interfaces for GansAuditor_Codex audit types,
 * session management, and enhanced response formats as specified in
 * requirements 1.1, 2.1, and 5.1.
 */
/**
 * Verdict returned by the GansAuditor_Codex indicating the quality assessment
 */
export type GanVerdict = "pass" | "revise" | "reject";
/**
 * Dimensional score for a specific aspect of code quality
 */
export interface DimensionalScore {
    name: string;
    score: number;
}
/**
 * Individual judge assessment card
 */
export interface JudgeCard {
    model: string;
    score: number;
    notes?: string;
}
/**
 * Inline comment with file location and feedback
 */
export interface InlineComment {
    path: string;
    line: number;
    comment: string;
}
/**
 * Detailed review information from the audit
 */
export interface ReviewDetails {
    summary: string;
    inline: InlineComment[];
    citations: string[];
}
/**
 * Complete GAN audit review result
 * Requirement 5.1: Detailed audit feedback with scores and comments
 * Extended for prompt-driven auditing (Requirement 6.5)
 */
export interface GansAuditorCodexReview {
    overall: number;
    dimensions: DimensionalScore[];
    verdict: GanVerdict;
    review: ReviewDetails;
    proposed_diff?: string | null;
    iterations: number;
    judge_cards: JudgeCard[];
    /** Workflow step execution results (optional for backward compatibility) */
    workflow_steps?: Array<{
        stepName: string;
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
    }>;
    /** Completion analysis for iterative improvement (optional for backward compatibility) */
    completion_analysis?: {
        status: 'completed' | 'terminated' | 'in_progress';
        reason: string;
        nextThoughtNeeded: boolean;
        tier?: {
            name: string;
            scoreThreshold: number;
            iterationThreshold: number;
            verdict: 'pass' | 'revise' | 'reject';
            message: string;
        };
        killSwitch?: {
            name: string;
            condition: string;
            action: string;
            message: string;
        };
        confidence?: 'high' | 'medium' | 'low';
    };
    /** Recommended next actions (optional for backward compatibility) */
    next_actions?: Array<{
        type: 'complete' | 'escalate' | 'fix_critical' | 'improve' | 'continue';
        priority: 'critical' | 'high' | 'medium' | 'low';
        description: string;
        commands: string[];
        estimatedEffort?: 'low' | 'medium' | 'high';
    }>;
    /** Prompt metadata for debugging and tracking (optional for backward compatibility) */
    prompt_metadata?: {
        version: string;
        renderedAt: number;
        configHash: string;
        templatePath?: string;
        variables?: Record<string, any>;
        degradationLevel?: 'none' | 'partial' | 'full';
    };
}
/**
 * Configuration for audit scope and behavior
 * Requirement 2.1: Configurable audit parameters
 */
export interface GansAuditorCodexSessionConfig {
    task: string;
    scope: "diff" | "paths" | "workspace";
    paths?: string[];
    threshold: number;
    maxCycles: number;
    candidates: number;
    judges: string[];
    applyFixes: boolean;
}
/**
 * Historical audit entry for session tracking
 */
export interface GansAuditorCodexHistoryEntry {
    timestamp: number;
    thoughtNumber: number;
    review: GansAuditorCodexReview;
    config: GansAuditorCodexSessionConfig;
}
/**
 * Enhanced iteration data for synchronous workflow
 */
export interface IterationData {
    thoughtNumber: number;
    code: string;
    auditResult: GansAuditorCodexReview;
    timestamp: number;
}
/**
 * Progress analysis for session tracking
 */
export interface ProgressAnalysis {
    currentLoop: number;
    scoreProgression: number[];
    averageImprovement: number;
    isStagnant: boolean;
}
/**
 * Stagnation detection result
 */
export interface StagnationResult {
    isStagnant: boolean;
    detectedAtLoop: number;
    similarityScore: number;
    recommendation: string;
}
/**
 * Completion reasons for synchronous workflow
 */
export type CompletionReason = "score_95_at_10" | "score_90_at_15" | "score_85_at_20" | "max_loops_reached" | "stagnation_detected" | "in_progress";
/**
 * Termination reasons for Codex context
 */
export type TerminationReason = "completion" | "timeout" | "failure" | "stagnation" | "manual";
/**
 * Similarity analysis for loop detection
 */
export interface SimilarityAnalysis {
    averageSimilarity: number;
    isStagnant: boolean;
    repeatedPatterns: string[];
}
/**
 * Complete session state for audit continuity
 * Requirement 3.1-3.5: Session state management
 * Extended for synchronous audit workflow support and prompt-driven audits
 */
export interface GansAuditorCodexSessionState {
    id: string;
    loopId?: string;
    config: GansAuditorCodexSessionConfig;
    history: GansAuditorCodexHistoryEntry[];
    iterations: IterationData[];
    currentLoop: number;
    isComplete: boolean;
    completionReason?: CompletionReason;
    stagnationInfo?: StagnationResult;
    codexContextId?: string;
    codexContextActive: boolean;
    lastGan?: GansAuditorCodexReview;
    createdAt: number;
    updatedAt: number;
    /** Track Codex CLI failures for diagnostic purposes */
    codexFailures?: Array<{
        timestamp: number;
        thoughtNumber: number;
        errorType: string;
        errorMessage: string;
        context: Record<string, any>;
    }>;
    /** Flag indicating if session has experienced Codex issues */
    hasCodexIssues?: boolean;
    /** Timestamp of last Codex failure */
    lastCodexFailure?: number;
    /** Workflow step execution history for audit tracking */
    workflowHistory?: Array<{
        timestamp: number;
        thoughtNumber: number;
        stepName: string;
        stepResult: {
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
        };
        sessionLoop: number;
    }>;
    /** Quality progression tracking across iterations */
    qualityProgression?: Array<{
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
    }>;
    /** Stored prompt context for session continuity */
    promptContext?: {
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
    };
}
/**
 * Rubric dimension definition for audit evaluation
 */
export interface RubricDimension {
    name: string;
    weight: number;
    description?: string;
}
/**
 * Audit rubric defining evaluation criteria
 */
export interface AuditRubric {
    dimensions: RubricDimension[];
}
/**
 * Budget constraints for audit execution
 */
export interface AuditBudget {
    maxCycles: number;
    candidates: number;
    threshold: number;
}
/**
 * Complete audit request sent to Codex judge
 * Requirement 7.1-7.5: Codex CLI integration
 */
export interface GansAuditorCodexAuditRequest {
    task: string;
    candidate: string;
    contextPack: string;
    rubric: AuditRubric;
    budget: AuditBudget;
}
/**
 * Extended ThoughtData interface that includes GAN session support
 * Extends existing ThoughtData with branchId for session identification
 */
export interface GansAuditorCodexThoughtData {
    thought: string;
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;
    isRevision?: boolean;
    revisesThought?: number;
    branchFromThought?: number;
    branchId?: string;
    needsMoreThoughts?: boolean;
}
/**
 * Standard response from GansAuditor_Codex tool
 */
export interface GansAuditorCodexStandardResponse {
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;
    branches: string[];
    thoughtHistoryLength: number;
}
/**
 * Enhanced tool response that includes GAN audit results
 * Requirement 5.1: Enhanced response format with audit data
 * Requirement 6.3: Extended response format compatibility
 */
export interface GansAuditorCodexEnhancedResponse extends GansAuditorCodexStandardResponse {
    sessionId?: string;
    gan?: GansAuditorCodexReview;
}
/**
 * Tool response content structure
 */
export interface GansAuditorCodexResponseContent {
    type: string;
    text: string;
}
/**
 * Complete tool response wrapper
 */
export interface GansAuditorCodexToolResponse {
    content: GansAuditorCodexResponseContent[];
    isError?: boolean;
}
/**
 * Error categories for structured error handling
 */
export type ErrorCategory = "config" | "codex" | "filesystem" | "session";
/**
 * Detailed error information
 */
export interface ErrorDetails {
    category: ErrorCategory;
    recoverable: boolean;
    suggestions?: string[];
}
/**
 * Structured error response
 */
export interface ErrorResponse {
    error: string;
    status: "failed";
    details?: ErrorDetails;
}
/**
 * Partial configuration from inline gan-config blocks
 * Requirement 2.1-2.4: Inline configuration parsing
 */
export interface GansAuditorCodexInlineConfig {
    task?: string;
    scope?: "diff" | "paths" | "workspace";
    paths?: string[];
    threshold?: number;
    judges?: string[];
    maxCycles?: number;
    candidates?: number;
    applyFixes?: boolean;
}
/**
 * Default session configuration values
 */
export declare const DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG: GansAuditorCodexSessionConfig;
/**
 * Default audit rubric with standard code quality dimensions
 */
export declare const DEFAULT_AUDIT_RUBRIC: AuditRubric;
/**
 * Configuration validation constraints
 */
export declare const CONFIG_CONSTRAINTS: {
    readonly THRESHOLD_MIN: 0;
    readonly THRESHOLD_MAX: 100;
    readonly MAX_CYCLES_MIN: 1;
    readonly MAX_CYCLES_MAX: 10;
    readonly CANDIDATES_MIN: 1;
    readonly CANDIDATES_MAX: 5;
};
/**
 * Type aliases for backward compatibility with existing code
 * These maintain compatibility while the codebase transitions to new naming
 */
export type ThoughtData = GansAuditorCodexThoughtData;
export type GanReview = GansAuditorCodexReview;
export type SessionConfig = GansAuditorCodexSessionConfig;
export type SessionState = GansAuditorCodexSessionState;
export type AuditRequest = GansAuditorCodexAuditRequest;
export type InlineConfig = GansAuditorCodexInlineConfig;
export type AuditHistoryEntry = GansAuditorCodexHistoryEntry;
export declare const DEFAULT_SESSION_CONFIG: GansAuditorCodexSessionConfig;
//# sourceMappingURL=gan-types.d.ts.map