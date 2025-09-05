/**
 * Codex CLI integration for GAN auditing
 *
 * This module implements the CodexJudge class that executes Codex CLI commands
 * for code analysis and audit feedback generation.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
import type { ICodexJudge } from '../types/integration-types.js';
import type { AuditRequest, GanReview } from '../types/gan-types.js';
/**
 * Configuration for Codex CLI execution
 */
export interface CodexJudgeConfig {
    executable: string;
    timeout: number;
    retries: number;
    workingDirectory?: string;
}
/**
 * Workflow step result structure
 */
export interface WorkflowStepResult {
    stepName: string;
    success: boolean;
    evidence: string[];
    issues: Array<{
        severity: 'critical' | 'major' | 'minor';
        description: string;
        location?: string;
    }>;
    score?: number;
    duration?: number;
    metadata?: Record<string, any>;
}
/**
 * Workflow step results collection
 */
export interface WorkflowStepResults {
    steps: WorkflowStepResult[];
    overallSuccess: boolean;
    totalDuration: number;
    criticalIssuesCount: number;
}
/**
 * Prompt response structure expectations
 */
export interface PromptResponseStructure {
    requireWorkflowSteps: boolean;
    requireCompletionAnalysis: boolean;
    requireNextActions: boolean;
}
/**
 * Validation result for prompt responses
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    score: number;
}
/**
 * Error thrown when Codex CLI is not available
 */
export declare class CodexNotAvailableError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when Codex CLI execution times out
 */
export declare class CodexTimeoutError extends Error {
    constructor(timeout: number);
}
/**
 * Error thrown when Codex CLI returns invalid response
 */
export declare class CodexResponseError extends Error {
    readonly rawResponse?: string | undefined;
    constructor(message: string, rawResponse?: string | undefined);
}
/**
 * Implementation of Codex CLI integration for GAN auditing
 *
 * Requirement 7.1: Execute Codex CLI commands in headless mode
 * Requirement 7.2: Handle errors gracefully with fallback responses
 * Requirement 7.3: Parse JSON responses and validate structure
 * Requirement 7.4: Attempt greedy parsing for malformed responses
 * Requirement 7.5: Provide clear error messages for unavailable Codex
 *
 * Enhanced for prompt-driven auditing (Requirements 6.2):
 * - Structured prompt generation with system prompt injection
 * - Workflow step result parsing from Codex responses
 * - Response validation for prompt-driven outputs
 */
export declare class CodexJudge implements ICodexJudge {
    private readonly config;
    constructor(config?: Partial<CodexJudgeConfig>);
    /**
     * Execute audit using Codex CLI
     * Requirement 7.1: Execute Codex CLI commands in headless mode
     */
    executeAudit(request: AuditRequest): Promise<GanReview>;
    /**
     * Check if Codex CLI is available
     * Requirement 7.5: Provide clear error messages for unavailable Codex
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get Codex CLI version information
     */
    getVersion(): Promise<string | null>;
    /**
     * Execute Codex CLI command with audit request
     * Requirement 7.1: Execute Codex CLI commands in headless mode
     */
    private executeCodexCommand;
    /**
     * Generate structured audit prompt for Codex CLI
     * Requirement 7.2: Implement audit prompt generation with structured rubric and context
     */
    private generateAuditPrompt;
    /**
     * Parse and validate Codex CLI response
     * Requirement 7.3: Parse JSON responses and validate structure
     * Requirement 7.4: Attempt greedy parsing for malformed responses
     */
    private parseCodexResponse;
    /**
     * Attempt greedy parsing for malformed JSON responses
     * Requirement 7.4: Attempt greedy parsing for malformed responses
     */
    private greedyJsonParse;
    /**
     * Validate and normalize parsed response
     * Requirement 7.3: Parse JSON responses and validate structure
     */
    private validateAndNormalizeResponse;
    /**
     * Validate score value (0-100)
     */
    private validateScore;
    /**
     * Validate verdict value
     */
    private validateVerdict;
    /**
     * Validate dimensional scores
     */
    private validateDimensions;
    /**
     * Validate review details
     */
    private validateReview;
    /**
     * Validate inline comment structure
     */
    private isValidInlineComment;
    /**
     * Validate judge cards
     */
    private validateJudgeCards;
    /**
     * Create fallback response for error scenarios
     * Requirement 7.2: Handle errors gracefully with fallback responses
     */
    private createFallbackResponse;
    /**
     * Execute command with timeout and input support
     */
    private executeCommand;
    /**
     * Utility function for delays
     */
    private delay;
    /**
     * Execute audit with structured system prompt injection
     * Requirement 6.2: Implement prompt template injection into Codex requests
     */
    executeAuditWithSystemPrompt(request: AuditRequest, systemPrompt: string, promptContext?: {
        variables: Record<string, any>;
        metadata: any;
    }): Promise<GanReview>;
    /**
     * Parse workflow step results from Codex response
     * Requirement 6.2: Add workflow step result parsing from Codex responses
     */
    parseWorkflowStepResults(rawResponse: string): WorkflowStepResults;
    /**
     * Validate response structure for prompt-driven outputs
     * Requirement 6.2: Create response validation for prompt-driven outputs
     */
    validatePromptDrivenResponse(response: any, expectedStructure?: PromptResponseStructure): ValidationResult;
    /**
     * Generate structured audit prompt with system prompt integration
     * Requirement 6.2: Extend CodexJudge to support structured prompt generation
     */
    generateStructuredAuditPrompt(request: AuditRequest, systemPrompt: string, promptContext?: {
        variables: Record<string, any>;
        metadata: any;
    }): string;
    /**
     * Execute Codex CLI command with system prompt injection
     */
    private executeCodexCommandWithPrompt;
    /**
     * Parse Codex response with prompt-specific validation
     */
    private parseCodexResponseWithPromptValidation;
    /**
     * Validate and normalize parsed response with prompt enhancements
     */
    private validateAndNormalizePromptResponse;
    /**
     * Create prompt-aware fallback response
     */
    private createPromptAwareFallbackResponse;
    /**
     * Parse workflow steps with greedy parsing for malformed responses
     */
    private parseWorkflowStepsGreedy;
    /**
     * Validate workflow step structure
     */
    private isValidWorkflowStep;
    /**
     * Parse step issues from raw data
     */
    private parseStepIssues;
    /**
     * Calculate workflow score from step results
     */
    private calculateWorkflowScore;
    /**
     * Extract evidence from text using pattern matching
     */
    private extractEvidenceFromText;
    /**
     * Extract issues from text using pattern matching
     */
    private extractIssuesFromText;
    /**
     * Extract score from text using pattern matching
     */
    private extractScoreFromText;
    /**
     * Validate GAN review structure
     */
    private isValidGanReview;
}
//# sourceMappingURL=codex-judge.d.ts.map