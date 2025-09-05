/**
 * Deployment and Migration Manager for System Prompt Configuration
 *
 * This module provides deployment support, backward compatibility validation,
 * gradual rollout configuration, feature flags, and migration scripts.
 *
 * Requirements: 11.2 - Deployment strategy
 */
import { SystemPromptConfig } from '../prompts/system-prompt-config.js';
/**
 * Deployment environment configuration
 */
export interface DeploymentEnvironment {
    name: 'development' | 'staging' | 'production';
    configPath: string;
    backupPath: string;
    featureFlags: Record<string, boolean>;
    rolloutPercentage: number;
    validationStrict: boolean;
    requireApproval: boolean;
}
/**
 * Migration script interface
 */
export interface MigrationScript {
    version: string;
    fromVersion: string;
    toVersion: string;
    description: string;
    migrate: (config: any) => SystemPromptConfig;
    validate: (config: SystemPromptConfig) => boolean;
    rollback?: (config: SystemPromptConfig) => any;
}
/**
 * Deployment result
 */
export interface DeploymentResult {
    success: boolean;
    environment: string;
    version: string;
    backupCreated: boolean;
    backupPath?: string;
    migrationApplied: boolean;
    migrationVersion?: string;
    errors: string[];
    warnings: string[];
    rolloutPercentage: number;
    featureFlags: Record<string, boolean>;
}
/**
 * Migration result
 */
export interface MigrationResult {
    success: boolean;
    fromVersion: string;
    toVersion: string;
    migrationsApplied: string[];
    backupCreated: boolean;
    backupPath?: string;
    errors: string[];
    warnings: string[];
    configPath: string;
}
/**
 * Backward compatibility check result
 */
export interface CompatibilityCheckResult {
    isCompatible: boolean;
    version: string;
    supportedVersions: string[];
    deprecatedFeatures: string[];
    breakingChanges: string[];
    migrationRequired: boolean;
    migrationPath?: string[];
    recommendations: string[];
}
/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
    systemPromptEnabled: boolean;
    advancedWorkflow: boolean;
    enhancedSecurity: boolean;
    performanceOptimizations: boolean;
    experimentalFeatures: boolean;
    rolloutPercentage: number;
    targetEnvironments: string[];
}
/**
 * Default deployment environments
 */
export declare const DEFAULT_DEPLOYMENT_ENVIRONMENTS: Record<string, DeploymentEnvironment>;
/**
 * Default feature flag configuration
 */
export declare const DEFAULT_FEATURE_FLAGS: FeatureFlagConfig;
/**
 * Available migration scripts
 */
export declare const MIGRATION_SCRIPTS: MigrationScript[];
export declare class DeploymentManager {
    private environments;
    private migrations;
    constructor(environments?: Record<string, DeploymentEnvironment>, migrations?: MigrationScript[]);
    /**
     * Deploy configuration to specified environment
     */
    deployToEnvironment(config: SystemPromptConfig, environmentName: string, options?: {
        createBackup?: boolean;
        validateBeforeDeploy?: boolean;
        applyMigrations?: boolean;
        dryRun?: boolean;
    }): Promise<DeploymentResult>;
    /**
     * Apply migrations to configuration file
     */
    applyMigrations(configPath: string): MigrationResult;
    /**
     * Check backward compatibility
     */
    checkBackwardCompatibility(configPath: string): CompatibilityCheckResult;
    /**
     * Apply feature flags to configuration
     */
    private applyFeatureFlags;
    /**
     * Create backup of configuration file
     */
    private createBackup;
    /**
     * Find applicable migrations between versions
     */
    private findApplicableMigrations;
    /**
     * Get deployment environments
     */
    getEnvironments(): Record<string, DeploymentEnvironment>;
    /**
     * Get available migrations
     */
    getMigrations(): MigrationScript[];
    /**
     * Clean old backups
     */
    cleanOldBackups(backupDir: string, maxAge?: number): {
        success: boolean;
        deletedFiles: string[];
        errors: string[];
    };
}
/**
 * Create default deployment manager instance
 */
export declare function createDeploymentManager(): DeploymentManager;
/**
 * Quick deployment to environment
 */
export declare function deployToEnvironment(config: SystemPromptConfig, environment: string, options?: {
    createBackup?: boolean;
    validateBeforeDeploy?: boolean;
    dryRun?: boolean;
}): Promise<DeploymentResult>;
/**
 * Quick migration of configuration file
 */
export declare function migrateConfiguration(configPath: string): MigrationResult;
/**
 * Quick compatibility check
 */
export declare function checkCompatibility(configPath: string): CompatibilityCheckResult;
//# sourceMappingURL=deployment-manager.d.ts.map