/**
 * Loop Detection and Stagnation Prevention for Synchronous Audit Workflow
 *
 * This module implements sophisticated loop detection and stagnation prevention
 * mechanisms to identify when an LLM is not making meaningful progress in the
 * iterative improvement cycle.
 *
 * Requirements addressed:
 * - 3.5: Loop detection after 10 loops with 0 change
 * - 8.1: Analyze response similarity starting at loop 10
 * - 8.2: Detect stagnation with >95% similarity threshold
 * - 8.3: Report stagnation to user with analysis
 * - 8.4: Provide alternative suggestions when stagnation occurs
 * - 8.5: Include analysis of why progress stopped
 */
import type { SimilarityAnalysis, StagnationResult, IterationData } from '../types/gan-types.js';
/**
 * Configuration for loop detection behavior
 */
export interface LoopDetectorConfig {
    /** Similarity threshold for stagnation detection (0-1) */
    stagnationThreshold: number;
    /** Loop number to start checking for stagnation */
    stagnationStartLoop: number;
    /** Minimum number of iterations to analyze for patterns */
    minIterationsForAnalysis: number;
    /** Number of recent iterations to compare for similarity */
    recentIterationsWindow: number;
    /** Threshold for considering responses identical */
    identicalThreshold: number;
}
/**
 * Default configuration for loop detection
 */
export declare const DEFAULT_LOOP_DETECTOR_CONFIG: LoopDetectorConfig;
/**
 * Detailed analysis of response patterns and stagnation
 */
export interface DetailedStagnationAnalysis extends StagnationResult {
    /** Patterns detected in the responses */
    patterns: {
        /** Repeated code blocks or structures */
        repeatedBlocks: string[];
        /** Common error patterns */
        errorPatterns: string[];
        /** Improvement attempts that failed */
        failedImprovements: string[];
    };
    /** Similarity scores between consecutive iterations */
    similarityProgression: number[];
    /** Analysis of why progress may have stopped */
    progressAnalysis: {
        /** Whether the LLM is stuck on the same issues */
        stuckOnSameIssues: boolean;
        /** Whether the LLM is making cosmetic changes only */
        cosmeticChangesOnly: boolean;
        /** Whether the LLM is reverting previous changes */
        revertingChanges: boolean;
        /** Whether the LLM appears to be confused */
        showsConfusion: boolean;
    };
    /** Suggested alternative approaches */
    alternativeSuggestions: string[];
}
/**
 * Loop Detector for analyzing response similarity and detecting stagnation
 *
 * Requirement 8.1-8.5: Comprehensive loop detection and stagnation prevention
 */
export declare class LoopDetector {
    private readonly config;
    private readonly componentLogger;
    constructor(config?: Partial<LoopDetectorConfig>);
    /**
     * Analyze response similarity across iterations
     * Requirement 8.1: Analyze response similarity starting at loop 10
     */
    analyzeResponseSimilarity(responses: string[]): SimilarityAnalysis;
    /**
     * Detect stagnation with detailed analysis
     * Requirements 8.2-8.5: Comprehensive stagnation detection and reporting
     */
    detectStagnation(iterations: IterationData[], currentLoop: number): DetailedStagnationAnalysis;
    /**
     * Calculate string similarity using advanced algorithms
     */
    private calculateStringSimilarity;
    /**
     * Calculate Levenshtein-based similarity
     */
    private levenshteinSimilarity;
    /**
     * Normalize string for comparison (handle formatting differences)
     */
    private normalizeForComparison;
    /**
     * Calculate Levenshtein distance between two strings
     * Optimized for long strings by using a size limit
     */
    private levenshteinDistance;
    /**
     * Calculate token-based similarity (Jaccard similarity of words)
     */
    private tokenSimilarity;
    /**
     * Calculate structural similarity (based on code structure patterns)
     */
    private structuralSimilarity;
    /**
     * Extract structural elements from code
     */
    private extractStructuralElements;
    /**
     * Detect content patterns in responses
     */
    private detectContentPatterns;
    /**
     * Extract code blocks from response text
     */
    private extractCodeBlocks;
    /**
     * Extract error patterns from response text
     */
    private extractErrorPatterns;
    /**
     * Analyze progress patterns in iterations
     */
    private analyzeProgressPatterns;
    /**
     * Check if iterations are stuck on the same issues
     */
    private areStuckOnSameIssues;
    /**
     * Check if changes are only cosmetic
     */
    private areCosmeticChangesOnly;
    /**
     * Normalize code for cosmetic comparison (more aggressive than regular normalization)
     */
    private normalizeForCosmeticComparison;
    /**
     * Check if reverting previous changes
     */
    private isRevertingChanges;
    /**
     * Check if showing signs of confusion
     */
    private showsConfusion;
    /**
     * Check if progress is stagnant based on scores and similarity
     */
    private isProgressStagnant;
    /**
     * Detect detailed patterns in iterations
     */
    private detectDetailedPatterns;
    /**
     * Categorize error type from comment
     */
    private categorizeError;
    /**
     * Find issues that persist across iterations
     */
    private findPersistentIssues;
    /**
     * Generate alternative suggestions based on analysis
     */
    private generateAlternativeSuggestions;
    /**
     * Generate stagnation recommendation based on analysis
     */
    private generateStagnationRecommendation;
    /**
     * Create a no-stagnation result
     */
    private createNoStagnationResult;
}
//# sourceMappingURL=loop-detector.d.ts.map