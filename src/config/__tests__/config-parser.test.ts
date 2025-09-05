/**
 * Unit tests for configuration parsing and validation
 * 
 * Tests cover edge cases for inline configuration parsing,
 * validation, sanitization, and error handling as specified
 * in requirements 2.1-2.4.
 */

import { describe, it, expect } from 'vitest';
import {
  extractInlineConfig,
  parseJsonWithFallback,
  validateAndSanitizeConfig,
  mergeConfigurations,
  createDefaultConfig,
} from '../config-parser.js';

import {
  DEFAULT_SESSION_CONFIG,
  CONFIG_CONSTRAINTS,
  type SessionConfig,
  type InlineConfig,
} from '../../types/gan-types.js';

describe('extractInlineConfig', () => {
  it('should extract valid gan-config block', () => {
    const thought = `
Some thought content here.

\`\`\`gan-config
{
  "task": "Review this code",
  "scope": "diff",
  "threshold": 90
}
\`\`\`

More content after.
    `;

    const result = extractInlineConfig(thought);
    
    expect(result.success).toBe(true);
    expect(result.config).toEqual({
      task: "Review this code",
      scope: "diff",
      threshold: 90,
    });
  });

  it('should extract json block with gan-config content', () => {
    const thought = `
\`\`\`json
{
  "scope": "workspace",
  "judges": ["internal", "external"]
}
\`\`\`
    `;

    const result = extractInlineConfig(thought);
    
    expect(result.success).toBe(true);
    expect(result.config).toEqual({
      scope: "workspace",
      judges: ["internal", "external"],
    });
  });

  it('should handle multiple config blocks and use first one', () => {
    const thought = `
\`\`\`gan-config
{
  "threshold": 80
}
\`\`\`

Some content.

\`\`\`gan-config
{
  "threshold": 90
}
\`\`\`
    `;

    const result = extractInlineConfig(thought);
    
    expect(result.success).toBe(true);
    expect(result.config?.threshold).toBe(80);
  });

  it('should return error for no config block found', () => {
    const thought = 'Just some regular thought content without config.';
    
    const result = extractInlineConfig(thought);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('No gan-config block found');
  });

  it('should return error for empty config block', () => {
    const thought = `
\`\`\`gan-config

\`\`\`
    `;
    
    const result = extractInlineConfig(thought);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Empty gan-config block');
  });

  it('should return error for invalid JSON', () => {
    const thought = `
\`\`\`gan-config
{
  "task": "Invalid JSON"
  "missing": "comma"
}
\`\`\`
    `;
    
    const result = extractInlineConfig(thought);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to parse gan-config JSON');
    expect(result.rawConfig).toContain('Invalid JSON');
  });

  it('should handle invalid input types', () => {
    expect(extractInlineConfig(null as any).success).toBe(false);
    expect(extractInlineConfig(undefined as any).success).toBe(false);
    expect(extractInlineConfig(123 as any).success).toBe(false);
  });

  it('should handle config blocks with extra whitespace', () => {
    const thought = `
\`\`\`gan-config   
   
{
  "scope": "paths",
  "paths": ["src/", "test/"]
}
   
\`\`\`
    `;

    const result = extractInlineConfig(thought);
    
    expect(result.success).toBe(true);
    expect(result.config).toEqual({
      scope: "paths",
      paths: ["src/", "test/"],
    });
  });
});

describe('parseJsonWithFallback', () => {
  it('should parse valid JSON', () => {
    const json = '{"key": "value", "number": 42}';
    
    const result = parseJsonWithFallback(json);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: "value", number: 42 });
    expect(result.usedFallback).toBeUndefined();
  });

  it('should use greedy parsing for malformed JSON with valid object', () => {
    const malformed = 'Some text before {"key": "value"} some text after';
    
    const result = parseJsonWithFallback(malformed);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: "value" });
    expect(result.usedFallback).toBe(true);
  });

  it('should use greedy parsing for malformed JSON with valid array', () => {
    const malformed = 'Text before ["item1", "item2"] text after';
    
    const result = parseJsonWithFallback(malformed);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(["item1", "item2"]);
    expect(result.usedFallback).toBe(true);
  });

  it('should fail when no valid JSON found', () => {
    const invalid = 'No JSON here at all';
    
    const result = parseJsonWithFallback(invalid);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('No valid JSON found in text');
  });

  it('should handle nested objects in greedy parsing', () => {
    const malformed = 'prefix {"outer": {"inner": "value"}} suffix';
    
    const result = parseJsonWithFallback(malformed);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ outer: { inner: "value" } });
    expect(result.usedFallback).toBe(true);
  });
});

describe('validateAndSanitizeConfig', () => {
  it('should validate and apply valid configuration', () => {
    const inlineConfig: Partial<InlineConfig> = {
      task: "Custom audit task",
      scope: "workspace",
      threshold: 95,
      judges: ["model1", "model2"],
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.task).toBe("Custom audit task");
    expect(result.data?.scope).toBe("workspace");
    expect(result.data?.threshold).toBe(95);
    expect(result.data?.judges).toEqual(["model1", "model2"]);
    expect(result.errors).toHaveLength(0);
  });

  it('should apply defaults for missing values', () => {
    const inlineConfig: Partial<InlineConfig> = {
      threshold: 75,
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.task).toBe(DEFAULT_SESSION_CONFIG.task);
    expect(result.data?.scope).toBe(DEFAULT_SESSION_CONFIG.scope);
    expect(result.data?.threshold).toBe(75);
  });

  it('should clamp threshold values to valid range', () => {
    const inlineConfig: Partial<InlineConfig> = {
      threshold: 150, // Above maximum
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.threshold).toBe(CONFIG_CONSTRAINTS.THRESHOLD_MAX);
    expect(result.warnings?.some(w => w.includes('Threshold clamped'))).toBe(true);
  });

  it('should clamp threshold below minimum', () => {
    const inlineConfig: Partial<InlineConfig> = {
      threshold: -10, // Below minimum
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.threshold).toBe(CONFIG_CONSTRAINTS.THRESHOLD_MIN);
    expect(result.warnings?.some(w => w.includes('Threshold clamped'))).toBe(true);
  });

  it('should clamp maxCycles to valid range', () => {
    const inlineConfig: Partial<InlineConfig> = {
      maxCycles: 20, // Above maximum
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.maxCycles).toBe(CONFIG_CONSTRAINTS.MAX_CYCLES_MAX);
    expect(result.warnings?.some(w => w.includes('MaxCycles clamped'))).toBe(true);
  });

  it('should clamp candidates to valid range', () => {
    const inlineConfig: Partial<InlineConfig> = {
      candidates: 0, // Below minimum
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.candidates).toBe(CONFIG_CONSTRAINTS.CANDIDATES_MIN);
    expect(result.warnings?.some(w => w.includes('Candidates clamped'))).toBe(true);
  });

  it('should validate scope and switch to workspace when paths scope has no paths', () => {
    const inlineConfig: Partial<InlineConfig> = {
      scope: "paths",
      // No paths provided
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.scope).toBe("workspace");
    expect(result.warnings?.some(w => w.includes('switching to "workspace" scope'))).toBe(true);
  });

  it('should validate paths array for paths scope', () => {
    const inlineConfig: Partial<InlineConfig> = {
      scope: "paths",
      paths: ["src/", "test/", "docs/"],
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.scope).toBe("paths");
    expect(result.data?.paths).toEqual(["src/", "test/", "docs/"]);
  });

  it('should handle invalid scope values', () => {
    const inlineConfig: Partial<InlineConfig> = {
      scope: "invalid" as any,
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Scope must be one of: diff, paths, workspace');
    expect(result.appliedDefaults.scope).toBe(DEFAULT_SESSION_CONFIG.scope);
  });

  it('should handle invalid task values', () => {
    const inlineConfig: Partial<InlineConfig> = {
      task: "", // Empty string
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Task must be a non-empty string');
    expect(result.appliedDefaults.task).toBe(DEFAULT_SESSION_CONFIG.task);
  });

  it('should handle invalid judges array', () => {
    const inlineConfig: Partial<InlineConfig> = {
      judges: [], // Empty array
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least one valid judge must be specified');
    expect(result.appliedDefaults.judges).toBe(DEFAULT_SESSION_CONFIG.judges);
  });

  it('should handle invalid applyFixes type', () => {
    const inlineConfig: Partial<InlineConfig> = {
      applyFixes: "true" as any, // String instead of boolean
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('ApplyFixes must be a boolean value');
    expect(result.appliedDefaults.applyFixes).toBe(DEFAULT_SESSION_CONFIG.applyFixes);
  });

  it('should handle non-integer maxCycles', () => {
    const inlineConfig: Partial<InlineConfig> = {
      maxCycles: 3.7, // Float value
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.maxCycles).toBe(3); // Should be floored
  });

  it('should handle invalid number types', () => {
    const inlineConfig: Partial<InlineConfig> = {
      threshold: "85" as any, // String instead of number
      maxCycles: null as any,
      candidates: undefined as any,
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.threshold).toBe(DEFAULT_SESSION_CONFIG.threshold);
    expect(result.data?.maxCycles).toBe(DEFAULT_SESSION_CONFIG.maxCycles);
    expect(result.data?.candidates).toBe(DEFAULT_SESSION_CONFIG.candidates);
  });

  it('should filter empty strings from paths and judges arrays', () => {
    const inlineConfig: Partial<InlineConfig> = {
      scope: "paths",
      paths: ["src/", "", "test/", "   "], // Contains empty and whitespace-only strings
      judges: ["model1", "", "model2", "   "],
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.paths).toEqual(["src/", "test/"]);
    expect(result.data?.judges).toEqual(["model1", "model2"]);
  });
});

describe('mergeConfigurations', () => {
  it('should merge base and inline configurations', () => {
    const baseConfig: SessionConfig = {
      ...DEFAULT_SESSION_CONFIG,
      threshold: 80,
      judges: ["base-judge"],
    };

    const inlineConfig: Partial<InlineConfig> = {
      threshold: 90,
      scope: "workspace",
    };

    const result = mergeConfigurations(baseConfig, inlineConfig);
    
    expect(result.threshold).toBe(90);
    expect(result.scope).toBe("workspace");
    expect(result.judges).toEqual(["base-judge"]); // Should keep base value
    expect(result.task).toBe(baseConfig.task); // Should keep base value
  });

  it('should handle invalid inline config gracefully', () => {
    const baseConfig: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
    const inlineConfig: Partial<InlineConfig> = {
      threshold: 200, // Invalid, should be clamped
      scope: "invalid" as any, // Invalid, should use base
    };

    const result = mergeConfigurations(baseConfig, inlineConfig);
    
    expect(result.threshold).toBe(CONFIG_CONSTRAINTS.THRESHOLD_MAX);
    expect(result.scope).toBe(baseConfig.scope);
  });
});

describe('createDefaultConfig', () => {
  it('should create a copy of default configuration', () => {
    const config = createDefaultConfig();
    
    expect(config).toEqual(DEFAULT_SESSION_CONFIG);
    expect(config).not.toBe(DEFAULT_SESSION_CONFIG); // Should be a copy
  });

  it('should allow modification without affecting original', () => {
    const config = createDefaultConfig();
    config.threshold = 95;
    
    expect(config.threshold).toBe(95);
    expect(DEFAULT_SESSION_CONFIG.threshold).toBe(85); // Original unchanged
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle malformed JSON in config block gracefully', () => {
    const thought = `
\`\`\`gan-config
{
  "task": "Test",
  "threshold": 85,
  // This comment makes it invalid JSON
  "scope": "diff"
}
\`\`\`
    `;

    const result = extractInlineConfig(thought);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to parse gan-config JSON');
  });

  it('should handle extremely large numbers', () => {
    const inlineConfig: Partial<InlineConfig> = {
      threshold: Number.MAX_SAFE_INTEGER,
      maxCycles: Number.MAX_SAFE_INTEGER,
      candidates: Number.MAX_SAFE_INTEGER,
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.threshold).toBe(CONFIG_CONSTRAINTS.THRESHOLD_MAX);
    expect(result.data?.maxCycles).toBe(CONFIG_CONSTRAINTS.MAX_CYCLES_MAX);
    expect(result.data?.candidates).toBe(CONFIG_CONSTRAINTS.CANDIDATES_MAX);
  });

  it('should handle NaN and Infinity values', () => {
    const inlineConfig: Partial<InlineConfig> = {
      threshold: NaN,
      maxCycles: Infinity,
      candidates: -Infinity,
    };

    const result = validateAndSanitizeConfig(inlineConfig);
    
    expect(result.isValid).toBe(true);
    expect(result.data?.threshold).toBe(DEFAULT_SESSION_CONFIG.threshold);
    expect(result.data?.maxCycles).toBe(DEFAULT_SESSION_CONFIG.maxCycles);
    expect(result.data?.candidates).toBe(DEFAULT_SESSION_CONFIG.candidates);
  });

  it('should handle nested objects in config', () => {
    const thought = `
\`\`\`gan-config
{
  "task": "Test",
  "nested": {
    "should": "be ignored"
  },
  "threshold": 90
}
\`\`\`
    `;

    const result = extractInlineConfig(thought);
    
    expect(result.success).toBe(true);
    expect(result.config?.task).toBe("Test");
    expect(result.config?.threshold).toBe(90);
    // Nested objects should be preserved in the parsed config
    expect((result.config as any)?.nested).toEqual({ should: "be ignored" });
  });
});