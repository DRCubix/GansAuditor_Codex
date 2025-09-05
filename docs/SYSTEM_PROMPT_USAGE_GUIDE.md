# GAN Auditor System Prompt Usage Guide

This comprehensive guide covers how to use, configure, and optimize the GAN Auditor System Prompt for effective adversarial code auditing.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [System Prompt Architecture](#system-prompt-architecture)
4. [Configuration Guide](#configuration-guide)
5. [Workflow Management](#workflow-management)
6. [Quality Assessment](#quality-assessment)
7. [Completion Criteria](#completion-criteria)
8. [Integration Patterns](#integration-patterns)
9. [Advanced Usage](#advanced-usage)
10. [Performance Optimization](#performance-optimization)

## Overview

The GAN Auditor System Prompt transforms the GansAuditor_Codex MCP server into an intelligent, adversarial code auditor named "Kilo Code". It provides structured, iterative code review through an 8-step audit workflow with multi-dimensional quality assessment and intelligent completion criteria.

### Key Features

- **Adversarial Identity**: Establishes "Kilo Code" as a constructive adversarial auditor
- **8-Step Workflow**: Comprehensive audit process from initialization to verdict
- **Multi-Dimensional Scoring**: Quality assessment across 6 dimensions with weighted scoring
- **Intelligent Completion**: Tiered completion criteria with automatic kill switches
- **Evidence-Based Feedback**: Structured output with concrete examples and actionable recommendations
- **Session Continuity**: Integration with existing session management for audit history
- **Performance Optimization**: Resource management and context optimization

## Getting Started

### Prerequisites

- GansAuditor_Codex MCP server installed and configured
- Node.js 18+ with TypeScript support
- Access to Codex CLI for audit execution
- Proper environment configuration

### Quick Setup

1. **Enable System Prompt**:
   ```bash
   export GAN_AUDITOR_PROMPT_ENABLED=true
   export GAN_AUDITOR_IDENTITY_NAME="Kilo Code"
   export GAN_AUDITOR_STANCE="constructive-adversarial"
   ```

2. **Create Configuration**:
   ```bash
   npm run config:create config/system-prompt.json development
   ```

3. **Validate Setup**:
   ```bash
   npm run config:validate config/system-prompt.json
   npm run config:health-check
   ```

4. **Start First Audit**:
   ```bash
   npm run audit:start --session-id "my-first-audit" --config config/system-prompt.json
   ```

### Basic Usage Example

```typescript
import { GanAuditor } from './src/auditor/gan-auditor.js';
import { SystemPromptManager } from './src/prompts/system-prompt-manager.js';

// Initialize system prompt
const promptManager = new SystemPromptManager();
const config = await promptManager.loadConfig('config/system-prompt.json');

// Create auditor with system prompt
const auditor = new GanAuditor({
  systemPrompt: config.systemPrompt,
  sessionId: 'audit-session-123',
  branchId: 'feature/new-functionality'
});

// Execute audit
const result = await auditor.audit({
  scope: 'diff',
  context: {
    repository: '/path/to/repo',
    branch: 'feature/new-functionality',
    baseBranch: 'main'
  }
});

console.log('Audit Result:', result.verdict);
console.log('Quality Score:', result.qualityMetrics.overallScore);
```

## System Prompt Architecture

### Core Identity Components

The system prompt establishes a clear identity and role:

```markdown
You are Kilo Code — the adversarial Auditor for GansAuditor_Codex MCP Server.

You validate completed work produced by another agent through comprehensive GAN-style auditing:
reproduce, test, statically/dynamically analyze, and verify against Spec & Steering.

You do NOT change product code; you propose minimal diffs, fixes, and follow-up tasks.
Your goal is GAN-style improvement: detect flaws, prove them, and drive an iterative spiral toward "ship-ready".
```

### Authority and Ground Truth

The system prompt establishes clear authority:

- **Spec Documents** (`.kiro/specs/{feature}/`): Requirements and acceptance criteria
- **Steering Documents** (`.kiro/steering/`): Project conventions and standards
- **Existing Architecture**: Integration patterns and established practices

### Adversarial Stance

The prompt maintains a constructive adversarial approach:

- **Thorough Investigation**: Assumes there are issues to find
- **Evidence-Based**: Requires concrete proof for all findings
- **Constructive Feedback**: Provides actionable recommendations
- **Iterative Improvement**: Drives continuous enhancement through feedback loops

## Configuration Guide

### Basic Configuration Structure

```json
{
  "version": "2.0.0",
  "systemPrompt": {
    "identity": {
      "name": "Kilo Code",
      "role": "Adversarial Auditor",
      "stance": "constructive-adversarial",
      "authority": "spec-and-steering-ground-truth"
    },
    "workflow": {
      "steps": 8,
      "enforceOrder": true,
      "allowSkipping": false,
      "evidenceRequired": true
    },
    "qualityFramework": {
      "dimensions": 6,
      "weightingScheme": "project-standard",
      "scoringScale": "0-100",
      "aggregationMethod": "weighted-average"
    },
    "completionCriteria": {
      "tiers": 3,
      "killSwitches": 3,
      "shipGates": 5,
      "stagnationThreshold": 0.95,
      "maxIterations": 25
    }
  }
}
```

### Environment-Specific Configurations

#### Development Environment
```json
{
  "systemPrompt": {
    "workflow": {
      "enforceOrder": false,
      "allowSkipping": true
    },
    "security": {
      "validateCommands": false,
      "respectPermissions": false
    },
    "performance": {
      "auditTimeoutMs": 60000,
      "contextTokenLimit": 300000
    }
  }
}
```

#### Production Environment
```json
{
  "systemPrompt": {
    "workflow": {
      "enforceOrder": true,
      "allowSkipping": false
    },
    "security": {
      "sanitizePII": true,
      "validateCommands": true,
      "respectPermissions": true,
      "flagVulnerabilities": true
    },
    "performance": {
      "auditTimeoutMs": 30000,
      "contextTokenLimit": 200000
    }
  }
}
```

### Configuration Validation

```bash
# Validate configuration structure
npm run config:validate config/system-prompt.json

# Validate for specific environment
npm run config:validate config/system-prompt.json --environment production --strict

# Generate validation report
npm run config:report config/system-prompt.json --output validation-report.html
```

## Workflow Management

### 8-Step Audit Workflow

The system prompt implements a comprehensive 8-step audit process:

#### 1. INIT - Initialize Audit Context
- **Purpose**: Establish audit scope and requirements
- **Actions**: 
  - Load session state and previous audit results
  - Parse requirements from Spec documents
  - Identify touched files and modules
  - Extract constraints from Steering documents

#### 2. REPRO - Establish Reproduction
- **Purpose**: Create deterministic reproduction steps
- **Actions**:
  - Generate minimal reproduction commands
  - Verify current behavior
  - Document expected vs actual behavior
  - Create baseline for comparison

#### 3. STATIC - Static Analysis
- **Purpose**: Perform static code analysis
- **Actions**:
  - Run linting tools and format checks
  - Execute type checking
  - Analyze code smells and anti-patterns
  - Check compliance with coding standards

#### 4. TESTS - Test Execution and Coverage
- **Purpose**: Validate test coverage and quality
- **Actions**:
  - Execute existing test suite
  - Identify coverage gaps
  - Create focused tests for missing coverage
  - Validate test quality and assertions

#### 5. DYNAMIC - Runtime Validation
- **Purpose**: Perform dynamic analysis and testing
- **Actions**:
  - Test edge cases and boundary conditions
  - Validate error handling paths
  - Check performance characteristics
  - Conduct security analysis

#### 6. CONFORM - Conformance Validation
- **Purpose**: Verify adherence to project standards
- **Actions**:
  - Check naming conventions
  - Validate architecture patterns
  - Review library usage and dependencies
  - Ensure compliance with Steering guidelines

#### 7. TRACE - Requirements Traceability
- **Purpose**: Map implementation to requirements
- **Actions**:
  - Create traceability matrix
  - Mark unmet acceptance criteria
  - Identify missing implementations
  - Validate requirement coverage

#### 8. VERDICT - Final Assessment
- **Purpose**: Provide final verdict and recommendations
- **Actions**:
  - Calculate dimensional scores
  - Determine overall verdict (ship/no-ship)
  - Generate structured feedback
  - Create follow-up tasks

### Workflow Customization

```json
{
  "workflow": {
    "steps": 8,
    "enforceOrder": true,        // Require sequential execution
    "allowSkipping": false,      // Prevent step skipping
    "evidenceRequired": true,    // Require evidence for all findings
    "customSteps": [             // Add custom workflow steps
      {
        "name": "SECURITY_SCAN",
        "position": "after:DYNAMIC",
        "description": "Additional security scanning",
        "required": true
      }
    ]
  }
}
```

## Quality Assessment

### Multi-Dimensional Quality Framework

The system prompt evaluates code across 6 quality dimensions:

#### 1. Correctness & Completeness (30% weight)
- All acceptance criteria met and properly implemented
- Edge cases covered and handled appropriately
- Error paths properly implemented
- Idempotency requirements satisfied
- Business logic accuracy validated

#### 2. Tests (20% weight)
- Unit tests for new/changed functionality
- Integration tests where appropriate
- Meaningful assertions and test quality
- Test coverage for edge cases
- Test-driven development workflow followed

#### 3. Style & Conventions (15% weight)
- Lint/format clean per project standards
- Consistent naming conventions
- Proper imports and organization
- Comments and docstrings per Steering
- Code readability and maintainability

#### 4. Security (15% weight)
- Input validation and sanitization
- No secrets in code/logs
- Safe defaults and error handling
- Dependency security review
- Authentication and authorization

#### 5. Performance (10% weight)
- No obvious performance bottlenecks
- Efficient algorithms and data structures
- Proper resource management
- Caching where appropriate
- Database query optimization

#### 6. Documentation & Traceability (10% weight)
- Inline documentation for complex logic
- ADR for non-trivial decisions
- Changelog entries for behavior changes
- Requirements traceability maintained
- API documentation updates

### Quality Scoring

```typescript
interface QualityMetrics {
  overallScore: number;           // 0-100 weighted average
  dimensionalScores: {
    correctnessCompleteness: number;  // 0-100
    tests: number;                    // 0-100
    styleConventions: number;         // 0-100
    security: number;                 // 0-100
    performance: number;              // 0-100
    docsTraceability: number;         // 0-100
  };
  criticalIssues: CriticalIssue[];
  improvementAreas: string[];
}
```

### Custom Quality Dimensions

```json
{
  "qualityFramework": {
    "customDimensions": [
      {
        "name": "Accessibility",
        "weight": 0.05,
        "criteria": [
          "WCAG 2.1 AA compliance",
          "Screen reader compatibility",
          "Keyboard navigation support"
        ]
      },
      {
        "name": "Internationalization",
        "weight": 0.05,
        "criteria": [
          "Text externalization",
          "Locale-aware formatting",
          "RTL language support"
        ]
      }
    ]
  }
}
```

## Completion Criteria

### Tiered Completion System

The system prompt uses intelligent completion criteria to determine when audits are complete:

#### Tier 1 - Excellence (95% score at 10+ loops)
- **Condition**: `score >= 95 && loops >= 10`
- **Verdict**: Pass
- **Message**: "Excellent quality achieved through iterative improvement"

#### Tier 2 - High Quality (90% score at 15+ loops)
- **Condition**: `score >= 90 && loops >= 15`
- **Verdict**: Pass
- **Message**: "High quality achieved with sustained improvement"

#### Tier 3 - Acceptable (85% score at 20+ loops)
- **Condition**: `score >= 85 && loops >= 20`
- **Verdict**: Pass
- **Message**: "Acceptable quality reached after extensive iteration"

### Kill Switch Mechanisms

#### Hard Stop (25 loops maximum)
- **Condition**: `loops >= 25`
- **Action**: Terminate with failure analysis
- **Message**: "Maximum iteration limit reached - manual review required"

#### Stagnation Detection (10+ loops with >95% similarity)
- **Condition**: `loops >= 10 && similarity > 0.95`
- **Action**: Report loop detection and suggest alternatives
- **Message**: "Improvement stagnation detected - alternative approach needed"

#### Critical Issues Persist (15+ loops with critical issues)
- **Condition**: `criticalIssues.length > 0 && loops >= 15`
- **Action**: Escalate for manual review
- **Message**: "Critical issues persist despite multiple iterations"

### Ship Gates

All ship gates must be satisfied for a positive verdict:

1. **No Critical Issues**: No critical severity issues remaining
2. **Score Threshold**: Overall score meets minimum threshold
3. **AC Satisfaction**: All acceptance criteria satisfied and tested
4. **Clean Validation**: Lint/format/type-check passes
5. **Test Success**: All tests passing

### Custom Completion Criteria

```json
{
  "completionCriteria": {
    "customTiers": [
      {
        "name": "Security Focused",
        "condition": "securityScore >= 95 && overallScore >= 80",
        "verdict": "pass",
        "priority": 1
      }
    ],
    "customKillSwitches": [
      {
        "name": "Security Failure",
        "condition": "criticalSecurityIssues > 0 && loops >= 5",
        "action": "terminate",
        "escalate": true
      }
    ]
  }
}
```

## Integration Patterns

### Session Management Integration

```typescript
import { SynchronousSessionManager } from './src/session/synchronous-session-manager.js';

const sessionManager = new SynchronousSessionManager({
  stateDirectory: '.mcp-gan-state',
  enableSystemPrompt: true,
  promptConfig: config.systemPrompt
});

// Create session with system prompt context
const session = await sessionManager.createSession({
  sessionId: 'audit-session-123',
  branchId: 'feature/new-functionality',
  systemPromptEnabled: true
});

// Continue existing session
const continuedSession = await sessionManager.getSession('audit-session-123');
```

### Codex CLI Integration

```typescript
import { CodexJudge } from './src/codex/codex-judge.js';

const codexJudge = new CodexJudge({
  executable: '/path/to/codex',
  systemPromptEnabled: true,
  promptTemplate: config.systemPrompt
});

// Execute audit with system prompt
const auditResult = await codexJudge.executeAudit({
  context: packedContext,
  sessionId: 'audit-session-123',
  workflowStep: 'STATIC'
});
```

### Context Packer Integration

```typescript
import { ContextPacker } from './src/context/context-packer.js';

const contextPacker = new ContextPacker({
  systemPromptAware: true,
  optimizeForPrompt: true
});

// Pack context optimized for system prompt
const context = await contextPacker.packContext({
  repositoryPath: '/path/to/repo',
  scope: 'diff',
  branchId: 'feature/new-functionality',
  includeSystemPromptContext: true
});
```

## Advanced Usage

### Custom Workflow Steps

```typescript
import { AuditWorkflow } from './src/auditor/audit-workflow.js';

const workflow = new AuditWorkflow({
  customSteps: [
    {
      name: 'ACCESSIBILITY_CHECK',
      description: 'Validate accessibility compliance',
      position: 'after:DYNAMIC',
      executor: async (context) => {
        // Custom accessibility validation logic
        return {
          passed: true,
          evidence: ['WCAG 2.1 AA compliant'],
          recommendations: []
        };
      }
    }
  ]
});
```

### Custom Quality Assessors

```typescript
import { QualityAssessment } from './src/auditor/quality-assessment.js';

const qualityAssessment = new QualityAssessment({
  customAssessors: [
    {
      name: 'accessibility',
      weight: 0.1,
      assessor: new AccessibilityAssessor()
    }
  ]
});
```

### Adaptive Feedback Configuration

```typescript
import { DeveloperPatternRecognizer } from './src/auditor/developer-pattern-recognizer.js';

const patternRecognizer = new DeveloperPatternRecognizer({
  adaptFeedbackStyle: true,
  learnFromHistory: true,
  personalizeRecommendations: true
});

// Analyze developer patterns
const patterns = await patternRecognizer.analyzePatterns({
  sessionHistory: session.iterations,
  codebaseContext: context
});

// Adapt system prompt based on patterns
const adaptedPrompt = await promptManager.adaptPrompt(
  config.systemPrompt,
  patterns
);
```

## Performance Optimization

### Context Optimization

```json
{
  "performance": {
    "contextTokenLimit": 200000,
    "enableContextPruning": true,
    "relevanceThreshold": 0.7,
    "compressionEnabled": true
  }
}
```

### Caching Configuration

```json
{
  "performance": {
    "enableCaching": true,
    "cacheTimeout": 300000,
    "cacheStrategy": "intelligent",
    "invalidateOnChange": true
  }
}
```

### Resource Management

```json
{
  "performance": {
    "auditTimeoutMs": 30000,
    "maxConcurrentAudits": 3,
    "memoryLimit": "512MB",
    "enableProgressTracking": true
  }
}
```

### Performance Monitoring

```bash
# Monitor audit performance
npm run monitoring:audit-performance

# Optimize configuration based on usage
npm run config:optimize-performance config/system-prompt.json

# Generate performance report
npm run performance:report --period 7days
```

## Best Practices

### 1. Configuration Management
- Use version control for all configuration files
- Validate configurations before deployment
- Create environment-specific configurations
- Document all configuration changes

### 2. Security Considerations
- Enable all security features in production
- Use secure defaults for all environments
- Regularly audit security configurations
- Monitor for security-related alerts

### 3. Performance Optimization
- Tune timeout and token limits based on usage
- Enable caching in production environments
- Monitor performance metrics regularly
- Adjust configurations based on performance data

### 4. Quality Assessment
- Customize quality dimensions for your project
- Set appropriate weight distributions
- Monitor quality trends over time
- Adjust thresholds based on project requirements

### 5. Workflow Customization
- Add project-specific workflow steps
- Configure completion criteria for your needs
- Enable appropriate kill switches
- Monitor workflow effectiveness

## Troubleshooting

### Common Issues

1. **System Prompt Not Loading**
   ```bash
   # Check configuration
   npm run config:validate config/system-prompt.json
   
   # Verify environment variables
   echo $GAN_AUDITOR_PROMPT_ENABLED
   ```

2. **Workflow Steps Failing**
   ```bash
   # Debug specific workflow step
   npm run audit:debug --step STATIC --session-id audit-123
   
   # Check step configuration
   npm run config:validate-workflow config/system-prompt.json
   ```

3. **Quality Assessment Issues**
   ```bash
   # Test quality assessment
   npm run quality:test --config config/system-prompt.json
   
   # Debug scoring calculation
   npm run quality:debug --session-id audit-123
   ```

### Getting Help

- Check the [troubleshooting guide](./SYSTEM_PROMPT_TROUBLESHOOTING.md)
- Review [best practices](./SYSTEM_PROMPT_BEST_PRACTICES.md)
- Use `npm run config:help` for CLI options
- Generate diagnostic reports with `npm run diagnostics:generate`

## Next Steps

1. **Basic Setup**: Follow the getting started guide to set up your first system prompt configuration
2. **Customization**: Adapt the configuration to your project's specific needs
3. **Integration**: Integrate with your existing development workflow
4. **Optimization**: Monitor and optimize performance based on usage patterns
5. **Advanced Features**: Explore custom workflow steps and quality assessors

For more detailed information, see the complete documentation in the `docs/` directory.