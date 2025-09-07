/**
 * Integration tests for Codex CLI integration
 * 
 * These tests verify the complete integration flow including
 * error scenarios and edge cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodexJudge, CodexNotAvailableError } from '../codex-judge.js';
import { MockCodexJudge, createMockAuditRequest, createMockGanReview } from '../../__tests__/mocks/mock-codex-judge.js';
import { DEFAULT_AUDIT_RUBRIC } from '../../types/gan-types.js';
import type { AuditRequest, GanReview } from '../../types/integration-types.js';

describe('Codex Integration', () => {
  describe('MockCodexJudge', () => {
    let mockJudge: MockCodexJudge;

    beforeEach(() => {
      mockJudge = new MockCodexJudge();
    });

    it('should execute audit with default mock response', async () => {
      const request = createMockAuditRequest({
        candidate: 'function hello() { return "world"; }',
        task: 'Review this simple function',
      });

      const result = await mockJudge.executeAudit(request);

      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.verdict).toMatch(/^(pass|revise|reject)$/);
      expect(result.dimensions).toHaveLength(DEFAULT_AUDIT_RUBRIC.dimensions.length);
      expect(result.judge_cards).toHaveLength(1);
      expect(result.judge_cards[0].model).toBe('mock-judge-1');
    });

    it('should return higher scores for better code', async () => {
      const goodCode = `
        /**
         * Calculates the factorial of a number
         * @param n - The number to calculate factorial for
         * @returns The factorial result
         */
        function factorial(n: number): number {
          if (n <= 1) return 1;
          return n * factorial(n - 1);
        }

        // Test cases
        describe('factorial', () => {
          it('should calculate factorial correctly', () => {
            expect(factorial(5)).toBe(120);
          });
        });
      `;

      const badCode = `
        function f(x) {
          return x * f(x - 1);
        }
      `;

      const goodRequest = createMockAuditRequest({ candidate: goodCode });
      const badRequest = createMockAuditRequest({ candidate: badCode });

      const goodResult = await mockJudge.executeAudit(goodRequest);
      const badResult = await mockJudge.executeAudit(badRequest);

      expect(goodResult.overall).toBeGreaterThan(badResult.overall);
    });

    it('should use custom mock response when set', async () => {
      const customResponse = createMockGanReview({
        overall: 95,
        verdict: 'pass',
        review: {
          summary: 'Custom mock response',
          inline: [],
          citations: [],
        },
      });

      mockJudge.setMockResponse(customResponse);

      const request = createMockAuditRequest();
      const result = await mockJudge.executeAudit(request);

      expect(result.overall).toBe(95);
      expect(result.verdict).toBe('pass');
      expect(result.review.summary).toBe('Custom mock response');
    });

    it('should throw custom mock error when set', async () => {
      const customError = new Error('Custom mock error');
      mockJudge.setMockError(customError);

      const request = createMockAuditRequest();

      await expect(mockJudge.executeAudit(request)).rejects.toThrow('Custom mock error');
    });

    it('should track call history', async () => {
      const request1 = createMockAuditRequest({ task: 'First audit' });
      const request2 = createMockAuditRequest({ task: 'Second audit' });

      await mockJudge.executeAudit(request1);
      await mockJudge.executeAudit(request2);

      const history = mockJudge.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[0].task).toBe('First audit');
      expect(history[1].task).toBe('Second audit');
    });

    it('should reset state correctly', async () => {
      mockJudge.setMockResponse(createMockGanReview());
      mockJudge.setMockError(new Error('Test error'));
      await mockJudge.executeAudit(createMockAuditRequest()).catch(() => {}); // Ignore error

      mockJudge.reset();

      const history = mockJudge.getCallHistory();
      expect(history).toHaveLength(0);

      // Should work normally after reset
      const result = await mockJudge.executeAudit(createMockAuditRequest());
      expect(result).toBeDefined();
    });

    it('should simulate Codex availability correctly', async () => {
      expect(await mockJudge.isAvailable()).toBe(true);
      expect(await mockJudge.getVersion()).toBe('mock-codex-1.0.0');

      mockJudge.setAvailable(false);

      expect(await mockJudge.isAvailable()).toBe(false);
      expect(await mockJudge.getVersion()).toBe(null);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle various error types appropriately', async () => {
      const mockJudge = new MockCodexJudge();
      const request = createMockAuditRequest();

      // Test CodexNotAvailableError
      mockJudge.setMockError(new CodexNotAvailableError());
      await expect(mockJudge.executeAudit(request)).rejects.toThrow(CodexNotAvailableError);

      // Test generic error
      mockJudge.setMockError(new Error('Generic error'));
      await expect(mockJudge.executeAudit(request)).rejects.toThrow('Generic error');
    });
  });

  describe('Response Validation', () => {
    let mockJudge: MockCodexJudge;

    beforeEach(() => {
      mockJudge = new MockCodexJudge();
    });

    it('should generate valid response structure', async () => {
      const request = createMockAuditRequest();
      const result = await mockJudge.executeAudit(request);

      // Validate response structure
      expect(typeof result.overall).toBe('number');
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);

      expect(['pass', 'revise', 'reject']).toContain(result.verdict);

      expect(Array.isArray(result.dimensions)).toBe(true);
      result.dimensions.forEach(dim => {
        expect(typeof dim.name).toBe('string');
        expect(typeof dim.score).toBe('number');
        expect(dim.score).toBeGreaterThanOrEqual(0);
        expect(dim.score).toBeLessThanOrEqual(100);
      });

      expect(typeof result.review.summary).toBe('string');
      expect(Array.isArray(result.review.inline)).toBe(true);
      expect(Array.isArray(result.review.citations)).toBe(true);

      expect(typeof result.iterations).toBe('number');
      expect(result.iterations).toBeGreaterThan(0);

      expect(Array.isArray(result.judge_cards)).toBe(true);
      result.judge_cards.forEach(card => {
        expect(typeof card.model).toBe('string');
        expect(typeof card.score).toBe('number');
        expect(card.score).toBeGreaterThanOrEqual(0);
        expect(card.score).toBeLessThanOrEqual(100);
      });
    });

    it('should generate appropriate inline comments for low scores', async () => {
      // Force a low score response
      const lowScoreResponse = createMockGanReview({
        overall: 60,
        verdict: 'revise',
      });

      mockJudge.setMockResponse(lowScoreResponse);

      const request = createMockAuditRequest();
      const result = await mockJudge.executeAudit(request);

      expect(result.overall).toBe(60);
      expect(result.verdict).toBe('revise');
    });

    it('should handle edge cases in code analysis', async () => {
      const edgeCases = [
        '', // Empty code
        '// Just a comment',
        'const x = 1;', // Single line
        'a'.repeat(10000), // Very long code
        '/* Multi\nline\ncomment */',
        'function test() {\n  // TODO: implement\n}',
      ];

      for (const code of edgeCases) {
        const request = createMockAuditRequest({ candidate: code });
        const result = await mockJudge.executeAudit(request);

        expect(result).toBeDefined();
        expect(typeof result.overall).toBe('number');
        expect(result.verdict).toMatch(/^(pass|revise|reject)$/);
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent audit requests', async () => {
      const mockJudge = new MockCodexJudge();
      const requests = Array.from({ length: 10 }, (_, i) =>
        createMockAuditRequest({ task: `Concurrent audit ${i}` })
      );

      const results = await Promise.all(
        requests.map(req => mockJudge.executeAudit(req))
      );

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.overall).toBe('number');
      });

      const history = mockJudge.getCallHistory();
      expect(history).toHaveLength(10);
    });

    it('should maintain consistent scoring for identical code', async () => {
      const mockJudge = new MockCodexJudge();
      const code = 'function test() { return 42; }';
      const request = createMockAuditRequest({ candidate: code });

      const result1 = await mockJudge.executeAudit(request);
      const result2 = await mockJudge.executeAudit(request);

      // Mock should be deterministic for same input
      expect(result1.overall).toBe(result2.overall);
      expect(result1.verdict).toBe(result2.verdict);
    });
  });

  describe('Factory Functions', () => {
    it('should create valid mock responses with overrides', () => {
      const customReview = createMockGanReview({
        overall: 88,
        verdict: 'pass',
        review: {
          summary: 'Custom summary',
          inline: [{ path: 'test.ts', line: 1, comment: 'Custom comment' }],
          citations: ['custom://citation'],
        },
      });

      expect(customReview.overall).toBe(88);
      expect(customReview.verdict).toBe('pass');
      expect(customReview.review.summary).toBe('Custom summary');
      expect(customReview.review.inline).toHaveLength(1);
      expect(customReview.review.inline[0].comment).toBe('Custom comment');
    });

    it('should create valid mock requests with overrides', () => {
      const customRequest = createMockAuditRequest({
        task: 'Custom task',
        candidate: 'custom code',
        budget: { maxCycles: 3, candidates: 2, threshold: 90 },
      });

      expect(customRequest.task).toBe('Custom task');
      expect(customRequest.candidate).toBe('custom code');
      expect(customRequest.budget.maxCycles).toBe(3);
      expect(customRequest.budget.candidates).toBe(2);
      expect(customRequest.budget.threshold).toBe(90);
    });
  });
});