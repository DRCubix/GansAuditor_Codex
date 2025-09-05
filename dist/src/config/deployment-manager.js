/**
 * Deployment and Migration Manager for System Prompt Configuration
 *
 * This module provides deployment support, backward compatibility validation,
 * gradual rollout configuration, feature flags, and migration scripts.
 *
 * Requirements: 11.2 - Deployment strategy
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { DEFAULT_SYSTEM_PROMPT_CONFIG, loadSystemPromptConfigFromFile, saveSystemPromptConfigToFile, validateSystemPromptConfig, } from '../prompts/system-prompt-config.js';
// ============================================================================
// Default Configurations
// ============================================================================
/**
 * Default deployment environments
 */
export const DEFAULT_DEPLOYMENT_ENVIRONMENTS = {
    development: {
        name: 'development',
        configPath: 'config/system-prompt-dev.json',
        backupPath: 'config/backups/dev',
        featureFlags: {
            systemPromptEnabled: true,
            advancedWorkflow: true,
            enhancedSecurity: false,
            performanceOptimizations: true,
            experimentalFeatures: true,
        },
        rolloutPercentage: 100,
        validationStrict: false,
        requireApproval: false,
    },
    staging: {
        name: 'staging',
        configPath: 'config/system-prompt-staging.json',
        backupPath: 'config/backups/staging',
        featureFlags: {
            systemPromptEnabled: true,
            advancedWorkflow: true,
            enhancedSecurity: true,
            performanceOptimizations: true,
            experimentalFeatures: false,
        },
        rolloutPercentage: 50,
        validationStrict: true,
        requireApproval: true,
    },
    production: {
        name: 'production',
        configPath: 'config/system-prompt-prod.json',
        backupPath: 'config/backups/prod',
        featureFlags: {
            systemPromptEnabled: true,
            advancedWorkflow: true,
            enhancedSecurity: true,
            performanceOptimizations: true,
            experimentalFeatures: false,
        },
        rolloutPercentage: 10,
        validationStrict: true,
        requireApproval: true,
    },
};
/**
 * Default feature flag configuration
 */
export const DEFAULT_FEATURE_FLAGS = {
    systemPromptEnabled: true,
    advancedWorkflow: true,
    enhancedSecurity: true,
    performanceOptimizations: true,
    experimentalFeatures: false,
    rolloutPercentage: 100,
    targetEnvironments: ['development', 'staging', 'production'],
};
// ============================================================================
// Migration Scripts
// ============================================================================
/**
 * Available migration scripts
 */
export const MIGRATION_SCRIPTS = [
    {
        version: '1.0.0-to-2.0.0',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        description: 'Migrate from legacy configuration to new system prompt structure',
        migrate: (oldConfig) => {
            // Handle migration from legacy format
            const migratedConfig = {
                ...DEFAULT_SYSTEM_PROMPT_CONFIG,
                // Migrate identity settings
                identity: {
                    name: oldConfig.auditorName || DEFAULT_SYSTEM_PROMPT_CONFIG.identity.name,
                    role: oldConfig.auditorRole || DEFAULT_SYSTEM_PROMPT_CONFIG.identity.role,
                    stance: oldConfig.adversarialMode ? 'adversarial' : 'constructive-adversarial',
                    authority: 'spec-and-steering-ground-truth',
                },
                // Migrate workflow settings
                workflow: {
                    steps: oldConfig.workflowSteps || 8,
                    enforceOrder: oldConfig.strictWorkflow !== false,
                    allowSkipping: oldConfig.allowSkipping || false,
                    evidenceRequired: oldConfig.requireEvidence !== false,
                },
                // Migrate completion criteria
                completionCriteria: {
                    ...DEFAULT_SYSTEM_PROMPT_CONFIG.completionCriteria,
                    maxIterations: oldConfig.maxIterations || 25,
                    stagnationThreshold: oldConfig.stagnationThreshold || 0.95,
                },
                // Migrate security settings
                security: {
                    sanitizePII: oldConfig.sanitizePII !== false,
                    validateCommands: oldConfig.validateCommands !== false,
                    respectPermissions: oldConfig.respectPermissions !== false,
                    flagVulnerabilities: oldConfig.flagVulnerabilities !== false,
                },
                // Migrate performance settings
                performance: {
                    contextTokenLimit: oldConfig.contextLimit || 200000,
                    auditTimeoutMs: oldConfig.timeoutMs || 30000,
                    enableCaching: oldConfig.enableCaching !== false,
                    enableProgressTracking: oldConfig.enableProgress !== false,
                },
            };
            return migratedConfig;
        },
        validate: (config) => {
            const validation = validateSystemPromptConfig(config);
            return validation.isValid;
        },
        rollback: (config) => {
            // Convert back to legacy format if needed
            return {
                auditorName: config.identity.name,
                auditorRole: config.identity.role,
                adversarialMode: config.identity.stance === 'adversarial',
                workflowSteps: config.workflow.steps,
                strictWorkflow: config.workflow.enforceOrder,
                allowSkipping: config.workflow.allowSkipping,
                requireEvidence: config.workflow.evidenceRequired,
                maxIterations: config.completionCriteria.maxIterations,
                stagnationThreshold: config.completionCriteria.stagnationThreshold,
                sanitizePII: config.security.sanitizePII,
                validateCommands: config.security.validateCommands,
                contextLimit: config.performance.contextTokenLimit,
                timeoutMs: config.performance.auditTimeoutMs,
                enableCaching: config.performance.enableCaching,
            };
        },
    },
    {
        version: '2.0.0-to-2.1.0',
        fromVersion: '2.0.0',
        toVersion: '2.1.0',
        description: 'Add enhanced security and performance features',
        migrate: (oldConfig) => {
            return {
                ...oldConfig,
                security: {
                    ...oldConfig.security,
                    respectPermissions: oldConfig.security.respectPermissions ?? true,
                    flagVulnerabilities: oldConfig.security.flagVulnerabilities ?? true,
                },
                performance: {
                    ...oldConfig.performance,
                    enableProgressTracking: oldConfig.performance.enableProgressTracking ?? true,
                },
            };
        },
        validate: (config) => {
            return validateSystemPromptConfig(config).isValid;
        },
    },
];
// ============================================================================
// Deployment Manager Class
// ============================================================================
export class DeploymentManager {
    environments;
    migrations;
    constructor(environments = DEFAULT_DEPLOYMENT_ENVIRONMENTS, migrations = MIGRATION_SCRIPTS) {
        this.environments = environments;
        this.migrations = migrations;
    }
    /**
     * Deploy configuration to specified environment
     */
    async deployToEnvironment(config, environmentName, options = {}) {
        const opts = {
            createBackup: true,
            validateBeforeDeploy: true,
            applyMigrations: true,
            dryRun: false,
            ...options,
        };
        const environment = this.environments[environmentName];
        if (!environment) {
            return {
                success: false,
                environment: environmentName,
                version: '2.0.0',
                backupCreated: false,
                migrationApplied: false,
                errors: [`Unknown environment: ${environmentName}`],
                warnings: [],
                rolloutPercentage: 0,
                featureFlags: {},
            };
        }
        const errors = [];
        const warnings = [];
        let backupCreated = false;
        let backupPath;
        let migrationApplied = false;
        let migrationVersion;
        try {
            // Validate configuration if required
            if (opts.validateBeforeDeploy) {
                const validation = validateSystemPromptConfig(config);
                if (!validation.isValid) {
                    errors.push(...validation.errors);
                    if (environment.validationStrict) {
                        return {
                            success: false,
                            environment: environmentName,
                            version: '2.0.0',
                            backupCreated,
                            migrationApplied,
                            errors,
                            warnings: [...warnings, ...validation.warnings],
                            rolloutPercentage: environment.rolloutPercentage,
                            featureFlags: environment.featureFlags,
                        };
                    }
                    else {
                        warnings.push(...validation.errors);
                    }
                }
                warnings.push(...validation.warnings);
            }
            // Create backup if requested and file exists
            if (opts.createBackup && existsSync(environment.configPath)) {
                const backupResult = this.createBackup(environment.configPath, environment.backupPath);
                if (backupResult.success) {
                    backupCreated = true;
                    backupPath = backupResult.backupPath;
                }
                else {
                    warnings.push(`Failed to create backup: ${backupResult.error}`);
                }
            }
            // Apply migrations if requested
            if (opts.applyMigrations && existsSync(environment.configPath)) {
                const migrationResult = this.applyMigrations(environment.configPath);
                if (migrationResult.success && migrationResult.migrationsApplied.length > 0) {
                    migrationApplied = true;
                    migrationVersion = migrationResult.migrationsApplied[migrationResult.migrationsApplied.length - 1];
                }
                warnings.push(...migrationResult.warnings);
                if (!migrationResult.success) {
                    errors.push(...migrationResult.errors);
                }
            }
            // Apply feature flags to configuration
            const configWithFlags = this.applyFeatureFlags(config, environment.featureFlags);
            // Deploy configuration (unless dry run)
            if (!opts.dryRun) {
                // Ensure directory exists
                const configDir = dirname(environment.configPath);
                if (!existsSync(configDir)) {
                    mkdirSync(configDir, { recursive: true });
                }
                const saveResult = saveSystemPromptConfigToFile(configWithFlags, environment.configPath, {
                    environment: environment.name,
                    backupExisting: false, // We already created backup above
                    validateBeforeApply: false, // We already validated above
                    rollbackOnFailure: true,
                });
                if (!saveResult.success) {
                    errors.push(...saveResult.errors);
                }
                warnings.push(...saveResult.warnings);
            }
            return {
                success: errors.length === 0,
                environment: environmentName,
                version: '2.0.0',
                backupCreated,
                backupPath,
                migrationApplied,
                migrationVersion,
                errors,
                warnings,
                rolloutPercentage: environment.rolloutPercentage,
                featureFlags: environment.featureFlags,
            };
        }
        catch (error) {
            errors.push(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                success: false,
                environment: environmentName,
                version: '2.0.0',
                backupCreated,
                backupPath,
                migrationApplied,
                migrationVersion,
                errors,
                warnings,
                rolloutPercentage: environment.rolloutPercentage,
                featureFlags: environment.featureFlags,
            };
        }
    }
    /**
     * Apply migrations to configuration file
     */
    applyMigrations(configPath) {
        const errors = [];
        const warnings = [];
        const migrationsApplied = [];
        let backupCreated = false;
        let backupPath;
        try {
            if (!existsSync(configPath)) {
                return {
                    success: false,
                    fromVersion: 'unknown',
                    toVersion: '2.0.0',
                    migrationsApplied,
                    backupCreated,
                    errors: [`Configuration file not found: ${configPath}`],
                    warnings,
                    configPath,
                };
            }
            // Load current configuration
            const fileResult = loadSystemPromptConfigFromFile(configPath);
            if (!fileResult.config) {
                return {
                    success: false,
                    fromVersion: 'unknown',
                    toVersion: '2.0.0',
                    migrationsApplied,
                    backupCreated,
                    errors: [`Failed to load configuration: ${fileResult.validation.errors.join(', ')}`],
                    warnings,
                    configPath,
                };
            }
            // Determine current version
            const content = readFileSync(configPath, 'utf-8');
            const configFile = JSON.parse(content);
            const currentVersion = configFile.version || '1.0.0';
            // Find applicable migrations
            const applicableMigrations = this.findApplicableMigrations(currentVersion, '2.0.0');
            if (applicableMigrations.length === 0) {
                return {
                    success: true,
                    fromVersion: currentVersion,
                    toVersion: '2.0.0',
                    migrationsApplied,
                    backupCreated,
                    errors,
                    warnings: ['No migrations needed'],
                    configPath,
                };
            }
            // Create backup before migration
            const backupResult = this.createBackup(configPath, dirname(configPath) + '/backups');
            if (backupResult.success) {
                backupCreated = true;
                backupPath = backupResult.backupPath;
            }
            else {
                warnings.push(`Failed to create backup: ${backupResult.error}`);
            }
            // Apply migrations in sequence
            let currentConfig = fileResult.config;
            let workingVersion = currentVersion;
            for (const migration of applicableMigrations) {
                try {
                    const migratedConfig = migration.migrate(currentConfig);
                    // Validate migrated configuration
                    if (migration.validate(migratedConfig)) {
                        currentConfig = migratedConfig;
                        workingVersion = migration.toVersion;
                        migrationsApplied.push(migration.version);
                    }
                    else {
                        errors.push(`Migration ${migration.version} validation failed`);
                        break;
                    }
                }
                catch (migrationError) {
                    errors.push(`Migration ${migration.version} failed: ${migrationError instanceof Error ? migrationError.message : 'Unknown error'}`);
                    break;
                }
            }
            // Save migrated configuration
            if (migrationsApplied.length > 0 && errors.length === 0) {
                const updatedConfigFile = {
                    ...configFile,
                    version: workingVersion,
                    systemPrompt: currentConfig,
                    metadata: {
                        ...configFile.metadata,
                        updatedAt: new Date().toISOString(),
                        migratedFrom: currentVersion,
                        migrationsApplied,
                    },
                };
                writeFileSync(configPath, JSON.stringify(updatedConfigFile, null, 2), 'utf-8');
            }
            return {
                success: errors.length === 0,
                fromVersion: currentVersion,
                toVersion: workingVersion,
                migrationsApplied,
                backupCreated,
                backupPath,
                errors,
                warnings,
                configPath,
            };
        }
        catch (error) {
            errors.push(`Migration process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                success: false,
                fromVersion: 'unknown',
                toVersion: '2.0.0',
                migrationsApplied,
                backupCreated,
                backupPath,
                errors,
                warnings,
                configPath,
            };
        }
    }
    /**
     * Check backward compatibility
     */
    checkBackwardCompatibility(configPath) {
        const supportedVersions = ['1.0.0', '2.0.0', '2.1.0'];
        const deprecatedFeatures = [];
        const breakingChanges = [];
        const recommendations = [];
        try {
            if (!existsSync(configPath)) {
                return {
                    isCompatible: false,
                    version: 'unknown',
                    supportedVersions,
                    deprecatedFeatures,
                    breakingChanges: ['Configuration file not found'],
                    migrationRequired: true,
                    recommendations: ['Create new configuration file'],
                };
            }
            const content = readFileSync(configPath, 'utf-8');
            const configFile = JSON.parse(content);
            const version = configFile.version || '1.0.0';
            // Check if version is supported
            if (!supportedVersions.includes(version)) {
                return {
                    isCompatible: false,
                    version,
                    supportedVersions,
                    deprecatedFeatures,
                    breakingChanges: [`Unsupported version: ${version}`],
                    migrationRequired: true,
                    recommendations: ['Upgrade to supported version'],
                };
            }
            // Check for deprecated features based on version
            if (version === '1.0.0') {
                deprecatedFeatures.push('Legacy auditor configuration format');
                deprecatedFeatures.push('Old workflow step definitions');
                breakingChanges.push('Configuration structure has changed significantly');
                recommendations.push('Migrate to version 2.0.0 using migration scripts');
            }
            // Check for specific deprecated fields
            if (configFile.auditorName) {
                deprecatedFeatures.push('auditorName field (use identity.name instead)');
            }
            if (configFile.adversarialMode !== undefined) {
                deprecatedFeatures.push('adversarialMode field (use identity.stance instead)');
            }
            // Determine migration path
            const migrationPath = this.findApplicableMigrations(version, '2.0.0').map(m => m.version);
            const migrationRequired = migrationPath.length > 0;
            return {
                isCompatible: breakingChanges.length === 0,
                version,
                supportedVersions,
                deprecatedFeatures,
                breakingChanges,
                migrationRequired,
                migrationPath,
                recommendations,
            };
        }
        catch (error) {
            return {
                isCompatible: false,
                version: 'unknown',
                supportedVersions,
                deprecatedFeatures,
                breakingChanges: [`Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`],
                migrationRequired: true,
                recommendations: ['Fix configuration file format'],
            };
        }
    }
    /**
     * Apply feature flags to configuration
     */
    applyFeatureFlags(config, featureFlags) {
        const configWithFlags = { ...config };
        // Apply system prompt feature flag
        if (!featureFlags.systemPromptEnabled) {
            // Disable system prompt functionality
            configWithFlags.integration.codexIntegration = false;
            configWithFlags.workflow.evidenceRequired = false;
        }
        // Apply advanced workflow feature flag
        if (!featureFlags.advancedWorkflow) {
            configWithFlags.workflow.enforceOrder = false;
            configWithFlags.workflow.allowSkipping = true;
            configWithFlags.completionCriteria.tiers = 1;
        }
        // Apply enhanced security feature flag
        if (!featureFlags.enhancedSecurity) {
            configWithFlags.security.validateCommands = false;
            configWithFlags.security.respectPermissions = false;
        }
        // Apply performance optimizations feature flag
        if (!featureFlags.performanceOptimizations) {
            configWithFlags.performance.enableCaching = false;
            configWithFlags.integration.performanceOptimization = false;
        }
        // Apply experimental features flag
        if (!featureFlags.experimentalFeatures) {
            // Disable any experimental features
            configWithFlags.qualityFramework.aggregationMethod = 'weighted-average';
        }
        return configWithFlags;
    }
    /**
     * Create backup of configuration file
     */
    createBackup(configPath, backupDir) {
        try {
            if (!existsSync(configPath)) {
                return { success: false, error: 'Configuration file does not exist' };
            }
            // Ensure backup directory exists
            if (!existsSync(backupDir)) {
                mkdirSync(backupDir, { recursive: true });
            }
            // Create backup filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const configName = configPath.split('/').pop()?.replace('.json', '') || 'config';
            const backupPath = join(backupDir, `${configName}-backup-${timestamp}.json`);
            // Copy file
            const content = readFileSync(configPath, 'utf-8');
            writeFileSync(backupPath, content, 'utf-8');
            return { success: true, backupPath };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Find applicable migrations between versions
     */
    findApplicableMigrations(fromVersion, toVersion) {
        const applicable = [];
        let currentVersion = fromVersion;
        // Simple version comparison - in real implementation, use proper semver
        while (currentVersion !== toVersion) {
            const migration = this.migrations.find(m => m.fromVersion === currentVersion);
            if (migration) {
                applicable.push(migration);
                currentVersion = migration.toVersion;
            }
            else {
                break; // No migration path found
            }
        }
        return applicable;
    }
    /**
     * Get deployment environments
     */
    getEnvironments() {
        return { ...this.environments };
    }
    /**
     * Get available migrations
     */
    getMigrations() {
        return [...this.migrations];
    }
    /**
     * Clean old backups
     */
    cleanOldBackups(backupDir, maxAge = 30) {
        const deletedFiles = [];
        const errors = [];
        try {
            if (!existsSync(backupDir)) {
                return { success: true, deletedFiles, errors };
            }
            const files = readdirSync(backupDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - maxAge);
            for (const file of files) {
                if (file.includes('backup-')) {
                    const filePath = join(backupDir, file);
                    try {
                        const stats = statSync(filePath);
                        if (stats.mtime < cutoffDate) {
                            require('fs').unlinkSync(filePath);
                            deletedFiles.push(file);
                        }
                    }
                    catch (fileError) {
                        errors.push(`Failed to process ${file}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
                    }
                }
            }
            return { success: errors.length === 0, deletedFiles, errors };
        }
        catch (error) {
            errors.push(`Failed to clean backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { success: false, deletedFiles, errors };
        }
    }
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Create default deployment manager instance
 */
export function createDeploymentManager() {
    return new DeploymentManager();
}
/**
 * Quick deployment to environment
 */
export async function deployToEnvironment(config, environment, options) {
    const manager = createDeploymentManager();
    return manager.deployToEnvironment(config, environment, options);
}
/**
 * Quick migration of configuration file
 */
export function migrateConfiguration(configPath) {
    const manager = createDeploymentManager();
    return manager.applyMigrations(configPath);
}
/**
 * Quick compatibility check
 */
export function checkCompatibility(configPath) {
    const manager = createDeploymentManager();
    return manager.checkBackwardCompatibility(configPath);
}
//# sourceMappingURL=deployment-manager.js.map