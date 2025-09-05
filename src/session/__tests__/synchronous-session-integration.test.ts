/**
 * Integration tests for SynchronousSessionManager
 * 
 * Tests the integration between synchronous session management and the
 * broader audit workflow, including real file system operations and
 * session persistence across manager instances.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { 
  SynchronousSessionManager,
  type SynchronousSessionManagerConfig 
} from '../synchronous-session-manager.js';
import type {
  IterationData,
  GansAuditorCodexReview,
} from '../../types/gan-types.js';
import { DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG } from '../../types/gan-types.js';

describe('SynchronousSessionManager Integration', () => {
  let testStateDir: string;
  let testConfig: SynchronousSessionManagerConfig;

  beforeEach(async () => {
    // Create temporary directory for test state
    testStateDir = join(tmpdir(), `test-sync-integration-${Date.now()}`);
    await fs.mkdir(testStateDir, { recursive: true });

    testConfig = {
      stateDirectory: testStateDir,
      maxSessionAge: 24 * 60 * 60 * 1000,
      cleanupInterval: 1000000, // Disable automatic cleanup
      stagnationThreshold: 0.95,
      stagnationStartLoop: 10,
      codexExecutable: 'codex',
      codexTimeout: 30000,
    };
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('session persistence across instances', () => {
    it('should persist session state across manager instances', async () => {
      const sessionId = 'persistent-session';
      const loopId = 'persistent-loop';

      // Create session with first manager instance
      const manager1 = new SynchronousSessionManager(testConfig);
      const session1 = await manager1.getOrCreateSession(sessionId, loopId);
      
      const mockReview: GansAuditorCodexReview = {
        overall: 80,
        dimensions: [{ name: 'accuracy', score: 80 }],
        verdict: 'revise',
        review: { summary: 'Test review', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      };

      const iteration: IterationData = {
        thoughtNumber: 1,
        code: 'console.log("persistent test");',
        auditResult: mockReview,
        timestamp: Date.now(),
      };

      await manager1.addIteration(sessionId, iteration);
      manager1.destroy();

      // Load session with second manager instance
      const manager2 = new SynchronousSessionManager(testConfig);
      const session2 = await manager2.getSession(sessionId);

      expect(session2).toBeTruthy();
      expect(session2?.id).toBe(sessionId);
      expect(session2?.loopId).toBe(loopId);
      expect(session2?.iterations).toHaveLength(1);
      expect(session2?.iterations[0]).toEqual(iteration);
      expect(session2?.currentLoop).toBe(1);

      manager2.destroy();
    });

    it('should handle concurrent access to same session', async () => {
      const sessionId = 'concurrent-session';

      // Create two manager instances
      const manager1 = new SynchronousSessionManager(testConfig);
      const manager2 = new SynchronousSessionManager(testConfig);

      // Create session with first manager
      await manager1.getOrCreateSession(sessionId);

      // Both managers should be able to access the session
      const session1 = await manager1.getSession(sessionId);
      const session2 = await manager2.getSession(sessionId);

      expect(session1?.id).toBe(sessionId);
      expect(session2?.id).toBe(sessionId);

      manager1.destroy();
      manager2.destroy();
    });
  });

  describe('complete workflow simulation', () => {
    it('should handle complete iterative improvement workflow', async () => {
      const sessionId = 'workflow-session';
      const loopId = 'workflow-loop';
      const manager = new SynchronousSessionManager(testConfig);

      // Create session
      const session = await manager.getOrCreateSession(sessionId, loopId);
      expect(session.isComplete).toBe(false);

      // Simulate iterative improvements
      const iterations = [
        { score: 60, code: 'function test() { return 1; }' },
        { score: 70, code: 'function test() { return 1 + 1; }' },
        { score: 80, code: 'function test() {\n  return 1 + 1;\n}' },
        { score: 90, code: 'function test() {\n  // Add two numbers\n  return 1 + 1;\n}' },
        { score: 95, code: 'function test() {\n  // Add two numbers\n  return 1 + 1;\n}' },
      ];

      for (let i = 0; i < iterations.length; i++) {
        const { score, code } = iterations[i];
        
        const mockReview: GansAuditorCodexReview = {
          overall: score,
          dimensions: [{ name: 'accuracy', score }],
          verdict: score >= 95 ? 'pass' : 'revise',
          review: { 
            summary: `Review ${i + 1}: Score ${score}`, 
            inline: [], 
            citations: [] 
          },
          iterations: i + 1,
          judge_cards: [],
        };

        const iteration: IterationData = {
          thoughtNumber: i + 1,
          code,
          auditResult: mockReview,
          timestamp: Date.now() + i * 1000,
        };

        await manager.addIteration(sessionId, iteration);
      }

      // Analyze final progress
      const progress = await manager.analyzeProgress(sessionId);
      expect(progress.currentLoop).toBe(5);
      expect(progress.scoreProgression).toEqual([60, 70, 80, 90, 95]);
      expect(progress.averageImprovement).toBeGreaterThan(0);

      // Check stagnation (should not be stagnant due to different code)
      const stagnation = await manager.detectStagnation(sessionId);
      expect(stagnation.isStagnant).toBe(false);

      manager.destroy();
    });

    it('should detect stagnation in realistic scenario', async () => {
      const sessionId = 'stagnation-session';
      const manager = new SynchronousSessionManager(testConfig);

      await manager.getOrCreateSession(sessionId);

      // Add initial diverse iterations
      for (let i = 0; i < 8; i++) {
        const mockReview: GansAuditorCodexReview = {
          overall: 70 + i,
          dimensions: [{ name: 'accuracy', score: 70 + i }],
          verdict: 'revise',
          review: { summary: `Review ${i + 1}`, inline: [], citations: [] },
          iterations: i + 1,
          judge_cards: [],
        };

        const iteration: IterationData = {
          thoughtNumber: i + 1,
          code: `function test${i}() { return ${i}; }`,
          auditResult: mockReview,
          timestamp: Date.now() + i * 1000,
        };

        await manager.addIteration(sessionId, iteration);
      }

      // Add stagnant iterations (same code repeated)
      const stagnantCode = 'function test() { return "stagnant"; }';
      for (let i = 8; i < 12; i++) {
        const mockReview: GansAuditorCodexReview = {
          overall: 78,
          dimensions: [{ name: 'accuracy', score: 78 }],
          verdict: 'revise',
          review: { summary: `Review ${i + 1}`, inline: [], citations: [] },
          iterations: i + 1,
          judge_cards: [],
        };

        const iteration: IterationData = {
          thoughtNumber: i + 1,
          code: stagnantCode,
          auditResult: mockReview,
          timestamp: Date.now() + i * 1000,
        };

        await manager.addIteration(sessionId, iteration);
      }

      const stagnation = await manager.detectStagnation(sessionId);
      expect(stagnation.isStagnant).toBe(true);
      expect(stagnation.detectedAtLoop).toBe(12);
      expect(stagnation.similarityScore).toBeGreaterThan(0.95);

      manager.destroy();
    });
  });

  describe('file system operations', () => {
    it('should handle file system errors gracefully', async () => {
      // Use non-existent directory to trigger errors
      const badConfig = {
        ...testConfig,
        stateDirectory: '/non/existent/directory',
      };

      const manager = new SynchronousSessionManager(badConfig);

      // Should handle directory creation errors
      await expect(manager.getOrCreateSession('test-session')).rejects.toThrow();

      manager.destroy();
    });

    it('should recover from corrupted session files', async () => {
      const sessionId = 'corrupted-session';
      const manager = new SynchronousSessionManager(testConfig);

      // Create corrupted session file
      const sessionPath = join(testStateDir, `${sessionId}.json`);
      await fs.writeFile(sessionPath, '{ invalid json }');

      // Should recover by creating a new session with default values
      const session = await manager.getSession(sessionId);
      expect(session).toBeTruthy();
      expect(session?.id).toBe(sessionId);
      expect(session?.iterations).toEqual([]);
      expect(session?.currentLoop).toBe(0);

      manager.destroy();
    });

    it('should handle session file cleanup', async () => {
      const manager = new SynchronousSessionManager({
        ...testConfig,
        maxSessionAge: 100, // Very short age for testing
      });

      // Create session
      const sessionId = 'cleanup-session';
      await manager.getOrCreateSession(sessionId);

      // Wait for session to age
      await new Promise(resolve => setTimeout(resolve, 150));

      // Cleanup should remove old session
      await manager.cleanupSessions();

      // Session should be gone
      const session = await manager.getSession(sessionId);
      expect(session).toBeNull();

      manager.destroy();
    });
  });

  describe('backward compatibility', () => {
    it('should work with legacy session files', async () => {
      const sessionId = 'legacy-session';
      
      // Create legacy session file (without enhanced fields)
      const legacySession = {
        id: sessionId,
        config: DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG,
        history: [{
          timestamp: Date.now(),
          thoughtNumber: 1,
          review: {
            overall: 75,
            dimensions: [],
            verdict: 'revise',
            review: { summary: 'Legacy review', inline: [], citations: [] },
            iterations: 1,
            judge_cards: [],
          },
          config: DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG,
        }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const sessionPath = join(testStateDir, `${sessionId}.json`);
      await fs.writeFile(sessionPath, JSON.stringify(legacySession, null, 2));

      const manager = new SynchronousSessionManager(testConfig);
      const session = await manager.getSession(sessionId);

      // Should have migrated to enhanced schema
      expect(session).toBeTruthy();
      expect(session?.iterations).toEqual([]);
      expect(session?.currentLoop).toBe(0);
      expect(session?.isComplete).toBe(false);
      expect(session?.codexContextActive).toBe(false);

      manager.destroy();
    });
  });
});