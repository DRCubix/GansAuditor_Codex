/**
 * Production Codex CLI Configuration
 *
 * This module defines production-specific configuration for Codex CLI integration,
 * removing all mock functionality and adding strict validation requirements.
 *
 * Requirements: 1.4 - Production configuration validation
 */
import { z } from 'zod';
/**
 * Production Codex CLI configuration schema with strict validation
 */
export declare const ProductionCodexConfigSchema: z.ZodObject<{
    executable: z.ZodString;
    executablePaths: z.ZodDefault<z.ZodArray<z.ZodString>>;
    timeout: z.ZodDefault<z.ZodNumber>;
    maxConcurrentProcesses: z.ZodDefault<z.ZodNumber>;
    processCleanupTimeout: z.ZodDefault<z.ZodNumber>;
    preserveEnvironmentVars: z.ZodDefault<z.ZodArray<z.ZodString>>;
    additionalEnvironmentVars: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    retryDelay: z.ZodDefault<z.ZodNumber>;
    failFast: z.ZodDefault<z.ZodLiteral<true>>;
    healthCheckInterval: z.ZodDefault<z.ZodNumber>;
    performanceMetricsEnabled: z.ZodDefault<z.ZodBoolean>;
    requireCodexAvailable: z.ZodDefault<z.ZodLiteral<true>>;
    validateOnStartup: z.ZodDefault<z.ZodLiteral<true>>;
    allowMockFallback: z.ZodDefault<z.ZodLiteral<false>>;
}, z.core.$strip>;
/**
 * Production Codex CLI configuration type
 */
export type ProductionCodexConfig = z.infer<typeof ProductionCodexConfigSchema>;
/**
 * Default production configuration
 */
export declare const DEFAULT_PRODUCTION_CODEX_CONFIG: ProductionCodexConfig;
/**
 * Environment variable names for production Codex configuration
 */
export declare const PRODUCTION_CODEX_ENV_VARS: {
    readonly CODEX_EXECUTABLE: "CODEX_EXECUTABLE";
    readonly CODEX_EXECUTABLE_PATHS: "CODEX_EXECUTABLE_PATHS";
    readonly CODEX_TIMEOUT: "CODEX_TIMEOUT";
    readonly CODEX_MAX_CONCURRENT_PROCESSES: "CODEX_MAX_CONCURRENT_PROCESSES";
    readonly CODEX_PROCESS_CLEANUP_TIMEOUT: "CODEX_PROCESS_CLEANUP_TIMEOUT";
    readonly CODEX_PRESERVE_ENV_VARS: "CODEX_PRESERVE_ENV_VARS";
    readonly CODEX_ADDITIONAL_ENV_VARS: "CODEX_ADDITIONAL_ENV_VARS";
    readonly CODEX_MAX_RETRIES: "CODEX_MAX_RETRIES";
    readonly CODEX_RETRY_DELAY: "CODEX_RETRY_DELAY";
    readonly CODEX_FAIL_FAST: "CODEX_FAIL_FAST";
    readonly CODEX_HEALTH_CHECK_INTERVAL: "CODEX_HEALTH_CHECK_INTERVAL";
    readonly CODEX_PERFORMANCE_METRICS_ENABLED: "CODEX_PERFORMANCE_METRICS_ENABLED";
    readonly CODEX_REQUIRE_AVAILABLE: "CODEX_REQUIRE_AVAILABLE";
    readonly CODEX_VALIDATE_ON_STARTUP: "CODEX_VALIDATE_ON_STARTUP";
    readonly CODEX_ALLOW_MOCK_FALLBACK: "CODEX_ALLOW_MOCK_FALLBACK";
};
/**
 * Parse production Codex configuration from environment variables
 */
export declare function parseProductionCodexConfigFromEnv(): ProductionCodexConfig;
/**
 * Validate that production configuration meets requirements
 */
export declare function validateProductionCodexConfig(config: ProductionCodexConfig): void;
/**
 * Create production configuration with validation
 */
export declare function createProductionCodexConfig(overrides?: Partial<ProductionCodexConfig>): ProductionCodexConfig;
//# sourceMappingURL=production-codex-config.d.ts.map