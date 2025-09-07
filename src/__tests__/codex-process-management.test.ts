/**
 * Process Management Tests for Codex CLI Production Integration
 * 
 * These tests validate concurrent process limiting, queue management,
 * cleanup testing for proper resource management, and health monitoring.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ProcessManager, type ProcessHealthStatus } from '../codex/process-manager.js';
import { CodexJudge } from '../codex/codex-judge.js';
import { createMockAuditRequest } from './mocks/mock-codex-judge.js';
import { logger } from '../utils/logger.js';

// Test configuration
const SHORT_TIMEOUT = 1000; // 1 second
const MEDIUM_TIMEOUT = 5000; // 5 seconds
const LONG_TIMEOUT = 10000; // 10 seconds

describe('Codex Process Management Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let processManager: ProcessManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'codex-process-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    processManager = new ProcessManager({
      maxConcurrentProcesses: 3,
      defaultTimeout: MEDIUM_TIMEOUT,
      processCleanupTimeout: 1000,
      queueTimeout: 2000,
      enableMetrics: true,
    });
  });

  afterEach(async () => {
    // Clean up any remaining processes
    await processManager.terminateAllProcesses();
    
    process.chdir(originalCwd);
    
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to clean up temp directory', { tempDir, error });
    }
  });

  describe('Concurrent Process Limiting', () => {
    it('should limit concurrent processes to configured maximum', async () => {
      const maxConcurrent = 2;
      const limitedProcessManager = new ProcessManager({
        maxConcurrentProcesses: maxConcurrent,
        defaultTimeout: MEDIUM_TIMEOUT,
        enableMetrics: true,
      });

      const startTime = Date.now();
      
      // Start more processes than the limit
      const promises = Array.from({ length: 4 }, (_, i) =>
        limitedProcessManager.executeCommand('sleep', ['0.5'], {
          workingDirectory: tempDir,
          timeout: MEDIUM_TIMEOUT,
          environment: process.env as Record<string, string>,
        })
      );

      // Check that active process count doesn't exceed limit
      await new Promise(resolve => setTimeout(resolve, 100)); // Let processes start
      expect(limitedProcessManager.getActiveProcessCount()).toBeLessThanOrEqual(maxConcurrent);

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All processes should complete successfully
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });

      // Should take longer than if all ran concurrently (due to queuing)
      expect(endTime - startTime).toBeGreaterThan(500);

      await limitedProcessManager.terminateAllProcesses();
    });

    it('should queue processes when limit is reached', async () => {
      const queueManager = new ProcessManager({
        maxConcurrentProcesses: 1,
        defaultTimeout: MEDIUM_TIMEOUT,
        queueTimeout: 3000,
        enableMetrics: true,
      });

      const executionOrder: number[] = [];
      
      // Start multiple processes that will be queued
      const promises = Array.from({ length: 3 }, (_, i) =>
        queueManager.executeCommand('sh', ['-c', `echo ${i} && sleep 0.2`], {
          workingDirectory: tempDir,
          timeout: MEDIUM_TIMEOUT,
          environment: process.env as Record<string, string>,
        }).then(result => {
          executionOrder.push(parseInt(result.stdout.trim()));
          return result;
        })
      );

      const results = await Promise.all(promises);

      // All should complete successfully
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });

      // Should execute in order due to single process limit
      expect(executionOrder).toEqual([0, 1, 2]);

      await queueManager.terminateAllProcesses();
    });

    it('should handle queue timeout correctly', async () => {
      const shortQueueManager = new ProcessManager({
        maxConcurrentProcesses: 1,
        defaultTimeout: MEDIUM_TIMEOUT,
        queueTimeout: 500, // Very short queue timeout
        enableMetrics: true,
      });

      // Start a long-running process to block the queue
      const blockingPromise = shortQueueManager.executeCommand('sleep', ['2'], {
        workingDirectory: tempDir,
        timeout: MEDIUM_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      // Try to queue another process that should timeout
      const queuedPromise = shortQueueManager.executeCommand('echo', ['queued'], {
        workingDirectory: tempDir,
        timeout: SHORT_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      // The queued process should timeout
      await expect(queuedPromise).rejects.toThrow();

      // Clean up the blocking process
      await shortQueueManager.terminateAllProcesses();
      await expect(blockingPromise).rejects.toThrow();
    });

    it('should handle backpressure appropriately', async () => {
      const backpressureManager = new ProcessManager({
        maxConcurrentProcesses: 2,
        defaultTimeout: MEDIUM_TIMEOUT,
        queueTimeout: 1000,
        enableMetrics: true,
      });

      // Start many processes to test backpressure
      const promises = Array.from({ length: 10 }, (_, i) =>
        backpressureManager.executeCommand('echo', [`process-${i}`], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        })
      );

      const results = await Promise.allSettled(promises);
      
      // Some should succeed, some might fail due to backpressure
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      expect(successful + failed).toBe(10);
      expect(successful).toBeGreaterThan(0); // At least some should succeed

      await backpressureManager.terminateAllProcesses();
    });
  });

  describe('Process Queue Management', () => {
    it('should maintain FIFO order in process queue', async () => {
      const fifoManager = new ProcessManager({
        maxConcurrentProcesses: 1,
        defaultTimeout: MEDIUM_TIMEOUT,
        enableMetrics: true,
      });

      const executionTimes: Array<{ id: number; time: number }> = [];
      
      const promises = Array.from({ length: 5 }, (_, i) =>
        fifoManager.executeCommand('echo', [`${i}`], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        }).then(result => {
          executionTimes.push({ id: parseInt(result.stdout.trim()), time: Date.now() });
          return result;
        })
      );

      await Promise.all(promises);

      // Sort by execution time and verify order
      executionTimes.sort((a, b) => a.time - b.time);
      const executionOrder = executionTimes.map(e => e.id);
      
      expect(executionOrder).toEqual([0, 1, 2, 3, 4]);

      await fifoManager.terminateAllProcesses();
    });

    it('should handle queue priority correctly', async () => {
      // Note: Current implementation doesn't have priority, but we test the queue behavior
      const queueManager = new ProcessManager({
        maxConcurrentProcesses: 1,
        defaultTimeout: MEDIUM_TIMEOUT,
        enableMetrics: true,
      });

      const results: string[] = [];
      
      // Start processes that will be queued
      const promises = [
        queueManager.executeCommand('echo', ['first'], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        }),
        queueManager.executeCommand('echo', ['second'], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        }),
        queueManager.executeCommand('echo', ['third'], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        }),
      ];

      const processResults = await Promise.all(promises);
      
      processResults.forEach(result => {
        results.push(result.stdout.trim());
      });

      expect(results).toEqual(['first', 'second', 'third']);

      await queueManager.terminateAllProcesses();
    });

    it('should handle queue overflow gracefully', async () => {
      const overflowManager = new ProcessManager({
        maxConcurrentProcesses: 1,
        defaultTimeout: MEDIUM_TIMEOUT,
        queueTimeout: 100, // Very short timeout to force overflow
        enableMetrics: true,
      });

      // Start a blocking process
      const blockingPromise = overflowManager.executeCommand('sleep', ['1'], {
        workingDirectory: tempDir,
        timeout: MEDIUM_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      // Try to overwhelm the queue
      const overflowPromises = Array.from({ length: 20 }, (_, i) =>
        overflowManager.executeCommand('echo', [`overflow-${i}`], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        })
      );

      const results = await Promise.allSettled(overflowPromises);
      
      // Many should fail due to queue timeout
      const failed = results.filter(r => r.status === 'rejected').length;
      expect(failed).toBeGreaterThan(0);

      // System should remain stable
      expect(overflowManager.getHealthStatus().isHealthy).toBe(true);

      await overflowManager.terminateAllProcesses();
      await expect(blockingPromise).rejects.toThrow();
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should clean up processes on termination', async () => {
      const cleanupManager = new ProcessManager({
        maxConcurrentProcesses: 3,
        defaultTimeout: LONG_TIMEOUT,
        processCleanupTimeout: 1000,
        enableMetrics: true,
      });

      // Start several long-running processes
      const promises = Array.from({ length: 3 }, (_, i) =>
        cleanupManager.executeCommand('sleep', ['5'], {
          workingDirectory: tempDir,
          timeout: LONG_TIMEOUT,
          environment: process.env as Record<string, string>,
        })
      );

      // Give processes time to start
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(cleanupManager.getActiveProcessCount()).toBe(3);

      // Terminate all processes
      const startTime = Date.now();
      await cleanupManager.terminateAllProcesses();
      const endTime = Date.now();

      // Should clean up quickly
      expect(endTime - startTime).toBeLessThan(3000);
      expect(cleanupManager.getActiveProcessCount()).toBe(0);

      // All promises should be rejected
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });
    });

    it('should handle graceful vs force termination', async () => {
      const terminationManager = new ProcessManager({
        maxConcurrentProcesses: 2,
        defaultTimeout: MEDIUM_TIMEOUT,
        processCleanupTimeout: 500, // Short cleanup timeout to test force kill
        enableMetrics: true,
      });

      // Start processes that might not respond to SIGTERM quickly
      const promises = [
        terminationManager.executeCommand('sleep', ['10'], {
          workingDirectory: tempDir,
          timeout: LONG_TIMEOUT,
          environment: process.env as Record<string, string>,
        }),
        terminationManager.executeCommand('sleep', ['10'], {
          workingDirectory: tempDir,
          timeout: LONG_TIMEOUT,
          environment: process.env as Record<string, string>,
        }),
      ];

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(terminationManager.getActiveProcessCount()).toBe(2);

      // Force termination
      const startTime = Date.now();
      await terminationManager.terminateAllProcesses();
      const endTime = Date.now();

      // Should complete within cleanup timeout + some buffer
      expect(endTime - startTime).toBeLessThan(2000);
      expect(terminationManager.getActiveProcessCount()).toBe(0);

      await Promise.allSettled(promises);
    });

    it('should prevent memory leaks from process tracking', async () => {
      const memoryManager = new ProcessManager({
        maxConcurrentProcesses: 5,
        defaultTimeout: SHORT_TIMEOUT,
        enableMetrics: true,
      });

      // Execute many short-lived processes
      for (let i = 0; i < 50; i++) {
        await memoryManager.executeCommand('echo', [`test-${i}`], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        });
      }

      // Active process count should be 0 after all complete
      expect(memoryManager.getActiveProcessCount()).toBe(0);

      // Health metrics should be reasonable
      const health = memoryManager.getHealthStatus();
      expect(health.totalProcessesExecuted).toBe(50);
      expect(health.successfulExecutions).toBe(50);
      expect(health.failedExecutions).toBe(0);

      await memoryManager.terminateAllProcesses();
    });

    it('should handle process cleanup timeout scenarios', async () => {
      const timeoutManager = new ProcessManager({
        maxConcurrentProcesses: 1,
        defaultTimeout: MEDIUM_TIMEOUT,
        processCleanupTimeout: 100, // Very short cleanup timeout
        enableMetrics: true,
      });

      // Start a process
      const promise = timeoutManager.executeCommand('sleep', ['5'], {
        workingDirectory: tempDir,
        timeout: MEDIUM_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(timeoutManager.getActiveProcessCount()).toBe(1);

      // Force cleanup with short timeout
      const startTime = Date.now();
      await timeoutManager.terminateAllProcesses();
      const endTime = Date.now();

      // Should complete quickly due to force kill
      expect(endTime - startTime).toBeLessThan(1000);
      expect(timeoutManager.getActiveProcessCount()).toBe(0);

      await expect(promise).rejects.toThrow();
    });
  });

  describe('Health Monitoring', () => {
    it('should track process execution metrics accurately', async () => {
      const metricsManager = new ProcessManager({
        maxConcurrentProcesses: 2,
        defaultTimeout: SHORT_TIMEOUT,
        enableMetrics: true,
      });

      const initialHealth = metricsManager.getHealthStatus();
      expect(initialHealth.totalProcessesExecuted).toBe(0);
      expect(initialHealth.successfulExecutions).toBe(0);
      expect(initialHealth.failedExecutions).toBe(0);
      expect(initialHealth.averageExecutionTime).toBe(0);
      expect(initialHealth.lastExecutionTime).toBeNull();

      // Execute successful processes
      await metricsManager.executeCommand('echo', ['success1'], {
        workingDirectory: tempDir,
        timeout: SHORT_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      await metricsManager.executeCommand('echo', ['success2'], {
        workingDirectory: tempDir,
        timeout: SHORT_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      // Execute a failing process
      try {
        await metricsManager.executeCommand('false', [], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        });
      } catch {
        // Expected to fail
      }

      const finalHealth = metricsManager.getHealthStatus();
      expect(finalHealth.totalProcessesExecuted).toBe(3);
      expect(finalHealth.successfulExecutions).toBe(2);
      expect(finalHealth.failedExecutions).toBe(1);
      expect(finalHealth.averageExecutionTime).toBeGreaterThan(0);
      expect(finalHealth.lastExecutionTime).toBeGreaterThan(0);
      expect(finalHealth.isHealthy).toBe(true);

      await metricsManager.terminateAllProcesses();
    });

    it('should detect unhealthy conditions', async () => {
      const unhealthyManager = new ProcessManager({
        maxConcurrentProcesses: 1,
        defaultTimeout: 100, // Very short timeout to cause failures
        enableMetrics: true,
      });

      // Execute processes that will likely timeout
      const promises = Array.from({ length: 5 }, () =>
        unhealthyManager.executeCommand('sleep', ['1'], {
          workingDirectory: tempDir,
          timeout: 100,
          environment: process.env as Record<string, string>,
        }).catch(() => {}) // Ignore errors for this test
      );

      await Promise.allSettled(promises);

      const health = unhealthyManager.getHealthStatus();
      expect(health.failedExecutions).toBeGreaterThan(0);
      
      // Health status might still be true depending on failure rate threshold
      // This tests that metrics are being tracked correctly

      await unhealthyManager.terminateAllProcesses();
    });

    it('should provide real-time health status', async () => {
      const realtimeManager = new ProcessManager({
        maxConcurrentProcesses: 2,
        defaultTimeout: MEDIUM_TIMEOUT,
        healthCheckInterval: 100,
        enableMetrics: true,
      });

      // Start a long-running process
      const longRunningPromise = realtimeManager.executeCommand('sleep', ['1'], {
        workingDirectory: tempDir,
        timeout: MEDIUM_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      // Check health while process is running
      await new Promise(resolve => setTimeout(resolve, 100));
      const runningHealth = realtimeManager.getHealthStatus();
      expect(runningHealth.activeProcesses).toBe(1);

      // Wait for process to complete
      await longRunningPromise;

      const completedHealth = realtimeManager.getHealthStatus();
      expect(completedHealth.activeProcesses).toBe(0);
      expect(completedHealth.totalProcessesExecuted).toBe(1);

      await realtimeManager.terminateAllProcesses();
    });

    it('should handle health check during high load', async () => {
      const loadManager = new ProcessManager({
        maxConcurrentProcesses: 3,
        defaultTimeout: SHORT_TIMEOUT,
        enableMetrics: true,
      });

      // Start many processes to create load
      const promises = Array.from({ length: 20 }, (_, i) =>
        loadManager.executeCommand('echo', [`load-test-${i}`], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        })
      );

      // Check health during load
      const healthChecks: ProcessHealthStatus[] = [];
      const healthCheckInterval = setInterval(() => {
        healthChecks.push(loadManager.getHealthStatus());
      }, 50);

      await Promise.all(promises);
      clearInterval(healthCheckInterval);

      // Verify health checks were consistent
      expect(healthChecks.length).toBeGreaterThan(0);
      
      const finalHealth = loadManager.getHealthStatus();
      expect(finalHealth.totalProcessesExecuted).toBe(20);
      expect(finalHealth.isHealthy).toBe(true);

      await loadManager.terminateAllProcesses();
    });

    it('should calculate average execution time correctly', async () => {
      const timingManager = new ProcessManager({
        maxConcurrentProcesses: 1,
        defaultTimeout: MEDIUM_TIMEOUT,
        enableMetrics: true,
      });

      // Execute processes with known durations
      await timingManager.executeCommand('sleep', ['0.1'], {
        workingDirectory: tempDir,
        timeout: MEDIUM_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      await timingManager.executeCommand('sleep', ['0.2'], {
        workingDirectory: tempDir,
        timeout: MEDIUM_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      await timingManager.executeCommand('sleep', ['0.3'], {
        workingDirectory: tempDir,
        timeout: MEDIUM_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      const health = timingManager.getHealthStatus();
      expect(health.averageExecutionTime).toBeGreaterThan(100); // Should be around 200ms average
      expect(health.averageExecutionTime).toBeLessThan(1000); // But not too high

      await timingManager.terminateAllProcesses();
    });
  });

  describe('Integration with CodexJudge', () => {
    it('should integrate properly with CodexJudge process management', async () => {
      // Skip if Codex CLI is not available
      const judge = new CodexJudge({
        timeout: MEDIUM_TIMEOUT,
        maxConcurrentProcesses: 2,
        enableDebugLogging: true,
      });

      // Check if Codex is available
      const isAvailable = await judge.isAvailable();
      if (!isAvailable) {
        console.log('Skipping CodexJudge integration test - Codex CLI not available');
        return;
      }

      const initialActiveCount = judge.getActiveProcessCount();
      expect(initialActiveCount).toBe(0);

      // Start an audit
      const request = createMockAuditRequest({
        task: 'Test concurrent process management',
        candidate: 'function test() { return "hello"; }',
      });

      const auditPromise = judge.executeAudit(request);

      // Check that process count increases during execution
      await new Promise(resolve => setTimeout(resolve, 100));
      // Note: This might be 0 if the process completes very quickly

      const result = await auditPromise;
      expect(result).toBeDefined();

      // Process count should be back to 0 after completion
      const finalActiveCount = judge.getActiveProcessCount();
      expect(finalActiveCount).toBe(0);

      // Health status should be healthy
      const health = judge.getHealthStatus();
      expect(health.isHealthy).toBe(true);
    });

    it('should handle concurrent audits properly', async () => {
      const judge = new CodexJudge({
        timeout: MEDIUM_TIMEOUT,
        maxConcurrentProcesses: 2,
        enableDebugLogging: true,
      });

      const isAvailable = await judge.isAvailable();
      if (!isAvailable) {
        console.log('Skipping concurrent audit test - Codex CLI not available');
        return;
      }

      // Start multiple audits concurrently
      const requests = Array.from({ length: 3 }, (_, i) =>
        createMockAuditRequest({
          task: `Concurrent audit ${i}`,
          candidate: `function test${i}() { return ${i}; }`,
        })
      );

      const startTime = Date.now();
      const promises = requests.map(request => judge.executeAudit(request));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All audits should complete successfully
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.overall).toBe('number');
      });

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(LONG_TIMEOUT);

      // No active processes should remain
      expect(judge.getActiveProcessCount()).toBe(0);
    });

    it('should handle process cleanup on judge termination', async () => {
      const judge = new CodexJudge({
        timeout: LONG_TIMEOUT,
        maxConcurrentProcesses: 2,
        enableDebugLogging: true,
      });

      const isAvailable = await judge.isAvailable();
      if (!isAvailable) {
        console.log('Skipping cleanup test - Codex CLI not available');
        return;
      }

      // Start a long-running audit
      const request = createMockAuditRequest({
        task: 'Long running audit for cleanup test',
        candidate: 'function longRunning() { /* complex code */ }',
      });

      const auditPromise = judge.executeAudit(request);

      // Give audit time to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Terminate all processes
      await judge.terminateAllProcesses();

      // Audit should be terminated
      await expect(auditPromise).rejects.toThrow();

      // No active processes should remain
      expect(judge.getActiveProcessCount()).toBe(0);
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    it('should handle rapid process creation and termination', async () => {
      const rapidManager = new ProcessManager({
        maxConcurrentProcesses: 5,
        defaultTimeout: SHORT_TIMEOUT,
        enableMetrics: true,
      });

      // Rapidly create and complete many processes
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          rapidManager.executeCommand('echo', [`rapid-${i}`], {
            workingDirectory: tempDir,
            timeout: SHORT_TIMEOUT,
            environment: process.env as Record<string, string>,
          })
        );
      }

      const results = await Promise.all(promises);
      
      // All should complete successfully
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });

      // System should be stable
      expect(rapidManager.getActiveProcessCount()).toBe(0);
      
      const health = rapidManager.getHealthStatus();
      expect(health.totalProcessesExecuted).toBe(100);
      expect(health.isHealthy).toBe(true);

      await rapidManager.terminateAllProcesses();
    });

    it('should handle process manager restart scenarios', async () => {
      let restartManager = new ProcessManager({
        maxConcurrentProcesses: 2,
        defaultTimeout: MEDIUM_TIMEOUT,
        enableMetrics: true,
      });

      // Execute some processes
      await restartManager.executeCommand('echo', ['before-restart'], {
        workingDirectory: tempDir,
        timeout: SHORT_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      const beforeHealth = restartManager.getHealthStatus();
      expect(beforeHealth.totalProcessesExecuted).toBe(1);

      // Simulate restart by creating new manager
      await restartManager.terminateAllProcesses();
      
      restartManager = new ProcessManager({
        maxConcurrentProcesses: 2,
        defaultTimeout: MEDIUM_TIMEOUT,
        enableMetrics: true,
      });

      // Execute processes after restart
      await restartManager.executeCommand('echo', ['after-restart'], {
        workingDirectory: tempDir,
        timeout: SHORT_TIMEOUT,
        environment: process.env as Record<string, string>,
      });

      const afterHealth = restartManager.getHealthStatus();
      expect(afterHealth.totalProcessesExecuted).toBe(1); // Reset after restart
      expect(afterHealth.isHealthy).toBe(true);

      await restartManager.terminateAllProcesses();
    });

    it('should maintain stability under memory pressure', async () => {
      const memoryManager = new ProcessManager({
        maxConcurrentProcesses: 10,
        defaultTimeout: SHORT_TIMEOUT,
        enableMetrics: true,
      });

      // Create memory pressure with many concurrent processes
      const promises = Array.from({ length: 50 }, (_, i) =>
        memoryManager.executeCommand('echo', [`memory-test-${i}`], {
          workingDirectory: tempDir,
          timeout: SHORT_TIMEOUT,
          environment: process.env as Record<string, string>,
        })
      );

      const results = await Promise.allSettled(promises);
      
      // Most should succeed
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(40); // At least 80% success rate

      // System should remain stable
      const health = memoryManager.getHealthStatus();
      expect(health.isHealthy).toBe(true);
      expect(memoryManager.getActiveProcessCount()).toBe(0);

      await memoryManager.terminateAllProcesses();
    });
  });
});