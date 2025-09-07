/**
 * Mock implementation of CodexJudge for testing
 * 
 * This module provides a mock implementation of the CodexJudge interface
 * for use in unit tests and development scenarios where Codex CLI is not available.
 * 
 * NOTE: This is a TEST-ONLY module and should never be used in production.
 */

import type {
  IMockCodexJudge,
} from '../../types/integration-types.js';
import type {
  AuditRequest,
  GanReview,
} from '../../types/gan-types.js';
import { DEFAULT_AUDIT_RUBRIC } from '../../types/gan-types.js';

/**
 * Mock implementation of CodexJudge for testing
 * Requirement 7.5: Create mock Codex responses for testing
 * 
 * WARNING: This is for testing purposes only and should never be used in production
 */
export class MockCodexJudge implements IMockCodexJudge {
  private mockResponse: GanReview | null = null;
  private mockError: Error | null = null;
  private callHistory: AuditRequest[] = [];
  private isCodexAvailable = true;

  /**
   * Execute audit with mock response
   */
  async executeAudit(request: AuditRequest): Promise<GanReview> {
    // Record the call for testing
    this.callHistory.push({ ...request });

    // Simulate delay
    await this.delay(100);

    // Return mock error if set
    if (this.mockError) {
      const error = this.mockError;
      this.mockError = null; // Reset after throwing
      throw error;
    }

    // Return mock response if set
    if (this.mockResponse) {
      const response = this.mockResponse;
      this.mockResponse = null; // Reset after returning
      return response;
    }

    // Generate default mock response based on request
    return this.generateDefaultMockResponse(request);
  }

  /**
   * Check if Codex CLI is available (mock)
   */
  async isAvailable(): Promise<boolean> {
    return this.isCodexAvailable;
  }

  /**
   * Get Codex CLI version (mock)
   */
  async getVersion(): Promise<string | null> {
    return this.isCodexAvailable ? 'mock-codex-1.0.0' : null;
  }

  /**
   * Set mock response for next audit
   */
  setMockResponse(response: GanReview): void {
    this.mockResponse = response;
  }

  /**
   * Set mock error for next audit
   */
  setMockError(error: Error): void {
    this.mockError = error;
  }

  /**
   * Get call history for testing
   */
  getCallHistory(): AuditRequest[] {
    return [...this.callHistory];
  }

  /**
   * Set whether Codex should appear available
   */
  setAvailable(available: boolean): void {
    this.isCodexAvailable = available;
  }

  /**
   * Clear call history
   */
  clearHistory(): void {
    this.callHistory = [];
  }

  /**
   * Reset all mock state
   */
  reset(): void {
    this.mockResponse = null;
    this.mockError = null;
    this.callHistory = [];
    this.isCodexAvailable = true;
  }

  /**
   * Generate a realistic mock response based on the request
   */
  private generateDefaultMockResponse(request: AuditRequest): GanReview {
    const { candidate, budget } = request;
    
    // Simulate scoring based on code quality heuristics
    const codeLength = candidate.length;
    const hasComments = candidate.includes('//') || candidate.includes('/*');
    const hasTests = candidate.toLowerCase().includes('test') || candidate.toLowerCase().includes('spec');
    const hasTypeScript = candidate.includes(': ') || candidate.includes('interface') || candidate.includes('type ');
    
    // Calculate base score
    let baseScore = 70;
    if (hasComments) baseScore += 10;
    if (hasTests) baseScore += 15;
    if (hasTypeScript) baseScore += 10;
    if (codeLength > 100 && codeLength < 1000) baseScore += 5; // Good length
    
    // Add some randomness but keep it deterministic based on content
    const contentHash = this.simpleHash(candidate);
    const randomFactor = (contentHash % 21) - 10; // -10 to +10
    const overall = Math.max(0, Math.min(100, baseScore + randomFactor));

    // Determine verdict based on threshold
    let verdict: GanReview['verdict'];
    if (overall >= budget.threshold) {
      verdict = 'pass';
    } else if (overall >= budget.threshold - 20) {
      verdict = 'revise';
    } else {
      verdict = 'reject';
    }

    // Generate dimensional scores
    const dimensions = DEFAULT_AUDIT_RUBRIC.dimensions.map(d => ({
      name: d.name,
      score: Math.max(0, Math.min(100, overall + ((contentHash % 11) - 5))),
    }));

    // Generate mock inline comments for lower scores
    const inline = overall < 80 ? [
      {
        path: 'candidate.ts',
        line: 1,
        comment: 'Consider adding type annotations for better code clarity.',
      },
      {
        path: 'candidate.ts',
        line: Math.max(1, Math.floor(codeLength / 100)),
        comment: 'This section could benefit from additional comments explaining the logic.',
      },
    ] : [];

    // Generate mock citations
    const citations = [
      'repo://src/types/gan-types.ts:1-50',
      'repo://src/context/context-packer.ts:25-45',
    ];

    return {
      overall,
      dimensions,
      verdict,
      review: {
        summary: this.generateMockSummary(overall, verdict),
        inline,
        citations,
      },
      proposed_diff: overall < 70 ? this.generateMockDiff(candidate) : null,
      iterations: 1,
      judge_cards: [
        {
          model: 'mock-judge-1',
          score: overall,
          notes: 'Generated by mock implementation',
        },
      ],
    };
  }

  /**
   * Generate mock summary based on score and verdict
   */
  private generateMockSummary(score: number, verdict: GanReview['verdict']): string {
    if (verdict === 'pass') {
      return `Code quality is good with a score of ${score}/100. The implementation follows best practices and is ready for use.`;
    } else if (verdict === 'revise') {
      return `Code quality is acceptable but could be improved (score: ${score}/100). Consider addressing the inline comments for better maintainability.`;
    } else {
      return `Code quality needs significant improvement (score: ${score}/100). Please address the major issues identified in the inline comments.`;
    }
  }

  /**
   * Generate mock diff for proposed improvements
   */
  private generateMockDiff(candidate: string): string {
    const lines = candidate.split('\n');
    if (lines.length === 0) return '';

    const firstLine = lines[0];
    return `--- candidate.ts
+++ candidate.ts
@@ -1,1 +1,1 @@
-${firstLine}
+// TODO: Add proper type annotations
+${firstLine}`;
  }

  /**
   * Simple hash function for deterministic randomness
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute audit with structured system prompt injection
   */
  async executeAuditWithSystemPrompt(
    request: any,
    systemPrompt: string,
    promptContext?: {
      variables: Record<string, any>;
      metadata: any;
    }
  ): Promise<any> {
    // For mock implementation, just call regular executeAudit
    return this.executeAudit(request);
  }

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
  } {
    // Mock implementation
    return {
      steps: [
        {
          stepName: 'mock-step',
          success: true,
          evidence: ['Mock evidence'],
          issues: [],
          score: 85,
          duration: 100,
        }
      ],
      overallSuccess: true,
      totalDuration: 100,
      criticalIssuesCount: 0,
    };
  }

  /**
   * Validate response structure for prompt-driven outputs
   */
  validatePromptDrivenResponse(
    response: any,
    expectedStructure?: {
      requireWorkflowSteps: boolean;
      requireCompletionAnalysis: boolean;
      requireNextActions: boolean;
    }
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    score: number;
  } {
    // Mock implementation
    return {
      isValid: true,
      errors: [],
      warnings: [],
      score: 100,
    };
  }

  /**
   * Generate structured audit prompt with system prompt integration
   */
  generateStructuredAuditPrompt(
    request: any,
    systemPrompt: string,
    promptContext?: {
      variables: Record<string, any>;
    }
  ): string {
    // Mock implementation
    return `${systemPrompt}\n\nAudit request: ${JSON.stringify(request)}`;
  }
}

/**
 * Factory function to create mock responses for testing
 */
export function createMockGanReview(overrides: Partial<GanReview> = {}): GanReview {
  const defaultReview: GanReview = {
    overall: 85,
    dimensions: DEFAULT_AUDIT_RUBRIC.dimensions.map(d => ({
      name: d.name,
      score: 85,
    })),
    verdict: 'pass',
    review: {
      summary: 'Mock audit completed successfully.',
      inline: [],
      citations: ['repo://mock/file.ts:1-10'],
    },
    proposed_diff: null,
    iterations: 1,
    judge_cards: [
      {
        model: 'mock-judge',
        score: 85,
        notes: 'Mock response for testing',
      },
    ],
  };

  return { ...defaultReview, ...overrides };
}

/**
 * Create mock audit request for testing
 */
export function createMockAuditRequest(overrides: Partial<AuditRequest> = {}): AuditRequest {
  const defaultRequest: AuditRequest = {
    task: 'Test audit task',
    candidate: 'function test() { return true; }',
    contextPack: 'Mock context pack for testing',
    rubric: DEFAULT_AUDIT_RUBRIC,
    budget: {
      maxCycles: 1,
      candidates: 1,
      threshold: 85,
    },
  };

  return { ...defaultRequest, ...overrides };
}