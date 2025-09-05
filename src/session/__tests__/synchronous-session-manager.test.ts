/**
 * Tests for SynchronousSessionManager
 * 
 * Tests the enhanced session management capabilities for synchronous audit workflow
 * including iteration tracking, progress analysis, stagnation detection, and
 * Codex context window management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { 
  SynchronousSessionManager, 
  DEFAULT_SYNCHRONOUS_SESSION_MANAGER_CONFIG,
  type SynchronousSessionManagerConfig 
} from '../synchronous-session-manager.js';
import type {
  GansAuditorCodexSessionState,
  GansAuditorCodexSessionConfig,
  IterationData,
  GansAuditorCodexReview,
} from '../../types/gan-types.js';
import { DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG } from '../../types/gan-types.js';

// Mock child_process
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

describe('SynchronousSessionManager', () => {
  let sessionManager: SynchronousSessionManager;
  let testStateDir: string;
  let testConfig: SynchronousSessionManagerConfig;

  beforeEach(async () => {
    // Create temporary directory for test state
    testStateDir = join(tmpdir(), `test-sync-session-${Date.now()}`);
    await fs.mkdir(testStateDir, { recursive: true });

    testConfig = {
      ...DEFAULT_SYNCHRONOUS_SESSION_MANAGER_CONFIG,
      stateDirectory: testStateDir,
      cleanupInterval: 1000000, // Disable automatic cleanup during tests
    };

    sessionManager = new SynchronousSessionManager(testConfig);
  });

  afterEach(async () => {
    sessionManager.destroy();
    
    // Clean up test directory
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('getOrCreateSession', () => {
    it('should create new session with enhanced schema', async () => {
      const sessionId = 'test-session-1';
      const loopId = 'loop-123';

      const session = await sessionManager.getOrCreateSession(sessionId, loopId);

      expect(session).toMatchObject({
        id: sessionId,
        loopId,
        iterations: [],
        currentLoop: 0,
        isComplete: false,
        codexContextActive: false,
      });
      expect(session.createdAt).toBeTypeOf('number');
      expect(session.updatedAt).toBeTypeOf('number');
    });

    it('should return existing session and update loopId', async () => {
      const sessionId = 'test-session-2';
      const initialLoopId = 'loop-initial';
      const newLoopId = 'loop-updated';

      // Create initial session
      const initialSession = await sessionManager.getOrCreateSession(sessionId, initialLoopId);
      expect(initialSession.loopId).toBe(initialLoopId);

      // Get session with new loopId
      const updatedSession = await sessionManager.getOrCreateSession(sessionId, newLoopId);
      expect(updatedSession.loopId).toBe(newLoopId);
      expect(updatedSession.id).toBe(sessionId);
    });

    it('should work without loopId', async () => {
      const sessionId = 'test-session-3';

      const session = await sessionManager.getOrCreateSession(sessionId);

      expect(session.id).toBe(sessionId);
      expect(session.loopId).toBeUndefined();
    });
  });

  describe('addIteration', () => {
    it('should add iteration data to session', async () => {
      const sessionId = 'test-session-4';
      const session = await sessionManager.getOrCreateSession(sessionId);

      const mockReview: GansAuditorCodexReview = {
        overall: 85,
        dimensions: [{ name: 'accuracy', score: 85 }],
        verdict: 'revise',
        review: {
          summary: 'Test review',
          inline: [],
          citations: [],
        },
        iterations: 1,
        judge_cards: [],
      };

      const iteration: IterationData = {
        thoughtNumber: 1,
        code: 'console.log("test");',
        auditResult: mockReview,
        timestamp: Date.now(),
      };

      await sessionManager.addIteration(sessionId, iteration);

      const updatedSession = await sessionManager.getSession(sessionId);
      expect(updatedSession?.iterations).toHaveLength(1);
      expect(updatedSession?.iterations[0]).toEqual(iteration);
      expect(updatedSession?.currentLoop).toBe(1);
    });

    it('should handle multiple iterations', async () => {
      const sessionId = 'test-session-5';
      await sessionManager.getOrCreateSession(sessionId);

      const mockReview1: GansAuditorCodexReview = {
        overall: 70,
        dimensions: [{ name: 'accuracy', score: 70 }],
        verdict: 'revise',
        review: { summary: 'First review', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      };

      const mockReview2: GansAuditorCodexReview = {
        overall: 85,
        dimensions: [{ name: 'accuracy', score: 85 }],
        verdict: 'revise',
        review: { summary: 'Second review', inline: [], citations: [] },
        iterations: 2,
        judge_cards: [],
      };

      const iteration1: IterationData = {
        thoughtNumber: 1,
        code: 'console.log("test1");',
        auditResult: mockReview1,
        timestamp: Date.now(),
      };

      const iteration2: IterationData = {
        thoughtNumber: 2,
        code: 'console.log("test2");',
        auditResult: mockReview2,
        timestamp: Date.now() + 1000,
      };

      await sessionManager.addIteration(sessionId, iteration1);
      await sessionManager.addIteration(sessionId, iteration2);

      const session = await sessionManager.getSession(sessionId);
      expect(session?.iterations).toHaveLength(2);
      expect(session?.currentLoop).toBe(2);
    });
  });

  describe('analyzeProgress', () => {
    it('should analyze progress with score progression', async () => {
      const sessionId = 'test-session-6';
      await sessionManager.getOrCreateSession(sessionId);

      // Add iterations with improving scores
      const scores = [60, 70, 80, 85];
      for (let i = 0; i < scores.length; i++) {
        const mockReview: GansAuditorCodexReview = {
          overall: scores[i],
          dimensions: [{ name: 'accuracy', score: scores[i] }],
          verdict: 'revise',
          review: { summary: `Review ${i + 1}`, inline: [], citations: [] },
          iterations: i + 1,
          judge_cards: [],
        };

        const iteration: IterationData = {
          thoughtNumber: i + 1,
          code: `console.log("test${i + 1}");`,
          auditResult: mockReview,
          timestamp: Date.now() + i * 1000,
        };

        await sessionManager.addIteration(sessionId, iteration);
      }

      const progress = await sessionManager.analyzeProgress(sessionId);

      expect(progress.currentLoop).toBe(4);
      expect(progress.scoreProgression).toEqual(scores);
      expect(progress.averageImprovement).toBeCloseTo(8.33, 1); // (10+10+5)/3
      expect(progress.isStagnant).toBe(false);
    });

    it('should handle single iteration', async () => {
      const sessionId = 'test-session-7';
      await sessionManager.getOrCreateSession(sessionId);

      const mockReview: GansAuditorCodexReview = {
        overall: 75,
        dimensions: [{ name: 'accuracy', score: 75 }],
        verdict: 'revise',
        review: { summary: 'Single review', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      };

      const iteration: IterationData = {
        thoughtNumber: 1,
        code: 'console.log("test");',
        auditResult: mockReview,
        timestamp: Date.now(),
      };

      await sessionManager.addIteration(sessionId, iteration);

      const progress = await sessionManager.analyzeProgress(sessionId);

      expect(progress.currentLoop).toBe(1);
      expect(progress.scoreProgression).toEqual([75]);
      expect(progress.averageImprovement).toBe(0);
      expect(progress.isStagnant).toBe(false);
    });
  });

  describe('detectStagnation', () => {
    it('should not detect stagnation with insufficient iterations', async () => {
      const sessionId = 'test-session-8';
      await sessionManager.getOrCreateSession(sessionId);

      // Add only a few iterations (less than stagnationStartLoop)
      for (let i = 0; i < 5; i++) {
        const mockReview: GansAuditorCodexReview = {
          overall: 75,
          dimensions: [{ name: 'accuracy', score: 75 }],
          verdict: 'revise',
          review: { summary: `Review ${i + 1}`, inline: [], citations: [] },
          iterations: i + 1,
          judge_cards: [],
        };

        const iteration: IterationData = {
          thoughtNumber: i + 1,
          code: `console.log("test${i + 1}");`,
          auditResult: mockReview,
          timestamp: Date.now() + i * 1000,
        };

        await sessionManager.addIteration(sessionId, iteration);
      }

      const stagnation = await sessionManager.detectStagnation(sessionId);

      expect(stagnation.isStagnant).toBe(false);
      expect(stagnation.recommendation).toContain('Not enough iterations');
    });

    it('should detect stagnation with similar code', async () => {
      const sessionId = 'test-session-9';
      await sessionManager.getOrCreateSession(sessionId);

      // Add enough iterations to trigger stagnation check
      const sameCode = 'console.log("identical code");';
      for (let i = 0; i < 12; i++) {
        const mockReview: GansAuditorCodexReview = {
          overall: 75,
          dimensions: [{ name: 'accuracy', score: 75 }],
          verdict: 'revise',
          review: { summary: `Review ${i + 1}`, inline: [], citations: [] },
          iterations: i + 1,
          judge_cards: [],
        };

        const iteration: IterationData = {
          thoughtNumber: i + 1,
          code: i >= 9 ? sameCode : `console.log("test${i + 1}");`, // Last 3 are identical
          auditResult: mockReview,
          timestamp: Date.now() + i * 1000,
        };

        await sessionManager.addIteration(sessionId, iteration);
      }

      const stagnation = await sessionManager.detectStagnation(sessionId);

      expect(stagnation.isStagnant).toBe(true);
      expect(stagnation.similarityScore).toBeGreaterThan(0.95);
      expect(stagnation.recommendation).toContain('Stagnation detected');
    });

    it('should not detect stagnation with different code', async () => {
      const sessionId = 'test-session-10';
      await sessionManager.getOrCreateSession(sessionId);

      // Add iterations with significantly different code
      const differentCodes = [
        'function add(a, b) { return a + b; }',
        'const multiply = (x, y) => x * y;',
        'class Calculator { divide(a, b) { return a / b; } }',
        'let result = Math.sqrt(16);',
        'const array = [1, 2, 3].map(x => x * 2);',
        'async function fetchData() { return await fetch("/api"); }',
        'const obj = { name: "test", value: 42 };',
        'for (let i = 0; i < 10; i++) { console.log(i); }',
        'const regex = /[a-z]+/g;',
        'try { JSON.parse(data); } catch (e) { console.error(e); }',
        'const promise = new Promise(resolve => resolve("done"));',
        'export default function Component() { return <div>Hello</div>; }',
      ];

      for (let i = 0; i < 12; i++) {
        const mockReview: GansAuditorCodexReview = {
          overall: 75 + i,
          dimensions: [{ name: 'accuracy', score: 75 + i }],
          verdict: 'revise',
          review: { summary: `Review ${i + 1}`, inline: [], citations: [] },
          iterations: i + 1,
          judge_cards: [],
        };

        const iteration: IterationData = {
          thoughtNumber: i + 1,
          code: differentCodes[i],
          auditResult: mockReview,
          timestamp: Date.now() + i * 1000,
        };

        await sessionManager.addIteration(sessionId, iteration);
      }

      const stagnation = await sessionManager.detectStagnation(sessionId);

      expect(stagnation.isStagnant).toBe(false);
      expect(stagnation.similarityScore).toBeLessThan(0.95);
    });
  });

  describe('Codex context management', () => {
    beforeEach(() => {
      // Mock execFile for Codex CLI calls
      vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
        const argsArray = args as string[];
        
        if (argsArray.includes('context') && argsArray.includes('start')) {
          // Mock successful context start
          const contextId = `ctx-${Date.now()}`;
          if (callback) callback(null, { stdout: contextId, stderr: '' });
        } else if (argsArray.includes('context') && argsArray.includes('maintain')) {
          // Mock successful context maintenance
          if (callback) callback(null, { stdout: 'maintained', stderr: '' });
        } else if (argsArray.includes('context') && argsArray.includes('terminate')) {
          // Mock successful context termination
          if (callback) callback(null, { stdout: 'terminated', stderr: '' });
        } else if (argsArray.includes('context') && argsArray.includes('status')) {
          // Mock successful context status check
          if (callback) callback(null, { stdout: 'active', stderr: '' });
        } else {
          // Mock unknown command
          if (callback) callback(new Error('Unknown command'), { stdout: '', stderr: 'Unknown command' });
        }
      });
    });

    it('should start Codex context', async () => {
      const loopId = 'test-loop-1';
      
      const contextId = await sessionManager.startCodexContext(loopId);
      
      expect(contextId).toMatch(/^ctx-\d+$/);
      expect(sessionManager.isContextActive(loopId)).toBe(true);
      expect(sessionManager.getContextId(loopId)).toBe(contextId);
    });

    it('should return existing context if already active', async () => {
      const loopId = 'test-loop-2';
      
      const contextId1 = await sessionManager.startCodexContext(loopId);
      const contextId2 = await sessionManager.startCodexContext(loopId);
      
      expect(contextId1).toBe(contextId2);
    });

    it('should maintain Codex context', async () => {
      const loopId = 'test-loop-3';
      const contextId = await sessionManager.startCodexContext(loopId);
      
      await expect(sessionManager.maintainCodexContext(loopId, contextId)).resolves.not.toThrow();
    });

    it('should handle maintain with invalid context', async () => {
      const loopId = 'test-loop-4';
      const invalidContextId = 'invalid-context';
      
      // Should not throw, just log warning
      await expect(sessionManager.maintainCodexContext(loopId, invalidContextId)).resolves.not.toThrow();
    });

    it('should terminate Codex context', async () => {
      const loopId = 'test-loop-5';
      const contextId = await sessionManager.startCodexContext(loopId);
      
      expect(sessionManager.isContextActive(loopId)).toBe(true);
      
      await sessionManager.terminateCodexContext(loopId, 'completion');
      
      expect(sessionManager.isContextActive(loopId)).toBe(false);
      expect(sessionManager.getContextId(loopId)).toBeUndefined();
    });

    it('should handle terminate without active context', async () => {
      const loopId = 'test-loop-6';
      
      // Should not throw when no context exists
      await expect(sessionManager.terminateCodexContext(loopId, 'manual')).resolves.not.toThrow();
    });

    it('should get active contexts', async () => {
      const loopId1 = 'test-loop-7';
      const loopId2 = 'test-loop-8';
      
      const contextId1 = await sessionManager.startCodexContext(loopId1);
      const contextId2 = await sessionManager.startCodexContext(loopId2);
      
      const activeContexts = sessionManager.getActiveContexts();
      
      expect(activeContexts.size).toBe(2);
      expect(activeContexts.get(loopId1)).toBe(contextId1);
      expect(activeContexts.get(loopId2)).toBe(contextId2);
    });

    it('should terminate all contexts', async () => {
      const loopId1 = 'test-loop-9';
      const loopId2 = 'test-loop-10';
      
      await sessionManager.startCodexContext(loopId1);
      await sessionManager.startCodexContext(loopId2);
      
      expect(sessionManager.getActiveContexts().size).toBe(2);
      
      await sessionManager.terminateAllContexts('manual');
      
      expect(sessionManager.getActiveContexts().size).toBe(0);
    });

    it('should cleanup stale contexts', async () => {
      const loopId = 'test-loop-11';
      await sessionManager.startCodexContext(loopId);
      
      // Mock status check to fail (indicating stale context)
      vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
        const argsArray = args as string[];
        if (argsArray.includes('status')) {
          if (callback) callback(new Error('context not found'), { stdout: '', stderr: 'context not found' });
        }
      });
      
      expect(sessionManager.isContextActive(loopId)).toBe(true);
      
      await sessionManager.cleanupStaleContexts();
      
      expect(sessionManager.isContextActive(loopId)).toBe(false);
    });

    it('should handle session timeout', async () => {
      const sessionId = 'timeout-session';
      const loopId = 'timeout-loop';
      
      // Create session with active context
      const session = await sessionManager.getOrCreateSession(sessionId, loopId);
      const contextId = await sessionManager.startCodexContext(loopId);
      session.codexContextId = contextId;
      session.codexContextActive = true;
      await sessionManager.updateSession(session);
      
      await sessionManager.handleSessionTimeout(sessionId);
      
      const updatedSession = await sessionManager.getSession(sessionId);
      expect(updatedSession?.codexContextActive).toBe(false);
      expect(updatedSession?.codexContextId).toBeUndefined();
      expect(sessionManager.isContextActive(loopId)).toBe(false);
    });

    it('should handle session failure', async () => {
      const sessionId = 'failure-session';
      const loopId = 'failure-loop';
      
      // Create session with active context
      const session = await sessionManager.getOrCreateSession(sessionId, loopId);
      const contextId = await sessionManager.startCodexContext(loopId);
      session.codexContextId = contextId;
      session.codexContextActive = true;
      await sessionManager.updateSession(session);
      
      const error = new Error('Test failure');
      await sessionManager.handleSessionFailure(sessionId, error);
      
      const updatedSession = await sessionManager.getSession(sessionId);
      expect(updatedSession?.codexContextActive).toBe(false);
      expect(updatedSession?.codexContextId).toBeUndefined();
      expect(sessionManager.isContextActive(loopId)).toBe(false);
    });

    it('should handle Codex CLI errors gracefully', async () => {
      const loopId = 'error-loop';
      
      // Mock execFile to fail
      vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
        if (callback) callback(new Error('Codex CLI not available'), { stdout: '', stderr: 'Command not found' });
      });
      
      await expect(sessionManager.startCodexContext(loopId)).rejects.toThrow('Failed to start Codex context');
    });
  });

  describe('session migration', () => {
    it('should migrate legacy session to enhanced schema', async () => {
      const sessionId = 'legacy-session';
      
      // Create a legacy session manually (without enhanced fields)
      const legacySession = {
        id: sessionId,
        config: DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Write legacy session directly to file
      const sessionPath = join(testStateDir, `${sessionId}.json`);
      await fs.writeFile(sessionPath, JSON.stringify(legacySession, null, 2));

      // Get session should migrate it
      const session = await sessionManager.getSession(sessionId);

      expect(session).toMatchObject({
        id: sessionId,
        iterations: [],
        currentLoop: 0,
        isComplete: false,
        codexContextActive: false,
      });
    });
  });

  describe('error handling', () => {
    it('should throw SessionNotFoundError for non-existent session', async () => {
      await expect(sessionManager.analyzeProgress('non-existent')).rejects.toThrow('Session not found');
    });

    it('should throw SessionNotFoundError when adding iteration to non-existent session', async () => {
      const iteration: IterationData = {
        thoughtNumber: 1,
        code: 'test',
        auditResult: {} as GansAuditorCodexReview,
        timestamp: Date.now(),
      };

      await expect(sessionManager.addIteration('non-existent', iteration)).rejects.toThrow('Session not found');
    });
  });
});