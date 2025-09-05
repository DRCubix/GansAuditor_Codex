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

import type {
  GansAuditorCodexReview,
  GansAuditorCodexStandardResponse,
  GansAuditorCodexEnhancedResponse,
  GansAuditorCodexToolResponse,
  ErrorResponse,
} from './gan-types.js';

import type {
  IResponseBuilder,
  IResponseFormatter,
  ICompatibilityLayer,
  ValidationResult,
  SerializationOptions,
  ResponseMetadata,
  ResponseFieldRequirements,
} from './response-types.js';

import {
  STANDARD_RESPONSE_FIELDS,
  ENHANCED_RESPONSE_FIELDS,
  GAN_REVIEW_FIELDS,
  DEFAULT_SERIALIZATION_OPTIONS,
  isStandardResponse,
  isEnhancedResponse,
  isGanReview,
  isToolResponse,
  ResponseUtils,
} from './response-types.js';

// ============================================================================
// Response Builder Implementation
// ============================================================================

/**
 * Builder for constructing enhanced responses with validation
 */
export class ResponseBuilder implements IResponseBuilder {
  private response: Partial<GansAuditorCodexEnhancedResponse> = {};
  private metadata: Partial<ResponseMetadata> = {};

  constructor() {
    // Initialize with current timestamp
    this.metadata.timestamp = Date.now();
    this.metadata.version = '1.0.0';
    this.metadata.serverVersion = '0.2.0';
  }

  /**
   * Set standard response fields
   */
  setStandardFields(response: GansAuditorCodexStandardResponse): IResponseBuilder {
    this.response.thoughtNumber = response.thoughtNumber;
    this.response.totalThoughts = response.totalThoughts;
    this.response.nextThoughtNeeded = response.nextThoughtNeeded;
    this.response.branches = [...response.branches];
    this.response.thoughtHistoryLength = response.thoughtHistoryLength;
    return this;
  }

  /**
   * Add GAN audit results
   */
  addGanResults(review: GansAuditorCodexReview): IResponseBuilder {
    // Validate GAN review structure
    const validation = this.validateGanReview(review);
    if (!validation.isValid) {
      throw new Error(`Invalid GAN review: ${validation.errors.join(', ')}`);
    }

    this.response.gan = review;
    
    // Update nextThoughtNeeded based on audit verdict
    if (review.verdict === 'revise' || review.verdict === 'reject') {
      this.response.nextThoughtNeeded = true;
    }
    
    return this;
  }

  /**
   * Set session identifier
   */
  setSessionId(sessionId: string): IResponseBuilder {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID must be a non-empty string');
    }
    this.response.sessionId = sessionId;
    return this;
  }

  /**
   * Add metadata to response
   */
  addMetadata(metadata: Partial<ResponseMetadata>): IResponseBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  /**
   * Build the final enhanced response
   */
  build(): GansAuditorCodexEnhancedResponse {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid response structure: ${validation.errors.join(', ')}`);
    }

    // Ensure all required fields are present
    const response: GansAuditorCodexEnhancedResponse = {
      thoughtNumber: this.response.thoughtNumber!,
      totalThoughts: this.response.totalThoughts!,
      nextThoughtNeeded: this.response.nextThoughtNeeded!,
      branches: this.response.branches || [],
      thoughtHistoryLength: this.response.thoughtHistoryLength!,
    };

    // Add optional fields if present
    if (this.response.sessionId) {
      response.sessionId = this.response.sessionId;
    }

    if (this.response.gan) {
      response.gan = this.response.gan;
    }

    return response;
  }

  /**
   * Build and serialize to JSON
   */
  buildAndSerialize(options?: Partial<SerializationOptions>): string {
    const response = this.build();
    const formatter = new ResponseFormatter();
    return formatter.formatAsJson(response, options);
  }

  /**
   * Validate the response before building
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required standard fields
    for (const field of STANDARD_RESPONSE_FIELDS.required) {
      if (this.response[field as keyof GansAuditorCodexEnhancedResponse] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate field types
    if (this.response.thoughtNumber !== undefined && typeof this.response.thoughtNumber !== 'number') {
      errors.push('thoughtNumber must be a number');
    }

    if (this.response.totalThoughts !== undefined && typeof this.response.totalThoughts !== 'number') {
      errors.push('totalThoughts must be a number');
    }

    if (this.response.nextThoughtNeeded !== undefined && typeof this.response.nextThoughtNeeded !== 'boolean') {
      errors.push('nextThoughtNeeded must be a boolean');
    }

    if (this.response.branches !== undefined && !Array.isArray(this.response.branches)) {
      errors.push('branches must be an array');
    }

    if (this.response.thoughtHistoryLength !== undefined && typeof this.response.thoughtHistoryLength !== 'number') {
      errors.push('thoughtHistoryLength must be a number');
    }

    // Validate optional fields
    if (this.response.sessionId !== undefined && typeof this.response.sessionId !== 'string') {
      errors.push('sessionId must be a string');
    }

    if (this.response.gan !== undefined) {
      const ganValidation = this.validateGanReview(this.response.gan);
      errors.push(...ganValidation.errors);
      warnings.push(...ganValidation.warnings);
    }

    // Check conditional requirements
    if (this.response.gan && !this.response.sessionId) {
      warnings.push('sessionId should be provided when GAN results are included');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate GAN review structure
   */
  private validateGanReview(review: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isGanReview(review)) {
      errors.push('Invalid GAN review structure');
      return { isValid: false, errors, warnings };
    }

    // Validate score ranges
    if (review.overall < 0 || review.overall > 100) {
      errors.push('Overall score must be between 0 and 100');
    }

    // Validate dimensions
    for (const dimension of review.dimensions) {
      if (!dimension.name || typeof dimension.name !== 'string') {
        errors.push('Dimension name must be a non-empty string');
      }
      if (dimension.score < 0 || dimension.score > 100) {
        errors.push(`Dimension ${dimension.name} score must be between 0 and 100`);
      }
    }

    // Validate verdict
    if (!['pass', 'revise', 'reject'].includes(review.verdict)) {
      errors.push('Verdict must be one of: pass, revise, reject');
    }

    // Validate review structure
    if (!review.review || typeof review.review !== 'object') {
      errors.push('Review details must be an object');
    } else {
      if (!review.review.summary || typeof review.review.summary !== 'string') {
        errors.push('Review summary must be a non-empty string');
      }
      if (!Array.isArray(review.review.inline)) {
        errors.push('Review inline comments must be an array');
      }
      if (!Array.isArray(review.review.citations)) {
        errors.push('Review citations must be an array');
      }
    }

    // Validate iterations
    if (review.iterations < 0) {
      errors.push('Iterations must be non-negative');
    }

    // Validate judge cards
    if (!Array.isArray(review.judge_cards)) {
      errors.push('Judge cards must be an array');
    } else {
      for (const card of review.judge_cards) {
        if (!card.model || typeof card.model !== 'string') {
          errors.push('Judge card model must be a non-empty string');
        }
        if (card.score < 0 || card.score > 100) {
          errors.push(`Judge card score must be between 0 and 100`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// ============================================================================
// Response Formatter Implementation
// ============================================================================

/**
 * Formatter for different response output formats
 */
export class ResponseFormatter implements IResponseFormatter {
  /**
   * Format response as JSON string
   */
  formatAsJson(response: GansAuditorCodexEnhancedResponse, options?: Partial<SerializationOptions>): string {
    const opts = { ...DEFAULT_SERIALIZATION_OPTIONS, ...options };
    
    let responseToSerialize = response;
    
    // Remove null fields if requested
    if (!opts.includeNullFields) {
      responseToSerialize = ResponseUtils.removeNullFields(response);
    }
    
    // Add metadata if requested
    if (opts.includeMetadata) {
      responseToSerialize = {
        ...responseToSerialize,
        _metadata: {
          version: '1.0.0',
          timestamp: Date.now(),
          serverVersion: '0.2.0',
        }
      } as any; // Allow metadata extension
    }
    
    // Exclude specified fields
    if (opts.excludeFields && opts.excludeFields.length > 0) {
      const filtered = { ...responseToSerialize };
      for (const field of opts.excludeFields) {
        delete filtered[field as keyof typeof filtered];
      }
      responseToSerialize = filtered;
    }
    
    if (opts.prettyPrint) {
      return JSON.stringify(responseToSerialize, null, opts.indent);
    } else {
      return JSON.stringify(responseToSerialize);
    }
  }

  /**
   * Format response as tool response structure
   */
  formatAsToolResponse(response: GansAuditorCodexEnhancedResponse): GansAuditorCodexToolResponse {
    const jsonString = this.formatAsJson(response);
    
    return {
      content: [{
        type: "text",
        text: jsonString
      }]
    };
  }

  /**
   * Format error response
   */
  formatErrorResponse(error: Error | string, details?: any): GansAuditorCodexToolResponse {
    const errorMessage = error instanceof Error ? error.message : error;
    
    const errorResponse: ErrorResponse = {
      error: errorMessage,
      status: "failed",
    };
    
    if (details) {
      errorResponse.details = details;
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(errorResponse, null, 2)
      }],
      isError: true
    };
  }

  /**
   * Validate response structure
   */
  validateResponse(response: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!isEnhancedResponse(response)) {
      errors.push('Invalid enhanced response structure');
      return { isValid: false, errors, warnings };
    }

    // Additional validation can be added here
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// ============================================================================
// Compatibility Layer Implementation
// ============================================================================

/**
 * Compatibility layer for handling different client versions
 */
export class CompatibilityLayer implements ICompatibilityLayer {
  /**
   * Transform response for specific client version
   */
  transformForClient(response: GansAuditorCodexEnhancedResponse, clientVersion?: string): any {
    // For now, assume all clients support enhanced features
    // In the future, this could be extended to handle version-specific transformations
    
    if (!clientVersion || this.supportsEnhancedFeatures(clientVersion)) {
      return response;
    }
    
    // Fallback to standard response for older clients
    return this.getFallbackResponse(response);
  }

  /**
   * Check if client supports enhanced features
   */
  supportsEnhancedFeatures(clientVersion?: string): boolean {
    // For now, assume all clients support enhanced features
    // This could be extended to parse version strings and check compatibility
    return true;
  }

  /**
   * Get fallback response for unsupported clients
   */
  getFallbackResponse(response: GansAuditorCodexEnhancedResponse): GansAuditorCodexStandardResponse {
    return {
      thoughtNumber: response.thoughtNumber,
      totalThoughts: response.totalThoughts,
      nextThoughtNeeded: response.nextThoughtNeeded,
      branches: response.branches,
      thoughtHistoryLength: response.thoughtHistoryLength
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new response builder
 */
export function createResponseBuilder(): IResponseBuilder {
  return new ResponseBuilder();
}

/**
 * Create a new response formatter
 */
export function createResponseFormatter(): IResponseFormatter {
  return new ResponseFormatter();
}

/**
 * Create a new compatibility layer
 */
export function createCompatibilityLayer(): ICompatibilityLayer {
  return new CompatibilityLayer();
}

/**
 * Convenience function to build enhanced response from components
 */
export function buildEnhancedResponse(
  standard: GansAuditorCodexStandardResponse,
  gan?: GansAuditorCodexReview,
  sessionId?: string
): GansAuditorCodexEnhancedResponse {
  const builder = createResponseBuilder()
    .setStandardFields(standard);
  
  if (sessionId) {
    builder.setSessionId(sessionId);
  }
  
  if (gan) {
    builder.addGanResults(gan);
  }
  
  return builder.build();
}

/**
 * Convenience function to format response as tool response
 */
export function formatAsToolResponse(
  standard: GansAuditorCodexStandardResponse,
  gan?: GansAuditorCodexReview,
  sessionId?: string,
  options?: Partial<SerializationOptions>
): GansAuditorCodexToolResponse {
  const enhanced = buildEnhancedResponse(standard, gan, sessionId);
  const formatter = createResponseFormatter();
  return formatter.formatAsToolResponse(enhanced);
}