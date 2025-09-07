/**
 * Configuration module exports for GAN Auditor Integration
 */

export {
  extractInlineConfig,
  parseJsonWithFallback,
  validateAndSanitizeConfig,
  mergeConfigurations,
  createDefaultConfig,
} from './config-parser.js';

export {
  ProductionCodexConfigSchema,
  DEFAULT_PRODUCTION_CODEX_CONFIG,
  PRODUCTION_CODEX_ENV_VARS,
  parseProductionCodexConfigFromEnv,
  validateProductionCodexConfig,
  createProductionCodexConfig,
} from './production-codex-config.js';

export {
  validateProductionConfiguration,
  generateProductionReadinessReport,
  ensureProductionReady,
} from './production-config-validator.js';

export type {
  ConfigParseResult,
  JsonParseResult,
  ConfigValidationResult,
  SanitizationResult,
} from '../types/validation-types.js';

export type {
  ProductionCodexConfig,
} from './production-codex-config.js';

export type {
  ProductionValidationResult,
  ProductionValidationOptions,
} from './production-config-validator.js';

export type {
  McpErrorCategory,
  McpErrorSeverity,
  McpErrorDiagnostic,
  McpStructuredErrorResponse,
} from '../types/mcp-error-response.js';

export {
  McpErrorResponseBuilder,
  createValidationError,
  createCodexError,
  createConfigurationError,
  createTimeoutError,
  createSessionError,
  createInternalError,
  toMcpToolResponse,
  createErrorResponseFromError,
} from '../types/mcp-error-response.js';