/**
 * Performance Assessment (10% weight)
 *
 * This module implements the performance assessment as specified
 * in requirement 3.5. It evaluates:
 * - Performance bottleneck detection
 * - Algorithm efficiency analysis
 * - Resource management validation
 * - Caching opportunity identification
 */
import type { QualityCriterion, CriterionEvaluation, QualityEvaluationContext } from '../quality-assessment.js';
/**
 * Performance bottleneck detection result
 */
export interface PerformanceBottleneckResult {
    /** Overall performance score (0-100) */
    overallScore: number;
    /** Bottleneck analysis */
    bottleneckAnalysis: BottleneckAnalysis;
    /** Critical path analysis */
    criticalPathAnalysis: CriticalPathAnalysis;
    /** Performance violations */
    violations: PerformanceViolation[];
}
/**
 * Bottleneck analysis
 */
export interface BottleneckAnalysis {
    /** Total bottlenecks detected */
    totalBottlenecks: number;
    /** Bottlenecks by severity */
    bottlenecksBySeverity: Record<string, number>;
    /** Bottleneck details */
    bottleneckDetails: BottleneckDetail[];
    /** Performance hotspots */
    hotspots: PerformanceHotspot[];
}
/**
 * Bottleneck detail
 */
export interface BottleneckDetail {
    /** Bottleneck identifier */
    id: string;
    /** Location in code */
    location: CodeLocation;
    /** Bottleneck type */
    type: "cpu_intensive" | "memory_intensive" | "io_bound" | "network_bound" | "database_query" | "synchronous_operation";
    /** Severity level */
    severity: "Critical" | "High" | "Medium" | "Low";
    /** Performance impact */
    impact: PerformanceImpact;
    /** Suggested optimizations */
    optimizations: string[];
}
/**
 * Code location
 */
export interface CodeLocation {
    /** File path */
    filePath: string;
    /** Function or method name */
    functionName: string;
    /** Line number */
    lineNumber: number;
    /** Code snippet */
    codeSnippet: string;
}
/**
 * Performance impact
 */
export interface PerformanceImpact {
    /** Estimated execution time (ms) */
    executionTime: number;
    /** Memory usage (MB) */
    memoryUsage: number;
    /** CPU utilization percentage */
    cpuUtilization: number;
    /** Scalability impact */
    scalabilityImpact: "High" | "Medium" | "Low";
}
/**
 * Performance hotspot
 */
export interface PerformanceHotspot {
    /** Hotspot name */
    name: string;
    /** Location */
    location: CodeLocation;
    /** Performance metrics */
    metrics: PerformanceMetrics;
    /** Optimization potential */
    optimizationPotential: number;
}
/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    /** Average response time (ms) */
    averageResponseTime: number;
    /** Peak response time (ms) */
    peakResponseTime: number;
    /** Throughput (operations/second) */
    throughput: number;
    /** Resource utilization */
    resourceUtilization: ResourceUtilization;
}
/**
 * Resource utilization
 */
export interface ResourceUtilization {
    /** CPU usage percentage */
    cpu: number;
    /** Memory usage (MB) */
    memory: number;
    /** I/O operations per second */
    iops: number;
    /** Network bandwidth (MB/s) */
    networkBandwidth: number;
}
/**
 * Critical path analysis
 */
export interface CriticalPathAnalysis {
    /** Critical path timing */
    criticalPathTiming: CriticalPathTiming;
    /** Path optimization opportunities */
    optimizationOpportunities: OptimizationOpportunity[];
    /** Dependency analysis */
    dependencyAnalysis: DependencyAnalysis;
}
/**
 * Critical path timing
 */
export interface CriticalPathTiming {
    /** Total critical path time (ms) */
    totalTime: number;
    /** Path segments */
    segments: PathSegment[];
    /** Bottleneck segments */
    bottleneckSegments: PathSegment[];
}
/**
 * Path segment
 */
export interface PathSegment {
    /** Segment name */
    name: string;
    /** Execution time (ms) */
    executionTime: number;
    /** Percentage of total path time */
    percentageOfTotal: number;
    /** Optimization potential */
    optimizable: boolean;
}
/**
 * Optimization opportunity
 */
export interface OptimizationOpportunity {
    /** Opportunity type */
    type: "parallelization" | "caching" | "algorithm_improvement" | "resource_optimization" | "lazy_loading";
    /** Potential improvement percentage */
    potentialImprovement: number;
    /** Implementation complexity */
    complexity: "Low" | "Medium" | "High";
    /** Affected components */
    affectedComponents: string[];
}
/**
 * Dependency analysis
 */
export interface DependencyAnalysis {
    /** Synchronous dependencies */
    synchronousDependencies: number;
    /** Asynchronous dependencies */
    asynchronousDependencies: number;
    /** Parallelization opportunities */
    parallelizationOpportunities: ParallelizationOpportunity[];
}
/**
 * Parallelization opportunity
 */
export interface ParallelizationOpportunity {
    /** Operation name */
    operationName: string;
    /** Current execution pattern */
    currentPattern: "sequential" | "partially_parallel" | "synchronous";
    /** Recommended pattern */
    recommendedPattern: "parallel" | "async" | "batch";
    /** Potential speedup */
    potentialSpeedup: number;
}
/**
 * Performance violation
 */
export interface PerformanceViolation {
    /** Violation type */
    type: "slow_operation" | "memory_leak" | "inefficient_algorithm" | "blocking_operation" | "resource_waste";
    /** Location */
    location: CodeLocation;
    /** Description */
    description: string;
    /** Severity */
    severity: "Critical" | "High" | "Medium" | "Low";
    /** Performance impact */
    impact: string;
    /** Remediation steps */
    remediation: string[];
}
/**
 * Algorithm efficiency analysis result
 */
export interface AlgorithmEfficiencyResult {
    /** Overall efficiency score (0-100) */
    overallScore: number;
    /** Complexity analysis */
    complexityAnalysis: ComplexityAnalysis;
    /** Data structure analysis */
    dataStructureAnalysis: DataStructureAnalysis;
    /** Algorithm recommendations */
    recommendations: AlgorithmRecommendation[];
}
/**
 * Complexity analysis
 */
export interface ComplexityAnalysis {
    /** Functions analyzed */
    functionsAnalyzed: number;
    /** Average time complexity */
    averageTimeComplexity: string;
    /** Average space complexity */
    averageSpaceComplexity: string;
    /** Complexity details */
    complexityDetails: ComplexityDetail[];
    /** Inefficient algorithms */
    inefficientAlgorithms: InefficientAlgorithm[];
}
/**
 * Complexity detail
 */
export interface ComplexityDetail {
    /** Function name */
    functionName: string;
    /** File path */
    filePath: string;
    /** Time complexity */
    timeComplexity: string;
    /** Space complexity */
    spaceComplexity: string;
    /** Complexity rating */
    rating: "Excellent" | "Good" | "Fair" | "Poor";
    /** Input size impact */
    inputSizeImpact: "Linear" | "Logarithmic" | "Quadratic" | "Exponential" | "Constant";
}
/**
 * Inefficient algorithm
 */
export interface InefficientAlgorithm {
    /** Function name */
    functionName: string;
    /** Current complexity */
    currentComplexity: string;
    /** Recommended complexity */
    recommendedComplexity: string;
    /** Improvement suggestion */
    improvementSuggestion: string;
    /** Performance gain estimate */
    performanceGain: string;
}
/**
 * Data structure analysis
 */
export interface DataStructureAnalysis {
    /** Data structures used */
    dataStructuresUsed: DataStructureUsage[];
    /** Efficiency score */
    efficiencyScore: number;
    /** Optimization opportunities */
    optimizationOpportunities: DataStructureOptimization[];
}
/**
 * Data structure usage
 */
export interface DataStructureUsage {
    /** Data structure type */
    type: "array" | "object" | "map" | "set" | "list" | "tree" | "graph" | "queue" | "stack";
    /** Usage count */
    usageCount: number;
    /** Efficiency rating */
    efficiencyRating: number;
    /** Common operations */
    commonOperations: string[];
    /** Performance characteristics */
    performanceCharacteristics: OperationComplexity[];
}
/**
 * Operation complexity
 */
export interface OperationComplexity {
    /** Operation name */
    operation: string;
    /** Time complexity */
    timeComplexity: string;
    /** Space complexity */
    spaceComplexity: string;
}
/**
 * Data structure optimization
 */
export interface DataStructureOptimization {
    /** Current structure */
    currentStructure: string;
    /** Recommended structure */
    recommendedStructure: string;
    /** Use case */
    useCase: string;
    /** Performance improvement */
    performanceImprovement: string;
    /** Implementation effort */
    implementationEffort: "Low" | "Medium" | "High";
}
/**
 * Algorithm recommendation
 */
export interface AlgorithmRecommendation {
    /** Function or area */
    target: string;
    /** Current approach */
    currentApproach: string;
    /** Recommended approach */
    recommendedApproach: string;
    /** Justification */
    justification: string;
    /** Expected improvement */
    expectedImprovement: string;
    /** Implementation complexity */
    implementationComplexity: "Low" | "Medium" | "High";
}
/**
 * Resource management validation result
 */
export interface ResourceManagementResult {
    /** Overall management score (0-100) */
    overallScore: number;
    /** Memory management analysis */
    memoryManagement: MemoryManagementAnalysis;
    /** Resource cleanup analysis */
    resourceCleanup: ResourceCleanupAnalysis;
    /** Leak prevention analysis */
    leakPrevention: LeakPreventionAnalysis;
    /** Management violations */
    violations: ResourceViolation[];
}
/**
 * Memory management analysis
 */
export interface MemoryManagementAnalysis {
    /** Memory efficiency score */
    efficiencyScore: number;
    /** Memory usage patterns */
    usagePatterns: MemoryUsagePattern[];
    /** Memory optimization opportunities */
    optimizationOpportunities: MemoryOptimization[];
    /** Memory-intensive operations */
    intensiveOperations: MemoryIntensiveOperation[];
}
/**
 * Memory usage pattern
 */
export interface MemoryUsagePattern {
    /** Pattern type */
    type: "allocation_heavy" | "long_lived_objects" | "frequent_gc" | "memory_pooling" | "streaming";
    /** Frequency */
    frequency: number;
    /** Memory impact */
    memoryImpact: "High" | "Medium" | "Low";
    /** Optimization potential */
    optimizationPotential: number;
}
/**
 * Memory optimization
 */
export interface MemoryOptimization {
    /** Optimization type */
    type: "object_pooling" | "lazy_loading" | "memory_streaming" | "garbage_collection_tuning" | "data_structure_optimization";
    /** Potential memory savings */
    potentialSavings: string;
    /** Implementation effort */
    implementationEffort: "Low" | "Medium" | "High";
    /** Affected areas */
    affectedAreas: string[];
}
/**
 * Memory-intensive operation
 */
export interface MemoryIntensiveOperation {
    /** Operation name */
    operationName: string;
    /** Memory usage (MB) */
    memoryUsage: number;
    /** Duration (ms) */
    duration: number;
    /** Optimization suggestions */
    optimizationSuggestions: string[];
}
/**
 * Resource cleanup analysis
 */
export interface ResourceCleanupAnalysis {
    /** Cleanup compliance score */
    complianceScore: number;
    /** Resource types tracked */
    resourceTypes: ResourceTypeTracking[];
    /** Cleanup violations */
    cleanupViolations: CleanupViolation[];
    /** Best practices adherence */
    bestPracticesAdherence: number;
}
/**
 * Resource type tracking
 */
export interface ResourceTypeTracking {
    /** Resource type */
    type: "file_handles" | "database_connections" | "network_sockets" | "timers" | "event_listeners" | "memory_buffers";
    /** Total allocations */
    totalAllocations: number;
    /** Proper cleanups */
    properCleanups: number;
    /** Cleanup percentage */
    cleanupPercentage: number;
    /** Leak risk */
    leakRisk: "High" | "Medium" | "Low";
}
/**
 * Cleanup violation
 */
export interface CleanupViolation {
    /** Resource type */
    resourceType: string;
    /** Location */
    location: CodeLocation;
    /** Violation description */
    description: string;
    /** Potential impact */
    impact: string;
    /** Remediation */
    remediation: string;
}
/**
 * Leak prevention analysis
 */
export interface LeakPreventionAnalysis {
    /** Prevention score */
    preventionScore: number;
    /** Leak detection mechanisms */
    detectionMechanisms: LeakDetectionMechanism[];
    /** Potential leak sources */
    potentialLeakSources: PotentialLeakSource[];
    /** Prevention strategies */
    preventionStrategies: PreventionStrategy[];
}
/**
 * Leak detection mechanism
 */
export interface LeakDetectionMechanism {
    /** Mechanism type */
    type: "reference_counting" | "weak_references" | "resource_tracking" | "monitoring" | "automated_cleanup";
    /** Implementation quality */
    quality: number;
    /** Coverage */
    coverage: string[];
    /** Effectiveness */
    effectiveness: number;
}
/**
 * Potential leak source
 */
export interface PotentialLeakSource {
    /** Source type */
    type: "circular_references" | "event_listeners" | "timers" | "closures" | "global_references";
    /** Location */
    location: CodeLocation;
    /** Risk level */
    riskLevel: "High" | "Medium" | "Low";
    /** Mitigation */
    mitigation: string;
}
/**
 * Prevention strategy
 */
export interface PreventionStrategy {
    /** Strategy name */
    name: string;
    /** Implementation status */
    implemented: boolean;
    /** Effectiveness */
    effectiveness: number;
    /** Implementation effort */
    implementationEffort: "Low" | "Medium" | "High";
}
/**
 * Resource violation
 */
export interface ResourceViolation {
    /** Violation type */
    type: "memory_leak" | "resource_leak" | "inefficient_allocation" | "missing_cleanup" | "excessive_usage";
    /** Location */
    location: CodeLocation;
    /** Description */
    description: string;
    /** Severity */
    severity: "Critical" | "High" | "Medium" | "Low";
    /** Impact */
    impact: string;
    /** Remediation steps */
    remediation: string[];
}
/**
 * Caching opportunity identification result
 */
export interface CachingOpportunityResult {
    /** Overall caching score (0-100) */
    overallScore: number;
    /** Caching strategy analysis */
    cachingStrategy: CachingStrategyAnalysis;
    /** Cache invalidation analysis */
    cacheInvalidation: CacheInvalidationAnalysis;
    /** Performance improvement potential */
    performanceImprovement: PerformanceImprovementAnalysis;
    /** Caching recommendations */
    recommendations: CachingRecommendation[];
}
/**
 * Caching strategy analysis
 */
export interface CachingStrategyAnalysis {
    /** Current caching usage */
    currentUsage: CachingUsage;
    /** Caching opportunities */
    opportunities: CachingOpportunity[];
    /** Strategy effectiveness */
    strategyEffectiveness: number;
}
/**
 * Caching usage
 */
export interface CachingUsage {
    /** Total cacheable operations */
    totalCacheableOperations: number;
    /** Currently cached operations */
    currentlyCachedOperations: number;
    /** Caching coverage percentage */
    coveragePercentage: number;
    /** Cache types used */
    cacheTypesUsed: CacheTypeUsage[];
}
/**
 * Cache type usage
 */
export interface CacheTypeUsage {
    /** Cache type */
    type: "memory_cache" | "disk_cache" | "distributed_cache" | "browser_cache" | "database_cache" | "cdn_cache";
    /** Usage count */
    usageCount: number;
    /** Effectiveness */
    effectiveness: number;
    /** Hit rate */
    hitRate: number;
}
/**
 * Caching opportunity
 */
export interface CachingOpportunity {
    /** Operation name */
    operationName: string;
    /** Location */
    location: CodeLocation;
    /** Opportunity type */
    type: "expensive_computation" | "database_query" | "api_call" | "file_read" | "data_transformation";
    /** Potential performance gain */
    potentialGain: string;
    /** Cache strategy recommendation */
    recommendedStrategy: string;
    /** Implementation complexity */
    implementationComplexity: "Low" | "Medium" | "High";
}
/**
 * Cache invalidation analysis
 */
export interface CacheInvalidationAnalysis {
    /** Invalidation strategy score */
    strategyScore: number;
    /** Invalidation mechanisms */
    mechanisms: InvalidationMechanism[];
    /** Consistency guarantees */
    consistencyGuarantees: ConsistencyGuarantee[];
}
/**
 * Invalidation mechanism
 */
export interface InvalidationMechanism {
    /** Mechanism type */
    type: "time_based" | "event_based" | "manual" | "dependency_based" | "version_based";
    /** Implementation quality */
    quality: number;
    /** Reliability */
    reliability: number;
    /** Performance impact */
    performanceImpact: "Low" | "Medium" | "High";
}
/**
 * Consistency guarantee
 */
export interface ConsistencyGuarantee {
    /** Consistency level */
    level: "strong" | "eventual" | "weak" | "none";
    /** Data types covered */
    dataTypesCovered: string[];
    /** Guarantee reliability */
    reliability: number;
}
/**
 * Performance improvement analysis
 */
export interface PerformanceImprovementAnalysis {
    /** Potential response time improvement */
    responseTimeImprovement: string;
    /** Potential throughput improvement */
    throughputImprovement: string;
    /** Resource usage reduction */
    resourceUsageReduction: string;
    /** Scalability benefits */
    scalabilityBenefits: string[];
}
/**
 * Caching recommendation
 */
export interface CachingRecommendation {
    /** Target operation */
    target: string;
    /** Recommended cache type */
    recommendedCacheType: string;
    /** Cache configuration */
    cacheConfiguration: CacheConfiguration;
    /** Expected benefits */
    expectedBenefits: string[];
    /** Implementation steps */
    implementationSteps: string[];
}
/**
 * Cache configuration
 */
export interface CacheConfiguration {
    /** Cache size */
    size: string;
    /** TTL (time to live) */
    ttl: string;
    /** Eviction policy */
    evictionPolicy: string;
    /** Invalidation strategy */
    invalidationStrategy: string;
}
/**
 * Assessor for performance quality dimension
 */
export declare class PerformanceAssessor {
    /**
     * Evaluate performance bottleneck detection criterion
     */
    evaluatePerformanceBottleneckDetection(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate algorithm efficiency analysis criterion
     */
    evaluateAlgorithmEfficiencyAnalysis(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate resource management validation criterion
     */
    evaluateResourceManagementValidation(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate caching opportunity identification criterion
     */
    evaluateCachingOpportunityIdentification(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Analyze performance bottlenecks
     */
    private analyzePerformanceBottlenecks;
    /**
     * Analyze algorithm efficiency
     */
    private analyzeAlgorithmEfficiency;
    /**
     * Analyze resource management
     */
    private analyzeResourceManagement;
    /**
     * Analyze caching opportunities
     */
    private analyzeCachingOpportunities;
}
/**
 * Create a performance assessor
 */
export declare function createPerformanceAssessor(): PerformanceAssessor;
//# sourceMappingURL=performance-assessor.d.ts.map