/**
 * System Prompt Utilities for GansAuditor_Codex
 * 
 * This module provides utility functions for setting up and validating
 * the system prompt integration with GansAuditor_Codex.
 */

import { join, dirname } from 'path';
import { readFileSync, accessSync, constants } from 'fs';
import { fileURLToPath } from 'url';
import { GanAuditor } from '../auditor/gan-auditor.js';
import { PromptDrivenGanAuditor, type PromptDrivenAuditConfig } from './prompt-integration.js';
import { SystemPromptManager, type SystemPromptManagerConfig } from './system-prompt-manager.js';
import { 
  type SystemPromptConfig,
  loadSystemPromptConfigFromEnv,
  validateSystemPromptConfig,
  mergeSystemPromptConfig,
} from './system-prompt-config.js';
import { logger, createComponentLogger } from '../utils/logger.js';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Setup validation result
 */
export interface SystemPromptSetupValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Create fully integrated GAN auditor with system prompt capabilities
 */
export function createFullyIntegratedGanAuditor(
  config?: {
    ganAuditorConfig?: any;
    systemPromptConfig?: Partial<SystemPromptConfig>;
    promptDrivenConfig?: PromptDrivenAuditConfig;
  }
): PromptDrivenGanAuditor {
  const componentLogger = createComponentLogger('prompt-utils', {
    enabled: true,
    level: 'info',
  });

  try {
    // Create base GAN auditor
    const baseAuditor = new GanAuditor(config?.ganAuditorConfig);
    
    // Load system prompt configuration from environment
    const envConfig = loadSystemPromptConfigFromEnv();
    const mergedSystemPromptConfig = mergeSystemPromptConfig({
      ...envConfig,
      ...config?.systemPromptConfig,
    });
    
    // Validate configuration
    const validation = validateSystemPromptConfig(mergedSystemPromptConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid system prompt configuration: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      componentLogger.warn('System prompt configuration warnings', {
        warnings: validation.warnings,
      });
    }
    
    // Create prompt-driven auditor
    const promptDrivenConfig: PromptDrivenAuditConfig = {
      enableSystemPrompt: true,
      promptManagerConfig: {
        promptTemplatePath: undefined,
        enableCaching: true,
        cacheMaxAge: 300000,
      },
      integrationConfig: {
        enhanceCodexRequests: true,
        processResponses: true,
        manageCompletion: true,
        trackProgress: true,
      },
      ...config?.promptDrivenConfig,
    };
    
    const promptDrivenAuditor = new PromptDrivenGanAuditor(baseAuditor, promptDrivenConfig);
    
    componentLogger.info('Fully integrated GAN auditor created successfully', {
      systemPromptEnabled: promptDrivenConfig.enableSystemPrompt,
      configurationValid: validation.isValid,
      warningsCount: validation.warnings.length,
    });
    
    return promptDrivenAuditor;
    
  } catch (error) {
    componentLogger.error('Failed to create fully integrated GAN auditor', error as Error);
    throw error;
  }
}

/**
 * Create system prompt from template with custom variables
 */
export async function createSystemPromptFromTemplate(
  templatePath?: string,
  variables?: Record<string, any>
): Promise<string> {
  const manager = new SystemPromptManager({
    promptTemplatePath: templatePath,
    enableCaching: false,
  });
  
  // Create mock thought data for template rendering
  const mockThought = {
    thought: 'Template rendering test',
    thoughtNumber: 1,
    totalThoughts: 1,
    nextThoughtNeeded: false,
  };
  
  const rendered = await manager.renderSystemPrompt(mockThought, undefined, {
    repository: variables?.repository || 'Mock repository context',
    steering: variables?.steering || 'Mock steering rules',
    spec: variables?.spec || 'Mock specification',
  });
  
  return rendered.content;
}

/**
 * Validate system prompt setup and configuration
 */
export function validateSystemPromptSetup(
  config?: {
    systemPromptConfig?: Partial<SystemPromptConfig>;
    promptManagerConfig?: SystemPromptManagerConfig;
    integrationConfig?: PromptDrivenAuditConfig;
  }
): SystemPromptSetupValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Validate system prompt configuration
  if (config?.systemPromptConfig) {
    const configValidation = validateSystemPromptConfig(config.systemPromptConfig);
    errors.push(...configValidation.errors);
    warnings.push(...configValidation.warnings);
  }
  
  // Validate environment variables
  const requiredEnvVars = [
    'GAN_AUDITOR_ENABLE_SYSTEM_PROMPT',
    'GAN_AUDITOR_CONTEXT_TOKEN_LIMIT',
    'GAN_AUDITOR_AUDIT_TIMEOUT_MS',
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(`Environment variable ${envVar} is not set`);
    }
  }
  
  // Check for optimal configuration
  if (config?.integrationConfig?.enableSystemPrompt === false) {
    warnings.push('System prompt is disabled - advanced audit features will not be available');
  }
  
  if (config?.promptManagerConfig?.enableCaching === false) {
    recommendations.push('Consider enabling prompt caching for better performance');
  }
  
  // Validate prompt template accessibility
  try {
    const templatePath = config?.promptManagerConfig?.promptTemplatePath || 
      join(__dirname, 'gan-auditor-system-prompt.md');
    
    accessSync(templatePath, constants.R_OK);
  } catch (error) {
    errors.push('System prompt template file is not accessible');
  }
  
  // Performance recommendations
  const contextTokenLimit = config?.systemPromptConfig?.performance?.contextTokenLimit;
  if (contextTokenLimit && contextTokenLimit > 500000) {
    recommendations.push('Consider reducing context token limit for better performance');
  }
  
  const auditTimeout = config?.systemPromptConfig?.performance?.auditTimeoutMs;
  if (auditTimeout && auditTimeout > 60000) {
    recommendations.push('Consider reducing audit timeout for better responsiveness');
  }
  
  // Integration recommendations
  if (config?.integrationConfig?.integrationConfig?.enhanceCodexRequests === false) {
    recommendations.push('Enable enhanced Codex requests for better audit quality');
  }
  
  if (config?.integrationConfig?.integrationConfig?.processResponses === false) {
    recommendations.push('Enable response processing for intelligent completion management');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations,
  };
}

/**
 * Get system prompt configuration from environment with validation
 */
export function getValidatedSystemPromptConfig(): {
  config: SystemPromptConfig;
  validation: SystemPromptSetupValidation;
} {
  const envConfig = loadSystemPromptConfigFromEnv();
  const mergedConfig = mergeSystemPromptConfig(envConfig);
  const validation = validateSystemPromptSetup({ systemPromptConfig: mergedConfig });
  
  return {
    config: mergedConfig,
    validation,
  };
}

/**
 * Create development-friendly system prompt configuration
 */
export function createDevelopmentSystemPromptConfig(): SystemPromptConfig {
  return mergeSystemPromptConfig({
    identity: {
      name: 'Kilo Code (Dev)',
      role: 'Development Auditor',
      stance: 'constructive-adversarial',
      authority: 'flexible',
    },
    completionCriteria: {
      tiers: 3,
      killSwitches: 3,
      shipGates: 5,
      maxIterations: 10, // Reduced for faster development cycles
      stagnationThreshold: 0.90, // More lenient for development
    },
    performance: {
      auditTimeoutMs: 15000, // Shorter timeout for development
      contextTokenLimit: 100000, // Smaller context for faster processing
      enableCaching: true,
      enableProgressTracking: true,
    },
    security: {
      sanitizePII: true,
      validateCommands: false, // Disabled for development flexibility
      respectPermissions: false, // Disabled for development flexibility
      flagVulnerabilities: true,
    },
  });
}

/**
 * Create production-ready system prompt configuration
 */
export function createProductionSystemPromptConfig(): SystemPromptConfig {
  return mergeSystemPromptConfig({
    identity: {
      name: 'Kilo Code',
      role: 'Adversarial Auditor',
      stance: 'constructive-adversarial',
      authority: 'spec-and-steering-ground-truth',
    },
    completionCriteria: {
      tiers: 3,
      killSwitches: 3,
      shipGates: 5,
      maxIterations: 25,
      stagnationThreshold: 0.95,
    },
    performance: {
      auditTimeoutMs: 30000,
      contextTokenLimit: 200000,
      enableCaching: true,
      enableProgressTracking: true,
    },
    security: {
      sanitizePII: true,
      validateCommands: true,
      respectPermissions: true,
      flagVulnerabilities: true,
    },
  });
}

/**
 * Validate system prompt template file
 */
export async function validateSystemPromptTemplate(
  templatePath?: string
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  templateInfo: {
    path: string;
    size: number;
    sectionsFound: number;
    variablesFound: number;
  };
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const actualPath = templatePath || join(__dirname, 'gan-auditor-system-prompt.md');
  
  try {
    const template = readFileSync(actualPath, 'utf-8');
    
    const requiredSections = [
      '# GansAuditor_Codex System Prompt',
      '## Identity & Role Definition',
      '## Audit Workflow',
      '## Multi-Dimensional Quality Assessment',
      '## Intelligent Completion Criteria',
      '## Structured Output Format',
    ];
    
    const requiredVariables = [
      'IDENTITY_NAME',
      'IDENTITY_ROLE',
      'IDENTITY_STANCE',
      'MODEL_CONTEXT_TOKENS',
      'CURRENT_LOOP',
      'MAX_ITERATIONS',
    ];
    
    // Check sections
    const missingSections = requiredSections.filter(section => !template.includes(section));
    if (missingSections.length > 0) {
      errors.push(`Missing required sections: ${missingSections.join(', ')}`);
    }
    
    // Check variables
    const missingVariables = requiredVariables.filter(variable => 
      !template.includes(`\${${variable}}`) && !template.includes(`\${${variable} |`)
    );
    if (missingVariables.length > 0) {
      warnings.push(`Missing recommended variables: ${missingVariables.join(', ')}`);
    }
    
    // Count variables
    const variableMatches = template.match(/\${[^}]+}/g);
    const variablesFound = variableMatches ? variableMatches.length : 0;
    
    // Check template size
    if (template.length < 5000) {
      warnings.push('Template seems short - may be missing content');
    }
    
    if (template.length > 100000) {
      warnings.push('Template is very large - may impact performance');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      templateInfo: {
        path: actualPath,
        size: template.length,
        sectionsFound: requiredSections.length - missingSections.length,
        variablesFound,
      },
    };
    
  } catch (error) {
    errors.push(`Failed to read template file: ${(error as Error).message}`);
    
    return {
      isValid: false,
      errors,
      warnings,
      templateInfo: {
        path: actualPath,
        size: 0,
        sectionsFound: 0,
        variablesFound: 0,
      },
    };
  }
}

/**
 * Log system prompt setup information
 */
export function logSystemPromptSetup(
  config: SystemPromptConfig,
  validation: SystemPromptSetupValidation
): void {
  const componentLogger = createComponentLogger('prompt-setup', {
    enabled: true,
    level: 'info',
  });
  
  componentLogger.info('System Prompt Setup Summary', {
    identity: config.identity.name,
    stance: config.identity.stance,
    maxIterations: config.completionCriteria.maxIterations,
    stagnationThreshold: config.completionCriteria.stagnationThreshold,
    auditTimeout: config.performance.auditTimeoutMs,
    contextTokenLimit: config.performance.contextTokenLimit,
    isValid: validation.isValid,
    errorsCount: validation.errors.length,
    warningsCount: validation.warnings.length,
    recommendationsCount: validation.recommendations.length,
  });
  
  if (validation.errors.length > 0) {
    componentLogger.error('System prompt setup errors', undefined, {
      errors: validation.errors,
    });
  }
  
  if (validation.warnings.length > 0) {
    componentLogger.warn('System prompt setup warnings', {
      warnings: validation.warnings,
    });
  }
  
  if (validation.recommendations.length > 0) {
    componentLogger.info('System prompt setup recommendations', {
      recommendations: validation.recommendations,
    });
  }
}