/**
 * Structured Output and Evidence-Based Feedback Types for GAN Auditor System Prompt
 *
 * This module defines the types and interfaces for the structured output and
 * evidence-based feedback system as specified in requirements 5.1-5.7.
 *
 * Requirements addressed:
 * - 5.1: Executive verdict generation with ship/no-ship decision
 * - 5.2: Evidence table generation with structured format
 * - 5.3: Proposed diff generation for specific fixes
 * - 5.4: Reproduction and verification guide
 * - 5.5: Traceability matrix generation
 * - 5.6: Follow-up task generation
 * - 5.7: Output sanitization and security
 */
/**
 * Ship/No-ship decision with justification
 */
export interface ExecutiveVerdict {
    /** Ship or no-ship decision */
    decision: ShipDecision;
    /** Overall quality score (0-100) */
    overallScore: number;
    /** 3-6 bullet point summary explaining the decision */
    summary: string[];
    /** Next steps guidance based on the verdict */
    nextSteps: string[];
    /** Justification with evidence links */
    justification: VerdictJustification;
    /** Timestamp of the verdict */
    timestamp: number;
}
/**
 * Ship decision enumeration
 */
export type ShipDecision = "ship" | "no-ship";
/**
 * Verdict justification with evidence links
 */
export interface VerdictJustification {
    /** Primary reasons for the decision */
    primaryReasons: string[];
    /** Links to supporting evidence */
    evidenceLinks: EvidenceLink[];
    /** Risk assessment */
    riskAssessment: RiskAssessment;
    /** Confidence level in the decision (0-100) */
    confidenceLevel: number;
}
/**
 * Link to supporting evidence
 */
export interface EvidenceLink {
    /** Evidence identifier */
    evidenceId: string;
    /** Type of evidence */
    type: string;
    /** Brief description */
    description: string;
    /** Location reference */
    location: string;
}
/**
 * Risk assessment for the verdict
 */
export interface RiskAssessment {
    /** Overall risk level */
    level: RiskLevel;
    /** Identified risks */
    risks: Risk[];
    /** Mitigation strategies */
    mitigations: string[];
}
/**
 * Risk level enumeration
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";
/**
 * Individual risk item
 */
export interface Risk {
    /** Risk identifier */
    id: string;
    /** Risk description */
    description: string;
    /** Risk category */
    category: string;
    /** Impact level */
    impact: RiskLevel;
    /** Probability of occurrence */
    probability: "low" | "medium" | "high";
}
/**
 * Structured evidence table with issues, severity, location, proof, and fixes
 */
export interface EvidenceTable {
    /** Table metadata */
    metadata: EvidenceTableMetadata;
    /** Evidence entries */
    entries: EvidenceEntry[];
    /** Summary statistics */
    summary: EvidenceTableSummary;
}
/**
 * Evidence table metadata
 */
export interface EvidenceTableMetadata {
    /** Generation timestamp */
    timestamp: number;
    /** Total number of entries */
    totalEntries: number;
    /** Evidence collection scope */
    scope: string;
    /** Collection method */
    collectionMethod: string;
}
/**
 * Individual evidence entry in the table
 */
export interface EvidenceEntry {
    /** Unique evidence identifier */
    id: string;
    /** Issue description */
    issue: string;
    /** Severity level */
    severity: SeverityLevel;
    /** Location information */
    location: LocationInfo;
    /** Proof supporting the issue */
    proof: ProofInfo;
    /** Fix summary */
    fixSummary: string;
    /** Additional metadata */
    metadata: EvidenceEntryMetadata;
}
/**
 * Severity level classification
 */
export type SeverityLevel = "Critical" | "Major" | "Minor";
/**
 * Location information for evidence
 */
export interface LocationInfo {
    /** File path */
    file?: string;
    /** Line number */
    line?: number;
    /** Column number */
    column?: number;
    /** Component name */
    component?: string;
    /** Method name */
    method?: string;
    /** Formatted location string */
    formatted: string;
}
/**
 * Proof information supporting the evidence
 */
export interface ProofInfo {
    /** Type of proof */
    type: ProofType;
    /** Proof content */
    content: string;
    /** Additional context */
    context?: string;
    /** Related artifacts */
    artifacts: string[];
}
/**
 * Types of proof that can be provided
 */
export type ProofType = "logs" | "tests" | "snippets" | "docs" | "metrics" | "screenshots";
/**
 * Evidence entry metadata
 */
export interface EvidenceEntryMetadata {
    /** Detection method */
    detectionMethod: string;
    /** Confidence level (0-100) */
    confidence: number;
    /** Related evidence IDs */
    relatedEvidence: string[];
    /** Tags for categorization */
    tags: string[];
}
/**
 * Evidence table summary statistics
 */
export interface EvidenceTableSummary {
    /** Count by severity level */
    severityCounts: Record<SeverityLevel, number>;
    /** Count by proof type */
    proofTypeCounts: Record<ProofType, number>;
    /** Most common issues */
    commonIssues: string[];
    /** Affected files count */
    affectedFiles: number;
}
/**
 * Proposed diff for specific fixes
 */
export interface ProposedDiff {
    /** Diff metadata */
    metadata: DiffMetadata;
    /** Unified diff content */
    unifiedDiff: string;
    /** Individual file changes */
    fileChanges: FileChange[];
    /** Validation information */
    validation: DiffValidation;
}
/**
 * Diff metadata
 */
export interface DiffMetadata {
    /** Generation timestamp */
    timestamp: number;
    /** Diff identifier */
    id: string;
    /** Description of changes */
    description: string;
    /** Change category */
    category: ChangeCategory;
    /** Priority level */
    priority: ChangePriority;
}
/**
 * Change category enumeration
 */
export type ChangeCategory = "fix" | "improvement" | "refactor" | "test" | "documentation";
/**
 * Change priority enumeration
 */
export type ChangePriority = "critical" | "high" | "medium" | "low";
/**
 * Individual file change
 */
export interface FileChange {
    /** File path */
    filePath: string;
    /** Change type */
    changeType: FileChangeType;
    /** Line additions */
    additions: number;
    /** Line deletions */
    deletions: number;
    /** Diff hunks */
    hunks: DiffHunk[];
}
/**
 * File change type enumeration
 */
export type FileChangeType = "modified" | "added" | "deleted" | "renamed";
/**
 * Individual diff hunk
 */
export interface DiffHunk {
    /** Original file line start */
    oldStart: number;
    /** Original file line count */
    oldCount: number;
    /** New file line start */
    newStart: number;
    /** New file line count */
    newCount: number;
    /** Hunk content lines */
    lines: DiffLine[];
}
/**
 * Individual diff line
 */
export interface DiffLine {
    /** Line type */
    type: DiffLineType;
    /** Line content */
    content: string;
    /** Line number in old file */
    oldLineNumber?: number;
    /** Line number in new file */
    newLineNumber?: number;
}
/**
 * Diff line type enumeration
 */
export type DiffLineType = "context" | "addition" | "deletion";
/**
 * Diff validation information
 */
export interface DiffValidation {
    /** Whether changes are small and isolated */
    isSmallAndIsolated: boolean;
    /** Test-first prioritization */
    testFirstPriority: boolean;
    /** Verification commands */
    verificationCommands: string[];
    /** Validation warnings */
    warnings: string[];
}
/**
 * Reproduction and verification guide
 */
export interface ReproductionGuide {
    /** Guide metadata */
    metadata: ReproGuideMetadata;
    /** Issue reproduction steps */
    reproductionSteps: ReproductionStep[];
    /** Fix verification steps */
    verificationSteps: VerificationStep[];
    /** Test execution commands */
    testCommands: TestCommand[];
    /** Lint/format/type-check commands */
    validationCommands: ValidationCommand[];
}
/**
 * Reproduction guide metadata
 */
export interface ReproGuideMetadata {
    /** Generation timestamp */
    timestamp: number;
    /** Guide identifier */
    id: string;
    /** Target issue or feature */
    target: string;
    /** Environment requirements */
    environmentRequirements: string[];
}
/**
 * Individual reproduction step
 */
export interface ReproductionStep {
    /** Step number */
    stepNumber: number;
    /** Step description */
    description: string;
    /** Exact command to execute */
    command: string;
    /** Expected output */
    expectedOutput?: string;
    /** Working directory */
    workingDirectory?: string;
    /** Environment variables */
    environmentVariables?: Record<string, string>;
}
/**
 * Individual verification step
 */
export interface VerificationStep {
    /** Step number */
    stepNumber: number;
    /** Step description */
    description: string;
    /** Verification command */
    command: string;
    /** Success criteria */
    successCriteria: string;
    /** Failure indicators */
    failureIndicators: string[];
}
/**
 * Test execution command
 */
export interface TestCommand {
    /** Command description */
    description: string;
    /** Command to execute */
    command: string;
    /** Test scope */
    scope: TestScope;
    /** Expected duration */
    expectedDuration?: string;
}
/**
 * Test scope enumeration
 */
export type TestScope = "unit" | "integration" | "e2e" | "all";
/**
 * Validation command (lint/format/type-check)
 */
export interface ValidationCommand {
    /** Command type */
    type: ValidationType;
    /** Command description */
    description: string;
    /** Command to execute */
    command: string;
    /** Configuration file */
    configFile?: string;
}
/**
 * Validation type enumeration
 */
export type ValidationType = "lint" | "format" | "type-check" | "security";
/**
 * Traceability matrix mapping ACs to implementation and tests
 */
export interface TraceabilityMatrix {
    /** Matrix metadata */
    metadata: TraceabilityMatrixMetadata;
    /** AC to implementation mappings */
    acMappings: AcceptanceCriteriaMapping[];
    /** Coverage summary */
    coverageSummary: CoverageSummary;
    /** Unmet ACs */
    unmetACs: UnmetAcceptanceCriteria[];
    /** Missing tests */
    missingTests: MissingTest[];
}
/**
 * Traceability matrix metadata
 */
export interface TraceabilityMatrixMetadata {
    /** Generation timestamp */
    timestamp: number;
    /** Matrix identifier */
    id: string;
    /** Source specification */
    sourceSpec: string;
    /** Analysis scope */
    analysisScope: string[];
}
/**
 * Acceptance criteria mapping
 */
export interface AcceptanceCriteriaMapping {
    /** AC identifier */
    acId: string;
    /** AC description */
    acDescription: string;
    /** Implementation files */
    implementationFiles: ImplementationFile[];
    /** Test files */
    testFiles: TestFile[];
    /** Coverage status */
    coverageStatus: CoverageStatus;
}
/**
 * Implementation file reference
 */
export interface ImplementationFile {
    /** File path */
    filePath: string;
    /** Relevant line ranges */
    lineRanges: LineRange[];
    /** Implementation confidence */
    confidence: number;
    /** Implementation notes */
    notes?: string;
}
/**
 * Test file reference
 */
export interface TestFile {
    /** File path */
    filePath: string;
    /** Test cases */
    testCases: TestCase[];
    /** Coverage percentage */
    coverage: number;
}
/**
 * Test case reference
 */
export interface TestCase {
    /** Test name */
    name: string;
    /** Line range in test file */
    lineRange: LineRange;
    /** Test type */
    type: TestCaseType;
}
/**
 * Test case type enumeration
 */
export type TestCaseType = "unit" | "integration" | "acceptance" | "regression";
/**
 * Line range specification
 */
export interface LineRange {
    /** Start line number */
    start: number;
    /** End line number */
    end: number;
}
/**
 * Coverage status enumeration
 */
export type CoverageStatus = "fully_covered" | "partially_covered" | "not_covered" | "over_covered";
/**
 * Coverage summary statistics
 */
export interface CoverageSummary {
    /** Total ACs */
    totalACs: number;
    /** Covered ACs */
    coveredACs: number;
    /** Coverage percentage */
    coveragePercentage: number;
    /** Coverage by status */
    coverageByStatus: Record<CoverageStatus, number>;
}
/**
 * Unmet acceptance criteria
 */
export interface UnmetAcceptanceCriteria {
    /** AC identifier */
    acId: string;
    /** AC description */
    acDescription: string;
    /** Reason for being unmet */
    reason: string;
    /** Suggested implementation */
    suggestedImplementation: string;
    /** Priority level */
    priority: "high" | "medium" | "low";
}
/**
 * Missing test identification
 */
export interface MissingTest {
    /** AC identifier */
    acId: string;
    /** Test description */
    testDescription: string;
    /** Test type needed */
    testType: TestCaseType;
    /** Suggested test file */
    suggestedTestFile: string;
    /** Test priority */
    priority: "high" | "medium" | "low";
}
/**
 * Follow-up task list with prioritization
 */
export interface FollowUpTaskList {
    /** Task list metadata */
    metadata: TaskListMetadata;
    /** Ordered tasks */
    tasks: FollowUpTask[];
    /** Task summary */
    summary: TaskListSummary;
}
/**
 * Task list metadata
 */
export interface TaskListMetadata {
    /** Generation timestamp */
    timestamp: number;
    /** Task list identifier */
    id: string;
    /** Context description */
    context: string;
    /** Prioritization method */
    prioritizationMethod: string;
}
/**
 * Individual follow-up task
 */
export interface FollowUpTask {
    /** Task identifier */
    id: string;
    /** Task title */
    title: string;
    /** Detailed description */
    description: string;
    /** Task category */
    category: TaskCategory;
    /** Priority level */
    priority: TaskPriority;
    /** Effort estimation */
    effortEstimate?: EffortEstimate;
    /** Dependencies */
    dependencies: string[];
    /** Acceptance criteria */
    acceptanceCriteria: string[];
    /** Related evidence */
    relatedEvidence: string[];
}
/**
 * Task category enumeration
 */
export type TaskCategory = "critical_fix" | "improvement" | "refactor" | "test" | "documentation" | "security";
/**
 * Task priority enumeration
 */
export type TaskPriority = "critical" | "high" | "medium" | "low";
/**
 * Effort estimation
 */
export interface EffortEstimate {
    /** Estimated time */
    estimatedTime: string;
    /** Complexity level */
    complexity: ComplexityLevel;
    /** Confidence in estimate */
    confidence: number;
    /** Estimation method */
    method: string;
}
/**
 * Complexity level enumeration
 */
export type ComplexityLevel = "trivial" | "simple" | "moderate" | "complex" | "very_complex";
/**
 * Task list summary
 */
export interface TaskListSummary {
    /** Total tasks */
    totalTasks: number;
    /** Tasks by priority */
    tasksByPriority: Record<TaskPriority, number>;
    /** Tasks by category */
    tasksByCategory: Record<TaskCategory, number>;
    /** Estimated total effort */
    estimatedTotalEffort?: string;
}
/**
 * Sanitization configuration and results
 */
export interface SanitizationResult {
    /** Sanitization metadata */
    metadata: SanitizationMetadata;
    /** Original content (for reference) */
    originalContent?: string;
    /** Sanitized content */
    sanitizedContent: string;
    /** Sanitization actions taken */
    actions: SanitizationAction[];
    /** Warnings and notices */
    warnings: string[];
}
/**
 * Sanitization metadata
 */
export interface SanitizationMetadata {
    /** Sanitization timestamp */
    timestamp: number;
    /** Sanitization rules applied */
    rulesApplied: string[];
    /** Content type */
    contentType: string;
    /** Sanitization level */
    level: SanitizationLevel;
}
/**
 * Sanitization level enumeration
 */
export type SanitizationLevel = "basic" | "standard" | "strict" | "paranoid";
/**
 * Individual sanitization action
 */
export interface SanitizationAction {
    /** Action type */
    type: SanitizationType;
    /** Description of what was sanitized */
    description: string;
    /** Location in content */
    location: string;
    /** Replacement value */
    replacement: string;
    /** Confidence level */
    confidence: number;
}
/**
 * Sanitization type enumeration
 */
export type SanitizationType = "pii_detection" | "sensitive_data_replacement" | "tool_syntax_hiding" | "secret_masking" | "credential_removal" | "path_anonymization";
/**
 * PII detection patterns
 */
export interface PIIPattern {
    /** Pattern name */
    name: string;
    /** Regular expression */
    pattern: RegExp;
    /** Replacement template */
    replacement: string;
    /** Confidence threshold */
    confidenceThreshold: number;
}
/**
 * Complete structured output combining all feedback components
 */
export interface StructuredFeedbackOutput {
    /** Executive verdict */
    executiveVerdict: ExecutiveVerdict;
    /** Evidence table */
    evidenceTable: EvidenceTable;
    /** Proposed diffs */
    proposedDiffs: ProposedDiff[];
    /** Reproduction guide */
    reproductionGuide: ReproductionGuide;
    /** Traceability matrix */
    traceabilityMatrix: TraceabilityMatrix;
    /** Follow-up tasks */
    followUpTasks: FollowUpTaskList;
    /** Sanitization results */
    sanitizationResults: SanitizationResult;
    /** Output metadata */
    metadata: StructuredOutputMetadata;
}
/**
 * Structured output metadata
 */
export interface StructuredOutputMetadata {
    /** Generation timestamp */
    timestamp: number;
    /** Output version */
    version: string;
    /** Generation context */
    context: string;
    /** Quality metrics */
    qualityMetrics: OutputQualityMetrics;
}
/**
 * Output quality metrics
 */
export interface OutputQualityMetrics {
    /** Completeness score (0-100) */
    completeness: number;
    /** Accuracy score (0-100) */
    accuracy: number;
    /** Actionability score (0-100) */
    actionability: number;
    /** Evidence quality score (0-100) */
    evidenceQuality: number;
}
/**
 * Default sanitization patterns for PII detection
 */
export declare const DEFAULT_PII_PATTERNS: PIIPattern[];
/**
 * Default severity level weights for prioritization
 */
export declare const SEVERITY_WEIGHTS: Record<SeverityLevel, number>;
/**
 * Default priority level weights for task ordering
 */
export declare const PRIORITY_WEIGHTS: Record<TaskPriority, number>;
//# sourceMappingURL=feedback-types.d.ts.map