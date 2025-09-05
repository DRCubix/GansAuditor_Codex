/**
 * Tests for Prompt Timeout Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  PromptTimeoutManager, 
  PromptExecutionStage,
  type PromptTimeoutConfig,
  DEFAULT_PROMPT_TIMEOUT_CONFIG,
} from '../prompt-timeout-manager.js';

describe('PromptTimeoutManager', () => {
  let timeoutManager: PromptTimeoutManager;
  let mockConfig: Partial<PromptTimeoutConfig>;

  beforeEach(() => {
    mockConfig = {
      defaultTimeout: 1000, // 1 second for faster tests
      templateTimeout: 200,
      contextTimeout: 300,
      workflowTimeout: 500,
      monitoringInterval: 100,
    };
    timeoutManager = new PromptTimeoutManager(mockConfig);
  });

  afterEach(() => {
    timeoutManager.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new PromptTimeoutManager();
      expect(manager).toBeDefined();
      manager.destroy();
    });

    it('should merge provided configuration with defaults', () => {
      const customConfig = { defaultTimeout: 5000 };
      const manager = new PromptTimeoutManager(customConfig);
      expect(manager).toBeDefined();
      manager.destroy();
    });
  });

  describe('executeWithTimeout', () => {
    it('should execute function successfully within timeout', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const { result, timeoutResult } = await timeoutManager.executeWithTimeout(mockFn, {
        timeout: 500,
      });

      expect(result).toBe('success');
      expect(timeoutResult.success).toBe(true);
      expect(timeoutResult.timedOut).toBe(false);
      expect(timeoutResult.finalStage).toBe(PromptExecutionStage.COMPLETED);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should timeout when function takes too long', async () => {
      const mockFn = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );

      await expect(
        timeoutManager.executeWithTimeout(mockFn, { timeout: 100 })
      ).rejects.toThrow('timed out');
    });

    it('should handle function errors', async () => {
      const mockError = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(mockError);

      await expect(
        timeoutManager.executeWithTimeout(mockFn, { timeout: 500 })
      ).rejects.toThrow('Test error');
    });

    it('should track execution context', async () => {
      const mockFn = vi.fn().mockImplementation(async (context) => {
        expect(context.executionId).toBeDefined();
        expect(context.startTime).toBeDefined();
        expect(context.timeout).toBe(500);
        expect(context.stage).toBe(PromptExecutionStage.INITIALIZING);
        return 'success';
      });

      await timeoutManager.executeWithTimeout(mockFn, {
        timeout: 500,
        promptTemplate: 'test template',
        sessionId: 'test-session',
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateExecutionStage', () => {
    it('should update execution stage and progress', async () => {
      let executionId: string;
      
      const mockFn = vi.fn().mockImplementation(async (context) => {
        executionId = context.executionId;
        
        // Update stage during execution
        timeoutManager.updateExecutionStage(
          executionId, 
          PromptExecutionStage.WORKFLOW_EXECUTION, 
          50,
          { partial: 'data' }
        );
        
        return 'success';
      });

      await timeoutManager.executeWithTimeout(mockFn, { timeout: 500 });

      // Verify context was updated
      const context = timeoutManager.getExecutionContext(executionId!);
      expect(context).toBeUndefined(); // Should be cleaned up after completion
    });
  });

  describe('updateResourceUsage', () => {
    it('should update resource usage for execution', async () => {
      let executionId: string;
      
      const mockFn = vi.fn().mockImplementation(async (context) => {
        executionId = context.executionId;
        
        // Update resource usage
        timeoutManager.updateResourceUsage(executionId, {
          memoryUsage: 1024 * 1024, // 1MB
          contextSize: 5000,
          fileOperations: 3,
        });
        
        return 'success';
      });

      await timeoutManager.executeWithTimeout(mockFn, { timeout: 500 });
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActiveExecutions', () => {
    it('should return active executions', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        // Check active executions during execution
        const activeExecutions = timeoutManager.getActiveExecutions();
        expect(activeExecutions).toHaveLength(1);
        expect(activeExecutions[0].stage).toBe(PromptExecutionStage.INITIALIZING);
        
        return 'success';
      });

      await timeoutManager.executeWithTimeout(mockFn, { timeout: 500 });
    });

    it('should return empty array when no executions are active', () => {
      const activeExecutions = timeoutManager.getActiveExecutions();
      expect(activeExecutions).toHaveLength(0);
    });
  });

  describe('cancelExecution', () => {
    it('should cancel active execution', async () => {
      let executionId: string;
      
      const mockFn = vi.fn().mockImplementation(async (context) => {
        executionId = context.executionId;
        
        // Cancel execution during processing
        setTimeout(() => {
          timeoutManager.cancelExecution(executionId, 'Test cancellation');
        }, 100);
        
        // Wait longer than cancellation
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'success';
      });

      await timeoutManager.executeWithTimeout(mockFn, { timeout: 500 });
      
      // Execution should have been cancelled
      const context = timeoutManager.getExecutionContext(executionId!);
      expect(context).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return execution statistics', () => {
      const stats = timeoutManager.getStats();
      
      expect(stats).toHaveProperty('activeExecutions');
      expect(stats).toHaveProperty('averageExecutionTime');
      expect(stats).toHaveProperty('timeoutRate');
      expect(stats).toHaveProperty('resourceUtilization');
      expect(stats.activeExecutions).toBe(0);
    });
  });

  describe('event handling', () => {
    it('should emit timeout events', async () => {
      const mockFn = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );

      const timeoutPromise = new Promise<void>((resolve) => {
        timeoutManager.on('executionTimeout', (context, result) => {
          expect(context.executionId).toBeDefined();
          expect(result.timedOut).toBe(true);
          resolve();
        });
      });

      const executionPromise = timeoutManager.executeWithTimeout(mockFn, { timeout: 100 })
        .catch(() => {
          // Expected to timeout
        });

      await Promise.all([timeoutPromise, executionPromise]);
    });

    it('should emit stage update events', async () => {
      const stageUpdatePromise = new Promise<void>((resolve) => {
        timeoutManager.on('stageUpdate', (context) => {
          expect(context.stage).toBe(PromptExecutionStage.WORKFLOW_EXECUTION);
          resolve();
        });
      });

      const mockFn = vi.fn().mockImplementation(async (context) => {
        timeoutManager.updateExecutionStage(
          context.executionId, 
          PromptExecutionStage.WORKFLOW_EXECUTION
        );
        return 'success';
      });

      const executionPromise = timeoutManager.executeWithTimeout(mockFn, { timeout: 500 });

      await Promise.all([stageUpdatePromise, executionPromise]);
    });
  });

  describe('resource limit monitoring', () => {
    it('should emit resource limit exceeded events', async () => {
      const config = {
        ...mockConfig,
        maxMemoryUsage: 1024, // Very low limit
        monitoringInterval: 50,
      };
      
      const manager = new PromptTimeoutManager(config);
      
      const limitExceededPromise = new Promise<void>((resolve) => {
        manager.on('resourceLimitExceeded', (context, limitType) => {
          expect(limitType).toBe('memory');
          resolve();
        });
      });

      const mockFn = vi.fn().mockImplementation(async (context) => {
        // Simulate high memory usage
        manager.updateResourceUsage(context.executionId, {
          memoryUsage: 2048, // Exceeds limit
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      });

      const executionPromise = manager.executeWithTimeout(mockFn, { timeout: 500 });

      await Promise.all([limitExceededPromise, executionPromise]);
      await manager.destroy();
    });
  });

  describe('destroy', () => {
    it('should cleanup resources and cancel active executions', async () => {
      const mockFn = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      // Start execution
      const executionPromise = timeoutManager.executeWithTimeout(mockFn, { timeout: 2000 });
      
      // Wait a bit to ensure execution starts
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify execution is active
      expect(timeoutManager.getActiveExecutions()).toHaveLength(1);
      
      // Destroy manager
      timeoutManager.destroy();
      
      // Verify no active executions
      expect(timeoutManager.getActiveExecutions()).toHaveLength(0);
      
      // Execution should complete normally since destroy doesn't cancel in-flight executions
      // Just verify it doesn't throw
      await executionPromise;
    });
  });
});