/**
 * INIT Step Implementation
 *
 * This module implements the INIT step of the audit workflow, which handles:
 * - Task goal extraction from Spec documents
 * - Acceptance criteria parsing and validation
 * - Constraint identification from Steering documents
 * - Touched files/modules detection logic
 *
 * Requirements: 2.1
 */
import { EvidenceItem } from '../workflow-types.js';
/**
 * Execute the INIT step of the audit workflow
 */
export declare function executeInitStep(inputs: InitStepInputs, outputs: Record<string, any>, evidence: EvidenceItem[]): Promise<void>;
/**
 * Input parameters for INIT step
 */
export interface InitStepInputs {
    /** Path to the spec directory */
    specPath?: string;
    /** Path to the steering directory */
    steeringPath?: string;
    /** Workspace root path */
    workspacePath: string;
    /** Git diff for detecting changes */
    gitDiff?: string;
    /** Session identifier */
    sessionId?: string;
    /** Branch identifier for continuity */
    branchId?: string;
    /** Previous audit results */
    previousResults?: any[];
    /** Current iteration number */
    iteration?: number;
}
/**
 * Default INIT step inputs
 */
export declare const DEFAULT_INIT_INPUTS: Partial<InitStepInputs>;
//# sourceMappingURL=init-step.d.ts.map