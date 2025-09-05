/**
 * Core data types and interfaces for GansAuditor_Codex
 *
 * This module defines the TypeScript interfaces for GansAuditor_Codex audit types,
 * session management, and enhanced response formats as specified in
 * requirements 1.1, 2.1, and 5.1.
 */
// ============================================================================
// Default Values and Constants
// ============================================================================
/**
 * Default session configuration values
 */
export const DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG = {
    task: "Audit and improve the provided candidate",
    scope: "diff",
    threshold: 85,
    maxCycles: 1,
    candidates: 1,
    judges: ["internal"],
    applyFixes: false,
};
/**
 * Default audit rubric with standard code quality dimensions
 */
export const DEFAULT_AUDIT_RUBRIC = {
    dimensions: [
        { name: "accuracy", weight: 0.25, description: "Correctness and functionality" },
        { name: "completeness", weight: 0.20, description: "Feature completeness and coverage" },
        { name: "clarity", weight: 0.20, description: "Code readability and maintainability" },
        { name: "actionability", weight: 0.20, description: "Practical improvement suggestions" },
        { name: "human_likeness", weight: 0.15, description: "Natural and idiomatic code style" },
    ],
};
/**
 * Configuration validation constraints
 */
export const CONFIG_CONSTRAINTS = {
    THRESHOLD_MIN: 0,
    THRESHOLD_MAX: 100,
    MAX_CYCLES_MIN: 1,
    MAX_CYCLES_MAX: 10,
    CANDIDATES_MIN: 1,
    CANDIDATES_MAX: 5,
};
// Legacy constant aliases
export const DEFAULT_SESSION_CONFIG = DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG;
//# sourceMappingURL=gan-types.js.map