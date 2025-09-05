/**
 * Context Size Optimizer
 *
 * Implements intelligent context pruning and optimization for token limits,
 * with relevance-based filtering and context compression.
 *
 * Requirements: 10.2 - Context size optimization for token limits
 */
import { createComponentLogger } from '../utils/logger.js';
/**
 * Context item types
 */
export var ContextItemType;
(function (ContextItemType) {
    ContextItemType["SYSTEM_PROMPT"] = "system_prompt";
    ContextItemType["REQUIREMENTS"] = "requirements";
    ContextItemType["DESIGN"] = "design";
    ContextItemType["CODE"] = "code";
    ContextItemType["TESTS"] = "tests";
    ContextItemType["DOCUMENTATION"] = "documentation";
    ContextItemType["STEERING"] = "steering";
    ContextItemType["SESSION_HISTORY"] = "session_history";
    ContextItemType["ERROR_CONTEXT"] = "error_context";
    ContextItemType["METADATA"] = "metadata";
})(ContextItemType || (ContextItemType = {}));
/**
 * Context priority levels
 */
export var ContextPriority;
(function (ContextPriority) {
    ContextPriority["CRITICAL"] = "critical";
    ContextPriority["HIGH"] = "high";
    ContextPriority["MEDIUM"] = "medium";
    ContextPriority["LOW"] = "low";
    ContextPriority["OPTIONAL"] = "optional";
})(ContextPriority || (ContextPriority = {}));
/**
 * Default context optimizer configuration
 */
export const DEFAULT_CONTEXT_OPTIMIZER_CONFIG = {
    maxContextSize: 100000, // 100K characters
    targetContextSize: 80000, // 80K characters (20% headroom)
    minRelevanceScore: 0.1,
    enableCompression: true,
    enableSummarization: true,
    priorityWeights: {
        [ContextPriority.CRITICAL]: 1000,
        [ContextPriority.HIGH]: 100,
        [ContextPriority.MEDIUM]: 10,
        [ContextPriority.LOW]: 1,
        [ContextPriority.OPTIONAL]: 0.1,
    },
    typeWeights: {
        [ContextItemType.SYSTEM_PROMPT]: 1000,
        [ContextItemType.REQUIREMENTS]: 500,
        [ContextItemType.DESIGN]: 400,
        [ContextItemType.CODE]: 300,
        [ContextItemType.TESTS]: 200,
        [ContextItemType.STEERING]: 150,
        [ContextItemType.DOCUMENTATION]: 100,
        [ContextItemType.SESSION_HISTORY]: 50,
        [ContextItemType.ERROR_CONTEXT]: 75,
        [ContextItemType.METADATA]: 25,
    },
};
/**
 * Context Size Optimizer Implementation
 *
 * Provides intelligent context pruning, compression, and optimization
 * to fit within token limits while preserving the most relevant information.
 */
export class ContextOptimizer {
    config;
    componentLogger;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONTEXT_OPTIMIZER_CONFIG, ...config };
        this.componentLogger = createComponentLogger('context-optimizer');
        this.componentLogger.info('Context optimizer initialized', {
            maxContextSize: this.config.maxContextSize,
            targetContextSize: this.config.targetContextSize,
            enableCompression: this.config.enableCompression,
            enableSummarization: this.config.enableSummarization,
        });
    }
    /**
     * Optimize context to fit within size limits
     */
    async optimizeContext(contextItems) {
        const startTime = Date.now();
        const originalSize = this.calculateTotalSize(contextItems);
        this.componentLogger.debug('Starting context optimization', {
            itemCount: contextItems.length,
            originalSize,
            maxSize: this.config.maxContextSize,
            targetSize: this.config.targetContextSize,
        });
        // If already within target size, return as-is
        if (originalSize <= this.config.targetContextSize) {
            return this.createOptimizationResult(contextItems, [], [], originalSize, originalSize, Date.now() - startTime);
        }
        // Step 1: Filter by relevance score
        const relevantItems = this.filterByRelevance(contextItems);
        // Step 2: Sort by optimization score
        const sortedItems = this.sortByOptimizationScore(relevantItems);
        // Step 3: Apply compression if enabled
        const compressedItems = this.config.enableCompression
            ? await this.compressItems(sortedItems)
            : sortedItems;
        // Step 4: Select items to fit within target size
        const { selectedItems, removedItems } = this.selectItemsForTarget(compressedItems);
        // Step 5: Apply summarization if still too large
        const finalItems = this.config.enableSummarization && this.calculateTotalSize(selectedItems) > this.config.targetContextSize
            ? await this.summarizeItems(selectedItems)
            : selectedItems;
        const finalSize = this.calculateTotalSize(finalItems);
        const processingTime = Date.now() - startTime;
        const result = this.createOptimizationResult(finalItems, removedItems, compressedItems.filter(item => item.size < this.getOriginalSize(item, contextItems)), originalSize, finalSize, processingTime);
        this.componentLogger.info('Context optimization completed', {
            originalSize,
            finalSize,
            compressionRatio: result.compressionRatio,
            itemsRemoved: result.stats.itemsRemoved,
            itemsCompressed: result.stats.itemsCompressed,
            processingTime,
        });
        return result;
    }
    /**
     * Calculate relevance score for context item
     */
    calculateRelevanceScore(item, query, sessionContext) {
        let score = 0;
        // Base score from priority and type
        const priorityWeight = this.config.priorityWeights[item.priority] || 1;
        const typeWeight = this.config.typeWeights[item.type] || 1;
        score += (priorityWeight * typeWeight) / 10000; // Normalize to smaller base
        // Query relevance (if query provided)
        if (query) {
            const queryRelevance = this.calculateQueryRelevance(item.content, query);
            score += queryRelevance * 0.3;
        }
        // Session context relevance
        if (sessionContext) {
            const sessionRelevance = this.calculateSessionRelevance(item, sessionContext);
            score += sessionRelevance * 0.2;
        }
        // Recency bonus for session history
        if (item.type === ContextItemType.SESSION_HISTORY) {
            const recencyBonus = this.calculateRecencyBonus(item);
            score += recencyBonus * 0.1;
        }
        // Size penalty for very large items
        const sizePenalty = this.calculateSizePenalty(item);
        score -= sizePenalty * 0.1;
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Compress context item content
     */
    async compressItem(item) {
        let compressedContent = item.content;
        // Apply different compression strategies based on type
        switch (item.type) {
            case ContextItemType.CODE:
                compressedContent = this.compressCode(item.content);
                break;
            case ContextItemType.DOCUMENTATION:
                compressedContent = this.compressDocumentation(item.content);
                break;
            case ContextItemType.SESSION_HISTORY:
                compressedContent = this.compressSessionHistory(item.content);
                break;
            default:
                compressedContent = this.compressGeneric(item.content);
        }
        return {
            ...item,
            content: compressedContent,
            size: compressedContent.length,
            metadata: {
                ...item.metadata,
                compressed: true,
                originalSize: item.size,
                compressionRatio: compressedContent.length / item.size,
            },
        };
    }
    /**
     * Get optimization statistics
     */
    getStats() {
        // This would need to be tracked across optimizations
        return {
            totalOptimizations: 0,
            averageCompressionRatio: 0,
            averageProcessingTime: 0,
        };
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Calculate total size of context items
     */
    calculateTotalSize(items) {
        return items.reduce((total, item) => total + item.size, 0);
    }
    /**
     * Filter items by relevance score
     */
    filterByRelevance(items) {
        return items.filter(item => {
            // Always include critical items
            if (item.priority === ContextPriority.CRITICAL) {
                return true;
            }
            // Use provided relevance score, or calculate if not provided (0)
            const relevanceScore = item.relevanceScore > 0
                ? item.relevanceScore
                : this.calculateRelevanceScore(item);
            // Update item with calculated score if it was 0
            if (item.relevanceScore === 0) {
                item.relevanceScore = relevanceScore;
            }
            // Filter by relevance score
            return relevanceScore >= this.config.minRelevanceScore;
        });
    }
    /**
     * Sort items by optimization score (priority + relevance + type)
     */
    sortByOptimizationScore(items) {
        return [...items].sort((a, b) => {
            const scoreA = this.calculateOptimizationScore(a);
            const scoreB = this.calculateOptimizationScore(b);
            return scoreB - scoreA; // Descending order
        });
    }
    /**
     * Calculate optimization score for sorting
     */
    calculateOptimizationScore(item) {
        const priorityWeight = this.config.priorityWeights[item.priority] || 1;
        const typeWeight = this.config.typeWeights[item.type] || 1;
        const relevanceScore = item.relevanceScore;
        // Combine weights with relevance, normalize by size
        return (priorityWeight + typeWeight) * relevanceScore / Math.log(item.size + 1);
    }
    /**
     * Apply compression to items
     */
    async compressItems(items) {
        const compressedItems = [];
        for (const item of items) {
            // Only compress items that are not critical and above certain size
            if (item.priority !== ContextPriority.CRITICAL && item.size > 1000) {
                const compressed = await this.compressItem(item);
                compressedItems.push(compressed);
            }
            else {
                compressedItems.push(item);
            }
        }
        return compressedItems;
    }
    /**
     * Select items to fit within target size
     */
    selectItemsForTarget(items) {
        const selectedItems = [];
        const removedItems = [];
        let currentSize = 0;
        for (const item of items) {
            // Always include critical items
            if (item.priority === ContextPriority.CRITICAL) {
                selectedItems.push(item);
                currentSize += item.size;
                continue;
            }
            // Check if adding this item would exceed target
            if (currentSize + item.size <= this.config.targetContextSize) {
                selectedItems.push(item);
                currentSize += item.size;
            }
            else {
                removedItems.push(item);
            }
        }
        return { selectedItems, removedItems };
    }
    /**
     * Apply summarization to items if still too large
     */
    async summarizeItems(items) {
        const summarizedItems = [];
        for (const item of items) {
            // Only summarize non-critical items that are large
            if (item.priority !== ContextPriority.CRITICAL && item.size > 2000) {
                const summarized = await this.summarizeItem(item);
                summarizedItems.push(summarized);
            }
            else {
                summarizedItems.push(item);
            }
        }
        return summarizedItems;
    }
    /**
     * Summarize a single context item
     */
    async summarizeItem(item) {
        let summarizedContent;
        switch (item.type) {
            case ContextItemType.DOCUMENTATION:
                summarizedContent = this.summarizeDocumentation(item.content);
                break;
            case ContextItemType.SESSION_HISTORY:
                summarizedContent = this.summarizeSessionHistory(item.content);
                break;
            case ContextItemType.CODE:
                summarizedContent = this.summarizeCode(item.content);
                break;
            default:
                summarizedContent = this.summarizeGeneric(item.content);
        }
        return {
            ...item,
            content: summarizedContent,
            size: summarizedContent.length,
            metadata: {
                ...item.metadata,
                summarized: true,
                originalSize: item.size,
                summarizationRatio: summarizedContent.length / item.size,
            },
        };
    }
    /**
     * Calculate query relevance
     */
    calculateQueryRelevance(content, query) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const contentLower = content.toLowerCase();
        let matches = 0;
        for (const term of queryTerms) {
            if (contentLower.includes(term)) {
                matches++;
            }
        }
        return queryTerms.length > 0 ? matches / queryTerms.length : 0;
    }
    /**
     * Calculate session context relevance
     */
    calculateSessionRelevance(item, sessionContext) {
        // This would analyze the session context to determine relevance
        // For now, return a default score
        return 0.5;
    }
    /**
     * Calculate recency bonus for session history items
     */
    calculateRecencyBonus(item) {
        const timestamp = item.metadata.timestamp;
        if (!timestamp) {
            return 0;
        }
        const age = Date.now() - timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        return Math.max(0, 1 - (age / maxAge));
    }
    /**
     * Calculate size penalty for large items
     */
    calculateSizePenalty(item) {
        const maxSize = 10000; // 10K characters
        return item.size > maxSize ? (item.size - maxSize) / maxSize : 0;
    }
    /**
     * Compress code content
     */
    compressCode(content) {
        return content
            // Remove comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '')
            .replace(/#.*$/gm, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .replace(/\s*([{}();,])\s*/g, '$1')
            .trim();
    }
    /**
     * Compress documentation content
     */
    compressDocumentation(content) {
        return content
            // Remove markdown formatting
            .replace(/#{1,6}\s*/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            // Remove extra whitespace
            .replace(/\n\s*\n/g, '\n')
            .replace(/\s+/g, ' ')
            .trim();
    }
    /**
     * Compress session history content
     */
    compressSessionHistory(content) {
        // Keep only the most recent and relevant parts
        const lines = content.split('\n');
        const importantLines = lines.filter(line => line.toLowerCase().includes('error') ||
            line.toLowerCase().includes('warning') ||
            line.toLowerCase().includes('completed') ||
            line.toLowerCase().includes('failed'));
        return importantLines.slice(-20).join('\n'); // Keep last 20 important lines
    }
    /**
     * Compress generic content
     */
    compressGeneric(content) {
        return content
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }
    /**
     * Summarize documentation content
     */
    summarizeDocumentation(content) {
        // Extract key sections and bullet points
        const lines = content.split('\n');
        const keyLines = lines.filter(line => line.startsWith('#') ||
            line.startsWith('-') ||
            line.startsWith('*') ||
            line.includes('important') ||
            line.includes('note:') ||
            line.includes('warning:'));
        return keyLines.slice(0, 50).join('\n'); // Keep first 50 key lines
    }
    /**
     * Summarize session history content
     */
    summarizeSessionHistory(content) {
        // Extract key events and outcomes
        const lines = content.split('\n');
        const keyEvents = lines.filter(line => line.includes('started') ||
            line.includes('completed') ||
            line.includes('failed') ||
            line.includes('error') ||
            line.includes('warning'));
        return keyEvents.slice(-10).join('\n'); // Keep last 10 key events
    }
    /**
     * Summarize code content
     */
    summarizeCode(content) {
        // Extract function/class signatures and key comments
        const lines = content.split('\n');
        const keyLines = lines.filter(line => line.includes('function') ||
            line.includes('class') ||
            line.includes('interface') ||
            line.includes('export') ||
            line.includes('import') ||
            line.trim().startsWith('//'));
        return keyLines.join('\n');
    }
    /**
     * Summarize generic content
     */
    summarizeGeneric(content) {
        // Take first and last portions
        const maxLength = Math.floor(content.length * 0.3); // 30% of original
        const halfLength = Math.floor(maxLength / 2);
        const beginning = content.substring(0, halfLength);
        const ending = content.substring(content.length - halfLength);
        return `${beginning}\n...[content truncated]...\n${ending}`;
    }
    /**
     * Get original size of item before compression
     */
    getOriginalSize(item, originalItems) {
        const original = originalItems.find(orig => orig.id === item.id);
        return original?.size || item.size;
    }
    /**
     * Create optimization result
     */
    createOptimizationResult(optimizedItems, removedItems, compressedItems, originalSize, finalSize, processingTime) {
        return {
            optimizedContext: optimizedItems,
            totalSize: finalSize,
            originalSize,
            compressionRatio: originalSize > 0 ? finalSize / originalSize : 1,
            removedItems,
            compressedItems,
            stats: {
                itemsProcessed: optimizedItems.length + removedItems.length,
                itemsRemoved: removedItems.length,
                itemsCompressed: compressedItems.length,
                sizeReduction: originalSize - finalSize,
                processingTime,
            },
        };
    }
}
/**
 * Create context optimizer with default configuration
 */
export function createContextOptimizer(config = {}) {
    return new ContextOptimizer(config);
}
//# sourceMappingURL=context-optimizer.js.map