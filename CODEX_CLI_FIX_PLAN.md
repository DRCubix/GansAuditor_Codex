# 🔧 Codex CLI Integration Fix Plan

## Problem Analysis

The Codex CLI integration works perfectly in direct testing but fails when executed through the MCP environment. The system gracefully falls back to structured responses, but we need the actual Codex CLI execution for real AI-powered code analysis.

## Root Cause Investigation

### Confirmed Working:

- ✅ Codex CLI is installed and accessible (`codex-cli 0.29.0`)
- ✅ Direct execution works (`node test-codex-integration.js`)
- ✅ Command structure is correct (`codex exec --sandbox read-only --json --skip-git-repo-check`)
- ✅ Response parsing logic is functional

### Suspected Issues:

1. **Environment Context**: MCP server may have different environment variables
2. **Working Directory**: Process spawning may occur in different directory
3. **Timeout Configuration**: MCP environment may have stricter timeouts
4. **Process Isolation**: MCP server process isolation affecting child processes
5. **Error Handling**: Insufficient error logging to identify exact failure point

## 🎯 Systematic Fix Plan

### Phase 1: Enhanced Diagnostics (Priority: HIGH)

#### Step 1.1: Add Comprehensive Error Logging

```typescript
// In src/codex/codex-judge.ts - executeCommand method
private executeCommand(args: string[], options: { timeout?: number; input?: string } = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const { timeout = this.config.timeout } = options;

    // Enhanced logging for MCP environment
    console.error(`[CODEX-DEBUG] Executing: ${this.config.executable} ${args.join(' ')}`);
    console.error(`[CODEX-DEBUG] Working directory: ${this.config.workingDirectory || process.cwd()}`);
    console.error(`[CODEX-DEBUG] Timeout: ${timeout}ms`);
    console.error(`[CODEX-DEBUG] Environment PATH: ${process.env.PATH}`);
    console.error(`[CODEX-DEBUG] Node version: ${process.version}`);

    const child = spawn(this.config.executable, args, {
      cwd: this.config.workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env } // Ensure full environment is passed
    });

    // Log process creation
    console.error(`[CODEX-DEBUG] Process spawned with PID: ${child.pid}`);

    // ... rest of implementation with enhanced error logging
  });
}
```

#### Step 1.2: Create MCP Environment Diagnostic Tool

```javascript
// File: diagnose-mcp-environment.js
#!/usr/bin/env node

import { spawn } from 'child_process';
import { CodexJudge } from './dist/src/codex/codex-judge.js';

async function diagnoseMCPEnvironment() {
  console.log('🔍 MCP Environment Diagnostics\n');

  // Check basic environment
  console.log('📋 Environment Information:');
  console.log(`   Node.js version: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Working directory: ${process.cwd()}`);
  console.log(`   PATH: ${process.env.PATH}`);
  console.log(`   USER: ${process.env.USER}`);
  console.log(`   HOME: ${process.env.HOME}`);

  // Check Codex CLI availability
  console.log('\n🔧 Codex CLI Diagnostics:');
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn('which', ['codex'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
      });

      child.on('error', reject);
    });

    console.log(`   Codex path: ${result.stdout}`);
    console.log(`   Exit code: ${result.code}`);
  } catch (error) {
    console.log(`   ❌ Error finding codex: ${error.message}`);
  }

  // Test Codex CLI execution
  console.log('\n⚡ Codex CLI Execution Test:');
  try {
    const codexJudge = new CodexJudge({
      timeout: 10000, // 10 second timeout for diagnostics
      workingDirectory: process.cwd()
    });

    const isAvailable = await codexJudge.isAvailable();
    console.log(`   Available: ${isAvailable}`);

    if (isAvailable) {
      const version = await codexJudge.getVersion();
      console.log(`   Version: ${version}`);
    }
  } catch (error) {
    console.log(`   ❌ Execution error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

diagnoseMCPEnvironment().catch(console.error);
```

### Phase 2: Configuration Fixes (Priority: HIGH)

#### Step 2.1: Fix Working Directory Context

```typescript
// In src/codex/codex-judge.ts constructor
constructor(config: Partial<CodexJudgeConfig> = {}) {
  this.config = {
    executable: 'codex',
    timeout: 60000, // Increase timeout for MCP environment
    retries: 2,
    workingDirectory: process.cwd(), // Ensure working directory is set
    ...config,
  };

  // Log configuration for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[CODEX-CONFIG] Executable: ${this.config.executable}`);
    console.error(`[CODEX-CONFIG] Working directory: ${this.config.workingDirectory}`);
    console.error(`[CODEX-CONFIG] Timeout: ${this.config.timeout}ms`);
  }
}
```

#### Step 2.2: Environment Variable Propagation

```typescript
// In src/codex/codex-judge.ts executeCommand method
const child = spawn(this.config.executable, args, {
  cwd: this.config.workingDirectory,
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    // Ensure critical environment variables are present
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USER: process.env.USER,
    // Add any Codex-specific environment variables
    CODEX_CONFIG_DIR:
      process.env.CODEX_CONFIG_DIR || `${process.env.HOME}/.codex`,
  },
});
```

### Phase 3: Timeout and Process Management (Priority: MEDIUM)

#### Step 3.1: Adaptive Timeout Configuration

```typescript
// In src/config/synchronous-config.ts
export const DEFAULT_AUDIT_TIMEOUT_CONFIG: AuditTimeoutConfig = {
  auditTimeoutSeconds: 90, // Increase from 45 to 90 seconds for MCP environment
  progressIndicatorInterval: 10000, // 10 seconds
  enableProgressIndicators: true,
  timeoutRetryAttempts: 3, // Increase retry attempts
  partialResultsOnTimeout: true,
};
```

#### Step 3.2: Process Health Monitoring

```typescript
// In src/codex/codex-judge.ts
private executeCommand(args: string[], options: { timeout?: number; input?: string } = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const { timeout = this.config.timeout } = options;

    const child = spawn(this.config.executable, args, {
      cwd: this.config.workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | null = null;
    let processKilled = false;

    // Enhanced timeout handling
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        if (!processKilled) {
          processKilled = true;
          console.error(`[CODEX-DEBUG] Process timeout after ${timeout}ms, sending SIGTERM`);
          child.kill('SIGTERM');

          // Force kill after additional 5 seconds
          setTimeout(() => {
            if (!child.killed) {
              console.error(`[CODEX-DEBUG] Force killing process with SIGKILL`);
              child.kill('SIGKILL');
            }
          }, 5000);

          reject(new CodexTimeoutError(timeout));
        }
      }, timeout);
    }

    // Process monitoring
    child.on('spawn', () => {
      console.error(`[CODEX-DEBUG] Process spawned successfully`);
    });

    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      console.error(`[CODEX-DEBUG] Process error: ${error.message}`);
      reject(error);
    });

    // ... rest of implementation
  });
}
```

### Phase 4: Alternative Execution Strategies (Priority: MEDIUM)

#### Step 4.1: Shell Wrapper Approach

```typescript
// Alternative execution method using shell wrapper
private async executeCodexCommandViaShell(request: AuditRequest): Promise<string> {
  const auditPrompt = this.generateAuditPrompt(request);

  // Create temporary file for prompt
  const tempFile = `/tmp/codex-prompt-${Date.now()}.txt`;
  await fs.writeFile(tempFile, auditPrompt);

  try {
    // Use shell command with explicit environment
    const shellCommand = `cd "${this.config.workingDirectory}" && codex exec --sandbox read-only --json --skip-git-repo-check < "${tempFile}"`;

    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
      const child = spawn('bash', ['-c', shellCommand], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      // ... implementation
    });

    return result.stdout;
  } finally {
    // Clean up temporary file
    try {
      await fs.unlink(tempFile);
    } catch (error) {
      console.error(`[CODEX-DEBUG] Failed to cleanup temp file: ${error.message}`);
    }
  }
}
```

### Phase 5: Testing and Validation (Priority: HIGH)

#### Step 5.1: MCP-Specific Test Suite

````javascript
// File: test-mcp-codex-integration.js
#!/usr/bin/env node

import { spawn } from 'child_process';

async function testMCPCodexIntegration() {
  console.log('🧪 Testing Codex CLI in MCP Environment\n');

  // Start MCP server with debug logging
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      CODEX_DEBUG: 'true',
      DISABLE_THOUGHT_LOGGING: 'false'
    }
  });

  // Monitor server output for Codex debug messages
  server.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('[CODEX-DEBUG]')) {
      console.log('🔍 Codex Debug:', output.trim());
    }
  });

  // Send test request after server starts
  setTimeout(() => {
    const testRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "gansauditor_codex",
        arguments: {
          thought: "Test Codex integration:\n\n```javascript\nfunction test() { return 'hello'; }\n```",
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
          branchId: "debug-test"
        }
      }
    };

    server.stdin.write(JSON.stringify(testRequest) + '\n');
  }, 3000);

  // Cleanup after 60 seconds
  setTimeout(() => {
    server.kill('SIGTERM');
  }, 60000);
}

testMCPCodexIntegration().catch(console.error);
````

## 🚀 Implementation Timeline

### Week 1: Diagnostics and Immediate Fixes

- [ ] Implement enhanced error logging
- [ ] Create MCP environment diagnostic tool
- [ ] Fix working directory and environment variable issues
- [ ] Test with increased timeouts

### Week 2: Advanced Solutions

- [ ] Implement alternative execution strategies
- [ ] Add process health monitoring
- [ ] Create comprehensive test suite
- [ ] Performance optimization

### Week 3: Validation and Documentation

- [ ] End-to-end testing in MCP environment
- [ ] Performance benchmarking
- [ ] Documentation updates
- [ ] Deployment verification

## 🎯 Success Criteria

1. **✅ Codex CLI executes successfully in MCP environment**
2. **✅ Real AI-powered code analysis responses**
3. **✅ Proper error handling and fallback mechanisms**
4. **✅ Performance within acceptable limits (< 60 seconds)**
5. **✅ Comprehensive logging for troubleshooting**

## 📋 Next Steps

1. **Immediate**: Implement diagnostic logging and run environment analysis
2. **Short-term**: Apply configuration fixes and test
3. **Medium-term**: Implement alternative execution strategies if needed
4. **Long-term**: Optimize performance and add monitoring

This plan provides a systematic approach to identifying and fixing the Codex CLI execution issues in the MCP environment while maintaining the existing fallback functionality.
