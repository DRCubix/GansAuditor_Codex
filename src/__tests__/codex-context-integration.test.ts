/**
 * Integration tests for Codex context window management
 * 
 * Tests the complete lifecycle of Codex context windows in the synchronous
 * audit workflow, including start, maintain, terminate, and cleanup operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { SynchronousSessionManager } from '../session/synchronous-session-manager.js';
import type { GansAuditorCodexThoughtData } from '../types/gan-types.js';

// Mock child_process for Codex CLI interactions
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

describe('Codex Context Integration Tests', () => {
  let sessionManager: SynchronousSessionManager;
  let testStateDir: string;

  beforeEach(async () => {
    // Create temporary directory for test state
    testStateDir = join(tmpdir(), `test-codex-context-${Date.now()}`);
    await fs.mkdir(testStateDir, { recursive: true });

    sessionManager = new SynchronousSessionManager({
      stateDirectory: testStateDir,
      cleanupInterval: 1000000, // Disable automatic cleanup during tests
      codexExecutable: 'codex',
      codexTimeout: 5000,
    });

    // Setup default mock behavior
    vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
      const argsArray = args as string[];
      
      if (argsArray.includes('context') && argsArray.includes('start')) {
        const loopId = argsArray[argsArray.indexOf('--loop-id') + 1];
        const contextId = `ctx-${loopId}-${Date.now()}`;
        if (callback) callback(null, { stdout: contextId, stderr: '' });
      } else if (argsArray.includes('context') && argsArray.includes('maintain')) {
        if (callback) callback(null, { stdout: 'maintained', stderr: '' });
      } else if (argsArray.includes('context') && argsArray.includes('terminate')) {
        if (callback) callback(null, { stdout: 'terminated', stderr: '' });
      } else if (argsArray.includes('context') && argsArray.includes('status')) {
        if (callback) callback(null, { stdout: 'active', stderr: '' });
      } else {
        if (callback) callback(new Error('Unknown command'), { stdout: '', stderr: 'Unknown command' });
      }
    });
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

  describe('Complete context lifecycle', () => {
    it('should manage context through complete audit workflow', async () => {
      const sessionId = 'integration-session-1';
      const loopId = 'integration-loop-1';

      // Step 1: Create session with loopId
      const session = await sessionManager.getOrCreateSession(sessionId, loopId);
      expect(session.loopId).toBe(loopId);
      expect(session.codexContextActive).toBe(false);

      // Step 2: Start context
      const contextId = await sessionManager.startCodexContext(loopId);
      expect(contextId).toMatch(/^ctx-integration-loop-1-\d+$/);
      expect(sessionManager.isContextActive(loopId)).toBe(true);

      // Update session with context info
      session.codexContextId = contextId;
      session.codexContextActive = true;
      await sessionManager.updateSession(session);

      // Step 3: Maintain context during iterations
      for (let i = 0; i < 3; i++) {
        await sessionManager.maintainCodexContext(loopId, contextId);
      }

      // Step 4: Terminate context on completion
      await sessionManager.terminateCodexContext(loopId, 'completion');
      expect(sessionManager.isContextActive(loopId)).toBe(false);

      // Update session
      session.codexContextActive = false;
      session.codexContextId = undefined;
      await sessionManager.updateSession(session);

      const finalSession = await sessionManager.getSession(sessionId);
      expect(finalSession?.codexContextActive).toBe(false);
      expect(finalSession?.codexContextId).toBeUndefined();
    });

    it('should handle multiple concurrent contexts', async () => {
      const contexts = [
        { sessionId: 'concurrent-session-1', loopId: 'concurrent-loop-1' },
        { sessionId: 'concurrent-session-2', loopId: 'concurrent-loop-2' },
        { sessionId: 'concurrent-session-3', loopId: 'concurrent-loop-3' },
      ];

      // Start all contexts
      const contextIds: string[] = [];
      for (const { sessionId, loopId } of contexts) {
        await sessionManager.getOrCreateSession(sessionId, loopId);
        const contextId = await sessionManager.startCodexContext(loopId);
        contextIds.push(contextId);
      }

      // Verify all contexts are active
      expect(sessionManager.getActiveContexts().size).toBe(3);
      for (const { loopId } of contexts) {
        expect(sessionManager.isContextActive(loopId)).toBe(true);
      }

      // Maintain all contexts
      for (let i = 0; i < contexts.length; i++) {
        await sessionManager.maintainCodexContext(contexts[i].loopId, contextIds[i]);
      }

      // Terminate all contexts
      await sessionManager.terminateAllContexts('manual');
      expect(sessionManager.getActiveContexts().size).toBe(0);
    });

    it('should handle context failures gracefully', async () => {
      const sessionId = 'failure-session';
      const loopId = 'failure-loop';

      // Start context successfully
      const session = await sessionManager.getOrCreateSession(sessionId, loopId);
      const contextId = await sessionManager.startCodexContext(loopId);
      session.codexContextId = contextId;
      session.codexContextActive = true;
      await sessionManager.updateSession(session);

      // Mock maintenance failure
      vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
        const argsArray = args as string[];
        if (argsArray.includes('maintain')) {
          if (callback) callback(new Error('context not found'), { stdout: '', stderr: 'context not found' });
        } else if (argsArray.includes('terminate')) {
          if (callback) callback(null, { stdout: 'terminated', stderr: '' });
        }
      });

      // Maintenance should not throw but should handle error
      await expect(sessionManager.maintainCodexContext(loopId, contextId)).resolves.not.toThrow();

      // Context should be removed from active contexts due to "context not found" error
      expect(sessionManager.isContextActive(loopId)).toBe(false);
    });

    it('should cleanup stale contexts automatically', async () => {
      const loopId1 = 'stale-loop-1';
      const loopId2 = 'stale-loop-2';

      // Start two contexts
      const contextId1 = await sessionManager.startCodexContext(loopId1);
      const contextId2 = await sessionManager.startCodexContext(loopId2);

      expect(sessionManager.getActiveContexts().size).toBe(2);

      // Mock status check to indicate first context is stale
      vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
        const argsArray = args as string[];
        if (argsArray.includes('status')) {
          const contextId = argsArray[argsArray.indexOf('--context-id') + 1];
          if (contextId === contextId1) {
            // First context is stale
            if (callback) callback(new Error('context not found'), { stdout: '', stderr: 'context not found' });
          } else {
            // Second context is still active
            if (callback) callback(null, { stdout: 'active', stderr: '' });
          }
        }
      });

      await sessionManager.cleanupStaleContexts();

      // Only the stale context should be removed
      expect(sessionManager.isContextActive(loopId1)).toBe(false);
      expect(sessionManager.isContextActive(loopId2)).toBe(true);
      expect(sessionManager.getActiveContexts().size).toBe(1);
    });

    it('should handle session timeout with context cleanup', async () => {
      const sessionId = 'timeout-session';
      const loopId = 'timeout-loop';

      // Create session with active context
      const session = await sessionManager.getOrCreateSession(sessionId, loopId);
      const contextId = await sessionManager.startCodexContext(loopId);
      session.codexContextId = contextId;
      session.codexContextActive = true;
      await sessionManager.updateSession(session);

      expect(sessionManager.isContextActive(loopId)).toBe(true);

      // Handle timeout
      await sessionManager.handleSessionTimeout(sessionId);

      // Context should be terminated and session updated
      expect(sessionManager.isContextActive(loopId)).toBe(false);
      
      const updatedSession = await sessionManager.getSession(sessionId);
      expect(updatedSession?.codexContextActive).toBe(false);
      expect(updatedSession?.codexContextId).toBeUndefined();
    });

    it('should handle Codex CLI unavailable', async () => {
      const loopId = 'unavailable-loop';

      // Mock Codex CLI as unavailable
      vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
        if (callback) callback(new Error('codex: command not found'), { stdout: '', stderr: 'command not found' });
      });

      // Should throw appropriate error
      await expect(sessionManager.startCodexContext(loopId)).rejects.toThrow('Failed to start Codex context');
      expect(sessionManager.isContextActive(loopId)).toBe(false);
    });

    it('should handle empty context ID from Codex CLI', async () => {
      const loopId = 'empty-context-loop';

      // Mock Codex CLI returning empty context ID
      vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
        if (callback) callback(null, { stdout: '', stderr: '' });
      });

      // Should throw appropriate error
      await expect(sessionManager.startCodexContext(loopId)).rejects.toThrow('Codex CLI returned empty context ID');
      expect(sessionManager.isContextActive(loopId)).toBe(false);
    });
  });

  describe('Resource management', () => {
    it('should cleanup all contexts on destroy', async () => {
      const loopIds = ['destroy-loop-1', 'destroy-loop-2', 'destroy-loop-3'];

      // Start multiple contexts
      for (const loopId of loopIds) {
        await sessionManager.startCodexContext(loopId);
      }

      expect(sessionManager.getActiveContexts().size).toBe(3);

      // Destroy should cleanup all contexts
      sessionManager.destroy();

      // Give some time for async cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // All contexts should be cleaned up
      expect(sessionManager.getActiveContexts().size).toBe(0);
    });

    it('should handle termination failures during cleanup', async () => {
      const loopId = 'cleanup-failure-loop';
      await sessionManager.startCodexContext(loopId);

      // Mock termination to fail
      vi.mocked(execFile).mockImplementation((command, args, options, callback) => {
        const argsArray = args as string[];
        if (argsArray.includes('terminate')) {
          if (callback) callback(new Error('termination failed'), { stdout: '', stderr: 'termination failed' });
        }
      });

      // Should still remove from active contexts despite failure
      await sessionManager.terminateCodexContext(loopId, 'manual');
      expect(sessionManager.isContextActive(loopId)).toBe(false);
    });
  });
});