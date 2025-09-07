/**
 * Code Complexity Analysis and Adaptation Module
 *
 * This module implements code complexity metrics calculation and audit depth
 * adjustment based on complexity as specified in requirement 8.1.
 *
 * Features:
 * - Code complexity metrics calculation
 * - Audit depth adjustment based on complexity
 * - Focus area prioritization logic
 * - Complexity-based timeout adjustment
 */
import { logger } from '../utils/logger.js';
// ============================================================================
// Default Configuration
// ============================================================================
export const DEFAULT_COMPLEXITY_AUDIT_CONFIG = {
    baseTimeoutSeconds: 30,
    timeoutMultiplier: 1.5,
    maxTimeoutSeconds: 120,
    complexityThresholds: {
        low: 30,
        medium: 60,
        high: 80,
        veryHigh: 100
    },
    focusAreaWeights: {
        testing: 1.0,
        security: 1.0,
        performance: 1.0,
        maintainability: 1.0,
        documentation: 1.0
    }
};
// ============================================================================
// Complexity Analyzer Implementation
// ============================================================================
/**
 * Code complexity analyzer with audit adaptation capabilities
 */
export class ComplexityAnalyzer {
    config;
    constructor(config) {
        this.config = { ...DEFAULT_COMPLEXITY_AUDIT_CONFIG, ...config };
    }
    /**
     * Analyze code complexity and calculate metrics
     */
    async analyzeComplexity(context) {
        try {
            if (!context || typeof context !== 'object') {
                throw new Error('Invalid context: must be an object');
            }
            if (!context.content || typeof context.content !== 'string') {
                throw new Error('Invalid context.content: must be a string');
            }
            logger.debug('Analyzing code complexity', { filePath: context.filePath });
            const metrics = await this.calculateComplexityMetrics(context);
            logger.debug('Complexity analysis completed', {
                filePath: context.filePath,
                overallComplexity: metrics.overallComplexity
            });
            return metrics;
        }
        catch (error) {
            logger.error(`Failed to analyze code complexity for ${context.filePath}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    /**
     * Adjust audit depth based on complexity metrics
     */
    adjustAuditDepth(metrics, context) {
        const complexity = metrics.overallComplexity;
        const auditDepth = this.determineAuditDepth(complexity);
        const timeoutSeconds = this.calculateTimeout(complexity);
        const focusAreas = this.prioritizeFocusAreas(metrics, context);
        const recommendations = this.generateComplexityRecommendations(metrics, auditDepth);
        const justification = this.generateJustification(metrics, auditDepth);
        return {
            auditDepth,
            timeoutSeconds,
            focusAreas,
            recommendations,
            justification
        };
    }
    /**
     * Calculate comprehensive complexity metrics
     */
    async calculateComplexityMetrics(context) {
        const content = context.content;
        // Calculate basic metrics
        const linesOfCode = this.calculateLinesOfCode(content);
        const functionCount = this.calculateFunctionCount(content, context.language);
        const classCount = this.calculateClassCount(content, context.language);
        const nestingDepth = this.calculateNestingDepth(content, context.language);
        const dependencyCount = this.calculateDependencyCount(content, context.language);
        // Calculate complexity metrics
        const cyclomaticComplexity = this.calculateCyclomaticComplexity(content, context.language);
        const cognitiveComplexity = this.calculateCognitiveComplexity(content, context.language);
        const halsteadComplexity = this.calculateHalsteadMetrics(content, context.language);
        // Calculate overall complexity score
        const overallComplexity = this.calculateOverallComplexity({
            cyclomaticComplexity,
            cognitiveComplexity,
            linesOfCode,
            functionCount,
            classCount,
            nestingDepth,
            dependencyCount
        });
        return {
            cyclomaticComplexity,
            cognitiveComplexity,
            linesOfCode,
            functionCount,
            classCount,
            nestingDepth,
            dependencyCount,
            halsteadComplexity,
            overallComplexity
        };
    }
    /**
     * Calculate lines of code (excluding comments and empty lines)
     */
    calculateLinesOfCode(content) {
        const lines = content.split('\n');
        return lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('/*') &&
                !trimmed.startsWith('*') &&
                !trimmed.startsWith('#');
        }).length;
    }
    /**
     * Calculate function count based on language
     */
    calculateFunctionCount(content, language) {
        const patterns = this.getFunctionPatterns(language);
        let count = 0;
        for (const pattern of patterns) {
            const matches = content.match(pattern);
            count += matches ? matches.length : 0;
        }
        return count;
    }
    /**
     * Calculate class count based on language
     */
    calculateClassCount(content, language) {
        const patterns = this.getClassPatterns(language);
        let count = 0;
        for (const pattern of patterns) {
            const matches = content.match(pattern);
            count += matches ? matches.length : 0;
        }
        return count;
    }
    /**
     * Calculate maximum nesting depth
     */
    calculateNestingDepth(content, language) {
        const openBraces = ['{', '(', '['];
        const closeBraces = ['}', ')', ']'];
        let maxDepth = 0;
        let currentDepth = 0;
        for (const char of content) {
            if (openBraces.includes(char)) {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
            }
            else if (closeBraces.includes(char)) {
                currentDepth = Math.max(0, currentDepth - 1);
            }
        }
        return maxDepth;
    }
    /**
     * Calculate dependency count
     */
    calculateDependencyCount(content, language) {
        const patterns = this.getImportPatterns(language);
        let count = 0;
        for (const pattern of patterns) {
            const matches = content.match(pattern);
            count += matches ? matches.length : 0;
        }
        return count;
    }
    /**
     * Calculate cyclomatic complexity
     */
    calculateCyclomaticComplexity(content, language) {
        const patterns = this.getComplexityPatterns(language);
        let complexity = 1; // Base complexity
        for (const pattern of patterns) {
            const matches = content.match(pattern);
            complexity += matches ? matches.length : 0;
        }
        return complexity;
    }
    /**
     * Calculate cognitive complexity
     */
    calculateCognitiveComplexity(content, language) {
        // Simplified cognitive complexity calculation
        // In a real implementation, this would be more sophisticated
        const cyclomaticComplexity = this.calculateCyclomaticComplexity(content, language);
        const nestingDepth = this.calculateNestingDepth(content, language);
        // Cognitive complexity considers nesting penalty
        return cyclomaticComplexity + (nestingDepth * 2);
    }
    /**
     * Calculate Halstead complexity metrics
     */
    calculateHalsteadMetrics(content, language) {
        const operators = this.getOperators(language);
        const operands = this.getOperands(content, language);
        const distinctOperators = new Set(operators).size;
        const distinctOperands = new Set(operands).size;
        const totalOperators = operators.length;
        const totalOperands = operands.length;
        const vocabulary = distinctOperators + distinctOperands;
        const length = totalOperators + totalOperands;
        const calculatedLength = distinctOperators * Math.log2(distinctOperators) +
            distinctOperands * Math.log2(distinctOperands);
        const volume = length * Math.log2(vocabulary);
        const difficulty = (distinctOperators / 2) * (totalOperands / distinctOperands);
        const effort = difficulty * volume;
        return {
            distinctOperators,
            distinctOperands,
            totalOperators,
            totalOperands,
            vocabulary,
            length,
            calculatedLength,
            volume,
            difficulty,
            effort
        };
    }
    /**
     * Calculate overall complexity score (0-100)
     */
    calculateOverallComplexity(metrics) {
        const weights = {
            cyclomatic: 0.25,
            cognitive: 0.25,
            lines: 0.15,
            functions: 0.10,
            classes: 0.10,
            nesting: 0.10,
            dependencies: 0.05
        };
        // Normalize each metric to 0-100 scale
        const normalizedCyclomatic = Math.min(100, (metrics.cyclomaticComplexity || 0) * 5);
        const normalizedCognitive = Math.min(100, (metrics.cognitiveComplexity || 0) * 3);
        const normalizedLines = Math.min(100, (metrics.linesOfCode || 0) / 10);
        const normalizedFunctions = Math.min(100, (metrics.functionCount || 0) * 10);
        const normalizedClasses = Math.min(100, (metrics.classCount || 0) * 20);
        const normalizedNesting = Math.min(100, (metrics.nestingDepth || 0) * 10);
        const normalizedDependencies = Math.min(100, (metrics.dependencyCount || 0) * 5);
        const weightedScore = normalizedCyclomatic * weights.cyclomatic +
            normalizedCognitive * weights.cognitive +
            normalizedLines * weights.lines +
            normalizedFunctions * weights.functions +
            normalizedClasses * weights.classes +
            normalizedNesting * weights.nesting +
            normalizedDependencies * weights.dependencies;
        return Math.round(Math.min(100, weightedScore));
    }
    /**
     * Determine audit depth based on complexity
     */
    determineAuditDepth(complexity) {
        const thresholds = this.config.complexityThresholds;
        if (complexity <= thresholds.low) {
            return 'shallow';
        }
        else if (complexity <= thresholds.medium) {
            return 'standard';
        }
        else if (complexity <= thresholds.high) {
            return 'deep';
        }
        else {
            return 'comprehensive';
        }
    }
    /**
     * Calculate timeout based on complexity
     */
    calculateTimeout(complexity) {
        const baseTimeout = this.config.baseTimeoutSeconds;
        const multiplier = this.config.timeoutMultiplier;
        const maxTimeout = this.config.maxTimeoutSeconds;
        const complexityFactor = complexity / 100;
        const adjustedTimeout = baseTimeout * (1 + complexityFactor * multiplier);
        return Math.min(maxTimeout, Math.round(adjustedTimeout));
    }
    /**
     * Prioritize focus areas based on complexity
     */
    prioritizeFocusAreas(metrics, context) {
        const focusAreas = [];
        // Testing priority increases significantly with complexity
        // For high complexity (85): 85 * 1.5 + 25 * 1.0 = 127.5 + 25 = 152.5
        focusAreas.push({
            area: 'testing',
            priority: metrics.overallComplexity * 1.5 + metrics.cyclomaticComplexity * 1.0
        });
        // Security priority increases with dependency count and complexity
        // For high complexity: 30 * 3 + 85 * 0.3 = 90 + 25.5 = 115.5
        focusAreas.push({
            area: 'security',
            priority: metrics.dependencyCount * 3 + metrics.overallComplexity * 0.3
        });
        // Performance priority increases with nesting and function count
        // For high complexity: 8 * 8 + 20 * 2 = 64 + 40 = 104
        focusAreas.push({
            area: 'performance',
            priority: metrics.nestingDepth * 8 + metrics.functionCount * 2
        });
        // Maintainability priority increases with cognitive complexity
        // For high complexity: 35 * 1.2 + 500 * 0.05 = 42 + 25 = 67
        focusAreas.push({
            area: 'maintainability',
            priority: metrics.cognitiveComplexity * 1.2 + metrics.linesOfCode * 0.05
        });
        // Documentation priority increases with class and function count
        // For high complexity: 5 * 8 + 20 * 1.5 = 40 + 30 = 70
        focusAreas.push({
            area: 'documentation',
            priority: metrics.classCount * 8 + metrics.functionCount * 1.5
        });
        // Sort by priority and return top areas
        return focusAreas
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 3)
            .map(item => item.area);
    }
    /**
     * Generate complexity-based recommendations
     */
    generateComplexityRecommendations(metrics, auditDepth) {
        const recommendations = [];
        if (metrics.cyclomaticComplexity > 10) {
            recommendations.push('Consider breaking down complex functions to reduce cyclomatic complexity');
        }
        if (metrics.cognitiveComplexity > 15) {
            recommendations.push('Simplify logic flow to reduce cognitive load');
        }
        if (metrics.nestingDepth > 4) {
            recommendations.push('Reduce nesting depth through early returns or helper functions');
        }
        if (metrics.functionCount > 20) {
            recommendations.push('Consider organizing functions into classes or modules');
        }
        if (metrics.dependencyCount > 15) {
            recommendations.push('Review dependencies for potential consolidation');
        }
        if (auditDepth === 'comprehensive') {
            recommendations.push('High complexity detected - comprehensive audit recommended');
        }
        return recommendations;
    }
    /**
     * Generate justification for audit adjustments
     */
    generateJustification(metrics, auditDepth) {
        const complexity = metrics.overallComplexity;
        return `Audit depth set to '${auditDepth}' based on overall complexity score of ${complexity}. ` +
            `Key factors: cyclomatic complexity (${metrics.cyclomaticComplexity}), ` +
            `cognitive complexity (${metrics.cognitiveComplexity}), ` +
            `nesting depth (${metrics.nestingDepth}).`;
    }
    // ============================================================================
    // Language-Specific Pattern Helpers
    // ============================================================================
    getFunctionPatterns(language) {
        const patterns = {
            typescript: [
                /function\s+\w+/g,
                /\w+\s*:\s*\([^)]*\)\s*=>/g,
                /\w+\s*=\s*\([^)]*\)\s*=>/g,
                /async\s+function\s+\w+/g
            ],
            javascript: [
                /function\s+\w+/g,
                /\w+\s*=\s*function/g,
                /\w+\s*:\s*function/g,
                /\w+\s*=\s*\([^)]*\)\s*=>/g
            ],
            python: [
                /def\s+\w+/g,
                /async\s+def\s+\w+/g
            ],
            java: [
                /(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\(/g
            ]
        };
        return patterns[language.toLowerCase()] || patterns.typescript;
    }
    getClassPatterns(language) {
        const patterns = {
            typescript: [/class\s+\w+/g, /interface\s+\w+/g],
            javascript: [/class\s+\w+/g],
            python: [/class\s+\w+/g],
            java: [/(public|private)?\s*class\s+\w+/g]
        };
        return patterns[language.toLowerCase()] || patterns.typescript;
    }
    getImportPatterns(language) {
        const patterns = {
            typescript: [/import\s+.*from/g, /import\s*\(/g],
            javascript: [/import\s+.*from/g, /require\s*\(/g],
            python: [/import\s+\w+/g, /from\s+\w+\s+import/g],
            java: [/import\s+[\w.]+/g]
        };
        return patterns[language.toLowerCase()] || patterns.typescript;
    }
    getComplexityPatterns(language) {
        const patterns = {
            typescript: [
                /if\s*\(/g, /else\s+if/g, /while\s*\(/g, /for\s*\(/g,
                /switch\s*\(/g, /case\s+/g, /catch\s*\(/g, /\?\s*:/g
            ],
            javascript: [
                /if\s*\(/g, /else\s+if/g, /while\s*\(/g, /for\s*\(/g,
                /switch\s*\(/g, /case\s+/g, /catch\s*\(/g, /\?\s*:/g
            ],
            python: [
                /if\s+/g, /elif\s+/g, /while\s+/g, /for\s+/g,
                /except\s*/g, /try\s*:/g
            ],
            java: [
                /if\s*\(/g, /else\s+if/g, /while\s*\(/g, /for\s*\(/g,
                /switch\s*\(/g, /case\s+/g, /catch\s*\(/g, /\?\s*:/g
            ]
        };
        return patterns[language.toLowerCase()] || patterns.typescript;
    }
    getOperators(language) {
        // Simplified operator extraction - in practice, this would parse the AST
        const commonOperators = ['+', '-', '*', '/', '=', '==', '!=', '<', '>', '&&', '||'];
        return commonOperators;
    }
    getOperands(content, language) {
        // Simplified operand extraction - in practice, this would parse the AST
        const words = content.match(/\b\w+\b/g) || [];
        return words.filter(word => !this.isKeyword(word, language));
    }
    isKeyword(word, language) {
        const keywords = {
            typescript: ['if', 'else', 'for', 'while', 'function', 'class', 'interface', 'const', 'let', 'var'],
            javascript: ['if', 'else', 'for', 'while', 'function', 'class', 'const', 'let', 'var'],
            python: ['if', 'else', 'for', 'while', 'def', 'class', 'import', 'from'],
            java: ['if', 'else', 'for', 'while', 'class', 'public', 'private', 'static']
        };
        const languageKeywords = keywords[language.toLowerCase()] || keywords.typescript;
        return languageKeywords.includes(word.toLowerCase());
    }
}
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create a complexity analyzer with default configuration
 */
export function createComplexityAnalyzer(config) {
    return new ComplexityAnalyzer(config);
}
/**
 * Validate complexity metrics
 */
export function validateComplexityMetrics(metrics) {
    return (typeof metrics.overallComplexity === 'number' &&
        metrics.overallComplexity >= 0 &&
        metrics.overallComplexity <= 100 &&
        typeof metrics.cyclomaticComplexity === 'number' &&
        metrics.cyclomaticComplexity >= 1);
}
//# sourceMappingURL=complexity-analyzer.js.map