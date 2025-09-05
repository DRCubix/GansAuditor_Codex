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
// ============================================================================
// Output Sanitizer Implementation
// ============================================================================
/**
 * Sanitizes output content to remove PII, secrets, and sensitive information
 */
export class OutputSanitizer {
    config;
    constructor(config) {
        this.config = {
            ...DEFAULT_OUTPUT_SANITIZER_CONFIG,
            ...config
        };
    }
    /**
     * Sanitize structured feedback output
     */
    async sanitizeStructuredOutput(output, context) {
        const sanitizedOutput = JSON.parse(JSON.stringify(output)); // Deep clone
        // Sanitize each component
        sanitizedOutput.executiveVerdict = await this.sanitizeExecutiveVerdict(sanitizedOutput.executiveVerdict, context);
        sanitizedOutput.evidenceTable = await this.sanitizeEvidenceTable(sanitizedOutput.evidenceTable, context);
        sanitizedOutput.proposedDiffs = await this.sanitizeProposedDiffs(sanitizedOutput.proposedDiffs, context);
        sanitizedOutput.reproductionGuide = await this.sanitizeReproductionGuide(sanitizedOutput.reproductionGuide, context);
        sanitizedOutput.traceabilityMatrix = await this.sanitizeTraceabilityMatrix(sanitizedOutput.traceabilityMatrix, context);
        sanitizedOutput.followUpTasks = await this.sanitizeFollowUpTasks(sanitizedOutput.followUpTasks, context);
        // Generate sanitization results
        const sanitizationResults = await this.generateSanitizationResults(JSON.stringify(output), JSON.stringify(sanitizedOutput), context);
        sanitizedOutput.sanitizationResults = sanitizationResults;
        return sanitizedOutput;
    }
    /**
     * Sanitize text content
     */
    async sanitizeText(content, context) {
        const actions = [];
        let sanitizedContent = content;
        // Apply PII sanitization
        const piiResult = await this.sanitizePII(sanitizedContent, context);
        sanitizedContent = piiResult.sanitizedContent;
        actions.push(...piiResult.actions);
        // Apply secret sanitization
        const secretResult = await this.sanitizeSecrets(sanitizedContent, context);
        sanitizedContent = secretResult.sanitizedContent;
        actions.push(...secretResult.actions);
        // Apply tool syntax hiding
        const toolSyntaxResult = await this.hideToolSyntax(sanitizedContent, context);
        sanitizedContent = toolSyntaxResult.sanitizedContent;
        actions.push(...toolSyntaxResult.actions);
        // Apply path anonymization
        const pathResult = await this.anonymizePaths(sanitizedContent, context);
        sanitizedContent = pathResult.sanitizedContent;
        actions.push(...pathResult.actions);
        // Apply content filtering
        const filterResult = await this.filterContent(sanitizedContent, context);
        sanitizedContent = filterResult.sanitizedContent;
        actions.push(...filterResult.actions);
        // Generate metadata
        const metadata = this.generateSanitizationMetadata(context);
        return {
            metadata,
            originalContent: content,
            sanitizedContent,
            actions,
            warnings: this.generateWarnings(actions)
        };
    }
    /**
     * Sanitize PII from content
     */
    async sanitizePII(content, context) {
        let sanitizedContent = content;
        const actions = [];
        for (const pattern of this.config.piiPatterns) {
            const matches = content.match(pattern.pattern);
            if (matches) {
                for (const match of matches) {
                    const confidence = this.calculatePIIConfidence(match, pattern);
                    if (confidence >= pattern.confidenceThreshold) {
                        sanitizedContent = sanitizedContent.replace(pattern.pattern, pattern.replacement);
                        actions.push({
                            type: "pii_detection",
                            description: `Detected and replaced ${pattern.name}`,
                            location: this.findMatchLocation(content, match),
                            replacement: pattern.replacement,
                            confidence
                        });
                    }
                }
            }
        }
        return { sanitizedContent, actions };
    }
    /**
     * Sanitize secrets from content
     */
    async sanitizeSecrets(content, context) {
        let sanitizedContent = content;
        const actions = [];
        for (const pattern of this.config.secretPatterns) {
            const matches = content.match(pattern.pattern);
            if (matches) {
                for (const match of matches) {
                    const confidence = this.calculateSecretConfidence(match, pattern);
                    if (confidence >= pattern.confidenceThreshold) {
                        sanitizedContent = sanitizedContent.replace(pattern.pattern, pattern.replacement);
                        actions.push({
                            type: "secret_masking",
                            description: `Detected and masked ${pattern.name}`,
                            location: this.findMatchLocation(content, match),
                            replacement: pattern.replacement,
                            confidence
                        });
                    }
                }
            }
        }
        return { sanitizedContent, actions };
    }
    /**
     * Hide tool syntax from content
     */
    async hideToolSyntax(content, context) {
        let sanitizedContent = content;
        const actions = [];
        for (const pattern of this.config.toolSyntaxPatterns) {
            const matches = content.match(pattern.pattern);
            if (matches) {
                for (const match of matches) {
                    sanitizedContent = sanitizedContent.replace(pattern.pattern, pattern.replacement);
                    actions.push({
                        type: "tool_syntax_hiding",
                        description: `Hidden ${pattern.name} syntax`,
                        location: this.findMatchLocation(content, match),
                        replacement: pattern.replacement,
                        confidence: 100
                    });
                }
            }
        }
        return { sanitizedContent, actions };
    }
    /**
     * Anonymize file paths
     */
    async anonymizePaths(content, context) {
        let sanitizedContent = content;
        const actions = [];
        if (!this.config.pathAnonymization.enabled) {
            return { sanitizedContent, actions };
        }
        // Pattern for file paths
        const pathPattern = /(?:\/[^\/\s]+)+(?:\.[a-zA-Z0-9]+)?/g;
        const matches = content.match(pathPattern);
        if (matches) {
            for (const match of matches) {
                const anonymizedPath = this.anonymizePath(match);
                if (anonymizedPath !== match) {
                    sanitizedContent = sanitizedContent.replace(match, anonymizedPath);
                    actions.push({
                        type: "path_anonymization",
                        description: "Anonymized file path",
                        location: this.findMatchLocation(content, match),
                        replacement: anonymizedPath,
                        confidence: 90
                    });
                }
            }
        }
        return { sanitizedContent, actions };
    }
    /**
     * Filter sensitive content
     */
    async filterContent(content, context) {
        let sanitizedContent = content;
        const actions = [];
        // Remove debug information
        if (this.config.contentFiltering.removeDebugInfo) {
            const debugPattern = /DEBUG:\s*.*$/gm;
            const debugMatches = content.match(debugPattern);
            if (debugMatches) {
                sanitizedContent = sanitizedContent.replace(debugPattern, "[DEBUG INFO REMOVED]");
                actions.push({
                    type: "sensitive_data_replacement",
                    description: "Removed debug information",
                    location: "multiple locations",
                    replacement: "[DEBUG INFO REMOVED]",
                    confidence: 100
                });
            }
        }
        // Remove stack traces
        if (this.config.contentFiltering.removeStackTraces) {
            const stackTracePattern = /\s+at\s+.*\(.*:\d+:\d+\)/g;
            const stackMatches = content.match(stackTracePattern);
            if (stackMatches) {
                sanitizedContent = sanitizedContent.replace(stackTracePattern, "\n    [STACK TRACE REMOVED]");
                actions.push({
                    type: "sensitive_data_replacement",
                    description: "Removed stack trace information",
                    location: "multiple locations",
                    replacement: "[STACK TRACE REMOVED]",
                    confidence: 100
                });
            }
        }
        return { sanitizedContent, actions };
    }
    /**
     * Sanitize individual components
     */
    async sanitizeExecutiveVerdict(verdict, context) {
        const sanitized = { ...verdict };
        // Sanitize summary points
        if (sanitized.summary) {
            for (let i = 0; i < sanitized.summary.length; i++) {
                const result = await this.sanitizeText(sanitized.summary[i], context);
                sanitized.summary[i] = result.sanitizedContent;
            }
        }
        // Sanitize next steps
        if (sanitized.nextSteps) {
            for (let i = 0; i < sanitized.nextSteps.length; i++) {
                const result = await this.sanitizeText(sanitized.nextSteps[i], context);
                sanitized.nextSteps[i] = result.sanitizedContent;
            }
        }
        return sanitized;
    }
    async sanitizeEvidenceTable(table, context) {
        const sanitized = { ...table };
        if (sanitized.entries) {
            for (const entry of sanitized.entries) {
                const issueResult = await this.sanitizeText(entry.issue, context);
                entry.issue = issueResult.sanitizedContent;
                const proofResult = await this.sanitizeText(entry.proof.content, context);
                entry.proof.content = proofResult.sanitizedContent;
                const fixResult = await this.sanitizeText(entry.fixSummary, context);
                entry.fixSummary = fixResult.sanitizedContent;
            }
        }
        return sanitized;
    }
    async sanitizeProposedDiffs(diffs, context) {
        const sanitized = [];
        for (const diff of diffs) {
            const sanitizedDiff = { ...diff };
            // Sanitize unified diff content
            const diffResult = await this.sanitizeText(sanitizedDiff.unifiedDiff, context);
            sanitizedDiff.unifiedDiff = diffResult.sanitizedContent;
            sanitized.push(sanitizedDiff);
        }
        return sanitized;
    }
    async sanitizeReproductionGuide(guide, context) {
        const sanitized = { ...guide };
        // Sanitize reproduction steps
        if (sanitized.reproductionSteps) {
            for (const step of sanitized.reproductionSteps) {
                const descResult = await this.sanitizeText(step.description, context);
                step.description = descResult.sanitizedContent;
                const cmdResult = await this.sanitizeText(step.command, context);
                step.command = cmdResult.sanitizedContent;
            }
        }
        return sanitized;
    }
    async sanitizeTraceabilityMatrix(matrix, context) {
        const sanitized = { ...matrix };
        // Sanitize AC descriptions
        if (sanitized.acMappings) {
            for (const mapping of sanitized.acMappings) {
                const descResult = await this.sanitizeText(mapping.acDescription, context);
                mapping.acDescription = descResult.sanitizedContent;
            }
        }
        return sanitized;
    }
    async sanitizeFollowUpTasks(taskList, context) {
        const sanitized = { ...taskList };
        if (sanitized.tasks) {
            for (const task of sanitized.tasks) {
                const titleResult = await this.sanitizeText(task.title, context);
                task.title = titleResult.sanitizedContent;
                const descResult = await this.sanitizeText(task.description, context);
                task.description = descResult.sanitizedContent;
            }
        }
        return sanitized;
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    calculatePIIConfidence(match, pattern) {
        // Simple confidence calculation based on pattern specificity
        let confidence = pattern.confidenceThreshold;
        // Increase confidence for longer matches
        if (match.length > 10) {
            confidence += 10;
        }
        // Increase confidence for specific formats
        if (pattern.name === "email" && match.includes("@")) {
            confidence += 15;
        }
        return Math.min(confidence, 100);
    }
    calculateSecretConfidence(match, pattern) {
        let confidence = pattern.confidenceThreshold;
        // Increase confidence for longer secrets
        if (match.length > 20) {
            confidence += 20;
        }
        // Increase confidence for specific patterns
        if (pattern.category === "api_key" && /^[A-Za-z0-9]{32,}$/.test(match)) {
            confidence += 25;
        }
        return Math.min(confidence, 100);
    }
    findMatchLocation(content, match) {
        const index = content.indexOf(match);
        if (index === -1)
            return "unknown";
        const lines = content.substring(0, index).split("\n");
        return `line ${lines.length}, column ${lines[lines.length - 1].length + 1}`;
    }
    anonymizePath(path) {
        if (!this.config.pathAnonymization.enabled) {
            return path;
        }
        // Replace user directories
        if (this.config.pathAnonymization.anonymizeUserDirectories) {
            path = path.replace(/\/Users\/[^\/]+/, "/Users/[user]");
            path = path.replace(/\/home\/[^\/]+/, "/home/[user]");
            path = path.replace(/C:\\Users\\[^\\]+/, "C:\\Users\\[user]");
        }
        // Limit path depth
        const parts = path.split("/");
        if (parts.length > this.config.pathAnonymization.maxPathDepth) {
            const start = parts.slice(0, 2);
            const end = parts.slice(-2);
            return [...start, "...", ...end].join("/");
        }
        return path;
    }
    generateSanitizationMetadata(context) {
        return {
            timestamp: Date.now(),
            rulesApplied: [
                "pii_detection",
                "secret_masking",
                "tool_syntax_hiding",
                "path_anonymization"
            ],
            contentType: context?.contentType || "structured_feedback",
            level: this.config.sanitizationLevel
        };
    }
    generateWarnings(actions) {
        const warnings = [];
        const criticalActions = actions.filter(a => a.confidence < 70);
        if (criticalActions.length > 0) {
            warnings.push(`${criticalActions.length} sanitization action(s) have low confidence`);
        }
        const piiActions = actions.filter(a => a.type === "pii_detection");
        if (piiActions.length > 5) {
            warnings.push("High amount of PII detected - review sanitization carefully");
        }
        return warnings;
    }
    async generateSanitizationResults(original, sanitized, context) {
        const result = await this.sanitizeText(original, context);
        // Override with actual sanitized content
        result.sanitizedContent = sanitized;
        return result;
    }
}
// ============================================================================
// Default Configuration
// ============================================================================
/**
 * Default configuration for output sanitization
 */
export const DEFAULT_OUTPUT_SANITIZER_CONFIG = {
    sanitizationLevel: "standard",
    piiPatterns: [
        {
            name: "email",
            pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            replacement: "[email]",
            confidenceThreshold: 90
        },
        {
            name: "phone",
            pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
            replacement: "[phone_number]",
            confidenceThreshold: 80
        },
        {
            name: "ssn",
            pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
            replacement: "[ssn]",
            confidenceThreshold: 95
        },
        {
            name: "credit_card",
            pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
            replacement: "[credit_card]",
            confidenceThreshold: 85
        }
    ],
    secretPatterns: [
        {
            name: "api_key",
            pattern: /(?:api[_-]?key|apikey)[\s=:]+['"]*([A-Za-z0-9]{20,})['"]*\b/gi,
            replacement: "[API_KEY]",
            confidenceThreshold: 80,
            category: "api_key"
        },
        {
            name: "password",
            pattern: /(?:password|pwd|pass)[\s=:]+['"]*([^\s'"]{8,})['"]*\b/gi,
            replacement: "[PASSWORD]",
            confidenceThreshold: 70,
            category: "password"
        },
        {
            name: "token",
            pattern: /(?:token|bearer)[\s=:]+['"]*([A-Za-z0-9._-]{20,})['"]*\b/gi,
            replacement: "[TOKEN]",
            confidenceThreshold: 85,
            category: "token"
        }
    ],
    toolSyntaxPatterns: [
        {
            name: "function_call",
            pattern: /<function_calls>[\s\S]*?<\/antml:function_calls>/g,
            replacement: "[TOOL EXECUTION]",
            preserveFunctionality: false
        },
        {
            name: "tool_invocation",
            pattern: /<invoke[^>]*>[\s\S]*?<\/antml:invoke>/g,
            replacement: "[TOOL CALL]",
            preserveFunctionality: false
        }
    ],
    pathAnonymization: {
        enabled: true,
        preserveRelativePaths: true,
        anonymizeUserDirectories: true,
        maxPathDepth: 5
    },
    contentFiltering: {
        removeDebugInfo: true,
        removeInternalComments: false,
        sanitizeErrorMessages: true,
        removeStackTraces: true
    }
};
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Create output sanitizer with default configuration
 */
export function createOutputSanitizer(config) {
    return new OutputSanitizer(config);
}
/**
 * Validate sanitization result structure
 */
export function validateSanitizationResult(result) {
    const errors = [];
    if (!result.metadata || !result.metadata.timestamp) {
        errors.push("Missing or invalid metadata");
    }
    if (!result.sanitizedContent) {
        errors.push("Missing sanitized content");
    }
    if (!Array.isArray(result.actions)) {
        errors.push("Actions must be an array");
    }
    if (!Array.isArray(result.warnings)) {
        errors.push("Warnings must be an array");
    }
    return errors;
}
//# sourceMappingURL=output-sanitizer.js.map