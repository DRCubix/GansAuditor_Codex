/**
 * STATIC Step Implementation
 *
 * This module implements the STATIC step of the audit workflow, which handles:
 * - Integration with existing linting tools and configurations
 * - Formatting validation using project standards
 * - Type checking integration
 * - Code smell detection using static analysis patterns
 *
 * Requirements: 2.3
 */
import { EvidenceItem } from '../workflow-types.js';
/**
 * Execute the STATIC step of the audit workflow
 */
export declare function executeStaticStep(inputs: StaticStepInputs, outputs: Record<string, any>, evidence: EvidenceItem[]): Promise<void>;
/**
 * Input parameters for STATIC step
 */
export interface StaticStepInputs {
    /** Workspace root path */
    workspacePath: string;
    /** Touched files from INIT step */
    touchedFiles?: string[];
    /** Lint command to run */
    lintCommand?: string;
    /** Format command to run */
    formatCommand?: string;
    /** Type check command to run */
    typeCheckCommand?: string;
}
/**
 * Default STATIC step inputs
 */
export declare const DEFAULT_STATIC_INPUTS: Partial<StaticStepInputs>;
//# sourceMappingURL=static-step.d.ts.map