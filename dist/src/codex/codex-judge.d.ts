/**
 * Production Codex CLI integration for GAN auditing
 *
 * This module implements the production-ready CodexJudge class that executes
 * Codex CLI commands for code analysis and audit feedback generation.
 *
 * This implementation removes all mock functionality and fallback responses,
 * using robust process management and comprehensive error handling.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
import type { ICodexJudge } from '../types/integration-types.js';
import type { AuditRequest, GanReview } from '../types/gan-types.js';
/**
 * Configuration for production Codex CLI execution
 */
export interface CodexJudgeConfig {
    executable: string;
    timeout: number;
    retries: number;
    workingDirectory?: string;
    maxConcurrentProcesses: number;
    processCleanupTimeout: number;
    enableDebugLogging: boolean;
    failFast: boolean;
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
 * Production implementation of Codex CLI integration for GAN auditing
 *
 * This implementation completely removes all mock functionality and fallback responses.
 * It uses robust process management, comprehensive error handling, and strict validation.
 *
 * Requirements:
 * - 1.1: Execute actual Codex CLI without any mock fallback
 * - 1.2: Return proper error responses instead of mock data
 * - 1.5: Never use mock data under any circumstances
 */
export declare class CodexJudge implements ICodexJudge {
    private readonly config;
    private readonly processManager;
    private readonly environmentManager;
    private readonly codexValidator;
    private readonly componentLogger;
    private isInitialized;
    constructor(config?: Partial<CodexJudgeConfig>);
    /**
     * Execute audit using Codex CLI with production-ready process management
     * Requirements: 1.1, 1.2, 1.5 - Execute actual Codex CLI without any mock fallback
     */
    executeAudit(request: AuditRequest): Promise<GanReview>;
    /**
     * Ensure the system is initialized and Codex CLI is available
     * Requirements: 1.3, 1.4 - Validate Codex CLI before accepting requests
     */
    private ensureInitialized;
    /**
     * Check if Codex CLI is available (simplified interface)
     * Requirements: 1.3, 1.4 - Comprehensive availability checking
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get Codex CLI version information
     */
    getVersion(): Promise<string | null>;
    /**
     * Get active process count from process manager
     * Requirements: 6.1 - Process management integration
     */
    getActiveProcessCount(): number;
    /**
     * Terminate all active processes
     * Requirements: 6.2, 6.4 - Proper cleanup mechanisms
     */
    terminateAllProcesses(): Promise<void>;
    /**
     * Get health status from process manager
     * Requirements: 6.5 - Health monitoring
     */
    getHealthStatus(): import("./process-manager.js").ProcessHealthStatus;
    /**
     * Execute Codex CLI command using ProcessManager
     * Requirements: 1.1, 1.3 - Reliable execution with proper process management
     */
    private executeCodexCommandWithProcessManager;
    /**
     * Generate structured audit prompt for Codex CLI with proper input validation
     * Requirements: 1.1, 1.3 - Fix command argument generation for reliable execution
     */
    private generateAuditPrompt;
    /**
     * Validate audit request parameters
     * Requirements: 1.1, 1.3 - Add proper input handling and validation
     */
    private validateAuditRequest;
    /**
     * Sanitize input to prevent command injection and formatting issues
     * Requirements: 1.1, 1.3 - Proper input handling and validation
     */
    private sanitizeInput;
    /**
     * Format rubric dimensions for prompt
     */
    private formatRubricDimensions;
    /**
     * Generate dimension template for JSON response
     */
    private generateDimensionTemplate;
    /**
     * Parse and validate Codex CLI response with strict validation
     * Requirements: 1.2, 4.1, 4.5 - Strict response validation without fallbacks
     */
    private parseCodexResponse;
    /**
     * Parse Codex CLI JSONL (JSON Lines) format with strict validation
     * Requirements: 1.2, 4.1 - Strict response validation without fallbacks
     */
    private parseCodexJsonLines;
    /**
     * Extract JSON from natural language response with strict validation
     * Requirements: 1.2, 4.1, 4.5 - Remove greedy parsing fallbacks that mask errors
     */
    private extractJsonFromNaturalLanguage;
    /**
     * Validate if response has required Codex format
     * Requirements: 1.2, 4.1 - Strict response validation without fallbacks
     */
    private isValidCodexResponse;
    /**
     * Validate and normalize parsed response with strict validation
     * Requirements: 1.2, 4.1, 4.5 - Comprehensive JSON parsing with proper error handling
     */
    private validateAndNormalizeResponse;
    /**
     * Validate score value (0-100) with strict error collection
     */
    private validateScore;
    /**
     * Validate verdict value with strict error collection
     */
    private validateVerdict;
    /**
     * Validate dimensional scores with strict error collection
     */
    private validateDimensions;
    /**
     * Validate review details with strict error collection
     */
    private validateReview;
    /**
     * Validate iterations with strict error collection
     */
    private validateIterations;
    /**
     * Validate inline comment structure
     */
    private isValidInlineComment;
    /**
     * Validate judge cards with strict error collection
     */
    private validateJudgeCards;
    /**
     * Create default dimensions
     */
    private createDefaultDimensions;
    /**
     * Create default review
     */
    private createDefaultReview;
    /**
     * Create default judge cards
     */
    private createDefaultJudgeCards;
    /**
     * Create enhanced error with diagnostic information
     * Requirements: 4.1, 4.2 - Comprehensive error handling with actionable guidance
     */
    private createEnhancedError;
    /**
     * Utility function for delays
     */
    private delay;
    /**
     * Execute audit with system prompt - Not supported in production mode
     * Requirements: 5.1, 5.3, 5.5 - Remove all fallback functionality
     */
    executeAuditWithSystemPrompt(): Promise<never>;
    /**
     * Parse workflow step results - Not supported in production mode
     * Requirements: 5.1, 5.3, 5.5 - Remove all fallback functionality
     */
    parseWorkflowStepResults(): never;
    /**
     * Validate prompt-driven response - Not supported in production mode
     * Requirements: 5.1, 5.3, 5.5 - Remove all fallback functionality
     */
    validatePromptDrivenResponse(): never;
    /**
     * Generate structured audit prompt - Not supported in production mode
     * Requirements: 5.1, 5.3, 5.5 - Remove all fallback functionality
     */
    generateStructuredAuditPrompt(): never;
}
//# sourceMappingURL=codex-judge.d.ts.map