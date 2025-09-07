#!/usr/bin/env node

/**
 * MCP Codex Integration Debug Test
 * Tests Codex CLI execution specifically in MCP environment with detailed logging
 */

import { spawn } from 'child_process';

async function testMCPCodexIntegration() {
  console.log('🧪 Testing Codex CLI in MCP Environment with Debug Logging\n');
  
  // Start MCP server with debug logging enabled
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      NODE_ENV: 'development',
      CODEX_DEBUG: 'true',
      DISABLE_THOUGHT_LOGGING: 'false'
    }
  });
  
  let serverOutput = '';
  let serverError = '';
  
  // Monitor server stdout
  server.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log('📤 Server stdout:', output.trim());
  });
  
  // Monitor server stderr for debug messages
  server.stderr.on('data', (data) => {
    const output = data.toString();
    serverError += output;
    
    // Highlight Codex debug messages
    if (output.includes('[CODEX-DEBUG]') || output.includes('[CODEX-CONFIG]')) {
      console.log('🔍 Codex Debug:', output.trim());
    } else if (output.includes('GAN Audit:')) {
      console.log('🎯 Audit Status:', output.trim());
    } else {
      console.log('📋 Server:', output.trim());
    }
  });
  
  server.on('error', (error) => {
    console.error('💥 Server error:', error);
  });
  
  server.on('close', (code) => {
    console.log(`\n🏁 Server closed with code: ${code}`);
    console.log(`📊 Total server output: ${serverOutput.length} chars`);
    console.log(`📊 Total server errors: ${serverError.length} chars`);
  });
  
  // Wait for server to start, then send test requests
  setTimeout(() => {
    console.log('\n🚀 Sending initialization request...');
    
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        clientInfo: { name: "debug-test", version: "1.0.0" }
      }
    };
    
    server.stdin.write(JSON.stringify(initRequest) + '\n');
  }, 3000);
  
  // Send code audit request
  setTimeout(() => {
    console.log('\n🔍 Sending code audit request...');
    
    const auditRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "gansauditor_codex",
        arguments: {
          thought: `Testing Codex CLI integration with debug logging:

\`\`\`javascript
function debugTest(input) {
  if (!input) {
    throw new Error("Input required");
  }
  
  return input.toString().toUpperCase();
}

// Test usage
const result = debugTest("hello world");
console.log(result);
\`\`\`

This is a simple test function to verify the Codex CLI integration is working properly in the MCP environment.`,
          thoughtNumber: 1,
          totalThoughts: 1,
          nextThoughtNeeded: false,
          branchId: "debug-test-session"
        }
      }
    };
    
    server.stdin.write(JSON.stringify(auditRequest) + '\n');
  }, 5000);
  
  // Cleanup after 2 minutes
  setTimeout(() => {
    console.log('\n⏰ Test timeout reached, terminating server...');
    server.kill('SIGTERM');
    
    // Force kill after 5 seconds if needed
    setTimeout(() => {
      if (!server.killed) {
        console.log('🔨 Force killing server...');
        server.kill('SIGKILL');
      }
    }, 5000);
  }, 120000);
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, terminating server...');
    server.kill('SIGTERM');
    process.exit(0);
  });
}

// Run the test
testMCPCodexIntegration().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});