/**
 * Comprehensive Error Handling Tests for Synchronous Audit Workflow
 * 
 * Tests for Requirements 7.1-7.4:
 * - 7.1: Graceful error handling for audit service failures
 * - 7.2: Timeout handling with partial results return
 * - 7.3: Session corruption detection and recovery
 * - 7.4: Clear error messages with actionable guidance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AuditServiceUnavailableError,
  InvalidCodeFormatError,
  SessionCorruptionError,
  AuditTimeoutError,
} from '../types/error-types.js';
import {
  handleAuditServiceUnavailable,
  handleInvalidCodeFormat,
  handleSessionCorruption,
  handleAuditTimeout,
} from '../utils/error-handler.js';
import { SynchronousAuditEngine } from '../auditor/synchronous-audit-engine.js';
import { SynchronousSessionManager } from '../session/synchronous-session-manager.js';
import type { GansAuditorCodexThoughtData } from '../types/gan-types.js';

describe('Synchronous Audit Workflow Error Handling', () => {
  let auditEngine: SynchronousAuditEngine;
  let sessionManager: SynchronousSessionManager;
  let mockGanAuditor: any;

  beforeEach(() => {
    // Mock GAN auditor
    mockGanAuditor = {
      auditThought: vi.fn(),
    };

    auditEngine = new SynchronousAuditEngine({
      auditTimeout: 5000,
      enabled: true,
    }, mockGanAuditor);

    sessionManager = new SynchronousSessionManager({
      stateDirectory: '.test-mcp-gan-state',
      stagnationThreshold: 0.95,
      stagnationStartLoop: 10,
    });
  });

  afterEach(() => {
    auditEngine.destroy();
    sessionManager.destroy();
    vi.clearAllMocks();
  });

  describe('Requirement 7.1: Audit Service Unavailable Error Handling', () => {
    it('should handle service unavailable error gracefully', async () => {
      const serviceError = new AuditServiceUnavailableError('GAN Auditor', 'Connection refused');
      
      const result = await handleAuditServiceUnavailable(serviceError, 'GAN Auditor');
      
      expect(result.success).toBe(true);
      expect(result.fallbackAudit).toBeDefined();
      expect(result.fallbackAudit.review.summary).toContain('unavailable');
      expect(result.fallbackAudit.judge_cards[0].model).toBe('fallback-service-unavailable');
    });

    it('should provide actionable suggestions for service unavailability', () => {
      const serviceError = new AuditServiceUnavailableError('GAN Auditor', 'Network timeout');
      
      expect(serviceError.suggestions).toContain('Check if the audit service is running and accessible');
      expect(serviceError.suggestions).toContain('Verify network connectivity to the audit service');
      expect(serviceError.suggestions).toContain('The system will provide a fallback audit result with limited functionality');
    });

    it('should detect service unavailable errors in audit engine', async () => {
      const thought: GansAuditorCodexThoughtData = {
        thoughtNumber: 1,
        thought: '```typescript\nfunction test() { return "hello"; }\n```',
        nextThoughtNeeded: false,
        totalThoughts: 1,
      };

      // Mock service unavailable error
      mockGanAuditor.auditThought.mockRejectedValue(new Error('Connection refused'));

      const result = await auditEngine.auditAndWait(thought, 'test-session');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
      expect(result.review.review.summary).toContain('unavailable');
    });
  });

  describe('Requirement 7.2: Invalid Code Format Error Handling', () => {
    it('should handle invalid code format with guidance', async () => {
      const formatError = new InvalidCodeFormatError(
        'malformed',
        ['typescript', 'javascript'],
        '```\nfunction test() {\n// missing closing brace'
      );

      const result = await handleInvalidCodeFormat(
        formatError,
        '```\nfunction test() {\n// missing closing brace',
        ['typescript', 'javascript']
      );

      expect(result.success).toBe(true);
      expect(result.formatGuidance).toBeDefined();
      expect(result.formatGuidance).toContain('Code format validation failed. Please check the following:');
      expect(result.formattedCode).toBeDefined();
    });

    it('should provide specific format guidance', () => {
      const formatError = new InvalidCodeFormatError(
        'invalid-syntax',
        ['typescript', 'javascript'],
        'malformed code'
      );

      expect(formatError.suggestions).toContain('Expected formats: typescript, javascript');
      expect(formatError.suggestions).toContain('Ensure code blocks are properly delimited with triple backticks (```)');
      expect(formatError.suggestions).toContain('Check that language identifiers are correct (e.g., ```typescript, ```javascript)');
    });

    it('should validate code format in audit engine', async () => {
      const thought: GansAuditorCodexThoughtData = {
        thoughtNumber: 1,
        thought: '```invalid-lang\nfunction test() { return "hello"; }\n```',
        nextThoughtNeeded: false,
        totalThoughts: 1,
      };

      // Mock successful audit after format validation
      mockGanAuditor.auditThought.mockResolvedValue({
        overall: 85,
        dimensions: [{ name: 'accuracy', score: 85 }],
        verdict: 'pass',
        review: { summary: 'Good code', inline: [], citations: [] },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [{ model: 'test', score: 85, notes: 'Good' }],
      });

      const result = await auditEngine.auditAndWait(thought, 'test-session');

      // Should succeed despite format issues (with cleanup)
      expect(result.success).toBe(true);
    });
  });

  describe('Requirement 7.3: Session Corruption Detection and Recovery', () => {
    it('should handle session corruption with recovery options', async () => {
      const corruptionError = new SessionCorruptionError(
        'test-session',
        'missing_fields',
        ['Reset session', 'Recover partial data']
      );

      const result = await handleSessionCorruption(
        corruptionError,
        'test-session',
        'missing_fields'
      );

      expect(result.success).toBe(true);
      expect(result.recoveredSession).toBeDefined();
      expect(result.recoveryOptions).toContain('Reset session');
      expect(result.autoRecovered).toBe(true);
    });

    it('should detect session corruption', async () => {
      // Create a corrupted session by directly manipulating the session data
      const corruptedSession = {
        id: 'corrupted-session',
        // Missing required fields like config, createdAt, etc.
        history: 'invalid-type', // Should be array
      };

      // Mock the session loading to return corrupted data
      vi.spyOn(sessionManager as any, 'getSession').mockResolvedValue(corruptedSession);

      const validation = await sessionManager.validateSessionIntegrity('corrupted-session');

      expect(validation.isValid).toBe(false);
      expect(validation.corruptionType).toBeDefined();
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    it('should recover corrupted session with missing fields', async () => {
      const corruptedSession = {
        id: 'test-session',
        // Missing config, createdAt, updatedAt
        history: [],
      };

      const recovered = await (sessionManager as any).recoverMissingFields(corruptedSession);

      expect(recovered.id).toBe('test-session');
      expect(recovered.config).toBeDefined();
      expect(recovered.createdAt).toBeDefined();
      expect(recovered.updatedAt).toBeDefined();
      expect(recovered.history).toEqual([]);
      expect(recovered.iterations).toEqual([]);
    });

    it('should provide recovery options for different corruption types', () => {
      const corruptionError = new SessionCorruptionError('test', 'partial_data');
      
      expect(corruptionError.getRecoveryOptions()).toBeDefined();
      expect(corruptionError.canAutoRecover()).toBe(true);

      const severeCorruption = new SessionCorruptionError('test', 'complete_loss');
      expect(severeCorruption.canAutoRecover()).toBe(false);
    });
  });

  describe('Requirement 7.4: Timeout Handling with Partial Results', () => {
    it('should handle timeout with partial results', async () => {
      const partialResults = {
        overall: 60,
        dimensions: [{ name: 'accuracy', score: 60 }],
        verdict: 'revise',
        review: { summary: 'Partial analysis', inline: [], citations: [] },
      };

      const timeoutError = new AuditTimeoutError(
        30000,
        partialResults,
        75,
        'audit'
      );

      const result = await handleAuditTimeout(
        timeoutError,
        30000,
        partialResults,
        75
      );

      expect(result.success).toBe(true);
      expect(result.partialAudit).toBeDefined();
      expect(result.timeoutInfo?.timeoutMs).toBe(30000);
      expect(result.timeoutInfo?.completionPercentage).toBe(75);
      expect(result.timeoutInfo?.hasPartialResults).toBe(true);
    });

    it('should handle timeout without partial results', async () => {
      const timeoutError = new AuditTimeoutError(30000, null, 0, 'audit');

      const result = await handleAuditTimeout(timeoutError, 30000);

      expect(result.success).toBe(true);
      expect(result.partialAudit).toBeDefined();
      expect(result.partialAudit.review.summary).toContain('timed out');
      expect(result.timeoutInfo?.hasPartialResults).toBe(false);
    });

    it('should provide timeout information in audit results', () => {
      const timeoutError = new AuditTimeoutError(30000, { test: 'data' }, 50);

      expect(timeoutError.hasPartialResults()).toBe(true);
      expect(timeoutError.getCompletionPercentage()).toBe(50);
      expect(timeoutError.suggestions).toContain('Partial results are available and will be returned');
    });

    it('should handle timeout in audit engine', async () => {
      const thought: GansAuditorCodexThoughtData = {
        thoughtNumber: 1,
        thought: '```typescript\nfunction test() { return "hello"; }\n```',
        nextThoughtNeeded: false,
        totalThoughts: 1,
      };

      // Mock timeout error
      mockGanAuditor.auditThought.mockRejectedValue(new Error('Operation timed out'));

      const result = await auditEngine.auditAndWait(thought, 'test-session');

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain('timed out');
      expect(result.review.review.summary).toContain('timed out');
    });
  });

  describe('Error Message Quality and Actionability', () => {
    it('should provide clear and actionable error messages', () => {
      const errors = [
        new AuditServiceUnavailableError('Test Service'),
        new InvalidCodeFormatError('malformed', ['typescript']),
        new SessionCorruptionError('test', 'missing_fields'),
        new AuditTimeoutError(30000, null, 0),
      ];

      errors.forEach(error => {
        expect(error.message).toBeTruthy();
        expect(error.suggestions.length).toBeGreaterThan(0);
        expect(error.suggestions.some(s => s.length > 10)).toBe(true); // Non-trivial suggestions
        expect(error.recoverable).toBe(true);
      });
    });

    it('should categorize errors appropriately', () => {
      const serviceError = new AuditServiceUnavailableError('Test');
      const formatError = new InvalidCodeFormatError('invalid', []);
      const sessionError = new SessionCorruptionError('test', 'corruption');
      const timeoutError = new AuditTimeoutError(30000);

      expect(serviceError.category).toBe('codex');
      expect(formatError.category).toBe('config');
      expect(sessionError.category).toBe('session');
      expect(timeoutError.category).toBe('codex');
    });

    it('should provide structured error responses', () => {
      const error = new AuditServiceUnavailableError('Test Service', 'Connection failed');
      const response = error.toStructuredResponse({ fallback: true });

      expect(response.error).toBe(error.message);
      expect(response.status).toBe('failed');
      expect(response.details.category).toBe('codex');
      expect(response.details.severity).toBe('high');
      expect(response.details.recoverable).toBe(true);
      expect(response.details.suggestions.length).toBeGreaterThan(0);
      expect(response.fallback_data).toEqual({ fallback: true });
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle multiple error types in sequence', async () => {
      const thought: GansAuditorCodexThoughtData = {
        thoughtNumber: 1,
        thought: '```invalid\nmalformed code\n```',
        nextThoughtNeeded: false,
        totalThoughts: 1,
      };

      // First call fails with service error
      mockGanAuditor.auditThought
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({
          overall: 70,
          dimensions: [{ name: 'accuracy', score: 70 }],
          verdict: 'pass',
          review: { summary: 'Recovered', inline: [], citations: [] },
          proposed_diff: null,
          iterations: 1,
          judge_cards: [{ model: 'test', score: 70, notes: 'Recovered' }],
        });

      const result = await auditEngine.auditAndWait(thought, 'test-session');

      // Should handle the error gracefully
      expect(result.success).toBe(false);
      expect(result.review).toBeDefined();
      expect(result.error).toContain('Service unavailable');
    });

    it('should maintain error context across operations', async () => {
      const sessionId = 'error-context-test';
      
      // Create session with potential corruption
      await sessionManager.getOrCreateSession(sessionId);
      
      // Simulate corruption detection
      const validation = await sessionManager.validateSessionIntegrity(sessionId);
      
      if (!validation.isValid) {
        const recovered = await sessionManager.recoverCorruptedSession(
          sessionId, 
          validation.corruptionType!
        );
        expect(recovered).toBeDefined();
      }
    });
  });
});