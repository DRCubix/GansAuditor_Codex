/**
 * Tests for Audit Queue
 * 
 * Validates concurrent audit limiting and queue management functionality
 * including priority handling, retry logic, and statistics tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuditQueue, type AuditQueueConfig } from '../audit-queue.js';
import type { GansAuditorCodexThoughtData, GansAuditorCodexReview } from '../../types/gan-types.js';

describe('AuditQueue', () => {
  let queue: AuditQueue;
  let mockAuditFunction: vi.MockedFunction<any>;
  let mockThought: GansAuditorCodexThoughtData;
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
        summary: 'Good implementation',
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 1,
      judge_cards: [{
        model: 'test-judge',
        score: 85,
        notes: 'Test review',
      }],
    };

    mockAuditFunction = vi.fn().mockResolvedValue(mockReview);

    const config: Partial<AuditQueueConfig> = {
      maxConcurrent: 2,
      maxQueueSize: 10,
      defaultTimeout: 1000, // 1 second for tests
      defaultMaxRetries: 1,
      processingInterval: 10, // 10ms for faster tests
      enableStats: true,
    };
    
    queue = new AuditQueue(mockAuditFunction, config);
    
    mockThought = {
      thoughtNumber: 1,
      thought: `
        \`\`\`typescript
        function testFunction() {
          return "Hello, World!";
        }
        \`\`\`
      `,
    };
  });

  afterEach(() => {
    queue.destroy();
  });

  describe('Basic Queue Operations', () => {
    it('should enqueue and process jobs', async () => {
      const result = await queue.enqueue(mockThought);
      
      expect(result).toEqual(mockReview);
      expect(mockAuditFunction).toHaveBeenCalledWith(mockThought, undefined);
    });

    it('should handle session ID parameter', async () => {
      const sessionId = 'test-session-123';
      const result = await queue.enqueue(mockThought, sessionId);
      
      expect(result).toEqual(mockReview);
      expect(mockAuditFunction).toHaveBeenCalledWith(mockThought, sessionId);
    });

    it('should process multiple jobs sequentially when under concurrency limit', async () => {
      const promises = [
        queue.enqueue({ ...mockThought, thoughtNumber: 1 }),
        queue.enqueue({ ...mockThought, thoughtNumber: 2 }),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(2);
      expect(mockAuditFunction).toHaveBeenCalledTimes(2);
    });

    it('should queue jobs when concurrency limit is reached', async () => {
      // Mock a slow audit function
      const slowAuditFunction = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockReview), 100))
      );
      
      const slowQueue = new AuditQueue(slowAuditFunction, {
        maxConcurrent: 1,
        processingInterval: 10,
      });

      try {
        const promises = [
          slowQueue.enqueue({ ...mockThought, thoughtNumber: 1 }),
          slowQueue.enqueue({ ...mockThought, thoughtNumber: 2 }),
          slowQueue.enqueue({ ...mockThought, thoughtNumber: 3 }),
        ];
        
        // Check queue status while jobs are running
        await new Promise(resolve => setTimeout(resolve, 20));
        const status = slowQueue.getStatus();
        expect(status.runningJobs).toBe(1);
        expect(status.pendingJobs).toBeGreaterThan(0);
        
        const results = await Promise.all(promises);
        expect(results).toHaveLength(3);
      } finally {
        slowQueue.destroy();
      }
    });
  });

  describe('Priority Handling', () => {
    it('should process high priority jobs first', async () => {
      const executionOrder: number[] = [];
      
      const trackingAuditFunction = vi.fn().mockImplementation((thought) => {
        executionOrder.push(thought.thoughtNumber);
        return Promise.resolve(mockReview);
      });
      
      const priorityQueue = new AuditQueue(trackingAuditFunction, {
        maxConcurrent: 1,
        processingInterval: 10,
      });

      try {
        // Enqueue jobs with different priorities
        const promises = [
          priorityQueue.enqueue({ ...mockThought, thoughtNumber: 1 }, undefined, { priority: 'low' }),
          priorityQueue.enqueue({ ...mockThought, thoughtNumber: 2 }, undefined, { priority: 'high' }),
          priorityQueue.enqueue({ ...mockThought, thoughtNumber: 3 }, undefined, { priority: 'normal' }),
        ];
        
        await Promise.all(promises);
        
        // High priority should be processed before low priority
        expect(executionOrder[0]).toBe(2); // High priority job
      } finally {
        priorityQueue.destroy();
      }
    });
  });

  describe('Error Handling and Retries', () => {
    it('should retry failed jobs', async () => {
      let callCount = 0;
      const flakyAuditFunction = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve(mockReview);
      });
      
      const retryQueue = new AuditQueue(flakyAuditFunction, {
        defaultMaxRetries: 2,
        processingInterval: 10,
      });

      try {
        const result = await retryQueue.enqueue(mockThought);
        
        expect(result).toEqual(mockReview);
        expect(flakyAuditFunction).toHaveBeenCalledTimes(2);
      } finally {
        retryQueue.destroy();
      }
    });

    it('should fail after max retries', async () => {
      const failingAuditFunction = vi.fn().mockRejectedValue(new Error('Persistent failure'));
      
      const failQueue = new AuditQueue(failingAuditFunction, {
        defaultMaxRetries: 1,
        processingInterval: 10,
      });

      try {
        await expect(failQueue.enqueue(mockThought)).rejects.toThrow('Persistent failure');
        expect(failingAuditFunction).toHaveBeenCalledTimes(2); // Initial + 1 retry
      } finally {
        failQueue.destroy();
      }
    });

    it('should handle timeout errors', async () => {
      const timeoutAuditFunction = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockReview), 2000))
      );
      
      const timeoutQueue = new AuditQueue(timeoutAuditFunction, {
        defaultTimeout: 100, // 100ms timeout
        processingInterval: 10,
      });

      try {
        await expect(timeoutQueue.enqueue(mockThought)).rejects.toThrow('timed out');
      } finally {
        timeoutQueue.destroy();
      }
    });
  });

  describe('Queue Management', () => {
    it('should reject jobs when queue is full', async () => {
      const fullQueue = new AuditQueue(mockAuditFunction, {
        maxQueueSize: 1,
        maxConcurrent: 0, // No processing to fill queue
      });

      try {
        // First job should be accepted
        const promise1 = fullQueue.enqueue({ ...mockThought, thoughtNumber: 1 });
        
        // Second job should be rejected
        await expect(fullQueue.enqueue({ ...mockThought, thoughtNumber: 2 }))
          .rejects.toThrow('Queue is full');
      } finally {
        fullQueue.destroy();
      }
    });

    it('should clear pending jobs', async () => {
      const slowAuditFunction = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockReview), 1000))
      );
      
      const clearQueue = new AuditQueue(slowAuditFunction, {
        maxConcurrent: 1,
        processingInterval: 10,
      });

      try {
        // Enqueue multiple jobs
        const promises = [
          clearQueue.enqueue({ ...mockThought, thoughtNumber: 1 }).catch(() => 'rejected'),
          clearQueue.enqueue({ ...mockThought, thoughtNumber: 2 }).catch(() => 'rejected'),
          clearQueue.enqueue({ ...mockThought, thoughtNumber: 3 }).catch(() => 'rejected'),
        ];
        
        // Wait a bit for jobs to be queued
        await new Promise(resolve => setTimeout(resolve, 20));
        
        clearQueue.clearQueue();
        
        // Wait for all promises to settle
        const results = await Promise.all(promises);
        const rejectedCount = results.filter(r => r === 'rejected').length;
        expect(rejectedCount).toBeGreaterThan(0);
      } finally {
        clearQueue.destroy();
      }
    });

    it('should pause and resume processing', async () => {
      const pauseQueue = new AuditQueue(mockAuditFunction, {
        maxConcurrent: 1,
        processingInterval: 10,
      });

      try {
        pauseQueue.pause();
        
        const promise = pauseQueue.enqueue(mockThought);
        
        // Wait a bit - job should not be processed while paused
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(mockAuditFunction).not.toHaveBeenCalled();
        
        pauseQueue.resume();
        
        const result = await promise;
        expect(result).toEqual(mockReview);
        expect(mockAuditFunction).toHaveBeenCalledTimes(1);
      } finally {
        pauseQueue.destroy();
      }
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track queue statistics', async () => {
      const initialStats = queue.getStats();
      expect(initialStats.pending).toBe(0);
      expect(initialStats.running).toBe(0);
      expect(initialStats.completed).toBe(0);
      expect(initialStats.failed).toBe(0);

      await queue.enqueue(mockThought);

      const finalStats = queue.getStats();
      expect(finalStats.completed).toBe(1);
    });

    it('should provide queue status', () => {
      const status = queue.getStatus();
      
      expect(status).toHaveProperty('isProcessing');
      expect(status).toHaveProperty('pendingJobs');
      expect(status).toHaveProperty('runningJobs');
      expect(status).toHaveProperty('capacity');
      expect(status).toHaveProperty('utilization');
      
      expect(typeof status.isProcessing).toBe('boolean');
      expect(typeof status.pendingJobs).toBe('number');
      expect(typeof status.runningJobs).toBe('number');
      expect(typeof status.capacity).toBe('number');
      expect(typeof status.utilization).toBe('number');
    });

    it('should calculate utilization correctly', async () => {
      const slowAuditFunction = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockReview), 100))
      );
      
      const utilizationQueue = new AuditQueue(slowAuditFunction, {
        maxConcurrent: 2,
        processingInterval: 10,
      });

      try {
        // Start jobs to fill capacity
        const promises = [
          utilizationQueue.enqueue({ ...mockThought, thoughtNumber: 1 }),
          utilizationQueue.enqueue({ ...mockThought, thoughtNumber: 2 }),
        ];
        
        // Wait for jobs to start
        await new Promise(resolve => setTimeout(resolve, 20));
        
        const status = utilizationQueue.getStatus();
        expect(status.utilization).toBe(100); // 2/2 = 100%
        
        await Promise.all(promises);
      } finally {
        utilizationQueue.destroy();
      }
    });
  });

  describe('Event Emission', () => {
    it('should emit job lifecycle events', async () => {
      const events: string[] = [];
      
      queue.on('jobEnqueued', () => events.push('enqueued'));
      queue.on('jobStarted', () => events.push('started'));
      queue.on('jobCompleted', () => events.push('completed'));
      
      await queue.enqueue(mockThought);
      
      expect(events).toContain('enqueued');
      expect(events).toContain('started');
      expect(events).toContain('completed');
    });

    it('should emit retry events', async () => {
      let callCount = 0;
      const flakyAuditFunction = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve(mockReview);
      });
      
      const retryQueue = new AuditQueue(flakyAuditFunction, {
        defaultMaxRetries: 2,
        processingInterval: 10,
      });

      const retryEvents: any[] = [];
      retryQueue.on('jobRetry', (job, error) => {
        retryEvents.push({ job: job.id, error: error.message });
      });

      try {
        await retryQueue.enqueue(mockThought);
        
        expect(retryEvents).toHaveLength(1);
        expect(retryEvents[0].error).toBe('Temporary failure');
      } finally {
        retryQueue.destroy();
      }
    });
  });

  describe('Custom Options', () => {
    it('should respect custom timeout', async () => {
      const slowAuditFunction = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockReview), 200))
      );
      
      const customQueue = new AuditQueue(slowAuditFunction, {
        processingInterval: 10,
      });

      try {
        await expect(customQueue.enqueue(mockThought, undefined, { timeout: 100 }))
          .rejects.toThrow('timed out');
      } finally {
        customQueue.destroy();
      }
    });

    it('should respect custom max retries', async () => {
      const failingAuditFunction = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      const customQueue = new AuditQueue(failingAuditFunction, {
        processingInterval: 10,
      });

      try {
        await expect(customQueue.enqueue(mockThought, undefined, { maxRetries: 3 }))
          .rejects.toThrow('Always fails');
        
        expect(failingAuditFunction).toHaveBeenCalledTimes(4); // Initial + 3 retries
      } finally {
        customQueue.destroy();
      }
    });
  });
});