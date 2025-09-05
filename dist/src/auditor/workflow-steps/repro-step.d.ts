/**
 * REPRO Step Implementation
 *
 * This module implements the REPRO step of the audit workflow, which handles:
 * - Reproduction step generation logic
 * - Current behavior verification
 * - Expected vs actual behavior documentation
 * - Minimal command sequence generation
 *
 * Requirements: 2.2
 */
import { EvidenceItem } from '../workflow-types.js';
/**
 * Execute the REPRO step of the audit workflow
 */
export declare function executeReproStep(inputs: ReproStepInputs, outputs: Record<string, any>, evidence: EvidenceItem[]): Promise<void>;
/**
 * Input parameters for REPRO step
 */
export interface ReproStepInputs {
    /** Workspace root path */
    workspacePath: string;
    /** Task goals from INIT step */
    taskGoals?: string[];
    /** Acceptance criteria from INIT step */
    acceptanceCriteria?: any[];
    /** Touched files from INIT step */
    touchedFiles?: string[];
    /** Git diff for understanding changes */
    gitDiff?: string;
    /** Package.json scripts */
    packageScripts?: Record<string, string>;
    /** Test command to run */
    testCommand?: string;
    /** Build command to run */
    buildCommand?: string;
}
/**
 * Default REPRO step inputs
 */
export declare const DEFAULT_REPRO_INPUTS: Partial<ReproStepInputs>;
//# sourceMappingURL=repro-step.d.ts.map