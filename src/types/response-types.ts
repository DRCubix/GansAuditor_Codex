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

import type {
  GansAuditorCodexReview,
  GansAuditorCodexStandardResponse,
  GansAuditorCodexEnhancedResponse,
  GansAuditorCodexToolResponse,
  GansAuditorCodexResponseContent,
  ErrorResponse,
} from './gan-types.js';

// ============================================================================
// Response Validation Types
// ============================================================================

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

// ============================================================================
// Response Serialization Options
// ============================================================================

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

// ============================================================================
// Enhanced Response Builder
// ============================================================================

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

// ============================================================================
// Response Compatibility Layer
// ============================================================================

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

// ============================================================================
// Response Field Definitions
// ============================================================================

/**
 * Standard response field requirements
 */
export const STANDARD_RESPONSE_FIELDS: ResponseFieldRequirements = {
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
export const ENHANCED_RESPONSE_FIELDS: ResponseFieldRequirements = {
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
export const GAN_REVIEW_FIELDS: ResponseFieldRequirements = {
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
export const DEFAULT_SERIALIZATION_OPTIONS: SerializationOptions = {
  includeNullFields: false,
  prettyPrint: true,
  indent: 2,
  includeMetadata: false
};

/**
 * Compact serialization options for production
 */
export const COMPACT_SERIALIZATION_OPTIONS: SerializationOptions = {
  includeNullFields: false,
  prettyPrint: false,
  indent: 0,
  includeMetadata: false
};

/**
 * Debug serialization options with full details
 */
export const DEBUG_SERIALIZATION_OPTIONS: SerializationOptions = {
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
export function isStandardResponse(obj: any): obj is GansAuditorCodexStandardResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.thoughtNumber === 'number' &&
    typeof obj.totalThoughts === 'number' &&
    typeof obj.nextThoughtNeeded === 'boolean' &&
    Array.isArray(obj.branches) &&
    typeof obj.thoughtHistoryLength === 'number'
  );
}

/**
 * Type guard for enhanced response
 */
export function isEnhancedResponse(obj: any): obj is GansAuditorCodexEnhancedResponse {
  if (!isStandardResponse(obj)) {
    return false;
  }
  
  const enhanced = obj as any;
  return (
    (enhanced.sessionId === undefined || typeof enhanced.sessionId === 'string') &&
    (enhanced.gan === undefined || isGanReview(enhanced.gan))
  );
}

/**
 * Type guard for GAN review
 */
export function isGanReview(obj: any): obj is GansAuditorCodexReview {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.overall === 'number' &&
    Array.isArray(obj.dimensions) &&
    typeof obj.verdict === 'string' &&
    ['pass', 'revise', 'reject'].includes(obj.verdict) &&
    typeof obj.review === 'object' &&
    obj.review !== null &&
    typeof obj.iterations === 'number' &&
    Array.isArray(obj.judge_cards)
  );
}

/**
 * Type guard for tool response
 */
export function isToolResponse(obj: any): obj is GansAuditorCodexToolResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray(obj.content) &&
    obj.content.every((item: any) => 
      typeof item === 'object' &&
      item !== null &&
      typeof item.type === 'string' &&
      typeof item.text === 'string'
    ) &&
    (obj.isError === undefined || typeof obj.isError === 'boolean')
  );
}

/**
 * Type guard for error response
 */
export function isErrorResponse(obj: any): obj is ErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.error === 'string' &&
    obj.status === 'failed' &&
    (obj.details === undefined || (
      typeof obj.details === 'object' &&
      obj.details !== null &&
      typeof obj.details.category === 'string' &&
      typeof obj.details.recoverable === 'boolean'
    ))
  );
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
  static clone<T>(response: T): T {
    return JSON.parse(JSON.stringify(response));
  }
  
  /**
   * Merge two responses, with the second taking precedence
   */
  static merge(base: any, override: any): any {
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
  static removeNullFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeNullFields(item));
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
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
  static getResponseSize(response: any): number {
    return new TextEncoder().encode(JSON.stringify(response)).length;
  }
  
  /**
   * Truncate response if it exceeds size limit
   */
  static truncateResponse(response: any, maxSize: number): any {
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
  static createBackwardCompatibleResponse(
    enhancedReview: any,
    clientVersion?: string
  ): any {
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
  static enhanceReviewWithPromptData(
    baseReview: any,
    promptEnhancements: {
      workflowSteps?: any[];
      completionAnalysis?: any;
      nextActions?: any[];
      promptMetadata?: any;
    }
  ): any {
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
  static extractPromptEnhancements(
    enhancedReview: any
  ): {
    workflowSteps?: any[];
    completionAnalysis?: any;
    nextActions?: any[];
    promptMetadata?: any;
  } {
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
  static validateResponseCompatibility(
    response: any,
    targetVersion: string = '2.0'
  ): {
    isCompatible: boolean;
    requiredVersion: string;
    missingFeatures: string[];
    deprecatedFeatures: string[];
  } {
    const missingFeatures: string[] = [];
    const deprecatedFeatures: string[] = [];
    
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
  static migrateResponseFormat(
    response: any,
    fromVersion: string,
    toVersion: string
  ): any {
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
  static getResponseVersion(response: any): string {
    // Check for prompt-driven features to determine version
    if (response.workflow_steps || response.completion_analysis || response.next_actions) {
      return '2.0';
    }
    
    return '1.0';
  }

  /**
   * Create response metadata for version tracking
   */
  static createResponseMetadata(
    version: string = '2.0',
    compatibility?: {
      minClientVersion?: string;
      deprecatedFields?: string[];
      newFields?: string[];
    }
  ): ResponseMetadata {
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
  private static isLegacyClient(clientVersion: string): boolean {
    // Parse version string and check if it's before 2.0
    const version = parseFloat(clientVersion);
    return version < 2.0;
  }

  /**
   * Add default prompt enhancements for migration
   */
  private static addDefaultPromptEnhancements(
    response: any
  ): any {
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