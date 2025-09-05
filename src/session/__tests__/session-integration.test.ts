/**
 * Integration tests for SessionManager
 * 
 * Tests real file system operations and integration scenarios
 * to ensure the SessionManager works correctly in production.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SessionManager } from '../session-manager.js';
import { DEFAULT_SESSION_CONFIG } from '../../types/gan-types.js';
import type { SessionConfig } from '../../types/integration-types.js';

describe('SessionManager Integration', () => {
  let sessionManager: SessionManager;
  let testStateDir: string;

  beforeEach(async () => {
    // Create temporary directory for testing
    testStateDir = join(tmpdir(), `mcp-gan-integration-${Date.now()}`);
    
    // Create SessionManager with test directory
    sessionManager = new SessionManager({
      stateDirectory: testStateDir,
      maxSessionAge: 5000, // 5 seconds
      cleanupInterval: 1000, // 1 second
    });
  });

  afterEach(async () => {
    // Cleanup
    sessionManager.destroy();
    
    // Remove test directory
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle complete session lifecycle', async () => {
    const sessionId = sessionManager.generateSessionId();
    const config: SessionConfig = {
      ...DEFAULT_SESSION_CONFIG,
      threshold: 90,
      scope: 'workspace',
      judges: ['test-judge'],
    };

    // 1. Create session
    const created = await sessionManager.createSession(sessionId, config);
    expect(created.id).toBe(sessionId);
    expect(created.config.threshold).toBe(90);

    // 2. Verify persistence
    const loaded = await sessionManager.getSession(sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded!.config.threshold).toBe(90);

    // 3. Add audit history
    const mockReview = {
      overall: 85,
      dimensions: [{ name: 'accuracy', score: 90 }],
      verdict: 'pass' as const,
      review: {
        summary: 'Code looks good',
        inline: [{ path: 'test.ts', line: 10, comment: 'Good implementation' }],
        citations: ['repo://test.ts:1-20'],
      },
      iterations: 1,
      judge_cards: [{ model: 'test-judge', score: 85 }],
    };

    await sessionManager.addAuditToHistory(sessionId, 1, mockReview, config);

    // 4. Verify history was added
    const withHistory = await sessionManager.getSession(sessionId);
    expect(withHistory!.history).toHaveLength(1);
    expect(withHistory!.lastGan).toEqual(mockReview);

    // 5. Update session config
    const updatedConfig = { ...config, threshold: 95 };
    withHistory!.config = updatedConfig;
    await sessionManager.updateSession(withHistory!);

    // 6. Verify update
    const updated = await sessionManager.getSession(sessionId);
    expect(updated!.config.threshold).toBe(95);

    // 7. Clean up
    const deleted = await sessionManager.deleteSession(sessionId);
    expect(deleted).toBe(true);

    // 8. Verify deletion
    const afterDelete = await sessionManager.getSession(sessionId);
    expect(afterDelete).toBeNull();
  });

  it('should handle multiple sessions', async () => {
    const baseConfig: SessionConfig = { ...DEFAULT_SESSION_CONFIG };
    const sessionIds: string[] = [];

    // Create multiple sessions sequentially
    for (let i = 0; i < 3; i++) {
      const sessionId = `test-session-${i}-${Date.now()}`;
      sessionIds.push(sessionId);
      
      const sessionConfig: SessionConfig = { 
        ...baseConfig, 
        threshold: 80 + i,
        task: `Task ${i + 1}`,
      };
      
      const session = await sessionManager.createSession(sessionId, sessionConfig);
      
      // Verify the session was created with correct config
      expect(session.config.threshold).toBe(80 + i);
      expect(session.config.task).toBe(`Task ${i + 1}`);
    }

    // Verify all sessions exist
    for (const sessionId of sessionIds) {
      const loaded = await sessionManager.getSession(sessionId);
      expect(loaded).not.toBeNull();
    }

    // Get all sessions
    const allSessions = await sessionManager.getAllSessions();
    expect(allSessions.length).toBeGreaterThanOrEqual(3);

    // Clean up all sessions
    for (const sessionId of sessionIds) {
      const deleted = await sessionManager.deleteSession(sessionId);
      expect(deleted).toBe(true);
    }
  });

  it('should handle automatic cleanup', async () => {
    const sessionId = sessionManager.generateSessionId();
    const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };

    // Create session
    await sessionManager.createSession(sessionId, config);

    // Verify session exists
    let session = await sessionManager.getSession(sessionId);
    expect(session).not.toBeNull();

    // Wait for automatic cleanup (maxAge is 5 seconds, cleanup runs every 1 second)
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Session should be cleaned up automatically
    session = await sessionManager.getSession(sessionId);
    expect(session).toBeNull();
  }, 10000); // Increase timeout for this test

  it('should recover from file system corruption', async () => {
    const sessionId = sessionManager.generateSessionId();
    const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };

    // Create session
    await sessionManager.createSession(sessionId, config);

    // Corrupt the session file
    const filePath = join(testStateDir, `${sessionId}.json`);
    await fs.writeFile(filePath, '{"corrupted": true, "invalid":', 'utf-8');

    // Should recover gracefully
    const recovered = await sessionManager.getSession(sessionId);
    expect(recovered).not.toBeNull();
    expect(recovered!.id).toBe(sessionId);
    expect(recovered!.config).toEqual(DEFAULT_SESSION_CONFIG);
  });

  it('should handle directory creation and permissions', async () => {
    // Test with nested directory structure
    const nestedDir = join(testStateDir, 'nested', 'deep', 'structure');
    const nestedManager = new SessionManager({
      stateDirectory: nestedDir,
    });

    const sessionId = nestedManager.generateSessionId();
    const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };

    // Should create nested directories automatically
    await nestedManager.createSession(sessionId, config);

    // Verify directory was created
    const dirExists = await fs.access(nestedDir).then(() => true).catch(() => false);
    expect(dirExists).toBe(true);

    // Verify session file exists
    const filePath = join(nestedDir, `${sessionId}.json`);
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    nestedManager.destroy();
  });

  it('should handle large session history', async () => {
    const sessionId = sessionManager.generateSessionId();
    const config: SessionConfig = { ...DEFAULT_SESSION_CONFIG };

    // Create session
    await sessionManager.createSession(sessionId, config);

    // Add many audit entries
    const mockReview = {
      overall: 85,
      dimensions: [],
      verdict: 'pass' as const,
      review: { summary: 'Test', inline: [], citations: [] },
      iterations: 1,
      judge_cards: [],
    };

    for (let i = 0; i < 100; i++) {
      await sessionManager.addAuditToHistory(sessionId, i + 1, mockReview, config);
    }

    // Verify all entries were persisted
    const session = await sessionManager.getSession(sessionId);
    expect(session!.history).toHaveLength(100);
    expect(session!.history[99].thoughtNumber).toBe(100);
  });
});