/**
 * Kill Switch Behavioral Tests
 * 
 * Comprehensive tests for kill switch functionality and termination scenarios
 * as specified in requirements 3.4, 3.7, and 8.4-8.5.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CompletionEvaluator } from '../auditor/index.js';
import { SynchronousSessionManager } from '../session/index.js';
import type {
  GansAuditorCodexSessionState,
  GansAuditorCodexSessionConfig,
  IterationData,
  GansAuditorCodexReview,
  StagnationResult,
} from '../types/gan-types.js';
import { DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG } from '../types/gan-types.js';

describe('Kill Switch Behavioral Tests', () => {
  let completionEvaluator: CompletionEvaluator;
  let sessionManager: SynchronousSessionManager;
  let testStateDir: string;

  beforeEach(async () => {
    testStateDir = join(tmpdir(), `test-kill-switch-${Date.now()}`);
    await fs.mkdir(testStateDir, { recursive: true });

    completionEvaluator = new CompletionEvaluator();
    sessionManager = new SynchronousSessionManager({ stateDirectory: testStateDir });
  });

  afterEach(async () => {
    sessionManager?.destroy();
    
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createMockReview = (score: number, verdict: "pass" | "revise" | "reject"): GansAuditorCodexReview => ({
    overall: score,
    dimensions: [
      { name: "accuracy", score },
      { name: "completeness", score },
      { name: "clarity", score },
    ],
    verdict,
    review: {
      summary: `Review with ${score}% score - ${verdict}`,
      inline: verdict !== "pass" ? [
        { path: "test.ts", line: 1, comment: `Issue detected: score ${score}` }
      ] : [],
      citations: [],
    },
    iterations: 1,
    judge_cards: [
      { model: "test-judge", score, notes: `${verdict} verdict with ${score}% score` }
    ],
  });

  const createSessionWithIterations = async (
    sessionId: string, 
    iterations: Array<{ score: number; verdict: "pass" | "revise" | "reject"; code: string }>
  ): Promise<GansAuditorCodexSessionState> => {
    const session = await sessionManager.getOrCreateSession(sessionId);

    for (let i = 0; i < iterations.length; i++) {
      const { score, verdict, code } = iterations[i];
      const review = createMockReview(score, verdict);
      
      const iteration: IterationData = {
        thoughtNumber: i + 1,
        code,
        auditResult: review,
        timestamp: Date.now() + i * 1000,
      };

      await sessionManager.addIteration(sessionId, iteration);
    }

    return (await sessionManager.getSession(sessionId))!;
  };

  describe('Requirement 3.4 - Hard Stop at 25 Loops', () => {
    it('should trigger kill switch exactly at 25 loops', async () => {
      // Create session with exactly 25 iterations
      const iterations = Array.from({ length: 25 }, (_, i) => ({
        score: 60 + (i % 10), // Varying scores but never reaching completion
        verdict: "revise" as const,
        code: `function attempt${i + 1}() { return "iteration ${i + 1}"; }`,
      }));

      const session = await createSessionWithIterations('hard-stop-test', iterations);
      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(true);
      expect(terminationResult.reason).toContain("Maximum loops (25) reached");
      expect(terminationResult.finalAssessment).toContain("Final Assessment after 25 loops");
    });

    it('should not trigger kill switch at 24 loops', async () => {
      const iterations = Array.from({ length: 24 }, (_, i) => ({
        score: 60,
        verdict: "revise" as const,
        code: `function attempt${i + 1}() { return "not done yet"; }`,
      }));

      const session = await createSessionWithIterations('not-quite-25-test', iterations);
      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(false);
      expect(terminationResult.reason).toContain("Completion criteria not yet met");
    });

    it('should trigger kill switch beyond 25 loops', async () => {
      const iterations = Array.from({ length: 30 }, (_, i) => ({
        score: 70,
        verdict: "revise" as const,
        code: `function attempt${i + 1}() { return "way too many"; }`,
      }));

      const session = await createSessionWithIterations('beyond-25-test', iterations);
      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(true);
      expect(terminationResult.reason).toContain("Maximum loops (25) reached");
    });

    it('should calculate accurate failure rate at kill switch', async () => {
      // Create session with mix of verdicts
      const iterations = [
        ...Array.from({ length: 15 }, (_, i) => ({ score: 50, verdict: "reject" as const, code: `reject${i}` })),
        ...Array.from({ length: 8 }, (_, i) => ({ score: 70, verdict: "revise" as const, code: `revise${i}` })),
        ...Array.from({ length: 2 }, (_, i) => ({ score: 90, verdict: "pass" as const, code: `pass${i}` })),
      ];

      const session = await createSessionWithIterations('failure-rate-test', iterations);
      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(true);
      expect(terminationResult.failureRate).toBeCloseTo(0.6, 1); // 15 rejects out of 25 = 60%
    });

    it('should extract critical issues from session history', async () => {
      const iterations = Array.from({ length: 25 }, (_, i) => ({
        score: 40,
        verdict: "reject" as const,
        code: `function critical${i}() { /* security vulnerability */ return "unsafe"; }`,
      }));

      const session = await createSessionWithIterations('critical-issues-test', iterations);
      
      // Add critical issues to some reviews
      session.iterations[20].auditResult.review.inline.push({
        path: "security.ts",
        line: 5,
        comment: "CRITICAL: SQL injection vulnerability detected",
      });
      
      session.iterations[22].auditResult.review.inline.push({
        path: "auth.ts",
        line: 10,
        comment: "CRITICAL: Authentication bypass possible",
      });

      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(true);
      expect(terminationResult.criticalIssues.length).toBeGreaterThan(0);
      expect(terminationResult.criticalIssues.some(issue => issue.includes("SQL injection"))).toBe(true);
      expect(terminationResult.criticalIssues.some(issue => issue.includes("Authentication bypass"))).toBe(true);
    });
  });

  describe('Requirement 3.7 - Termination Reason and Final Assessment', () => {
    it('should provide detailed termination reason for max loops', async () => {
      const iterations = Array.from({ length: 25 }, (_, i) => ({
        score: 75,
        verdict: "revise" as const,
        code: `function loop${i}() { return "endless"; }`,
      }));

      const session = await createSessionWithIterations('termination-reason-test', iterations);
      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.reason).toContain("Maximum loops (25) reached");
      expect(terminationResult.reason).toContain("without achieving completion criteria");
      expect(terminationResult.finalAssessment).toContain("Final Assessment after 25 loops");
      expect(terminationResult.finalAssessment).toContain("Score: 75%");
    });

    it('should provide detailed termination reason for stagnation', async () => {
      const iterations = Array.from({ length: 15 }, (_, i) => ({
        score: 80,
        verdict: "revise" as const,
        code: 'function stagnant() { return "same code repeatedly"; }', // Identical code
      }));

      const session = await createSessionWithIterations('stagnation-termination-test', iterations);
      
      // Set stagnation info
      session.stagnationInfo = {
        isStagnant: true,
        detectedAtLoop: 12,
        similarityScore: 0.98,
        recommendation: "Code changes are not addressing the core issues. Consider a different approach.",
      };

      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(true);
      expect(terminationResult.reason).toContain("Stagnation detected");
      expect(terminationResult.reason).toContain("different approach");
      expect(terminationResult.finalAssessment).toContain("Stagnation Analysis");
    });

    it('should include score progression in final assessment', async () => {
      const scores = [50, 55, 60, 58, 62, 60, 59, 61, 60, 60]; // Stagnating around 60
      const iterations = scores.map((score, i) => ({
        score,
        verdict: "revise" as const,
        code: `function progress${i}() { return ${score}; }`,
      }));

      // Add more to reach 25
      const remainingIterations = Array.from({ length: 15 }, (_, i) => ({
        score: 60,
        verdict: "revise" as const,
        code: `function more${i}() { return 60; }`,
      }));

      const session = await createSessionWithIterations('score-progression-test', [...iterations, ...remainingIterations]);
      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.finalAssessment).toContain("Score progression");
      expect(terminationResult.finalAssessment).toContain("started at 50%");
      expect(terminationResult.finalAssessment).toContain("ended at 60%");
    });
  });

  describe('Requirement 8.4 - Alternative Suggestions on Stagnation', () => {
    it('should provide specific alternative suggestions when stagnation detected', async () => {
      const iterations = Array.from({ length: 15 }, (_, i) => ({
        score: 75,
        verdict: "revise" as const,
        code: 'function identical() { return "no changes"; }',
      }));

      const session = await createSessionWithIterations('alternatives-test', iterations);
      
      session.stagnationInfo = {
        isStagnant: true,
        detectedAtLoop: 12,
        similarityScore: 0.97,
        recommendation: "Try refactoring the function structure, consider using different variable names, or implement error handling.",
      };

      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.reason).toContain("refactoring the function structure");
      expect(terminationResult.reason).toContain("different variable names");
      expect(terminationResult.reason).toContain("error handling");
    });

    it('should suggest breaking down complex problems', async () => {
      const iterations = Array.from({ length: 12 }, (_, i) => ({
        score: 65,
        verdict: "revise" as const,
        code: `function complex${i}() { /* very long function */ return "complex"; }`,
      }));

      const session = await createSessionWithIterations('complex-breakdown-test', iterations);
      
      session.stagnationInfo = {
        isStagnant: true,
        detectedAtLoop: 11,
        similarityScore: 0.96,
        recommendation: "The function appears too complex. Consider breaking it into smaller, focused functions.",
      };

      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.reason).toContain("breaking it into smaller");
      expect(terminationResult.reason).toContain("focused functions");
    });
  });

  describe('Requirement 8.5 - Progress Analysis on Loop Detection', () => {
    it('should analyze declining progress patterns', async () => {
      // Create session with declining scores
      const scores = [85, 82, 80, 78, 75, 73, 70, 68, 65, 63, 60, 58, 55, 53, 50];
      const iterations = scores.map((score, i) => ({
        score,
        verdict: "revise" as const,
        code: `function declining${i}() { return ${score}; }`,
      }));

      // Add more to reach stagnation threshold
      const stagnantIterations = Array.from({ length: 10 }, (_, i) => ({
        score: 50,
        verdict: "reject" as const,
        code: 'function stagnant() { return "stuck at 50"; }',
      }));

      const session = await createSessionWithIterations('declining-progress-test', [...iterations, ...stagnantIterations]);
      
      session.stagnationInfo = {
        isStagnant: true,
        detectedAtLoop: 20,
        similarityScore: 0.95,
        recommendation: "Progress has been consistently declining. The current approach is not working.",
      };

      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.reason).toContain("consistently declining");
      expect(terminationResult.reason).toContain("current approach is not working");
      expect(terminationResult.finalAssessment).toContain("declined from 85% to 50%");
    });

    it('should analyze oscillating progress patterns', async () => {
      // Create session with oscillating scores
      const scores = [70, 80, 65, 85, 68, 82, 66, 84, 67, 83, 66, 84, 66, 84, 66];
      const iterations = scores.map((score, i) => ({
        score,
        verdict: "revise" as const,
        code: `function oscillating${i}() { return ${score}; }`,
      }));

      const session = await createSessionWithIterations('oscillating-progress-test', iterations);
      
      session.stagnationInfo = {
        isStagnant: true,
        detectedAtLoop: 14,
        similarityScore: 0.94,
        recommendation: "Scores are oscillating without clear improvement. Try a more systematic approach.",
      };

      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.reason).toContain("oscillating without clear improvement");
      expect(terminationResult.reason).toContain("systematic approach");
    });

    it('should identify when progress plateaued', async () => {
      // Initial improvement then plateau
      const improvingScores = [50, 60, 70, 80, 85];
      const plateauScores = Array.from({ length: 20 }, () => 85);
      
      const iterations = [...improvingScores, ...plateauScores].map((score, i) => ({
        score,
        verdict: score >= 85 ? "revise" as const : "reject" as const,
        code: `function plateau${i}() { return ${score}; }`,
      }));

      const session = await createSessionWithIterations('plateau-test', iterations);
      
      session.stagnationInfo = {
        isStagnant: true,
        detectedAtLoop: 15,
        similarityScore: 0.93,
        recommendation: "Progress plateaued at 85%. The remaining issues may require a different strategy.",
      };

      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.reason).toContain("plateaued at 85%");
      expect(terminationResult.reason).toContain("different strategy");
      expect(terminationResult.finalAssessment).toContain("improved from 50% to 85%");
      expect(terminationResult.finalAssessment).toContain("then plateaued");
    });
  });

  describe('Edge Cases in Kill Switch Behavior', () => {
    it('should handle session with no iterations', async () => {
      const session = await sessionManager.getOrCreateSession('empty-kill-switch-test');
      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(false);
      expect(terminationResult.reason).toContain("Completion criteria not yet met");
      expect(terminationResult.failureRate).toBe(0);
      expect(terminationResult.criticalIssues).toEqual([]);
    });

    it('should handle session with only passing iterations', async () => {
      const iterations = Array.from({ length: 5 }, (_, i) => ({
        score: 95,
        verdict: "pass" as const,
        code: `function perfect${i}() { return "excellent"; }`,
      }));

      const session = await createSessionWithIterations('all-pass-test', iterations);
      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(false); // Should complete via completion criteria, not kill switch
      expect(terminationResult.failureRate).toBe(0);
    });

    it('should handle mixed verdict patterns correctly', async () => {
      const iterations = [
        { score: 95, verdict: "pass" as const, code: "good1" },
        { score: 60, verdict: "reject" as const, code: "bad1" },
        { score: 85, verdict: "revise" as const, code: "ok1" },
        { score: 95, verdict: "pass" as const, code: "good2" },
        { score: 50, verdict: "reject" as const, code: "bad2" },
      ];

      // Extend to 25 iterations
      const extendedIterations = [
        ...iterations,
        ...Array.from({ length: 20 }, (_, i) => ({
          score: 70,
          verdict: "revise" as const,
          code: `function mixed${i}() { return "mixed"; }`,
        })),
      ];

      const session = await createSessionWithIterations('mixed-verdicts-test', extendedIterations);
      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(true);
      expect(terminationResult.failureRate).toBeCloseTo(0.08, 1); // 2 rejects out of 25
    });

    it('should prioritize stagnation over max loops when both conditions met', async () => {
      const iterations = Array.from({ length: 25 }, (_, i) => ({
        score: 75,
        verdict: "revise" as const,
        code: 'function both() { return "stagnant and max loops"; }',
      }));

      const session = await createSessionWithIterations('both-conditions-test', iterations);
      
      session.stagnationInfo = {
        isStagnant: true,
        detectedAtLoop: 20,
        similarityScore: 0.99,
        recommendation: "Severe stagnation detected with identical responses.",
      };

      const terminationResult = completionEvaluator.shouldTerminate(session);

      expect(terminationResult.shouldTerminate).toBe(true);
      // Should prioritize stagnation reason over max loops
      expect(terminationResult.reason).toContain("Stagnation detected");
      expect(terminationResult.reason).toContain("identical responses");
    });
  });
});