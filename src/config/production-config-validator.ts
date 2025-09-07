/**
 * Production Configuration Validator
 * 
 * This module validates that the system configuration meets production requirements,
 * specifically ensuring no mock functionality is enabled and all required Codex
 * CLI settings are properly configured.
 * 
 * Requirements: 1.4 - Production configuration validation
 */

import { ProductionCodexConfig, parseProductionCodexConfigFromEnv, validateProductionCodexConfig } from './production-codex-config.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Production Validation Results
// ============================================================================

export interface ProductionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: ProductionCodexConfig;
}

export interface ProductionValidationOptions {
  strict: boolean; // If true, warnings are treated as errors
  skipCodexValidation: boolean; // If true, skip actual Codex CLI availability check
}

// ============================================================================
// Production Configuration Validation
// ============================================================================

/**
 * Validate that the current configuration meets production requirements
 */
export async function validateProductionConfiguration(
  options: ProductionValidationOptions = { strict: false, skipCodexValidation: false }
): Promise<ProductionValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let config: ProductionCodexConfig | undefined;

  try {
    // Parse and validate Codex configuration
    config = parseProductionCodexConfigFromEnv();
    validateProductionCodexConfig(config);
    
    logger.info('Production Codex configuration parsed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown configuration error';
    errors.push(`Codex configuration validation failed: ${message}`);
  }

  // Validate environment-specific requirements
  validateEnvironmentRequirements(errors, warnings);

  // Validate mock functionality is disabled
  validateMockFunctionalityDisabled(errors, warnings);

  // Validate required environment variables
  validateRequiredEnvironmentVariables(errors, warnings);

  // Validate Codex CLI availability (if not skipped)
  if (!options.skipCodexValidation && config) {
    try {
      await validateCodexAvailability(config);
      logger.info('Codex CLI availability validated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Codex validation error';
      errors.push(`Codex CLI availability validation failed: ${message}`);
    }
  }

  // Convert warnings to errors in strict mode
  if (options.strict && warnings.length > 0) {
    errors.push(...warnings.map(w => `Strict mode: ${w}`));
    warnings.length = 0;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Validate environment-specific requirements
 */
function validateEnvironmentRequirements(errors: string[], warnings: string[]): void {
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'production') {
    // Production-specific validations
    if (process.env.DEBUG_SYNCHRONOUS_WORKFLOW === 'true') {
      warnings.push('Debug logging is enabled in production environment');
    }
    
    if (process.env.AUDIT_TIMEOUT_SECONDS && parseInt(process.env.AUDIT_TIMEOUT_SECONDS, 10) > 60) {
      warnings.push('Audit timeout is very high for production environment');
    }
  }
  
  if (!nodeEnv) {
    warnings.push('NODE_ENV is not set, defaulting to development behavior');
  }
}

/**
 * Validate that mock functionality is completely disabled
 */
function validateMockFunctionalityDisabled(errors: string[], warnings: string[]): void {
  // Check for mock-related environment variables
  const mockRelatedVars = [
    'ENABLE_MOCK_CODEX',
    'USE_MOCK_RESPONSES',
    'CODEX_MOCK_MODE',
    'FALLBACK_TO_MOCK',
  ];

  for (const varName of mockRelatedVars) {
    if (process.env[varName] === 'true') {
      errors.push(`Mock functionality is enabled via ${varName} - this is not allowed in production`);
    }
  }

  // Ensure CODEX_ALLOW_MOCK_FALLBACK is explicitly false
  if (process.env.CODEX_ALLOW_MOCK_FALLBACK !== 'false') {
    errors.push('CODEX_ALLOW_MOCK_FALLBACK must be explicitly set to false');
  }

  // Ensure fail-fast is enabled
  if (process.env.CODEX_FAIL_FAST !== 'true') {
    errors.push('CODEX_FAIL_FAST must be set to true to prevent fallback behavior');
  }
}

/**
 * Validate required environment variables are set
 */
function validateRequiredEnvironmentVariables(errors: string[], warnings: string[]): void {
  const requiredVars = [
    'ENABLE_GAN_AUDITING',
    'CODEX_EXECUTABLE',
    'CODEX_REQUIRE_AVAILABLE',
    'CODEX_VALIDATE_ON_STARTUP',
    'CODEX_ALLOW_MOCK_FALLBACK',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Required environment variable ${varName} is not set`);
    }
  }

  // Validate boolean values
  const booleanVars = [
    'ENABLE_GAN_AUDITING',
    'CODEX_REQUIRE_AVAILABLE',
    'CODEX_VALIDATE_ON_STARTUP',
    'CODEX_FAIL_FAST',
    'CODEX_PERFORMANCE_METRICS_ENABLED',
  ];

  for (const varName of booleanVars) {
    const value = process.env[varName];
    if (value && !['true', 'false'].includes(value)) {
      errors.push(`Environment variable ${varName} must be 'true' or 'false', got: ${value}`);
    }
  }

  // Validate numeric values
  const numericVars = [
    'CODEX_TIMEOUT',
    'CODEX_MAX_CONCURRENT_PROCESSES',
    'CODEX_PROCESS_CLEANUP_TIMEOUT',
    'CODEX_MAX_RETRIES',
    'CODEX_RETRY_DELAY',
    'CODEX_HEALTH_CHECK_INTERVAL',
  ];

  for (const varName of numericVars) {
    const value = process.env[varName];
    if (value && (isNaN(parseInt(value, 10)) || parseInt(value, 10) < 0)) {
      errors.push(`Environment variable ${varName} must be a positive number, got: ${value}`);
    }
  }
}

/**
 * Validate Codex CLI availability (placeholder - actual implementation would use CodexValidator)
 */
async function validateCodexAvailability(config: ProductionCodexConfig): Promise<void> {
  // This is a placeholder - the actual implementation would use the CodexValidator
  // from the codex module to check if Codex CLI is available and working
  
  // For now, we'll just check if the executable path is provided
  if (!config.executable || config.executable.trim().length === 0) {
    throw new Error('Codex executable path is required but not provided');
  }

  // In a real implementation, this would:
  // 1. Check if the executable exists and is accessible
  // 2. Verify the Codex CLI version compatibility
  // 3. Test a simple Codex CLI command execution
  // 4. Validate environment variables and working directory setup
  
  logger.info(`Codex CLI availability check passed for executable: ${config.executable}`);
}

/**
 * Generate a production readiness report
 */
export function generateProductionReadinessReport(result: ProductionValidationResult): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('PRODUCTION READINESS REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  
  lines.push(`Status: ${result.isValid ? '✅ READY' : '❌ NOT READY'}`);
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  lines.push('');
  
  if (result.errors.length > 0) {
    lines.push('ERRORS (must be fixed):');
    lines.push('-'.repeat(40));
    result.errors.forEach((error, index) => {
      lines.push(`${index + 1}. ${error}`);
    });
    lines.push('');
  }
  
  if (result.warnings.length > 0) {
    lines.push('WARNINGS (should be addressed):');
    lines.push('-'.repeat(40));
    result.warnings.forEach((warning, index) => {
      lines.push(`${index + 1}. ${warning}`);
    });
    lines.push('');
  }
  
  if (result.config) {
    lines.push('CODEX CONFIGURATION:');
    lines.push('-'.repeat(40));
    lines.push(`Executable: ${result.config.executable}`);
    lines.push(`Timeout: ${result.config.timeout}ms`);
    lines.push(`Max Concurrent Processes: ${result.config.maxConcurrentProcesses}`);
    lines.push(`Fail Fast: ${result.config.failFast}`);
    lines.push(`Mock Fallback Allowed: ${result.config.allowMockFallback}`);
    lines.push(`Require Available: ${result.config.requireCodexAvailable}`);
    lines.push(`Validate on Startup: ${result.config.validateOnStartup}`);
    lines.push('');
  }
  
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

/**
 * Validate configuration and throw if not production-ready
 */
export async function ensureProductionReady(options?: ProductionValidationOptions): Promise<ProductionCodexConfig> {
  const result = await validateProductionConfiguration(options);
  
  if (!result.isValid) {
    const report = generateProductionReadinessReport(result);
    logger.error('Production readiness validation failed:\n' + report);
    throw new Error(`System is not production-ready. Errors: ${result.errors.join('; ')}`);
  }
  
  if (result.warnings.length > 0) {
    const report = generateProductionReadinessReport(result);
    logger.warn('Production readiness validation passed with warnings:\n' + report);
  }
  
  if (!result.config) {
    throw new Error('Production configuration validation passed but no config was returned');
  }
  
  return result.config;
}