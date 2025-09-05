/**
 * Integration tests for Synchronous Audit Engine with GAN Auditor
 * 
 * This test suite verifies the integration between the synchronous audit engine
 * and the existing GAN auditor components.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  SynchronousAuditEngine,
  createSynchronousAuditEngine,
} from '../synchronous-audit-engine.js';
import { GanAuditor } from '../gan-auditor.js';
import type { 
  GansAuditorCodexThoughtData,
  GansAuditorCodexReview,
} from '../../types/gan-types.js';

// Mock the logger to avoid console output during tests
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createComponentLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  createTimer: vi.fn(() => ({
    end: vi.fn(),
    endWithError: vi.fn(),
  })),
}));

// Mock the error handler
vi.mock('../../utils/error-handler.js', () => ({
  withTimeout: vi.fn(),
  createErrorResponse: vi.fn(),
}));

// Mock the session manager
vi.mock('../../session/session-manager.js', () => ({
  SessionManager: vi.fn(() => ({
    getSession: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    generateSessionId: vi.fn(() => 'test-session-id'),
    addAuditToHistory: vi.fn(),
  })),
}));

// Mock the context packer
vi.mock('../../context/context-packer.js', () => ({
  ContextPacker: vi.fn(() => ({
    buildContextPack: vi.fn(() => Promise.resolve('mock context pack')),
  })),
}));

// Mock the codex judge
vi.mock('../../codex/codex-judge.js', () => ({
  CodexJudge: vi.fn(() => ({
    executeAudit: vi.fn(),
    isAvailable: vi.fn(() => Promise.resolve(true)),
    getVersion: vi.fn(() => Promise.resolve('1.0.0')),
  })),
}));

describe('SynchronousAuditEngine Integration', () => {
  let engine: SynchronousAuditEngine;
  let sampleThought: GansAuditorCodexThoughtData;
  let sampleReview: GansAuditorCodexReview;

  beforeEach(() => {
    // Sample thought data with code
    sampleThought = {
      thought: '```javascript\nfunction hello() { return "world"; }\n```',
      thoughtNumber: 1,
      totalThoughts: 1,
      nextThoughtNeeded: false,
      branchId: 'test-session',
    };

    // Sample review result
    sampleReview = {
      overall: 85,
      dimensions: [
        { name: 'accuracy', score: 90 },
        { name: 'completeness', score: 80 },
        { name: 'clarity', score: 85 },
        { name: 'actionability', score: 85 },
        { name: 'human_likeness', score: 85 },
      ],
      verdict: 'pass',
      review: {
        summary: 'Code looks good with minor improvements needed.',
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 1,
      judge_cards: [{
        model: 'test-judge',
        score: 85,
        notes: 'Good implementation',
      }],
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (engine) {
      engine.destroy();
    }
  });

  describe('Integration with GAN Auditor', () => {
    it('should create engine with default GAN auditor', () => {
      engine = createSynchronousAuditEngine();
      
      expect(engine).toBeInstanceOf(SynchronousAuditEngine);
      expect(engine.isEnabled()).toBe(true);
      expect(engine.getAuditTimeout()).toBe(30000);
    });

    it('should create engine with custom GAN auditor configuration', () => {
      const config = {
        auditTimeout: 45000,
        enabled: true,
        ganAuditorConfig: {
          logging: {
            enabled: true,
            level: 'debug' as const,
          },
          codexJudge: {
            timeout: 25000,
            retries: 3,
          },
        },
      };

      engine = createSynchronousAuditEngine(config);
      
      expect(engine.getAuditTimeout()).toBe(45000);
      expect(engine.isEnabled()).toBe(true);
    });

    it('should integrate with GAN auditor for successful audit', async () => {
      // Mock successful audit flow
      const { withTimeout } = await import('../../utils/error-handler.js');
      vi.mocked(withTimeout).mockImplementation(async (operation) => {
        return await operation();
      });

      // Create a mock GAN auditor that returns our sample review
      const mockGanAuditor = {
        auditThought: vi.fn().mockResolvedValue(sampleReview),
        extractInlineConfig: vi.fn(),
        validateConfig: vi.fn(),
      };

      engine = new SynchronousAuditEngine({}, mockGanAuditor);

      const result = await engine.auditAndWait(sampleThought, 'test-session');

      expect(result.success).toBe(true);
      expect(result.timedOut).toBe(false);
      expect(result.review).toEqual(sampleReview);
      expect(result.sessionId).toBe('test-session');
      expect(mockGanAuditor.auditThought).toHaveBeenCalledWith(sampleThought, 'test-session');
    });

    it('should handle GAN auditor timeout gracefully', async () => {
      const timeoutError = new Error('Audit operation timed out after 30000ms');
      const { withTimeout } = await import('../../utils/error-handler.js');
      vi.mocked(withTimeout).mockRejectedValue(timeoutError);

      engine = createSynchronousAuditEngine();

      const result = await engine.auditAndWait(sampleThought);

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain('timed out');
      expect(result.review.verdict).toBe('revise');
      expect(result.review.review.summary).toContain('timed out after 30000ms');
    });

    it('should handle GAN auditor errors with fallback', async () => {
      const auditError = new Error('Codex service unavailable');
      const { withTimeout } = await import('../../utils/error-handler.js');
      vi.mocked(withTimeout).mockRejectedValue(auditError);

      engine = createSynchronousAuditEngine();

      const result = await engine.auditAndWait(sampleThought);

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(false);
      expect(result.error).toBe('Codex service unavailable');
      expect(result.review.verdict).toBe('revise');
      expect(result.review.review.summary).toContain('Codex service unavailable');
    });
  });

  describe('Code Detection Integration', () => {
    beforeEach(() => {
      engine = createSynchronousAuditEngine();
    });

    it('should properly detect code requiring audit', () => {
      const codeThoughts = [
        { ...sampleThought, thought: '```python\nprint("hello")\n```' },
        { ...sampleThought, thought: 'Use `Array.map()` to transform data' },
        { ...sampleThought, thought: 'function test() { return true; }' },
        { ...sampleThought, thought: 'class MyClass extends BaseClass {}' },
        { ...sampleThought, thought: 'import { useState } from "react"' },
        { ...sampleThought, thought: 'const value: string = "test"' },
      ];

      codeThoughts.forEach(thought => {
        expect(engine.isAuditRequired(thought)).toBe(true);
      });
    });

    it('should properly skip non-code content', () => {
      const nonCodeThoughts = [
        { ...sampleThought, thought: 'This is just plain text discussion.' },
        { ...sampleThought, thought: 'Let me explain the concept of inheritance.' },
        { ...sampleThought, thought: 'The user wants to implement a feature.' },
        { ...sampleThought, thought: 'Here are some general guidelines:' },
      ];

      nonCodeThoughts.forEach(thought => {
        expect(engine.isAuditRequired(thought)).toBe(false);
      });
    });
  });

  describe('Configuration Integration', () => {
    it('should respect timeout configuration in audit operations', async () => {
      const customTimeout = 60000;
      engine = createSynchronousAuditEngine({ auditTimeout: customTimeout });

      const { withTimeout } = await import('../../utils/error-handler.js');
      const mockWithTimeout = vi.mocked(withTimeout);
      mockWithTimeout.mockImplementation(async (operation) => {
        return await operation();
      });

      // Mock successful audit
      const mockGanAuditor = {
        auditThought: vi.fn().mockResolvedValue(sampleReview),
        extractInlineConfig: vi.fn(),
        validateConfig: vi.fn(),
      };

      engine = new SynchronousAuditEngine({ auditTimeout: customTimeout }, mockGanAuditor);

      await engine.auditAndWait(sampleThought);

      expect(mockWithTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        customTimeout,
        'Audit operation timed out'
      );
    });

    it('should respect enabled/disabled configuration', async () => {
      engine = createSynchronousAuditEngine({ enabled: false });

      const result = await engine.auditAndWait(sampleThought);

      expect(result.success).toBe(true);
      expect(result.review.verdict).toBe('pass');
      expect(result.review.overall).toBe(100);
      expect(result.duration).toBe(0);
    });
  });

  describe('Error Recovery Integration', () => {
    beforeEach(() => {
      engine = createSynchronousAuditEngine();
    });

    it('should provide meaningful error messages for different failure types', async () => {
      const errorScenarios = [
        { error: new Error('Connection timeout'), expectedType: 'failure' },
        { error: new Error('Operation timed out after 30000ms'), expectedType: 'timeout' },
        { error: new Error('Service unavailable'), expectedType: 'failure' },
        { error: new Error('Invalid configuration'), expectedType: 'failure' },
      ];

      for (const scenario of errorScenarios) {
        const { withTimeout } = await import('../../utils/error-handler.js');
        vi.mocked(withTimeout).mockRejectedValue(scenario.error);

        const result = await engine.auditAndWait(sampleThought);

        expect(result.success).toBe(false);
        expect(result.error).toBe(scenario.error.message);
        expect(result.review.verdict).toBe('revise');
        expect(result.review.judge_cards[0].model).toBe('synchronous-audit-engine-fallback');
        
        if (scenario.expectedType === 'timeout') {
          expect(result.timedOut).toBe(true);
          expect(result.review.judge_cards[0].notes).toContain('timeout');
        } else {
          expect(result.timedOut).toBe(false);
          expect(result.review.judge_cards[0].notes).toContain('failure');
        }
      }
    });
  });
});