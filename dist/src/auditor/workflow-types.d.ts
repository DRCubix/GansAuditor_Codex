/**
 * Workflow Step Definitions and Interfaces for GAN Auditor System Prompt
 *
 * This module defines the 8-step audit workflow structure with step definitions,
 * execution logic, validation, and evidence collection as specified in
 * requirements 2.1 and 2.2.
 */
/**
 * Individual workflow step definition
 */
export interface WorkflowStep {
    /** Unique step identifier */
    name: string;
    /** Human-readable step description */
    description: string;
    /** List of actions performed in this step */
    actions: string[];
    /** Step execution order (1-8) */
    order: number;
    /** Whether this step is required for completion */
    required: boolean;
    /** Expected outputs from this step */
    expectedOutputs: string[];
}
/**
 * Result of executing a workflow step
 */
export interface WorkflowStepResult {
    /** Step that was executed */
    step: WorkflowStep;
    /** Whether the step completed successfully */
    success: boolean;
    /** Timestamp when step was executed */
    timestamp: number;
    /** Duration of step execution in milliseconds */
    duration: number;
    /** Evidence collected during step execution */
    evidence: EvidenceItem[];
    /** Any errors encountered during execution */
    errors: string[];
    /** Step-specific output data */
    outputs: Record<string, any>;
    /** Next recommended actions based on step results */
    nextActions: string[];
}
/**
 * Evidence item collected during workflow execution
 */
export interface EvidenceItem {
    /** Type of evidence */
    type: EvidenceType;
    /** Severity level of the finding */
    severity: SeverityLevel;
    /** File location where evidence was found */
    location: string;
    /** Description of the evidence */
    description: string;
    /** Proof supporting the evidence */
    proof: string;
    /** Suggested fix for the issue */
    suggestedFix?: string;
    /** Commands to reproduce the issue */
    reproductionSteps?: string[];
}
/**
 * Types of evidence that can be collected
 */
export type EvidenceType = "lint_violation" | "format_issue" | "type_error" | "test_failure" | "coverage_gap" | "security_vulnerability" | "performance_issue" | "naming_violation" | "architecture_violation" | "missing_requirement" | "code_smell" | "documentation_gap";
/**
 * Severity levels for evidence items
 */
export type SeverityLevel = "Critical" | "Major" | "Minor";
/**
 * Complete audit workflow definition
 */
export interface AuditWorkflow {
    /** Workflow identifier */
    id: string;
    /** Workflow name */
    name: string;
    /** Workflow description */
    description: string;
    /** Ordered list of workflow steps */
    steps: WorkflowStep[];
    /** Workflow execution configuration */
    config: WorkflowConfig;
}
/**
 * Configuration for workflow execution
 */
export interface WorkflowConfig {
    /** Whether to enforce step ordering */
    enforceOrder: boolean;
    /** Whether to allow step skipping */
    allowSkipping: boolean;
    /** Whether evidence collection is required */
    requireEvidence: boolean;
    /** Maximum execution time per step in milliseconds */
    stepTimeout: number;
    /** Whether to continue on step failures */
    continueOnFailure: boolean;
}
/**
 * Current state of workflow execution
 */
export interface WorkflowExecutionState {
    /** Workflow being executed */
    workflow: AuditWorkflow;
    /** Current step index (0-based) */
    currentStepIndex: number;
    /** Results from completed steps */
    completedSteps: WorkflowStepResult[];
    /** Overall execution status */
    status: WorkflowStatus;
    /** Execution start timestamp */
    startTime: number;
    /** Total evidence collected */
    allEvidence: EvidenceItem[];
    /** Execution errors */
    errors: string[];
}
/**
 * Workflow execution status
 */
export type WorkflowStatus = "not_started" | "in_progress" | "completed" | "failed" | "cancelled";
/**
 * INIT step specific outputs
 */
export interface InitStepOutputs {
    /** Parsed task goals from Spec documents */
    taskGoals: string[];
    /** Extracted acceptance criteria */
    acceptanceCriteria: AcceptanceCriterion[];
    /** Identified constraints from Steering documents */
    constraints: string[];
    /** List of touched files/modules */
    touchedFiles: string[];
    /** Session context information */
    sessionContext: SessionContext;
}
/**
 * Individual acceptance criterion
 */
export interface AcceptanceCriterion {
    /** Unique identifier for the AC */
    id: string;
    /** AC description text */
    description: string;
    /** Whether this AC is met by current implementation */
    isMet: boolean;
    /** Evidence supporting AC status */
    evidence?: string;
    /** Related test files */
    relatedTests: string[];
}
/**
 * Session context information
 */
export interface SessionContext {
    /** Session identifier */
    sessionId: string;
    /** Branch identifier for continuity */
    branchId?: string;
    /** Previous audit results */
    previousResults?: any[];
    /** Current iteration number */
    iteration: number;
}
/**
 * REPRO step specific outputs
 */
export interface ReproStepOutputs {
    /** Generated reproduction steps */
    reproductionSteps: string[];
    /** Current behavior description */
    currentBehavior: string;
    /** Expected behavior description */
    expectedBehavior: string;
    /** Minimal command sequence */
    minimalCommands: string[];
    /** Verification commands */
    verificationCommands: string[];
}
/**
 * STATIC step specific outputs
 */
export interface StaticStepOutputs {
    /** Linting results */
    lintResults: LintResult[];
    /** Formatting issues */
    formatIssues: FormatIssue[];
    /** Type checking results */
    typeCheckResults: TypeCheckResult[];
    /** Detected code smells */
    codeSmells: CodeSmell[];
}
/**
 * Linting result
 */
export interface LintResult {
    /** File path */
    file: string;
    /** Line number */
    line: number;
    /** Column number */
    column: number;
    /** Rule that was violated */
    rule: string;
    /** Severity level */
    severity: "error" | "warning" | "info";
    /** Issue description */
    message: string;
    /** Suggested fix */
    fix?: string;
}
/**
 * Formatting issue
 */
export interface FormatIssue {
    /** File path */
    file: string;
    /** Line number */
    line: number;
    /** Issue description */
    description: string;
    /** Expected format */
    expected: string;
    /** Actual format */
    actual: string;
}
/**
 * Type checking result
 */
export interface TypeCheckResult {
    /** File path */
    file: string;
    /** Line number */
    line: number;
    /** Column number */
    column: number;
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Severity level */
    severity: "error" | "warning";
}
/**
 * Code smell detection result
 */
export interface CodeSmell {
    /** Smell type */
    type: string;
    /** File path */
    file: string;
    /** Line range */
    lineStart: number;
    lineEnd: number;
    /** Description */
    description: string;
    /** Suggested refactoring */
    suggestion: string;
}
/**
 * Default 8-step GAN audit workflow
 */
export declare const DEFAULT_AUDIT_WORKFLOW: AuditWorkflow;
/**
 * Default workflow configuration
 */
export declare const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig;
//# sourceMappingURL=workflow-types.d.ts.map