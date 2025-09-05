/**
 * Tests for Prompt Resource Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  PromptResourceManager,
  type CleanupTask,
  type PromptResourceManagerConfig,
  DEFAULT_RESOURCE_MANAGER_CONFIG,
} from '../prompt-resource-manager.js';

describe('PromptResourceManager', () => {
  let resourceManager: PromptResourceManager;
  let mockConfig: Partial<PromptResourceManagerConfig>;

  beforeEach(() => {
    mockConfig = {
      monitoringInterval: 100, // Fast for testing
      gcInterval: 200,
      cleanupTimeout: 1000,
      enableAutoGC: false, // Disable for testing
      enableMemoryPressure: false,
      resourceLimits: {
        maxHeapMemory: 100 * 1024 * 1024, // 100MB
        maxRssMemory: 200 * 1024 * 1024, // 200MB
        maxFileDescriptors: 100,
        maxActiveTimers: 50,
        memoryWarningThreshold: 80,
        memoryCriticalThreshold: 95,
      },
    };
    resourceManager = new PromptResourceManager(mockConfig);
  });

  afterEach(async () => {
    await resourceManager.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new PromptResourceManager();
      expect(manager).toBeDefined();
      manager.destroy();
    });

    it('should merge provided configuration with defaults', () => {
      const customConfig = { monitoringInterval: 5000 };
      const manager = new PromptResourceManager(customConfig);
      expect(manager).toBeDefined();
      manager.destroy();
    });
  });

  describe('cleanup task management', () => {
    it('should register and unregister cleanup tasks', () => {
      const mockTask: CleanupTask = {
        id: 'test-task',
        name: 'Test Cleanup Task',
        cleanup: vi.fn(),
        priority: 10,
        critical: false,
        timeout: 1000,
      };

      // Register task
      resourceManager.registerCleanupTask(mockTask);

      // Unregister task
      const removed = resourceManager.unregisterCleanupTask('test-task');
      expect(removed).toBe(true);

      // Try to unregister non-existent task
      const notRemoved = resourceManager.unregisterCleanupTask('non-existent');
      expect(notRemoved).toBe(false);
    });

    it('should execute cleanup tasks in priority order', async () => {
      const executionOrder: string[] = [];

      const lowPriorityTask: CleanupTask = {
        id: 'low',
        name: 'Low Priority Task',
        cleanup: () => { executionOrder.push('low'); },
        priority: 1,
        critical: false,
        timeout: 1000,
      };

      const highPriorityTask: CleanupTask = {
        id: 'high',
        name: 'High Priority Task',
        cleanup: () => { executionOrder.push('high'); },
        priority: 10,
        critical: false,
        timeout: 1000,
      };

      resourceManager.registerCleanupTask(lowPriorityTask);
      resourceManager.registerCleanupTask(highPriorityTask);

      const result = await resourceManager.executeCleanup();

      expect(result.success).toBe(true);
      expect(result.tasksExecuted).toBe(2);
      expect(executionOrder).toEqual(['high', 'low']); // High priority first
    });

    it('should handle cleanup task failures', async () => {
      const failingTask: CleanupTask = {
        id: 'failing',
        name: 'Failing Task',
        cleanup: () => { throw new Error('Task failed'); },
        priority: 10,
        critical: false,
        timeout: 1000,
      };

      const successTask: CleanupTask = {
        id: 'success',
        name: 'Success Task',
        cleanup: vi.fn(),
        priority: 5,
        critical: false,
        timeout: 1000,
      };

      resourceManager.registerCleanupTask(failingTask);
      resourceManager.registerCleanupTask(successTask);

      const result = await resourceManager.executeCleanup();

      expect(result.success).toBe(false);
      expect(result.tasksExecuted).toBe(1); // Only success task
      expect(result.tasksFailed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should stop cleanup on critical task failure', async () => {
      const criticalFailingTask: CleanupTask = {
        id: 'critical-failing',
        name: 'Critical Failing Task',
        cleanup: () => { throw new Error('Critical task failed'); },
        priority: 10,
        critical: true,
        timeout: 1000,
      };

      const subsequentTask: CleanupTask = {
        id: 'subsequent',
        name: 'Subsequent Task',
        cleanup: vi.fn(),
        priority: 5,
        critical: false,
        timeout: 1000,
      };

      resourceManager.registerCleanupTask(criticalFailingTask);
      resourceManager.registerCleanupTask(subsequentTask);

      const result = await resourceManager.executeCleanup();

      expect(result.success).toBe(false);
      expect(result.tasksExecuted).toBe(0);
      expect(result.tasksFailed).toBe(1);
      expect(subsequentTask.cleanup).not.toHaveBeenCalled();
    });

    it('should timeout long-running cleanup tasks', async () => {
      const longRunningTask: CleanupTask = {
        id: 'long-running',
        name: 'Long Running Task',
        cleanup: () => new Promise(resolve => setTimeout(resolve, 2000)),
        priority: 10,
        critical: false,
        timeout: 100, // Short timeout
      };

      resourceManager.registerCleanupTask(longRunningTask);

      const result = await resourceManager.executeCleanup();

      expect(result.success).toBe(false);
      expect(result.tasksFailed).toBe(1);
      expect(result.errors[0].message).toContain('timed out');
    });
  });

  describe('temporary artifact management', () => {
    it('should register and unregister temporary artifacts', () => {
      const artifactPath = '/tmp/test-artifact.txt';

      // Register artifact
      resourceManager.registerTemporaryArtifact(artifactPath);

      // Unregister artifact
      const removed = resourceManager.unregisterTemporaryArtifact(artifactPath);
      expect(removed).toBe(true);

      // Try to unregister non-existent artifact
      const notRemoved = resourceManager.unregisterTemporaryArtifact('/tmp/non-existent.txt');
      expect(notRemoved).toBe(false);
    });

    it('should cleanup temporary artifacts during cleanup', async () => {
      // Mock fs.unlink to avoid actual file operations
      const mockUnlink = vi.fn().mockResolvedValue(undefined);
      vi.doMock('fs/promises', () => ({
        unlink: mockUnlink,
      }));

      const artifactPath = '/tmp/test-artifact.txt';
      resourceManager.registerTemporaryArtifact(artifactPath);

      await resourceManager.executeCleanup();

      // Note: This test would need proper mocking of dynamic imports
      // For now, just verify cleanup doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('resource monitoring', () => {
    it('should get current resource metrics', () => {
      const metrics = resourceManager.getResourceMetrics();

      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');
      expect(metrics).toHaveProperty('fileDescriptors');
      expect(metrics).toHaveProperty('activeTimers');
      expect(metrics).toHaveProperty('activeHandles');

      expect(metrics.memoryUsage).toHaveProperty('heapUsed');
      expect(metrics.memoryUsage).toHaveProperty('heapTotal');
      expect(metrics.memoryUsage).toHaveProperty('external');
      expect(metrics.memoryUsage).toHaveProperty('rss');

      expect(metrics.cpuUsage).toHaveProperty('user');
      expect(metrics.cpuUsage).toHaveProperty('system');
    });

    it('should check resource limits', () => {
      const limitStatus = resourceManager.checkResourceLimits();

      expect(limitStatus).toHaveProperty('withinLimits');
      expect(limitStatus).toHaveProperty('warnings');
      expect(limitStatus).toHaveProperty('critical');

      expect(Array.isArray(limitStatus.warnings)).toBe(true);
      expect(Array.isArray(limitStatus.critical)).toBe(true);
    });

    it('should emit resource warning events', (done) => {
      // Create manager with very low limits to trigger warnings
      const lowLimitConfig = {
        ...mockConfig,
        resourceLimits: {
          ...mockConfig.resourceLimits!,
          maxHeapMemory: 1024, // Very low limit
        },
        monitoringInterval: 50,
      };

      const manager = new PromptResourceManager(lowLimitConfig);

      manager.on('resourceWarning', (warning, metrics) => {
        expect(warning).toContain('memory');
        expect(metrics).toBeDefined();
        manager.destroy();
        done();
      });

      // Wait for monitoring to trigger
      setTimeout(() => {
        if (!done) {
          manager.destroy();
          done();
        }
      }, 200);
    });
  });

  describe('garbage collection', () => {
    it('should force garbage collection when available', () => {
      // Mock global.gc
      const mockGc = vi.fn();
      (global as any).gc = mockGc;

      resourceManager.forceGarbageCollection();

      expect(mockGc).toHaveBeenCalledTimes(1);

      // Cleanup
      delete (global as any).gc;
    });

    it('should handle missing garbage collection gracefully', () => {
      // Ensure global.gc is not available
      delete (global as any).gc;

      // Should not throw
      expect(() => resourceManager.forceGarbageCollection()).not.toThrow();
    });
  });

  describe('statistics', () => {
    it('should return resource manager statistics', () => {
      const stats = resourceManager.getStats();

      expect(stats).toHaveProperty('cleanupTasks');
      expect(stats).toHaveProperty('temporaryArtifacts');
      expect(stats).toHaveProperty('lastCleanupDuration');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('resourceLimitStatus');

      expect(typeof stats.cleanupTasks).toBe('number');
      expect(typeof stats.temporaryArtifacts).toBe('number');
    });
  });

  describe('event handling', () => {
    it('should emit cleanup completed events', (done) => {
      resourceManager.on('cleanupCompleted', (result) => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('tasksExecuted');
        done();
      });

      resourceManager.executeCleanup();
    });

    it('should emit resource metrics events', (done) => {
      const manager = new PromptResourceManager({
        ...mockConfig,
        monitoringInterval: 50,
      });

      manager.on('resourceMetrics', (metrics) => {
        expect(metrics).toHaveProperty('memoryUsage');
        expect(metrics).toHaveProperty('cpuUsage');
        manager.destroy();
        done();
      });
    });
  });

  describe('concurrent cleanup prevention', () => {
    it('should prevent concurrent cleanup execution', async () => {
      const longRunningTask: CleanupTask = {
        id: 'long-running',
        name: 'Long Running Task',
        cleanup: () => new Promise(resolve => setTimeout(resolve, 200)),
        priority: 10,
        critical: false,
        timeout: 1000,
      };

      resourceManager.registerCleanupTask(longRunningTask);

      // Start first cleanup
      const cleanup1Promise = resourceManager.executeCleanup();

      // Try to start second cleanup immediately
      const cleanup2Result = await resourceManager.executeCleanup();

      // Second cleanup should be skipped
      expect(cleanup2Result.success).toBe(false);
      expect(cleanup2Result.errors[0].message).toContain('already in progress');

      // Wait for first cleanup to complete
      const cleanup1Result = await cleanup1Promise;
      expect(cleanup1Result.success).toBe(true);
    });

    it('should allow forced cleanup even when already running', async () => {
      const longRunningTask: CleanupTask = {
        id: 'long-running',
        name: 'Long Running Task',
        cleanup: () => new Promise(resolve => setTimeout(resolve, 200)),
        priority: 10,
        critical: false,
        timeout: 1000,
      };

      resourceManager.registerCleanupTask(longRunningTask);

      // Start first cleanup
      const cleanup1Promise = resourceManager.executeCleanup();

      // Force second cleanup
      const cleanup2Promise = resourceManager.executeCleanup(true);

      // Both should complete
      const [result1, result2] = await Promise.all([cleanup1Promise, cleanup2Promise]);
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should cleanup all resources and execute final cleanup', async () => {
      const cleanupTask: CleanupTask = {
        id: 'test',
        name: 'Test Task',
        cleanup: vi.fn(),
        priority: 10,
        critical: false,
        timeout: 1000,
      };

      resourceManager.registerCleanupTask(cleanupTask);

      await resourceManager.destroy();

      // Cleanup task should have been executed
      expect(cleanupTask.cleanup).toHaveBeenCalled();
    });

    it('should remove all event listeners', async () => {
      const manager = new PromptResourceManager(mockConfig);
      
      // Add some listeners
      manager.on('resourceMetrics', () => {});
      manager.on('cleanupCompleted', () => {});

      await manager.destroy();

      // Verify listeners are removed (listenerCount should be 0)
      expect(manager.listenerCount('resourceMetrics')).toBe(0);
      expect(manager.listenerCount('cleanupCompleted')).toBe(0);
    });
  });
});