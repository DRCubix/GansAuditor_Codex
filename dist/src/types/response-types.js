/**
 * Response formatting types and utilities for GansAuditor_Codex
 *
 * This module defines enhanced response formatting that extends the existing
 * response structure to include sessionId and gan fields while maintaining
 * backward compatibility with existing clients.
 *
 * Requirements addressed:
 * - 5.1: Enhanced response format with audit data
 * - 5.2: Response structure compatibility
 * - 5.3: Proper JSON serialization
 * - 5.4: Response validation
 * - 5.5: Required fields presence
 * - 6.3: Extended response format compatibility
 */
// ============================================================================
// Response Field Definitions
// ============================================================================
/**
 * Standard response field requirements
 */
export const STANDARD_RESPONSE_FIELDS = {
    required: [
        'thoughtNumber',
        'totalThoughts',
        'nextThoughtNeeded',
        'branches',
        'thoughtHistoryLength'
    ],
    optional: [],
    conditionallyRequired: []
};
/**
 * Enhanced response field requirements
 */
export const ENHANCED_RESPONSE_FIELDS = {
    required: [
        ...STANDARD_RESPONSE_FIELDS.required
    ],
    optional: [
        'sessionId',
        'gan'
    ],
    conditionallyRequired: [
        {
            field: 'sessionId',
            condition: 'GansAuditor_Codex auditing is enabled',
            dependsOn: ['gan']
        }
    ]
};
/**
 * GAN review field requirements
 */
export const GAN_REVIEW_FIELDS = {
    required: [
        'overall',
        'dimensions',
        'verdict',
        'review',
        'iterations',
        'judge_cards'
    ],
    optional: [
        'proposed_diff'
    ],
    conditionallyRequired: []
};
// ============================================================================
// Default Serialization Options
// ============================================================================
/**
 * Default options for response serialization
 */
export const DEFAULT_SERIALIZATION_OPTIONS = {
    includeNullFields: false,
    prettyPrint: true,
    indent: 2,
    includeMetadata: false
};
/**
 * Compact serialization options for production
 */
export const COMPACT_SERIALIZATION_OPTIONS = {
    includeNullFields: false,
    prettyPrint: false,
    indent: 0,
    includeMetadata: false
};
/**
 * Debug serialization options with full details
 */
export const DEBUG_SERIALIZATION_OPTIONS = {
    includeNullFields: true,
    prettyPrint: true,
    indent: 2,
    includeMetadata: true
};
// ============================================================================
// Response Type Guards
// ============================================================================
/**
 * Type guard for standard response
 */
export function isStandardResponse(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        typeof obj.thoughtNumber === 'number' &&
        typeof obj.totalThoughts === 'number' &&
        typeof obj.nextThoughtNeeded === 'boolean' &&
        Array.isArray(obj.branches) &&
        typeof obj.thoughtHistoryLength === 'number');
}
/**
 * Type guard for enhanced response
 */
export function isEnhancedResponse(obj) {
    if (!isStandardResponse(obj)) {
        return false;
    }
    const enhanced = obj;
    return ((enhanced.sessionId === undefined || typeof enhanced.sessionId === 'string') &&
        (enhanced.gan === undefined || isGanReview(enhanced.gan)));
}
/**
 * Type guard for GAN review
 */
export function isGanReview(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        typeof obj.overall === 'number' &&
        Array.isArray(obj.dimensions) &&
        typeof obj.verdict === 'string' &&
        ['pass', 'revise', 'reject'].includes(obj.verdict) &&
        typeof obj.review === 'object' &&
        obj.review !== null &&
        typeof obj.iterations === 'number' &&
        Array.isArray(obj.judge_cards));
}
/**
 * Type guard for tool response
 */
export function isToolResponse(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        Array.isArray(obj.content) &&
        obj.content.every((item) => typeof item === 'object' &&
            item !== null &&
            typeof item.type === 'string' &&
            typeof item.text === 'string') &&
        (obj.isError === undefined || typeof obj.isError === 'boolean'));
}
/**
 * Type guard for error response
 */
export function isErrorResponse(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        typeof obj.error === 'string' &&
        obj.status === 'failed' &&
        (obj.details === undefined || (typeof obj.details === 'object' &&
            obj.details !== null &&
            typeof obj.details.category === 'string' &&
            typeof obj.details.recoverable === 'boolean')));
}
// ============================================================================
// Response Utilities
// ============================================================================
/**
 * Utility functions for response manipulation
 */
export class ResponseUtils {
    /**
     * Deep clone a response object
     */
    static clone(response) {
        return JSON.parse(JSON.stringify(response));
    }
    /**
     * Merge two responses, with the second taking precedence
     */
    static merge(base, override) {
        const result = this.clone(base);
        for (const [key, value] of Object.entries(override)) {
            if (value !== undefined && value !== null) {
                result[key] = value;
            }
        }
        return result;
    }
    /**
     * Remove null and undefined fields from response
     */
    static removeNullFields(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.removeNullFields(item));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value !== null && value !== undefined) {
                    result[key] = this.removeNullFields(value);
                }
            }
            return result;
        }
        return obj;
    }
    /**
     * Get response size in bytes
     */
    static getResponseSize(response) {
        return new TextEncoder().encode(JSON.stringify(response)).length;
    }
    /**
     * Truncate response if it exceeds size limit
     */
    static truncateResponse(response, maxSize) {
        const currentSize = this.getResponseSize(response);
        if (currentSize <= maxSize) {
            return response;
        }
        // If response is too large, try to truncate non-essential fields
        const truncated = this.clone(response);
        // Truncate GAN review details if present
        if (truncated.gan?.review?.inline) {
            const maxComments = Math.floor(truncated.gan.review.inline.length / 2);
            truncated.gan.review.inline = truncated.gan.review.inline.slice(0, maxComments);
            truncated.gan.review.inline.push({
                path: '...',
                line: 0,
                comment: `[Truncated: ${truncated.gan.review.inline.length} more comments]`
            });
        }
        if (truncated.gan?.proposed_diff && truncated.gan.proposed_diff.length > 1000) {
            truncated.gan.proposed_diff = truncated.gan.proposed_diff.substring(0, 1000) + '\n... [Truncated]';
        }
        return truncated;
    }
    // ============================================================================
    // Prompt-Driven Audit Response Compatibility (Requirement 6.5)
    // ============================================================================
    /**
     * Create backward-compatible response from prompt-enhanced review
     * Requirement 6.5: Implement backward compatibility for existing response consumers
     */
    static createBackwardCompatibleResponse(enhancedReview, clientVersion) {
        // For older clients, strip prompt-specific fields
        if (clientVersion && this.isLegacyClient(clientVersion)) {
            const compatibleReview = this.clone(enhancedReview);
            // Remove prompt-specific fields for legacy clients
            delete compatibleReview.workflow_steps;
            delete compatibleReview.completion_analysis;
            delete compatibleReview.next_actions;
            delete compatibleReview.prompt_metadata;
            return compatibleReview;
        }
        // For modern clients, return full enhanced response
        return enhancedReview;
    }
    /**
     * Add prompt enhancements to existing review
     * Requirement 6.5: Add prompt-specific fields without breaking existing clients
     */
    static enhanceReviewWithPromptData(baseReview, promptEnhancements) {
        const enhanced = this.clone(baseReview);
        // Add prompt enhancements as optional fields
        if (promptEnhancements.workflowSteps) {
            enhanced.workflow_steps = promptEnhancements.workflowSteps;
        }
        if (promptEnhancements.completionAnalysis) {
            enhanced.completion_analysis = promptEnhancements.completionAnalysis;
        }
        if (promptEnhancements.nextActions) {
            enhanced.next_actions = promptEnhancements.nextActions;
        }
        if (promptEnhancements.promptMetadata) {
            enhanced.prompt_metadata = promptEnhancements.promptMetadata;
        }
        return enhanced;
    }
    /**
     * Extract prompt enhancements from enhanced review
     * Requirement 6.5: Create response format versioning for future changes
     */
    static extractPromptEnhancements(enhancedReview) {
        return {
            workflowSteps: enhancedReview.workflow_steps,
            completionAnalysis: enhancedReview.completion_analysis,
            nextActions: enhancedReview.next_actions,
            promptMetadata: enhancedReview.prompt_metadata,
        };
    }
    /**
     * Validate response format version compatibility
     * Requirement 6.5: Create response format versioning for future changes
     */
    static validateResponseCompatibility(response, targetVersion = '2.0') {
        const missingFeatures = [];
        const deprecatedFeatures = [];
        // Check for prompt-driven features (version 2.0+)
        if (targetVersion >= '2.0') {
            if (!response.workflow_steps) {
                missingFeatures.push('workflow_steps');
            }
            if (!response.completion_analysis) {
                missingFeatures.push('completion_analysis');
            }
        }
        // Check for deprecated features
        if (targetVersion >= '3.0') {
            // Future version compatibility checks would go here
        }
        const isCompatible = missingFeatures.length === 0;
        const requiredVersion = isCompatible ? targetVersion : '1.0';
        return {
            isCompatible,
            requiredVersion,
            missingFeatures,
            deprecatedFeatures,
        };
    }
    /**
     * Migrate response format between versions
     * Requirement 6.5: Create response format versioning for future changes
     */
    static migrateResponseFormat(response, fromVersion, toVersion) {
        let migrated = this.clone(response);
        // Migration from 1.0 to 2.0 (add prompt enhancements)
        if (fromVersion < '2.0' && toVersion >= '2.0') {
            migrated = this.addDefaultPromptEnhancements(migrated);
        }
        // Migration from 2.0 to 1.0 (remove prompt enhancements)
        if (fromVersion >= '2.0' && toVersion < '2.0') {
            migrated = this.createBackwardCompatibleResponse(migrated, '1.0');
        }
        return migrated;
    }
    /**
     * Get response format version from response
     */
    static getResponseVersion(response) {
        // Check for prompt-driven features to determine version
        if (response.workflow_steps || response.completion_analysis || response.next_actions) {
            return '2.0';
        }
        return '1.0';
    }
    /**
     * Create response metadata for version tracking
     */
    static createResponseMetadata(version = '2.0', compatibility) {
        return {
            version,
            timestamp: Date.now(),
            serverVersion: '2.0.0', // This would come from package.json or config
            compatibility: {
                minClientVersion: compatibility?.minClientVersion || '1.0',
                deprecatedFields: compatibility?.deprecatedFields || [],
                newFields: compatibility?.newFields || [
                    'workflow_steps',
                    'completion_analysis',
                    'next_actions',
                    'prompt_metadata'
                ],
            },
        };
    }
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    /**
     * Check if client version is legacy (pre-prompt enhancements)
     */
    static isLegacyClient(clientVersion) {
        // Parse version string and check if it's before 2.0
        const version = parseFloat(clientVersion);
        return version < 2.0;
    }
    /**
     * Add default prompt enhancements for migration
     */
    static addDefaultPromptEnhancements(response) {
        const enhanced = this.clone(response);
        // Add minimal workflow steps if not present
        if (!enhanced.workflow_steps) {
            enhanced.workflow_steps = [{
                    stepName: 'VERDICT',
                    success: true,
                    evidence: ['Audit completed with standard workflow'],
                    issues: [],
                    score: enhanced.overall,
                    metadata: { migrated: true },
                }];
        }
        // Add basic completion analysis if not present
        if (!enhanced.completion_analysis) {
            enhanced.completion_analysis = {
                status: enhanced.verdict === 'pass' ? 'completed' : 'in_progress',
                reason: enhanced.verdict === 'pass' ? 'Quality standards met' : 'Requires improvement',
                nextThoughtNeeded: enhanced.verdict !== 'pass',
                confidence: 'medium',
            };
        }
        // Add basic next actions if not present
        if (!enhanced.next_actions) {
            enhanced.next_actions = enhanced.verdict === 'pass' ? [{
                    type: 'complete',
                    priority: 'high',
                    description: 'Mark task as complete - quality standards met',
                    commands: [],
                }] : [{
                    type: 'improve',
                    priority: 'medium',
                    description: 'Address identified issues and improve code quality',
                    commands: [],
                }];
        }
        // Add migration metadata
        if (!enhanced.prompt_metadata) {
            enhanced.prompt_metadata = {
                version: '2.0',
                renderedAt: Date.now(),
                configHash: 'migrated',
                degradationLevel: 'none',
            };
        }
        return enhanced;
    }
}
//# sourceMappingURL=response-types.js.map