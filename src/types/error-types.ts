/**
 * Error handling types and utilities for GansAuditor_Codex
 * 
 * This module defines comprehensive error categorization, structured error responses,
 * and graceful degradation strategies for the GansAuditor_Codex system.
 * 
 * Requirements addressed:
 * - 6.4: Graceful degradation for non-critical failures
 * - 7.5: Structured error responses with actionable suggestions
 */

// ============================================================================
// Error Categories and Base Types
// ============================================================================

/**
 * Error categories for structured error handling
 */
export type ErrorCategory = "config" | "codex" | "filesystem" | "session";

/**
 * Error severity levels
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/**
 * Recovery strategies for different error types
 */
export type RecoveryStrategy = 
  | "retry" 
  | "fallback" 
  | "skip" 
  | "abort" 
  | "user_intervention";

/**
 * Detailed error information with actionable suggestions
 */
export interface ErrorDetails {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  recovery_strategy: RecoveryStrategy;
  suggestions: string[];
  context?: Record<string, any>;
  timestamp: number;
  component: string;
}

/**
 * Structured error response format
 */
export interface StructuredErrorResponse {
  error: string;
  status: "failed";
  details: ErrorDetails;
  fallback_data?: any;
}

// ============================================================================
// Specific Error Classes
// ============================================================================

/**
 * Base class for all GansAuditor_Codex errors
 */
export abstract class GanAuditorError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly recoverable: boolean;
  public readonly recovery_strategy: RecoveryStrategy;
  public readonly suggestions: string[];
  public readonly context: Record<string, any>;
  public readonly timestamp: number;
  public readonly component: string;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = "medium",
    recoverable: boolean = true,
    recovery_strategy: RecoveryStrategy = "retry",
    suggestions: string[] = [],
    context: Record<string, any> = {},
    component: string = "unknown"
  ) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.recoverable = recoverable;
    this.recovery_strategy = recovery_strategy;
    this.suggestions = suggestions;
    this.context = context;
    this.timestamp = Date.now();
    this.component = component;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to structured response format
   */
  toStructuredResponse(fallback_data?: any): StructuredErrorResponse {
    return {
      error: this.message,
      status: "failed",
      details: {
        category: this.category,
        severity: this.severity,
        recoverable: this.recoverable,
        recovery_strategy: this.recovery_strategy,
        suggestions: this.suggestions,
        context: this.context,
        timestamp: this.timestamp,
        component: this.component,
      },
      fallback_data,
    };
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Configuration parsing and validation errors
 */
export class ConfigurationError extends GanAuditorError {
  constructor(
    message: string,
    suggestions: string[] = [],
    context: Record<string, any> = {},
    component: string = "config-parser"
  ) {
    super(
      message,
      "config",
      "medium",
      true,
      "fallback",
      suggestions.length > 0 ? suggestions : [
        "Check the gan-config block syntax for valid JSON",
        "Ensure all configuration values are within valid ranges",
        "Refer to documentation for supported configuration options",
      ],
      context,
      component
    );
  }
}

/**
 * Invalid configuration value error
 */
export class InvalidConfigValueError extends ConfigurationError {
  constructor(field: string, value: any, validRange?: string) {
    const suggestions = [
      `Fix the '${field}' configuration value`,
      validRange ? `Valid range: ${validRange}` : "Check documentation for valid values",
      "The system will use default values for invalid configurations",
    ];

    super(
      `Invalid configuration value for '${field}': ${value}`,
      suggestions,
      { field, value, validRange },
      "config-validator"
    );
  }
}

/**
 * Missing required configuration error
 */
export class MissingConfigError extends ConfigurationError {
  constructor(field: string, scope?: string) {
    const suggestions = [
      `Provide the required '${field}' configuration`,
      scope ? `This is required when scope is set to '${scope}'` : "This field is mandatory",
      "Check the configuration documentation for required fields",
    ];

    super(
      `Missing required configuration: ${field}`,
      suggestions,
      { field, scope },
      "config-validator"
    );
  }
}

// ============================================================================
// Codex Integration Errors
// ============================================================================

/**
 * Codex CLI availability and execution errors
 */
export class CodexError extends GanAuditorError {
  constructor(
    message: string,
    severity: ErrorSeverity = "high",
    recovery_strategy: RecoveryStrategy = "fallback",
    suggestions: string[] = [],
    context: Record<string, any> = {},
    component: string = "codex-judge"
  ) {
    super(
      message,
      "codex",
      severity,
      recovery_strategy !== "abort",
      recovery_strategy,
      suggestions.length > 0 ? suggestions : [
        "Ensure Codex CLI is installed and available in PATH",
        "Check Codex CLI configuration and permissions",
        "The system will provide fallback audit results",
      ],
      context,
      component
    );
  }
}

/**
 * Codex CLI not available error
 */
export class CodexNotAvailableError extends CodexError {
  constructor(executable: string = "codex") {
    super(
      `Codex CLI '${executable}' is not available`,
      "high",
      "fallback",
      [
        `Install Codex CLI and ensure '${executable}' is in your PATH`,
        "Verify Codex CLI installation with: codex --version",
        "Check system permissions for executing Codex CLI",
        "The system will provide basic audit feedback without Codex",
      ],
      { executable },
      "codex-availability"
    );
  }
}

/**
 * Codex CLI execution timeout error
 */
export class CodexTimeoutError extends CodexError {
  constructor(timeout: number, command?: string) {
    super(
      `Codex CLI execution timed out after ${timeout}ms`,
      "medium",
      "fallback",
      [
        "Increase the timeout configuration for Codex CLI",
        "Check system resources and Codex CLI performance",
        "Consider reducing the context size for faster processing",
        "The system will provide a fallback audit result",
      ],
      { timeout, command },
      "codex-execution"
    );
  }
}

/**
 * Codex CLI response parsing error
 */
export class CodexResponseError extends CodexError {
  constructor(message: string, rawResponse?: string) {
    super(
      `Failed to parse Codex CLI response: ${message}`,
      "medium",
      "fallback",
      [
        "Check Codex CLI output format and version compatibility",
        "Verify Codex CLI is returning valid JSON responses",
        "The system will attempt greedy parsing as fallback",
        "Consider updating Codex CLI to the latest version",
      ],
      { rawResponse: rawResponse?.substring(0, 500) },
      "codex-parser"
    );
  }
}

// ============================================================================
// File System Errors
// ============================================================================

/**
 * File system operation errors
 */
export class FileSystemError extends GanAuditorError {
  constructor(
    message: string,
    severity: ErrorSeverity = "medium",
    recovery_strategy: RecoveryStrategy = "skip",
    suggestions: string[] = [],
    context: Record<string, any> = {},
    component: string = "filesystem"
  ) {
    super(
      message,
      "filesystem",
      severity,
      recovery_strategy !== "abort",
      recovery_strategy,
      suggestions.length > 0 ? suggestions : [
        "Check file and directory permissions",
        "Ensure sufficient disk space is available",
        "Verify file paths are correct and accessible",
      ],
      context,
      component
    );
  }
}

/**
 * File not found error
 */
export class FileNotFoundError extends FileSystemError {
  constructor(path: string) {
    super(
      `File not found: ${path}`,
      "low",
      "skip",
      [
        "Verify the file path is correct",
        "Check if the file was moved or deleted",
        "The system will continue without this file",
      ],
      { path },
      "file-reader"
    );
  }
}

/**
 * File access permission error
 */
export class FileAccessError extends FileSystemError {
  constructor(path: string, operation: string) {
    super(
      `Access denied for ${operation} operation on: ${path}`,
      "medium",
      "skip",
      [
        "Check file and directory permissions",
        "Ensure the process has necessary access rights",
        "The system will skip this file and continue",
      ],
      { path, operation },
      "file-access"
    );
  }
}

/**
 * Directory creation error
 */
export class DirectoryCreationError extends FileSystemError {
  constructor(path: string, reason?: string) {
    super(
      `Failed to create directory: ${path}${reason ? ` (${reason})` : ""}`,
      "medium",
      "retry",
      [
        "Check parent directory permissions",
        "Ensure sufficient disk space",
        "Verify the path is valid for the operating system",
      ],
      { path, reason },
      "directory-manager"
    );
  }
}

// ============================================================================
// Session Management Errors
// ============================================================================

/**
 * Session management and persistence errors
 */
export class SessionError extends GanAuditorError {
  constructor(
    message: string,
    severity: ErrorSeverity = "medium",
    recovery_strategy: RecoveryStrategy = "fallback",
    suggestions: string[] = [],
    context: Record<string, any> = {},
    component: string = "session-manager"
  ) {
    super(
      message,
      "session",
      severity,
      recovery_strategy !== "abort",
      recovery_strategy,
      suggestions.length > 0 ? suggestions : [
        "Check session state directory permissions",
        "Ensure sufficient disk space for session files",
        "The system will attempt to recover or create new session",
      ],
      context,
      component
    );
  }
}

/**
 * Session not found error
 */
export class SessionNotFoundError extends SessionError {
  constructor(sessionId: string) {
    super(
      `Session not found: ${sessionId}`,
      "low",
      "fallback",
      [
        "The session may have expired or been cleaned up",
        "A new session will be created automatically",
        "Check if the session ID is correct",
      ],
      { sessionId },
      "session-loader"
    );
  }
}



/**
 * Session persistence error
 */
export class SessionPersistenceError extends SessionError {
  constructor(sessionId: string, operation: string, reason?: string) {
    super(
      `Failed to ${operation} session ${sessionId}${reason ? `: ${reason}` : ""}`,
      "medium",
      "retry",
      [
        "Check session state directory permissions",
        "Ensure sufficient disk space",
        "The session will continue in memory only",
      ],
      { sessionId, operation, reason },
      "session-persister"
    );
  }
}

// ============================================================================
// Synchronous Audit Workflow Errors (Requirements 7.1-7.4)
// ============================================================================

/**
 * Audit service unavailable error (Requirement 7.1)
 */
export class AuditServiceUnavailableError extends CodexError {
  constructor(service: string = "GAN Auditor", details?: string) {
    super(
      `Audit service '${service}' is currently unavailable${details ? `: ${details}` : ""}`,
      "high",
      "fallback",
      [
        "Check if the audit service is running and accessible",
        "Verify network connectivity to the audit service",
        "Ensure audit service configuration is correct",
        "The system will provide a fallback audit result with limited functionality",
        "You can continue working and retry the audit later",
      ],
      { service, details, timestamp: Date.now() },
      "audit-service"
    );
  }
}

/**
 * Invalid code format error (Requirement 7.2)
 */
export class InvalidCodeFormatError extends GanAuditorError {
  constructor(format: string, expectedFormats: string[] = [], codeSnippet?: string) {
    const formatGuidance = expectedFormats.length > 0 
      ? `Expected formats: ${expectedFormats.join(", ")}`
      : "Please ensure code is properly formatted";

    super(
      `Invalid code format detected: ${format}`,
      "config",
      "medium",
      true,
      "user_intervention",
      [
        formatGuidance,
        "Ensure code blocks are properly delimited with triple backticks (```)",
        "Check that language identifiers are correct (e.g., ```typescript, ```javascript)",
        "Verify that code syntax is valid for the specified language",
        "Remove any malformed or incomplete code blocks",
        "The system can still process the content but audit quality may be reduced",
      ],
      { 
        detectedFormat: format, 
        expectedFormats, 
        codeSnippet: codeSnippet?.substring(0, 200),
        timestamp: Date.now(),
      },
      "code-formatter"
    );
  }
}

/**
 * Session corruption error with recovery options (Requirement 7.3)
 */
export class SessionCorruptionError extends SessionError {
  constructor(sessionId: string, corruptionType: string, recoveryOptions: string[] = []) {
    const defaultRecoveryOptions = [
      "Reset the session and start fresh",
      "Attempt to recover partial session data",
      "Continue with a new session using default configuration",
    ];

    super(
      `Session ${sessionId} is corrupted: ${corruptionType}`,
      "medium",
      "fallback",
      [
        "Session data integrity check failed",
        "Available recovery options:",
        ...(recoveryOptions.length > 0 ? recoveryOptions : defaultRecoveryOptions),
        "The system will attempt automatic recovery",
        "If recovery fails, a new session will be created automatically",
      ],
      { 
        sessionId, 
        corruptionType, 
        recoveryOptions: recoveryOptions.length > 0 ? recoveryOptions : defaultRecoveryOptions,
        timestamp: Date.now(),
      },
      "session-validator"
    );
  }

  /**
   * Get available recovery options for this corruption
   */
  getRecoveryOptions(): string[] {
    return this.context.recoveryOptions || [];
  }

  /**
   * Check if automatic recovery is possible
   */
  canAutoRecover(): boolean {
    const corruptionType = this.context.corruptionType;
    // Some corruption types can be auto-recovered
    return ["partial_data", "missing_fields", "format_mismatch"].includes(corruptionType);
  }
}

/**
 * Audit timeout error with partial results (Requirement 7.4)
 */
export class AuditTimeoutError extends CodexError {
  constructor(
    timeoutMs: number, 
    partialResults?: any, 
    completionPercentage?: number,
    operation: string = "audit"
  ) {
    const completionInfo = completionPercentage 
      ? ` (${Math.round(completionPercentage)}% completed)`
      : "";

    super(
      `${operation} operation timed out after ${timeoutMs}ms${completionInfo}`,
      "medium",
      "fallback",
      [
        `The ${operation} operation exceeded the ${timeoutMs}ms timeout limit`,
        partialResults ? "Partial results are available and will be returned" : "No partial results available",
        "Consider increasing the timeout configuration for complex operations",
        "Try breaking down large code submissions into smaller chunks",
        "Check system resources and network connectivity",
        "The system will provide the best available results based on completed analysis",
      ],
      { 
        timeoutMs, 
        operation,
        hasPartialResults: !!partialResults,
        completionPercentage: completionPercentage || 0,
        partialResults: partialResults ? JSON.stringify(partialResults).substring(0, 500) : null,
        timestamp: Date.now(),
      },
      "timeout-handler"
    );
  }

  /**
   * Get partial results if available
   */
  getPartialResults(): any {
    return this.context.partialResults ? JSON.parse(this.context.partialResults) : null;
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    return this.context.completionPercentage || 0;
  }

  /**
   * Check if partial results are available
   */
  hasPartialResults(): boolean {
    return this.context.hasPartialResults || false;
  }
}

// ============================================================================
// Error Utilities and Helpers
// ============================================================================

/**
 * Error classification utility
 */
export class ErrorClassifier {
  /**
   * Classify an unknown error into appropriate category
   */
  static classify(error: unknown): GanAuditorError {
    if (error instanceof GanAuditorError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Classify based on error message patterns
    if (this.isPromptError(message)) {
      return new PromptRenderingError(message, undefined, { originalError: message, stack });
    }

    if (this.isWorkflowError(message)) {
      return new WorkflowStepError(message, 'unknown', undefined, true);
    }

    if (this.isAnalysisError(message)) {
      return new CompletionAnalysisError(message);
    }

    if (this.isConfigError(message)) {
      return new ConfigurationError(message, [], { originalError: message, stack });
    }

    if (this.isCodexError(message)) {
      return new CodexError(message, "medium", "fallback", [], { originalError: message, stack });
    }

    if (this.isFileSystemError(message)) {
      return new FileSystemError(message, "medium", "skip", [], { originalError: message, stack });
    }

    if (this.isSessionError(message)) {
      return new SessionError(message, "medium", "fallback", [], { originalError: message, stack });
    }

    // Default to filesystem-style error as a safe concrete type
    return new FileSystemError(
      message,
      "medium",
      "retry",
      ["Check the error details and try again", "Contact support if the issue persists"],
      { originalError: message, stack },
      "unknown"
    );
  }

  private static isConfigError(message: string): boolean {
    const patterns = [
      /config/i,
      /validation/i,
      /invalid.*value/i,
      /missing.*required/i,
      /json.*parse/i,
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  private static isCodexError(message: string): boolean {
    const patterns = [
      /codex/i,
      /command.*not.*found/i,
      /spawn.*ENOENT/i,
      /timeout/i,
      /execution.*failed/i,
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  private static isFileSystemError(message: string): boolean {
    const patterns = [
      /ENOENT/i,
      /EACCES/i,
      /EPERM/i,
      /file.*not.*found/i,
      /permission.*denied/i,
      /access.*denied/i,
      /directory/i,
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  private static isSessionError(message: string): boolean {
    const patterns = [
      /session/i,
      /state/i,
      /persistence/i,
      /corrupted/i,
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  private static isPromptError(message: string): boolean {
    const patterns = [
      /prompt/i,
      /template/i,
      /rendering/i,
      /system.*prompt/i,
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  private static isWorkflowError(message: string): boolean {
    const patterns = [
      /workflow/i,
      /step/i,
      /INIT|REPRO|STATIC|TESTS|DYNAMIC|CONFORM|TRACE|VERDICT/i,
      /audit.*step/i,
    ];
    return patterns.some(pattern => pattern.test(message));
  }

  private static isAnalysisError(message: string): boolean {
    const patterns = [
      /analysis/i,
      /completion/i,
      /evaluation/i,
      /assessment/i,
    ];
    return patterns.some(pattern => pattern.test(message));
  }
}

/**
 * Error recovery utility
 */
export class ErrorRecovery {
  /**
   * Determine if an error is recoverable
   */
  static isRecoverable(error: GanAuditorError): boolean {
    return error.recoverable && error.recovery_strategy !== "abort";
  }

  /**
   * Get recovery suggestions for an error
   */
  static getRecoverySuggestions(error: GanAuditorError): string[] {
    const baseSuggestions = [...error.suggestions];

    // Add category-specific suggestions
    switch (error.category) {
      case "config":
        baseSuggestions.push("The system will use default configuration values");
        break;
      case "codex":
        baseSuggestions.push("The system will provide fallback audit results");
        break;
      case "filesystem":
        baseSuggestions.push("The system will skip inaccessible files");
        break;
      case "session":
        baseSuggestions.push("The system will create a new session if needed");
        break;
    }

    return baseSuggestions;
  }

  /**
   * Create fallback data for an error
   */
  static createFallbackData(error: GanAuditorError): any {
    switch (error.category) {
      case "config":
        return { useDefaults: true, message: "Using default configuration" };
      case "codex":
        return { 
          fallbackAudit: true, 
          message: "Audit completed with limited functionality" 
        };
      case "filesystem":
        return { 
          partialData: true, 
          message: "Some files were skipped due to access issues" 
        };
      case "session":
        return { 
          newSession: true, 
          message: "Created new session due to persistence issues" 
        };
      default:
        return { message: "Operation completed with limitations" };
    }
  }
}

// ============================================================================
// Error Aggregation
// ============================================================================

/**
 * Error aggregation for batch operations
 */
export class ErrorAggregator {
  private errors: GanAuditorError[] = [];
  private warnings: string[] = [];

  /**
   * Add an error to the aggregator
   */
  addError(error: unknown): void {
    const classified = ErrorClassifier.classify(error);
    this.errors.push(classified);
  }

  /**
   * Add a warning message
   */
  addWarning(message: string): void {
    this.warnings.push(message);
  }

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.errors.some(error => error.severity === "critical");
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get all errors
   */
  getErrors(): GanAuditorError[] {
    return [...this.errors];
  }

  /**
   * Get all warnings
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Get summary of all issues
   */
  getSummary(): {
    errorCount: number;
    warningCount: number;
    criticalCount: number;
    recoverableCount: number;
  } {
    return {
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      criticalCount: this.errors.filter(e => e.severity === "critical").length,
      recoverableCount: this.errors.filter(e => e.recoverable).length,
    };
  }

  /**
   * Clear all errors and warnings
   */
  clear(): void {
    this.errors = [];
    this.warnings = [];
  }
}

// ============================================================================
// Prompt-Driven Audit Error Types (Requirement 6.3)
// ============================================================================

/**
 * Error thrown when system prompt rendering fails
 */
export class PromptRenderingError extends GanAuditorError {
  constructor(message: string, templatePath?: string, variables?: Record<string, any>) {
    super(
      message,
      'config',
      'high',
      true,
      'fallback',
      [
        'Check system prompt template file exists and is readable',
        'Verify all required template variables are provided',
        'Validate template syntax and structure',
        templatePath ? `Template path: ${templatePath}` : 'Check template path configuration',
      ],
      { templatePath, variables: variables ? Object.keys(variables) : [] },
      'system-prompt-manager'
    );
    this.name = 'PromptRenderingError';
  }
}

/**
 * Error thrown when workflow step execution fails
 */
export class WorkflowStepError extends GanAuditorError {
  constructor(
    message: string, 
    stepName: string, 
    stepIndex?: number,
    canSkip: boolean = false
  ) {
    super(
      message,
      'config',
      canSkip ? 'low' : 'high',
      true,
      canSkip ? 'skip' : 'retry',
      [
        `Workflow step: ${stepName}`,
        stepIndex !== undefined ? `Step index: ${stepIndex}` : 'Check step execution order',
        canSkip ? 'This step can be skipped if necessary' : 'This step is required for audit completion',
        'Review step prerequisites and dependencies',
      ],
      { stepName, stepIndex, canSkip },
      'audit-workflow'
    );
    this.name = 'WorkflowStepError';
  }
}

/**
 * Error thrown when completion analysis fails
 */
export class CompletionAnalysisError extends GanAuditorError {
  constructor(message: string, currentLoop?: number, scoreHistory?: number[]) {
    super(
      message,
      'config',
      'low',
      true,
      'fallback',
      [
        'Completion analysis will use fallback heuristics',
        currentLoop !== undefined ? `Current loop: ${currentLoop}` : 'Check loop counter',
        scoreHistory ? `Score history available: ${scoreHistory.length} entries` : 'Limited score history',
        'Manual review may be needed for final completion decision',
      ],
      { currentLoop, scoreHistoryLength: scoreHistory?.length || 0 },
      'completion-evaluator'
    );
    this.name = 'CompletionAnalysisError';
  }
}

/**
 * Error thrown when prompt context operations fail
 */
export class PromptContextError extends GanAuditorError {
  constructor(
    message: string, 
    operation: 'store' | 'retrieve' | 'validate',
    sessionId?: string
  ) {
    super(
      message,
      'session',
      operation === 'retrieve' ? 'low' : 'high',
      true,
      operation === 'store' ? 'skip' : 'fallback',
      [
        `Operation: ${operation}`,
        sessionId ? `Session ID: ${sessionId}` : 'Check session identifier',
        operation === 'store' ? 'Audit can continue without context persistence' : 'Fallback context will be used',
        'Check session storage permissions and disk space',
      ],
      { operation, sessionId },
      'session-manager'
    );
    this.name = 'PromptContextError';
  }
}

/**
 * Error thrown when quality progression tracking fails
 */
export class QualityProgressionError extends GanAuditorError {
  constructor(message: string, sessionId?: string, thoughtNumber?: number) {
    super(
      message,
      'session',
      'low',
      true,
      'skip',
      [
        'Quality progression tracking will be limited',
        sessionId ? `Session ID: ${sessionId}` : 'Check session identifier',
        thoughtNumber !== undefined ? `Thought number: ${thoughtNumber}` : 'Check thought sequence',
        'Audit can continue with reduced progress tracking',
      ],
      { sessionId, thoughtNumber },
      'session-manager'
    );
    this.name = 'QualityProgressionError';
  }
}

/**
 * Error category for workflow-related errors
 */
export type WorkflowErrorCategory = 'workflow';

/**
 * Error category for analysis-related errors
 */
export type AnalysisErrorCategory = 'analysis';

// Extend the existing ErrorCategory type to include new categories
declare module './error-types.js' {
  interface ErrorCategoryMap {
    workflow: WorkflowErrorCategory;
    analysis: AnalysisErrorCategory;
  }
}