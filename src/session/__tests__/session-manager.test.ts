/**
 * Unit tests for GansAuditor_Codex SessionManager
 * 
 * Tests session lifecycle management, file-based persistence,
 * unique ID generation, validation, and error recovery for the GansAuditor_Codex system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SessionManager } from '../session-manager.js';
import type { SessionConfig, SessionState } from '../../types/integration-types.js';
import { DEFAULT_SESSION_CONFIG } from '../../types/gan-types.js';

// Mock crypto module for consistent testing
let hashCounter = 0;
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => `abcdef123456789${hashCounter++}`.padEnd(40, '0').substring(0, 40)),
  })),
}));

describe('GansAuditor_Codex SessionManager', () => {
  let sessionManager: SessionManager;
  let testStateDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create temporary directory for testing
    testStateDir = join(tmpdir(), `mcp-gan-test-${Date.now()}`);
    await fs.mkdir(testStateDir, { recursive: true });

    // Create SessionManager with test directory
    sessionManager = new SessionManager({
      stateDirectory: testStateDir,
      maxSessionAge: 1000, // 1 second for testing
      cleanupInterval: 100, // 100ms for testing
    });

    // Store original values
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    // Cleanup
    sessionManager.destroy();
    
    // Restore original values
    process.chdir(originalCwd);
    process.env = originalEnv;

    // Remove test directory
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Session ID Generation', () => {
    it('should generate unique session IDs', () => {
      const id1 = sessionManager.generateSessionId();
      const id2 = sessionManager.generateSessionId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(16);
      expect(id2).toHaveLength(16);
    });

    it('should use provided cwd and username in ID generation', () => {
      const id = sessionManager.generateSessionId('/test/path', 'testuser');
      expect(id).toBeDefined();
      expect(id).toHaveLength(16);
    });

    it('should handle missing environment variables gracefully', () => {
      delete process.env.USER;
      delete process.env.USERNAME;
      
      const id = sessionManager.generateSessionId();
      expect(id).toBeDefined();
      expect(id).toHaveLength(16);
    });
  });

  describe('Session Creation', () => {
    it('should create new session with default config', async () => {
      const sessionId = 'test-session-1';
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      const session = await sessionManager.createSession(sessionId, config);
      
      expect(session.id).toBe(sessionId);
      expect(session.config).toEqual(config);
      expect(session.history).toEqual([]);
      expect(session.createdAt).toBeTypeOf('number');
      expect(session.updatedAt).toBeTypeOf('number');
      expect(session.lastGan).toBeUndefined();
    });

    it('should create session with custom config', async () => {
      const sessionId = 'test-session-2';
      const config: SessionConfig = {
        ...DEFAULT_SESSION_CONFIG,
        threshold: 90,
        scope: 'workspace',
        judges: ['custom-judge'],
      };
      
      const session = await sessionManager.createSession(sessionId, config);
      
      expect(session.config.threshold).toBe(90);
      expect(session.config.scope).toBe('workspace');
      expect(session.config.judges).toEqual(['custom-judge']);
    });

    it('should persist session to file system', async () => {
      const sessionId = 'test-session-3';
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      await sessionManager.createSession(sessionId, config);
      
      const filePath = join(testStateDir, `${sessionId}.json`);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.id).toBe(sessionId);
    });
  });

  describe('Session Loading', () => {
    it('should load existing session', async () => {
      const sessionId = 'test-session-4';
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      // Create session
      const created = await sessionManager.createSession(sessionId, config);
      
      // Load session
      const loaded = await sessionManager.getSession(sessionId);
      
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(created.id);
      expect(loaded!.config).toEqual(created.config);
      expect(loaded!.createdAt).toBe(created.createdAt);
    });

    it('should return null for non-existent session', async () => {
      const session = await sessionManager.getSession('non-existent');
      expect(session).toBeNull();
    });

    it('should recover from corrupted session file', async () => {
      const sessionId = 'test-session-5';
      const filePath = join(testStateDir, `${sessionId}.json`);
      
      // Create corrupted file
      await fs.writeFile(filePath, '{"invalid": "json"', 'utf-8');
      
      const session = await sessionManager.getSession(sessionId);
      
      expect(session).not.toBeNull();
      expect(session!.id).toBe(sessionId);
      expect(session!.config).toEqual(DEFAULT_SESSION_CONFIG);
      expect(session!.history).toEqual([]);
    });

    it('should recover from invalid session structure', async () => {
      const sessionId = 'test-session-6';
      const filePath = join(testStateDir, `${sessionId}.json`);
      
      // Create file with invalid structure
      await fs.writeFile(filePath, JSON.stringify({
        id: sessionId,
        // Missing required fields
      }), 'utf-8');
      
      const session = await sessionManager.getSession(sessionId);
      
      expect(session).not.toBeNull();
      expect(session!.id).toBe(sessionId);
      expect(session!.config).toEqual(DEFAULT_SESSION_CONFIG);
    });
  });

  describe('Session Updates', () => {
    it('should update session state', async () => {
      const sessionId = 'test-session-7';
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      // Create session
      const session = await sessionManager.createSession(sessionId, config);
      const originalUpdatedAt = session.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Update session
      session.config.threshold = 95;
      await sessionManager.updateSession(session);
      
      // Load updated session
      const updated = await sessionManager.getSession(sessionId);
      
      expect(updated).not.toBeNull();
      expect(updated!.config.threshold).toBe(95);
      expect(updated!.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });

    it('should add audit to history', async () => {
      const sessionId = 'test-session-8';
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      // Create session
      await sessionManager.createSession(sessionId, config);
      
      // Add audit to history
      const mockReview = {
        overall: 85,
        dimensions: [],
        verdict: 'pass' as const,
        review: { summary: 'Test review', inline: [], citations: [] },
        iterations: 1,
        judge_cards: [],
      };
      
      await sessionManager.addAuditToHistory(sessionId, 1, mockReview, config);
      
      // Verify history was added
      const updated = await sessionManager.getSession(sessionId);
      
      expect(updated).not.toBeNull();
      expect(updated!.history).toHaveLength(1);
      expect(updated!.history[0].thoughtNumber).toBe(1);
      expect(updated!.history[0].review).toEqual(mockReview);
      expect(updated!.lastGan).toEqual(mockReview);
    });

    it('should throw error when adding audit to non-existent session', async () => {
      const mockReview = { overall: 85 };
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      await expect(
        sessionManager.addAuditToHistory('non-existent', 1, mockReview, config)
      ).rejects.toThrow('Session not found: non-existent');
    });
  });

  describe('Session Cleanup', () => {
    it('should clean up old sessions', async () => {
      const sessionId = 'test-session-9';
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      // Create session
      await sessionManager.createSession(sessionId, config);
      
      // Verify session exists
      let session = await sessionManager.getSession(sessionId);
      expect(session).not.toBeNull();
      
      // Wait for session to become old (maxAge is 1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Run cleanup
      await sessionManager.cleanupSessions();
      
      // Verify session was cleaned up
      session = await sessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    it('should clean up corrupted session files', async () => {
      const sessionId = 'test-session-10';
      const filePath = join(testStateDir, `${sessionId}.json`);
      
      // Create corrupted file
      await fs.writeFile(filePath, 'invalid json', 'utf-8');
      
      // Run cleanup
      await sessionManager.cleanupSessions();
      
      // Verify corrupted file was removed
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('should preserve recent sessions during cleanup', async () => {
      const sessionId = 'test-session-11';
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      // Create session
      await sessionManager.createSession(sessionId, config);
      
      // Run cleanup immediately (session should be preserved)
      await sessionManager.cleanupSessions();
      
      // Verify session still exists
      const session = await sessionManager.getSession(sessionId);
      expect(session).not.toBeNull();
    });
  });

  describe('Session Management Utilities', () => {
    it('should get all sessions', async () => {
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      // Create multiple sessions
      await sessionManager.createSession('session-1', config);
      await sessionManager.createSession('session-2', config);
      await sessionManager.createSession('session-3', config);
      
      const allSessions = await sessionManager.getAllSessions();
      
      expect(allSessions).toHaveLength(3);
      expect(allSessions.map(s => s.id)).toContain('session-1');
      expect(allSessions.map(s => s.id)).toContain('session-2');
      expect(allSessions.map(s => s.id)).toContain('session-3');
    });

    it('should delete specific session', async () => {
      const sessionId = 'test-session-12';
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      // Create session
      await sessionManager.createSession(sessionId, config);
      
      // Verify session exists
      let session = await sessionManager.getSession(sessionId);
      expect(session).not.toBeNull();
      
      // Delete session
      const deleted = await sessionManager.deleteSession(sessionId);
      expect(deleted).toBe(true);
      
      // Verify session no longer exists
      session = await sessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    it('should return false when deleting non-existent session', async () => {
      const deleted = await sessionManager.deleteSession('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Create SessionManager with invalid directory path
      const invalidManager = new SessionManager({
        stateDirectory: '/invalid/path/that/cannot/be/created',
      });

      // Should not throw, but should handle gracefully
      await expect(
        invalidManager.createSession('test', DEFAULT_SESSION_CONFIG)
      ).rejects.toThrow();

      invalidManager.destroy();
    });

    it('should handle concurrent access gracefully', async () => {
      const sessionId = 'concurrent-test';
      const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
      
      // Create session
      const session = await sessionManager.createSession(sessionId, config);
      
      // Simulate concurrent updates
      const updates = Array.from({ length: 10 }, (_, i) => {
        const updatedSession = { ...session, config: { ...config, threshold: 80 + i } };
        return sessionManager.updateSession(updatedSession);
      });
      
      // All updates should complete without error
      await Promise.all(updates);
      
      // Final state should be consistent
      const final = await sessionManager.getSession(sessionId);
      expect(final).not.toBeNull();
      expect(final!.config.threshold).toBeGreaterThanOrEqual(80);
      expect(final!.config.threshold).toBeLessThan(90);
    });
  });

  describe('Configuration Validation', () => {
    it('should merge partial config with defaults', async () => {
      const sessionId = 'config-test';
      const partialConfig: Partial<SessionConfig> = {
        threshold: 95,
        scope: 'workspace',
      };
      
      const session = await sessionManager.createSession(sessionId, partialConfig as SessionConfig);
      
      expect(session.config.threshold).toBe(95);
      expect(session.config.scope).toBe('workspace');
      expect(session.config.task).toBe(DEFAULT_SESSION_CONFIG.task);
      expect(session.config.maxCycles).toBe(DEFAULT_SESSION_CONFIG.maxCycles);
    });
  });
});