/**
 * Validation and utility types for GansAuditor_Codex
 *
 * This module defines types for validation functions, type guards,
 * and utility interfaces used throughout the GansAuditor_Codex system.
 */
import type { GansAuditorCodexSessionConfig, GansAuditorCodexThoughtData, GansAuditorCodexReview, GansAuditorCodexAuditRequest, GansAuditorCodexInlineConfig, ErrorCategory, SessionConfig } from './gan-types.js';
/**
 * Result of a validation operation
 */
export interface ValidationResult<T = unknown> {
    isValid: boolean;
    data?: T;
    errors: string[];
    warnings?: string[];
}
/**
 * Configuration validation result with applied defaults
 */
export interface ConfigValidationResult extends ValidationResult<GansAuditorCodexSessionConfig> {
    appliedDefaults: Partial<GansAuditorCodexSessionConfig>;
}
/**
 * Type guard function signature
 */
export type TypeGuard<T> = (value: unknown) => value is T;
/**
 * Validation function signature
 */
export type Validator<T> = (value: unknown) => ValidationResult<T>;
/**
 * Result of parsing inline configuration
 */
export interface ConfigParseResult {
    success: boolean;
    config?: Partial<GansAuditorCodexInlineConfig>;
    error?: string;
    rawConfig?: string;
}
/**
 * JSON parsing result with fallback handling
 */
export interface JsonParseResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    usedFallback?: boolean;
}
/**
 * Context information for error reporting
 */
export interface ErrorContext {
    operation: string;
    category: ErrorCategory;
    sessionId?: string;
    thoughtNumber?: number;
    additionalInfo?: Record<string, unknown>;
}
/**
 * Structured error with context
 */
export interface ContextualError extends Error {
    context: ErrorContext;
    recoverable: boolean;
    suggestions?: string[];
}
/**
 * Configuration sanitization options
 */
export interface SanitizationOptions {
    clampThreshold: boolean;
    validateScope: boolean;
    ensureRequiredPaths: boolean;
    normalizeJudges: boolean;
}
/**
 * Sanitization result
 */
export interface SanitizationResult<T> {
    sanitized: T;
    changes: Array<{
        field: string;
        oldValue: unknown;
        newValue: unknown;
        reason: string;
    }>;
}
/**
 * Function to merge configurations with precedence
 */
export type ConfigMerger = (base: GansAuditorCodexSessionConfig, override: Partial<GansAuditorCodexInlineConfig>) => GansAuditorCodexSessionConfig;
/**
 * Function to generate unique session IDs
 */
export type SessionIdGenerator = (cwd?: string, username?: string, timestamp?: number) => string;
/**
 * Function to validate thought data structure
 */
export type ThoughtDataValidator = (input: unknown) => ValidationResult<GansAuditorCodexThoughtData>;
/**
 * Function to validate GAN review structure
 */
export type GanReviewValidator = (input: unknown) => ValidationResult<GansAuditorCodexReview>;
/**
 * Function to validate audit request structure
 */
export type AuditRequestValidator = (input: unknown) => ValidationResult<GansAuditorCodexAuditRequest>;
/**
 * Schema definition for configuration validation
 */
export interface ConfigSchema {
    task: {
        type: 'string';
        required: boolean;
        minLength?: number;
        maxLength?: number;
    };
    scope: {
        type: 'enum';
        values: Array<'diff' | 'paths' | 'workspace'>;
        required: boolean;
    };
    paths: {
        type: 'array';
        itemType: 'string';
        required: boolean;
        dependsOn?: string;
    };
    threshold: {
        type: 'number';
        required: boolean;
        min: number;
        max: number;
    };
    maxCycles: {
        type: 'number';
        required: boolean;
        min: number;
        max: number;
    };
    candidates: {
        type: 'number';
        required: boolean;
        min: number;
        max: number;
    };
    judges: {
        type: 'array';
        itemType: 'string';
        required: boolean;
        minItems?: number;
    };
    applyFixes: {
        type: 'boolean';
        required: boolean;
    };
}
/**
 * Runtime type information for validation
 */
export interface TypeInfo {
    name: string;
    validator: (value: unknown) => boolean;
    description: string;
}
/**
 * Collection of type validators
 */
export interface TypeValidators {
    string: TypeGuard<string>;
    number: TypeGuard<number>;
    boolean: TypeGuard<boolean>;
    array: <T>(itemValidator: TypeGuard<T>) => TypeGuard<T[]>;
    object: TypeGuard<Record<string, unknown>>;
    enum: <T extends string>(values: T[]) => TypeGuard<T>;
}
/**
 * Utility type to make all properties of T optional recursively
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
/**
 * Utility type to make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
/**
 * Utility type for configuration with required fields based on scope
 */
export type ScopedConfig<S extends SessionConfig['scope']> = S extends 'paths' ? RequireFields<SessionConfig, 'paths'> : SessionConfig;
//# sourceMappingURL=validation-types.d.ts.map