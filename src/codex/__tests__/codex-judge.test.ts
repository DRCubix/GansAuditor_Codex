/**
 * Unit tests for GansAuditor_Codex CodexJudge implementation
 * 
 * Tests cover Codex CLI integration, error handling, response parsing,
 * and fallback scenarios for the GansAuditor_Codex system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import {
  CodexJudge,
  CodexNotAvailableError,
  CodexTimeoutError,
  CodexResponseError,
  type CodexJudgeConfig,
} from '../codex-judge.js';
import { createMockAuditRequest, createMockGanReview } from '../../__tests__/mocks/mock-codex-judge.js';
import { DEFAULT_AUDIT_RUBRIC } from '../../types/gan-types.js';

// Mock child_process.spawn
vi.mock('child_process');

describe('GansAuditor_Codex CodexJudge', () => {
  let codexJudge: CodexJudge;
  let mockSpawn: ReturnType<typeof vi.fn>;
  let mockChildProcess: EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
    kill: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock child process
    mockChildProcess = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      stdin: {
        write: vi.fn(),
        end: vi.fn(),
      },
      kill: vi.fn(),
    });

    // Mock spawn to return our mock child process
    mockSpawn = vi.mocked(spawn);
    mockSpawn.mockReturnValue(mockChildProcess as any);

    // Create CodexJudge instance with test configuration
    const config: CodexJudgeConfig = {
      executable: 'test-codex',
      timeout: 1000,
      retries: 1,
    };
    codexJudge = new CodexJudge(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when Codex CLI is available', async () => {
      // Simulate successful help command
      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await codexJudge.isAvailable();
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('test-codex', ['-h'], expect.any(Object));
    });

    it('should return false when Codex CLI is not available', async () => {
      // Simulate command failure
      setTimeout(() => {
        mockChildProcess.emit('error', new Error('Command not found'));
      }, 10);

      const result = await codexJudge.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should return version string when available', async () => {
      const versionOutput = 'codex version 1.2.3';
      
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', versionOutput);
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await codexJudge.getVersion();
      expect(result).toBe(versionOutput);
      expect(mockSpawn).toHaveBeenCalledWith('test-codex', ['--version'], expect.any(Object));
    });

    it('should return null when version command fails', async () => {
      setTimeout(() => {
        mockChildProcess.emit('error', new Error('Command failed'));
      }, 10);

      const result = await codexJudge.getVersion();
      expect(result).toBe(null);
    });
  });

  describe('executeAudit', () => {
    const mockRequest = createMockAuditRequest();

    it('should execute audit successfully with valid response', async () => {
      const mockResponse = createMockGanReview();
      const responseJson = JSON.stringify(mockResponse);

      // Mock availability check
      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      // Mock audit execution
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', responseJson);
        mockChildProcess.emit('close', 0);
      }, 20);

      const result = await codexJudge.executeAudit(mockRequest);
      
      expect(result).toEqual(mockResponse);
      expect(mockSpawn).toHaveBeenCalledTimes(2); // availability + audit
      expect(mockChildProcess.stdin.write).toHaveBeenCalled();
      expect(mockChildProcess.stdin.end).toHaveBeenCalled();
    });

    it('should throw CodexNotAvailableError when Codex is not available', async () => {
      // Mock availability check failure
      setTimeout(() => {
        mockChildProcess.emit('error', new Error('Command not found'));
      }, 10);

      await expect(codexJudge.executeAudit(mockRequest)).rejects.toThrow(CodexNotAvailableError);
    });

    it('should handle timeout errors', async () => {
      // Mock availability check
      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      // Don't emit close event to simulate timeout
      // The timeout will be triggered by the CodexJudge implementation
      // Now that fallbacks are removed, we expect a timeout error to be thrown

      await expect(codexJudge.executeAudit(mockRequest)).rejects.toThrow('Codex CLI execution timed out');
    });

    it('should handle Codex CLI execution errors', async () => {
      let callCount = 0;
      mockSpawn.mockImplementation((executable, args) => {
        callCount++;
        const mockChild = Object.assign(new EventEmitter(), {
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          stdin: { write: vi.fn(), end: vi.fn() },
          kill: vi.fn(),
        });

        if (args.includes('-h')) {
          // Availability check - succeed
          setTimeout(() => mockChild.emit('close', 0), 5);
        } else {
          // Audit command - fail with exit code 1
          setTimeout(() => {
            mockChild.stderr.emit('data', 'Codex error message');
            mockChild.emit('close', 1);
          }, 5);
        }

        return mockChild as any;
      });

      await expect(codexJudge.executeAudit(mockRequest)).rejects.toThrow('Codex CLI failed with exit code 1');
    });

    it('should parse valid JSON response correctly', async () => {
      const mockResponse = createMockGanReview({
        overall: 92,
        verdict: 'pass',
        review: {
          summary: 'Excellent code quality',
          inline: [
            { path: 'test.ts', line: 5, comment: 'Good implementation' }
          ],
          citations: ['repo://src/test.ts:1-10'],
        },
      });
      const responseJson = JSON.stringify(mockResponse);

      // Mock availability and execution
      setTimeout(() => mockChildProcess.emit('close', 0), 10);
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', responseJson);
        mockChildProcess.emit('close', 0);
      }, 20);

      const result = await codexJudge.executeAudit(mockRequest);
      
      expect(result.overall).toBe(92);
      expect(result.verdict).toBe('pass');
      expect(result.review.summary).toBe('Excellent code quality');
      expect(result.review.inline).toHaveLength(1);
      expect(result.review.inline[0].path).toBe('test.ts');
    });

    it('should handle malformed JSON with greedy parsing', async () => {
      // Malformed JSON response
      const malformedResponse = `{
        "overall": 75,
        "verdict": "revise",
        "dimensions": [
          {"name": "accuracy", "score": 80},
          {"name": "clarity", "score": 70}
        ],
        "review": {
          "summary": "Code needs improvement"
        },
        "iterations": 1
        // Missing closing brace and other issues
      `;

      // Mock availability and execution
      setTimeout(() => mockChildProcess.emit('close', 0), 10);
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', malformedResponse);
        mockChildProcess.emit('close', 0);
      }, 20);

      const result = await codexJudge.executeAudit(mockRequest);
      
      expect(result.overall).toBe(75);
      expect(result.verdict).toBe('revise');
      expect(result.dimensions).toHaveLength(5); // All dimensions filled in
      expect(result.dimensions.find(d => d.name === 'accuracy')?.score).toBe(80);
      expect(result.dimensions.find(d => d.name === 'clarity')?.score).toBe(70);
      expect(result.review.summary).toBe('Code needs improvement');
    });

    it('should provide fallback response for completely invalid JSON', async () => {
      const invalidResponse = 'This is not JSON at all!';

      // Mock availability and execution
      setTimeout(() => mockChildProcess.emit('close', 0), 10);
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', invalidResponse);
        mockChildProcess.emit('close', 0);
      }, 20);

      const result = await codexJudge.executeAudit(mockRequest);
      
      // Should get default dimensions from fallback
      expect(result.dimensions).toHaveLength(DEFAULT_AUDIT_RUBRIC.dimensions.length);
      expect(result.verdict).toBe('revise');
      expect(result.judge_cards).toHaveLength(1);
      expect(result.judge_cards[0].model).toBe('internal');
    });

    it('should validate and normalize response fields', async () => {
      const responseWithInvalidFields = {
        overall: 150, // Invalid: > 100
        verdict: 'invalid-verdict', // Invalid verdict
        dimensions: [
          { name: 'accuracy', score: -10 }, // Invalid: < 0
          { name: 'clarity', score: 'not-a-number' }, // Invalid type
          { invalidField: 'should-be-ignored' }, // Invalid structure
        ],
        review: {
          summary: 'Valid summary',
          inline: [
            { path: 'test.ts', line: 5, comment: 'Valid comment' },
            { invalidComment: 'missing-required-fields' }, // Invalid structure
          ],
          citations: ['valid-citation', 123], // Mixed valid/invalid
        },
        iterations: -1, // Invalid: < 1
        judge_cards: [
          { model: 'valid-model', score: 85 },
          { invalidCard: 'missing-fields' }, // Invalid structure
        ],
      };

      // Mock availability and execution
      setTimeout(() => mockChildProcess.emit('close', 0), 10);
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', JSON.stringify(responseWithInvalidFields));
        mockChildProcess.emit('close', 0);
      }, 20);

      const result = await codexJudge.executeAudit(mockRequest);
      
      // Validate normalization
      expect(result.overall).toBe(100); // Clamped to max
      expect(result.verdict).toBe('revise'); // Default for invalid
      expect(result.dimensions).toHaveLength(DEFAULT_AUDIT_RUBRIC.dimensions.length); // Fallback
      expect(result.review.inline).toHaveLength(1); // Only valid comment
      expect(result.review.citations).toEqual(['valid-citation']); // Only valid citation
      expect(result.iterations).toBe(1); // Minimum value
      expect(result.judge_cards).toHaveLength(1); // Only valid card
    });

    it('should retry on transient failures', async () => {
      const mockResponse = createMockGanReview();
      const responseJson = JSON.stringify(mockResponse);

      let callCount = 0;
      mockSpawn.mockImplementation((executable, args) => {
        callCount++;
        const mockChild = Object.assign(new EventEmitter(), {
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          stdin: { write: vi.fn(), end: vi.fn() },
          kill: vi.fn(),
        });

        if (args.includes('-h')) {
          // Availability check - always succeed
          setTimeout(() => mockChild.emit('close', 0), 5);
        } else if (callCount === 2) {
          // First audit attempt - fail with transient error
          setTimeout(() => mockChild.emit('error', new Error('Transient failure')), 5);
        } else if (callCount === 3) {
          // Second audit attempt - succeed
          setTimeout(() => {
            mockChild.stdout.emit('data', responseJson);
            mockChild.emit('close', 0);
          }, 5);
        }

        return mockChild as any;
      });

      const result = await codexJudge.executeAudit(mockRequest);
      
      expect(result).toEqual(mockResponse);
      expect(mockSpawn).toHaveBeenCalledTimes(3); // availability + 2 audit attempts
    });

    it('should generate appropriate audit prompt', async () => {
      const mockResponse = createMockGanReview();
      
      // Mock availability and execution
      setTimeout(() => mockChildProcess.emit('close', 0), 10);
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', JSON.stringify(mockResponse));
        mockChildProcess.emit('close', 0);
      }, 20);

      await codexJudge.executeAudit(mockRequest);
      
      // Verify that stdin.write was called with a structured prompt
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining(mockRequest.task)
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining(mockRequest.candidate)
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('rubric')
      );
    });
  });

  describe('error handling', () => {
    it('should throw timeout error instead of fallback response', async () => {
      const mockRequest = createMockAuditRequest();
      
      // Create a CodexJudge with very short timeout for testing
      const shortTimeoutJudge = new CodexJudge({ timeout: 1, retries: 0 });
      
      let callCount = 0;
      mockSpawn.mockImplementation((executable, args) => {
        callCount++;
        const mockChild = Object.assign(new EventEmitter(), {
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          stdin: { write: vi.fn(), end: vi.fn() },
          kill: vi.fn(),
        });

        if (args.includes('-h')) {
          // Availability check - succeed
          setTimeout(() => mockChild.emit('close', 0), 5);
        } else {
          // Audit command - don't emit close to simulate timeout
          // The timeout will be handled by the CodexJudge implementation
        }

        return mockChild as any;
      });
      
      // Should throw timeout error instead of returning fallback
      await expect(shortTimeoutJudge.executeAudit(mockRequest)).rejects.toThrow('Codex CLI execution timed out');
    });

    it('should handle process spawn errors', async () => {
      // Mock spawn to throw error during availability check
      mockSpawn.mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      const mockRequest = createMockAuditRequest();
      
      // Since spawn fails during availability check, we expect CodexNotAvailableError
      await expect(codexJudge.executeAudit(mockRequest)).rejects.toThrow(CodexNotAvailableError);
    });
  });

  describe('configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultJudge = new CodexJudge();
      expect(defaultJudge).toBeInstanceOf(CodexJudge);
    });

    it('should merge provided configuration with defaults', () => {
      const customConfig: Partial<CodexJudgeConfig> = {
        timeout: 5000,
        retries: 3,
      };
      const customJudge = new CodexJudge(customConfig);
      expect(customJudge).toBeInstanceOf(CodexJudge);
    });
  });
});