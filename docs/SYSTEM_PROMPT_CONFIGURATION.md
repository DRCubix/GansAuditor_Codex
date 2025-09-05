# System Prompt Configuration Guide

This guide covers the comprehensive configuration system for the GansAuditor_Codex system prompt integration.

## Overview

The system prompt integration provides a configurable, template-driven approach to adversarial code auditing with the "Kilo Code" identity. It supports variable substitution, intelligent completion criteria, and comprehensive validation.

## Configuration Structure

### Core Configuration Interface

```typescript
interface SystemPromptConfig {
  identity: {
    name: string;                    // Auditor identity name
    role: string;                    // Role description
    stance: 'adversarial' | 'collaborative' | 'constructive-adversarial';
    authority: 'spec-and-steering-ground-truth' | 'flexible' | 'advisory';
  };
  
  workflow: {
    steps: number;                   // Number of audit workflow steps (default: 8)
    enforceOrder: boolean;           // Enforce step execution order
    allowSkipping: boolean;          // Allow skipping steps
    evidenceRequired: boolean;       // Require evidence for findings
  };
  
  qualityFramework: {
    dimensions: number;              // Number of quality dimensions (default: 6)
    weightingScheme: 'project-standard' | 'custom' | 'balanced';
    scoringScale: '0-100' | '0-10' | 'letter-grade';
    aggregationMethod: 'weighted-average' | 'minimum' | 'geometric-mean';
  };
  
  completionCriteria: {
    tiers: number;                   // Number of completion tiers (default: 3)
    killSwitches: number;            // Number of kill switches (default: 3)
    shipGates: number;               // Number of ship gates (default: 5)
    stagnationThreshold: number;     // Stagnation detection threshold (0-1)
    maxIterations: number;           // Maximum audit iterations
  };
  
  integration: {
    sessionManagement: boolean;      // Enable session management
    codexIntegration: boolean;       // Enable Codex CLI integration
    contextAwareness: boolean;       // Enable context awareness
    performanceOptimization: boolean; // Enable performance optimizations
  };
  
  security: {
    sanitizePII: boolean;           // Sanitize personally identifiable information
    validateCommands: boolean;       // Validate command execution
    respectPermissions: boolean;     // Respect file permissions
    flagVulnerabilities: boolean;    // Flag security vulnerabilities
  };
  
  performance: {
    contextTokenLimit: number;       // Maximum context tokens
    auditTimeoutMs: number;         // Audit timeout in milliseconds
    enableCaching: boolean;         // Enable prompt caching
    enableProgressTracking: boolean; // Enable progress tracking
  };
}
```

## Default Configuration

The system provides sensible defaults optimized for production use:

```typescript
const DEFAULT_SYSTEM_PROMPT_CONFIG: SystemPromptConfig = {
  identity: {
    name: 'Kilo Code',
    role: 'Adversarial Auditor',
    stance: 'constructive-adversarial',
    authority: 'spec-and-steering-ground-truth',
  },
  
  workflow: {
    steps: 8,                        // Standard GAN audit workflow
    enforceOrder: true,
    allowSkipping: false,
    evidenceRequired: true,
  },
  
  qualityFramework: {
    dimensions: 6,                   // Comprehensive quality assessment
    weightingScheme: 'project-standard',
    scoringScale: '0-100',
    aggregationMethod: 'weighted-average',
  },
  
  completionCriteria: {
    tiers: 3,                       // Excellence, High Quality, Acceptable
    killSwitches: 3,                // Hard Stop, Stagnation, Critical Issues
    shipGates: 5,                   // Comprehensive quality gates
    stagnationThreshold: 0.95,      // 95% similarity threshold
    maxIterations: 25,              // Maximum audit cycles
  },
  
  integration: {
    sessionManagement: true,
    codexIntegration: true,
    contextAwareness: true,
    performanceOptimization: true,
  },
  
  security: {
    sanitizePII: true,              // Always sanitize PII
    validateCommands: true,
    respectPermissions: true,
    flagVulnerabilities: true,
  },
  
  performance: {
    contextTokenLimit: 200000,      // 200K token context window
    auditTimeoutMs: 30000,         // 30 second timeout
    enableCaching: true,
    enableProgressTracking: true,
  },
};
```

## Environment Variable Configuration

Configure the system using environment variables:

### Core Settings
```bash
# Identity configuration
GAN_AUDITOR_IDENTITY_NAME="Kilo Code"
GAN_AUDITOR_STANCE="constructive-adversarial"

# Completion criteria
GAN_AUDITOR_MAX_ITERATIONS=25
GAN_AUDITOR_STAGNATION_THRESHOLD=0.95

# Performance settings
GAN_AUDITOR_CONTEXT_TOKEN_LIMIT=200000
GAN_AUDITOR_AUDIT_TIMEOUT_MS=30000

# Security settings
GAN_AUDITOR_SANITIZE_PII=true
GAN_AUDITOR_VALIDATE_COMMANDS=true

# Workflow settings
GAN_AUDITOR_ENFORCE_WORKFLOW_ORDER=true
GAN_AUDITOR_EVIDENCE_REQUIRED=true

# Caching settings
GAN_AUDITOR_ENABLE_PROMPT_CACHING=true
GAN_AUDITOR_PROMPT_CACHE_MAX_AGE=300000
```

## Configuration Validation

The system provides comprehensive validation with three levels of feedback:

### Validation Levels

1. **Errors**: Configuration issues that prevent operation
2. **Warnings**: Suboptimal settings that may impact performance
3. **Recommendations**: Suggestions for improved configuration

### Example Validation

```typescript
import { validateSystemPromptConfig } from './system-prompt-config.js';

const validation = validateSystemPromptConfig(config);

if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Configuration warnings:', validation.warnings);
}

if (validation.recommendations.length > 0) {
  console.info('Configuration recommendations:', validation.recommendations);
}
```

## Template System

### Variable Substitution

The template system supports sophisticated variable substitution:

```markdown
# Template with variables
You are **${IDENTITY_NAME | default: Kilo Code}** — the ${IDENTITY_ROLE | default: Adversarial Auditor}.

**Current Status**: Loop ${CURRENT_LOOP | default: 0}/${MAX_ITERATIONS | default: 25}
**Context Budget**: ${MODEL_CONTEXT_TOKENS | default: 200000} tokens
```

### Supported Variables

- **Identity**: `IDENTITY_NAME`, `IDENTITY_ROLE`, `IDENTITY_STANCE`, `IDENTITY_AUTHORITY`
- **Session**: `SESSION_ID`, `CURRENT_LOOP`, `MAX_ITERATIONS`
- **Performance**: `MODEL_CONTEXT_TOKENS`, `AUDIT_TIMEOUT_MS`, `STAGNATION_THRESHOLD`
- **Context**: `PROJECT_CONTEXT`, `STEERING_RULES`, `SPEC_REQUIREMENTS`
- **Rendered Sections**: `QUALITY_DIMENSIONS_RENDERED`, `COMPLETION_TIERS_RENDERED`, `KILL_SWITCHES_RENDERED`

### Template Validation

Templates are validated for:
- Required sections presence
- Variable syntax correctness
- Structural completeness
- Content length appropriateness

## Usage Examples

### Basic Setup

```typescript
import { SystemPromptManager } from './system-prompt-manager.js';

const manager = new SystemPromptManager({
  enableCaching: true,
  cacheMaxAge: 300000,
});

const rendered = await manager.renderSystemPrompt(thought, session, projectContext);
```

### Custom Configuration

```typescript
import { 
  createProductionSystemPromptConfig,
  createDevelopmentSystemPromptConfig 
} from './prompt-utils.js';

// Production configuration
const prodConfig = createProductionSystemPromptConfig();

// Development configuration (faster, more lenient)
const devConfig = createDevelopmentSystemPromptConfig();

const manager = new SystemPromptManager({
  config: process.env.NODE_ENV === 'production' ? prodConfig : devConfig,
});
```

### Environment-Based Setup

```typescript
import { 
  loadSystemPromptConfigFromEnv,
  mergeSystemPromptConfig 
} from './system-prompt-config.js';

const envConfig = loadSystemPromptConfigFromEnv();
const finalConfig = mergeSystemPromptConfig(envConfig);

const manager = new SystemPromptManager({
  config: finalConfig,
});
```

### Integration with GAN Auditor

```typescript
import { createFullyIntegratedGanAuditor } from './prompt-utils.js';

const auditor = createFullyIntegratedGanAuditor({
  systemPromptConfig: {
    identity: {
      name: 'Custom Auditor',
      role: 'Quality Assurance',
      stance: 'constructive-adversarial',
      authority: 'spec-and-steering-ground-truth',
    },
    completionCriteria: {
      maxIterations: 15,
      stagnationThreshold: 0.90,
    },
  },
});
```

## Performance Optimization

### Caching Strategy

- **Prompt Caching**: Rendered prompts cached by content hash
- **Cache Invalidation**: Automatic invalidation on configuration changes
- **Cache Statistics**: Monitoring for hit rates and performance

### Resource Management

- **Token Limits**: Intelligent context pruning for large repositories
- **Timeout Handling**: Configurable timeouts with graceful degradation
- **Memory Management**: Automatic cleanup of expired cache entries

### Configuration Recommendations

1. **Development**: Lower iterations (10-15), shorter timeouts (15s), smaller context (100K tokens)
2. **Production**: Standard iterations (25), full timeouts (30s), full context (200K tokens)
3. **CI/CD**: Fast iterations (5-10), very short timeouts (10s), minimal context (50K tokens)

## Security Considerations

### Data Protection

- **PII Sanitization**: Automatic detection and replacement of sensitive data
- **Secret Detection**: Prevents exposure of API keys and credentials
- **Permission Respect**: Validates file access and command execution

### Configuration Security

- **Validation**: All configuration values validated before use
- **Sanitization**: Input sanitization for all user-provided values
- **Audit Trail**: Logging of security-sensitive operations

## Troubleshooting

### Common Issues

1. **Template Not Found**: Check `promptTemplatePath` configuration
2. **Configuration Errors**: Use `validateSystemPromptConfig()` to check setup
3. **Performance Issues**: Adjust `contextTokenLimit` and `auditTimeoutMs`
4. **Cache Issues**: Clear cache with `systemPromptManager.clearCache()`

### Debug Logging

```bash
# Enable debug logging
GAN_AUDITOR_PROMPT_DEBUG_LOGGING=true
GAN_AUDITOR_LOG_PROMPT_PERFORMANCE=true
GAN_AUDITOR_LOG_COMPLETION_ANALYSIS=true
```

### Validation Commands

```typescript
import { 
  validateSystemPromptSetup,
  validateSystemPromptTemplate 
} from './prompt-utils.js';

// Validate complete setup
const setupValidation = validateSystemPromptSetup();
if (!setupValidation.isValid) {
  console.error('Setup issues:', setupValidation.errors);
}

// Validate template file
const templateValidation = await validateSystemPromptTemplate();
if (!templateValidation.isValid) {
  console.error('Template issues:', templateValidation.errors);
}
```

## Migration Guide

### From Basic to System Prompt

1. **Install Dependencies**: Ensure all prompt modules are available
2. **Update Configuration**: Add system prompt configuration
3. **Update Auditor Creation**: Use `createFullyIntegratedGanAuditor()`
4. **Test Integration**: Validate with existing audit workflows
5. **Monitor Performance**: Check metrics and adjust configuration

### Configuration Migration

```typescript
// Before: Basic GAN Auditor
const auditor = new GanAuditor(config);

// After: System Prompt Integration
const auditor = createFullyIntegratedGanAuditor({
  ganAuditorConfig: config,
  systemPromptConfig: {
    // Add system prompt configuration
  },
});
```

## Best Practices

1. **Configuration Management**: Use environment variables for deployment-specific settings
2. **Template Customization**: Customize templates for project-specific requirements
3. **Performance Monitoring**: Monitor cache hit rates and audit performance
4. **Security Compliance**: Always enable PII sanitization and command validation
5. **Gradual Rollout**: Use feature flags for gradual system prompt adoption

## API Reference

See the individual module documentation for detailed API reference:

- [`SystemPromptManager`](./system-prompt-manager.ts) - Core prompt management
- [`SystemPromptConfig`](./system-prompt-config.ts) - Configuration interfaces
- [`PromptDrivenGanAuditor`](./prompt-integration.ts) - Integration layer
- [`PromptUtils`](./prompt-utils.ts) - Utility functions