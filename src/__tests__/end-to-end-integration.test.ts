/**
 * End-to-end integration tests for the complete GansAuditor_Codex workflow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

import { GanAuditor } from '../auditor/gan-auditor.js';
import { SessionManager } from '../session/session-manager.js';
import { ContextPacker } from '../context/context-packer.js';
import { MockCodexJudge } from './mocks/mock-codex-judge.js';
import { ThoughtData } from '../types/gan-types.js';
import { 
  sampleRepositories, 
  auditScenarios, 
  createTestRepository 
} from './fixtures/sample-repositories.js';

describe('GansAuditor_Codex End-to-End Integration Tests', () => {
  let tempDir: string;
  let ganAuditor: GanAuditor;
  let sessionManager: SessionManager;
  let contextPacker: ContextPacker;
  let mockCodexJudge: MockCodexJudge;

  beforeEach(() => {
    tempDir = join(tmpdir(), `gansauditor-codex-e2e-test-${Date.now()}`);
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

  describe('Complete Audit Workflows', () => {
    it('should complete full audit workflow for simple TypeScript project', async () => {
      // Create test repository
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      // Change to repo directory
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thought: ThoughtData = {
          thought: `
I've implemented a Calculator class with basic arithmetic operations.

\`\`\`gan-config
{
  "task": "Review TypeScript calculator implementation",
  "scope": "workspace",
  "threshold": 80
}
\`\`\`

The implementation includes proper error handling for division by zero.
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await ganAuditor.auditThought(thought, 'test-session');

        expect(result).toBeDefined();
        expect(result.overall).toBeGreaterThan(70);
        expect(result.verdict).toMatch(/pass|revise/);
        expect(result.review.summary).toBeDefined();
        expect(result.iterations).toBe(1);
        expect(result.judge_cards).toHaveLength(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle problematic code with appropriate feedback', async () => {
      // Create problematic code repository
      const repo = sampleRepositories.find(r => r.name === 'problematic-code-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thought: ThoughtData = {
          thought: `
I've written some JavaScript code that needs review.

\`\`\`gan-config
{
  "task": "Review code quality and security",
  "scope": "workspace",
  "threshold": 85
}
\`\`\`

Please check for any issues or improvements needed.
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await ganAuditor.auditThought(thought, 'problematic-session');

        expect(result).toBeDefined();
        expect(result.overall).toBeLessThan(70); // Should score poorly
        expect(result.verdict).toMatch(/revise|reject/);
        expect(result.review.inline.length).toBeGreaterThan(0); // Should have inline comments
        expect(result.review.summary).toContain('issue'); // Should mention issues
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle React component audit workflow', async () => {
      // Create React project repository
      const repo = sampleRepositories.find(r => r.name === 'react-component-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thought: ThoughtData = {
          thought: `
I've created React components for a UI library.

\`\`\`gan-config
{
  "task": "Review React component implementation",
  "scope": "workspace",
  "threshold": 85,
  "judges": ["internal"]
}
\`\`\`

The components include proper TypeScript types and accessibility features.
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await ganAuditor.auditThought(thought, 'react-session');

        expect(result).toBeDefined();
        expect(result.overall).toBeGreaterThan(80);
        expect(result.verdict).toBe('pass');
        expect(result.dimensions).toHaveLength(5);
        expect(result.review.summary).toBeDefined();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Session Continuity', () => {
    it('should maintain session state across multiple audit calls', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const sessionId = 'continuity-test-session';
        
        // First audit call
        const thought1: ThoughtData = {
          thought: `
Initial implementation of Calculator class.

\`\`\`gan-config
{
  "task": "Review initial implementation",
  "scope": "workspace",
  "threshold": 80
}
\`\`\`
          `,
          thoughtNumber: 1,
          totalThoughts: 2,
          nextThoughtNeeded: true
        };

        const result1 = await ganAuditor.auditThought(thought1, sessionId);
        expect(result1).toBeDefined();

        // Second audit call with same session
        const thought2: ThoughtData = {
          thought: `
Added error handling and improved documentation.

The Calculator now properly handles edge cases.
          `,
          thoughtNumber: 2,
          totalThoughts: 2,
          nextThoughtNeeded: false
        };

        const result2 = await ganAuditor.auditThought(thought2, sessionId);
        expect(result2).toBeDefined();

        // Verify session was reused
        const session = sessionManager.getSession(sessionId);
        expect(session).toBeDefined();
        expect(session!.history).toHaveLength(2);
        expect(session!.history[0].thoughtNumber).toBe(1);
        expect(session!.history[1].thoughtNumber).toBe(2);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle session configuration updates', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const sessionId = 'config-update-session';
        
        // First call with initial config
        const thought1: ThoughtData = {
          thought: `
Initial audit with default settings.

\`\`\`gan-config
{
  "threshold": 70
}
\`\`\`
          `,
          thoughtNumber: 1,
          totalThoughts: 2,
          nextThoughtNeeded: true
        };

        await ganAuditor.auditThought(thought1, sessionId);
        
        let session = sessionManager.getSession(sessionId);
        expect(session!.config.threshold).toBe(70);

        // Second call with updated config
        const thought2: ThoughtData = {
          thought: `
Updated audit with stricter threshold.

\`\`\`gan-config
{
  "threshold": 90,
  "scope": "diff"
}
\`\`\`
          `,
          thoughtNumber: 2,
          totalThoughts: 2,
          nextThoughtNeeded: false
        };

        await ganAuditor.auditThought(thought2, sessionId);
        
        session = sessionManager.getSession(sessionId);
        expect(session!.config.threshold).toBe(90);
        expect(session!.config.scope).toBe('diff');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Different Scope Modes', () => {
    it('should handle diff scope mode', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thought: ThoughtData = {
          thought: `
Review changes in git diff.

\`\`\`gan-config
{
  "scope": "diff",
  "task": "Review git changes"
}
\`\`\`
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await ganAuditor.auditThought(thought, 'diff-scope-session');
        
        expect(result).toBeDefined();
        expect(result.verdict).toMatch(/pass|revise|reject/);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle paths scope mode', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thought: ThoughtData = {
          thought: `
Review specific files.

\`\`\`gan-config
{
  "scope": "paths",
  "paths": ["src/index.ts"],
  "task": "Review Calculator class"
}
\`\`\`
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await ganAuditor.auditThought(thought, 'paths-scope-session');
        
        expect(result).toBeDefined();
        expect(result.verdict).toMatch(/pass|revise|reject/);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from context building failures', async () => {
      // Test with non-existent directory
      const originalCwd = process.cwd();
      const nonExistentDir = join(tempDir, 'non-existent');
      
      try {
        process.chdir(tempDir); // Change to temp dir instead of non-existent
        
        const thought: ThoughtData = {
          thought: `
Test error recovery.

\`\`\`gan-config
{
  "scope": "workspace"
}
\`\`\`
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await ganAuditor.auditThought(thought, 'error-recovery-session');
        
        // Should still return a result even with context building issues
        expect(result).toBeDefined();
        expect(result.verdict).toMatch(/pass|revise|reject/);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle malformed inline configuration gracefully', async () => {
      const repo = sampleRepositories.find(r => r.name === 'simple-typescript-project')!;
      const repoPath = createTestRepository(tempDir, repo);
      
      const originalCwd = process.cwd();
      process.chdir(repoPath);
      
      try {
        const thought: ThoughtData = {
          thought: `
Test with malformed config.

\`\`\`gan-config
{
  "threshold": "not-a-number",
  "scope": "invalid-scope",
  malformed json here
}
\`\`\`
          `,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false
        };

        const result = await ganAuditor.auditThought(thought, 'malformed-config-session');
        
        // Should use default configuration and still work
        expect(result).toBeDefined();
        expect(result.verdict).toMatch(/pass|revise|reject/);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Audit Scenario Validation', () => {
    auditScenarios.forEach(scenario => {
      it(`should handle ${scenario.name}`, async () => {
        // Create a temporary file with the scenario code
        const testDir = join(tempDir, scenario.name);
        mkdirSync(testDir, { recursive: true });
        
        const originalCwd = process.cwd();
        process.chdir(testDir);
        
        try {
          const thought: ThoughtData = {
            thought: `
${scenario.description}

\`\`\`typescript
${scenario.code}
\`\`\`

\`\`\`gan-config
{
  "task": "Review code quality",
  "scope": "workspace"
}
\`\`\`
            `,
            thoughtNumber: 1,
            totalThoughts: 1,
            nextThoughtNeeded: false
          };

          const result = await ganAuditor.auditThought(thought, `${scenario.name}-session`);
          
          expect(result).toBeDefined();
          expect(result.verdict).toBe(scenario.expectedVerdict);
          
          if (scenario.expectedScore) {
            expect(result.overall).toBeGreaterThanOrEqual(scenario.expectedScore - 10);
            expect(result.overall).toBeLessThanOrEqual(scenario.expectedScore + 10);
          }
          
          if (scenario.expectedIssues) {
            const reviewText = result.review.summary.toLowerCase();
            scenario.expectedIssues.forEach(issue => {
              expect(reviewText).toContain(issue.toLowerCase());
            });
          }
        } finally {
          process.chdir(originalCwd);
        }
      });
    });
  });
});