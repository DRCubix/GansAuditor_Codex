/**
 * System Prompt Configuration Validator
 *
 * This module provides comprehensive validation for system prompt configuration,
 * including environment variable validation, file validation, and deployment checks.
 *
 * Requirements: 11.1 - Configuration validation and error reporting
 */
import { existsSync, statSync } from 'fs';
import { loadSystemPromptConfig, loadSystemPromptConfigFromFile, getSystemPromptConfigSummary, SYSTEM_PROMPT_ENV_VARS, } from '../prompts/system-prompt-config.js';
// ============================================================================
// Environment Variable Validation
// ============================================================================
/**
 * Validate all system prompt environment variables
 */
export function validateEnvironmentVariables() {
    const errors = [];
    const warnings = [];
    const recommendations = [];
    const missingVars = [];
    const invalidVars = [];
    let validVars = 0;
    const totalVars = Object.keys(SYSTEM_PROMPT_ENV_VARS).length;
    // Check each environment variable
    for (const [envVar, configPath] of Object.entries(SYSTEM_PROMPT_ENV_VARS)) {
        const value = process.env[envVar];
        if (value === undefined) {
            missingVars.push(envVar);
            continue;
        }
        // Validate specific environment variables
        const validation = validateEnvironmentVariable(envVar, value);
        if (validation.isValid) {
            validVars++;
        }
        else {
            invalidVars.push({
                name: envVar,
                value,
                issue: validation.issue,
                suggestion: validation.suggestion,
            });
        }
    }
    // Check for critical missing variables
    const criticalVars = [
        'GAN_AUDITOR_PROMPT_ENABLED',
        'GAN_AUDITOR_SANITIZE_PII',
        'GAN_AUDITOR_VALIDATE_COMMANDS',
    ];
    for (const criticalVar of criticalVars) {
        if (missingVars.includes(criticalVar)) {
            errors.push(`Critical environment variable missing: ${criticalVar}`);
        }
    }
    // Generate recommendations
    if (missingVars.length > 0) {
        recommendations.push('Set missing environment variables or use configuration file');
    }
    if (invalidVars.length > 0) {
        recommendations.push('Fix invalid environment variable values');
    }
    if (validVars / totalVars < 0.5) {
        recommendations.push('Consider using a configuration file instead of environment variables');
    }
    return {
        isValid: errors.length === 0 && invalidVars.length === 0,
        errors,
        warnings,
        recommendations,
        missingVars,
        invalidVars,
        summary: {
            totalVars,
            validVars,
            invalidVars: invalidVars.length,
            missingVars: missingVars.length,
        },
    };
}
/**
 * Validate individual environment variable
 */
function validateEnvironmentVariable(name, value) {
    const trimmedValue = value.trim();
    // Boolean variables
    if (name.includes('ENABLE_') || name.includes('_ENABLED') ||
        name.endsWith('_REQUIRED') || name.endsWith('_MANAGEMENT') ||
        name.endsWith('_INTEGRATION') || name.endsWith('_AWARENESS') ||
        name.endsWith('_OPTIMIZATION') || name.endsWith('_PII') ||
        name.endsWith('_COMMANDS') || name.endsWith('_PERMISSIONS') ||
        name.endsWith('_VULNERABILITIES') || name.endsWith('_CACHING') ||
        name.endsWith('_TRACKING')) {
        const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];
        if (!validBooleans.includes(trimmedValue.toLowerCase())) {
            return {
                isValid: false,
                issue: 'Invalid boolean value',
                suggestion: 'Use true/false, 1/0, or yes/no',
            };
        }
    }
    // Integer variables
    if (name.includes('_STEPS') || name.includes('_DIMENSIONS') ||
        name.includes('_TIERS') || name.includes('_SWITCHES') ||
        name.includes('_GATES') || name.includes('_ITERATIONS') ||
        name.includes('_LIMIT') || name.includes('_TIMEOUT')) {
        const parsed = parseInt(trimmedValue, 10);
        if (isNaN(parsed)) {
            return {
                isValid: false,
                issue: 'Invalid integer value',
                suggestion: 'Provide a valid integer',
            };
        }
        // Check specific ranges
        if (name === 'GAN_AUDITOR_WORKFLOW_STEPS' && (parsed < 1 || parsed > 20)) {
            return {
                isValid: false,
                issue: 'Workflow steps out of range',
                suggestion: 'Use value between 1 and 20',
            };
        }
        if (name === 'GAN_AUDITOR_QUALITY_DIMENSIONS' && (parsed < 1 || parsed > 10)) {
            return {
                isValid: false,
                issue: 'Quality dimensions out of range',
                suggestion: 'Use value between 1 and 10',
            };
        }
        if (name === 'GAN_AUDITOR_MAX_ITERATIONS' && (parsed < 1 || parsed > 100)) {
            return {
                isValid: false,
                issue: 'Max iterations out of range',
                suggestion: 'Use value between 1 and 100',
            };
        }
        if (name === 'GAN_AUDITOR_CONTEXT_TOKEN_LIMIT' && (parsed < 1000 || parsed > 1000000)) {
            return {
                isValid: false,
                issue: 'Context token limit out of range',
                suggestion: 'Use value between 1,000 and 1,000,000',
            };
        }
        if (name === 'GAN_AUDITOR_AUDIT_TIMEOUT_MS' && (parsed < 5000 || parsed > 300000)) {
            return {
                isValid: false,
                issue: 'Audit timeout out of range',
                suggestion: 'Use value between 5,000 and 300,000 milliseconds',
            };
        }
    }
    // Float variables
    if (name === 'GAN_AUDITOR_STAGNATION_THRESHOLD') {
        const parsed = parseFloat(trimmedValue);
        if (isNaN(parsed) || parsed < 0 || parsed > 1) {
            return {
                isValid: false,
                issue: 'Stagnation threshold out of range',
                suggestion: 'Use value between 0.0 and 1.0',
            };
        }
    }
    // Enum variables
    if (name === 'GAN_AUDITOR_STANCE') {
        const validStances = ['adversarial', 'collaborative', 'constructive-adversarial'];
        if (!validStances.includes(trimmedValue)) {
            return {
                isValid: false,
                issue: 'Invalid stance value',
                suggestion: `Use one of: ${validStances.join(', ')}`,
            };
        }
    }
    if (name === 'GAN_AUDITOR_AUTHORITY') {
        const validAuthorities = ['spec-and-steering-ground-truth', 'flexible', 'advisory'];
        if (!validAuthorities.includes(trimmedValue)) {
            return {
                isValid: false,
                issue: 'Invalid authority value',
                suggestion: `Use one of: ${validAuthorities.join(', ')}`,
            };
        }
    }
    if (name === 'GAN_AUDITOR_WEIGHTING_SCHEME') {
        const validSchemes = ['project-standard', 'custom', 'balanced'];
        if (!validSchemes.includes(trimmedValue)) {
            return {
                isValid: false,
                issue: 'Invalid weighting scheme',
                suggestion: `Use one of: ${validSchemes.join(', ')}`,
            };
        }
    }
    if (name === 'GAN_AUDITOR_SCORING_SCALE') {
        const validScales = ['0-100', '0-10', 'letter-grade'];
        if (!validScales.includes(trimmedValue)) {
            return {
                isValid: false,
                issue: 'Invalid scoring scale',
                suggestion: `Use one of: ${validScales.join(', ')}`,
            };
        }
    }
    if (name === 'GAN_AUDITOR_AGGREGATION_METHOD') {
        const validMethods = ['weighted-average', 'minimum', 'geometric-mean'];
        if (!validMethods.includes(trimmedValue)) {
            return {
                isValid: false,
                issue: 'Invalid aggregation method',
                suggestion: `Use one of: ${validMethods.join(', ')}`,
            };
        }
    }
    // String variables (basic validation)
    if (name.includes('_NAME') || name.includes('_ROLE') || name.includes('_VERSION')) {
        if (trimmedValue.length === 0) {
            return {
                isValid: false,
                issue: 'Empty string value',
                suggestion: 'Provide a non-empty string',
            };
        }
        if (trimmedValue.length > 100) {
            return {
                isValid: false,
                issue: 'String too long',
                suggestion: 'Use string shorter than 100 characters',
            };
        }
    }
    return { isValid: true, issue: '' };
}
// ============================================================================
// File Validation
// ============================================================================
/**
 * Validate configuration file
 */
export function validateConfigurationFile(filePath, options = {}) {
    const errors = [];
    const warnings = [];
    const recommendations = [];
    let fileExists = false;
    let isReadable = false;
    let isWritable = false;
    let fileSize = 0;
    let lastModified = null;
    let configValidation = null;
    try {
        // Check if file exists
        fileExists = existsSync(filePath);
        if (!fileExists) {
            errors.push(`Configuration file does not exist: ${filePath}`);
            recommendations.push('Create configuration file using createSystemPromptConfigFile()');
            return {
                isValid: false,
                errors,
                warnings,
                recommendations,
                fileExists,
                isReadable,
                isWritable,
                fileSize,
                lastModified,
                configValidation,
            };
        }
        // Get file stats
        const stats = statSync(filePath);
        fileSize = stats.size;
        lastModified = stats.mtime;
        // Check file permissions
        try {
            isReadable = !!(stats.mode & parseInt('400', 8));
            isWritable = !!(stats.mode & parseInt('200', 8));
        }
        catch (permError) {
            warnings.push('Could not check file permissions');
        }
        if (!isReadable) {
            errors.push('Configuration file is not readable');
        }
        if (!isWritable) {
            warnings.push('Configuration file is not writable (updates may fail)');
        }
        // Check file size
        if (fileSize === 0) {
            errors.push('Configuration file is empty');
        }
        else if (fileSize > 1024 * 1024) { // 1MB
            warnings.push('Configuration file is very large (>1MB)');
        }
        // Check file age
        const ageMs = Date.now() - lastModified.getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays > 365) {
            warnings.push('Configuration file is very old (>1 year)');
            recommendations.push('Consider updating configuration file');
        }
        else if (ageDays > 90) {
            recommendations.push('Configuration file is older than 90 days, consider reviewing');
        }
        // Load and validate configuration
        const fileResult = loadSystemPromptConfigFromFile(filePath, options);
        configValidation = fileResult.validation;
        if (!fileResult.config) {
            errors.push(...fileResult.validation.errors);
        }
        warnings.push(...fileResult.validation.warnings);
        recommendations.push(...fileResult.validation.recommendations);
    }
    catch (error) {
        errors.push(`Failed to validate configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        fileExists,
        isReadable,
        isWritable,
        fileSize,
        lastModified,
        configValidation,
    };
}
// ============================================================================
// Deployment Readiness Validation
// ============================================================================
/**
 * Check deployment readiness
 */
export function validateDeploymentReadiness(configFilePath) {
    const errors = [];
    const warnings = [];
    const recommendations = [];
    // Load configuration from all sources
    const configResult = loadSystemPromptConfig(configFilePath);
    const config = configResult.config;
    // Determine environment
    let environment = 'unknown';
    if (process.env.NODE_ENV) {
        const nodeEnv = process.env.NODE_ENV.toLowerCase();
        if (['development', 'dev'].includes(nodeEnv)) {
            environment = 'development';
        }
        else if (['staging', 'stage'].includes(nodeEnv)) {
            environment = 'staging';
        }
        else if (['production', 'prod'].includes(nodeEnv)) {
            environment = 'production';
        }
    }
    // Security checks
    const securityChecks = {
        piiSanitizationEnabled: config.security.sanitizePII,
        commandValidationEnabled: config.security.validateCommands,
        permissionsRespected: config.security.respectPermissions,
        vulnerabilityDetectionEnabled: config.security.flagVulnerabilities,
    };
    // Performance checks
    const performanceChecks = {
        timeoutReasonable: config.performance.auditTimeoutMs >= 5000 && config.performance.auditTimeoutMs <= 300000,
        tokenLimitReasonable: config.performance.contextTokenLimit >= 1000 && config.performance.contextTokenLimit <= 1000000,
        cachingEnabled: config.performance.enableCaching,
        progressTrackingEnabled: config.performance.enableProgressTracking,
    };
    // Environment-specific validations
    if (environment === 'production') {
        // Production security requirements
        if (!securityChecks.piiSanitizationEnabled) {
            errors.push('PII sanitization must be enabled in production');
        }
        if (!securityChecks.commandValidationEnabled) {
            errors.push('Command validation must be enabled in production');
        }
        if (!securityChecks.permissionsRespected) {
            warnings.push('File permissions should be respected in production');
        }
        if (!securityChecks.vulnerabilityDetectionEnabled) {
            warnings.push('Vulnerability detection should be enabled in production');
        }
        // Production performance requirements
        if (config.performance.auditTimeoutMs > 60000) {
            warnings.push('Long audit timeout may impact user experience in production');
        }
        if (config.performance.contextTokenLimit > 500000) {
            warnings.push('High token limit may impact performance in production');
        }
        if (!performanceChecks.cachingEnabled) {
            recommendations.push('Enable caching for better performance in production');
        }
        // Production workflow requirements
        if (!config.workflow.enforceOrder) {
            warnings.push('Workflow order enforcement should be enabled in production');
        }
        if (config.workflow.allowSkipping) {
            warnings.push('Workflow step skipping should be disabled in production');
        }
    }
    if (environment === 'development') {
        // Development recommendations
        if (config.security.validateCommands) {
            recommendations.push('Consider disabling command validation in development for easier testing');
        }
        if (config.workflow.enforceOrder) {
            recommendations.push('Consider allowing workflow flexibility in development');
        }
        if (config.performance.auditTimeoutMs < 30000) {
            recommendations.push('Consider longer timeout in development for debugging');
        }
    }
    // General validations
    if (!configResult.validation.isValid) {
        errors.push(...configResult.validation.errors);
        warnings.push(...configResult.validation.warnings);
    }
    // Integration checks
    if (!config.integration.sessionManagement) {
        warnings.push('Session management is disabled - audit history will not be preserved');
    }
    if (!config.integration.codexIntegration) {
        errors.push('Codex integration is disabled - system prompt will not function');
    }
    if (!config.integration.contextAwareness) {
        warnings.push('Context awareness is disabled - audit quality may be reduced');
    }
    return {
        isReady: errors.length === 0,
        errors,
        warnings,
        recommendations,
        environment,
        configSources: configResult.sources,
        securityChecks,
        performanceChecks,
    };
}
// ============================================================================
// Comprehensive Validation
// ============================================================================
/**
 * Perform comprehensive validation of system prompt configuration
 */
export function validateSystemPromptConfiguration(configFilePath, options = {}) {
    // Load configuration
    const configResult = loadSystemPromptConfig(configFilePath, options);
    const config = configResult.config;
    // Validate environment variables
    const environmentValidation = validateEnvironmentVariables();
    // Validate configuration file if provided
    let fileValidation = null;
    if (configFilePath) {
        fileValidation = validateConfigurationFile(configFilePath, options);
    }
    // Check deployment readiness
    const deploymentReadiness = validateDeploymentReadiness(configFilePath);
    // Calculate totals
    const totalErrors = configResult.validation.errors.length +
        environmentValidation.errors.length +
        (fileValidation?.errors.length || 0) +
        deploymentReadiness.errors.length;
    const totalWarnings = configResult.validation.warnings.length +
        environmentValidation.warnings.length +
        (fileValidation?.warnings.length || 0) +
        deploymentReadiness.warnings.length;
    const totalRecommendations = configResult.validation.recommendations.length +
        environmentValidation.recommendations.length +
        (fileValidation?.recommendations.length || 0) +
        deploymentReadiness.recommendations.length;
    return {
        isValid: totalErrors === 0 && configResult.validation.isValid,
        config,
        environmentValidation,
        fileValidation,
        deploymentReadiness,
        summary: {
            totalErrors,
            totalWarnings,
            totalRecommendations,
            configSummary: getSystemPromptConfigSummary(config),
        },
    };
}
// ============================================================================
// Validation Reporting
// ============================================================================
/**
 * Generate validation report
 */
export function generateValidationReport(validation) {
    let report = '# System Prompt Configuration Validation Report\n\n';
    // Executive summary
    report += '## Executive Summary\n\n';
    report += `- **Overall Status**: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}\n`;
    report += `- **Total Errors**: ${validation.summary.totalErrors}\n`;
    report += `- **Total Warnings**: ${validation.summary.totalWarnings}\n`;
    report += `- **Total Recommendations**: ${validation.summary.totalRecommendations}\n`;
    report += `- **Environment**: ${validation.deploymentReadiness.environment}\n`;
    report += `- **Deployment Ready**: ${validation.deploymentReadiness.isReady ? '✅ YES' : '❌ NO'}\n\n`;
    // Configuration summary
    report += '## Configuration Summary\n\n';
    const summary = validation.summary.configSummary;
    report += `- **Identity**: ${summary.identity}\n`;
    report += `- **Workflow**: ${summary.workflow}\n`;
    report += `- **Quality Framework**: ${summary.qualityFramework}\n`;
    report += `- **Completion Criteria**: ${summary.completionCriteria}\n`;
    report += `- **Integration**: ${summary.integration.join(', ')}\n`;
    report += `- **Security**: ${summary.security.join(', ')}\n`;
    report += `- **Performance**: ${summary.performance}\n\n`;
    // Configuration sources
    report += '## Configuration Sources\n\n';
    const sources = validation.deploymentReadiness.configSources;
    report += `- **Defaults**: ${sources.defaults ? '✅' : '❌'}\n`;
    report += `- **Config File**: ${sources.configFile ? '✅' : '❌'}\n`;
    report += `- **Environment Variables**: ${sources.environment ? '✅' : '❌'}\n\n`;
    // Environment validation
    if (validation.environmentValidation.errors.length > 0 ||
        validation.environmentValidation.warnings.length > 0) {
        report += '## Environment Variables\n\n';
        if (validation.environmentValidation.errors.length > 0) {
            report += '### Errors\n\n';
            for (const error of validation.environmentValidation.errors) {
                report += `- ❌ ${error}\n`;
            }
            report += '\n';
        }
        if (validation.environmentValidation.warnings.length > 0) {
            report += '### Warnings\n\n';
            for (const warning of validation.environmentValidation.warnings) {
                report += `- ⚠️ ${warning}\n`;
            }
            report += '\n';
        }
        if (validation.environmentValidation.invalidVars.length > 0) {
            report += '### Invalid Variables\n\n';
            for (const invalid of validation.environmentValidation.invalidVars) {
                report += `- **${invalid.name}**: ${invalid.issue}`;
                if (invalid.suggestion) {
                    report += ` (${invalid.suggestion})`;
                }
                report += '\n';
            }
            report += '\n';
        }
    }
    // File validation
    if (validation.fileValidation) {
        report += '## Configuration File\n\n';
        if (validation.fileValidation.errors.length > 0) {
            report += '### Errors\n\n';
            for (const error of validation.fileValidation.errors) {
                report += `- ❌ ${error}\n`;
            }
            report += '\n';
        }
        if (validation.fileValidation.warnings.length > 0) {
            report += '### Warnings\n\n';
            for (const warning of validation.fileValidation.warnings) {
                report += `- ⚠️ ${warning}\n`;
            }
            report += '\n';
        }
    }
    // Deployment readiness
    report += '## Deployment Readiness\n\n';
    if (validation.deploymentReadiness.errors.length > 0) {
        report += '### Errors\n\n';
        for (const error of validation.deploymentReadiness.errors) {
            report += `- ❌ ${error}\n`;
        }
        report += '\n';
    }
    if (validation.deploymentReadiness.warnings.length > 0) {
        report += '### Warnings\n\n';
        for (const warning of validation.deploymentReadiness.warnings) {
            report += `- ⚠️ ${warning}\n`;
        }
        report += '\n';
    }
    // Security checks
    report += '### Security Checks\n\n';
    const security = validation.deploymentReadiness.securityChecks;
    report += `- **PII Sanitization**: ${security.piiSanitizationEnabled ? '✅' : '❌'}\n`;
    report += `- **Command Validation**: ${security.commandValidationEnabled ? '✅' : '❌'}\n`;
    report += `- **Permissions Respected**: ${security.permissionsRespected ? '✅' : '❌'}\n`;
    report += `- **Vulnerability Detection**: ${security.vulnerabilityDetectionEnabled ? '✅' : '❌'}\n\n`;
    // Performance checks
    report += '### Performance Checks\n\n';
    const performance = validation.deploymentReadiness.performanceChecks;
    report += `- **Timeout Reasonable**: ${performance.timeoutReasonable ? '✅' : '❌'}\n`;
    report += `- **Token Limit Reasonable**: ${performance.tokenLimitReasonable ? '✅' : '❌'}\n`;
    report += `- **Caching Enabled**: ${performance.cachingEnabled ? '✅' : '❌'}\n`;
    report += `- **Progress Tracking**: ${performance.progressTrackingEnabled ? '✅' : '❌'}\n\n`;
    // Recommendations
    const allRecommendations = [
        ...validation.environmentValidation.recommendations,
        ...(validation.fileValidation?.recommendations || []),
        ...validation.deploymentReadiness.recommendations,
    ];
    if (allRecommendations.length > 0) {
        report += '## Recommendations\n\n';
        for (const recommendation of allRecommendations) {
            report += `- 💡 ${recommendation}\n`;
        }
        report += '\n';
    }
    report += `---\n\n*Report generated at ${new Date().toISOString()}*\n`;
    return report;
}
//# sourceMappingURL=system-prompt-config-validator.js.map