/**
 * JSON parsing utilities with fallback strategies for GAN Auditor Integration
 *
 * This module provides robust JSON parsing with error recovery,
 * greedy parsing strategies, and validation utilities.
 *
 * Requirements addressed:
 * - 7.3: JSON parsing with fallback strategies
 * - 7.4: Graceful handling of malformed JSON responses
 */
import type { GanAuditorError } from '../types/error-types.js';
/**
 * Configuration for JSON parsing operations
 */
export interface JsonParsingConfig {
    enableGreedyParsing: boolean;
    enableRepairAttempts: boolean;
    maxRepairAttempts: number;
    strictMode: boolean;
    allowComments: boolean;
    allowTrailingCommas: boolean;
    maxDepth: number;
    maxStringLength: number;
}
/**
 * Result of JSON parsing operation
 */
export interface JsonParseResult<T = any> {
    success: boolean;
    data?: T;
    error?: GanAuditorError;
    warnings?: string[];
    metadata?: {
        originalLength: number;
        parsedLength: number;
        strategy: 'standard' | 'greedy' | 'repaired';
        repairAttempts?: number;
    };
}
/**
 * JSON validation result
 */
export interface JsonValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    schema?: any;
}
/**
 * Robust JSON parser with multiple fallback strategies
 */
export declare class JsonUtils {
    private config;
    constructor(config?: Partial<JsonParsingConfig>);
    /**
     * Parse JSON with fallback strategies
     */
    parseJson<T = any>(jsonString: string, options?: {
        schema?: any;
        defaultValue?: T;
        enableFallback?: boolean;
    }): Promise<JsonParseResult<T>>;
    /**
     * Safely stringify object to JSON
     */
    stringify(obj: any, options?: {
        pretty?: boolean;
        maxDepth?: number;
        replacer?: (key: string, value: any) => any;
    }): JsonParseResult<string>;
    /**
     * Validate JSON against schema
     */
    validate(data: any, schema: any): JsonValidationResult;
    /**
     * Extract JSON from mixed content (e.g., markdown with JSON blocks)
     */
    extractJson(content: string): Promise<JsonParseResult<any[]>>;
    /**
     * Try standard JSON parsing
     */
    private tryStandardParsing;
    /**
     * Try greedy parsing (extract first valid JSON object)
     */
    private tryGreedyParsing;
    /**
     * Try repairing common JSON issues
     */
    private tryRepairParsing;
    /**
     * Remove comments from JSON string
     */
    private removeComments;
    /**
     * Remove trailing commas from JSON string
     */
    private removeTrailingCommas;
}
/**
 * Global JSON utilities instance
 */
export declare const jsonUtils: JsonUtils;
/**
 * Configure the global JSON utilities
 */
export declare function configureJsonUtils(config: Partial<JsonParsingConfig>): void;
/**
 * Parse JSON with fallback strategies using global utils
 */
export declare function parseJsonSafe<T = any>(jsonString: string, options?: {
    schema?: any;
    defaultValue?: T;
    enableFallback?: boolean;
}): Promise<JsonParseResult<T>>;
/**
 * Stringify object safely using global utils
 */
export declare function stringifyJsonSafe(obj: any, options?: {
    pretty?: boolean;
    maxDepth?: number;
    replacer?: (key: string, value: any) => any;
}): JsonParseResult<string>;
/**
 * Validate JSON against schema using global utils
 */
export declare function validateJson(data: any, schema: any): JsonValidationResult;
/**
 * Extract JSON from mixed content using global utils
 */
export declare function extractJsonFromContent(content: string): Promise<JsonParseResult<any[]>>;
/**
 * Try to parse JSON with multiple strategies
 */
export declare function tryParseJson<T = any>(jsonString: string, fallbackValue?: T): Promise<T | undefined>;
/**
 * Check if string is valid JSON
 */
export declare function isValidJson(jsonString: string): Promise<boolean>;
//# sourceMappingURL=json-utils.d.ts.map