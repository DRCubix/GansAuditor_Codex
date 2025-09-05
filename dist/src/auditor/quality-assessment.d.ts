/**
 * Multi-Dimensional Quality Assessment Framework for GAN Auditor System Prompt
 *
 * This module implements the quality dimension definitions, scoring algorithms,
 * and weighted average calculations as specified in requirements 3.1-3.7.
 *
 * The framework provides:
 * - QualityDimension interface with weight and criteria
 * - Dimensional scoring algorithms (0-100 scale)
 * - Weighted average calculation for overall score
 * - Scoring validation and normalization
 */
/**
 * Individual quality dimension definition with weight and criteria
 * Requirement 3.1: Quality dimension definitions and scoring
 */
export interface QualityDimension {
    /** Unique dimension identifier */
    id: string;
    /** Human-readable dimension name */
    name: string;
    /** Weight for overall score calculation (0-1, sum should equal 1) */
    weight: number;
    /** Description of what this dimension measures */
    description: string;
    /** Specific criteria evaluated in this dimension */
    criteria: QualityCriterion[];
    /** Minimum score threshold for this dimension */
    minThreshold: number;
    /** Whether this dimension is required for ship decision */
    required: boolean;
}
/**
 * Individual quality criterion within a dimension
 */
export interface QualityCriterion {
    /** Unique criterion identifier */
    id: string;
    /** Criterion name */
    name: string;
    /** Detailed description of the criterion */
    description: string;
    /** Weight within the dimension (0-1) */
    weight: number;
    /** Evaluation method for this criterion */
    evaluationMethod: EvaluationMethod;
    /** Expected evidence types for this criterion */
    expectedEvidence: string[];
}
/**
 * Methods for evaluating quality criteria
 */
export type EvaluationMethod = "automated_check" | "manual_review" | "metric_analysis" | "pattern_matching" | "coverage_analysis" | "security_scan";
/**
 * Result of evaluating a single quality criterion
 */
export interface CriterionEvaluation {
    /** Criterion that was evaluated */
    criterion: QualityCriterion;
    /** Score for this criterion (0-100) */
    score: number;
    /** Whether the criterion passed minimum threshold */
    passed: boolean;
    /** Evidence supporting the score */
    evidence: CriterionEvidence[];
    /** Detailed feedback for this criterion */
    feedback: string;
    /** Suggested improvements */
    suggestions: string[];
}
/**
 * Evidence supporting a criterion evaluation
 */
export interface CriterionEvidence {
    /** Type of evidence */
    type: string;
    /** Evidence description */
    description: string;
    /** File location (if applicable) */
    location?: string;
    /** Supporting data or proof */
    proof: string;
    /** Impact on score (positive/negative) */
    impact: "positive" | "negative" | "neutral";
}
/**
 * Result of evaluating a complete quality dimension
 */
export interface DimensionEvaluation {
    /** Dimension that was evaluated */
    dimension: QualityDimension;
    /** Overall score for this dimension (0-100) */
    score: number;
    /** Whether the dimension passed minimum threshold */
    passed: boolean;
    /** Individual criterion evaluations */
    criterionEvaluations: CriterionEvaluation[];
    /** Dimension-level feedback */
    feedback: string;
    /** Priority improvements for this dimension */
    improvements: string[];
}
/**
 * Complete quality assessment result
 */
export interface QualityAssessment {
    /** Overall weighted score (0-100) */
    overallScore: number;
    /** Whether the assessment passes ship criteria */
    passesShipCriteria: boolean;
    /** Individual dimension evaluations */
    dimensionEvaluations: DimensionEvaluation[];
    /** Assessment timestamp */
    timestamp: number;
    /** Assessment duration in milliseconds */
    duration: number;
    /** Critical issues that must be addressed */
    criticalIssues: CriticalIssue[];
    /** Executive summary of the assessment */
    executiveSummary: string;
    /** Next recommended actions */
    nextActions: string[];
}
/**
 * Critical issue that blocks shipping
 */
export interface CriticalIssue {
    /** Issue identifier */
    id: string;
    /** Issue title */
    title: string;
    /** Detailed description */
    description: string;
    /** Affected dimension */
    dimension: string;
    /** File location */
    location: string;
    /** Severity level */
    severity: "Critical" | "Major" | "Minor";
    /** Blocking reason */
    blockingReason: string;
    /** Suggested fix */
    suggestedFix: string;
}
/**
 * Multi-dimensional quality assessment framework
 * Implements the 6-dimension quality model with weighted scoring
 */
export declare class QualityAssessmentFramework {
    private dimensions;
    private config;
    constructor(dimensions?: QualityDimension[], config?: Partial<QualityFrameworkConfig>);
    /**
     * Evaluate code quality across all dimensions
     */
    evaluateQuality(code: string, context: QualityEvaluationContext): Promise<QualityAssessment>;
    /**
     * Evaluate a single quality dimension
     */
    private evaluateDimension;
    /**
     * Evaluate a single quality criterion
     */
    private evaluateCriterion;
    /**
     * Calculate weighted average score from dimension evaluations
     */
    private calculateWeightedScore;
    /**
     * Calculate weighted average score from criterion evaluations
     */
    private calculateCriterionWeightedScore;
    /**
     * Validate that dimensions are properly configured
     */
    private validateDimensions;
    /**
     * Validate a single dimension configuration
     */
    private validateDimension;
    /**
     * Evaluate whether code passes ship criteria
     */
    private evaluateShipCriteria;
    /**
     * Extract critical issues from dimension evaluation
     */
    private extractCriticalIssues;
    /**
     * Generate executive summary of the assessment
     */
    private generateExecutiveSummary;
    /**
     * Generate next recommended actions
     */
    private generateNextActions;
    /**
     * Generate feedback for a dimension
     */
    private generateDimensionFeedback;
    /**
     * Generate improvement suggestions for a dimension
     */
    private generateDimensionImprovements;
}
/**
 * Configuration for the quality assessment framework
 */
export interface QualityFrameworkConfig {
    /** Overall score threshold for shipping (0-100) */
    shipScoreThreshold: number;
    /** Individual criterion pass threshold (0-100) */
    criterionPassThreshold: number;
    /** Maximum number of critical issues allowed */
    maxCriticalIssues: number;
    /** Whether to require all dimensions to pass */
    requireAllDimensions: boolean;
}
/**
 * Context for quality evaluation
 */
export interface QualityEvaluationContext {
    /** File paths being evaluated */
    filePaths: string[];
    /** Repository context */
    repositoryPath: string;
    /** Spec documents */
    specDocuments?: string[];
    /** Steering documents */
    steeringDocuments?: string[];
    /** Previous audit results */
    previousResults?: any[];
    /** Session information */
    sessionId?: string;
}
/**
 * Default quality framework configuration
 */
export declare const DEFAULT_QUALITY_FRAMEWORK_CONFIG: QualityFrameworkConfig;
/**
 * Default quality dimensions implementing the 6-dimension quality model
 * with weights as specified in requirements 3.1-3.7
 */
export declare const DEFAULT_QUALITY_DIMENSIONS: QualityDimension[];
/**
 * Create a quality assessment framework with default dimensions
 */
export declare function createDefaultQualityFramework(config?: Partial<QualityFrameworkConfig>): QualityAssessmentFramework;
/**
 * Validate quality dimension configuration
 */
export declare function validateQualityDimensions(dimensions: QualityDimension[]): string[];
/**
 * Validate a single quality dimension
 */
export declare function validateQualityDimension(dimension: QualityDimension): string[];
/**
 * Get quality dimension by ID
 */
export declare function getQualityDimensionById(dimensions: QualityDimension[], id: string): QualityDimension | undefined;
/**
 * Get quality criterion by ID within a dimension
 */
export declare function getQualityCriterionById(dimension: QualityDimension, id: string): QualityCriterion | undefined;
/**
 * Calculate score distribution across dimensions
 */
export declare function calculateScoreDistribution(assessment: QualityAssessment): Record<string, number>;
/**
 * Get failing dimensions from assessment
 */
export declare function getFailingDimensions(assessment: QualityAssessment): DimensionEvaluation[];
/**
 * Get critical issues by dimension
 */
export declare function getCriticalIssuesByDimension(assessment: QualityAssessment): Record<string, CriticalIssue[]>;
//# sourceMappingURL=quality-assessment.d.ts.map