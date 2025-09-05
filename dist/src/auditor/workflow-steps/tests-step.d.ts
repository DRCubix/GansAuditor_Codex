/**
 * TESTS Step Implementation
 *
 * This module implements the TESTS step of the audit workflow, which handles:
 * - Test suite execution logic
 * - Coverage gap identification
 * - Focused test creation suggestions
 * - Test quality validation metrics
 *
 * Requirements: 2.4
 */
import { EvidenceItem } from '../workflow-types.js';
/**
 * Execute the TESTS step of the audit workflow
 */
export declare function executeTestsStep(inputs: TestsStepInputs, outputs: Record<string, any>, evidence: EvidenceItem[]): Promise<void>;
/**
 * Input parameters for TESTS step
 */
export interface TestsStepInputs {
    /** Workspace root path */
    workspacePath: string;
    /** Touched files from INIT step */
    touchedFiles?: string[];
    /** Test command to run */
    testCommand?: string;
    /** Coverage command to run */
    coverageCommand?: string;
    /** Test framework (jest, vitest, mocha, etc.) */
    testFramework?: string;
    /** Test directories to scan */
    testDirectories?: string[];
}
/**
 * Output from TESTS step
 */
export interface TestsStepOutputs {
    /** Results from test execution */
    testResults: TestResult[];
    /** Identified coverage gaps */
    coverageGaps: CoverageGap[];
    /** Suggested tests to add */
    suggestedTests: string[];
    /** Test quality metrics */
    testQualityMetrics: TestQualityMetrics;
}
/**
 * Individual test result
 */
export interface TestResult {
    /** Test file path */
    file: string;
    /** Test name/description */
    name: string;
    /** Test status */
    status: 'passed' | 'failed' | 'skipped';
    /** Execution duration in milliseconds */
    duration: number;
    /** Error message if failed */
    error?: string;
    /** Test type */
    type: 'unit' | 'integration' | 'e2e';
}
/**
 * Coverage gap information
 */
export interface CoverageGap {
    /** Source file with coverage gap */
    file: string;
    /** Uncovered line numbers */
    uncoveredLines: number[];
    /** Coverage percentage for this file */
    coverage: number;
    /** Functions/methods not covered */
    uncoveredFunctions: string[];
}
/**
 * Test quality metrics
 */
export interface TestQualityMetrics {
    /** Total number of tests */
    totalTests: number;
    /** Number of passing tests */
    passingTests: number;
    /** Number of failing tests */
    failingTests: number;
    /** Number of skipped tests */
    skippedTests: number;
    /** Overall test coverage percentage */
    coverage: number;
    /** Line coverage percentage */
    lineCoverage: number;
    /** Branch coverage percentage */
    branchCoverage: number;
    /** Function coverage percentage */
    functionCoverage: number;
    /** Average test execution time */
    averageTestTime: number;
    /** Test files count */
    testFilesCount: number;
}
/**
 * Default TESTS step inputs
 */
export declare const DEFAULT_TESTS_INPUTS: Partial<TestsStepInputs>;
//# sourceMappingURL=tests-step.d.ts.map