/**
 * String processing utilities for GAN Auditor Integration
 * 
 * This module provides string manipulation, formatting, truncation,
 * and escaping utilities for safe text processing.
 * 
 * Requirements addressed:
 * - 4.5: String processing for context building and formatting
 * - 7.3: Safe text processing and escaping
 * - 7.4: Text truncation and size management
 */

import { logger } from './logger.js';

// ============================================================================
// String Processing Configuration
// ============================================================================

/**
 * Configuration for string processing operations
 */
export interface StringProcessingConfig {
  maxLength: number;
  truncationSuffix: string;
  preserveWords: boolean;
  escapeHtml: boolean;
  normalizeWhitespace: boolean;
  removeControlChars: boolean;
}

/**
 * Default string processing configuration
 */
const DEFAULT_STRING_CONFIG: StringProcessingConfig = {
  maxLength: 10000,
  truncationSuffix: '...',
  preserveWords: true,
  escapeHtml: true,
  normalizeWhitespace: true,
  removeControlChars: true,
};

// ============================================================================
// Text Truncation Utilities
// ============================================================================

/**
 * Truncate text to specified length with various strategies
 */
export class TextTruncator {
  private config: StringProcessingConfig;

  constructor(config: Partial<StringProcessingConfig> = {}) {
    this.config = { ...DEFAULT_STRING_CONFIG, ...config };
  }

  /**
   * Truncate text with smart word boundary preservation
   */
  truncate(
    text: string, 
    maxLength?: number, 
    options: {
      suffix?: string;
      preserveWords?: boolean;
      strategy?: 'end' | 'middle' | 'start';
    } = {}
  ): string {
    const length = maxLength ?? this.config.maxLength;
    const suffix = options.suffix ?? this.config.truncationSuffix;
    const preserveWords = options.preserveWords ?? this.config.preserveWords;
    const strategy = options.strategy ?? 'end';

    if (text.length <= length) {
      return text;
    }

    switch (strategy) {
      case 'start':
        return this.truncateStart(text, length, suffix, preserveWords);
      case 'middle':
        return this.truncateMiddle(text, length, suffix, preserveWords);
      case 'end':
      default:
        return this.truncateEnd(text, length, suffix, preserveWords);
    }
  }

  /**
   * Truncate from the end (most common)
   */
  private truncateEnd(text: string, maxLength: number, suffix: string, preserveWords: boolean): string {
    const targetLength = maxLength - suffix.length;
    
    if (targetLength <= 0) {
      return suffix;
    }

    let truncated = text.substring(0, targetLength);
    
    if (preserveWords && truncated.length < text.length) {
      const lastSpaceIndex = truncated.lastIndexOf(' ');
      if (lastSpaceIndex > targetLength * 0.7) { // Only preserve if we don't lose too much
        truncated = truncated.substring(0, lastSpaceIndex);
      }
    }

    return truncated + suffix;
  }

  /**
   * Truncate from the start
   */
  private truncateStart(text: string, maxLength: number, suffix: string, preserveWords: boolean): string {
    const targetLength = maxLength - suffix.length;
    
    if (targetLength <= 0) {
      return suffix;
    }

    let truncated = text.substring(text.length - targetLength);
    
    if (preserveWords && truncated.length < text.length) {
      const firstSpaceIndex = truncated.indexOf(' ');
      if (firstSpaceIndex >= 0 && firstSpaceIndex < targetLength * 0.3) {
        truncated = truncated.substring(firstSpaceIndex + 1);
      }
    }

    return suffix + truncated;
  }

  /**
   * Truncate from the middle
   */
  private truncateMiddle(text: string, maxLength: number, suffix: string, preserveWords: boolean): string {
    const targetLength = maxLength - suffix.length;
    
    if (targetLength <= 0) {
      return suffix;
    }

    const halfLength = Math.floor(targetLength / 2);
    let start = text.substring(0, halfLength);
    let end = text.substring(text.length - (targetLength - start.length));

    if (preserveWords && text.length > maxLength) {
      // Adjust start to word boundary
      const startSpaceIndex = start.lastIndexOf(' ');
      if (startSpaceIndex > halfLength * 0.7) {
        start = start.substring(0, startSpaceIndex);
      }

      // Recalculate end based on adjusted start
      const remainingLength = targetLength - start.length;
      end = text.substring(text.length - remainingLength);
      
      // Adjust end to word boundary
      const endSpaceIndex = end.indexOf(' ');
      if (endSpaceIndex >= 0 && endSpaceIndex < remainingLength * 0.3) {
        end = end.substring(endSpaceIndex + 1);
      }
    }

    return start + suffix + end;
  }

  /**
   * Truncate text to fit within token limits (approximate)
   */
  truncateToTokens(text: string, maxTokens: number, tokensPerChar: number = 0.25): string {
    const maxChars = Math.floor(maxTokens / tokensPerChar);
    return this.truncate(text, maxChars);
  }

  /**
   * Smart truncation that preserves structure (e.g., code blocks, lists)
   */
  truncateStructured(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Try to preserve complete lines
    const lines = text.split('\n');
    let result = '';
    let currentLength = 0;
    const suffixLength = this.config.truncationSuffix.length;

    for (const line of lines) {
      const lineLength = line.length + (result ? 1 : 0); // +1 for newline if not first line
      
      if (currentLength + lineLength + suffixLength <= maxLength) {
        if (result) {
          result += '\n';
          currentLength += 1;
        }
        result += line;
        currentLength += line.length;
      } else {
        // If we can fit at least part of this line
        const remainingSpace = maxLength - currentLength - suffixLength;
        if (remainingSpace > 10 && result) { // Only if we have reasonable space and already have content
          result += '\n' + this.truncate(line, remainingSpace - 1, { suffix: '' });
        }
        break;
      }
    }

    return result + this.config.truncationSuffix;
  }
}

// ============================================================================
// Text Formatting Utilities
// ============================================================================

/**
 * Text formatting and normalization utilities
 */
export class TextFormatter {
  private config: StringProcessingConfig;

  constructor(config: Partial<StringProcessingConfig> = {}) {
    this.config = { ...DEFAULT_STRING_CONFIG, ...config };
  }

  /**
   * Normalize whitespace in text
   */
  normalizeWhitespace(text: string): string {
    if (!this.config.normalizeWhitespace) {
      return text;
    }

    let result = text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n');   // Handle old Mac line endings
    
    // Convert tabs to spaces (but preserve them in the process)
    result = result.replace(/\t/g, '  ');
    
    // Collapse multiple spaces (but not after tab conversion)
    result = result.replace(/ {3,}/g, ' ');
    
    // Limit consecutive newlines
    result = result.replace(/\n{3,}/g, '\n\n');
    
    return result;
  }

  /**
   * Remove control characters from text
   */
  removeControlChars(text: string): string {
    if (!this.config.removeControlChars) {
      return text;
    }

    // Remove control characters except newline, tab, and carriage return
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Escape HTML entities in text
   */
  escapeHtml(text: string): string {
    if (!this.config.escapeHtml) {
      return text;
    }

    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, char => htmlEntities[char]);
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Escape shell command arguments
   */
  escapeShell(text: string): string {
    // For Unix-like systems
    if (process.platform !== 'win32') {
      return "'" + text.replace(/'/g, "'\"'\"'") + "'";
    }
    
    // For Windows
    return '"' + text.replace(/"/g, '""') + '"';
  }

  /**
   * Format text for display in console with proper indentation
   */
  formatForConsole(
    text: string, 
    options: {
      indent?: number;
      prefix?: string;
      width?: number;
      wrapLines?: boolean;
    } = {}
  ): string {
    const indent = ' '.repeat(options.indent || 0);
    const prefix = options.prefix || '';
    const width = options.width || 80;
    const wrapLines = options.wrapLines ?? true;

    let lines = text.split('\n');

    if (wrapLines) {
      lines = lines.flatMap(line => this.wrapLine(line, width - indent.length - prefix.length));
    }

    return lines
      .map(line => indent + prefix + line)
      .join('\n');
  }

  /**
   * Format code snippet with syntax highlighting markers
   */
  formatCodeSnippet(
    code: string, 
    language: string = '', 
    options: {
      showLineNumbers?: boolean;
      startLine?: number;
      maxLines?: number;
    } = {}
  ): string {
    const lines = code.split('\n');
    const startLine = options.startLine || 1;
    const maxLines = options.maxLines || lines.length;
    const showLineNumbers = options.showLineNumbers ?? true;

    let result = '';
    
    if (language) {
      result += `\`\`\`${language}\n`;
    }

    const displayLines = lines.slice(0, maxLines);
    
    displayLines.forEach((line, index) => {
      if (showLineNumbers) {
        const lineNumber = (startLine + index).toString().padStart(3, ' ');
        result += `${lineNumber}: ${line}\n`;
      } else {
        result += `${line}\n`;
      }
    });

    if (lines.length > maxLines) {
      result += `... (${lines.length - maxLines} more lines)\n`;
    }

    if (language) {
      result += '```';
    }

    return result;
  }

  /**
   * Create a text summary with key information
   */
  createSummary(
    text: string, 
    maxLength: number = 200, 
    options: {
      extractKeywords?: boolean;
      preserveStructure?: boolean;
    } = {}
  ): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Extract first paragraph or sentence
    const paragraphs = text.split('\n\n');
    const firstParagraph = paragraphs[0];
    if (firstParagraph.length <= maxLength && paragraphs.length > 1) {
      return firstParagraph;
    }

    // Extract first sentence
    const sentences = firstParagraph.split(/[.!?]+/);
    const firstSentence = sentences[0];
    if (firstSentence.length <= maxLength) {
      return firstSentence.trim() + '.';
    }

    // Fallback to truncation
    return new TextTruncator().truncate(text, maxLength);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Wrap a line to specified width
   */
  private wrapLine(line: string, width: number): string[] {
    if (line.length <= width) {
      return [line];
    }

    const words = line.split(' ');
    const wrappedLines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          wrappedLines.push(currentLine);
        }
        
        // Handle very long words
        if (word.length > width) {
          const chunks = this.chunkString(word, width);
          wrappedLines.push(...chunks.slice(0, -1));
          currentLine = chunks[chunks.length - 1];
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }

    return wrappedLines;
  }

  /**
   * Split string into chunks of specified size
   */
  private chunkString(str: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += chunkSize) {
      chunks.push(str.substring(i, i + chunkSize));
    }
    return chunks;
  }
}

// ============================================================================
// Path and Identifier Utilities
// ============================================================================

/**
 * Utilities for processing paths and identifiers
 */
export class PathUtils {
  /**
   * Sanitize filename by removing invalid characters
   */
  static sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars with underscore
      .replace(/\s+/g, '_')          // Replace spaces with underscore
      .replace(/_{2,}/g, '_')        // Collapse multiple underscores
      .replace(/^_+|_+$/g, '')       // Remove leading/trailing underscores
      .substring(0, 255);            // Limit length
  }

  /**
   * Generate safe identifier from text
   */
  static toIdentifier(text: string): string {
    let result = text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')    // Replace non-alphanumeric with underscore
      .replace(/_{2,}/g, '_')        // Collapse multiple underscores
      .replace(/^_+|_+$/g, '');      // Remove leading/trailing underscores
    
    // Prefix with underscore if starts with number
    if (/^[0-9]/.test(result)) {
      result = '_' + result;
    }
    
    return result;
  }

  /**
   * Generate slug from text (URL-friendly)
   */
  static toSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')      // Remove special characters
      .replace(/[\s_-]+/g, '-')      // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
  }

  /**
   * Extract relative path from absolute path
   */
  static makeRelative(absolutePath: string, basePath: string = process.cwd()): string {
    if (absolutePath.startsWith(basePath)) {
      return absolutePath.substring(basePath.length + 1);
    }
    return absolutePath;
  }
}

// ============================================================================
// Global Instances
// ============================================================================

/**
 * Global text truncator instance
 */
export const textTruncator = new TextTruncator();

/**
 * Global text formatter instance
 */
export const textFormatter = new TextFormatter();

/**
 * Configure global string processing utilities
 */
export function configureStringUtils(config: Partial<StringProcessingConfig>): void {
  (textTruncator as any).config = { ...DEFAULT_STRING_CONFIG, ...config };
  (textFormatter as any).config = { ...DEFAULT_STRING_CONFIG, ...config };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Truncate text using global truncator
 */
export function truncateText(
  text: string, 
  maxLength?: number, 
  options?: {
    suffix?: string;
    preserveWords?: boolean;
    strategy?: 'end' | 'middle' | 'start';
  }
): string {
  return textTruncator.truncate(text, maxLength, options);
}

/**
 * Format text for console using global formatter
 */
export function formatForConsole(
  text: string, 
  options?: {
    indent?: number;
    prefix?: string;
    width?: number;
    wrapLines?: boolean;
  }
): string {
  return textFormatter.formatForConsole(text, options);
}

/**
 * Normalize whitespace using global formatter
 */
export function normalizeWhitespace(text: string): string {
  return textFormatter.normalizeWhitespace(text);
}

/**
 * Escape HTML using global formatter
 */
export function escapeHtml(text: string): string {
  return textFormatter.escapeHtml(text);
}

/**
 * Escape regex using global formatter
 */
export function escapeRegex(text: string): string {
  return textFormatter.escapeRegex(text);
}

/**
 * Escape shell command using global formatter
 */
export function escapeShell(text: string): string {
  return textFormatter.escapeShell(text);
}

/**
 * Create text summary using global formatter
 */
export function createSummary(
  text: string, 
  maxLength?: number, 
  options?: {
    extractKeywords?: boolean;
    preserveStructure?: boolean;
  }
): string {
  return textFormatter.createSummary(text, maxLength, options);
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return PathUtils.sanitizeFilename(filename);
}

/**
 * Convert text to identifier
 */
export function toIdentifier(text: string): string {
  return PathUtils.toIdentifier(text);
}

/**
 * Convert text to slug
 */
export function toSlug(text: string): string {
  return PathUtils.toSlug(text);
}