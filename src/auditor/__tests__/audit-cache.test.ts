/**
 * Tests for Audit Cache
 * 
 * Validates audit result caching functionality including cache hits/misses,
 * memory management, and automatic cleanup.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuditCache, type AuditCacheConfig } from '../audit-cache.js';
import type { GansAuditorCodexThoughtData, GansAuditorCodexReview } from '../../types/gan-types.js';

describe('AuditCache', () => {
  let cache: AuditCache;
  let mockThought: GansAuditorCodexThoughtData;
  let mockReview: GansAuditorCodexReview;

  beforeEach(() => {
    const config: Partial<AuditCacheConfig> = {
      maxEntries: 10,
      maxAge: 60000, // 1 minute
      maxMemoryUsage: 1024 * 1024, // 1MB
      cleanupInterval: 0, // Disable automatic cleanup for tests
      enableStats: true,
    };
    
    cache = new AuditCache(config);
    
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
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve audit results', async () => {
      // Initially should not have the result
      expect(await cache.get(mockThought)).toBeNull();
      expect(cache.has(mockThought)).toBe(false);

      // Store the result
      await cache.set(mockThought, mockReview);

      // Should now have the result
      expect(cache.has(mockThought)).toBe(true);
      const cachedResult = await cache.get(mockThought);
      expect(cachedResult).toEqual(mockReview);
    });

    it('should return null for non-existent entries', async () => {
      const result = await cache.get(mockThought);
      expect(result).toBeNull();
    });

    it('should clear all cache entries', async () => {
      await cache.set(mockThought, mockReview);
      expect(cache.has(mockThought)).toBe(true);

      cache.clear();
      expect(cache.has(mockThought)).toBe(false);
      expect(await cache.get(mockThought)).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      // Initial stats
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Cache miss
      await cache.get(mockThought);
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0);

      // Store and hit
      await cache.set(mockThought, mockReview);
      await cache.get(mockThought);
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should track memory usage', async () => {
      const initialStats = cache.getStats();
      expect(initialStats.memoryUsage).toBe(0);
      expect(initialStats.entries).toBe(0);

      await cache.set(mockThought, mockReview);
      
      const afterStats = cache.getStats();
      expect(afterStats.memoryUsage).toBeGreaterThan(0);
      expect(afterStats.entries).toBe(1);
    });
  });

  describe('Code Hash Generation', () => {
    it('should generate same hash for identical code', async () => {
      const thought1 = { ...mockThought };
      const thought2 = { ...mockThought };

      await cache.set(thought1, mockReview);
      expect(cache.has(thought2)).toBe(true);
    });

    it('should generate different hashes for different code', async () => {
      const thought1 = { ...mockThought };
      const thought2 = {
        ...mockThought,
        thought: `
          \`\`\`typescript
          function differentFunction() {
            return "Different code";
          }
          \`\`\`
        `,
      };

      await cache.set(thought1, mockReview);
      expect(cache.has(thought2)).toBe(false);
    });

    it('should normalize whitespace and comments', async () => {
      const thought1 = {
        ...mockThought,
        thought: `
          \`\`\`typescript
          function test() {
            // This is a comment
            return "hello";
          }
          \`\`\`
        `,
      };

      const thought2 = {
        ...mockThought,
        thought: `
          \`\`\`typescript
          function test(){
          return "hello";
          }
          \`\`\`
        `,
      };

      await cache.set(thought1, mockReview);
      // Should find cached result despite formatting differences
      expect(cache.has(thought2)).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should evict entries when memory limit is exceeded', async () => {
      const smallCache = new AuditCache({
        maxEntries: 100,
        maxMemoryUsage: 1000, // Very small limit
        cleanupInterval: 0,
      });

      try {
        // Add multiple entries to exceed memory limit
        for (let i = 0; i < 10; i++) {
          const thought = {
            thoughtNumber: i,
            thought: `\`\`\`typescript\nfunction test${i}() { return ${i}; }\n\`\`\``,
          };
          await smallCache.set(thought, mockReview);
        }

        const stats = smallCache.getStats();
        expect(stats.entries).toBeLessThan(10); // Some entries should be evicted
      } finally {
        smallCache.destroy();
      }
    });

    it('should evict entries when entry limit is exceeded', async () => {
      const limitedCache = new AuditCache({
        maxEntries: 3,
        maxMemoryUsage: 10 * 1024 * 1024, // Large memory limit
        cleanupInterval: 0,
      });

      try {
        // Add more entries than the limit
        for (let i = 0; i < 5; i++) {
          const thought = {
            thoughtNumber: i,
            thought: `\`\`\`typescript\nfunction test${i}() { return ${i}; }\n\`\`\``,
          };
          await limitedCache.set(thought, mockReview);
        }

        const stats = limitedCache.getStats();
        expect(stats.entries).toBeLessThanOrEqual(3);
      } finally {
        limitedCache.destroy();
      }
    });
  });

  describe('Cache Expiration', () => {
    it('should expire old entries', async () => {
      const shortLivedCache = new AuditCache({
        maxAge: 100, // 100ms
        cleanupInterval: 0,
      });

      try {
        await shortLivedCache.set(mockThought, mockReview);
        expect(shortLivedCache.has(mockThought)).toBe(true);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 150));

        expect(await shortLivedCache.get(mockThought)).toBeNull();
        expect(shortLivedCache.has(mockThought)).toBe(false);
      } finally {
        shortLivedCache.destroy();
      }
    });
  });

  describe('Cleanup Operations', () => {
    it('should manually trigger cleanup', async () => {
      // Add some entries
      for (let i = 0; i < 5; i++) {
        const thought = {
          thoughtNumber: i,
          thought: `\`\`\`typescript\nfunction test${i}() { return ${i}; }\n\`\`\``,
        };
        await cache.set(thought, mockReview);
      }

      const beforeStats = cache.getStats();
      expect(beforeStats.entries).toBe(5);

      await cache.cleanup();

      // Cleanup should maintain entries if they're not expired
      const afterStats = cache.getStats();
      expect(afterStats.entries).toBe(5);
    });

    it('should remove expired entries during cleanup', async () => {
      const shortLivedCache = new AuditCache({
        maxAge: 50, // 50ms
        cleanupInterval: 0,
      });

      try {
        await shortLivedCache.set(mockThought, mockReview);
        expect(shortLivedCache.getStats().entries).toBe(1);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 100));

        await shortLivedCache.cleanup();
        expect(shortLivedCache.getStats().entries).toBe(0);
      } finally {
        shortLivedCache.destroy();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid thought data gracefully', async () => {
      const invalidThought = {
        thoughtNumber: 1,
        thought: '', // Empty thought
      };

      // Should not throw
      await expect(cache.set(invalidThought, mockReview)).resolves.not.toThrow();
      expect(await cache.get(invalidThought)).toEqual(mockReview);
    });

    it('should handle malformed review data', async () => {
      const malformedReview = {
        ...mockReview,
        overall: NaN, // Invalid score
      };

      // Should not throw
      await expect(cache.set(mockThought, malformedReview)).resolves.not.toThrow();
    });
  });
});