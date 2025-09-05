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
/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION_CONFIG = {
    strictMode: false,
    allowUnknownProperties: true,
    coerceTypes: true,
    validateRanges: true,
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
};
// ============================================================================
// Validation Utilities Implementation
// ============================================================================
/**
 * Comprehensive validation utilities
 */
export class ValidationUtils {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    }
    /**
     * Validate data against schema
     */
    validate(data, schema, path = 'root') {
        const errors = [];
        const warnings = [];
        const coercions = [];
        const sanitizations = [];
        try {
            // Handle object schema (multiple properties)
            if (!('type' in schema)) {
                return this.validateObject(data, schema, path);
            }
            const singleSchema = schema;
            let validatedData = data;
            const originalType = typeof data;
            // Check required
            if (singleSchema.required && (data === undefined || data === null)) {
                errors.push({
                    field: path,
                    message: 'Field is required',
                    code: 'REQUIRED',
                    severity: 'error',
                });
                // Use default if available
                if (singleSchema.default !== undefined) {
                    validatedData = singleSchema.default;
                    coercions.push(`${path}: used default value`);
                }
                else {
                    return {
                        valid: false,
                        errors,
                        warnings,
                        metadata: { originalType, validatedType: typeof validatedData, coercions, sanitizations },
                    };
                }
            }
            // Handle undefined/null with defaults
            if ((data === undefined || data === null) && singleSchema.default !== undefined) {
                validatedData = singleSchema.default;
                coercions.push(`${path}: used default value`);
            }
            // Skip validation if data is still undefined/null and not required
            if (validatedData === undefined || validatedData === null) {
                return {
                    valid: true,
                    data: validatedData,
                    errors,
                    warnings,
                    metadata: { originalType, validatedType: typeof validatedData, coercions, sanitizations },
                };
            }
            // Type validation and coercion
            const typeResult = this.validateType(validatedData, singleSchema, path);
            errors.push(...typeResult.errors);
            warnings.push(...typeResult.warnings);
            coercions.push(...typeResult.metadata?.coercions || []);
            sanitizations.push(...typeResult.metadata?.sanitizations || []);
            if (typeResult.valid) {
                validatedData = typeResult.data;
            }
            // Range validation
            if (this.config.validateRanges) {
                const rangeResult = this.validateRange(validatedData, singleSchema, path);
                errors.push(...rangeResult.errors);
                warnings.push(...rangeResult.warnings);
            }
            // Pattern validation
            if (singleSchema.pattern && typeof validatedData === 'string') {
                if (!singleSchema.pattern.test(validatedData)) {
                    errors.push({
                        field: path,
                        message: `Value does not match pattern: ${singleSchema.pattern}`,
                        code: 'PATTERN_MISMATCH',
                        value: validatedData,
                        severity: 'error',
                    });
                }
            }
            // Enum validation
            if (singleSchema.enum && !singleSchema.enum.includes(validatedData)) {
                errors.push({
                    field: path,
                    message: `Value must be one of: ${singleSchema.enum.join(', ')}`,
                    code: 'ENUM_MISMATCH',
                    value: validatedData,
                    expected: singleSchema.enum,
                    severity: 'error',
                });
            }
            // Array items validation
            if (singleSchema.type === 'array' && singleSchema.items && Array.isArray(validatedData)) {
                const itemResults = validatedData.map((item, index) => {
                    return this.validate(item, singleSchema.items, `${path}[${index}]`);
                });
                for (const itemResult of itemResults) {
                    errors.push(...itemResult.errors);
                    warnings.push(...itemResult.warnings);
                    coercions.push(...itemResult.metadata?.coercions || []);
                    sanitizations.push(...itemResult.metadata?.sanitizations || []);
                }
                // Update validated data with validated items
                validatedData = itemResults.map(r => r.data);
            }
            // Custom validation
            if (singleSchema.custom) {
                const customResult = singleSchema.custom(validatedData);
                errors.push(...customResult.errors);
                warnings.push(...customResult.warnings);
            }
            return {
                valid: errors.filter(e => e.severity === 'error').length === 0,
                data: validatedData,
                errors,
                warnings,
                metadata: {
                    originalType,
                    validatedType: typeof validatedData,
                    coercions,
                    sanitizations
                },
            };
        }
        catch (error) {
            errors.push({
                field: path,
                message: `Validation error: ${error.message}`,
                code: 'VALIDATION_ERROR',
                severity: 'error',
            });
            return {
                valid: false,
                errors,
                warnings,
                metadata: {
                    originalType: typeof data,
                    validatedType: typeof data,
                    coercions,
                    sanitizations
                },
            };
        }
    }
    /**
     * Validate session configuration
     */
    validateSessionConfig(config) {
        const schema = {
            task: {
                type: 'string',
                required: false,
                default: 'Audit and improve the provided candidate',
                minLength: 1,
                maxLength: 500,
            },
            scope: {
                type: 'string',
                required: false,
                default: 'diff',
                enum: ['diff', 'paths', 'workspace'],
            },
            paths: {
                type: 'array',
                required: false,
                items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 500,
                },
                maxLength: 100,
            },
            threshold: {
                type: 'number',
                required: false,
                default: 85,
                min: 0,
                max: 100,
            },
            maxCycles: {
                type: 'number',
                required: false,
                default: 1,
                min: 1,
                max: 10,
            },
            candidates: {
                type: 'number',
                required: false,
                default: 1,
                min: 1,
                max: 5,
            },
            judges: {
                type: 'array',
                required: false,
                default: ['internal'],
                items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                },
                maxLength: 10,
            },
            applyFixes: {
                type: 'boolean',
                required: false,
                default: false,
            },
        };
        const result = this.validate(config, schema);
        // Additional validation for paths when scope is 'paths'
        if (result.valid && result.data?.scope === 'paths') {
            if (!result.data.paths || result.data.paths.length === 0) {
                result.errors.push({
                    field: 'paths',
                    message: 'Paths array is required when scope is "paths"',
                    code: 'CONDITIONAL_REQUIRED',
                    severity: 'error',
                });
                result.valid = false;
            }
        }
        return result;
    }
    /**
     * Validate GAN review data
     */
    validateGanReview(review) {
        const schema = {
            overall: {
                type: 'number',
                required: true,
                min: 0,
                max: 100,
            },
            dimensions: {
                type: 'array',
                required: true,
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', required: true, minLength: 1 },
                        score: { type: 'number', required: true, min: 0, max: 100 },
                    },
                },
            },
            verdict: {
                type: 'string',
                required: true,
                enum: ['pass', 'revise', 'reject'],
            },
            review: {
                type: 'object',
                required: true,
                properties: {
                    summary: { type: 'string', required: true, minLength: 1 },
                    inline: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            properties: {
                                path: { type: 'string', required: true, minLength: 1 },
                                line: { type: 'number', required: true, min: 1 },
                                comment: { type: 'string', required: true, minLength: 1 },
                            },
                        },
                    },
                    citations: {
                        type: 'array',
                        required: true,
                        items: { type: 'string', minLength: 1 },
                    },
                },
            },
            proposed_diff: {
                type: 'string',
                required: false,
            },
            iterations: {
                type: 'number',
                required: true,
                min: 1,
            },
            judge_cards: {
                type: 'array',
                required: true,
                items: {
                    type: 'object',
                    properties: {
                        model: { type: 'string', required: true, minLength: 1 },
                        score: { type: 'number', required: true, min: 0, max: 100 },
                        notes: { type: 'string', required: false },
                    },
                },
            },
        };
        return this.validate(review, schema);
    }
    /**
     * Validate audit request
     */
    validateAuditRequest(request) {
        const schema = {
            task: {
                type: 'string',
                required: true,
                minLength: 1,
                maxLength: 1000,
            },
            candidate: {
                type: 'string',
                required: true,
                minLength: 1,
            },
            contextPack: {
                type: 'string',
                required: true,
                minLength: 1,
            },
            rubric: {
                type: 'object',
                required: true,
                properties: {
                    dimensions: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', required: true, minLength: 1 },
                                weight: { type: 'number', required: true, min: 0, max: 1 },
                            },
                        },
                    },
                },
            },
            budget: {
                type: 'object',
                required: true,
                properties: {
                    maxCycles: { type: 'number', required: true, min: 1, max: 10 },
                    candidates: { type: 'number', required: true, min: 1, max: 5 },
                    threshold: { type: 'number', required: true, min: 0, max: 100 },
                },
            },
        };
        return this.validate(request, schema);
    }
    /**
     * Sanitize string input
     */
    sanitizeString(input, options = {}) {
        let sanitized = input;
        const changes = [];
        // Trim whitespace
        if (options.trim !== false) {
            const trimmed = sanitized.trim();
            if (trimmed !== sanitized) {
                changes.push('trimmed whitespace');
                sanitized = trimmed;
            }
        }
        // Remove HTML if not allowed
        if (!options.allowHtml) {
            const htmlRemoved = sanitized.replace(/<[^>]*>/g, '');
            if (htmlRemoved !== sanitized) {
                changes.push('removed HTML tags');
                sanitized = htmlRemoved;
            }
        }
        // Remove newlines if not allowed
        if (!options.allowNewlines) {
            const newlinesRemoved = sanitized.replace(/[\r\n]/g, ' ');
            if (newlinesRemoved !== sanitized) {
                changes.push('removed newlines');
                sanitized = newlinesRemoved;
            }
        }
        // Truncate if too long
        const maxLength = options.maxLength || this.config.maxStringLength;
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
            changes.push(`truncated to ${maxLength} characters`);
        }
        return { sanitized, changes };
    }
    /**
     * Validate and sanitize file path
     */
    validateFilePath(path) {
        const errors = [];
        const warnings = [];
        const sanitizations = [];
        let sanitizedPath = path;
        // Basic validation
        if (typeof path !== 'string') {
            errors.push({
                field: 'path',
                message: 'Path must be a string',
                code: 'INVALID_TYPE',
                severity: 'error',
            });
            return { valid: false, errors, warnings };
        }
        if (path.length === 0) {
            errors.push({
                field: 'path',
                message: 'Path cannot be empty',
                code: 'EMPTY_PATH',
                severity: 'error',
            });
            return { valid: false, errors, warnings };
        }
        // Sanitize path
        const originalPath = sanitizedPath;
        sanitizedPath = sanitizedPath.replace(/\\/g, '/'); // Normalize separators
        sanitizedPath = sanitizedPath.replace(/\/+/g, '/'); // Remove duplicate separators
        sanitizedPath = sanitizedPath.replace(/\/$/, ''); // Remove trailing separator
        if (sanitizedPath !== originalPath) {
            sanitizations.push('normalized path separators');
        }
        // Security checks
        if (sanitizedPath.includes('..')) {
            errors.push({
                field: 'path',
                message: 'Path cannot contain ".." (directory traversal)',
                code: 'DIRECTORY_TRAVERSAL',
                severity: 'error',
            });
        }
        // Check for invalid characters
        const invalidChars = /[<>:"|?*\x00-\x1f]/;
        if (invalidChars.test(sanitizedPath)) {
            errors.push({
                field: 'path',
                message: 'Path contains invalid characters',
                code: 'INVALID_CHARACTERS',
                severity: 'error',
            });
        }
        return {
            valid: errors.length === 0,
            data: sanitizedPath,
            errors,
            warnings,
            metadata: {
                originalType: 'string',
                validatedType: 'string',
                coercions: [],
                sanitizations,
            },
        };
    }
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    /**
     * Validate object with multiple properties
     */
    validateObject(data, schema, path) {
        const errors = [];
        const warnings = [];
        const coercions = [];
        const sanitizations = [];
        if (typeof data !== 'object' || data === null) {
            if (this.config.coerceTypes) {
                data = {};
                coercions.push(`${path}: coerced to object`);
            }
            else {
                errors.push({
                    field: path,
                    message: 'Expected object',
                    code: 'INVALID_TYPE',
                    value: data,
                    severity: 'error',
                });
                return { valid: false, errors, warnings };
            }
        }
        const validatedData = { ...data };
        // Validate each property in schema
        for (const [key, propSchema] of Object.entries(schema)) {
            const propPath = `${path}.${key}`;
            const propResult = this.validate(validatedData[key], propSchema, propPath);
            errors.push(...propResult.errors);
            warnings.push(...propResult.warnings);
            coercions.push(...propResult.metadata?.coercions || []);
            sanitizations.push(...propResult.metadata?.sanitizations || []);
            if (propResult.valid) {
                validatedData[key] = propResult.data;
            }
        }
        // Check for unknown properties
        if (!this.config.allowUnknownProperties) {
            for (const key of Object.keys(validatedData)) {
                if (!(key in schema)) {
                    warnings.push(`Unknown property: ${path}.${key}`);
                }
            }
        }
        return {
            valid: errors.filter(e => e.severity === 'error').length === 0,
            data: validatedData,
            errors,
            warnings,
            metadata: {
                originalType: typeof data,
                validatedType: 'object',
                coercions,
                sanitizations,
            },
        };
    }
    /**
     * Validate and coerce type
     */
    validateType(data, schema, path) {
        const errors = [];
        const warnings = [];
        const coercions = [];
        const sanitizations = [];
        let validatedData = data;
        const actualType = Array.isArray(data) ? 'array' : typeof data;
        if (schema.type === 'any') {
            return {
                valid: true,
                data: validatedData,
                errors,
                warnings,
                metadata: { originalType: actualType, validatedType: actualType, coercions, sanitizations },
            };
        }
        if (actualType !== schema.type) {
            if (this.config.coerceTypes) {
                const coercionResult = this.coerceType(data, schema.type, path);
                if (coercionResult.success) {
                    validatedData = coercionResult.data;
                    coercions.push(`${path}: coerced from ${actualType} to ${schema.type}`);
                }
                else {
                    errors.push({
                        field: path,
                        message: `Expected ${schema.type}, got ${actualType}`,
                        code: 'TYPE_MISMATCH',
                        value: data,
                        expected: schema.type,
                        severity: 'error',
                    });
                }
            }
            else {
                errors.push({
                    field: path,
                    message: `Expected ${schema.type}, got ${actualType}`,
                    code: 'TYPE_MISMATCH',
                    value: data,
                    expected: schema.type,
                    severity: 'error',
                });
            }
        }
        return {
            valid: errors.length === 0,
            data: validatedData,
            errors,
            warnings,
            metadata: { originalType: actualType, validatedType: typeof validatedData, coercions, sanitizations },
        };
    }
    /**
     * Validate ranges (min/max, length, etc.)
     */
    validateRange(data, schema, path) {
        const errors = [];
        const warnings = [];
        if (typeof data === 'number') {
            if (schema.min !== undefined && data < schema.min) {
                errors.push({
                    field: path,
                    message: `Value ${data} is less than minimum ${schema.min}`,
                    code: 'MIN_VALUE',
                    value: data,
                    expected: schema.min,
                    severity: 'error',
                });
            }
            if (schema.max !== undefined && data > schema.max) {
                errors.push({
                    field: path,
                    message: `Value ${data} is greater than maximum ${schema.max}`,
                    code: 'MAX_VALUE',
                    value: data,
                    expected: schema.max,
                    severity: 'error',
                });
            }
        }
        if (typeof data === 'string' || Array.isArray(data)) {
            const length = data.length;
            if (schema.minLength !== undefined && length < schema.minLength) {
                errors.push({
                    field: path,
                    message: `Length ${length} is less than minimum ${schema.minLength}`,
                    code: 'MIN_LENGTH',
                    value: length,
                    expected: schema.minLength,
                    severity: 'error',
                });
            }
            if (schema.maxLength !== undefined && length > schema.maxLength) {
                errors.push({
                    field: path,
                    message: `Length ${length} is greater than maximum ${schema.maxLength}`,
                    code: 'MAX_LENGTH',
                    value: length,
                    expected: schema.maxLength,
                    severity: 'error',
                });
            }
        }
        return {
            valid: errors.length === 0,
            data,
            errors,
            warnings,
        };
    }
    /**
     * Coerce value to target type
     */
    coerceType(value, targetType, path) {
        try {
            switch (targetType) {
                case 'string':
                    return { success: true, data: String(value) };
                case 'number':
                    const num = Number(value);
                    return { success: !isNaN(num), data: num };
                case 'boolean':
                    if (typeof value === 'string') {
                        const lower = value.toLowerCase();
                        if (lower === 'true' || lower === '1' || lower === 'yes') {
                            return { success: true, data: true };
                        }
                        if (lower === 'false' || lower === '0' || lower === 'no') {
                            return { success: true, data: false };
                        }
                    }
                    return { success: true, data: Boolean(value) };
                case 'array':
                    if (Array.isArray(value)) {
                        return { success: true, data: value };
                    }
                    return { success: true, data: [value] };
                case 'object':
                    if (typeof value === 'object' && value !== null) {
                        return { success: true, data: value };
                    }
                    return { success: false };
                default:
                    return { success: false };
            }
        }
        catch {
            return { success: false };
        }
    }
}
// ============================================================================
// Global Validation Utils Instance
// ============================================================================
/**
 * Global validation utilities instance
 */
export const validationUtils = new ValidationUtils();
/**
 * Configure the global validation utilities
 */
export function configureValidationUtils(config) {
    validationUtils.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
}
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Validate session configuration using global utils
 */
export function validateSessionConfig(config) {
    return validationUtils.validateSessionConfig(config);
}
/**
 * Validate GAN review using global utils
 */
export function validateGanReview(review) {
    return validationUtils.validateGanReview(review);
}
/**
 * Validate audit request using global utils
 */
export function validateAuditRequest(request) {
    return validationUtils.validateAuditRequest(request);
}
/**
 * Sanitize string using global utils
 */
export function sanitizeString(input, options) {
    return validationUtils.sanitizeString(input, options);
}
/**
 * Validate file path using global utils
 */
export function validateFilePath(path) {
    return validationUtils.validateFilePath(path);
}
/**
 * Generic validation function using global utils
 */
export function validateData(data, schema) {
    return validationUtils.validate(data, schema);
}
//# sourceMappingURL=validation-utils.js.map