/**
 * System Prompt Configuration for GansAuditor_Codex
 *
 * This module provides comprehensive configuration management for the
 * GAN Auditor system prompt, including environment variable integration,
 * file-based configuration, validation, and deployment support.
 *
 * Requirements: 11.1 - Configuration management
 */
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
        stagnationThreshold: number;
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
export declare const DEFAULT_SYSTEM_PROMPT_CONFIG: SystemPromptConfig;
/**
 * Default quality dimensions with weights and criteria
 */
export declare const DEFAULT_QUALITY_DIMENSIONS: QualityDimension[];
/**
 * Default completion tiers
 */
export declare const DEFAULT_COMPLETION_TIERS: CompletionTier[];
/**
 * Default kill switches
 */
export declare const DEFAULT_KILL_SWITCHES: KillSwitch[];
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
export declare const SYSTEM_PROMPT_ENV_VARS: {
    readonly GAN_AUDITOR_PROMPT_ENABLED: "enabled";
    readonly GAN_AUDITOR_PROMPT_VERSION: "version";
    readonly GAN_AUDITOR_PROMPT_CONFIG_FILE: "configFile";
    readonly GAN_AUDITOR_IDENTITY_NAME: "identity.name";
    readonly GAN_AUDITOR_IDENTITY_ROLE: "identity.role";
    readonly GAN_AUDITOR_STANCE: "identity.stance";
    readonly GAN_AUDITOR_AUTHORITY: "identity.authority";
    readonly GAN_AUDITOR_WORKFLOW_STEPS: "workflow.steps";
    readonly GAN_AUDITOR_ENFORCE_WORKFLOW_ORDER: "workflow.enforceOrder";
    readonly GAN_AUDITOR_ALLOW_WORKFLOW_SKIPPING: "workflow.allowSkipping";
    readonly GAN_AUDITOR_EVIDENCE_REQUIRED: "workflow.evidenceRequired";
    readonly GAN_AUDITOR_QUALITY_DIMENSIONS: "qualityFramework.dimensions";
    readonly GAN_AUDITOR_WEIGHTING_SCHEME: "qualityFramework.weightingScheme";
    readonly GAN_AUDITOR_SCORING_SCALE: "qualityFramework.scoringScale";
    readonly GAN_AUDITOR_AGGREGATION_METHOD: "qualityFramework.aggregationMethod";
    readonly GAN_AUDITOR_COMPLETION_TIERS: "completionCriteria.tiers";
    readonly GAN_AUDITOR_KILL_SWITCHES: "completionCriteria.killSwitches";
    readonly GAN_AUDITOR_SHIP_GATES: "completionCriteria.shipGates";
    readonly GAN_AUDITOR_STAGNATION_THRESHOLD: "completionCriteria.stagnationThreshold";
    readonly GAN_AUDITOR_MAX_ITERATIONS: "completionCriteria.maxIterations";
    readonly GAN_AUDITOR_SESSION_MANAGEMENT: "integration.sessionManagement";
    readonly GAN_AUDITOR_CODEX_INTEGRATION: "integration.codexIntegration";
    readonly GAN_AUDITOR_CONTEXT_AWARENESS: "integration.contextAwareness";
    readonly GAN_AUDITOR_PERFORMANCE_OPTIMIZATION: "integration.performanceOptimization";
    readonly GAN_AUDITOR_SANITIZE_PII: "security.sanitizePII";
    readonly GAN_AUDITOR_VALIDATE_COMMANDS: "security.validateCommands";
    readonly GAN_AUDITOR_RESPECT_PERMISSIONS: "security.respectPermissions";
    readonly GAN_AUDITOR_FLAG_VULNERABILITIES: "security.flagVulnerabilities";
    readonly GAN_AUDITOR_CONTEXT_TOKEN_LIMIT: "performance.contextTokenLimit";
    readonly GAN_AUDITOR_AUDIT_TIMEOUT_MS: "performance.auditTimeoutMs";
    readonly GAN_AUDITOR_ENABLE_CACHING: "performance.enableCaching";
    readonly GAN_AUDITOR_ENABLE_PROGRESS_TRACKING: "performance.enableProgressTracking";
};
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
export declare function validateSystemPromptConfig(config: Partial<SystemPromptConfig>): SystemPromptConfigValidation;
/**
 * Merge configuration with defaults
 */
export declare function mergeSystemPromptConfig(config: Partial<SystemPromptConfig>): SystemPromptConfig;
/**
 * Load configuration from file with validation
 */
export declare function loadSystemPromptConfigFromFile(filePath: string, options?: Partial<ConfigValidationOptions>): {
    config: SystemPromptConfig | null;
    validation: SystemPromptConfigValidation;
    fileExists: boolean;
};
/**
 * Save configuration to file with backup
 */
export declare function saveSystemPromptConfigToFile(config: SystemPromptConfig, filePath: string, options?: Partial<ConfigDeploymentOptions>): {
    success: boolean;
    backupPath?: string;
    errors: string[];
    warnings: string[];
};
/**
 * Create default configuration file
 */
export declare function createSystemPromptConfigFile(filePath: string, environment?: 'development' | 'staging' | 'production'): {
    success: boolean;
    errors: string[];
    warnings: string[];
};
/**
 * Load configuration from environment variables with comprehensive parsing
 */
export declare function loadSystemPromptConfigFromEnv(): Partial<SystemPromptConfig>;
/**
 * Load configuration from multiple sources with precedence
 * Precedence: Environment Variables > Config File > Defaults
 */
export declare function loadSystemPromptConfig(configFilePath?: string, options?: Partial<ConfigValidationOptions>): {
    config: SystemPromptConfig;
    validation: SystemPromptConfigValidation;
    sources: {
        defaults: boolean;
        configFile: boolean;
        environment: boolean;
    };
};
/**
 * Get configuration summary for debugging and monitoring
 */
export declare function getSystemPromptConfigSummary(config: SystemPromptConfig): {
    identity: string;
    workflow: string;
    qualityFramework: string;
    completionCriteria: string;
    integration: string[];
    security: string[];
    performance: string;
};
/**
 * Generate environment variable documentation
 */
export declare function generateEnvVarDocumentation(): string;
//# sourceMappingURL=system-prompt-config.d.ts.map