/**
 * VERDICT Step Implementation
 *
 * This module implements the VERDICT step of the audit workflow, which handles:
 * - Dimensional scoring calculation
 * - Overall verdict determination logic
 * - Structured feedback generation
 * - Evidence-based decision documentation
 *
 * Requirements: 2.8
 */
import { EvidenceItem } from '../workflow-types.js';
/**
 * Execute the VERDICT step of the audit workflow
 */
export declare function executeVerdictStep(inputs: VerdictStepInputs, outputs: Record<string, any>, evidence: EvidenceItem[]): Promise<void>;
/**
 * Input parameters for VERDICT step
 */
export interface VerdictStepInputs {
    /** Workspace root path */
    workspacePath: string;
    /** All evidence collected from previous steps */
    allEvidence: EvidenceItem[];
    /** Results from all previous workflow steps */
    workflowResults: Record<string, any>;
    /** Current iteration number */
    iteration?: number;
    /** Previous audit results for comparison */
    previousResults?: any[];
    /** Quality thresholds configuration */
    qualityThresholds?: QualityThresholds;
}
/**
 * Output from VERDICT step
 */
export interface VerdictStepOutputs {
    /** Dimensional quality scores */
    dimensionalScores: DimensionalScore[];
    /** Overall verdict decision */
    overallVerdict: OverallVerdict;
    /** Structured feedback summary */
    structuredFeedback: StructuredFeedback;
    /** Evidence-based decision documentation */
    decisionDocumentation: DecisionDocumentation;
}
/**
 * Individual dimensional score
 */
export interface DimensionalScore {
    /** Dimension name */
    name: string;
    /** Score (0-100) */
    score: number;
    /** Weight in overall calculation */
    weight: number;
    /** Weighted contribution to overall score */
    weightedScore: number;
    /** Issues found in this dimension */
    issues: DimensionIssue[];
    /** Recommendations for improvement */
    recommendations: string[];
}
/**
 * Issue within a quality dimension
 */
export interface DimensionIssue {
    /** Issue severity */
    severity: 'Critical' | 'Major' | 'Minor';
    /** Issue description */
    description: string;
    /** Impact on score */
    impact: number;
    /** Location of issue */
    location: string;
}
/**
 * Overall verdict decision
 */
export interface OverallVerdict {
    /** Final decision */
    decision: 'ship' | 'revise' | 'reject';
    /** Overall quality score (0-100) */
    overallScore: number;
    /** Confidence in the decision (0-100) */
    confidence: number;
    /** Primary reasons for the decision */
    reasons: string[];
    /** Critical blockers if any */
    blockers: string[];
    /** Next recommended actions */
    nextActions: string[];
}
/**
 * Structured feedback summary
 */
export interface StructuredFeedback {
    /** Executive summary (3-6 bullet points) */
    executiveSummary: string[];
    /** Detailed findings by category */
    detailedFindings: CategoryFindings[];
    /** Priority recommendations */
    priorityRecommendations: PriorityRecommendation[];
    /** Success highlights */
    successHighlights: string[];
    /** Areas for improvement */
    improvementAreas: string[];
}
/**
 * Findings within a category
 */
export interface CategoryFindings {
    /** Category name */
    category: string;
    /** Score for this category */
    score: number;
    /** Issues found */
    issues: string[];
    /** Recommendations */
    recommendations: string[];
    /** Status */
    status: 'excellent' | 'good' | 'acceptable' | 'needs-work' | 'poor';
}
/**
 * Priority recommendation
 */
export interface PriorityRecommendation {
    /** Priority level */
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    /** Recommendation text */
    recommendation: string;
    /** Expected impact */
    impact: string;
    /** Estimated effort */
    effort: 'Low' | 'Medium' | 'High';
}
/**
 * Evidence-based decision documentation
 */
export interface DecisionDocumentation {
    /** Decision timestamp */
    timestamp: string;
    /** Audit iteration */
    iteration: number;
    /** Total evidence items analyzed */
    evidenceCount: number;
    /** Evidence breakdown by severity */
    evidenceBreakdown: EvidenceBreakdown;
    /** Decision rationale */
    rationale: string;
    /** Supporting evidence */
    supportingEvidence: string[];
    /** Risk assessment */
    riskAssessment: RiskAssessment;
    /** Quality progression (if multiple iterations) */
    qualityProgression?: QualityProgression;
}
/**
 * Evidence breakdown by severity
 */
export interface EvidenceBreakdown {
    /** Number of critical issues */
    critical: number;
    /** Number of major issues */
    major: number;
    /** Number of minor issues */
    minor: number;
    /** Total issues */
    total: number;
}
/**
 * Risk assessment
 */
export interface RiskAssessment {
    /** Overall risk level */
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    /** Risk factors */
    riskFactors: string[];
    /** Mitigation strategies */
    mitigationStrategies: string[];
}
/**
 * Quality progression tracking
 */
export interface QualityProgression {
    /** Previous iteration score */
    previousScore: number;
    /** Current iteration score */
    currentScore: number;
    /** Score improvement */
    improvement: number;
    /** Trend direction */
    trend: 'improving' | 'stable' | 'declining';
}
/**
 * Quality thresholds configuration
 */
export interface QualityThresholds {
    /** Minimum score for ship decision */
    shipThreshold: number;
    /** Minimum score for revise decision */
    reviseThreshold: number;
    /** Maximum critical issues allowed */
    maxCriticalIssues: number;
    /** Maximum major issues allowed */
    maxMajorIssues: number;
}
/**
 * Default VERDICT step inputs
 */
export declare const DEFAULT_VERDICT_INPUTS: Partial<VerdictStepInputs>;
//# sourceMappingURL=verdict-step.d.ts.map