/**
 * Documentation and Traceability Assessment (10% weight)
 *
 * This module implements the documentation and traceability assessment as specified
 * in requirement 3.6. It evaluates:
 * - Inline documentation validation
 * - ADR requirement checking
 * - Changelog entry validation
 * - API documentation completeness checking
 */
import type { QualityCriterion, CriterionEvaluation, QualityEvaluationContext } from '../quality-assessment.js';
/**
 * Inline documentation validation result
 */
export interface InlineDocumentationResult {
    /** Overall documentation score (0-100) */
    overallScore: number;
    /** Comment coverage analysis */
    commentCoverage: CommentCoverageAnalysis;
    /** Documentation quality analysis */
    qualityAnalysis: DocumentationQualityAnalysis;
    /** Complexity documentation analysis */
    complexityDocumentation: ComplexityDocumentationAnalysis;
    /** Documentation violations */
    violations: DocumentationViolation[];
}
/**
 * Comment coverage analysis
 */
export interface CommentCoverageAnalysis {
    /** Total functions requiring documentation */
    totalFunctions: number;
    /** Functions with documentation */
    documentedFunctions: number;
    /** Documentation coverage percentage */
    coveragePercentage: number;
    /** Coverage by visibility */
    coverageByVisibility: VisibilityCoverage;
    /** Coverage by complexity */
    coverageByComplexity: ComplexityCoverage;
    /** Undocumented functions */
    undocumentedFunctions: UndocumentedFunction[];
}
/**
 * Visibility coverage
 */
export interface VisibilityCoverage {
    /** Public function coverage */
    publicFunctions: CoverageMetric;
    /** Private function coverage */
    privateFunctions: CoverageMetric;
    /** Protected function coverage */
    protectedFunctions: CoverageMetric;
}
/**
 * Coverage metric
 */
export interface CoverageMetric {
    /** Total count */
    total: number;
    /** Documented count */
    documented: number;
    /** Coverage percentage */
    percentage: number;
}
/**
 * Complexity coverage
 */
export interface ComplexityCoverage {
    /** High complexity functions */
    highComplexity: CoverageMetric;
    /** Medium complexity functions */
    mediumComplexity: CoverageMetric;
    /** Low complexity functions */
    lowComplexity: CoverageMetric;
}
/**
 * Undocumented function
 */
export interface UndocumentedFunction {
    /** Function name */
    name: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Function visibility */
    visibility: "public" | "private" | "protected";
    /** Complexity score */
    complexity: number;
    /** Priority for documentation */
    priority: "High" | "Medium" | "Low";
    /** Reason for priority */
    priorityReason: string;
}
/**
 * Documentation quality analysis
 */
export interface DocumentationQualityAnalysis {
    /** Overall quality score */
    overallQuality: number;
    /** Quality metrics */
    qualityMetrics: DocumentationQualityMetrics;
    /** Quality issues */
    qualityIssues: DocumentationQualityIssue[];
    /** Best practices adherence */
    bestPracticesAdherence: BestPracticesAdherence;
}
/**
 * Documentation quality metrics
 */
export interface DocumentationQualityMetrics {
    /** Clarity score */
    clarity: number;
    /** Completeness score */
    completeness: number;
    /** Accuracy score */
    accuracy: number;
    /** Consistency score */
    consistency: number;
    /** Usefulness score */
    usefulness: number;
}
/**
 * Documentation quality issue
 */
export interface DocumentationQualityIssue {
    /** Issue type */
    type: "unclear_description" | "missing_parameters" | "missing_return_value" | "outdated_information" | "inconsistent_style";
    /** Function name */
    functionName: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Issue description */
    description: string;
    /** Severity */
    severity: "High" | "Medium" | "Low";
    /** Suggested improvement */
    suggestedImprovement: string;
}
/**
 * Best practices adherence
 */
export interface BestPracticesAdherence {
    /** JSDoc/TSDoc compliance */
    jsDocCompliance: number;
    /** Parameter documentation */
    parameterDocumentation: number;
    /** Return value documentation */
    returnValueDocumentation: number;
    /** Example usage documentation */
    exampleUsage: number;
    /** Error documentation */
    errorDocumentation: number;
}
/**
 * Complexity documentation analysis
 */
export interface ComplexityDocumentationAnalysis {
    /** Complex functions requiring documentation */
    complexFunctionsTotal: number;
    /** Complex functions with adequate documentation */
    complexFunctionsDocumented: number;
    /** Documentation adequacy percentage */
    adequacyPercentage: number;
    /** Intent explanation coverage */
    intentExplanation: IntentExplanationCoverage;
    /** Algorithm explanation coverage */
    algorithmExplanation: AlgorithmExplanationCoverage;
}
/**
 * Intent explanation coverage
 */
export interface IntentExplanationCoverage {
    /** Functions with intent explanation */
    functionsWithIntent: number;
    /** Total functions needing intent explanation */
    totalFunctionsNeedingIntent: number;
    /** Coverage percentage */
    coveragePercentage: number;
    /** Missing intent explanations */
    missingIntentExplanations: MissingIntentExplanation[];
}
/**
 * Missing intent explanation
 */
export interface MissingIntentExplanation {
    /** Function name */
    functionName: string;
    /** File path */
    filePath: string;
    /** Complexity reason */
    complexityReason: string;
    /** Suggested explanation focus */
    suggestedFocus: string[];
}
/**
 * Algorithm explanation coverage
 */
export interface AlgorithmExplanationCoverage {
    /** Functions with algorithm explanation */
    functionsWithAlgorithm: number;
    /** Total functions needing algorithm explanation */
    totalFunctionsNeedingAlgorithm: number;
    /** Coverage percentage */
    coveragePercentage: number;
    /** Missing algorithm explanations */
    missingAlgorithmExplanations: MissingAlgorithmExplanation[];
}
/**
 * Missing algorithm explanation
 */
export interface MissingAlgorithmExplanation {
    /** Function name */
    functionName: string;
    /** File path */
    filePath: string;
    /** Algorithm complexity */
    algorithmComplexity: string;
    /** Suggested explanation areas */
    suggestedAreas: string[];
}
/**
 * Documentation violation
 */
export interface DocumentationViolation {
    /** Violation type */
    type: "missing_documentation" | "poor_quality" | "outdated_documentation" | "inconsistent_style" | "missing_examples";
    /** Function or area name */
    target: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Description */
    description: string;
    /** Severity */
    severity: "High" | "Medium" | "Low";
    /** Remediation steps */
    remediation: string[];
}
/**
 * ADR requirement checking result
 */
export interface ADRRequirementResult {
    /** Overall ADR compliance score (0-100) */
    overallScore: number;
    /** ADR analysis */
    adrAnalysis: ADRAnalysis;
    /** Decision documentation analysis */
    decisionDocumentation: DecisionDocumentationAnalysis;
    /** Alternative consideration analysis */
    alternativeConsideration: AlternativeConsiderationAnalysis;
    /** ADR violations */
    violations: ADRViolation[];
}
/**
 * ADR analysis
 */
export interface ADRAnalysis {
    /** Total architectural decisions identified */
    totalDecisions: number;
    /** Decisions with ADRs */
    decisionsWithADRs: number;
    /** ADR coverage percentage */
    coveragePercentage: number;
    /** ADR quality score */
    qualityScore: number;
    /** Existing ADRs */
    existingADRs: ExistingADR[];
    /** Missing ADRs */
    missingADRs: MissingADR[];
}
/**
 * Existing ADR
 */
export interface ExistingADR {
    /** ADR identifier */
    id: string;
    /** ADR title */
    title: string;
    /** File path */
    filePath: string;
    /** Decision status */
    status: "Proposed" | "Accepted" | "Deprecated" | "Superseded";
    /** Quality score */
    qualityScore: number;
    /** Completeness assessment */
    completeness: ADRCompleteness;
}
/**
 * ADR completeness
 */
export interface ADRCompleteness {
    /** Has context section */
    hasContext: boolean;
    /** Has decision section */
    hasDecision: boolean;
    /** Has consequences section */
    hasConsequences: boolean;
    /** Has alternatives section */
    hasAlternatives: boolean;
    /** Has rationale section */
    hasRationale: boolean;
    /** Completeness percentage */
    completenessPercentage: number;
}
/**
 * Missing ADR
 */
export interface MissingADR {
    /** Decision area */
    decisionArea: string;
    /** Decision description */
    description: string;
    /** Affected components */
    affectedComponents: string[];
    /** Priority for documentation */
    priority: "High" | "Medium" | "Low";
    /** Rationale for ADR requirement */
    rationale: string;
}
/**
 * Decision documentation analysis
 */
export interface DecisionDocumentationAnalysis {
    /** Decision rationale coverage */
    rationaleCoverage: number;
    /** Trade-off documentation */
    tradeoffDocumentation: number;
    /** Impact assessment coverage */
    impactAssessment: number;
    /** Decision context documentation */
    contextDocumentation: number;
}
/**
 * Alternative consideration analysis
 */
export interface AlternativeConsiderationAnalysis {
    /** Decisions with alternatives documented */
    decisionsWithAlternatives: number;
    /** Total decisions requiring alternatives */
    totalDecisionsRequiringAlternatives: number;
    /** Alternative coverage percentage */
    coveragePercentage: number;
    /** Alternative analysis quality */
    analysisQuality: number;
}
/**
 * ADR violation
 */
export interface ADRViolation {
    /** Violation type */
    type: "missing_adr" | "incomplete_adr" | "outdated_adr" | "poor_quality_adr" | "missing_alternatives";
    /** Decision or ADR identifier */
    target: string;
    /** Description */
    description: string;
    /** Severity */
    severity: "High" | "Medium" | "Low";
    /** Impact */
    impact: string;
    /** Remediation steps */
    remediation: string[];
}
/**
 * Changelog entry validation result
 */
export interface ChangelogValidationResult {
    /** Overall changelog compliance score (0-100) */
    overallScore: number;
    /** Changelog analysis */
    changelogAnalysis: ChangelogAnalysis;
    /** Breaking changes analysis */
    breakingChanges: BreakingChangesAnalysis;
    /** Migration guide analysis */
    migrationGuide: MigrationGuideAnalysis;
    /** Changelog violations */
    violations: ChangelogViolation[];
}
/**
 * Changelog analysis
 */
export interface ChangelogAnalysis {
    /** Total behavior changes identified */
    totalChanges: number;
    /** Changes documented in changelog */
    documentedChanges: number;
    /** Documentation coverage percentage */
    coveragePercentage: number;
    /** Changelog quality score */
    qualityScore: number;
    /** Changelog entries */
    entries: ChangelogEntry[];
    /** Missing entries */
    missingEntries: MissingChangelogEntry[];
}
/**
 * Changelog entry
 */
export interface ChangelogEntry {
    /** Entry type */
    type: "Added" | "Changed" | "Deprecated" | "Removed" | "Fixed" | "Security";
    /** Entry description */
    description: string;
    /** Version */
    version: string;
    /** Date */
    date: string;
    /** Quality score */
    qualityScore: number;
    /** Completeness assessment */
    completeness: ChangelogEntryCompleteness;
}
/**
 * Changelog entry completeness
 */
export interface ChangelogEntryCompleteness {
    /** Has clear description */
    hasClearDescription: boolean;
    /** Has impact information */
    hasImpactInformation: boolean;
    /** Has migration information */
    hasMigrationInformation: boolean;
    /** Completeness percentage */
    completenessPercentage: number;
}
/**
 * Missing changelog entry
 */
export interface MissingChangelogEntry {
    /** Change type */
    changeType: string;
    /** Change description */
    description: string;
    /** Affected functionality */
    affectedFunctionality: string[];
    /** Priority for documentation */
    priority: "High" | "Medium" | "Low";
    /** User impact */
    userImpact: string;
}
/**
 * Breaking changes analysis
 */
export interface BreakingChangesAnalysis {
    /** Total breaking changes identified */
    totalBreakingChanges: number;
    /** Breaking changes documented */
    documentedBreakingChanges: number;
    /** Documentation coverage percentage */
    coveragePercentage: number;
    /** Breaking change details */
    breakingChangeDetails: BreakingChangeDetail[];
}
/**
 * Breaking change detail
 */
export interface BreakingChangeDetail {
    /** Change description */
    description: string;
    /** Affected APIs */
    affectedAPIs: string[];
    /** Migration complexity */
    migrationComplexity: "Low" | "Medium" | "High";
    /** Documentation quality */
    documentationQuality: number;
    /** Has migration guide */
    hasMigrationGuide: boolean;
}
/**
 * Migration guide analysis
 */
export interface MigrationGuideAnalysis {
    /** Migration guides available */
    guidesAvailable: number;
    /** Migration guides needed */
    guidesNeeded: number;
    /** Coverage percentage */
    coveragePercentage: number;
    /** Guide quality score */
    qualityScore: number;
    /** Migration guide details */
    guideDetails: MigrationGuideDetail[];
}
/**
 * Migration guide detail
 */
export interface MigrationGuideDetail {
    /** Guide title */
    title: string;
    /** Target change */
    targetChange: string;
    /** Guide completeness */
    completeness: number;
    /** Has examples */
    hasExamples: boolean;
    /** Has step-by-step instructions */
    hasStepByStep: boolean;
    /** Quality score */
    qualityScore: number;
}
/**
 * Changelog violation
 */
export interface ChangelogViolation {
    /** Violation type */
    type: "missing_entry" | "incomplete_entry" | "missing_breaking_change" | "missing_migration_guide" | "poor_description";
    /** Change or entry identifier */
    target: string;
    /** Description */
    description: string;
    /** Severity */
    severity: "High" | "Medium" | "Low";
    /** User impact */
    userImpact: string;
    /** Remediation steps */
    remediation: string[];
}
/**
 * API documentation completeness result
 */
export interface APIDocumentationResult {
    /** Overall API documentation score (0-100) */
    overallScore: number;
    /** API coverage analysis */
    apiCoverage: APICoverageAnalysis;
    /** Parameter documentation analysis */
    parameterDocumentation: ParameterDocumentationAnalysis;
    /** Return value documentation analysis */
    returnValueDocumentation: ReturnValueDocumentationAnalysis;
    /** API documentation violations */
    violations: APIDocumentationViolation[];
}
/**
 * API coverage analysis
 */
export interface APICoverageAnalysis {
    /** Total public APIs */
    totalAPIs: number;
    /** Documented APIs */
    documentedAPIs: number;
    /** Documentation coverage percentage */
    coveragePercentage: number;
    /** API documentation quality */
    qualityScore: number;
    /** API categories */
    apiCategories: APICategoryAnalysis[];
    /** Undocumented APIs */
    undocumentedAPIs: UndocumentedAPI[];
}
/**
 * API category analysis
 */
export interface APICategoryAnalysis {
    /** Category name */
    category: "functions" | "classes" | "interfaces" | "types" | "constants" | "modules";
    /** Total in category */
    total: number;
    /** Documented in category */
    documented: number;
    /** Coverage percentage */
    coveragePercentage: number;
    /** Quality score */
    qualityScore: number;
}
/**
 * Undocumented API
 */
export interface UndocumentedAPI {
    /** API name */
    name: string;
    /** API type */
    type: "function" | "class" | "interface" | "type" | "constant" | "module";
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Visibility */
    visibility: "public" | "protected" | "private";
    /** Priority for documentation */
    priority: "High" | "Medium" | "Low";
    /** Usage frequency */
    usageFrequency: "High" | "Medium" | "Low";
}
/**
 * Parameter documentation analysis
 */
export interface ParameterDocumentationAnalysis {
    /** Total parameters requiring documentation */
    totalParameters: number;
    /** Documented parameters */
    documentedParameters: number;
    /** Documentation coverage percentage */
    coveragePercentage: number;
    /** Parameter documentation quality */
    qualityScore: number;
    /** Missing parameter documentation */
    missingParameterDocs: MissingParameterDoc[];
}
/**
 * Missing parameter documentation
 */
export interface MissingParameterDoc {
    /** Function name */
    functionName: string;
    /** Parameter name */
    parameterName: string;
    /** Parameter type */
    parameterType: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Is optional */
    isOptional: boolean;
    /** Priority for documentation */
    priority: "High" | "Medium" | "Low";
}
/**
 * Return value documentation analysis
 */
export interface ReturnValueDocumentationAnalysis {
    /** Total functions with return values */
    totalFunctionsWithReturns: number;
    /** Functions with documented returns */
    functionsWithDocumentedReturns: number;
    /** Documentation coverage percentage */
    coveragePercentage: number;
    /** Return documentation quality */
    qualityScore: number;
    /** Missing return documentation */
    missingReturnDocs: MissingReturnDoc[];
}
/**
 * Missing return documentation
 */
export interface MissingReturnDoc {
    /** Function name */
    functionName: string;
    /** Return type */
    returnType: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Return complexity */
    returnComplexity: "Simple" | "Complex" | "Union" | "Generic";
    /** Priority for documentation */
    priority: "High" | "Medium" | "Low";
}
/**
 * API documentation violation
 */
export interface APIDocumentationViolation {
    /** Violation type */
    type: "missing_api_docs" | "incomplete_parameter_docs" | "missing_return_docs" | "poor_quality_docs" | "inconsistent_format";
    /** API name */
    apiName: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Description */
    description: string;
    /** Severity */
    severity: "High" | "Medium" | "Low";
    /** Impact on API usability */
    usabilityImpact: string;
    /** Remediation steps */
    remediation: string[];
}
/**
 * Assessor for documentation and traceability quality dimension
 */
export declare class DocumentationTraceabilityAssessor {
    /**
     * Evaluate inline documentation validation criterion
     */
    evaluateInlineDocumentationValidation(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate ADR requirement checking criterion
     */
    evaluateADRRequirementChecking(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate changelog entry validation criterion
     */
    evaluateChangelogEntryValidation(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate API documentation completeness criterion
     */
    evaluateAPIDocumentationCompleteness(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Analyze inline documentation
     */
    private analyzeInlineDocumentation;
    /**
     * Analyze ADR requirements
     */
    private analyzeADRRequirements;
    /**
     * Analyze changelog validation
     */
    private analyzeChangelogValidation;
    /**
     * Analyze API documentation
     */
    private analyzeAPIDocumentation;
}
/**
 * Create a documentation and traceability assessor
 */
export declare function createDocumentationTraceabilityAssessor(): DocumentationTraceabilityAssessor;
//# sourceMappingURL=documentation-traceability-assessor.d.ts.map