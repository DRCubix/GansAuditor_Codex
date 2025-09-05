/**
 * Comprehensive tests for GansAuditor_Codex error types and utilities
 * 
 * Tests all error classes, classification, and recovery mechanisms
 * for the GansAuditor_Codex system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
  type ErrorCategory,
  type ErrorSeverity,
  type RecoveryStrategy,
  type StructuredErrorResponse,
} from '../error-types.js';

describe('GansAuditor_Codex Error Types', () => {
  describe('Base GanAuditorError', () => {
    it('should create error with all properties', () => {
      const error = new GanAuditorError(
        'Test error message',
        'config',
        'high',
        true,
        'retry',
        ['Suggestion 1', 'Suggestion 2'],
        { key: 'value' },
        'test-component'
      );

      expect(error.message).toBe('Test error message');
      expect(error.category).toBe('config');
      expect(error.severity).toBe('high');
      expect(error.recoverable).toBe(true);
      expect(error.recovery_strategy).toBe('retry');
      expect(error.suggestions).toEqual(['Suggestion 1', 'Suggestion 2']);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.component).toBe('test-component');
      expect(error.timestamp).toBeTypeOf('number');
      expect(error.name).toBe('GanAuditorError');
    });

    it('should create error with default values', () => {
      const error = new GanAuditorError('Simple error', 'filesystem');

      expect(error.severity).toBe('medium');
      expect(error.recoverable).toBe(true);
      expect(error.recovery_strategy).toBe('retry');
      expect(error.suggestions).toEqual([]);
      expect(error.context).toEqual({});
      expect(error.component).toBe('unknown');
    });

    it('should convert to structured response', () => {
      const error = new GanAuditorError(
        'Test error',
        'config',
        'high',
        true,
        'fallback',
        ['Fix the config'],
        { field: 'threshold' },
        'config-parser'
      );

      const response = error.toStructuredResponse({ fallback: 'data' });

      expect(response).toEqual({
        error: 'Test error',
        status: 'failed',
        details: {
          category: 'config',
          severity: 'high',
          recoverable: true,
          recovery_strategy: 'fallback',
          suggestions: ['Fix the config'],
          context: { field: 'threshold' },
          timestamp: error.timestamp,
          component: 'config-parser',
        },
        fallback_data: { fallback: 'data' },
      });
    });

    it('should maintain proper stack trace', () => {
      const error = new GanAuditorError('Stack test', 'filesystem');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('GanAuditorError');
    });
  });

  describe('Configuration Errors', () => {
    describe('ConfigurationError', () => {
      it('should create with default suggestions', () => {
        const error = new ConfigurationError('Config parse failed');

        expect(error.category).toBe('config');
        expect(error.severity).toBe('medium');
        expect(error.recovery_strategy).toBe('fallback');
        expect(error.suggestions).toContain('Check the gan-config block syntax for valid JSON');
      });

      it('should create with custom suggestions', () => {
        const customSuggestions = ['Custom suggestion 1', 'Custom suggestion 2'];
        const error = new ConfigurationError('Custom error', customSuggestions);

        expect(error.suggestions).toEqual(customSuggestions);
      });
    });

    describe('InvalidConfigValueError', () => {
      it('should create with field and value information', () => {
        const error = new InvalidConfigValueError('threshold', 150, '0-100');

        expect(error.message).toContain('threshold');
        expect(error.message).toContain('150');
        expect(error.context.field).toBe('threshold');
        expect(error.context.value).toBe(150);
        expect(error.context.validRange).toBe('0-100');
        expect(error.suggestions).toContain("Fix the 'threshold' configuration value");
      });

      it('should create without valid range', () => {
        const error = new InvalidConfigValueError('scope', 'invalid');

        expect(error.context.validRange).toBeUndefined();
        expect(error.suggestions).toContain('Check documentation for valid values');
      });
    });

    describe('MissingConfigError', () => {
      it('should create with field information', () => {
        const error = new MissingConfigError('paths', 'paths');

        expect(error.message).toContain('paths');
        expect(error.context.field).toBe('paths');
        expect(error.context.scope).toBe('paths');
        expect(error.suggestions).toContain("Provide the required 'paths' configuration");
      });

      it('should create without scope', () => {
        const error = new MissingConfigError('required_field');

        expect(error.context.scope).toBeUndefined();
        expect(error.suggestions).toContain('This field is mandatory');
      });
    });
  });

  describe('Codex Errors', () => {
    describe('CodexError', () => {
      it('should create with default values', () => {
        const error = new CodexError('Codex failed');

        expect(error.category).toBe('codex');
        expect(error.severity).toBe('high');
        expect(error.recovery_strategy).toBe('fallback');
        expect(error.suggestions).toContain('Ensure Codex CLI is installed and available in PATH');
      });

      it('should create with custom parameters', () => {
        const error = new CodexError(
          'Custom codex error',
          'medium',
          'retry',
          ['Custom suggestion'],
          { custom: 'context' },
          'custom-component'
        );

        expect(error.severity).toBe('medium');
        expect(error.recovery_strategy).toBe('retry');
        expect(error.suggestions).toEqual(['Custom suggestion']);
        expect(error.context).toEqual({ custom: 'context' });
        expect(error.component).toBe('custom-component');
      });
    });

    describe('CodexNotAvailableError', () => {
      it('should create with default executable', () => {
        const error = new CodexNotAvailableError();

        expect(error.message).toContain('codex');
        expect(error.context.executable).toBe('codex');
        expect(error.suggestions).toContain("Install Codex CLI and ensure 'codex' is in your PATH");
      });

      it('should create with custom executable', () => {
        const error = new CodexNotAvailableError('custom-codex');

        expect(error.message).toContain('custom-codex');
        expect(error.context.executable).toBe('custom-codex');
        expect(error.suggestions).toContain("Install Codex CLI and ensure 'custom-codex' is in your PATH");
      });
    });

    describe('CodexTimeoutError', () => {
      it('should create with timeout information', () => {
        const error = new CodexTimeoutError(30000, 'audit command');

        expect(error.message).toContain('30000ms');
        expect(error.context.timeout).toBe(30000);
        expect(error.context.command).toBe('audit command');
        expect(error.suggestions).toContain('Increase the timeout configuration for Codex CLI');
      });

      it('should create without command', () => {
        const error = new CodexTimeoutError(15000);

        expect(error.context.command).toBeUndefined();
      });
    });

    describe('CodexResponseError', () => {
      it('should create with raw response', () => {
        const rawResponse = '{"invalid": json}';
        const error = new CodexResponseError('Parse failed', rawResponse);

        expect(error.message).toContain('Parse failed');
        expect(error.context.rawResponse).toBe(rawResponse.substring(0, 500));
        expect(error.suggestions).toContain('Check Codex CLI output format and version compatibility');
      });

      it('should create without raw response', () => {
        const error = new CodexResponseError('Parse failed');

        expect(error.context.rawResponse).toBeUndefined();
      });

      it('should truncate very long raw responses', () => {
        const longResponse = 'x'.repeat(1000);
        const error = new CodexResponseError('Parse failed', longResponse);

        expect(error.context.rawResponse).toHaveLength(500);
      });
    });
  });

  describe('File System Errors', () => {
    describe('FileSystemError', () => {
      it('should create with default values', () => {
        const error = new FileSystemError('File operation failed');

        expect(error.category).toBe('filesystem');
        expect(error.severity).toBe('medium');
        expect(error.recovery_strategy).toBe('skip');
        expect(error.suggestions).toContain('Check file and directory permissions');
      });
    });

    describe('FileNotFoundError', () => {
      it('should create with path information', () => {
        const path = '/path/to/missing/file.txt';
        const error = new FileNotFoundError(path);

        expect(error.message).toContain(path);
        expect(error.context.path).toBe(path);
        expect(error.severity).toBe('low');
        expect(error.recovery_strategy).toBe('skip');
        expect(error.suggestions).toContain('Verify the file path is correct');
      });
    });

    describe('FileAccessError', () => {
      it('should create with path and operation information', () => {
        const path = '/protected/file.txt';
        const operation = 'read';
        const error = new FileAccessError(path, operation);

        expect(error.message).toContain(path);
        expect(error.message).toContain(operation);
        expect(error.context.path).toBe(path);
        expect(error.context.operation).toBe(operation);
        expect(error.suggestions).toContain('Check file and directory permissions');
      });
    });

    describe('DirectoryCreationError', () => {
      it('should create with path and reason', () => {
        const path = '/readonly/newdir';
        const reason = 'Permission denied';
        const error = new DirectoryCreationError(path, reason);

        expect(error.message).toContain(path);
        expect(error.message).toContain(reason);
        expect(error.context.path).toBe(path);
        expect(error.context.reason).toBe(reason);
        expect(error.recovery_strategy).toBe('retry');
      });

      it('should create without reason', () => {
        const path = '/readonly/newdir';
        const error = new DirectoryCreationError(path);

        expect(error.context.reason).toBeUndefined();
      });
    });
  });

  describe('Session Errors', () => {
    describe('SessionError', () => {
      it('should create with default values', () => {
        const error = new SessionError('Session operation failed');

        expect(error.category).toBe('session');
        expect(error.severity).toBe('medium');
        expect(error.recovery_strategy).toBe('fallback');
        expect(error.suggestions).toContain('Check session state directory permissions');
      });
    });

    describe('SessionNotFoundError', () => {
      it('should create with session ID', () => {
        const sessionId = 'session-123';
        const error = new SessionNotFoundError(sessionId);

        expect(error.message).toContain(sessionId);
        expect(error.context.sessionId).toBe(sessionId);
        expect(error.severity).toBe('low');
        expect(error.recovery_strategy).toBe('fallback');
        expect(error.suggestions).toContain('A new session will be created automatically');
      });
    });

    describe('SessionCorruptionError', () => {
      it('should create with session ID and reason', () => {
        const sessionId = 'session-456';
        const reason = 'Invalid JSON structure';
        const error = new SessionCorruptionError(sessionId, reason);

        expect(error.message).toContain(sessionId);
        expect(error.message).toContain(reason);
        expect(error.context.sessionId).toBe(sessionId);
        expect(error.context.reason).toBe(reason);
        expect(error.suggestions).toContain('The system will attempt to recover the session');
      });

      it('should create without reason', () => {
        const sessionId = 'session-456';
        const error = new SessionCorruptionError(sessionId);

        expect(error.context.reason).toBeUndefined();
      });
    });

    describe('SessionPersistenceError', () => {
      it('should create with session ID, operation, and reason', () => {
        const sessionId = 'session-789';
        const operation = 'save';
        const reason = 'Disk full';
        const error = new SessionPersistenceError(sessionId, operation, reason);

        expect(error.message).toContain(sessionId);
        expect(error.message).toContain(operation);
        expect(error.message).toContain(reason);
        expect(error.context.sessionId).toBe(sessionId);
        expect(error.context.operation).toBe(operation);
        expect(error.context.reason).toBe(reason);
        expect(error.recovery_strategy).toBe('retry');
      });

      it('should create without reason', () => {
        const sessionId = 'session-789';
        const operation = 'load';
        const error = new SessionPersistenceError(sessionId, operation);

        expect(error.context.reason).toBeUndefined();
      });
    });
  });

  describe('Error Classifier', () => {
    it('should classify GanAuditorError instances unchanged', () => {
      const originalError = new ConfigurationError('Original error');
      const classified = ErrorClassifier.classify(originalError);

      expect(classified).toBe(originalError);
    });

    it('should classify config-related errors', () => {
      const errors = [
        new Error('Invalid configuration value'),
        new Error('JSON parse error in config'),
        new Error('Missing required field'),
        new Error('Validation failed'),
      ];

      errors.forEach(error => {
        const classified = ErrorClassifier.classify(error);
        expect(classified.category).toBe('config');
      });
    });

    it('should classify codex-related errors', () => {
      const errors = [
        new Error('codex command not found'),
        new Error('spawn ENOENT'),
        new Error('Command execution timeout'),
        new Error('Codex CLI failed'),
      ];

      errors.forEach(error => {
        const classified = ErrorClassifier.classify(error);
        expect(classified.category).toBe('codex');
      });
    });

    it('should classify filesystem-related errors', () => {
      const errors = [
        new Error('ENOENT: file not found'),
        new Error('EACCES: permission denied'),
        new Error('EPERM: operation not permitted'),
        new Error('Directory creation failed'),
      ];

      errors.forEach(error => {
        const classified = ErrorClassifier.classify(error);
        expect(classified.category).toBe('filesystem');
      });
    });

    it('should classify session-related errors', () => {
      const errors = [
        new Error('Session state corrupted'),
        new Error('Session persistence failed'),
        new Error('Invalid session data'),
      ];

      errors.forEach(error => {
        const classified = ErrorClassifier.classify(error);
        expect(classified.category).toBe('session');
      });
    });

    it('should handle non-Error objects', () => {
      const stringError = 'Simple string error';
      const nullError = null;
      const undefinedError = undefined;
      const numberError = 42;

      [stringError, nullError, undefinedError, numberError].forEach(error => {
        const classified = ErrorClassifier.classify(error);
        expect(classified).toBeInstanceOf(GanAuditorError);
        expect(classified.category).toBe('filesystem'); // Default category
      });
    });

    it('should preserve stack traces when available', () => {
      const originalError = new Error('Original error with stack');
      const classified = ErrorClassifier.classify(originalError);

      expect(classified.context.stack).toBeDefined();
      expect(classified.context.originalError).toBe('Original error with stack');
    });
  });

  describe('Error Recovery', () => {
    it('should determine recoverability correctly', () => {
      const recoverableError = new ConfigurationError('Recoverable error');
      const nonRecoverableError = new GanAuditorError(
        'Non-recoverable error',
        'codex',
        'critical',
        false,
        'abort'
      );

      expect(ErrorRecovery.isRecoverable(recoverableError)).toBe(true);
      expect(ErrorRecovery.isRecoverable(nonRecoverableError)).toBe(false);
    });

    it('should provide category-specific recovery suggestions', () => {
      const configError = new ConfigurationError('Config error');
      const codexError = new CodexError('Codex error');
      const fsError = new FileSystemError('FS error');
      const sessionError = new SessionError('Session error');

      const configSuggestions = ErrorRecovery.getRecoverySuggestions(configError);
      const codexSuggestions = ErrorRecovery.getRecoverySuggestions(codexError);
      const fsSuggestions = ErrorRecovery.getRecoverySuggestions(fsError);
      const sessionSuggestions = ErrorRecovery.getRecoverySuggestions(sessionError);

      expect(configSuggestions).toContain('The system will use default configuration values');
      expect(codexSuggestions).toContain('The system will provide fallback audit results');
      expect(fsSuggestions).toContain('The system will skip inaccessible files');
      expect(sessionSuggestions).toContain('The system will create a new session if needed');
    });

    it('should create appropriate fallback data', () => {
      const configError = new ConfigurationError('Config error');
      const codexError = new CodexError('Codex error');
      const fsError = new FileSystemError('FS error');
      const sessionError = new SessionError('Session error');
      const unknownError = new GanAuditorError('Unknown error', 'unknown' as any);

      expect(ErrorRecovery.createFallbackData(configError)).toEqual({
        useDefaults: true,
        message: 'Using default configuration'
      });

      expect(ErrorRecovery.createFallbackData(codexError)).toEqual({
        fallbackAudit: true,
        message: 'Audit completed with limited functionality'
      });

      expect(ErrorRecovery.createFallbackData(fsError)).toEqual({
        partialData: true,
        message: 'Some files were skipped due to access issues'
      });

      expect(ErrorRecovery.createFallbackData(sessionError)).toEqual({
        newSession: true,
        message: 'Created new session due to persistence issues'
      });

      expect(ErrorRecovery.createFallbackData(unknownError)).toEqual({
        message: 'Operation completed with limitations'
      });
    });
  });

  describe('Error Aggregator', () => {
    let aggregator: ErrorAggregator;

    beforeEach(() => {
      aggregator = new ErrorAggregator();
    });

    it('should start empty', () => {
      expect(aggregator.hasErrors()).toBe(false);
      expect(aggregator.hasCriticalErrors()).toBe(false);
      expect(aggregator.getErrors()).toHaveLength(0);
      expect(aggregator.getWarnings()).toHaveLength(0);
    });

    it('should add and track errors', () => {
      const error1 = new ConfigurationError('Config error');
      const error2 = new CodexError('Codex error', 'critical');

      aggregator.addError(error1);
      aggregator.addError(error2);

      expect(aggregator.hasErrors()).toBe(true);
      expect(aggregator.hasCriticalErrors()).toBe(true);
      expect(aggregator.getErrors()).toHaveLength(2);
    });

    it('should add and track warnings', () => {
      aggregator.addWarning('Warning 1');
      aggregator.addWarning('Warning 2');

      expect(aggregator.getWarnings()).toEqual(['Warning 1', 'Warning 2']);
    });

    it('should classify unknown errors when adding', () => {
      aggregator.addError('String error');
      aggregator.addError(new Error('Standard error'));

      const errors = aggregator.getErrors();
      expect(errors).toHaveLength(2);
      expect(errors[0]).toBeInstanceOf(GanAuditorError);
      expect(errors[1]).toBeInstanceOf(GanAuditorError);
    });

    it('should provide accurate summary statistics', () => {
      aggregator.addError(new ConfigurationError('Config error'));
      aggregator.addError(new CodexError('Codex error', 'critical'));
      aggregator.addError(new FileSystemError('FS error'));
      aggregator.addWarning('Warning 1');
      aggregator.addWarning('Warning 2');

      const summary = aggregator.getSummary();

      expect(summary.errorCount).toBe(3);
      expect(summary.warningCount).toBe(2);
      expect(summary.criticalCount).toBe(1);
      expect(summary.recoverableCount).toBe(3); // All are recoverable by default
    });

    it('should clear all errors and warnings', () => {
      aggregator.addError(new ConfigurationError('Error'));
      aggregator.addWarning('Warning');

      expect(aggregator.hasErrors()).toBe(true);

      aggregator.clear();

      expect(aggregator.hasErrors()).toBe(false);
      expect(aggregator.getErrors()).toHaveLength(0);
      expect(aggregator.getWarnings()).toHaveLength(0);
      expect(aggregator.getSummary().errorCount).toBe(0);
    });

    it('should handle large numbers of errors efficiently', () => {
      const start = Date.now();

      // Add many errors
      for (let i = 0; i < 1000; i++) {
        aggregator.addError(new ConfigurationError(`Error ${i}`));
      }

      const addDuration = Date.now() - start;
      expect(addDuration).toBeLessThan(1000); // Should be fast

      expect(aggregator.getSummary().errorCount).toBe(1000);

      const clearStart = Date.now();
      aggregator.clear();
      const clearDuration = Date.now() - clearStart;

      expect(clearDuration).toBeLessThan(100); // Clear should be very fast
      expect(aggregator.getSummary().errorCount).toBe(0);
    });
  });

  describe('Error Type Guards and Validation', () => {
    it('should validate error categories', () => {
      const validCategories: ErrorCategory[] = ['config', 'codex', 'filesystem', 'session'];
      
      validCategories.forEach(category => {
        const error = new GanAuditorError('Test', category);
        expect(error.category).toBe(category);
      });
    });

    it('should validate error severities', () => {
      const validSeverities: ErrorSeverity[] = ['low', 'medium', 'high', 'critical'];
      
      validSeverities.forEach(severity => {
        const error = new GanAuditorError('Test', 'config', severity);
        expect(error.severity).toBe(severity);
      });
    });

    it('should validate recovery strategies', () => {
      const validStrategies: RecoveryStrategy[] = ['retry', 'fallback', 'skip', 'abort', 'user_intervention'];
      
      validStrategies.forEach(strategy => {
        const error = new GanAuditorError('Test', 'config', 'medium', true, strategy);
        expect(error.recovery_strategy).toBe(strategy);
      });
    });
  });

  describe('Structured Error Response Format', () => {
    it('should create valid structured response', () => {
      const error = new ConfigurationError('Test error', ['Fix it'], { field: 'test' });
      const response = error.toStructuredResponse({ fallback: true });

      // Validate response structure
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('details');
      expect(response).toHaveProperty('fallback_data');

      expect(response.status).toBe('failed');
      expect(response.details).toHaveProperty('category');
      expect(response.details).toHaveProperty('severity');
      expect(response.details).toHaveProperty('recoverable');
      expect(response.details).toHaveProperty('recovery_strategy');
      expect(response.details).toHaveProperty('suggestions');
      expect(response.details).toHaveProperty('context');
      expect(response.details).toHaveProperty('timestamp');
      expect(response.details).toHaveProperty('component');
    });

    it('should handle response without fallback data', () => {
      const error = new ConfigurationError('Test error');
      const response = error.toStructuredResponse();

      expect(response.fallback_data).toBeUndefined();
    });
  });
});