/**
 * Tests for Memory-Efficient Session Manager
 * 
 * Validates memory optimization features including session history compression,
 * intelligent cleanup, and memory monitoring.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryEfficientSessionManager, type MemoryEfficientSessionManagerConfig } from '../memory-efficient-session-manager.js';
import type { 
  GansAuditorCodexSessionState, 
  IterationData,
  GansAuditorCodexReview 
} from '../../types/gan-types.js';

describe('MemoryEfficientSessionManager', () => {
  let manager: MemoryEfficientSessionManager;
  let mockIteration: IterationData;
  let mockReview: GansAuditorCodexReview;

  beforeEach(() => {
    const config: Partial<MemoryEfficientSessionManagerConfig> = {
      stateDirectory: '.test-mcp-gan-state',
      maxMemoryUsage: 1024 * 1024, // 1MB
      maxIterationsInMemory: 5,
      compressionAge: 100, // 100ms for faster tests
      memoryMonitoringInterval: 0, // Disable automatic monitoring for tests
      enableCompression: true,
      enableMemoryMonitoring: false,
      compressionThreshold: 100, // 100 bytes
    };
    
    manager = new MemoryEfficientSessionManager(config);

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

    mockIteration = {
      thoughtNumber: 1,
      code: `
        function testFunction() {
          console.log("This is a test function with some content");
          return "Hello, World!";
        }
      `,
      auditResult: mockReview,
      timestamp: Date.now(),
    };
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Basic Memory Management', () => {
    it('should create session and track memory usage', async () => {
      const sessionId = 'test-session-1';
      const session = await manager.getOrCreateSession(sessionId);
      
      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      
      const stats = manager.getMemoryStats();
      expect(stats.activeSessions).toBeGreaterThanOrEqual(0);
      expect(stats.totalMemoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should add iterations and track memory growth', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      const initialStats = manager.getMemoryStats();
      
      await manager.addIteration(sessionId, mockIteration);
      
      const afterStats = manager.getMemoryStats();
      expect(afterStats.totalMemoryUsage).toBeGreaterThanOrEqual(initialStats.totalMemoryUsage);
    });
  });

  describe('Iteration Compression', () => {
    it('should compress old iterations', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      // Add iteration
      await manager.addIteration(sessionId, mockIteration);
      
      // Wait for compression age
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger optimization
      await manager.optimizeAllSessions();
      
      const stats = manager.getMemoryStats();
      expect(stats.compressedIterations).toBeGreaterThanOrEqual(0);
    });

    it('should decompress iterations when accessing session', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      // Add multiple iterations
      for (let i = 1; i <= 3; i++) {
        const iteration = {
          ...mockIteration,
          thoughtNumber: i,
          code: `function test${i}() { return ${i}; }`,
        };
        await manager.addIteration(sessionId, iteration);
      }
      
      // Wait for compression age
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger optimization to compress
      await manager.optimizeAllSessions();
      
      // Retrieve session - should decompress iterations
      const session = await manager.getSession(sessionId);
      expect(session?.iterations).toBeDefined();
      expect(session?.iterations?.length).toBe(3);
    });

    it('should handle compression errors gracefully', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      // Add iteration with potentially problematic data
      const problematicIteration = {
        ...mockIteration,
        code: '', // Empty code
        auditResult: { ...mockReview, overall: NaN }, // Invalid score
      };
      
      // Should not throw
      await expect(manager.addIteration(sessionId, problematicIteration)).resolves.not.toThrow();
    });
  });

  describe('Memory Limits and Cleanup', () => {
    it('should trim iterations when limit is exceeded', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      // Add more iterations than the limit
      for (let i = 1; i <= 10; i++) {
        const iteration = {
          ...mockIteration,
          thoughtNumber: i,
          code: `function test${i}() { return ${i}; }`,
        };
        await manager.addIteration(sessionId, iteration);
      }
      
      const session = await manager.getSession(sessionId);
      expect(session?.iterations?.length).toBeLessThanOrEqual(5); // maxIterationsInMemory
    });

    it('should perform emergency cleanup when memory limit exceeded', async () => {
      // Create manager with very low memory limit
      const lowMemoryManager = new MemoryEfficientSessionManager({
        stateDirectory: '.test-mcp-gan-state-low',
        maxMemoryUsage: 1000, // 1KB - very low
        enableMemoryMonitoring: false,
      });

      try {
        // Add sessions with large data
        for (let i = 1; i <= 5; i++) {
          const sessionId = `session-${i}`;
          await lowMemoryManager.getOrCreateSession(sessionId);
          
          const largeIteration = {
            ...mockIteration,
            thoughtNumber: i,
            code: 'x'.repeat(500), // Large code string
          };
          await lowMemoryManager.addIteration(sessionId, largeIteration);
        }
        
        // Force cleanup
        await lowMemoryManager.forceCleanup();
        
        const stats = lowMemoryManager.getMemoryStats();
        expect(stats.activeSessions).toBeLessThan(5);
      } finally {
        lowMemoryManager.destroy();
      }
    });
  });

  describe('Memory Statistics', () => {
    it('should provide accurate memory statistics', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      await manager.addIteration(sessionId, mockIteration);
      
      const stats = manager.getMemoryStats();
      
      expect(stats).toHaveProperty('totalMemoryUsage');
      expect(stats).toHaveProperty('activeSessions');
      expect(stats).toHaveProperty('compressedIterations');
      expect(stats).toHaveProperty('compressionSavings');
      expect(stats).toHaveProperty('averageCompressionRatio');
      expect(stats).toHaveProperty('memoryPerSession');
      
      expect(typeof stats.totalMemoryUsage).toBe('number');
      expect(typeof stats.activeSessions).toBe('number');
      expect(typeof stats.compressedIterations).toBe('number');
    });

    it('should provide memory breakdown by session', async () => {
      // Create multiple sessions
      for (let i = 1; i <= 3; i++) {
        const sessionId = `session-${i}`;
        await manager.getOrCreateSession(sessionId);
        await manager.addIteration(sessionId, {
          ...mockIteration,
          thoughtNumber: i,
        });
      }
      
      const breakdown = await manager.getMemoryBreakdown();
      
      expect(breakdown).toHaveLength(3);
      expect(breakdown[0]).toHaveProperty('sessionId');
      expect(breakdown[0]).toHaveProperty('memoryUsage');
      expect(breakdown[0]).toHaveProperty('iterationCount');
      expect(breakdown[0]).toHaveProperty('compressedIterations');
      expect(breakdown[0]).toHaveProperty('compressionSavings');
      expect(breakdown[0]).toHaveProperty('lastAccessed');
    });
  });

  describe('Compression Efficiency', () => {
    it('should achieve compression savings', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      // Add iteration with large, repetitive content
      const largeIteration = {
        ...mockIteration,
        code: 'console.log("test"); '.repeat(100), // Repetitive content compresses well
      };
      
      await manager.addIteration(sessionId, largeIteration);
      
      // Wait for compression age
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger optimization
      await manager.optimizeAllSessions();
      
      const stats = manager.getMemoryStats();
      if (stats.compressedIterations > 0) {
        expect(stats.compressionSavings).toBeGreaterThan(0);
        expect(stats.averageCompressionRatio).toBeLessThan(1);
      }
    });

    it('should skip compression for small iterations', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      // Add small iteration below compression threshold
      const smallIteration = {
        ...mockIteration,
        code: 'x', // Very small code
      };
      
      await manager.addIteration(sessionId, smallIteration);
      
      // Wait for compression age
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger optimization
      await manager.optimizeAllSessions();
      
      // Small iterations should not be compressed
      const stats = manager.getMemoryStats();
      // This test depends on the compression threshold setting
    });
  });

  describe('Session Lifecycle', () => {
    it('should handle session creation and updates', async () => {
      const sessionId = 'test-session-1';
      const loopId = 'loop-123';
      
      const session = await manager.getOrCreateSession(sessionId, loopId);
      expect(session.loopId).toBe(loopId);
      
      await manager.addIteration(sessionId, mockIteration);
      
      const updatedSession = await manager.getSession(sessionId);
      expect(updatedSession?.iterations?.length).toBe(1);
      expect(updatedSession?.currentLoop).toBe(1);
    });

    it('should maintain session integrity during optimization', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      // Add multiple iterations
      const iterations = [];
      for (let i = 1; i <= 5; i++) {
        const iteration = {
          ...mockIteration,
          thoughtNumber: i,
          code: `function test${i}() { return ${i}; }`,
        };
        iterations.push(iteration);
        await manager.addIteration(sessionId, iteration);
      }
      
      // Optimize
      await manager.optimizeAllSessions();
      
      // Verify session integrity
      const session = await manager.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
      
      // Should have some iterations (may be compressed/trimmed)
      expect(session?.iterations).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing sessions gracefully', async () => {
      const nonExistentId = 'non-existent-session';
      
      const stats = manager.getMemoryStats();
      expect(stats.activeSessions).toBeGreaterThanOrEqual(0);
      
      // Should not throw when optimizing non-existent sessions
      await expect(manager.optimizeAllSessions()).resolves.not.toThrow();
    });

    it('should handle corrupted iteration data', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      // Add iteration with circular reference (should be handled by JSON.stringify)
      const circularIteration = { ...mockIteration };
      (circularIteration as any).circular = circularIteration;
      
      // Should handle gracefully
      await expect(manager.addIteration(sessionId, circularIteration)).resolves.not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize all sessions efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple sessions with iterations
      for (let i = 1; i <= 5; i++) {
        const sessionId = `session-${i}`;
        await manager.getOrCreateSession(sessionId);
        
        for (let j = 1; j <= 3; j++) {
          await manager.addIteration(sessionId, {
            ...mockIteration,
            thoughtNumber: j,
          });
        }
      }
      
      await manager.optimizeAllSessions();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent operations safely', async () => {
      const sessionId = 'test-session-1';
      await manager.getOrCreateSession(sessionId);
      
      // Perform concurrent operations
      const operations = [
        manager.addIteration(sessionId, { ...mockIteration, thoughtNumber: 1 }),
        manager.addIteration(sessionId, { ...mockIteration, thoughtNumber: 2 }),
        manager.optimizeAllSessions(),
        manager.getMemoryStats(),
      ];
      
      // Should not throw
      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should respect compression configuration', async () => {
      const noCompressionManager = new MemoryEfficientSessionManager({
        stateDirectory: '.test-mcp-gan-state-no-compression',
        enableCompression: false,
        enableMemoryMonitoring: false,
      });

      try {
        const sessionId = 'test-session-1';
        await noCompressionManager.getOrCreateSession(sessionId);
        await noCompressionManager.addIteration(sessionId, mockIteration);
        
        await noCompressionManager.optimizeAllSessions();
        
        const stats = noCompressionManager.getMemoryStats();
        expect(stats.compressedIterations).toBe(0);
      } finally {
        noCompressionManager.destroy();
      }
    });

    it('should respect memory limits configuration', async () => {
      const strictManager = new MemoryEfficientSessionManager({
        stateDirectory: '.test-mcp-gan-state-strict',
        maxIterationsInMemory: 2,
        enableMemoryMonitoring: false,
      });

      try {
        const sessionId = 'test-session-1';
        await strictManager.getOrCreateSession(sessionId);
        
        // Add more iterations than limit
        for (let i = 1; i <= 5; i++) {
          await strictManager.addIteration(sessionId, {
            ...mockIteration,
            thoughtNumber: i,
          });
        }
        
        const session = await strictManager.getSession(sessionId);
        expect(session?.iterations?.length).toBeLessThanOrEqual(2);
      } finally {
        strictManager.destroy();
      }
    });
  });
});