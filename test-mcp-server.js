#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const serverProcess = spawn('node', [join(__dirname, 'dist/index.js')], {
  stdio: ['pipe', 'pipe', 'inherit']
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

// Test sequence
setTimeout(() => {
  console.log('\n=== Testing MCP Server ===\n');
  
  // 1. Initialize
  sendRequest('initialize', {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {}
    },
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  });
}, 100);

setTimeout(() => {
  // 2. List tools
  sendRequest('tools/list');
}, 500);

setTimeout(() => {
  // 3. Test the gansauditor_codex tool
  sendRequest('tools/call', {
    name: 'gansauditor_codex',
    arguments: {
      thought: 'This is a test thought to see if the GansAuditor MCP server responds correctly.',
      thoughtNumber: 1,
      totalThoughts: 2,
      nextThoughtNeeded: true
    }
  });
}, 1000);

setTimeout(() => {
  // 4. Test with code content to trigger auditing
  sendRequest('tools/call', {
    name: 'gansauditor_codex',
    arguments: {
      thought: 'Let me analyze this JavaScript function:\n\n```javascript\nfunction calculateSum(a, b) {\n  return a + b;\n}\n```\n\nThis function looks simple but let me verify it handles edge cases properly.',
      thoughtNumber: 2,
      totalThoughts: 2,
      nextThoughtNeeded: false,
      branchId: 'test-session-1'
    }
  });
}, 1500);

// Clean up after tests
setTimeout(() => {
  console.log('\n=== Test Complete ===');
  serverProcess.kill();
  process.exit(0);
}, 3000);

// Handle errors
serverProcess.on('error', (error) => {
  console.error('Server error:', error);
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});