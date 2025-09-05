/**
 * Configuration parsing and validation for GAN Auditor Integration
 * 
 * This module implements inline configuration parsing from thought text,
 * configuration validation, sanitization, and default value application
 * as specified in requirements 2.1-2.4.
 */

import {
  GansAuditorCodexSessionConfig,
  GansAuditorCodexInlineConfig,
  DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG,
  CONFIG_CONSTRAINTS,
  // Backward compatibility aliases
  InlineConfig,
  DEFAULT_SESSION_CONFIG,
} from '../types/gan-types.js';

import type {
  ConfigParseResult,
  JsonParseResult,
  ValidationResult,
  ConfigValidationResult,
  SanitizationResult,
  SanitizationOptions,
} from '../types/validation-types.js';

// ============================================================================
// Configuration Parsing
// ============================================================================

/**
 * Regular expression to match gan-config fenced code blocks
 * Matches both ```gan-config and ```json with gan-config content
 */
const GAN_CONFIG_REGEX = /```(?:gan-config|json)\s*\n([\s\S]*?)\n```/gi;

/**
 * Extract inline gan-config blocks from thought text using regex
 * Requirement 2.1: Parse inline configuration blocks
 * 
 * @param thought - The thought text to parse
 * @returns Parsed configuration result or null if no config found
 */
export function extractInlineConfig(thought: string): ConfigParseResult {
  if (!thought || typeof thought !== 'string') {
    return { success: false, error: 'Invalid thought input' };
  }

  // Reset regex state for global regex
  GAN_CONFIG_REGEX.lastIndex = 0;
  
  const matches = Array.from(thought.matchAll(GAN_CONFIG_REGEX));
  
  if (matches.length === 0) {
    return { success: false, error: 'No gan-config block found' };
  }

  // Use the first match if multiple blocks are found
  const configText = matches[0][1].trim();
  
  if (!configText) {
    return { success: false, error: 'Empty gan-config block' };
  }

  // Attempt to parse JSON
  const parseResult = parseJsonWithFallback<InlineConfig>(configText);
  
  if (!parseResult.success) {
    return {
      success: false,
      error: `Failed to parse gan-config JSON: ${parseResult.error}`,
      rawConfig: configText,
    };
  }

  return {
    success: true,
    config: parseResult.data,
    rawConfig: configText,
  };
}

/**
 * Parse JSON with greedy fallback for malformed responses
 * Requirement 7.3: JSON parsing with fallback strategies
 * 
 * @param jsonText - JSON text to parse
 * @returns Parse result with fallback indication
 */
export function parseJsonWithFallback<T = unknown>(jsonText: string): JsonParseResult<T> {
  try {
    const data = JSON.parse(jsonText) as T;
    return { success: true, data };
  } catch (error) {
    // Attempt greedy parsing by extracting potential JSON objects
    const greedyResult = attemptGreedyJsonParse<T>(jsonText);
    if (greedyResult.success) {
      return { ...greedyResult, usedFallback: true };
    }
    
    // Return the greedy parsing error if it failed, otherwise the original error
    return {
      success: false,
      error: greedyResult.error || (error instanceof Error ? error.message : 'Unknown JSON parse error'),
    };
  }
}

/**
 * Attempt to extract valid JSON from potentially malformed text
 * 
 * @param text - Text that might contain JSON
 * @returns Parse result from greedy extraction
 */
function attemptGreedyJsonParse<T>(text: string): JsonParseResult<T> {
  // Try to find JSON object boundaries
  const objectMatches = text.match(/\{[\s\S]*\}/);
  if (objectMatches) {
    try {
      const data = JSON.parse(objectMatches[0]) as T;
      return { success: true, data };
    } catch {
      // Continue to array attempt
    }
  }

  // Try to find JSON array boundaries
  const arrayMatches = text.match(/\[[\s\S]*\]/);
  if (arrayMatches) {
    try {
      const data = JSON.parse(arrayMatches[0]) as T;
      return { success: true, data };
    } catch {
      // Continue to failure
    }
  }

  return { 
    success: false, 
    error: 'No valid JSON found in text' 
  };
}

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validate and sanitize configuration with type checking and defaults
 * Requirements 2.2, 2.3, 2.4: Configuration validation and sanitization
 * 
 * @param inlineConfig - Partial configuration from inline parsing
 * @param baseConfig - Base configuration to merge with (defaults to DEFAULT_SESSION_CONFIG)
 * @returns Validated and sanitized configuration
 */
export function validateAndSanitizeConfig(
  inlineConfig: Partial<GansAuditorCodexInlineConfig> = {},
  baseConfig: GansAuditorCodexSessionConfig = DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const appliedDefaults: Partial<GansAuditorCodexSessionConfig> = {};

  // Start with base configuration
  let config: GansAuditorCodexSessionConfig = { ...baseConfig };

  // Validate and apply task
  if (inlineConfig.task !== undefined) {
    if (typeof inlineConfig.task === 'string' && inlineConfig.task.trim().length > 0) {
      config.task = inlineConfig.task.trim();
    } else {
      errors.push('Task must be a non-empty string');
      appliedDefaults.task = baseConfig.task;
    }
  }

  // Validate and apply scope
  if (inlineConfig.scope !== undefined) {
    if (isValidScope(inlineConfig.scope)) {
      config.scope = inlineConfig.scope;
    } else {
      errors.push('Scope must be one of: diff, paths, workspace');
      appliedDefaults.scope = baseConfig.scope;
    }
  }

  // Validate and apply paths (required when scope is 'paths')
  if (inlineConfig.paths !== undefined) {
    if (Array.isArray(inlineConfig.paths) && inlineConfig.paths.every(p => typeof p === 'string')) {
      config.paths = inlineConfig.paths.filter(p => p.trim().length > 0);
    } else {
      errors.push('Paths must be an array of non-empty strings');
    }
  }

  // Check paths requirement for 'paths' scope
  if (config.scope === 'paths' && (!config.paths || config.paths.length === 0)) {
    warnings.push('Scope is "paths" but no paths provided, switching to "workspace" scope');
    config.scope = 'workspace';
    appliedDefaults.scope = 'workspace';
  }

  // Validate and sanitize threshold
  if (inlineConfig.threshold !== undefined) {
    const thresholdResult = sanitizeThreshold(inlineConfig.threshold);
    config.threshold = thresholdResult.sanitized;
    if (thresholdResult.changes.length > 0) {
      warnings.push(`Threshold clamped: ${thresholdResult.changes[0].reason}`);
    }
  }

  // Validate and sanitize maxCycles
  if (inlineConfig.maxCycles !== undefined) {
    const maxCyclesResult = sanitizeMaxCycles(inlineConfig.maxCycles);
    config.maxCycles = maxCyclesResult.sanitized;
    if (maxCyclesResult.changes.length > 0) {
      warnings.push(`MaxCycles clamped: ${maxCyclesResult.changes[0].reason}`);
    }
  }

  // Validate and sanitize candidates
  if (inlineConfig.candidates !== undefined) {
    const candidatesResult = sanitizeCandidates(inlineConfig.candidates);
    config.candidates = candidatesResult.sanitized;
    if (candidatesResult.changes.length > 0) {
      warnings.push(`Candidates clamped: ${candidatesResult.changes[0].reason}`);
    }
  }

  // Validate and apply judges
  if (inlineConfig.judges !== undefined) {
    if (Array.isArray(inlineConfig.judges) && inlineConfig.judges.every(j => typeof j === 'string')) {
      const validJudges = inlineConfig.judges.filter(j => j.trim().length > 0);
      if (validJudges.length > 0) {
        config.judges = validJudges;
      } else {
        errors.push('At least one valid judge must be specified');
        appliedDefaults.judges = baseConfig.judges;
      }
    } else {
      errors.push('Judges must be an array of non-empty strings');
      appliedDefaults.judges = baseConfig.judges;
    }
  }

  // Validate and apply applyFixes
  if (inlineConfig.applyFixes !== undefined) {
    if (typeof inlineConfig.applyFixes === 'boolean') {
      config.applyFixes = inlineConfig.applyFixes;
    } else {
      errors.push('ApplyFixes must be a boolean value');
      appliedDefaults.applyFixes = baseConfig.applyFixes;
    }
  }

  return {
    isValid: errors.length === 0,
    data: config,
    errors,
    warnings,
    appliedDefaults,
  };
}

// ============================================================================
// Type Guards and Validators
// ============================================================================

/**
 * Type guard for valid scope values
 */
function isValidScope(value: unknown): value is GansAuditorCodexSessionConfig['scope'] {
  return typeof value === 'string' && ['diff', 'paths', 'workspace'].includes(value);
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitize threshold value by clamping to valid range
 */
function sanitizeThreshold(value: unknown): SanitizationResult<number> {
  const changes: SanitizationResult<number>['changes'] = [];
  
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return {
      sanitized: DEFAULT_SESSION_CONFIG.threshold,
      changes: [{
        field: 'threshold',
        oldValue: value,
        newValue: DEFAULT_SESSION_CONFIG.threshold,
        reason: 'Invalid number, using default',
      }],
    };
  }

  let sanitized = value;
  
  if (value < CONFIG_CONSTRAINTS.THRESHOLD_MIN) {
    sanitized = CONFIG_CONSTRAINTS.THRESHOLD_MIN;
    changes.push({
      field: 'threshold',
      oldValue: value,
      newValue: sanitized,
      reason: `Value ${value} below minimum ${CONFIG_CONSTRAINTS.THRESHOLD_MIN}`,
    });
  } else if (value > CONFIG_CONSTRAINTS.THRESHOLD_MAX) {
    sanitized = CONFIG_CONSTRAINTS.THRESHOLD_MAX;
    changes.push({
      field: 'threshold',
      oldValue: value,
      newValue: sanitized,
      reason: `Value ${value} above maximum ${CONFIG_CONSTRAINTS.THRESHOLD_MAX}`,
    });
  }

  return { sanitized, changes };
}

/**
 * Sanitize maxCycles value by clamping to valid range
 */
function sanitizeMaxCycles(value: unknown): SanitizationResult<number> {
  const changes: SanitizationResult<number>['changes'] = [];
  
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return {
      sanitized: DEFAULT_SESSION_CONFIG.maxCycles,
      changes: [{
        field: 'maxCycles',
        oldValue: value,
        newValue: DEFAULT_SESSION_CONFIG.maxCycles,
        reason: 'Invalid number, using default',
      }],
    };
  }

  let sanitized = Math.floor(value);
  
  if (sanitized < CONFIG_CONSTRAINTS.MAX_CYCLES_MIN) {
    sanitized = CONFIG_CONSTRAINTS.MAX_CYCLES_MIN;
    changes.push({
      field: 'maxCycles',
      oldValue: value,
      newValue: sanitized,
      reason: `Value ${value} below minimum ${CONFIG_CONSTRAINTS.MAX_CYCLES_MIN}`,
    });
  } else if (sanitized > CONFIG_CONSTRAINTS.MAX_CYCLES_MAX) {
    sanitized = CONFIG_CONSTRAINTS.MAX_CYCLES_MAX;
    changes.push({
      field: 'maxCycles',
      oldValue: value,
      newValue: sanitized,
      reason: `Value ${value} above maximum ${CONFIG_CONSTRAINTS.MAX_CYCLES_MAX}`,
    });
  }

  return { sanitized, changes };
}

/**
 * Sanitize candidates value by clamping to valid range
 */
function sanitizeCandidates(value: unknown): SanitizationResult<number> {
  const changes: SanitizationResult<number>['changes'] = [];
  
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return {
      sanitized: DEFAULT_SESSION_CONFIG.candidates,
      changes: [{
        field: 'candidates',
        oldValue: value,
        newValue: DEFAULT_SESSION_CONFIG.candidates,
        reason: 'Invalid number, using default',
      }],
    };
  }

  let sanitized = Math.floor(value);
  
  if (sanitized < CONFIG_CONSTRAINTS.CANDIDATES_MIN) {
    sanitized = CONFIG_CONSTRAINTS.CANDIDATES_MIN;
    changes.push({
      field: 'candidates',
      oldValue: value,
      newValue: sanitized,
      reason: `Value ${value} below minimum ${CONFIG_CONSTRAINTS.CANDIDATES_MIN}`,
    });
  } else if (sanitized > CONFIG_CONSTRAINTS.CANDIDATES_MAX) {
    sanitized = CONFIG_CONSTRAINTS.CANDIDATES_MAX;
    changes.push({
      field: 'candidates',
      oldValue: value,
      newValue: sanitized,
      reason: `Value ${value} above maximum ${CONFIG_CONSTRAINTS.CANDIDATES_MAX}`,
    });
  }

  return { sanitized, changes };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Merge base configuration with inline configuration
 * 
 * @param baseConfig - Base configuration
 * @param inlineConfig - Inline configuration to merge
 * @returns Merged configuration
 */
export function mergeConfigurations(
  baseConfig: GansAuditorCodexSessionConfig,
  inlineConfig: Partial<GansAuditorCodexInlineConfig>
): GansAuditorCodexSessionConfig {
  const validationResult = validateAndSanitizeConfig(inlineConfig, baseConfig);
  return validationResult.data || baseConfig;
}

/**
 * Create default session configuration
 * 
 * @returns Default session configuration
 */
export function createDefaultConfig(): GansAuditorCodexSessionConfig {
  return { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG };
}