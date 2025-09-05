/**
 * Tests for Progress Tracker
 * 
 * Validates progress tracking functionality for long-running audits
 * including stage updates, time estimation, and event emission.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressTracker, AuditStage, type ProgressTrackerConfig } from '../progress-tracker.js';
import type { GansAuditorCodexThoughtData } from '../../types/gan-types.js';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;
  let mockThought: GansAuditorCodexThoughtData;

  beforeEach(() => {
    const config: Partial<ProgressTrackerConfig> = {
      progressThreshold: 100, // 100ms for faster tests
      updateInterval: 50, // 50ms for faster tests
      enableLogging: false,
      maxConcurrentAudits: 5,
    };
    
    tracker = new ProgressTracker(config);
    
    mockThought = {
      thoughtNumber: 1,
      thought: `
        \`\`\`typescript
        function testFunction() {
          return "Hello, World!";
        }
        \`\`\`
      `,
    };
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe('Basic Progress Tracking', () => {
    it('should start tracking an audit', () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      
      // Should not have progress immediately (before threshold)
      expect(tracker.getProgress(auditId)).toBeNull();
    });

    it('should enable progress tracking after threshold', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      
      // Wait for threshold to pass
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const progress = tracker.getProgress(auditId);
      expect(progress).not.toBeNull();
      expect(progress?.auditId).toBe(auditId);
      expect(progress?.stage).toBe(AuditStage.INITIALIZING);
    });

    it('should complete tracking successfully', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      tracker.completeTracking(auditId, true);
      
      // Should no longer have progress after completion
      expect(tracker.getProgress(auditId)).toBeNull();
    });

    it('should complete tracking with failure', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      tracker.completeTracking(auditId, false);
      
      expect(tracker.getProgress(auditId)).toBeNull();
    });
  });

  describe('Stage Management', () => {
    it('should update audit stages', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      tracker.updateStage(auditId, AuditStage.PARSING_CODE, 'Parsing code structure');
      
      const progress = tracker.getProgress(auditId);
      expect(progress?.stage).toBe(AuditStage.PARSING_CODE);
      expect(progress?.message).toBe('Parsing code structure');
      expect(progress?.percentage).toBeGreaterThan(0);
    });

    it('should calculate progress based on stages', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const initialProgress = tracker.getProgress(auditId);
      const initialPercentage = initialProgress?.percentage || 0;
      
      tracker.updateStage(auditId, AuditStage.RUNNING_CHECKS);
      
      const updatedProgress = tracker.getProgress(auditId);
      const updatedPercentage = updatedProgress?.percentage || 0;
      
      expect(updatedPercentage).toBeGreaterThan(initialPercentage);
    });

    it('should handle stage progression correctly', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const stages = [
        AuditStage.PARSING_CODE,
        AuditStage.ANALYZING_STRUCTURE,
        AuditStage.RUNNING_CHECKS,
        AuditStage.EVALUATING_QUALITY,
        AuditStage.GENERATING_FEEDBACK,
        AuditStage.FINALIZING,
      ];
      
      let lastPercentage = 0;
      
      for (const stage of stages) {
        tracker.updateStage(auditId, stage);
        const progress = tracker.getProgress(auditId);
        expect(progress?.percentage).toBeGreaterThanOrEqual(lastPercentage);
        lastPercentage = progress?.percentage || 0;
      }
    });
  });

  describe('Progress Updates', () => {
    it('should update progress within a stage', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      tracker.updateStage(auditId, AuditStage.RUNNING_CHECKS);
      const baseProgress = tracker.getProgress(auditId);
      const basePercentage = baseProgress?.percentage || 0;
      
      tracker.updateProgress(auditId, 50, 'Halfway through checks');
      
      const updatedProgress = tracker.getProgress(auditId);
      expect(updatedProgress?.percentage).toBeGreaterThan(basePercentage);
      expect(updatedProgress?.message).toBe('Halfway through checks');
    });

    it('should not exceed 100% progress', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      tracker.updateStage(auditId, AuditStage.FINALIZING);
      tracker.updateProgress(auditId, 200); // Excessive progress
      
      const progress = tracker.getProgress(auditId);
      expect(progress?.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Time Estimation', () => {
    it('should provide time estimates', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      tracker.updateStage(auditId, AuditStage.RUNNING_CHECKS);
      
      // Wait a bit to establish timing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const progress = tracker.getProgress(auditId);
      expect(progress?.elapsedTime).toBeGreaterThan(0);
      
      if (progress?.percentage && progress.percentage > 0) {
        expect(progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track elapsed time accurately', async () => {
      const auditId = 'test-audit-1';
      const startTime = Date.now();
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const progress = tracker.getProgress(auditId);
      const elapsedTime = progress?.elapsedTime || 0;
      const actualElapsed = Date.now() - startTime;
      
      // Should be within reasonable range
      expect(elapsedTime).toBeGreaterThan(100);
      expect(elapsedTime).toBeLessThan(actualElapsed + 50);
    });
  });

  describe('Event Emission', () => {
    it('should emit progress events', async () => {
      const auditId = 'test-audit-1';
      const progressEvents: any[] = [];
      
      tracker.on('progress', (update) => {
        progressEvents.push(update);
      });
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      tracker.updateStage(auditId, AuditStage.PARSING_CODE);
      
      // Wait for events to be emitted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0].auditId).toBe(auditId);
    });
  });

  describe('Concurrent Audits', () => {
    it('should handle multiple concurrent audits', async () => {
      const auditIds = ['audit-1', 'audit-2', 'audit-3'];
      
      // Start multiple audits
      for (const auditId of auditIds) {
        tracker.startTracking(auditId, { ...mockThought, thoughtNumber: parseInt(auditId.split('-')[1]) });
      }
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // All should be tracked
      const allProgress = tracker.getAllProgress();
      expect(allProgress.length).toBe(auditIds.length);
      
      // Each should have unique audit ID
      const trackedIds = allProgress.map(p => p.auditId);
      expect(new Set(trackedIds).size).toBe(auditIds.length);
    });

    it('should respect concurrent audit limit', () => {
      const limitedTracker = new ProgressTracker({
        maxConcurrentAudits: 2,
        progressThreshold: 0,
      });
      
      try {
        // Try to start more audits than the limit
        for (let i = 0; i < 5; i++) {
          limitedTracker.startTracking(`audit-${i}`, { ...mockThought, thoughtNumber: i });
        }
        
        // Should only track up to the limit
        const stats = limitedTracker.getStats();
        expect(stats.activeAudits).toBeLessThanOrEqual(2);
      } finally {
        limitedTracker.destroy();
      }
    });
  });

  describe('Cancellation', () => {
    it('should cancel tracking', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(tracker.getProgress(auditId)).not.toBeNull();
      
      tracker.cancelTracking(auditId);
      
      expect(tracker.getProgress(auditId)).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle updates for non-existent audits gracefully', () => {
      const nonExistentId = 'non-existent-audit';
      
      // Should not throw
      expect(() => {
        tracker.updateStage(nonExistentId, AuditStage.RUNNING_CHECKS);
        tracker.updateProgress(nonExistentId, 50);
        tracker.completeTracking(nonExistentId);
        tracker.cancelTracking(nonExistentId);
      }).not.toThrow();
    });

    it('should handle invalid progress values', async () => {
      const auditId = 'test-audit-1';
      
      tracker.startTracking(auditId, mockThought);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should handle negative progress
      tracker.updateProgress(auditId, -10);
      const progress1 = tracker.getProgress(auditId);
      expect(progress1?.percentage).toBeGreaterThanOrEqual(0);
      
      // Should handle excessive progress
      tracker.updateProgress(auditId, 200);
      const progress2 = tracker.getProgress(auditId);
      expect(progress2?.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Statistics', () => {
    it('should provide tracking statistics', () => {
      const stats = tracker.getStats();
      
      expect(stats).toHaveProperty('activeAudits');
      expect(stats).toHaveProperty('totalTracked');
      expect(stats).toHaveProperty('averageDuration');
      
      expect(typeof stats.activeAudits).toBe('number');
      expect(typeof stats.totalTracked).toBe('number');
      expect(typeof stats.averageDuration).toBe('number');
    });
  });
});