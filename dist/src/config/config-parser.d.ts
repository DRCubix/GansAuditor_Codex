/**
 * Configuration parsing and validation for GAN Auditor Integration
 *
 * This module implements inline configuration parsing from thought text,
 * configuration validation, sanitization, and default value application
 * as specified in requirements 2.1-2.4.
 */
import { GansAuditorCodexSessionConfig, GansAuditorCodexInlineConfig } from '../types/gan-types.js';
import type { ConfigParseResult, JsonParseResult, ConfigValidationResult } from '../types/validation-types.js';
/**
 * Extract inline gan-config blocks from thought text using regex
 * Requirement 2.1: Parse inline configuration blocks
 *
 * @param thought - The thought text to parse
 * @returns Parsed configuration result or null if no config found
 */
export declare function extractInlineConfig(thought: string): ConfigParseResult;
/**
 * Parse JSON with greedy fallback for malformed responses
 * Requirement 7.3: JSON parsing with fallback strategies
 *
 * @param jsonText - JSON text to parse
 * @returns Parse result with fallback indication
 */
export declare function parseJsonWithFallback<T = unknown>(jsonText: string): JsonParseResult<T>;
/**
 * Validate and sanitize configuration with type checking and defaults
 * Requirements 2.2, 2.3, 2.4: Configuration validation and sanitization
 *
 * @param inlineConfig - Partial configuration from inline parsing
 * @param baseConfig - Base configuration to merge with (defaults to DEFAULT_SESSION_CONFIG)
 * @returns Validated and sanitized configuration
 */
export declare function validateAndSanitizeConfig(inlineConfig?: Partial<GansAuditorCodexInlineConfig>, baseConfig?: GansAuditorCodexSessionConfig): ConfigValidationResult;
/**
 * Merge base configuration with inline configuration
 *
 * @param baseConfig - Base configuration
 * @param inlineConfig - Inline configuration to merge
 * @returns Merged configuration
 */
export declare function mergeConfigurations(baseConfig: GansAuditorCodexSessionConfig, inlineConfig: Partial<GansAuditorCodexInlineConfig>): GansAuditorCodexSessionConfig;
/**
 * Create default session configuration
 *
 * @returns Default session configuration
 */
export declare function createDefaultConfig(): GansAuditorCodexSessionConfig;
//# sourceMappingURL=config-parser.d.ts.map