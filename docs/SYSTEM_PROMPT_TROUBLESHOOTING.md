# System Prompt Configuration Troubleshooting Guide

This guide provides solutions to common issues encountered when configuring, deploying, and managing the GAN Auditor system prompt.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Configuration Issues](#configuration-issues)
3. [Deployment Problems](#deployment-problems)
4. [Feature Flag Issues](#feature-flag-issues)
5. [Performance Problems](#performance-problems)
6. [Security and Permissions](#security-and-permissions)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Migration Issues](#migration-issues)
9. [Environment-Specific Problems](#environment-specific-problems)
10. [Advanced Debugging](#advanced-debugging)

## Quick Diagnostics

### Health Check Commands

```bash
# Quick system health check
npm run config:health-check

# Validate current configuration
npm run config:validate

# Check deployment readiness
npm run config:check-deployment

# Test feature flags
npm run flags:test-all

# Generate diagnostic report
npm run diagnostics:generate --output diagnostics-report.html
```

### Common Status Checks

```bash
# Check if system prompt is enabled
echo $GAN_AUDITOR_PROMPT_ENABLED

# Verify configuration file exists
ls -la config/system-prompt*.json

# Check monitoring status
npm run monitoring:status

# View recent logs
tail -f logs/system-prompt.log
```

## Configuration Issues

### Issue: Configuration Validation Fails

**Symptoms:**
- Configuration validation returns errors
- Deployment fails with validation messages
- System prompt doesn't load properly

**Diagnosis:**
```bash
# Run detailed validation
npm run config:validate config/system-prompt.json --verbose

# Check configuration structure
npm run config:check-structure config/system-prompt.json

# Compare with working template
npm run config:create config/template.json development
diff config/template.json config/system-prompt.json
```

**Solutions:**

1. **Missing Required Fields:**
   ```bash
   # Generate template and compare
   npm run config:create config/reference.json production
   # Copy missing sections from reference to your config
   ```

2. **Invalid Value Ranges:**
   ```json
   {
     "completionCriteria": {
       "maxIterations": 25,  // Must be 1-100
       "stagnationThreshold": 0.95  // Must be 0.0-1.0
     },
     "performance": {
       "contextTokenLimit": 200000,  // Must be 1000-1000000
       "auditTimeoutMs": 30000  // Must be 5000-300000
     }
   }
   ```

3. **Incorrect Data Types:**
   ```json
   {
     "workflow": {
       "enforceOrder": true,  // Must be boolean, not string
       "steps": 8  // Must be number, not string
     }
   }
   ```

### Issue: Environment Variables Not Working

**Symptoms:**
- Environment variables ignored
- Default values used instead of env vars
- Inconsistent behavior across environments

**Diagnosis:**
```bash
# Check environment variable values
env | grep GAN_AUDITOR

# Test environment variable parsing
npm run config:test-env

# Validate environment configuration
npm run config:validate-env
```

**Solutions:**

1. **Incorrect Variable Names:**
   ```bash
   # Correct format
   export GAN_AUDITOR_PROMPT_ENABLED=true
   export GAN_AUDITOR_IDENTITY_NAME="Kilo Code"
   
   # Incorrect (will be ignored)
   export PROMPT_ENABLED=true
   export AUDITOR_NAME="Kilo Code"
   ```

2. **Invalid Boolean Values:**
   ```bash
   # Valid boolean values
   export GAN_AUDITOR_PROMPT_ENABLED=true
   export GAN_AUDITOR_PROMPT_ENABLED=false
   export GAN_AUDITOR_PROMPT_ENABLED=1
   export GAN_AUDITOR_PROMPT_ENABLED=0
   
   # Invalid (will use default)
   export GAN_AUDITOR_PROMPT_ENABLED=yes
   export GAN_AUDITOR_PROMPT_ENABLED=enabled
   ```

3. **Environment Variable Precedence:**
   ```bash
   # Check configuration sources
   npm run config:show-sources
   
   # Environment variables override config file
   # Config file overrides defaults
   ```

### Issue: Configuration File Not Found

**Symptoms:**
- "Configuration file not found" errors
- System uses default configuration
- Deployment fails to find config

**Solutions:**

1. **Check File Path:**
   ```bash
   # Verify file exists
   ls -la config/system-prompt.json
   
   # Check current working directory
   pwd
   
   # Use absolute path if needed
   npm run config:validate /full/path/to/config/system-prompt.json
   ```

2. **File Permissions:**
   ```bash
   # Check file permissions
   ls -la config/system-prompt.json
   
   # Fix permissions if needed
   chmod 644 config/system-prompt.json
   ```

3. **Create Missing Configuration:**
   ```bash
   # Create default configuration
   npm run config:create config/system-prompt.json development
   
   # Or copy from examples
   cp examples/system-prompt-configurations/environments/development.json config/
   ```

## Deployment Problems

### Issue: Deployment Fails with Permission Errors

**Symptoms:**
- "Permission denied" during deployment
- Cannot create backup files
- Configuration files not writable

**Solutions:**

1. **Check File Permissions:**
   ```bash
   # Check directory permissions
   ls -la config/
   
   # Fix directory permissions
   chmod 755 config/
   chmod 644 config/*.json
   ```

2. **Check Disk Space:**
   ```bash
   # Check available disk space
   df -h
   
   # Clean up old backups if needed
   npm run config:cleanup-backups
   ```

3. **Run with Appropriate User:**
   ```bash
   # Check current user
   whoami
   
   # Ensure user has write access to config directory
   sudo chown -R $USER:$USER config/
   ```

### Issue: Deployment Validation Fails

**Symptoms:**
- Deployment stops at validation step
- "Configuration does not meet deployment requirements"
- Environment-specific validation errors

**Diagnosis:**
```bash
# Check deployment readiness
npm run config:check-deployment config/system-prompt.json production

# Run environment-specific validation
npm run config:validate config/system-prompt.json --environment production --strict
```

**Solutions:**

1. **Production Security Requirements:**
   ```json
   {
     "security": {
       "sanitizePII": true,        // Required in production
       "validateCommands": true,   // Required in production
       "respectPermissions": true, // Required in production
       "flagVulnerabilities": true // Required in production
     }
   }
   ```

2. **Performance Requirements:**
   ```json
   {
     "performance": {
       "auditTimeoutMs": 30000,    // Should be <= 60000 in production
       "contextTokenLimit": 200000 // Should be <= 500000 in production
     }
   }
   ```

### Issue: Backup Creation Fails

**Symptoms:**
- "Failed to create backup" warnings
- Deployment proceeds without backup
- Old configurations lost

**Solutions:**

1. **Check Backup Directory:**
   ```bash
   # Ensure backup directory exists
   mkdir -p config/backups
   
   # Check permissions
   chmod 755 config/backups
   ```

2. **Manual Backup:**
   ```bash
   # Create manual backup before deployment
   npm run config:backup config/system-prompt.json
   
   # Or copy manually
   cp config/system-prompt.json config/system-prompt.json.backup.$(date +%Y%m%d_%H%M%S)
   ```

## Feature Flag Issues

### Issue: Feature Flags Not Working

**Symptoms:**
- Features enabled/disabled incorrectly
- Inconsistent behavior across users
- Feature flag evaluation errors

**Diagnosis:**
```bash
# Test specific feature flag
npm run flags:test --flag systemPromptEnabled --environment production

# Debug flag evaluation
npm run flags:debug --flag advancedWorkflow --context '{"environment":"production","userId":"test-user"}'

# Check flag configuration
npm run flags:validate config/feature-flags.json
```

**Solutions:**

1. **Check Flag Configuration:**
   ```json
   {
     "systemPromptEnabled": {
       "enabled": true,
       "rolloutPercentage": 100,
       "environments": ["production"],  // Must include target environment
       "conditions": [
         {
           "type": "environment",
           "operator": "equals",
           "value": "production"  // Must match actual environment
         }
       ]
     }
   }
   ```

2. **Verify Environment Context:**
   ```bash
   # Check current environment
   echo $NODE_ENV
   
   # Ensure environment is passed to flag evaluation
   npm run flags:test --flag systemPromptEnabled --environment $NODE_ENV
   ```

3. **Check Rollout Percentage:**
   ```bash
   # Test with specific user/session ID for consistent results
   npm run flags:test --flag gradualRollout --session-id "test-session-123"
   ```

### Issue: Feature Flag Cache Issues

**Symptoms:**
- Flag changes not taking effect immediately
- Inconsistent flag evaluation results
- Stale flag values

**Solutions:**

1. **Clear Flag Cache:**
   ```bash
   # Clear feature flag cache
   npm run flags:clear-cache
   
   # Restart application to reload flags
   npm run restart
   ```

2. **Check Cache Configuration:**
   ```json
   {
     "globalSettings": {
       "cacheTimeout": 300000,  // 5 minutes - reduce for faster updates
       "refreshInterval": 60000  // 1 minute - reduce for more frequent checks
     }
   }
   ```

## Performance Problems

### Issue: Slow Configuration Loading

**Symptoms:**
- Long startup times
- Configuration validation takes too long
- Deployment timeouts

**Diagnosis:**
```bash
# Profile configuration loading
npm run config:profile config/system-prompt.json

# Check file sizes
ls -lh config/*.json

# Monitor system resources
top -p $(pgrep -f "system-prompt")
```

**Solutions:**

1. **Optimize Configuration Size:**
   ```bash
   # Remove unnecessary metadata
   npm run config:optimize config/system-prompt.json
   
   # Split large configurations
   npm run config:split config/system-prompt.json
   ```

2. **Enable Caching:**
   ```json
   {
     "performance": {
       "enableCaching": true,
       "enableProgressTracking": false  // Disable if not needed
     }
   }
   ```

### Issue: High Memory Usage

**Symptoms:**
- System running out of memory
- Slow performance during audits
- Memory usage alerts

**Diagnosis:**
```bash
# Check memory usage
npm run monitoring:memory-usage

# Profile memory consumption
npm run config:memory-profile

# Check for memory leaks
npm run diagnostics:memory-leaks
```

**Solutions:**

1. **Reduce Context Token Limit:**
   ```json
   {
     "performance": {
       "contextTokenLimit": 150000  // Reduce from default 200000
     }
   }
   ```

2. **Enable Memory Optimizations:**
   ```json
   {
     "performance": {
       "enableCaching": true,
       "enableProgressTracking": false
     },
     "integration": {
       "performanceOptimization": true
     }
   }
   ```

## Security and Permissions

### Issue: PII Sanitization Not Working

**Symptoms:**
- Sensitive data appears in logs
- PII found in audit outputs
- Security compliance failures

**Diagnosis:**
```bash
# Test PII sanitization
npm run security:test-pii-sanitization

# Check security configuration
npm run config:validate-security config/system-prompt.json

# Scan for PII in outputs
npm run security:scan-outputs
```

**Solutions:**

1. **Enable PII Sanitization:**
   ```json
   {
     "security": {
       "sanitizePII": true,
       "flagVulnerabilities": true
     }
   }
   ```

2. **Configure PII Patterns:**
   ```bash
   # Add custom PII patterns
   export GAN_AUDITOR_PII_PATTERNS="email,phone,ssn,credit_card"
   ```

### Issue: Command Validation Blocking Operations

**Symptoms:**
- Commands fail with validation errors
- Operations blocked in production
- "Command not allowed" messages

**Solutions:**

1. **Check Command Whitelist:**
   ```bash
   # View allowed commands
   npm run security:list-allowed-commands
   
   # Add command to whitelist
   npm run security:add-allowed-command "git status"
   ```

2. **Adjust Validation Level:**
   ```json
   {
     "security": {
       "validateCommands": true,
       "commandValidationLevel": "moderate"  // strict, moderate, or lenient
     }
   }
   ```

## Monitoring and Alerting

### Issue: Alerts Not Firing

**Symptoms:**
- No alerts despite issues
- Missing critical notifications
- Alert configuration ignored

**Diagnosis:**
```bash
# Test alert configuration
npm run monitoring:test-alerts

# Check alert conditions
npm run monitoring:validate-alerts config/alerts.json

# Verify webhook configuration
npm run monitoring:test-webhook
```

**Solutions:**

1. **Check Alert Configuration:**
   ```json
   {
     "alerts": [
       {
         "id": "config-validation-errors",
         "enabled": true,  // Must be enabled
         "condition": {
           "metric": "configValidationErrors",
           "operator": "gt",
           "threshold": 5,
           "windowMs": 300000,  // 5 minutes
           "aggregation": "sum"
         },
         "cooldownMs": 600000  // 10 minutes
       }
     ]
   }
   ```

2. **Verify Metrics Collection:**
   ```bash
   # Check if metrics are being collected
   npm run monitoring:check-metrics
   
   # Enable metrics collection
   export GAN_AUDITOR_METRICS_COLLECTION=true
   ```

### Issue: Dashboard Not Updating

**Symptoms:**
- Dashboard shows stale data
- Metrics not refreshing
- Dashboard generation fails

**Solutions:**

1. **Check Dashboard Configuration:**
   ```bash
   # Regenerate dashboard
   npm run dashboard:generate --force

   # Check dashboard refresh interval
   npm run dashboard:check-config
   ```

2. **Verify Data Export:**
   ```bash
   # Check if metrics are being exported
   ls -la monitoring/metrics-*.json
   
   # Force metrics export
   npm run monitoring:export-metrics
   ```

## Migration Issues

### Issue: Migration Fails

**Symptoms:**
- Migration script errors
- Configuration not updated
- Backup not restored properly

**Diagnosis:**
```bash
# Check migration compatibility
npm run config:check-migration config/old-config.json

# Test migration in dry-run mode
npm run config:migrate config/old-config.json --dry-run

# Validate migration result
npm run config:validate config/old-config.json --post-migration
```

**Solutions:**

1. **Manual Migration Steps:**
   ```bash
   # Create backup first
   cp config/old-config.json config/old-config.json.backup
   
   # Apply migration manually
   npm run config:migrate-manual config/old-config.json
   
   # Validate result
   npm run config:validate config/old-config.json
   ```

2. **Rollback Migration:**
   ```bash
   # Restore from backup
   cp config/old-config.json.backup config/old-config.json
   
   # Or use automatic rollback
   npm run config:rollback-migration config/old-config.json
   ```

## Environment-Specific Problems

### Development Environment Issues

**Common Problems:**
- Strict validation in development
- Performance too slow for iteration
- Debug features not working

**Solutions:**
```json
{
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
```

### Production Environment Issues

**Common Problems:**
- Security features too restrictive
- Performance not optimized
- Monitoring overwhelming

**Solutions:**
```json
{
  "security": {
    "sanitizePII": true,
    "validateCommands": true,
    "respectPermissions": true
  },
  "performance": {
    "auditTimeoutMs": 30000,
    "enableCaching": true,
    "enableProgressTracking": true
  },
  "monitoring": {
    "logLevel": "info",
    "alerting": true
  }
}
```

## Advanced Debugging

### Enable Debug Mode

```bash
# Enable comprehensive debugging
export GAN_AUDITOR_DEBUG_MODE=true
export GAN_AUDITOR_LOG_LEVEL=debug
export DEBUG=system-prompt:*

# Run with debug output
npm run config:validate --debug
```

### Collect Diagnostic Information

```bash
# Generate comprehensive diagnostic report
npm run diagnostics:collect --output diagnostics.zip

# Include system information
npm run diagnostics:system-info

# Collect configuration audit trail
npm run diagnostics:config-history
```

### Performance Profiling

```bash
# Profile configuration loading
npm run profile:config-loading config/system-prompt.json

# Profile feature flag evaluation
npm run profile:feature-flags

# Profile monitoring system
npm run profile:monitoring
```

### Log Analysis

```bash
# Search for specific errors
grep -i "error" logs/system-prompt.log | tail -20

# Analyze configuration changes
grep "configuration" logs/system-prompt.log | grep "$(date +%Y-%m-%d)"

# Monitor real-time logs
tail -f logs/system-prompt.log | grep -E "(ERROR|WARN|validation)"
```

## Getting Help

### Support Channels

1. **Documentation**: Check `docs/` directory for detailed guides
2. **Examples**: Review `examples/` directory for working configurations
3. **CLI Help**: Run `npm run config:help` for command options
4. **Validation**: Use `npm run config:validate` for configuration checking
5. **Diagnostics**: Generate reports with `npm run diagnostics:generate`

### Reporting Issues

When reporting issues, include:

1. **System Information:**
   ```bash
   npm run diagnostics:system-info
   ```

2. **Configuration Details:**
   ```bash
   npm run config:sanitize-and-export config/system-prompt.json
   ```

3. **Error Logs:**
   ```bash
   tail -100 logs/system-prompt.log
   ```

4. **Environment Variables:**
   ```bash
   env | grep GAN_AUDITOR | sort
   ```

5. **Validation Report:**
   ```bash
   npm run config:validate config/system-prompt.json --verbose
   ```

### Emergency Procedures

#### Complete System Reset

```bash
# Stop all services
npm run stop

# Reset to default configuration
npm run config:reset-to-defaults

# Clear all caches
npm run cache:clear-all

# Restart services
npm run start
```

#### Rollback to Previous Version

```bash
# List available backups
npm run config:list-backups

# Restore from specific backup
npm run config:restore config/system-prompt.json.backup.20240115_103000

# Validate restored configuration
npm run config:validate config/system-prompt.json
```

This troubleshooting guide covers the most common issues. For additional support, refer to the main documentation or contact the development team.