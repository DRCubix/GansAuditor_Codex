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
import type { GansAuditorCodexReview, GansAuditorCodexStandardResponse, GansAuditorCodexEnhancedResponse, GansAuditorCodexToolResponse, ErrorResponse } from './gan-types.js';
/**
 * Validation result for response structure
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Response field requirements
 */
export interface ResponseFieldRequirements {
    required: string[];
    optional: string[];
    conditionallyRequired: Array<{
        field: string;
        condition: string;
        dependsOn: string[];
    }>;
}
/**
 * Options for JSON serialization of responses
 */
export interface SerializationOptions {
    includeNullFields: boolean;
    prettyPrint: boolean;
    indent: number;
    excludeFields?: string[];
    includeMetadata: boolean;
}
/**
 * Metadata for response serialization
 */
export interface ResponseMetadata {
    version: string;
    timestamp: number;
    serverVersion: string;
    compatibility: {
        minClientVersion?: string;
        deprecatedFields?: string[];
        newFields?: string[];
    };
}
/**
 * Builder pattern for constructing enhanced responses
 */
export interface IResponseBuilder {
    /**
     * Set standard response fields
     */
    setStandardFields(response: GansAuditorCodexStandardResponse): IResponseBuilder;
    /**
     * Add GAN audit results
     */
    addGanResults(review: GansAuditorCodexReview): IResponseBuilder;
    /**
     * Set session identifier
     */
    setSessionId(sessionId: string): IResponseBuilder;
    /**
     * Add metadata to response
     */
    addMetadata(metadata: Partial<ResponseMetadata>): IResponseBuilder;
    /**
     * Build the final enhanced response
     */
    build(): GansAuditorCodexEnhancedResponse;
    /**
     * Build and serialize to JSON
     */
    buildAndSerialize(options?: Partial<SerializationOptions>): string;
    /**
     * Validate the response before building
     */
    validate(): ValidationResult;
}
/**
 * Response formatter interface for different output formats
 */
export interface IResponseFormatter {
    /**
     * Format response as JSON string
     */
    formatAsJson(response: GansAuditorCodexEnhancedResponse, options?: Partial<SerializationOptions>): string;
    /**
     * Format response as tool response structure
     */
    formatAsToolResponse(response: GansAuditorCodexEnhancedResponse): GansAuditorCodexToolResponse;
    /**
     * Format error response
     */
    formatErrorResponse(error: Error | string, details?: any): GansAuditorCodexToolResponse;
    /**
     * Validate response structure
     */
    validateResponse(response: any): ValidationResult;
}
/**
 * Compatibility layer for handling different client versions
 */
export interface ICompatibilityLayer {
    /**
     * Transform response for specific client version
     */
    transformForClient(response: GansAuditorCodexEnhancedResponse, clientVersion?: string): any;
    /**
     * Check if client supports enhanced features
     */
    supportsEnhancedFeatures(clientVersion?: string): boolean;
    /**
     * Get fallback response for unsupported clients
     */
    getFallbackResponse(response: GansAuditorCodexEnhancedResponse): GansAuditorCodexStandardResponse;
}
/**
 * Standard response field requirements
 */
export declare const STANDARD_RESPONSE_FIELDS: ResponseFieldRequirements;
/**
 * Enhanced response field requirements
 */
export declare const ENHANCED_RESPONSE_FIELDS: ResponseFieldRequirements;
/**
 * GAN review field requirements
 */
export declare const GAN_REVIEW_FIELDS: ResponseFieldRequirements;
/**
 * Default options for response serialization
 */
export declare const DEFAULT_SERIALIZATION_OPTIONS: SerializationOptions;
/**
 * Compact serialization options for production
 */
export declare const COMPACT_SERIALIZATION_OPTIONS: SerializationOptions;
/**
 * Debug serialization options with full details
 */
export declare const DEBUG_SERIALIZATION_OPTIONS: SerializationOptions;
/**
 * Type guard for standard response
 */
export declare function isStandardResponse(obj: any): obj is GansAuditorCodexStandardResponse;
/**
 * Type guard for enhanced response
 */
export declare function isEnhancedResponse(obj: any): obj is GansAuditorCodexEnhancedResponse;
/**
 * Type guard for GAN review
 */
export declare function isGanReview(obj: any): obj is GansAuditorCodexReview;
/**
 * Type guard for tool response
 */
export declare function isToolResponse(obj: any): obj is GansAuditorCodexToolResponse;
/**
 * Type guard for error response
 */
export declare function isErrorResponse(obj: any): obj is ErrorResponse;
/**
 * Utility functions for response manipulation
 */
export declare class ResponseUtils {
    /**
     * Deep clone a response object
     */
    static clone<T>(response: T): T;
    /**
     * Merge two responses, with the second taking precedence
     */
    static merge(base: any, override: any): any;
    /**
     * Remove null and undefined fields from response
     */
    static removeNullFields(obj: any): any;
    /**
     * Get response size in bytes
     */
    static getResponseSize(response: any): number;
    /**
     * Truncate response if it exceeds size limit
     */
    static truncateResponse(response: any, maxSize: number): any;
    /**
     * Create backward-compatible response from prompt-enhanced review
     * Requirement 6.5: Implement backward compatibility for existing response consumers
     */
    static createBackwardCompatibleResponse(enhancedReview: any, clientVersion?: string): any;
    /**
     * Add prompt enhancements to existing review
     * Requirement 6.5: Add prompt-specific fields without breaking existing clients
     */
    static enhanceReviewWithPromptData(baseReview: any, promptEnhancements: {
        workflowSteps?: any[];
        completionAnalysis?: any;
        nextActions?: any[];
        promptMetadata?: any;
    }): any;
    /**
     * Extract prompt enhancements from enhanced review
     * Requirement 6.5: Create response format versioning for future changes
     */
    static extractPromptEnhancements(enhancedReview: any): {
        workflowSteps?: any[];
        completionAnalysis?: any;
        nextActions?: any[];
        promptMetadata?: any;
    };
    /**
     * Validate response format version compatibility
     * Requirement 6.5: Create response format versioning for future changes
     */
    static validateResponseCompatibility(response: any, targetVersion?: string): {
        isCompatible: boolean;
        requiredVersion: string;
        missingFeatures: string[];
        deprecatedFeatures: string[];
    };
    /**
     * Migrate response format between versions
     * Requirement 6.5: Create response format versioning for future changes
     */
    static migrateResponseFormat(response: any, fromVersion: string, toVersion: string): any;
    /**
     * Get response format version from response
     */
    static getResponseVersion(response: any): string;
    /**
     * Create response metadata for version tracking
     */
    static createResponseMetadata(version?: string, compatibility?: {
        minClientVersion?: string;
        deprecatedFields?: string[];
        newFields?: string[];
    }): ResponseMetadata;
    /**
     * Check if client version is legacy (pre-prompt enhancements)
     */
    private static isLegacyClient;
    /**
     * Add default prompt enhancements for migration
     */
    private static addDefaultPromptEnhancements;
}
//# sourceMappingURL=response-types.d.ts.map