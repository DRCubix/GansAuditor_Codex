/**
 * Audit Workflow Implementation
 * 
 * This module implements the AuditWorkflow class with step execution logic,
 * validation, ordering enforcement, and evidence collection as specified in
 * requirements 2.1 and 2.2.
 */

import { 
  AuditWorkflow,
  WorkflowStep,
  WorkflowStepResult,
  WorkflowExecutionState,
  WorkflowStatus,
  WorkflowConfig,
  EvidenceItem,
  DEFAULT_AUDIT_WORKFLOW,
  DEFAULT_WORKFLOW_CONFIG
} from './workflow-types.js';

// ============================================================================
// Workflow Execution Engine
// ============================================================================

/**
 * Main audit workflow execution engine
 */
export class AuditWorkflowEngine {
  private workflow: AuditWorkflow;
  private config: WorkflowConfig;
  private executionState: WorkflowExecutionState;

  constructor(workflow?: AuditWorkflow, config?: Partial<WorkflowConfig>) {
    this.workflow = workflow || DEFAULT_AUDIT_WORKFLOW;
    this.config = { ...DEFAULT_WORKFLOW_CONFIG, ...config };
    this.executionState = this.initializeExecutionState();
  }

  /**
   * Initialize workflow execution state
   */
  private initializeExecutionState(): WorkflowExecutionState {
    return {
      workflow: this.workflow,
      currentStepIndex: 0,
      completedSteps: [],
      status: "not_started",
      startTime: Date.now(),
      allEvidence: [],
      errors: []
    };
  }

  /**
   * Start workflow execution
   */
  async startExecution(): Promise<void> {
    if (this.executionState.status !== "not_started") {
      throw new Error(`Cannot start workflow in status: ${this.executionState.status}`);
    }

    this.executionState.status = "in_progress";
    this.executionState.startTime = Date.now();
  }

  /**
   * Execute the next workflow step
   */
  async executeNextStep(stepInputs?: Record<string, any>): Promise<WorkflowStepResult> {
    if (this.executionState.status !== "in_progress") {
      throw new Error(`Cannot execute step in status: ${this.executionState.status}`);
    }

    if (this.executionState.currentStepIndex >= this.workflow.steps.length) {
      this.executionState.status = "completed";
      throw new Error("All workflow steps have been completed");
    }

    const step = this.workflow.steps[this.executionState.currentStepIndex];
    
    // Validate step order if enforced
    if (this.config.enforceOrder && !this.isStepOrderValid(step)) {
      throw new Error(`Step order violation: ${step.name} cannot be executed at position ${this.executionState.currentStepIndex}`);
    }

    try {
      const result = await this.executeStep(step, stepInputs);
      
      // Add result to completed steps
      this.executionState.completedSteps.push(result);
      
      // Collect evidence
      this.executionState.allEvidence.push(...result.evidence);
      
      // Move to next step
      this.executionState.currentStepIndex++;
      
      // Check if workflow is complete
      if (this.executionState.currentStepIndex >= this.workflow.steps.length) {
        this.executionState.status = "completed";
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.executionState.errors.push(errorMessage);
      
      if (!this.config.continueOnFailure) {
        this.executionState.status = "failed";
        throw error;
      }
      
      // Create failed step result
      const failedResult: WorkflowStepResult = {
        step,
        success: false,
        timestamp: Date.now(),
        duration: 0,
        evidence: [],
        errors: [errorMessage],
        outputs: {},
        nextActions: [`Retry step: ${step.name}`]
      };
      
      this.executionState.completedSteps.push(failedResult);
      this.executionState.currentStepIndex++;
      
      return failedResult;
    }
  }

  /**
   * Execute a specific workflow step
   */
  private async executeStep(step: WorkflowStep, inputs?: Record<string, any>): Promise<WorkflowStepResult> {
    const startTime = Date.now();
    const evidence: EvidenceItem[] = [];
    const outputs: Record<string, any> = {};
    const errors: string[] = [];
    const nextActions: string[] = [];

    try {
      // Execute step based on its name
      switch (step.name) {
        case "INIT":
          await this.executeInitStep(outputs, evidence, inputs);
          break;
        case "REPRO":
          await this.executeReproStep(outputs, evidence, inputs);
          break;
        case "STATIC":
          await this.executeStaticStep(outputs, evidence, inputs);
          break;
        case "TESTS":
          await this.executeTestsStep(outputs, evidence, inputs);
          break;
        case "DYNAMIC":
          await this.executeDynamicStep(outputs, evidence, inputs);
          break;
        case "CONFORM":
          await this.executeConformStep(outputs, evidence, inputs);
          break;
        case "TRACE":
          await this.executeTraceStep(outputs, evidence, inputs);
          break;
        case "VERDICT":
          await this.executeVerdictStep(outputs, evidence, inputs);
          break;
        default:
          throw new Error(`Unknown workflow step: ${step.name}`);
      }

      // Validate required outputs
      this.validateStepOutputs(step, outputs);

      // Generate next actions based on evidence
      nextActions.push(...this.generateNextActions(step, evidence));

      return {
        step,
        success: true,
        timestamp: startTime,
        duration: Date.now() - startTime,
        evidence,
        errors,
        outputs,
        nextActions
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      throw error;
    }
  }

  /**
   * Execute INIT step - actual implementation
   */
  private async executeInitStep(
    outputs: Record<string, any>, 
    evidence: EvidenceItem[], 
    inputs?: Record<string, any>
  ): Promise<void> {
    const { executeInitStep } = await import('./workflow-steps/init-step.js');
    
    const initInputs = {
      specPath: inputs?.specPath || '.kiro/specs',
      steeringPath: inputs?.steeringPath || '.kiro/steering',
      workspacePath: inputs?.workspacePath || process.cwd(),
      gitDiff: inputs?.gitDiff,
      sessionId: inputs?.sessionId,
      branchId: inputs?.branchId,
      previousResults: inputs?.previousResults,
      iteration: inputs?.iteration || 1
    };
    
    await executeInitStep(initInputs, outputs, evidence);
  }

  /**
   * Execute REPRO step - actual implementation
   */
  private async executeReproStep(
    outputs: Record<string, any>, 
    evidence: EvidenceItem[], 
    inputs?: Record<string, any>
  ): Promise<void> {
    const { executeReproStep } = await import('./workflow-steps/repro-step.js');
    
    const reproInputs = {
      workspacePath: inputs?.workspacePath || process.cwd(),
      taskGoals: inputs?.taskGoals,
      acceptanceCriteria: inputs?.acceptanceCriteria,
      touchedFiles: inputs?.touchedFiles,
      gitDiff: inputs?.gitDiff,
      packageScripts: inputs?.packageScripts,
      testCommand: inputs?.testCommand,
      buildCommand: inputs?.buildCommand
    };
    
    await executeReproStep(reproInputs, outputs, evidence);
  }

  /**
   * Execute STATIC step - actual implementation
   */
  private async executeStaticStep(
    outputs: Record<string, any>, 
    evidence: EvidenceItem[], 
    inputs?: Record<string, any>
  ): Promise<void> {
    const { executeStaticStep } = await import('./workflow-steps/static-step.js');
    
    const staticInputs = {
      workspacePath: inputs?.workspacePath || process.cwd(),
      touchedFiles: inputs?.touchedFiles,
      lintCommand: inputs?.lintCommand,
      formatCommand: inputs?.formatCommand,
      typeCheckCommand: inputs?.typeCheckCommand
    };
    
    await executeStaticStep(staticInputs, outputs, evidence);
  }

  /**
   * Execute TESTS step - actual implementation
   */
  private async executeTestsStep(
    outputs: Record<string, any>, 
    evidence: EvidenceItem[], 
    inputs?: Record<string, any>
  ): Promise<void> {
    const { executeTestsStep } = await import('./workflow-steps/tests-step.js');
    
    const testsInputs = {
      workspacePath: inputs?.workspacePath || process.cwd(),
      touchedFiles: inputs?.touchedFiles,
      testCommand: inputs?.testCommand,
      coverageCommand: inputs?.coverageCommand,
      testFramework: inputs?.testFramework,
      testDirectories: inputs?.testDirectories
    };
    
    await executeTestsStep(testsInputs, outputs, evidence);
  }

  /**
   * Execute DYNAMIC step - actual implementation
   */
  private async executeDynamicStep(
    outputs: Record<string, any>, 
    evidence: EvidenceItem[], 
    inputs?: Record<string, any>
  ): Promise<void> {
    const { executeDynamicStep } = await import('./workflow-steps/dynamic-step.js');
    
    const dynamicInputs = {
      workspacePath: inputs?.workspacePath || process.cwd(),
      touchedFiles: inputs?.touchedFiles,
      performanceCommand: inputs?.performanceCommand,
      securityCommand: inputs?.securityCommand,
      runtime: inputs?.runtime,
      testData: inputs?.testData
    };
    
    await executeDynamicStep(dynamicInputs, outputs, evidence);
  }

  /**
   * Execute CONFORM step - actual implementation
   */
  private async executeConformStep(
    outputs: Record<string, any>, 
    evidence: EvidenceItem[], 
    inputs?: Record<string, any>
  ): Promise<void> {
    const { executeConformStep } = await import('./workflow-steps/conform-step.js');
    
    const conformInputs = {
      workspacePath: inputs?.workspacePath || process.cwd(),
      touchedFiles: inputs?.touchedFiles,
      steeringPath: inputs?.steeringPath,
      constraints: inputs?.constraints,
      architecturePatterns: inputs?.architecturePatterns
    };
    
    await executeConformStep(conformInputs, outputs, evidence);
  }

  /**
   * Execute TRACE step - actual implementation
   */
  private async executeTraceStep(
    outputs: Record<string, any>, 
    evidence: EvidenceItem[], 
    inputs?: Record<string, any>
  ): Promise<void> {
    const { executeTraceStep } = await import('./workflow-steps/trace-step.js');
    
    const traceInputs = {
      workspacePath: inputs?.workspacePath || process.cwd(),
      acceptanceCriteria: inputs?.acceptanceCriteria,
      touchedFiles: inputs?.touchedFiles,
      testResults: inputs?.testResults,
      specPath: inputs?.specPath,
      implementationFiles: inputs?.implementationFiles
    };
    
    await executeTraceStep(traceInputs, outputs, evidence);
  }

  /**
   * Execute VERDICT step - actual implementation
   */
  private async executeVerdictStep(
    outputs: Record<string, any>, 
    evidence: EvidenceItem[], 
    inputs?: Record<string, any>
  ): Promise<void> {
    const { executeVerdictStep } = await import('./workflow-steps/verdict-step.js');
    
    const verdictInputs = {
      workspacePath: inputs?.workspacePath || process.cwd(),
      allEvidence: evidence,
      workflowResults: inputs?.workflowResults || {},
      iteration: inputs?.iteration,
      previousResults: inputs?.previousResults,
      qualityThresholds: inputs?.qualityThresholds
    };
    
    await executeVerdictStep(verdictInputs, outputs, evidence);
  }

  /**
   * Validate step order
   */
  private isStepOrderValid(step: WorkflowStep): boolean {
    return step.order === this.executionState.currentStepIndex + 1;
  }

  /**
   * Validate step outputs
   */
  private validateStepOutputs(step: WorkflowStep, outputs: Record<string, any>): void {
    if (!this.config.requireEvidence) {
      return;
    }

    for (const expectedOutput of step.expectedOutputs) {
      if (!(expectedOutput in outputs)) {
        throw new Error(`Missing required output '${expectedOutput}' for step '${step.name}'`);
      }
    }
  }

  /**
   * Generate next actions based on step results
   */
  private generateNextActions(step: WorkflowStep, evidence: EvidenceItem[]): string[] {
    const actions: string[] = [];
    
    // Add actions based on evidence severity
    const criticalEvidence = evidence.filter(e => e.severity === "Critical");
    const majorEvidence = evidence.filter(e => e.severity === "Major");
    
    if (criticalEvidence.length > 0) {
      actions.push(`Address ${criticalEvidence.length} critical issues found in ${step.name}`);
    }
    
    if (majorEvidence.length > 0) {
      actions.push(`Review ${majorEvidence.length} major issues found in ${step.name}`);
    }
    
    // Add step-specific next actions
    if (step.order < this.workflow.steps.length) {
      const nextStep = this.workflow.steps[step.order]; // Next step (order is 1-based)
      actions.push(`Proceed to ${nextStep.name}: ${nextStep.description}`);
    } else {
      actions.push("Workflow complete - review final verdict and evidence");
    }
    
    return actions;
  }

  /**
   * Get current execution state
   */
  getExecutionState(): WorkflowExecutionState {
    return { ...this.executionState };
  }

  /**
   * Get current step
   */
  getCurrentStep(): WorkflowStep | null {
    if (this.executionState.currentStepIndex >= this.workflow.steps.length) {
      return null;
    }
    return this.workflow.steps[this.executionState.currentStepIndex];
  }

  /**
   * Get all collected evidence
   */
  getAllEvidence(): EvidenceItem[] {
    return [...this.executionState.allEvidence];
  }

  /**
   * Get evidence by severity
   */
  getEvidenceBySeverity(severity: "Critical" | "Major" | "Minor"): EvidenceItem[] {
    return this.executionState.allEvidence.filter(e => e.severity === severity);
  }

  /**
   * Check if workflow is complete
   */
  isComplete(): boolean {
    return this.executionState.status === "completed";
  }

  /**
   * Check if workflow has failed
   */
  hasFailed(): boolean {
    return this.executionState.status === "failed";
  }

  /**
   * Reset workflow execution
   */
  reset(): void {
    this.executionState = this.initializeExecutionState();
  }

  /**
   * Skip to a specific step (if allowed)
   */
  skipToStep(stepName: string): void {
    if (!this.config.allowSkipping) {
      throw new Error("Step skipping is not allowed in current configuration");
    }

    const stepIndex = this.workflow.steps.findIndex(s => s.name === stepName);
    if (stepIndex === -1) {
      throw new Error(`Step '${stepName}' not found in workflow`);
    }

    this.executionState.currentStepIndex = stepIndex;
  }
}

// ============================================================================
// Workflow Validation Utilities
// ============================================================================

/**
 * Validate workflow definition
 */
export function validateWorkflow(workflow: AuditWorkflow): string[] {
  const errors: string[] = [];

  // Check step ordering
  const expectedOrder = Array.from({ length: workflow.steps.length }, (_, i) => i + 1);
  const actualOrder = workflow.steps.map(s => s.order).sort((a, b) => a - b);
  
  if (JSON.stringify(expectedOrder) !== JSON.stringify(actualOrder)) {
    errors.push("Workflow steps must have consecutive order numbers starting from 1");
  }

  // Check for duplicate step names
  const stepNames = workflow.steps.map(s => s.name);
  const uniqueNames = new Set(stepNames);
  if (stepNames.length !== uniqueNames.size) {
    errors.push("Workflow steps must have unique names");
  }

  // Check required steps
  const requiredSteps = workflow.steps.filter(s => s.required);
  if (requiredSteps.length === 0) {
    errors.push("Workflow must have at least one required step");
  }

  // Validate step definitions
  for (const step of workflow.steps) {
    if (!step.name || step.name.trim() === "") {
      errors.push(`Step at order ${step.order} must have a non-empty name`);
    }
    
    if (!step.description || step.description.trim() === "") {
      errors.push(`Step '${step.name}' must have a non-empty description`);
    }
    
    if (!step.actions || step.actions.length === 0) {
      errors.push(`Step '${step.name}' must have at least one action`);
    }
    
    if (!step.expectedOutputs || step.expectedOutputs.length === 0) {
      errors.push(`Step '${step.name}' must have at least one expected output`);
    }
  }

  return errors;
}

/**
 * Create audit workflow engine with validation
 */
export function createAuditWorkflowEngine(
  workflow?: AuditWorkflow, 
  config?: Partial<WorkflowConfig>
): AuditWorkflowEngine {
  const workflowToUse = workflow || DEFAULT_AUDIT_WORKFLOW;
  
  // Validate workflow
  const validationErrors = validateWorkflow(workflowToUse);
  if (validationErrors.length > 0) {
    throw new Error(`Workflow validation failed: ${validationErrors.join(", ")}`);
  }
  
  return new AuditWorkflowEngine(workflowToUse, config);
}

// ============================================================================
// Default Export
// ============================================================================

export { AuditWorkflowEngine as default };