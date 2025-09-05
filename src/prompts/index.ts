/**
 * System Prompt Module for GansAuditor_Codex
 * 
 * This module provides comprehensive system prompt capabilities for the
 * GansAuditor_Codex MCP server, including prompt management, configuration,
 * performance optimization, and integration with the existing architecture.
 */

// Core system prompt functionality
export {
  SystemPromptManager,
  type RenderedSystemPrompt,
  type PromptVariables,
  type SystemPromptManagerConfig,
  type CompletionAnalysis,
  type NextAction,
  createSystemPromptManager,
  createSystemPromptManagerFromEnv,
} from './system-prompt-manager.js';

// Configuration and types
export {
  type SystemPromptConfig,
  type QualityDimension,
  type CompletionTier,
  type KillSwitch,
  DEFAULT_SYSTEM_PROMPT_CONFIG,
  DEFAULT_QUALITY_DIMENSIONS,
  DEFAULT_COMPLETION_TIERS,
  DEFAULT_KILL_SWITCHES,
  SYSTEM_PROMPT_ENV_VARS,
  validateSystemPromptConfig,
  mergeSystemPromptConfig,
  loadSystemPromptConfigFromEnv,
} from './system-prompt-config.js';

// Integration layer
export {
  PromptDrivenGanAuditor,
  type PromptDrivenAuditConfig,
  type PromptEnhancedAuditRequest,
  type PromptEnhancedAuditResult,
  createPromptDrivenGanAuditor,
  createPromptDrivenGanAuditorFromEnv,
} from './prompt-integration.js';

// Performance and resource management
export { 
  PromptTimeoutManager, 
  createPromptTimeoutManager,
  PromptExecutionStage,
  type PromptExecutionContext,
  type PromptTimeoutConfig,
  type TimeoutResult,
  type ResourceUsage,
  DEFAULT_PROMPT_TIMEOUT_CONFIG,
} from './prompt-timeout-manager.js';

export {
  ContextOptimizer,
  createContextOptimizer,
  ContextItemType,
  ContextPriority,
  type ContextItem,
  type ContextOptimizerConfig,
  type OptimizationResult,
  type OptimizationStats,
  DEFAULT_CONTEXT_OPTIMIZER_CONFIG,
} from './context-optimizer.js';

export {
  PromptCacheManager,
  createPromptCacheManager,
  type PromptCacheContext,
  type CachedPromptResult,
  type PromptCacheConfig,
  type PromptCacheStats,
  DEFAULT_PROMPT_CACHE_CONFIG,
} from './prompt-cache-manager.js';

export {
  PromptResourceManager,
  createPromptResourceManager,
  type ResourceMetrics,
  type ResourceLimits,
  type CleanupTask,
  type PromptResourceManagerConfig,
  type CleanupResult,
  DEFAULT_RESOURCE_MANAGER_CONFIG,
} from './prompt-resource-manager.js';