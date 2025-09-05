# Codex Context Window Management

This document describes the Codex context window management feature implemented in the GansAuditor Codex MCP server, which provides seamless context continuity across iterative audit workflows.

## Overview

The Codex context window management system enables the MCP server to maintain persistent context windows with the Codex CLI during iterative improvement cycles. This ensures that each audit iteration has access to the full context of previous iterations, leading to more accurate and contextually aware feedback.

## Key Features

### 1. Context Window Lifecycle Management

- **Start**: Automatically creates a new Codex context window when a new loop begins
- **Maintain**: Keeps the context window active during iterations
- **Terminate**: Cleanly closes the context window when the loop completes or fails

### 2. LOOP_ID Parameter Support

The tool schema now includes a `loopId` parameter that enables context continuity:

```json
{
  "loopId": {
    "type": "string",
    "description": "Loop identifier for Codex context window continuity across iterative improvements"
  }
}
```

### 3. Automatic Context Management

The system automatically handles context lifecycle based on session state:

- Creates context when `loopId` is provided and no context exists
- Maintains context during subsequent iterations
- Terminates context on completion, timeout, or failure

### 4. Resource Management

- **Stale Context Cleanup**: Automatically detects and removes orphaned contexts
- **Bulk Termination**: Can terminate all active contexts at once
- **Memory Management**: Prevents context leaks through proper cleanup

## Usage

### Basic Usage with LOOP_ID

When using the `gansauditor_codex` tool, include a `loopId` to enable context management:

```json
{
  "thought": "Let me implement the user authentication feature...",
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branchId": "auth-feature",
  "loopId": "auth-implementation-v1"
}
```

### Context Lifecycle Events

The system logs context lifecycle events for monitoring:

```
🔗 Codex context started: ctx-auth-implementation-v1-1234567890 for loop auth-implementation-v1
🔗 Codex context maintained: ctx-auth-implementation-v1-1234567890
🔗 Codex context terminated: completion for loop auth-implementation-v1
```

## Implementation Details

### Session Manager Integration

The `SynchronousSessionManager` class provides the core context management functionality:

```typescript
// Start a new context
const contextId = await sessionManager.startCodexContext(loopId);

// Maintain existing context
await sessionManager.maintainCodexContext(loopId, contextId);

// Terminate context
await sessionManager.terminateCodexContext(loopId, 'completion');
```

### Context State Tracking

Session state includes context information:

```typescript
interface GansAuditorCodexSessionState {
  loopId?: string;                    // Loop identifier
  codexContextId?: string;            // Active context ID
  codexContextActive: boolean;        // Context status
  // ... other fields
}
```

### Error Handling

The system gracefully handles various error scenarios:

- **Codex CLI Unavailable**: Continues without context (non-fatal)
- **Context Creation Failure**: Logs warning and proceeds
- **Maintenance Failure**: Removes stale contexts automatically
- **Termination Failure**: Forces cleanup to prevent leaks

## Configuration

### Environment Variables

Context management can be configured through environment variables:

```bash
# Codex executable path (default: 'codex')
CODEX_EXECUTABLE=codex

# Context operation timeout in milliseconds (default: 30000)
CODEX_TIMEOUT=30000

# Enable/disable synchronous mode (required for context management)
ENABLE_SYNCHRONOUS_AUDIT=true
```

### Runtime Configuration

The session manager accepts configuration options:

```typescript
const sessionManager = new SynchronousSessionManager({
  codexExecutable: 'codex',
  codexTimeout: 30000,
  // ... other options
});
```

## Monitoring and Debugging

### Active Context Monitoring

Check active contexts programmatically:

```typescript
// Get all active contexts
const activeContexts = sessionManager.getActiveContexts();

// Check if specific context is active
const isActive = sessionManager.isContextActive(loopId);

// Get context ID for loop
const contextId = sessionManager.getContextId(loopId);
```

### Cleanup Operations

Manual cleanup operations are available:

```typescript
// Cleanup stale contexts
await sessionManager.cleanupStaleContexts();

// Terminate all contexts
await sessionManager.terminateAllContexts('manual');

// Handle session timeout
await sessionManager.handleSessionTimeout(sessionId);

// Handle session failure
await sessionManager.handleSessionFailure(sessionId, error);
```

### Logging

Context management operations are logged with appropriate levels:

- **Info**: Context start/terminate events
- **Debug**: Context maintenance operations
- **Warn**: Context failures and cleanup events
- **Error**: Critical context management failures

## Best Practices

### 1. Consistent Loop IDs

Use consistent, descriptive loop IDs that identify the improvement cycle:

```typescript
// Good: Descriptive and unique
loopId: "user-auth-security-review-v2"

// Avoid: Generic or non-unique
loopId: "loop1"
```

### 2. Proper Error Handling

Always handle context management errors gracefully:

```typescript
try {
  await sessionManager.startCodexContext(loopId);
} catch (error) {
  // Log error but continue - context is optional
  console.warn('Context creation failed:', error.message);
}
```

### 3. Resource Cleanup

Ensure proper cleanup in long-running processes:

```typescript
// Set up periodic cleanup
setInterval(async () => {
  await sessionManager.cleanupStaleContexts();
}, 5 * 60 * 1000); // Every 5 minutes
```

### 4. Session Lifecycle Management

Properly handle session completion and failure:

```typescript
// On completion
if (completionResult.isComplete) {
  await sessionManager.terminateCodexContext(loopId, 'completion');
}

// On failure
catch (error) {
  await sessionManager.handleSessionFailure(sessionId, error);
}
```

## Troubleshooting

### Common Issues

1. **Context Not Starting**
   - Verify Codex CLI is installed and accessible
   - Check `CODEX_EXECUTABLE` configuration
   - Ensure sufficient permissions

2. **Context Maintenance Failures**
   - Usually indicates stale or orphaned contexts
   - Run `cleanupStaleContexts()` to resolve
   - Check Codex CLI logs for details

3. **Memory Leaks**
   - Ensure proper termination on completion/failure
   - Use bulk termination for cleanup
   - Monitor active context count

### Debug Commands

```bash
# Check Codex CLI availability
codex --version

# Test context operations
codex context start --loop-id test-loop
codex context status --context-id <context-id>
codex context terminate --context-id <context-id> --reason manual
```

## Performance Considerations

### Context Overhead

- Context operations add ~100-500ms per operation
- Maintenance operations are lightweight (~50ms)
- Termination is typically fast (~100ms)

### Scalability

- Each context consumes Codex CLI resources
- Recommended maximum: 10-20 concurrent contexts
- Automatic cleanup prevents resource exhaustion

### Optimization Tips

1. **Batch Operations**: Use bulk termination when possible
2. **Lazy Cleanup**: Run stale context cleanup periodically, not per-operation
3. **Timeout Configuration**: Adjust timeouts based on system performance
4. **Resource Monitoring**: Monitor context count and cleanup frequency

## Security Considerations

### Context Isolation

- Each context is isolated by loop ID
- No cross-context data leakage
- Contexts are automatically cleaned up

### Access Control

- Context operations require appropriate Codex CLI permissions
- No sensitive data is stored in context metadata
- All operations are logged for audit trails

## Future Enhancements

### Planned Features

1. **Context Persistence**: Save/restore contexts across server restarts
2. **Context Sharing**: Share contexts between related sessions
3. **Advanced Monitoring**: Detailed context usage metrics
4. **Context Pooling**: Reuse contexts for improved performance

### API Extensions

Future versions may include additional context management APIs:

- Context snapshots and rollback
- Context merging and branching
- Context-aware audit scoring
- Cross-session context inheritance