/**
 * Tests for Synchronous Audit Engine
 * 
 * This test suite verifies the synchronous audit engine functionality
 * including timeout handling, error handling, and audit waiting mechanisms.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  SynchronousAuditEngine,
  createSynchronousAuditEngine,
  createSynchronousAuditEngineWithAuditor,
  type SynchronousAuditEngineConfig,
  DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG
} from '../synchronous-audit-engine.js';
import type { 
  IGansAuditorCodexAuditor,
  IGanAuditor 
} from '../../types/integration-types.js';
import type { 
  GansAuditorCodexThoughtData,
  GansAuditorCodexReview,
  ThoughtData,
  GanReview
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

// Mock the GAN auditor
vi.mock('../gan-auditor.js', () => ({
  GanAuditor: vi.fn(),
}));

describe('SynchronousAuditEngine', () => {
  let mockAuditor: IGansAuditorCodexAuditor;
  let engine: SynchronousAuditEngine;
  let sampleThought: GansAuditorCodexThoughtData;
  let sampleReview: GansAuditorCodexReview;

  beforeEach(() => {
    // Create mock auditor
    mockAuditor = {
      auditThought: vi.fn(),
      extractInlineConfig: vi.fn(),
      validateConfig: vi.fn(),
    };

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

  describe('Constructor and Configuration', () => {
    it('should create engine with default configuration', () => {
      engine = new SynchronousAuditEngine();
      
      expect(engine.getAuditTimeout()).toBe(DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.auditTimeout);
      expect(engine.isEnabled()).toBe(DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.enabled);
    });

    it('should create engine with custom configuration', () => {
      const config: Partial<SynchronousAuditEngineConfig> = {
        auditTimeout: 60000,
        enabled: false,
      };

      engine = new SynchronousAuditEngine(config);
      
      expect(engine.getAuditTimeout()).toBe(60000);
      expect(engine.isEnabled()).toBe(false);
    });

    it('should create engine with custom auditor', () => {
      engine = new SynchronousAuditEngine({}, mockAuditor);
      
      expect(engine).toBeInstanceOf(SynchronousAuditEngine);
    });
  });

  describe('Factory Functions', () => {
    it('should create engine using factory function', () => {
      engine = createSynchronousAuditEngine();
      
      expect(engine).toBeInstanceOf(SynchronousAuditEngine);
    });

    it('should create engine with custom auditor using factory', () => {
      engine = createSynchronousAuditEngineWithAuditor({}, mockAuditor);
      
      expect(engine).toBeInstanceOf(SynchronousAuditEngine);
    });
  });

  describe('Audit Requirement Detection', () => {
    beforeEach(() => {
      engine = new SynchronousAuditEngine({}, mockAuditor);
    });

    it('should detect code blocks requiring audit', () => {
      const thoughtWithCode = {
        ...sampleThought,
        thought: '```javascript\nconst x = 1;\n```',
      };

      expect(engine.isAuditRequired(thoughtWithCode)).toBe(true);
    });

    it('should detect inline code requiring audit', () => {
      const thoughtWithInlineCode = {
        ...sampleThought,
        thought: 'Use `console.log()` to debug',
      };

      expect(engine.isAuditRequired(thoughtWithInlineCode)).toBe(true);
    });

    it('should detect function declarations requiring audit', () => {
      const thoughtWithFunction = {
        ...sampleThought,
        thought: 'function myFunction() { return true; }',
      };

      expect(engine.isAuditRequired(thoughtWithFunction)).toBe(true);
    });

    it('should not require audit for plain text', () => {
      const plainTextThought = {
        ...sampleThought,
        thought: 'This is just plain text without any code.',
      };

      expect(engine.isAuditRequired(plainTextThought)).toBe(false);
    });

    it('should detect various code patterns', () => {
      const codePatterns = [
        'class MyClass {}',
        'import React from "react"',
        'export default function',
        'const variable = 5',
        'let counter = 0',
        'var oldStyle = true',
        'interface MyInterface { prop: string }',
        '/* block comment */',
        '// line comment',
      ];

      codePatterns.forEach(pattern => {
        const thought = { ...sampleThought, thought: pattern };
        expect(engine.isAuditRequired(thought)).toBe(true);
      });
    });
  });

  describe('Synchronous Audit Execution', () => {
    beforeEach(() => {
      engine = new SynchronousAuditEngine({}, mockAuditor);
    });

    it('should successfully audit and wait for completion', async () => {
      // Mock successful audit
      vi.mocked(mockAuditor.auditThought).mockResolvedValue(sampleReview);
      
      // Mock withTimeout to resolve immediately
      const { withTimeout } = await import('../../utils/error-handler.js');
      vi.mocked(withTimeout).mockImplementation(async (operation) => {
        return await operation();
      });

      const result = await engine.auditAndWait(sampleThought, 'test-session');

      expect(result.success).toBe(true);
      expect(result.timedOut).toBe(false);
      expect(result.review).toEqual(sampleReview);
      expect(result.sessionId).toBe('test-session');
      expect(mockAuditor.auditThought).toHaveBeenCalledWith(sampleThought, 'test-session');
    });

    it('should handle audit timeout', async () => {
      // Mock timeout error
      const timeoutError = new Error('Audit operation timed out after 30000ms');
      const { withTimeout } = await import('../../utils/error-handler.js');
      vi.mocked(withTimeout).mockRejectedValue(timeoutError);

      const result = await engine.auditAndWait(sampleThought);

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain('timed out');
      expect(result.review.verdict).toBe('revise');
      expect(result.review.overall).toBe(50); // Fallback score
    });

    it('should handle audit failure', async () => {
      // Mock audit failure
      const auditError = new Error('Codex service unavailable');
      const { withTimeout } = await import('../../utils/error-handler.js');
      vi.mocked(withTimeout).mockRejectedValue(auditError);

      const result = await engine.auditAndWait(sampleThought);

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(false);
      expect(result.error).toBe('Codex service unavailable');
      expect(result.review.verdict).toBe('revise');
    });

    it('should skip audit when disabled', async () => {
      engine.setEnabled(false);

      const result = await engine.auditAndWait(sampleThought);

      expect(result.success).toBe(true);
      expect(result.review.verdict).toBe('pass');
      expect(result.review.overall).toBe(100);
      expect(result.duration).toBe(0);
      expect(mockAuditor.auditThought).not.toHaveBeenCalled();
    });

    it('should skip audit when not required', async () => {
      const plainTextThought = {
        ...sampleThought,
        thought: 'This is just plain text.',
      };

      const result = await engine.auditAndWait(plainTextThought);

      expect(result.success).toBe(true);
      expect(result.review.verdict).toBe('pass');
      expect(result.review.overall).toBe(100);
      expect(result.duration).toBe(0);
      expect(mockAuditor.auditThought).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    beforeEach(() => {
      engine = new SynchronousAuditEngine({}, mockAuditor);
    });

    it('should update audit timeout', () => {
      engine.setAuditTimeout(60000);
      expect(engine.getAuditTimeout()).toBe(60000);
    });

    it('should reject invalid timeout values', () => {
      expect(() => engine.setAuditTimeout(0)).toThrow('Audit timeout must be greater than 0');
      expect(() => engine.setAuditTimeout(-1000)).toThrow('Audit timeout must be greater than 0');
    });

    it('should enable and disable auditing', () => {
      engine.setEnabled(false);
      expect(engine.isEnabled()).toBe(false);

      engine.setEnabled(true);
      expect(engine.isEnabled()).toBe(true);
    });
  });

  describe('Fallback Review Creation', () => {
    beforeEach(() => {
      engine = new SynchronousAuditEngine({}, mockAuditor);
    });

    it('should create appropriate fallback for timeout', async () => {
      const timeoutError = new Error('Operation timed out after 30000ms');
      const { withTimeout } = await import('../../utils/error-handler.js');
      vi.mocked(withTimeout).mockRejectedValue(timeoutError);

      const result = await engine.auditAndWait(sampleThought);

      expect(result.review.review.summary).toContain('timed out after 30000ms');
      expect(result.review.judge_cards[0].model).toBe('synchronous-audit-engine-fallback');
      expect(result.review.judge_cards[0].notes).toContain('timeout');
    });

    it('should create appropriate fallback for general failure', async () => {
      const generalError = new Error('Service unavailable');
      const { withTimeout } = await import('../../utils/error-handler.js');
      vi.mocked(withTimeout).mockRejectedValue(generalError);

      const result = await engine.auditAndWait(sampleThought);

      expect(result.review.review.summary).toContain('Service unavailable');
      expect(result.review.judge_cards[0].model).toBe('synchronous-audit-engine-fallback');
      expect(result.review.judge_cards[0].notes).toContain('failure');
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const mockDestroy = vi.fn();
      const auditorWithDestroy = {
        ...mockAuditor,
        destroy: mockDestroy,
      };

      engine = new SynchronousAuditEngine({}, auditorWithDestroy as any);
      engine.destroy();

      expect(mockDestroy).toHaveBeenCalled();
    });

    it('should handle destroy when auditor has no destroy method', () => {
      engine = new SynchronousAuditEngine({}, mockAuditor);
      
      // Should not throw
      expect(() => engine.destroy()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      engine = new SynchronousAuditEngine({}, mockAuditor);
    });

    it('should handle empty thought', async () => {
      const emptyThought = {
        ...sampleThought,
        thought: '',
      };

      const result = await engine.auditAndWait(emptyThought);

      expect(result.success).toBe(true);
      expect(result.review.verdict).toBe('pass');
      expect(mockAuditor.auditThought).not.toHaveBeenCalled();
    });

    it('should handle thought with only whitespace', async () => {
      const whitespaceThought = {
        ...sampleThought,
        thought: '   \n\t  \n  ',
      };

      const result = await engine.auditAndWait(whitespaceThought);

      expect(result.success).toBe(true);
      expect(result.review.verdict).toBe('pass');
      expect(mockAuditor.auditThought).not.toHaveBeenCalled();
    });

    it('should handle very long code blocks', async () => {
      const longCode = '```javascript\n' + 'console.log("test");'.repeat(1000) + '\n```';
      const longThought = {
        ...sampleThought,
        thought: longCode,
      };

      vi.mocked(mockAuditor.auditThought).mockResolvedValue(sampleReview);
      const { withTimeout } = await import('../../utils/error-handler.js');
      vi.mocked(withTimeout).mockImplementation(async (operation) => {
        return await operation();
      });

      const result = await engine.auditAndWait(longThought);

      expect(result.success).toBe(true);
      expect(mockAuditor.auditThought).toHaveBeenCalled();
    });
  });

  describe('Integration with Error Handler', () => {
    beforeEach(() => {
      engine = new SynchronousAuditEngine({}, mockAuditor);
    });

    it('should use withTimeout for audit operations', async () => {
      vi.mocked(mockAuditor.auditThought).mockResolvedValue(sampleReview);
      const { withTimeout } = await import('../../utils/error-handler.js');
      const mockWithTimeout = vi.mocked(withTimeout);
      mockWithTimeout.mockImplementation(async (operation) => {
        return await operation();
      });

      await engine.auditAndWait(sampleThought);

      expect(mockWithTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        DEFAULT_SYNCHRONOUS_AUDIT_ENGINE_CONFIG.auditTimeout,
        'Audit operation timed out'
      );
    });

    it('should respect custom timeout configuration', async () => {
      const customTimeout = 60000;
      engine = new SynchronousAuditEngine({ auditTimeout: customTimeout }, mockAuditor);
      
      vi.mocked(mockAuditor.auditThought).mockResolvedValue(sampleReview);
      const { withTimeout } = await import('../../utils/error-handler.js');
      const mockWithTimeout = vi.mocked(withTimeout);
      mockWithTimeout.mockImplementation(async (operation) => {
        return await operation();
      });

      await engine.auditAndWait(sampleThought);

      expect(mockWithTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        customTimeout,
        'Audit operation timed out'
      );
    });
  });
});