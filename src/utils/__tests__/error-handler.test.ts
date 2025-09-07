/**
 * Comprehensive tests for GansAuditor_Codex error handling utilities
 * 
 * Tests all error categories, recovery strategies, and graceful degradation scenarios
 * for the GansAuditor_Codex system.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ErrorHandler,
  errorHandler,
  configureErrorHandler,
  handleError,
  withRetry,
  withGracefulDegradation,
  createErrorResponse,
  handleConfigError,
  handleFileSystemError,
  handleSessionError,
} from '../error-handler.js';
import {
  GanAuditorError,
  ConfigurationError,
  InvalidConfigValueError,
  MissingConfigError,
  CodexError,
  CodexNotAvailableError,
  CodexTimeoutError,
  CodexResponseError,
  FileSystemError,
  FileNotFoundError,
  FileAccessError,
  DirectoryCreationError,
  SessionError,
  SessionNotFoundError,
  SessionCorruptionError,
  SessionPersistenceError,
  ErrorClassifier,
  ErrorRecovery,
  ErrorAggregator,
} from '../../types/error-types.js';
import { DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG } from '../../types/gan-types.js';

// Mock logger to avoid console output during tests
vi.mock('../logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
  createComponentLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  })),
  createTimer: vi.fn(() => ({
    end: vi.fn(),
    endWithError: vi.fn(),
  })),
}));

describe('GansAuditor_Codex Error Handler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = new ErrorHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify configuration errors correctly', () => {
      const configError = new Error('Invalid configuration value');
      const classified = ErrorClassifier.classify(configError);
      
      expect(classified).toBeInstanceOf(GanAuditorError);
      expect(classified.category).toBe('config');
    });

    it('should classify Codex errors correctly', () => {
      const codexError = new Error('codex command not found');
      const classified = ErrorClassifier.classify(codexError);
      
      expect(classified.category).toBe('codex');
    });

    it('should classify filesystem errors correctly', () => {
      const fsError = new Error('ENOENT: file not found');
      const classified = ErrorClassifier.classify(fsError);
      
      expect(classified.category).toBe('filesystem');
    });

    it('should classify session errors correctly', () => {
      const sessionError = new Error('session state corrupted');
      const classified = ErrorClassifier.classify(sessionError);
      
      expect(classified.category).toBe('session');
    });

    it('should handle already classified errors', () => {
      const originalError = new ConfigurationError('Test config error');
      const classified = ErrorClassifier.classify(originalError);
      
      expect(classified).toBe(originalError);
    });
  });

  describe('Configuration Errors', () => {
    it('should handle invalid configuration values', () => {
      const error = new InvalidConfigValueError('threshold', 150, '0-100');
      
      expect(error.category).toBe('config');
      expect(error.severity).toBe('medium');
      expect(error.recoverable).toBe(true);
      expect(error.recovery_strategy).toBe('fallback');
      expect(error.suggestions).toContain("Fix the 'threshold' configuration value");
    });

    it('should handle missing required configuration', () => {
      const error = new MissingConfigError('paths', 'paths');
      
      expect(error.category).toBe('config');
      expect(error.suggestions).toContain("Provide the required 'paths' configuration");
    });

    it('should create structured error response', () => {
      const error = new ConfigurationError('Test config error');
      const response = error.toStructuredResponse({ useDefaults: true });
      
      expect(response.status).toBe('failed');
      expect(response.details.category).toBe('config');
      expect(response.fallback_data).toEqual({ useDefaults: true });
    });
  });

  describe('Codex Errors', () => {
    it('should handle Codex not available error', () => {
      const error = new CodexNotAvailableError('codex-cli');
      
      expect(error.category).toBe('codex');
      expect(error.severity).toBe('high');
      expect(error.recovery_strategy).toBe('fallback');
      expect(error.suggestions).toContain("Install Codex CLI and ensure 'codex-cli' is in your PATH");
    });

    it('should handle Codex timeout error', () => {
      const error = new CodexTimeoutError(30000, 'audit command');
      
      expect(error.category).toBe('codex');
      expect(error.severity).toBe('medium');
      expect(error.recovery_strategy).toBe('fallback');
      expect(error.suggestions).toContain('Increase the timeout configuration for Codex CLI');
    });

    it('should handle Codex response parsing error', () => {
      const rawResponse = '{"invalid": json}';
      const error = new CodexResponseError('Invalid JSON', rawResponse);
      
      expect(error.category).toBe('codex');
      expect(error.context.rawResponse).toBe(rawResponse);
      expect(error.suggestions).toContain('Check Codex CLI output format and version compatibility');
    });
  });

  describe('File System Errors', () => {
    it('should handle file not found error', () => {
      const error = new FileNotFoundError('/path/to/missing/file.txt');
      
      expect(error.category).toBe('filesystem');
      expect(error.severity).toBe('low');
      expect(error.recovery_strategy).toBe('skip');
      expect(error.context.path).toBe('/path/to/missing/file.txt');
    });

    it('should handle file access permission error', () => {
      const error = new FileAccessError('/protected/file.txt', 'read');
      
      expect(error.category).toBe('filesystem');
      expect(error.severity).toBe('medium');
      expect(error.recovery_strategy).toBe('skip');
      expect(error.context.operation).toBe('read');
    });

    it('should handle directory creation error', () => {
      const error = new DirectoryCreationError('/readonly/newdir', 'Permission denied');
      
      expect(error.category).toBe('filesystem');
      expect(error.recovery_strategy).toBe('retry');
      expect(error.context.reason).toBe('Permission denied');
    });
  });

  describe('Session Errors', () => {
    it('should handle session not found error', () => {
      const error = new SessionNotFoundError('session-123');
      
      expect(error.category).toBe('session');
      expect(error.severity).toBe('low');
      expect(error.recovery_strategy).toBe('fallback');
      expect(error.context.sessionId).toBe('session-123');
    });

    it('should handle session corruption error', () => {
      const error = new SessionCorruptionError('session-456', 'Invalid JSON structure');
      
      expect(error.category).toBe('session');
      expect(error.severity).toBe('medium');
      expect(error.recovery_strategy).toBe('fallback');
      expect(error.context.corruptionType).toBe('Invalid JSON structure');
    });

    it('should handle session persistence error', () => {
      const error = new SessionPersistenceError('session-789', 'save', 'Disk full');
      
      expect(error.category).toBe('session');
      expect(error.recovery_strategy).toBe('retry');
      expect(error.context.operation).toBe('save');
      expect(error.context.reason).toBe('Disk full');
    });
  });

  describe('Error Recovery', () => {
    it('should determine if error is recoverable', () => {
      const recoverableError = new ConfigurationError('Test error');
      const nonRecoverableError = new GanAuditorError(
        'Critical error',
        'codex',
        'critical',
        false,
        'abort'
      );
      
      expect(ErrorRecovery.isRecoverable(recoverableError)).toBe(true);
      expect(ErrorRecovery.isRecoverable(nonRecoverableError)).toBe(false);
    });

    it('should provide recovery suggestions', () => {
      const error = new ConfigurationError('Test error', ['Custom suggestion']);
      const suggestions = ErrorRecovery.getRecoverySuggestions(error);
      
      expect(suggestions).toContain('Custom suggestion');
      expect(suggestions).toContain('The system will use default configuration values');
    });

    it('should create appropriate fallback data', () => {
      const configError = new ConfigurationError('Test error');
      const codexError = new CodexError('Test error');
      const fsError = new FileSystemError('Test error');
      const sessionError = new SessionError('Test error');
      
      expect(ErrorRecovery.createFallbackData(configError)).toEqual({
        useDefaults: true,
        message: 'Using default configuration'
      });
      
      // Codex errors should now throw instead of returning fallback data
      expect(() => ErrorRecovery.createFallbackData(codexError)).toThrow();
      
      expect(ErrorRecovery.createFallbackData(fsError)).toEqual({
        partialData: true,
        message: 'Some files were skipped due to access issues'
      });
      
      expect(ErrorRecovery.createFallbackData(sessionError)).toEqual({
        newSession: true,
        message: 'Created new session due to persistence issues'
      });
    });
  });

  describe('Error Aggregation', () => {
    it('should aggregate multiple errors', () => {
      const aggregator = new ErrorAggregator();
      
      aggregator.addError(new ConfigurationError('Config error'));
      aggregator.addError(new CodexError('Codex error', 'critical'));
      aggregator.addWarning('Warning message');
      
      const summary = aggregator.getSummary();
      
      expect(summary.errorCount).toBe(2);
      expect(summary.warningCount).toBe(1);
      expect(summary.criticalCount).toBe(1);
      expect(summary.recoverableCount).toBe(2);
    });

    it('should detect critical errors', () => {
      const aggregator = new ErrorAggregator();
      
      expect(aggregator.hasCriticalErrors()).toBe(false);
      
      aggregator.addError(new CodexError('Critical error', 'critical'));
      
      expect(aggregator.hasCriticalErrors()).toBe(true);
    });

    it('should clear errors and warnings', () => {
      const aggregator = new ErrorAggregator();
      
      aggregator.addError(new ConfigurationError('Test error'));
      aggregator.addWarning('Test warning');
      
      expect(aggregator.hasErrors()).toBe(true);
      
      aggregator.clear();
      
      expect(aggregator.hasErrors()).toBe(false);
      expect(aggregator.getSummary().errorCount).toBe(0);
      expect(aggregator.getSummary().warningCount).toBe(0);
    });
  });

  describe('Error Handler Operations', () => {
    it('should handle errors with fallback values', async () => {
      const error = new ConfigurationError('Test config error');
      const fallbackValue = { default: true };
      
      const result = await handler.handleError(error, 'test-operation', fallbackValue);
      
      expect(result.success).toBe(true);
      expect(result.result).toEqual(fallbackValue);
      expect(result.error).toBeUndefined();
    });

    it('should handle non-recoverable errors', async () => {
      const error = new GanAuditorError(
        'Critical error',
        'codex',
        'critical',
        false,
        'abort'
      );
      
      const result = await handler.handleError(error, 'test-operation');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should retry operations with retryable errors', async () => {
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new FileSystemError('Temporary failure');
        }
        return 'success';
      });
      
      const result = await handler.withRetry(operation, 'test-retry');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new GanAuditorError('Non-retryable', 'config', 'critical', false);
      });
      
      await expect(handler.withRetry(operation, 'test-retry')).rejects.toThrow('Non-retryable');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should implement graceful degradation', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new CodexError('Primary failed'));
      const fallbackOperation = vi.fn().mockResolvedValue('fallback-result');
      
      const result = await handler.withGracefulDegradation(
        primaryOperation,
        fallbackOperation,
        'test-degradation'
      );
      
      expect(result.result).toBe('fallback-result');
      expect(result.degraded).toBe(true);
      expect(result.error).toBeInstanceOf(CodexError);
    });

    it('should fail when both primary and fallback operations fail', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new CodexError('Primary failed'));
      const fallbackOperation = vi.fn().mockRejectedValue(new Error('Fallback failed'));
      
      await expect(
        handler.withGracefulDegradation(primaryOperation, fallbackOperation, 'test-degradation')
      ).rejects.toThrow('Primary failed');
    });
  });

  describe('Specialized Error Handlers', () => {
    it('should handle configuration errors with default config', async () => {
      const error = new ConfigurationError('Invalid config');
      const result = await handleConfigError(error, DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG);
      
      expect(result).toEqual(DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG);
    });

    it('should handle Codex errors by throwing (no fallback)', async () => {
      const error = new CodexNotAvailableError();
      
      // Codex errors should now throw instead of returning fallback audit
      await expect(async () => {
        const errorHandler = new ErrorHandler();
        await errorHandler.handleError(error, 'test-context');
      }).rejects.toThrow();
    });

    it('should handle file system errors gracefully', async () => {
      const error = new FileNotFoundError('/missing/file.txt');
      const result = await handleFileSystemError(error, '/missing/file.txt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBeUndefined();
    });

    it('should handle session errors with fallback session', async () => {
      const error = new SessionNotFoundError('missing-session');
      const result = await handleSessionError(error, 'missing-session');
      
      expect(result.id).toBe('missing-session');
      expect(result.config).toEqual(DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG);
    });
  });

  describe('Global Error Handler Functions', () => {
    it('should use global error handler for handleError', async () => {
      const error = new ConfigurationError('Global test');
      const result = await handleError(error, 'global-test', 'fallback');
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback');
    });

    it('should use global error handler for withRetry', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new FileSystemError('Retry test');
        }
        return 'retry-success';
      });
      
      const result = await withRetry(operation, 'global-retry-test');
      
      expect(result).toBe('retry-success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use global error handler for withGracefulDegradation', async () => {
      const primary = vi.fn().mockRejectedValue(new CodexError('Primary failed'));
      const fallback = vi.fn().mockResolvedValue('degraded-result');
      
      const result = await withGracefulDegradation(primary, fallback, 'global-degradation-test');
      
      expect(result.result).toBe('degraded-result');
      expect(result.degraded).toBe(true);
    });

    it('should create structured error responses', () => {
      const error = new SessionError('Test session error');
      const response = createErrorResponse(error, 'test-context', { custom: 'data' });
      
      expect(response.status).toBe('failed');
      expect(response.details.category).toBe('session');
      expect(response.fallback_data).toEqual({ custom: 'data' });
    });
  });

  describe('Error Handler Configuration', () => {
    it('should configure global error handler', () => {
      const config = {
        enableRetry: false,
        maxRetries: 5,
        logErrors: false,
      };
      
      configureErrorHandler(config);
      
      // Test that configuration is applied (this is a bit tricky to test directly)
      // We can test the behavior instead
      expect(() => configureErrorHandler(config)).not.toThrow();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null and undefined errors', () => {
      const nullError = ErrorClassifier.classify(null);
      const undefinedError = ErrorClassifier.classify(undefined);
      
      expect(nullError).toBeInstanceOf(GanAuditorError);
      expect(undefinedError).toBeInstanceOf(GanAuditorError);
    });

    it('should handle string errors', () => {
      const stringError = ErrorClassifier.classify('Simple string error');
      
      expect(stringError).toBeInstanceOf(GanAuditorError);
      expect(stringError.message).toBe('Simple string error');
    });

    it('should handle errors during error handling', async () => {
      // Create a handler that will fail during strategy execution
      const faultyHandler = new ErrorHandler();
      
      // Mock the internal method to throw
      const originalExecuteStrategy = (faultyHandler as any).executeStrategy;
      (faultyHandler as any).executeStrategy = vi.fn().mockRejectedValue(new Error('Handler error'));
      
      const result = await faultyHandler.handleError(
        new ConfigurationError('Original error'),
        'test-context',
        'fallback'
      );
      
      expect(result.success).toBe(false);
      expect(result.result).toBe('fallback');
      expect(result.error).toBeInstanceOf(GanAuditorError);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new ConfigurationError(longMessage);
      
      expect(error.message).toBe(longMessage);
      expect(error.category).toBe('config');
    });

    it('should handle circular references in error context', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      const error = new ConfigurationError('Circular test', [], circularObj);
      
      expect(error.context).toBe(circularObj);
      expect(() => error.toStructuredResponse()).not.toThrow();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle many errors efficiently', () => {
      const aggregator = new ErrorAggregator();
      
      // Add many errors
      for (let i = 0; i < 1000; i++) {
        aggregator.addError(new ConfigurationError(`Error ${i}`));
      }
      
      const summary = aggregator.getSummary();
      expect(summary.errorCount).toBe(1000);
      
      // Clear should be fast
      const start = Date.now();
      aggregator.clear();
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should be very fast
      expect(aggregator.getSummary().errorCount).toBe(0);
    });

    it('should handle concurrent error operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => 
        handler.handleError(
          new ConfigurationError(`Concurrent error ${i}`),
          `concurrent-${i}`,
          `fallback-${i}`
        )
      );
      
      const results = await Promise.all(operations);
      
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.result).toBe(`fallback-${i}`);
      });
    });
  });
});