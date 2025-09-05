/**
 * Tests for synchronous audit workflow configuration system
 * 
 * This test suite validates the configuration parsing, validation,
 * and environment variable handling for the synchronous audit workflow.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildCompletionCriteriaFromEnv,
  buildAuditTimeoutConfigFromEnv,
  buildConcurrencyConfigFromEnv,
  buildSynchronousConfigFromEnv,
  buildRuntimeConfigFromEnv,
  validateRuntimeConfig,
  mergeRuntimeConfig,
  createRuntimeConfig,
  getEnvironmentConfigSummary,
  isSynchronousModeReady,
  generateMigrationRecommendations,
  DEFAULT_COMPLETION_CRITERIA,
  DEFAULT_AUDIT_TIMEOUT_CONFIG,
  DEFAULT_CONCURRENCY_CONFIG,
  DEFAULT_SYNCHRONOUS_CONFIG,
} from '../synchronous-config.js';
import type { RuntimeConfig } from '../../types/synchronous-response-types.js';

describe('Synchronous Configuration System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment Variable Parsing', () => {
    describe('buildCompletionCriteriaFromEnv', () => {
      it('should use default values when no environment variables are set', () => {
        const criteria = buildCompletionCriteriaFromEnv();
        expect(criteria).toEqual(DEFAULT_COMPLETION_CRITERIA);
      });

      it('should parse tier configuration from environment variables', () => {
        process.env.SYNC_AUDIT_TIER1_SCORE = '98';
        process.env.SYNC_AUDIT_TIER1_LOOPS = '8';
        process.env.SYNC_AUDIT_TIER2_SCORE = '92';
        process.env.SYNC_AUDIT_TIER2_LOOPS = '12';

        const criteria = buildCompletionCriteriaFromEnv();
        expect(criteria.tier1.score).toBe(98);
        expect(criteria.tier1.maxLoops).toBe(8);
        expect(criteria.tier2.score).toBe(92);
        expect(criteria.tier2.maxLoops).toBe(12);
      });

      it('should clamp values to valid ranges', () => {
        process.env.SYNC_AUDIT_TIER1_SCORE = '150'; // Above max
        process.env.SYNC_AUDIT_TIER1_LOOPS = '0'; // Below min
        process.env.SYNC_AUDIT_STAGNATION_THRESHOLD = '2.0'; // Above max

        const criteria = buildCompletionCriteriaFromEnv();
        expect(criteria.tier1.score).toBe(100); // Clamped to max
        expect(criteria.tier1.maxLoops).toBe(1); // Clamped to min
        expect(criteria.stagnationCheck.similarityThreshold).toBe(1.0); // Clamped to max
      });

      it('should handle invalid values gracefully', () => {
        process.env.SYNC_AUDIT_TIER1_SCORE = 'invalid';
        process.env.SYNC_AUDIT_TIER1_LOOPS = 'not-a-number';

        const criteria = buildCompletionCriteriaFromEnv();
        expect(criteria.tier1.score).toBe(DEFAULT_COMPLETION_CRITERIA.tier1.score);
        expect(criteria.tier1.maxLoops).toBe(DEFAULT_COMPLETION_CRITERIA.tier1.maxLoops);
      });
    });

    describe('buildAuditTimeoutConfigFromEnv', () => {
      it('should use default values when no environment variables are set', () => {
        const config = buildAuditTimeoutConfigFromEnv();
        expect(config).toEqual(DEFAULT_AUDIT_TIMEOUT_CONFIG);
      });

      it('should parse timeout configuration from environment variables', () => {
        process.env.AUDIT_TIMEOUT_SECONDS = '45';
        process.env.AUDIT_PROGRESS_INDICATOR_INTERVAL = '3000';
        process.env.ENABLE_AUDIT_PROGRESS_INDICATORS = 'false';

        const config = buildAuditTimeoutConfigFromEnv();
        expect(config.auditTimeoutSeconds).toBe(45);
        expect(config.progressIndicatorInterval).toBe(3000);
        expect(config.enableProgressIndicators).toBe(false);
      });

      it('should clamp timeout values to valid ranges', () => {
        process.env.AUDIT_TIMEOUT_SECONDS = '2'; // Below min
        process.env.AUDIT_PROGRESS_INDICATOR_INTERVAL = '500'; // Below min

        const config = buildAuditTimeoutConfigFromEnv();
        expect(config.auditTimeoutSeconds).toBe(5); // Clamped to min
        expect(config.progressIndicatorInterval).toBe(1000); // Clamped to min
      });
    });

    describe('buildConcurrencyConfigFromEnv', () => {
      it('should use default values when no environment variables are set', () => {
        const config = buildConcurrencyConfigFromEnv();
        expect(config).toEqual(DEFAULT_CONCURRENCY_CONFIG);
      });

      it('should parse concurrency configuration from environment variables', () => {
        process.env.MAX_CONCURRENT_AUDITS = '15';
        process.env.MAX_CONCURRENT_SESSIONS = '75';
        process.env.ENABLE_AUDIT_QUEUE = 'false';

        const config = buildConcurrencyConfigFromEnv();
        expect(config.maxConcurrentAudits).toBe(15);
        expect(config.maxConcurrentSessions).toBe(75);
        expect(config.enableAuditQueue).toBe(false);
      });
    });

    describe('buildSynchronousConfigFromEnv', () => {
      it('should use default values when no environment variables are set', () => {
        const config = buildSynchronousConfigFromEnv();
        expect(config).toEqual(DEFAULT_SYNCHRONOUS_CONFIG);
      });

      it('should parse synchronous configuration from environment variables', () => {
        process.env.ENABLE_SYNCHRONOUS_AUDIT = 'true';
        process.env.SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL = 'verbose';
        process.env.SYNC_AUDIT_STATE_DIRECTORY = '/custom/path';

        const config = buildSynchronousConfigFromEnv();
        expect(config.enabled).toBe(true);
        expect(config.feedbackDetailLevel).toBe('verbose');
        expect(config.stateDirectory).toBe('/custom/path');
      });

      it('should validate feedback detail level values', () => {
        process.env.SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL = 'invalid';

        const config = buildSynchronousConfigFromEnv();
        expect(config.feedbackDetailLevel).toBe('detailed'); // Default fallback
      });
    });
  });

  describe('Configuration Validation', () => {
    describe('validateRuntimeConfig', () => {
      it('should validate a correct configuration', () => {
        const config: RuntimeConfig = {
          completionCriteria: DEFAULT_COMPLETION_CRITERIA,
          auditTimeout: DEFAULT_AUDIT_TIMEOUT_CONFIG,
          concurrency: DEFAULT_CONCURRENCY_CONFIG,
          synchronous: DEFAULT_SYNCHRONOUS_CONFIG,
        };

        const validation = validateRuntimeConfig(config);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should detect completion criteria inconsistencies', () => {
        const config: RuntimeConfig = {
          completionCriteria: {
            tier1: { score: 85, maxLoops: 15 }, // Lower score than tier2
            tier2: { score: 90, maxLoops: 10 }, // Higher loops than tier3
            tier3: { score: 95, maxLoops: 5 },
            hardStop: { maxLoops: 3 }, // Lower than tier3
            stagnationCheck: { startLoop: 10, similarityThreshold: 0.95 },
          },
          auditTimeout: DEFAULT_AUDIT_TIMEOUT_CONFIG,
          concurrency: DEFAULT_CONCURRENCY_CONFIG,
          synchronous: DEFAULT_SYNCHRONOUS_CONFIG,
        };

        const validation = validateRuntimeConfig(config);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(validation.warnings.length).toBeGreaterThan(0);
      });

      it('should detect timeout configuration issues', () => {
        const config: RuntimeConfig = {
          completionCriteria: DEFAULT_COMPLETION_CRITERIA,
          auditTimeout: {
            ...DEFAULT_AUDIT_TIMEOUT_CONFIG,
            auditTimeoutSeconds: 2, // Too low
          },
          concurrency: DEFAULT_CONCURRENCY_CONFIG,
          synchronous: DEFAULT_SYNCHRONOUS_CONFIG,
        };

        const validation = validateRuntimeConfig(config);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Audit timeout must be at least 5 seconds');
      });

      it('should detect concurrency configuration issues', () => {
        const config: RuntimeConfig = {
          completionCriteria: DEFAULT_COMPLETION_CRITERIA,
          auditTimeout: DEFAULT_AUDIT_TIMEOUT_CONFIG,
          concurrency: {
            ...DEFAULT_CONCURRENCY_CONFIG,
            maxConcurrentAudits: 0, // Invalid
          },
          synchronous: DEFAULT_SYNCHRONOUS_CONFIG,
        };

        const validation = validateRuntimeConfig(config);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Max concurrent audits must be at least 1');
      });
    });
  });

  describe('Configuration Merging', () => {
    describe('mergeRuntimeConfig', () => {
      it('should merge configurations correctly', () => {
        const base: RuntimeConfig = {
          completionCriteria: DEFAULT_COMPLETION_CRITERIA,
          auditTimeout: DEFAULT_AUDIT_TIMEOUT_CONFIG,
          concurrency: DEFAULT_CONCURRENCY_CONFIG,
          synchronous: DEFAULT_SYNCHRONOUS_CONFIG,
        };

        const overrides: Partial<RuntimeConfig> = {
          auditTimeout: {
            ...DEFAULT_AUDIT_TIMEOUT_CONFIG,
            auditTimeoutSeconds: 45,
          },
          synchronous: {
            ...DEFAULT_SYNCHRONOUS_CONFIG,
            enabled: true,
          },
        };

        const merged = mergeRuntimeConfig(base, overrides);
        expect(merged.auditTimeout.auditTimeoutSeconds).toBe(45);
        expect(merged.synchronous.enabled).toBe(true);
        expect(merged.completionCriteria).toEqual(DEFAULT_COMPLETION_CRITERIA);
      });
    });
  });

  describe('Configuration Factory', () => {
    describe('createRuntimeConfig', () => {
      it('should create configuration with validation', () => {
        const { config, validation } = createRuntimeConfig();
        expect(config).toBeDefined();
        expect(validation).toBeDefined();
        expect(typeof validation.isValid).toBe('boolean');
      });

      it('should apply overrides correctly', () => {
        const overrides: Partial<RuntimeConfig> = {
          synchronous: {
            ...DEFAULT_SYNCHRONOUS_CONFIG,
            enabled: true,
          },
        };

        const { config } = createRuntimeConfig(overrides);
        expect(config.synchronous.enabled).toBe(true);
      });
    });
  });

  describe('Environment Configuration Summary', () => {
    describe('getEnvironmentConfigSummary', () => {
      it('should return environment configuration summary', () => {
        process.env.ENABLE_SYNCHRONOUS_AUDIT = 'true';
        process.env.ENABLE_GAN_AUDITING = 'true';
        process.env.AUDIT_TIMEOUT_SECONDS = '45';

        const summary = getEnvironmentConfigSummary();
        expect(summary.enableSynchronousAudit).toBe(true);
        expect(summary.enableGanAuditing).toBe(true);
        expect(summary.auditTimeoutSeconds).toBe(45);
      });
    });
  });

  describe('Readiness Checks', () => {
    describe('isSynchronousModeReady', () => {
      it('should detect when synchronous mode is not ready', () => {
        process.env.ENABLE_GAN_AUDITING = 'false';
        process.env.ENABLE_SYNCHRONOUS_AUDIT = 'false';

        const readiness = isSynchronousModeReady();
        expect(readiness.ready).toBe(false);
        expect(readiness.issues.length).toBeGreaterThan(0);
      });

      it('should detect when synchronous mode is ready', () => {
        process.env.ENABLE_GAN_AUDITING = 'true';
        process.env.ENABLE_SYNCHRONOUS_AUDIT = 'true';

        const readiness = isSynchronousModeReady();
        expect(readiness.ready).toBe(true);
        expect(readiness.issues).toHaveLength(0);
      });

      it('should provide recommendations for optimization', () => {
        process.env.ENABLE_GAN_AUDITING = 'true';
        process.env.ENABLE_SYNCHRONOUS_AUDIT = 'true';
        process.env.AUDIT_TIMEOUT_SECONDS = '5'; // Low timeout

        const readiness = isSynchronousModeReady();
        expect(readiness.recommendations.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Migration Recommendations', () => {
    describe('generateMigrationRecommendations', () => {
      it('should generate recommendations for disabled features', () => {
        process.env.ENABLE_GAN_AUDITING = 'false';
        process.env.ENABLE_SYNCHRONOUS_AUDIT = 'false';

        const migration = generateMigrationRecommendations();
        expect(migration.recommendations.length).toBeGreaterThan(0);
        
        const highPriority = migration.recommendations.filter(r => r.priority === 'high');
        expect(highPriority.length).toBeGreaterThan(0);
      });

      it('should generate fewer recommendations for optimal configuration', () => {
        process.env.ENABLE_GAN_AUDITING = 'true';
        process.env.ENABLE_SYNCHRONOUS_AUDIT = 'true';
        process.env.AUDIT_TIMEOUT_SECONDS = '30';
        process.env.ENABLE_AUDIT_CACHING = 'true';
        process.env.ENABLE_SYNC_AUDIT_METRICS = 'true';

        const migration = generateMigrationRecommendations();
        const highPriority = migration.recommendations.filter(r => r.priority === 'high');
        expect(highPriority).toHaveLength(0);
      });

      it('should include environment variable suggestions', () => {
        process.env.ENABLE_GAN_AUDITING = 'false';

        const migration = generateMigrationRecommendations();
        const ganRecommendation = migration.recommendations.find(
          r => r.envVar === 'ENABLE_GAN_AUDITING'
        );
        
        expect(ganRecommendation).toBeDefined();
        expect(ganRecommendation?.suggestedValue).toBe('true');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing environment variables gracefully', () => {
      // Clear all relevant environment variables
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('SYNC_AUDIT_') || key.startsWith('AUDIT_') || key.startsWith('ENABLE_')) {
          delete process.env[key];
        }
      });

      expect(() => buildRuntimeConfigFromEnv()).not.toThrow();
      expect(() => getEnvironmentConfigSummary()).not.toThrow();
      expect(() => isSynchronousModeReady()).not.toThrow();
    });

    it('should handle extreme configuration values', () => {
      process.env.SYNC_AUDIT_TIER1_SCORE = '-100';
      process.env.SYNC_AUDIT_HARD_STOP_LOOPS = '999999';
      process.env.AUDIT_TIMEOUT_SECONDS = '0';
      process.env.MAX_CONCURRENT_AUDITS = '1000';

      const config = buildRuntimeConfigFromEnv();
      const validation = validateRuntimeConfig(config);
      
      // Should not crash and should provide meaningful validation results
      expect(validation).toBeDefined();
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should handle boolean environment variables with various formats', () => {
      const testCases = [
        { value: 'true', expected: true },
        { value: 'TRUE', expected: true },
        { value: 'True', expected: true },
        { value: 'false', expected: false },
        { value: 'FALSE', expected: false },
        { value: 'False', expected: false },
        { value: '1', expected: false }, // Only 'true' should be true
        { value: 'yes', expected: false },
        { value: '', expected: false },
      ];

      testCases.forEach(({ value, expected }) => {
        process.env.ENABLE_SYNCHRONOUS_AUDIT = value;
        const config = buildSynchronousConfigFromEnv();
        expect(config.enabled).toBe(expected);
      });
    });
  });
});