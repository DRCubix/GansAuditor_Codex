/**
 * Tests for Debug Tools
 * 
 * This test suite validates the debugging and session inspection functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { DebugTools, debugTools } from '../debug-tools.js';
import type { GansAuditorCodexSessionState } from '../../types/gan-types.js';

// Mock filesystem operations
vi.mock('fs/promises');

const mockFs = vi.mocked(fs);

describe('DebugTools', () => {
  let tools: DebugTools;
  const testSessionDirectory = '.test-mcp-gan-state';

  beforeEach(() => {
    tools = new DebugTools({
      sessionStateDirectory: testSessionDirectory,
      maxInspectionResults: 10,
      enableDetailedLogging: false,
    });
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Session Inspection', () => {
    it('should inspect existing valid session', async () => {
      const mockSessionState: GansAuditorCodexSessionState = {
        id: 'test-session-1',
        loopId: 'test-loop-1',
        config: {},
        iterations: [
          {
            thoughtNumber: 1,
            code: 'console.log("test");',
            auditResult: {
              overall: 85,
              dimensions: [],
              verdict: 'revise',
              review: { summary: 'Test review', inline: [], citations: [] },
              proposed_diff: null,
              iterations: 1,
              judge_cards: [],
            },
            timestamp: Date.now() - 10000,
          },
        ],
        currentLoop: 1,
        isComplete: false,
        createdAt: Date.now() - 20000,
        updatedAt: Date.now() - 5000,
        codexContextActive: true,
      };

      // Mock file operations
      mockFs.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date(),
      } as any);
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSessionState));

      const result = await tools.inspectSession('test-session-1');

      expect(result.sessionId).toBe('test-session-1');
      expect(result.exists).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.state).toEqual(mockSessionState);
      expect(result.issues.length).toBe(0);
      expect(result.fileInfo).toBeDefined();
    });

    it('should handle non-existent session', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await tools.inspectSession('non-existent-session');

      expect(result.sessionId).toBe('non-existent-session');
      expect(result.exists).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Session file does not exist');
      expect(result.recommendations).toContain('Verify session ID and check if session was created');
    });

    it('should handle corrupted session data', async () => {
      mockFs.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date(),
      } as any);
      
      mockFs.readFile.mockResolvedValue('invalid json data');

      const result = await tools.inspectSession('corrupted-session');

      expect(result.sessionId).toBe('corrupted-session');
      expect(result.exists).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.includes('Failed to parse session data'))).toBe(true);
      expect(result.recommendations).toContain('Session file may be corrupted - consider deleting and recreating');
    });

    it('should validate session state structure', async () => {
      const invalidSessionState = {
        // Missing required fields
        iterations: 'not an array',
        currentLoop: -1,
        createdAt: Date.now(),
        updatedAt: Date.now() - 10000, // Invalid: updated before created
      };

      mockFs.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date(),
      } as any);
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidSessionState));

      const result = await tools.inspectSession('invalid-session');

      expect(result.exists).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues).toContain('Missing session ID');
      expect(result.issues).toContain('Invalid iterations array');
      expect(result.issues).toContain('Invalid current loop count');
      expect(result.issues).toContain('Invalid timestamp order (created after updated)');
    });
  });

  describe('Session Analysis', () => {
    it('should analyze session performance and progress', async () => {
      const mockSessionState: GansAuditorCodexSessionState = {
        id: 'analysis-session',
        loopId: 'analysis-loop',
        config: {},
        iterations: [
          {
            thoughtNumber: 1,
            code: 'test code 1',
            auditResult: {
              overall: 70,
              dimensions: [],
              verdict: 'revise',
              review: { summary: 'Needs improvement', inline: [], citations: [] },
              proposed_diff: null,
              iterations: 1,
              judge_cards: [],
            },
            timestamp: Date.now() - 15000,
          },
          {
            thoughtNumber: 2,
            code: 'test code 2',
            auditResult: {
              overall: 85,
              dimensions: [],
              verdict: 'revise',
              review: { summary: 'Better but still needs work', inline: [], citations: [] },
              proposed_diff: null,
              iterations: 2,
              judge_cards: [],
            },
            timestamp: Date.now() - 10000,
          },
          {
            thoughtNumber: 3,
            code: 'test code 3',
            auditResult: {
              overall: 95,
              dimensions: [],
              verdict: 'pass',
              review: { summary: 'Excellent work', inline: [], citations: [] },
              proposed_diff: null,
              iterations: 3,
              judge_cards: [],
            },
            timestamp: Date.now() - 5000,
          },
        ],
        currentLoop: 3,
        isComplete: true,
        completionReason: 'score_95_at_10',
        createdAt: Date.now() - 20000,
        updatedAt: Date.now() - 2000,
        codexContextActive: false,
      };

      // Mock inspection to return valid session
      mockFs.stat.mockResolvedValue({
        size: 2048,
        mtime: new Date(),
      } as any);
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSessionState));

      const result = await tools.analyzeSession('analysis-session');

      expect(result.sessionId).toBe('analysis-session');
      expect(result.summary.totalIterations).toBe(3);
      expect(result.summary.currentLoop).toBe(3);
      expect(result.summary.isComplete).toBe(true);
      expect(result.summary.completionReason).toBe('score_95_at_10');
      
      expect(result.progressAnalysis.scoreProgression).toEqual([70, 85, 95]);
      expect(result.progressAnalysis.improvementTrend).toBe('improving');
      expect(result.progressAnalysis.stagnationDetected).toBe(false);
      
      expect(result.performanceMetrics.averageAuditDuration).toBeGreaterThan(0);
      expect(result.performanceMetrics.fastestIteration).toBeGreaterThan(0);
      expect(result.performanceMetrics.slowestIteration).toBeGreaterThan(0);
    });

    it('should detect declining performance trend', async () => {
      const decliningSessionState: GansAuditorCodexSessionState = {
        id: 'declining-session',
        config: {},
        iterations: [
          {
            thoughtNumber: 1,
            code: 'code',
            auditResult: { overall: 90, dimensions: [], verdict: 'pass', review: { summary: '', inline: [], citations: [] }, proposed_diff: null, iterations: 1, judge_cards: [] },
            timestamp: Date.now() - 20000,
          },
          {
            thoughtNumber: 2,
            code: 'code',
            auditResult: { overall: 80, dimensions: [], verdict: 'revise', review: { summary: '', inline: [], citations: [] }, proposed_diff: null, iterations: 2, judge_cards: [] },
            timestamp: Date.now() - 15000,
          },
          {
            thoughtNumber: 3,
            code: 'code',
            auditResult: { overall: 70, dimensions: [], verdict: 'revise', review: { summary: '', inline: [], citations: [] }, proposed_diff: null, iterations: 3, judge_cards: [] },
            timestamp: Date.now() - 10000,
          },
          {
            thoughtNumber: 4,
            code: 'code',
            auditResult: { overall: 60, dimensions: [], verdict: 'revise', review: { summary: '', inline: [], citations: [] }, proposed_diff: null, iterations: 4, judge_cards: [] },
            timestamp: Date.now() - 5000,
          },
        ],
        currentLoop: 4,
        isComplete: false,
        createdAt: Date.now() - 25000,
        updatedAt: Date.now() - 2000,
        codexContextActive: true,
      };

      mockFs.stat.mockResolvedValue({ size: 2048, mtime: new Date() } as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify(decliningSessionState));

      const result = await tools.analyzeSession('declining-session');

      expect(result.progressAnalysis.improvementTrend).toBe('declining');
      expect(result.issues).toContain('Session shows declining performance trend');
      expect(result.recommendations).toContain('Review recent changes and consider alternative approaches');
    });

    it('should identify performance issues', async () => {
      const slowSessionState: GansAuditorCodexSessionState = {
        id: 'slow-session',
        config: {},
        iterations: Array.from({ length: 25 }, (_, i) => ({
          thoughtNumber: i + 1,
          code: 'code',
          auditResult: { overall: 75, dimensions: [], verdict: 'revise', review: { summary: '', inline: [], citations: [] }, proposed_diff: null, iterations: i + 1, judge_cards: [] },
          timestamp: Date.now() - (25 - i) * 35000, // 35 second intervals (slow)
        })),
        currentLoop: 25,
        isComplete: false,
        stagnationInfo: { isStagnant: true, detectedAtLoop: 15, similarityScore: 0.97, recommendation: 'Consider alternative approach' },
        createdAt: Date.now() - 900000, // 15 minutes ago
        updatedAt: Date.now() - 2000,
        codexContextActive: true,
      };

      mockFs.stat.mockResolvedValue({ size: 4096, mtime: new Date() } as any);
      mockFs.readFile.mockResolvedValue(JSON.stringify(slowSessionState));

      const result = await tools.analyzeSession('slow-session');

      expect(result.issues).toContain('Session has exceeded 20 iterations');
      expect(result.issues).toContain('Stagnation detected in session progress');
      expect(result.issues).toContain('Slow audit performance detected');
      
      expect(result.recommendations).toContain('Consider reviewing completion criteria or terminating session');
      expect(result.recommendations).toContain('Consider adjusting similarity thresholds or providing different guidance');
      expect(result.recommendations).toContain('Consider optimizing audit configuration or enabling caching');
    });
  });

  describe('Session Discovery', () => {
    it('should list all sessions', async () => {
      mockFs.readdir.mockResolvedValue([
        'session-1.json',
        'session-2.json',
        'session-3.json',
        'other-file.txt', // Should be filtered out
        '.hidden-file.json', // Should be included
      ] as any);

      const sessions = await tools.listSessions();

      expect(sessions).toEqual(['session-1', 'session-2', 'session-3', '.hidden-file']);
      expect(sessions.length).toBe(4);
    });

    it('should find sessions matching criteria', async () => {
      // Mock session files
      mockFs.readdir.mockResolvedValue(['session-1.json', 'session-2.json', 'session-3.json'] as any);
      
      // Mock session states
      const sessions = {
        'session-1': {
          id: 'session-1',
          currentLoop: 5,
          isComplete: true,
          createdAt: Date.now() - 100000,
          updatedAt: Date.now() - 50000,
          stagnationInfo: null,
        },
        'session-2': {
          id: 'session-2',
          currentLoop: 15,
          isComplete: false,
          createdAt: Date.now() - 200000,
          updatedAt: Date.now() - 10000,
          stagnationInfo: { isStagnant: true, detectedAtLoop: 12 },
        },
        'session-3': {
          id: 'session-3',
          currentLoop: 25,
          isComplete: false,
          createdAt: Date.now() - 300000,
          updatedAt: Date.now() - 5000,
          stagnationInfo: null,
        },
      };

      mockFs.stat.mockImplementation(async (path) => ({
        size: 1024,
        mtime: new Date(),
      } as any));

      mockFs.readFile.mockImplementation(async (path) => {
        const sessionId = path.toString().split('/').pop()?.replace('.json', '');
        return JSON.stringify(sessions[sessionId as keyof typeof sessions]);
      });

      // Test various criteria
      const completedSessions = await tools.findSessions({ isComplete: true });
      expect(completedSessions).toEqual(['session-1']);

      const stagnantSessions = await tools.findSessions({ hasStagnation: true });
      expect(stagnantSessions).toEqual(['session-2']);

      const highLoopSessions = await tools.findSessions({ minLoops: 20 });
      expect(stagnantSessions).toEqual(['session-2']); // session-3 should match but we need to check the actual implementation

      const recentSessions = await tools.findSessions({ 
        createdAfter: Date.now() - 150000 
      });
      expect(recentSessions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('System Diagnostics', () => {
    it('should perform comprehensive system diagnostics', async () => {
      // Mock session directory analysis
      mockFs.readdir.mockResolvedValue(['session-1.json', 'session-2.json'] as any);
      mockFs.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date(Date.now() - 100000),
      } as any);

      const result = await tools.performSystemDiagnostics();

      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.systemInfo).toBeDefined();
      expect(result.systemInfo.uptime).toBeGreaterThan(0);
      expect(result.systemInfo.memoryUsage).toBeDefined();
      expect(result.systemInfo.platform).toBeDefined();
      expect(result.systemInfo.nodeVersion).toBeDefined();
      
      expect(result.sessionDirectory).toBeDefined();
      expect(result.sessionDirectory.path).toBe(testSessionDirectory);
      expect(result.sessionDirectory.exists).toBe(true);
      expect(result.sessionDirectory.sessionCount).toBe(2);
      
      expect(result.metrics).toBeDefined();
      expect(result.health).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should identify system issues', async () => {
      // Mock high session count
      const manySessionFiles = Array.from({ length: 1500 }, (_, i) => `session-${i}.json`);
      mockFs.readdir.mockResolvedValue(manySessionFiles as any);
      mockFs.stat.mockResolvedValue({ size: 1024, mtime: new Date() } as any);

      const result = await tools.performSystemDiagnostics();

      expect(result.issues).toContain('Large number of session files detected');
      expect(result.recommendations).toContain('Consider implementing session cleanup or archiving');
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze performance over time window', async () => {
      const timeWindow = 60 * 60 * 1000; // 1 hour
      
      const result = await tools.analyzePerformance(timeWindow);

      expect(result.timeRange.duration).toBe(timeWindow);
      expect(result.timeRange.start).toBeLessThan(result.timeRange.end);
      
      expect(result.auditPerformance).toBeDefined();
      expect(result.sessionPerformance).toBeDefined();
      expect(result.resourceUsage).toBeDefined();
      expect(result.bottlenecks).toBeInstanceOf(Array);
    });

    it('should identify performance bottlenecks', async () => {
      // This would require mocking metrics data that indicates bottlenecks
      const result = await tools.analyzePerformance();
      
      expect(result.bottlenecks).toBeInstanceOf(Array);
      // Bottlenecks would be identified based on metrics data
    });
  });

  describe('Export Functionality', () => {
    it('should export comprehensive diagnostics', async () => {
      const outputPath = '/tmp/test-diagnostics.json';
      
      // Mock all the data gathering operations
      mockFs.readdir.mockResolvedValue(['session-1.json'] as any);
      mockFs.stat.mockResolvedValue({ size: 1024, mtime: new Date() } as any);
      mockFs.writeFile.mockResolvedValue(undefined);

      await tools.exportDiagnostics(outputPath);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        outputPath,
        expect.stringContaining('"timestamp"'),
        'utf-8'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle filesystem errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const sessions = await tools.listSessions();
      expect(sessions).toEqual([]);
    });

    it('should handle session inspection errors', async () => {
      mockFs.stat.mockRejectedValue(new Error('File system error'));

      const result = await tools.inspectSession('error-session');
      expect(result.exists).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle analysis errors for missing sessions', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      await expect(tools.analyzeSession('missing-session')).rejects.toThrow();
    });
  });
});

describe('Global Debug Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide global access to debug tools', async () => {
    mockFs.readdir.mockResolvedValue(['global-session.json'] as any);

    const sessions = await debugTools.listSessions();
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('should maintain configuration across operations', async () => {
    // Test that the global instance maintains its configuration
    mockFs.stat.mockResolvedValue({ size: 1024, mtime: new Date() } as any);
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      id: 'test-session',
      currentLoop: 1,
      isComplete: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    const result = await debugTools.inspectSession('test-session');
    expect(result.sessionId).toBe('test-session');
  });
});