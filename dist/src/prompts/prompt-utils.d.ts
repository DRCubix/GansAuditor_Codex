/**
 * System Prompt Utilities for GansAuditor_Codex
 *
 * This module provides utility functions for setting up and validating
 * the system prompt integration with GansAuditor_Codex.
 */
import { PromptDrivenGanAuditor, type PromptDrivenAuditConfig } from './prompt-integration.js';
import { type SystemPromptManagerConfig } from './system-prompt-manager.js';
import { type SystemPromptConfig } from './system-prompt-config.js';
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
export declare function createFullyIntegratedGanAuditor(config?: {
    ganAuditorConfig?: any;
    systemPromptConfig?: Partial<SystemPromptConfig>;
    promptDrivenConfig?: PromptDrivenAuditConfig;
}): PromptDrivenGanAuditor;
/**
 * Create system prompt from template with custom variables
 */
export declare function createSystemPromptFromTemplate(templatePath?: string, variables?: Record<string, any>): Promise<string>;
/**
 * Validate system prompt setup and configuration
 */
export declare function validateSystemPromptSetup(config?: {
    systemPromptConfig?: Partial<SystemPromptConfig>;
    promptManagerConfig?: SystemPromptManagerConfig;
    integrationConfig?: PromptDrivenAuditConfig;
}): SystemPromptSetupValidation;
/**
 * Get system prompt configuration from environment with validation
 */
export declare function getValidatedSystemPromptConfig(): {
    config: SystemPromptConfig;
    validation: SystemPromptSetupValidation;
};
/**
 * Create development-friendly system prompt configuration
 */
export declare function createDevelopmentSystemPromptConfig(): SystemPromptConfig;
/**
 * Create production-ready system prompt configuration
 */
export declare function createProductionSystemPromptConfig(): SystemPromptConfig;
/**
 * Validate system prompt template file
 */
export declare function validateSystemPromptTemplate(templatePath?: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    templateInfo: {
        path: string;
        size: number;
        sectionsFound: number;
        variablesFound: number;
    };
}>;
/**
 * Log system prompt setup information
 */
export declare function logSystemPromptSetup(config: SystemPromptConfig, validation: SystemPromptSetupValidation): void;
//# sourceMappingURL=prompt-utils.d.ts.map