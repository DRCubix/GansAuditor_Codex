# Synchronous Audit Workflow Migration Guide

This guide helps you migrate existing GansAuditor Codex deployments to support the new synchronous audit workflow feature.

## Overview

The synchronous audit workflow is a major enhancement that transforms the tool from an asynchronous, fire-and-forget system into an interactive, iterative feedback loop. This migration guide ensures a smooth transition while maintaining backward compatibility.

## Migration Strategy

### Phase 1: Preparation (Pre-Migration)

#### 1.1 Assess Current Deployment

Before migrating, assess your current deployment:

```bash
# Check current environment variables
env | grep -E "(GAN|AUDIT|THOUGHT)" | sort

# Check current usage patterns
# Review logs for typical audit volumes and patterns
tail -f /var/log/gansauditor-codex.log | grep "GAN Audit"

# Check available resources
df -h  # Disk space for session storage
free -h  # Memory for concurrent sessions
```

#### 1.2 Backup Current Configuration

```bash
# Backup current environment configuration
env | grep -E "(GAN|AUDIT|THOUGHT)" > backup-env-config.txt

# Backup any existing state files
cp -r .mcp-gan-state .mcp-gan-state.backup 2>/dev/null || echo "No existing state directory"

# Document current performance baselines
# Record typical response times, error rates, resource usage
```

#### 1.3 Review Dependencies

Ensure your system meets the requirements:

- Node.js version compatibility
- Available disk space for session storage (recommend 1GB minimum)
- Memory for concurrent sessions (recommend 512MB per 10 concurrent sessions)
- Network connectivity for Codex API calls

### Phase 2: Staged Migration

#### 2.1 Stage 1 - Enable Basic Synchronous Mode (Low Risk)

Start with synchronous mode disabled to test the new codebase:

```bash
# Keep synchronous mode disabled initially
export ENABLE_SYNCHRONOUS_AUDIT=false
export ENABLE_GAN_AUDITING=true  # Keep existing async behavior

# Test that existing functionality still works
npm test
```

**Validation Steps:**
1. Verify existing async audit functionality works
2. Check that response format is unchanged
3. Confirm no performance regression
4. Test with typical workload

#### 2.2 Stage 2 - Enable Synchronous Mode with Conservative Settings (Medium Risk)

```bash
# Enable synchronous mode with conservative settings
export ENABLE_SYNCHRONOUS_AUDIT=true
export ENABLE_GAN_AUDITING=true

# Conservative timeout and concurrency
export AUDIT_TIMEOUT_SECONDS=60
export MAX_CONCURRENT_AUDITS=2
export MAX_CONCURRENT_SESSIONS=10

# Enable all safety features
export ENABLE_STAGNATION_DETECTION=true
export ENABLE_SESSION_PERSISTENCE=true
export ENABLE_AUDIT_CACHING=true

# Detailed feedback for monitoring
export SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=detailed
```

**Validation Steps:**
1. Test synchronous workflow with simple code examples
2. Verify session persistence works correctly
3. Check stagnation detection triggers appropriately
4. Monitor resource usage and response times

#### 2.3 Stage 3 - Optimize for Production (Higher Risk)

```bash
# Production-optimized settings
export AUDIT_TIMEOUT_SECONDS=30
export MAX_CONCURRENT_AUDITS=10
export MAX_CONCURRENT_SESSIONS=50

# Enable monitoring
export ENABLE_SYNC_AUDIT_METRICS=true
export ENABLE_SYNC_AUDIT_HEALTH_CHECKS=true

# Optimize completion criteria if needed
export SYNC_AUDIT_TIER1_LOOPS=8
export SYNC_AUDIT_TIER2_LOOPS=12
export SYNC_AUDIT_TIER3_LOOPS=16
```

**Validation Steps:**
1. Load test with expected production volume
2. Verify metrics collection works
3. Test health check endpoints
4. Monitor for any performance issues

### Phase 3: Full Production Deployment

#### 3.1 Production Configuration Template

Create a production configuration file:

```bash
# /etc/gansauditor-codex/production.env

# Core synchronous mode settings
ENABLE_GAN_AUDITING=true
ENABLE_SYNCHRONOUS_AUDIT=true

# Production timeouts and concurrency
AUDIT_TIMEOUT_SECONDS=30
MAX_CONCURRENT_AUDITS=10
MAX_CONCURRENT_SESSIONS=100
AUDIT_QUEUE_TIMEOUT=60000

# Completion criteria (adjust based on quality requirements)
SYNC_AUDIT_TIER1_SCORE=95
SYNC_AUDIT_TIER1_LOOPS=10
SYNC_AUDIT_TIER2_SCORE=90
SYNC_AUDIT_TIER2_LOOPS=15
SYNC_AUDIT_TIER3_SCORE=85
SYNC_AUDIT_TIER3_LOOPS=20
SYNC_AUDIT_HARD_STOP_LOOPS=25

# Stagnation detection
ENABLE_STAGNATION_DETECTION=true
SYNC_AUDIT_STAGNATION_START_LOOP=10
SYNC_AUDIT_STAGNATION_THRESHOLD=0.95

# Performance optimizations
ENABLE_AUDIT_CACHING=true
ENABLE_SESSION_PERSISTENCE=true
SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=detailed

# Session management
SYNC_AUDIT_STATE_DIRECTORY=/var/lib/gansauditor-codex/sessions
MAX_SESSION_AGE=86400000  # 24 hours
SESSION_CLEANUP_INTERVAL=3600000  # 1 hour

# Monitoring and observability
ENABLE_SYNC_AUDIT_METRICS=true
ENABLE_SYNC_AUDIT_HEALTH_CHECKS=true

# Progress indicators
ENABLE_AUDIT_PROGRESS_INDICATORS=true
AUDIT_PROGRESS_INDICATOR_INTERVAL=5000

# Error handling
AUDIT_TIMEOUT_RETRY_ATTEMPTS=1
AUDIT_PARTIAL_RESULTS_ON_TIMEOUT=true

# Codex context management
ENABLE_CODEX_CONTEXT_MANAGEMENT=true

# Legacy compatibility
DISABLE_THOUGHT_LOGGING=false
```

#### 3.2 System Service Configuration

Update your system service configuration:

```ini
# /etc/systemd/system/gansauditor-codex.service
[Unit]
Description=GansAuditor Codex MCP Server
After=network.target

[Service]
Type=simple
User=gansauditor
Group=gansauditor
WorkingDirectory=/opt/gansauditor-codex
EnvironmentFile=/etc/gansauditor-codex/production.env
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

# Resource limits
LimitNOFILE=65536
MemoryMax=2G

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gansauditor-codex

[Install]
WantedBy=multi-user.target
```

#### 3.3 Directory Setup

```bash
# Create necessary directories
sudo mkdir -p /var/lib/gansauditor-codex/sessions
sudo mkdir -p /var/log/gansauditor-codex
sudo mkdir -p /etc/gansauditor-codex

# Set proper permissions
sudo chown -R gansauditor:gansauditor /var/lib/gansauditor-codex
sudo chown -R gansauditor:gansauditor /var/log/gansauditor-codex
sudo chown -R root:gansauditor /etc/gansauditor-codex
sudo chmod 750 /etc/gansauditor-codex
sudo chmod 640 /etc/gansauditor-codex/production.env
```

## Migration Validation

### Automated Migration Validation Script

Create a validation script to verify the migration:

```bash
#!/bin/bash
# migration-validation.sh

echo "=== GansAuditor Codex Migration Validation ==="

# Check environment configuration
echo "1. Checking environment configuration..."
if [ "$ENABLE_GAN_AUDITING" = "true" ] && [ "$ENABLE_SYNCHRONOUS_AUDIT" = "true" ]; then
    echo "✓ Synchronous audit mode enabled"
else
    echo "✗ Synchronous audit mode not properly enabled"
    exit 1
fi

# Check directory permissions
echo "2. Checking directory permissions..."
STATE_DIR=${SYNC_AUDIT_STATE_DIRECTORY:-.mcp-gan-state}
if [ -d "$STATE_DIR" ] && [ -w "$STATE_DIR" ]; then
    echo "✓ State directory accessible: $STATE_DIR"
else
    echo "✗ State directory not accessible: $STATE_DIR"
    exit 1
fi

# Test basic functionality
echo "3. Testing basic functionality..."
timeout 30 node -e "
const { createRuntimeConfig } = require('./src/config/synchronous-config.js');
const { config, validation } = createRuntimeConfig();
if (validation.isValid) {
    console.log('✓ Configuration validation passed');
    process.exit(0);
} else {
    console.log('✗ Configuration validation failed:', validation.errors);
    process.exit(1);
}
" || {
    echo "✗ Basic functionality test failed"
    exit 1
}

# Check resource availability
echo "4. Checking resource availability..."
AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$AVAILABLE_MEMORY" -gt 512 ]; then
    echo "✓ Sufficient memory available: ${AVAILABLE_MEMORY}MB"
else
    echo "⚠ Low memory available: ${AVAILABLE_MEMORY}MB (recommend 512MB+)"
fi

AVAILABLE_DISK=$(df -m "$STATE_DIR" | awk 'NR==2{printf "%.0f", $4}')
if [ "$AVAILABLE_DISK" -gt 1024 ]; then
    echo "✓ Sufficient disk space available: ${AVAILABLE_DISK}MB"
else
    echo "⚠ Low disk space available: ${AVAILABLE_DISK}MB (recommend 1GB+)"
fi

echo "=== Migration validation completed successfully ==="
```

### Performance Baseline Comparison

```bash
#!/bin/bash
# performance-comparison.sh

echo "=== Performance Baseline Comparison ==="

# Test async mode performance
echo "Testing async mode performance..."
export ENABLE_SYNCHRONOUS_AUDIT=false
ASYNC_TIME=$(time node test-performance.js 2>&1 | grep "real" | awk '{print $2}')
echo "Async mode time: $ASYNC_TIME"

# Test sync mode performance  
echo "Testing sync mode performance..."
export ENABLE_SYNCHRONOUS_AUDIT=true
SYNC_TIME=$(time node test-performance.js 2>&1 | grep "real" | awk '{print $2}')
echo "Sync mode time: $SYNC_TIME"

# Compare results
echo "Performance comparison complete"
echo "Note: Sync mode may be slower but provides immediate feedback"
```

## Rollback Plan

### Emergency Rollback Procedure

If issues arise during migration, follow this rollback procedure:

```bash
#!/bin/bash
# emergency-rollback.sh

echo "=== Emergency Rollback Procedure ==="

# 1. Disable synchronous mode immediately
export ENABLE_SYNCHRONOUS_AUDIT=false
echo "✓ Synchronous mode disabled"

# 2. Restore previous environment configuration
if [ -f "backup-env-config.txt" ]; then
    source backup-env-config.txt
    echo "✓ Previous environment configuration restored"
else
    echo "⚠ No backup configuration found, using safe defaults"
    export ENABLE_GAN_AUDITING=true
    export ENABLE_SYNCHRONOUS_AUDIT=false
fi

# 3. Restart service
sudo systemctl restart gansauditor-codex
echo "✓ Service restarted"

# 4. Verify rollback
sleep 5
if sudo systemctl is-active --quiet gansauditor-codex; then
    echo "✓ Service is running"
else
    echo "✗ Service failed to start"
    sudo systemctl status gansauditor-codex
fi

echo "=== Rollback completed ==="
```

### Gradual Rollback

For a more controlled rollback:

1. **Reduce concurrency**: Lower `MAX_CONCURRENT_AUDITS` and `MAX_CONCURRENT_SESSIONS`
2. **Increase timeouts**: Raise `AUDIT_TIMEOUT_SECONDS` to reduce timeout errors
3. **Disable features**: Turn off `ENABLE_STAGNATION_DETECTION` or other features
4. **Switch to async**: Set `ENABLE_SYNCHRONOUS_AUDIT=false` while keeping `ENABLE_GAN_AUDITING=true`

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Response Times**:
   - Average audit completion time
   - 95th percentile response time
   - Timeout rate

2. **Session Metrics**:
   - Active session count
   - Session completion rate
   - Average loops to completion

3. **Resource Usage**:
   - Memory usage
   - Disk usage for session storage
   - CPU utilization

4. **Error Rates**:
   - Audit failure rate
   - Timeout error rate
   - Session corruption rate

### Alerting Thresholds

```yaml
# Example alerting configuration
alerts:
  - name: "High Audit Timeout Rate"
    condition: "audit_timeout_rate > 0.1"  # 10%
    severity: "warning"
    
  - name: "High Memory Usage"
    condition: "memory_usage > 0.8"  # 80%
    severity: "critical"
    
  - name: "Session Storage Full"
    condition: "disk_usage > 0.9"  # 90%
    severity: "critical"
    
  - name: "Low Session Completion Rate"
    condition: "session_completion_rate < 0.7"  # 70%
    severity: "warning"
```

## Troubleshooting Common Migration Issues

### Issue 1: High Memory Usage

**Symptoms**: System running out of memory, slow performance
**Causes**: Too many concurrent sessions, memory leaks
**Solutions**:
```bash
# Reduce concurrency
export MAX_CONCURRENT_SESSIONS=25
export MAX_CONCURRENT_AUDITS=5

# Enable more aggressive cleanup
export SESSION_CLEANUP_INTERVAL=1800000  # 30 minutes
export MAX_SESSION_AGE=43200000  # 12 hours
```

### Issue 2: Frequent Timeouts

**Symptoms**: Many audit operations timing out
**Causes**: Insufficient timeout, overloaded system, network issues
**Solutions**:
```bash
# Increase timeout
export AUDIT_TIMEOUT_SECONDS=60

# Enable retries
export AUDIT_TIMEOUT_RETRY_ATTEMPTS=2

# Enable partial results
export AUDIT_PARTIAL_RESULTS_ON_TIMEOUT=true
```

### Issue 3: Session Persistence Failures

**Symptoms**: Sessions not persisting, data loss
**Causes**: Disk space issues, permission problems
**Solutions**:
```bash
# Check disk space
df -h $SYNC_AUDIT_STATE_DIRECTORY

# Check permissions
ls -la $SYNC_AUDIT_STATE_DIRECTORY

# Fix permissions if needed
sudo chown -R gansauditor:gansauditor $SYNC_AUDIT_STATE_DIRECTORY
sudo chmod 755 $SYNC_AUDIT_STATE_DIRECTORY
```

### Issue 4: Stagnation Detection False Positives

**Symptoms**: Sessions terminating prematurely due to stagnation
**Causes**: Threshold too sensitive, similar but improving responses
**Solutions**:
```bash
# Reduce sensitivity
export SYNC_AUDIT_STAGNATION_THRESHOLD=0.98

# Delay stagnation detection
export SYNC_AUDIT_STAGNATION_START_LOOP=15

# Disable if problematic
export ENABLE_STAGNATION_DETECTION=false
```

## Post-Migration Optimization

### Performance Tuning

After successful migration, optimize based on observed patterns:

1. **Analyze completion patterns**: Adjust tier thresholds based on actual completion rates
2. **Optimize timeouts**: Set timeouts based on 95th percentile completion times
3. **Tune concurrency**: Adjust based on system capacity and response time requirements
4. **Cache optimization**: Monitor cache hit rates and adjust cache settings

### Capacity Planning

Plan for growth based on migration results:

1. **Session storage**: Monitor growth rate and plan disk expansion
2. **Memory requirements**: Track memory usage patterns for scaling decisions
3. **Network bandwidth**: Monitor Codex API usage for bandwidth planning
4. **Compute resources**: Plan CPU scaling based on audit processing patterns

## Success Criteria

The migration is considered successful when:

1. **Functionality**: All existing functionality works as before
2. **Performance**: Response times are acceptable (within 2x of async mode)
3. **Reliability**: Error rates are below 5%
4. **Resource usage**: System resources are within acceptable limits
5. **User experience**: Users report improved code quality and feedback

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review session storage usage and cleanup old sessions
2. **Monthly**: Analyze performance metrics and optimize configuration
3. **Quarterly**: Review and update completion criteria based on usage patterns

### Getting Help

If you encounter issues during migration:

1. Check the troubleshooting section in this guide
2. Review system logs for error messages
3. Use the built-in configuration validation tools
4. Consult the configuration documentation
5. Contact support with specific error messages and configuration details

Remember: The synchronous audit workflow is designed to be backward compatible. If issues arise, you can always fall back to async mode while troubleshooting.