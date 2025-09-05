# System Prompt Configuration System

The GAN Auditor system prompt configuration system provides comprehensive management of adversarial code auditing configurations across development, staging, and production environments.

## Features

- **🔧 Comprehensive Configuration Management** - Environment variables, configuration files, and defaults
- **🚀 Automated Deployment** - Safe deployment with backup, validation, and rollback
- **🎛️ Feature Flag Support** - Gradual rollout and A/B testing capabilities
- **📊 Real-time Monitoring** - Metrics collection, alerting, and dashboard generation
- **🔄 Migration Support** - Automated migration between configuration versions
- **🔒 Security-First Design** - PII sanitization, command validation, and compliance features
- **⚡ Performance Optimized** - Caching, context optimization, and resource management

## Quick Start

### 1. Installation and Setup

```bash
# Install dependencies
npm install

# Create default configuration
npm run config:create config/system-prompt.json development

# Validate configuration
npm run config:validate config/system-prompt.json

# Start monitoring
npm run monitoring:start
```

### 2. Basic Usage

```bash
# Validate current configuration
npm run config:validate

# Deploy to development
npm run deploy:development

# Generate monitoring dashboard
npm run dashboard:generate

# Check system health
npm run config:health-check
```

### 3. Environment Setup

```bash
# Set required environment variables
export GAN_AUDITOR_PROMPT_ENABLED=true
export GAN_AUDITOR_SANITIZE_PII=true
export GAN_AUDITOR_VALIDATE_COMMANDS=true

# Create environment-specific configurations
npm run config:create config/system-prompt-dev.json development
npm run config:create config/system-prompt-prod.json production

# Deploy to specific environment
npm run deploy:production
```

## Configuration Structure

### Core Configuration Sections

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
    },
    "integration": {
      "sessionManagement": true,
      "codexIntegration": true,
      "contextAwareness": true,
      "performanceOptimization": true
    },
    "security": {
      "sanitizePII": true,
      "validateCommands": true,
      "respectPermissions": true,
      "flagVulnerabilities": true
    },
    "performance": {
      "contextTokenLimit": 200000,
      "auditTimeoutMs": 30000,
      "enableCaching": true,
      "enableProgressTracking": true
    }
  }
}
```

### Environment Variables

| Variable | Description | Type | Default |
|----------|-------------|------|---------|
| `GAN_AUDITOR_PROMPT_ENABLED` | Enable system prompt | boolean | `true` |
| `GAN_AUDITOR_IDENTITY_NAME` | Auditor identity name | string | `Kilo Code` |
| `GAN_AUDITOR_STANCE` | Auditor stance | enum | `constructive-adversarial` |
| `GAN_AUDITOR_SANITIZE_PII` | Enable PII sanitization | boolean | `true` |
| `GAN_AUDITOR_VALIDATE_COMMANDS` | Enable command validation | boolean | `true` |
| `GAN_AUDITOR_CONTEXT_TOKEN_LIMIT` | Context token limit | integer | `200000` |
| `GAN_AUDITOR_AUDIT_TIMEOUT_MS` | Audit timeout (ms) | integer | `30000` |

See [Environment Variables Documentation](./SYSTEM_PROMPT_ENVIRONMENT_VARIABLES.md) for complete list.

## CLI Commands

### Configuration Management

```bash
# Validate configuration
npm run config:validate [file]

# Create new configuration
npm run config:create <file> [environment]

# Generate validation report
npm run config:report [file] --output report.html

# Backup configuration
npm run config:backup <file>

# Show environment variables documentation
npm run config:env-vars --format markdown
```

### Deployment Commands

```bash
# Deploy to environment
npm run deploy:development
npm run deploy:staging  
npm run deploy:production

# Deploy with options
node scripts/system-prompt-config.js deploy <config-file> <environment> --backup --validate

# Check deployment readiness
npm run config:check-deployment <config-file> <environment>
```

### Feature Flag Commands

```bash
# Test feature flags
npm run flags:test --flag <flag-name> --environment <env>

# Validate feature flag configuration
npm run flags:validate <config-file>

# Update feature flag rollout
npm run flags:update <flag-name> --rollout <percentage>
```

### Monitoring Commands

```bash
# Start monitoring system
npm run monitoring:start

# Generate dashboard
npm run dashboard:generate --output dashboard.html

# Check monitoring status
npm run monitoring:status

# Export metrics
npm run monitoring:export --format json
```

## Examples and Templates

### Development Configuration

```json
{
  "systemPrompt": {
    "identity": {
      "name": "Kilo Code Dev",
      "stance": "constructive-adversarial"
    },
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

### Production Configuration

```json
{
  "systemPrompt": {
    "identity": {
      "name": "Kilo Code",
      "stance": "constructive-adversarial"
    },
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

See [Configuration Examples](../examples/system-prompt-configurations/) for more templates.

## Monitoring and Observability

### Metrics Collected

- **Configuration Metrics**: Validation count, errors, deployment success
- **Performance Metrics**: Audit completion time, memory usage, CPU usage
- **Quality Metrics**: Audit success rate, average score, iteration count
- **Feature Flag Metrics**: Evaluation count, cache hits/misses
- **System Health**: Uptime, error rates, resource utilization

### Dashboard Features

- **Real-time Metrics**: Live updates of key performance indicators
- **System Health Status**: Overall system health and component status
- **Alert Management**: Recent alerts and alert history
- **Feature Flag Status**: Current rollout status and usage analytics
- **Performance Charts**: Historical trends and performance analysis

### Alerting

Comprehensive alerting for:
- Configuration validation errors
- Deployment failures
- Performance degradation
- Security incidents
- System health issues

## Migration and Upgrades

### Supported Migrations

- **v1.0.0 → v2.0.0**: Legacy configuration format to new structure
- **v2.0.0 → v2.1.0**: Enhanced security and performance features

### Migration Process

```bash
# Check compatibility
npm run config:check-compatibility config/old-config.json

# Apply migration
npm run config:migrate config/old-config.json

# Validate migrated configuration
npm run config:validate config/old-config.json --post-migration
```

## Troubleshooting

### Common Issues

1. **Configuration Validation Errors**
   - Check configuration structure and data types
   - Validate against schema requirements
   - Compare with working examples

2. **Deployment Failures**
   - Verify file permissions and disk space
   - Check environment-specific requirements
   - Validate security settings for target environment

3. **Feature Flag Issues**
   - Test flag evaluation with specific context
   - Check environment and condition matching
   - Verify rollout percentage logic

4. **Performance Problems**
   - Monitor resource usage and optimize settings
   - Enable caching and performance optimizations
   - Adjust timeout and token limits

See [Troubleshooting Guide](./SYSTEM_PROMPT_TROUBLESHOOTING.md) for detailed solutions.

## Best Practices

- **Use version control** for all configuration files
- **Validate configurations** before deployment
- **Create environment-specific** configurations
- **Enable comprehensive monitoring** in production
- **Use feature flags** for gradual rollout
- **Maintain audit trails** for compliance
- **Regular security reviews** and updates
- **Performance monitoring** and optimization

See [Best Practices Guide](./SYSTEM_PROMPT_BEST_PRACTICES.md) for comprehensive guidelines.

## API Reference

### Configuration Loading

```typescript
import { loadSystemPromptConfig } from './src/prompts/system-prompt-config.js';

const { config, validation, sources } = loadSystemPromptConfig('config/system-prompt.json');

if (validation.isValid) {
  console.log('Configuration loaded successfully');
  console.log('Sources used:', sources);
} else {
  console.error('Configuration validation failed:', validation.errors);
}
```

### Feature Flag Management

```typescript
import { FeatureFlagManager } from './src/config/feature-flag-manager.js';

const flagManager = new FeatureFlagManager();

// Check if feature is enabled
const isEnabled = flagManager.isEnabled('advancedWorkflow', {
  environment: 'production',
  sessionId: 'user-session-123'
});

// Get detailed evaluation result
const result = flagManager.evaluate('systemPromptEnabled', {
  environment: 'production'
});
```

### Monitoring Integration

```typescript
import { Metrics } from './src/config/monitoring-system.js';

// Record configuration validation
Metrics.recordConfigValidation(true, 1500);

// Record deployment
Metrics.recordConfigDeployment('production', true, 5000, true);

// Record audit quality
Metrics.recordAuditQuality(true, 85.5, 30000, 5);
```

## Support

- **Documentation**: Complete guides in `docs/` directory
- **Examples**: Working configurations in `examples/` directory
- **CLI Help**: Run `npm run config:help` for command options
- **Validation**: Use `npm run config:validate` for configuration checking
- **Monitoring**: Access dashboard at `monitoring/dashboard.html`

For additional support, see the troubleshooting guide or contact the platform team.