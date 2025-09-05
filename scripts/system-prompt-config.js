#!/usr/bin/env node

/**
 * System Prompt Configuration Management CLI
 * 
 * This script provides command-line tools for managing system prompt configuration,
 * including validation, creation, and deployment support.
 * 
 * Requirements: 11.1 - Configuration management CLI tools
 */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

// Import configuration functions (would be from compiled JS in real usage)
// For now, we'll implement basic functionality directly

/**
 * Display help information
 */
function showHelp() {
  console.log(`
System Prompt Configuration Management CLI

Usage: node scripts/system-prompt-config.js <command> [options]

Commands:
  validate [file]           Validate configuration file or environment variables
  create <file> [env]       Create new configuration file for environment
  migrate <from> <to>       Migrate configuration between versions
  env-vars                  List all environment variables with documentation
  report [file]             Generate comprehensive validation report
  deploy <file> <env>       Deploy configuration to environment
  backup <file>             Create backup of configuration file
  restore <backup>          Restore configuration from backup

Options:
  --strict                  Use strict validation mode
  --environment <env>       Target environment (development|staging|production)
  --output <file>           Output file for reports
  --format <format>         Output format (json|markdown|text)
  --help, -h                Show this help message

Examples:
  node scripts/system-prompt-config.js validate
  node scripts/system-prompt-config.js create config/system-prompt.json production
  node scripts/system-prompt-config.js report --output validation-report.md
  node scripts/system-prompt-config.js env-vars --format markdown
`);
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const parsed = {
    command: null,
    file: null,
    environment: 'development',
    strict: false,
    output: null,
    format: 'text',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--strict') {
      parsed.strict = true;
    } else if (arg === '--environment') {
      parsed.environment = args[++i];
    } else if (arg === '--output') {
      parsed.output = args[++i];
    } else if (arg === '--format') {
      parsed.format = args[++i];
    } else if (!parsed.command) {
      parsed.command = arg;
    } else if (!parsed.file) {
      parsed.file = arg;
    }
  }

  return parsed;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables() {
  console.log('🔍 Validating environment variables...\n');

  const envVars = {
    // Core settings
    'GAN_AUDITOR_PROMPT_ENABLED': { type: 'boolean', required: true },
    'GAN_AUDITOR_PROMPT_VERSION': { type: 'string', required: false },
    
    // Identity
    'GAN_AUDITOR_IDENTITY_NAME': { type: 'string', required: false },
    'GAN_AUDITOR_IDENTITY_ROLE': { type: 'string', required: false },
    'GAN_AUDITOR_STANCE': { 
      type: 'enum', 
      required: false,
      values: ['adversarial', 'collaborative', 'constructive-adversarial']
    },
    'GAN_AUDITOR_AUTHORITY': { 
      type: 'enum', 
      required: false,
      values: ['spec-and-steering-ground-truth', 'flexible', 'advisory']
    },
    
    // Security (critical)
    'GAN_AUDITOR_SANITIZE_PII': { type: 'boolean', required: true },
    'GAN_AUDITOR_VALIDATE_COMMANDS': { type: 'boolean', required: true },
    'GAN_AUDITOR_RESPECT_PERMISSIONS': { type: 'boolean', required: false },
    'GAN_AUDITOR_FLAG_VULNERABILITIES': { type: 'boolean', required: false },
    
    // Performance
    'GAN_AUDITOR_CONTEXT_TOKEN_LIMIT': { 
      type: 'integer', 
      required: false,
      min: 1000,
      max: 1000000
    },
    'GAN_AUDITOR_AUDIT_TIMEOUT_MS': { 
      type: 'integer', 
      required: false,
      min: 5000,
      max: 300000
    },
  };

  let valid = 0;
  let invalid = 0;
  let missing = 0;
  const errors = [];
  const warnings = [];

  for (const [name, config] of Object.entries(envVars)) {
    const value = process.env[name];
    
    if (value === undefined) {
      if (config.required) {
        missing++;
        errors.push(`❌ ${name}: Required environment variable is missing`);
      } else {
        console.log(`⚪ ${name}: Not set (using default)`);
      }
      continue;
    }

    // Validate based on type
    let isValid = true;
    let issue = '';

    if (config.type === 'boolean') {
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];
      if (!validBooleans.includes(value.toLowerCase())) {
        isValid = false;
        issue = 'Invalid boolean value';
      }
    } else if (config.type === 'integer') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        isValid = false;
        issue = 'Invalid integer value';
      } else if (config.min && parsed < config.min) {
        isValid = false;
        issue = `Value ${parsed} below minimum ${config.min}`;
      } else if (config.max && parsed > config.max) {
        isValid = false;
        issue = `Value ${parsed} above maximum ${config.max}`;
      }
    } else if (config.type === 'enum') {
      if (!config.values.includes(value)) {
        isValid = false;
        issue = `Invalid value. Must be one of: ${config.values.join(', ')}`;
      }
    } else if (config.type === 'string') {
      if (value.trim().length === 0) {
        isValid = false;
        issue = 'Empty string value';
      }
    }

    if (isValid) {
      valid++;
      console.log(`✅ ${name}: ${value}`);
    } else {
      invalid++;
      errors.push(`❌ ${name}: ${issue} (current: "${value}")`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Valid: ${valid}`);
  console.log(`   Invalid: ${invalid}`);
  console.log(`   Missing: ${missing}`);
  console.log(`   Total: ${Object.keys(envVars).length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach(error => console.log(`   ${error}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    warnings.forEach(warning => console.log(`   ${warning}`));
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate configuration file
 */
function validateConfigurationFile(filePath) {
  console.log(`🔍 Validating configuration file: ${filePath}\n`);

  if (!existsSync(filePath)) {
    console.log(`❌ Configuration file does not exist: ${filePath}`);
    console.log(`💡 Create it with: node scripts/system-prompt-config.js create ${filePath}`);
    return { valid: false, errors: ['File not found'] };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content);

    console.log(`✅ File exists and is valid JSON`);
    console.log(`📄 File size: ${content.length} bytes`);

    // Basic structure validation
    const errors = [];
    const warnings = [];

    if (!config.systemPrompt) {
      errors.push('Missing systemPrompt section');
    } else {
      console.log(`✅ systemPrompt section found`);
      
      // Validate required sections
      const requiredSections = ['identity', 'workflow', 'qualityFramework', 'completionCriteria'];
      for (const section of requiredSections) {
        if (!config.systemPrompt[section]) {
          errors.push(`Missing systemPrompt.${section} section`);
        } else {
          console.log(`✅ systemPrompt.${section} section found`);
        }
      }
    }

    if (!config.version) {
      warnings.push('Missing version field');
    } else {
      console.log(`✅ Version: ${config.version}`);
    }

    if (!config.metadata) {
      warnings.push('Missing metadata section');
    } else {
      console.log(`✅ Metadata section found`);
      if (config.metadata.createdAt) {
        console.log(`📅 Created: ${config.metadata.createdAt}`);
      }
      if (config.metadata.updatedAt) {
        console.log(`📅 Updated: ${config.metadata.updatedAt}`);
      }
    }

    console.log(`\n📊 Validation Summary:`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log(`\n❌ Errors:`);
      errors.forEach(error => console.log(`   ${error}`));
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      warnings.forEach(warning => console.log(`   ${warning}`));
    }

    return { valid: errors.length === 0, errors, warnings };

  } catch (error) {
    console.log(`❌ Failed to parse configuration file: ${error.message}`);
    return { valid: false, errors: [error.message] };
  }
}

/**
 * Create configuration file
 */
function createConfigurationFile(filePath, environment = 'development') {
  console.log(`🔧 Creating configuration file: ${filePath}`);
  console.log(`🌍 Environment: ${environment}\n`);

  // Default configuration based on environment
  const baseConfig = {
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

  // Environment-specific adjustments
  if (environment === 'development') {
    baseConfig.identity.name = 'Kilo Code Dev';
    baseConfig.workflow.enforceOrder = false;
    baseConfig.workflow.allowSkipping = true;
    baseConfig.security.validateCommands = false;
    baseConfig.security.respectPermissions = false;
    baseConfig.performance.contextTokenLimit = 300000;
    baseConfig.performance.auditTimeoutMs = 60000;
  } else if (environment === 'production') {
    baseConfig.completionCriteria.maxIterations = 25;
    baseConfig.security.sanitizePII = true;
    baseConfig.security.validateCommands = true;
    baseConfig.security.respectPermissions = true;
    baseConfig.performance.auditTimeoutMs = 30000;
  }

  const configFile = {
    version: '2.0.0',
    systemPrompt: baseConfig,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: `System prompt configuration for ${environment} environment`,
      environment,
    },
  };

  try {
    // Create backup if file exists
    if (existsSync(filePath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.backup.${timestamp}`;
      const existingContent = readFileSync(filePath, 'utf-8');
      writeFileSync(backupPath, existingContent, 'utf-8');
      console.log(`📦 Created backup: ${backupPath}`);
    }

    writeFileSync(filePath, JSON.stringify(configFile, null, 2), 'utf-8');
    console.log(`✅ Configuration file created successfully`);
    console.log(`📄 File: ${filePath}`);
    console.log(`🌍 Environment: ${environment}`);
    console.log(`📊 Size: ${JSON.stringify(configFile, null, 2).length} bytes`);

    return { success: true };
  } catch (error) {
    console.log(`❌ Failed to create configuration file: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Generate environment variables documentation
 */
function generateEnvVarsDocumentation(format = 'text') {
  const envVars = [
    {
      category: 'Core Settings',
      vars: [
        { name: 'GAN_AUDITOR_PROMPT_ENABLED', description: 'Enable system prompt functionality', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_PROMPT_VERSION', description: 'System prompt version', type: 'string', default: '2.0.0' },
        { name: 'GAN_AUDITOR_PROMPT_CONFIG_FILE', description: 'Path to configuration file', type: 'string', default: 'none' },
      ],
    },
    {
      category: 'Identity Configuration',
      vars: [
        { name: 'GAN_AUDITOR_IDENTITY_NAME', description: 'Auditor identity name', type: 'string', default: 'Kilo Code' },
        { name: 'GAN_AUDITOR_IDENTITY_ROLE', description: 'Auditor role description', type: 'string', default: 'Adversarial Auditor' },
        { name: 'GAN_AUDITOR_STANCE', description: 'Auditor stance (adversarial|collaborative|constructive-adversarial)', type: 'enum', default: 'constructive-adversarial' },
        { name: 'GAN_AUDITOR_AUTHORITY', description: 'Authority level (spec-and-steering-ground-truth|flexible|advisory)', type: 'enum', default: 'spec-and-steering-ground-truth' },
      ],
    },
    {
      category: 'Security Configuration',
      vars: [
        { name: 'GAN_AUDITOR_SANITIZE_PII', description: 'Enable PII sanitization', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_VALIDATE_COMMANDS', description: 'Enable command validation', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_RESPECT_PERMISSIONS', description: 'Respect file permissions', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_FLAG_VULNERABILITIES', description: 'Flag security vulnerabilities', type: 'boolean', default: 'true' },
      ],
    },
    {
      category: 'Performance Configuration',
      vars: [
        { name: 'GAN_AUDITOR_CONTEXT_TOKEN_LIMIT', description: 'Context token limit (1000-1000000)', type: 'integer', default: '200000' },
        { name: 'GAN_AUDITOR_AUDIT_TIMEOUT_MS', description: 'Audit timeout in milliseconds (5000-300000)', type: 'integer', default: '30000' },
        { name: 'GAN_AUDITOR_ENABLE_CACHING', description: 'Enable result caching', type: 'boolean', default: 'true' },
        { name: 'GAN_AUDITOR_ENABLE_PROGRESS_TRACKING', description: 'Enable progress tracking', type: 'boolean', default: 'true' },
      ],
    },
  ];

  if (format === 'markdown') {
    let doc = '# System Prompt Environment Variables\n\n';
    doc += 'This document describes all environment variables available for configuring the GAN Auditor system prompt.\n\n';

    for (const category of envVars) {
      doc += `## ${category.category}\n\n`;
      doc += '| Variable | Description | Type | Default |\n';
      doc += '|----------|-------------|------|---------|\n';
      
      for (const variable of category.vars) {
        doc += `| \`${variable.name}\` | ${variable.description} | ${variable.type} | \`${variable.default}\` |\n`;
      }
      
      doc += '\n';
    }

    return doc;
  } else {
    let doc = 'System Prompt Environment Variables\n';
    doc += '=====================================\n\n';

    for (const category of envVars) {
      doc += `${category.category}\n`;
      doc += '-'.repeat(category.category.length) + '\n\n';
      
      for (const variable of category.vars) {
        doc += `${variable.name}\n`;
        doc += `  Description: ${variable.description}\n`;
        doc += `  Type: ${variable.type}\n`;
        doc += `  Default: ${variable.default}\n\n`;
      }
    }

    return doc;
  }
}

/**
 * Generate comprehensive report
 */
function generateReport(filePath, format = 'text') {
  console.log('📊 Generating comprehensive validation report...\n');

  let report = '';
  
  if (format === 'markdown') {
    report += '# System Prompt Configuration Report\n\n';
    report += `Generated at: ${new Date().toISOString()}\n\n`;
  } else {
    report += 'System Prompt Configuration Report\n';
    report += '==================================\n\n';
    report += `Generated at: ${new Date().toISOString()}\n\n`;
  }

  // Environment validation
  const envValidation = validateEnvironmentVariables();
  
  if (format === 'markdown') {
    report += '## Environment Variables Validation\n\n';
    report += `- **Status**: ${envValidation.valid ? '✅ VALID' : '❌ INVALID'}\n`;
    report += `- **Errors**: ${envValidation.errors.length}\n`;
    report += `- **Warnings**: ${envValidation.warnings.length}\n\n`;
  } else {
    report += 'Environment Variables Validation\n';
    report += '--------------------------------\n';
    report += `Status: ${envValidation.valid ? 'VALID' : 'INVALID'}\n`;
    report += `Errors: ${envValidation.errors.length}\n`;
    report += `Warnings: ${envValidation.warnings.length}\n\n`;
  }

  if (envValidation.errors.length > 0) {
    if (format === 'markdown') {
      report += '### Errors\n\n';
      envValidation.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    } else {
      report += 'Errors:\n';
      envValidation.errors.forEach(error => {
        report += `  - ${error}\n`;
      });
      report += '\n';
    }
  }

  // File validation if provided
  if (filePath) {
    const fileValidation = validateConfigurationFile(filePath);
    
    if (format === 'markdown') {
      report += '## Configuration File Validation\n\n';
      report += `- **File**: ${filePath}\n`;
      report += `- **Status**: ${fileValidation.valid ? '✅ VALID' : '❌ INVALID'}\n`;
      report += `- **Errors**: ${fileValidation.errors.length}\n`;
      report += `- **Warnings**: ${fileValidation.warnings.length}\n\n`;
    } else {
      report += 'Configuration File Validation\n';
      report += '-----------------------------\n';
      report += `File: ${filePath}\n`;
      report += `Status: ${fileValidation.valid ? 'VALID' : 'INVALID'}\n`;
      report += `Errors: ${fileValidation.errors.length}\n`;
      report += `Warnings: ${fileValidation.warnings.length}\n\n`;
    }
  }

  return report;
}

/**
 * Main CLI function
 */
function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help || !options.command) {
    showHelp();
    return;
  }

  try {
    switch (options.command) {
      case 'validate':
        if (options.file) {
          validateConfigurationFile(options.file);
        } else {
          validateEnvironmentVariables();
        }
        break;

      case 'create':
        if (!options.file) {
          console.log('❌ Error: File path required for create command');
          console.log('Usage: node scripts/system-prompt-config.js create <file> [environment]');
          process.exit(1);
        }
        createConfigurationFile(options.file, options.environment);
        break;

      case 'env-vars':
        const envDoc = generateEnvVarsDocumentation(options.format);
        if (options.output) {
          writeFileSync(options.output, envDoc, 'utf-8');
          console.log(`📄 Environment variables documentation written to: ${options.output}`);
        } else {
          console.log(envDoc);
        }
        break;

      case 'report':
        const report = generateReport(options.file, options.format);
        if (options.output) {
          writeFileSync(options.output, report, 'utf-8');
          console.log(`📊 Validation report written to: ${options.output}`);
        } else {
          console.log(report);
        }
        break;

      case 'backup':
        if (!options.file) {
          console.log('❌ Error: File path required for backup command');
          process.exit(1);
        }
        if (!existsSync(options.file)) {
          console.log(`❌ Error: Configuration file does not exist: ${options.file}`);
          process.exit(1);
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${options.file}.backup.${timestamp}`;
        const content = readFileSync(options.file, 'utf-8');
        writeFileSync(backupPath, content, 'utf-8');
        console.log(`📦 Backup created: ${backupPath}`);
        break;

      default:
        console.log(`❌ Unknown command: ${options.command}`);
        console.log('Use --help to see available commands');
        process.exit(1);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironmentVariables,
  validateConfigurationFile,
  createConfigurationFile,
  generateEnvVarsDocumentation,
  generateReport,
};