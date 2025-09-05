/**
 * Completion criteria evaluation system for synchronous audit workflow
 *
 * This module implements tiered completion logic with kill switches to prevent
 * endless improvement loops while ensuring quality standards are met.
 *
 * Requirements addressed:
 * - 3.1: 95%@10 loops completion criteria
 * - 3.2: 90%@15 loops completion criteria
 * - 3.3: 85%@20 loops completion criteria
 * - 3.4: Hard stop at 25 loops with failure reporting
 * - 3.7: Completion status tracking and reporting
 */
import type { GansAuditorCodexSessionState, CompletionReason, StagnationResult } from '../types/gan-types.js';
/**
 * Result of completion evaluation
 */
export interface CompletionResult {
    isComplete: boolean;
    reason: CompletionReason;
    nextThoughtNeeded: boolean;
    message?: string;
}
/**
 * Termination result with detailed failure analysis
 */
export interface TerminationResult {
    shouldTerminate: boolean;
    reason: string;
    failureRate: number;
    criticalIssues: string[];
    finalAssessment: string;
}
/**
 * Completion status information for responses
 */
export interface CompletionStatus {
    isComplete: boolean;
    reason: CompletionReason;
    currentLoop: number;
    score: number;
    threshold: number;
    message: string;
}
/**
 * Tiered completion criteria configuration
 */
export interface CompletionCriteria {
    tier1: {
        score: number;
        maxLoops: number;
    };
    tier2: {
        score: number;
        maxLoops: number;
    };
    tier3: {
        score: number;
        maxLoops: number;
    };
    hardStop: {
        maxLoops: number;
    };
    stagnationCheck: {
        startLoop: number;
        similarityThreshold: number;
    };
}
/**
 * Default completion criteria as specified in requirements
 */
export declare const DEFAULT_COMPLETION_CRITERIA: CompletionCriteria;
/**
 * Evaluates completion criteria for synchronous audit workflow
 *
 * Implements tiered completion logic:
 * - Tier 1: 95% score at 10 loops
 * - Tier 2: 90% score at 15 loops
 * - Tier 3: 85% score at 20 loops
 * - Hard stop: 25 loops maximum
 */
export declare class CompletionEvaluator {
    private criteria;
    constructor(criteria?: CompletionCriteria);
    /**
     * Evaluate completion status based on current score and loop count
     *
     * @param score Current audit score (0-100)
     * @param loop Current loop number
     * @param stagnationInfo Optional stagnation detection result
     * @returns Completion evaluation result
     */
    evaluateCompletion(score: number, loop: number, stagnationInfo?: StagnationResult): CompletionResult;
    /**
     * Determine if session should be terminated based on session state
     *
     * @param sessionState Current session state
     * @returns Termination decision with detailed analysis
     */
    shouldTerminate(sessionState: GansAuditorCodexSessionState): TerminationResult;
    /**
     * Generate completion status for response inclusion
     *
     * @param score Current audit score
     * @param loop Current loop number
     * @param completionResult Completion evaluation result
     * @returns Structured completion status
     */
    getCompletionStatus(score: number, loop: number, completionResult: CompletionResult): CompletionStatus;
    /**
     * Update completion criteria configuration
     *
     * @param newCriteria Updated criteria configuration
     */
    updateCriteria(newCriteria: Partial<CompletionCriteria>): void;
    /**
     * Get current completion criteria configuration
     *
     * @returns Current criteria configuration
     */
    getCriteria(): CompletionCriteria;
    /**
     * Get applicable threshold for current loop
     */
    private getApplicableThreshold;
    /**
     * Generate progress message for current state
     */
    private getProgressMessage;
    /**
     * Calculate failure rate from session history
     */
    private calculateFailureRate;
    /**
     * Extract critical issues from recent audit results
     */
    private extractCriticalIssues;
    /**
     * Generate final assessment for termination
     */
    private generateFinalAssessment;
}
/**
 * Create a completion evaluator with custom criteria
 *
 * @param customCriteria Partial criteria to override defaults
 * @returns Configured completion evaluator
 */
export declare function createCompletionEvaluator(customCriteria?: Partial<CompletionCriteria>): CompletionEvaluator;
/**
 * Validate completion criteria configuration
 *
 * @param criteria Criteria to validate
 * @returns Validation result with any errors
 */
export declare function validateCompletionCriteria(criteria: CompletionCriteria): {
    isValid: boolean;
    errors: string[];
};
//# sourceMappingURL=completion-evaluator.d.ts.map