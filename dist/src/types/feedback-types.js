/**
 * Structured Output and Evidence-Based Feedback Types for GAN Auditor System Prompt
 *
 * This module defines the types and interfaces for the structured output and
 * evidence-based feedback system as specified in requirements 5.1-5.7.
 *
 * Requirements addressed:
 * - 5.1: Executive verdict generation with ship/no-ship decision
 * - 5.2: Evidence table generation with structured format
 * - 5.3: Proposed diff generation for specific fixes
 * - 5.4: Reproduction and verification guide
 * - 5.5: Traceability matrix generation
 * - 5.6: Follow-up task generation
 * - 5.7: Output sanitization and security
 */
// ============================================================================
// Default Values and Constants
// ============================================================================
/**
 * Default sanitization patterns for PII detection
 */
export const DEFAULT_PII_PATTERNS = [
    {
        name: "email",
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: "[email]",
        confidenceThreshold: 0.9
    },
    {
        name: "phone",
        pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        replacement: "[phone_number]",
        confidenceThreshold: 0.8
    },
    {
        name: "ssn",
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: "[ssn]",
        confidenceThreshold: 0.95
    },
    {
        name: "credit_card",
        pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        replacement: "[credit_card]",
        confidenceThreshold: 0.85
    }
];
/**
 * Default severity level weights for prioritization
 */
export const SEVERITY_WEIGHTS = {
    "Critical": 100,
    "Major": 75,
    "Minor": 25
};
/**
 * Default priority level weights for task ordering
 */
export const PRIORITY_WEIGHTS = {
    "critical": 1000,
    "high": 100,
    "medium": 10,
    "low": 1
};
//# sourceMappingURL=feedback-types.js.map