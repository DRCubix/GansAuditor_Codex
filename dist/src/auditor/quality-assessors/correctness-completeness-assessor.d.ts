/**
 * Correctness and Completeness Assessment (30% weight)
 *
 * This module implements the correctness and completeness assessment as specified
 * in requirement 3.1. It evaluates:
 * - AC fulfillment validation
 * - Edge case coverage analysis
 * - Error path validation
 * - Idempotency checking where required
 */
import type { QualityCriterion, CriterionEvaluation, QualityEvaluationContext } from '../quality-assessment.js';
/**
 * Acceptance criteria fulfillment result
 */
export interface ACFulfillmentResult {
    /** Total number of acceptance criteria */
    totalACs: number;
    /** Number of fulfilled ACs */
    fulfilledACs: number;
    /** Fulfillment percentage (0-100) */
    fulfillmentPercentage: number;
    /** Details of each AC */
    acDetails: ACDetail[];
    /** Missing implementations */
    missingImplementations: string[];
}
/**
 * Individual acceptance criteria detail
 */
export interface ACDetail {
    /** AC identifier */
    id: string;
    /** AC description */
    description: string;
    /** Whether this AC is fulfilled */
    isFulfilled: boolean;
    /** Evidence of fulfillment */
    evidence: string[];
    /** Related implementation files */
    implementationFiles: string[];
    /** Related test files */
    testFiles: string[];
    /** Confidence score (0-100) */
    confidence: number;
}
/**
 * Edge case coverage analysis result
 */
export interface EdgeCaseCoverageResult {
    /** Total edge cases identified */
    totalEdgeCases: number;
    /** Number of covered edge cases */
    coveredEdgeCases: number;
    /** Coverage percentage (0-100) */
    coveragePercentage: number;
    /** Edge case details */
    edgeCaseDetails: EdgeCaseDetail[];
    /** Uncovered edge cases */
    uncoveredEdgeCases: string[];
}
/**
 * Individual edge case detail
 */
export interface EdgeCaseDetail {
    /** Edge case identifier */
    id: string;
    /** Edge case description */
    description: string;
    /** Whether this edge case is covered */
    isCovered: boolean;
    /** Test coverage evidence */
    testEvidence: string[];
    /** Implementation evidence */
    implementationEvidence: string[];
    /** Risk level if uncovered */
    riskLevel: "High" | "Medium" | "Low";
}
/**
 * Error path validation result
 */
export interface ErrorPathValidationResult {
    /** Total error paths identified */
    totalErrorPaths: number;
    /** Number of validated error paths */
    validatedErrorPaths: number;
    /** Validation percentage (0-100) */
    validationPercentage: number;
    /** Error path details */
    errorPathDetails: ErrorPathDetail[];
    /** Unhandled error scenarios */
    unhandledErrors: string[];
}
/**
 * Individual error path detail
 */
export interface ErrorPathDetail {
    /** Error path identifier */
    id: string;
    /** Error scenario description */
    scenario: string;
    /** Whether error is properly handled */
    isHandled: boolean;
    /** Error handling mechanism */
    handlingMechanism: string;
    /** Test coverage for error path */
    testCoverage: string[];
    /** Graceful degradation evidence */
    gracefulDegradation: boolean;
}
/**
 * Idempotency checking result
 */
export interface IdempotencyCheckResult {
    /** Total operations requiring idempotency */
    totalOperations: number;
    /** Number of idempotent operations */
    idempotentOperations: number;
    /** Idempotency percentage (0-100) */
    idempotencyPercentage: number;
    /** Operation details */
    operationDetails: IdempotencyDetail[];
    /** Non-idempotent operations */
    nonIdempotentOperations: string[];
}
/**
 * Individual idempotency detail
 */
export interface IdempotencyDetail {
    /** Operation identifier */
    id: string;
    /** Operation description */
    description: string;
    /** Whether operation is idempotent */
    isIdempotent: boolean;
    /** Idempotency mechanism */
    mechanism: string;
    /** Test evidence */
    testEvidence: string[];
    /** State validation evidence */
    stateValidation: string[];
}
/**
 * Assessor for correctness and completeness quality dimension
 */
export declare class CorrectnessCompletenessAssessor {
    /**
     * Evaluate AC fulfillment criterion
     */
    evaluateACFulfillment(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate edge case coverage criterion
     */
    evaluateEdgeCaseCoverage(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate error path validation criterion
     */
    evaluateErrorPathValidation(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate idempotency checking criterion
     */
    evaluateIdempotencyChecking(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Analyze acceptance criteria fulfillment
     * This is a placeholder implementation - in production, this would:
     * - Parse Spec documents to extract ACs
     * - Map ACs to implementation files
     * - Verify test coverage for each AC
     * - Check for missing implementations
     */
    private analyzeACFulfillment;
    /**
     * Analyze edge case coverage
     * This is a placeholder implementation - in production, this would:
     * - Identify potential edge cases from code analysis
     * - Check test coverage for boundary conditions
     * - Analyze input validation patterns
     * - Assess risk levels for uncovered cases
     */
    private analyzeEdgeCaseCoverage;
    /**
     * Analyze error path validation
     * This is a placeholder implementation - in production, this would:
     * - Identify error conditions from code analysis
     * - Check error handling mechanisms
     * - Verify test coverage for error paths
     * - Assess graceful degradation patterns
     */
    private analyzeErrorPathValidation;
    /**
     * Analyze idempotency checking
     * This is a placeholder implementation - in production, this would:
     * - Identify state-changing operations
     * - Check for idempotency mechanisms
     * - Verify duplicate operation handling
     * - Assess state validation patterns
     */
    private analyzeIdempotencyChecking;
}
/**
 * Create a correctness and completeness assessor
 */
export declare function createCorrectnessCompletenessAssessor(): CorrectnessCompletenessAssessor;
//# sourceMappingURL=correctness-completeness-assessor.d.ts.map