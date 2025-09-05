# Monitoring and Observability System

This module provides comprehensive monitoring and observability for the synchronous audit workflow, including metrics collection, health monitoring, debugging tools, and specialized audit logging.

## Overview

The monitoring system consists of four main components:

1. **MetricsCollector** - Collects and aggregates performance metrics
2. **HealthChecker** - Monitors system health and performs health checks
3. **DebugTools** - Provides debugging and session inspection capabilities
4. **AuditLogger** - Specialized logging for audit performance and session tracking

## Features

### ✅ Metrics Collection
- **Completion Rates**: Track audit success/failure rates and completion tiers
- **Loop Statistics**: Monitor average loops per session, stagnation rates
- **Performance Metrics**: Audit duration, cache hit rates, queue wait times
- **Session Tracking**: Active sessions, session lifecycle metrics
- **Codex Context Monitoring**: Context creation, termination, resource usage
- **System Health**: Memory usage, error rates, service availability

### ✅ Health Monitoring
- **System Resources**: Memory, CPU, uptime monitoring
- **Audit Engine Health**: Service availability and performance checks
- **Session Manager Health**: Session state validation
- **Codex Service Health**: Service connectivity and response times
- **Performance Thresholds**: Configurable alerts for performance issues
- **Automated Health Checks**: Periodic system health validation

### ✅ Debug Tools
- **Session Inspection**: Detailed session state analysis
- **Session Analysis**: Performance trends and progress tracking
- **System Diagnostics**: Comprehensive system health reports
- **Performance Analysis**: Bottleneck identification and optimization suggestions
- **Session Discovery**: Find and filter sessions by criteria
- **Diagnostic Export**: Export comprehensive diagnostic data

### ✅ Audit Logging
- **Performance Logging**: Detailed audit timing and performance metrics
- **Session Tracking**: Complete session lifecycle logging
- **Codex Context Logging**: Context window usage and resource tracking
- **Structured Logging**: JSON-formatted logs for analysis
- **Buffer Management**: Efficient log buffering and flushing
- **Log Rotation**: Automatic log file management

## Quick Start

### Basic Usage

```typescript
import { 
  startMonitoring, 
  getSystemStatus, 
  metricsCollector 
} from './monitoring/index.js';

// Start monitoring with default configuration
startMonitoring();

// Record some metrics
metricsCollector.recordAuditStarted('session-1', 1);
metricsCollector.recordAuditCompleted('session-1', 1, 2500, 'pass', 95);

// Get system status
const status = await getSystemStatus();
console.log('System Health:', status.health.overall);
console.log('Completion Rate:', status.metrics.completion.completionRate);
```

### Integration with Synchronous Audit Workflow

```typescript
import { initializeMonitoring } from './monitoring/index.js';
import { SynchronousAuditEngine } from './auditor/synchronous-audit-engine.js';
import { SynchronousSessionManager } from './session/synchronous-session-manager.js';

// Initialize components
const auditEngine = new SynchronousAuditEngine();
const sessionManager = new SynchronousSessionManager();

// Initialize monitoring
initializeMonitoring(auditEngine, sessionManager, {
  enabled: true,
  health: {
    checkInterval: 60000, // 1 minute
    thresholds: {
      errorRate: 5,
      responseTime: 5000,
      memoryUsage: 80,
      completionRate: 70,
      stagnationRate: 30,
    },
  },
  logging: {
    logDirectory: './logs/audit',
    enablePerformanceLogging: true,
    enableSessionTracking: true,
    enableCodexContextLogging: true,
  },
});
```

## Configuration

### Monitoring System Configuration

```typescript
interface MonitoringConfig {
  enabled: boolean;
  
  metrics: {
    enabled: boolean;
    retentionPeriod: number; // milliseconds
  };
  
  health: {
    enabled: boolean;
    checkInterval: number; // milliseconds
    thresholds: {
      errorRate: number; // errors per minute
      responseTime: number; // milliseconds
      memoryUsage: number; // percentage
      completionRate: number; // percentage
      stagnationRate: number; // percentage
    };
  };
  
  debug: {
    enabled: boolean;
    sessionStateDirectory: string;
    maxInspectionResults: number;
  };
  
  logging: {
    enabled: boolean;
    logDirectory: string;
    maxLogFileSize: number; // bytes
    flushInterval: number; // milliseconds
    enablePerformanceLogging: boolean;
    enableSessionTracking: boolean;
    enableCodexContextLogging: boolean;
  };
}
```

### Environment Variables

```bash
# Enable monitoring
ENABLE_MONITORING=true

# Health check configuration
HEALTH_CHECK_INTERVAL=60000
HEALTH_ERROR_RATE_THRESHOLD=5
HEALTH_RESPONSE_TIME_THRESHOLD=5000
HEALTH_MEMORY_USAGE_THRESHOLD=80

# Logging configuration
AUDIT_LOG_DIRECTORY=./logs/audit
AUDIT_LOG_FLUSH_INTERVAL=5000
ENABLE_PERFORMANCE_LOGGING=true
ENABLE_SESSION_TRACKING=true
ENABLE_CODEX_CONTEXT_LOGGING=true
```

## API Reference

### MetricsCollector

```typescript
// Record audit events
metricsCollector.recordAuditStarted(sessionId, thoughtNumber);
metricsCollector.recordAuditCompleted(sessionId, thoughtNumber, duration, verdict, score);
metricsCollector.recordAuditFailed(sessionId, thoughtNumber, duration, error);

// Record session events
metricsCollector.recordSessionCreated(sessionId, loopId);
metricsCollector.recordSessionCompleted(sessionId, totalLoops, reason);
metricsCollector.recordStagnationDetected(sessionId, loop, similarityScore);

// Record Codex context events
metricsCollector.recordContextCreated(loopId, contextId);
metricsCollector.recordContextTerminated(loopId, contextId, reason);

// Get metrics
const snapshot = metricsCollector.getMetricsSnapshot();
const summary = metricsCollector.getMetricsSummary();
```

### HealthChecker

```typescript
// Perform health check
const report = await healthChecker.performHealthCheck();

// Get current status
const status = healthChecker.getCurrentHealthStatus(); // 'healthy' | 'warning' | 'critical' | 'unknown'
const isHealthy = healthChecker.isHealthy();

// Lifecycle management
healthChecker.start();
healthChecker.stop();
```

### DebugTools

```typescript
// Session inspection
const inspection = await debugTools.inspectSession('session-id');
const analysis = await debugTools.analyzeSession('session-id');

// Session discovery
const sessions = await debugTools.listSessions();
const filtered = await debugTools.findSessions({ 
  isComplete: false, 
  hasStagnation: true 
});

// System diagnostics
const diagnostics = await debugTools.performSystemDiagnostics();
const performance = await debugTools.analyzePerformance(3600000); // 1 hour window

// Export diagnostics
await debugTools.exportDiagnostics('./diagnostics.json');
```

### AuditLogger

```typescript
// Audit logging
const timer = auditLogger.logAuditStart('session-1', 1, 'loop-1');
auditLogger.logAuditComplete('session-1', 1, review, 2500, 'loop-1');
auditLogger.logAuditFailure('session-1', 1, 'timeout', 30000, 'loop-1');

// Session logging
auditLogger.logSessionCreation('session-1', config, 'loop-1');
auditLogger.logSessionUpdate('session-1', iteration, 5, 'loop-1');
auditLogger.logSessionCompletion('session-1', 8, 'completed', 120000, 'loop-1');

// Performance logging
auditLogger.logPerformanceMetric('audit', 'duration', 2500, 'ms', context, 5000);

// Codex context logging
auditLogger.logCodexContextEvent('loop-1', 'context-1', 'created');
auditLogger.logCodexContextEvent('loop-1', 'context-1', 'terminated', {
  duration: 45000,
  terminationReason: 'session_completed',
});

// Buffer management
await auditLogger.flush();
const bufferSizes = auditLogger.getBufferSizes();
```

## Metrics Reference

### Completion Metrics
- `totalAudits`: Total number of audits performed
- `completedAudits`: Number of successfully completed audits
- `failedAudits`: Number of failed audits
- `timedOutAudits`: Number of audits that timed out
- `completionRate`: Percentage of successful audits
- `averageLoopsToCompletion`: Average loops needed for completion
- `completionsByTier`: Breakdown by completion tier (tier1: ≤10 loops, tier2: ≤15 loops, tier3: ≤20 loops, hardStop: >20 loops)

### Loop Statistics
- `totalLoops`: Total number of loops across all sessions
- `averageLoopsPerSession`: Average loops per session
- `maxLoopsReached`: Maximum loops reached in any session
- `stagnationDetections`: Number of stagnation events detected
- `stagnationRate`: Percentage of sessions with stagnation
- `loopDistribution`: Distribution of loop counts

### Performance Metrics
- `averageAuditDuration`: Average audit duration in milliseconds
- `medianAuditDuration`: Median audit duration
- `p95AuditDuration`: 95th percentile audit duration
- `p99AuditDuration`: 99th percentile audit duration
- `totalAuditTime`: Total time spent on audits
- `cacheHitRate`: Percentage of cache hits
- `queueWaitTime`: Average queue wait time
- `concurrentAudits`: Current concurrent audits

### Session Metrics
- `activeSessions`: Number of currently active sessions
- `totalSessions`: Total number of sessions created
- `averageSessionDuration`: Average session duration
- `sessionsByStatus`: Breakdown by session status
- `averageIterationsPerSession`: Average iterations per session
- `sessionCreationRate`: Sessions created per hour

### Codex Context Metrics
- `activeContexts`: Number of active Codex contexts
- `totalContextsCreated`: Total contexts created
- `contextCreationRate`: Contexts created per hour
- `averageContextDuration`: Average context duration
- `contextsByStatus`: Breakdown by context status
- `contextTerminationReasons`: Breakdown by termination reason

### System Health Metrics
- `uptime`: System uptime in milliseconds
- `memoryUsage`: Memory usage statistics
- `errorRate`: Errors per minute
- `responseTime`: Average response time
- `serviceAvailability`: Service availability percentage

## Health Check Reference

### Health Status Levels
- `healthy`: All systems operating normally
- `warning`: Some issues detected but system functional
- `critical`: Serious issues requiring attention
- `unknown`: Health status cannot be determined

### Health Checks Performed
1. **System Resources**: Memory usage, CPU usage, uptime
2. **Audit Engine**: Service availability, configuration validation
3. **Session Manager**: Session state validation, operation testing
4. **Codex Service**: Service connectivity, version checking
5. **Metrics Health**: Metrics collection validation
6. **Performance Thresholds**: Threshold violation checking

### Health Check Configuration
```typescript
interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // Check interval in milliseconds
  timeout: number; // Individual check timeout
  thresholds: {
    errorRate: number; // Errors per minute threshold
    responseTime: number; // Response time threshold in ms
    memoryUsage: number; // Memory usage percentage threshold
    completionRate: number; // Completion rate percentage threshold
    stagnationRate: number; // Stagnation rate percentage threshold
  };
  codexExecutable: string; // Path to Codex executable
  codexTimeout: number; // Codex check timeout
}
```

## Debug Tools Reference

### Session Inspection
```typescript
interface SessionInspectionResult {
  sessionId: string;
  exists: boolean;
  isValid: boolean;
  state?: GansAuditorCodexSessionState;
  issues: string[];
  recommendations: string[];
  fileInfo?: {
    path: string;
    size: number;
    lastModified: number;
  };
}
```

### Session Analysis
```typescript
interface SessionAnalysisResult {
  sessionId: string;
  summary: {
    totalIterations: number;
    currentLoop: number;
    isComplete: boolean;
    completionReason?: string;
    duration: number;
    averageIterationTime: number;
  };
  progressAnalysis: {
    scoreProgression: number[];
    improvementTrend: 'improving' | 'stagnant' | 'declining';
    stagnationDetected: boolean;
    stagnationLoop?: number;
  };
  performanceMetrics: {
    fastestIteration: number;
    slowestIteration: number;
    averageAuditDuration: number;
    totalAuditTime: number;
  };
  issues: string[];
  recommendations: string[];
}
```

### Performance Analysis
```typescript
interface PerformanceAnalysisResult {
  timeRange: {
    start: number;
    end: number;
    duration: number;
  };
  auditPerformance: {
    totalAudits: number;
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    p99Duration: number;
  };
  sessionPerformance: {
    totalSessions: number;
    averageLoops: number;
    completionRate: number;
    stagnationRate: number;
  };
  resourceUsage: {
    peakMemoryUsage: number;
    averageMemoryUsage: number;
    memoryTrend: 'increasing' | 'stable' | 'decreasing';
  };
  bottlenecks: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
}
```

## Log Format Reference

### Audit Log Entry
```typescript
interface AuditLogEntry {
  timestamp: number;
  eventType: AuditEventType;
  sessionId: string;
  loopId?: string;
  thoughtNumber?: number;
  data: Record<string, any>;
  duration?: number;
  performance?: {
    memoryUsage: number;
    cpuUsage?: NodeJS.CpuUsage;
  };
}
```

### Session Log Entry
```typescript
interface SessionLogEntry {
  timestamp: number;
  sessionId: string;
  loopId?: string;
  event: 'created' | 'updated' | 'completed' | 'terminated' | 'error';
  iteration?: number;
  data: {
    currentLoop?: number;
    isComplete?: boolean;
    completionReason?: string;
    stagnationDetected?: boolean;
    auditScore?: number;
    auditVerdict?: string;
    duration?: number;
    error?: string;
  };
}
```

### Performance Log Entry
```typescript
interface PerformanceLogEntry {
  timestamp: number;
  category: 'audit' | 'session' | 'context' | 'system';
  metric: string;
  value: number;
  unit: string;
  threshold?: number;
  exceeded?: boolean;
  context: Record<string, any>;
}
```

### Codex Context Log Entry
```typescript
interface CodexContextLogEntry {
  timestamp: number;
  loopId: string;
  contextId: string;
  event: 'created' | 'maintained' | 'terminated' | 'error';
  duration?: number;
  resourceUsage?: {
    memoryMB: number;
    cpuPercent: number;
  };
  terminationReason?: string;
  error?: string;
}
```

## Best Practices

### Performance Optimization
1. **Enable Caching**: Use audit result caching for identical code submissions
2. **Monitor Thresholds**: Set appropriate performance thresholds for your environment
3. **Regular Cleanup**: Implement session cleanup to prevent resource accumulation
4. **Log Rotation**: Configure appropriate log rotation to manage disk usage
5. **Buffer Management**: Tune log buffer sizes and flush intervals for your workload

### Health Monitoring
1. **Regular Checks**: Perform health checks at appropriate intervals (recommended: 1 minute)
2. **Threshold Tuning**: Adjust health thresholds based on your system characteristics
3. **Alert Integration**: Integrate health checks with your alerting system
4. **Trend Analysis**: Monitor health trends over time to identify degradation

### Debugging
1. **Session Inspection**: Regularly inspect problematic sessions for patterns
2. **Performance Analysis**: Use performance analysis to identify bottlenecks
3. **Diagnostic Export**: Export diagnostics for offline analysis
4. **Trend Monitoring**: Monitor session trends to identify systemic issues

### Logging
1. **Structured Logging**: Use structured logging for better analysis capabilities
2. **Log Levels**: Configure appropriate log levels for different environments
3. **Performance Impact**: Monitor logging performance impact on system
4. **Storage Management**: Implement appropriate log storage and retention policies

## Troubleshooting

### Common Issues

#### High Memory Usage
- **Symptoms**: Memory usage threshold exceeded
- **Causes**: Large session history, memory leaks, insufficient cleanup
- **Solutions**: Implement session cleanup, reduce history retention, investigate memory leaks

#### Slow Audit Performance
- **Symptoms**: High audit duration, timeout errors
- **Causes**: Codex service issues, network latency, resource contention
- **Solutions**: Check Codex service health, optimize network, scale resources

#### High Stagnation Rate
- **Symptoms**: Many sessions showing stagnation
- **Causes**: Similarity threshold too low, insufficient guidance, complex problems
- **Solutions**: Adjust similarity thresholds, improve completion criteria, provide better guidance

#### Health Check Failures
- **Symptoms**: Critical health status, service unavailable errors
- **Causes**: Service dependencies down, configuration issues, resource exhaustion
- **Solutions**: Check service dependencies, validate configuration, scale resources

### Debug Commands

```typescript
// Get comprehensive system status
const status = await getSystemStatus();
console.log('System Status:', JSON.stringify(status, null, 2));

// Analyze specific session
const analysis = await debugTools.analyzeSession('problematic-session-id');
console.log('Session Analysis:', analysis);

// Export diagnostics for analysis
await debugTools.exportDiagnostics('./debug-export.json');

// Check health status
const health = await healthChecker.performHealthCheck();
console.log('Health Report:', health);

// Get performance analysis
const performance = await debugTools.analyzePerformance(24 * 60 * 60 * 1000); // 24 hours
console.log('Performance Analysis:', performance);
```

## Integration Examples

### Express.js Health Endpoint
```typescript
import express from 'express';
import { healthChecker, getSystemStatus } from './monitoring/index.js';

const app = express();

app.get('/health', async (req, res) => {
  const health = await healthChecker.performHealthCheck();
  const status = health.overall === 'healthy' ? 200 : 503;
  res.status(status).json(health);
});

app.get('/metrics', async (req, res) => {
  const status = await getSystemStatus();
  res.json(status.metrics);
});
```

### Prometheus Metrics Export
```typescript
import { metricsCollector } from './monitoring/index.js';

function exportPrometheusMetrics(): string {
  const metrics = metricsCollector.getMetricsSnapshot();
  
  return [
    `# HELP audit_completion_rate Audit completion rate percentage`,
    `# TYPE audit_completion_rate gauge`,
    `audit_completion_rate ${metrics.completion.completionRate}`,
    ``,
    `# HELP audit_duration_avg Average audit duration in milliseconds`,
    `# TYPE audit_duration_avg gauge`,
    `audit_duration_avg ${metrics.performance.averageAuditDuration}`,
    ``,
    `# HELP session_stagnation_rate Session stagnation rate percentage`,
    `# TYPE session_stagnation_rate gauge`,
    `session_stagnation_rate ${metrics.loops.stagnationRate}`,
  ].join('\n');
}
```

### Custom Alert Integration
```typescript
import { healthChecker, metricsCollector } from './monitoring/index.js';

healthChecker.on('healthReport', (report) => {
  if (report.overall === 'critical') {
    // Send alert to your alerting system
    sendAlert({
      severity: 'critical',
      message: 'Synchronous audit system health is critical',
      details: report.checks.filter(c => c.status === 'critical'),
    });
  }
});

// Monitor specific metrics
setInterval(() => {
  const metrics = metricsCollector.getMetricsSnapshot();
  
  if (metrics.completion.completionRate < 50) {
    sendAlert({
      severity: 'warning',
      message: 'Low audit completion rate detected',
      value: metrics.completion.completionRate,
    });
  }
  
  if (metrics.loops.stagnationRate > 40) {
    sendAlert({
      severity: 'warning',
      message: 'High session stagnation rate detected',
      value: metrics.loops.stagnationRate,
    });
  }
}, 60000); // Check every minute
```

## Requirements Fulfilled

This monitoring and observability system fulfills all the requirements from task 13:

✅ **Add metrics for completion rates and loop statistics**
- Comprehensive completion metrics with tier tracking
- Detailed loop statistics including stagnation detection
- Real-time metrics collection and aggregation

✅ **Create logging for audit performance and session tracking**
- Specialized audit logger with performance tracking
- Complete session lifecycle logging
- Structured JSON logging with buffering and rotation

✅ **Implement health checks for synchronous audit system**
- Comprehensive health monitoring system
- Multiple health check categories (system, audit engine, session manager, Codex service)
- Configurable thresholds and automated monitoring

✅ **Add debugging tools for session state inspection**
- Detailed session inspection and analysis tools
- Performance analysis and bottleneck identification
- System diagnostics and diagnostic export capabilities

✅ **Add Codex context window usage monitoring**
- Complete Codex context lifecycle tracking
- Resource usage monitoring for contexts
- Context termination reason tracking

✅ **Performance and reliability monitoring**
- Real-time performance metrics collection
- System health monitoring with alerting
- Comprehensive observability across all system components

The implementation provides a production-ready monitoring and observability solution that enables comprehensive tracking, debugging, and optimization of the synchronous audit workflow.