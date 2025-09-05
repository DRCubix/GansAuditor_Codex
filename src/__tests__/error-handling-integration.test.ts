/**
 * Integration tests for comprehensive error handling across all components
 * 
 * Tests error handling scenarios across the entire GansAuditor_Codex system.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GanAuditor } from '../auditor/gan-auditor.js';
import { SessionManager } from '../session/session-manager.js';
import { ContextPacker } from '../context/context-packer.js';
import { CodexJudge } from '../codex/codex-judge.js';
import {
  ConfigurationError,
  CodexNotAvailableError,
  FileSystemError,
  SessionError,
  ErrorAggregator,
} from '../types/error-types.js';
import { configureLogger } from '../utils/logger.js';
import { configureErrorHandler } from '../utils/error-handler.js';
import type { ThoughtData, SessionConfig } from '../types/gan-types.js';
import { DEFAULT_SESSION_CONFIG } from '../types/gan-types.js';

// Mock file system operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
}));

// Mock child_process for git and codex operations
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock logger to avoid console output during tests
vi.mock('../utils/logger.js', async () => {
  const actual = await vi.importActual('../utils/logger.js');
  return {
    ...actual,
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
  };
});

describe('GansAuditor_Codex Error Handling Integration', () => {
  let ganAuditor: GanAuditor;
  let mockSessionManager: SessionManager;
  let mockContextPacker: ContextPacker;
  let mockCodexJudge: CodexJudge;

  const sampleThought: ThoughtData = {
    thought: 'Test thought for auditing',
    thoughtNumber: 1,
    totalThoughts: 1,
    nextThoughtNeeded: false,
    branchId: 'test-session',
  };

  beforeEach(() => {
    // Configure logging and error handling for tests
    configureLogger({
      enabled: false, // Disable logging during tests
      level: 'error',
    });

    configureErrorHandler({
      enableRetry: true,
      maxRetries: 2,
      enableFallback: true,
      enableGracefulDegradation: true,
      logErrors: false,
    });

    // Create mock components
    mockSessionManager = {
      generateSessionId: vi.fn().mockReturnValue('mock-session-id'),
      getSession: vi.fn(),
      createSession: vi.fn(),
      updateSession: vi.fn(),
      addAuditToHistory: vi.fn(),
      cleanupSessions: vi.fn(),
      deleteSession: vi.fn(),
      getAllSessions: vi.fn(),
      destroy: vi.fn(),
    } as any;

    mockContextPacker = {
      buildContextPack: vi.fn(),
    } as any;

    mockCodexJudge = {
      executeAudit: vi.fn(),
      isAvailable: vi.fn(),
      getVersion: vi.fn(),
    } as any;

    // Create GansAuditor_Codex with mocked components
    ganAuditor = new GanAuditor(
      {
        logging: { enabled: false, level: 'error' },
      },
      mockSessionManager,
      mockContextPacker,
      mockCodexJudge
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Management Error Handling', () => {
    it('should handle session loading failures gracefully', async () => {
      // Mock session loading failure
      mockSessionManager.getSession = vi.fn().mockRejectedValue(
        new SessionError('Session file corrupted')
      );

      // Mock successful context and audit
      mockContextPacker.buildContextPack = vi.fn().mockResolvedValue('# Test Context');
      mockCodexJudge.executeAudit = vi.fn().mockResolvedValue({
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Good', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      });

      const result = await ganAuditor.auditThought(sampleThought);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('pass');
      // The fallback session is created internally, not via session manager
      expect(mockSessionManager.getSession).toHaveBeenCalled();
    });

    it('should handle session persistence failures without affecting audit', async () => {
      // Mock successful session loading
      mockSessionManager.getSession = vi.fn().mockResolvedValue({
        id: 'test-session',
        config: DEFAULT_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock successful context and audit
      mockContextPacker.buildContextPack = vi.fn().mockResolvedValue('# Test Context');
      mockCodexJudge.executeAudit = vi.fn().mockResolvedValue({
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Good', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      });

      // Mock session persistence failure
      mockSessionManager.addAuditToHistory = vi.fn().mockRejectedValue(
        new SessionError('Failed to persist session')
      );

      const result = await ganAuditor.auditThought(sampleThought);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('pass');
      // Audit should succeed even if persistence fails
    });
  });

  describe('Context Building Error Handling', () => {
    it('should handle context building failures with fallback', async () => {
      // Mock successful session
      mockSessionManager.getSession = vi.fn().mockResolvedValue({
        id: 'test-session',
        config: DEFAULT_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock context building failure
      mockContextPacker.buildContextPack = vi.fn().mockRejectedValue(
        new FileSystemError('Git repository not found')
      );

      // Mock successful audit with fallback context
      mockCodexJudge.executeAudit = vi.fn().mockResolvedValue({
        overall: 70,
        dimensions: [],
        verdict: 'revise',
        review: { summary: 'Limited context', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      });

      const result = await ganAuditor.auditThought(sampleThought);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('revise');
      // Should have used fallback context
      expect(mockCodexJudge.executeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          contextPack: expect.stringContaining('Fallback Context'),
        })
      );
    });

    it('should retry context building on transient failures', async () => {
      // Mock successful session
      mockSessionManager.getSession = vi.fn().mockResolvedValue({
        id: 'test-session',
        config: DEFAULT_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock context building failure then success
      mockContextPacker.buildContextPack = vi.fn()
        .mockRejectedValueOnce(new FileSystemError('Temporary failure'))
        .mockResolvedValue('# Successful Context');

      // Mock successful audit
      mockCodexJudge.executeAudit = vi.fn().mockResolvedValue({
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Good', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      });

      const result = await ganAuditor.auditThought(sampleThought);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('pass');
      expect(mockContextPacker.buildContextPack).toHaveBeenCalledTimes(2);
    });
  });

  describe('Codex Integration Error Handling', () => {
    it('should handle Codex unavailability with fallback audit', async () => {
      // Mock successful session and context
      mockSessionManager.getSession = vi.fn().mockResolvedValue({
        id: 'test-session',
        config: DEFAULT_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockContextPacker.buildContextPack = vi.fn().mockResolvedValue('# Test Context');

      // Mock Codex unavailability
      mockCodexJudge.executeAudit = vi.fn().mockRejectedValue(
        new CodexNotAvailableError('codex')
      );

      const result = await ganAuditor.auditThought(sampleThought);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('revise');
      expect(result.judge_cards[0].model).toBe('fallback');
      expect(result.review.summary).toContain('Audit execution failed');
    });

    it('should retry Codex execution on transient failures', async () => {
      // Mock successful session and context
      mockSessionManager.getSession = vi.fn().mockResolvedValue({
        id: 'test-session',
        config: DEFAULT_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockContextPacker.buildContextPack = vi.fn().mockResolvedValue('# Test Context');

      // Mock Codex failure then success
      mockCodexJudge.executeAudit = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary Codex failure'))
        .mockResolvedValue({
          overall: 85,
          dimensions: [],
          verdict: 'pass',
          review: { summary: 'Good after retry', inline: [], citations: [] },
          iterations: 1,
          judge_cards: [],
        });

      const result = await ganAuditor.auditThought(sampleThought);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('pass');
      expect(result.review.summary).toBe('Good after retry');
      expect(mockCodexJudge.executeAudit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration Error Handling', () => {
    it('should handle invalid inline configuration gracefully', async () => {
      const thoughtWithBadConfig: ThoughtData = {
        ...sampleThought,
        thought: `
          Test thought with invalid config
          
          \`\`\`gan-config
          {
            "threshold": 150,
            "scope": "invalid-scope"
          }
          \`\`\`
        `,
      };

      // Mock successful session
      mockSessionManager.getSession = vi.fn().mockResolvedValue({
        id: 'test-session',
        config: DEFAULT_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockContextPacker.buildContextPack = vi.fn().mockResolvedValue('# Test Context');
      mockCodexJudge.executeAudit = vi.fn().mockResolvedValue({
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Good', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      });

      const result = await ganAuditor.auditThought(thoughtWithBadConfig);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('pass');
      // Should have used default configuration despite invalid inline config
    });
  });

  describe('Multiple Component Failures', () => {
    it('should handle cascading failures across all components', async () => {
      // Mock all components failing
      mockSessionManager.getSession = vi.fn().mockRejectedValue(
        new SessionError('Session system down')
      );
      mockSessionManager.createSession = vi.fn().mockRejectedValue(
        new SessionError('Cannot create session')
      );
      mockContextPacker.buildContextPack = vi.fn().mockRejectedValue(
        new FileSystemError('File system error')
      );
      mockCodexJudge.executeAudit = vi.fn().mockRejectedValue(
        new CodexNotAvailableError('codex')
      );

      const result = await ganAuditor.auditThought(sampleThought);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('revise');
      expect(result.judge_cards[0].model).toBe('fallback');
      // Should still return a meaningful result despite all failures
    });

    it('should aggregate and report multiple non-critical errors', async () => {
      const aggregator = new ErrorAggregator();

      // Simulate multiple errors occurring
      aggregator.addError(new FileSystemError('File not accessible'));
      aggregator.addError(new ConfigurationError('Invalid config value'));
      aggregator.addWarning('Performance degraded');
      aggregator.addWarning('Using fallback context');

      const summary = aggregator.getSummary();

      expect(summary.errorCount).toBe(2);
      expect(summary.warningCount).toBe(2);
      expect(summary.criticalCount).toBe(0);
      expect(summary.recoverableCount).toBe(2);

      // All errors should be recoverable
      expect(aggregator.getErrors().every(error => error.recoverable)).toBe(true);
    });
  });

  describe('Performance Under Error Conditions', () => {
    it('should maintain reasonable performance with frequent errors', async () => {
      // Mock intermittent failures
      let callCount = 0;
      mockContextPacker.buildContextPack = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          return Promise.reject(new FileSystemError('Intermittent failure'));
        }
        return Promise.resolve('# Context');
      });

      mockSessionManager.getSession = vi.fn().mockResolvedValue({
        id: 'test-session',
        config: DEFAULT_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockCodexJudge.executeAudit = vi.fn().mockResolvedValue({
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Good', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      });

      const start = Date.now();
      
      // Run multiple audits with intermittent failures
      const promises = Array.from({ length: 10 }, (_, i) => 
        ganAuditor.auditThought({
          ...sampleThought,
          thoughtNumber: i + 1,
          branchId: `session-${i}`,
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // All audits should complete
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(['pass', 'revise', 'reject']).toContain(result.verdict);
      });

      // Should complete in reasonable time despite errors
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from temporary system issues', async () => {
      let sessionCallCount = 0;
      let contextCallCount = 0;

      // Mock temporary failures followed by success
      mockSessionManager.getSession = vi.fn().mockImplementation(() => {
        sessionCallCount++;
        if (sessionCallCount === 1) {
          return Promise.reject(new SessionError('Temporary session error'));
        }
        return Promise.resolve({
          id: 'recovered-session',
          config: DEFAULT_SESSION_CONFIG,
          history: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      mockSessionManager.createSession = vi.fn().mockResolvedValue({
        id: 'new-session',
        config: DEFAULT_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockContextPacker.buildContextPack = vi.fn().mockImplementation(() => {
        contextCallCount++;
        if (contextCallCount === 1) {
          return Promise.reject(new FileSystemError('Temporary context error'));
        }
        return Promise.resolve('# Recovered Context');
      });

      mockCodexJudge.executeAudit = vi.fn().mockResolvedValue({
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Recovered successfully', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      });

      const result = await ganAuditor.auditThought(sampleThought);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('pass');
      expect(result.review.summary).toBe('Recovered successfully');
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log errors appropriately without affecting functionality', async () => {
      // Enable logging for this test
      configureLogger({
        enabled: true,
        level: 'debug',
      });

      configureErrorHandler({
        logErrors: true,
        logLevel: 'error',
      });

      // Mock a failure scenario
      mockSessionManager.getSession = vi.fn().mockRejectedValue(
        new SessionError('Logged session error')
      );

      mockSessionManager.createSession = vi.fn().mockResolvedValue({
        id: 'fallback-session',
        config: DEFAULT_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockContextPacker.buildContextPack = vi.fn().mockResolvedValue('# Test Context');
      mockCodexJudge.executeAudit = vi.fn().mockResolvedValue({
        overall: 85,
        dimensions: [],
        verdict: 'pass',
        review: { summary: 'Good', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      });

      const result = await ganAuditor.auditThought(sampleThought);

      expect(result).toBeDefined();
      expect(result.verdict).toBe('pass');
      // Logging should not affect the result
    });
  });

  describe('Resource Cleanup Under Error Conditions', () => {
    it('should properly clean up resources even when errors occur', async () => {
      // Mock resource cleanup
      const cleanupSpy = vi.fn();
      mockSessionManager.destroy = cleanupSpy;

      // Create auditor and simulate error
      const auditor = new GanAuditor(
        { logging: { enabled: false, level: 'error' } },
        mockSessionManager,
        mockContextPacker,
        mockCodexJudge
      );

      // Simulate some operations that might fail
      mockSessionManager.getSession = vi.fn().mockRejectedValue(
        new SessionError('Resource error')
      );

      try {
        await auditor.auditThought(sampleThought);
      } catch (error) {
        // Error is expected
      }

      // Clean up resources
      auditor.destroy();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});