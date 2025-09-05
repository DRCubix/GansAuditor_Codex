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
import { createComponentLogger } from '../utils/logger.js';
/**
 * Default configuration for loop detection
 */
export const DEFAULT_LOOP_DETECTOR_CONFIG = {
    stagnationThreshold: 0.95,
    stagnationStartLoop: 10,
    minIterationsForAnalysis: 3,
    recentIterationsWindow: 3,
    identicalThreshold: 0.99,
};
/**
 * Loop Detector for analyzing response similarity and detecting stagnation
 *
 * Requirement 8.1-8.5: Comprehensive loop detection and stagnation prevention
 */
export class LoopDetector {
    config;
    componentLogger;
    constructor(config = {}) {
        this.config = { ...DEFAULT_LOOP_DETECTOR_CONFIG, ...config };
        this.componentLogger = createComponentLogger('loop-detector');
    }
    /**
     * Analyze response similarity across iterations
     * Requirement 8.1: Analyze response similarity starting at loop 10
     */
    analyzeResponseSimilarity(responses) {
        if (responses.length < 2) {
            return {
                averageSimilarity: 0,
                isStagnant: false,
                repeatedPatterns: [],
            };
        }
        const similarities = [];
        const patterns = [];
        // Calculate pairwise similarities
        for (let i = 1; i < responses.length; i++) {
            const similarity = this.calculateStringSimilarity(responses[i - 1], responses[i]);
            similarities.push(similarity);
            // Detect specific patterns
            if (similarity > this.config.identicalThreshold) {
                patterns.push(`Responses ${i - 1} and ${i} are nearly identical (${(similarity * 100).toFixed(1)}% similar)`);
            }
            else if (similarity > this.config.stagnationThreshold) {
                patterns.push(`Responses ${i - 1} and ${i} show high similarity (${(similarity * 100).toFixed(1)}% similar)`);
            }
        }
        const averageSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
        // Determine if stagnant based on multiple criteria
        const highSimilarityCount = similarities.filter(sim => sim > this.config.stagnationThreshold).length;
        const isStagnant = averageSimilarity > this.config.stagnationThreshold &&
            highSimilarityCount >= Math.ceil(similarities.length / 2);
        // Detect repeated patterns in the content
        const contentPatterns = this.detectContentPatterns(responses);
        patterns.push(...contentPatterns);
        this.componentLogger.debug(`Similarity analysis: avg=${averageSimilarity.toFixed(3)}, stagnant=${isStagnant}, patterns=${patterns.length}`);
        return {
            averageSimilarity,
            isStagnant,
            repeatedPatterns: patterns,
        };
    }
    /**
     * Detect stagnation with detailed analysis
     * Requirements 8.2-8.5: Comprehensive stagnation detection and reporting
     */
    detectStagnation(iterations, currentLoop) {
        // Check if we have enough iterations and are past the start loop
        if (iterations.length < this.config.minIterationsForAnalysis ||
            currentLoop < this.config.stagnationStartLoop) {
            return this.createNoStagnationResult(currentLoop, "Not enough iterations or below start loop threshold");
        }
        // Get recent iterations for analysis
        const recentIterations = iterations.slice(-this.config.recentIterationsWindow);
        const codes = recentIterations.map(iter => iter.code);
        const auditScores = recentIterations.map(iter => iter.auditResult.overall);
        // Analyze similarity
        const similarityAnalysis = this.analyzeResponseSimilarity(codes);
        // Calculate similarity progression
        const similarityProgression = [];
        for (let i = 1; i < codes.length; i++) {
            similarityProgression.push(this.calculateStringSimilarity(codes[i - 1], codes[i]));
        }
        // Analyze progress patterns
        const progressAnalysis = this.analyzeProgressPatterns(recentIterations);
        // Detect specific patterns
        const patterns = this.detectDetailedPatterns(recentIterations);
        // Determine if stagnant
        const isStagnant = similarityAnalysis.isStagnant || this.isProgressStagnant(auditScores, similarityProgression);
        // Generate recommendations
        const alternativeSuggestions = this.generateAlternativeSuggestions(progressAnalysis, patterns, auditScores);
        let recommendation = "Continue iterating";
        if (isStagnant) {
            recommendation = this.generateStagnationRecommendation(progressAnalysis, patterns);
        }
        const result = {
            isStagnant,
            detectedAtLoop: currentLoop,
            similarityScore: similarityAnalysis.averageSimilarity,
            recommendation,
            patterns,
            similarityProgression,
            progressAnalysis,
            alternativeSuggestions,
        };
        if (isStagnant) {
            this.componentLogger.warn(`Stagnation detected at loop ${currentLoop}`, {
                similarityScore: similarityAnalysis.averageSimilarity,
                patternCount: patterns.repeatedBlocks.length,
                progressAnalysis,
            });
        }
        return result;
    }
    /**
     * Calculate string similarity using advanced algorithms
     */
    calculateStringSimilarity(str1, str2) {
        if (str1 === str2)
            return 1.0;
        if (str1.length === 0 && str2.length === 0)
            return 1.0;
        if (str1.length === 0 || str2.length === 0)
            return 0.0;
        // Normalize strings for better comparison (handle formatting differences)
        const normalized1 = this.normalizeForComparison(str1);
        const normalized2 = this.normalizeForComparison(str2);
        if (normalized1 === normalized2)
            return 1.0;
        // Use a combination of different similarity measures
        const levenshteinSim = this.levenshteinSimilarity(normalized1, normalized2);
        const tokenSim = this.tokenSimilarity(str1, str2);
        const structuralSim = this.structuralSimilarity(str1, str2);
        // Weighted combination of different similarity measures
        return (levenshteinSim * 0.4) + (tokenSim * 0.4) + (structuralSim * 0.2);
    }
    /**
     * Calculate Levenshtein-based similarity
     */
    levenshteinSimilarity(str1, str2) {
        const maxLength = Math.max(str1.length, str2.length);
        const distance = this.levenshteinDistance(str1, str2);
        return 1 - (distance / maxLength);
    }
    /**
     * Normalize string for comparison (handle formatting differences)
     */
    normalizeForComparison(str) {
        return str
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\n\s*/g, '\n') // Normalize line breaks and indentation
            .trim();
    }
    /**
     * Calculate Levenshtein distance between two strings
     * Optimized for long strings by using a size limit
     */
    levenshteinDistance(str1, str2) {
        // For very long strings, use a sample-based approach for performance
        const maxLength = 1000;
        let s1 = str1;
        let s2 = str2;
        if (str1.length > maxLength || str2.length > maxLength) {
            // Take samples from beginning, middle, and end
            const sampleSize = Math.floor(maxLength / 3);
            s1 = str1.substring(0, sampleSize) +
                str1.substring(Math.floor(str1.length / 2) - sampleSize / 2, Math.floor(str1.length / 2) + sampleSize / 2) +
                str1.substring(str1.length - sampleSize);
            s2 = str2.substring(0, sampleSize) +
                str2.substring(Math.floor(str2.length / 2) - sampleSize / 2, Math.floor(str2.length / 2) + sampleSize / 2) +
                str2.substring(str2.length - sampleSize);
        }
        const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
        for (let i = 0; i <= s1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= s2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= s2.length; j++) {
            for (let i = 1; i <= s1.length; i++) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, // deletion
                matrix[j - 1][i] + 1, // insertion
                matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        return matrix[s2.length][s1.length];
    }
    /**
     * Calculate token-based similarity (Jaccard similarity of words)
     */
    tokenSimilarity(str1, str2) {
        const tokens1 = new Set(str1.toLowerCase().split(/\s+/).filter(token => token.length > 0));
        const tokens2 = new Set(str2.toLowerCase().split(/\s+/).filter(token => token.length > 0));
        const intersection = new Set([...tokens1].filter(token => tokens2.has(token)));
        const union = new Set([...tokens1, ...tokens2]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
    /**
     * Calculate structural similarity (based on code structure patterns)
     */
    structuralSimilarity(str1, str2) {
        // Extract structural elements (functions, classes, imports, etc.)
        const structure1 = this.extractStructuralElements(str1);
        const structure2 = this.extractStructuralElements(str2);
        if (structure1.length === 0 && structure2.length === 0)
            return 1.0;
        if (structure1.length === 0 || structure2.length === 0)
            return 0.0;
        const commonElements = structure1.filter(elem => structure2.includes(elem));
        const totalElements = new Set([...structure1, ...structure2]).size;
        return commonElements.length / totalElements;
    }
    /**
     * Extract structural elements from code
     */
    extractStructuralElements(code) {
        const elements = [];
        // Function declarations
        const functionMatches = code.match(/(?:function|const|let|var)\s+(\w+)/g);
        if (functionMatches) {
            elements.push(...functionMatches.map(match => `func:${match.split(/\s+/)[1]}`));
        }
        // Class declarations
        const classMatches = code.match(/class\s+(\w+)/g);
        if (classMatches) {
            elements.push(...classMatches.map(match => `class:${match.split(/\s+/)[1]}`));
        }
        // Import statements
        const importMatches = code.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
            elements.push(...importMatches.map(match => `import:${match.split(/['"]([^'"]+)['"]/)[1]}`));
        }
        // Control structures
        const controlMatches = code.match(/\b(if|for|while|switch|try|catch)\b/g);
        if (controlMatches) {
            elements.push(...controlMatches.map(match => `control:${match}`));
        }
        return elements;
    }
    /**
     * Detect content patterns in responses
     */
    detectContentPatterns(responses) {
        const patterns = [];
        // Check for repeated code blocks
        const codeBlocks = responses.map(response => this.extractCodeBlocks(response));
        for (let i = 1; i < codeBlocks.length; i++) {
            const commonBlocks = codeBlocks[i].filter(block => codeBlocks[i - 1].some(prevBlock => this.calculateStringSimilarity(block, prevBlock) > 0.9));
            if (commonBlocks.length > 0) {
                patterns.push(`Repeated code blocks detected between iterations ${i - 1} and ${i}`);
            }
        }
        // Check for repeated error patterns
        const errorPatterns = responses.map(response => this.extractErrorPatterns(response));
        for (let i = 1; i < errorPatterns.length; i++) {
            const commonErrors = errorPatterns[i].filter(error => errorPatterns[i - 1].includes(error));
            if (commonErrors.length > 0) {
                patterns.push(`Repeated error patterns: ${commonErrors.join(', ')}`);
            }
        }
        return patterns;
    }
    /**
     * Extract code blocks from response text
     */
    extractCodeBlocks(text) {
        const codeBlockRegex = /```[\s\S]*?```/g;
        const matches = text.match(codeBlockRegex);
        return matches || [];
    }
    /**
     * Extract error patterns from response text
     */
    extractErrorPatterns(text) {
        const patterns = [];
        // Common error keywords
        const errorKeywords = ['error', 'exception', 'fail', 'bug', 'issue', 'problem', 'wrong'];
        for (const keyword of errorKeywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            if (regex.test(text)) {
                patterns.push(keyword);
            }
        }
        return patterns;
    }
    /**
     * Analyze progress patterns in iterations
     */
    analyzeProgressPatterns(iterations) {
        const codes = iterations.map(iter => iter.code);
        const scores = iterations.map(iter => iter.auditResult.overall);
        const reviews = iterations.map(iter => iter.auditResult.review);
        // Check if stuck on same issues
        const stuckOnSameIssues = this.areStuckOnSameIssues(reviews);
        // Check if making only cosmetic changes
        const cosmeticChangesOnly = this.areCosmeticChangesOnly(codes);
        // Check if reverting changes
        const revertingChanges = this.isRevertingChanges(codes);
        // Check if showing confusion
        const showsConfusion = this.showsConfusion(codes, scores);
        return {
            stuckOnSameIssues,
            cosmeticChangesOnly,
            revertingChanges,
            showsConfusion,
        };
    }
    /**
     * Check if iterations are stuck on the same issues
     */
    areStuckOnSameIssues(reviews) {
        if (reviews.length < 2)
            return false;
        // Extract issue types from reviews
        const issueTypes = reviews.map(review => {
            const issues = [];
            if (review.inline) {
                for (const comment of review.inline) {
                    // Extract issue type from comment (simplified)
                    if (comment.comment.toLowerCase().includes('security'))
                        issues.push('security');
                    if (comment.comment.toLowerCase().includes('performance'))
                        issues.push('performance');
                    if (comment.comment.toLowerCase().includes('style'))
                        issues.push('style');
                    if (comment.comment.toLowerCase().includes('logic'))
                        issues.push('logic');
                }
            }
            return issues;
        });
        // Check if recent iterations have similar issue types
        const recentIssues = issueTypes.slice(-2);
        if (recentIssues.length < 2)
            return false;
        const commonIssues = recentIssues[0].filter(issue => recentIssues[1].includes(issue));
        return commonIssues.length > 0 && commonIssues.length >= Math.min(recentIssues[0].length, recentIssues[1].length) * 0.7;
    }
    /**
     * Check if changes are only cosmetic
     */
    areCosmeticChangesOnly(codes) {
        if (codes.length < 2)
            return false;
        let cosmeticChangeCount = 0;
        for (let i = 1; i < codes.length; i++) {
            // More aggressive normalization for cosmetic detection
            const prev = this.normalizeForCosmeticComparison(codes[i - 1]);
            const curr = this.normalizeForCosmeticComparison(codes[i]);
            // If normalized versions are identical, changes are cosmetic
            if (prev === curr) {
                cosmeticChangeCount++;
            }
            else {
                // Check if the difference is minimal (high similarity)
                const similarity = this.calculateStringSimilarity(prev, curr);
                if (similarity > 0.98) { // Very high threshold for cosmetic detection
                    cosmeticChangeCount++;
                }
            }
        }
        // Consider cosmetic if more than half the changes are cosmetic
        return cosmeticChangeCount >= Math.ceil((codes.length - 1) / 2);
    }
    /**
     * Normalize code for cosmetic comparison (more aggressive than regular normalization)
     */
    normalizeForCosmeticComparison(code) {
        return code
            .replace(/\s+/g, ' ') // Normalize all whitespace to single spaces
            .replace(/\s*([{}();,])\s*/g, '$1') // Remove spaces around punctuation
            .replace(/\s*=\s*/g, '=') // Remove spaces around equals
            .replace(/\s*\+\s*/g, '+') // Remove spaces around operators
            .replace(/\s*-\s*/g, '-')
            .replace(/\s*\*\s*/g, '*')
            .replace(/\s*\/\s*/g, '/')
            .trim();
    }
    /**
     * Check if reverting previous changes
     */
    isRevertingChanges(codes) {
        if (codes.length < 3)
            return false;
        // Check if current code is similar to code from 2 iterations ago
        for (let i = 2; i < codes.length; i++) {
            const similarity = this.calculateStringSimilarity(codes[i - 2], codes[i]);
            if (similarity > 0.9) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if showing signs of confusion
     */
    showsConfusion(codes, scores) {
        // Look for declining scores or erratic patterns
        if (scores.length < 3)
            return false;
        let decliningCount = 0;
        for (let i = 1; i < scores.length; i++) {
            if (scores[i] < scores[i - 1]) {
                decliningCount++;
            }
        }
        // If more than half the recent changes resulted in lower scores
        return decliningCount > scores.length / 2;
    }
    /**
     * Check if progress is stagnant based on scores and similarity
     */
    isProgressStagnant(scores, similarities) {
        if (scores.length < 2)
            return false;
        // Check if scores are not improving
        const recentScores = scores.slice(-3);
        const scoreImprovement = recentScores[recentScores.length - 1] - recentScores[0];
        // Check if similarity is too high
        const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
        return scoreImprovement <= 0.01 && avgSimilarity > this.config.stagnationThreshold;
    }
    /**
     * Detect detailed patterns in iterations
     */
    detectDetailedPatterns(iterations) {
        const codes = iterations.map(iter => iter.code);
        const reviews = iterations.map(iter => iter.auditResult.review);
        const repeatedBlocks = [];
        const errorPatterns = [];
        const failedImprovements = [];
        // Detect repeated code blocks
        for (let i = 1; i < codes.length; i++) {
            const blocks1 = this.extractCodeBlocks(codes[i - 1]);
            const blocks2 = this.extractCodeBlocks(codes[i]);
            for (const block1 of blocks1) {
                for (const block2 of blocks2) {
                    if (this.calculateStringSimilarity(block1, block2) > 0.9) {
                        repeatedBlocks.push(`Similar code block in iterations ${i - 1} and ${i}`);
                    }
                }
            }
        }
        // Detect error patterns
        for (const review of reviews) {
            if (review.inline) {
                for (const comment of review.inline) {
                    const errorType = this.categorizeError(comment.comment);
                    if (errorType && !errorPatterns.includes(errorType)) {
                        errorPatterns.push(errorType);
                    }
                }
            }
        }
        // Detect failed improvements (same issues persisting)
        const persistentIssues = this.findPersistentIssues(reviews);
        failedImprovements.push(...persistentIssues);
        return {
            repeatedBlocks,
            errorPatterns,
            failedImprovements,
        };
    }
    /**
     * Categorize error type from comment
     */
    categorizeError(comment) {
        const lowerComment = comment.toLowerCase();
        if (lowerComment.includes('security') || lowerComment.includes('vulnerability')) {
            return 'Security issues';
        }
        if (lowerComment.includes('performance') || lowerComment.includes('optimization')) {
            return 'Performance issues';
        }
        if (lowerComment.includes('style') || lowerComment.includes('formatting')) {
            return 'Style issues';
        }
        if (lowerComment.includes('logic') || lowerComment.includes('algorithm')) {
            return 'Logic issues';
        }
        if (lowerComment.includes('error handling') || lowerComment.includes('exception')) {
            return 'Error handling issues';
        }
        return null;
    }
    /**
     * Find issues that persist across iterations
     */
    findPersistentIssues(reviews) {
        const issuesByIteration = reviews.map(review => {
            const issues = [];
            if (review.inline) {
                for (const comment of review.inline) {
                    const category = this.categorizeError(comment.comment);
                    if (category) {
                        issues.push(category);
                    }
                }
            }
            return issues;
        });
        const persistentIssues = [];
        // Find issues that appear in multiple iterations
        for (let i = 1; i < issuesByIteration.length; i++) {
            const currentIssues = issuesByIteration[i];
            const previousIssues = issuesByIteration[i - 1];
            for (const issue of currentIssues) {
                if (previousIssues.includes(issue) && !persistentIssues.includes(issue)) {
                    persistentIssues.push(`${issue} (persisting across iterations)`);
                }
            }
        }
        return persistentIssues;
    }
    /**
     * Generate alternative suggestions based on analysis
     */
    generateAlternativeSuggestions(progressAnalysis, patterns, scores) {
        const suggestions = [];
        if (progressAnalysis.stuckOnSameIssues) {
            suggestions.push("Try a completely different approach to address the persistent issues");
            suggestions.push("Break down the problem into smaller, more manageable pieces");
        }
        if (progressAnalysis.cosmeticChangesOnly) {
            suggestions.push("Focus on substantial structural changes rather than minor adjustments");
            suggestions.push("Reconsider the overall architecture or design approach");
        }
        if (progressAnalysis.revertingChanges) {
            suggestions.push("Establish a clear direction and stick to it");
            suggestions.push("Document the reasoning behind each change to avoid reverting");
        }
        if (progressAnalysis.showsConfusion) {
            suggestions.push("Take a step back and reassess the requirements");
            suggestions.push("Simplify the solution and build up incrementally");
        }
        if (patterns.errorPatterns.length > 2) {
            suggestions.push("Address the most critical error patterns first");
            suggestions.push("Consider using different tools or libraries to solve the problems");
        }
        if (scores.length > 0 && scores[scores.length - 1] < 0.5) {
            suggestions.push("Consider starting over with a fresh approach");
            suggestions.push("Seek additional context or requirements clarification");
        }
        // Default suggestions if no specific patterns detected
        if (suggestions.length === 0) {
            suggestions.push("Try a different implementation strategy");
            suggestions.push("Consider alternative libraries or frameworks");
            suggestions.push("Break the problem into smaller components");
        }
        return suggestions;
    }
    /**
     * Generate stagnation recommendation based on analysis
     */
    generateStagnationRecommendation(progressAnalysis, patterns) {
        const issues = [];
        if (progressAnalysis.stuckOnSameIssues) {
            issues.push("stuck on the same issues");
        }
        if (progressAnalysis.cosmeticChangesOnly) {
            issues.push("making only cosmetic changes");
        }
        if (progressAnalysis.revertingChanges) {
            issues.push("reverting previous changes");
        }
        if (progressAnalysis.showsConfusion) {
            issues.push("showing signs of confusion");
        }
        let recommendation = "Stagnation detected. ";
        if (issues.length > 0) {
            recommendation += `The system appears to be ${issues.join(", ")}. `;
        }
        recommendation += "Consider terminating the session and trying a different approach, ";
        recommendation += "or provide additional context to help break out of the current pattern.";
        return recommendation;
    }
    /**
     * Create a no-stagnation result
     */
    createNoStagnationResult(currentLoop, reason) {
        return {
            isStagnant: false,
            detectedAtLoop: currentLoop,
            similarityScore: 0,
            recommendation: reason,
            patterns: {
                repeatedBlocks: [],
                errorPatterns: [],
                failedImprovements: [],
            },
            similarityProgression: [],
            progressAnalysis: {
                stuckOnSameIssues: false,
                cosmeticChangesOnly: false,
                revertingChanges: false,
                showsConfusion: false,
            },
            alternativeSuggestions: [],
        };
    }
}
//# sourceMappingURL=loop-detector.js.map