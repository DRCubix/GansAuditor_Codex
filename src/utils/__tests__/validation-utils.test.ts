/**
 * Tests for GansAuditor_Codex validation utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ValidationUtils,
  validationUtils,
  validateSessionConfig,
  validateGanReview,
  validateAuditRequest,
  validateFilePath,
  sanitizeString,
  validateData,
} from '../validation-utils.js';
import type { SessionConfig, GanReview, AuditRequest } from '../../types/gan-types.js';

describe('GansAuditor_Codex ValidationUtils', () => {
  let validator: ValidationUtils;

  beforeEach(() => {
    validator = new ValidationUtils();
  });

  describe('validate', () => {
    it('should validate string type', () => {
      const result = validator.validate('test', { type: 'string' });
      expect(result.valid).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should validate number type', () => {
      const result = validator.validate(123, { type: 'number' });
      expect(result.valid).toBe(true);
      expect(result.data).toBe(123);
    });

    it('should validate boolean type', () => {
      const result = validator.validate(true, { type: 'boolean' });
      expect(result.valid).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should validate array type', () => {
      const result = validator.validate([1, 2, 3], { type: 'array' });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('should validate object type', () => {
      const result = validator.validate({ key: 'value' }, { type: 'object' });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
    });

    it('should handle type mismatch', () => {
      const result = validator.validate('test', { type: 'number' });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('TYPE_MISMATCH');
    });

    it('should coerce types when enabled', () => {
      const validatorWithCoercion = new ValidationUtils({ coerceTypes: true });
      const result = validatorWithCoercion.validate('123', { type: 'number' });
      expect(result.valid).toBe(true);
      expect(result.data).toBe(123);
      expect(result.metadata?.coercions).toContain('root: coerced from string to number');
    });

    it('should handle required fields', () => {
      const result = validator.validate(undefined, { type: 'string', required: true });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('should use default values', () => {
      const result = validator.validate(undefined, { 
        type: 'string', 
        required: false, 
        default: 'default-value' 
      });
      expect(result.valid).toBe(true);
      expect(result.data).toBe('default-value');
    });

    it('should validate string length', () => {
      const result = validator.validate('test', { 
        type: 'string', 
        minLength: 5, 
        maxLength: 10 
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MIN_LENGTH');
    });

    it('should validate number range', () => {
      const result = validator.validate(150, { 
        type: 'number', 
        min: 0, 
        max: 100 
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MAX_VALUE');
    });

    it('should validate enum values', () => {
      const result = validator.validate('invalid', { 
        type: 'string', 
        enum: ['valid1', 'valid2'] 
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('ENUM_MISMATCH');
    });

    it('should validate pattern', () => {
      const result = validator.validate('invalid-email', { 
        type: 'string', 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('PATTERN_MISMATCH');
    });

    it('should handle custom validation', () => {
      const customValidator = (value: any) => ({
        valid: value !== 'forbidden',
        errors: value === 'forbidden' ? [{
          field: 'root',
          message: 'Value is forbidden',
          code: 'CUSTOM_ERROR',
          severity: 'error' as const,
        }] : [],
        warnings: [],
      });

      const result = validator.validate('forbidden', { 
        type: 'string', 
        custom: customValidator 
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('CUSTOM_ERROR');
    });
  });

  describe('validateObject', () => {
    it('should validate object properties', () => {
      const schema = {
        name: { type: 'string' as const, required: true },
        age: { type: 'number' as const, min: 0, max: 150 },
        email: { type: 'string' as const, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      };

      const data = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = validator.validate(data, schema);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should handle missing required properties', () => {
      const schema = {
        name: { type: 'string' as const, required: true },
        age: { type: 'number' as const, required: true },
      };

      const data = { name: 'John' };

      const result = validator.validate(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'root.age' && e.code === 'REQUIRED')).toBe(true);
    });

    it('should warn about unknown properties', () => {
      const validatorStrict = new ValidationUtils({ allowUnknownProperties: false });
      const schema = {
        name: { type: 'string' as const },
      };

      const data = { name: 'John', extra: 'value' };

      const result = validatorStrict.validate(data, schema);
      expect(result.warnings.some(w => w.includes('Unknown property'))).toBe(true);
    });

    it('should coerce object from non-object', () => {
      const validatorWithCoercion = new ValidationUtils({ coerceTypes: true });
      const schema = {
        name: { type: 'string' as const },
      };

      const result = validatorWithCoercion.validate('not-object', schema);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({});
      expect(result.metadata?.coercions).toContain('root: coerced to object');
    });
  });

  describe('validateSessionConfig', () => {
    it('should validate valid session config', () => {
      const config: SessionConfig = {
        task: 'Test audit task',
        scope: 'diff',
        threshold: 85,
        maxCycles: 3,
        candidates: 2,
        judges: ['internal', 'external'],
        applyFixes: false,
      };

      const result = validator.validateSessionConfig(config);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(config);
    });

    it('should apply defaults for missing fields', () => {
      const config = {};

      const result = validator.validateSessionConfig(config);
      expect(result.valid).toBe(true);
      expect(result.data?.task).toBe('Audit and improve the provided candidate');
      expect(result.data?.scope).toBe('diff');
      expect(result.data?.threshold).toBe(85);
    });

    it('should validate scope enum', () => {
      const config = { scope: 'invalid-scope' };

      const result = validator.validateSessionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'ENUM_MISMATCH')).toBe(true);
    });

    it('should validate threshold range', () => {
      const config = { threshold: 150 };

      const result = validator.validateSessionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MAX_VALUE')).toBe(true);
    });

    it('should require paths when scope is "paths"', () => {
      const config = { scope: 'paths' };

      const result = validator.validateSessionConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CONDITIONAL_REQUIRED')).toBe(true);
    });

    it('should validate paths array when provided', () => {
      const config = { 
        scope: 'paths', 
        paths: ['src/file1.ts', 'src/file2.ts'] 
      };

      const result = validator.validateSessionConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateGanReview', () => {
    it('should validate valid GAN review', () => {
      const review: GanReview = {
        overall: 85,
        dimensions: [
          { name: 'accuracy', score: 90 },
          { name: 'completeness', score: 80 },
        ],
        verdict: 'pass',
        review: {
          summary: 'Good implementation with minor issues',
          inline: [
            { path: 'src/file.ts', line: 10, comment: 'Consider using const instead of let' },
          ],
          citations: ['repo://src/file.ts:1-20'],
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [
          { model: 'internal', score: 85, notes: 'Well structured code' },
        ],
      };

      const result = validator.validateGanReview(review);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(review);
    });

    it('should validate verdict enum', () => {
      const review = {
        overall: 85,
        dimensions: [],
        verdict: 'invalid-verdict',
        review: { summary: 'test', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      };

      const result = validator.validateGanReview(review);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'ENUM_MISMATCH')).toBe(true);
    });

    it('should validate score ranges', () => {
      const review = {
        overall: 150, // Invalid score
        dimensions: [{ name: 'test', score: -10 }], // Invalid score
        verdict: 'pass',
        review: { summary: 'test', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      };

      const result = validator.validateGanReview(review);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MAX_VALUE')).toBe(true);
      expect(result.errors.some(e => e.code === 'MIN_VALUE')).toBe(true);
    });

    it('should validate required nested properties', () => {
      const review = {
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: '', inline: [], citations: [] }, // Empty summary
        iterations: 1,
        judge_cards: [],
      };

      const result = validator.validateGanReview(review);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MIN_LENGTH')).toBe(true);
    });
  });

  describe('validateAuditRequest', () => {
    it('should validate valid audit request', () => {
      const request: AuditRequest = {
        task: 'Review this code for quality',
        candidate: 'function test() { return true; }',
        contextPack: 'Repository context information',
        rubric: {
          dimensions: [
            { name: 'accuracy', weight: 0.4 },
            { name: 'completeness', weight: 0.6 },
          ],
        },
        budget: {
          maxCycles: 3,
          candidates: 2,
          threshold: 85,
        },
      };

      const result = validator.validateAuditRequest(request);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(request);
    });

    it('should validate weight ranges in rubric', () => {
      const request = {
        task: 'test',
        candidate: 'code',
        contextPack: 'context',
        rubric: {
          dimensions: [{ name: 'test', weight: 1.5 }], // Invalid weight
        },
        budget: { maxCycles: 1, candidates: 1, threshold: 85 },
      };

      const result = validator.validateAuditRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MAX_VALUE')).toBe(true);
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace by default', () => {
      const result = validator.sanitizeString('  test  ');
      expect(result.sanitized).toBe('test');
      expect(result.changes).toContain('trimmed whitespace');
    });

    it('should remove HTML tags by default', () => {
      const result = validator.sanitizeString('<script>alert("test")</script>');
      expect(result.sanitized).toBe('alert("test")');
      expect(result.changes).toContain('removed HTML tags');
    });

    it('should preserve HTML when allowed', () => {
      const result = validator.sanitizeString('<b>test</b>', { allowHtml: true });
      expect(result.sanitized).toBe('<b>test</b>');
      expect(result.changes).not.toContain('removed HTML tags');
    });

    it('should remove newlines when not allowed', () => {
      const result = validator.sanitizeString('line1\nline2', { allowNewlines: false });
      expect(result.sanitized).toBe('line1 line2');
      expect(result.changes).toContain('removed newlines');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(100);
      const result = validator.sanitizeString(longString, { maxLength: 50 });
      expect(result.sanitized.length).toBe(50);
      expect(result.changes).toContain('truncated to 50 characters');
    });

    it('should not trim when disabled', () => {
      const result = validator.sanitizeString('  test  ', { trim: false });
      expect(result.sanitized).toBe('  test  ');
      expect(result.changes).not.toContain('trimmed whitespace');
    });
  });

  describe('validateFilePath', () => {
    it('should validate normal file path', () => {
      const result = validator.validateFilePath('src/file.ts');
      expect(result.valid).toBe(true);
      expect(result.data).toBe('src/file.ts');
    });

    it('should reject empty path', () => {
      const result = validator.validateFilePath('');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('EMPTY_PATH');
    });

    it('should reject non-string path', () => {
      const result = validator.validateFilePath(123 as any);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should reject directory traversal', () => {
      const result = validator.validateFilePath('../../../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('DIRECTORY_TRAVERSAL');
    });

    it('should reject invalid characters', () => {
      const result = validator.validateFilePath('file<>:"|?*.txt');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_CHARACTERS');
    });

    it('should normalize path separators', () => {
      const result = validator.validateFilePath('src\\\\file.ts');
      expect(result.valid).toBe(true);
      expect(result.data).toBe('src/file.ts');
      expect(result.metadata?.sanitizations).toContain('normalized path separators');
    });

    it('should remove duplicate separators', () => {
      const result = validator.validateFilePath('src///file.ts');
      expect(result.valid).toBe(true);
      expect(result.data).toBe('src/file.ts');
    });

    it('should remove trailing separator', () => {
      const result = validator.validateFilePath('src/dir/');
      expect(result.valid).toBe(true);
      expect(result.data).toBe('src/dir');
    });
  });

  describe('type coercion', () => {
    let validatorWithCoercion: ValidationUtils;

    beforeEach(() => {
      validatorWithCoercion = new ValidationUtils({ coerceTypes: true });
    });

    it('should coerce string to number', () => {
      const result = validatorWithCoercion.validate('123', { type: 'number' });
      expect(result.valid).toBe(true);
      expect(result.data).toBe(123);
    });

    it('should coerce number to string', () => {
      const result = validatorWithCoercion.validate(123, { type: 'string' });
      expect(result.valid).toBe(true);
      expect(result.data).toBe('123');
    });

    it('should coerce string to boolean', () => {
      const trueResult = validatorWithCoercion.validate('true', { type: 'boolean' });
      expect(trueResult.valid).toBe(true);
      expect(trueResult.data).toBe(true);

      const falseResult = validatorWithCoercion.validate('false', { type: 'boolean' });
      expect(falseResult.valid).toBe(true);
      expect(falseResult.data).toBe(false);

      const yesResult = validatorWithCoercion.validate('yes', { type: 'boolean' });
      expect(yesResult.valid).toBe(true);
      expect(yesResult.data).toBe(true);
    });

    it('should coerce value to array', () => {
      const result = validatorWithCoercion.validate('single-value', { type: 'array' });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(['single-value']);
    });

    it('should fail to coerce incompatible types', () => {
      const result = validatorWithCoercion.validate('not-a-number', { type: 'number' });
      expect(result.valid).toBe(false);
    });
  });
});

describe('GansAuditor_Codex Convenience functions', () => {
  describe('validateSessionConfig', () => {
    it('should use global validation utils', () => {
      const config = { task: 'test' };
      const result = validateSessionConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateGanReview', () => {
    it('should use global validation utils', () => {
      const review = {
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'test', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      };
      const result = validateGanReview(review);
      expect(result.valid).toBe(true);
    });
  });

  describe('sanitizeString', () => {
    it('should use global validation utils', () => {
      const result = sanitizeString('  test  ');
      expect(result.sanitized).toBe('test');
    });
  });

  describe('validateFilePath', () => {
    it('should use global validation utils', () => {
      const result = validateFilePath('src/file.ts');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateData', () => {
    it('should use global validation utils', () => {
      const result = validateData('test', { type: 'string' });
      expect(result.valid).toBe(true);
    });
  });
});