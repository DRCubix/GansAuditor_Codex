/**
 * Validation helpers for configuration and data types for GAN Auditor Integration
 *
 * This module provides comprehensive validation utilities for configuration,
 * data types, and input sanitization with detailed error reporting.
 *
 * Requirements addressed:
 * - 4.5: Configuration validation and sanitization
 * - 7.3: Input validation and type checking
 * - 7.4: Data integrity and error prevention
 */
import type { SessionConfig, GanReview, AuditRequest } from '../types/gan-types.js';
/**
 * Configuration for validation operations
 */
export interface ValidationConfig {
    strictMode: boolean;
    allowUnknownProperties: boolean;
    coerceTypes: boolean;
    validateRanges: boolean;
    maxStringLength: number;
    maxArrayLength: number;
    maxObjectDepth: number;
}
/**
 * Result of a validation operation
 */
export interface ValidationResult<T = any> {
    valid: boolean;
    data?: T;
    errors: ValidationError[];
    warnings: string[];
    metadata?: {
        originalType: string;
        validatedType: string;
        coercions: string[];
        sanitizations: string[];
    };
}
/**
 * Validation error with detailed information
 */
export interface ValidationError {
    field: string;
    message: string;
    code: string;
    value?: any;
    expected?: any;
    severity: 'error' | 'warning';
}
/**
 * Schema definition for validation
 */
export interface ValidationSchema {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
    required?: boolean;
    default?: any;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: any[];
    properties?: Record<string, ValidationSchema>;
    items?: ValidationSchema;
    custom?: (value: any) => ValidationResult;
}
/**
 * Comprehensive validation utilities
 */
export declare class ValidationUtils {
    private config;
    constructor(config?: Partial<ValidationConfig>);
    /**
     * Validate data against schema
     */
    validate<T = any>(data: any, schema: ValidationSchema | Record<string, ValidationSchema>, path?: string): ValidationResult<T>;
    /**
     * Validate session configuration
     */
    validateSessionConfig(config: any): ValidationResult<SessionConfig>;
    /**
     * Validate GAN review data
     */
    validateGanReview(review: any): ValidationResult<GanReview>;
    /**
     * Validate audit request
     */
    validateAuditRequest(request: any): ValidationResult<AuditRequest>;
    /**
     * Sanitize string input
     */
    sanitizeString(input: string, options?: {
        maxLength?: number;
        allowHtml?: boolean;
        allowNewlines?: boolean;
        trim?: boolean;
    }): {
        sanitized: string;
        changes: string[];
    };
    /**
     * Validate and sanitize file path
     */
    validateFilePath(path: string): ValidationResult<string>;
    /**
     * Validate object with multiple properties
     */
    private validateObject;
    /**
     * Validate and coerce type
     */
    private validateType;
    /**
     * Validate ranges (min/max, length, etc.)
     */
    private validateRange;
    /**
     * Coerce value to target type
     */
    private coerceType;
}
/**
 * Global validation utilities instance
 */
export declare const validationUtils: ValidationUtils;
/**
 * Configure the global validation utilities
 */
export declare function configureValidationUtils(config: Partial<ValidationConfig>): void;
/**
 * Validate session configuration using global utils
 */
export declare function validateSessionConfig(config: any): ValidationResult<SessionConfig>;
/**
 * Validate GAN review using global utils
 */
export declare function validateGanReview(review: any): ValidationResult<GanReview>;
/**
 * Validate audit request using global utils
 */
export declare function validateAuditRequest(request: any): ValidationResult<AuditRequest>;
/**
 * Sanitize string using global utils
 */
export declare function sanitizeString(input: string, options?: {
    maxLength?: number;
    allowHtml?: boolean;
    allowNewlines?: boolean;
    trim?: boolean;
}): {
    sanitized: string;
    changes: string[];
};
/**
 * Validate file path using global utils
 */
export declare function validateFilePath(path: string): ValidationResult<string>;
/**
 * Generic validation function using global utils
 */
export declare function validateData<T = any>(data: any, schema: ValidationSchema | Record<string, ValidationSchema>): ValidationResult<T>;
//# sourceMappingURL=validation-utils.d.ts.map