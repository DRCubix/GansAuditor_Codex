/**
 * Style and Conventions Assessment (15% weight)
 *
 * This module implements the style and conventions assessment as specified
 * in requirement 3.3. It evaluates:
 * - Linting and formatting tool integration
 * - Naming convention validation
 * - Import organization checking
 * - Documentation quality assessment
 */
import type { QualityCriterion, CriterionEvaluation, QualityEvaluationContext } from '../quality-assessment.js';
/**
 * Linting and formatting integration result
 */
export interface LintingFormattingResult {
    /** Overall compliance score (0-100) */
    overallCompliance: number;
    /** Linting results */
    lintingResults: LintingAnalysis;
    /** Formatting results */
    formattingResults: FormattingAnalysis;
    /** Style compliance results */
    styleCompliance: StyleComplianceAnalysis;
}
/**
 * Linting analysis result
 */
export interface LintingAnalysis {
    /** Total linting issues */
    totalIssues: number;
    /** Issues by severity */
    issuesBySeverity: Record<string, number>;
    /** Issues by rule */
    issuesByRule: Record<string, number>;
    /** Files with issues */
    filesWithIssues: string[];
    /** Clean files (no issues) */
    cleanFiles: string[];
    /** Compliance percentage */
    compliancePercentage: number;
}
/**
 * Formatting analysis result
 */
export interface FormattingAnalysis {
    /** Total formatting issues */
    totalIssues: number;
    /** Issues by type */
    issuesByType: Record<string, number>;
    /** Files needing formatting */
    filesNeedingFormatting: string[];
    /** Properly formatted files */
    properlyFormattedFiles: string[];
    /** Formatting compliance percentage */
    compliancePercentage: number;
}
/**
 * Style compliance analysis result
 */
export interface StyleComplianceAnalysis {
    /** Overall style score (0-100) */
    overallScore: number;
    /** Code consistency score */
    consistencyScore: number;
    /** Readability score */
    readabilityScore: number;
    /** Style violations */
    violations: StyleViolation[];
}
/**
 * Style violation detail
 */
export interface StyleViolation {
    /** Violation type */
    type: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Description */
    description: string;
    /** Severity */
    severity: "error" | "warning" | "info";
    /** Suggested fix */
    suggestedFix: string;
}
/**
 * Naming convention validation result
 */
export interface NamingConventionResult {
    /** Overall naming compliance (0-100) */
    overallCompliance: number;
    /** Naming analysis by category */
    namingAnalysis: NamingAnalysis;
    /** Convention violations */
    violations: NamingViolation[];
    /** Consistency metrics */
    consistencyMetrics: ConsistencyMetrics;
}
/**
 * Naming analysis by category
 */
export interface NamingAnalysis {
    /** Variable naming compliance */
    variables: CategoryCompliance;
    /** Function naming compliance */
    functions: CategoryCompliance;
    /** Class naming compliance */
    classes: CategoryCompliance;
    /** Interface naming compliance */
    interfaces: CategoryCompliance;
    /** Constant naming compliance */
    constants: CategoryCompliance;
    /** File naming compliance */
    files: CategoryCompliance;
}
/**
 * Category compliance metrics
 */
export interface CategoryCompliance {
    /** Total items in category */
    total: number;
    /** Compliant items */
    compliant: number;
    /** Compliance percentage */
    percentage: number;
    /** Common violations */
    commonViolations: string[];
}
/**
 * Naming violation detail
 */
export interface NamingViolation {
    /** Violation type */
    type: "variable" | "function" | "class" | "interface" | "constant" | "file";
    /** Current name */
    currentName: string;
    /** Suggested name */
    suggestedName: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber?: number;
    /** Violation reason */
    reason: string;
    /** Convention rule */
    rule: string;
}
/**
 * Consistency metrics
 */
export interface ConsistencyMetrics {
    /** Naming pattern consistency */
    patternConsistency: number;
    /** Abbreviation consistency */
    abbreviationConsistency: number;
    /** Casing consistency */
    casingConsistency: number;
    /** Length consistency */
    lengthConsistency: number;
}
/**
 * Import organization result
 */
export interface ImportOrganizationResult {
    /** Overall organization score (0-100) */
    overallScore: number;
    /** Import analysis */
    importAnalysis: ImportAnalysis;
    /** Organization violations */
    violations: ImportViolation[];
    /** Dependency analysis */
    dependencyAnalysis: DependencyAnalysis;
}
/**
 * Import analysis
 */
export interface ImportAnalysis {
    /** Total import statements */
    totalImports: number;
    /** Properly organized imports */
    organizedImports: number;
    /** Organization compliance percentage */
    organizationCompliance: number;
    /** Unused imports */
    unusedImports: UnusedImport[];
    /** Missing imports */
    missingImports: string[];
}
/**
 * Import violation detail
 */
export interface ImportViolation {
    /** Violation type */
    type: "order" | "grouping" | "unused" | "missing" | "circular";
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Import statement */
    importStatement: string;
    /** Description */
    description: string;
    /** Suggested fix */
    suggestedFix: string;
}
/**
 * Unused import detail
 */
export interface UnusedImport {
    /** Import name */
    importName: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Import statement */
    statement: string;
}
/**
 * Dependency analysis
 */
export interface DependencyAnalysis {
    /** Circular dependencies */
    circularDependencies: CircularDependency[];
    /** Dependency depth analysis */
    depthAnalysis: DepthAnalysis;
    /** External vs internal imports ratio */
    importRatio: ImportRatio;
}
/**
 * Circular dependency detail
 */
export interface CircularDependency {
    /** Files involved in the cycle */
    cycle: string[];
    /** Severity */
    severity: "High" | "Medium" | "Low";
    /** Suggested resolution */
    resolution: string;
}
/**
 * Dependency depth analysis
 */
export interface DepthAnalysis {
    /** Maximum dependency depth */
    maxDepth: number;
    /** Average dependency depth */
    averageDepth: number;
    /** Files with excessive depth */
    excessiveDepthFiles: string[];
}
/**
 * Import ratio analysis
 */
export interface ImportRatio {
    /** External imports count */
    externalImports: number;
    /** Internal imports count */
    internalImports: number;
    /** External to internal ratio */
    ratio: number;
}
/**
 * Documentation quality result
 */
export interface DocumentationQualityResult {
    /** Overall documentation score (0-100) */
    overallScore: number;
    /** Comment coverage analysis */
    commentCoverage: CommentCoverageAnalysis;
    /** Documentation completeness */
    completeness: DocumentationCompleteness;
    /** Quality metrics */
    qualityMetrics: DocumentationQualityMetrics;
}
/**
 * Comment coverage analysis
 */
export interface CommentCoverageAnalysis {
    /** Total functions/methods */
    totalFunctions: number;
    /** Documented functions */
    documentedFunctions: number;
    /** Documentation coverage percentage */
    coveragePercentage: number;
    /** Undocumented functions */
    undocumentedFunctions: UndocumentedFunction[];
}
/**
 * Undocumented function detail
 */
export interface UndocumentedFunction {
    /** Function name */
    name: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Complexity score */
    complexity: number;
    /** Public/private visibility */
    visibility: "public" | "private" | "protected";
}
/**
 * Documentation completeness
 */
export interface DocumentationCompleteness {
    /** API documentation coverage */
    apiDocumentation: number;
    /** Inline comment coverage */
    inlineComments: number;
    /** README completeness */
    readmeCompleteness: number;
    /** Type documentation coverage */
    typeDocumentation: number;
}
/**
 * Documentation quality metrics
 */
export interface DocumentationQualityMetrics {
    /** Comment quality score */
    commentQuality: number;
    /** Documentation accuracy */
    accuracy: number;
    /** Clarity and readability */
    clarity: number;
    /** Completeness score */
    completeness: number;
}
/**
 * Assessor for style and conventions quality dimension
 */
export declare class StyleConventionsAssessor {
    /**
     * Evaluate linting and formatting integration criterion
     */
    evaluateLintingFormattingIntegration(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate naming convention validation criterion
     */
    evaluateNamingConventionValidation(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate import organization criterion
     */
    evaluateImportOrganization(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate documentation quality criterion
     */
    evaluateDocumentationQuality(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Analyze linting and formatting compliance
     */
    private analyzeLintingFormatting;
    /**
     * Analyze naming conventions
     */
    private analyzeNamingConventions;
    /**
     * Analyze import organization
     */
    private analyzeImportOrganization;
    /**
     * Analyze documentation quality
     */
    private analyzeDocumentationQuality;
}
/**
 * Create a style and conventions assessor
 */
export declare function createStyleConventionsAssessor(): StyleConventionsAssessor;
//# sourceMappingURL=style-conventions-assessor.d.ts.map