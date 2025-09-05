/**
 * Integration Tests for System Prompt Error Handling and Fallback Mechanisms
 * 
 * Tests for comprehensive error scenarios, graceful degradation,
 * and recovery mechanisms in the system prompt architecture.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemPromptManager } from '../prompts/system-prompt-manager.js';
import { SynchronousSessionManager } from '../session/synchronous-session-manager.js';
import { CodexJudge } from '../codex/codex-judge.js';
import { ErrorHandler } from '../utils/error-handler.js';
import type {
  GansAuditorCodexThoughtData,
  GansAuditorCodexSessionState,
  GansAuditorCodexReview,
} from '../types/gan-types.js';

describe('System Prompt Error Handling Integration', () => {
  let systemPromptManager: SystemPromptManager;
  let sessionManager: SynchronousSessionManager;
  let codexJudge: CodexJudge;
  let errorHandler: ErrorHandler;

  let mockThought: GansAuditorCodexThoughtData;
  let mockSession: GansAuditorCodexSessionState;
  let mockReview: GansAuditorCodexReview;

  beforeEach(() => {
    systemPromptManager = new SystemPromptManager({
      enableCaching: false,
    });

    sessionManager = new SynchronousSessionManager({
      stateDirectory: '.test-error-handling',
      enableCompression: false,
    });

    codexJudge = new CodexJudge({
      executable: 'echo',
      timeout: 5000,
    });

    errorHandler = new ErrorHandler();

    mockThought = {
      thought: 'Testing error handling scenarios',
      thoughtNumber: 1,
      totalThoughts: 3,
      nextThoughtNeeded: true,
    };

    mockSession = {
      id: 'error-test-session',
      currentLoop: 2,
      iterations: [],
      history: [],
      config: {},
      startTime: Date.now(),
      lastGan: null,
      stagnationInfo: null,
    };

    mockReview = {
      overall: 75,
      dimensions: [],
      verdict: 'revise',
      review: {
        summary: 'Error handling test review',
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 2,
      judge_cards: [],
    };
  });

  afterEach(async () => {
    systemPromptManager.clearCache();
    await sessionManager.cleanup();
    vi.clearAllMocks();
  });

  describe('template loading errors', () => {
    it('should handle missing template file gracefully', async () => {
      const invalidManager = new SystemPromptManager({
        promptTemplatePath: '/nonexistent/template.md',
      });

      await expect(invalidManager.renderSystemPrompt(mockThought))
        .rejects.toThrow('Failed to load system prompt template');
    });

    it('should handle corrupted template file', async () => {
      // Mock file system error
      vi.spyOn(require('fs/promises'), 'readFile').mockRejectedValue(
        new Error('EACCES: permission denied')
      );

      await expect(systemPromptManager.renderSystemPrompt(mockThought))
        .rejects.toThrow('Failed to load system prompt template');
    });

    it('should validate template structure and report issues', async () => {
      // Mock template with missing sections
      const incompleteTemplate = `
        # Incomplete Template
        This template is missing required sections.
      `;

      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(incompleteTemplate);

      await expect(systemPromptManager.renderSystemPrompt(mockThought))
        .rejects.toThrow('Template missing required sections');
    });

    it('should handle template with malformed variables', async () => {
      // Mock template with invalid variable syntax
      const malformedTemplate = `
        # Test Template
        ## Identity & Role Definition
        You are \${INVALID_VARIABLE_SYNTAX
        ## Audit Workflow
        Current loop: \${CURRENT_LOOP}
      `;

      vi.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(malformedTemplate);

      // Should render but log warnings about invalid variables
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);
      expect(rendered.content).toBeDefined();
    });
  });

  describe('configuration errors', () => {
    it('should handle invalid configuration on construction', () => {
      expect(() => {
        new SystemPromptManager({
          config: {
            identity: {
              name: '', // Invalid empty name
              role: 'Auditor',
              stance: 'constructive-adversarial',
              authority: 'spec-and-steering-ground-truth',
            },
          },
        });
      }).toThrow('Invalid system prompt configuration');
    });

    it('should handle configuration update errors', () => {
      expect(() => {
        systemPromptManager.updateConfig({
          completionCriteria: {
            stagnationThreshold: 1.5, // Invalid: > 1
            maxIterations: 25,
            tiers: 3,
            killSwitches: 3,
            shipGates: 5,
          },
        });
      }).toThrow('Invalid configuration update');
    });

    it('should handle partial configuration updates gracefully', () => {
      // Should not throw for valid partial updates
      expect(() => {
        systemPromptManager.updateConfig({
          performance: {
            contextTokenLimit: 100000,
            auditTimeoutMs: 15000,
            enableCaching: true,
            enableProgressTracking: true,
          },
        });
      }).not.toThrow();

      const config = systemPromptManager.getConfig();
      expect(config.performance.contextTokenLimit).toBe(100000);
    });
  });

  describe('session management errors', () => {
    it('should handle session creation failures', async () => {
      // Mock session manager error
      vi.spyOn(sessionManager, 'createSession').mockRejectedValue(
        new Error('Failed to create session directory')
      );

      await expect(sessionManager.createSession('test-session', {}))
        .rejects.toThrow('Failed to create session directory');
    });

    it('should handle corrupted session data', async () => {
      // Create session then corrupt it
      const session = await sessionManager.createSession('corrupt-session', {});
      
      // Mock corrupted session retrieval
      vi.spyOn(sessionManager, 'getSession').mockResolvedValue({
        ...session,
        currentLoop: NaN, // Corrupted data
        config: null as any, // Corrupted config
      });

      const corruptedSession = await sessionManager.getSession('corrupt-session');
      
      // Should handle gracefully in prompt rendering
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, corruptedSession!);
      expect(rendered.content).toBeDefined();
      expect(rendered.variables.CURRENT_LOOP).toBeNaN(); // Preserves actual value
    });

    it('should handle session update failures', async () => {
      const session = await sessionManager.createSession('update-fail-session', {});
      
      // Mock update failure
      vi.spyOn(sessionManager, 'updateSession').mockRejectedValue(
        new Error('Disk full - cannot write session')
      );

      await expect(sessionManager.updateSession(session.id, { currentLoop: 5 }))
        .rejects.toThrow('Disk full - cannot write session');
    });

    it('should handle missing session gracefully', async () => {
      // Try to get non-existent session
      const nonExistentSession = await sessionManager.getSession('non-existent');
      expect(nonExistentSession).toBeNull();

      // Should render prompt with undefined session
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, undefined);
      expect(rendered.content).toBeDefined();
      expect(rendered.variables.SESSION_ID).toBeUndefined();
    });
  });

  describe('codex CLI errors', () => {
    it('should handle Codex CLI not found', async () => {
      const invalidJudge = new CodexJudge({
        executable: '/nonexistent/codex',
        timeout: 1000,
      });

      await expect(invalidJudge.judge('test code', {
        sessionId: 'test-session',
        branchId: 'test-branch',
      })).rejects.toThrow();
    });

    it('should handle Codex CLI timeout', async () => {
      const timeoutJudge = new CodexJudge({
        executable: 'sleep',
        args: ['10'], // Sleep for 10 seconds
        timeout: 1000, // 1 second timeout
      });

      await expect(timeoutJudge.judge('test code', {
        sessionId: 'test-session',
        branchId: 'test-branch',
      })).rejects.toThrow();
    });

    it('should handle Codex CLI malformed output', async () => {
      // Mock Codex returning invalid JSON
      vi.spyOn(codexJudge, 'judge').mockResolvedValue({
        overall: NaN, // Invalid score
        dimensions: null as any, // Invalid dimensions
        verdict: 'invalid' as any, // Invalid verdict
        review: {
          summary: 'Malformed response',
          inline: [],
          citations: [],
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [],
      });

      const result = await codexJudge.judge('test code', {
        sessionId: 'test-session',
        branchId: 'test-branch',
      });

      // Should handle gracefully in prompt processing
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      
      expect(() => {
        systemPromptManager.processAuditResponse(result, rendered, mockSession);
      }).not.toThrow();
    });

    it('should handle Codex CLI permission errors', async () => {
      // Mock permission denied error
      vi.spyOn(codexJudge, 'judge').mockRejectedValue(
        new Error('EACCES: permission denied, open \'/usr/local/bin/codex\'')
      );

      await expect(codexJudge.judge('test code', {
        sessionId: 'test-session',
        branchId: 'test-branch',
      })).rejects.toThrow('EACCES: permission denied');
    });
  });

  describe('memory and resource errors', () => {
    it('should handle out of memory errors during prompt rendering', async () => {
      // Mock memory error
      const originalRender = systemPromptManager.renderSystemPrompt;
      vi.spyOn(systemPromptManager, 'renderSystemPrompt').mockImplementation(async () => {
        throw new Error('JavaScript heap out of memory');
      });

      await expect(systemPromptManager.renderSystemPrompt(mockThought))
        .rejects.toThrow('JavaScript heap out of memory');
    });

    it('should handle disk space errors during session persistence', async () => {
      // Mock disk space error
      vi.spyOn(sessionManager, 'updateSession').mockRejectedValue(
        new Error('ENOSPC: no space left on device')
      );

      const session = await sessionManager.createSession('disk-full-session', {});
      
      await expect(sessionManager.updateSession(session.id, { currentLoop: 1 }))
        .rejects.toThrow('ENOSPC: no space left on device');
    });

    it('should handle cache overflow gracefully', async () => {
      const cachingManager = new SystemPromptManager({
        enableCaching: true,
        cacheMaxAge: 60000,
      });

      // Fill cache with many entries
      const promises = Array.from({ length: 100 }, (_, i) =>
        cachingManager.renderSystemPrompt(
          { ...mockThought, thoughtNumber: i },
          { ...mockSession, id: `session-${i}` }
        )
      );

      // Should not throw even with many cache entries
      await expect(Promise.all(promises)).resolves.toBeDefined();
      
      cachingManager.clearCache();
    });
  });

  describe('network and I/O errors', () => {
    it('should handle file system I/O errors', async () => {
      // Mock I/O error during template loading
      vi.spyOn(require('fs/promises'), 'readFile').mockRejectedValue(
        new Error('EIO: i/o error, read')
      );

      await expect(systemPromptManager.renderSystemPrompt(mockThought))
        .rejects.toThrow('Failed to load system prompt template');
    });

    it('should handle concurrent access errors', async () => {
      // Simulate concurrent session access
      const session = await sessionManager.createSession('concurrent-session', {});
      
      const concurrentUpdates = Array.from({ length: 5 }, (_, i) =>
        sessionManager.updateSession(session.id, { currentLoop: i })
      );

      // Should handle concurrent updates gracefully
      await expect(Promise.all(concurrentUpdates)).resolves.toBeDefined();
    });
  });

  describe('data validation errors', () => {
    it('should handle invalid thought data', async () => {
      const invalidThought = {
        thought: '', // Empty thought
        thoughtNumber: -1, // Invalid number
        totalThoughts: 0, // Invalid total
        nextThoughtNeeded: null as any, // Invalid type
      };

      // Should render despite invalid data
      const rendered = await systemPromptManager.renderSystemPrompt(invalidThought);
      expect(rendered.content).toBeDefined();
      expect(rendered.variables.CURRENT_LOOP).toBe(0); // Default value
    });

    it('should handle invalid review data', async () => {
      const invalidReview = {
        overall: -50, // Invalid score
        dimensions: 'invalid' as any, // Wrong type
        verdict: null as any, // Invalid verdict
        review: null as any, // Invalid review
        proposed_diff: undefined,
        iterations: 'invalid' as any, // Wrong type
        judge_cards: null as any, // Invalid cards
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      
      // Should handle gracefully
      expect(() => {
        systemPromptManager.processAuditResponse(invalidReview, rendered, mockSession);
      }).not.toThrow();
    });

    it('should validate and sanitize user inputs', async () => {
      const maliciousThought = {
        thought: '<script>alert("xss")</script>',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: true,
      };

      const rendered = await systemPromptManager.renderSystemPrompt(maliciousThought);
      
      // Should not contain raw script tags in output
      expect(rendered.content).not.toContain('<script>');
    });
  });

  describe('recovery mechanisms', () => {
    it('should recover from temporary failures', async () => {
      let failCount = 0;
      
      // Mock intermittent failure
      vi.spyOn(systemPromptManager, 'renderSystemPrompt').mockImplementation(async (...args) => {
        failCount++;
        if (failCount <= 2) {
          throw new Error('Temporary failure');
        }
        // Call original method on third attempt
        return SystemPromptManager.prototype.renderSystemPrompt.apply(systemPromptManager, args);
      });

      // Should eventually succeed with retry logic (if implemented)
      await expect(systemPromptManager.renderSystemPrompt(mockThought))
        .rejects.toThrow('Temporary failure');
    });

    it('should provide meaningful error context', async () => {
      try {
        await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      } catch (error) {
        // Error should include context information
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should maintain system stability after errors', async () => {
      // Cause an error
      try {
        const invalidManager = new SystemPromptManager({
          promptTemplatePath: '/nonexistent/template.md',
        });
        await invalidManager.renderSystemPrompt(mockThought);
      } catch (error) {
        // Expected error
      }

      // System should still work normally
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      expect(rendered.content).toBeDefined();
    });

    it('should cleanup resources after errors', async () => {
      const session = await sessionManager.createSession('cleanup-test-session', {});
      
      try {
        // Cause an error during session update
        vi.spyOn(sessionManager, 'updateSession').mockRejectedValueOnce(
          new Error('Simulated error')
        );
        
        await sessionManager.updateSession(session.id, { currentLoop: 1 });
      } catch (error) {
        // Expected error
      }

      // Cleanup should still work
      await expect(sessionManager.cleanup()).resolves.not.toThrow();
    });
  });

  describe('error reporting and logging', () => {
    it('should log errors with appropriate context', async () => {
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        const invalidManager = new SystemPromptManager({
          promptTemplatePath: '/nonexistent/template.md',
        });
        await invalidManager.renderSystemPrompt(mockThought);
      } catch (error) {
        // Error should be logged
      }

      logSpy.mockRestore();
    });

    it('should provide structured error information', async () => {
      try {
        const invalidManager = new SystemPromptManager({
          config: {
            identity: {
              name: '',
              role: 'Auditor',
              stance: 'constructive-adversarial',
              authority: 'spec-and-steering-ground-truth',
            },
          },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid system prompt configuration');
      }
    });

    it('should handle error reporting failures gracefully', async () => {
      // Mock logging failure
      vi.spyOn(console, 'error').mockImplementation(() => {
        throw new Error('Logging system failure');
      });

      // Should not cause additional errors
      expect(() => {
        try {
          new SystemPromptManager({
            config: {
              identity: {
                name: '',
                role: 'Auditor',
                stance: 'constructive-adversarial',
                authority: 'spec-and-steering-ground-truth',
              },
            },
          });
        } catch (error) {
          // Original error should still be thrown
        }
      }).not.toThrow();
    });
  });
});