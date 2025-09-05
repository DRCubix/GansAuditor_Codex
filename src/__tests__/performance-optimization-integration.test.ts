/**
 * Integration Tests for Performance Optimizations
 * 
 * Tests the complete performance optimization suite including caching,
 * progress tracking, queue management, and memory-efficient session management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SynchronousAuditEngine, type SynchronousAuditEngineConfig } from '../auditor/synchronous-audit-engine.js';
import { MemoryEfficientSessionManager } from '../session/memory-efficient-session-manager.js';
import type { 
  GansAuditorCodexThoughtData, 
  GansAuditorCodexReview,
  IGansAuditorCodexAuditor 
} from '../types/gan-types.js';

describe('Performance Optimization Integration', () => {
  let auditEngine: SynchronousAuditEngine;
  let sessionManager: MemoryEfficientSessionManager;
  let mockAuditor: IGansAuditorCodexAuditor;
  let mockReview: GansAuditorCodexReview;

  beforeEach(() => {
    mockReview = {
      overall: 85,
      dimensions: [
        { name: 'accuracy', score: 90 },
        { name: 'completeness', score: 80 },
        { name: 'clarity', score: 85 },
        { name: 'actionability', score: 85 },
        { name: 'human_likeness', score: 85 },
      ],
      verdict: 'pass',
      review: {
        summary: 'Good implementation with room for improvement',
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 1,
      judge_cards: [{
        model: 'test-judge',
        score: 85,
        notes: 'Test review with detailed feedback',
      }],
    };

    mockAuditor = {
      auditThought: vi.fn().mockResolvedValue(mockReview),
    } as any;

    sessionManager = new MemoryEfficientSessionManager({
      stateDirectory: '.test-performance-integration',
      maxMemoryUsage: 5 * 1024 * 1024, // 5MB
      maxIterationsInMemory: 10,
      enableCompression: true,
      enableMemoryMonitoring: false,
    });

    const config: Partial<SynchronousAuditEngineConfig> = {
      enabled: true,
      auditTimeout: 5000,
      performance: {
        enableCaching: true,
        enableProgressTracking: true,
        enableQueueManagement: true,
        cacheConfig: {
          maxEntries: 100,
          maxAge: 60000,
          enableStats: true,
        },
        progressConfig: {
          progressThreshold: 100,
          updateInterval: 50,
          enableLogging: false,
        },
        queueConfig: {
          maxConcurrent: 3,
          maxQueueSize: 20,
          defaultTimeout: 5000,
          processingInterval: 10,
        },
      },
    };

    auditEngine = new SynchronousAuditEngine(config, mockAuditor);
  });

  afterEach(() => {
    auditEngine.destroy();
    sessionManager.destroy();
  });

  describe('End-to-End Performance Optimization', () => {
    it('should demonstrate complete optimization workflow', async () => {
      const sessionId = 'performance-test-session';
      const thought: GansAuditorCodexThoughtData = {
        thoughtNumber: 1,
        thought: `
          \`\`\`typescript
          function calculateSum(numbers: number[]): number {
            return numbers.reduce((sum, num) => sum + num, 0);
          }
          
          function calculateAverage(numbers: number[]): number {
            if (numbers.length === 0) return 0;
            return calculateSum(numbers) / numbers.length;
          }
          \`\`\`
        `,
      };

      // Create session
      const session = await sessionManager.getOrCreateSession(sessionId);
      expect(session.id).toBe(sessionId);

      // First audit - should go through full process
      const startTime = Date.now();
      const result1 = await auditEngine.auditAndWait(thought, sessionId);
      const firstAuditTime = Date.now() - startTime;

      expect(result1.success).toBe(true);
      expect(result1.review).toEqual(mockReview);
      expect(mockAuditor.auditThought).toHaveBeenCalledTimes(1);

      // Add iteration to session
      await sessionManager.addIteration(sessionId, {
        thoughtNumber: thought.thoughtNumber,
        code: thought.thought,
        auditResult: result1.review,
        timestamp: Date.now(),
      });

      // Second audit with identical code - should hit cache
      const cacheStartTime = Date.now();
      const result2 = await auditEngine.auditAndWait(thought, sessionId);
      const cachedAuditTime = Date.now() - cacheStartTime;

      expect(result2.success).toBe(true);
      expect(result2.review).toEqual(mockReview);
      // Should not call auditor again due to caching
      expect(mockAuditor.auditThought).toHaveBeenCalledTimes(1);
      
      // Cached result should be significantly faster
      expect(cachedAuditTime).toBeLessThan(firstAuditTime);

      // Verify cache statistics
      const perfStats = auditEngine.getPerformanceStats();
      expect(perfStats.cache?.hits).toBeGreaterThan(0);
      expect(perfStats.cache?.hitRate).toBeGreaterThan(0);
    });

    it('should handle concurrent audits with queue management', async () => {
      const thoughts: GansAuditorCodexThoughtData[] = [];
      
      // Create multiple different thoughts
      for (let i = 1; i <= 5; i++) {
        thoughts.push({
          thoughtNumber: i,
          thought: `
            \`\`\`typescript
            function test${i}() {
              return ${i} * 2;
            }
            \`\`\`
          `,
        });
      }

      // Mock auditor with delay to test queuing
      const delayedAuditor = {
        auditThought: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(mockReview), 100))
        ),
      } as any;

      const queueEngine = new SynchronousAuditEngine({
        enabled: true,
        performance: {
          enableQueueManagement: true,
          queueConfig: {
            maxConcurrent: 2, // Limit concurrency
            processingInterval: 10,
          },
        },
      }, delayedAuditor);

      try {
        const startTime = Date.now();
        
        // Submit all audits concurrently
        const promises = thoughts.map(thought => 
          queueEngine.auditAndWait(thought, 'queue-test-session')
        );

        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;

        // All should succeed
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result.success).toBe(true);
        });

        // Should have called auditor for each unique thought
        expect(delayedAuditor.auditThought).toHaveBeenCalledTimes(5);

        // Verify queue statistics
        const queueStats = queueEngine.getPerformanceStats();
        expect(queueStats.queue?.completed).toBe(5);

        // With concurrency limit of 2, should take longer than 100ms but less than 500ms
        expect(totalTime).toBeGreaterThan(200); // At least 2 batches
        expect(totalTime).toBeLessThan(1000); // But not too long
      } finally {
        queueEngine.destroy();
      }
    });

    it('should track progress for long-running audits', async () => {
      const progressEvents: any[] = [];
      
      // Mock slow auditor
      const slowAuditor = {
        auditThought: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(mockReview), 300))
        ),
      } as any;

      const progressEngine = new SynchronousAuditEngine({
        enabled: true,
        performance: {
          enableProgressTracking: true,
          progressConfig: {
            progressThreshold: 50, // Start tracking quickly
            updateInterval: 25,
            enableLogging: false,
          },
        },
      }, slowAuditor);

      try {
        // Listen for progress events
        const progressTracker = (progressEngine as any).progressTracker;
        if (progressTracker) {
          progressTracker.on('progress', (update: any) => {
            progressEvents.push(update);
          });
        }

        const thought: GansAuditorCodexThoughtData = {
          thoughtNumber: 1,
          thought: `
            \`\`\`typescript
            function complexCalculation() {
              // This is a complex function that takes time to audit
              return Math.random() * 1000;
            }
            \`\`\`
          `,
        };

        const result = await progressEngine.auditAndWait(thought, 'progress-test-session');

        expect(result.success).toBe(true);
        
        // Should have received progress events
        expect(progressEvents.length).toBeGreaterThan(0);
        
        // Events should have proper structure
        if (progressEvents.length > 0) {
          const event = progressEvents[0];
          expect(event).toHaveProperty('auditId');
          expect(event).toHaveProperty('percentage');
          expect(event).toHaveProperty('stage');
          expect(event).toHaveProperty('elapsedTime');
        }
      } finally {
        progressEngine.destroy();
      }
    });

    it('should optimize memory usage with session management', async () => {
      const sessionId = 'memory-test-session';
      
      // Create session and add many iterations
      await sessionManager.getOrCreateSession(sessionId);
      
      const initialStats = sessionManager.getMemoryStats();
      
      // Add multiple iterations to test memory management
      for (let i = 1; i <= 15; i++) {
        const iteration = {
          thoughtNumber: i,
          code: `function test${i}() { return ${'x'.repeat(100)}; }`, // Large code
          auditResult: mockReview,
          timestamp: Date.now() - (15 - i) * 1000, // Spread timestamps
        };
        
        await sessionManager.addIteration(sessionId, iteration);
      }

      // Wait for compression age
      await new Promise(resolve => setTimeout(resolve, 150));

      // Trigger optimization
      await sessionManager.optimizeAllSessions();

      const finalStats = sessionManager.getMemoryStats();
      
      // Should have managed memory efficiently
      expect(finalStats.activeSessions).toBeGreaterThan(0);
      
      // Get session to verify integrity
      const session = await sessionManager.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.iterations).toBeDefined();
      
      // Should have limited iterations in memory due to trimming
      expect(session?.iterations?.length).toBeLessThanOrEqual(10);

      // Get memory breakdown
      const breakdown = await sessionManager.getMemoryBreakdown();
      expect(breakdown.length).toBeGreaterThan(0);
      expect(breakdown[0].sessionId).toBe(sessionId);
    });

    it('should handle mixed workload efficiently', async () => {
      const sessionId = 'mixed-workload-session';
      
      // Create session
      await sessionManager.getOrCreateSession(sessionId);

      // Mix of cached and uncached thoughts
      const baseThought: GansAuditorCodexThoughtData = {
        thoughtNumber: 1,
        thought: `
          \`\`\`typescript
          function baseFunction() {
            return "base";
          }
          \`\`\`
        `,
      };

      const modifiedThought: GansAuditorCodexThoughtData = {
        thoughtNumber: 2,
        thought: `
          \`\`\`typescript
          function modifiedFunction() {
            return "modified";
          }
          \`\`\`
        `,
      };

      // First audit - cache miss
      const result1 = await auditEngine.auditAndWait(baseThought, sessionId);
      expect(result1.success).toBe(true);

      // Second audit - same code, cache hit
      const result2 = await auditEngine.auditAndWait(baseThought, sessionId);
      expect(result2.success).toBe(true);

      // Third audit - different code, cache miss
      const result3 = await auditEngine.auditAndWait(modifiedThought, sessionId);
      expect(result3.success).toBe(true);

      // Fourth audit - repeat of second, cache hit
      const result4 = await auditEngine.auditAndWait(baseThought, sessionId);
      expect(result4.success).toBe(true);

      // Verify cache efficiency
      const perfStats = auditEngine.getPerformanceStats();
      expect(perfStats.cache?.hits).toBeGreaterThan(0);
      expect(perfStats.cache?.misses).toBeGreaterThan(0);
      expect(perfStats.cache?.hitRate).toBeGreaterThan(0);

      // Should have called auditor only for unique thoughts
      expect(mockAuditor.auditThought).toHaveBeenCalledTimes(2);

      // Add iterations to session
      for (const [index, thought] of [baseThought, modifiedThought].entries()) {
        await sessionManager.addIteration(sessionId, {
          thoughtNumber: thought.thoughtNumber,
          code: thought.thought,
          auditResult: mockReview,
          timestamp: Date.now() - index * 1000,
        });
      }

      // Verify session state
      const session = await sessionManager.getSession(sessionId);
      expect(session?.iterations?.length).toBe(2);
      expect(session?.currentLoop).toBe(2);
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide comprehensive performance statistics', async () => {
      const thought: GansAuditorCodexThoughtData = {
        thoughtNumber: 1,
        thought: `
          \`\`\`typescript
          function monitoringTest() {
            return "performance monitoring";
          }
          \`\`\`
        `,
      };

      // Perform some audits
      await auditEngine.auditAndWait(thought, 'monitoring-session');
      await auditEngine.auditAndWait(thought, 'monitoring-session'); // Cache hit

      // Get performance statistics
      const perfStats = auditEngine.getPerformanceStats();
      
      // Cache stats
      expect(perfStats.cache).toBeDefined();
      expect(perfStats.cache?.hits).toBeGreaterThanOrEqual(0);
      expect(perfStats.cache?.misses).toBeGreaterThanOrEqual(0);
      expect(perfStats.cache?.entries).toBeGreaterThanOrEqual(0);
      expect(perfStats.cache?.hitRate).toBeGreaterThanOrEqual(0);

      // Queue stats (if enabled)
      if (perfStats.queue) {
        expect(perfStats.queue.completed).toBeGreaterThanOrEqual(0);
        expect(perfStats.queue.failed).toBeGreaterThanOrEqual(0);
      }

      // Progress stats (if enabled)
      if (perfStats.progress) {
        expect(perfStats.progress.activeAudits).toBeGreaterThanOrEqual(0);
      }

      // Session memory stats
      const memoryStats = sessionManager.getMemoryStats();
      expect(memoryStats.totalMemoryUsage).toBeGreaterThanOrEqual(0);
      expect(memoryStats.activeSessions).toBeGreaterThanOrEqual(0);
    });

    it('should handle performance optimization cleanup', async () => {
      const thought: GansAuditorCodexThoughtData = {
        thoughtNumber: 1,
        thought: `
          \`\`\`typescript
          function cleanupTest() {
            return "cleanup test";
          }
          \`\`\`
        `,
      };

      // Perform audit to populate cache
      await auditEngine.auditAndWait(thought, 'cleanup-session');

      // Verify cache has entries
      const beforeStats = auditEngine.getPerformanceStats();
      expect(beforeStats.cache?.entries).toBeGreaterThan(0);

      // Clear cache
      auditEngine.clearCache();

      // Verify cache is cleared
      const afterStats = auditEngine.getPerformanceStats();
      expect(afterStats.cache?.entries).toBe(0);
    });
  });

  describe('Error Handling with Optimizations', () => {
    it('should handle audit failures gracefully with optimizations enabled', async () => {
      const failingAuditor = {
        auditThought: vi.fn().mockRejectedValue(new Error('Audit service failure')),
      } as any;

      const resilientEngine = new SynchronousAuditEngine({
        enabled: true,
        performance: {
          enableCaching: true,
          enableQueueManagement: true,
          queueConfig: {
            defaultMaxRetries: 1,
            processingInterval: 10,
          },
        },
      }, failingAuditor);

      try {
        const thought: GansAuditorCodexThoughtData = {
          thoughtNumber: 1,
          thought: `
            \`\`\`typescript
            function failingTest() {
              return "this will fail";
            }
            \`\`\`
          `,
        };

        const result = await resilientEngine.auditAndWait(thought, 'error-session');

        // Should return fallback result
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.review).toBeDefined(); // Fallback review

        // Should have attempted retries
        expect(failingAuditor.auditThought).toHaveBeenCalledTimes(2); // Initial + 1 retry
      } finally {
        resilientEngine.destroy();
      }
    });

    it('should handle memory pressure gracefully', async () => {
      const pressureManager = new MemoryEfficientSessionManager({
        stateDirectory: '.test-memory-pressure',
        maxMemoryUsage: 1000, // Very low limit
        maxIterationsInMemory: 2,
        enableMemoryMonitoring: false,
      });

      try {
        const sessionId = 'pressure-test-session';
        await pressureManager.getOrCreateSession(sessionId);

        // Add iterations that exceed memory limit
        for (let i = 1; i <= 10; i++) {
          const iteration = {
            thoughtNumber: i,
            code: 'x'.repeat(200), // Large code
            auditResult: mockReview,
            timestamp: Date.now(),
          };

          // Should not throw even under memory pressure
          await expect(pressureManager.addIteration(sessionId, iteration)).resolves.not.toThrow();
        }

        // Force cleanup
        await pressureManager.forceCleanup();

        // Should still have valid session
        const session = await pressureManager.getSession(sessionId);
        expect(session).toBeDefined();
      } finally {
        pressureManager.destroy();
      }
    });
  });
});