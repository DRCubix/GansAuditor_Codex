/**
 * Enhanced Response Builder for Synchronous Audit Workflow
 *
 * This module implements the enhanced response builder that creates structured
 * feedback responses for the synchronous audit workflow, including improvement
 * suggestions, critical issue categorization, and next steps guidance.
 *
 * Requirements addressed:
 * - 5.1: Detailed feedback format with improvement suggestions
 * - 5.2: Critical issue categorization and next steps guidance
 * - 5.3: Completion status and loop information in responses
 * - 5.4: Structured feedback format for LLM consumption
 */
import type { GansAuditorCodexStandardResponse, GansAuditorCodexReview, GansAuditorCodexSessionState } from './gan-types.js';
import type { CompletionResult, TerminationResult } from '../auditor/completion-evaluator.js';
import type { DetailedStagnationAnalysis } from '../auditor/loop-detector.js';
import type { SynchronousEnhancedResponse, EnhancedResponseConfig } from './synchronous-response-types.js';
/**
 * Builder for creating enhanced responses with structured feedback
 *
 * This class transforms audit results into structured, actionable feedback
 * that helps LLMs understand what needs to be improved and how to proceed.
 */
export declare class EnhancedResponseBuilder {
    private readonly componentLogger;
    private config;
    constructor(config?: Partial<EnhancedResponseConfig>);
    /**
     * Build a synchronous enhanced response from audit results
     *
     * @param standardResponse Base response structure
     * @param auditResult GAN audit results
     * @param completionResult Completion evaluation
     * @param sessionState Current session state
     * @param stagnationAnalysis Stagnation detection results
     * @param terminationResult Termination analysis if applicable
     * @returns Enhanced response with structured feedback
     */
    buildSynchronousResponse(standardResponse: GansAuditorCodexStandardResponse, auditResult?: GansAuditorCodexReview, completionResult?: CompletionResult, sessionState?: GansAuditorCodexSessionState, stagnationAnalysis?: DetailedStagnationAnalysis, terminationResult?: TerminationResult): SynchronousEnhancedResponse;
    /**
     * Update configuration for response building
     */
    updateConfig(newConfig: Partial<EnhancedResponseConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): EnhancedResponseConfig;
    /**
     * Build structured feedback from audit results
     */
    private buildStructuredFeedback;
    /**
     * Extract improvement suggestions from audit results
     */
    private extractImprovementSuggestions;
    /**
     * Convert inline comment to improvement suggestion
     */
    private convertCommentToSuggestion;
    /**
     * Categorize comment by content analysis
     */
    private categorizeComment;
    /**
     * Determine priority based on comment content and category
     */
    private determinePriority;
    /**
     * Extract actionable guidance from comment
     */
    private extractActionFromComment;
    /**
     * Create suggestion from dimensional score
     */
    private createDimensionalSuggestion;
    /**
     * Extract critical issues from audit results
     */
    private extractCriticalIssues;
    /**
     * Convert comment to critical issue if applicable
     */
    private convertCommentToCriticalIssue;
    /**
     * Check if comment indicates a critical issue
     */
    private isCriticalComment;
    /**
     * Determine critical issue type from comment
     */
    private determineCriticalIssueType;
    /**
     * Determine severity from comment content
     */
    private determineSeverity;
    /**
     * Generate impact description for critical issue
     */
    private generateImpactDescription;
    /**
     * Generate resolution guidance for critical issue
     */
    private generateResolutionGuidance;
    /**
     * Generate next steps based on audit results and analysis
     */
    private generateNextSteps;
    /**
     * Assess progress based on audit results and session state
     */
    private assessProgress;
    /**
     * Build feedback summary
     */
    private buildFeedbackSummary;
    /**
     * Build completion status information
     */
    private buildCompletionStatus;
    /**
     * Build loop information
     */
    private buildLoopInfo;
    /**
     * Build termination information
     */
    private buildTerminationInfo;
    /**
     * Build session metadata
     */
    private buildSessionMetadata;
}
/**
 * Create an enhanced response builder with default configuration
 */
export declare function createEnhancedResponseBuilder(config?: Partial<EnhancedResponseConfig>): EnhancedResponseBuilder;
/**
 * Create a minimal enhanced response builder for basic feedback
 */
export declare function createMinimalEnhancedResponseBuilder(): EnhancedResponseBuilder;
/**
 * Create a comprehensive enhanced response builder for detailed analysis
 */
export declare function createComprehensiveEnhancedResponseBuilder(): EnhancedResponseBuilder;
//# sourceMappingURL=enhanced-response-builder.d.ts.map