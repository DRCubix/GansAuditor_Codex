/**
 * Production Configuration Validator
 *
 * This module validates that the system configuration meets production requirements,
 * specifically ensuring no mock functionality is enabled and all required Codex
 * CLI settings are properly configured.
 *
 * Requirements: 1.4 - Production configuration validation
 */
import { ProductionCodexConfig } from './production-codex-config.js';
export interface ProductionValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    config?: ProductionCodexConfig;
}
export interface ProductionValidationOptions {
    strict: boolean;
    skipCodexValidation: boolean;
}
/**
 * Validate that the current configuration meets production requirements
 */
export declare function validateProductionConfiguration(options?: ProductionValidationOptions): Promise<ProductionValidationResult>;
/**
 * Generate a production readiness report
 */
export declare function generateProductionReadinessReport(result: ProductionValidationResult): string;
/**
 * Validate configuration and throw if not production-ready
 */
export declare function ensureProductionReady(options?: ProductionValidationOptions): Promise<ProductionCodexConfig>;
//# sourceMappingURL=production-config-validator.d.ts.map