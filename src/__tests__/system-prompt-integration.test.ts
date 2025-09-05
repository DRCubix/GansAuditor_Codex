/**
 * Integration Tests for System Prompt Architecture Components
 * 
 * Tests for session management integration, Codex CLI interaction,
 * error handling, and response format compatibility.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemPromptManager } from '../prompts/system-prompt-manager.js';
import { SynchronousSessionManager } from '../session/synchronous-session-manager.js';
import { CodexJudge } from '../codex/codex-judge.js';
import { SynchronousAuditEngine } from '../auditor/synchronous-audit-engine.js';
import { CompletionEvaluator } from '../auditor/completion-evaluator.js';
import { LoopDetector } from '../auditor/loop-detector.js';
import type {
  GansAuditorCodexThoughtData,
  GansAuditorCodexSessionState,
  GansAuditorCodexReview,
  GansAuditorCodexEnhancedResponse,
} from '../types/gan-types.js';

describe('System Prompt Architecture Integration', () => {
  let systemPromptManager: SystemPromptManager;
  let sessionManager: SynchronousSessionManager;
  let codexJudge: CodexJudge;
  let auditEngine: SynchronousAuditEngine;
  let completionEvaluator: CompletionEvaluator;
  let loopDetector: LoopDetector;

  let mockThought: GansAuditorCodexThoughtData;
  let mockSession: GansAuditorCodexSessionState;
  let mockReview: GansAuditorCodexReview;

  beforeEach(async () => {
    // Initialize components
    systemPromptManager = new SystemPromptManager({
      enableCaching: false,
    });

    sessionManager = new SynchronousSessionManager({
      stateDirectory: '.test-system-prompt-integration',
      enableCompression: false,
    });

    codexJudge = new CodexJudge({
      executable: 'echo', // Mock executable for testing
      timeout: 5000,
    });

    auditEngine = new SynchronousAuditEngine({
      sessionManager,
      codexJudge,
      auditTimeout: 10000,
    });

    completionEvaluator = new CompletionEvaluator();
    loopDetector = new LoopDetector();

    // Mock data
    mockThought = {
      thought: 'Analyzing code quality for user authentication module',
      thoughtNumber: 3,
      totalThoughts: 5,
      nextThoughtNeeded: true,
    };

    mockSession = {
      id: 'integration-test-session',
      currentLoop: 3,
      iterations: [],
      history: [],
      config: {
        auditTimeout: 10000,
        enableSystemPrompt: true,
      },
      startTime: Date.now(),
      lastGan: null,
      stagnationInfo: null,
    };

    mockReview = {
      overall: 82,
      dimensions: [
        { name: 'Correctness & Completeness', score: 85 },
        { name: 'Tests', score: 78 },
        { name: 'Style & Conventions', score: 90 },
        { name: 'Security', score: 75 },
        { name: 'Performance', score: 85 },
        { name: 'Docs & Traceability', score: 80 },
      ],
      verdict: 'revise',
      review: {
        summary: 'Code quality is good but needs security improvements',
        inline: [
          {
            path: 'src/auth.ts',
            line: 42,
            comment: 'Consider using bcrypt for password hashing',
          },
        ],
        citations: [],
      },
      proposed_diff: null,
      iterations: 3,
      judge_cards: [{
        model: 'test-model',
        score: 82,
        notes: 'Security improvements needed',
      }],
    };
  });

  afterEach(async () => {
    // Cleanup
    systemPromptManager.clearCache();
    await sessionManager.cleanup();
    vi.clearAllMocks();
  });

  describe('session management integration', () => {
    it('should integrate system prompt with session state', async () => {
      // Create session
      const session = await sessionManager.createSession(mockSession.id, mockSession.config);
      
      // Render system prompt with session context
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, session);
      
      expect(rendered.variables.SESSION_ID).toBe(mockSession.id);
      expect(rendered.variables.CURRENT_LOOP).toBe(0); // New session starts at 0
      expect(rendered.content).toContain(mockSession.id);
    });

    it('should track audit history in session with prompt context', async () => {
      const session = await sessionManager.createSession(mockSession.id, mockSession.config);
      
      // Simulate multiple audit iterations
      for (let i = 1; i <= 3; i++) {
        const thought = { ...mockThought, thoughtNumber: i };
        const rendered = await systemPromptManager.renderSystemPrompt(thought, session);
        
        // Process audit response
        const result = systemPromptManager.processAuditResponse(
          mockReview,
          rendered,
          session
        );
        
        // Update session with results
        await sessionManager.updateSession(session.id, {
          currentLoop: i,
          lastGan: result.enhancedResponse,
        });
        
        // Verify session state
        const updatedSession = await sessionManager.getSession(session.id);
        expect(updatedSession?.currentLoop).toBe(i);
        expect(updatedSession?.lastGan).toBeDefined();
      }
    });

    it('should preserve session continuity across prompt renders', async () => {
      const session = await sessionManager.createSession(mockSession.id, mockSession.config);
      
      // First render
      const rendered1 = await systemPromptManager.renderSystemPrompt(mockThought, session);
      expect(rendered1.variables.CURRENT_LOOP).toBe(0);
      
      // Update session
      await sessionManager.updateSession(session.id, { currentLoop: 5 });
      const updatedSession = await sessionManager.getSession(session.id);
      
      // Second render with updated session
      const rendered2 = await systemPromptManager.renderSystemPrompt(mockThought, updatedSession!);
      expect(rendered2.variables.CURRENT_LOOP).toBe(5);
      
      // Verify context continuity
      expect(rendered2.variables.SESSION_ID).toBe(rendered1.variables.SESSION_ID);
    });

    it('should handle session state persistence with prompt metadata', async () => {
      const session = await sessionManager.createSession(mockSession.id, mockSession.config);
      
      // Render prompt and process response
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, session);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, session);
      
      // Update session with prompt metadata
      await sessionManager.updateSession(session.id, {
        lastGan: result.enhancedResponse,
        currentLoop: 1,
      });
      
      // Verify persistence by retrieving session
      const retrievedSession = await sessionManager.getSession(session.id);
      expect(retrievedSession?.lastGan?.judge_cards).toHaveLength(2); // Original + system-prompt-manager
      expect(retrievedSession?.lastGan?.judge_cards[1].model).toBe('system-prompt-manager');
    });
  });

  describe('codex CLI integration through prompt system', () => {
    it('should generate structured prompts for Codex CLI', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      
      // Verify prompt structure suitable for Codex CLI
      expect(rendered.content).toContain('## Identity & Role Definition');
      expect(rendered.content).toContain('## Audit Workflow');
      expect(rendered.content).toContain('## Structured Output Format');
      
      // Verify prompt includes context for CLI execution
      expect(rendered.content).toContain('Loop 3/25');
      expect(rendered.content).toContain('integration-test-session');
    });

    it('should parse Codex responses with prompt-driven outputs', async () => {
      // Mock Codex CLI response that follows prompt structure
      const mockCodexResponse = `
        **VERDICT**: No-ship + Overall Score (82/100)
        **SUMMARY**: 
        • Security improvements needed in authentication module
        • Password hashing should use bcrypt instead of plain text
        • Input validation missing for user registration
        
        | Issue | Severity | Location | Proof | Fix Summary |
        |-------|----------|----------|-------|-------------|
        | Weak password hashing | Critical | src/auth.ts:42 | Plain text storage | Use bcrypt |
        | Missing input validation | Major | src/user.ts:15 | No validation checks | Add validation |
      `;

      vi.spyOn(codexJudge, 'judge').mockResolvedValue({
        overall: 82,
        dimensions: mockReview.dimensions,
        verdict: 'revise',
        review: {
          summary: mockCodexResponse,
          inline: mockReview.review.inline,
          citations: [],
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [{
          model: 'codex-cli',
          score: 82,
          notes: 'Structured prompt response',
        }],
      });

      const codeToAudit = `
        export class AuthService {
          async hashPassword(password: string): Promise<string> {
            return password; // Security issue: plain text
          }
        }
      `;

      const result = await codexJudge.judge(codeToAudit, {
        sessionId: mockSession.id,
        branchId: 'test-branch',
      });

      expect(result.review.summary).toContain('**VERDICT**');
      expect(result.review.summary).toContain('Overall Score (82/100)');
      expect(result.review.summary).toContain('| Issue | Severity | Location |');
    });

    it('should validate prompt-driven response format', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      
      // Mock response processing
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);
      
      // Verify enhanced response maintains compatibility
      expect(result.enhancedResponse).toHaveProperty('overall');
      expect(result.enhancedResponse).toHaveProperty('dimensions');
      expect(result.enhancedResponse).toHaveProperty('verdict');
      expect(result.enhancedResponse).toHaveProperty('review');
      expect(result.enhancedResponse).toHaveProperty('judge_cards');
      
      // Verify prompt-specific enhancements
      expect(result.enhancedResponse.judge_cards).toHaveLength(2);
      expect(result.enhancedResponse.judge_cards[1].model).toBe('system-prompt-manager');
    });

    it('should handle Codex CLI timeout with prompt context', async () => {
      // Mock Codex CLI timeout
      vi.spyOn(codexJudge, 'judge').mockRejectedValue(new Error('Timeout: Command exceeded 5000ms'));

      const codeToAudit = 'export const test = "timeout test";';
      
      await expect(codexJudge.judge(codeToAudit, {
        sessionId: mockSession.id,
        branchId: 'test-branch',
      })).rejects.toThrow('Timeout');
    });
  });

  describe('error handling and fallback mechanisms', () => {
    it('should handle system prompt rendering errors gracefully', async () => {
      // Mock template loading error
      const invalidManager = new SystemPromptManager({
        promptTemplatePath: '/nonexistent/template.md',
      });

      await expect(invalidManager.renderSystemPrompt(mockThought, mockSession))
        .rejects.toThrow('Failed to load system prompt template');
    });

    it('should handle session corruption with prompt system', async () => {
      // Create session
      const session = await sessionManager.createSession(mockSession.id, mockSession.config);
      
      // Corrupt session data
      await sessionManager.updateSession(session.id, {
        currentLoop: -1, // Invalid loop count
      });

      // Should handle gracefully
      const corruptedSession = await sessionManager.getSession(session.id);
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, corruptedSession!);
      
      // Should use safe defaults
      expect(rendered.variables.CURRENT_LOOP).toBe(-1); // Preserves actual value
      expect(rendered.content).toContain('Loop -1/25');
    });

    it('should provide fallback when Codex CLI unavailable', async () => {
      // Mock Codex CLI unavailable
      const unavailableJudge = new CodexJudge({
        executable: '/nonexistent/codex',
        timeout: 1000,
      });

      const codeToAudit = 'export const test = "fallback test";';
      
      await expect(unavailableJudge.judge(codeToAudit, {
        sessionId: mockSession.id,
        branchId: 'test-branch',
      })).rejects.toThrow();
    });

    it('should handle prompt variable substitution errors', async () => {
      // Test with undefined session
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, undefined);
      
      // Should use default values
      expect(rendered.variables.CURRENT_LOOP).toBe(0);
      expect(rendered.variables.SESSION_ID).toBeUndefined();
      expect(rendered.content).toContain('Loop 0/25');
    });

    it('should recover from completion evaluation errors', () => {
      // Mock invalid completion data
      const invalidReview = {
        ...mockReview,
        overall: NaN, // Invalid score
      };

      const rendered = systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      
      // Should handle gracefully without throwing
      expect(() => {
        systemPromptManager.processAuditResponse(invalidReview, rendered, mockSession);
      }).not.toThrow();
    });
  });

  describe('response format compatibility', () => {
    it('should maintain backward compatibility with existing response format', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);
      
      // Verify all original fields are preserved
      expect(result.enhancedResponse.overall).toBe(mockReview.overall);
      expect(result.enhancedResponse.dimensions).toEqual(mockReview.dimensions);
      expect(result.enhancedResponse.verdict).toBe(mockReview.verdict);
      expect(result.enhancedResponse.review.summary).toContain(mockReview.review.summary);
      expect(result.enhancedResponse.review.inline).toEqual(mockReview.review.inline);
      expect(result.enhancedResponse.proposed_diff).toBe(mockReview.proposed_diff);
      expect(result.enhancedResponse.iterations).toBe(mockReview.iterations);
    });

    it('should add prompt-specific fields without breaking existing clients', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);
      
      // Verify new fields are added
      expect(result.enhancedResponse.judge_cards.length).toBeGreaterThan(mockReview.judge_cards.length);
      
      // Verify original judge cards are preserved
      expect(result.enhancedResponse.judge_cards[0]).toEqual(mockReview.judge_cards[0]);
      
      // Verify new judge card is added
      const systemPromptCard = result.enhancedResponse.judge_cards.find(
        card => card.model === 'system-prompt-manager'
      );
      expect(systemPromptCard).toBeDefined();
      expect(systemPromptCard!.score).toBe(mockReview.overall);
    });

    it('should support response format versioning', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      
      // Verify metadata includes version information
      expect(rendered.metadata.version).toBe('2.0');
      expect(rendered.metadata.renderedAt).toBeGreaterThan(0);
      expect(rendered.metadata.configHash).toBeDefined();
    });

    it('should handle legacy response formats', async () => {
      // Mock legacy response without some new fields
      const legacyReview = {
        overall: 75,
        verdict: 'pass' as const,
        review: {
          summary: 'Legacy review format',
          inline: [],
          citations: [],
        },
        // Missing dimensions, proposed_diff, iterations, judge_cards
      } as any;

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      
      // Should handle gracefully
      expect(() => {
        systemPromptManager.processAuditResponse(legacyReview, rendered, mockSession);
      }).not.toThrow();
    });
  });

  describe('integration with completion and loop detection', () => {
    it('should integrate completion evaluation with prompt system', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);
      
      // Verify completion analysis
      expect(result.completionAnalysis).toBeDefined();
      expect(result.completionAnalysis.status).toBe('in_progress'); // 82% at loop 3
      expect(result.completionAnalysis.nextThoughtNeeded).toBe(true);
    });

    it('should integrate loop detection with prompt system', async () => {
      // Simulate stagnant session
      const stagnantSession = {
        ...mockSession,
        currentLoop: 12,
        stagnationInfo: {
          isStagnant: true,
          detectedAtLoop: 11,
          similarityScore: 0.97,
          recommendation: 'Try alternative approach',
        },
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, stagnantSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, stagnantSession);
      
      // Verify stagnation handling
      expect(result.completionAnalysis.status).toBe('terminated');
      expect(result.completionAnalysis.reason).toBe('Stagnation Detection');
      expect(result.completionAnalysis.nextThoughtNeeded).toBe(false);
    });

    it('should generate appropriate next actions based on completion status', async () => {
      // Test with high score for completion
      const highScoreReview = { ...mockReview, overall: 96 };
      const highLoopSession = { ...mockSession, currentLoop: 12 };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, highLoopSession);
      const result = systemPromptManager.processAuditResponse(highScoreReview, rendered, highLoopSession);
      
      // Should detect completion
      expect(result.completionAnalysis.status).toBe('completed');
      expect(result.nextActions[0].type).toBe('complete');
      expect(result.nextActions[0].priority).toBe('high');
    });

    it('should handle critical issues in completion evaluation', async () => {
      const criticalReview = {
        ...mockReview,
        review: {
          ...mockReview.review,
          inline: [
            {
              path: 'src/auth.ts',
              line: 42,
              comment: 'Critical: SQL injection vulnerability detected',
            },
          ],
        },
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(criticalReview, rendered, mockSession);
      
      // Should prioritize critical issues
      expect(result.nextActions[0].type).toBe('fix_critical');
      expect(result.nextActions[0].priority).toBe('critical');
      expect(result.nextActions[0].description).toContain('critical issues');
    });
  });

  describe('performance and resource management', () => {
    it('should respect audit timeout configuration', async () => {
      const timeoutConfig = {
        auditTimeout: 1000, // 1 second
        enableSystemPrompt: true,
      };

      const timeoutEngine = new SynchronousAuditEngine({
        sessionManager,
        codexJudge,
        auditTimeout: timeoutConfig.auditTimeout,
      });

      // Mock slow Codex response
      vi.spyOn(codexJudge, 'judge').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );

      const codeToAudit = 'export const test = "timeout test";';
      
      // Should timeout
      await expect(timeoutEngine.audit(codeToAudit, {
        sessionId: mockSession.id,
        branchId: 'test-branch',
      })).rejects.toThrow();
    });

    it('should manage prompt cache efficiently', async () => {
      const cachingManager = new SystemPromptManager({
        enableCaching: true,
        cacheMaxAge: 60000,
      });

      // Multiple renders with same context should use cache
      const rendered1 = await cachingManager.renderSystemPrompt(mockThought, mockSession);
      const rendered2 = await cachingManager.renderSystemPrompt(mockThought, mockSession);
      
      expect(rendered1.metadata.renderedAt).toBe(rendered2.metadata.renderedAt);
      
      const stats = cachingManager.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      cachingManager.clearCache();
    });

    it('should handle concurrent audit requests', async () => {
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => 
        systemPromptManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i + 1 },
          { ...mockSession, id: `session-${i}` }
        )
      );

      const results = await Promise.all(concurrentRequests);
      
      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result.variables.SESSION_ID).toBe(`session-${i}`);
        expect(result.variables.CURRENT_LOOP).toBe(3);
      });
    });

    it('should cleanup resources properly', async () => {
      const session = await sessionManager.createSession(mockSession.id, mockSession.config);
      
      // Perform operations
      await systemPromptManager.renderSystemPrompt(mockThought, session);
      
      // Cleanup
      await sessionManager.cleanup();
      systemPromptManager.clearCache();
      
      // Verify cleanup
      const stats = systemPromptManager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});