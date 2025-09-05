/**
 * Context Size Optimizer
 *
 * Implements intelligent context pruning and optimization for token limits,
 * with relevance-based filtering and context compression.
 *
 * Requirements: 10.2 - Context size optimization for token limits
 */
/**
 * Context item with metadata
 */
export interface ContextItem {
    /** Unique identifier for the context item */
    id: string;
    /** Content of the context item */
    content: string;
    /** Type of context item */
    type: ContextItemType;
    /** Relevance score (0-1) */
    relevanceScore: number;
    /** Size in characters */
    size: number;
    /** Priority level */
    priority: ContextPriority;
    /** Source information */
    source: string;
    /** Metadata for optimization decisions */
    metadata: Record<string, any>;
}
/**
 * Context item types
 */
export declare enum ContextItemType {
    SYSTEM_PROMPT = "system_prompt",
    REQUIREMENTS = "requirements",
    DESIGN = "design",
    CODE = "code",
    TESTS = "tests",
    DOCUMENTATION = "documentation",
    STEERING = "steering",
    SESSION_HISTORY = "session_history",
    ERROR_CONTEXT = "error_context",
    METADATA = "metadata"
}
/**
 * Context priority levels
 */
export declare enum ContextPriority {
    CRITICAL = "critical",// Must be included
    HIGH = "high",// Should be included if possible
    MEDIUM = "medium",// Include if space allows
    LOW = "low",// Include only if abundant space
    OPTIONAL = "optional"
}
/**
 * Context optimization configuration
 */
export interface ContextOptimizerConfig {
    /** Maximum context size in characters */
    maxContextSize: number;
    /** Target context size (to leave headroom) */
    targetContextSize: number;
    /** Minimum relevance score to include */
    minRelevanceScore: number;
    /** Whether to enable context compression */
    enableCompression: boolean;
    /** Whether to enable intelligent summarization */
    enableSummarization: boolean;
    /** Priority weights for optimization */
    priorityWeights: Record<ContextPriority, number>;
    /** Type weights for optimization */
    typeWeights: Record<ContextItemType, number>;
}
/**
 * Context optimization result
 */
export interface OptimizationResult {
    /** Optimized context items */
    optimizedContext: ContextItem[];
    /** Total size after optimization */
    totalSize: number;
    /** Original size before optimization */
    originalSize: number;
    /** Compression ratio */
    compressionRatio: number;
    /** Items that were removed */
    removedItems: ContextItem[];
    /** Items that were compressed */
    compressedItems: ContextItem[];
    /** Optimization statistics */
    stats: OptimizationStats;
}
/**
 * Optimization statistics
 */
export interface OptimizationStats {
    /** Number of items processed */
    itemsProcessed: number;
    /** Number of items removed */
    itemsRemoved: number;
    /** Number of items compressed */
    itemsCompressed: number;
    /** Size reduction in characters */
    sizeReduction: number;
    /** Processing time in milliseconds */
    processingTime: number;
}
/**
 * Default context optimizer configuration
 */
export declare const DEFAULT_CONTEXT_OPTIMIZER_CONFIG: ContextOptimizerConfig;
/**
 * Context Size Optimizer Implementation
 *
 * Provides intelligent context pruning, compression, and optimization
 * to fit within token limits while preserving the most relevant information.
 */
export declare class ContextOptimizer {
    private readonly config;
    private readonly componentLogger;
    constructor(config?: Partial<ContextOptimizerConfig>);
    /**
     * Optimize context to fit within size limits
     */
    optimizeContext(contextItems: ContextItem[]): Promise<OptimizationResult>;
    /**
     * Calculate relevance score for context item
     */
    calculateRelevanceScore(item: ContextItem, query?: string, sessionContext?: any): number;
    /**
     * Compress context item content
     */
    compressItem(item: ContextItem): Promise<ContextItem>;
    /**
     * Get optimization statistics
     */
    getStats(): {
        totalOptimizations: number;
        averageCompressionRatio: number;
        averageProcessingTime: number;
    };
    /**
     * Calculate total size of context items
     */
    private calculateTotalSize;
    /**
     * Filter items by relevance score
     */
    private filterByRelevance;
    /**
     * Sort items by optimization score (priority + relevance + type)
     */
    private sortByOptimizationScore;
    /**
     * Calculate optimization score for sorting
     */
    private calculateOptimizationScore;
    /**
     * Apply compression to items
     */
    private compressItems;
    /**
     * Select items to fit within target size
     */
    private selectItemsForTarget;
    /**
     * Apply summarization to items if still too large
     */
    private summarizeItems;
    /**
     * Summarize a single context item
     */
    private summarizeItem;
    /**
     * Calculate query relevance
     */
    private calculateQueryRelevance;
    /**
     * Calculate session context relevance
     */
    private calculateSessionRelevance;
    /**
     * Calculate recency bonus for session history items
     */
    private calculateRecencyBonus;
    /**
     * Calculate size penalty for large items
     */
    private calculateSizePenalty;
    /**
     * Compress code content
     */
    private compressCode;
    /**
     * Compress documentation content
     */
    private compressDocumentation;
    /**
     * Compress session history content
     */
    private compressSessionHistory;
    /**
     * Compress generic content
     */
    private compressGeneric;
    /**
     * Summarize documentation content
     */
    private summarizeDocumentation;
    /**
     * Summarize session history content
     */
    private summarizeSessionHistory;
    /**
     * Summarize code content
     */
    private summarizeCode;
    /**
     * Summarize generic content
     */
    private summarizeGeneric;
    /**
     * Get original size of item before compression
     */
    private getOriginalSize;
    /**
     * Create optimization result
     */
    private createOptimizationResult;
}
/**
 * Create context optimizer with default configuration
 */
export declare function createContextOptimizer(config?: Partial<ContextOptimizerConfig>): ContextOptimizer;
//# sourceMappingURL=context-optimizer.d.ts.map