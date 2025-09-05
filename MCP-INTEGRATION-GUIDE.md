# GansAuditor MCP Server Integration Guide

## Overview

The GansAuditor MCP server provides advanced code auditing and sequential thinking capabilities through the Model Context Protocol. It combines thoughtful problem-solving with automated code quality assessment, featuring both asynchronous and synchronous audit workflows for iterative code improvement.

## Test Results Summary

✅ **Server Initialization**: Successfully initializes with MCP protocol 2024-11-05
✅ **Tool Registration**: Registers `gansauditor_codex` tool with comprehensive schema
✅ **Basic Functionality**: Processes thoughts and maintains history
✅ **Code Detection**: Automatically detects JavaScript, Python, and diff content
✅ **GAN Auditing**: Initiates asynchronous audits when `ENABLE_GAN_AUDITING=true`
✅ **Synchronous Workflow**: Provides immediate feedback with iterative improvement cycles
✅ **Session Management**: Tracks sessions using `branchId` parameter with state persistence
✅ **Completion Criteria**: Implements tiered completion thresholds and kill switches
✅ **Loop Detection**: Prevents stagnation with similarity analysis
✅ **Custom Configuration**: Supports inline `gan-config` blocks
✅ **Response Format**: Returns structured JSON responses with audit metadata

## MCP Client Configuration

### For Kiro (.kiro/settings/mcp.json)

#### Basic Configuration (Async Mode)
```json
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "node",
      "args": ["/path/to/GansAuditor/dist/index.js"],
      "env": {
        "ENABLE_GAN_AUDITING": "true",
        "DISABLE_THOUGHT_LOGGING": "false"
      },
      "disabled": false,
      "autoApprove": ["gansauditor_codex"]
    }
  }
}
```

#### Synchronous Workflow Configuration
```json
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "node",
      "args": ["/path/to/GansAuditor/dist/index.js"],
      "env": {
        "ENABLE_GAN_AUDITING": "true",
        "ENABLE_SYNCHRONOUS_AUDIT": "true",
        "AUDIT_TIMEOUT_SECONDS": "30",
        "MAX_CONCURRENT_AUDITS": "5",
        "SYNC_AUDIT_TIER1_SCORE": "95",
        "SYNC_AUDIT_TIER1_LOOPS": "10",
        "ENABLE_STAGNATION_DETECTION": "true",
        "DISABLE_THOUGHT_LOGGING": "false"
      },
      "disabled": false,
      "autoApprove": ["gansauditor_codex"]
    }
  }
}
```

### For Claude Desktop (~/.claude/mcp_servers.json)
```json
{
  "gansauditor-codex": {
    "command": "node",
    "args": ["/path/to/GansAuditor/dist/index.js"],
    "env": {
      "ENABLE_GAN_AUDITING": "true",
      "DISABLE_THOUGHT_LOGGING": "false"
    }
  }
}
```

### For uvx Installation (Recommended)
```json
{
  "mcpServers": {
    "gansauditor-codex": {
      "command": "uvx",
      "args": ["@modelcontextprotocol/server-gansauditor-codex@latest"],
      "env": {
        "ENABLE_GAN_AUDITING": "true",
        "DISABLE_THOUGHT_LOGGING": "false"
      },
      "disabled": false,
      "autoApprove": ["gansauditor_codex"]
    }
  }
}
```

## Environment Variables

### Core Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_GAN_AUDITING` | `false` | Enable automatic code auditing |
| `ENABLE_SYNCHRONOUS_AUDIT` | `false` | Enable synchronous workflow mode |
| `DISABLE_THOUGHT_LOGGING` | `false` | Disable formatted console output |

### Synchronous Workflow Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `AUDIT_TIMEOUT_SECONDS` | `30` | Timeout for audit operations |
| `MAX_CONCURRENT_AUDITS` | `5` | Maximum concurrent audit operations |
| `MAX_CONCURRENT_SESSIONS` | `50` | Maximum concurrent sessions |
| `SYNC_AUDIT_TIER1_SCORE` | `95` | Score threshold for Tier 1 completion (10 loops) |
| `SYNC_AUDIT_TIER2_SCORE` | `90` | Score threshold for Tier 2 completion (15 loops) |
| `SYNC_AUDIT_TIER3_SCORE` | `85` | Score threshold for Tier 3 completion (20 loops) |
| `SYNC_AUDIT_HARD_STOP_LOOPS` | `25` | Hard stop maximum loops |
| `ENABLE_STAGNATION_DETECTION` | `true` | Enable stagnation detection |
| `SYNC_AUDIT_STAGNATION_THRESHOLD` | `0.95` | Similarity threshold for stagnation |
| `ENABLE_AUDIT_CACHING` | `true` | Enable audit result caching |

## Tool Usage

### Basic Sequential Thinking
```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I need to analyze this problem step by step.",
    "thoughtNumber": 1,
    "totalThoughts": 3,
    "nextThoughtNeeded": true
  }
}
```

### Synchronous Iterative Code Improvement

#### Initial Code Submission
```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "Here's my implementation of a user authentication function:\n\n```javascript\nfunction authenticateUser(username, password) {\n  const user = database.query('SELECT * FROM users WHERE username = \"' + username + '\"');\n  if (user && user.password === password) {\n    return { success: true, user: user };\n  }\n  return { success: false };\n}\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "auth-implementation"
  }
}
```

#### Response with Feedback (nextThoughtNeeded: true)
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": true,
  "sessionId": "auth-implementation",
  "gan": {
    "verdict": "revise",
    "overall": 45,
    "review": {
      "summary": "Critical security vulnerabilities detected: SQL injection and plaintext password comparison",
      "inline": [
        {
          "path": "auth.js",
          "line": 2,
          "comment": "SQL injection vulnerability - use parameterized queries"
        },
        {
          "path": "auth.js", 
          "line": 3,
          "comment": "Password should be hashed, not compared in plaintext"
        }
      ]
    },
    "completionStatus": {
      "isComplete": false,
      "currentLoop": 1,
      "score": 45,
      "threshold": 95
    }
  }
}
```

#### Improved Code Submission (Loop 2)
```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I've addressed the security issues:\n\n```javascript\nconst bcrypt = require('bcrypt');\n\nfunction authenticateUser(username, password) {\n  const user = database.query('SELECT * FROM users WHERE username = ?', [username]);\n  if (user && bcrypt.compareSync(password, user.hashedPassword)) {\n    return { success: true, user: { id: user.id, username: user.username } };\n  }\n  return { success: false };\n}\n```",
    "thoughtNumber": 2,
    "totalThoughts": 2,
    "nextThoughtNeeded": false,
    "branchId": "auth-implementation"
  }
}
```

#### Final Response (Completion)
```json
{
  "thoughtNumber": 2,
  "totalThoughts": 2,
  "nextThoughtNeeded": false,
  "sessionId": "auth-implementation",
  "gan": {
    "verdict": "pass",
    "overall": 96,
    "review": {
      "summary": "Excellent implementation with proper security measures",
      "inline": []
    },
    "completionStatus": {
      "isComplete": true,
      "reason": "score_95_at_10",
      "currentLoop": 2,
      "score": 96,
      "threshold": 95
    }
  }
}
```

### Custom Audit Configuration with Synchronous Mode
```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{\n  \"task\": \"Security review\",\n  \"threshold\": 90,\n  \"maxCycles\": 15\n}\n```\n\n```python\ndef process_payment(amount, card_number):\n    # Process payment logic here\n    return True\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "payment-security"
  }
}
```

### Loop Detection Example

When the system detects stagnation (similar responses across iterations):

```json
{
  "thoughtNumber": 12,
  "totalThoughts": 12,
  "nextThoughtNeeded": true,
  "sessionId": "stagnant-session",
  "gan": {
    "verdict": "revise",
    "overall": 78,
    "loopInfo": {
      "currentLoop": 12,
      "stagnationDetected": true,
      "progressTrend": "stagnant"
    },
    "terminationInfo": {
      "reason": "Stagnation detected - responses are 97% similar to previous iterations",
      "recommendation": "Try a different approach or break down the problem into smaller parts"
    }
  }
}
```

### Kill Switch Activation (Hard Stop)

When maximum loops are reached:

```json
{
  "thoughtNumber": 25,
  "totalThoughts": 25,
  "nextThoughtNeeded": false,
  "sessionId": "max-loops-session",
  "gan": {
    "verdict": "reject",
    "overall": 82,
    "terminationInfo": {
      "reason": "Maximum loops (25) reached without achieving completion criteria",
      "failureRate": 0.18,
      "criticalIssues": [
        "Persistent security vulnerabilities",
        "Incomplete error handling"
      ],
      "finalAssessment": "Code shows improvement but requires fundamental architectural changes"
    }
  }
}
```

## Response Format

### Standard Response
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1
}
```

### Enhanced Response (with auditing)
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1,
  "sessionId": "audit-session-id",
  "gan": {
    "verdict": "revise",
    "overall": 65,
    "review": {
      "summary": "Code has security vulnerabilities",
      "scores": { "security": 30, "performance": 80 }
    }
  }
}
```

## Features

### Automatic Code Detection
The server automatically detects and audits:
- Code blocks (```javascript, ```python, etc.)
- Diff content (git diffs, patch files)
- Programming patterns and keywords
- gan-config configuration blocks

### Synchronous Workflow Features

#### Iterative Improvement Cycles
- **Immediate Feedback**: Receive audit results in the same response
- **Structured Feedback**: Get specific, actionable improvement suggestions
- **Progress Tracking**: Monitor improvement across iterations
- **Session Continuity**: Maintain context across multiple calls

#### Completion Criteria (Tiered System)
- **Tier 1**: 95% score at 10 loops → Completion
- **Tier 2**: 90% score at 15 loops → Completion  
- **Tier 3**: 85% score at 20 loops → Completion
- **Hard Stop**: 25 loops maximum → Forced termination

#### Kill Switches and Safety Features
- **Stagnation Detection**: Identifies when responses become repetitive (>95% similarity)
- **Loop Prevention**: Prevents infinite improvement cycles
- **Timeout Protection**: 30-second default timeout per audit
- **Resource Management**: Concurrent session and audit limits

#### Enhanced Response Format
```typescript
interface SynchronousResponse {
  // Standard fields
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  
  // Synchronous workflow fields
  sessionId: string;
  gan: {
    verdict: "pass" | "revise" | "reject";
    overall: number; // 0-100 score
    review: {
      summary: string;
      inline: Array<{path: string, line: number, comment: string}>;
      citations: string[];
    };
    completionStatus: {
      isComplete: boolean;
      reason: string;
      currentLoop: number;
      score: number;
      threshold: number;
    };
    loopInfo?: {
      currentLoop: number;
      maxLoops: number;
      progressTrend: "improving" | "stagnant" | "declining";
      stagnationDetected: boolean;
    };
    terminationInfo?: {
      reason: string;
      failureRate: number;
      criticalIssues: string[];
      finalAssessment: string;
    };
  };
}
```

### Session Continuity
Use `branchId` to maintain audit context across multiple tool calls:
```javascript
// First call - Initial submission
{ "branchId": "feature-review", "thoughtNumber": 1 }

// Second call - Improved version (same session)
{ "branchId": "feature-review", "thoughtNumber": 2 }

// Third call - Final version (same session)
{ "branchId": "feature-review", "thoughtNumber": 3 }
```

### Inline Configuration
Customize audit behavior with gan-config blocks:
```javascript
{
  "thought": "```gan-config\n{\n  \"task\": \"Security audit\",\n  \"threshold\": 85,\n  \"scope\": \"function\",\n  \"maxCycles\": 15\n}\n```\n\n```code here```"
}
```

### Performance Optimizations
- **Audit Caching**: Identical code submissions return cached results
- **Progress Indicators**: Long-running audits show progress updates
- **Concurrent Limiting**: Prevents system overload
- **Memory Efficiency**: Optimized session history management

## Installation

1. **Build the server**:
   ```bash
   cd /path/to/GansAuditor
   npm run build
   ```

2. **Test the server**:
   ```bash
   node dist/index.js
   # Should show: "GansAuditor_Codex MCP Server running on stdio"
   ```

3. **Add to MCP configuration** (see examples above)

4. **Restart your MCP client** to load the new server

## Troubleshooting

### General Issues
- **Server hangs**: This is normal - MCP servers wait for JSON-RPC input
- **No audit results**: Ensure `ENABLE_GAN_AUDITING=true` is set
- **Connection issues**: Check the path to `dist/index.js` is correct
- **Permission errors**: Ensure the server files are executable

### Synchronous Workflow Issues

#### Synchronous Mode Not Working
**Problem**: Tool returns responses without audit results despite synchronous mode being enabled

**Solutions**:
```bash
# Ensure both flags are set
export ENABLE_GAN_AUDITING=true
export ENABLE_SYNCHRONOUS_AUDIT=true

# Check configuration validation
node -e "
const { isSynchronousModeReady } = require('./dist/src/config/synchronous-config.js');
console.log(isSynchronousModeReady());
"
```

#### Frequent Timeouts
**Problem**: Audit operations timing out frequently

**Solutions**:
```bash
# Increase timeout
export AUDIT_TIMEOUT_SECONDS=60

# Enable partial results on timeout
export AUDIT_PARTIAL_RESULTS_ON_TIMEOUT=true

# Reduce concurrency if system is overloaded
export MAX_CONCURRENT_AUDITS=2
```

#### Stagnation Detection False Positives
**Problem**: Sessions terminating prematurely due to stagnation detection

**Solutions**:
```bash
# Reduce sensitivity (closer to 1.0 = less sensitive)
export SYNC_AUDIT_STAGNATION_THRESHOLD=0.98

# Delay stagnation detection
export SYNC_AUDIT_STAGNATION_START_LOOP=15

# Disable if problematic
export ENABLE_STAGNATION_DETECTION=false
```

#### Session Persistence Issues
**Problem**: Sessions not persisting between calls

**Solutions**:
```bash
# Check state directory exists and is writable
ls -la .mcp-gan-state/
chmod 755 .mcp-gan-state/

# Enable session persistence explicitly
export ENABLE_SESSION_PERSISTENCE=true

# Check disk space
df -h .
```

#### High Memory Usage
**Problem**: System running out of memory with many concurrent sessions

**Solutions**:
```bash
# Reduce concurrent sessions
export MAX_CONCURRENT_SESSIONS=25

# Enable more aggressive cleanup
export SESSION_CLEANUP_INTERVAL=1800000  # 30 minutes
export MAX_SESSION_AGE=43200000  # 12 hours

# Disable caching if memory is critical
export ENABLE_AUDIT_CACHING=false
```

#### Poor Completion Rates
**Problem**: Most sessions hit the hard stop without completing

**Solutions**:
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
```

### Debugging Tools

#### Configuration Health Check
```bash
node -e "
const { createRuntimeConfig } = require('./dist/src/config/synchronous-config.js');
const { config, validation } = createRuntimeConfig();
console.log('Valid:', validation.isValid);
if (!validation.isValid) {
  console.log('Errors:', validation.errors);
  console.log('Recommendations:', validation.recommendations);
}
"
```

#### Session State Inspection
```bash
# List active sessions
ls -la .mcp-gan-state/

# Inspect specific session
cat .mcp-gan-state/your-session-id.json | jq '.'

# Check session statistics
node -e "
const fs = require('fs');
const sessions = fs.readdirSync('.mcp-gan-state')
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync('.mcp-gan-state/' + f)));
console.log('Total sessions:', sessions.length);
console.log('Completed:', sessions.filter(s => s.isComplete).length);
console.log('Average loops:', sessions.reduce((sum, s) => sum + s.currentLoop, 0) / sessions.length);
"
```

#### Performance Monitoring
```bash
# Enable metrics collection
export ENABLE_SYNC_AUDIT_METRICS=true

# Monitor resource usage
top -p $(pgrep -f "gansauditor-codex")

# Check audit queue status
node -e "
const { getAuditQueueStatus } = require('./dist/src/auditor/audit-queue.js');
console.log(getAuditQueueStatus());
"
```

## Testing

Use the provided test scripts:
- `test-mcp-server.js` - Basic functionality test
- `test-mcp-server-with-auditing.js` - Auditing features test
- `integration-test.js` - Comprehensive integration test

```bash
node test-mcp-server.js
node test-mcp-server-with-auditing.js
node integration-test.js
```

## Documentation

### Comprehensive Guides

- **[Synchronous Workflow Examples](docs/SYNCHRONOUS_WORKFLOW_EXAMPLES.md)**: Detailed examples of iterative code improvement workflows
- **[Configuration Guide](docs/SYNCHRONOUS_AUDIT_CONFIGURATION.md)**: Complete configuration reference for synchronous mode
- **[Migration Guide](docs/SYNCHRONOUS_AUDIT_MIGRATION_GUIDE.md)**: Step-by-step migration from async to synchronous mode
- **[Troubleshooting Guide](docs/SYNCHRONOUS_WORKFLOW_TROUBLESHOOTING.md)**: Comprehensive troubleshooting and debugging guide

### Quick References

- **[Starter Guide](Docs/Starter-Guides/GansAuditorCodex.md)**: Getting started with GansAuditor Codex
- **[Configuration Quick Start](docs/CONFIGURATION_QUICK_START.md)**: Essential configuration settings

## Best Practices

### For Development
1. **Start with async mode** to understand basic functionality
2. **Enable synchronous mode** with conservative settings
3. **Use descriptive branch IDs** for session tracking
4. **Monitor completion rates** and adjust thresholds accordingly
5. **Enable verbose feedback** for learning and debugging

### For Production
1. **Thoroughly test** synchronous mode in staging environment
2. **Monitor resource usage** and adjust concurrency limits
3. **Implement health checks** for audit service availability
4. **Set up alerting** for timeout rates and completion metrics
5. **Regular cleanup** of old session files

### For Performance
1. **Enable audit caching** for repeated code reviews
2. **Use appropriate scope** (diff/paths/workspace) for efficiency
3. **Tune completion criteria** based on quality requirements
4. **Monitor stagnation detection** for false positives
5. **Implement proper error handling** for graceful degradation

## Next Steps

1. **Publish to npm**: Make the server available via `uvx` installation
2. **Add to MCP registry**: Submit to the official MCP server directory
3. **Extend auditing**: Add more code analysis capabilities
4. **Performance optimization**: Improve audit speed and accuracy
5. **Enhanced monitoring**: Add comprehensive metrics and observability