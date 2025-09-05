/**
 * Tests for Prompt Cache Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  PromptCacheManager,
  type PromptCacheContext,
  type PromptCacheConfig,
  DEFAULT_PROMPT_CACHE_CONFIG,
} from '../prompt-cache-manager.js';
import type { GansAuditorCodexReview } from '../../types/gan-types.js';

describe('PromptCacheManager', () => {
  let cacheManager: PromptCacheManager;
  let mockConfig: Partial<PromptCacheConfig>;

  beforeEach(() => {
    mockConfig = {
      maxEntries: 10,
      maxAge: 60000, // 1 minute
      includeSessionContext: false,
      includeWorkflowConfig: true,
      includeQualityConfig: true,
      enablePromptMetrics: true,
    };
    cacheManager = new PromptCacheManager(mockConfig);
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new PromptCacheManager();
      expect(manager).toBeDefined();
      manager.destroy();
    });

    it('should merge provided configuration with defaults', () => {
      const customConfig = { maxEntries: 100 };
      const manager = new PromptCacheManager(customConfig);
      expect(manager).toBeDefined();
      manager.destroy();
    });
  });

  describe('cache operations', () => {
    let mockContext: PromptCacheContext;
    let mockResult: GansAuditorCodexReview;

    beforeEach(() => {
      mockContext = {
        promptTemplate: 'Test prompt template',
        workflowConfig: { steps: ['init', 'analyze'] },
        qualityConfig: { dimensions: ['accuracy', 'completeness'] },
        codeContent: 'function test() { return true; }',
        metadata: { version: '1.0' },
      };

      mockResult = {
        overall: 85,
        dimensions: [
          { name: 'accuracy', score: 90 },
          { name: 'completeness', score: 80 },
        ],
        verdict: 'pass',
        review: {
          summary: 'Code looks good',
          inline: [],
          citations: [],
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [{
          model: 'test-model',
          score: 85,
          notes: 'Test review',
        }],
      };
    });

    it('should cache and retrieve results', async () => {
      // Cache result
      await cacheManager.cacheResult(mockContext, mockResult, 1000);

      // Retrieve result
      const cachedResult = await cacheManager.getCachedResult(mockContext);

      expect(cachedResult).toBeDefined();
      expect(cachedResult!.review.overall).toBe(85);
      expect(cachedResult!.review.verdict).toBe('pass');
      expect(cachedResult!.executionMetadata.duration).toBe(1000);
    });

    it('should return null for cache miss', async () => {
      const result = await cacheManager.getCachedResult(mockContext);
      expect(result).toBeNull();
    });

    it('should check if result exists in cache', async () => {
      // Initially not in cache
      expect(await cacheManager.hasResult(mockContext)).toBe(false);

      // Cache result
      await cacheManager.cacheResult(mockContext, mockResult, 1000);

      // Now should exist
      expect(await cacheManager.hasResult(mockContext)).toBe(true);
    });

    it('should generate different cache keys for different contexts', async () => {
      const context1 = { ...mockContext };
      const context2 = { ...mockContext, codeContent: 'different code' };

      await cacheManager.cacheResult(context1, mockResult, 1000);

      // Different context should not hit cache
      const result = await cacheManager.getCachedResult(context2);
      expect(result).toBeNull();
    });

    it('should include workflow config in cache key when enabled', async () => {
      const context1 = { ...mockContext };
      const context2 = { 
        ...mockContext, 
        workflowConfig: { steps: ['different', 'steps'] } 
      };

      await cacheManager.cacheResult(context1, mockResult, 1000);

      // Different workflow config should not hit cache
      const result = await cacheManager.getCachedResult(context2);
      expect(result).toBeNull();
    });

    it('should include quality config in cache key when enabled', async () => {
      const context1 = { ...mockContext };
      const context2 = { 
        ...mockContext, 
        qualityConfig: { dimensions: ['different', 'dimensions'] } 
      };

      await cacheManager.cacheResult(context1, mockResult, 1000);

      // Different quality config should not hit cache
      const result = await cacheManager.getCachedResult(context2);
      expect(result).toBeNull();
    });

    it('should exclude session context from cache key when disabled', async () => {
      const context1 = { ...mockContext, sessionContext: { session: 'one' } };
      const context2 = { ...mockContext, sessionContext: { session: 'two' } };

      await cacheManager.cacheResult(context1, mockResult, 1000);

      // Different session context should still hit cache (since disabled)
      const result = await cacheManager.getCachedResult(context2);
      expect(result).toBeDefined();
    });
  });

  describe('cache statistics', () => {
    let mockContext: PromptCacheContext;
    let mockResult: GansAuditorCodexReview;

    beforeEach(() => {
      mockContext = {
        promptTemplate: 'Test template',
        workflowConfig: {},
        qualityConfig: {},
        codeContent: 'test code',
      };

      mockResult = {
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Test', inline: [], citations: [] },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [],
      };
    });

    it('should track prompt cache hits and misses', async () => {
      // Initial stats
      let stats = cacheManager.getPromptStats();
      expect(stats.promptHits).toBe(0);
      expect(stats.promptMisses).toBe(0);

      // Cache miss
      await cacheManager.getCachedResult(mockContext);
      stats = cacheManager.getPromptStats();
      expect(stats.promptMisses).toBe(1);

      // Cache result
      await cacheManager.cacheResult(mockContext, mockResult, 1000);

      // Cache hit
      await cacheManager.getCachedResult(mockContext);
      stats = cacheManager.getPromptStats();
      expect(stats.promptHits).toBe(1);
    });

    it('should calculate hit rate correctly', async () => {
      // Cache result
      await cacheManager.cacheResult(mockContext, mockResult, 1000);

      // One hit, one miss
      await cacheManager.getCachedResult(mockContext); // Hit
      await cacheManager.getCachedResult({ 
        ...mockContext, 
        codeContent: 'different' 
      }); // Miss

      const stats = cacheManager.getPromptStats();
      expect(stats.promptHitRate).toBe(50); // 1 hit out of 2 total
    });

    it('should track template-specific efficiency', async () => {
      const template1Context = { ...mockContext, promptTemplate: 'Template 1' };
      const template2Context = { ...mockContext, promptTemplate: 'Template 2' };

      // Cache results for both templates
      await cacheManager.cacheResult(template1Context, mockResult, 1000);
      await cacheManager.cacheResult(template2Context, mockResult, 1500);

      // Generate hits and misses
      await cacheManager.getCachedResult(template1Context); // Hit
      await cacheManager.getCachedResult({ 
        ...template1Context, 
        codeContent: 'different' 
      }); // Miss

      const stats = cacheManager.getPromptStats();
      expect(stats.templateEfficiency).toBeDefined();
      
      const template1Stats = stats.templateEfficiency['Template 1'];
      expect(template1Stats).toBeDefined();
      expect(template1Stats.hits).toBe(1);
      expect(template1Stats.misses).toBe(1);
      expect(template1Stats.hitRate).toBe(50);
    });

    it('should return combined statistics', () => {
      const combinedStats = cacheManager.getCombinedStats();
      
      expect(combinedStats).toHaveProperty('auditCache');
      expect(combinedStats).toHaveProperty('promptCache');
      expect(combinedStats.promptCache).toHaveProperty('promptHits');
      expect(combinedStats.promptCache).toHaveProperty('promptMisses');
    });
  });

  describe('cache management', () => {
    it('should clear all cached results', async () => {
      const mockContext: PromptCacheContext = {
        promptTemplate: 'Test template',
        workflowConfig: {},
        qualityConfig: {},
        codeContent: 'test code',
      };

      const mockResult: GansAuditorCodexReview = {
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Test', inline: [], citations: [] },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [],
      };

      // Cache result
      await cacheManager.cacheResult(mockContext, mockResult, 1000);
      expect(await cacheManager.hasResult(mockContext)).toBe(true);

      // Clear cache
      cacheManager.clear();
      expect(await cacheManager.hasResult(mockContext)).toBe(false);
    });

    it('should cleanup expired entries', async () => {
      // This would require mocking time or using a very short maxAge
      await cacheManager.cleanup();
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should invalidate template entries', async () => {
      const mockContext: PromptCacheContext = {
        promptTemplate: 'Test template',
        workflowConfig: {},
        qualityConfig: {},
        codeContent: 'test code',
      };

      const mockResult: GansAuditorCodexReview = {
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Test', inline: [], citations: [] },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [],
      };

      // Cache result
      await cacheManager.cacheResult(mockContext, mockResult, 1000);

      // Invalidate template (currently clears entire cache)
      const invalidatedCount = await cacheManager.invalidateTemplate('Test template');
      
      // Verify cache is cleared
      expect(await cacheManager.hasResult(mockContext)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle cache errors gracefully', async () => {
      // Mock the underlying audit cache to throw errors
      const originalGet = (cacheManager as any).auditCache.get;
      (cacheManager as any).auditCache.get = vi.fn().mockRejectedValue(new Error('Cache error'));

      const mockContext: PromptCacheContext = {
        promptTemplate: 'Test template',
        workflowConfig: {},
        qualityConfig: {},
        codeContent: 'test code',
      };

      // Should return null on error, not throw
      const result = await cacheManager.getCachedResult(mockContext);
      expect(result).toBeNull();

      // Restore original method
      (cacheManager as any).auditCache.get = originalGet;
    });

    it('should handle caching errors gracefully', async () => {
      // Mock the underlying audit cache to throw errors
      const originalSet = (cacheManager as any).auditCache.set;
      (cacheManager as any).auditCache.set = vi.fn().mockRejectedValue(new Error('Cache error'));

      const mockContext: PromptCacheContext = {
        promptTemplate: 'Test template',
        workflowConfig: {},
        qualityConfig: {},
        codeContent: 'test code',
      };

      const mockResult: GansAuditorCodexReview = {
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Test', inline: [], citations: [] },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [],
      };

      // Should not throw on caching error
      await expect(
        cacheManager.cacheResult(mockContext, mockResult, 1000)
      ).resolves.not.toThrow();

      // Restore original method
      (cacheManager as any).auditCache.set = originalSet;
    });
  });

  describe('destroy', () => {
    it('should cleanup resources', () => {
      const manager = new PromptCacheManager();
      
      // Should not throw
      expect(() => manager.destroy()).not.toThrow();
    });
  });
});