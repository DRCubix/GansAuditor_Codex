/**
 * Enhanced response types for synchronous audit workflow
 *
 * This module defines the enhanced response types specifically for the synchronous
 * audit workflow, including structured feedback, completion status, and loop information.
 *
 * Requirements addressed:
 * - 5.1: Detailed feedback format with improvement suggestions
 * - 5.2: Critical issue categorization and next steps guidance
 * - 5.3: Completion status and loop information in responses
 * - 5.4: Structured feedback format for LLM consumption
 */
import type { GansAuditorCodexEnhancedResponse, CompletionReason, TerminationReason } from './gan-types.js';
/**
 * Categorized improvement suggestion with priority and actionability
 */
export interface ImprovementSuggestion {
    /** Category of the improvement (security, performance, style, etc.) */
    category: IssueCategory;
    /** Priority level of the suggestion */
    priority: Priority;
    /** Specific description of what needs to be improved */
    description: string;
    /** Suggested action to take */
    action: string;
    /** File path and line number if applicable */
    location?: {
        path: string;
        line: number;
        endLine?: number;
    };
    /** Code example or snippet if helpful */
    example?: string;
}
/**
 * Critical issue that must be addressed
 */
export interface CriticalIssue {
    /** Type of critical issue */
    type: CriticalIssueType;
    /** Severity level */
    severity: Severity;
    /** Description of the issue */
    description: string;
    /** Impact if not addressed */
    impact: string;
    /** Required action to resolve */
    resolution: string;
    /** Location in code if applicable */
    location?: {
        path: string;
        line: number;
        endLine?: number;
    };
}
/**
 * Next step guidance for the LLM
 */
export interface NextStep {
    /** Step number in sequence */
    step: number;
    /** Action to take */
    action: string;
    /** Rationale for this step */
    rationale: string;
    /** Expected outcome */
    expectedOutcome: string;
    /** Priority of this step */
    priority: Priority;
}
/**
 * Structured feedback combining all improvement guidance
 */
export interface StructuredFeedback {
    /** Overall summary of the audit results */
    summary: string;
    /** Specific improvement suggestions */
    improvements: ImprovementSuggestion[];
    /** Critical issues that must be addressed */
    criticalIssues: CriticalIssue[];
    /** Ordered next steps for the LLM */
    nextSteps: NextStep[];
    /** Overall assessment of progress */
    progressAssessment: ProgressAssessment;
}
/**
 * Completion status information
 */
export interface CompletionStatus {
    /** Whether the work is complete */
    isComplete: boolean;
    /** Reason for completion or continuation */
    reason: CompletionReason;
    /** Current loop number */
    currentLoop: number;
    /** Current audit score */
    score: number;
    /** Target threshold for current tier */
    threshold: number;
    /** Descriptive message about completion status */
    message: string;
    /** Progress toward completion (0-1) */
    progressPercentage: number;
}
/**
 * Loop information and progress tracking
 */
export interface LoopInfo {
    /** Current loop number */
    currentLoop: number;
    /** Maximum allowed loops */
    maxLoops: number;
    /** Progress trend analysis */
    progressTrend: ProgressTrend;
    /** Whether stagnation has been detected */
    stagnationDetected: boolean;
    /** Score progression over recent loops */
    scoreProgression: number[];
    /** Average improvement per loop */
    averageImprovement: number;
    /** Loops remaining before hard stop */
    loopsRemaining: number;
}
/**
 * Termination information when session ends
 */
export interface TerminationInfo {
    /** Reason for termination */
    reason: string;
    /** Termination type */
    type: TerminationReason;
    /** Failure rate across all iterations */
    failureRate: number;
    /** Critical issues that remain unresolved */
    criticalIssues: string[];
    /** Final assessment of the work */
    finalAssessment: string;
    /** Recommendations for future attempts */
    recommendations: string[];
}
/**
 * Enhanced response for synchronous audit workflow
 * Extends the base enhanced response with structured feedback and loop information
 */
export interface SynchronousEnhancedResponse extends GansAuditorCodexEnhancedResponse {
    /** Structured feedback with categorized improvements */
    feedback?: StructuredFeedback;
    /** Completion status and progress information */
    completionStatus?: CompletionStatus;
    /** Loop information and progress tracking */
    loopInfo?: LoopInfo;
    /** Termination information if session ended */
    terminationInfo?: TerminationInfo;
    /** Session metadata */
    sessionMetadata?: SessionMetadata;
}
/**
 * Session metadata for tracking and debugging
 */
export interface SessionMetadata {
    /** Session identifier */
    sessionId: string;
    /** Loop identifier for Codex context continuity */
    loopId?: string;
    /** Timestamp when session started */
    sessionStartTime: number;
    /** Timestamp of current iteration */
    currentIterationTime: number;
    /** Total time spent in session (milliseconds) */
    totalSessionTime: number;
    /** Configuration used for this session */
    sessionConfig: {
        threshold: number;
        maxCycles: number;
        judges: string[];
        scope: string;
    };
}
/**
 * Categories for improvement suggestions and issues
 */
export declare enum IssueCategory {
    SECURITY = "security",
    PERFORMANCE = "performance",
    STYLE = "style",
    LOGIC = "logic",
    ERROR_HANDLING = "error_handling",
    MAINTAINABILITY = "maintainability",
    TESTING = "testing",
    DOCUMENTATION = "documentation",
    ARCHITECTURE = "architecture",
    COMPATIBILITY = "compatibility"
}
/**
 * Priority levels for improvements and issues
 */
export declare enum Priority {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
/**
 * Severity levels for critical issues
 */
export declare enum Severity {
    BLOCKER = "blocker",
    CRITICAL = "critical",
    MAJOR = "major",
    MINOR = "minor"
}
/**
 * Types of critical issues
 */
export declare enum CriticalIssueType {
    SECURITY_VULNERABILITY = "security_vulnerability",
    LOGIC_ERROR = "logic_error",
    PERFORMANCE_BOTTLENECK = "performance_bottleneck",
    COMPATIBILITY_ISSUE = "compatibility_issue",
    DATA_CORRUPTION_RISK = "data_corruption_risk",
    RESOURCE_LEAK = "resource_leak",
    INFINITE_LOOP = "infinite_loop",
    NULL_POINTER = "null_pointer",
    RACE_CONDITION = "race_condition",
    DEADLOCK_RISK = "deadlock_risk"
}
/**
 * Progress trend indicators
 */
export declare enum ProgressTrend {
    IMPROVING = "improving",
    STAGNANT = "stagnant",
    DECLINING = "declining",
    OSCILLATING = "oscillating"
}
/**
 * Progress assessment categories
 */
export interface ProgressAssessment {
    /** Overall progress direction */
    trend: ProgressTrend;
    /** Confidence in the assessment (0-1) */
    confidence: number;
    /** Key factors influencing progress */
    factors: string[];
    /** Recommendations based on progress */
    recommendations: string[];
}
/**
 * Analysis of feedback quality and actionability
 */
export interface FeedbackAnalysis {
    /** Number of actionable suggestions */
    actionableCount: number;
    /** Number of critical issues */
    criticalCount: number;
    /** Average priority level */
    averagePriority: number;
    /** Coverage of different issue categories */
    categoryCoverage: IssueCategory[];
    /** Quality score of feedback (0-1) */
    qualityScore: number;
}
/**
 * Improvement tracking across iterations
 */
export interface ImprovementTracking {
    /** Issues resolved since last iteration */
    resolvedIssues: string[];
    /** New issues introduced */
    newIssues: string[];
    /** Issues that persist */
    persistentIssues: string[];
    /** Overall improvement score */
    improvementScore: number;
    /** Trend in issue resolution */
    resolutionTrend: ProgressTrend;
}
/**
 * Configuration for enhanced response building
 */
export interface EnhancedResponseConfig {
    /** Include detailed feedback analysis */
    includeDetailedFeedback: boolean;
    /** Include loop information */
    includeLoopInfo: boolean;
    /** Include session metadata */
    includeSessionMetadata: boolean;
    /** Maximum number of improvement suggestions to include */
    maxImprovements: number;
    /** Maximum number of critical issues to include */
    maxCriticalIssues: number;
    /** Maximum number of next steps to include */
    maxNextSteps: number;
    /** Feedback detail level */
    feedbackDetailLevel: FeedbackDetailLevel;
}
/**
 * Levels of feedback detail
 */
export declare enum FeedbackDetailLevel {
    MINIMAL = "minimal",
    STANDARD = "standard",
    DETAILED = "detailed",
    COMPREHENSIVE = "comprehensive"
}
/**
 * Default configuration for enhanced responses
 */
export declare const DEFAULT_ENHANCED_RESPONSE_CONFIG: EnhancedResponseConfig;
/**
 * Completion criteria configuration for synchronous audit workflow
 */
export interface CompletionCriteria {
    /** Tier 1: High quality completion (95% at 10 loops) */
    tier1: {
        score: number;
        maxLoops: number;
    };
    /** Tier 2: Good quality completion (90% at 15 loops) */
    tier2: {
        score: number;
        maxLoops: number;
    };
    /** Tier 3: Acceptable quality completion (85% at 20 loops) */
    tier3: {
        score: number;
        maxLoops: number;
    };
    /** Hard stop: Maximum loops before forced termination */
    hardStop: {
        maxLoops: number;
    };
    /** Stagnation detection configuration */
    stagnationCheck: {
        startLoop: number;
        similarityThreshold: number;
    };
}
/**
 * Audit timeout configuration
 */
export interface AuditTimeoutConfig {
    /** Timeout for audit operations in seconds */
    auditTimeoutSeconds: number;
    /** Interval for progress indicators in milliseconds */
    progressIndicatorInterval: number;
    /** Whether to show progress indicators */
    enableProgressIndicators: boolean;
    /** Number of retry attempts on timeout */
    timeoutRetryAttempts: number;
    /** Whether to return partial results on timeout */
    partialResultsOnTimeout: boolean;
}
/**
 * Concurrency configuration for audit operations
 */
export interface ConcurrencyConfig {
    /** Maximum number of concurrent audit operations */
    maxConcurrentAudits: number;
    /** Maximum number of concurrent sessions */
    maxConcurrentSessions: number;
    /** Timeout for queued operations in milliseconds */
    queueTimeout: number;
    /** Whether to enable audit queuing */
    enableAuditQueue: boolean;
    /** Interval for session cleanup in milliseconds */
    sessionCleanupInterval: number;
    /** Maximum age for sessions in milliseconds */
    maxSessionAge: number;
}
/**
 * Synchronous workflow configuration
 */
export interface SynchronousWorkflowConfig {
    /** Whether synchronous mode is enabled */
    enabled: boolean;
    /** Whether to enable stagnation detection */
    enableStagnationDetection: boolean;
    /** Whether to enable Codex context management */
    enableCodexContextManagement: boolean;
    /** Level of detail for feedback */
    feedbackDetailLevel: 'basic' | 'detailed' | 'verbose';
    /** Whether to enable audit result caching */
    enableAuditCaching: boolean;
    /** Whether to enable session persistence */
    enableSessionPersistence: boolean;
    /** Directory for storing session state */
    stateDirectory: string;
    /** Whether to enable performance metrics */
    enableMetrics: boolean;
    /** Whether to enable health checks */
    enableHealthChecks: boolean;
}
/**
 * Complete runtime configuration
 */
export interface RuntimeConfig {
    /** Completion criteria configuration */
    completionCriteria: CompletionCriteria;
    /** Audit timeout configuration */
    auditTimeout: AuditTimeoutConfig;
    /** Concurrency configuration */
    concurrency: ConcurrencyConfig;
    /** Synchronous workflow configuration */
    synchronous: SynchronousWorkflowConfig;
}
/**
 * Environment configuration summary
 */
export interface EnvironmentConfig {
    /** Core synchronous mode settings */
    enableSynchronousAudit: boolean;
    enableGanAuditing: boolean;
    /** Timeout settings */
    auditTimeoutSeconds: number;
    /** Concurrency settings */
    maxConcurrentAudits: number;
    maxConcurrentSessions: number;
    /** Feature flags */
    enableStagnationDetection: boolean;
    enableCodexContextManagement: boolean;
    enableAuditCaching: boolean;
    enableSessionPersistence: boolean;
    /** Directories and paths */
    stateDirectory: string;
    /** Monitoring and observability */
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    /** Legacy compatibility */
    disableThoughtLogging: boolean;
}
/**
 * Type guard for synchronous enhanced response
 */
export declare function isSynchronousEnhancedResponse(obj: any): obj is SynchronousEnhancedResponse;
/**
 * Type guard for structured feedback
 */
export declare function isStructuredFeedback(obj: any): obj is StructuredFeedback;
/**
 * Type guard for completion status
 */
export declare function isCompletionStatus(obj: any): obj is CompletionStatus;
/**
 * Type guard for loop info
 */
export declare function isLoopInfo(obj: any): obj is LoopInfo;
//# sourceMappingURL=synchronous-response-types.d.ts.map