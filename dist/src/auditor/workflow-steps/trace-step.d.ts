/**
 * TRACE Step Implementation
 *
 * This module implements the TRACE step of the audit workflow, which handles:
 * - Traceability matrix generation
 * - AC to implementation mapping
 * - Unmet AC identification and reporting
 * - Missing implementation detection
 *
 * Requirements: 2.7
 */
import { EvidenceItem, AcceptanceCriterion } from '../workflow-types.js';
/**
 * Execute the TRACE step of the audit workflow
 */
export declare function executeTraceStep(inputs: TraceStepInputs, outputs: Record<string, any>, evidence: EvidenceItem[]): Promise<void>;
/**
 * Input parameters for TRACE step
 */
export interface TraceStepInputs {
    /** Workspace root path */
    workspacePath: string;
    /** Acceptance criteria from INIT step */
    acceptanceCriteria?: AcceptanceCriterion[];
    /** Touched files from INIT step */
    touchedFiles?: string[];
    /** Test results from TESTS step */
    testResults?: any[];
    /** Path to spec documents */
    specPath?: string;
    /** Additional implementation files to analyze */
    implementationFiles?: string[];
}
/**
 * Output from TRACE step
 */
export interface TraceStepOutputs {
    /** Traceability matrix mapping ACs to implementations and tests */
    traceabilityMatrix: TraceabilityMatrix;
    /** AC to implementation file mapping */
    acImplementationMapping: ACImplementationMapping;
    /** List of unmet acceptance criteria */
    unmetACs: string[];
    /** Missing implementation details */
    missingImplementations: MissingImplementation[];
    /** Coverage report summary */
    coverageReport: CoverageReport;
}
/**
 * Traceability matrix structure
 */
export interface TraceabilityMatrix {
    [acId: string]: {
        /** AC description */
        description: string;
        /** Implementation files that address this AC */
        implementationFiles: string[];
        /** Test files that verify this AC */
        testFiles: string[];
        /** Whether this AC is fully covered */
        covered: boolean;
        /** Coverage percentage (0-100) */
        coveragePercentage: number;
        /** Evidence of implementation */
        evidence: string[];
        /** Related code snippets */
        codeReferences: CodeReference[];
    };
}
/**
 * AC to implementation mapping
 */
export interface ACImplementationMapping {
    [acId: string]: {
        /** Primary implementation files */
        primaryFiles: string[];
        /** Supporting implementation files */
        supportingFiles: string[];
        /** Test files */
        testFiles: string[];
        /** Implementation status */
        status: 'complete' | 'partial' | 'missing';
        /** Implementation confidence (0-100) */
        confidence: number;
    };
}
/**
 * Missing implementation details
 */
export interface MissingImplementation {
    /** AC ID */
    acId: string;
    /** AC description */
    description: string;
    /** What is missing */
    missingAspects: string[];
    /** Suggested implementation approach */
    suggestedApproach: string;
    /** Priority level */
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
}
/**
 * Coverage report summary
 */
export interface CoverageReport {
    /** Total number of ACs */
    totalACs: number;
    /** Number of implemented ACs */
    implementedACs: number;
    /** Number of tested ACs */
    testedACs: number;
    /** Number of fully covered ACs */
    fullyCoveredACs: number;
    /** Overall coverage percentage */
    coveragePercentage: number;
    /** Implementation coverage percentage */
    implementationCoverage: number;
    /** Test coverage percentage */
    testCoverage: number;
    /** Coverage gaps summary */
    gapsSummary: string[];
}
/**
 * Code reference for traceability
 */
export interface CodeReference {
    /** File path */
    file: string;
    /** Line number */
    line: number;
    /** Code snippet */
    snippet: string;
    /** Reference type */
    type: 'implementation' | 'test' | 'comment' | 'documentation';
}
/**
 * Default TRACE step inputs
 */
export declare const DEFAULT_TRACE_INPUTS: Partial<TraceStepInputs>;
//# sourceMappingURL=trace-step.d.ts.map