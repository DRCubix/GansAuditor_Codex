# GansAuditor_Codex System Prompt Integration

This module provides comprehensive system prompt capabilities for the GansAuditor_Codex MCP server, transforming it into an intelligent, adversarial code auditor with structured workflows, completion criteria, and adaptive feedback mechanisms.

## ✅ Task 1 Implementation Complete

**Core System Prompt Template and Configuration** - All requirements implemented:

- ✅ **System prompt template file with Kilo Code identity and role definition**
- ✅ **Prompt configuration interface and default values** 
- ✅ **Prompt template rendering engine with variable substitution**
- ✅ **Validation for prompt template structure and required sections**

### Key Features Implemented

1. **Enhanced Template System**: Variable substitution with default values, structured sections validation
2. **Comprehensive Configuration**: Type-safe configuration with validation and environment variable support
3. **Intelligent Rendering**: Context-aware template rendering with caching and performance optimization
4. **Robust Validation**: Multi-level validation for templates, configuration, and rendered output

## Overview

The system prompt integration re-engineers the original template prompt specifically for the GansAuditor_Codex architecture, providing:

- **Kilo Code Identity**: Adversarial auditor persona with clear role definition
- **8-Step Audit Workflow**: Structured process from initialization to verdict
- **Multi-Dimensional Quality Assessment**: 6 quality dimensions with weighted scoring
- **Intelligent Completion Criteria**: Tiered completion with kill switches
- **Evidence-Based Feedback**: Structured output with concrete examples
- **Session Management Integration**: Context-aware auditing across iterations
- **Performance Optimization**: Caching, timeout management, and resource control

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    System Prompt Integration                    │
├─────────────────────────────────────────────────────────────────┤
│  PromptDrivenGanAuditor                                        │
│  ├── SystemPromptManager                                       │
│  │   ├── Template Rendering                                    │
│  │   ├── Variable Substitution                                 │
│  │   ├── Completion Analysis                                   │
│  │   └── Response Processing                                   │
│  └── Integration Layer                                         │
│      ├── Session Management                                    │
│      ├── Context Gathering                                     │
│      ├── Codex Enhancement                                     │
│      └── Error Handling                                        │
├─────────────────────────────────────────────────────────────────┤
│                 Existing GansAuditor_Codex                     │
│  ├── SynchronousAuditEngine                                   │
│  ├── SessionManager                                           │
│  ├── CodexJudge                                               │
│  ├── ContextPacker                                            │
│  └── CompletionEvaluator                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. SystemPromptManager

Manages prompt rendering, caching, and context injection:

```typescript
import { SystemPromptManager } from './system-prompt-manager.js';

const manager = new SystemPromptManager({
  promptTemplatePath: './gan-auditor-system-prompt.md',
  enableCaching: true,
  cacheMaxAge: 300000,
});

const renderedPrompt = await manager.renderSystemPrompt(thought, session, projectContext);
```

### 2. PromptDrivenGanAuditor

Wraps existing GAN auditor with system prompt capabilities:

```typescript
import { PromptDrivenGanAuditor } from './prompt-integration.js';
import { GanAuditor } from '../auditor/gan-auditor.js';

const baseAuditor = new GanAuditor();
const promptDrivenAuditor = new PromptDrivenGanAuditor(baseAuditor, {
  enableSystemPrompt: true,
  integrationConfig: {
    enhanceCodexRequests: true,
    processResponses: true,
    manageCompletion: true,
    trackProgress: true,
  },
});
```

### 3. Configuration System

Comprehensive configuration with environment variable support:

```typescript
import { 
  loadSystemPromptConfigFromEnv,
  validateSystemPromptConfig,
  mergeSystemPromptConfig 
} from './system-prompt-config.js';

const envConfig = loadSystemPromptConfigFromEnv();
const config = mergeSystemPromptConfig(envConfig);
const validation = validateSystemPromptConfig(config);
```

## System Prompt Features

### Kilo Code Identity

The system prompt establishes "Kilo Code" as the adversarial auditor with:

- **Clear Role Definition**: Validates work without modifying product code
- **Adversarial Stance**: Constructive but thorough in finding issues
- **Authority Structure**: Treats Spec and Steering as ground truth
- **Scope Boundaries**: Proposes fixes but doesn't change application code

### 8-Step Audit Workflow

1. **INIT**: Initialize audit context and load requirements
2. **REPRO**: Establish deterministic reproduction steps
3. **STATIC**: Run lint/format/type-check and static analysis
4. **TESTS**: Execute tests and identify coverage gaps
5. **DYNAMIC**: Perform runtime validation and security checks
6. **CONFORM**: Verify conformance with project standards
7. **TRACE**: Map implementation to requirements
8. **VERDICT**: Calculate scores and determine ship/no-ship

### Multi-Dimensional Quality Assessment

| Dimension | Weight | Focus Areas |
|-----------|--------|-------------|
| Correctness & Completeness | 30% | ACs met, edge cases, error handling |
| Tests | 20% | Coverage, quality, meaningful assertions |
| Style & Conventions | 15% | Lint/format, naming, documentation |
| Security | 15% | Input validation, secrets, safe defaults |
| Performance | 10% | Bottlenecks, efficiency, optimization |
| Docs & Traceability | 10% | Documentation, ADRs, requirements mapping |

### Intelligent Completion Criteria

**Tiered Completion:**
- **Tier 1**: Score ≥ 95% at 10+ loops → "pass" (Excellence)
- **Tier 2**: Score ≥ 90% at 15+ loops → "pass" (High Quality)
- **Tier 3**: Score ≥ 85% at 20+ loops → "pass" (Acceptable)

**Kill Switches:**
- **Hard Stop**: 25 loops reached → Force termination
- **Stagnation**: >95% similarity after 10 loops → Alternative approaches
- **Critical Persistence**: Critical issues after 15+ loops → Manual review

## Usage Examples

### Basic Setup

```typescript
import { createFullyIntegratedGanAuditor } from './prompt-utils.js';

// Create with default configuration
const auditor = createFullyIntegratedGanAuditor();

// Audit a thought
const result = await auditor.auditThought({
  thought: "// Your code here",
  thoughtNumber: 1,
  totalThoughts: 1,
  nextThoughtNeeded: false,
}, 'session-123');
```

### Custom Configuration

```typescript
import { 
  createFullyIntegratedGanAuditor,
  createProductionSystemPromptConfig 
} from './prompt-utils.js';

const auditor = createFullyIntegratedGanAuditor({
  systemPromptConfig: createProductionSystemPromptConfig(),
  promptDrivenConfig: {
    enableSystemPrompt: true,
    integrationConfig: {
      enhanceCodexRequests: true,
      processResponses: true,
      manageCompletion: true,
      trackProgress: true,
    },
  },
});
```

### Environment-Based Setup

```typescript
import { createPromptDrivenGanAuditorFromEnv } from './prompt-integration.js';
import { GanAuditor } from '../auditor/gan-auditor.js';

// Load configuration from environment variables
const baseAuditor = new GanAuditor();
const auditor = createPromptDrivenGanAuditorFromEnv(baseAuditor);
```

### Validation and Debugging

```typescript
import { 
  validateSystemPromptSetup,
  logSystemPromptSetup,
  getValidatedSystemPromptConfig 
} from './prompt-utils.js';

// Validate setup
const { config, validation } = getValidatedSystemPromptConfig();
logSystemPromptSetup(config, validation);

if (!validation.isValid) {
  console.error('Setup errors:', validation.errors);
}
```

## Configuration

### Environment Variables

Key environment variables for system prompt configuration:

```bash
# Core settings
GAN_AUDITOR_ENABLE_SYSTEM_PROMPT=true
GAN_AUDITOR_IDENTITY_NAME="Kilo Code"
GAN_AUDITOR_STANCE=constructive-adversarial

# Completion criteria
GAN_AUDITOR_MAX_ITERATIONS=25
GAN_AUDITOR_STAGNATION_THRESHOLD=0.95

# Performance
GAN_AUDITOR_CONTEXT_TOKEN_LIMIT=200000
GAN_AUDITOR_AUDIT_TIMEOUT_MS=30000
GAN_AUDITOR_ENABLE_PROMPT_CACHING=true

# Security
GAN_AUDITOR_SANITIZE_PII=true
GAN_AUDITOR_VALIDATE_COMMANDS=true
```

See `config/system-prompt.example.env` for complete configuration options.

### Programmatic Configuration

```typescript
import { SystemPromptConfig } from './system-prompt-config.js';

const config: SystemPromptConfig = {
  identity: {
    name: 'Kilo Code',
    role: 'Adversarial Auditor',
    stance: 'constructive-adversarial',
    authority: 'spec-and-steering-ground-truth',
  },
  completionCriteria: {
    tiers: 3,
    killSwitches: 3,
    shipGates: 5,
    stagnationThreshold: 0.95,
    maxIterations: 25,
  },
  performance: {
    contextTokenLimit: 200000,
    auditTimeoutMs: 30000,
    enableCaching: true,
    enableProgressTracking: true,
  },
  // ... other configuration options
};
```

## Integration with Existing Architecture

### Session Management

The system prompt integrates with existing session management:

```typescript
// Session state is enhanced with completion analysis
interface EnhancedSessionState extends GansAuditorCodexSessionState {
  completionAnalysis?: CompletionAnalysis;
  nextActions?: NextAction[];
  promptMetadata?: {
    version: string;
    renderedAt: number;
    configHash: string;
  };
}
```

### Codex CLI Integration

Enhanced Codex requests include system prompt context:

```typescript
interface PromptEnhancedAuditRequest extends AuditRequest {
  systemPrompt?: string;
  promptContext?: {
    variables: PromptVariables;
    metadata: any;
  };
}
```

### Error Handling

Graceful degradation when system prompt features fail:

```typescript
// Falls back to base auditor on system prompt errors
try {
  return await this.executePromptEnhancedAudit(thought, session);
} catch (error) {
  logger.warn('System prompt failed, using base auditor', error);
  return await this.baseAuditor.auditThought(thought, sessionId);
}
```

## Performance Considerations

### Caching Strategy

- **Prompt Caching**: Rendered prompts cached by content hash
- **Cache Invalidation**: Automatic invalidation on configuration changes
- **Cache Statistics**: Monitoring for hit rates and performance

### Resource Management

- **Token Limits**: Intelligent context pruning for large repositories
- **Timeout Handling**: Configurable timeouts with graceful degradation
- **Memory Management**: Automatic cleanup of expired cache entries

### Optimization Features

- **Parallel Processing**: Independent audit steps run in parallel
- **Smart Context**: Relevance-based context filtering
- **Progressive Enhancement**: Features degrade gracefully on errors

## Security and Safety

### Data Protection

- **PII Sanitization**: Automatic detection and replacement of sensitive data
- **Secret Detection**: Prevents exposure of API keys and credentials
- **Permission Respect**: Validates file access and command execution

### Command Validation

- **Safety Checks**: Validates commands before execution
- **Privilege Boundaries**: Prevents privilege escalation
- **Audit Trail**: Logs security-sensitive operations

## Testing and Validation

### Unit Tests

```bash
# Run system prompt unit tests
npm test src/prompts/**/*.test.ts
```

### Integration Tests

```bash
# Run integration tests with existing architecture
npm test src/__tests__/system-prompt-integration.test.ts
```

### Validation Tools

```typescript
import { validateSystemPromptSetup } from './prompt-utils.js';

const validation = validateSystemPromptSetup(config);
console.log('Setup valid:', validation.isValid);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
console.log('Recommendations:', validation.recommendations);
```

## Migration and Deployment

### Backward Compatibility

- **Existing Sessions**: Compatible with existing session formats
- **Response Format**: Extends existing response structure
- **Configuration**: Overlays on existing configuration system

### Gradual Rollout

1. **Development Testing**: Enable in development environment
2. **Feature Flags**: Use environment variables to control rollout
3. **Performance Monitoring**: Monitor audit quality and performance
4. **Full Deployment**: Enable for all sessions after validation

### Monitoring

- **Audit Quality Metrics**: Track improvement rates and completion success
- **Performance Metrics**: Monitor timing and resource usage
- **Error Rates**: Track system prompt failures and fallbacks

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
// Validate complete setup
const validation = validateSystemPromptSetup();
if (!validation.isValid) {
  console.error('Setup issues:', validation.errors);
}

// Test prompt rendering
const prompt = await createSystemPromptFromTemplate();
console.log('Prompt length:', prompt.length);
```

## Contributing

When contributing to the system prompt integration:

1. **Follow Architecture**: Maintain integration with existing components
2. **Add Tests**: Include unit and integration tests for new features
3. **Update Documentation**: Keep README and inline docs current
4. **Validate Configuration**: Ensure new config options are validated
5. **Performance Impact**: Consider performance implications of changes

## License

This system prompt integration is part of the GansAuditor_Codex project and follows the same licensing terms.