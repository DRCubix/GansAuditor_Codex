/**
 * CONFORM Step Implementation
 *
 * This module implements the CONFORM step of the audit workflow, which handles:
 * - Naming convention validation using Steering rules
 * - Architecture pattern compliance checking
 * - Library usage validation
 * - Dependency analysis and validation
 *
 * Requirements: 2.6
 */
import { EvidenceItem } from '../workflow-types.js';
/**
 * Execute the CONFORM step of the audit workflow
 */
export declare function executeConformStep(inputs: ConformStepInputs, outputs: Record<string, any>, evidence: EvidenceItem[]): Promise<void>;
/**
 * Input parameters for CONFORM step
 */
export interface ConformStepInputs {
    /** Workspace root path */
    workspacePath: string;
    /** Touched files from INIT step */
    touchedFiles?: string[];
    /** Path to steering documents */
    steeringPath?: string;
    /** Project constraints from INIT step */
    constraints?: string[];
    /** Architecture patterns to validate */
    architecturePatterns?: string[];
}
/**
 * Output from CONFORM step
 */
export interface ConformStepOutputs {
    /** Naming convention violations */
    namingViolations: NamingViolation[];
    /** Architecture pattern violations */
    architectureViolations: ArchitectureViolation[];
    /** Library usage issues */
    libraryIssues: LibraryIssue[];
    /** Dependency analysis results */
    dependencyAnalysis: DependencyAnalysis;
}
/**
 * Naming convention violation
 */
export interface NamingViolation {
    /** File where violation occurred */
    file: string;
    /** Line number */
    line: number;
    /** Column number */
    column?: number;
    /** Type of violation */
    violationType: string;
    /** Description of the violation */
    violation: string;
    /** Current name */
    currentName: string;
    /** Suggested name */
    suggestedName?: string;
    /** Severity level */
    severity: 'Critical' | 'Major' | 'Minor';
}
/**
 * Architecture pattern violation
 */
export interface ArchitectureViolation {
    /** File where violation occurred */
    file: string;
    /** Line number */
    line: number;
    /** Pattern that was violated */
    pattern: string;
    /** Description of the violation */
    violation: string;
    /** Suggested fix */
    suggestedFix: string;
    /** Severity level */
    severity: 'Critical' | 'Major' | 'Minor';
}
/**
 * Library usage issue
 */
export interface LibraryIssue {
    /** Library name */
    library: string;
    /** Version if applicable */
    version?: string;
    /** Type of issue */
    issue: string;
    /** Severity level */
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    /** Description */
    description: string;
    /** Recommendation */
    recommendation: string;
}
/**
 * Dependency analysis results
 */
export interface DependencyAnalysis {
    /** Total number of dependencies */
    totalDependencies: number;
    /** Number of outdated dependencies */
    outdatedDependencies: number;
    /** Number of vulnerable dependencies */
    vulnerableDependencies: number;
    /** Number of unused dependencies */
    unusedDependencies: number;
    /** Dependency tree depth */
    dependencyTreeDepth: number;
    /** Bundle size impact */
    bundleSizeImpact: string;
    /** License compliance issues */
    licenseIssues: string[];
}
/**
 * Default CONFORM step inputs
 */
export declare const DEFAULT_CONFORM_INPUTS: Partial<ConformStepInputs>;
//# sourceMappingURL=conform-step.d.ts.map