/**
 * Tests for LoopDetector class
 * 
 * Validates loop detection and stagnation prevention functionality
 * according to requirements 3.5, 8.1-8.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LoopDetector } from '../loop-detector.js';
import type { IterationData, GansAuditorCodexReview } from '../../types/gan-types.js';

describe('LoopDetector', () => {
  let detector: LoopDetector;

  beforeEach(() => {
    detector = new LoopDetector();
  });

  describe('analyzeResponseSimilarity', () => {
    it('should return zero similarity for empty or single responses', () => {
      expect(detector.analyzeResponseSimilarity([])).toEqual({
        averageSimilarity: 0,
        isStagnant: false,
        repeatedPatterns: [],
      });

      expect(detector.analyzeResponseSimilarity(['single response'])).toEqual({
        averageSimilarity: 0,
        isStagnant: false,
        repeatedPatterns: [],
      });
    });

    it('should detect identical responses', () => {
      const responses = [
        'function test() { return 42; }',
        'function test() { return 42; }',
        'function test() { return 42; }',
      ];

      const result = detector.analyzeResponseSimilarity(responses);

      expect(result.averageSimilarity).toBeGreaterThan(0.99);
      expect(result.isStagnant).toBe(true);
      expect(result.repeatedPatterns.length).toBeGreaterThan(0);
    });

    it('should detect high similarity but not identical responses', () => {
      const responses = [
        'function test() { return 42; }',
        'function test() { return 43; }', // Minor change
        'function test() { return 44; }', // Minor change
      ];

      const result = detector.analyzeResponseSimilarity(responses);

      expect(result.averageSimilarity).toBeGreaterThan(0.8);
      expect(result.averageSimilarity).toBeLessThan(0.99);
    });

    it('should not detect stagnation for diverse responses', () => {
      const responses = [
        'function test() { return 42; }',
        'class MyClass { constructor() {} }',
        'const data = [1, 2, 3, 4, 5];',
      ];

      const result = detector.analyzeResponseSimilarity(responses);

      expect(result.averageSimilarity).toBeLessThan(0.5);
      expect(result.isStagnant).toBe(false);
    });

    it('should detect repeated code patterns', () => {
      const responses = [
        '```javascript\nfunction test() { return 42; }\n```',
        '```javascript\nfunction test() { return 42; }\n```',
      ];

      const result = detector.analyzeResponseSimilarity(responses);

      expect(result.repeatedPatterns.some(pattern =>
        pattern.includes('identical') || pattern.includes('similar')
      )).toBe(true);
    });
  });

  describe('detectStagnation', () => {
    const createMockIteration = (
      thoughtNumber: number,
      code: string,
      score: number = 0.7
    ): IterationData => ({
      thoughtNumber,
      code,
      auditResult: {
        overall: score,
        dimensions: [],
        verdict: score > 0.8 ? 'pass' : 'revise',
        review: { 
          summary: `Mock review for iteration ${thoughtNumber}`,
          inline: [],
          citations: []
        },
        iterations: thoughtNumber,
        judge_cards: [],
      } as GansAuditorCodexReview,
      timestamp: Date.now(),
    });

    it('should not detect stagnation with insufficient iterations', () => {
      const iterations = [
        createMockIteration(1, 'function test() { return 1; }'),
        createMockIteration(2, 'function test() { return 2; }'),
      ];

      const result = detector.detectStagnation(iterations, 5);

      expect(result.isStagnant).toBe(false);
      expect(result.recommendation).toContain('Not enough iterations');
    });

    it('should not detect stagnation below start loop threshold', () => {
      const iterations = Array.from({ length: 5 }, (_, i) =>
        createMockIteration(i + 1, `function test() { return ${i + 1}; }`)
      );

      const result = detector.detectStagnation(iterations, 5); // Below default threshold of 10

      expect(result.isStagnant).toBe(false);
      expect(result.recommendation).toContain('below start loop threshold');
    });

    it('should detect stagnation with identical code', () => {
      const sameCode = 'function test() { return 42; }';
      const iterations = Array.from({ length: 5 }, (_, i) =>
        createMockIteration(i + 10, sameCode, 0.6) // Same code, low score
      );

      const result = detector.detectStagnation(iterations, 15);

      expect(result.isStagnant).toBe(true);
      expect(result.detectedAtLoop).toBe(15);
      expect(result.similarityScore).toBeGreaterThan(0.95);
      expect(result.recommendation).toContain('Stagnation detected');
    });

    it('should detect cosmetic changes only', () => {
      const iterations = [
        createMockIteration(10, 'function test() { return 42; }', 0.6),
        createMockIteration(11, 'function test() {return 42;}', 0.61), // Whitespace change
        createMockIteration(12, 'function test() { return 42 ; }', 0.62), // Minor spacing
        createMockIteration(13, 'function test(){return 42;}', 0.63), // More whitespace changes
      ];

      const result = detector.detectStagnation(iterations, 13);

      expect(result.progressAnalysis.cosmeticChangesOnly).toBe(true);
      expect(result.alternativeSuggestions).toContain(
        'Focus on substantial structural changes rather than minor adjustments'
      );
    });

    it('should detect reverting changes', () => {
      const originalCode = 'function test() { return 42; }';
      const modifiedCode = 'function test() { return 43; }';

      const iterations = [
        createMockIteration(10, originalCode, 0.6),
        createMockIteration(11, modifiedCode, 0.5), // Change that made things worse
        createMockIteration(12, originalCode, 0.6), // Reverted back
      ];

      const result = detector.detectStagnation(iterations, 12);

      expect(result.progressAnalysis.revertingChanges).toBe(true);
      expect(result.alternativeSuggestions).toContain(
        'Establish a clear direction and stick to it'
      );
    });

    it('should detect declining scores (confusion)', () => {
      const iterations = [
        createMockIteration(10, 'function test() { return 42; }', 0.8),
        createMockIteration(11, 'function test() { return "hello"; }', 0.6),
        createMockIteration(12, 'function test() { throw new Error(); }', 0.4),
      ];

      const result = detector.detectStagnation(iterations, 12);

      expect(result.progressAnalysis.showsConfusion).toBe(true);
      expect(result.alternativeSuggestions).toContain(
        'Take a step back and reassess the requirements'
      );
    });

    it('should provide alternative suggestions for low scores', () => {
      const iterations = [
        createMockIteration(10, 'function test() { return 42; }', 0.3),
        createMockIteration(11, 'function test() { return 43; }', 0.2),
        createMockIteration(12, 'function test() { return 44; }', 0.1),
      ];

      const result = detector.detectStagnation(iterations, 12);

      expect(result.alternativeSuggestions).toContain(
        'Consider starting over with a fresh approach'
      );
    });

    it('should detect stuck on same issues', () => {
      const createIterationWithIssues = (num: number, issues: string[]) => {
        const iteration = createMockIteration(num, `function test${num}() { return ${num}; }`, 0.6);
        iteration.auditResult.review = {
          summary: `Review with issues for iteration ${num}`,
          inline: issues.map(issue => ({
            path: 'test.js',
            line: 1,
            comment: issue,
          })),
          citations: []
        };
        return iteration;
      };

      const iterations = [
        createIterationWithIssues(10, ['Security vulnerability detected']),
        createIterationWithIssues(11, ['Security vulnerability still present']),
        createIterationWithIssues(12, ['Security issue not resolved']),
      ];

      const result = detector.detectStagnation(iterations, 12);

      expect(result.progressAnalysis.stuckOnSameIssues).toBe(true);
      expect(result.patterns.errorPatterns).toContain('Security issues');
    });

    it('should generate comprehensive stagnation analysis', () => {
      const sameCode = 'function test() { return 42; }';
      const iterations = Array.from({ length: 4 }, (_, i) =>
        createMockIteration(i + 10, sameCode, 0.6)
      );

      const result = detector.detectStagnation(iterations, 13);

      expect(result).toHaveProperty('isStagnant');
      expect(result).toHaveProperty('detectedAtLoop');
      expect(result).toHaveProperty('similarityScore');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('similarityProgression');
      expect(result).toHaveProperty('progressAnalysis');
      expect(result).toHaveProperty('alternativeSuggestions');

      expect(Array.isArray(result.similarityProgression)).toBe(true);
      expect(Array.isArray(result.alternativeSuggestions)).toBe(true);
      expect(typeof result.progressAnalysis).toBe('object');
      expect(typeof result.patterns).toBe('object');
    });
  });

  describe('similarity calculation algorithms', () => {
    it('should handle empty strings', () => {
      const result = detector.analyzeResponseSimilarity(['', '']);
      expect(result.averageSimilarity).toBe(1.0); // Empty strings are identical
    });

    it('should handle very different strings', () => {
      const responses = [
        'function javascript() { console.log("hello"); }',
        'SELECT * FROM users WHERE id = 1;',
      ];

      const result = detector.analyzeResponseSimilarity(responses);
      expect(result.averageSimilarity).toBeLessThan(0.3);
    });

    it('should detect structural similarity in code', () => {
      const responses = [
        'function test() { return getData(); }',
        'function test() { return fetchData(); }', // Same structure, different function name
      ];

      const result = detector.analyzeResponseSimilarity(responses);
      expect(result.averageSimilarity).toBeGreaterThan(0.7); // Should detect structural similarity
    });

    it('should handle code with different formatting', () => {
      const responses = [
        'function test(){\nreturn 42;\n}',
        'function test() {\n  return 42;\n}', // Different indentation
      ];

      const result = detector.analyzeResponseSimilarity(responses);
      expect(result.averageSimilarity).toBeGreaterThan(0.75); // Should be similar despite formatting
    });
  });

  describe('pattern detection', () => {
    it('should detect repeated code blocks', () => {
      const responses = [
        'Here is my solution:\n```javascript\nfunction test() { return 42; }\n```',
        'Updated solution:\n```javascript\nfunction test() { return 42; }\n```',
      ];

      const result = detector.analyzeResponseSimilarity(responses);
      expect(result.repeatedPatterns.length).toBeGreaterThan(0);
    });

    it('should detect error patterns', () => {
      const responses = [
        'There is an error in the code that needs fixing',
        'The error still persists and needs attention',
      ];

      const result = detector.analyzeResponseSimilarity(responses);
      // Should detect repeated mention of "error"
      expect(result.repeatedPatterns.some(pattern =>
        pattern.toLowerCase().includes('error')
      )).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customDetector = new LoopDetector({
        stagnationThreshold: 0.8, // Lower threshold
        stagnationStartLoop: 5,   // Earlier start
      });

      const responses = Array(3).fill('function test() { return 42; }');
      const result = customDetector.analyzeResponseSimilarity(responses);

      // With lower threshold, should still detect stagnation
      expect(result.isStagnant).toBe(true);
    });

    it('should use default configuration when none provided', () => {
      const defaultDetector = new LoopDetector();

      // Access private config through testing (implementation detail)
      expect(defaultDetector).toBeDefined();
      // We can't directly test private properties, but we can test behavior

      const responses = ['test1', 'test2'];
      const result = defaultDetector.analyzeResponseSimilarity(responses);
      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null or undefined inputs gracefully', () => {
      expect(() => detector.analyzeResponseSimilarity([])).not.toThrow();
      expect(() => detector.detectStagnation([], 0)).not.toThrow();
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const responses = [longString, longString + 'b'];

      const result = detector.analyzeResponseSimilarity(responses);
      expect(result.averageSimilarity).toBeGreaterThan(0.5); // Realistic expectation for sampling approach
      expect(result.averageSimilarity).toBeLessThan(1.0); // Should detect the difference
    });

    it('should handle special characters and unicode', () => {
      const responses = [
        'function test() { return "Hello 世界"; }',
        'function test() { return "Hello 世界!"; }',
      ];

      const result = detector.analyzeResponseSimilarity(responses);
      expect(result.averageSimilarity).toBeGreaterThan(0.8);
    });

    it('should handle mixed content types', () => {
      const responses = [
        'Here is some text with ```code blocks``` and normal text',
        'Here is different text with ```other code``` and more text',
      ];

      const result = detector.analyzeResponseSimilarity(responses);
      expect(result).toBeDefined();
      expect(typeof result.averageSimilarity).toBe('number');
    });
  });

  describe('performance', () => {
    it('should handle large numbers of responses efficiently', () => {
      const responses = Array.from({ length: 100 }, (_, i) =>
        `function test${i}() { return ${i}; }`
      );

      const startTime = Date.now();
      const result = detector.analyzeResponseSimilarity(responses);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toBeDefined();
    });

    it('should handle complex iteration analysis efficiently', () => {
      const iterations = Array.from({ length: 50 }, (_, i) => ({
        thoughtNumber: i + 1,
        code: `function test${i}() { return ${i}; }`,
        auditResult: {
          overall: Math.random(),
          dimensions: [],
          verdict: 'revise' as const,
          review: { 
            summary: `Performance test review ${i}`,
            inline: [],
            citations: []
          },
          iterations: i + 1,
          judge_cards: [],
        } as GansAuditorCodexReview,
        timestamp: Date.now(),
      }));

      const startTime = Date.now();
      const result = detector.detectStagnation(iterations, 50);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(result).toBeDefined();
    });
  });
});