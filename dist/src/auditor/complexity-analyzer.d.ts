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
/**
 * Code complexity metrics
 */
export interface ComplexityMetrics {
    /** Cyclomatic complexity */
    cyclomaticComplexity: number;
    /** Cognitive complexity */
    cognitiveComplexity: number;
    /** Lines of code */
    linesOfCode: number;
    /** Number of functions/methods */
    functionCount: number;
    /** Number of classes */
    classCount: number;
    /** Nesting depth */
    nestingDepth: number;
    /** Number of dependencies */
    dependencyCount: number;
    /** Halstead complexity */
    halsteadComplexity: HalsteadMetrics;
    /** Overall complexity score (0-100) */
    overallComplexity: number;
}
/**
 * Halstead complexity metrics
 */
export interface HalsteadMetrics {
    /** Number of distinct operators */
    distinctOperators: number;
    /** Number of distinct operands */
    distinctOperands: number;
    /** Total operators */
    totalOperators: number;
    /** Total operands */
    totalOperands: number;
    /** Program vocabulary */
    vocabulary: number;
    /** Program length */
    length: number;
    /** Calculated length */
    calculatedLength: number;
    /** Volume */
    volume: number;
    /** Difficulty */
    difficulty: number;
    /** Effort */
    effort: number;
}
/**
 * Complexity-based audit configuration
 */
export interface ComplexityAuditConfig {
    /** Base audit timeout in seconds */
    baseTimeoutSeconds: number;
    /** Timeout multiplier based on complexity */
    timeoutMultiplier: number;
    /** Maximum timeout in seconds */
    maxTimeoutSeconds: number;
    /** Complexity thresholds for audit depth */
    complexityThresholds: ComplexityThresholds;
    /** Focus area weights based on complexity */
    focusAreaWeights: FocusAreaWeights;
}
/**
 * Complexity thresholds for different audit depths
 */
export interface ComplexityThresholds {
    /** Low complexity threshold (0-30) */
    low: number;
    /** Medium complexity threshold (31-60) */
    medium: number;
    /** High complexity threshold (61-80) */
    high: number;
    /** Very high complexity threshold (81-100) */
    veryHigh: number;
}
/**
 * Focus area weights based on complexity level
 */
export interface FocusAreaWeights {
    /** Testing focus weight */
    testing: number;
    /** Security focus weight */
    security: number;
    /** Performance focus weight */
    performance: number;
    /** Maintainability focus weight */
    maintainability: number;
    /** Documentation focus weight */
    documentation: number;
}
/**
 * Audit depth adjustment result
 */
export interface AuditDepthAdjustment {
    /** Recommended audit depth level */
    auditDepth: AuditDepthLevel;
    /** Adjusted timeout in seconds */
    timeoutSeconds: number;
    /** Focus areas prioritized by complexity */
    focusAreas: string[];
    /** Complexity-based recommendations */
    recommendations: string[];
    /** Justification for adjustments */
    justification: string;
}
/**
 * Audit depth levels
 */
export type AuditDepthLevel = 'shallow' | 'standard' | 'deep' | 'comprehensive';
/**
 * Code analysis context
 */
export interface CodeAnalysisContext {
    /** File path being analyzed */
    filePath: string;
    /** Programming language */
    language: string;
    /** File content */
    content: string;
    /** Git diff context (if available) */
    gitDiff?: string;
    /** Project context */
    projectContext?: ProjectContext;
}
/**
 * Project context for complexity analysis
 */
export interface ProjectContext {
    /** Project type (web, api, library, etc.) */
    projectType: string;
    /** Technology stack */
    techStack: string[];
    /** Project size (small, medium, large) */
    projectSize: string;
    /** Team experience level */
    teamExperience: string;
}
export declare const DEFAULT_COMPLEXITY_AUDIT_CONFIG: ComplexityAuditConfig;
/**
 * Code complexity analyzer with audit adaptation capabilities
 */
export declare class ComplexityAnalyzer {
    private config;
    constructor(config?: Partial<ComplexityAuditConfig>);
    /**
     * Analyze code complexity and calculate metrics
     */
    analyzeComplexity(context: CodeAnalysisContext): Promise<ComplexityMetrics>;
    /**
     * Adjust audit depth based on complexity metrics
     */
    adjustAuditDepth(metrics: ComplexityMetrics, context: CodeAnalysisContext): AuditDepthAdjustment;
    /**
     * Calculate comprehensive complexity metrics
     */
    private calculateComplexityMetrics;
    /**
     * Calculate lines of code (excluding comments and empty lines)
     */
    private calculateLinesOfCode;
    /**
     * Calculate function count based on language
     */
    private calculateFunctionCount;
    /**
     * Calculate class count based on language
     */
    private calculateClassCount;
    /**
     * Calculate maximum nesting depth
     */
    private calculateNestingDepth;
    /**
     * Calculate dependency count
     */
    private calculateDependencyCount;
    /**
     * Calculate cyclomatic complexity
     */
    private calculateCyclomaticComplexity;
    /**
     * Calculate cognitive complexity
     */
    private calculateCognitiveComplexity;
    /**
     * Calculate Halstead complexity metrics
     */
    private calculateHalsteadMetrics;
    /**
     * Calculate overall complexity score (0-100)
     */
    private calculateOverallComplexity;
    /**
     * Determine audit depth based on complexity
     */
    private determineAuditDepth;
    /**
     * Calculate timeout based on complexity
     */
    private calculateTimeout;
    /**
     * Prioritize focus areas based on complexity
     */
    private prioritizeFocusAreas;
    /**
     * Generate complexity-based recommendations
     */
    private generateComplexityRecommendations;
    /**
     * Generate justification for audit adjustments
     */
    private generateJustification;
    private getFunctionPatterns;
    private getClassPatterns;
    private getImportPatterns;
    private getComplexityPatterns;
    private getOperators;
    private getOperands;
    private isKeyword;
}
/**
 * Create a complexity analyzer with default configuration
 */
export declare function createComplexityAnalyzer(config?: Partial<ComplexityAuditConfig>): ComplexityAnalyzer;
/**
 * Validate complexity metrics
 */
export declare function validateComplexityMetrics(metrics: ComplexityMetrics): boolean;
//# sourceMappingURL=complexity-analyzer.d.ts.map