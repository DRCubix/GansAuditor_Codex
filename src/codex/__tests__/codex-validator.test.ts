/**
 * Tests for CodexValidator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodexValidator, CodexValidationError, createCodexValidator, validateCodexAvailability } from '../codex-validator.js';

describe('CodexValidator', () => {
  let validator: CodexValidator;

  beforeEach(() => {
    validator = new CodexValidator({
      executableName: 'codex',
      timeout: 1000,
    });
  });

  describe('validateCodexAvailability', () => {
    it('should return not available when Codex CLI is not found', async () => {
      // Test with a non-existent executable name
      const testValidator = new CodexValidator({
        executableName: 'non-existent-codex-cli-12345',
        timeout: 1000,
      });

      const result = await testValidator.validateCodexAvailability();

      expect(result.isAvailable).toBe(false);
      expect(result.version).toBeNull();
      expect(result.executablePath).toBeNull();
      expect(result.environmentIssues.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle validation errors gracefully', async () => {
      const result = await validator.validateCodexAvailability();

      // Since codex is likely not installed, this should fail gracefully
      expect(result).toHaveProperty('isAvailable');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('executablePath');
      expect(result).toHaveProperty('environmentIssues');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.environmentIssues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('resolveExecutablePath', () => {
    it('should return null when executable not found', async () => {
      const testValidator = new CodexValidator({
        executableName: 'non-existent-codex-cli-12345',
        timeout: 1000,
      });

      const path = await testValidator.resolveExecutablePath();
      expect(path).toBeNull();
    });

    it('should handle path resolution gracefully', async () => {
      const path = await validator.resolveExecutablePath();
      // Since codex is likely not installed, this should return null
      expect(path === null || typeof path === 'string').toBe(true);
    });
  });

  describe('getVersionInfo', () => {
    it('should return null for non-existent executable', async () => {
      const versionInfo = await validator.getVersionInfo('/non/existent/path');
      expect(versionInfo).toBeNull();
    });

    it('should handle version parsing gracefully', async () => {
      // Test with a real executable that exists (like 'echo')
      const versionInfo = await validator.getVersionInfo('echo');
      // echo doesn't have a --version flag, so this should return null
      expect(versionInfo).toBeNull();
    });
  });

  describe('factory functions', () => {
    it('should create validator with default options', () => {
      const validator = createCodexValidator();
      expect(validator).toBeInstanceOf(CodexValidator);
    });

    it('should create validator with custom options', () => {
      const validator = createCodexValidator({
        executableName: 'custom-codex',
        timeout: 5000,
      });
      expect(validator).toBeInstanceOf(CodexValidator);
    });

    it('should validate availability using convenience function', async () => {
      const result = await validateCodexAvailability({
        executableName: 'non-existent-codex-cli-12345',
        timeout: 1000,
      });
      
      expect(result.isAvailable).toBe(false);
      expect(result).toHaveProperty('environmentIssues');
      expect(result).toHaveProperty('recommendations');
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      const result = await validator.validateCodexAvailability();
      expect(result.isAvailable).toBe(false);
      expect(result.environmentIssues.length).toBeGreaterThan(0);
    });

    it('should handle timeout scenarios', async () => {
      const shortTimeoutValidator = new CodexValidator({ 
        executableName: 'non-existent-codex-cli-12345',
        timeout: 100 
      });

      const result = await shortTimeoutValidator.validateCodexAvailability();
      expect(result.isAvailable).toBe(false);
      expect(result.environmentIssues.length).toBeGreaterThan(0);
    });
  });
});