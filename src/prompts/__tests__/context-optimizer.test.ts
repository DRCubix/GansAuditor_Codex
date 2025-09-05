/**
 * Tests for Context Optimizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ContextOptimizer,
  ContextItemType,
  ContextPriority,
  type ContextItem,
  type ContextOptimizerConfig,
  DEFAULT_CONTEXT_OPTIMIZER_CONFIG,
} from '../context-optimizer.js';

describe('ContextOptimizer', () => {
  let optimizer: ContextOptimizer;
  let mockConfig: Partial<ContextOptimizerConfig>;

  beforeEach(() => {
    mockConfig = {
      maxContextSize: 1000,
      targetContextSize: 800,
      minRelevanceScore: 0.2,
      enableCompression: true,
      enableSummarization: true,
    };
    optimizer = new ContextOptimizer(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultOptimizer = new ContextOptimizer();
      expect(defaultOptimizer).toBeDefined();
    });

    it('should merge provided configuration with defaults', () => {
      const customConfig = { maxContextSize: 5000 };
      const customOptimizer = new ContextOptimizer(customConfig);
      expect(customOptimizer).toBeDefined();
    });
  });

  describe('optimizeContext', () => {
    it('should return context as-is when within target size', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'item1',
          content: 'Small content',
          type: ContextItemType.SYSTEM_PROMPT,
          relevanceScore: 0.8,
          size: 100,
          priority: ContextPriority.CRITICAL,
          source: 'test',
          metadata: {},
        },
      ];

      const result = await optimizer.optimizeContext(contextItems);

      expect(result.optimizedContext).toHaveLength(1);
      expect(result.totalSize).toBe(100);
      expect(result.originalSize).toBe(100);
      expect(result.compressionRatio).toBe(1);
      expect(result.removedItems).toHaveLength(0);
    });

    it('should filter items by relevance score', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'item1',
          content: 'High relevance content',
          type: ContextItemType.REQUIREMENTS,
          relevanceScore: 0.8, // Above default threshold of 0.2
          size: 200,
          priority: ContextPriority.HIGH,
          source: 'test',
          metadata: {},
        },
        {
          id: 'item2',
          content: 'Low relevance content',
          type: ContextItemType.DOCUMENTATION,
          relevanceScore: 0.05, // Below default threshold of 0.2
          size: 200,
          priority: ContextPriority.LOW,
          source: 'test',
          metadata: {},
        },
      ];

      // Test the filtering directly
      const filteredItems = (optimizer as any).filterByRelevance(contextItems);
      
      expect(filteredItems).toHaveLength(1);
      expect(filteredItems[0].id).toBe('item1');
    });

    it('should always include critical items regardless of relevance', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'critical',
          content: 'Critical content with low relevance',
          type: ContextItemType.SYSTEM_PROMPT,
          relevanceScore: 0.05, // Below threshold
          size: 200,
          priority: ContextPriority.CRITICAL,
          source: 'test',
          metadata: {},
        },
      ];

      const result = await optimizer.optimizeContext(contextItems);

      expect(result.optimizedContext).toHaveLength(1);
      expect(result.optimizedContext[0].id).toBe('critical');
      expect(result.removedItems).toHaveLength(0);
    });

    it('should remove items when exceeding target size', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'item1',
          content: 'A'.repeat(400),
          type: ContextItemType.REQUIREMENTS,
          relevanceScore: 0.9,
          size: 400,
          priority: ContextPriority.HIGH,
          source: 'test',
          metadata: {},
        },
        {
          id: 'item2',
          content: 'B'.repeat(400),
          type: ContextItemType.DESIGN,
          relevanceScore: 0.8,
          size: 400,
          priority: ContextPriority.MEDIUM,
          source: 'test',
          metadata: {},
        },
        {
          id: 'item3',
          content: 'C'.repeat(400),
          type: ContextItemType.DOCUMENTATION,
          relevanceScore: 0.7,
          size: 400,
          priority: ContextPriority.LOW,
          source: 'test',
          metadata: {},
        },
      ];

      const result = await optimizer.optimizeContext(contextItems);

      // Should fit within target size (800)
      expect(result.totalSize).toBeLessThanOrEqual(800);
      expect(result.removedItems.length).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThan(1);
    });

    it('should compress large items when compression is enabled', async () => {
      const largeContent = `
        function example() {
          // This is a comment
          const variable = "value";
          return variable;
        }
      `.repeat(50); // Make it large

      const contextItems: ContextItem[] = [
        {
          id: 'code',
          content: largeContent,
          type: ContextItemType.CODE,
          relevanceScore: 0.8,
          size: largeContent.length,
          priority: ContextPriority.MEDIUM,
          source: 'test',
          metadata: {},
        },
      ];

      const result = await optimizer.optimizeContext(contextItems);

      // Should be compressed
      expect(result.compressedItems.length).toBeGreaterThan(0);
      expect(result.totalSize).toBeLessThan(result.originalSize);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should calculate relevance score based on priority and type', () => {
      const item: ContextItem = {
        id: 'test',
        content: 'test content',
        type: ContextItemType.SYSTEM_PROMPT,
        relevanceScore: 0,
        size: 100,
        priority: ContextPriority.CRITICAL,
        source: 'test',
        metadata: {},
      };

      const score = optimizer.calculateRelevanceScore(item);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should increase score for query relevance', () => {
      const item: ContextItem = {
        id: 'test',
        content: 'This content contains important keywords',
        type: ContextItemType.DOCUMENTATION,
        relevanceScore: 0,
        size: 100,
        priority: ContextPriority.MEDIUM,
        source: 'test',
        metadata: {},
      };

      const scoreWithoutQuery = optimizer.calculateRelevanceScore(item);
      const scoreWithQuery = optimizer.calculateRelevanceScore(item, 'important keywords');

      expect(scoreWithQuery).toBeGreaterThan(scoreWithoutQuery);
    });
  });

  describe('compressItem', () => {
    it('should compress code content', async () => {
      const codeContent = `
        function example() {
          // This is a comment
          const variable = "value";
          /* Block comment */
          return variable;
        }
      `;

      const item: ContextItem = {
        id: 'code',
        content: codeContent,
        type: ContextItemType.CODE,
        relevanceScore: 0.8,
        size: codeContent.length,
        priority: ContextPriority.MEDIUM,
        source: 'test',
        metadata: {},
      };

      const compressed = await optimizer.compressItem(item);

      expect(compressed.size).toBeLessThan(item.size);
      expect(compressed.metadata.compressed).toBe(true);
      expect(compressed.metadata.originalSize).toBe(item.size);
      expect(compressed.content).not.toContain('// This is a comment');
      expect(compressed.content).not.toContain('/* Block comment */');
    });

    it('should compress documentation content', async () => {
      const docContent = `
        # Title
        
        This is **bold** text and *italic* text.
        
        - List item 1
        - List item 2
        
        More content here.
      `;

      const item: ContextItem = {
        id: 'doc',
        content: docContent,
        type: ContextItemType.DOCUMENTATION,
        relevanceScore: 0.7,
        size: docContent.length,
        priority: ContextPriority.MEDIUM,
        source: 'test',
        metadata: {},
      };

      const compressed = await optimizer.compressItem(item);

      expect(compressed.size).toBeLessThan(item.size);
      expect(compressed.content).not.toContain('**');
      expect(compressed.content).not.toContain('*');
      expect(compressed.content).not.toContain('#');
    });

    it('should compress session history content', async () => {
      const historyContent = `
        2023-01-01 10:00:00 INFO: Session started
        2023-01-01 10:01:00 DEBUG: Processing request
        2023-01-01 10:02:00 ERROR: Connection failed
        2023-01-01 10:03:00 INFO: Retrying connection
        2023-01-01 10:04:00 WARNING: High memory usage
        2023-01-01 10:05:00 INFO: Task completed
      `;

      const item: ContextItem = {
        id: 'history',
        content: historyContent,
        type: ContextItemType.SESSION_HISTORY,
        relevanceScore: 0.6,
        size: historyContent.length,
        priority: ContextPriority.LOW,
        source: 'test',
        metadata: {},
      };

      const compressed = await optimizer.compressItem(item);

      expect(compressed.size).toBeLessThan(item.size);
      // Should keep important log entries
      expect(compressed.content).toContain('ERROR');
      expect(compressed.content).toContain('WARNING');
      expect(compressed.content).toContain('completed');
    });
  });

  describe('priority and type weighting', () => {
    it('should prioritize critical items over others', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'critical',
          content: 'A'.repeat(500),
          type: ContextItemType.SYSTEM_PROMPT,
          relevanceScore: 0.5,
          size: 500,
          priority: ContextPriority.CRITICAL,
          source: 'test',
          metadata: {},
        },
        {
          id: 'low',
          content: 'B'.repeat(500),
          type: ContextItemType.DOCUMENTATION,
          relevanceScore: 0.9, // Higher relevance but lower priority
          size: 500,
          priority: ContextPriority.LOW,
          source: 'test',
          metadata: {},
        },
      ];

      const result = await optimizer.optimizeContext(contextItems);

      // Critical item should be kept even with lower relevance
      expect(result.optimizedContext.some(item => item.id === 'critical')).toBe(true);
    });

    it('should prioritize system prompt type over documentation', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'prompt',
          content: 'A'.repeat(400),
          type: ContextItemType.SYSTEM_PROMPT,
          relevanceScore: 0.5,
          size: 400,
          priority: ContextPriority.MEDIUM,
          source: 'test',
          metadata: {},
        },
        {
          id: 'doc',
          content: 'B'.repeat(400),
          type: ContextItemType.DOCUMENTATION,
          relevanceScore: 0.5,
          size: 400,
          priority: ContextPriority.MEDIUM,
          source: 'test',
          metadata: {},
        },
      ];

      const result = await optimizer.optimizeContext(contextItems);

      // System prompt should be prioritized
      if (result.optimizedContext.length === 1) {
        expect(result.optimizedContext[0].type).toBe(ContextItemType.SYSTEM_PROMPT);
      }
    });
  });

  describe('getStats', () => {
    it('should return optimization statistics', () => {
      const stats = optimizer.getStats();
      
      expect(stats).toHaveProperty('totalOptimizations');
      expect(stats).toHaveProperty('averageCompressionRatio');
      expect(stats).toHaveProperty('averageProcessingTime');
    });
  });
});