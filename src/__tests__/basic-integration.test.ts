/**
 * Basic integration tests for GansAuditor_Codex components
 * These tests focus on component integration without external dependencies
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

import { GanAuditor } from '../auditor/gan-auditor.js';
import { SessionManager } from '../session/session-manager.js';
import { ContextPacker } from '../context/context-packer.js';
import { MockCodexJudge } from '../codex/mock-codex-judge.js';
import { ThoughtData, SessionConfig } from '../types/gan-types.js';

describe('GansAuditor_Codex Basic Integration Tests', () => {
  let tempDir: string;
  let ganAuditor: GanAuditor;
  let sessionManager: SessionManager;
  let contextPacker: ContextPacker;
  let mockCodexJudge: MockCodexJudge;

  beforeEach(() => {
    tempDir = join(tmpdir(), `basic-integration-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    sessionManager = new SessionManager(tempDir);
    contextPacker = new ContextPacker();
    mockCodexJudge = new MockCodexJudge();
    
    ganAuditor = new GanAuditor({
      sessionManager,
      contextPacker,
      codexJudge: mockCodexJudge
    });
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Component Integration', () => {
    it('should create GansAuditor_Codex with all components', () => {
      expect(ganAuditor).toBeDefined();
      expect(sessionManager).toBeDefined();
      expect(contextPacker).toBeDefined();
      expect(mockCodexJudge).toBeDefined();
    });

    it('should extract inline configuration from thought', () => {
      const thought = `
Test thought with configuration.

\`\`\`gan-config
{
  "task": "Test task",
  "threshold": 90
}
\`\`\`

Some more content.
      `;

      const config = ganAuditor.extractInlineConfig(thought);
      
      expect(config).toBeDefined();
      expect(config?.task).toBe('Test task');
      expect(config?.threshold).toBe(90);
    });

    it('should handle thought without configuration', () => {
      const thought = 'Simple thought without any configuration.';
      
      const config = ganAuditor.extractInlineConfig(thought);
      
      expect(config).toBeNull();
    });

    it('should validate and sanitize configuration', () => {
      const invalidConfig = {
        threshold: 150, // Invalid - too high
        maxCycles: -1,  // Invalid - negative
        scope: 'invalid' // Invalid scope
      };

      // This should not throw and should return sanitized values
      expect(() => {
        ganAuditor.extractInlineConfig(JSON.stringify(invalidConfig));
      }).not.toThrow();
    });
  });

  describe('Session Management Integration', () => {
    it('should create and manage sessions', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'diff',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      const session = await sessionManager.createSession('test-session', config);
      
      expect(session).toBeDefined();
      expect(session.id).toBe('test-session');
      expect(session.config).toEqual(config);
      
      const retrieved = await sessionManager.getSession('test-session');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-session');
    });

    it('should handle session updates', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'diff',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      const session = await sessionManager.createSession('update-test', config);
      
      // Add some history
      session.history.push({
        thoughtNumber: 1,
        timestamp: new Date(),
        ganReview: {
          overall: 85,
          dimensions: [],
          verdict: 'pass',
          review: { summary: 'Test', inline: [], citations: [] },
          iterations: 1,
          judge_cards: []
        }
      });

      await sessionManager.updateSession(session);
      
      const retrieved = await sessionManager.getSession('update-test');
      expect(retrieved?.history).toHaveLength(1);
      expect(retrieved?.history[0].thoughtNumber).toBe(1);
    });
  });

  describe('Context Building Integration', () => {
    it('should build context for different scopes', async () => {
      const configs = [
        { scope: 'diff' as const },
        { scope: 'workspace' as const },
        { scope: 'paths' as const, paths: ['src/index.ts'] }
      ];

      for (const configOverride of configs) {
        const config: SessionConfig = {
          task: 'test',
          scope: configOverride.scope,
          paths: configOverride.paths,
          threshold: 85,
          maxCycles: 1,
          candidates: 1,
          judges: ['internal'],
          applyFixes: false
        };

        // This should not throw
        expect(async () => {
          await contextPacker.buildContextPack(config);
        }).not.toThrow();
      }
    });
  });

  describe('Mock Codex Integration', () => {
    it('should execute mock audit', async () => {
      const auditRequest = {
        task: 'Test audit',
        candidate: 'test code',
        contextPack: 'test context',
        rubric: {
          dimensions: [
            { name: 'accuracy', weight: 0.5 },
            { name: 'clarity', weight: 0.5 }
          ]
        },
        budget: {
          maxCycles: 1,
          candidates: 1,
          threshold: 85
        }
      };

      const result = await mockCodexJudge.executeAudit(auditRequest);
      
      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.verdict).toMatch(/pass|revise|reject/);
      expect(result.dimensions).toHaveLength(5); // Mock returns 5 dimensions
      expect(result.review).toBeDefined();
      expect(result.judge_cards).toHaveLength(1);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle configuration parsing errors gracefully', () => {
      const malformedThought = `
Test with malformed config.

\`\`\`gan-config
{ invalid json here
\`\`\`
      `;

      // Should not throw
      expect(() => {
        ganAuditor.extractInlineConfig(malformedThought);
      }).not.toThrow();
      
      const config = ganAuditor.extractInlineConfig(malformedThought);
      expect(config).toBeNull();
    });

    it('should handle missing session gracefully', async () => {
      const session = await sessionManager.getSession('non-existent');
      expect(session).toBeNull();
    });

    it('should handle context building errors gracefully', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'paths',
        paths: ['/non/existent/path'],
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      // Should not throw, should return fallback context
      const context = await contextPacker.buildContextPack(config);
      expect(context).toBeDefined();
      expect(typeof context).toBe('string');
    });
  });

  describe('Response Format Validation', () => {
    it('should return properly formatted audit response', async () => {
      const auditRequest = {
        task: 'Test audit',
        candidate: 'test code',
        contextPack: 'test context',
        rubric: {
          dimensions: [
            { name: 'accuracy', weight: 0.5 },
            { name: 'clarity', weight: 0.5 }
          ]
        },
        budget: {
          maxCycles: 1,
          candidates: 1,
          threshold: 85
        }
      };

      const result = await mockCodexJudge.executeAudit(auditRequest);
      
      // Validate response structure
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('dimensions');
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('review');
      expect(result).toHaveProperty('iterations');
      expect(result).toHaveProperty('judge_cards');

      // Validate review structure
      expect(result.review).toHaveProperty('summary');
      expect(result.review).toHaveProperty('inline');
      expect(result.review).toHaveProperty('citations');

      // Validate types
      expect(typeof result.overall).toBe('number');
      expect(Array.isArray(result.dimensions)).toBe(true);
      expect(typeof result.verdict).toBe('string');
      expect(typeof result.review.summary).toBe('string');
      expect(Array.isArray(result.review.inline)).toBe(true);
      expect(Array.isArray(result.review.citations)).toBe(true);
      expect(typeof result.iterations).toBe('number');
      expect(Array.isArray(result.judge_cards)).toBe(true);
    });
  });
});