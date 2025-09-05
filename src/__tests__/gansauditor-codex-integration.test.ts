/**
 * Integration tests for GansAuditorCodex Server with GAN auditor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';



import { GanAuditor } from '../auditor/gan-auditor.js';
import { SessionManager } from '../session/session-manager.js';
import { ContextPacker } from '../context/context-packer.js';
import { MockCodexJudge } from '../codex/mock-codex-judge.js';
import { ThoughtData, SessionConfig } from '../types/gan-types.js';
import { createTestRepository, sampleRepositories } from './fixtures/sample-repositories.js';

// Mock process.stdout.write to capture console output
const mockStdoutWrite = vi.fn();
vi.spyOn(process.stdout, 'write').mockImplementation(mockStdoutWrite);

describe('GansAuditorCodex Server Integration', () => {
  let tempDir: string;
  let ganAuditor: GanAuditor;
  let sessionManager: SessionManager;
  let contextPacker: ContextPacker;
  let mockCodexJudge: MockCodexJudge;

  beforeEach(() => {
    tempDir = join(tmpdir(), `gansauditorcodex-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    sessionManager = new SessionManager(tempDir);
    contextPacker = new ContextPacker();
    mockCodexJudge = new MockCodexJudge();
    
    ganAuditor = new GanAuditor({
      sessionManager,
      contextPacker,
      codexJudge: mockCodexJudge
    });

    // Clear mock calls
    mockStdoutWrite.mockClear();
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Tool Integration', () => {
    it('should process GansAuditorCodex with GAN audit integration', async () => {
      // Create test repository
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thoughtData: ThoughtData = {
          thought: `
I need to review my Calculator implementation for code quality.

\`\`\`typescript
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
\`\`\`

\`\`\`gan-config
{
  "task": "Review Calculator implementation",
  "scope": "workspace",
  "threshold": 80
}
\`\`\`

The implementation looks good but I want to make sure it meets quality standards.
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
          branchId: 'calculator-review'
        };

        // Simulate the GansAuditorCodex tool call
        const result = await ganAuditor.auditThought(thoughtData, thoughtData.branchId!);

        // Verify the audit result structure
        expect(result).toBeDefined();
        expect(result.overall).toBeTypeOf('number');
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(100);
        expect(result.verdict).toMatch(/pass|revise|reject/);
        expect(result.dimensions).toHaveLength(5);
        expect(result.review).toBeDefined();
        expect(result.review.summary).toBeTypeOf('string');
        expect(result.iterations).toBe(1);
        expect(result.judge_cards).toHaveLength(1);

        // Verify session was created and persisted
        const session = sessionManager.getSession(thoughtData.branchId!);
        expect(session).toBeDefined();
        expect(session!.id).toBe(thoughtData.branchId);
        expect(session!.history).toHaveLength(1);
        expect(session!.history[0].thoughtNumber).toBe(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle thought without GAN config block', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thoughtData: ThoughtData = {
          thought: `
I'm working on a simple calculator implementation.
The code seems to work but I want to make sure it's well structured.
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await ganAuditor.auditThought(thoughtData, 'default-session');

        // Should still work with default configuration
        expect(result).toBeDefined();
        expect(result.verdict).toMatch(/pass|revise|reject/);
        
        // Verify default configuration was used
        const session = sessionManager.getSession('default-session');
        expect(session).toBeDefined();
        expect(session!.config.task).toBe('Audit and improve the provided candidate');
        expect(session!.config.scope).toBe('diff');
        expect(session!.config.threshold).toBe(85);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle iterative GansAuditorCodex workflow', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const sessionId = 'iterative-session';
        
        // First thought
        const thought1: ThoughtData = {
          thought: `
Starting to implement a calculator class.

\`\`\`gan-config
{
  "task": "Review calculator implementation progress",
  "threshold": 75
}
\`\`\`

I've created the basic structure but need to add more methods.
          `,
          thoughtNumber: 1,
          totalThoughts: 3,
          nextThoughtNeeded: true,
          branchId: sessionId
        };

        const result1 = await ganAuditor.auditThought(thought1, sessionId);
        expect(result1).toBeDefined();

        // Second thought
        const thought2: ThoughtData = {
          thought: `
Added arithmetic operations to the calculator.
Now I need to add error handling for edge cases.
          `,
          thoughtNumber: 2,
          totalThoughts: 3,
          nextThoughtNeeded: true,
          branchId: sessionId
        };

        const result2 = await ganAuditor.auditThought(thought2, sessionId);
        expect(result2).toBeDefined();

        // Final thought
        const thought3: ThoughtData = {
          thought: `
Completed the calculator with proper error handling.
The implementation should now be ready for review.
          `,
          thoughtNumber: 3,
          totalThoughts: 3,
          nextThoughtNeeded: false,
          branchId: sessionId
        };

        const result3 = await ganAuditor.auditThought(thought3, sessionId);
        expect(result3).toBeDefined();

        // Verify session history
        const session = sessionManager.getSession(sessionId);
        expect(session).toBeDefined();
        expect(session!.history).toHaveLength(3);
        expect(session!.history.map(h => h.thoughtNumber)).toEqual([1, 2, 3]);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Error Handling in Tool Context', () => {
    it('should handle Codex unavailability gracefully', async () => {
      // Create a failing Codex judge
      const failingCodexJudge = new MockCodexJudge();
      failingCodexJudge.executeAudit = vi.fn().mockRejectedValue(
        new Error('Codex CLI not available')
      );

      const failingAuditor = new GanAuditor({
        sessionManager,
        contextPacker,
        codexJudge: failingCodexJudge
      });

      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thoughtData: ThoughtData = {
          thought: `
Testing error handling when Codex is unavailable.

\`\`\`gan-config
{
  "task": "Test error handling"
}
\`\`\`
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await failingAuditor.auditThought(thoughtData, 'error-test-session');

        // Should return a fallback response
        expect(result).toBeDefined();
        expect(result.verdict).toBe('revise');
        expect(result.review.summary).toContain('Audit could not be completed due to an error');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle invalid session configuration', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thoughtData: ThoughtData = {
          thought: `
Testing with invalid configuration.

\`\`\`gan-config
{
  "threshold": "not-a-number",
  "scope": "invalid-scope",
  "maxCycles": -1
}
\`\`\`
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await ganAuditor.auditThought(thoughtData, 'invalid-config-session');

        // Should use sanitized/default values and still work
        expect(result).toBeDefined();
        expect(result.verdict).toMatch(/pass|revise|reject/);
        
        // Verify configuration was sanitized
        const session = sessionManager.getSession('invalid-config-session');
        expect(session).toBeDefined();
        expect(session!.config.threshold).toBeGreaterThanOrEqual(0);
        expect(session!.config.threshold).toBeLessThanOrEqual(100);
        expect(['diff', 'paths', 'workspace']).toContain(session!.config.scope);
        expect(session!.config.maxCycles).toBeGreaterThan(0);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Response Format Compatibility', () => {
    it('should return response in expected format', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thoughtData: ThoughtData = {
          thought: 'Test response format',
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
          branchId: 'format-test'
        };

        const result = await ganAuditor.auditThought(thoughtData, thoughtData.branchId!);

        // Verify all required fields are present
        expect(result).toHaveProperty('overall');
        expect(result).toHaveProperty('dimensions');
        expect(result).toHaveProperty('verdict');
        expect(result).toHaveProperty('review');
        expect(result).toHaveProperty('iterations');
        expect(result).toHaveProperty('judge_cards');

        // Verify review structure
        expect(result.review).toHaveProperty('summary');
        expect(result.review).toHaveProperty('inline');
        expect(result.review).toHaveProperty('citations');

        // Verify dimensions structure
        expect(Array.isArray(result.dimensions)).toBe(true);
        result.dimensions.forEach(dim => {
          expect(dim).toHaveProperty('name');
          expect(dim).toHaveProperty('score');
          expect(typeof dim.score).toBe('number');
        });

        // Verify judge cards structure
        expect(Array.isArray(result.judge_cards)).toBe(true);
        result.judge_cards.forEach(card => {
          expect(card).toHaveProperty('model');
          expect(card).toHaveProperty('score');
          expect(typeof card.score).toBe('number');
        });
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Performance in Tool Context', () => {
    it('should complete audit within reasonable time', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thoughtData: ThoughtData = {
          thought: `
Performance test for audit execution.

\`\`\`gan-config
{
  "task": "Performance test audit"
}
\`\`\`
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const startTime = Date.now();
        const result = await ganAuditor.auditThought(thoughtData, 'performance-test-session');
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(result).toBeDefined();
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});