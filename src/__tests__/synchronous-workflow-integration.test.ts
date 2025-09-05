/**
 * End-to-End Integration Tests for Synchronous Audit Workflow
 * 
 * Tests complete workflow scenarios from thought submission to completion
 * validating all requirements working together in realistic scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { 
  SynchronousAuditEngine,
  CompletionEvaluator,
  LoopDetector,
} from '../auditor/index.js';
import { SynchronousSessionManager } from '../session/index.js';
import { EnhancedResponseBuilder } from '../types/index.js';
import type {
  GansAuditorCodexThoughtData,
  GansAuditorCodexReview,
  GansAuditorCodexEnhancedResponse,
  IterationData,
  IGansAuditorCodexAuditor,
} from '../types/gan-types.js';

// Mock dependencies
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createComponentLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  createTimer: vi.fn(() => ({
    end: vi.fn(),
    endWithError: vi.fn(),
  })),
}));

describe('Synchronous Workflow Integration Tests', () => {
  let testStateDir: string;
  let auditEngine: SynchronousAuditEngine;
  let completionEvaluator: CompletionEvaluator;
  let sessionManager: SynchronousSessionManager;
  let loopDetector: LoopDetector;
  let responseBuilder: EnhancedResponseBuilder;
  let mockAuditor: IGansAuditorCodexAuditor;

  beforeEach(async () => {
    testStateDir = join(tmpdir(), `test-integration-${Date.now()}`);
    await fs.mkdir(testStateDir, { recursive: true });

    // Create mock auditor with realistic behavior
    mockAuditor = {
      auditThought: vi.fn(),
      extractInlineConfig: vi.fn(),
      validateConfig: vi.fn(),
    };

    // Initialize components
    auditEngine = new SynchronousAuditEngine({}, mockAuditor);
    completionEvaluator = new CompletionEvaluator();
    sessionManager = new SynchronousSessionManager({ stateDirectory: testStateDir });
    loopDetector = new LoopDetector();
    responseBuilder = new EnhancedResponseBuilder();
  });

  afterEach(async () => {
    auditEngine?.destroy();
    sessionManager?.destroy();
    
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createThought = (code: string, thoughtNumber: number, branchId: string = 'integration-test'): GansAuditorCodexThoughtData => ({
    thought: code,
    thoughtNumber,
    totalThoughts: 1,
    nextThoughtNeeded: false,
    branchId,
  });

  const createReview = (score: number, verdict: "pass" | "revise" | "reject", feedback?: string[]): GansAuditorCodexReview => ({
    overall: score,
    dimensions: [
      { name: "accuracy", score: Math.min(score + 5, 100) },
      { name: "completeness", score: Math.max(score - 5, 0) },
      { name: "clarity", score },
      { name: "actionability", score },
      { name: "human_likeness", score },
    ],
    verdict,
    review: {
      summary: `Code review: ${score}% overall score with ${verdict} verdict`,
      inline: feedback ? feedback.map((f, i) => ({
        path: "test.ts",
        line: i + 1,
        comment: f,
      })) : [],
      citations: [],
    },
    iterations: 1,
    judge_cards: [{
      model: "integration-test-judge",
      score,
      notes: `Integration test review with ${verdict} verdict`,
    }],
  });

  // ============================================================================
  // Complete Workflow Scenarios
  // ============================================================================

  describe('Complete Workflow Scenarios', () => {
    it('should complete successful improvement cycle (Requirements 1.1, 2.1-2.4, 3.1)', async () => {
      const sessionId = 'successful-improvement';
      
      // Iteration 1: Initial poor code
      const thought1 = createThought(`
        \`\`\`javascript
        function calc(x, y) {
          return x + y;
        }
        \`\`\`
      `, 1, sessionId);

      const review1 = createReview(60, "revise", [
        "Function name 'calc' is not descriptive",
        "Missing parameter validation",
        "No error handling for invalid inputs",
      ]);

      // Iteration 2: Improved code
      const thought2 = createThought(`
        \`\`\`javascript
        function calculateSum(firstNumber, secondNumber) {
          if (typeof firstNumber !== 'number' || typeof secondNumber !== 'number') {
            throw new Error('Both parameters must be numbers');
          }
          return firstNumber + secondNumber;
        }
        \`\`\`
      `, 2, sessionId);

      const review2 = createReview(85, "revise", [
        "Good improvement! Consider adding JSDoc comments",
      ]);

      // Iteration 3: Final polished code
      const thought3 = createThought(`
        \`\`\`javascript
        /**
         * Calculates the sum of two numbers
         * @param {number} firstNumber - The first number to add
         * @param {number} secondNumber - The second number to add
         * @returns {number} The sum of the two numbers
         * @throws {Error} If either parameter is not a number
         */
        function calculateSum(firstNumber, secondNumber) {
          if (typeof firstNumber !== 'number' || typeof secondNumber !== 'number') {
            throw new Error('Both parameters must be numbers');
          }
          return firstNumber + secondNumber;
        }
        \`\`\`
      `, 3, sessionId);

      const review3 = createReview(95, "pass");

      // Mock audit responses
      vi.mocked(mockAuditor.auditThought)
        .mockResolvedValueOnce(review1)
        .mockResolvedValueOnce(review2)
        .mockResolvedValueOnce(review3);

      // Execute workflow
      const result1 = await auditEngine.auditAndWait(thought1, sessionId);
      expect(result1.success).toBe(true);
      expect(result1.review.verdict).toBe("revise");

      await sessionManager.addIteration(sessionId, {
        thoughtNumber: 1,
        code: thought1.thought,
        auditResult: result1.review,
        timestamp: Date.now(),
      });

      const result2 = await auditEngine.auditAndWait(thought2, sessionId);
      expect(result2.success).toBe(true);
      expect(result2.review.verdict).toBe("revise");

      await sessionManager.addIteration(sessionId, {
        thoughtNumber: 2,
        code: thought2.thought,
        auditResult: result2.review,
        timestamp: Date.now() + 1000,
      });

      const result3 = await auditEngine.auditAndWait(thought3, sessionId);
      expect(result3.success).toBe(true);
      expect(result3.review.verdict).toBe("pass");

      await sessionManager.addIteration(sessionId, {
        thoughtNumber: 3,
        code: thought3.thought,
        auditResult: result3.review,
        timestamp: Date.now() + 2000,
      });

      // Verify completion
      const completionResult = completionEvaluator.evaluateCompletion(95, 10); // Meets tier 1 criteria
      expect(completionResult.isComplete).toBe(true);
      expect(completionResult.reason).toBe("score_95_at_10");

      // Verify session progress
      const progress = await sessionManager.analyzeProgress(sessionId);
      expect(progress.currentLoop).toBe(3);
      expect(progress.scoreProgression).toEqual([60, 85, 95]);
      expect(progress.averageImprovement).toBeGreaterThan(0);
    });

    it('should handle stagnation detection and termination (Requirements 3.5, 8.1-8.5)', async () => {
      const sessionId = 'stagnation-scenario';
      
      // Create 12 iterations with identical code (stagnation)
      const stagnantCode = `
        \`\`\`javascript
        function stagnant() {
          return "no changes";
        }
        \`\`\`
      `;

      const stagnantReview = createReview(75, "revise", [
        "Function needs improvement but no changes detected",
      ]);

      // Mock all iterations to return same review
      vi.mocked(mockAuditor.auditThought).mockResolvedValue(stagnantReview);

      // Execute 12 iterations
      for (let i = 1; i <= 12; i++) {
        const thought = createThought(stagnantCode, i, sessionId);
        const result = await auditEngine.auditAndWait(thought, sessionId);
        
        await sessionManager.addIteration(sessionId, {
          thoughtNumber: i,
          code: stagnantCode,
          auditResult: result.review,
          timestamp: Date.now() + i * 1000,
        });
      }

      // Check stagnation detection
      const stagnation = await sessionManager.detectStagnation(sessionId);
      expect(stagnation.isStagnant).toBe(true);
      expect(stagnation.detectedAtLoop).toBeGreaterThanOrEqual(10);
      expect(stagnation.similarityScore).toBeGreaterThan(0.95);

      // Verify completion evaluator handles stagnation
      const completionResult = completionEvaluator.evaluateCompletion(75, 12, stagnation);
      expect(completionResult.isComplete).toBe(true);
      expect(completionResult.reason).toBe("stagnation_detected");
      expect(completionResult.nextThoughtNeeded).toBe(false);
    });

    it('should trigger kill switch at 25 loops (Requirements 3.4, 3.7)', async () => {
      const sessionId = 'kill-switch-scenario';
      
      // Create 25 iterations with poor performance
      const poorReview = createReview(50, "reject", [
        "Multiple critical issues detected",
        "Code structure needs complete redesign",
      ]);

      vi.mocked(mockAuditor.auditThought).mockResolvedValue(poorReview);

      // Execute 25 iterations
      for (let i = 1; i <= 25; i++) {
        const thought = createThought(`
          \`\`\`javascript
          function failing${i}() {
            // Poor code that keeps failing
            return "failed attempt ${i}";
          }
          \`\`\`
        `, i, sessionId);

        const result = await auditEngine.auditAndWait(thought, sessionId);
        
        await sessionManager.addIteration(sessionId, {
          thoughtNumber: i,
          code: thought.thought,
          auditResult: result.review,
          timestamp: Date.now() + i * 1000,
        });
      }

      // Verify kill switch activation
      const session = await sessionManager.getSession(sessionId);
      const terminationResult = completionEvaluator.shouldTerminate(session!);

      expect(terminationResult.shouldTerminate).toBe(true);
      expect(terminationResult.reason).toContain("Maximum loops (25) reached");
      expect(terminationResult.failureRate).toBe(1.0); // 100% failures
      expect(terminationResult.criticalIssues.length).toBeGreaterThan(0);
      expect(terminationResult.finalAssessment).toContain("Final Assessment after 25 loops");
    });

    it('should handle mixed verdict patterns realistically', async () => {
      const sessionId = 'mixed-scenario';
      
      // Realistic improvement pattern with some setbacks
      const scenarios = [
        { score: 45, verdict: "reject" as const, feedback: ["Critical syntax errors"] },
        { score: 60, verdict: "revise" as const, feedback: ["Fixed syntax, but logic issues remain"] },
        { score: 55, verdict: "revise" as const, feedback: ["Regression in error handling"] },
        { score: 70, verdict: "revise" as const, feedback: ["Better, but still needs validation"] },
        { score: 80, verdict: "revise" as const, feedback: ["Good progress, minor improvements needed"] },
        { score: 85, verdict: "revise" as const, feedback: ["Almost there, add documentation"] },
        { score: 90, verdict: "pass" as const, feedback: [] },
      ];

      // Mock sequential responses
      for (const scenario of scenarios) {
        vi.mocked(mockAuditor.auditThought).mockResolvedValueOnce(
          createReview(scenario.score, scenario.verdict, scenario.feedback)
        );
      }

      // Execute iterations
      for (let i = 0; i < scenarios.length; i++) {
        const thought = createThought(`
          \`\`\`javascript
          function evolving${i}() {
            // Code that improves over time
            return "iteration ${i + 1}";
          }
          \`\`\`
        `, i + 1, sessionId);

        const result = await auditEngine.auditAndWait(thought, sessionId);
        
        await sessionManager.addIteration(sessionId, {
          thoughtNumber: i + 1,
          code: thought.thought,
          auditResult: result.review,
          timestamp: Date.now() + i * 1000,
        });

        expect(result.review.verdict).toBe(scenarios[i].verdict);
        expect(result.review.overall).toBe(scenarios[i].score);
      }

      // Verify final state
      const progress = await sessionManager.analyzeProgress(sessionId);
      expect(progress.currentLoop).toBe(7);
      expect(progress.scoreProgression).toEqual([45, 60, 55, 70, 80, 85, 90]);
      
      // Should show overall improvement despite temporary regression
      expect(progress.averageImprovement).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Enhanced Response Integration
  // ============================================================================

  describe('Enhanced Response Integration', () => {
    it('should build comprehensive enhanced response (Requirements 5.1-5.4)', async () => {
      const sessionId = 'enhanced-response-test';
      const session = await sessionManager.getOrCreateSession(sessionId);

      const review = createReview(80, "revise", [
        "Add input validation",
        "Consider edge cases",
        "Improve error messages",
      ]);

      const auditResult = {
        review,
        sessionState: session,
      };

      const completionResult = completionEvaluator.evaluateCompletion(80, 5);

      const standardResponse = {
        thought: "Improved function with validation",
        nextThoughtNeeded: true,
      };

      const enhancedResponse = responseBuilder.buildSynchronousResponse(
        standardResponse,
        auditResult,
        completionResult
      );

      // Verify enhanced response structure
      expect(enhancedResponse.completionStatus).toBeDefined();
      expect(enhancedResponse.completionStatus?.isComplete).toBe(false);
      expect(enhancedResponse.completionStatus?.currentLoop).toBe(5);
      expect(enhancedResponse.completionStatus?.score).toBe(80);

      expect(enhancedResponse.loopInfo).toBeDefined();
      expect(enhancedResponse.loopInfo?.currentLoop).toBe(5);
      expect(enhancedResponse.loopInfo?.stagnationDetected).toBe(false);

      expect(enhancedResponse.feedback).toBeDefined();
      expect(enhancedResponse.feedback?.improvements).toBeDefined();
      expect(enhancedResponse.feedback?.improvements.length).toBeGreaterThan(0);

      expect(enhancedResponse.nextThoughtNeeded).toBe(true);
    });

    it('should include termination info when kill switch triggered', async () => {
      const sessionId = 'termination-response-test';
      const session = await sessionManager.getOrCreateSession(sessionId);

      // Simulate 25 iterations
      for (let i = 1; i <= 25; i++) {
        await sessionManager.addIteration(sessionId, {
          thoughtNumber: i,
          code: `function attempt${i}() {}`,
          auditResult: createReview(60, "revise"),
          timestamp: Date.now() + i * 1000,
        });
      }

      const updatedSession = await sessionManager.getSession(sessionId);
      const terminationResult = completionEvaluator.shouldTerminate(updatedSession!);

      const review = createReview(60, "revise");
      const auditResult = { review, sessionState: updatedSession };
      const completionResult = completionEvaluator.evaluateCompletion(60, 25);

      const enhancedResponse = responseBuilder.buildSynchronousResponse(
        { thought: "Final attempt", nextThoughtNeeded: false },
        auditResult,
        completionResult
      );

      expect(enhancedResponse.terminationInfo).toBeDefined();
      expect(enhancedResponse.terminationInfo?.reason).toContain("Maximum loops");
      expect(enhancedResponse.terminationInfo?.failureRate).toBeGreaterThan(0);
      expect(enhancedResponse.nextThoughtNeeded).toBe(false);
    });
  });

  // ============================================================================
  // Error Handling Integration
  // ============================================================================

  describe('Error Handling Integration', () => {
    it('should handle audit service failures gracefully (Requirement 7.1)', async () => {
      const thought = createThought('```javascript\nfunction test() {}\n```', 1);

      // Mock audit failure
      vi.mocked(mockAuditor.auditThought).mockRejectedValue(new Error('Codex service unavailable'));

      const result = await auditEngine.auditAndWait(thought);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Codex service unavailable');
      expect(result.review.verdict).toBe('revise');
      expect(result.review.review.summary).toContain('service unavailable');
    });

    it('should handle timeout scenarios with partial results (Requirement 7.2)', async () => {
      const thought = createThought('```javascript\nfunction slow() {}\n```', 1);

      // Mock timeout
      const timeoutResult = {
        success: false,
        timedOut: true,
        error: 'Audit operation timed out after 30000ms',
        review: createReview(50, "revise", ["Audit incomplete due to timeout"]),
        sessionId: 'timeout-test',
        duration: 30000,
      };

      vi.spyOn(auditEngine, 'auditAndWait').mockResolvedValue(timeoutResult);

      const result = await auditEngine.auditAndWait(thought);

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.review.overall).toBe(50); // Conservative fallback
      expect(result.review.review.summary).toContain('timed out');
    });

    it('should recover from session corruption (Requirement 7.3)', async () => {
      const sessionId = 'corrupted-session';
      
      // Create session and then corrupt its file
      await sessionManager.getOrCreateSession(sessionId);
      const sessionPath = join(testStateDir, `${sessionId}.json`);
      await fs.writeFile(sessionPath, 'invalid json content');

      // Should recover by creating new session
      const recoveredSession = await sessionManager.getOrCreateSession(sessionId);
      
      expect(recoveredSession.id).toBe(sessionId);
      expect(recoveredSession.iterations).toEqual([]);
      expect(recoveredSession.currentLoop).toBe(0);
    });

    it('should provide clear error messages with actionable guidance (Requirement 7.4)', async () => {
      const thought = createThought('invalid code block', 1);

      const errorResult = {
        success: false,
        timedOut: false,
        error: 'Invalid code format detected',
        review: createReview(0, "reject", [
          "Code must be enclosed in proper markdown code blocks",
          "Use ```language syntax for code blocks",
          "Ensure code is syntactically valid",
        ]),
        sessionId: 'error-guidance-test',
        duration: 100,
        actionableGuidance: [
          "Wrap your code in ```javascript blocks",
          "Check for syntax errors before submission",
          "Refer to documentation for proper formatting",
        ],
      };

      vi.spyOn(auditEngine, 'auditAndWait').mockResolvedValue(errorResult);

      const result = await auditEngine.auditAndWait(thought);

      expect(result.success).toBe(false);
      expect(result.actionableGuidance).toBeDefined();
      expect(result.actionableGuidance?.length).toBeGreaterThan(0);
      expect(result.review.review.inline.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Session Continuity Integration
  // ============================================================================

  describe('Session Continuity Integration', () => {
    it('should maintain context across multiple calls (Requirements 4.1-4.4)', async () => {
      const sessionId = 'continuity-test';
      
      // First call
      const thought1 = createThought('```javascript\nfunction v1() {}\n```', 1, sessionId);
      const review1 = createReview(70, "revise", ["Add parameters"]);
      
      vi.mocked(mockAuditor.auditThought).mockResolvedValueOnce(review1);
      
      const result1 = await auditEngine.auditAndWait(thought1, sessionId);
      await sessionManager.addIteration(sessionId, {
        thoughtNumber: 1,
        code: thought1.thought,
        auditResult: result1.review,
        timestamp: Date.now(),
      });

      // Second call - should have context from first
      const thought2 = createThought('```javascript\nfunction v2(param) { return param; }\n```', 2, sessionId);
      const review2 = createReview(85, "revise", ["Good improvement, add validation"]);
      
      vi.mocked(mockAuditor.auditThought).mockResolvedValueOnce(review2);
      
      const result2 = await auditEngine.auditAndWait(thought2, sessionId);
      await sessionManager.addIteration(sessionId, {
        thoughtNumber: 2,
        code: thought2.thought,
        auditResult: result2.review,
        timestamp: Date.now() + 1000,
      });

      // Verify session continuity
      const session = await sessionManager.getSession(sessionId);
      expect(session?.iterations).toHaveLength(2);
      expect(session?.currentLoop).toBe(2);

      const progress = await sessionManager.analyzeProgress(sessionId);
      expect(progress.scoreProgression).toEqual([70, 85]);
      expect(progress.averageImprovement).toBeGreaterThan(0);
    });

    it('should provide contextual feedback based on history', async () => {
      const sessionId = 'contextual-feedback-test';
      
      // Build up history
      const iterations = [
        { score: 60, code: 'function basic() {}' },
        { score: 70, code: 'function improved() { return true; }' },
        { score: 80, code: 'function validated(input) { if (!input) throw new Error(); return input; }' },
      ];

      for (let i = 0; i < iterations.length; i++) {
        const { score, code } = iterations[i];
        const review = createReview(score, "revise", [`Iteration ${i + 1} feedback`]);
        
        vi.mocked(mockAuditor.auditThought).mockResolvedValueOnce(review);
        
        const thought = createThought(`\`\`\`javascript\n${code}\n\`\`\``, i + 1, sessionId);
        const result = await auditEngine.auditAndWait(thought, sessionId);
        
        await sessionManager.addIteration(sessionId, {
          thoughtNumber: i + 1,
          code: thought.thought,
          auditResult: result.review,
          timestamp: Date.now() + i * 1000,
        });
      }

      // Verify contextual analysis
      const progress = await sessionManager.analyzeProgress(sessionId);
      expect(progress.currentLoop).toBe(3);
      expect(progress.averageImprovement).toBeGreaterThan(0);
      
      const session = await sessionManager.getSession(sessionId);
      expect(session?.iterations).toHaveLength(3);
      
      // Each iteration should show improvement
      const scores = session!.iterations.map(iter => iter.auditResult.overall);
      expect(scores).toEqual([60, 70, 80]);
    });
  });
});