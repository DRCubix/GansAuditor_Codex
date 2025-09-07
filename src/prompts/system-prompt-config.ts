/**
 * System Prompt Configuration for GansAuditor_Codex
 * 
 * This module provides comprehensive configuration management for the
 * GAN Auditor system prompt, including environment variable integration,
 * file-based configuration, validation, and deployment support.
 * 
 * Requirements: 11.1 - Configuration management
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ValidationResult } from '../types/validation-types.js';

/**
 * Configuration for the GAN Auditor system prompt
 */
export interface SystemPromptConfig {
  /** Identity configuration */
  identity: {
    name: string;
    role: string;
    stance: 'adversarial' | 'collaborative' | 'constructive-adversarial';
    authority: 'spec-and-steering-ground-truth' | 'flexible' | 'advisory';
  };
  
  /** Workflow configuration */
  workflow: {
    steps: number;
    enforceOrder: boolean;
    allowSkipping: boolean;
    evidenceRequired: boolean;
  };
  
  /** Quality assessment framework */
  qualityFramework: {
    dimensions: number;
    weightingScheme: 'project-standard' | 'custom' | 'balanced';
    scoringScale: '0-100' | '0-10' | 'letter-grade';
    aggregationMethod: 'weighted-average' | 'minimum' | 'geometric-mean';
  };
  
  /** Completion criteria */
  completionCriteria: {
    tiers: number;
    killSwitches: number;
    shipGates: number;
    stagnationThreshold: number; // 0-1 scale
    maxIterations: number;
  };
  
  /** Integration settings */
  integration: {
    sessionManagement: boolean;
    codexIntegration: boolean;
    contextAwareness: boolean;
    performanceOptimization: boolean;
  };
  
  /** Security and safety */
  security: {
    sanitizePII: boolean;
    validateCommands: boolean;
    respectPermissions: boolean;
    flagVulnerabilities: boolean;
  };
  
  /** Performance settings */
  performance: {
    contextTokenLimit: number;
    auditTimeoutMs: number;
    enableCaching: boolean;
    enableProgressTracking: boolean;
  };
}

/**
 * Quality dimension configuration
 */
export interface QualityDimension {
  name: string;
  weight: number;
  description: string;
  criteria: string[];
}

/**
 * Completion tier configuration
 */
export interface CompletionTier {
  name: string;
  scoreThreshold: number;
  iterationThreshold: number;
  verdict: 'pass' | 'revise' | 'reject';
  message: string;
}

/**
 * Kill switch configuration
 */
export interface KillSwitch {
  name: string;
  condition: string;
  action: string;
  message: string;
}

/**
 * Default system prompt configuration
 */
export const DEFAULT_SYSTEM_PROMPT_CONFIG: SystemPromptConfig = {
  identity: {
    name: 'Kilo Code',
    role: 'Adversarial Auditor',
    stance: 'constructive-adversarial',
    authority: 'spec-and-steering-ground-truth',
  },
  
  workflow: {
    steps: 8,
    enforceOrder: true,
    allowSkipping: false,
    evidenceRequired: true,
  },
  
  qualityFramework: {
    dimensions: 6,
    weightingScheme: 'project-standard',
    scoringScale: '0-100',
    aggregationMethod: 'weighted-average',
  },
  
  completionCriteria: {
    tiers: 3,
    killSwitches: 3,
    shipGates: 5,
    stagnationThreshold: 0.95,
    maxIterations: 25,
  },
  
  integration: {
    sessionManagement: true,
    codexIntegration: true,
    contextAwareness: true,
    performanceOptimization: true,
  },
  
  security: {
    sanitizePII: true,
    validateCommands: true,
    respectPermissions: true,
    flagVulnerabilities: true,
  },
  
  performance: {
    contextTokenLimit: 200000,
    auditTimeoutMs: 30000,
    enableCaching: true,
    enableProgressTracking: true,
  },
};

/**
 * Default quality dimensions with weights and criteria
 */
export const DEFAULT_QUALITY_DIMENSIONS: QualityDimension[] = [
  {
    name: 'Correctness & Completeness',
    weight: 0.30,
    description: 'Functionality correctness and feature completeness',
    criteria: [
      'All ACs met and properly implemented',
      'Edge cases covered and handled',
      'Error paths properly implemented',
      'Idempotency where required',
      'Business logic accuracy',
    ],
  },
  {
    name: 'Tests',
    weight: 0.20,
    description: 'Test coverage and quality',
    criteria: [
      'Unit tests for new/changed functionality',
      'Integration tests where appropriate',
      'Meaningful assertions and test quality',
      'Test coverage for edge cases',
      'Failing test → passing test workflow',
    ],
  },
  {
    name: 'Style & Conventions',
    weight: 0.15,
    description: 'Code style and project conventions',
    criteria: [
      'Lint/format clean per project standards',
      'Consistent naming conventions',
      'Proper imports and organization',
      'Comments and docstrings per Steering',
      'Code readability and maintainability',
    ],
  },
  {
    name: 'Security',
    weight: 0.15,
    description: 'Security practices and vulnerability prevention',
    criteria: [
      'Input validation and sanitization',
      'No secrets in code/logs',
      'Safe defaults and error handling',
      'Dependency security review',
      'Authentication and authorization',
    ],
  },
  {
    name: 'Performance',
    weight: 0.10,
    description: 'Performance considerations and optimization',
    criteria: [
      'No obvious performance bottlenecks',
      'Efficient algorithms and data structures',
      'Proper resource management',
      'Caching where appropriate',
      'Database query optimization',
    ],
  },
  {
    name: 'Docs & Traceability',
    weight: 0.10,
    description: 'Documentation and requirements traceability',
    criteria: [
      'Inline documentation for complex logic',
      'ADR for non-trivial decisions',
      'Changelog entries for behavior changes',
      'Requirements traceability',
      'API documentation updates',
    ],
  },
];

/**
 * Default completion tiers
 */
export const DEFAULT_COMPLETION_TIERS: CompletionTier[] = [
  {
    name: 'Tier 1 - Excellence',
    scoreThreshold: 95,
    iterationThreshold: 10,
    verdict: 'pass',
    message: 'Excellent quality achieved through iterative improvement',
  },
  {
    name: 'Tier 2 - High Quality',
    scoreThreshold: 90,
    iterationThreshold: 15,
    verdict: 'pass',
    message: 'High quality achieved with sustained improvement',
  },
  {
    name: 'Tier 3 - Acceptable',
    scoreThreshold: 85,
    iterationThreshold: 20,
    verdict: 'pass',
    message: 'Acceptable quality reached after extensive iteration',
  },
];

/**
 * Default kill switches
 */
export const DEFAULT_KILL_SWITCHES: KillSwitch[] = [
  {
    name: 'Hard Stop',
    condition: 'loops >= 25',
    action: 'Terminate with failure analysis',
    message: 'Maximum iteration limit reached - manual review required',
  },
  {
    name: 'Stagnation Detection',
    condition: 'loops >= 10 && similarity > 0.95',
    action: 'Report loop detection and suggest alternatives',
    message: 'Improvement stagnation detected - alternative approach needed',
  },
  {
    name: 'Critical Issues Persist',
    condition: 'criticalIssues.length > 0 && loops >= 15',
    action: 'Escalate for manual review',
    message: 'Critical issues persist despite multiple iterations',
  },
];

/**
 * Configuration file interface for system prompt settings
 */
export interface SystemPromptConfigFile {
  version: string;
  systemPrompt: SystemPromptConfig;
  customDimensions?: QualityDimension[];
  customTiers?: CompletionTier[];
  customKillSwitches?: KillSwitch[];
  metadata?: {
    createdAt: string;
    updatedAt: string;
    description?: string;
    author?: string;
  };
}

/**
 * Configuration validation options
 */
export interface ConfigValidationOptions {
  strict: boolean;
  allowUnknownFields: boolean;
  validateEnvironment: boolean;
  checkFilePermissions: boolean;
}

/**
 * Configuration deployment options
 */
export interface ConfigDeploymentOptions {
  environment: 'development' | 'staging' | 'production';
  backupExisting: boolean;
  validateBeforeApply: boolean;
  rollbackOnFailure: boolean;
}

/**
 * Environment variable mappings for system prompt configuration
 */
export const SYSTEM_PROMPT_ENV_VARS = {
  // Core system prompt settings
  GAN_AUDITOR_PROMPT_ENABLED: 'enabled',
  GAN_AUDITOR_PROMPT_VERSION: 'version',
  GAN_AUDITOR_PROMPT_CONFIG_FILE: 'configFile',
  
  // Identity
  GAN_AUDITOR_IDENTITY_NAME: 'identity.name',
  GAN_AUDITOR_IDENTITY_ROLE: 'identity.role',
  GAN_AUDITOR_STANCE: 'identity.stance',
  GAN_AUDITOR_AUTHORITY: 'identity.authority',
  
  // Workflow
  GAN_AUDITOR_WORKFLOW_STEPS: 'workflow.steps',
  GAN_AUDITOR_ENFORCE_WORKFLOW_ORDER: 'workflow.enforceOrder',
  GAN_AUDITOR_ALLOW_WORKFLOW_SKIPPING: 'workflow.allowSkipping',
  GAN_AUDITOR_EVIDENCE_REQUIRED: 'workflow.evidenceRequired',
  
  // Quality framework
  GAN_AUDITOR_QUALITY_DIMENSIONS: 'qualityFramework.dimensions',
  GAN_AUDITOR_WEIGHTING_SCHEME: 'qualityFramework.weightingScheme',
  GAN_AUDITOR_SCORING_SCALE: 'qualityFramework.scoringScale',
  GAN_AUDITOR_AGGREGATION_METHOD: 'qualityFramework.aggregationMethod',
  
  // Completion criteria
  GAN_AUDITOR_COMPLETION_TIERS: 'completionCriteria.tiers',
  GAN_AUDITOR_KILL_SWITCHES: 'completionCriteria.killSwitches',
  GAN_AUDITOR_SHIP_GATES: 'completionCriteria.shipGates',
  GAN_AUDITOR_STAGNATION_THRESHOLD: 'completionCriteria.stagnationThreshold',
  GAN_AUDITOR_MAX_ITERATIONS: 'completionCriteria.maxIterations',
  
  // Integration
  GAN_AUDITOR_SESSION_MANAGEMENT: 'integration.sessionManagement',
  GAN_AUDITOR_CODEX_INTEGRATION: 'integration.codexIntegration',
  GAN_AUDITOR_CONTEXT_AWARENESS: 'integration.contextAwareness',
  GAN_AUDITOR_PERFORMANCE_OPTIMIZATION: 'integration.performanceOptimization',
  
  // Security
  GAN_AUDITOR_SANITIZE_PII: 'security.sanitizePII',
  GAN_AUDITOR_VALIDATE_COMMANDS: 'security.validateCommands',
  GAN_AUDITOR_RESPECT_PERMISSIONS: 'security.respectPermissions',
  GAN_AUDITOR_FLAG_VULNERABILITIES: 'security.flagVulnerabilities',
  
  // Performance
  GAN_AUDITOR_CONTEXT_TOKEN_LIMIT: 'performance.contextTokenLimit',
  GAN_AUDITOR_AUDIT_TIMEOUT_MS: 'performance.auditTimeoutMs',
  GAN_AUDITOR_ENABLE_CACHING: 'performance.enableCaching',
  GAN_AUDITOR_ENABLE_PROGRESS_TRACKING: 'performance.enableProgressTracking',
} as const;

/**
 * Comprehensive validation result
 */
export interface SystemPromptConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  validatedSections: string[];
}

/**
 * Validate system prompt configuration comprehensively
 */
export function validateSystemPromptConfig(config: Partial<SystemPromptConfig>): SystemPromptConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const validatedSections: string[] = [];
  
  // Validate identity configuration
  if (config.identity) {
    validatedSections.push('identity');
    
    if (!config.identity.name || config.identity.name.trim().length === 0) {
      errors.push('Identity name cannot be empty');
    } else if (config.identity.name.length > 50) {
      warnings.push('Identity name is very long (>50 characters)');
    }
    
    if (!config.identity.role || config.identity.role.trim().length === 0) {
      errors.push('Identity role cannot be empty');
    }
    
    const validStances = ['adversarial', 'collaborative', 'constructive-adversarial'];
    if (config.identity.stance && !validStances.includes(config.identity.stance)) {
      errors.push(`Invalid identity stance. Must be one of: ${validStances.join(', ')}`);
    }
    
    const validAuthorities = ['spec-and-steering-ground-truth', 'flexible', 'advisory'];
    if (config.identity.authority && !validAuthorities.includes(config.identity.authority)) {
      errors.push(`Invalid identity authority. Must be one of: ${validAuthorities.join(', ')}`);
    }
  }
  
  // Validate workflow configuration
  if (config.workflow) {
    validatedSections.push('workflow');
    
    if (config.workflow.steps !== undefined) {
      if (config.workflow.steps < 1 || config.workflow.steps > 20) {
        errors.push('Workflow steps must be between 1 and 20');
      } else if (config.workflow.steps !== 8) {
        warnings.push('Workflow steps should typically be 8 for standard GAN audit process');
      }
    }
  }
  
  // Validate quality framework
  if (config.qualityFramework) {
    validatedSections.push('qualityFramework');
    
    if (config.qualityFramework.dimensions !== undefined) {
      if (config.qualityFramework.dimensions < 1 || config.qualityFramework.dimensions > 10) {
        errors.push('Quality dimensions must be between 1 and 10');
      } else if (config.qualityFramework.dimensions !== 6) {
        recommendations.push('Consider using 6 quality dimensions for comprehensive assessment');
      }
    }
    
    const validWeightingSchemes = ['project-standard', 'custom', 'balanced'];
    if (config.qualityFramework.weightingScheme && !validWeightingSchemes.includes(config.qualityFramework.weightingScheme)) {
      errors.push(`Invalid weighting scheme. Must be one of: ${validWeightingSchemes.join(', ')}`);
    }
    
    const validScoringScales = ['0-100', '0-10', 'letter-grade'];
    if (config.qualityFramework.scoringScale && !validScoringScales.includes(config.qualityFramework.scoringScale)) {
      errors.push(`Invalid scoring scale. Must be one of: ${validScoringScales.join(', ')}`);
    }
    
    const validAggregationMethods = ['weighted-average', 'minimum', 'geometric-mean'];
    if (config.qualityFramework.aggregationMethod && !validAggregationMethods.includes(config.qualityFramework.aggregationMethod)) {
      errors.push(`Invalid aggregation method. Must be one of: ${validAggregationMethods.join(', ')}`);
    }
  }
  
  // Validate completion criteria
  if (config.completionCriteria) {
    validatedSections.push('completionCriteria');
    
    if (config.completionCriteria.stagnationThreshold !== undefined) {
      if (config.completionCriteria.stagnationThreshold < 0 || config.completionCriteria.stagnationThreshold > 1) {
        errors.push('Stagnation threshold must be between 0 and 1');
      } else if (config.completionCriteria.stagnationThreshold < 0.8) {
        warnings.push('Low stagnation threshold may cause premature termination');
      } else if (config.completionCriteria.stagnationThreshold > 0.98) {
        warnings.push('Very high stagnation threshold may prevent stagnation detection');
      }
    }
    
    if (config.completionCriteria.maxIterations !== undefined) {
      if (config.completionCriteria.maxIterations < 1 || config.completionCriteria.maxIterations > 100) {
        errors.push('Max iterations must be between 1 and 100');
      } else if (config.completionCriteria.maxIterations < 10) {
        warnings.push('Low max iterations may not allow sufficient improvement cycles');
      } else if (config.completionCriteria.maxIterations > 50) {
        warnings.push('High max iterations may lead to excessive processing time');
      }
    }
    
    if (config.completionCriteria.tiers !== undefined) {
      if (config.completionCriteria.tiers < 1 || config.completionCriteria.tiers > 5) {
        errors.push('Completion tiers must be between 1 and 5');
      }
    }
    
    if (config.completionCriteria.killSwitches !== undefined) {
      if (config.completionCriteria.killSwitches < 1 || config.completionCriteria.killSwitches > 10) {
        errors.push('Kill switches must be between 1 and 10');
      }
    }
  }
  
  // Validate integration settings
  if (config.integration) {
    validatedSections.push('integration');
    
    if (config.integration.sessionManagement === false) {
      warnings.push('Disabling session management will prevent audit history tracking');
    }
    
    if (config.integration.codexIntegration === false) {
      warnings.push('Disabling Codex integration will limit audit capabilities');
    }
    
    if (config.integration.performanceOptimization === false) {
      recommendations.push('Enable performance optimization for better audit speed');
    }
  }
  
  // Validate security settings
  if (config.security) {
    validatedSections.push('security');
    
    if (config.security.sanitizePII === false) {
      errors.push('PII sanitization must be enabled for security compliance');
    }
    
    if (config.security.validateCommands === false) {
      warnings.push('Command validation should be enabled in production environments');
    }
    
    if (config.security.respectPermissions === false) {
      warnings.push('Permission respect should be enabled in production environments');
    }
  }
  
  // Validate performance settings
  if (config.performance) {
    validatedSections.push('performance');
    
    if (config.performance.contextTokenLimit !== undefined) {
      if (config.performance.contextTokenLimit < 1000 || config.performance.contextTokenLimit > 1000000) {
        errors.push('Context token limit must be between 1,000 and 1,000,000');
      } else if (config.performance.contextTokenLimit < 50000) {
        warnings.push('Low context token limit may truncate important context');
      } else if (config.performance.contextTokenLimit > 500000) {
        warnings.push('High context token limit may impact performance');
      }
    }
    
    if (config.performance.auditTimeoutMs !== undefined) {
      if (config.performance.auditTimeoutMs < 5000 || config.performance.auditTimeoutMs > 300000) {
        errors.push('Audit timeout must be between 5 seconds and 5 minutes');
      } else if (config.performance.auditTimeoutMs < 15000) {
        warnings.push('Short audit timeout may not allow thorough analysis');
      } else if (config.performance.auditTimeoutMs > 120000) {
        warnings.push('Long audit timeout may impact user experience');
      }
    }
    
    if (config.performance.enableCaching === false) {
      recommendations.push('Enable caching for better performance with repeated audits');
    }
    
    if (config.performance.enableProgressTracking === false) {
      recommendations.push('Enable progress tracking for better user experience');
    }
  }
  
  // Cross-validation checks
  if (config.completionCriteria && config.performance) {
    const maxIterations = config.completionCriteria.maxIterations || DEFAULT_SYSTEM_PROMPT_CONFIG.completionCriteria.maxIterations;
    const timeoutMs = config.performance.auditTimeoutMs || DEFAULT_SYSTEM_PROMPT_CONFIG.performance.auditTimeoutMs;
    
    const estimatedTotalTime = maxIterations * timeoutMs;
    if (estimatedTotalTime > 600000) { // 10 minutes
      warnings.push('High max iterations combined with long timeout may result in very long audit sessions');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations,
    validatedSections,
  };
}

/**
 * Merge configuration with defaults
 */
export function mergeSystemPromptConfig(
  config: Partial<SystemPromptConfig>
): SystemPromptConfig {
  return {
    identity: { ...DEFAULT_SYSTEM_PROMPT_CONFIG.identity, ...config.identity },
    workflow: { ...DEFAULT_SYSTEM_PROMPT_CONFIG.workflow, ...config.workflow },
    qualityFramework: { ...DEFAULT_SYSTEM_PROMPT_CONFIG.qualityFramework, ...config.qualityFramework },
    completionCriteria: { ...DEFAULT_SYSTEM_PROMPT_CONFIG.completionCriteria, ...config.completionCriteria },
    integration: { ...DEFAULT_SYSTEM_PROMPT_CONFIG.integration, ...config.integration },
    security: { ...DEFAULT_SYSTEM_PROMPT_CONFIG.security, ...config.security },
    performance: { ...DEFAULT_SYSTEM_PROMPT_CONFIG.performance, ...config.performance },
  };
}

// ============================================================================
// Configuration File Management
// ============================================================================

/**
 * Load configuration from file with validation
 */
export function loadSystemPromptConfigFromFile(
  filePath: string,
  options: Partial<ConfigValidationOptions> = {}
): {
  config: SystemPromptConfig | null;
  validation: SystemPromptConfigValidation;
  fileExists: boolean;
} {
  const opts: ConfigValidationOptions = {
    strict: false,
    allowUnknownFields: true,
    validateEnvironment: false,
    checkFilePermissions: false,
    ...options,
  };

  if (!existsSync(filePath)) {
    return {
      config: null,
      validation: {
        isValid: false,
        errors: [`Configuration file not found: ${filePath}`],
        warnings: [],
        recommendations: ['Create configuration file using createSystemPromptConfigFile()'],
        validatedSections: [],
      },
      fileExists: false,
    };
  }

  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const configFile: SystemPromptConfigFile = JSON.parse(fileContent);
    
    // Validate file structure
    if (!configFile.systemPrompt) {
      return {
        config: null,
        validation: {
          isValid: false,
          errors: ['Configuration file missing systemPrompt section'],
          warnings: [],
          recommendations: ['Ensure configuration file has proper structure'],
          validatedSections: [],
        },
        fileExists: true,
      };
    }

    // Merge with defaults and validate
    const mergedConfig = mergeSystemPromptConfig(configFile.systemPrompt);
    const validation = validateSystemPromptConfig(mergedConfig);

    // Additional file-specific validations
    if (opts.checkFilePermissions) {
      // Check if file is readable/writable
      try {
        const stats = require('fs').statSync(filePath);
        if (!(stats.mode & parseInt('400', 8))) {
          validation.warnings.push('Configuration file is not readable');
        }
        if (!(stats.mode & parseInt('200', 8))) {
          validation.warnings.push('Configuration file is not writable');
        }
      } catch (error) {
        validation.warnings.push('Could not check file permissions');
      }
    }

    return {
      config: validation.isValid ? mergedConfig : null,
      validation,
      fileExists: true,
    };
  } catch (error) {
    return {
      config: null,
      validation: {
        isValid: false,
        errors: [`Failed to parse configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        recommendations: ['Check JSON syntax and file format'],
        validatedSections: [],
      },
      fileExists: true,
    };
  }
}

/**
 * Save configuration to file with backup
 */
export function saveSystemPromptConfigToFile(
  config: SystemPromptConfig,
  filePath: string,
  options: Partial<ConfigDeploymentOptions> = {}
): {
  success: boolean;
  backupPath?: string;
  errors: string[];
  warnings: string[];
} {
  const opts: ConfigDeploymentOptions = {
    environment: 'development',
    backupExisting: true,
    validateBeforeApply: true,
    rollbackOnFailure: true,
    ...options,
  };

  const errors: string[] = [];
  const warnings: string[] = [];
  let backupPath: string | undefined;

  try {
    // Validate configuration before saving
    if (opts.validateBeforeApply) {
      const validation = validateSystemPromptConfig(config);
      if (!validation.isValid) {
        errors.push(...validation.errors);
        return { success: false, errors, warnings };
      }
      warnings.push(...validation.warnings);
    }

    // Create backup if file exists
    if (opts.backupExisting && existsSync(filePath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = `${filePath}.backup.${timestamp}`;
      
      try {
        const existingContent = readFileSync(filePath, 'utf-8');
        writeFileSync(backupPath, existingContent, 'utf-8');
      } catch (backupError) {
        warnings.push(`Failed to create backup: ${backupError instanceof Error ? backupError.message : 'Unknown error'}`);
      }
    }

    // Create configuration file structure
    const configFile: SystemPromptConfigFile = {
      version: '2.0.0',
      systemPrompt: config,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: `System prompt configuration for ${opts.environment} environment`,
      },
    };

    // Write configuration file
    writeFileSync(filePath, JSON.stringify(configFile, null, 2), 'utf-8');

    return {
      success: true,
      backupPath,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Attempt rollback if enabled
    if (opts.rollbackOnFailure && backupPath && existsSync(backupPath)) {
      try {
        const backupContent = readFileSync(backupPath, 'utf-8');
        writeFileSync(filePath, backupContent, 'utf-8');
        warnings.push('Rolled back to previous configuration due to save failure');
      } catch (rollbackError) {
        errors.push(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : 'Unknown error'}`);
      }
    }

    return {
      success: false,
      backupPath,
      errors,
      warnings,
    };
  }
}

/**
 * Create default configuration file
 */
export function createSystemPromptConfigFile(
  filePath: string,
  environment: 'development' | 'staging' | 'production' = 'development'
): {
  success: boolean;
  errors: string[];
  warnings: string[];
} {
  // Customize default config based on environment
  let config = { ...DEFAULT_SYSTEM_PROMPT_CONFIG };
  
  switch (environment) {
    case 'development':
      config.completionCriteria.maxIterations = 20;
      config.performance.auditTimeoutMs = 60000;
      config.security.validateCommands = false;
      break;
    case 'staging':
      config.completionCriteria.maxIterations = 25;
      config.performance.auditTimeoutMs = 45000;
      break;
    case 'production':
      config.security.sanitizePII = true;
      config.security.validateCommands = true;
      config.security.respectPermissions = true;
      break;
  }

  return saveSystemPromptConfigToFile(config, filePath, {
    environment,
    backupExisting: false,
    validateBeforeApply: true,
    rollbackOnFailure: false,
  });
}

// ============================================================================
// Environment Variable Integration
// ============================================================================

/**
 * Parse boolean environment variable with validation
 */
function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Parse integer environment variable with bounds checking
 */
function parseEnvInteger(
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!value) return defaultValue;
  
  const parsed = parseInt(value.trim(), 10);
  if (isNaN(parsed)) return defaultValue;
  
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  
  return parsed;
}

/**
 * Parse float environment variable with bounds checking
 */
function parseEnvFloat(
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!value) return defaultValue;
  
  const parsed = parseFloat(value.trim());
  if (isNaN(parsed)) return defaultValue;
  
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  
  return parsed;
}

/**
 * Parse string environment variable with validation
 */
function parseEnvString<T extends string>(
  value: string | undefined,
  defaultValue: T,
  validValues?: T[]
): T {
  if (!value) return defaultValue;
  
  const trimmed = value.trim() as T;
  if (validValues && !validValues.includes(trimmed)) {
    return defaultValue;
  }
  
  return trimmed;
}

/**
 * Load configuration from environment variables with comprehensive parsing
 */
export function loadSystemPromptConfigFromEnv(): Partial<SystemPromptConfig> {
  const config: Partial<SystemPromptConfig> = {};
  
  // Load identity settings
  if (process.env.GAN_AUDITOR_IDENTITY_NAME) {
    config.identity = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.identity,
      ...config.identity, 
      name: process.env.GAN_AUDITOR_IDENTITY_NAME.trim()
    };
  }
  
  if (process.env.GAN_AUDITOR_IDENTITY_ROLE) {
    config.identity = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.identity,
      ...config.identity, 
      role: process.env.GAN_AUDITOR_IDENTITY_ROLE.trim()
    };
  }
  
  if (process.env.GAN_AUDITOR_STANCE) {
    config.identity = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.identity,
      ...config.identity, 
      stance: parseEnvString(
        process.env.GAN_AUDITOR_STANCE,
        DEFAULT_SYSTEM_PROMPT_CONFIG.identity.stance,
        ['adversarial', 'collaborative', 'constructive-adversarial']
      )
    };
  }
  
  if (process.env.GAN_AUDITOR_AUTHORITY) {
    config.identity = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.identity,
      ...config.identity, 
      authority: parseEnvString(
        process.env.GAN_AUDITOR_AUTHORITY,
        DEFAULT_SYSTEM_PROMPT_CONFIG.identity.authority,
        ['spec-and-steering-ground-truth', 'flexible', 'advisory']
      )
    };
  }
  
  // Load workflow settings
  if (process.env.GAN_AUDITOR_WORKFLOW_STEPS) {
    config.workflow = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.workflow,
      ...config.workflow, 
      steps: parseEnvInteger(process.env.GAN_AUDITOR_WORKFLOW_STEPS, 8, 1, 20)
    };
  }
  
  if (process.env.GAN_AUDITOR_ENFORCE_WORKFLOW_ORDER) {
    config.workflow = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.workflow,
      ...config.workflow, 
      enforceOrder: parseEnvBoolean(process.env.GAN_AUDITOR_ENFORCE_WORKFLOW_ORDER, true)
    };
  }
  
  if (process.env.GAN_AUDITOR_ALLOW_WORKFLOW_SKIPPING) {
    config.workflow = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.workflow,
      ...config.workflow, 
      allowSkipping: parseEnvBoolean(process.env.GAN_AUDITOR_ALLOW_WORKFLOW_SKIPPING, false)
    };
  }
  
  if (process.env.GAN_AUDITOR_EVIDENCE_REQUIRED) {
    config.workflow = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.workflow,
      ...config.workflow, 
      evidenceRequired: parseEnvBoolean(process.env.GAN_AUDITOR_EVIDENCE_REQUIRED, true)
    };
  }
  
  // Load quality framework settings
  if (process.env.GAN_AUDITOR_QUALITY_DIMENSIONS) {
    config.qualityFramework = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.qualityFramework,
      ...config.qualityFramework, 
      dimensions: parseEnvInteger(process.env.GAN_AUDITOR_QUALITY_DIMENSIONS, 6, 1, 10)
    };
  }
  
  if (process.env.GAN_AUDITOR_WEIGHTING_SCHEME) {
    config.qualityFramework = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.qualityFramework,
      ...config.qualityFramework, 
      weightingScheme: parseEnvString(
        process.env.GAN_AUDITOR_WEIGHTING_SCHEME,
        DEFAULT_SYSTEM_PROMPT_CONFIG.qualityFramework.weightingScheme,
        ['project-standard', 'custom', 'balanced']
      )
    };
  }
  
  if (process.env.GAN_AUDITOR_SCORING_SCALE) {
    config.qualityFramework = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.qualityFramework,
      ...config.qualityFramework, 
      scoringScale: parseEnvString(
        process.env.GAN_AUDITOR_SCORING_SCALE,
        DEFAULT_SYSTEM_PROMPT_CONFIG.qualityFramework.scoringScale,
        ['0-100', '0-10', 'letter-grade']
      )
    };
  }
  
  if (process.env.GAN_AUDITOR_AGGREGATION_METHOD) {
    config.qualityFramework = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.qualityFramework,
      ...config.qualityFramework, 
      aggregationMethod: parseEnvString(
        process.env.GAN_AUDITOR_AGGREGATION_METHOD,
        DEFAULT_SYSTEM_PROMPT_CONFIG.qualityFramework.aggregationMethod,
        ['weighted-average', 'minimum', 'geometric-mean']
      )
    };
  }
  
  // Load completion criteria
  if (process.env.GAN_AUDITOR_COMPLETION_TIERS) {
    config.completionCriteria = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.completionCriteria,
      ...config.completionCriteria, 
      tiers: parseEnvInteger(process.env.GAN_AUDITOR_COMPLETION_TIERS, 3, 1, 5)
    };
  }
  
  if (process.env.GAN_AUDITOR_KILL_SWITCHES) {
    config.completionCriteria = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.completionCriteria,
      ...config.completionCriteria, 
      killSwitches: parseEnvInteger(process.env.GAN_AUDITOR_KILL_SWITCHES, 3, 1, 10)
    };
  }
  
  if (process.env.GAN_AUDITOR_SHIP_GATES) {
    config.completionCriteria = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.completionCriteria,
      ...config.completionCriteria, 
      shipGates: parseEnvInteger(process.env.GAN_AUDITOR_SHIP_GATES, 5, 1, 20)
    };
  }
  
  if (process.env.GAN_AUDITOR_STAGNATION_THRESHOLD) {
    config.completionCriteria = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.completionCriteria,
      ...config.completionCriteria, 
      stagnationThreshold: parseEnvFloat(process.env.GAN_AUDITOR_STAGNATION_THRESHOLD, 0.95, 0, 1)
    };
  }
  
  if (process.env.GAN_AUDITOR_MAX_ITERATIONS) {
    config.completionCriteria = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.completionCriteria,
      ...config.completionCriteria, 
      maxIterations: parseEnvInteger(process.env.GAN_AUDITOR_MAX_ITERATIONS, 25, 1, 100)
    };
  }
  
  // Load integration settings
  if (process.env.GAN_AUDITOR_SESSION_MANAGEMENT) {
    config.integration = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.integration,
      ...config.integration, 
      sessionManagement: parseEnvBoolean(process.env.GAN_AUDITOR_SESSION_MANAGEMENT, true)
    };
  }
  
  if (process.env.GAN_AUDITOR_CODEX_INTEGRATION) {
    config.integration = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.integration,
      ...config.integration, 
      codexIntegration: parseEnvBoolean(process.env.GAN_AUDITOR_CODEX_INTEGRATION, true)
    };
  }
  
  if (process.env.GAN_AUDITOR_CONTEXT_AWARENESS) {
    config.integration = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.integration,
      ...config.integration, 
      contextAwareness: parseEnvBoolean(process.env.GAN_AUDITOR_CONTEXT_AWARENESS, true)
    };
  }
  
  if (process.env.GAN_AUDITOR_PERFORMANCE_OPTIMIZATION) {
    config.integration = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.integration,
      ...config.integration, 
      performanceOptimization: parseEnvBoolean(process.env.GAN_AUDITOR_PERFORMANCE_OPTIMIZATION, true)
    };
  }
  
  // Load security settings
  if (process.env.GAN_AUDITOR_SANITIZE_PII) {
    config.security = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.security,
      ...config.security, 
      sanitizePII: parseEnvBoolean(process.env.GAN_AUDITOR_SANITIZE_PII, true)
    };
  }
  
  if (process.env.GAN_AUDITOR_VALIDATE_COMMANDS) {
    config.security = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.security,
      ...config.security, 
      validateCommands: parseEnvBoolean(process.env.GAN_AUDITOR_VALIDATE_COMMANDS, true)
    };
  }
  
  if (process.env.GAN_AUDITOR_RESPECT_PERMISSIONS) {
    config.security = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.security,
      ...config.security, 
      respectPermissions: parseEnvBoolean(process.env.GAN_AUDITOR_RESPECT_PERMISSIONS, true)
    };
  }
  
  if (process.env.GAN_AUDITOR_FLAG_VULNERABILITIES) {
    config.security = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.security,
      ...config.security, 
      flagVulnerabilities: parseEnvBoolean(process.env.GAN_AUDITOR_FLAG_VULNERABILITIES, true)
    };
  }
  
  // Load performance settings
  if (process.env.GAN_AUDITOR_CONTEXT_TOKEN_LIMIT) {
    config.performance = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.performance,
      ...config.performance, 
      contextTokenLimit: parseEnvInteger(process.env.GAN_AUDITOR_CONTEXT_TOKEN_LIMIT, 200000, 1000, 1000000)
    };
  }
  
  if (process.env.GAN_AUDITOR_AUDIT_TIMEOUT_MS) {
    config.performance = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.performance,
      ...config.performance, 
      auditTimeoutMs: parseEnvInteger(process.env.GAN_AUDITOR_AUDIT_TIMEOUT_MS, 30000, 5000, 300000)
    };
  }
  
  if (process.env.GAN_AUDITOR_ENABLE_CACHING) {
    config.performance = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.performance,
      ...config.performance, 
      enableCaching: parseEnvBoolean(process.env.GAN_AUDITOR_ENABLE_CACHING, true)
    };
  }
  
  if (process.env.GAN_AUDITOR_ENABLE_PROGRESS_TRACKING) {
    config.performance = { 
      ...DEFAULT_SYSTEM_PROMPT_CONFIG.performance,
      ...config.performance, 
      enableProgressTracking: parseEnvBoolean(process.env.GAN_AUDITOR_ENABLE_PROGRESS_TRACKING, true)
    };
  }
  
  return config;
}

// ============================================================================
// Configuration Resolution and Merging
// ============================================================================

/**
 * Load configuration from multiple sources with precedence
 * Precedence: Environment Variables > Config File > Defaults
 */
export function loadSystemPromptConfig(
  configFilePath?: string,
  options: Partial<ConfigValidationOptions> = {}
): {
  config: SystemPromptConfig;
  validation: SystemPromptConfigValidation;
  sources: {
    defaults: boolean;
    configFile: boolean;
    environment: boolean;
  };
} {
  const sources = {
    defaults: true,
    configFile: false,
    environment: false,
  };

  // Start with defaults
  let config = { ...DEFAULT_SYSTEM_PROMPT_CONFIG };
  let validation: SystemPromptConfigValidation = {
    isValid: true,
    errors: [],
    warnings: [],
    recommendations: [],
    validatedSections: ['defaults'],
  };

  // Load from config file if provided
  if (configFilePath) {
    const fileResult = loadSystemPromptConfigFromFile(configFilePath, options);
    if (fileResult.config) {
      config = mergeSystemPromptConfig(fileResult.config);
      sources.configFile = true;
      validation.validatedSections.push('configFile');
      
      // Merge validation results
      validation.errors.push(...fileResult.validation.errors);
      validation.warnings.push(...fileResult.validation.warnings);
      validation.recommendations.push(...fileResult.validation.recommendations);
    } else if (fileResult.fileExists) {
      validation.errors.push(...fileResult.validation.errors);
      validation.warnings.push(...fileResult.validation.warnings);
    }
  }

  // Load from environment variables (highest precedence)
  const envConfig = loadSystemPromptConfigFromEnv();
  if (Object.keys(envConfig).length > 0) {
    config = mergeSystemPromptConfig(envConfig);
    sources.environment = true;
    validation.validatedSections.push('environment');
  }

  // Final validation
  const finalValidation = validateSystemPromptConfig(config);
  validation.isValid = finalValidation.isValid && validation.errors.length === 0;
  validation.errors.push(...finalValidation.errors);
  validation.warnings.push(...finalValidation.warnings);
  validation.recommendations.push(...finalValidation.recommendations);

  return {
    config,
    validation,
    sources,
  };
}

// ============================================================================
// Configuration Utilities
// ============================================================================

/**
 * Get configuration summary for debugging and monitoring
 */
export function getSystemPromptConfigSummary(config: SystemPromptConfig): {
  identity: string;
  workflow: string;
  qualityFramework: string;
  completionCriteria: string;
  integration: string[];
  security: string[];
  performance: string;
} {
  return {
    identity: `${config.identity.name} (${config.identity.role}, ${config.identity.stance})`,
    workflow: `${config.workflow.steps} steps, order=${config.workflow.enforceOrder}, evidence=${config.workflow.evidenceRequired}`,
    qualityFramework: `${config.qualityFramework.dimensions} dimensions, ${config.qualityFramework.weightingScheme} weighting, ${config.qualityFramework.scoringScale} scale`,
    completionCriteria: `${config.completionCriteria.tiers} tiers, ${config.completionCriteria.maxIterations} max iterations, ${config.completionCriteria.stagnationThreshold} stagnation threshold`,
    integration: [
      config.integration.sessionManagement ? 'session-mgmt' : null,
      config.integration.codexIntegration ? 'codex' : null,
      config.integration.contextAwareness ? 'context' : null,
      config.integration.performanceOptimization ? 'perf-opt' : null,
    ].filter(Boolean) as string[],
    security: [
      config.security.sanitizePII ? 'pii-sanitization' : null,
      config.security.validateCommands ? 'cmd-validation' : null,
      config.security.respectPermissions ? 'permissions' : null,
      config.security.flagVulnerabilities ? 'vuln-detection' : null,
    ].filter(Boolean) as string[],
    performance: `${config.performance.contextTokenLimit} tokens, ${config.performance.auditTimeoutMs}ms timeout, caching=${config.performance.enableCaching}`,
  };
}

/**
 * Generate environment variable documentation
 */
export function generateEnvVarDocumentation(): string {
  const sections = [
    {
      title: 'System Prompt Core Settings',
      vars: [
        { name: 'GAN_AUDITOR_PROMPT_ENABLED', description: 'Enable system prompt functionality', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_PROMPT_VERSION', description: 'System prompt version', type: 'string', default: '2.0.0' },
        { name: 'GAN_AUDITOR_PROMPT_CONFIG_FILE', description: 'Path to configuration file', type: 'string', default: 'none' },
      ],
    },
    {
      title: 'Identity Configuration',
      vars: [
        { name: 'GAN_AUDITOR_IDENTITY_NAME', description: 'Auditor identity name', type: 'string', default: 'Kilo Code' },
        { name: 'GAN_AUDITOR_IDENTITY_ROLE', description: 'Auditor role description', type: 'string', default: 'Adversarial Auditor' },
        { name: 'GAN_AUDITOR_STANCE', description: 'Auditor stance', type: 'enum', default: 'constructive-adversarial', options: ['adversarial', 'collaborative', 'constructive-adversarial'] },
        { name: 'GAN_AUDITOR_AUTHORITY', description: 'Authority level', type: 'enum', default: 'spec-and-steering-ground-truth', options: ['spec-and-steering-ground-truth', 'flexible', 'advisory'] },
      ],
    },
    {
      title: 'Workflow Configuration',
      vars: [
        { name: 'GAN_AUDITOR_WORKFLOW_STEPS', description: 'Number of workflow steps', type: 'integer', default: '8', range: '1-20' },
        { name: 'GAN_AUDITOR_ENFORCE_WORKFLOW_ORDER', description: 'Enforce step order', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_ALLOW_WORKFLOW_SKIPPING', description: 'Allow step skipping', type: 'boolean', default: 'false' },
        { name: 'GAN_AUDITOR_EVIDENCE_REQUIRED', description: 'Require evidence for decisions', type: 'boolean', default: 'true' },
      ],
    },
    {
      title: 'Quality Framework Configuration',
      vars: [
        { name: 'GAN_AUDITOR_QUALITY_DIMENSIONS', description: 'Number of quality dimensions', type: 'integer', default: '6', range: '1-10' },
        { name: 'GAN_AUDITOR_WEIGHTING_SCHEME', description: 'Dimension weighting scheme', type: 'enum', default: 'project-standard', options: ['project-standard', 'custom', 'balanced'] },
        { name: 'GAN_AUDITOR_SCORING_SCALE', description: 'Scoring scale', type: 'enum', default: '0-100', options: ['0-100', '0-10', 'letter-grade'] },
        { name: 'GAN_AUDITOR_AGGREGATION_METHOD', description: 'Score aggregation method', type: 'enum', default: 'weighted-average', options: ['weighted-average', 'minimum', 'geometric-mean'] },
      ],
    },
    {
      title: 'Completion Criteria Configuration',
      vars: [
        { name: 'GAN_AUDITOR_COMPLETION_TIERS', description: 'Number of completion tiers', type: 'integer', default: '3', range: '1-5' },
        { name: 'GAN_AUDITOR_KILL_SWITCHES', description: 'Number of kill switches', type: 'integer', default: '3', range: '1-10' },
        { name: 'GAN_AUDITOR_SHIP_GATES', description: 'Number of ship gates', type: 'integer', default: '5', range: '1-20' },
        { name: 'GAN_AUDITOR_STAGNATION_THRESHOLD', description: 'Stagnation detection threshold', type: 'float', default: '0.95', range: '0.0-1.0' },
        { name: 'GAN_AUDITOR_MAX_ITERATIONS', description: 'Maximum audit iterations', type: 'integer', default: '25', range: '1-100' },
      ],
    },
    {
      title: 'Integration Configuration',
      vars: [
        { name: 'GAN_AUDITOR_SESSION_MANAGEMENT', description: 'Enable session management', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_CODEX_INTEGRATION', description: 'Enable Codex integration', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_CONTEXT_AWARENESS', description: 'Enable context awareness', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_PERFORMANCE_OPTIMIZATION', description: 'Enable performance optimization', type: 'boolean', default: 'true' },
      ],
    },
    {
      title: 'Security Configuration',
      vars: [
        { name: 'GAN_AUDITOR_SANITIZE_PII', description: 'Enable PII sanitization', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_VALIDATE_COMMANDS', description: 'Enable command validation', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_RESPECT_PERMISSIONS', description: 'Respect file permissions', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_FLAG_VULNERABILITIES', description: 'Flag security vulnerabilities', type: 'boolean', default: 'true' },
      ],
    },
    {
      title: 'Performance Configuration',
      vars: [
        { name: 'GAN_AUDITOR_CONTEXT_TOKEN_LIMIT', description: 'Context token limit', type: 'integer', default: '200000', range: '1000-1000000' },
        { name: 'GAN_AUDITOR_AUDIT_TIMEOUT_MS', description: 'Audit timeout in milliseconds', type: 'integer', default: '30000', range: '5000-300000' },
        { name: 'GAN_AUDITOR_ENABLE_CACHING', description: 'Enable result caching', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_ENABLE_PROGRESS_TRACKING', description: 'Enable progress tracking', type: 'boolean', default: 'true' },
      ],
    },
  ];

  let doc = '# System Prompt Environment Variables\n\n';
  doc += 'This document describes all environment variables available for configuring the GAN Auditor system prompt.\n\n';

  for (const section of sections) {
    doc += `## ${section.title}\n\n`;
    doc += '| Variable | Description | Type | Default | Options/Range |\n';
    doc += '|----------|-------------|------|---------|---------------|\n';
    
    for (const variable of section.vars) {
      const options = ('options' in variable && variable.options) ? variable.options.join(', ') : (('range' in variable && variable.range) || 'N/A');
      doc += `| \`${variable.name}\` | ${variable.description} | ${variable.type} | \`${variable.default}\` | ${options} |\n`;
    }
    
    doc += '\n';
  }

  return doc;
}