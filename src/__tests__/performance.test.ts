/**
 * Performance tests for GansAuditor_Codex components
 * Tests context building and session management performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';

import { ContextPacker } from '../context/context-packer.js';
import { SessionManager } from '../session/session-manager.js';
import { SessionConfig } from '../types/gan-types.js';

describe('GansAuditor_Codex Performance Tests', () => {
  let tempDir: string;
  let contextPacker: ContextPacker;
  let sessionManager: SessionManager;

  beforeEach(() => {
    tempDir = join(tmpdir(), `gansauditor-codex-perf-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    contextPacker = new ContextPacker();
    sessionManager = new SessionManager(tempDir);
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Context Building Performance', () => {
    it('should build context for small repository within reasonable time', async () => {
      // Create a small test repository
      const repoDir = join(tempDir, 'small-repo');
      mkdirSync(repoDir, { recursive: true });
      
      // Create 10 small files
      for (let i = 0; i < 10; i++) {
        writeFileSync(
          join(repoDir, `file${i}.ts`),
          `// File ${i}\nexport const value${i} = ${i};\n`
        );
      }

      const config: SessionConfig = {
        task: 'test',
        scope: 'workspace',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      const startTime = performance.now();
      
      // Change to repo directory for context building
      const originalCwd = process.cwd();
      process.chdir(repoDir);
      
      try {
        const context = await contextPacker.buildContextPack(config);
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(context).toBeDefined();
        expect(context.length).toBeGreaterThan(0);
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle medium repository efficiently', async () => {
      // Create a medium test repository
      const repoDir = join(tempDir, 'medium-repo');
      mkdirSync(repoDir, { recursive: true });
      
      // Create nested directory structure with 50 files
      for (let i = 0; i < 5; i++) {
        const subDir = join(repoDir, `dir${i}`);
        mkdirSync(subDir, { recursive: true });
        
        for (let j = 0; j < 10; j++) {
          writeFileSync(
            join(subDir, `file${j}.ts`),
            `// File ${i}-${j}\n` + 'export const data = {\n' +
            Array.from({ length: 20 }, (_, k) => `  prop${k}: "value${k}"`).join(',\n') +
            '\n};\n'
          );
        }
      }

      const config: SessionConfig = {
        task: 'test',
        scope: 'workspace',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      const startTime = performance.now();
      
      const originalCwd = process.cwd();
      process.chdir(repoDir);
      
      try {
        const context = await contextPacker.buildContextPack(config);
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(context).toBeDefined();
        expect(context.length).toBeGreaterThan(0);
        expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should respect context size limits for large repositories', async () => {
      // Create a large test repository
      const repoDir = join(tempDir, 'large-repo');
      mkdirSync(repoDir, { recursive: true });
      
      // Create many files with substantial content
      for (let i = 0; i < 20; i++) {
        const subDir = join(repoDir, `module${i}`);
        mkdirSync(subDir, { recursive: true });
        
        for (let j = 0; j < 10; j++) {
          const content = `// Large file ${i}-${j}\n` +
            Array.from({ length: 100 }, (_, k) => 
              `export const func${k} = () => {\n  return "value${k}";\n};\n`
            ).join('\n');
          
          writeFileSync(join(subDir, `file${j}.ts`), content);
        }
      }

      const config: SessionConfig = {
        task: 'test',
        scope: 'workspace',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      const startTime = performance.now();
      
      const originalCwd = process.cwd();
      process.chdir(repoDir);
      
      try {
        const context = await contextPacker.buildContextPack(config);
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(context).toBeDefined();
        expect(context.length).toBeGreaterThan(0);
        expect(context.length).toBeLessThan(500000); // Should be truncated to reasonable size
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Session Management Performance', () => {
    it('should create sessions quickly', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'diff',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      const startTime = performance.now();
      
      const session = await sessionManager.createSession('test-session', config);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(session).toBeDefined();
      expect(session.id).toBe('test-session');
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle concurrent session operations efficiently', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'diff',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      const startTime = performance.now();
      
      // Create multiple sessions concurrently
      const sessionPromises = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve(sessionManager.createSession(`session-${i}`, config))
      );
      
      const sessions = await Promise.all(sessionPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(sessions).toHaveLength(10);
      sessions.forEach((session, i) => {
        expect(session.id).toBe(`session-${i}`);
      });
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it('should load sessions efficiently', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'diff',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      // Create a session first
      await sessionManager.createSession('load-test', config);

      const startTime = performance.now();
      
      const loadedSession = await sessionManager.getSession('load-test');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(loadedSession).toBeDefined();
      expect(loadedSession?.id).toBe('load-test');
      expect(duration).toBeLessThan(50); // Should complete within 50ms
    });

    it('should handle session cleanup efficiently', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'diff',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      // Create multiple sessions
      for (let i = 0; i < 20; i++) {
        await sessionManager.createSession(`cleanup-test-${i}`, config);
      }

      const startTime = performance.now();
      
      await sessionManager.cleanupSessions(0); // Clean up all sessions
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated context building', async () => {
      const repoDir = join(tempDir, 'memory-test-repo');
      mkdirSync(repoDir, { recursive: true });
      
      // Create test files
      for (let i = 0; i < 5; i++) {
        writeFileSync(
          join(repoDir, `file${i}.ts`),
          `export const data${i} = "test data ${i}";\n`
        );
      }

      const config: SessionConfig = {
        task: 'test',
        scope: 'workspace',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      const originalCwd = process.cwd();
      process.chdir(repoDir);
      
      try {
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Perform multiple context building operations
        for (let i = 0; i < 10; i++) {
          await contextPacker.buildContextPack(config);
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be reasonable (less than 50MB)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should not leak memory during repeated session operations', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'diff',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false
      };

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple session operations
      for (let i = 0; i < 100; i++) {
        const session = await sessionManager.createSession(`memory-test-${i}`, config);
        await sessionManager.updateSession(session);
        
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }
      
      // Clean up sessions
      await sessionManager.cleanupSessions(0);
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });
  });
});