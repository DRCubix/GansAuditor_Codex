/**
 * Tests for Deployment Manager
 * 
 * This test suite validates the deployment and migration functionality
 * for the system prompt configuration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  DeploymentManager,
  createDeploymentManager,
  deployToEnvironment,
  migrateConfiguration,
  checkCompatibility,
  MIGRATION_SCRIPTS,
} from '../deployment-manager.js';
import {
  SystemPromptConfig,
  DEFAULT_SYSTEM_PROMPT_CONFIG,
  createSystemPromptConfigFile,
} from '../../prompts/system-prompt-config.js';

describe('Deployment Manager', () => {
  const testDir = join(process.cwd(), 'test-deployment');
  const testConfigPath = join(testDir, 'test-config.json');
  const testBackupDir = join(testDir, 'backups');

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    if (!existsSync(testBackupDir)) {
      mkdirSync(testBackupDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('DeploymentManager', () => {
    let manager: DeploymentManager;

    beforeEach(() => {
      manager = createDeploymentManager();
    });

    describe('deployToEnvironment', () => {
      it('should deploy configuration to development environment', async () => {
        const config = { ...DEFAULT_SYSTEM_PROMPT_CONFIG };
        
        const result = await manager.deployToEnvironment(config, 'development', {
          dryRun: true, // Don't actually write files in test
        });

        expect(result.success).toBe(true);
        expect(result.environment).toBe('development');
        expect(result.errors).toHaveLength(0);
        expect(result.featureFlags.experimentalFeatures).toBe(true);
      });

      it('should deploy configuration to production environment with strict validation', async () => {
        const config = { ...DEFAULT_SYSTEM_PROMPT_CONFIG };
        
        const result = await manager.deployToEnvironment(config, 'production', {
          dryRun: true,
        });

        expect(result.success).toBe(true);
        expect(result.environment).toBe('production');
        expect(result.featureFlags.enhancedSecurity).toBe(true);
        expect(result.featureFlags.experimentalFeatures).toBe(false);
        expect(result.rolloutPercentage).toBe(10);
      });

      it('should fail deployment to unknown environment', async () => {
        const config = { ...DEFAULT_SYSTEM_PROMPT_CONFIG };
        
        const result = await manager.deployToEnvironment(config, 'unknown', {
          dryRun: true,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Unknown environment: unknown');
      });

      it('should create backup before deployment', async () => {
        // Create existing configuration file
        createSystemPromptConfigFile(testConfigPath, 'development');
        
        // Update deployment manager with test paths
        const testEnvironments = {
          test: {
            name: 'test' as const,
            configPath: testConfigPath,
            backupPath: testBackupDir,
            featureFlags: {},
            rolloutPercentage: 100,
            validationStrict: false,
            requireApproval: false,
          },
        };
        
        const testManager = new DeploymentManager(testEnvironments);
        const config = { ...DEFAULT_SYSTEM_PROMPT_CONFIG };
        
        const result = await testManager.deployToEnvironment(config, 'test', {
          createBackup: true,
        });

        expect(result.success).toBe(true);
        expect(result.backupCreated).toBe(true);
        expect(result.backupPath).toBeDefined();
        expect(existsSync(result.backupPath!)).toBe(true);
      });

      it('should validate configuration before deployment in strict mode', async () => {
        const invalidConfig = {
          ...DEFAULT_SYSTEM_PROMPT_CONFIG,
          completionCriteria: {
            ...DEFAULT_SYSTEM_PROMPT_CONFIG.completionCriteria,
            maxIterations: -1, // Invalid value
          },
        };

        const result = await manager.deployToEnvironment(invalidConfig, 'production', {
          validateBeforeDeploy: true,
          dryRun: true,
        });

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should apply feature flags to configuration', async () => {
        const config = {
          ...DEFAULT_SYSTEM_PROMPT_CONFIG,
          security: {
            ...DEFAULT_SYSTEM_PROMPT_CONFIG.security,
            validateCommands: true,
          },
        };

        const result = await manager.deployToEnvironment(config, 'development', {
          dryRun: true,
        });

        expect(result.success).toBe(true);
        expect(result.featureFlags.enhancedSecurity).toBe(false); // Should be disabled in dev
      });
    });

    describe('applyMigrations', () => {
      it('should migrate from version 1.0.0 to 2.0.0', () => {
        // Create legacy configuration file
        const legacyConfig = {
          version: '1.0.0',
          auditorName: 'Legacy Auditor',
          auditorRole: 'Code Reviewer',
          adversarialMode: true,
          workflowSteps: 6,
          strictWorkflow: true,
          maxIterations: 20,
          sanitizePII: true,
          validateCommands: false,
          contextLimit: 150000,
          timeoutMs: 25000,
        };

        writeFileSync(testConfigPath, JSON.stringify(legacyConfig, null, 2), 'utf-8');

        const result = manager.applyMigrations(testConfigPath);

        expect(result.success).toBe(true);
        expect(result.fromVersion).toBe('1.0.0');
        expect(result.toVersion).toBe('2.0.0');
        expect(result.migrationsApplied).toContain('1.0.0-to-2.0.0');
        expect(result.backupCreated).toBe(true);

        // Verify migrated configuration
        const migratedContent = JSON.parse(require('fs').readFileSync(testConfigPath, 'utf-8'));
        expect(migratedContent.version).toBe('2.0.0');
        expect(migratedContent.systemPrompt.identity.name).toBe('Legacy Auditor');
        expect(migratedContent.systemPrompt.identity.stance).toBe('adversarial');
        expect(migratedContent.systemPrompt.workflow.steps).toBe(6);
      });

      it('should handle migration when no migrations are needed', () => {
        // Create current version configuration
        createSystemPromptConfigFile(testConfigPath, 'development');

        const result = manager.applyMigrations(testConfigPath);

        expect(result.success).toBe(true);
        expect(result.migrationsApplied).toHaveLength(0);
        expect(result.warnings).toContain('No migrations needed');
      });

      it('should fail migration for non-existent file', () => {
        const result = manager.applyMigrations('non-existent-config.json');

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Configuration file not found: non-existent-config.json');
      });

      it('should handle migration validation failure', () => {
        // Create a configuration that will fail validation after migration
        const invalidLegacyConfig = {
          version: '1.0.0',
          auditorName: '', // Empty name will cause validation failure
          maxIterations: -1, // Invalid value
        };

        writeFileSync(testConfigPath, JSON.stringify(invalidLegacyConfig, null, 2), 'utf-8');

        const result = manager.applyMigrations(testConfigPath);

        expect(result.success).toBe(false);
        expect(result.errors.some(e => e.includes('validation failed'))).toBe(true);
      });
    });

    describe('checkBackwardCompatibility', () => {
      it('should detect compatible configuration', () => {
        createSystemPromptConfigFile(testConfigPath, 'development');

        const result = manager.checkBackwardCompatibility(testConfigPath);

        expect(result.isCompatible).toBe(true);
        expect(result.version).toBe('2.0.0');
        expect(result.migrationRequired).toBe(false);
        expect(result.breakingChanges).toHaveLength(0);
      });

      it('should detect legacy configuration requiring migration', () => {
        const legacyConfig = {
          version: '1.0.0',
          auditorName: 'Legacy Auditor',
          adversarialMode: true,
        };

        writeFileSync(testConfigPath, JSON.stringify(legacyConfig, null, 2), 'utf-8');

        const result = manager.checkBackwardCompatibility(testConfigPath);

        expect(result.isCompatible).toBe(false);
        expect(result.version).toBe('1.0.0');
        expect(result.migrationRequired).toBe(true);
        expect(result.deprecatedFeatures.length).toBeGreaterThan(0);
        expect(result.breakingChanges.length).toBeGreaterThan(0);
        expect(result.migrationPath).toContain('1.0.0-to-2.0.0');
      });

      it('should detect unsupported version', () => {
        const unsupportedConfig = {
          version: '0.5.0',
          someOldField: 'value',
        };

        writeFileSync(testConfigPath, JSON.stringify(unsupportedConfig, null, 2), 'utf-8');

        const result = manager.checkBackwardCompatibility(testConfigPath);

        expect(result.isCompatible).toBe(false);
        expect(result.version).toBe('0.5.0');
        expect(result.breakingChanges).toContain('Unsupported version: 0.5.0');
      });

      it('should handle non-existent configuration file', () => {
        const result = manager.checkBackwardCompatibility('non-existent.json');

        expect(result.isCompatible).toBe(false);
        expect(result.version).toBe('unknown');
        expect(result.breakingChanges).toContain('Configuration file not found');
        expect(result.recommendations).toContain('Create new configuration file');
      });

      it('should detect deprecated fields in configuration', () => {
        const configWithDeprecatedFields = {
          version: '2.0.0',
          systemPrompt: DEFAULT_SYSTEM_PROMPT_CONFIG,
          auditorName: 'Deprecated Field', // This is deprecated
          adversarialMode: true, // This is also deprecated
        };

        writeFileSync(testConfigPath, JSON.stringify(configWithDeprecatedFields, null, 2), 'utf-8');

        const result = manager.checkBackwardCompatibility(testConfigPath);

        expect(result.deprecatedFeatures.some(f => f.includes('auditorName'))).toBe(true);
        expect(result.deprecatedFeatures.some(f => f.includes('adversarialMode'))).toBe(true);
      });
    });

    describe('cleanOldBackups', () => {
      it('should clean old backup files', () => {
        // Create some old backup files
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 35); // 35 days ago
        
        const oldBackupPath = join(testBackupDir, 'config-backup-2023-01-01T00-00-00-000Z.json');
        writeFileSync(oldBackupPath, '{}', 'utf-8');
        
        // Mock file stats to simulate old file
        const originalStatSync = require('fs').statSync;
        vi.spyOn(require('fs'), 'statSync').mockImplementation((path) => {
          if (path === oldBackupPath) {
            return {
              ...originalStatSync(path),
              mtime: oldDate,
            };
          }
          return originalStatSync(path);
        });

        const result = manager.cleanOldBackups(testBackupDir, 30);

        expect(result.success).toBe(true);
        expect(result.deletedFiles).toContain('config-backup-2023-01-01T00-00-00-000Z.json');

        vi.restoreAllMocks();
      });

      it('should handle non-existent backup directory', () => {
        const result = manager.cleanOldBackups('non-existent-dir');

        expect(result.success).toBe(true);
        expect(result.deletedFiles).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('deployToEnvironment', () => {
      it('should use default deployment manager', async () => {
        const config = { ...DEFAULT_SYSTEM_PROMPT_CONFIG };
        
        const result = await deployToEnvironment(config, 'development', {
          dryRun: true,
        });

        expect(result.success).toBe(true);
        expect(result.environment).toBe('development');
      });
    });

    describe('migrateConfiguration', () => {
      it('should migrate configuration using default manager', () => {
        createSystemPromptConfigFile(testConfigPath, 'development');

        const result = migrateConfiguration(testConfigPath);

        expect(result.success).toBe(true);
      });
    });

    describe('checkCompatibility', () => {
      it('should check compatibility using default manager', () => {
        createSystemPromptConfigFile(testConfigPath, 'development');

        const result = checkCompatibility(testConfigPath);

        expect(result.isCompatible).toBe(true);
        expect(result.version).toBe('2.0.0');
      });
    });
  });

  describe('Migration Scripts', () => {
    describe('1.0.0-to-2.0.0 Migration', () => {
      it('should migrate all legacy fields correctly', () => {
        const migration = MIGRATION_SCRIPTS.find(m => m.version === '1.0.0-to-2.0.0');
        expect(migration).toBeDefined();

        const legacyConfig = {
          auditorName: 'Test Auditor',
          auditorRole: 'Senior Reviewer',
          adversarialMode: false,
          workflowSteps: 10,
          strictWorkflow: false,
          allowSkipping: true,
          requireEvidence: false,
          maxIterations: 30,
          stagnationThreshold: 0.98,
          sanitizePII: false,
          validateCommands: true,
          respectPermissions: true,
          flagVulnerabilities: false,
          contextLimit: 250000,
          timeoutMs: 45000,
          enableCaching: false,
          enableProgress: true,
        };

        const migratedConfig = migration!.migrate(legacyConfig);

        expect(migratedConfig.identity.name).toBe('Test Auditor');
        expect(migratedConfig.identity.role).toBe('Senior Reviewer');
        expect(migratedConfig.identity.stance).toBe('constructive-adversarial');
        expect(migratedConfig.workflow.steps).toBe(10);
        expect(migratedConfig.workflow.enforceOrder).toBe(false);
        expect(migratedConfig.workflow.allowSkipping).toBe(true);
        expect(migratedConfig.workflow.evidenceRequired).toBe(false);
        expect(migratedConfig.completionCriteria.maxIterations).toBe(30);
        expect(migratedConfig.completionCriteria.stagnationThreshold).toBe(0.98);
        expect(migratedConfig.security.sanitizePII).toBe(false);
        expect(migratedConfig.security.validateCommands).toBe(true);
        expect(migratedConfig.performance.contextTokenLimit).toBe(250000);
        expect(migratedConfig.performance.auditTimeoutMs).toBe(45000);
        expect(migratedConfig.performance.enableCaching).toBe(false);
      });

      it('should use defaults for missing legacy fields', () => {
        const migration = MIGRATION_SCRIPTS.find(m => m.version === '1.0.0-to-2.0.0');
        const minimalLegacyConfig = {};

        const migratedConfig = migration!.migrate(minimalLegacyConfig);

        expect(migratedConfig.identity.name).toBe(DEFAULT_SYSTEM_PROMPT_CONFIG.identity.name);
        expect(migratedConfig.workflow.steps).toBe(8);
        expect(migratedConfig.completionCriteria.maxIterations).toBe(25);
      });

      it('should validate migrated configuration', () => {
        const migration = MIGRATION_SCRIPTS.find(m => m.version === '1.0.0-to-2.0.0');
        const legacyConfig = {
          auditorName: 'Valid Auditor',
          maxIterations: 20,
        };

        const migratedConfig = migration!.migrate(legacyConfig);
        const isValid = migration!.validate(migratedConfig);

        expect(isValid).toBe(true);
      });

      it('should provide rollback functionality', () => {
        const migration = MIGRATION_SCRIPTS.find(m => m.version === '1.0.0-to-2.0.0');
        const modernConfig = { ...DEFAULT_SYSTEM_PROMPT_CONFIG };

        const rolledBackConfig = migration!.rollback!(modernConfig);

        expect(rolledBackConfig.auditorName).toBe(modernConfig.identity.name);
        expect(rolledBackConfig.adversarialMode).toBe(false); // constructive-adversarial -> false
        expect(rolledBackConfig.workflowSteps).toBe(modernConfig.workflow.steps);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Mock writeFileSync to throw error
      vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const manager = createDeploymentManager();
      const config = { ...DEFAULT_SYSTEM_PROMPT_CONFIG };

      const result = await manager.deployToEnvironment(config, 'development');

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Permission denied'))).toBe(true);

      vi.restoreAllMocks();
    });

    it('should handle JSON parsing errors in migration', () => {
      // Create invalid JSON file
      writeFileSync(testConfigPath, '{ invalid json }', 'utf-8');

      const result = manager.applyMigrations(testConfigPath);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Failed to load configuration'))).toBe(true);
    });

    it('should handle migration script errors', () => {
      // Create configuration that will cause migration to throw
      const problematicConfig = {
        version: '1.0.0',
        // This will cause the migration to fail when it tries to access properties
        auditorName: null,
      };

      writeFileSync(testConfigPath, JSON.stringify(problematicConfig, null, 2), 'utf-8');

      const result = manager.applyMigrations(testConfigPath);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});