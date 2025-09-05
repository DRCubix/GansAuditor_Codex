/**
 * Workflow Step Definitions and Interfaces for GAN Auditor System Prompt
 * 
 * This module defines the 8-step audit workflow structure with step definitions,
 * execution logic, validation, and evidence collection as specified in
 * requirements 2.1 and 2.2.
 */

// ============================================================================
// Core Workflow Types
// ============================================================================

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
export type EvidenceType = 
  | "lint_violation"
  | "format_issue" 
  | "type_error"
  | "test_failure"
  | "coverage_gap"
  | "security_vulnerability"
  | "performance_issue"
  | "naming_violation"
  | "architecture_violation"
  | "missing_requirement"
  | "code_smell"
  | "documentation_gap";

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
export type WorkflowStatus = 
  | "not_started"
  | "in_progress" 
  | "completed"
  | "failed"
  | "cancelled";

// ============================================================================
// Step-Specific Types
// ============================================================================

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

// ============================================================================
// Default Workflow Definition
// ============================================================================

/**
 * Default 8-step GAN audit workflow
 */
export const DEFAULT_AUDIT_WORKFLOW: AuditWorkflow = {
  id: "gan-audit-8-step",
  name: "GAN Auditor 8-Step Workflow",
  description: "Comprehensive 8-step adversarial audit workflow for code quality assessment",
  steps: [
    {
      name: "INIT",
      description: "Restate task goal, acceptance criteria (ACs), and constraints from Spec",
      actions: [
        "Load session state",
        "Parse requirements from Spec documents", 
        "Extract acceptance criteria",
        "Identify constraints from Steering documents",
        "Detect touched files/modules"
      ],
      order: 1,
      required: true,
      expectedOutputs: ["taskGoals", "acceptanceCriteria", "constraints", "touchedFiles"]
    },
    {
      name: "REPRO",
      description: "Establish deterministic repro for the feature/bugfix",
      actions: [
        "Create minimal reproduction steps",
        "Verify current behavior", 
        "Document expected vs actual behavior",
        "Generate minimal command sequence"
      ],
      order: 2,
      required: true,
      expectedOutputs: ["reproductionSteps", "currentBehavior", "expectedBehavior", "minimalCommands"]
    },
    {
      name: "STATIC",
      description: "Lint/format/type-check and scan for code smells",
      actions: [
        "Run linting tools",
        "Check formatting compliance",
        "Perform type checking",
        "Detect code smells and anti-patterns"
      ],
      order: 3,
      required: true,
      expectedOutputs: ["lintResults", "formatIssues", "typeCheckResults", "codeSmells"]
    },
    {
      name: "TESTS",
      description: "Run existing tests and add focused tests for missing coverage",
      actions: [
        "Execute existing test suite",
        "Identify coverage gaps",
        "Create focused tests for missing coverage",
        "Validate test quality and assertions"
      ],
      order: 4,
      required: true,
      expectedOutputs: ["testResults", "coverageGaps", "suggestedTests", "testQualityMetrics"]
    },
    {
      name: "DYNAMIC",
      description: "Runtime validation and boundary testing",
      actions: [
        "Test edge cases and boundary conditions",
        "Validate error handling paths",
        "Check performance characteristics",
        "Scan for security vulnerabilities"
      ],
      order: 5,
      required: true,
      expectedOutputs: ["edgeCaseResults", "errorHandlingResults", "performanceMetrics", "securityFindings"]
    },
    {
      name: "CONFORM",
      description: "Verify naming/structure/library usage per Steering",
      actions: [
        "Check naming conventions",
        "Validate architecture patterns",
        "Review library usage",
        "Analyze dependencies"
      ],
      order: 6,
      required: true,
      expectedOutputs: ["namingViolations", "architectureViolations", "libraryIssues", "dependencyAnalysis"]
    },
    {
      name: "TRACE",
      description: "Map changed artifacts to Spec requirements",
      actions: [
        "Create traceability matrix",
        "Map ACs to implementation files",
        "Identify unmet ACs",
        "Detect missing implementations"
      ],
      order: 7,
      required: true,
      expectedOutputs: ["traceabilityMatrix", "unmetACs", "missingImplementations", "coverageReport"]
    },
    {
      name: "VERDICT",
      description: "Score and determine ship/no-ship with evidence",
      actions: [
        "Calculate dimensional scores",
        "Determine overall verdict",
        "Generate structured feedback",
        "Create evidence-based decision documentation"
      ],
      order: 8,
      required: true,
      expectedOutputs: ["dimensionalScores", "overallVerdict", "structuredFeedback", "decisionDocumentation"]
    }
  ],
  config: {
    enforceOrder: true,
    allowSkipping: false,
    requireEvidence: true,
    stepTimeout: 30000, // 30 seconds per step
    continueOnFailure: false
  }
};

/**
 * Default workflow configuration
 */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  enforceOrder: true,
  allowSkipping: false,
  requireEvidence: true,
  stepTimeout: 30000,
  continueOnFailure: false
};