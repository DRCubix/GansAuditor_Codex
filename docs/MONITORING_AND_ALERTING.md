# GansAuditor_Codex Monitoring and Alerting Guide

This guide provides comprehensive information about monitoring GansAuditor_Codex in production environments, including health check endpoints, performance metrics, alerting configuration, and troubleshooting.

## Overview

GansAuditor_Codex includes built-in monitoring capabilities that track:
- Codex CLI availability and health
- Process management and resource usage
- Performance metrics and execution statistics
- Error rates and failure patterns
- System reliability and uptime

## Health Check Endpoints

### Primary Health Endpoint

**Endpoint**: `GET /health/codex`
**Description**: Comprehensive health status of the Codex integration

```bash
curl http://localhost:3000/health/codex
```

**Response Format**:
```json
{
  "overall": "healthy|warning|critical|unavailable",
  "timestamp": 1703123456789,
  "uptime": 3600000,
  "checks": [
    {
      "name": "codex-availability",
      "status": "healthy",
      "message": "Codex CLI is available and responding",
      "timestamp": 1703123456789,
      "duration": 150,
      "details": {
        "executable": "codex",
        "version": "1.2.3"
      }
    }
  ],
  "performance": {
    "executionMetrics": {
      "totalExecutions": 1250,
      "successfulExecutions": 1200,
      "averageExecutionTime": 2500,
      "p95ExecutionTime": 8000
    },
    "resourceMetrics": {
      "memoryUsage": {
        "current": 245,
        "peak": 512,
        "average": 180
      },
      "processCount": {
        "current": 3,
        "peak": 8
      }
    },
    "reliabilityMetrics": {
      "successRate": 96.0,
      "availability": 99.2,
      "mtbf": 7200000,
      "recentFailures": []
    }
  },
  "alerts": [],
  "recommendations": []
}
```

### Quick Health Check

**Endpoint**: `GET /health/codex/status`
**Description**: Simple health status check

```bash
curl http://localhost:3000/health/codex/status
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": 1703123456789,
  "codexAvailable": true,
  "activeProcesses": 3,
  "successRate": 96.0
}
```

### Detailed Metrics

**Endpoint**: `GET /health/codex/metrics`
**Description**: Detailed performance and reliability metrics

```bash
curl http://localhost:3000/health/codex/metrics
```

## Health Check Configuration

### Environment Variables

```bash
# Enable health monitoring
export ENABLE_CODEX_HEALTH_MONITORING=true

# Health check interval (milliseconds)
export CODEX_HEALTH_CHECK_INTERVAL=30000

# Health check timeout (milliseconds)
export CODEX_HEALTH_CHECK_TIMEOUT=10000

# Enable health endpoints
export ENABLE_CODEX_HEALTH_ENDPOINTS=true

# Health endpoint port (optional, defaults to main server port)
export CODEX_HEALTH_PORT=3001
```

### Configuration File

Create `config/monitoring.json`:
```json
{
  "healthMonitoring": {
    "enabled": true,
    "checkInterval": 30000,
    "healthCheckTimeout": 10000,
    "thresholds": {
      "availabilityTimeout": 5000,
      "maxExecutionTime": 30000,
      "minSuccessRate": 80,
      "maxErrorRate": 5,
      "maxMemoryUsage": 500,
      "maxConcurrentProcesses": 10
    },
    "endpoints": {
      "enabled": true,
      "port": 3001,
      "path": "/health/codex"
    }
  }
}
```

## Performance Metrics

### Execution Metrics

Track Codex CLI execution performance:

```typescript
interface ExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timedOutExecutions: number;
  averageExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  executionTimeDistribution: {
    under1s: number;
    under5s: number;
    under10s: number;
    under30s: number;
    under60s: number;
    over60s: number;
  };
}
```

### Resource Metrics

Monitor system resource usage:

```typescript
interface ResourceMetrics {
  memoryUsage: {
    current: number; // MB
    peak: number;
    average: number;
  };
  cpuUsage: {
    current: number; // percentage
    peak: number;
    average: number;
  };
  processCount: {
    current: number;
    peak: number;
    average: number;
  };
  queueMetrics: {
    currentSize: number;
    peakSize: number;
    averageWaitTime: number;
  };
}
```

### Reliability Metrics

Track system reliability and availability:

```typescript
interface ReliabilityMetrics {
  successRate: number; // percentage
  failureRate: number;
  timeoutRate: number;
  retryRate: number;
  mtbf: number; // Mean Time Between Failures (ms)
  mttr: number; // Mean Time To Recovery (ms)
  availability: number; // percentage
  recentFailures: Array<{
    timestamp: number;
    operationType: string;
    error: string;
    duration: number;
  }>;
}
```

## Alerting Configuration

### Alert Types

1. **Critical Alerts**
   - Codex CLI unavailable
   - High failure rate (>20%)
   - Process manager failure
   - Memory exhaustion

2. **Warning Alerts**
   - Slow response times
   - Moderate failure rate (10-20%)
   - High resource usage
   - Queue backlog

3. **Info Alerts**
   - Performance degradation
   - Configuration changes
   - Maintenance events

### Alert Configuration

```bash
# Enable alerting
export ENABLE_CODEX_ALERTING=true

# Alert cooldown period (milliseconds)
export CODEX_ALERT_COOLDOWN=300000

# Maximum active alerts
export CODEX_MAX_ACTIVE_ALERTS=50

# Webhook URL for alerts
export CODEX_ALERT_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Email recipients (comma-separated)
export CODEX_ALERT_EMAIL_RECIPIENTS="admin@company.com,devops@company.com"
```

### Webhook Alert Format

```json
{
  "timestamp": 1703123456789,
  "severity": "critical|warning|info",
  "title": "Codex CLI Unavailable",
  "message": "Codex CLI executable not found in PATH",
  "category": "availability",
  "details": {
    "executable": "codex",
    "error": "spawn codex ENOENT",
    "duration": 5000,
    "retryCount": 3
  },
  "recommendations": [
    "Verify Codex CLI installation",
    "Check PATH environment variable",
    "Restart the service if necessary"
  ],
  "runbook": "https://docs.company.com/runbooks/codex-cli-unavailable"
}
```

### Slack Integration

Configure Slack webhook for alerts:

```bash
# Install webhook integration in Slack
# Get webhook URL from Slack app configuration

export CODEX_ALERT_WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"

# Optional: Customize Slack channel and username
export CODEX_ALERT_SLACK_CHANNEL="#alerts"
export CODEX_ALERT_SLACK_USERNAME="GansAuditor-Codex"
```

### Email Alerting

Configure SMTP for email alerts:

```bash
# SMTP configuration
export CODEX_ALERT_SMTP_HOST="smtp.company.com"
export CODEX_ALERT_SMTP_PORT=587
export CODEX_ALERT_SMTP_USER="alerts@company.com"
export CODEX_ALERT_SMTP_PASS="your-smtp-password"
export CODEX_ALERT_SMTP_FROM="GansAuditor-Codex <alerts@company.com>"

# Email recipients
export CODEX_ALERT_EMAIL_RECIPIENTS="admin@company.com,devops@company.com"
```

## Monitoring Dashboards

### Grafana Dashboard

Create a Grafana dashboard using the metrics endpoint:

```json
{
  "dashboard": {
    "title": "GansAuditor_Codex Monitoring",
    "panels": [
      {
        "title": "Codex Availability",
        "type": "stat",
        "targets": [
          {
            "expr": "codex_availability_status",
            "legendFormat": "Availability"
          }
        ]
      },
      {
        "title": "Execution Time",
        "type": "graph",
        "targets": [
          {
            "expr": "codex_execution_time_avg",
            "legendFormat": "Average"
          },
          {
            "expr": "codex_execution_time_p95",
            "legendFormat": "95th Percentile"
          }
        ]
      },
      {
        "title": "Success Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "codex_success_rate",
            "legendFormat": "Success Rate %"
          }
        ]
      },
      {
        "title": "Resource Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "codex_memory_usage_mb",
            "legendFormat": "Memory (MB)"
          },
          {
            "expr": "codex_active_processes",
            "legendFormat": "Active Processes"
          }
        ]
      }
    ]
  }
}
```

### Prometheus Metrics

Export metrics in Prometheus format:

**Endpoint**: `GET /metrics`

```
# HELP codex_availability_status Codex CLI availability status (1=available, 0=unavailable)
# TYPE codex_availability_status gauge
codex_availability_status 1

# HELP codex_execution_time_seconds Codex execution time in seconds
# TYPE codex_execution_time_seconds histogram
codex_execution_time_seconds_bucket{le="1"} 450
codex_execution_time_seconds_bucket{le="5"} 890
codex_execution_time_seconds_bucket{le="10"} 1200
codex_execution_time_seconds_bucket{le="30"} 1250
codex_execution_time_seconds_bucket{le="+Inf"} 1250
codex_execution_time_seconds_sum 3125.5
codex_execution_time_seconds_count 1250

# HELP codex_success_rate Success rate of Codex operations
# TYPE codex_success_rate gauge
codex_success_rate 0.96

# HELP codex_memory_usage_bytes Memory usage in bytes
# TYPE codex_memory_usage_bytes gauge
codex_memory_usage_bytes 257048576

# HELP codex_active_processes Number of active Codex processes
# TYPE codex_active_processes gauge
codex_active_processes 3
```

## Performance Tuning Guide

### Optimization Recommendations

Based on monitoring data, optimize performance:

#### High Execution Times
```bash
# Increase timeout for complex operations
export AUDIT_TIMEOUT_SECONDS=60

# Reduce concurrency to avoid resource contention
export MAX_CONCURRENT_AUDITS=3

# Enable caching to reduce repeated work
export ENABLE_AUDIT_CACHING=true
```

#### High Memory Usage
```bash
# Reduce session history size
export MAX_SESSION_HISTORY=500

# Enable more aggressive cleanup
export SESSION_CLEANUP_INTERVAL=1800000  # 30 minutes

# Reduce concurrent sessions
export MAX_CONCURRENT_SESSIONS=25
```

#### High Error Rates
```bash
# Increase retry attempts
export CODEX_MAX_RETRIES=3

# Increase timeout for reliability
export CODEX_OPERATION_TIMEOUT=45000

# Enable more detailed error logging
export CODEX_DEBUG=true
```

### Performance Baselines

Establish performance baselines for alerting:

```bash
# Execution time thresholds
export CODEX_PERF_BASELINE_AVG_TIME=2500      # 2.5 seconds
export CODEX_PERF_BASELINE_P95_TIME=8000      # 8 seconds
export CODEX_PERF_BASELINE_P99_TIME=15000     # 15 seconds

# Success rate thresholds
export CODEX_PERF_BASELINE_SUCCESS_RATE=95    # 95%
export CODEX_PERF_BASELINE_AVAILABILITY=99    # 99%

# Resource usage thresholds
export CODEX_PERF_BASELINE_MEMORY_MB=300      # 300 MB
export CODEX_PERF_BASELINE_MAX_PROCESSES=8    # 8 processes
```

## Log Analysis

### Log Locations

```bash
# Operation logs
./logs/codex/codex-operations-YYYY-MM-DD.jsonl

# Health check logs
./logs/audit/health-checks-YYYY-MM-DD.log

# Error logs
./logs/audit/errors-YYYY-MM-DD.log

# Performance logs
./logs/audit/performance-YYYY-MM-DD.log
```

### Log Analysis Commands

```bash
# Check recent failures
tail -n 100 logs/codex/codex-operations-$(date +%Y-%m-%d).jsonl | \
  jq 'select(.result.success == false)'

# Analyze execution times
cat logs/codex/codex-operations-$(date +%Y-%m-%d).jsonl | \
  jq '.timing.duration' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count "ms"}'

# Count operations by type
cat logs/codex/codex-operations-$(date +%Y-%m-%d).jsonl | \
  jq -r '.operationType' | \
  sort | uniq -c | sort -nr

# Find timeout issues
cat logs/codex/codex-operations-$(date +%Y-%m-%d).jsonl | \
  jq 'select(.result.timedOut == true)' | \
  jq -r '.timing.duration'
```

### Log Rotation

Configure log rotation to manage disk space:

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/gansauditor-codex << EOF
/path/to/logs/codex/*.jsonl {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 node node
    postrotate
        # Signal application to reopen log files if needed
        pkill -USR1 -f gansauditor-codex || true
    endscript
}

/path/to/logs/audit/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 node node
}
EOF
```

## Troubleshooting Common Issues

### High Alert Volume

**Problem**: Too many alerts being generated

**Solutions**:
```bash
# Increase alert cooldown period
export CODEX_ALERT_COOLDOWN=600000  # 10 minutes

# Adjust alert thresholds
export CODEX_HEALTH_THRESHOLD_SUCCESS_RATE=85  # Lower threshold
export CODEX_HEALTH_THRESHOLD_MAX_ERROR_RATE=10  # Higher threshold

# Enable alert aggregation
export CODEX_ALERT_AGGREGATION=true
export CODEX_ALERT_AGGREGATION_WINDOW=300000  # 5 minutes
```

### False Positive Health Checks

**Problem**: Health checks failing intermittently

**Solutions**:
```bash
# Increase health check timeout
export CODEX_HEALTH_CHECK_TIMEOUT=15000

# Reduce health check frequency
export CODEX_HEALTH_CHECK_INTERVAL=60000  # 1 minute

# Enable health check retries
export CODEX_HEALTH_CHECK_RETRIES=3
export CODEX_HEALTH_CHECK_RETRY_DELAY=5000
```

### Performance Degradation

**Problem**: Monitoring shows performance degradation

**Investigation Steps**:
```bash
# Check system resources
htop
df -h
free -m

# Analyze recent operations
curl http://localhost:3000/health/codex/metrics | jq '.performance'

# Check for error patterns
grep -i error logs/codex/codex-operations-$(date +%Y-%m-%d).jsonl | tail -20

# Verify Codex CLI health
codex --version
codex exec "console.log('Health check')"
```

## Monitoring Best Practices

### 1. Establish Baselines

- Monitor system for 1-2 weeks to establish normal performance baselines
- Set alert thresholds based on actual performance data
- Regularly review and adjust thresholds as system evolves

### 2. Implement Tiered Alerting

- **Critical**: Immediate response required (page on-call)
- **Warning**: Investigation needed within business hours
- **Info**: Informational only, review during maintenance windows

### 3. Monitor Key Metrics

**Essential Metrics**:
- Codex CLI availability (uptime)
- Success rate (reliability)
- Average execution time (performance)
- Error rate (stability)
- Resource usage (capacity)

**Secondary Metrics**:
- Queue depth and wait times
- Retry rates and patterns
- Memory and CPU trends
- Disk usage and log growth

### 4. Automate Response

```bash
# Create automated response scripts
cat > scripts/codex-health-check.sh << 'EOF'
#!/bin/bash
# Automated health check and recovery

# Check Codex CLI availability
if ! codex --version >/dev/null 2>&1; then
    echo "CRITICAL: Codex CLI unavailable"
    # Attempt to restart service
    systemctl restart gansauditor-codex
    exit 1
fi

# Check service health
HEALTH=$(curl -s http://localhost:3000/health/codex/status | jq -r '.status')
if [ "$HEALTH" != "healthy" ]; then
    echo "WARNING: Service health is $HEALTH"
    # Collect diagnostics
    curl -s http://localhost:3000/health/codex > /tmp/health-$(date +%s).json
    exit 1
fi

echo "OK: All systems healthy"
EOF

chmod +x scripts/codex-health-check.sh
```

### 5. Regular Maintenance

```bash
# Weekly maintenance script
cat > scripts/weekly-maintenance.sh << 'EOF'
#!/bin/bash
# Weekly maintenance tasks

# Rotate logs
logrotate -f /etc/logrotate.d/gansauditor-codex

# Clean old session files
find .mcp-gan-state -name "*.json" -mtime +7 -delete

# Update performance baselines
curl -s http://localhost:3000/health/codex/metrics > monitoring/baselines/$(date +%Y-%m-%d).json

# Generate weekly report
node scripts/generate-weekly-report.js

echo "Weekly maintenance completed"
EOF

chmod +x scripts/weekly-maintenance.sh

# Schedule with cron
echo "0 2 * * 0 /path/to/scripts/weekly-maintenance.sh" | crontab -
```

## Integration with External Monitoring

### Datadog Integration

```javascript
// datadog-integration.js
const StatsD = require('node-statsd');
const client = new StatsD();

// Send metrics to Datadog
function sendCodexMetrics(metrics) {
  client.gauge('codex.availability', metrics.availability);
  client.gauge('codex.success_rate', metrics.successRate);
  client.histogram('codex.execution_time', metrics.averageExecutionTime);
  client.gauge('codex.active_processes', metrics.activeProcesses);
  client.gauge('codex.memory_usage', metrics.memoryUsage);
}

module.exports = { sendCodexMetrics };
```

### New Relic Integration

```javascript
// newrelic-integration.js
const newrelic = require('newrelic');

function recordCodexMetrics(metrics) {
  newrelic.recordMetric('Custom/Codex/Availability', metrics.availability);
  newrelic.recordMetric('Custom/Codex/SuccessRate', metrics.successRate);
  newrelic.recordMetric('Custom/Codex/ExecutionTime', metrics.averageExecutionTime);
  newrelic.recordMetric('Custom/Codex/ActiveProcesses', metrics.activeProcesses);
}

module.exports = { recordCodexMetrics };
```

This comprehensive monitoring and alerting guide provides everything needed to effectively monitor GansAuditor_Codex in production environments. Regular monitoring and proactive alerting help ensure system reliability and optimal performance.