/**
 * Mock implementation of CodexJudge for testing
 *
 * This module provides a mock implementation of the CodexJudge interface
 * for use in unit tests and development scenarios where Codex CLI is not available.
 */
import type { IMockCodexJudge } from '../types/integration-types.js';
import type { AuditRequest, GanReview } from '../types/gan-types.js';
/**
 * Mock implementation of CodexJudge for testing
 * Requirement 7.5: Create mock Codex responses for testing
 */
export declare class MockCodexJudge implements IMockCodexJudge {
    private mockResponse;
    private mockError;
    private callHistory;
    private isCodexAvailable;
    /**
     * Execute audit with mock response
     */
    executeAudit(request: AuditRequest): Promise<GanReview>;
    /**
     * Check if Codex CLI is available (mock)
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get Codex CLI version (mock)
     */
    getVersion(): Promise<string | null>;
    /**
     * Set mock response for next audit
     */
    setMockResponse(response: GanReview): void;
    /**
     * Set mock error for next audit
     */
    setMockError(error: Error): void;
    /**
     * Get call history for testing
     */
    getCallHistory(): AuditRequest[];
    /**
     * Set whether Codex should appear available
     */
    setAvailable(available: boolean): void;
    /**
     * Clear call history
     */
    clearHistory(): void;
    /**
     * Reset all mock state
     */
    reset(): void;
    /**
     * Generate a realistic mock response based on the request
     */
    private generateDefaultMockResponse;
    /**
     * Generate mock summary based on score and verdict
     */
    private generateMockSummary;
    /**
     * Generate mock diff for proposed improvements
     */
    private generateMockDiff;
    /**
     * Simple hash function for deterministic randomness
     */
    private simpleHash;
    /**
     * Utility function for delays
     */
    private delay;
    /**
     * Execute audit with structured system prompt injection
     */
    executeAuditWithSystemPrompt(request: any, systemPrompt: string, promptContext?: {
        variables: Record<string, any>;
        metadata: any;
    }): Promise<any>;
    /**
     * Parse workflow step results from Codex response
     */
    parseWorkflowStepResults(rawResponse: string): {
        steps: Array<{
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
        }>;
        overallSuccess: boolean;
        totalDuration: number;
        criticalIssuesCount: number;
    };
    /**
     * Validate response structure for prompt-driven outputs
     */
    validatePromptDrivenResponse(response: any, expectedStructure?: {
        requireWorkflowSteps: boolean;
        requireCompletionAnalysis: boolean;
        requireNextActions: boolean;
    }): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
        score: number;
    };
    /**
     * Generate structured audit prompt with system prompt integration
     */
    generateStructuredAuditPrompt(request: any, systemPrompt: string, promptContext?: {
        variables: Record<string, any>;
    }): string;
}
/**
 * Factory function to create mock responses for testing
 */
export declare function createMockGanReview(overrides?: Partial<GanReview>): GanReview;
/**
 * Create mock audit request for testing
 */
export declare function createMockAuditRequest(overrides?: Partial<AuditRequest>): AuditRequest;
//# sourceMappingURL=mock-codex-judge.d.ts.map