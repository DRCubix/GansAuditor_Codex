/**
 * Testing Quality Assessment (20% weight)
 *
 * This module implements the testing quality assessment as specified
 * in requirement 3.2. It evaluates:
 * - Test coverage analysis
 * - Test quality metrics calculation
 * - Meaningful assertion validation
 * - Test-driven development workflow validation
 */
import type { QualityCriterion, CriterionEvaluation, QualityEvaluationContext } from '../quality-assessment.js';
/**
 * Test coverage analysis result
 */
export interface TestCoverageResult {
    /** Overall coverage percentage (0-100) */
    overallCoverage: number;
    /** Line coverage percentage */
    lineCoverage: number;
    /** Branch coverage percentage */
    branchCoverage: number;
    /** Function coverage percentage */
    functionCoverage: number;
    /** Statement coverage percentage */
    statementCoverage: number;
    /** Coverage by file */
    fileCoverage: FileCoverageDetail[];
    /** Uncovered areas */
    uncoveredAreas: UncoveredArea[];
}
/**
 * File coverage detail
 */
export interface FileCoverageDetail {
    /** File path */
    filePath: string;
    /** Coverage percentage for this file */
    coverage: number;
    /** Number of covered lines */
    coveredLines: number;
    /** Total number of lines */
    totalLines: number;
    /** Uncovered line ranges */
    uncoveredLines: number[];
}
/**
 * Uncovered area detail
 */
export interface UncoveredArea {
    /** File path */
    filePath: string;
    /** Function or method name */
    functionName: string;
    /** Line range */
    lineStart: number;
    lineEnd: number;
    /** Reason for lack of coverage */
    reason: string;
    /** Priority for adding coverage */
    priority: "High" | "Medium" | "Low";
}
/**
 * Test quality metrics result
 */
export interface TestQualityMetricsResult {
    /** Overall test quality score (0-100) */
    overallQuality: number;
    /** Number of test files */
    testFileCount: number;
    /** Total number of tests */
    totalTests: number;
    /** Test structure quality */
    structureQuality: TestStructureQuality;
    /** Assertion quality */
    assertionQuality: AssertionQuality;
    /** Test maintainability score */
    maintainabilityScore: number;
    /** Test performance metrics */
    performanceMetrics: TestPerformanceMetrics;
}
/**
 * Test structure quality metrics
 */
export interface TestStructureQuality {
    /** Percentage of tests with proper setup/teardown */
    setupTeardownUsage: number;
    /** Percentage of tests with clear naming */
    clearNaming: number;
    /** Percentage of tests with proper organization */
    properOrganization: number;
    /** Average test length (lines) */
    averageTestLength: number;
    /** Tests with excessive complexity */
    complexTests: string[];
}
/**
 * Assertion quality metrics
 */
export interface AssertionQuality {
    /** Average assertions per test */
    averageAssertionsPerTest: number;
    /** Percentage of meaningful assertions */
    meaningfulAssertions: number;
    /** Percentage of specific assertions (vs generic) */
    specificAssertions: number;
    /** Tests with weak assertions */
    weakAssertions: WeakAssertion[];
    /** Tests with missing assertions */
    missingAssertions: string[];
}
/**
 * Weak assertion detail
 */
export interface WeakAssertion {
    /** Test name */
    testName: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Assertion type */
    assertionType: string;
    /** Reason it's considered weak */
    weakness: string;
    /** Suggested improvement */
    improvement: string;
}
/**
 * Test performance metrics
 */
export interface TestPerformanceMetrics {
    /** Average test execution time (ms) */
    averageExecutionTime: number;
    /** Slowest tests */
    slowTests: SlowTest[];
    /** Tests with potential performance issues */
    performanceIssues: string[];
}
/**
 * Slow test detail
 */
export interface SlowTest {
    /** Test name */
    testName: string;
    /** Execution time (ms) */
    executionTime: number;
    /** File path */
    filePath: string;
    /** Reason for slowness */
    reason: string;
}
/**
 * TDD workflow validation result
 */
export interface TDDWorkflowResult {
    /** Overall TDD compliance score (0-100) */
    tddCompliance: number;
    /** Evidence of failing tests first */
    failingTestsFirst: TDDEvidence[];
    /** Evidence of red-green-refactor cycle */
    redGreenRefactor: TDDEvidence[];
    /** Test commit history analysis */
    commitHistory: CommitHistoryAnalysis;
    /** TDD violations */
    tddViolations: TDDViolation[];
}
/**
 * TDD evidence
 */
export interface TDDEvidence {
    /** Evidence type */
    type: "failing_test" | "passing_test" | "refactor";
    /** File path */
    filePath: string;
    /** Commit hash or reference */
    commitRef: string;
    /** Timestamp */
    timestamp: number;
    /** Description */
    description: string;
}
/**
 * Commit history analysis for TDD
 */
export interface CommitHistoryAnalysis {
    /** Total commits analyzed */
    totalCommits: number;
    /** Commits following TDD pattern */
    tddCompliantCommits: number;
    /** TDD compliance percentage */
    compliancePercentage: number;
    /** Commit patterns */
    patterns: CommitPattern[];
}
/**
 * Commit pattern
 */
export interface CommitPattern {
    /** Pattern type */
    type: "test_first" | "implementation_first" | "mixed";
    /** Number of occurrences */
    count: number;
    /** Percentage of total */
    percentage: number;
}
/**
 * TDD violation
 */
export interface TDDViolation {
    /** Violation type */
    type: "implementation_without_test" | "test_after_implementation" | "no_failing_test";
    /** File path */
    filePath: string;
    /** Description */
    description: string;
    /** Severity */
    severity: "High" | "Medium" | "Low";
    /** Suggested fix */
    suggestedFix: string;
}
/**
 * Assessor for testing quality dimension
 */
export declare class TestingQualityAssessor {
    /**
     * Evaluate test coverage analysis criterion
     */
    evaluateTestCoverageAnalysis(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate test quality metrics criterion
     */
    evaluateTestQualityMetrics(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate meaningful assertions criterion
     */
    evaluateMeaningfulAssertions(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate TDD workflow validation criterion
     */
    evaluateTDDWorkflowValidation(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Analyze test coverage
     * This is a placeholder implementation - in production, this would:
     * - Run coverage tools (nyc, jest --coverage, etc.)
     * - Parse coverage reports
     * - Identify uncovered areas and their priority
     * - Analyze coverage by file and function
     */
    private analyzeTestCoverage;
    /**
     * Analyze test quality metrics
     * This is a placeholder implementation - in production, this would:
     * - Parse test files to analyze structure
     * - Evaluate assertion quality and specificity
     * - Measure test complexity and maintainability
     * - Analyze test performance characteristics
     */
    private analyzeTestQualityMetrics;
    /**
     * Analyze TDD workflow
     * This is a placeholder implementation - in production, this would:
     * - Analyze git commit history for TDD patterns
     * - Look for test-first commits
     * - Identify red-green-refactor cycles
     * - Check for implementation-without-test violations
     */
    private analyzeTDDWorkflow;
}
/**
 * Create a testing quality assessor
 */
export declare function createTestingQualityAssessor(): TestingQualityAssessor;
//# sourceMappingURL=testing-quality-assessor.d.ts.map