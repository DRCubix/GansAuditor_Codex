# GansAuditor_Codex Performance Tuning Guide

This guide provides comprehensive recommendations for optimizing GansAuditor_Codex performance in production environments.

## Performance Overview

GansAuditor_Codex performance depends on several key factors:
- Codex CLI execution speed and reliability
- Process management efficiency
- Memory usage and garbage collection
- Concurrent operation handling
- Session state management
- Network and I/O operations

## Performance Baselines

### Typical Performance Characteristics

**Execution Times**:
- Simple code audits: 1-3 seconds
- Complex code audits: 3-10 seconds
- Large file audits: 10-30 seconds
- Timeout threshold: 30-60 seconds

**Resource Usage**:
- Memory: 100-500 MB (depending on concurrent operations)
- CPU: 10-50% during active audits
- Disk I/O: Minimal (mainly logging and session state)

**Throughput**:
- Sequential operations: 10-20 audits/minute
- Concurrent operations: 30-60 audits/minute (with proper tuning)
- Peak concurrent processes: 5-15 (system dependent)

## Configuration Optimization

### Core Performance Settings

```bash
# Execution timeouts
export AUDIT_TIMEOUT_SECONDS=30              # Balance between reliability and speed
export CODEX_OPERATION_TIMEOUT=45000         # Codex CLI operation timeout
export PROCESS_CLEANUP_TIMEOUT=10000         # Process cleanup timeout

# Concurrency limits
export MAX_CONCURRENT_AUDITS=8               # Optimal for most systems
export MAX_CONCURRENT_SESSIONS=50            # Session management limit
export MAX_CONCURRENT_PROCESSES=10           # Process manager limit

# Memory management
export MAX_SESSION_HISTORY=500               # Limit session history size
export SESSION_CLEANUP_INTERVAL=1800000      # 30 minutes cleanup interval
export MAX_SESSION_AGE=43200000              # 12 hours max session age

# Caching
export ENABLE_AUDIT_CACHING=true             # Enable result caching
export AUDIT_CACHE_SIZE=1000                 # Cache size limit
export AUDIT_CACHE_TTL=3600000               # 1 hour cache TTL

# Performance monitoring
export ENABLE_PERFORMANCE_METRICS=true       # Enable metrics collection
export METRICS_COLLECTION_INTERVAL=30000     # 30 seconds
export ENABLE_PERFORMANCE_LOGGING=true       # Enable performance logs
```

### Environment-Specific Tuning

#### Development Environment
```bash
# Relaxed settings for development
export AUDIT_TIMEOUT_SECONDS=60
export MAX_CONCURRENT_AUDITS=2
export MAX_CONCURRENT_SESSIONS=10
export ENABLE_DEBUG_LOGGING=true
export CODEX_DEBUG=true
```

#### Staging Environment
```bash
# Production-like settings with monitoring
export AUDIT_TIMEOUT_SECONDS=45
export MAX_CONCURRENT_AUDITS=6
export MAX_CONCURRENT_SESSIONS=30
export ENABLE_PERFORMANCE_METRICS=true
export ENABLE_HEALTH_MONITORING=true
```

#### Production Environment
```bash
# Optimized for production workloads
export AUDIT_TIMEOUT_SECONDS=30
export MAX_CONCURRENT_AUDITS=10
export MAX_CONCURRENT_SESSIONS=100
export ENABLE_AUDIT_CACHING=true
export ENABLE_SESSION_PERSISTENCE=true
export ENABLE_PERFORMANCE_OPTIMIZATION=true
```

## System-Level Optimizations

### Node.js Optimization

```bash
# Memory management
export NODE_OPTIONS="--max-old-space-size=2048"  # 2GB heap limit
export NODE_OPTIONS="$NODE_OPTIONS --max-semi-space-size=128"  # GC optimization

# Performance flags
export NODE_OPTIONS="$NODE_OPTIONS --optimize-for-size"  # Optimize for memory
export NODE_OPTIONS="$NODE_OPTIONS --gc-interval=100"   # GC frequency

# V8 optimizations
export NODE_OPTIONS="$NODE_OPTIONS --use-largepages=on"  # Use large pages if available
export NODE_OPTIONS="$NODE_OPTIONS --trace-gc"          # GC tracing (development only)
```

### Operating System Tuning

#### Linux Optimizations
```bash
# File descriptor limits
ulimit -n 65536

# Process limits
ulimit -u 32768

# Memory overcommit
echo 1 > /proc/sys/vm/overcommit_memory

# TCP optimizations
echo 1 > /proc/sys/net/ipv4/tcp_tw_reuse
echo 1 > /proc/sys/net/ipv4/tcp_fin_timeout
```

#### macOS Optimizations
```bash
# File descriptor limits
sudo launchctl limit maxfiles 65536 200000

# Process limits
sudo launchctl limit maxproc 32768 32768
```

### Docker Optimizations

```dockerfile
# Optimized Dockerfile
FROM node:18-alpine

# Set resource limits
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Optimize for production
ENV NODE_ENV=production
ENV AUDIT_TIMEOUT_SECONDS=30
ENV MAX_CONCURRENT_AUDITS=8
ENV ENABLE_AUDIT_CACHING=true

# Use multi-stage build for smaller image
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Set resource constraints
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('./dist/health-check.js')"

# Optimize container startup
CMD ["node", "--enable-source-maps", "dist/index.js"]
```

```yaml
# docker-compose.yml optimizations
version: '3.8'
services:
  gansauditor-codex:
    image: gansauditor-codex:latest
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
    environment:
      - NODE_ENV=production
      - MAX_CONCURRENT_AUDITS=8
      - ENABLE_AUDIT_CACHING=true
    volumes:
      - ./logs:/app/logs
      - ./state:/app/.mcp-gan-state
    restart: unless-stopped
```

## Performance Monitoring and Analysis

### Key Performance Indicators (KPIs)

1. **Execution Time Metrics**
   - Average execution time
   - 95th percentile execution time
   - 99th percentile execution time
   - Timeout rate

2. **Throughput Metrics**
   - Operations per second
   - Operations per minute
   - Peak throughput
   - Concurrency utilization

3. **Reliability Metrics**
   - Success rate
   - Error rate
   - Retry rate
   - Availability

4. **Resource Metrics**
   - Memory usage
   - CPU usage
   - Process count
   - Queue depth

### Performance Monitoring Script

```bash
#!/bin/bash
# performance-monitor.sh - Monitor system performance

LOG_FILE="performance-$(date +%Y%m%d-%H%M%S).log"

echo "=== GansAuditor_Codex Performance Monitor ===" | tee $LOG_FILE
echo "Start time: $(date)" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# System resources
echo "=== System Resources ===" | tee -a $LOG_FILE
echo "Memory usage:" | tee -a $LOG_FILE
free -h | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

echo "CPU usage:" | tee -a $LOG_FILE
top -bn1 | grep "Cpu(s)" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

echo "Disk usage:" | tee -a $LOG_FILE
df -h | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Application metrics
echo "=== Application Metrics ===" | tee -a $LOG_FILE
if curl -s http://localhost:3000/health/codex/metrics > /tmp/metrics.json; then
    echo "Health status:" | tee -a $LOG_FILE
    jq -r '.overall' /tmp/metrics.json | tee -a $LOG_FILE
    
    echo "Success rate:" | tee -a $LOG_FILE
    jq -r '.performance.reliabilityMetrics.successRate' /tmp/metrics.json | tee -a $LOG_FILE
    
    echo "Average execution time:" | tee -a $LOG_FILE
    jq -r '.performance.executionMetrics.averageExecutionTime' /tmp/metrics.json | tee -a $LOG_FILE
    
    echo "Active processes:" | tee -a $LOG_FILE
    jq -r '.performance.resourceMetrics.processCount.current' /tmp/metrics.json | tee -a $LOG_FILE
else
    echo "Failed to retrieve application metrics" | tee -a $LOG_FILE
fi

echo "" | tee -a $LOG_FILE
echo "End time: $(date)" | tee -a $LOG_FILE
```

### Performance Analysis Tools

```javascript
// performance-analyzer.js
const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor(logDirectory = './logs/codex') {
    this.logDirectory = logDirectory;
  }

  async analyzePerformance(days = 7) {
    const results = {
      summary: {},
      trends: {},
      recommendations: []
    };

    // Analyze execution times
    const executionTimes = await this.getExecutionTimes(days);
    results.summary.executionTimes = this.calculateStatistics(executionTimes);

    // Analyze success rates
    const successRates = await this.getSuccessRates(days);
    results.summary.successRates = this.calculateStatistics(successRates);

    // Analyze resource usage
    const resourceUsage = await this.getResourceUsage(days);
    results.summary.resourceUsage = resourceUsage;

    // Generate trends
    results.trends = this.calculateTrends(executionTimes, successRates);

    // Generate recommendations
    results.recommendations = this.generateRecommendations(results);

    return results;
  }

  calculateStatistics(data) {
    if (data.length === 0) return null;

    const sorted = data.sort((a, b) => a - b);
    return {
      count: data.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: data.reduce((sum, val) => sum + val, 0) / data.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  generateRecommendations(results) {
    const recommendations = [];

    // Execution time recommendations
    if (results.summary.executionTimes?.p95 > 30000) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        issue: 'High execution times detected',
        recommendation: 'Consider increasing timeout values or optimizing Codex operations',
        action: 'export AUDIT_TIMEOUT_SECONDS=60'
      });
    }

    // Success rate recommendations
    if (results.summary.successRates?.mean < 0.9) {
      recommendations.push({
        category: 'reliability',
        priority: 'critical',
        issue: 'Low success rate detected',
        recommendation: 'Investigate error patterns and improve error handling',
        action: 'Review error logs and increase retry limits'
      });
    }

    // Resource usage recommendations
    if (results.summary.resourceUsage?.memoryPeak > 1000) {
      recommendations.push({
        category: 'resources',
        priority: 'medium',
        issue: 'High memory usage detected',
        recommendation: 'Optimize memory usage and enable garbage collection',
        action: 'export NODE_OPTIONS="--max-old-space-size=2048"'
      });
    }

    return recommendations;
  }
}

module.exports = PerformanceAnalyzer;
```

## Optimization Strategies

### 1. Concurrency Optimization

#### Optimal Concurrency Settings

```bash
# Calculate optimal concurrency based on system resources
CPU_CORES=$(nproc)
MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')

# Conservative approach: 1.5x CPU cores
OPTIMAL_CONCURRENCY=$((CPU_CORES * 3 / 2))

# Memory-based limit: 100MB per concurrent operation
MEMORY_BASED_LIMIT=$((MEMORY_GB * 10))

# Use the lower of the two
MAX_CONCURRENT_AUDITS=$(($OPTIMAL_CONCURRENCY < $MEMORY_BASED_LIMIT ? $OPTIMAL_CONCURRENCY : $MEMORY_BASED_LIMIT))

echo "Recommended MAX_CONCURRENT_AUDITS: $MAX_CONCURRENT_AUDITS"
```

#### Queue Management

```bash
# Optimize queue settings
export AUDIT_QUEUE_SIZE=50                   # Queue size limit
export AUDIT_QUEUE_TIMEOUT=300000            # 5 minutes queue timeout
export AUDIT_QUEUE_PRIORITY=true             # Enable priority queuing
export AUDIT_QUEUE_BACKPRESSURE=true         # Enable backpressure handling
```

### 2. Memory Optimization

#### Session State Management

```bash
# Optimize session management
export MAX_SESSION_HISTORY=200               # Reduce history size
export SESSION_COMPRESSION=true              # Enable session compression
export SESSION_LAZY_LOADING=true             # Load sessions on demand
export SESSION_MEMORY_LIMIT=100              # 100MB session memory limit
```

#### Garbage Collection Tuning

```bash
# Optimize garbage collection
export NODE_OPTIONS="--max-old-space-size=1024"      # 1GB heap
export NODE_OPTIONS="$NODE_OPTIONS --gc-interval=50"  # More frequent GC
export NODE_OPTIONS="$NODE_OPTIONS --expose-gc"       # Expose GC to application

# Enable incremental GC
export NODE_OPTIONS="$NODE_OPTIONS --incremental-marking"
export NODE_OPTIONS="$NODE_OPTIONS --incremental-marking-wrappers"
```

### 3. I/O Optimization

#### Logging Optimization

```bash
# Optimize logging performance
export LOG_LEVEL=warn                        # Reduce log verbosity in production
export LOG_ASYNC=true                        # Enable async logging
export LOG_BUFFER_SIZE=8192                  # 8KB log buffer
export LOG_FLUSH_INTERVAL=5000               # 5 second flush interval
```

#### File System Optimization

```bash
# Optimize file operations
export SESSION_WRITE_BATCH_SIZE=10           # Batch session writes
export SESSION_WRITE_INTERVAL=10000          # 10 second write interval
export LOG_ROTATION_SIZE=50MB                # Rotate logs at 50MB
export LOG_COMPRESSION=true                  # Compress rotated logs
```

### 4. Network Optimization

#### HTTP Client Tuning

```bash
# Optimize HTTP operations (if applicable)
export HTTP_TIMEOUT=30000                    # 30 second HTTP timeout
export HTTP_KEEP_ALIVE=true                  # Enable keep-alive
export HTTP_MAX_SOCKETS=50                   # Max concurrent sockets
export HTTP_MAX_FREE_SOCKETS=10              # Max free sockets
```

## Performance Testing

### Load Testing Script

```bash
#!/bin/bash
# load-test.sh - Performance load testing

CONCURRENT_USERS=${1:-5}
DURATION=${2:-300}  # 5 minutes
RAMP_UP=${3:-60}    # 1 minute ramp-up

echo "Starting load test with $CONCURRENT_USERS concurrent users for ${DURATION}s"

# Create test data
cat > test-audit-request.json << 'EOF'
{
  "thought": "function calculateTotal(items) {\n  let total = 0;\n  for (let i = 0; i < items.length; i++) {\n    total += items[i].price;\n  }\n  return total;\n}",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "branchId": "load-test-session"
}
EOF

# Function to run single test
run_test() {
  local user_id=$1
  local start_time=$(date +%s)
  
  for ((i=1; i<=10; i++)); do
    local request_start=$(date +%s%3N)
    
    # Update session ID for each request
    jq ".branchId = \"load-test-user-${user_id}-${i}\"" test-audit-request.json > temp-request.json
    
    # Make request
    response=$(curl -s -w "%{http_code},%{time_total}" \
      -X POST \
      -H "Content-Type: application/json" \
      -d @temp-request.json \
      http://localhost:3000/tools/gansauditor_codex)
    
    local request_end=$(date +%s%3N)
    local duration=$((request_end - request_start))
    local http_code=$(echo $response | cut -d',' -f1)
    local time_total=$(echo $response | cut -d',' -f2)
    
    echo "User $user_id, Request $i: HTTP $http_code, Duration ${duration}ms"
    
    # Brief pause between requests
    sleep 1
  done
  
  rm -f temp-request.json
}

# Start concurrent users
for ((user=1; user<=CONCURRENT_USERS; user++)); do
  run_test $user &
  
  # Ramp up gradually
  if [ $user -lt $CONCURRENT_USERS ]; then
    sleep $((RAMP_UP / CONCURRENT_USERS))
  fi
done

# Wait for all tests to complete
wait

echo "Load test completed"
rm -f test-audit-request.json
```

### Performance Benchmarking

```javascript
// benchmark.js - Performance benchmarking
const { performance } = require('perf_hooks');

class PerformanceBenchmark {
  constructor() {
    this.results = [];
  }

  async runBenchmark(testName, testFunction, iterations = 100) {
    console.log(`Running benchmark: ${testName} (${iterations} iterations)`);
    
    const times = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await testFunction();
        const end = performance.now();
        times.push(end - start);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Iteration ${i + 1} failed:`, error.message);
      }
    }

    const stats = this.calculateStats(times);
    const result = {
      testName,
      iterations,
      successCount,
      errorCount,
      successRate: (successCount / iterations) * 100,
      ...stats
    };

    this.results.push(result);
    this.printResult(result);
    
    return result;
  }

  calculateStats(times) {
    if (times.length === 0) return {};

    const sorted = times.sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  printResult(result) {
    console.log(`\n=== ${result.testName} Results ===`);
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Success Rate: ${result.successRate.toFixed(2)}%`);
    console.log(`Min: ${result.min?.toFixed(2)}ms`);
    console.log(`Max: ${result.max?.toFixed(2)}ms`);
    console.log(`Mean: ${result.mean?.toFixed(2)}ms`);
    console.log(`Median: ${result.median?.toFixed(2)}ms`);
    console.log(`95th Percentile: ${result.p95?.toFixed(2)}ms`);
    console.log(`99th Percentile: ${result.p99?.toFixed(2)}ms`);
  }

  generateReport() {
    console.log('\n=== Performance Benchmark Report ===');
    
    this.results.forEach(result => {
      console.log(`\n${result.testName}:`);
      console.log(`  Success Rate: ${result.successRate.toFixed(2)}%`);
      console.log(`  Mean Time: ${result.mean?.toFixed(2)}ms`);
      console.log(`  95th Percentile: ${result.p95?.toFixed(2)}ms`);
    });

    // Generate recommendations
    console.log('\n=== Recommendations ===');
    this.results.forEach(result => {
      if (result.successRate < 95) {
        console.log(`⚠️  ${result.testName}: Low success rate (${result.successRate.toFixed(2)}%)`);
      }
      if (result.p95 > 10000) {
        console.log(`⚠️  ${result.testName}: High 95th percentile (${result.p95.toFixed(2)}ms)`);
      }
      if (result.mean > 5000) {
        console.log(`⚠️  ${result.testName}: High mean time (${result.mean.toFixed(2)}ms)`);
      }
    });
  }
}

module.exports = PerformanceBenchmark;
```

## Troubleshooting Performance Issues

### Common Performance Problems

#### 1. High Execution Times

**Symptoms**:
- Requests taking longer than expected
- Frequent timeouts
- High 95th percentile response times

**Diagnosis**:
```bash
# Check recent execution times
curl -s http://localhost:3000/health/codex/metrics | \
  jq '.performance.executionMetrics'

# Analyze log patterns
grep -E '"duration":[0-9]+' logs/codex/codex-operations-$(date +%Y-%m-%d).jsonl | \
  sed 's/.*"duration":\([0-9]*\).*/\1/' | \
  sort -n | tail -20
```

**Solutions**:
```bash
# Increase timeouts
export AUDIT_TIMEOUT_SECONDS=60
export CODEX_OPERATION_TIMEOUT=90000

# Reduce concurrency
export MAX_CONCURRENT_AUDITS=4

# Enable caching
export ENABLE_AUDIT_CACHING=true
```

#### 2. High Memory Usage

**Symptoms**:
- Memory usage continuously increasing
- Out of memory errors
- Slow garbage collection

**Diagnosis**:
```bash
# Monitor memory usage
watch -n 5 'ps aux | grep gansauditor-codex'

# Check Node.js heap usage
curl -s http://localhost:3000/health/codex/metrics | \
  jq '.performance.resourceMetrics.memoryUsage'
```

**Solutions**:
```bash
# Increase heap size
export NODE_OPTIONS="--max-old-space-size=2048"

# Optimize session management
export MAX_SESSION_HISTORY=200
export SESSION_CLEANUP_INTERVAL=900000  # 15 minutes

# Enable compression
export SESSION_COMPRESSION=true
```

#### 3. High Error Rates

**Symptoms**:
- Frequent operation failures
- Low success rates
- Many retry attempts

**Diagnosis**:
```bash
# Check error patterns
curl -s http://localhost:3000/health/codex/metrics | \
  jq '.performance.reliabilityMetrics'

# Analyze error categories
grep '"success":false' logs/codex/codex-operations-$(date +%Y-%m-%d).jsonl | \
  jq -r '.error.category' | sort | uniq -c
```

**Solutions**:
```bash
# Increase retry limits
export CODEX_MAX_RETRIES=5
export CODEX_RETRY_DELAY=2000

# Improve error handling
export ENABLE_ERROR_RECOVERY=true
export ERROR_RECOVERY_TIMEOUT=30000
```

### Performance Optimization Checklist

- [ ] **System Resources**
  - [ ] Adequate CPU cores (minimum 2, recommended 4+)
  - [ ] Sufficient RAM (minimum 1GB, recommended 2GB+)
  - [ ] Fast disk I/O (SSD recommended)
  - [ ] Stable network connectivity

- [ ] **Configuration**
  - [ ] Optimal concurrency settings
  - [ ] Appropriate timeout values
  - [ ] Caching enabled
  - [ ] Session management optimized

- [ ] **Monitoring**
  - [ ] Performance metrics enabled
  - [ ] Health checks configured
  - [ ] Alerting set up
  - [ ] Log analysis automated

- [ ] **Environment**
  - [ ] Node.js optimized
  - [ ] Operating system tuned
  - [ ] Container resources allocated
  - [ ] Network optimized

This performance tuning guide provides comprehensive strategies for optimizing GansAuditor_Codex performance across different environments and use cases.