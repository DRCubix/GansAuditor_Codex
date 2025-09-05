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
import { createTimer } from './logger.js';
import { handleError } from './error-handler.js';
/**
 * Default JSON parsing configuration
 */
const DEFAULT_JSON_CONFIG = {
    enableGreedyParsing: true,
    enableRepairAttempts: true,
    maxRepairAttempts: 3,
    strictMode: false,
    allowComments: false,
    allowTrailingCommas: false,
    maxDepth: 100,
    maxStringLength: 1024 * 1024, // 1MB
};
// ============================================================================
// JSON Utilities Implementation
// ============================================================================
/**
 * Robust JSON parser with multiple fallback strategies
 */
export class JsonUtils {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_JSON_CONFIG, ...config };
    }
    /**
     * Parse JSON with fallback strategies
     */
    async parseJson(jsonString, options = {}) {
        const timer = createTimer('parse-json', 'json-utils');
        try {
            // Validate input
            if (typeof jsonString !== 'string') {
                timer.end({ success: false, reason: 'invalid-input' });
                return {
                    success: false,
                    error: new Error('Input must be a string'),
                };
            }
            if (jsonString.length > this.config.maxStringLength) {
                timer.end({ success: false, reason: 'too-large' });
                return {
                    success: false,
                    error: new Error(`JSON string too large: ${jsonString.length} characters`),
                };
            }
            // Try standard parsing first
            const standardResult = await this.tryStandardParsing(jsonString);
            if (standardResult.success) {
                timer.end({ success: true, strategy: 'standard' });
                return standardResult;
            }
            // Try greedy parsing if enabled
            if (this.config.enableGreedyParsing) {
                const greedyResult = await this.tryGreedyParsing(jsonString);
                if (greedyResult.success) {
                    timer.end({ success: true, strategy: 'greedy' });
                    return greedyResult;
                }
            }
            // Try repair attempts if enabled
            if (this.config.enableRepairAttempts) {
                const repairResult = await this.tryRepairParsing(jsonString);
                if (repairResult.success) {
                    timer.end({ success: true, strategy: 'repaired' });
                    return repairResult;
                }
            }
            // Use fallback value if provided
            if (options.enableFallback !== false && options.defaultValue !== undefined) {
                timer.end({ success: true, strategy: 'fallback' });
                return {
                    success: true,
                    data: options.defaultValue,
                    warnings: ['Used fallback value due to parsing failure'],
                    metadata: {
                        originalLength: jsonString.length,
                        parsedLength: 0,
                        strategy: 'standard',
                    },
                };
            }
            // All strategies failed
            timer.end({ success: false, reason: 'all-strategies-failed' });
            return {
                success: false,
                error: standardResult.error,
            };
        }
        catch (error) {
            timer.endWithError(error);
            const errorResult = await handleError(error, 'json-parsing');
            return {
                success: false,
                error: errorResult.error,
            };
        }
    }
    /**
     * Safely stringify object to JSON
     */
    stringify(obj, options = {}) {
        const timer = createTimer('stringify-json', 'json-utils');
        try {
            const maxDepth = options.maxDepth || this.config.maxDepth;
            const seen = new WeakSet();
            const replacer = (key, value) => {
                // Handle circular references
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return '[Circular Reference]';
                    }
                    seen.add(value);
                }
                // Apply custom replacer if provided
                if (options.replacer) {
                    value = options.replacer(key, value);
                }
                // Handle functions
                if (typeof value === 'function') {
                    return '[Function]';
                }
                // Handle undefined
                if (value === undefined) {
                    return '[Undefined]';
                }
                // Handle symbols
                if (typeof value === 'symbol') {
                    return value.toString();
                }
                return value;
            };
            const jsonString = JSON.stringify(obj, replacer, options.pretty ? 2 : undefined);
            timer.end({ success: true, length: jsonString.length });
            return {
                success: true,
                data: jsonString,
                metadata: {
                    originalLength: 0,
                    parsedLength: jsonString.length,
                    strategy: 'standard',
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                success: false,
                error: error,
            };
        }
    }
    /**
     * Validate JSON against schema
     */
    validate(data, schema) {
        const errors = [];
        const warnings = [];
        try {
            // Basic type validation
            if (schema.type) {
                const actualType = Array.isArray(data) ? 'array' : typeof data;
                if (actualType !== schema.type) {
                    errors.push(`Expected type ${schema.type}, got ${actualType}`);
                }
            }
            // Required properties validation
            if (schema.required && Array.isArray(schema.required)) {
                for (const requiredProp of schema.required) {
                    if (!(requiredProp in data)) {
                        errors.push(`Missing required property: ${requiredProp}`);
                    }
                }
            }
            // Properties validation
            if (schema.properties && typeof data === 'object' && data !== null) {
                for (const [key, value] of Object.entries(data)) {
                    if (schema.properties[key]) {
                        const propResult = this.validate(value, schema.properties[key]);
                        errors.push(...propResult.errors.map(err => `${key}.${err}`));
                        warnings.push(...propResult.warnings.map(warn => `${key}.${warn}`));
                    }
                    else if (schema.additionalProperties === false) {
                        warnings.push(`Unexpected property: ${key}`);
                    }
                }
            }
            return {
                valid: errors.length === 0,
                errors,
                warnings,
                schema,
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [`Validation error: ${error.message}`],
                warnings,
                schema,
            };
        }
    }
    /**
     * Extract JSON from mixed content (e.g., markdown with JSON blocks)
     */
    async extractJson(content) {
        const timer = createTimer('extract-json', 'json-utils');
        try {
            const jsonBlocks = [];
            const warnings = [];
            // Look for JSON code blocks
            const codeBlockRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/gi;
            let match;
            while ((match = codeBlockRegex.exec(content)) !== null) {
                const jsonContent = match[1].trim();
                const parseResult = await this.parseJson(jsonContent);
                if (parseResult.success) {
                    jsonBlocks.push(parseResult.data);
                }
                else {
                    warnings.push(`Failed to parse JSON block: ${parseResult.error?.message}`);
                }
            }
            // Look for inline JSON objects
            const inlineJsonRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
            const matches = content.match(inlineJsonRegex) || [];
            for (const jsonCandidate of matches) {
                const parseResult = await this.parseJson(jsonCandidate);
                if (parseResult.success) {
                    // Avoid duplicates
                    const isDuplicate = jsonBlocks.some(existing => JSON.stringify(existing) === JSON.stringify(parseResult.data));
                    if (!isDuplicate) {
                        jsonBlocks.push(parseResult.data);
                    }
                }
            }
            timer.end({ success: true, blocksFound: jsonBlocks.length });
            return {
                success: true,
                data: jsonBlocks,
                warnings: warnings.length > 0 ? warnings : undefined,
                metadata: {
                    originalLength: content.length,
                    parsedLength: jsonBlocks.length,
                    strategy: 'standard',
                },
            };
        }
        catch (error) {
            timer.endWithError(error);
            return {
                success: false,
                error: error,
            };
        }
    }
    // ============================================================================
    // Private Parsing Strategies
    // ============================================================================
    /**
     * Try standard JSON parsing
     */
    async tryStandardParsing(jsonString) {
        try {
            let processedString = jsonString.trim();
            // Remove comments if allowed
            if (this.config.allowComments) {
                processedString = this.removeComments(processedString);
            }
            // Handle trailing commas if allowed
            if (this.config.allowTrailingCommas) {
                processedString = this.removeTrailingCommas(processedString);
            }
            const data = JSON.parse(processedString);
            return {
                success: true,
                data,
                metadata: {
                    originalLength: jsonString.length,
                    parsedLength: processedString.length,
                    strategy: 'standard',
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
            };
        }
    }
    /**
     * Try greedy parsing (extract first valid JSON object)
     */
    async tryGreedyParsing(jsonString) {
        try {
            const warnings = [];
            // Find potential JSON start positions
            const startPositions = [];
            for (let i = 0; i < jsonString.length; i++) {
                if (jsonString[i] === '{' || jsonString[i] === '[') {
                    startPositions.push(i);
                }
            }
            // Try parsing from each start position
            for (const startPos of startPositions) {
                let braceCount = 0;
                let inString = false;
                let escapeNext = false;
                for (let i = startPos; i < jsonString.length; i++) {
                    const char = jsonString[i];
                    if (escapeNext) {
                        escapeNext = false;
                        continue;
                    }
                    if (char === '\\') {
                        escapeNext = true;
                        continue;
                    }
                    if (char === '"' && !escapeNext) {
                        inString = !inString;
                        continue;
                    }
                    if (!inString) {
                        if (char === '{' || char === '[') {
                            braceCount++;
                        }
                        else if (char === '}' || char === ']') {
                            braceCount--;
                            if (braceCount === 0) {
                                // Found complete JSON object
                                const candidate = jsonString.substring(startPos, i + 1);
                                const parseResult = await this.tryStandardParsing(candidate);
                                if (parseResult.success) {
                                    warnings.push('Used greedy parsing to extract JSON');
                                    return {
                                        ...parseResult,
                                        warnings,
                                        metadata: {
                                            ...parseResult.metadata,
                                            strategy: 'greedy',
                                        },
                                    };
                                }
                            }
                        }
                    }
                }
            }
            return {
                success: false,
                error: new Error('No valid JSON found with greedy parsing'),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
            };
        }
    }
    /**
     * Try repairing common JSON issues
     */
    async tryRepairParsing(jsonString) {
        const warnings = [];
        let repairedString = jsonString;
        let repairAttempts = 0;
        const repairs = [
            // Remove comments first (they can interfere with other repairs)
            (str) => this.removeComments(str),
            // Fix unquoted keys
            (str) => str.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":'),
            // Fix single quotes
            (str) => str.replace(/'/g, '"'),
            // Fix missing quotes around string values
            (str) => str.replace(/:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}])/g, ': "$1"$2'),
            // Remove trailing commas
            (str) => this.removeTrailingCommas(str),
            // Fix incomplete objects (add closing braces)
            (str) => {
                let braceCount = 0;
                for (const char of str) {
                    if (char === '{')
                        braceCount++;
                    else if (char === '}')
                        braceCount--;
                }
                return str + '}'.repeat(Math.max(0, braceCount));
            },
        ];
        // Apply all repairs cumulatively
        for (const repair of repairs) {
            if (repairAttempts >= this.config.maxRepairAttempts) {
                break;
            }
            try {
                const beforeRepair = repairedString;
                repairedString = repair(repairedString);
                // If the repair changed something, increment attempt count
                if (beforeRepair !== repairedString) {
                    repairAttempts++;
                    warnings.push(`Applied repair ${repairAttempts}`);
                }
                // Test if the current state parses successfully
                const parseResult = await this.tryStandardParsing(repairedString);
                if (parseResult.success) {
                    return {
                        ...parseResult,
                        warnings,
                        metadata: {
                            ...parseResult.metadata,
                            strategy: 'repaired',
                            repairAttempts,
                        },
                    };
                }
            }
            catch {
                // Continue with next repair even if this one fails
                continue;
            }
        }
        // If individual repairs didn't work, try applying all at once
        try {
            let allRepairsString = jsonString;
            for (const repair of repairs) {
                allRepairsString = repair(allRepairsString);
            }
            const finalParseResult = await this.tryStandardParsing(allRepairsString);
            if (finalParseResult.success) {
                warnings.push('Applied all repairs together');
                return {
                    ...finalParseResult,
                    warnings,
                    metadata: {
                        ...finalParseResult.metadata,
                        strategy: 'repaired',
                        repairAttempts: repairs.length,
                    },
                };
            }
        }
        catch {
            // Final attempt failed
        }
        return {
            success: false,
            error: new Error(`Failed to repair JSON after ${repairAttempts} attempts`),
        };
    }
    /**
     * Remove comments from JSON string
     */
    removeComments(jsonString) {
        // Remove single-line comments
        let result = jsonString.replace(/\/\/.*$/gm, '');
        // Remove multi-line comments
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        return result;
    }
    /**
     * Remove trailing commas from JSON string
     */
    removeTrailingCommas(jsonString) {
        // Remove trailing commas before closing braces/brackets
        return jsonString.replace(/,(\s*[}\]])/g, '$1');
    }
}
// ============================================================================
// Global JSON Utils Instance
// ============================================================================
/**
 * Global JSON utilities instance
 */
export const jsonUtils = new JsonUtils();
/**
 * Configure the global JSON utilities
 */
export function configureJsonUtils(config) {
    jsonUtils.config = { ...DEFAULT_JSON_CONFIG, ...config };
}
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Parse JSON with fallback strategies using global utils
 */
export async function parseJsonSafe(jsonString, options) {
    return jsonUtils.parseJson(jsonString, options);
}
/**
 * Stringify object safely using global utils
 */
export function stringifyJsonSafe(obj, options) {
    return jsonUtils.stringify(obj, options);
}
/**
 * Validate JSON against schema using global utils
 */
export function validateJson(data, schema) {
    return jsonUtils.validate(data, schema);
}
/**
 * Extract JSON from mixed content using global utils
 */
export async function extractJsonFromContent(content) {
    return jsonUtils.extractJson(content);
}
/**
 * Try to parse JSON with multiple strategies
 */
export async function tryParseJson(jsonString, fallbackValue) {
    const result = await parseJsonSafe(jsonString, {
        defaultValue: fallbackValue,
        enableFallback: fallbackValue !== undefined,
    });
    return result.success ? result.data : fallbackValue;
}
/**
 * Check if string is valid JSON
 */
export async function isValidJson(jsonString) {
    const result = await parseJsonSafe(jsonString);
    return result.success;
}
//# sourceMappingURL=json-utils.js.map