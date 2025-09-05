/**
 * Tests for GansAuditor_Codex string processing utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TextTruncator,
  TextFormatter,
  PathUtils,
  textTruncator,
  textFormatter,
  truncateText,
  formatForConsole,
  normalizeWhitespace,
  escapeHtml,
  sanitizeFilename,
  toIdentifier,
  toSlug,
} from '../string-utils.js';

describe('GansAuditor_Codex TextTruncator', () => {
  let truncator: TextTruncator;

  beforeEach(() => {
    truncator = new TextTruncator({ maxLength: 20, truncationSuffix: '...' });
  });

  describe('truncate', () => {
    it('should not truncate short text', () => {
      const text = 'short text';
      const result = truncator.truncate(text);
      expect(result).toBe(text);
    });

    it('should truncate long text from end', () => {
      const text = 'this is a very long text that should be truncated';
      const result = truncator.truncate(text, 20);
      expect(result).toBe('this is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should preserve words when truncating', () => {
      const text = 'this is a very long text';
      const result = truncator.truncate(text, 20, { preserveWords: true });
      expect(result).toBe('this is a very...');
    });

    it('should truncate from start', () => {
      const text = 'this is a very long text that should be truncated';
      const result = truncator.truncate(text, 20, { strategy: 'start' });
      expect(result).toBe('...uld be truncated');
      expect(result.length).toBe(20);
    });

    it('should truncate from middle', () => {
      const text = 'this is a very long text that should be truncated';
      const result = truncator.truncate(text, 20, { strategy: 'middle' });
      expect(result).toContain('...');
      expect(result.length).toBe(20);
    });
  });

  describe('truncateToTokens', () => {
    it('should truncate based on token estimate', () => {
      const text = 'this is a test text for token truncation';
      const result = truncator.truncateToTokens(text, 10, 0.25); // ~40 chars
      expect(result.length).toBeLessThanOrEqual(40);
    });
  });

  describe('truncateStructured', () => {
    it('should preserve complete lines', () => {
      const text = 'line 1\nline 2\nline 3\nline 4';
      const result = truncator.truncateStructured(text, 15);
      expect(result).toContain('line 1');
      expect(result).toContain('line 2');
      expect(result).toContain('...');
    });
  });
});

describe('GansAuditor_Codex TextFormatter', () => {
  let formatter: TextFormatter;

  beforeEach(() => {
    formatter = new TextFormatter();
  });

  describe('normalizeWhitespace', () => {
    it('should normalize line endings', () => {
      const text = 'line1\r\nline2\rline3\nline4';
      const result = formatter.normalizeWhitespace(text);
      expect(result).toBe('line1\nline2\nline3\nline4');
    });

    it('should convert tabs to spaces', () => {
      const text = 'line1\tline2';
      const result = formatter.normalizeWhitespace(text);
      expect(result).toBe('line1  line2');
    });

    it('should collapse multiple spaces', () => {
      const text = 'word1    word2     word3';
      const result = formatter.normalizeWhitespace(text);
      expect(result).toBe('word1 word2 word3');
    });

    it('should limit consecutive newlines', () => {
      const text = 'line1\n\n\n\nline2';
      const result = formatter.normalizeWhitespace(text);
      expect(result).toBe('line1\n\nline2');
    });
  });

  describe('removeControlChars', () => {
    it('should remove control characters', () => {
      const text = 'normal\x00text\x1fwith\x7fcontrol';
      const result = formatter.removeControlChars(text);
      expect(result).toBe('normaltextwithcontrol');
    });

    it('should preserve newlines and tabs', () => {
      const text = 'line1\nline2\tindented';
      const result = formatter.removeControlChars(text);
      expect(result).toBe('line1\nline2\tindented');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const text = '<script>alert("test")</script>';
      const result = formatter.escapeHtml(text);
      expect(result).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      const text = 'Tom & Jerry';
      const result = formatter.escapeHtml(text);
      expect(result).toBe('Tom &amp; Jerry');
    });
  });

  describe('escapeRegex', () => {
    it('should escape regex special characters', () => {
      const text = 'test.*+?^${}()|[]\\';
      const result = formatter.escapeRegex(text);
      expect(result).toBe('test\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });
  });

  describe('escapeShell', () => {
    it('should escape shell arguments on Unix', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      const text = "test 'with' quotes";
      const result = formatter.escapeShell(text);
      expect(result).toBe("'test '\"'\"'with'\"'\"' quotes'");
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should escape shell arguments on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      const text = 'test "with" quotes';
      const result = formatter.escapeShell(text);
      expect(result).toBe('"test ""with"" quotes"');
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('formatForConsole', () => {
    it('should add indentation', () => {
      const text = 'line1\nline2';
      const result = formatter.formatForConsole(text, { indent: 2 });
      expect(result).toBe('  line1\n  line2');
    });

    it('should add prefix', () => {
      const text = 'line1\nline2';
      const result = formatter.formatForConsole(text, { prefix: '> ' });
      expect(result).toBe('> line1\n> line2');
    });

    it('should wrap long lines', () => {
      const text = 'this is a very long line that should be wrapped';
      const result = formatter.formatForConsole(text, { width: 20, wrapLines: true });
      expect(result).toContain('\n');
    });
  });

  describe('formatCodeSnippet', () => {
    it('should format code with language', () => {
      const code = 'function test() {\n  return true;\n}';
      const result = formatter.formatCodeSnippet(code, 'javascript');
      expect(result).toContain('```javascript');
      expect(result).toContain('```');
    });

    it('should add line numbers', () => {
      const code = 'line1\nline2\nline3';
      const result = formatter.formatCodeSnippet(code, '', { showLineNumbers: true });
      expect(result).toContain('  1: line1');
      expect(result).toContain('  2: line2');
      expect(result).toContain('  3: line3');
    });

    it('should limit lines', () => {
      const code = 'line1\nline2\nline3\nline4\nline5';
      const result = formatter.formatCodeSnippet(code, '', { maxLines: 3 });
      expect(result).toContain('line1');
      expect(result).toContain('line3');
      expect(result).toContain('... (2 more lines)');
    });
  });

  describe('createSummary', () => {
    it('should return short text as-is', () => {
      const text = 'short text';
      const result = formatter.createSummary(text, 100);
      expect(result).toBe(text);
    });

    it('should extract first paragraph', () => {
      const text = 'First paragraph.\n\nSecond paragraph.';
      const result = formatter.createSummary(text, 100);
      expect(result).toBe('First paragraph.');
    });

    it('should extract first sentence', () => {
      const text = 'First sentence. Second sentence in same paragraph.';
      const result = formatter.createSummary(text, 20);
      expect(result).toBe('First sentence.');
    });

    it('should fallback to truncation', () => {
      const text = 'Very long sentence without proper punctuation that goes on and on';
      const result = formatter.createSummary(text, 20);
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain('...');
    });
  });
});

describe('GansAuditor_Codex PathUtils', () => {
  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      const filename = 'test<>:"/\\|?*file.txt';
      const result = PathUtils.sanitizeFilename(filename);
      expect(result).toBe('test_file.txt');
    });

    it('should replace spaces with underscores', () => {
      const filename = 'my test file.txt';
      const result = PathUtils.sanitizeFilename(filename);
      expect(result).toBe('my_test_file.txt');
    });

    it('should collapse multiple underscores', () => {
      const filename = 'test___file.txt';
      const result = PathUtils.sanitizeFilename(filename);
      expect(result).toBe('test_file.txt');
    });

    it('should remove leading/trailing underscores', () => {
      const filename = '_test_file_.txt';
      const result = PathUtils.sanitizeFilename(filename);
      expect(result).toBe('test_file_.txt');
    });

    it('should limit length', () => {
      const filename = 'a'.repeat(300) + '.txt';
      const result = PathUtils.sanitizeFilename(filename);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });

  describe('toIdentifier', () => {
    it('should create valid identifier', () => {
      const text = 'My Test Function!';
      const result = PathUtils.toIdentifier(text);
      expect(result).toBe('my_test_function_');
    });

    it('should handle numbers at start', () => {
      const text = '123test';
      const result = PathUtils.toIdentifier(text);
      expect(result).toBe('_123test');
    });

    it('should collapse underscores', () => {
      const text = 'test___function';
      const result = PathUtils.toIdentifier(text);
      expect(result).toBe('test_function');
    });
  });

  describe('toSlug', () => {
    it('should create URL-friendly slug', () => {
      const text = 'My Test Article!';
      const result = PathUtils.toSlug(text);
      expect(result).toBe('my-test-article');
    });

    it('should handle special characters', () => {
      const text = 'Test & Development (2024)';
      const result = PathUtils.toSlug(text);
      expect(result).toBe('test-development-2024');
    });

    it('should remove leading/trailing hyphens', () => {
      const text = '---test---';
      const result = PathUtils.toSlug(text);
      expect(result).toBe('test');
    });
  });

  describe('makeRelative', () => {
    it('should make path relative to base', () => {
      const absolutePath = '/home/user/project/file.txt';
      const basePath = '/home/user/project';
      const result = PathUtils.makeRelative(absolutePath, basePath);
      expect(result).toBe('file.txt');
    });

    it('should return original path if not under base', () => {
      const absolutePath = '/other/path/file.txt';
      const basePath = '/home/user/project';
      const result = PathUtils.makeRelative(absolutePath, basePath);
      expect(result).toBe(absolutePath);
    });
  });
});

describe('GansAuditor_Codex Convenience functions', () => {
  describe('truncateText', () => {
    it('should use global truncator', () => {
      const text = 'this is a long text that should be truncated';
      const result = truncateText(text, 20);
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain('...');
    });
  });

  describe('formatForConsole', () => {
    it('should use global formatter', () => {
      const text = 'test';
      const result = formatForConsole(text, { indent: 2 });
      expect(result).toBe('  test');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should use global formatter', () => {
      const text = 'line1\r\nline2';
      const result = normalizeWhitespace(text);
      expect(result).toBe('line1\nline2');
    });
  });

  describe('escapeHtml', () => {
    it('should use global formatter', () => {
      const text = '<test>';
      const result = escapeHtml(text);
      expect(result).toBe('&lt;test&gt;');
    });
  });

  describe('sanitizeFilename', () => {
    it('should use PathUtils', () => {
      const filename = 'test<>file.txt';
      const result = sanitizeFilename(filename);
      expect(result).toBe('test_file.txt');
    });
  });

  describe('toIdentifier', () => {
    it('should use PathUtils', () => {
      const text = 'Test Function';
      const result = toIdentifier(text);
      expect(result).toBe('test_function');
    });
  });

  describe('toSlug', () => {
    it('should use PathUtils', () => {
      const text = 'Test Article';
      const result = toSlug(text);
      expect(result).toBe('test-article');
    });
  });
});