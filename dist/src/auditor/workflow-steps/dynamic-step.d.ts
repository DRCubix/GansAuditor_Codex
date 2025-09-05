/**
 * DYNAMIC Step Implementation
 *
 * This module implements the DYNAMIC step of the audit workflow, which handles:
 * - Edge case testing framework
 * - Boundary condition validation
 * - Performance check integration
 * - Security vulnerability scanning
 *
 * Requirements: 2.5
 */
import { EvidenceItem } from '../workflow-types.js';
/**
 * Execute the DYNAMIC step of the audit workflow
 */
export declare function executeDynamicStep(inputs: DynamicStepInputs, outputs: Record<string, any>, evidence: EvidenceItem[]): Promise<void>;
/**
 * Input parameters for DYNAMIC step
 */
export interface DynamicStepInputs {
    /** Workspace root path */
    workspacePath: string;
    /** Touched files from INIT step */
    touchedFiles?: string[];
    /** Performance test command */
    performanceCommand?: string;
    /** Security scan command */
    securityCommand?: string;
    /** Runtime environment (node, browser, etc.) */
    runtime?: string;
    /** Test data for edge case testing */
    testData?: any[];
}
/**
 * Output from DYNAMIC step
 */
export interface DynamicStepOutputs {
    /** Results from edge case testing */
    edgeCaseResults: EdgeCaseResult[];
    /** Results from error handling validation */
    errorHandlingResults: ErrorHandlingResult[];
    /** Performance metrics */
    performanceMetrics: PerformanceMetrics;
    /** Security vulnerability findings */
    securityFindings: SecurityFinding[];
}
/**
 * Edge case test result
 */
export interface EdgeCaseResult {
    /** Test scenario description */
    scenario: string;
    /** Input data used for testing */
    input: any;
    /** Expected output */
    expected: any;
    /** Actual output */
    actual: any;
    /** Test status */
    status: 'passed' | 'failed' | 'error';
    /** Error message if failed */
    error?: string;
    /** Execution time in milliseconds */
    executionTime: number;
}
/**
 * Error handling test result
 */
export interface ErrorHandlingResult {
    /** Error type being tested */
    errorType: string;
    /** Whether error is properly handled */
    handled: boolean;
    /** Error message or response */
    errorMessage?: string;
    /** Recovery mechanism used */
    recoveryMechanism?: string;
    /** Test scenario */
    scenario: string;
}
/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    /** Average response time in milliseconds */
    averageResponseTime: number;
    /** Peak response time in milliseconds */
    peakResponseTime: number;
    /** Memory usage in MB */
    memoryUsage: number;
    /** Peak memory usage in MB */
    peakMemoryUsage: number;
    /** CPU usage percentage */
    cpuUsage: number;
    /** Throughput (operations per second) */
    throughput: number;
    /** Performance bottlenecks identified */
    bottlenecks: string[];
}
/**
 * Security vulnerability finding
 */
export interface SecurityFinding {
    /** Vulnerability type */
    type: string;
    /** Severity level */
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    /** Description of the vulnerability */
    description: string;
    /** File location */
    file?: string;
    /** Line number */
    line?: number;
    /** Proof of concept or evidence */
    proof: string;
    /** Recommended fix */
    recommendation: string;
}
/**
 * Default DYNAMIC step inputs
 */
export declare const DEFAULT_DYNAMIC_INPUTS: Partial<DynamicStepInputs>;
//# sourceMappingURL=dynamic-step.d.ts.map