/**
 * Enhanced response types for synchronous audit workflow
 *
 * This module defines the enhanced response types specifically for the synchronous
 * audit workflow, including structured feedback, completion status, and loop information.
 *
 * Requirements addressed:
 * - 5.1: Detailed feedback format with improvement suggestions
 * - 5.2: Critical issue categorization and next steps guidance
 * - 5.3: Completion status and loop information in responses
 * - 5.4: Structured feedback format for LLM consumption
 */
// ============================================================================
// Enumeration Types
// ============================================================================
/**
 * Categories for improvement suggestions and issues
 */
export var IssueCategory;
(function (IssueCategory) {
    IssueCategory["SECURITY"] = "security";
    IssueCategory["PERFORMANCE"] = "performance";
    IssueCategory["STYLE"] = "style";
    IssueCategory["LOGIC"] = "logic";
    IssueCategory["ERROR_HANDLING"] = "error_handling";
    IssueCategory["MAINTAINABILITY"] = "maintainability";
    IssueCategory["TESTING"] = "testing";
    IssueCategory["DOCUMENTATION"] = "documentation";
    IssueCategory["ARCHITECTURE"] = "architecture";
    IssueCategory["COMPATIBILITY"] = "compatibility";
})(IssueCategory || (IssueCategory = {}));
/**
 * Priority levels for improvements and issues
 */
export var Priority;
(function (Priority) {
    Priority["CRITICAL"] = "critical";
    Priority["HIGH"] = "high";
    Priority["MEDIUM"] = "medium";
    Priority["LOW"] = "low";
})(Priority || (Priority = {}));
/**
 * Severity levels for critical issues
 */
export var Severity;
(function (Severity) {
    Severity["BLOCKER"] = "blocker";
    Severity["CRITICAL"] = "critical";
    Severity["MAJOR"] = "major";
    Severity["MINOR"] = "minor";
})(Severity || (Severity = {}));
/**
 * Types of critical issues
 */
export var CriticalIssueType;
(function (CriticalIssueType) {
    CriticalIssueType["SECURITY_VULNERABILITY"] = "security_vulnerability";
    CriticalIssueType["LOGIC_ERROR"] = "logic_error";
    CriticalIssueType["PERFORMANCE_BOTTLENECK"] = "performance_bottleneck";
    CriticalIssueType["COMPATIBILITY_ISSUE"] = "compatibility_issue";
    CriticalIssueType["DATA_CORRUPTION_RISK"] = "data_corruption_risk";
    CriticalIssueType["RESOURCE_LEAK"] = "resource_leak";
    CriticalIssueType["INFINITE_LOOP"] = "infinite_loop";
    CriticalIssueType["NULL_POINTER"] = "null_pointer";
    CriticalIssueType["RACE_CONDITION"] = "race_condition";
    CriticalIssueType["DEADLOCK_RISK"] = "deadlock_risk";
})(CriticalIssueType || (CriticalIssueType = {}));
/**
 * Progress trend indicators
 */
export var ProgressTrend;
(function (ProgressTrend) {
    ProgressTrend["IMPROVING"] = "improving";
    ProgressTrend["STAGNANT"] = "stagnant";
    ProgressTrend["DECLINING"] = "declining";
    ProgressTrend["OSCILLATING"] = "oscillating";
})(ProgressTrend || (ProgressTrend = {}));
/**
 * Levels of feedback detail
 */
export var FeedbackDetailLevel;
(function (FeedbackDetailLevel) {
    FeedbackDetailLevel["MINIMAL"] = "minimal";
    FeedbackDetailLevel["STANDARD"] = "standard";
    FeedbackDetailLevel["DETAILED"] = "detailed";
    FeedbackDetailLevel["COMPREHENSIVE"] = "comprehensive";
})(FeedbackDetailLevel || (FeedbackDetailLevel = {}));
/**
 * Default configuration for enhanced responses
 */
export const DEFAULT_ENHANCED_RESPONSE_CONFIG = {
    includeDetailedFeedback: true,
    includeLoopInfo: true,
    includeSessionMetadata: true,
    maxImprovements: 10,
    maxCriticalIssues: 5,
    maxNextSteps: 5,
    feedbackDetailLevel: FeedbackDetailLevel.STANDARD,
};
// ============================================================================
// Type Guards
// ============================================================================
/**
 * Type guard for synchronous enhanced response
 */
export function isSynchronousEnhancedResponse(obj) {
    return (obj &&
        typeof obj === 'object' &&
        typeof obj.thoughtNumber === 'number' &&
        typeof obj.totalThoughts === 'number' &&
        typeof obj.nextThoughtNeeded === 'boolean' &&
        Array.isArray(obj.branches) &&
        typeof obj.thoughtHistoryLength === 'number');
}
/**
 * Type guard for structured feedback
 */
export function isStructuredFeedback(obj) {
    return (obj &&
        typeof obj === 'object' &&
        typeof obj.summary === 'string' &&
        Array.isArray(obj.improvements) &&
        Array.isArray(obj.criticalIssues) &&
        Array.isArray(obj.nextSteps) &&
        obj.progressAssessment &&
        typeof obj.progressAssessment === 'object');
}
/**
 * Type guard for completion status
 */
export function isCompletionStatus(obj) {
    return (obj &&
        typeof obj === 'object' &&
        typeof obj.isComplete === 'boolean' &&
        typeof obj.reason === 'string' &&
        typeof obj.currentLoop === 'number' &&
        typeof obj.score === 'number' &&
        typeof obj.threshold === 'number' &&
        typeof obj.message === 'string' &&
        typeof obj.progressPercentage === 'number');
}
/**
 * Type guard for loop info
 */
export function isLoopInfo(obj) {
    return (obj &&
        typeof obj === 'object' &&
        typeof obj.currentLoop === 'number' &&
        typeof obj.maxLoops === 'number' &&
        typeof obj.progressTrend === 'string' &&
        typeof obj.stagnationDetected === 'boolean' &&
        Array.isArray(obj.scoreProgression) &&
        typeof obj.averageImprovement === 'number' &&
        typeof obj.loopsRemaining === 'number');
}
//# sourceMappingURL=synchronous-response-types.js.map