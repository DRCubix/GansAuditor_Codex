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
// ============================================================================
// Default Configuration
// ============================================================================
/**
 * Default completion criteria as specified in requirements
 */
export const DEFAULT_COMPLETION_CRITERIA = {
    tier1: { score: 95, maxLoops: 10 },
    tier2: { score: 90, maxLoops: 15 },
    tier3: { score: 85, maxLoops: 20 },
    hardStop: { maxLoops: 25 },
    stagnationCheck: { startLoop: 10, similarityThreshold: 0.95 },
};
// ============================================================================
// Completion Evaluator Implementation
// ============================================================================
/**
 * Evaluates completion criteria for synchronous audit workflow
 *
 * Implements tiered completion logic:
 * - Tier 1: 95% score at 10 loops
 * - Tier 2: 90% score at 15 loops
 * - Tier 3: 85% score at 20 loops
 * - Hard stop: 25 loops maximum
 */
export class CompletionEvaluator {
    criteria;
    constructor(criteria = DEFAULT_COMPLETION_CRITERIA) {
        this.criteria = criteria;
    }
    /**
     * Evaluate completion status based on current score and loop count
     *
     * @param score Current audit score (0-100)
     * @param loop Current loop number
     * @param stagnationInfo Optional stagnation detection result
     * @returns Completion evaluation result
     */
    evaluateCompletion(score, loop, stagnationInfo) {
        // Check for stagnation first (requirement 3.5)
        if (stagnationInfo?.isStagnant && loop >= this.criteria.stagnationCheck.startLoop) {
            return {
                isComplete: true,
                reason: "stagnation_detected",
                nextThoughtNeeded: false,
                message: `Stagnation detected at loop ${stagnationInfo.detectedAtLoop}. ${stagnationInfo.recommendation}`,
            };
        }
        // Check hard stop (requirement 3.4)
        if (loop >= this.criteria.hardStop.maxLoops) {
            return {
                isComplete: true,
                reason: "max_loops_reached",
                nextThoughtNeeded: false,
                message: `Maximum loops (${this.criteria.hardStop.maxLoops}) reached. Terminating with current results.`,
            };
        }
        // Check completion criteria in priority order (highest tier first)
        // Tier 1 has priority if score meets its threshold, regardless of loop count
        if (score >= this.criteria.tier1.score && loop >= this.criteria.tier1.maxLoops) {
            return {
                isComplete: true,
                reason: "score_95_at_10",
                nextThoughtNeeded: false,
                message: `Tier 1 completion achieved: ${score}% score at loop ${loop}`,
            };
        }
        // Tier 2 completion (requirement 3.2)
        if (score >= this.criteria.tier2.score && loop >= this.criteria.tier2.maxLoops) {
            return {
                isComplete: true,
                reason: "score_90_at_15",
                nextThoughtNeeded: false,
                message: `Tier 2 completion achieved: ${score}% score at loop ${loop}`,
            };
        }
        // Tier 3 completion (requirement 3.3)
        if (score >= this.criteria.tier3.score && loop >= this.criteria.tier3.maxLoops) {
            return {
                isComplete: true,
                reason: "score_85_at_20",
                nextThoughtNeeded: false,
                message: `Tier 3 completion achieved: ${score}% score at loop ${loop}`,
            };
        }
        // Continue iterating
        return {
            isComplete: false,
            reason: "in_progress",
            nextThoughtNeeded: true,
            message: this.getProgressMessage(score, loop),
        };
    }
    /**
     * Determine if session should be terminated based on session state
     *
     * @param sessionState Current session state
     * @returns Termination decision with detailed analysis
     */
    shouldTerminate(sessionState) {
        const currentLoop = sessionState.currentLoop;
        const lastScore = sessionState.lastGan?.overall ?? 0;
        // Calculate failure rate from history
        const failureRate = this.calculateFailureRate(sessionState);
        // Extract critical issues from recent audits
        const criticalIssues = this.extractCriticalIssues(sessionState);
        // Check hard stop condition
        if (currentLoop >= this.criteria.hardStop.maxLoops) {
            return {
                shouldTerminate: true,
                reason: `Maximum loops (${this.criteria.hardStop.maxLoops}) reached without achieving completion criteria`,
                failureRate,
                criticalIssues,
                finalAssessment: this.generateFinalAssessment(sessionState, failureRate, criticalIssues),
            };
        }
        // Check stagnation condition
        if (sessionState.stagnationInfo?.isStagnant) {
            return {
                shouldTerminate: true,
                reason: `Stagnation detected: ${sessionState.stagnationInfo.recommendation}`,
                failureRate,
                criticalIssues,
                finalAssessment: this.generateFinalAssessment(sessionState, failureRate, criticalIssues),
            };
        }
        // Continue processing
        return {
            shouldTerminate: false,
            reason: "Completion criteria not yet met, continuing iterations",
            failureRate,
            criticalIssues,
            finalAssessment: "",
        };
    }
    /**
     * Generate completion status for response inclusion
     *
     * @param score Current audit score
     * @param loop Current loop number
     * @param completionResult Completion evaluation result
     * @returns Structured completion status
     */
    getCompletionStatus(score, loop, completionResult) {
        const threshold = this.getApplicableThreshold(loop);
        return {
            isComplete: completionResult.isComplete,
            reason: completionResult.reason,
            currentLoop: loop,
            score,
            threshold,
            message: completionResult.message || this.getProgressMessage(score, loop),
        };
    }
    /**
     * Update completion criteria configuration
     *
     * @param newCriteria Updated criteria configuration
     */
    updateCriteria(newCriteria) {
        this.criteria = { ...this.criteria, ...newCriteria };
    }
    /**
     * Get current completion criteria configuration
     *
     * @returns Current criteria configuration
     */
    getCriteria() {
        return { ...this.criteria };
    }
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    /**
     * Get applicable threshold for current loop
     */
    getApplicableThreshold(loop) {
        // Return the threshold that would apply at this loop count
        // Use the lowest threshold that the loop count qualifies for
        if (loop >= this.criteria.tier3.maxLoops) {
            return this.criteria.tier3.score;
        }
        if (loop >= this.criteria.tier2.maxLoops) {
            return this.criteria.tier2.score;
        }
        if (loop >= this.criteria.tier1.maxLoops) {
            return this.criteria.tier1.score;
        }
        // Before any tier is reached, show the highest standard as target
        return this.criteria.tier1.score;
    }
    /**
     * Generate progress message for current state
     */
    getProgressMessage(score, loop) {
        const threshold = this.getApplicableThreshold(loop);
        const remaining = this.criteria.hardStop.maxLoops - loop;
        if (score >= threshold) {
            return `Score ${score}% meets threshold ${threshold}% but minimum loops not reached. Continue improving.`;
        }
        const needed = threshold - score;
        return `Score ${score}% needs ${needed}% improvement to reach ${threshold}% threshold. ${remaining} loops remaining.`;
    }
    /**
     * Calculate failure rate from session history
     */
    calculateFailureRate(sessionState) {
        if (sessionState.history.length === 0) {
            return 0;
        }
        const failedAudits = sessionState.history.filter(entry => entry.review.verdict === "reject").length;
        return (failedAudits / sessionState.history.length) * 100;
    }
    /**
     * Extract critical issues from recent audit results
     */
    extractCriticalIssues(sessionState) {
        const issues = [];
        // Get issues from last few audits
        const recentAudits = sessionState.history.slice(-3);
        for (const audit of recentAudits) {
            if (audit.review.verdict === "reject") {
                issues.push(`Loop ${audit.thoughtNumber}: ${audit.review.review.summary}`);
            }
            // Add critical inline comments
            const criticalComments = audit.review.review.inline
                .filter(comment => comment.comment.toLowerCase().includes("critical") ||
                comment.comment.toLowerCase().includes("security") ||
                comment.comment.toLowerCase().includes("error"))
                .map(comment => `${comment.path}:${comment.line} - ${comment.comment}`);
            issues.push(...criticalComments);
        }
        // Remove duplicates and limit to most critical
        return [...new Set(issues)].slice(0, 10);
    }
    /**
     * Generate final assessment for termination
     */
    generateFinalAssessment(sessionState, failureRate, criticalIssues) {
        const currentScore = sessionState.lastGan?.overall ?? 0;
        const totalLoops = sessionState.currentLoop;
        const verdict = sessionState.lastGan?.verdict ?? "unknown";
        // Only generate assessment if we should terminate
        if (totalLoops < this.criteria.hardStop.maxLoops && !sessionState.stagnationInfo?.isStagnant) {
            return "";
        }
        let assessment = `Final Assessment after ${totalLoops} loops:\n`;
        assessment += `- Final Score: ${currentScore}%\n`;
        assessment += `- Final Verdict: ${verdict}\n`;
        assessment += `- Failure Rate: ${failureRate.toFixed(1)}%\n`;
        if (criticalIssues.length > 0) {
            assessment += `\nCritical Issues Remaining:\n`;
            criticalIssues.slice(0, 5).forEach((issue, index) => {
                assessment += `${index + 1}. ${issue}\n`;
            });
            if (criticalIssues.length > 5) {
                assessment += `... and ${criticalIssues.length - 5} more issues\n`;
            }
        }
        // Add recommendations based on termination reason
        if (sessionState.stagnationInfo?.isStagnant) {
            assessment += `\nRecommendation: ${sessionState.stagnationInfo.recommendation}`;
        }
        else {
            assessment += `\nRecommendation: Consider manual review or alternative approach for remaining issues.`;
        }
        return assessment;
    }
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Create a completion evaluator with custom criteria
 *
 * @param customCriteria Partial criteria to override defaults
 * @returns Configured completion evaluator
 */
export function createCompletionEvaluator(customCriteria) {
    const criteria = customCriteria
        ? { ...DEFAULT_COMPLETION_CRITERIA, ...customCriteria }
        : DEFAULT_COMPLETION_CRITERIA;
    return new CompletionEvaluator(criteria);
}
/**
 * Validate completion criteria configuration
 *
 * @param criteria Criteria to validate
 * @returns Validation result with any errors
 */
export function validateCompletionCriteria(criteria) {
    const errors = [];
    // Validate score ranges
    if (criteria.tier1.score < 0 || criteria.tier1.score > 100) {
        errors.push("Tier 1 score must be between 0 and 100");
    }
    if (criteria.tier2.score < 0 || criteria.tier2.score > 100) {
        errors.push("Tier 2 score must be between 0 and 100");
    }
    if (criteria.tier3.score < 0 || criteria.tier3.score > 100) {
        errors.push("Tier 3 score must be between 0 and 100");
    }
    // Validate loop counts
    if (criteria.tier1.maxLoops < 1) {
        errors.push("Tier 1 maxLoops must be at least 1");
    }
    if (criteria.tier2.maxLoops < criteria.tier1.maxLoops) {
        errors.push("Tier 2 maxLoops must be >= Tier 1 maxLoops");
    }
    if (criteria.tier3.maxLoops < criteria.tier2.maxLoops) {
        errors.push("Tier 3 maxLoops must be >= Tier 2 maxLoops");
    }
    if (criteria.hardStop.maxLoops < criteria.tier3.maxLoops) {
        errors.push("Hard stop maxLoops must be >= Tier 3 maxLoops");
    }
    // Validate score progression (higher tiers should have higher scores)
    if (criteria.tier2.score > criteria.tier1.score) {
        errors.push("Tier 1 score should be >= Tier 2 score");
    }
    if (criteria.tier3.score > criteria.tier2.score) {
        errors.push("Tier 2 score should be >= Tier 3 score");
    }
    // Validate stagnation settings
    if (criteria.stagnationCheck.startLoop < 1) {
        errors.push("Stagnation check startLoop must be at least 1");
    }
    if (criteria.stagnationCheck.similarityThreshold < 0 || criteria.stagnationCheck.similarityThreshold > 1) {
        errors.push("Stagnation similarity threshold must be between 0 and 1");
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=completion-evaluator.js.map