/**
 * Unit tests for GansAuditor_Codex orchestration layer
 * 
 * These tests focus on the individual methods and logic of the GanAuditor class
 * using mocked dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GanAuditor, type GanAuditorConfig } from '../gan-auditor.js';
import type {
  ISessionManager,
  IContextPacker,
  ICodexJudge,
} from '../../types/integration-types.js';
import type {
  ThoughtData,
  GanReview,
  SessionState,
  SessionConfig,
} from '../../types/gan-types.js';
import { DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG } from '../../types/gan-types.js';

// ============================================================================
// Mock Implementations
// ============================================================================

const createMockSessionManager = (): ISessionManager => ({
  getSession: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  generateSessionId: vi.fn().mockReturnValue('mock-session-id'),
  cleanupSessions: vi.fn(),
  addAuditToHistory: vi.fn(),
});

const createMockContextPacker = (): IContextPacker => ({
  buildContextPack: vi.fn().mockResolvedValue('# Mock Context\n\nThis is mock context.'),
  buildDiffContext: vi.fn(),
  buildPathsContext: vi.fn(),
  buildWorkspaceContext: vi.fn(),
});

const createMockCodexJudge = (): ICodexJudge => ({
  executeAudit: vi.fn().mockResolvedValue({
    overall: 85,
    dimensions: [
      { name: 'accuracy', score: 90 },
      { name: 'completeness', score: 80 },
    ],
    verdict: 'pass',
    review: {
      summary: 'Mock review summary',
      inline: [],
      citations: [],
    },
    proposed_diff: null,
    iterations: 1,
    judge_cards: [{ model: 'mock', score: 85 }],
  } as GanReview),
  isAvailable: vi.fn().mockResolvedValue(true),
  getVersion: vi.fn().mockResolvedValue('1.0.0'),
});

const createMockSession = (overrides: Partial<SessionState> = {}): SessionState => ({
  id: 'test-session',
  config: { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG },
  history: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const createTestThought = (overrides: Partial<ThoughtData> = {}): ThoughtData => ({
  thought: 'Test thought content',
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  ...overrides,
});

// ============================================================================
// Test Suite
// ============================================================================

describe('GansAuditor_Codex Unit Tests', () => {
  let auditor: GanAuditor;
  let mockSessionManager: ISessionManager;
  let mockContextPacker: IContextPacker;
  let mockCodexJudge: ICodexJudge;
  let config: GanAuditorConfig;

  beforeEach(() => {
    mockSessionManager = createMockSessionManager();
    mockContextPacker = createMockContextPacker();
    mockCodexJudge = createMockCodexJudge();
    
    config = {
      logging: { enabled: false, level: 'error' },
    };

    auditor = new GanAuditor(
      config,
      mockSessionManager,
      mockContextPacker,
      mockCodexJudge
    );
  });

  // ============================================================================
  // Constructor and Configuration Tests
  // ============================================================================

  describe('Constructor and Configuration', () => {
    it('should create auditor with default configuration', () => {
      const defaultAuditor = new GanAuditor();
      expect(defaultAuditor).toBeDefined();
    });

    it('should create auditor with custom configuration', () => {
      const customConfig: GanAuditorConfig = {
        sessionManager: { stateDirectory: '/custom/path' },
        logging: { enabled: true, level: 'debug' },
      };

      const customAuditor = new GanAuditor(customConfig);
      expect(customAuditor).toBeDefined();
    });

    it('should use provided component instances', () => {
      expect(auditor).toBeDefined();
      // Components should be the mocked instances we provided
    });
  });

  // ============================================================================
  // Inline Configuration Extraction Tests
  // ============================================================================

  describe('Inline Configuration Extraction', () => {
    it('should extract valid gan-config block', () => {
      const thoughtText = `
Some text before.

\`\`\`gan-config
{
  "task": "Custom task",
  "threshold": 90,
  "scope": "workspace"
}
\`\`\`

Some text after.
      `.trim();

      const config = auditor.extractInlineConfig(thoughtText);

      expect(config).toBeDefined();
      expect(config!.task).toBe('Custom task');
      expect(config!.threshold).toBe(90);
      expect(config!.scope).toBe('workspace');
    });

    it('should extract json block with gan-config content', () => {
      const thoughtText = `
\`\`\`json
{
  "task": "JSON block task",
  "maxCycles": 3
}
\`\`\`
      `.trim();

      const config = auditor.extractInlineConfig(thoughtText);

      expect(config).toBeDefined();
      expect(config!.task).toBe('JSON block task');
      expect(config!.maxCycles).toBe(3);
    });

    it('should return null when no config block found', () => {
      const thoughtText = 'Just regular text without any config blocks.';

      const config = auditor.extractInlineConfig(thoughtText);

      expect(config).toBeNull();
    });

    it('should return null for empty config block', () => {
      const thoughtText = `
\`\`\`gan-config
\`\`\`
      `.trim();

      const config = auditor.extractInlineConfig(thoughtText);

      expect(config).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      const thoughtText = `
\`\`\`gan-config
{
  "task": "Malformed JSON",
  "threshold": 90,
  // This comment makes it invalid JSON
}
\`\`\`
      `.trim();

      const config = auditor.extractInlineConfig(thoughtText);

      expect(config).toBeNull();
    });
  });

  // ============================================================================
  // Configuration Validation Tests
  // ============================================================================

  describe('Configuration Validation', () => {
    it('should validate and return valid configuration', () => {
      const inputConfig = {
        task: 'Valid task',
        threshold: 85,
        scope: 'diff' as const,
      };

      const validatedConfig = auditor.validateConfig(inputConfig);

      expect(validatedConfig.task).toBe('Valid task');
      expect(validatedConfig.threshold).toBe(85);
      expect(validatedConfig.scope).toBe('diff');
    });

    it('should sanitize invalid threshold values', () => {
      const inputConfig = {
        threshold: 150, // Above maximum
      };

      const validatedConfig = auditor.validateConfig(inputConfig);

      expect(validatedConfig.threshold).toBe(100); // Clamped to maximum
    });

    it('should sanitize invalid maxCycles values', () => {
      const inputConfig = {
        maxCycles: -5, // Below minimum
      };

      const validatedConfig = auditor.validateConfig(inputConfig);

      expect(validatedConfig.maxCycles).toBe(1); // Clamped to minimum
    });

    it('should use defaults for invalid scope', () => {
      const inputConfig = {
        scope: 'invalid-scope' as any,
      };

      const validatedConfig = auditor.validateConfig(inputConfig);

      expect(validatedConfig.scope).toBe(DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG.scope);
    });
  });

  // ============================================================================
  // Audit Workflow Tests
  // ============================================================================

  describe('Audit Workflow', () => {
    it('should complete audit workflow with new session', async () => {
      const thought = createTestThought();
      const mockSession = createMockSession();

      // Mock session manager to return null (no existing session) then create new one
      vi.mocked(mockSessionManager.getSession).mockResolvedValue(null);
      vi.mocked(mockSessionManager.createSession).mockResolvedValue(mockSession);

      const review = await auditor.auditThought(thought);

      expect(review).toBeDefined();
      expect(review.overall).toBe(85);
      expect(review.verdict).toBe('pass');

      // Verify workflow calls
      expect(mockSessionManager.getSession).toHaveBeenCalled();
      expect(mockSessionManager.createSession).toHaveBeenCalled();
      expect(mockContextPacker.buildContextPack).toHaveBeenCalled();
      expect(mockCodexJudge.executeAudit).toHaveBeenCalled();
      expect(mockSessionManager.addAuditToHistory).toHaveBeenCalled();
    });

    it('should reuse existing session when available', async () => {
      const sessionId = 'existing-session';
      const thought = createTestThought({ branchId: sessionId });
      const mockSession = createMockSession({ id: sessionId });

      // Mock session manager to return existing session
      vi.mocked(mockSessionManager.getSession).mockResolvedValue(mockSession);

      const review = await auditor.auditThought(thought, sessionId);

      expect(review).toBeDefined();

      // Verify existing session was used
      expect(mockSessionManager.getSession).toHaveBeenCalledWith(sessionId);
      expect(mockSessionManager.createSession).not.toHaveBeenCalled();
    });

    it('should merge inline configuration with session config', async () => {
      const thought = createTestThought({
        thought: `
\`\`\`gan-config
{
  "task": "Inline task",
  "threshold": 95
}
\`\`\`

Test code here.
        `.trim()
      });

      const mockSession = createMockSession();
      vi.mocked(mockSessionManager.getSession).mockResolvedValue(null);
      vi.mocked(mockSessionManager.createSession).mockResolvedValue(mockSession);

      await auditor.auditThought(thought);

      // Verify session was updated with merged config
      expect(mockSessionManager.updateSession).toHaveBeenCalled();
      
      // Verify audit request used merged config
      expect(mockCodexJudge.executeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          task: 'Inline task',
          budget: expect.objectContaining({
            threshold: 95,
          }),
        })
      );
    });

    it('should use provided sessionId parameter', async () => {
      const sessionId = 'custom-session-id';
      const thought = createTestThought();
      const mockSession = createMockSession({ id: sessionId });

      vi.mocked(mockSessionManager.getSession).mockResolvedValue(mockSession);

      await auditor.auditThought(thought, sessionId);

      expect(mockSessionManager.getSession).toHaveBeenCalledWith(sessionId);
    });

    it('should use branchId from thought when no sessionId provided', async () => {
      const branchId = 'branch-session-id';
      const thought = createTestThought({ branchId });
      const mockSession = createMockSession({ id: branchId });

      vi.mocked(mockSessionManager.getSession).mockResolvedValue(mockSession);

      await auditor.auditThought(thought);

      expect(mockSessionManager.getSession).toHaveBeenCalledWith(branchId);
    });

    it('should generate sessionId when none provided', async () => {
      const thought = createTestThought();
      const mockSession = createMockSession();

      vi.mocked(mockSessionManager.getSession).mockResolvedValue(null);
      vi.mocked(mockSessionManager.createSession).mockResolvedValue(mockSession);

      await auditor.auditThought(thought);

      expect(mockSessionManager.generateSessionId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle context building errors gracefully', async () => {
      const thought = createTestThought();
      const mockSession = createMockSession();

      vi.mocked(mockSessionManager.getSession).mockResolvedValue(null);
      vi.mocked(mockSessionManager.createSession).mockResolvedValue(mockSession);
      vi.mocked(mockContextPacker.buildContextPack).mockRejectedValue(
        new Error('Context build failed')
      );

      const review = await auditor.auditThought(thought);

      expect(review).toBeDefined();
      
      // Verify audit was called with fallback context
      expect(mockCodexJudge.executeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          contextPack: expect.stringContaining('Context building failed'),
        })
      );
    });

    it('should handle Codex judge errors with fallback response', async () => {
      const thought = createTestThought();
      const mockSession = createMockSession();

      vi.mocked(mockSessionManager.getSession).mockResolvedValue(null);
      vi.mocked(mockSessionManager.createSession).mockResolvedValue(mockSession);
      vi.mocked(mockCodexJudge.executeAudit).mockRejectedValue(
        new Error('Codex execution failed')
      );

      const review = await auditor.auditThought(thought);

      expect(review).toBeDefined();
      expect(review.overall).toBe(50); // Fallback score
      expect(review.verdict).toBe('revise');
      expect(review.review.summary).toContain('Audit execution failed');
      expect(review.judge_cards[0].model).toBe('fallback');
    });

    it('should handle session persistence errors gracefully', async () => {
      const thought = createTestThought();
      const mockSession = createMockSession();

      vi.mocked(mockSessionManager.getSession).mockResolvedValue(null);
      vi.mocked(mockSessionManager.createSession).mockResolvedValue(mockSession);
      vi.mocked(mockSessionManager.addAuditToHistory).mockRejectedValue(
        new Error('Persistence failed')
      );

      // Should not throw error despite persistence failure
      const review = await auditor.auditThought(thought);

      expect(review).toBeDefined();
      expect(review.overall).toBe(85); // Normal audit result
    });

    it('should handle session creation errors with fallback', async () => {
      const thought = createTestThought();

      vi.mocked(mockSessionManager.getSession).mockResolvedValue(null);
      vi.mocked(mockSessionManager.createSession).mockRejectedValue(
        new Error('Session creation failed')
      );

      // Should not throw but provide fallback response
      const review = await auditor.auditThought(thought);
      
      expect(review).toBeDefined();
      expect(review.overall).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Audit Request Creation Tests
  // ============================================================================

  describe('Audit Request Creation', () => {
    it('should create proper audit request structure', async () => {
      const thought = createTestThought({
        thought: 'Test code to audit',
      });
      const mockSession = createMockSession({
        config: {
          ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG,
          task: 'Custom audit task',
          threshold: 90,
          maxCycles: 2,
          candidates: 3,
        },
      });

      vi.mocked(mockSessionManager.getSession).mockResolvedValue(mockSession);

      await auditor.auditThought(thought);

      expect(mockCodexJudge.executeAudit).toHaveBeenCalledWith({
        task: 'Custom audit task',
        candidate: 'Test code to audit',
        contextPack: expect.any(String),
        rubric: expect.objectContaining({
          dimensions: expect.arrayContaining([
            expect.objectContaining({ name: 'accuracy' }),
            expect.objectContaining({ name: 'completeness' }),
          ]),
        }),
        budget: {
          maxCycles: 2,
          candidates: 3,
          threshold: 90,
        },
      });
    });
  });

  // ============================================================================
  // Cleanup and Resource Management Tests
  // ============================================================================

  describe('Cleanup and Resource Management', () => {
    it('should call destroy on session manager if available', () => {
      const mockSessionManagerWithDestroy = {
        ...mockSessionManager,
        destroy: vi.fn(),
      };

      const testAuditor = new GanAuditor(
        config,
        mockSessionManagerWithDestroy,
        mockContextPacker,
        mockCodexJudge
      );

      testAuditor.destroy();

      expect(mockSessionManagerWithDestroy.destroy).toHaveBeenCalled();
    });

    it('should handle destroy gracefully when session manager has no destroy method', () => {
      expect(() => auditor.destroy()).not.toThrow();
    });
  });
});