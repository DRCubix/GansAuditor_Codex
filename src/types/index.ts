/**
 * Type definitions index for GansAuditor_Codex
 * 
 * This module exports all type definitions for the GansAuditor_Codex system,
 * providing a single import point for all interfaces and types.
 */

// Export all GAN audit types
export * from './gan-types.js';

// Export validation and utility types
export * from './validation-types.js';

// Export integration types
export * from './integration-types.js';

// Export response formatting types
export * from './response-types.js';

// Export response builder utilities
export * from './response-builder.js';

// Export synchronous response types and enhanced builder
export * from './synchronous-response-types.js';
export * from './enhanced-response-builder.js';

// Re-export commonly used types for convenience
export type {
  GansAuditorCodexReview,
  GanVerdict,
  GansAuditorCodexSessionConfig,
  GansAuditorCodexSessionState,
  GansAuditorCodexThoughtData,
  GansAuditorCodexEnhancedResponse,
  GansAuditorCodexAuditRequest,
  AuditRubric,
  AuditBudget,
  GansAuditorCodexInlineConfig,
  ErrorResponse,
  GansAuditorCodexToolResponse,
} from './gan-types.js';

export type {
  ValidationResult,
  ConfigValidationResult,
  TypeGuard,
  Validator,
  ConfigParseResult,
  JsonParseResult,
  ErrorContext,
  ContextualError,
} from './validation-types.js';

export type {
  IResponseBuilder,
  IResponseFormatter,
  ICompatibilityLayer,
  SerializationOptions,
  ResponseMetadata,
  ResponseFieldRequirements,
} from './response-types.js';

export {
  createResponseBuilder,
  createResponseFormatter,
  createCompatibilityLayer,
  buildEnhancedResponse,
  formatAsToolResponse,
  ResponseBuilder,
  ResponseFormatter,
  CompatibilityLayer,
} from './response-builder.js';

export {
  EnhancedResponseBuilder,
  createEnhancedResponseBuilder,
  createMinimalEnhancedResponseBuilder,
  createComprehensiveEnhancedResponseBuilder,
} from './enhanced-response-builder.js';

export type {
  SynchronousEnhancedResponse,
  StructuredFeedback,
  ImprovementSuggestion,
  CriticalIssue,
  NextStep,
  CompletionStatus,
  LoopInfo,
  TerminationInfo,
  SessionMetadata,
  ProgressAssessment,
  FeedbackAnalysis,
  ImprovementTracking,
  EnhancedResponseConfig,
} from './synchronous-response-types.js';

export {
  IssueCategory,
  Priority,
  Severity,
  CriticalIssueType,
  ProgressTrend,
  FeedbackDetailLevel,
  DEFAULT_ENHANCED_RESPONSE_CONFIG,
  isSynchronousEnhancedResponse,
  isStructuredFeedback,
  isCompletionStatus,
  isLoopInfo,
} from './synchronous-response-types.js';