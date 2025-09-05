/**
 * Output Sanitizer for GAN Auditor System Prompt
 *
 * This module implements output sanitization and security with PII detection,
 * sensitive data placeholder replacement, tool syntax hiding, and secret masking
 * as specified in requirement 5.7.
 *
 * Requirements addressed:
 * - 5.7: Output sanitization and security
 * - Implement PII detection and sanitization
 * - Add sensitive data placeholder replacement
 * - Create tool syntax hiding
 * - Add secret detection and masking
 */
import type { SanitizationResult, SanitizationLevel, SanitizationType, PIIPattern, StructuredFeedbackOutput } from '../../types/feedback-types.js';
/**
 * Configuration for output sanitization
 */
export interface OutputSanitizerConfig {
    /** Sanitization level */
    sanitizationLevel: SanitizationLevel;
    /** PII detection patterns */
    piiPatterns: PIIPattern[];
    /** Secret detection patterns */
    secretPatterns: SecretPattern[];
    /** Tool syntax patterns to hide */
    toolSyntaxPatterns: ToolSyntaxPattern[];
    /** Path anonymization settings */
    pathAnonymization: PathAnonymizationConfig;
    /** Content filtering settings */
    contentFiltering: ContentFilteringConfig;
}
/**
 * Secret detection pattern
 */
export interface SecretPattern {
    /** Pattern name */
    name: string;
    /** Regular expression */
    pattern: RegExp;
    /** Replacement value */
    replacement: string;
    /** Confidence threshold */
    confidenceThreshold: number;
    /** Pattern category */
    category: SecretCategory;
}
/**
 * Secret category enumeration
 */
export type SecretCategory = "api_key" | "password" | "token" | "certificate" | "connection_string" | "credential";
/**
 * Tool syntax pattern
 */
export interface ToolSyntaxPattern {
    /** Pattern name */
    name: string;
    /** Regular expression */
    pattern: RegExp;
    /** Replacement value */
    replacement: string;
    /** Whether to preserve functionality */
    preserveFunctionality: boolean;
}
/**
 * Path anonymization configuration
 */
export interface PathAnonymizationConfig {
    /** Enable path anonymization */
    enabled: boolean;
    /** Preserve relative paths */
    preserveRelativePaths: boolean;
    /** Anonymize user directories */
    anonymizeUserDirectories: boolean;
    /** Maximum path depth to show */
    maxPathDepth: number;
}
/**
 * Content filtering configuration
 */
export interface ContentFilteringConfig {
    /** Remove debug information */
    removeDebugInfo: boolean;
    /** Remove internal comments */
    removeInternalComments: boolean;
    /** Sanitize error messages */
    sanitizeErrorMessages: boolean;
    /** Remove stack traces */
    removeStackTraces: boolean;
}
/**
 * Sanitization context
 */
export interface SanitizationContext {
    /** Content type being sanitized */
    contentType: string;
    /** Source of the content */
    source: string;
    /** Target audience */
    audience: "internal" | "external" | "public";
    /** Sanitization requirements */
    requirements: SanitizationRequirement[];
}
/**
 * Sanitization requirement
 */
export interface SanitizationRequirement {
    /** Requirement type */
    type: SanitizationType;
    /** Requirement level */
    level: "required" | "recommended" | "optional";
    /** Custom patterns */
    customPatterns?: RegExp[];
}
/**
 * Sanitizes output content to remove PII, secrets, and sensitive information
 */
export declare class OutputSanitizer {
    private config;
    constructor(config?: Partial<OutputSanitizerConfig>);
    /**
     * Sanitize structured feedback output
     */
    sanitizeStructuredOutput(output: StructuredFeedbackOutput, context?: SanitizationContext): Promise<StructuredFeedbackOutput>;
    /**
     * Sanitize text content
     */
    sanitizeText(content: string, context?: SanitizationContext): Promise<SanitizationResult>;
    /**
     * Sanitize PII from content
     */
    private sanitizePII;
    /**
     * Sanitize secrets from content
     */
    private sanitizeSecrets;
    /**
     * Hide tool syntax from content
     */
    private hideToolSyntax;
    /**
     * Anonymize file paths
     */
    private anonymizePaths;
    /**
     * Filter sensitive content
     */
    private filterContent;
    /**
     * Sanitize individual components
     */
    private sanitizeExecutiveVerdict;
    private sanitizeEvidenceTable;
    private sanitizeProposedDiffs;
    private sanitizeReproductionGuide;
    private sanitizeTraceabilityMatrix;
    private sanitizeFollowUpTasks;
    private calculatePIIConfidence;
    private calculateSecretConfidence;
    private findMatchLocation;
    private anonymizePath;
    private generateSanitizationMetadata;
    private generateWarnings;
    private generateSanitizationResults;
}
/**
 * Default configuration for output sanitization
 */
export declare const DEFAULT_OUTPUT_SANITIZER_CONFIG: OutputSanitizerConfig;
/**
 * Create output sanitizer with default configuration
 */
export declare function createOutputSanitizer(config?: Partial<OutputSanitizerConfig>): OutputSanitizer;
/**
 * Validate sanitization result structure
 */
export declare function validateSanitizationResult(result: SanitizationResult): string[];
//# sourceMappingURL=output-sanitizer.d.ts.map