/**
 * Response builder implementation for enhanced response formatting
 *
 * This module implements the response builder pattern for constructing
 * enhanced responses with proper validation and serialization.
 *
 * Requirements addressed:
 * - 5.1: Enhanced response format with audit data
 * - 5.2: Response structure compatibility
 * - 5.3: Proper JSON serialization
 * - 5.4: Response validation
 * - 5.5: Required fields presence
 */
import type { GansAuditorCodexReview, GansAuditorCodexStandardResponse, GansAuditorCodexEnhancedResponse, GansAuditorCodexToolResponse } from './gan-types.js';
import type { IResponseBuilder, IResponseFormatter, ICompatibilityLayer, ValidationResult, SerializationOptions, ResponseMetadata } from './response-types.js';
/**
 * Builder for constructing enhanced responses with validation
 */
export declare class ResponseBuilder implements IResponseBuilder {
    private response;
    private metadata;
    constructor();
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
    /**
     * Validate GAN review structure
     */
    private validateGanReview;
}
/**
 * Formatter for different response output formats
 */
export declare class ResponseFormatter implements IResponseFormatter {
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
export declare class CompatibilityLayer implements ICompatibilityLayer {
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
 * Create a new response builder
 */
export declare function createResponseBuilder(): IResponseBuilder;
/**
 * Create a new response formatter
 */
export declare function createResponseFormatter(): IResponseFormatter;
/**
 * Create a new compatibility layer
 */
export declare function createCompatibilityLayer(): ICompatibilityLayer;
/**
 * Convenience function to build enhanced response from components
 */
export declare function buildEnhancedResponse(standard: GansAuditorCodexStandardResponse, gan?: GansAuditorCodexReview, sessionId?: string): GansAuditorCodexEnhancedResponse;
/**
 * Convenience function to format response as tool response
 */
export declare function formatAsToolResponse(standard: GansAuditorCodexStandardResponse, gan?: GansAuditorCodexReview, sessionId?: string, options?: Partial<SerializationOptions>): GansAuditorCodexToolResponse;
//# sourceMappingURL=response-builder.d.ts.map