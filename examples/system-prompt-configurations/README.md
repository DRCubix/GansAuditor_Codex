# System Prompt Configuration Examples

This directory contains example configurations for different environments and use cases of the GAN Auditor system prompt.

## Directory Structure

```
examples/system-prompt-configurations/
├── README.md                           # This file
├── environments/                       # Environment-specific configurations
│   ├── development.json               # Development environment
│   ├── staging.json                   # Staging environment
│   ├── production.json                # Production environment
│   └── testing.json                   # Testing environment
├── use-cases/                         # Use case-specific configurations
│   ├── high-security.json             # High security requirements
│   ├── performance-optimized.json     # Performance-focused setup
│   ├── experimental.json              # Experimental features enabled
│   └── minimal.json                   # Minimal configuration
├── feature-flags/                     # Feature flag examples
│   ├── gradual-rollout.json           # Gradual rollout configuration
│   ├── a-b-testing.json               # A/B testing setup
│   └── environment-specific.json      # Environment-specific flags
├── migration/                         # Migration examples
│   ├── v1-to-v2-migration.json        # Version 1.0 to 2.0 migration
│   └── legacy-config.json             # Legacy configuration format
└── monitoring/                        # Monitoring configurations
    ├── alerts.json                    # Alert configurations
    ├── dashboard-config.json          # Dashboard settings
    └── metrics-config.json            # Metrics collection setup
```

## Quick Start Examples

### 1. Basic Development Setup

```bash
# Copy development configuration
cp examples/system-prompt-configurations/environments/development.json config/

# Validate configuration
npm run config:validate config/development.json

# Deploy to development
npm run deploy:development
```

### 2. Production Deployment

```bash
# Copy production configuration
cp examples/system-prompt-configurations/environments/production.json config/

# Validate with strict mode
npm run config:validate config/production.json --strict

# Deploy with backup
npm run deploy:production --backup --validate
```

### 3. Feature Flag Setup

```bash
# Copy feature flag configuration
cp examples/system-prompt-configurations/feature-flags/gradual-rollout.json config/

# Test feature flag evaluation
npm run flags:test --config config/gradual-rollout.json
```

## Configuration Examples by Environment

### Development Environment

**File**: `environments/development.json`

**Purpose**: Developer-friendly settings with relaxed validation and experimental features enabled.

**Key Features**:
- Workflow order enforcement disabled for flexibility
- Step skipping allowed for faster iteration
- Command validation disabled for easier testing
- Extended timeouts for debugging
- Experimental features enabled

### Staging Environment

**File**: `environments/staging.json`

**Purpose**: Production-like environment for final testing before deployment.

**Key Features**:
- Production-like security settings
- Moderate rollout percentages for testing
- Enhanced monitoring and logging
- Backup and rollback capabilities
- Performance monitoring enabled

### Production Environment

**File**: `environments/production.json`

**Purpose**: Secure, optimized configuration for production deployment.

**Key Features**:
- Strict security settings enabled
- PII sanitization and command validation
- Optimized performance settings
- Conservative rollout percentages
- Comprehensive monitoring and alerting

## Use Case Examples

### High Security Configuration

**File**: `use-cases/high-security.json`

**Use Case**: Environments with strict security requirements (financial, healthcare, government).

**Features**:
- Maximum security settings enabled
- Strict permission checking
- Enhanced vulnerability detection
- Audit trail logging
- Encrypted session data

### Performance Optimized Configuration

**File**: `use-cases/performance-optimized.json`

**Use Case**: High-throughput environments requiring optimal performance.

**Features**:
- Aggressive caching enabled
- Optimized context token limits
- Parallel processing where possible
- Reduced validation overhead
- Performance monitoring focused

### Experimental Configuration

**File**: `use-cases/experimental.json`

**Use Case**: Testing new features and algorithms in development.

**Features**:
- All experimental features enabled
- Extended iteration limits for testing
- Verbose logging and debugging
- Flexible workflow configuration
- Beta feature flags enabled

## Feature Flag Examples

### Gradual Rollout

**File**: `feature-flags/gradual-rollout.json`

**Purpose**: Safely roll out new features to a percentage of users.

```json
{
  "systemPromptEnabled": {
    "enabled": true,
    "rolloutPercentage": 25,
    "environments": ["production"],
    "description": "Gradual rollout of system prompt to 25% of production traffic"
  }
}
```

### A/B Testing

**File**: `feature-flags/a-b-testing.json`

**Purpose**: Compare different configurations or features.

```json
{
  "advancedWorkflowVariantA": {
    "enabled": true,
    "rolloutPercentage": 50,
    "conditions": [
      {
        "type": "custom",
        "field": "testGroup",
        "operator": "equals",
        "value": "A"
      }
    ]
  },
  "advancedWorkflowVariantB": {
    "enabled": true,
    "rolloutPercentage": 50,
    "conditions": [
      {
        "type": "custom",
        "field": "testGroup",
        "operator": "equals",
        "value": "B"
      }
    ]
  }
}
```

## Migration Examples

### Legacy to Modern Configuration

**File**: `migration/v1-to-v2-migration.json`

Shows how to migrate from version 1.0 configuration format to version 2.0:

```bash
# Check compatibility
npm run config:check-compatibility examples/migration/legacy-config.json

# Apply migration
npm run config:migrate examples/migration/legacy-config.json

# Validate migrated configuration
npm run config:validate examples/migration/legacy-config.json
```

## Monitoring Examples

### Alert Configuration

**File**: `monitoring/alerts.json`

**Purpose**: Comprehensive alerting for system health and performance.

**Includes**:
- Configuration validation error alerts
- Deployment failure alerts
- Performance degradation alerts
- Security incident alerts
- System health alerts

### Dashboard Configuration

**File**: `monitoring/dashboard-config.json`

**Purpose**: Real-time monitoring dashboard setup.

**Features**:
- Key performance indicators
- System health status
- Recent activity summary
- Alert notifications
- Feature flag status

## Usage Instructions

### 1. Copying Configurations

```bash
# Copy specific environment configuration
cp examples/system-prompt-configurations/environments/production.json config/system-prompt-prod.json

# Copy use case configuration
cp examples/system-prompt-configurations/use-cases/high-security.json config/system-prompt-security.json

# Copy feature flags
cp examples/system-prompt-configurations/feature-flags/gradual-rollout.json config/feature-flags.json
```

### 2. Customizing Configurations

```bash
# Edit configuration file
nano config/system-prompt-prod.json

# Validate changes
npm run config:validate config/system-prompt-prod.json

# Test configuration
npm run config:test config/system-prompt-prod.json --environment production
```

### 3. Deploying Configurations

```bash
# Deploy to specific environment
npm run deploy --config config/system-prompt-prod.json --environment production

# Deploy with feature flags
npm run deploy --config config/system-prompt-prod.json --flags config/feature-flags.json

# Deploy with monitoring
npm run deploy --config config/system-prompt-prod.json --monitor
```

## Configuration Validation

All example configurations are validated and tested:

```bash
# Validate all examples
npm run examples:validate

# Test specific example
npm run config:validate examples/system-prompt-configurations/environments/production.json

# Generate validation report
npm run config:report examples/system-prompt-configurations/environments/production.json
```

## Best Practices

### 1. Environment Separation

- Use separate configuration files for each environment
- Never use production configurations in development
- Validate configurations before deployment
- Use environment variables for sensitive settings

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

### 4. Feature Flag Management

- Use descriptive names and descriptions
- Set appropriate rollout percentages
- Monitor feature flag performance impact
- Clean up unused feature flags regularly

## Troubleshooting

### Common Issues

1. **Configuration Validation Errors**
   ```bash
   # Check configuration syntax
   npm run config:validate config/system-prompt.json --verbose
   
   # Compare with working example
   diff examples/environments/production.json config/system-prompt.json
   ```

2. **Deployment Failures**
   ```bash
   # Test deployment in dry-run mode
   npm run deploy --config config/system-prompt.json --dry-run
   
   # Check deployment readiness
   npm run config:check-deployment config/system-prompt.json
   ```

3. **Feature Flag Issues**
   ```bash
   # Test feature flag evaluation
   npm run flags:test --flag systemPromptEnabled --environment production
   
   # Debug flag conditions
   npm run flags:debug --flag advancedWorkflow
   ```

### Getting Help

- Check the main documentation in `docs/SYSTEM_PROMPT_DEPLOYMENT_GUIDE.md`
- Review troubleshooting section for common issues
- Use `npm run config:help` for CLI command help
- Validate configurations with `npm run config:validate`

## Contributing

When adding new examples:

1. Follow the existing directory structure
2. Include comprehensive documentation
3. Validate all configurations
4. Add appropriate metadata
5. Update this README file

## Example Metadata Format

Each configuration file should include metadata:

```json
{
  "metadata": {
    "name": "Production Configuration",
    "description": "Secure, optimized configuration for production deployment",
    "environment": "production",
    "version": "2.0.0",
    "author": "System Team",
    "tags": ["production", "security", "performance"],
    "lastUpdated": "2024-01-15T10:30:00Z",
    "validatedWith": "system-prompt-validator-2.0.0"
  }
}
```