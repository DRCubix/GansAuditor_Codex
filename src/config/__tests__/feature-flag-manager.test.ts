/**
 * Tests for Feature Flag Manager
 * 
 * This test suite validates the feature flag functionality for gradual rollout
 * and environment-specific feature control.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  FeatureFlagManager,
  createFeatureFlagManager,
  isFeatureEnabled,
  getFeatureFlagsFromEnv,
  DEFAULT_SYSTEM_PROMPT_FLAGS,
  FeatureFlag,
  FeatureFlagContext,
} from '../feature-flag-manager.js';

describe('Feature Flag Manager', () => {
  const testDir = join(process.cwd(), 'test-feature-flags');
  const testConfigPath = join(testDir, 'feature-flags.json');
  const originalEnv = process.env;

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('FeatureFlagManager', () => {
    let manager: FeatureFlagManager;

    beforeEach(() => {
      manager = new FeatureFlagManager();
    });

    describe('evaluate', () => {
      it('should enable flag when all conditions are met', () => {
        const result = manager.evaluate('systemPromptEnabled', {
          environment: 'production',
        });

        expect(result.enabled).toBe(true);
        expect(result.reason).toBe('All conditions met');
        expect(result.rolloutPercentage).toBe(100);
      });

      it('should disable flag when globally disabled', () => {
        manager.updateFlag('systemPromptEnabled', { enabled: false });

        const result = manager.evaluate('systemPromptEnabled', {
          environment: 'production',
        });

        expect(result.enabled).toBe(false);
        expect(result.reason).toBe('Flag globally disabled');
      });

      it('should disable flag when environment not allowed', () => {
        const result = manager.evaluate('enhancedSecurity', {
          environment: 'development',
        });

        expect(result.enabled).toBe(false);
        expect(result.reason).toContain('not in allowed environments');
      });

      it('should evaluate conditions correctly', () => {
        const result = manager.evaluate('experimentalFeatures', {
          environment: 'production', // Should fail condition
        });

        expect(result.enabled).toBe(false);
        expect(result.reason).toContain('Condition not met');
      });

      it('should handle rollout percentage', () => {
        // Test with a flag that has 50% rollout
        manager.updateFlag('gradualRollout', { rolloutPercentage: 50 });

        // Test with deterministic session ID
        const result1 = manager.evaluate('gradualRollout', {
          environment: 'production',
          sessionId: 'test-session-1',
        });

        const result2 = manager.evaluate('gradualRollout', {
          environment: 'production',
          sessionId: 'test-session-2',
        });

        // Results should be consistent for same session ID
        const result1Again = manager.evaluate('gradualRollout', {
          environment: 'production',
          sessionId: 'test-session-1',
        });

        expect(result1Again.enabled).toBe(result1.enabled);
      });

      it('should return false for non-existent flag', () => {
        const result = manager.evaluate('nonExistentFlag');

        expect(result.enabled).toBe(false);
        expect(result.reason).toBe('Flag not found');
        expect(result.rolloutPercentage).toBe(0);
      });

      it('should cache evaluation results', () => {
        const spy = vi.spyOn(manager as any, 'evaluateCondition');

        // First evaluation
        manager.evaluate('systemPromptEnabled', { environment: 'production' });
        
        // Second evaluation with same context should use cache
        manager.evaluate('systemPromptEnabled', { environment: 'production' });

        // Should only evaluate conditions once due to caching
        expect(spy).toHaveBeenCalledTimes(0); // No conditions on this flag
      });
    });

    describe('isEnabled', () => {
      it('should return boolean result', () => {
        const enabled = manager.isEnabled('systemPromptEnabled', {
          environment: 'production',
        });

        expect(typeof enabled).toBe('boolean');
        expect(enabled).toBe(true);
      });

      it('should return false for disabled flag', () => {
        const enabled = manager.isEnabled('experimentalFeatures', {
          environment: 'production',
        });

        expect(enabled).toBe(false);
      });
    });

    describe('flag management', () => {
      it('should get all flags', () => {
        const flags = manager.getAllFlags();

        expect(Object.keys(flags)).toContain('systemPromptEnabled');
        expect(Object.keys(flags)).toContain('advancedWorkflow');
        expect(flags.systemPromptEnabled.enabled).toBe(true);
      });

      it('should get specific flag', () => {
        const flag = manager.getFlag('systemPromptEnabled');

        expect(flag).toBeDefined();
        expect(flag?.name).toBe('systemPromptEnabled');
        expect(flag?.enabled).toBe(true);
      });

      it('should update existing flag', () => {
        manager.updateFlag('systemPromptEnabled', {
          enabled: false,
          rolloutPercentage: 25,
        });

        const flag = manager.getFlag('systemPromptEnabled');
        expect(flag?.enabled).toBe(false);
        expect(flag?.rolloutPercentage).toBe(25);
        expect(flag?.metadata?.updatedAt).toBeDefined();
      });

      it('should add new flag', () => {
        const newFlag: FeatureFlag = {
          name: 'newFeature',
          description: 'A new experimental feature',
          enabled: true,
          rolloutPercentage: 10,
          environments: ['development'],
        };

        manager.addFlag(newFlag);

        const flag = manager.getFlag('newFeature');
        expect(flag).toBeDefined();
        expect(flag?.name).toBe('newFeature');
        expect(flag?.metadata?.createdAt).toBeDefined();
      });

      it('should remove flag', () => {
        manager.removeFlag('experimentalFeatures');

        const flag = manager.getFlag('experimentalFeatures');
        expect(flag).toBeUndefined();
      });
    });

    describe('file operations', () => {
      it('should save flags to file', () => {
        const result = manager.saveToFile(testConfigPath);

        expect(result.success).toBe(true);
        expect(result.flagsSaved).toBeGreaterThan(0);
        expect(existsSync(testConfigPath)).toBe(true);

        // Verify file content
        const content = JSON.parse(require('fs').readFileSync(testConfigPath, 'utf-8'));
        expect(content.version).toBe('1.0.0');
        expect(content.flags).toBeDefined();
        expect(content.globalSettings).toBeDefined();
      });

      it('should load flags from file', () => {
        // First save flags
        manager.saveToFile(testConfigPath);

        // Create new manager and load
        const newManager = new FeatureFlagManager();
        const result = newManager.loadFromFile(testConfigPath);

        expect(result.success).toBe(true);
        expect(result.flagsLoaded).toBeGreaterThan(0);

        const flag = newManager.getFlag('systemPromptEnabled');
        expect(flag).toBeDefined();
      });

      it('should handle non-existent file when loading', () => {
        const result = manager.loadFromFile('non-existent.json');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Configuration file not found');
        expect(result.flagsLoaded).toBe(0);
      });

      it('should handle invalid JSON when loading', () => {
        writeFileSync(testConfigPath, '{ invalid json }', 'utf-8');

        const result = manager.loadFromFile(testConfigPath);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unexpected token');
        expect(result.flagsLoaded).toBe(0);
      });

      it('should handle save error', () => {
        // Mock writeFileSync to throw error
        vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const result = manager.saveToFile(testConfigPath);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Permission denied');

        vi.restoreAllMocks();
      });
    });

    describe('environment-specific operations', () => {
      it('should get flags for specific environment', () => {
        const devFlags = manager.getFlagsForEnvironment('development');
        const prodFlags = manager.getFlagsForEnvironment('production');

        expect(devFlags.experimentalFeatures.enabled).toBe(true);
        expect(prodFlags.experimentalFeatures.enabled).toBe(false);
        expect(devFlags.enhancedSecurity.enabled).toBe(false);
        expect(prodFlags.enhancedSecurity.enabled).toBe(true);
      });

      it('should generate rollout summary', () => {
        const summary = manager.getRolloutSummary();

        expect(summary.totalFlags).toBeGreaterThan(0);
        expect(summary.enabledFlags).toBeGreaterThan(0);
        expect(summary.flagsByEnvironment.development).toBeDefined();
        expect(summary.flagsByEnvironment.staging).toBeDefined();
        expect(summary.flagsByEnvironment.production).toBeDefined();
        expect(summary.averageRolloutPercentage).toBeGreaterThan(0);
      });
    });

    describe('condition evaluation', () => {
      it('should evaluate environment conditions', () => {
        const testFlag: FeatureFlag = {
          name: 'testFlag',
          description: 'Test flag',
          enabled: true,
          rolloutPercentage: 100,
          environments: [],
          conditions: [
            {
              type: 'environment',
              operator: 'equals',
              value: 'production',
            },
          ],
        };

        manager.addFlag(testFlag);

        const prodResult = manager.evaluate('testFlag', { environment: 'production' });
        const devResult = manager.evaluate('testFlag', { environment: 'development' });

        expect(prodResult.enabled).toBe(true);
        expect(devResult.enabled).toBe(false);
      });

      it('should evaluate user conditions', () => {
        const testFlag: FeatureFlag = {
          name: 'userFlag',
          description: 'User-specific flag',
          enabled: true,
          rolloutPercentage: 100,
          environments: [],
          conditions: [
            {
              type: 'user',
              operator: 'in',
              value: ['user1', 'user2'],
            },
          ],
        };

        manager.addFlag(testFlag);

        const user1Result = manager.evaluate('userFlag', { userId: 'user1' });
        const user3Result = manager.evaluate('userFlag', { userId: 'user3' });

        expect(user1Result.enabled).toBe(true);
        expect(user3Result.enabled).toBe(false);
      });

      it('should evaluate time conditions', () => {
        const futureTime = Date.now() + 86400000; // 1 day from now
        
        const testFlag: FeatureFlag = {
          name: 'timeFlag',
          description: 'Time-based flag',
          enabled: true,
          rolloutPercentage: 100,
          environments: [],
          conditions: [
            {
              type: 'time',
              operator: 'less_than',
              value: futureTime,
            },
          ],
        };

        manager.addFlag(testFlag);

        const currentResult = manager.evaluate('timeFlag', { timestamp: Date.now() });
        const pastResult = manager.evaluate('timeFlag', { timestamp: futureTime + 1000 });

        expect(currentResult.enabled).toBe(true);
        expect(pastResult.enabled).toBe(false);
      });

      it('should evaluate custom property conditions', () => {
        const testFlag: FeatureFlag = {
          name: 'customFlag',
          description: 'Custom property flag',
          enabled: true,
          rolloutPercentage: 100,
          environments: [],
          conditions: [
            {
              type: 'custom',
              operator: 'equals',
              field: 'region',
              value: 'us-east-1',
            },
          ],
        };

        manager.addFlag(testFlag);

        const matchResult = manager.evaluate('customFlag', {
          customProperties: { region: 'us-east-1' },
        });
        const noMatchResult = manager.evaluate('customFlag', {
          customProperties: { region: 'eu-west-1' },
        });

        expect(matchResult.enabled).toBe(true);
        expect(noMatchResult.enabled).toBe(false);
      });

      it('should evaluate regex match conditions', () => {
        const testFlag: FeatureFlag = {
          name: 'regexFlag',
          description: 'Regex matching flag',
          enabled: true,
          rolloutPercentage: 100,
          environments: [],
          conditions: [
            {
              type: 'user',
              operator: 'matches',
              value: '^admin-.*',
            },
          ],
        };

        manager.addFlag(testFlag);

        const adminResult = manager.evaluate('regexFlag', { userId: 'admin-user1' });
        const userResult = manager.evaluate('regexFlag', { userId: 'regular-user' });

        expect(adminResult.enabled).toBe(true);
        expect(userResult.enabled).toBe(false);
      });
    });

    describe('rollout percentage logic', () => {
      it('should be deterministic for same identifier', () => {
        manager.updateFlag('gradualRollout', { rolloutPercentage: 50 });

        const context: FeatureFlagContext = {
          environment: 'production',
          sessionId: 'consistent-session',
        };

        const result1 = manager.evaluate('gradualRollout', context);
        const result2 = manager.evaluate('gradualRollout', context);
        const result3 = manager.evaluate('gradualRollout', context);

        expect(result1.enabled).toBe(result2.enabled);
        expect(result2.enabled).toBe(result3.enabled);
      });

      it('should respect 0% rollout', () => {
        manager.updateFlag('gradualRollout', { rolloutPercentage: 0 });

        const result = manager.evaluate('gradualRollout', {
          environment: 'production',
          sessionId: 'any-session',
        });

        expect(result.enabled).toBe(false);
        expect(result.reason).toBe('Outside rollout percentage');
      });

      it('should respect 100% rollout', () => {
        manager.updateFlag('gradualRollout', { rolloutPercentage: 100 });

        const result = manager.evaluate('gradualRollout', {
          environment: 'production',
          sessionId: 'any-session',
        });

        expect(result.enabled).toBe(true);
      });
    });

    describe('cache management', () => {
      it('should clear cache when flags are updated', () => {
        // Evaluate flag to populate cache
        manager.evaluate('systemPromptEnabled');

        // Update flag (should clear cache)
        manager.updateFlag('systemPromptEnabled', { enabled: false });

        // Evaluate again - should get new result
        const result = manager.evaluate('systemPromptEnabled');
        expect(result.enabled).toBe(false);
      });

      it('should clear cache manually', () => {
        manager.evaluate('systemPromptEnabled');
        expect(manager['evaluationCache'].size).toBeGreaterThan(0);

        manager.clearCache();
        expect(manager['evaluationCache'].size).toBe(0);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('createFeatureFlagManager', () => {
      it('should create manager with default flags', () => {
        const manager = createFeatureFlagManager();
        const flags = manager.getAllFlags();

        expect(Object.keys(flags)).toContain('systemPromptEnabled');
        expect(flags.systemPromptEnabled.enabled).toBe(true);
      });

      it('should load from file if it exists', () => {
        // Create a config file first
        const manager = new FeatureFlagManager();
        manager.updateFlag('systemPromptEnabled', { enabled: false });
        manager.saveToFile(testConfigPath);

        // Create new manager with config path
        const newManager = createFeatureFlagManager(testConfigPath);
        const flag = newManager.getFlag('systemPromptEnabled');

        expect(flag?.enabled).toBe(false);
      });
    });

    describe('isFeatureEnabled', () => {
      it('should check feature flag quickly', () => {
        const enabled = isFeatureEnabled('systemPromptEnabled', {
          environment: 'production',
        });

        expect(typeof enabled).toBe('boolean');
      });
    });

    describe('getFeatureFlagsFromEnv', () => {
      it('should read feature flags from environment variables', () => {
        process.env.GAN_AUDITOR_PROMPT_ENABLED = 'true';
        process.env.GAN_AUDITOR_ENHANCED_SECURITY = 'false';
        process.env.GAN_AUDITOR_EXPERIMENTAL_FEATURES = 'true';
        process.env.GAN_AUDITOR_DEBUG_MODE = 'true';

        const flags = getFeatureFlagsFromEnv();

        expect(flags.systemPromptEnabled).toBe(true);
        expect(flags.enhancedSecurity).toBe(false);
        expect(flags.experimentalFeatures).toBe(true);
        expect(flags.debugMode).toBe(true);
      });

      it('should use default values when env vars not set', () => {
        // Clear relevant env vars
        delete process.env.GAN_AUDITOR_PROMPT_ENABLED;
        delete process.env.GAN_AUDITOR_ENHANCED_SECURITY;

        const flags = getFeatureFlagsFromEnv();

        expect(flags.systemPromptEnabled).toBe(false); // Default when not set
        expect(flags.enhancedSecurity).toBe(true); // Default when not explicitly false
      });
    });
  });

  describe('Default System Prompt Flags', () => {
    it('should have all required default flags', () => {
      const requiredFlags = [
        'systemPromptEnabled',
        'advancedWorkflow',
        'enhancedSecurity',
        'performanceOptimizations',
        'experimentalFeatures',
        'gradualRollout',
        'debugMode',
        'metricsCollection',
      ];

      for (const flagName of requiredFlags) {
        expect(DEFAULT_SYSTEM_PROMPT_FLAGS[flagName]).toBeDefined();
        expect(DEFAULT_SYSTEM_PROMPT_FLAGS[flagName].name).toBe(flagName);
      }
    });

    it('should have appropriate environment restrictions', () => {
      expect(DEFAULT_SYSTEM_PROMPT_FLAGS.experimentalFeatures.environments).toContain('development');
      expect(DEFAULT_SYSTEM_PROMPT_FLAGS.experimentalFeatures.environments).not.toContain('production');

      expect(DEFAULT_SYSTEM_PROMPT_FLAGS.enhancedSecurity.environments).toContain('production');
      expect(DEFAULT_SYSTEM_PROMPT_FLAGS.enhancedSecurity.environments).toContain('staging');
    });

    it('should have reasonable rollout percentages', () => {
      expect(DEFAULT_SYSTEM_PROMPT_FLAGS.systemPromptEnabled.rolloutPercentage).toBe(100);
      expect(DEFAULT_SYSTEM_PROMPT_FLAGS.experimentalFeatures.rolloutPercentage).toBeLessThanOrEqual(50);
      expect(DEFAULT_SYSTEM_PROMPT_FLAGS.gradualRollout.rolloutPercentage).toBeLessThan(100);
    });

    it('should have proper metadata', () => {
      for (const flag of Object.values(DEFAULT_SYSTEM_PROMPT_FLAGS)) {
        expect(flag.metadata?.createdAt).toBeDefined();
        expect(flag.metadata?.updatedAt).toBeDefined();
        expect(flag.metadata?.tags).toBeDefined();
        expect(Array.isArray(flag.metadata?.tags)).toBe(true);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined context gracefully', () => {
      const manager = new FeatureFlagManager();
      const result = manager.evaluate('systemPromptEnabled');

      expect(result).toBeDefined();
      expect(typeof result.enabled).toBe('boolean');
    });

    it('should handle malformed conditions', () => {
      const testFlag: FeatureFlag = {
        name: 'malformedFlag',
        description: 'Flag with malformed condition',
        enabled: true,
        rolloutPercentage: 100,
        environments: [],
        conditions: [
          {
            type: 'unknown' as any,
            operator: 'invalid' as any,
            value: null,
          },
        ],
      };

      const manager = new FeatureFlagManager();
      manager.addFlag(testFlag);

      const result = manager.evaluate('malformedFlag');
      expect(result.enabled).toBe(false);
    });

    it('should handle very large rollout percentages', () => {
      const manager = new FeatureFlagManager();
      manager.updateFlag('systemPromptEnabled', { rolloutPercentage: 150 });

      const result = manager.evaluate('systemPromptEnabled');
      expect(result.enabled).toBe(true); // Should treat >100 as 100%
    });

    it('should handle negative rollout percentages', () => {
      const manager = new FeatureFlagManager();
      manager.updateFlag('systemPromptEnabled', { rolloutPercentage: -10 });

      const result = manager.evaluate('systemPromptEnabled');
      expect(result.enabled).toBe(false); // Should treat <0 as 0%
    });
  });
});