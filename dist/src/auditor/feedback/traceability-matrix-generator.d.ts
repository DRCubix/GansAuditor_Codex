/**
 * Traceability Matrix Generator for GAN Auditor System Prompt
 *
 * This module implements traceability matrix generation with AC to implementation
 * file mapping, test file coverage tracking, unmet AC identification, and missing
 * test detection as specified in requirement 5.5.
 *
 * Requirements addressed:
 * - 5.5: Traceability matrix generation
 * - Create AC to implementation file mapping
 * - Add test file coverage tracking
 * - Implement unmet AC identification
 * - Add missing test detection and reporting
 */
import type { TraceabilityMatrix, LineRange, TestCaseType } from '../../types/feedback-types.js';
import type { AcceptanceCriterion } from '../workflow-types.js';
import type { WorkflowStepResult } from '../workflow-types.js';
/**
 * Configuration for traceability matrix generation
 */
export interface TraceabilityMatrixConfig {
    /** Maximum number of ACs to analyze */
    maxAcceptanceCriteria: number;
    /** Confidence threshold for AC mapping */
    mappingConfidenceThreshold: number;
    /** Include implementation details */
    includeImplementationDetails: boolean;
    /** Test file patterns */
    testFilePatterns: string[];
    /** Source file patterns */
    sourceFilePatterns: string[];
    /** Analysis depth for code scanning */
    analysisDepth: AnalysisDepth;
}
/**
 * Analysis depth configuration
 */
export interface AnalysisDepth {
    /** Scan function/method level */
    functionLevel: boolean;
    /** Scan class level */
    classLevel: boolean;
    /** Scan module level */
    moduleLevel: boolean;
    /** Include comments and documentation */
    includeComments: boolean;
}
/**
 * Context for traceability matrix generation
 */
export interface TraceabilityMatrixContext {
    /** Acceptance criteria from INIT step */
    acceptanceCriteria: AcceptanceCriterion[];
    /** Workflow step results */
    workflowResults: WorkflowStepResult[];
    /** Repository file structure */
    fileStructure: FileStructureInfo;
    /** Code analysis results */
    codeAnalysis?: CodeAnalysisResult;
    /** Test analysis results */
    testAnalysis?: TestAnalysisResult;
    /** Session information */
    sessionId?: string;
}
/**
 * File structure information
 */
export interface FileStructureInfo {
    /** Repository root path */
    rootPath: string;
    /** Source files */
    sourceFiles: string[];
    /** Test files */
    testFiles: string[];
    /** Configuration files */
    configFiles: string[];
    /** Documentation files */
    docFiles: string[];
}
/**
 * Code analysis result
 */
export interface CodeAnalysisResult {
    /** File analysis results */
    files: FileAnalysisResult[];
    /** Function/method mappings */
    functions: FunctionMapping[];
    /** Class mappings */
    classes: ClassMapping[];
    /** Module mappings */
    modules: ModuleMapping[];
}
/**
 * File analysis result
 */
export interface FileAnalysisResult {
    /** File path */
    filePath: string;
    /** File content hash */
    contentHash: string;
    /** Functions defined in file */
    functions: FunctionInfo[];
    /** Classes defined in file */
    classes: ClassInfo[];
    /** Imports and exports */
    dependencies: DependencyInfo[];
    /** Comments and documentation */
    documentation: DocumentationInfo[];
}
/**
 * Function information
 */
export interface FunctionInfo {
    /** Function name */
    name: string;
    /** Line range */
    lineRange: LineRange;
    /** Parameters */
    parameters: string[];
    /** Return type */
    returnType?: string;
    /** Documentation */
    documentation?: string;
    /** Complexity score */
    complexity?: number;
}
/**
 * Class information
 */
export interface ClassInfo {
    /** Class name */
    name: string;
    /** Line range */
    lineRange: LineRange;
    /** Methods */
    methods: FunctionInfo[];
    /** Properties */
    properties: PropertyInfo[];
    /** Documentation */
    documentation?: string;
}
/**
 * Property information
 */
export interface PropertyInfo {
    /** Property name */
    name: string;
    /** Property type */
    type?: string;
    /** Line number */
    line: number;
    /** Documentation */
    documentation?: string;
}
/**
 * Dependency information
 */
export interface DependencyInfo {
    /** Import/export type */
    type: "import" | "export";
    /** Module name */
    module: string;
    /** Imported/exported items */
    items: string[];
    /** Line number */
    line: number;
}
/**
 * Documentation information
 */
export interface DocumentationInfo {
    /** Documentation type */
    type: "comment" | "docstring" | "jsdoc";
    /** Content */
    content: string;
    /** Line range */
    lineRange: LineRange;
    /** Associated code element */
    associatedElement?: string;
}
/**
 * Function mapping
 */
export interface FunctionMapping {
    /** Function name */
    name: string;
    /** File path */
    filePath: string;
    /** Line range */
    lineRange: LineRange;
    /** Related ACs */
    relatedACs: string[];
    /** Confidence score */
    confidence: number;
}
/**
 * Class mapping
 */
export interface ClassMapping {
    /** Class name */
    name: string;
    /** File path */
    filePath: string;
    /** Line range */
    lineRange: LineRange;
    /** Related ACs */
    relatedACs: string[];
    /** Confidence score */
    confidence: number;
}
/**
 * Module mapping
 */
export interface ModuleMapping {
    /** Module name */
    name: string;
    /** File path */
    filePath: string;
    /** Related ACs */
    relatedACs: string[];
    /** Confidence score */
    confidence: number;
}
/**
 * Test analysis result
 */
export interface TestAnalysisResult {
    /** Test files */
    testFiles: TestFileAnalysis[];
    /** Test suites */
    testSuites: TestSuiteInfo[];
    /** Coverage information */
    coverage: CoverageInfo;
}
/**
 * Test file analysis
 */
export interface TestFileAnalysis {
    /** File path */
    filePath: string;
    /** Test cases */
    testCases: TestCaseInfo[];
    /** Test suites */
    testSuites: string[];
    /** Covered source files */
    coveredFiles: string[];
}
/**
 * Test case information
 */
export interface TestCaseInfo {
    /** Test name */
    name: string;
    /** Test type */
    type: TestCaseType;
    /** Line range */
    lineRange: LineRange;
    /** Description */
    description?: string;
    /** Related ACs */
    relatedACs: string[];
    /** Confidence score */
    confidence: number;
}
/**
 * Test suite information
 */
export interface TestSuiteInfo {
    /** Suite name */
    name: string;
    /** File path */
    filePath: string;
    /** Test cases */
    testCases: TestCaseInfo[];
    /** Related ACs */
    relatedACs: string[];
}
/**
 * Coverage information
 */
export interface CoverageInfo {
    /** Overall coverage percentage */
    overall: number;
    /** Line coverage */
    lines: number;
    /** Branch coverage */
    branches: number;
    /** Function coverage */
    functions: number;
    /** File-specific coverage */
    files: FileCoverageInfo[];
}
/**
 * File coverage information
 */
export interface FileCoverageInfo {
    /** File path */
    filePath: string;
    /** Coverage percentage */
    coverage: number;
    /** Covered lines */
    coveredLines: number[];
    /** Uncovered lines */
    uncoveredLines: number[];
}
/**
 * Generates comprehensive traceability matrices mapping ACs to implementation and tests
 */
export declare class TraceabilityMatrixGenerator {
    private config;
    constructor(config?: Partial<TraceabilityMatrixConfig>);
    /**
     * Generate traceability matrix from acceptance criteria and code analysis
     */
    generateTraceabilityMatrix(context: TraceabilityMatrixContext): Promise<TraceabilityMatrix>;
    /**
     * Create acceptance criteria mappings to implementation and tests
     */
    private createAcceptanceCriteriaMappings;
    /**
     * Find implementation files related to an acceptance criterion
     */
    private findImplementationFiles;
    /**
     * Find test files related to an acceptance criterion
     */
    private findTestFiles;
    /**
     * Find implementation mappings using code analysis
     */
    private findImplementationMappings;
    /**
     * Find test mappings using test analysis
     */
    private findTestMappings;
    /**
     * Find implementation files by keyword matching
     */
    private findImplementationByKeywords;
    /**
     * Find test files by keyword matching
     */
    private findTestsByKeywords;
    /**
     * Determine coverage status for an AC mapping
     */
    private determineCoverageStatus;
    /**
     * Generate coverage summary statistics
     */
    private generateCoverageSummary;
    /**
     * Identify unmet acceptance criteria
     */
    private identifyUnmetAcceptanceCriteria;
    /**
     * Identify missing tests
     */
    private identifyMissingTests;
    /**
     * Generate metadata for the traceability matrix
     */
    private generateMetadata;
    private calculateMappingConfidence;
    private calculateKeywordConfidence;
    private extractKeywords;
    private isStopWord;
    private calculateKeywordOverlap;
    private calculateTestCoverage;
    private determineUnmetReason;
    private generateImplementationSuggestion;
    private determineUnmetPriority;
    private determineRequiredTestType;
    private suggestTestFile;
    private determineTestPriority;
}
/**
 * Default configuration for traceability matrix generation
 */
export declare const DEFAULT_TRACEABILITY_MATRIX_CONFIG: TraceabilityMatrixConfig;
/**
 * Create traceability matrix generator with default configuration
 */
export declare function createTraceabilityMatrixGenerator(config?: Partial<TraceabilityMatrixConfig>): TraceabilityMatrixGenerator;
/**
 * Validate traceability matrix structure
 */
export declare function validateTraceabilityMatrix(matrix: TraceabilityMatrix): string[];
//# sourceMappingURL=traceability-matrix-generator.d.ts.map