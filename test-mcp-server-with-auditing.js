#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server with GAN auditing enabled
const serverProcess = spawn('node', [join(__dirname, 'dist/index.js')], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    ENABLE_GAN_AUDITING: 'true',
    DISABLE_THOUGHT_LOGGING: 'false'
  }
});

let requestId = 1;

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    id: requestId++,
    method: method,
    params: params
  };
  
  console.log('Sending request:', JSON.stringify(request, null, 2));
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
}

// Handle responses
serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('Received response:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Raw output:', line);
    }
  });
});

// Test sequence with auditing
setTimeout(() => {
  console.log('\n=== Testing MCP Server with GAN Auditing ===\n');
  
  // Initialize
  sendRequest('initialize', {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "test-client", version: "1.0.0" }
  });
}, 100);

setTimeout(() => {
  // Test with problematic code that should trigger auditing
  sendRequest('tools/call', {
    name: 'gansauditor_codex',
    arguments: {
      thought: `Let me review this potentially problematic JavaScript code:

\`\`\`javascript
function processUserInput(input) {
  // Potential security issue: no input validation
  eval(input);
  return "Processed: " + input;
}

function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) { // Off-by-one error
    total += items[i].price;
  }
  return total;
}
\`\`\`

This code has several issues that need to be addressed for security and correctness.`,
      thoughtNumber: 1,
      totalThoughts: 3,
      nextThoughtNeeded: true,
      branchId: 'audit-test-session'
    }
  });
}, 500);

setTimeout(() => {
  // Test with gan-config customization
  sendRequest('tools/call', {
    name: 'gansauditor_codex',
    arguments: {
      thought: `Now let me analyze this with custom audit settings:

\`\`\`gan-config
{
  "task": "Security vulnerability assessment",
  "scope": "function",
  "threshold": 85,
  "judges": ["internal"],
  "maxCycles": 3
}
\`\`\`

\`\`\`python
import os
import subprocess

def execute_command(cmd):
    # Dangerous: shell injection vulnerability
    result = subprocess.run(cmd, shell=True, capture_output=True)
    return result.stdout.decode()

def read_file(filename):
    # Path traversal vulnerability
    with open(filename, 'r') as f:
        return f.read()
\`\`\`

This Python code has critical security vulnerabilities that need immediate attention.`,
      thoughtNumber: 2,
      totalThoughts: 3,
      nextThoughtNeeded: true,
      branchId: 'audit-test-session'
    }
  });
}, 1500);

setTimeout(() => {
  // Test with diff content
  sendRequest('tools/call', {
    name: 'gansauditor_codex',
    arguments: {
      thought: `Finally, let me review this code diff:

\`\`\`diff
- function authenticate(user, pass) {
-   if (user === "admin" && pass === "password123") {
+ function authenticate(user, pass) {
+   const hashedPass = crypto.createHash('sha256').update(pass).digest('hex');
+   if (user === "admin" && hashedPass === ADMIN_HASH) {
     return true;
   }
   return false;
 }
\`\`\`

This diff shows an improvement in authentication security by replacing plaintext password comparison with hashed comparison.`,
      thoughtNumber: 3,
      totalThoughts: 3,
      nextThoughtNeeded: false,
      branchId: 'audit-test-session'
    }
  });
}, 2500);

// Clean up after tests
setTimeout(() => {
  console.log('\n=== Auditing Test Complete ===');
  serverProcess.kill();
  process.exit(0);
}, 4000);

serverProcess.on('error', (error) => {
  console.error('Server error:', error);
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});