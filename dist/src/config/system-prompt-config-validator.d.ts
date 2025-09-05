/**
 * System Prompt Configuration Validator
 *
 * This module provides comprehensive validation for system prompt configuration,
 * including environment variable validation, file validation, and deployment checks.
 *
 * Requirements: 11.1 - Configuration validation and error reporting
 */
import { SystemPromptConfig, SystemPromptConfigValidation, ConfigValidationOptions, getSystemPromptConfigSummary } from '../prompts/system-prompt-config.js';
/**
 * Environment validation result
 */
export interface EnvironmentValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
    missingVars: string[];
    invalidVars: Array<{
        name: string;
        value: string;
        issue: string;
        suggestion?: string;
    }>;
    summary: {
        totalVars: number;
        validVars: number;
        invalidVars: number;
        missingVars: number;
    };
}
/**
 * File validation result
 */
export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
    fileExists: boolean;
    isReadable: boolean;
    isWritable: boolean;
    fileSize: number;
    lastModified: Date | null;
    configValidation: SystemPromptConfigValidation | null;
}
/**
 * Deployment readiness result
 */
export interface DeploymentReadinessResult {
    isReady: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
    environment: 'development' | 'staging' | 'production' | 'unknown';
    configSources: {
        defaults: boolean;
        configFile: boolean;
        environment: boolean;
    };
    securityChecks: {
        piiSanitizationEnabled: boolean;
        commandValidationEnabled: boolean;
        permissionsRespected: boolean;
        vulnerabilityDetectionEnabled: boolean;
    };
    performanceChecks: {
        timeoutReasonable: boolean;
        tokenLimitReasonable: boolean;
        cachingEnabled: boolean;
        progressTrackingEnabled: boolean;
    };
}
/**
 * Comprehensive configuration validation result
 */
export interface ComprehensiveValidationResult {
    isValid: boolean;
    config: SystemPromptConfig;
    environmentValidation: EnvironmentValidationResult;
    fileValidation: FileValidationResult | null;
    deploymentReadiness: DeploymentReadinessResult;
    summary: {
        totalErrors: number;
        totalWarnings: number;
        totalRecommendations: number;
        configSummary: ReturnType<typeof getSystemPromptConfigSummary>;
    };
}
/**
 * Validate all system prompt environment variables
 */
export declare function validateEnvironmentVariables(): EnvironmentValidationResult;
/**
 * Validate configuration file
 */
export declare function validateConfigurationFile(filePath: string, options?: Partial<ConfigValidationOptions>): FileValidationResult;
/**
 * Check deployment readiness
 */
export declare function validateDeploymentReadiness(configFilePath?: string): DeploymentReadinessResult;
/**
 * Perform comprehensive validation of system prompt configuration
 */
export declare function validateSystemPromptConfiguration(configFilePath?: string, options?: Partial<ConfigValidationOptions>): ComprehensiveValidationResult;
/**
 * Generate validation report
 */
export declare function generateValidationReport(validation: ComprehensiveValidationResult): string;
//# sourceMappingURL=system-prompt-config-validator.d.ts.map