# Synchronous Audit Workflow Troubleshooting Guide

This guide helps diagnose and resolve common issues with the GansAuditor synchronous audit workflow.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Configuration Issues](#configuration-issues)
3. [Performance Problems](#performance-problems)
4. [Session Management Issues](#session-management-issues)
5. [Completion and Loop Issues](#completion-and-loop-issues)
6. [Error Handling](#error-handling)
7. [Monitoring and Debugging](#monitoring-and-debugging)
8. [Common Scenarios](#common-scenarios)

## Quick Diagnostics

### Health Check Script

Run this script to quickly identify common issues:

```bash
#!/bin/bash
# synchronous-workflow-health-check.sh

echo "=== GansAuditor Synchronous Workflow Health Check ==="

# Check environment variables
echo "1. Environment Configuration:"
if [ "$ENABLE_GAN_AUDITING" = "true" ] && [ "$ENABLE_SYNCHRONOUS_AUDIT" = "true" ]; then
    echo "✓ Synchronous audit mode enabled"
else
    echo "✗ Synchronous audit mode not properly enabled"
    echo "  ENABLE_GAN_AUDITING: ${ENABLE_GAN_AUDITING:-not set}"
    echo "  ENABLE_SYNCHRONOUS_AUDIT: ${ENABLE_SYNCHRONOUS_AUDIT:-not set}"
fi

# Check state directory
echo "2. State Directory:"
STATE_DIR=${SYNC_AUDIT_STATE_DIRECTORY:-.mcp-gan-state}
if [ -d "$STATE_DIR" ] && [ -w "$STATE_DIR" ]; then
    echo "✓ State directory accessible: $STATE_DIR"
    echo "  Sessions: $(ls -1 "$STATE_DIR"/*.json 2>/dev/null | wc -l)"
else
    echo "✗ State directory not accessible: $STATE_DIR"
fi

# Check configuration validation
echo "3. Configuration Validation:"
node -e "
try {
  const { isSynchronousModeReady } = require('./dist/src/config/synchronous-config.js');
  const result = isSynchronousModeReady();
  if (result.ready) {
    console.log('✓ Configuration validation passed');
  } else {
    console.log('✗ Configuration validation failed:');
    result.issues.forEach(issue => console.log('  - ' + issue));
  }
} catch (error) {
  console.log('✗ Configuration check failed:', error.message);
}
" 2>/dev/null || echo "✗ Cannot validate configuration (build required)"

# Check resource availability
echo "4. Resource Availability:"
AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$AVAILABLE_MEMORY" -gt 512 ]; then
    echo "✓ Sufficient memory available: ${AVAILABLE_MEMORY}MB"
else
    echo "⚠ Low memory available: ${AVAILABLE_MEMORY}MB (recommend 512MB+)"
fi

AVAILABLE_DISK=$(df -m "$STATE_DIR" 2>/dev/null | awk 'NR==2{printf "%.0f", $4}')
if [ "$AVAILABLE_DISK" -gt 1024 ]; then
    echo "✓ Sufficient disk space: ${AVAILABLE_DISK}MB"
else
    echo "⚠ Low disk space: ${AVAILABLE_DISK}MB (recommend 1GB+)"
fi

echo "=== Health check completed ==="
```

### Configuration Validator

```javascript
// config-validator.js
const { createRuntimeConfig, isSynchronousModeReady } = require('./dist/src/config/synchronous-config.js');

function validateConfiguration() {
  console.log('=== Configuration Validation ===');
  
  // Check if synchronous mode is ready
  const readiness = isSynchronousModeReady();
  console.log('Synchronous Mode Ready:', readiness.ready);
  
  if (!readiness.ready) {
    console.log('Issues:');
    readiness.issues.forEach(issue => console.log('  -', issue));
    console.log('Recommendations:');
    readiness.recommendations.forEach(rec => console.log('  -', rec));
    return false;
  }
  
  // Validate runtime configuration
  const { config, validation } = createRuntimeConfig();
  console.log('Configuration Valid:', validation.isValid);
  
  if (!validation.isValid) {
    console.log('Validation Errors:');
    validation.errors.forEach(error => console.log('  -', error));
    return false;
  }
  
  // Display current configuration
  console.log('Current Configuration:');
  console.log('  Completion Criteria:');
  console.log('    Tier 1:', config.completionCriteria.tier1);
  console.log('    Tier 2:', config.completionCriteria.tier2);
  console.log('    Tier 3:', config.completionCriteria.tier3);
  console.log('    Hard Stop:', config.completionCriteria.hardStop);
  console.log('  Timeouts:');
  console.log('    Audit Timeout:', config.auditTimeout, 'seconds');
  console.log('  Concurrency:');
  console.log('    Max Audits:', config.maxConcurrentAudits);
  console.log('    Max Sessions:', config.maxConcurrentSessions);
  
  return true;
}

if (require.main === module) {
  validateConfiguration();
}

module.exports = { validateConfiguration };
```

## Configuration Issues

### Issue: Synchronous Mode Not Working

**Symptoms:**
- Tool returns responses without audit results
- `nextThoughtNeeded` always false
- No session state persistence

**Diagnosis:**
```bash
# Check environment variables
echo "ENABLE_GAN_AUDITING: $ENABLE_GAN_AUDITING"
echo "ENABLE_SYNCHRONOUS_AUDIT: $ENABLE_SYNCHRONOUS_AUDIT"

# Verify configuration
node -e "console.log(process.env.ENABLE_SYNCHRONOUS_AUDIT)"
```

**Solutions:**
```bash
# Ensure both flags are set
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true

# Restart the MCP server
# In your MCP client, reconnect to the server
```

### Issue: Invalid Completion Criteria

**Symptoms:**
- Configuration validation errors
- Unexpected completion behavior
- Sessions completing too early or too late

**Diagnosis:**
```javascript
// Check completion criteria consistency
const tier1Score = parseInt(process.env.SYNC_AUDIT_TIER1_SCORE || '95');
const tier2Score = parseInt(process.env.SYNC_AUDIT_TIER2_SCORE || '90');
const tier3Score = parseInt(process.env.SYNC_AUDIT_TIER3_SCORE || '85');

console.log('Score thresholds:', { tier1Score, tier2Score, tier3Score });
console.log('Valid:', tier1Score > tier2Score && tier2Score > tier3Score);
```

**Solutions:**
```bash
# Fix score hierarchy (higher tiers should have higher scores)
export SYNC_AUDIT_TIER1_SCORE=95
export SYNC_AUDIT_TIER2_SCORE=90
export SYNC_AUDIT_TIER3_SCORE=85

# Fix loop limits (should increase across tiers)
export SYNC_AUDIT_TIER1_LOOPS=10
export SYNC_AUDIT_TIER2_LOOPS=15
export SYNC_AUDIT_TIER3_LOOPS=20
export SYNC_AUDIT_HARD_STOP_LOOPS=25
```

### Issue: State Directory Problems

**Symptoms:**
- Session persistence failures
- "Cannot write to state directory" errors
- Sessions not resuming properly

**Diagnosis:**
```bash
# Check state directory
STATE_DIR=${SYNC_AUDIT_STATE_DIRECTORY:-.mcp-gan-state}
echo "State directory: $STATE_DIR"
ls -la "$STATE_DIR"

# Check permissions
test -w "$STATE_DIR" && echo "Writable" || echo "Not writable"
```

**Solutions:**
```bash
# Create state directory if missing
mkdir -p .mcp-gan-state

# Fix permissions
chmod 755 .mcp-gan-state

# Change state directory location if needed
export SYNC_AUDIT_STATE_DIRECTORY=/tmp/mcp-gan-state
mkdir -p /tmp/mcp-gan-state
```

## Performance Problems

### Issue: Frequent Timeouts

**Symptoms:**
- Many audit operations timing out
- "Audit timeout exceeded" errors
- Poor response times

**Diagnosis:**
```bash
# Check current timeout setting
echo "Audit timeout: ${AUDIT_TIMEOUT_SECONDS:-30} seconds"

# Monitor system load
top -n 1 | head -5

# Check concurrent operations
ps aux | grep -c "gansauditor-codex"
```

**Solutions:**
```bash
# Increase timeout for complex code
export AUDIT_TIMEOUT_SECONDS=60

# Enable partial results on timeout
export AUDIT_PARTIAL_RESULTS_ON_TIMEOUT=true

# Reduce concurrency if system is overloaded
export MAX_CONCURRENT_AUDITS=2
export MAX_CONCURRENT_SESSIONS=10

# Enable retry on timeout
export AUDIT_TIMEOUT_RETRY_ATTEMPTS=2
```

### Issue: High Memory Usage

**Symptoms:**
- System running out of memory
- Slow performance
- Process killed by OOM killer

**Diagnosis:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check session count
ls -1 .mcp-gan-state/*.json 2>/dev/null | wc -l

# Check session sizes
du -sh .mcp-gan-state/
```

**Solutions:**
```bash
# Reduce concurrent sessions
export MAX_CONCURRENT_SESSIONS=25

# Enable more aggressive cleanup
export SESSION_CLEANUP_INTERVAL=1800000  # 30 minutes
export MAX_SESSION_AGE=43200000  # 12 hours

# Disable caching if memory is critical
export ENABLE_AUDIT_CACHING=false

# Clean up old sessions manually
find .mcp-gan-state -name "*.json" -mtime +1 -delete
```

### Issue: Slow Audit Performance

**Symptoms:**
- Audits taking longer than expected
- High CPU usage
- Queue backlog building up

**Diagnosis:**
```bash
# Check audit queue status
node -e "
try {
  const { getAuditQueueStatus } = require('./dist/src/auditor/audit-queue.js');
  console.log(JSON.stringify(getAuditQueueStatus(), null, 2));
} catch (error) {
  console.log('Cannot check queue status:', error.message);
}
"

# Monitor CPU usage
top -p $(pgrep -f "gansauditor-codex")
```

**Solutions:**
```bash
# Enable audit caching
export ENABLE_AUDIT_CACHING=true

# Increase concurrency if system can handle it
export MAX_CONCURRENT_AUDITS=10

# Use basic feedback level for faster processing
export SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=basic

# Enable queue management
export ENABLE_AUDIT_QUEUE=true
export AUDIT_QUEUE_TIMEOUT=30000
```

## Session Management Issues

### Issue: Sessions Not Persisting

**Symptoms:**
- Sessions reset between calls
- Loss of iteration history
- `branchId` not maintaining state

**Diagnosis:**
```bash
# Check if session persistence is enabled
echo "Session persistence: ${ENABLE_SESSION_PERSISTENCE:-true}"

# Check for session files
ls -la .mcp-gan-state/

# Test session creation
node -e "
const fs = require('fs');
const testFile = '.mcp-gan-state/test-session.json';
try {
  fs.writeFileSync(testFile, JSON.stringify({test: true}));
  console.log('✓ Can write session files');
  fs.unlinkSync(testFile);
} catch (error) {
  console.log('✗ Cannot write session files:', error.message);
}
"
```

**Solutions:**
```bash
# Enable session persistence explicitly
export ENABLE_SESSION_PERSISTENCE=true

# Check and fix directory permissions
chmod 755 .mcp-gan-state
chmod 644 .mcp-gan-state/*.json 2>/dev/null || true

# Clear corrupted sessions
rm -f .mcp-gan-state/*.json
```

### Issue: Session Corruption

**Symptoms:**
- "Invalid session state" errors
- Sessions with malformed data
- Unexpected session behavior

**Diagnosis:**
```bash
# Check for corrupted session files
for file in .mcp-gan-state/*.json; do
  if [ -f "$file" ]; then
    echo "Checking $file:"
    node -e "
      try {
        const data = JSON.parse(require('fs').readFileSync('$file', 'utf8'));
        console.log('  ✓ Valid JSON');
      } catch (error) {
        console.log('  ✗ Invalid JSON:', error.message);
      }
    "
  fi
done
```

**Solutions:**
```bash
# Remove corrupted sessions
find .mcp-gan-state -name "*.json" -exec sh -c '
  node -e "JSON.parse(require(\"fs\").readFileSync(\"$1\", \"utf8\"))" 2>/dev/null || rm "$1"
' _ {} \;

# Reset all sessions if corruption is widespread
rm -rf .mcp-gan-state
mkdir -p .mcp-gan-state
```

### Issue: Too Many Active Sessions

**Symptoms:**
- "Maximum sessions exceeded" errors
- Poor performance with many sessions
- High memory usage

**Diagnosis:**
```bash
# Count active sessions
echo "Active sessions: $(ls -1 .mcp-gan-state/*.json 2>/dev/null | wc -l)"
echo "Max sessions: ${MAX_CONCURRENT_SESSIONS:-50}"

# Check session ages
find .mcp-gan-state -name "*.json" -printf "%T@ %p\n" | sort -n | tail -10
```

**Solutions:**
```bash
# Increase session limit if system can handle it
export MAX_CONCURRENT_SESSIONS=100

# Enable more frequent cleanup
export SESSION_CLEANUP_INTERVAL=1800000  # 30 minutes

# Reduce session lifetime
export MAX_SESSION_AGE=21600000  # 6 hours

# Manual cleanup of old sessions
find .mcp-gan-state -name "*.json" -mtime +1 -delete
```

## Completion and Loop Issues

### Issue: Stagnation Detection False Positives

**Symptoms:**
- Sessions terminating prematurely
- "Stagnation detected" when progress is being made
- Similar but improving responses flagged as stagnant

**Diagnosis:**
```bash
# Check stagnation settings
echo "Stagnation detection: ${ENABLE_STAGNATION_DETECTION:-true}"
echo "Stagnation threshold: ${SYNC_AUDIT_STAGNATION_THRESHOLD:-0.95}"
echo "Stagnation start loop: ${SYNC_AUDIT_STAGNATION_START_LOOP:-10}"
```

**Solutions:**
```bash
# Reduce sensitivity (closer to 1.0 = less sensitive)
export SYNC_AUDIT_STAGNATION_THRESHOLD=0.98

# Delay stagnation detection
export SYNC_AUDIT_STAGNATION_START_LOOP=15

# Disable stagnation detection if problematic
export ENABLE_STAGNATION_DETECTION=false
```

### Issue: Sessions Never Completing

**Symptoms:**
- All sessions hit hard stop limit
- Scores plateau below completion thresholds
- Poor completion rates

**Diagnosis:**
```bash
# Analyze completion statistics
node -e "
const fs = require('fs');
const sessions = fs.readdirSync('.mcp-gan-state')
  .filter(f => f.endsWith('.json'))
  .map(f => {
    try {
      return JSON.parse(fs.readFileSync('.mcp-gan-state/' + f));
    } catch {
      return null;
    }
  })
  .filter(Boolean);

console.log('Total sessions:', sessions.length);
console.log('Completed:', sessions.filter(s => s.isComplete).length);
console.log('Hit hard stop:', sessions.filter(s => s.currentLoop >= 25).length);

const avgScore = sessions.reduce((sum, s) => {
  const lastScore = s.history[s.history.length - 1]?.overall || 0;
  return sum + lastScore;
}, 0) / sessions.length;
console.log('Average final score:', avgScore.toFixed(1));
"
```

**Solutions:**
```bash
# Relax completion criteria
export SYNC_AUDIT_TIER1_SCORE=90
export SYNC_AUDIT_TIER2_SCORE=85
export SYNC_AUDIT_TIER3_SCORE=80

# Increase loop limits
export SYNC_AUDIT_TIER1_LOOPS=15
export SYNC_AUDIT_TIER2_LOOPS=20
export SYNC_AUDIT_TIER3_LOOPS=25
export SYNC_AUDIT_HARD_STOP_LOOPS=30

# Use more detailed feedback to help improvement
export SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=verbose
```

### Issue: Sessions Completing Too Early

**Symptoms:**
- Low-quality code passing completion criteria
- Scores seem inflated
- Completion at low loop counts

**Diagnosis:**
```bash
# Check if completion criteria are too lenient
echo "Tier 1: ${SYNC_AUDIT_TIER1_SCORE:-95}% at ${SYNC_AUDIT_TIER1_LOOPS:-10} loops"
echo "Tier 2: ${SYNC_AUDIT_TIER2_SCORE:-90}% at ${SYNC_AUDIT_TIER2_LOOPS:-15} loops"
echo "Tier 3: ${SYNC_AUDIT_TIER3_SCORE:-85}% at ${SYNC_AUDIT_TIER3_LOOPS:-20} loops"
```

**Solutions:**
```bash
# Tighten completion criteria
export SYNC_AUDIT_TIER1_SCORE=98
export SYNC_AUDIT_TIER2_SCORE=95
export SYNC_AUDIT_TIER3_SCORE=90

# Reduce early completion opportunities
export SYNC_AUDIT_TIER1_LOOPS=8
export SYNC_AUDIT_TIER2_LOOPS=12
export SYNC_AUDIT_TIER3_LOOPS=18
```

## Error Handling

### Issue: Audit Service Failures

**Symptoms:**
- "Audit service unavailable" errors
- Timeouts during audit operations
- Inconsistent audit results

**Diagnosis:**
```bash
# Test audit service connectivity
node -e "
const { testAuditService } = require('./dist/src/auditor/gan-auditor.js');
testAuditService()
  .then(() => console.log('✓ Audit service available'))
  .catch(error => console.log('✗ Audit service error:', error.message));
"
```

**Solutions:**
```bash
# Enable retry on audit failures
export AUDIT_TIMEOUT_RETRY_ATTEMPTS=2

# Enable partial results on failure
export AUDIT_PARTIAL_RESULTS_ON_TIMEOUT=true

# Increase timeout for unreliable connections
export AUDIT_TIMEOUT_SECONDS=90

# Enable graceful degradation
export ENABLE_GRACEFUL_AUDIT_DEGRADATION=true
```

### Issue: JSON Parsing Errors

**Symptoms:**
- "Invalid JSON response" errors
- Malformed audit results
- Parsing failures in responses

**Diagnosis:**
```bash
# Check recent error logs
tail -100 /var/log/gansauditor-codex.log | grep -i "json\|parse"

# Test JSON parsing with sample data
node -e "
try {
  const sample = '{\"test\": true}';
  JSON.parse(sample);
  console.log('✓ JSON parsing works');
} catch (error) {
  console.log('✗ JSON parsing error:', error.message);
}
"
```

**Solutions:**
```bash
# Enable JSON validation
export ENABLE_STRICT_JSON_VALIDATION=true

# Use fallback parsing for malformed responses
export ENABLE_LENIENT_JSON_PARSING=true

# Log raw responses for debugging
export LOG_RAW_AUDIT_RESPONSES=true
```

## Monitoring and Debugging

### Session State Inspector

```javascript
// session-inspector.js
const fs = require('fs');
const path = require('path');

function inspectSessions(stateDir = '.mcp-gan-state') {
  if (!fs.existsSync(stateDir)) {
    console.log('State directory does not exist:', stateDir);
    return;
  }

  const sessionFiles = fs.readdirSync(stateDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(stateDir, f));

  console.log(`Found ${sessionFiles.length} session files`);

  const sessions = sessionFiles.map(file => {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return { file: path.basename(file), ...data };
    } catch (error) {
      console.log(`Corrupted session file: ${file}`);
      return null;
    }
  }).filter(Boolean);

  // Statistics
  const completed = sessions.filter(s => s.isComplete);
  const active = sessions.filter(s => !s.isComplete);
  const stagnant = sessions.filter(s => s.stagnationInfo?.isStagnant);

  console.log('\n=== Session Statistics ===');
  console.log(`Total sessions: ${sessions.length}`);
  console.log(`Completed: ${completed.length}`);
  console.log(`Active: ${active.length}`);
  console.log(`Stagnant: ${stagnant.length}`);

  if (sessions.length > 0) {
    const avgLoops = sessions.reduce((sum, s) => sum + s.currentLoop, 0) / sessions.length;
    console.log(`Average loops: ${avgLoops.toFixed(1)}`);

    const avgScore = sessions.reduce((sum, s) => {
      const lastScore = s.history[s.history.length - 1]?.overall || 0;
      return sum + lastScore;
    }, 0) / sessions.length;
    console.log(`Average final score: ${avgScore.toFixed(1)}`);
  }

  // Recent sessions
  console.log('\n=== Recent Sessions ===');
  sessions
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)
    .forEach(s => {
      const lastScore = s.history[s.history.length - 1]?.overall || 0;
      const status = s.isComplete ? 'COMPLETED' : 'ACTIVE';
      console.log(`${s.id}: ${status} - Loop ${s.currentLoop}, Score ${lastScore}`);
    });

  // Problem sessions
  const problemSessions = sessions.filter(s => 
    s.currentLoop > 20 || 
    s.stagnationInfo?.isStagnant ||
    s.history.length !== s.currentLoop
  );

  if (problemSessions.length > 0) {
    console.log('\n=== Problem Sessions ===');
    problemSessions.forEach(s => {
      console.log(`${s.id}:`);
      if (s.currentLoop > 20) console.log('  - High loop count:', s.currentLoop);
      if (s.stagnationInfo?.isStagnant) console.log('  - Stagnant');
      if (s.history.length !== s.currentLoop) console.log('  - History mismatch');
    });
  }
}

if (require.main === module) {
  const stateDir = process.argv[2] || '.mcp-gan-state';
  inspectSessions(stateDir);
}

module.exports = { inspectSessions };
```

### Performance Monitor

```javascript
// performance-monitor.js
const fs = require('fs');
const os = require('os');

function monitorPerformance() {
  console.log('=== Performance Monitor ===');
  
  // System resources
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = (usedMem / totalMem * 100).toFixed(1);
  
  console.log(`Memory: ${memUsage}% used (${Math.round(usedMem / 1024 / 1024)}MB / ${Math.round(totalMem / 1024 / 1024)}MB)`);
  
  // CPU load
  const loadAvg = os.loadavg();
  console.log(`CPU Load: ${loadAvg[0].toFixed(2)} (1m), ${loadAvg[1].toFixed(2)} (5m), ${loadAvg[2].toFixed(2)} (15m)`);
  
  // Disk usage for state directory
  const stateDir = process.env.SYNC_AUDIT_STATE_DIRECTORY || '.mcp-gan-state';
  if (fs.existsSync(stateDir)) {
    const stats = fs.statSync(stateDir);
    const sessionFiles = fs.readdirSync(stateDir).filter(f => f.endsWith('.json'));
    const totalSize = sessionFiles.reduce((sum, file) => {
      try {
        return sum + fs.statSync(`${stateDir}/${file}`).size;
      } catch {
        return sum;
      }
    }, 0);
    
    console.log(`State Directory: ${sessionFiles.length} sessions, ${Math.round(totalSize / 1024)}KB`);
  }
  
  // Configuration summary
  console.log('\n=== Configuration ===');
  console.log(`Synchronous Mode: ${process.env.ENABLE_SYNCHRONOUS_AUDIT || 'false'}`);
  console.log(`Max Concurrent Audits: ${process.env.MAX_CONCURRENT_AUDITS || '5'}`);
  console.log(`Max Concurrent Sessions: ${process.env.MAX_CONCURRENT_SESSIONS || '50'}`);
  console.log(`Audit Timeout: ${process.env.AUDIT_TIMEOUT_SECONDS || '30'}s`);
  console.log(`Stagnation Detection: ${process.env.ENABLE_STAGNATION_DETECTION || 'true'}`);
}

if (require.main === module) {
  monitorPerformance();
  
  // Monitor continuously if requested
  if (process.argv.includes('--continuous')) {
    setInterval(monitorPerformance, 30000); // Every 30 seconds
  }
}

module.exports = { monitorPerformance };
```

## Common Scenarios

### Scenario: Development Environment Setup

**Problem**: Setting up synchronous workflow for development

**Solution**:
```bash
# Development-friendly configuration
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true

# Relaxed settings for development
export AUDIT_TIMEOUT_SECONDS=60
export MAX_CONCURRENT_AUDITS=2
export MAX_CONCURRENT_SESSIONS=10

# Lower thresholds for faster iteration
export SYNC_AUDIT_TIER1_SCORE=85
export SYNC_AUDIT_TIER2_SCORE=80
export SYNC_AUDIT_TIER3_SCORE=75

# Verbose feedback for learning
export SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=verbose

# Enable all debugging features
export ENABLE_SYNC_AUDIT_METRICS=true
export LOG_RAW_AUDIT_RESPONSES=true
```

### Scenario: Production Deployment

**Problem**: Optimizing for production workload

**Solution**:
```bash
# Production configuration
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true

# Production timeouts and limits
export AUDIT_TIMEOUT_SECONDS=30
export MAX_CONCURRENT_AUDITS=10
export MAX_CONCURRENT_SESSIONS=100

# High quality standards
export SYNC_AUDIT_TIER1_SCORE=95
export SYNC_AUDIT_TIER2_SCORE=90
export SYNC_AUDIT_TIER3_SCORE=85

# Performance optimizations
export ENABLE_AUDIT_CACHING=true
export SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=detailed

# Monitoring
export ENABLE_SYNC_AUDIT_METRICS=true
export ENABLE_SYNC_AUDIT_HEALTH_CHECKS=true

# Resource management
export SESSION_CLEANUP_INTERVAL=3600000  # 1 hour
export MAX_SESSION_AGE=86400000  # 24 hours
```

### Scenario: High-Volume Environment

**Problem**: Handling many concurrent users and sessions

**Solution**:
```bash
# High-volume configuration
export MAX_CONCURRENT_AUDITS=20
export MAX_CONCURRENT_SESSIONS=200

# Aggressive resource management
export SESSION_CLEANUP_INTERVAL=1800000  # 30 minutes
export MAX_SESSION_AGE=43200000  # 12 hours

# Performance optimizations
export ENABLE_AUDIT_CACHING=true
export SYNC_AUDIT_FEEDBACK_DETAIL_LEVEL=basic

# Shorter completion cycles
export SYNC_AUDIT_TIER1_LOOPS=8
export SYNC_AUDIT_TIER2_LOOPS=12
export SYNC_AUDIT_TIER3_LOOPS=16
export SYNC_AUDIT_HARD_STOP_LOOPS=20

# Queue management
export ENABLE_AUDIT_QUEUE=true
export AUDIT_QUEUE_TIMEOUT=30000
```

This troubleshooting guide provides comprehensive solutions for the most common issues encountered with the synchronous audit workflow. Use the diagnostic scripts and monitoring tools to identify problems quickly and apply the appropriate solutions.