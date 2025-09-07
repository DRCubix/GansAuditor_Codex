/**
 * Prompt Cache Manager
 * 
 * Integrates with existing AuditCache for prompt-specific result caching
 * with prompt-specific cache key generation and management.
 * 
 * Requirements: 10.3, 10.4, 10.5 - Performance optimizations and caching
 */

import crypto from 'crypto';
import { AuditCache, type AuditCacheConfig } from '../auditor/audit-cache.js';
import type { GansAuditorCodexReview } from '../types/gan-types.js';
import { logger, createComponentLogger } from '../utils/logger.js';

/**
 * Prompt execution context for caching
 */
export interface PromptCacheContext {
  /** System prompt template */
  promptTemplate: string;
  /** Workflow configuration */
  workflowConfig: any;
  /** Quality assessment configuration */
  qualityConfig: any;
  /** Code content being audited */
  codeContent: string;
  /** Session context */
  sessionContext?: any;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Cached prompt result
 */
export interface CachedPromptResult {
  /** Audit review result */
  review: GansAuditorCodexReview;
  /** Prompt execution metadata */
  executionMetadata: {
    /** Execution duration in milliseconds */
    duration: number;
    /** Timestamp when cached */
    cachedAt: number;
    /** Prompt template version */
    promptVersion: string;
    /** Workflow steps executed */
    workflowSteps: string[];
    /** Quality dimensions assessed */
    qualityDimensions: string[];
  };
  /** Cache metadata */
  cacheMetadata: {
    /** Cache key used */
    cacheKey: string;
    /** Hit count */
    hitCount: number;
    /** Last accessed timestamp */
    lastAccessed: number;
  };
}

/**
 * Prompt cache configuration
 */
export interface PromptCacheConfig extends AuditCacheConfig {
  /** Whether to include session context in cache key */
  includeSessionContext: boolean;
  /** Whether to include workflow config in cache key */
  includeWorkflowConfig: boolean;
  /** Whether to include quality config in cache key */
  includeQualityConfig: boolean;
  /** Cache key version for invalidation */
  cacheKeyVersion: string;
  /** Whether to enable prompt-specific metrics */
  enablePromptMetrics: boolean;
}

/**
 * Prompt cache statistics
 */
export interface PromptCacheStats {
  /** Total prompt cache hits */
  promptHits: number;
  /** Total prompt cache misses */
  promptMisses: number;
  /** Prompt-specific hit rate */
  promptHitRate: number;
  /** Average prompt execution time saved */
  averageTimeSaved: number;
  /** Total execution time saved */
  totalTimeSaved: number;
  /** Cache efficiency by prompt template */
  templateEfficiency: Record<string, {
    hits: number;
    misses: number;
    hitRate: number;
    averageTimeSaved: number;
  }>;
}

/**
 * Default prompt cache configuration
 */
export const DEFAULT_PROMPT_CACHE_CONFIG: PromptCacheConfig = {
  // Inherit from AuditCache defaults
  maxEntries: 500, // Smaller for prompt-specific cache
  maxAge: 12 * 60 * 60 * 1000, // 12 hours (shorter for prompts)
  maxMemoryUsage: 25 * 1024 * 1024, // 25MB
  cleanupInterval: 30 * 60 * 1000, // 30 minutes
  enableStats: true,
  
  // Prompt-specific settings
  includeSessionContext: false, // Usually too variable
  includeWorkflowConfig: true,
  includeQualityConfig: true,
  cacheKeyVersion: '1.0',
  enablePromptMetrics: true,
};

/**
 * Prompt Cache Manager Implementation
 * 
 * Provides prompt-specific caching with intelligent cache key generation
 * and integration with existing audit cache infrastructure.
 */
export class PromptCacheManager {
  private readonly auditCache: AuditCache;
  private readonly config: PromptCacheConfig;
  private readonly componentLogger: typeof logger;
  private readonly promptStats: PromptCacheStats;

  constructor(config: Partial<PromptCacheConfig> = {}) {
    this.config = { ...DEFAULT_PROMPT_CACHE_CONFIG, ...config };
    this.componentLogger = createComponentLogger('prompt-cache-manager');
    
    // Initialize underlying audit cache
    this.auditCache = new AuditCache(this.config);
    
    // Initialize prompt-specific statistics
    this.promptStats = {
      promptHits: 0,
      promptMisses: 0,
      promptHitRate: 0,
      averageTimeSaved: 0,
      totalTimeSaved: 0,
      templateEfficiency: {},
    };

    this.componentLogger.info('Prompt cache manager initialized', {
      maxEntries: this.config.maxEntries,
      maxAge: this.config.maxAge,
      includeSessionContext: this.config.includeSessionContext,
      includeWorkflowConfig: this.config.includeWorkflowConfig,
      cacheKeyVersion: this.config.cacheKeyVersion,
    });
  }

  /**
   * Get cached prompt result
   */
  async getCachedResult(context: PromptCacheContext): Promise<CachedPromptResult | null> {
    const startTime = Date.now();
    const cacheKey = this.generatePromptCacheKey(context);
    
    try {
      // Create a mock thought data for audit cache compatibility
      const mockThought = this.createMockThoughtData(context, cacheKey);
      
      const cachedReview = await this.auditCache.get(mockThought);
      if (!cachedReview) {
        this.recordPromptMiss(context.promptTemplate);
        return null;
      }

      // Extract cached result with metadata
      const cachedResult: CachedPromptResult = {
        review: cachedReview,
        executionMetadata: this.extractExecutionMetadata(cachedReview),
        cacheMetadata: {
          cacheKey,
          hitCount: 1, // Would need separate tracking
          lastAccessed: Date.now(),
        },
      };

      const accessTime = Date.now() - startTime;
      this.recordPromptHit(context.promptTemplate, accessTime);

      this.componentLogger.debug('Prompt cache hit', {
        cacheKey: cacheKey.substring(0, 16),
        promptTemplate: this.getTemplateIdentifier(context.promptTemplate),
        accessTime,
      });

      return cachedResult;

    } catch (error) {
      this.componentLogger.error('Error accessing prompt cache', error as Error, {
        cacheKey: cacheKey.substring(0, 16),
      });
      return null;
    }
  }

  /**
   * Cache prompt result
   */
  async cacheResult(
    context: PromptCacheContext, 
    result: GansAuditorCodexReview,
    executionDuration: number
  ): Promise<void> {
    const cacheKey = this.generatePromptCacheKey(context);
    
    try {
      // Enhance result with prompt-specific metadata
      const enhancedResult = this.enhanceResultWithMetadata(
        result, 
        context, 
        executionDuration
      );

      // Create mock thought data for audit cache compatibility
      const mockThought = this.createMockThoughtData(context, cacheKey);
      
      await this.auditCache.set(mockThought, enhancedResult);

      this.componentLogger.debug('Prompt result cached', {
        cacheKey: cacheKey.substring(0, 16),
        promptTemplate: this.getTemplateIdentifier(context.promptTemplate),
        executionDuration,
        resultSize: JSON.stringify(result).length,
      });

    } catch (error) {
      this.componentLogger.error('Error caching prompt result', error as Error, {
        cacheKey: cacheKey.substring(0, 16),
      });
    }
  }

  /**
   * Check if result exists in cache
   */
  async hasResult(context: PromptCacheContext): Promise<boolean> {
    const cacheKey = this.generatePromptCacheKey(context);
    const mockThought = this.createMockThoughtData(context, cacheKey);
    
    return this.auditCache.has(mockThought);
  }

  /**
   * Invalidate cache entries for specific prompt template
   */
  async invalidateTemplate(promptTemplate: string): Promise<number> {
    // This would require extending AuditCache to support pattern-based invalidation
    // For now, we'll clear the entire cache
    this.auditCache.clear();
    
    this.componentLogger.info('Cache invalidated for prompt template', {
      promptTemplate: this.getTemplateIdentifier(promptTemplate),
    });

    return 0; // Would return actual count if pattern-based invalidation was implemented
  }

  /**
   * Get prompt cache statistics
   */
  getPromptStats(): PromptCacheStats {
    this.updatePromptStats();
    return { ...this.promptStats };
  }

  /**
   * Get combined cache statistics
   */
  getCombinedStats(): {
    auditCache: any;
    promptCache: PromptCacheStats;
  } {
    return {
      auditCache: this.auditCache.getStats(),
      promptCache: this.getPromptStats(),
    };
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.auditCache.clear();
    
    // Reset prompt-specific stats
    this.promptStats.promptHits = 0;
    this.promptStats.promptMisses = 0;
    this.promptStats.totalTimeSaved = 0;
    this.promptStats.templateEfficiency = {};
    
    this.componentLogger.info('Prompt cache cleared');
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    await this.auditCache.cleanup();
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.auditCache.destroy();
    this.componentLogger.info('Prompt cache manager destroyed');
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Generate cache key for prompt context
   */
  private generatePromptCacheKey(context: PromptCacheContext): string {
    const keyComponents: any = {
      version: this.config.cacheKeyVersion,
      promptTemplate: this.hashContent(context.promptTemplate),
      codeContent: this.hashContent(context.codeContent),
    };

    // Include workflow config if enabled
    if (this.config.includeWorkflowConfig && context.workflowConfig) {
      keyComponents.workflowConfig = this.hashContent(JSON.stringify(context.workflowConfig));
    }

    // Include quality config if enabled
    if (this.config.includeQualityConfig && context.qualityConfig) {
      keyComponents.qualityConfig = this.hashContent(JSON.stringify(context.qualityConfig));
    }

    // Include session context if enabled
    if (this.config.includeSessionContext && context.sessionContext) {
      keyComponents.sessionContext = this.hashContent(JSON.stringify(context.sessionContext));
    }

    // Include metadata if present
    if (context.metadata) {
      keyComponents.metadata = this.hashContent(JSON.stringify(context.metadata));
    }

    const keyString = JSON.stringify(keyComponents);
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Hash content for cache key generation
   */
  private hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Create mock thought data for audit cache compatibility
   */
  private createMockThoughtData(context: PromptCacheContext, cacheKey: string): any {
    return {
      thoughtNumber: 1,
      thought: context.codeContent,
      metadata: {
        promptCacheKey: cacheKey,
        promptTemplate: this.getTemplateIdentifier(context.promptTemplate),
        isPromptCache: true,
      },
    };
  }

  /**
   * Get template identifier for logging
   */
  private getTemplateIdentifier(promptTemplate: string): string {
    // Extract first line or first 50 characters as identifier
    const firstLine = promptTemplate.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  }

  /**
   * Enhance result with prompt-specific metadata
   */
  private enhanceResultWithMetadata(
    result: GansAuditorCodexReview,
    context: PromptCacheContext,
    executionDuration: number
  ): GansAuditorCodexReview {
    return {
      ...result,
      prompt_metadata: {
        ...((result as any).prompt_metadata || {}),
        version: this.config.cacheKeyVersion.toString(),
        renderedAt: Date.now(),
        templatePath: this.getTemplateIdentifier(context.promptTemplate),
        variables: {
          duration: executionDuration,
          cachedAt: Date.now(),
          cacheVersion: this.config.cacheKeyVersion,
        },
      },
    };
  }

  /**
   * Extract execution metadata from cached result
   */
  private extractExecutionMetadata(result: GansAuditorCodexReview): any {
    const metadata = (result as any).metadata?.promptExecution;
    
    return {
      duration: metadata?.duration || 0,
      cachedAt: metadata?.cachedAt || Date.now(),
      promptVersion: metadata?.cacheVersion || 'unknown',
      workflowSteps: [], // Would need to be stored in metadata
      qualityDimensions: result.dimensions?.map(d => d.name) || [],
    };
  }

  /**
   * Record prompt cache hit
   */
  private recordPromptHit(promptTemplate: string, timeSaved: number): void {
    if (!this.config.enablePromptMetrics) {
      return;
    }

    this.promptStats.promptHits++;
    this.promptStats.totalTimeSaved += timeSaved;

    const templateId = this.getTemplateIdentifier(promptTemplate);
    if (!this.promptStats.templateEfficiency[templateId]) {
      this.promptStats.templateEfficiency[templateId] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageTimeSaved: 0,
      };
    }

    const templateStats = this.promptStats.templateEfficiency[templateId];
    templateStats.hits++;
    
    // Update rolling average
    const totalHits = templateStats.hits;
    templateStats.averageTimeSaved = 
      (templateStats.averageTimeSaved * (totalHits - 1) + timeSaved) / totalHits;
  }

  /**
   * Record prompt cache miss
   */
  private recordPromptMiss(promptTemplate: string): void {
    if (!this.config.enablePromptMetrics) {
      return;
    }

    this.promptStats.promptMisses++;

    const templateId = this.getTemplateIdentifier(promptTemplate);
    if (!this.promptStats.templateEfficiency[templateId]) {
      this.promptStats.templateEfficiency[templateId] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageTimeSaved: 0,
      };
    }

    this.promptStats.templateEfficiency[templateId].misses++;
  }

  /**
   * Update prompt statistics
   */
  private updatePromptStats(): void {
    const total = this.promptStats.promptHits + this.promptStats.promptMisses;
    this.promptStats.promptHitRate = total > 0 ? (this.promptStats.promptHits / total) * 100 : 0;
    
    this.promptStats.averageTimeSaved = this.promptStats.promptHits > 0 
      ? this.promptStats.totalTimeSaved / this.promptStats.promptHits 
      : 0;

    // Update template efficiency hit rates
    for (const templateStats of Object.values(this.promptStats.templateEfficiency)) {
      const templateTotal = templateStats.hits + templateStats.misses;
      templateStats.hitRate = templateTotal > 0 ? (templateStats.hits / templateTotal) * 100 : 0;
    }
  }
}

/**
 * Create prompt cache manager with default configuration
 */
export function createPromptCacheManager(
  config: Partial<PromptCacheConfig> = {}
): PromptCacheManager {
  return new PromptCacheManager(config);
}