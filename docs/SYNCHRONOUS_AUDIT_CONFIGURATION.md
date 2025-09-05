# Synchronous Audit Workflow Configuration Guide

This guide covers the configuration options for the synchronous audit workflow feature in GansAuditor Codex.

## Overview

The synchronous audit workflow enables iterative code improvement through real-time feedback loops. This feature requires proper configuration to ensure optimal performance and reliability.

## Environment Variables

### Core Synchronous Mode Settings

#### `ENABLE_SYNCHRONOUS_AUDIT`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enables the synchronous audit workflow mode
- **Example**: `ENABLE_SYNCHRONOUS_AUDIT=true`

#### `ENABLE_GAN_AUDITING`
- **Type**: Boolean  
- **Default**: `false`
- **Description**: Enables GAN auditing functionality (required for synchronous mode)
- **Example**: `ENABLE_GAN_AUDITING=true`

### Completion Criteria Configuration

#### `SYNC_AUDIT_TIER1_SCORE`
- **Type**: Integer (0-100)
- **Default**: `95`
- **Description**: Score threshold for Tier 1 completion
- **Example**: `SYNC_AUDIT_TIER1_SCORE=95`

#### `SYNC_AUDIT_TIER1_LOOPS`
- **Type**: Integer (1-100)
- **Default**: `10`
- **Description**: Maximum loops for Tier 1 completion
- **Example**: `SYNC_AUDIT_TIER1_LOOPS=10`

#### `SYNC_AUDIT_TIER2_SCORE`
- **Type**: Integer (0-100)
- **Default**: `90`
- **Description**: Score threshold for Tier 2 completion
- **Example**: `SYNC_AUDIT_TIER2_SCORE=90`

#### `SYNC_AUDIT_TIER2_LOOPS`
- **Type**: Integer (1-100)
- **Default**: `15`
- **Description**: Maximum loops for Tier 2 completion
- **Example**: `SYNC_AUDIT_TIER2_LOOPS=15`

#### `SYNC_AUDIT_TIER3_SCORE`
- **Type**: Integer (0-100)
- **Default**: `85`
- **Description**: Score threshold for Tier 3 completion
- **Example**: `SYNC_AUDIT_TIER3_SCORE=85`

#### `SYNC_AUDIT_TIER3_LOOPS`
- **Type**: Integer (1-100)
- **Default**: `20`
- **Description**: Maximum loops for Tier 3 completion
- **Example**: `SYNC_AUDIT_TIER3_LOOPS=20`

#### `SYNC_AUDIT_HARD_STOP_LOOPS`
- **Type**: Integer (1-1000)
- **Default**: `25`
- **Description**: Hard stop maximum loops before forced termination
- **Example**: `SYNC_AUDIT_HARD_STOP_LOOPS=25`

### Stagnation Detection Configuration

#### `SYNC_AUDIT_STAGNATION_START_LOOP`
- **Type**: Integer (1-100)
- **Default**: `10`
- **Description**: Loop number to start stagnation detection
- **Example**: `SYNC_AUDIT_STAGNATION_START_LOOP=10`

#### `SYNC_AUDIT_STAGNATION_THRESHOLD`
- **Type**: Float (0.0-1.0)
- **Default**: `0.95`
- **Description**: Similarity threshold for stagnation detection
- **Example**: `SYNC_AUDIT_STAGNATION_THRESHOLD=0.95`

### Timeout Configuration

#### `AUDIT_TIMEOUT_SECONDS`
- **Type**: Integer (5-300)
- **Default**: `30`
- **Description**: Timeout for audit operations in seconds
- **Example**: `AUDIT_TIMEOUT_SECONDS=30`

#### `AUDIT_PROGRESS_INDICATOR_INTERVAL`
- **Type**: Integer (1000-30000)
- **Default**: `5000`
- **Description**: Interval for progress indicators in milliseconds
- **Example**: `AUDIT_PROGRESS_INDICATOR_INTERVAL=5000`

#### `ENABLE_AUDIT_PROGRESS_INDICATORS`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to show progress indicators during audits
- **Example**: `ENABLE_AUDIT_PROGRESS_INDICATORS=true`

#### `AUDIT_TIMEOUT_RETRY_ATTEMPTS`
- **Type**: Integer (0-5)
- **Default**: `1`
- **Description**: Number of retry attempts on audit timeout
- **Example**: `AUDIT_TIMEOUT_RETRY_ATTEMPTS=1`

#### `AUDIT_PARTIAL_RESULTS_ON_TIMEOUT`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to return partial results on timeout
- **Example**: `AUDIT_PARTIAL_RESULTS_ON_TIMEOUT=true`

### Concurrency Configuration

#### `MAX_CONCURRENT_AUDITS`
- **Type**: Integer (1-50)
- **Default**: `5`
- **Description**: Maximum number of concurrent audit operations
- **Example**: `MAX_CONCURRENT_AUDITS=5`

#### `MAX_CONCURRENT_SESSIONS`
- **Type**: Integer (1-1000)
- **Default**: `50`
- **Description**: Maximum number of concurrent sessions
- **Example**: `MAX_CONCURRENT_SESSIONS=50`

#### `AUDIT_QUEUE_TIMEOUT`
- **Type**: Integer (5000-300000)
- **Default**: `60000`
- **Description**: Timeout for queued operations in milliseconds
- **Example**: `AUDIT_QUEUE_TIMEOUT=60000`

#### `ENABLE_AUDIT_QUEUE`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to enable audit operation queuing
- **Example**: `ENABLE_AUDIT_QUEUE=true`

### Session Management Configuration

#### `SESSION_CLEANUP_INTERVAL`
- **Type**: Integer (60000-86400000)
- **Default**: `3600000`
- **Description**: Interval for session cleanup in milliseconds (1 hour)
- **Example**: `SESSION_CLEANUP_INTERVAL=3600000`

#### `MAX_SESSION_AGE`
- **Type**: Integer (300000-604800000)
- **Default**: `86400000`
- **Description**: Maximum age for sessions in milliseconds (24 hours)
- **Example**: `MAX_SESSION_AGE=86400000`

#### `SYNC_AUDIT_STATE_DIRECTORY`
- **Type**: String
- **Default**: `.mcp-gan-state`
- **Description**: Directory for storing session state files
- **Example**: `SYNC_AUDIT_STATE_DIRECTORY=.mcp-gan-state`

### Feature Flags

#### `ENABLE_STAGNATION_DETECTION`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to enable stagnation detection
- **Example**: `ENABLE_STAGNATION_DETECTION=true`

#### `ENABLE_CODEX_CONTEXT_MANAGEMENT`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to enable Codex context window management
- **Example**: `ENABLE_CODEX_CONTEXT_MANAGEMENT=true`

#### `ENABLE_AUDIT_CACHING`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to enable audit result caching
- **Example**: `ENABLE_AUDIT_CACHING=true`

#### `ENABLE_SESSION_PERSISTENCE`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to enable session state persistence
- **Example**: `ENABLE_SESSION_PERSISTENCE=true`

#### `SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL`
- **Type**: String (`basic` | `detailed` | `verbose`)
- **Default**: `detailed`
- **Description**: Level of detail for audit feedback
- **Example**: `SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=detailed`

### Monitoring and Observability

#### `ENABLE_SYNC_AUDIT_METRICS`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Whether to enable performance metrics collection
- **Example**: `ENABLE_SYNC_AUDIT_METRICS=true`

#### `ENABLE_SYNC_AUDIT_HEALTH_CHECKS`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Whether to enable health check endpoints
- **Example**: `ENABLE_SYNC_AUDIT_HEALTH_CHECKS=true`

### Legacy Compatibility

#### `DISABLE_THOUGHT_LOGGING`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Whether to disable thought logging to console
- **Example**: `DISABLE_THOUGHT_LOGGING=false`

## Configuration Examples

### Development Environment

```bash
# Enable synchronous audit workflow for development
ENABLE_GAN_AUDITING=true
ENABLE_SYNCHRONOUS_AUDIT=true

# Relaxed timeouts for development
AUDIT_TIMEOUT_SECONDS=60
AUDIT_PROGRESS_INDICATOR_INTERVAL=10000

# Lower concurrency for development
MAX_CONCURRENT_AUDITS=2
MAX_CONCURRENT_SESSIONS=10

# Enable all features for testing
ENABLE_STAGNATION_DETECTION=true
ENABLE_CODEX_CONTEXT_MANAGEMENT=true
ENABLE_AUDIT_CACHING=true
ENABLE_SESSION_PERSISTENCE=true

# Verbose feedback for debugging
SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=verbose

# Enable monitoring
ENABLE_SYNC_AUDIT_METRICS=true
ENABLE_SYNC_AUDIT_HEALTH_CHECKS=true
```

### Production Environment

```bash
# Enable synchronous audit workflow
ENABLE_GAN_AUDITING=true
ENABLE_SYNCHRONOUS_AUDIT=true

# Production timeouts
AUDIT_TIMEOUT_SECONDS=30
AUDIT_PROGRESS_INDICATOR_INTERVAL=5000

# Production concurrency
MAX_CONCURRENT_AUDITS=10
MAX_CONCURRENT_SESSIONS=100

# Enable performance features
ENABLE_AUDIT_CACHING=true
ENABLE_SESSION_PERSISTENCE=true

# Standard feedback level
SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=detailed

# Enable monitoring
ENABLE_SYNC_AUDIT_METRICS=true
ENABLE_SYNC_AUDIT_HEALTH_CHECKS=true

# Longer session retention
MAX_SESSION_AGE=172800000  # 48 hours
SESSION_CLEANUP_INTERVAL=7200000  # 2 hours
```

### High-Performance Environment

```bash
# Enable synchronous audit workflow
ENABLE_GAN_AUDITING=true
ENABLE_SYNCHRONOUS_AUDIT=true

# Aggressive timeouts
AUDIT_TIMEOUT_SECONDS=20
AUDIT_PROGRESS_INDICATOR_INTERVAL=3000

# High concurrency
MAX_CONCURRENT_AUDITS=20
MAX_CONCURRENT_SESSIONS=200

# Optimize for performance
ENABLE_AUDIT_CACHING=true
SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=basic

# Shorter completion criteria
SYNC_AUDIT_TIER1_LOOPS=8
SYNC_AUDIT_TIER2_LOOPS=12
SYNC_AUDIT_TIER3_LOOPS=16
SYNC_AUDIT_HARD_STOP_LOOPS=20

# Aggressive cleanup
MAX_SESSION_AGE=43200000  # 12 hours
SESSION_CLEANUP_INTERVAL=1800000  # 30 minutes
```

## Configuration Validation

The system automatically validates configuration values and provides warnings for inconsistent settings:

### Validation Rules

1. **Completion Criteria Consistency**:
   - Tier 1 score should be higher than Tier 2 score
   - Tier 2 score should be higher than Tier 3 score
   - Loop limits should increase across tiers
   - Hard stop must be higher than all tier limits

2. **Timeout Configuration**:
   - Audit timeout must be at least 5 seconds
   - Progress indicator interval should be less than audit timeout

3. **Concurrency Limits**:
   - Max concurrent audits must be at least 1
   - Max concurrent sessions should be at least equal to max concurrent audits

4. **Session Management**:
   - Session cleanup interval should be reasonable (not too frequent)
   - Max session age should be longer than typical workflow duration

### Configuration Health Check

Use the built-in configuration health check to validate your setup:

```typescript
import { isSynchronousModeReady } from './src/config/synchronous-config.js';

const healthCheck = isSynchronousModeReady();
if (!healthCheck.ready) {
  console.error('Configuration issues:', healthCheck.issues);
  console.log('Recommendations:', healthCheck.recommendations);
}
```

## Migration Recommendations

The system provides automatic migration recommendations based on your current configuration:

```typescript
import { generateMigrationRecommendations } from './src/config/synchronous-config.js';

const migration = generateMigrationRecommendations();
console.log('Current config:', migration.currentConfig);
console.log('Recommendations:', migration.recommendations);
```

## Troubleshooting

### Common Configuration Issues

1. **Synchronous mode not working**:
   - Ensure `ENABLE_GAN_AUDITING=true`
   - Ensure `ENABLE_SYNCHRONOUS_AUDIT=true`
   - Check that audit timeout is reasonable

2. **Performance issues**:
   - Reduce `MAX_CONCURRENT_AUDITS` if system is overloaded
   - Increase `AUDIT_TIMEOUT_SECONDS` for complex code
   - Enable `ENABLE_AUDIT_CACHING` for repeated reviews

3. **Session persistence issues**:
   - Ensure `ENABLE_SESSION_PERSISTENCE=true`
   - Check that `SYNC_AUDIT_STATE_DIRECTORY` is writable
   - Verify disk space for session storage

4. **Stagnation detection false positives**:
   - Increase `SYNC_AUDIT_STAGNATION_THRESHOLD` (closer to 1.0)
   - Increase `SYNC_AUDIT_STAGNATION_START_LOOP`
   - Set `ENABLE_STAGNATION_DETECTION=false` to disable

### Performance Tuning

1. **For faster responses**:
   - Reduce `AUDIT_TIMEOUT_SECONDS`
   - Increase `MAX_CONCURRENT_AUDITS`
   - Enable `ENABLE_AUDIT_CACHING`
   - Use `SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=basic`

2. **For better quality**:
   - Increase `AUDIT_TIMEOUT_SECONDS`
   - Use `SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=verbose`
   - Increase tier score thresholds
   - Increase maximum loop limits

3. **For resource efficiency**:
   - Reduce `MAX_CONCURRENT_SESSIONS`
   - Reduce `MAX_SESSION_AGE`
   - Increase `SESSION_CLEANUP_INTERVAL`
   - Disable metrics if not needed

## Best Practices

1. **Start with defaults**: Begin with default configuration and adjust based on observed performance
2. **Monitor metrics**: Enable metrics in production to understand system behavior
3. **Gradual rollout**: Enable synchronous mode for a subset of users initially
4. **Regular cleanup**: Ensure session cleanup is working to prevent disk space issues
5. **Health monitoring**: Implement health checks to detect configuration problems early