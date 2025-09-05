/**
 * Performance and Load Tests for System Prompt Architecture
 * 
 * Tests for prompt execution performance, concurrent audit handling,
 * resource usage and cleanup, and timeout handling and recovery.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemPromptManager } from '../prompts/system-prompt-manager.js';
import { SynchronousSessionManager } from '../session/synchronous-session-manager.js';
import { CodexJudge } from '../codex/codex-judge.js';
import { SynchronousAuditEngine } from '../auditor/synchronous-audit-engine.js';
import type {
  GansAuditorCodexThoughtData,
  GansAuditorCodexSessionState,
  GansAuditorCodexReview,
} from '../types/gan-types.js';

describe('System Prompt Performance Tests', () => {
  let systemPromptManager: SystemPromptManager;
  let sessionManager: SynchronousSessionManager;
  let codexJudge: CodexJudge;
  let auditEngine: SynchronousAuditEngine;

  let mockThought: GansAuditorCodexThoughtData;
  let mockSession: GansAuditorCodexSessionState;
  let mockReview: GansAuditorCodexReview;

  beforeEach(() => {
    systemPromptManager = new SystemPromptManager({
      enableCaching: true, // Enable caching for performance tests
      cacheMaxAge: 300000, // 5 minutes
    });

    sessionManager = new SynchronousSessionManager({
      stateDirectory: '.test-performance',
      enableCompression: true,
    });

    codexJudge = new CodexJudge({
      executable: 'echo',
      timeout: 5000,
    });

    auditEngine = new SynchronousAuditEngine({
      sessionManager,
      codexJudge,
      auditTimeout: 10000,
    });

    mockThought = {
      thought: 'Performance testing audit thought',
      thoughtNumber: 1,
      totalThoughts: 1,
      nextThoughtNeeded: false,
    };

    mockSession = {
      id: 'performance-test-session',
      currentLoop: 1,
      iterations: [],
      history: [],
      config: {},
      startTime: Date.now(),
      lastGan: null,
      stagnationInfo: null,
    };

    mockReview = {
      overall: 85,
      dimensions: [
        { name: 'Correctness & Completeness', score: 85 },
        { name: 'Tests', score: 80 },
        { name: 'Style & Conventions', score: 90 },
        { name: 'Security', score: 85 },
        { name: 'Performance', score: 80 },
        { name: 'Docs & Traceability', score: 85 },
      ],
      verdict: 'pass',
      review: {
        summary: 'Performance test review',
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 1,
      judge_cards: [],
    };
  });

  afterEach(async () => {
    systemPromptManager.clearCache();
    await sessionManager.cleanup();
    vi.clearAllMocks();
  });

  describe('prompt execution performance', () => {
    it('should render system prompt within acceptable time limits', async () => {
      const startTime = performance.now();
      
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(rendered.content).toBeDefined();
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
      expect(rendered.metadata.renderedAt).toBeGreaterThan(0);
    });

    it('should process audit responses efficiently', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      
      const startTime = performance.now();
      
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);
      
      const endTime = performance.now();
      const processTime = endTime - startTime;

      expect(result.enhancedResponse).toBeDefined();
      expect(result.completionAnalysis).toBeDefined();
      expect(result.nextActions).toBeDefined();
      expect(processTime).toBeLessThan(50); // Should process in under 50ms
    });

    it('should benefit from prompt caching', async () => {
      // First render (cache miss)
      const startTime1 = performance.now();
      const rendered1 = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const endTime1 = performance.now();
      const firstRenderTime = endTime1 - startTime1;

      // Second render (cache hit)
      const startTime2 = performance.now();
      const rendered2 = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const endTime2 = performance.now();
      const secondRenderTime = endTime2 - startTime2;

      // Cache hit should be significantly faster
      expect(secondRenderTime).toBeLessThan(firstRenderTime * 0.5);
      expect(rendered1.metadata.renderedAt).toBe(rendered2.metadata.renderedAt); // Same cached result
    });

    it('should handle large prompt templates efficiently', async () => {
      // Create a session with extensive context
      const largeSession: GansAuditorCodexSessionState = {
        ...mockSession,
        history: Array.from({ length: 50 }, (_, i) => ({
          thoughtNumber: i + 1,
          review: {
            verdict: 'revise' as const,
            summary: `Review ${i + 1}: ${Array(100).fill('detailed analysis').join(' ')}`,
            inline: Array.from({ length: 10 }, (_, j) => ({
              path: `src/file${j}.ts`,
              line: j * 10,
              comment: `Issue ${j}: ${Array(50).fill('detailed comment').join(' ')}`,
            })),
            citations: [],
          },
        })),
      };

      const startTime = performance.now();
      
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, largeSession);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(rendered.content).toBeDefined();
      expect(renderTime).toBeLessThan(500); // Should handle large context in under 500ms
    });

    it('should optimize memory usage during rendering', async () => {
      const initialMemory = process.memoryUsage();
      
      // Render multiple prompts
      const promises = Array.from({ length: 20 }, (_, i) =>
        systemPromptManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i + 1 },
          { ...mockSession, id: `session-${i}` }
        )
      );

      await Promise.all(promises);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('concurrent audit handling', () => {
    it('should handle multiple concurrent prompt renders', async () => {
      const concurrentCount = 10;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentCount }, (_, i) =>
        systemPromptManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i + 1 },
          { ...mockSession, id: `concurrent-session-${i}` }
        )
      );

      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(concurrentCount);
      expect(totalTime).toBeLessThan(1000); // Should complete all in under 1 second
      
      // Verify all results are valid
      results.forEach((result, i) => {
        expect(result.content).toBeDefined();
        expect(result.variables.SESSION_ID).toBe(`concurrent-session-${i}`);
      });
    });

    it('should handle concurrent audit response processing', async () => {
      const concurrentCount = 15;
      
      // Pre-render prompts
      const renderedPrompts = await Promise.all(
        Array.from({ length: concurrentCount }, (_, i) =>
          systemPromptManager.renderSystemPrompt(
            { ...mockThought, thoughtNumber: i + 1 },
            { ...mockSession, id: `process-session-${i}` }
          )
        )
      );

      const startTime = performance.now();

      const promises = renderedPrompts.map((rendered, i) =>
        systemPromptManager.processAuditResponse(
          { ...mockReview, overall: 80 + i },
          rendered,
          { ...mockSession, id: `process-session-${i}` }
        )
      );

      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(concurrentCount);
      expect(totalTime).toBeLessThan(500); // Should process all in under 500ms
      
      // Verify all results are valid
      results.forEach((result, i) => {
        expect(result.enhancedResponse).toBeDefined();
        expect(result.enhancedResponse.overall).toBe(80 + i);
      });
    });

    it('should maintain performance under high concurrent load', async () => {
      const highLoadCount = 50;
      const batchSize = 10;
      const batches = Math.ceil(highLoadCount / batchSize);

      const allResults = [];
      const startTime = performance.now();

      // Process in batches to avoid overwhelming the system
      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = Array.from({ length: batchSize }, (_, i) => {
          const index = batch * batchSize + i;
          if (index >= highLoadCount) return null;
          
          return systemPromptManager.renderSystemPrompt(
            { ...mockThought, thoughtNumber: index + 1 },
            { ...mockSession, id: `load-session-${index}` }
          );
        }).filter(Boolean);

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(allResults).toHaveLength(highLoadCount);
      expect(totalTime).toBeLessThan(5000); // Should complete high load in under 5 seconds
      
      // Verify performance didn't degrade significantly
      const averageTimePerRender = totalTime / highLoadCount;
      expect(averageTimePerRender).toBeLessThan(100); // Average under 100ms per render
    });

    it('should handle concurrent session operations', async () => {
      const sessionCount = 20;
      
      // Create multiple sessions concurrently
      const sessionPromises = Array.from({ length: sessionCount }, (_, i) =>
        sessionManager.createSession(`concurrent-session-${i}`, {
          auditTimeout: 5000,
          enableSystemPrompt: true,
        })
      );

      const sessions = await Promise.all(sessionPromises);
      expect(sessions).toHaveLength(sessionCount);

      // Update sessions concurrently
      const updatePromises = sessions.map((session, i) =>
        sessionManager.updateSession(session.id, {
          currentLoop: i + 1,
          lastGan: { ...mockReview, overall: 70 + i },
        })
      );

      await Promise.all(updatePromises);

      // Verify all sessions were updated correctly
      const retrievedSessions = await Promise.all(
        sessions.map(session => sessionManager.getSession(session.id))
      );

      retrievedSessions.forEach((session, i) => {
        expect(session?.currentLoop).toBe(i + 1);
        expect(session?.lastGan?.overall).toBe(70 + i);
      });
    });
  });

  describe('resource usage and cleanup', () => {
    it('should manage memory efficiently during extended operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        const rendered = await systemPromptManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i + 1 },
          { ...mockSession, id: `memory-session-${i}` }
        );
        
        systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);
        
        // Periodically clear cache to simulate real usage
        if (i % 20 === 0) {
          systemPromptManager.clearCache();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable even after many operations
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    it('should clean up cache efficiently', async () => {
      // Fill cache with entries
      const cacheEntries = 50;
      
      for (let i = 0; i < cacheEntries; i++) {
        await systemPromptManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i + 1 },
          { ...mockSession, id: `cache-session-${i}` }
        );
      }

      const statsBeforeCleanup = systemPromptManager.getCacheStats();
      expect(statsBeforeCleanup.size).toBeGreaterThan(0);

      const startTime = performance.now();
      systemPromptManager.clearCache();
      const endTime = performance.now();
      const cleanupTime = endTime - startTime;

      const statsAfterCleanup = systemPromptManager.getCacheStats();
      expect(statsAfterCleanup.size).toBe(0);
      expect(cleanupTime).toBeLessThan(10); // Should clear cache quickly
    });

    it('should handle session cleanup efficiently', async () => {
      // Create many sessions
      const sessionCount = 30;
      const sessions = [];

      for (let i = 0; i < sessionCount; i++) {
        const session = await sessionManager.createSession(`cleanup-session-${i}`, {});
        sessions.push(session);
        
        // Add some data to each session
        await sessionManager.updateSession(session.id, {
          currentLoop: i + 1,
          lastGan: mockReview,
        });
      }

      const startTime = performance.now();
      await sessionManager.cleanup();
      const endTime = performance.now();
      const cleanupTime = endTime - startTime;

      expect(cleanupTime).toBeLessThan(1000); // Should cleanup in under 1 second
    });

    it('should prevent memory leaks in long-running scenarios', async () => {
      const iterations = 200;
      const memorySnapshots = [];

      for (let i = 0; i < iterations; i++) {
        await systemPromptManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i + 1 },
          { ...mockSession, currentLoop: i + 1 }
        );

        // Take memory snapshot every 50 iterations
        if (i % 50 === 0) {
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }

        // Clear cache periodically to prevent unbounded growth
        if (i % 25 === 0) {
          systemPromptManager.clearCache();
        }
      }

      // Memory should not grow unboundedly
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = lastSnapshot - firstSnapshot;

      // Memory growth should be reasonable (less than 50MB over 200 iterations)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle resource cleanup after errors', async () => {
      const initialMemory = process.memoryUsage();

      // Cause some errors and verify cleanup still works
      for (let i = 0; i < 20; i++) {
        try {
          if (i % 3 === 0) {
            // Cause an error every third iteration
            const invalidManager = new SystemPromptManager({
              promptTemplatePath: '/nonexistent/template.md',
            });
            await invalidManager.renderSystemPrompt(mockThought);
          } else {
            await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
          }
        } catch (error) {
          // Expected errors
        }
      }

      // Cleanup should still work
      systemPromptManager.clearCache();
      await sessionManager.cleanup();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory should not leak significantly even with errors
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });
  });

  describe('timeout handling and recovery', () => {
    it('should handle prompt rendering timeouts gracefully', async () => {
      // Mock a slow template loading operation
      vi.spyOn(require('fs/promises'), 'readFile').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('# Test Template'), 2000))
      );

      const startTime = performance.now();
      
      try {
        await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      } catch (error) {
        // May timeout or succeed depending on implementation
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should not hang indefinitely
      expect(executionTime).toBeLessThan(5000);
    });

    it('should recover from temporary performance degradation', async () => {
      let slowOperationCount = 0;
      
      // Mock intermittent slow operations
      const originalRender = systemPromptManager.renderSystemPrompt;
      vi.spyOn(systemPromptManager, 'renderSystemPrompt').mockImplementation(async (...args) => {
        slowOperationCount++;
        if (slowOperationCount <= 3) {
          // Simulate slow operation for first 3 calls
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return originalRender.apply(systemPromptManager, args);
      });

      const renderTimes = [];

      // Perform multiple renders
      for (let i = 0; i < 6; i++) {
        const startTime = performance.now();
        
        await systemPromptManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i + 1 },
          { ...mockSession, currentLoop: i + 1 }
        );
        
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }

      // Later operations should be faster (recovery)
      const earlyAverage = renderTimes.slice(0, 3).reduce((a, b) => a + b) / 3;
      const laterAverage = renderTimes.slice(3).reduce((a, b) => a + b) / 3;
      
      expect(laterAverage).toBeLessThan(earlyAverage * 0.8); // Should recover performance
    });

    it('should handle session operation timeouts', async () => {
      // Mock slow session operations
      vi.spyOn(sessionManager, 'updateSession').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const session = await sessionManager.createSession('timeout-session', {});
      
      const startTime = performance.now();
      
      try {
        await sessionManager.updateSession(session.id, { currentLoop: 1 });
      } catch (error) {
        // May timeout depending on implementation
      }
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;

      // Should complete or timeout within reasonable time
      expect(operationTime).toBeGreaterThan(900); // Should wait for the mock delay
      expect(operationTime).toBeLessThan(2000); // But not hang indefinitely
    });

    it('should maintain performance under timeout pressure', async () => {
      const operations = 20;
      const timeouts = [];

      // Perform operations with varying delays
      for (let i = 0; i < operations; i++) {
        const delay = Math.random() * 100; // Random delay up to 100ms
        
        const startTime = performance.now();
        
        // Simulate operation with potential delay
        await new Promise(resolve => setTimeout(resolve, delay));
        await systemPromptManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i + 1 },
          { ...mockSession, currentLoop: i + 1 }
        );
        
        const endTime = performance.now();
        timeouts.push(endTime - startTime);
      }

      // Most operations should complete quickly despite some delays
      const fastOperations = timeouts.filter(time => time < 150).length;
      expect(fastOperations).toBeGreaterThan(operations * 0.7); // At least 70% should be fast
    });

    it('should handle cascading timeout scenarios', async () => {
      // Simulate cascading timeouts in different components
      const components = [
        () => systemPromptManager.renderSystemPrompt(mockThought, mockSession),
        () => sessionManager.createSession('cascade-session', {}),
        () => systemPromptManager.processAuditResponse(mockReview, {} as any, mockSession),
      ];

      const results = [];
      
      for (const component of components) {
        const startTime = performance.now();
        
        try {
          await component();
          results.push({ success: true, time: performance.now() - startTime });
        } catch (error) {
          results.push({ success: false, time: performance.now() - startTime });
        }
      }

      // At least some components should succeed even if others timeout
      const successfulOperations = results.filter(r => r.success).length;
      expect(successfulOperations).toBeGreaterThan(0);
      
      // No operation should hang indefinitely
      results.forEach(result => {
        expect(result.time).toBeLessThan(5000);
      });
    });
  });

  describe('scalability and stress testing', () => {
    it('should maintain performance with large prompt contexts', async () => {
      // Create a very large context
      const largeContext = {
        steering: Array(1000).fill('Detailed steering rule with comprehensive guidelines').join('\n'),
        spec: Array(500).fill('Detailed specification requirement with acceptance criteria').join('\n'),
        repository: Array(200).fill('Repository context with file information and structure').join('\n'),
      };

      const startTime = performance.now();
      
      const rendered = await systemPromptManager.renderSystemPrompt(
        mockThought,
        mockSession,
        largeContext
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(rendered.content).toBeDefined();
      expect(renderTime).toBeLessThan(1000); // Should handle large context in under 1 second
      expect(rendered.content.length).toBeGreaterThan(10000); // Should include the large context
    });

    it('should handle stress test with rapid successive operations', async () => {
      const rapidOperations = 100;
      const operationTimes = [];

      for (let i = 0; i < rapidOperations; i++) {
        const startTime = performance.now();
        
        await systemPromptManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i + 1 },
          { ...mockSession, currentLoop: i + 1 }
        );
        
        const endTime = performance.now();
        operationTimes.push(endTime - startTime);
      }

      // Performance should remain consistent
      const averageTime = operationTimes.reduce((a, b) => a + b) / operationTimes.length;
      const maxTime = Math.max(...operationTimes);
      
      expect(averageTime).toBeLessThan(50); // Average should be under 50ms
      expect(maxTime).toBeLessThan(200); // No single operation should take over 200ms
    });

    it('should scale with increasing session complexity', async () => {
      const complexityLevels = [10, 50, 100, 200];
      const performanceResults = [];

      for (const complexity of complexityLevels) {
        // Create session with increasing complexity
        const complexSession: GansAuditorCodexSessionState = {
          ...mockSession,
          id: `complex-session-${complexity}`,
          history: Array.from({ length: complexity }, (_, i) => ({
            thoughtNumber: i + 1,
            review: {
              verdict: 'revise' as const,
              summary: `Review ${i + 1}`,
              inline: Array.from({ length: Math.min(i, 20) }, (_, j) => ({
                path: `src/file${j}.ts`,
                line: j * 10,
                comment: `Issue ${j}`,
              })),
              citations: [],
            },
          })),
        };

        const startTime = performance.now();
        
        await systemPromptManager.renderSystemPrompt(mockThought, complexSession);
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        performanceResults.push({ complexity, time: renderTime });
      }

      // Performance should scale reasonably with complexity
      const timeIncrease = performanceResults[3].time / performanceResults[0].time;
      expect(timeIncrease).toBeLessThan(10); // Should not be more than 10x slower for 20x complexity
    });
  });
});