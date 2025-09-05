# Configuration Quick Start Guide

This guide helps you quickly configure the GansAuditor Codex synchronous audit workflow for your environment.

## Quick Setup

### 1. Enable Synchronous Mode

```bash
# Minimum required settings
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true
```

### 2. Validate Configuration

```bash
# Run configuration validation
npm run validate-config

# Or get JSON output for automation
npm run validate-config:json
```

### 3. Choose Environment Template

Copy the appropriate environment template:

```bash
# For development
cp config/development.env .env

# For production
cp config/production.env .env
```

### 4. Customize Settings

Edit your `.env` file to match your requirements:

```bash
# Core settings
ENABLE_GAN_AUDITING=true
ENABLE_SYNCHRONOUS_AUDIT=true

# Adjust timeout for your workload
AUDIT_TIMEOUT_SECONDS=30

# Set concurrency based on your system
MAX_CONCURRENT_AUDITS=5
MAX_CONCURRENT_SESSIONS=50
```

## Common Configuration Scenarios

### Development Environment

```bash
# Relaxed settings for development
ENABLE_SYNCHRONOUS_AUDIT=true
AUDIT_TIMEOUT_SECONDS=60
MAX_CONCURRENT_AUDITS=2
SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=verbose
ENABLE_SYNC_AUDIT_METRICS=true
```

### Production Environment

```bash
# Optimized for production
ENABLE_SYNCHRONOUS_AUDIT=true
AUDIT_TIMEOUT_SECONDS=30
MAX_CONCURRENT_AUDITS=10
MAX_CONCURRENT_SESSIONS=100
ENABLE_AUDIT_CACHING=true
ENABLE_SYNC_AUDIT_METRICS=true
```

### High-Performance Environment

```bash
# Aggressive settings for high throughput
ENABLE_SYNCHRONOUS_AUDIT=true
AUDIT_TIMEOUT_SECONDS=20
MAX_CONCURRENT_AUDITS=20
SYNC_AUDIT_TIER1_LOOPS=8
SYNC_AUDIT_TIER2_LOOPS=12
SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=basic
```

## Validation and Troubleshooting

### Check Configuration Health

```bash
# Validate current configuration
npm run validate-config

# Expected output for healthy config:
# ✓ Configuration validation passed
# ✓ Synchronous mode is ready
# ✓ No migration recommendations
```

### Common Issues and Solutions

#### Issue: "Synchronous mode is not ready"

```bash
# Check if core features are enabled
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true
```

#### Issue: "High timeout rate"

```bash
# Increase timeout or reduce concurrency
export AUDIT_TIMEOUT_SECONDS=60
export MAX_CONCURRENT_AUDITS=3
```

#### Issue: "High memory usage"

```bash
# Reduce concurrent sessions and enable cleanup
export MAX_CONCURRENT_SESSIONS=25
export SESSION_CLEANUP_INTERVAL=1800000  # 30 minutes
export MAX_SESSION_AGE=43200000  # 12 hours
```

## Environment Variables Reference

### Essential Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_GAN_AUDITING` | `false` | Enable GAN auditing functionality |
| `ENABLE_SYNCHRONOUS_AUDIT` | `false` | Enable synchronous audit workflow |
| `AUDIT_TIMEOUT_SECONDS` | `30` | Timeout for audit operations |
| `MAX_CONCURRENT_AUDITS` | `5` | Maximum concurrent audits |
| `MAX_CONCURRENT_SESSIONS` | `50` | Maximum concurrent sessions |

### Completion Criteria

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_AUDIT_TIER1_SCORE` | `95` | Score threshold for Tier 1 completion |
| `SYNC_AUDIT_TIER1_LOOPS` | `10` | Max loops for Tier 1 completion |
| `SYNC_AUDIT_TIER2_SCORE` | `90` | Score threshold for Tier 2 completion |
| `SYNC_AUDIT_TIER2_LOOPS` | `15` | Max loops for Tier 2 completion |
| `SYNC_AUDIT_TIER3_SCORE` | `85` | Score threshold for Tier 3 completion |
| `SYNC_AUDIT_TIER3_LOOPS` | `20` | Max loops for Tier 3 completion |
| `SYNC_AUDIT_HARD_STOP_LOOPS` | `25` | Hard stop maximum loops |

### Performance Tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_AUDIT_CACHING` | `true` | Enable audit result caching |
| `ENABLE_SESSION_PERSISTENCE` | `true` | Enable session state persistence |
| `SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL` | `detailed` | Feedback detail level |
| `ENABLE_STAGNATION_DETECTION` | `true` | Enable stagnation detection |

## Migration from Async Mode

### Step 1: Test with Async Mode

```bash
# Keep async mode while testing new codebase
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=false
```

### Step 2: Enable Sync Mode Gradually

```bash
# Enable sync mode with conservative settings
export ENABLE_SYNCHRONOUS_AUDIT=true
export AUDIT_TIMEOUT_SECONDS=60
export MAX_CONCURRENT_AUDITS=2
```

### Step 3: Optimize for Production

```bash
# Gradually increase performance settings
export AUDIT_TIMEOUT_SECONDS=30
export MAX_CONCURRENT_AUDITS=10
export ENABLE_AUDIT_CACHING=true
```

## Monitoring and Maintenance

### Enable Monitoring

```bash
# Enable metrics and health checks
export ENABLE_SYNC_AUDIT_METRICS=true
export ENABLE_SYNC_AUDIT_HEALTH_CHECKS=true
```

### Regular Maintenance

```bash
# Configure automatic cleanup
export SESSION_CLEANUP_INTERVAL=3600000  # 1 hour
export MAX_SESSION_AGE=86400000  # 24 hours
```

### Performance Monitoring

Monitor these key metrics:
- Average audit completion time
- Session completion rate
- Memory and disk usage
- Error rates

## Getting Help

1. **Configuration Issues**: Run `npm run validate-config` for detailed diagnostics
2. **Performance Issues**: Check the [Performance Tuning Guide](./SYNCHRONOUS_AUDIT_CONFIGURATION.md#performance-tuning)
3. **Migration Issues**: Follow the [Migration Guide](./SYNCHRONOUS_AUDIT_MIGRATION_GUIDE.md)
4. **Advanced Configuration**: See the [Complete Configuration Reference](./SYNCHRONOUS_AUDIT_CONFIGURATION.md)

## Next Steps

1. ✅ Configure basic synchronous mode
2. ✅ Validate configuration
3. ✅ Test with sample workload
4. ⏭️ Monitor performance metrics
5. ⏭️ Optimize based on usage patterns
6. ⏭️ Set up production monitoring