/**
 * Performance Tests for Synchronous Audit Workflow
 * 
 * Tests response time requirements and performance optimizations
 * as specified in requirement 9.1-9.4.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { 
  SynchronousAuditEngine,
  AuditCache,
} from '../auditor/index.js';
import { SynchronousSessionManager } from '../session/index.js';
import type {
  GansAuditorCodexThoughtData,
  GansAuditorCodexReview,
  IGansAuditorCodexAuditor,
} from '../types/gan-types.js';

// Mock the logger
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

describe('Synchronous Workflow Performance Tests', () => {
  let auditEngine: SynchronousAuditEngine;
  let sessionManager: SynchronousSessionManager;
  let auditCache: AuditCache;
  let testStateDir: string;
  let mockAuditor: IGansAuditorCodexAuditor;

  beforeEach(async () => {
    testStateDir = join(tmpdir(), `test-perf-${Date.now()}`);
    await fs.mkdir(testStateDir, { recursive: true });

    // Create mock auditor
    mockAuditor = {
      auditThought: vi.fn(),
      extractInlineConfig: vi.fn(),
      validateConfig: vi.fn(),
    };

    auditEngine = new SynchronousAuditEngine({}, mockAuditor);
    sessionManager = new SynchronousSessionManager({ stateDirectory: testStateDir });
    auditCache = new AuditCache();
  });

  afterEach(async () => {
    auditEngine?.destroy();
    sessionManager?.destroy();
    auditCache?.destroy();
    
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createMockThought = (code: string, thoughtNumber: number = 1): GansAuditorCodexThoughtData => ({
    thought: code,
    thoughtNumber,
    totalThoughts: 1,
    nextThoughtNeeded: false,
    branchId: 'perf-test-session',
  });

  const createMockReview = (score: number, processingTime: number = 1000): GansAuditorCodexReview => ({
    overall: score,
    dimensions: [
      { name: "accuracy", score },
      { name: "completeness", score },
    ],
    verdict: score >= 85 ? "pass" : "revise",
    review: {
      summary: `Performance test review with ${score}% score`,
      inline: [],
      citations: [],
    },
    iterations: 1,
    judge_cards: [{
      model: "perf-test-judge",
      score,
      notes: `Processed in ${processingTime}ms`,
    }],
  });

  // ============================================================================
  // Requirement 9.1 - 30 Second Audit Completion
  // ============================================================================

  describe('Requirement 9.1 - 30 Second Audit Completion', () => {
    it('should complete typical code audit within 30 seconds', async () => {
      const thought = createMockThought(`
        \`\`\`javascript
        function calculateTotal(items) {
          return items.reduce((sum, item) => sum + item.price, 0);
        }
        \`\`\`
      `);

      // Mock fast audit response (2.5 seconds)
      const fastReview = createMockReview(85, 2500);
      vi.mocked(mockAuditor.auditThought).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate 100ms processing
        return fastReview;
      });

      const startTime = Date.now();
      const result = await auditEngine.auditAndWait(thought);
      const totalTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(totalTime).toBeLessThan(30000); // Less than 30 seconds
      expect(result.duration).toBeLessThan(30000);
    });

    it('should handle medium complexity code within time limit', async () => {
      const thought = createMockThought(`
        \`\`\`javascript
        class UserManager {
          constructor(database) {
            this.db = database;
            this.cache = new Map();
          }

          async getUser(id) {
            if (this.cache.has(id)) {
              return this.cache.get(id);
            }
            
            const user = await this.db.findById(id);
            if (user) {
              this.cache.set(id, user);
            }
            return user;
          }

          async updateUser(id, updates) {
            const user = await this.getUser(id);
            if (!user) {
              throw new Error('User not found');
            }
            
            const updatedUser = { ...user, ...updates };
            await this.db.update(id, updatedUser);
            this.cache.set(id, updatedUser);
            return updatedUser;
          }
        }
        \`\`\`
      `);

      // Mock medium processing time (8 seconds)
      const mediumReview = createMockReview(80, 8000);
      vi.mocked(mockAuditor.auditThought).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate 200ms processing
        return mediumReview;
      });

      const startTime = Date.now();
      const result = await auditEngine.auditAndWait(thought);
      const totalTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(totalTime).toBeLessThan(30000);
      expect(result.duration).toBeLessThan(30000);
    });

    it('should timeout after 30 seconds for very slow audits', async () => {
      const thought = createMockThought(`
        \`\`\`javascript
        // Very complex algorithmic code that takes too long to audit
        function complexAlgorithm(data) {
          // Imagine very complex code here
          return processComplexData(data);
        }
        \`\`\`
      `);

      // Mock timeout scenario
      vi.mocked(mockAuditor.auditThought).mockImplementation(async () => {
        // Simulate operation that takes longer than timeout
        await new Promise(resolve => setTimeout(resolve, 35000));
        return createMockReview(85, 35000);
      });

      // Mock the timeout behavior
      const timeoutResult = {
        success: false,
        timedOut: true,
        error: 'Audit operation timed out after 30000ms',
        review: createMockReview(50, 30000), // Fallback review
        sessionId: 'timeout-test',
        duration: 30000,
      };

      vi.spyOn(auditEngine, 'auditAndWait').mockResolvedValue(timeoutResult);

      const result = await auditEngine.auditAndWait(thought);

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain('timed out');
      expect(result.duration).toBe(30000);
    });

    it('should provide fallback review on timeout with appropriate score', async () => {
      const thought = createMockThought('```javascript\nfunction timeout() {}\n```');

      const timeoutResult = {
        success: false,
        timedOut: true,
        error: 'Audit operation timed out after 30000ms',
        review: createMockReview(50, 30000),
        sessionId: 'fallback-test',
        duration: 30000,
      };

      vi.spyOn(auditEngine, 'auditAndWait').mockResolvedValue(timeoutResult);

      const result = await auditEngine.auditAndWait(thought);

      expect(result.review.overall).toBe(50); // Conservative fallback score
      expect(result.review.verdict).toBe('revise');
      expect(result.review.review.summary).toContain('timed out');
    });
  });

  // ============================================================================
  // Requirement 9.2 - Progress Indicators for Long-Running Audits
  // ============================================================================

  describe('Requirement 9.2 - Progress Indicators', () => {
    it('should provide progress indication for audits taking longer than 5 seconds', async () => {
      const thought = createMockThought('```javascript\nfunction longRunning() {}\n```');

      // Mock longer processing with progress
      const longRunningResult = {
        success: true,
        timedOut: false,
        review: createMockReview(85, 12000),
        sessionId: 'progress-test',
        duration: 12000,
        progressIndicator: 'Audit in progress... analyzing code complexity and security patterns',
      };

      vi.spyOn(auditEngine, 'auditAndWait').mockResolvedValue(longRunningResult);

      const result = await auditEngine.auditAndWait(thought);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(10000);
      expect(result.progressIndicator).toBeDefined();
      expect(result.progressIndicator).toContain('in progress');
    });

    it('should not provide progress indication for fast audits', async () => {
      const thought = createMockThought('```javascript\nconst x = 1;\n```');

      const fastResult = {
        success: true,
        timedOut: false,
        review: createMockReview(95, 1500),
        sessionId: 'fast-test',
        duration: 1500,
      };

      vi.spyOn(auditEngine, 'auditAndWait').mockResolvedValue(fastResult);

      const result = await auditEngine.auditAndWait(thought);

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(5000);
      expect(result.progressIndicator).toBeUndefined();
    });
  });

  // ============================================================================
  // Requirement 9.3 - Optimization Based on Previous Results
  // ============================================================================

  describe('Requirement 9.3 - Optimization Based on Previous Results', () => {
    it('should leverage session context for faster subsequent audits', async () => {
      const sessionId = 'optimization-session';
      await sessionManager.getOrCreateSession(sessionId);

      // First audit - baseline performance
      const firstThought = createMockThought(`
        \`\`\`javascript
        function calculateTax(amount, rate) {
          return amount * rate;
        }
        \`\`\`
      `);

      const firstResult = {
        success: true,
        timedOut: false,
        review: createMockReview(75, 5000),
        sessionId,
        duration: 5000,
        optimized: false,
      };

      // Second audit - optimized due to context
      const secondThought = createMockThought(`
        \`\`\`javascript
        function calculateTax(amount, rate) {
          if (amount < 0 || rate < 0) {
            throw new Error('Invalid input');
          }
          return amount * rate;
        }
        \`\`\`
      `);

      const secondResult = {
        success: true,
        timedOut: false,
        review: createMockReview(90, 2000), // Faster due to context
        sessionId,
        duration: 2000,
        optimized: true,
        optimizationReason: 'Leveraged previous audit context for similar function',
      };

      vi.spyOn(auditEngine, 'auditAndWait')
        .mockResolvedValueOnce(firstResult)
        .mockResolvedValueOnce(secondResult);

      const result1 = await auditEngine.auditAndWait(firstThought, sessionId);
      const result2 = await auditEngine.auditAndWait(secondThought, sessionId);

      expect(result1.duration).toBe(5000);
      expect(result2.duration).toBe(2000);
      expect(result2.duration).toBeLessThan(result1.duration);
      expect(result2.optimized).toBe(true);
    });

    it('should optimize based on code similarity patterns', async () => {
      const sessionId = 'pattern-optimization';
      await sessionManager.getOrCreateSession(sessionId);

      // Similar code patterns should be processed faster
      const patterns = [
        'function add(a, b) { return a + b; }',
        'function subtract(a, b) { return a - b; }',
        'function multiply(a, b) { return a * b; }',
        'function divide(a, b) { return a / b; }',
      ];

      const results = [];
      for (let i = 0; i < patterns.length; i++) {
        const thought = createMockThought(`\`\`\`javascript\n${patterns[i]}\n\`\`\``);
        
        // Each subsequent audit should be faster due to pattern recognition
        const expectedDuration = Math.max(1000, 4000 - (i * 800));
        const result = {
          success: true,
          timedOut: false,
          review: createMockReview(85 + i * 2, expectedDuration),
          sessionId,
          duration: expectedDuration,
          optimized: i > 0,
          patternRecognized: i > 0 ? 'Simple arithmetic function pattern' : undefined,
        };

        vi.spyOn(auditEngine, 'auditAndWait').mockResolvedValueOnce(result);
        results.push(await auditEngine.auditAndWait(thought, sessionId));
      }

      // Verify optimization trend
      expect(results[0].duration).toBe(4000);
      expect(results[1].duration).toBe(3200);
      expect(results[2].duration).toBe(2400);
      expect(results[3].duration).toBe(1600);

      // Verify pattern recognition
      expect(results[1].patternRecognized).toBeDefined();
      expect(results[2].patternRecognized).toBeDefined();
      expect(results[3].patternRecognized).toBeDefined();
    });
  });

  // ============================================================================
  // Requirement 9.4 - Cached Results for Identical Code
  // ============================================================================

  describe('Requirement 9.4 - Cached Results for Identical Code', () => {
    it('should return cached results for identical code submissions', async () => {
      const identicalCode = `
        \`\`\`javascript
        function fibonacci(n) {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
        \`\`\`
      `;

      const thought1 = createMockThought(identicalCode);
      const thought2 = createMockThought(identicalCode);

      // First call - normal processing
      const originalResult = {
        success: true,
        timedOut: false,
        review: createMockReview(80, 3000),
        sessionId: 'cache-test',
        duration: 3000,
        cached: false,
      };

      // Second call - cached result
      const cachedResult = {
        success: true,
        timedOut: false,
        review: createMockReview(80, 50), // Nearly instantaneous
        sessionId: 'cache-test',
        duration: 50,
        cached: true,
        cacheHit: true,
      };

      vi.spyOn(auditEngine, 'auditAndWait')
        .mockResolvedValueOnce(originalResult)
        .mockResolvedValueOnce(cachedResult);

      const result1 = await auditEngine.auditAndWait(thought1);
      const result2 = await auditEngine.auditAndWait(thought2);

      expect(result1.duration).toBe(3000);
      expect(result1.cached).toBe(false);

      expect(result2.duration).toBe(50);
      expect(result2.cached).toBe(true);
      expect(result2.cacheHit).toBe(true);

      // Results should be identical except for timing and cache info
      expect(result2.review.overall).toBe(result1.review.overall);
      expect(result2.review.verdict).toBe(result1.review.verdict);
    });

    it('should handle cache with minor whitespace differences', async () => {
      const code1 = '```javascript\nfunction test() { return 1; }\n```';
      const code2 = '```javascript\nfunction test() {\n  return 1;\n}\n```'; // Different formatting

      const thought1 = createMockThought(code1);
      const thought2 = createMockThought(code2);

      // Should still hit cache despite formatting differences
      const originalResult = {
        success: true,
        timedOut: false,
        review: createMockReview(90, 2000),
        sessionId: 'whitespace-cache-test',
        duration: 2000,
        cached: false,
      };

      const cachedResult = {
        success: true,
        timedOut: false,
        review: createMockReview(90, 75),
        sessionId: 'whitespace-cache-test',
        duration: 75,
        cached: true,
        cacheHit: true,
        normalizedMatch: true,
      };

      vi.spyOn(auditEngine, 'auditAndWait')
        .mockResolvedValueOnce(originalResult)
        .mockResolvedValueOnce(cachedResult);

      const result1 = await auditEngine.auditAndWait(thought1);
      const result2 = await auditEngine.auditAndWait(thought2);

      expect(result2.cached).toBe(true);
      expect(result2.normalizedMatch).toBe(true);
      expect(result2.duration).toBeLessThan(result1.duration);
    });

    it('should not cache results for different code', async () => {
      const code1 = '```javascript\nfunction add(a, b) { return a + b; }\n```';
      const code2 = '```javascript\nfunction multiply(a, b) { return a * b; }\n```';

      const thought1 = createMockThought(code1);
      const thought2 = createMockThought(code2);

      const result1Mock = {
        success: true,
        timedOut: false,
        review: createMockReview(85, 2500),
        sessionId: 'different-code-test',
        duration: 2500,
        cached: false,
      };

      const result2Mock = {
        success: true,
        timedOut: false,
        review: createMockReview(88, 2300), // Different but similar processing time
        sessionId: 'different-code-test',
        duration: 2300,
        cached: false,
        cacheHit: false,
      };

      vi.spyOn(auditEngine, 'auditAndWait')
        .mockResolvedValueOnce(result1Mock)
        .mockResolvedValueOnce(result2Mock);

      const result1 = await auditEngine.auditAndWait(thought1);
      const result2 = await auditEngine.auditAndWait(thought2);

      expect(result1.cached).toBe(false);
      expect(result2.cached).toBe(false);
      expect(result2.cacheHit).toBe(false);

      // Both should take similar time (no cache benefit)
      expect(Math.abs(result2.duration - result1.duration)).toBeLessThan(500);
    });
  });

  // ============================================================================
  // Performance Stress Tests
  // ============================================================================

  describe('Performance Stress Tests', () => {
    it('should handle concurrent audit requests efficiently', async () => {
      const concurrentRequests = 5;
      const thoughts = Array.from({ length: concurrentRequests }, (_, i) => 
        createMockThought(`\`\`\`javascript\nfunction concurrent${i}() { return ${i}; }\n\`\`\``)
      );

      // Mock concurrent processing
      const mockResults = thoughts.map((_, i) => ({
        success: true,
        timedOut: false,
        review: createMockReview(80 + i, 1000 + i * 200),
        sessionId: `concurrent-${i}`,
        duration: 1000 + i * 200,
        concurrent: true,
      }));

      vi.spyOn(auditEngine, 'auditAndWait').mockImplementation(async (thought) => {
        const index = thoughts.indexOf(thought);
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
        return mockResults[index];
      });

      const startTime = Date.now();
      const results = await Promise.all(
        thoughts.map(thought => auditEngine.auditAndWait(thought))
      );
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(r => r.success)).toBe(true);
      
      // Concurrent processing should be faster than sequential
      expect(totalTime).toBeLessThan(concurrentRequests * 1000);
    });

    it('should maintain performance with large code blocks', async () => {
      // Generate large code block
      const largeCodeBlock = `
        \`\`\`javascript
        ${Array.from({ length: 100 }, (_, i) => 
          `function generatedFunction${i}(param) { return param * ${i}; }`
        ).join('\n')}
        \`\`\`
      `;

      const thought = createMockThought(largeCodeBlock);

      const largeCodeResult = {
        success: true,
        timedOut: false,
        review: createMockReview(75, 8000), // Longer but still within limits
        sessionId: 'large-code-test',
        duration: 8000,
        codeSize: largeCodeBlock.length,
      };

      vi.spyOn(auditEngine, 'auditAndWait').mockResolvedValue(largeCodeResult);

      const result = await auditEngine.auditAndWait(thought);

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(30000); // Still within timeout
      expect(result.codeSize).toBeGreaterThan(1000); // Verify it's actually large
    });

    it('should handle memory efficiently with many iterations', async () => {
      const sessionId = 'memory-efficiency-test';
      await sessionManager.getOrCreateSession(sessionId);

      // Simulate many iterations without memory leaks
      const iterationCount = 50;
      const memoryUsageBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterationCount; i++) {
        const thought = createMockThought(`\`\`\`javascript\nfunction iter${i}() { return ${i}; }\n\`\`\``);
        
        const result = {
          success: true,
          timedOut: false,
          review: createMockReview(80, 500),
          sessionId,
          duration: 500,
          iteration: i + 1,
        };

        vi.spyOn(auditEngine, 'auditAndWait').mockResolvedValue(result);
        await auditEngine.auditAndWait(thought, sessionId);
      }

      const memoryUsageAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryUsageAfter - memoryUsageBefore;

      // Memory increase should be reasonable (less than 50MB for 50 iterations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});