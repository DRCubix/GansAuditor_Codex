/**
 * Tests for GansAuditor_Codex JSON parsing utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  JsonUtils,
  jsonUtils,
  parseJsonSafe,
  stringifyJsonSafe,
  validateJson,
  extractJsonFromContent,
  tryParseJson,
  isValidJson,
} from '../json-utils.js';

describe('GansAuditor_Codex JsonUtils', () => {
  let jsonUtilsInstance: JsonUtils;

  beforeEach(() => {
    jsonUtilsInstance = new JsonUtils();
  });

  describe('parseJson', () => {
    it('should parse valid JSON', async () => {
      const jsonString = '{"name": "test", "value": 123}';
      const result = await jsonUtilsInstance.parseJson(jsonString);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
      expect(result.metadata?.strategy).toBe('standard');
    });

    it('should handle invalid input type', async () => {
      const result = await jsonUtilsInstance.parseJson(123 as any);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Input must be a string');
    });

    it('should handle string too large', async () => {
      const largeString = 'x'.repeat(2 * 1024 * 1024); // 2MB
      const jsonUtilsWithLimit = new JsonUtils({ maxStringLength: 1024 });
      const result = await jsonUtilsWithLimit.parseJson(largeString);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('JSON string too large');
    });

    it('should use fallback value when parsing fails', async () => {
      const invalidJson = '{"invalid": json}';
      const fallbackValue = { fallback: true };
      const result = await jsonUtilsInstance.parseJson(invalidJson, {
        defaultValue: fallbackValue,
        enableFallback: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fallbackValue);
      expect(result.warnings).toContain('Used fallback value due to parsing failure');
    });
  });

  describe('greedy parsing', () => {
    it('should extract valid JSON from mixed content', async () => {
      const mixedContent = 'Some text before {"valid": "json", "number": 42} and text after';
      const result = await jsonUtilsInstance.parseJson(mixedContent);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ valid: 'json', number: 42 });
      expect(result.metadata?.strategy).toBe('greedy');
      expect(result.warnings).toContain('Used greedy parsing to extract JSON');
    });

    it('should handle nested objects in greedy parsing', async () => {
      const content = 'prefix {"outer": {"inner": {"value": 123}}} suffix';
      const result = await jsonUtilsInstance.parseJson(content);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ outer: { inner: { value: 123 } } });
    });

    it('should handle arrays in greedy parsing', async () => {
      const content = 'text [{"item": 1}, {"item": 2}] more text';
      const result = await jsonUtilsInstance.parseJson(content);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ item: 1 }, { item: 2 }]);
    });
  });

  describe('repair parsing', () => {
    it('should fix unquoted keys', async () => {
      const invalidJson = '{name: "test", value: 123}';
      const result = await jsonUtilsInstance.parseJson(invalidJson);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
      expect(result.metadata?.strategy).toBe('repaired');
    });

    it('should fix single quotes', async () => {
      const invalidJson = "{'name': 'test', 'value': 123}";
      const result = await jsonUtilsInstance.parseJson(invalidJson);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should remove trailing commas', async () => {
      const invalidJson = '{"name": "test", "value": 123,}';
      const result = await jsonUtilsInstance.parseJson(invalidJson);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should remove comments', async () => {
      const jsonWithComments = `{
        // This is a comment
        "name": "test", /* block comment */
        "value": 123
      }`;
      const result = await jsonUtilsInstance.parseJson(jsonWithComments);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should fix incomplete objects', async () => {
      const incompleteJson = '{"name": "test", "value": 123';
      const result = await jsonUtilsInstance.parseJson(incompleteJson);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });

    it('should fix unquoted string values', async () => {
      const invalidJson = '{"name": test, "value": 123}';
      const result = await jsonUtilsInstance.parseJson(invalidJson);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 123 });
    });
  });

  describe('stringify', () => {
    it('should stringify object successfully', () => {
      const obj = { name: 'test', value: 123, nested: { prop: 'value' } };
      const result = jsonUtilsInstance.stringify(obj);

      expect(result.success).toBe(true);
      expect(result.data).toBe('{"name":"test","value":123,"nested":{"prop":"value"}}');
    });

    it('should stringify with pretty formatting', () => {
      const obj = { name: 'test', value: 123 };
      const result = jsonUtilsInstance.stringify(obj, { pretty: true });

      expect(result.success).toBe(true);
      expect(result.data).toContain('\n');
      expect(result.data).toContain('  ');
    });

    it('should handle circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference

      const result = jsonUtilsInstance.stringify(obj);

      expect(result.success).toBe(true);
      expect(result.data).toContain('[Circular Reference]');
    });

    it('should handle functions', () => {
      const obj = { name: 'test', fn: () => 'hello' };
      const result = jsonUtilsInstance.stringify(obj);

      expect(result.success).toBe(true);
      expect(result.data).toContain('[Function]');
    });

    it('should handle undefined values', () => {
      const obj = { name: 'test', undef: undefined };
      const result = jsonUtilsInstance.stringify(obj);

      expect(result.success).toBe(true);
      expect(result.data).toContain('[Undefined]');
    });

    it('should handle symbols', () => {
      const sym = Symbol('test');
      const obj = { name: 'test', symbol: sym };
      const result = jsonUtilsInstance.stringify(obj);

      expect(result.success).toBe(true);
      expect(result.data).toContain('Symbol(test)');
    });

    it('should use custom replacer', () => {
      const obj = { name: 'test', secret: 'hidden' };
      const result = jsonUtilsInstance.stringify(obj, {
        replacer: (key, value) => key === 'secret' ? '[REDACTED]' : value,
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('[REDACTED]');
      expect(result.data).not.toContain('hidden');
    });
  });

  describe('validate', () => {
    it('should validate correct type', () => {
      const data = 'test string';
      const schema = { type: 'string' };
      const result = jsonUtilsInstance.validate(data, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect type mismatch', () => {
      const data = 123;
      const schema = { type: 'string' };
      const result = jsonUtilsInstance.validate(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Expected type string, got number');
    });

    it('should validate required properties', () => {
      const data = { name: 'test' };
      const schema = {
        type: 'object',
        required: ['name', 'value'],
        properties: {
          name: { type: 'string' },
          value: { type: 'number' },
        },
      };
      const result = jsonUtilsInstance.validate(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Missing required property: value'))).toBe(true);
    });

    it('should validate nested properties', () => {
      const data = { user: { name: 'test', age: 'invalid' } };
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
          },
        },
      };
      const result = jsonUtilsInstance.validate(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Expected type number, got string'))).toBe(true);
    });

    it('should warn about unexpected properties', () => {
      const data = { name: 'test', extra: 'value' };
      const schema = {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
        },
      };
      const result = jsonUtilsInstance.validate(data, schema);

      expect(result.warnings.some(w => w.includes('Unexpected property'))).toBe(true);
    });
  });

  describe('extractJson', () => {
    it('should extract JSON from code blocks', async () => {
      const content = `
        Some text here
        \`\`\`json
        {"name": "test", "value": 123}
        \`\`\`
        More text
        \`\`\`
        {"another": "object"}
        \`\`\`
      `;
      const result = await jsonUtilsInstance.extractJson(content);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toEqual({ name: 'test', value: 123 });
      expect(result.data![1]).toEqual({ another: 'object' });
    });

    it('should extract inline JSON objects', async () => {
      const content = 'Here is some data: {"key": "value"} and more text {"num": 42}';
      const result = await jsonUtilsInstance.extractJson(content);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toEqual({ key: 'value' });
      expect(result.data![1]).toEqual({ num: 42 });
    });

    it('should avoid duplicates', async () => {
      const content = `
        \`\`\`json
        {"name": "test"}
        \`\`\`
        Same object: {"name": "test"}
      `;
      const result = await jsonUtilsInstance.extractJson(content);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle extraction failures gracefully', async () => {
      const content = `
        \`\`\`json
        {invalid json}
        \`\`\`
        Valid: {"valid": true}
      `;
      const result = await jsonUtilsInstance.extractJson(content);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toEqual({ valid: true });
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('Failed to parse JSON block'))).toBe(true);
    });
  });
});

describe('GansAuditor_Codex Convenience functions', () => {
  describe('parseJsonSafe', () => {
    it('should use global json utils', async () => {
      const result = await parseJsonSafe('{"test": true}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ test: true });
    });
  });

  describe('stringifyJsonSafe', () => {
    it('should use global json utils', () => {
      const result = stringifyJsonSafe({ test: true });
      expect(result.success).toBe(true);
      expect(result.data).toBe('{"test":true}');
    });
  });

  describe('validateJson', () => {
    it('should use global json utils', () => {
      const result = validateJson('test', { type: 'string' });
      expect(result.valid).toBe(true);
    });
  });

  describe('extractJsonFromContent', () => {
    it('should use global json utils', async () => {
      const content = '```json\n{"test": true}\n```';
      const result = await extractJsonFromContent(content);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('tryParseJson', () => {
    it('should return parsed data on success', async () => {
      const result = await tryParseJson('{"test": true}');
      expect(result).toEqual({ test: true });
    });

    it('should return fallback on failure', async () => {
      const fallback = { fallback: true };
      const result = await tryParseJson('{invalid}', fallback);
      expect(result).toEqual(fallback);
    });

    it('should return undefined when no fallback provided', async () => {
      const result = await tryParseJson('{invalid}');
      expect(result).toBeUndefined();
    });
  });

  describe('isValidJson', () => {
    it('should return true for valid JSON', async () => {
      const result = await isValidJson('{"test": true}');
      expect(result).toBe(true);
    });

    it('should return false for invalid JSON', async () => {
      const result = await isValidJson('{invalid}');
      expect(result).toBe(false);
    });
  });
});

describe('JSON parsing edge cases', () => {
  let jsonUtilsInstance: JsonUtils;

  beforeEach(() => {
    jsonUtilsInstance = new JsonUtils();
  });

  describe('complex repair scenarios', () => {
    it('should handle multiple repair attempts', async () => {
      const complexInvalidJson = `{
        name: 'test',  // comment
        value: 123,
        nested: {
          prop: unquoted_value,
        },
      }`;
      
      const result = await jsonUtilsInstance.parseJson(complexInvalidJson);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'test',
        value: 123,
        nested: {
          prop: 'unquoted_value',
        },
      });
      expect(result.metadata?.strategy).toBe('repaired');
    });

    it('should handle deeply nested incomplete objects', async () => {
      const incompleteJson = '{"level1": {"level2": {"level3": {"value": 123';
      const result = await jsonUtilsInstance.parseJson(incompleteJson);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        level1: {
          level2: {
            level3: {
              value: 123,
            },
          },
        },
      });
    });
  });

  describe('greedy parsing edge cases', () => {
    it('should handle multiple JSON objects and pick the first valid one', async () => {
      const content = 'invalid {broken json} valid {"good": "json"} another {"also": "good"}';
      const result = await jsonUtilsInstance.parseJson(content);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ good: 'json' });
    });

    it('should handle strings with escaped quotes in greedy parsing', async () => {
      const content = 'text {"message": "He said \\"Hello\\" to me"} more';
      const result = await jsonUtilsInstance.parseJson(content);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'He said "Hello" to me' });
    });
  });

  describe('configuration options', () => {
    it('should respect disabled greedy parsing', async () => {
      const jsonUtilsNoGreedy = new JsonUtils({ enableGreedyParsing: false });
      const mixedContent = 'text {"valid": "json"} more text';
      const result = await jsonUtilsNoGreedy.parseJson(mixedContent);

      expect(result.success).toBe(false);
    });

    it('should respect disabled repair attempts', async () => {
      const jsonUtilsNoRepair = new JsonUtils({ enableRepairAttempts: false });
      const invalidJson = '{name: "test"}';
      const result = await jsonUtilsNoRepair.parseJson(invalidJson);

      expect(result.success).toBe(false);
    });

    it('should respect max repair attempts', async () => {
      const jsonUtilsLimitedRepair = new JsonUtils({ maxRepairAttempts: 1 });
      const veryInvalidJson = `{
        name: 'test',
        value: unquoted,
        extra: 'stuff',
      `;
      
      // This might still succeed if the first repair attempt fixes enough
      const result = await jsonUtilsLimitedRepair.parseJson(veryInvalidJson);
      
      if (result.success) {
        expect(result.metadata?.repairAttempts).toBeLessThanOrEqual(1);
      }
    });
  });
});