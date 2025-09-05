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

import type {
  TraceabilityMatrix,
  TraceabilityMatrixMetadata,
  AcceptanceCriteriaMapping,
  CoverageSummary,
  UnmetAcceptanceCriteria,
  MissingTest,
  ImplementationFile,
  TestFile,
  TestCase,
  LineRange,
  CoverageStatus,
  TestCaseType
} from '../../types/feedback-types.js';

import type {
  AcceptanceCriterion,
  InitStepOutputs
} from '../workflow-types.js';

import type {
  WorkflowStepResult
} from '../workflow-types.js';

// ============================================================================
// Traceability Matrix Generator Configuration
// ============================================================================

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

// ============================================================================
// Traceability Matrix Generator Implementation
// ============================================================================

/**
 * Generates comprehensive traceability matrices mapping ACs to implementation and tests
 */
export class TraceabilityMatrixGenerator {
  private config: TraceabilityMatrixConfig;

  constructor(config?: Partial<TraceabilityMatrixConfig>) {
    this.config = {
      ...DEFAULT_TRACEABILITY_MATRIX_CONFIG,
      ...config
    };
  }

  /**
   * Generate traceability matrix from acceptance criteria and code analysis
   */
  async generateTraceabilityMatrix(context: TraceabilityMatrixContext): Promise<TraceabilityMatrix> {
    // Generate metadata
    const metadata = this.generateMetadata(context);

    // Create AC mappings
    const acMappings = await this.createAcceptanceCriteriaMappings(context);

    // Generate coverage summary
    const coverageSummary = this.generateCoverageSummary(acMappings);

    // Identify unmet ACs
    const unmetACs = this.identifyUnmetAcceptanceCriteria(acMappings, context);

    // Identify missing tests
    const missingTests = this.identifyMissingTests(acMappings, context);

    return {
      metadata,
      acMappings,
      coverageSummary,
      unmetACs,
      missingTests
    };
  }

  /**
   * Create acceptance criteria mappings to implementation and tests
   */
  private async createAcceptanceCriteriaMappings(
    context: TraceabilityMatrixContext
  ): Promise<AcceptanceCriteriaMapping[]> {
    const mappings: AcceptanceCriteriaMapping[] = [];

    for (const ac of context.acceptanceCriteria.slice(0, this.config.maxAcceptanceCriteria)) {
      // Find implementation files
      const implementationFiles = await this.findImplementationFiles(ac, context);

      // Find test files
      const testFiles = await this.findTestFiles(ac, context);

      // Determine coverage status
      const coverageStatus = this.determineCoverageStatus(implementationFiles, testFiles);

      mappings.push({
        acId: ac.id,
        acDescription: ac.description,
        implementationFiles,
        testFiles,
        coverageStatus
      });
    }

    return mappings;
  }

  /**
   * Find implementation files related to an acceptance criterion
   */
  private async findImplementationFiles(
    ac: AcceptanceCriterion,
    context: TraceabilityMatrixContext
  ): Promise<ImplementationFile[]> {
    const implementationFiles: ImplementationFile[] = [];

    // Use code analysis if available
    if (context.codeAnalysis) {
      const mappings = this.findImplementationMappings(ac, context.codeAnalysis);
      
      for (const mapping of mappings) {
        if (mapping.confidence >= this.config.mappingConfidenceThreshold) {
          implementationFiles.push({
            filePath: mapping.filePath,
            lineRanges: [mapping.lineRange],
            confidence: mapping.confidence,
            notes: `Mapped via ${mapping.type} analysis`
          });
        }
      }
    }

    // Fallback to keyword-based file search
    if (implementationFiles.length === 0) {
      const keywordMappings = await this.findImplementationByKeywords(ac, context);
      implementationFiles.push(...keywordMappings);
    }

    return implementationFiles;
  }

  /**
   * Find test files related to an acceptance criterion
   */
  private async findTestFiles(
    ac: AcceptanceCriterion,
    context: TraceabilityMatrixContext
  ): Promise<TestFile[]> {
    const testFiles: TestFile[] = [];

    // Use test analysis if available
    if (context.testAnalysis) {
      const testMappings = this.findTestMappings(ac, context.testAnalysis);
      
      for (const mapping of testMappings) {
        const testCases = mapping.testCases.map(tc => ({
          name: tc.name,
          lineRange: tc.lineRange,
          type: tc.type
        }));

        testFiles.push({
          filePath: mapping.filePath,
          testCases,
          coverage: this.calculateTestCoverage(mapping, context)
        });
      }
    }

    // Fallback to keyword-based test search
    if (testFiles.length === 0) {
      const keywordTestMappings = await this.findTestsByKeywords(ac, context);
      testFiles.push(...keywordTestMappings);
    }

    return testFiles;
  }

  /**
   * Find implementation mappings using code analysis
   */
  private findImplementationMappings(
    ac: AcceptanceCriterion,
    codeAnalysis: CodeAnalysisResult
  ): Array<{ filePath: string; lineRange: LineRange; confidence: number; type: string }> {
    const mappings: Array<{ filePath: string; lineRange: LineRange; confidence: number; type: string }> = [];

    // Search in function mappings
    for (const funcMapping of codeAnalysis.functions) {
      const confidence = this.calculateMappingConfidence(ac, funcMapping.name, funcMapping.relatedACs);
      if (confidence > 0) {
        mappings.push({
          filePath: funcMapping.filePath,
          lineRange: funcMapping.lineRange,
          confidence,
          type: "function"
        });
      }
    }

    // Search in class mappings
    for (const classMapping of codeAnalysis.classes) {
      const confidence = this.calculateMappingConfidence(ac, classMapping.name, classMapping.relatedACs);
      if (confidence > 0) {
        mappings.push({
          filePath: classMapping.filePath,
          lineRange: classMapping.lineRange,
          confidence,
          type: "class"
        });
      }
    }

    // Search in module mappings
    for (const moduleMapping of codeAnalysis.modules) {
      const confidence = this.calculateMappingConfidence(ac, moduleMapping.name, moduleMapping.relatedACs);
      if (confidence > 0) {
        mappings.push({
          filePath: moduleMapping.filePath,
          lineRange: { start: 1, end: 1 }, // Module level
          confidence,
          type: "module"
        });
      }
    }

    return mappings.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find test mappings using test analysis
   */
  private findTestMappings(
    ac: AcceptanceCriterion,
    testAnalysis: TestAnalysisResult
  ): TestFileAnalysis[] {
    const mappings: TestFileAnalysis[] = [];

    for (const testFile of testAnalysis.testFiles) {
      const relatedTestCases = testFile.testCases.filter(tc => 
        tc.relatedACs.includes(ac.id) || 
        this.calculateMappingConfidence(ac, tc.name, tc.relatedACs) >= this.config.mappingConfidenceThreshold
      );

      if (relatedTestCases.length > 0) {
        mappings.push({
          ...testFile,
          testCases: relatedTestCases
        });
      }
    }

    return mappings;
  }

  /**
   * Find implementation files by keyword matching
   */
  private async findImplementationByKeywords(
    ac: AcceptanceCriterion,
    context: TraceabilityMatrixContext
  ): Promise<ImplementationFile[]> {
    const implementationFiles: ImplementationFile[] = [];
    const keywords = this.extractKeywords(ac.description);

    for (const filePath of context.fileStructure.sourceFiles) {
      const confidence = this.calculateKeywordConfidence(keywords, filePath);
      
      if (confidence >= this.config.mappingConfidenceThreshold) {
        implementationFiles.push({
          filePath,
          lineRanges: [{ start: 1, end: 1 }], // Placeholder
          confidence,
          notes: "Mapped via keyword analysis"
        });
      }
    }

    return implementationFiles;
  }

  /**
   * Find test files by keyword matching
   */
  private async findTestsByKeywords(
    ac: AcceptanceCriterion,
    context: TraceabilityMatrixContext
  ): Promise<TestFile[]> {
    const testFiles: TestFile[] = [];
    const keywords = this.extractKeywords(ac.description);

    for (const filePath of context.fileStructure.testFiles) {
      const confidence = this.calculateKeywordConfidence(keywords, filePath);
      
      if (confidence >= this.config.mappingConfidenceThreshold) {
        testFiles.push({
          filePath,
          testCases: [{
            name: `Test for ${ac.id}`,
            lineRange: { start: 1, end: 1 },
            type: "acceptance"
          }],
          coverage: confidence
        });
      }
    }

    return testFiles;
  }

  /**
   * Determine coverage status for an AC mapping
   */
  private determineCoverageStatus(
    implementationFiles: ImplementationFile[],
    testFiles: TestFile[]
  ): CoverageStatus {
    const hasImplementation = implementationFiles.length > 0;
    const hasTests = testFiles.length > 0;

    if (!hasImplementation && !hasTests) {
      return "not_covered";
    }

    if (hasImplementation && hasTests) {
      // Check if tests adequately cover implementation
      const avgTestCoverage = testFiles.reduce((sum, tf) => sum + tf.coverage, 0) / testFiles.length;
      
      if (avgTestCoverage >= 80) {
        return "fully_covered";
      } else if (avgTestCoverage >= 50) {
        return "partially_covered";
      } else {
        return "not_covered";
      }
    }

    if (hasImplementation && !hasTests) {
      return "not_covered";
    }

    if (!hasImplementation && hasTests) {
      return "over_covered"; // Tests exist but no implementation found
    }

    return "not_covered";
  }

  /**
   * Generate coverage summary statistics
   */
  private generateCoverageSummary(mappings: AcceptanceCriteriaMapping[]): CoverageSummary {
    const totalACs = mappings.length;
    const coverageByStatus: Record<CoverageStatus, number> = {
      "fully_covered": 0,
      "partially_covered": 0,
      "not_covered": 0,
      "over_covered": 0
    };

    for (const mapping of mappings) {
      coverageByStatus[mapping.coverageStatus]++;
    }

    const coveredACs = coverageByStatus.fully_covered + coverageByStatus.partially_covered;
    const coveragePercentage = totalACs > 0 ? Math.round((coveredACs / totalACs) * 100) : 0;

    return {
      totalACs,
      coveredACs,
      coveragePercentage,
      coverageByStatus
    };
  }

  /**
   * Identify unmet acceptance criteria
   */
  private identifyUnmetAcceptanceCriteria(
    mappings: AcceptanceCriteriaMapping[],
    context: TraceabilityMatrixContext
  ): UnmetAcceptanceCriteria[] {
    const unmetACs: UnmetAcceptanceCriteria[] = [];

    for (const mapping of mappings) {
      if (mapping.coverageStatus === "not_covered" || 
          (mapping.implementationFiles.length === 0 && mapping.testFiles.length === 0)) {
        
        unmetACs.push({
          acId: mapping.acId,
          acDescription: mapping.acDescription,
          reason: this.determineUnmetReason(mapping),
          suggestedImplementation: this.generateImplementationSuggestion(mapping, context),
          priority: this.determineUnmetPriority(mapping, context)
        });
      }
    }

    return unmetACs;
  }

  /**
   * Identify missing tests
   */
  private identifyMissingTests(
    mappings: AcceptanceCriteriaMapping[],
    context: TraceabilityMatrixContext
  ): MissingTest[] {
    const missingTests: MissingTest[] = [];

    for (const mapping of mappings) {
      if (mapping.implementationFiles.length > 0 && mapping.testFiles.length === 0) {
        missingTests.push({
          acId: mapping.acId,
          testDescription: `Test coverage for ${mapping.acDescription}`,
          testType: this.determineRequiredTestType(mapping),
          suggestedTestFile: this.suggestTestFile(mapping, context),
          priority: this.determineTestPriority(mapping)
        });
      }
    }

    return missingTests;
  }

  /**
   * Generate metadata for the traceability matrix
   */
  private generateMetadata(context: TraceabilityMatrixContext): TraceabilityMatrixMetadata {
    return {
      timestamp: Date.now(),
      id: `traceability_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceSpec: "Acceptance Criteria from INIT step",
      analysisScope: [
        ...context.fileStructure.sourceFiles.slice(0, 10),
        ...context.fileStructure.testFiles.slice(0, 10)
      ]
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateMappingConfidence(
    ac: AcceptanceCriterion,
    elementName: string,
    relatedACs: string[]
  ): number {
    let confidence = 0;

    // Direct AC reference
    if (relatedACs.includes(ac.id)) {
      confidence += 80;
    }

    // Keyword matching
    const acKeywords = this.extractKeywords(ac.description);
    const nameKeywords = this.extractKeywords(elementName);
    const keywordMatch = this.calculateKeywordOverlap(acKeywords, nameKeywords);
    confidence += keywordMatch * 20;

    return Math.min(confidence, 100);
  }

  private calculateKeywordConfidence(keywords: string[], filePath: string): number {
    const fileKeywords = this.extractKeywords(filePath);
    return this.calculateKeywordOverlap(keywords, fileKeywords) * 100;
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = ["the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "man", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its", "let", "put", "say", "she", "too", "use"];
    return stopWords.includes(word);
  }

  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) {
      return 0;
    }

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    return intersection.size / Math.max(set1.size, set2.size);
  }

  private calculateTestCoverage(
    testMapping: TestFileAnalysis,
    context: TraceabilityMatrixContext
  ): number {
    // Simple coverage calculation based on test case count
    return Math.min(testMapping.testCases.length * 25, 100);
  }

  private determineUnmetReason(mapping: AcceptanceCriteriaMapping): string {
    if (mapping.implementationFiles.length === 0 && mapping.testFiles.length === 0) {
      return "No implementation or tests found";
    }
    
    if (mapping.implementationFiles.length === 0) {
      return "Implementation not found";
    }
    
    if (mapping.testFiles.length === 0) {
      return "Tests not found";
    }
    
    return "Insufficient coverage";
  }

  private generateImplementationSuggestion(
    mapping: AcceptanceCriteriaMapping,
    context: TraceabilityMatrixContext
  ): string {
    const keywords = this.extractKeywords(mapping.acDescription);
    const suggestedFile = keywords.length > 0 ? 
      `src/${keywords[0]}.ts` : 
      `src/feature-${mapping.acId.toLowerCase()}.ts`;
    
    return `Implement ${mapping.acDescription} in ${suggestedFile}`;
  }

  private determineUnmetPriority(
    mapping: AcceptanceCriteriaMapping,
    context: TraceabilityMatrixContext
  ): "high" | "medium" | "low" {
    // Priority based on AC description keywords
    const description = mapping.acDescription.toLowerCase();
    
    if (description.includes("critical") || description.includes("must") || description.includes("required")) {
      return "high";
    }
    
    if (description.includes("should") || description.includes("important")) {
      return "medium";
    }
    
    return "low";
  }

  private determineRequiredTestType(mapping: AcceptanceCriteriaMapping): TestCaseType {
    const description = mapping.acDescription.toLowerCase();
    
    if (description.includes("integration") || description.includes("workflow")) {
      return "integration";
    }
    
    if (description.includes("acceptance") || description.includes("user")) {
      return "acceptance";
    }
    
    return "unit";
  }

  private suggestTestFile(
    mapping: AcceptanceCriteriaMapping,
    context: TraceabilityMatrixContext
  ): string {
    if (mapping.implementationFiles.length > 0) {
      const implFile = mapping.implementationFiles[0].filePath;
      const baseName = implFile.replace(/\.[^/.]+$/, "");
      return `${baseName}.test.ts`;
    }
    
    return `tests/${mapping.acId.toLowerCase()}.test.ts`;
  }

  private determineTestPriority(mapping: AcceptanceCriteriaMapping): "high" | "medium" | "low" {
    // High priority if implementation exists but no tests
    if (mapping.implementationFiles.length > 0 && mapping.testFiles.length === 0) {
      return "high";
    }
    
    return "medium";
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration for traceability matrix generation
 */
export const DEFAULT_TRACEABILITY_MATRIX_CONFIG: TraceabilityMatrixConfig = {
  maxAcceptanceCriteria: 50,
  mappingConfidenceThreshold: 60,
  includeImplementationDetails: true,
  testFilePatterns: [
    "**/*.test.ts",
    "**/*.test.js",
    "**/*.spec.ts",
    "**/*.spec.js",
    "**/test/**/*.ts",
    "**/test/**/*.js",
    "**/__tests__/**/*.ts",
    "**/__tests__/**/*.js"
  ],
  sourceFilePatterns: [
    "src/**/*.ts",
    "src/**/*.js",
    "lib/**/*.ts",
    "lib/**/*.js"
  ],
  analysisDepth: {
    functionLevel: true,
    classLevel: true,
    moduleLevel: true,
    includeComments: true
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create traceability matrix generator with default configuration
 */
export function createTraceabilityMatrixGenerator(
  config?: Partial<TraceabilityMatrixConfig>
): TraceabilityMatrixGenerator {
  return new TraceabilityMatrixGenerator(config);
}

/**
 * Validate traceability matrix structure
 */
export function validateTraceabilityMatrix(matrix: TraceabilityMatrix): string[] {
  const errors: string[] = [];

  if (!matrix.metadata || !matrix.metadata.id) {
    errors.push("Missing or invalid metadata");
  }

  if (!Array.isArray(matrix.acMappings)) {
    errors.push("AC mappings must be an array");
  }

  if (!matrix.coverageSummary) {
    errors.push("Missing coverage summary");
  }

  if (!Array.isArray(matrix.unmetACs)) {
    errors.push("Unmet ACs must be an array");
  }

  if (!Array.isArray(matrix.missingTests)) {
    errors.push("Missing tests must be an array");
  }

  // Validate AC mappings
  for (const mapping of matrix.acMappings) {
    if (!mapping.acId || !mapping.acDescription) {
      errors.push(`Invalid AC mapping: missing required fields`);
    }

    if (!["fully_covered", "partially_covered", "not_covered", "over_covered"].includes(mapping.coverageStatus)) {
      errors.push(`Invalid coverage status: ${mapping.coverageStatus}`);
    }
  }

  return errors;
}