/**
 * Tests for System Prompt Configuration Validator
 * 
 * This test suite validates the comprehensive configuration validation system
 * for the GAN Auditor system prompt.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import {
  validateEnvironmentVariables,
  validateConfigurationFile,
  validateDeploymentReadiness,
  validateSystemPromptConfiguration,
  generateValidationReport,
} from '../system-prompt-config-validator.js';
import {
  SystemPromptConfig,
  DEFAULT_SYSTEM_PROMPT_CONFIG,
  createSystemPromptConfigFile,
} from '../../prompts/system-prompt-config.js';

describe('System Prompt Configuration Validator', () => {
  const testConfigPath = join(process.cwd(), 'test-config.json');
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    
    // Clean up test files
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('validateEnvironmentVariables', () => {
    it('should validate valid environment variables', () => {
      // Set valid environment variables
      process.env.GAN_AUDITOR_PROMPT_ENABLED = 'true';
      process.env.GAN_AUDITOR_SANITIZE_PII = 'true';
      process.env.GAN_AUDITOR_VALIDATE_COMMANDS = 'true';
      process.env.GAN_AUDITOR_IDENTITY_NAME = 'Test Auditor';
      process.env.GAN_AUDITOR_STANCE = 'constructive-adversarial';
      process.env.GAN_AUDITOR_CONTEXT_TOKEN_LIMIT = '150000';
      process.env.GAN_AUDITOR_AUDIT_TIMEOUT_MS = '25000';

      const result = validateEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.validVars).toBeGreaterThan(0);
    });

    it('should detect invalid boolean values', () => {
      process.env.GAN_AUDITOR_PROMPT_ENABLED = 'maybe';
      process.env.GAN_AUDITOR_SANITIZE_PII = 'yes';
      process.env.GAN_AUDITOR_VALIDATE_COMMANDS = 'true';

      const result = validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.invalidVars).toContainEqual(
        expect.objectContaining({
          name: 'GAN_AUDITOR_PROMPT_ENABLED',
          issue: 'Invalid boolean value',
        })
      );
    });

    it('should detect out-of-range integer values', () => {
      process.env.GAN_AUDITOR_CONTEXT_TOKEN_LIMIT = '500'; // Below minimum
      process.env.GAN_AUDITOR_AUDIT_TIMEOUT_MS = '500000'; // Above maximum
      process.env.GAN_AUDITOR_WORKFLOW_STEPS = '25'; // Above maximum

      const result = validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.invalidVars.length).toBeGreaterThan(0);
      
      const contextLimitError = result.invalidVars.find(v => v.name === 'GAN_AUDITOR_CONTEXT_TOKEN_LIMIT');
      expect(contextLimitError?.issue).toContain('out of range');
    });

    it('should detect invalid enum values', () => {
      process.env.GAN_AUDITOR_STANCE = 'aggressive';
      process.env.GAN_AUDITOR_AUTHORITY = 'supreme';
      process.env.GAN_AUDITOR_WEIGHTING_SCHEME = 'random';

      const result = validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.invalidVars.length).toBeGreaterThan(0);
      
      const stanceError = result.invalidVars.find(v => v.name === 'GAN_AUDITOR_STANCE');
      expect(stanceError?.issue).toContain('Invalid stance value');
    });

    it('should detect missing critical variables', () => {
      // Don't set any critical variables
      delete process.env.GAN_AUDITOR_PROMPT_ENABLED;
      delete process.env.GAN_AUDITOR_SANITIZE_PII;
      delete process.env.GAN_AUDITOR_VALIDATE_COMMANDS;

      const result = validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('GAN_AUDITOR_PROMPT_ENABLED'))).toBe(true);
    });

    it('should provide helpful suggestions for invalid values', () => {
      process.env.GAN_AUDITOR_STANCE = 'invalid-stance';

      const result = validateEnvironmentVariables();

      const stanceError = result.invalidVars.find(v => v.name === 'GAN_AUDITOR_STANCE');
      expect(stanceError?.suggestion).toContain('adversarial');
      expect(stanceError?.suggestion).toContain('collaborative');
      expect(stanceError?.suggestion).toContain('constructive-adversarial');
    });
  });

  describe('validateConfigurationFile', () => {
    it('should validate valid configuration file', () => {
      // Create valid configuration file
      const result = createSystemPromptConfigFile(testConfigPath, 'development');
      expect(result.success).toBe(true);

      const validation = validateConfigurationFile(testConfigPath);

      expect(validation.isValid).toBe(true);
      expect(validation.fileExists).toBe(true);
      expect(validation.isReadable).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing configuration file', () => {
      const validation = validateConfigurationFile('nonexistent-config.json');

      expect(validation.isValid).toBe(false);
      expect(validation.fileExists).toBe(false);
      expect(validation.errors).toContain('Configuration file does not exist: nonexistent-config.json');
      expect(validation.recommendations).toContain('Create configuration file using createSystemPromptConfigFile()');
    });

    it('should detect invalid JSON in configuration file', () => {
      // Create invalid JSON file
      writeFileSync(testConfigPath, '{ invalid json }', 'utf-8');

      const validation = validateConfigurationFile(testConfigPath);

      expect(validation.isValid).toBe(false);
      expect(validation.fileExists).toBe(true);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Failed to parse configuration file');
    });

    it('should detect missing systemPrompt section', () => {
      // Create file without systemPrompt section
      const invalidConfig = {
        version: '2.0.0',
        metadata: {
          createdAt: new Date().toISOString(),
        },
      };
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig, null, 2), 'utf-8');

      const validation = validateConfigurationFile(testConfigPath);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Configuration file missing systemPrompt section');
    });

    it('should warn about old configuration files', () => {
      // Create valid configuration file
      createSystemPromptConfigFile(testConfigPath, 'development');

      // Mock file stats to simulate old file
      const originalStatSync = require('fs').statSync;
      vi.spyOn(require('fs'), 'statSync').mockImplementation((path) => {
        if (path === testConfigPath) {
          const oldDate = new Date();
          oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago
          return {
            ...originalStatSync(path),
            mtime: oldDate,
          };
        }
        return originalStatSync(path);
      });

      const validation = validateConfigurationFile(testConfigPath);

      expect(validation.warnings.some(w => w.includes('very old'))).toBe(true);

      vi.restoreAllMocks();
    });
  });

  describe('validateDeploymentReadiness', () => {
    it('should validate production deployment readiness', () => {
      // Set production environment variables
      process.env.NODE_ENV = 'production';
      process.env.GAN_AUDITOR_SANITIZE_PII = 'true';
      process.env.GAN_AUDITOR_VALIDATE_COMMANDS = 'true';
      process.env.GAN_AUDITOR_RESPECT_PERMISSIONS = 'true';
      process.env.GAN_AUDITOR_FLAG_VULNERABILITIES = 'true';

      const result = validateDeploymentReadiness();

      expect(result.environment).toBe('production');
      expect(result.securityChecks.piiSanitizationEnabled).toBe(true);
      expect(result.securityChecks.commandValidationEnabled).toBe(true);
      expect(result.securityChecks.permissionsRespected).toBe(true);
      expect(result.securityChecks.vulnerabilityDetectionEnabled).toBe(true);
    });

    it('should detect production security issues', () => {
      process.env.NODE_ENV = 'production';
      process.env.GAN_AUDITOR_SANITIZE_PII = 'false';
      process.env.GAN_AUDITOR_VALIDATE_COMMANDS = 'false';

      const result = validateDeploymentReadiness();

      expect(result.isReady).toBe(false);
      expect(result.errors).toContain('PII sanitization must be enabled in production');
      expect(result.errors).toContain('Command validation must be enabled in production');
    });

    it('should provide development-specific recommendations', () => {
      process.env.NODE_ENV = 'development';
      process.env.GAN_AUDITOR_VALIDATE_COMMANDS = 'true';
      process.env.GAN_AUDITOR_ENFORCE_WORKFLOW_ORDER = 'true';

      const result = validateDeploymentReadiness();

      expect(result.environment).toBe('development');
      expect(result.recommendations.some(r => r.includes('disabling command validation'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('workflow flexibility'))).toBe(true);
    });

    it('should check performance settings', () => {
      process.env.GAN_AUDITOR_AUDIT_TIMEOUT_MS = '500000'; // Very high timeout
      process.env.GAN_AUDITOR_CONTEXT_TOKEN_LIMIT = '2000000'; // Very high limit

      const result = validateDeploymentReadiness();

      expect(result.performanceChecks.timeoutReasonable).toBe(false);
      expect(result.performanceChecks.tokenLimitReasonable).toBe(false);
    });

    it('should detect missing integrations', () => {
      process.env.GAN_AUDITOR_CODEX_INTEGRATION = 'false';
      process.env.GAN_AUDITOR_SESSION_MANAGEMENT = 'false';

      const result = validateDeploymentReadiness();

      expect(result.errors).toContain('Codex integration is disabled - system prompt will not function');
      expect(result.warnings).toContain('Session management is disabled - audit history will not be preserved');
    });
  });

  describe('validateSystemPromptConfiguration', () => {
    it('should perform comprehensive validation', () => {
      // Set up valid environment
      process.env.GAN_AUDITOR_PROMPT_ENABLED = 'true';
      process.env.GAN_AUDITOR_SANITIZE_PII = 'true';
      process.env.GAN_AUDITOR_VALIDATE_COMMANDS = 'true';
      process.env.GAN_AUDITOR_IDENTITY_NAME = 'Test Auditor';

      // Create valid configuration file
      createSystemPromptConfigFile(testConfigPath, 'development');

      const result = validateSystemPromptConfiguration(testConfigPath);

      expect(result.isValid).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.environmentValidation).toBeDefined();
      expect(result.fileValidation).toBeDefined();
      expect(result.deploymentReadiness).toBeDefined();
      expect(result.summary.configSummary).toBeDefined();
    });

    it('should aggregate errors from all validation sources', () => {
      // Set invalid environment variables
      process.env.GAN_AUDITOR_STANCE = 'invalid';
      
      // Create invalid configuration file
      const invalidConfig = { version: '1.0.0' }; // Missing systemPrompt
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig), 'utf-8');

      const result = validateSystemPromptConfiguration(testConfigPath);

      expect(result.isValid).toBe(false);
      expect(result.summary.totalErrors).toBeGreaterThan(0);
      expect(result.environmentValidation.invalidVars.length).toBeGreaterThan(0);
      expect(result.fileValidation?.errors.length).toBeGreaterThan(0);
    });

    it('should provide configuration sources information', () => {
      process.env.GAN_AUDITOR_IDENTITY_NAME = 'Env Auditor';
      createSystemPromptConfigFile(testConfigPath, 'development');

      const result = validateSystemPromptConfiguration(testConfigPath);

      expect(result.deploymentReadiness.configSources.defaults).toBe(true);
      expect(result.deploymentReadiness.configSources.configFile).toBe(true);
      expect(result.deploymentReadiness.configSources.environment).toBe(true);
    });
  });

  describe('generateValidationReport', () => {
    it('should generate comprehensive validation report', () => {
      // Set up test environment
      process.env.GAN_AUDITOR_PROMPT_ENABLED = 'true';
      process.env.GAN_AUDITOR_SANITIZE_PII = 'true';
      process.env.GAN_AUDITOR_VALIDATE_COMMANDS = 'true';
      
      createSystemPromptConfigFile(testConfigPath, 'development');
      
      const validation = validateSystemPromptConfiguration(testConfigPath);
      const report = generateValidationReport(validation);

      expect(report).toContain('System Prompt Configuration Validation Report');
      expect(report).toContain('Executive Summary');
      expect(report).toContain('Configuration Summary');
      expect(report).toContain('Configuration Sources');
      expect(report).toContain('Security Checks');
      expect(report).toContain('Performance Checks');
    });

    it('should include error details in report', () => {
      // Set up invalid environment
      process.env.GAN_AUDITOR_STANCE = 'invalid';
      
      const validation = validateSystemPromptConfiguration();
      const report = generateValidationReport(validation);

      expect(report).toContain('❌ INVALID');
      expect(report).toContain('Environment Variables');
      expect(report).toContain('Invalid Variables');
    });

    it('should include recommendations in report', () => {
      // Set up environment that generates recommendations
      process.env.NODE_ENV = 'development';
      process.env.GAN_AUDITOR_VALIDATE_COMMANDS = 'true';
      
      const validation = validateSystemPromptConfiguration();
      const report = generateValidationReport(validation);

      expect(report).toContain('Recommendations');
      expect(report).toContain('💡');
    });

    it('should show security and performance check results', () => {
      process.env.GAN_AUDITOR_SANITIZE_PII = 'true';
      process.env.GAN_AUDITOR_VALIDATE_COMMANDS = 'false';
      process.env.GAN_AUDITOR_ENABLE_CACHING = 'true';
      
      const validation = validateSystemPromptConfiguration();
      const report = generateValidationReport(validation);

      expect(report).toContain('Security Checks');
      expect(report).toContain('Performance Checks');
      expect(report).toContain('PII Sanitization');
      expect(report).toContain('Command Validation');
      expect(report).toContain('Caching Enabled');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing file permissions gracefully', () => {
      createSystemPromptConfigFile(testConfigPath, 'development');
      
      // Mock statSync to throw error
      vi.spyOn(require('fs'), 'statSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const validation = validateConfigurationFile(testConfigPath);
      
      expect(validation.warnings.some(w => w.includes('Could not check file permissions'))).toBe(true);
      
      vi.restoreAllMocks();
    });

    it('should handle empty configuration file', () => {
      writeFileSync(testConfigPath, '', 'utf-8');

      const validation = validateConfigurationFile(testConfigPath);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Configuration file is empty');
    });

    it('should handle very large configuration file', () => {
      const largeConfig = {
        systemPrompt: DEFAULT_SYSTEM_PROMPT_CONFIG,
        version: '2.0.0',
        largeData: 'x'.repeat(2 * 1024 * 1024), // 2MB of data
      };
      writeFileSync(testConfigPath, JSON.stringify(largeConfig), 'utf-8');

      const validation = validateConfigurationFile(testConfigPath);

      expect(validation.warnings.some(w => w.includes('very large'))).toBe(true);
    });

    it('should handle unknown environment detection', () => {
      delete process.env.NODE_ENV;

      const result = validateDeploymentReadiness();

      expect(result.environment).toBe('unknown');
    });

    it('should handle configuration with custom dimensions', () => {
      const customConfig = {
        ...DEFAULT_SYSTEM_PROMPT_CONFIG,
        qualityFramework: {
          ...DEFAULT_SYSTEM_PROMPT_CONFIG.qualityFramework,
          dimensions: 8, // Non-standard number
        },
      };

      // This should not cause errors, just recommendations
      const validation = validateSystemPromptConfiguration();
      expect(validation.config).toBeDefined();
    });
  });
});