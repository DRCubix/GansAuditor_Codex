/**
 * Audit Workflow Implementation
 *
 * This module implements the AuditWorkflow class with step execution logic,
 * validation, ordering enforcement, and evidence collection as specified in
 * requirements 2.1 and 2.2.
 */
import { AuditWorkflow, WorkflowStep, WorkflowStepResult, WorkflowExecutionState, WorkflowConfig, EvidenceItem } from './workflow-types.js';
/**
 * Main audit workflow execution engine
 */
export declare class AuditWorkflowEngine {
    private workflow;
    private config;
    private executionState;
    constructor(workflow?: AuditWorkflow, config?: Partial<WorkflowConfig>);
    /**
     * Initialize workflow execution state
     */
    private initializeExecutionState;
    /**
     * Start workflow execution
     */
    startExecution(): Promise<void>;
    /**
     * Execute the next workflow step
     */
    executeNextStep(stepInputs?: Record<string, any>): Promise<WorkflowStepResult>;
    /**
     * Execute a specific workflow step
     */
    private executeStep;
    /**
     * Execute INIT step - actual implementation
     */
    private executeInitStep;
    /**
     * Execute REPRO step - actual implementation
     */
    private executeReproStep;
    /**
     * Execute STATIC step - actual implementation
     */
    private executeStaticStep;
    /**
     * Execute TESTS step - actual implementation
     */
    private executeTestsStep;
    /**
     * Execute DYNAMIC step - actual implementation
     */
    private executeDynamicStep;
    /**
     * Execute CONFORM step - actual implementation
     */
    private executeConformStep;
    /**
     * Execute TRACE step - actual implementation
     */
    private executeTraceStep;
    /**
     * Execute VERDICT step - actual implementation
     */
    private executeVerdictStep;
    /**
     * Validate step order
     */
    private isStepOrderValid;
    /**
     * Validate step outputs
     */
    private validateStepOutputs;
    /**
     * Generate next actions based on step results
     */
    private generateNextActions;
    /**
     * Get current execution state
     */
    getExecutionState(): WorkflowExecutionState;
    /**
     * Get current step
     */
    getCurrentStep(): WorkflowStep | null;
    /**
     * Get all collected evidence
     */
    getAllEvidence(): EvidenceItem[];
    /**
     * Get evidence by severity
     */
    getEvidenceBySeverity(severity: "Critical" | "Major" | "Minor"): EvidenceItem[];
    /**
     * Check if workflow is complete
     */
    isComplete(): boolean;
    /**
     * Check if workflow has failed
     */
    hasFailed(): boolean;
    /**
     * Reset workflow execution
     */
    reset(): void;
    /**
     * Skip to a specific step (if allowed)
     */
    skipToStep(stepName: string): void;
}
/**
 * Validate workflow definition
 */
export declare function validateWorkflow(workflow: AuditWorkflow): string[];
/**
 * Create audit workflow engine with validation
 */
export declare function createAuditWorkflowEngine(workflow?: AuditWorkflow, config?: Partial<WorkflowConfig>): AuditWorkflowEngine;
export { AuditWorkflowEngine as default };
//# sourceMappingURL=audit-workflow.d.ts.map