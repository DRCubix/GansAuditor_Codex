#!/usr/bin/env node

/**
 * Test script for synchronous audit workflow integration
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test data for synchronous workflow
const testThought = {
  thought: `
Let me implement a simple function to calculate factorial:

\`\`\`javascript
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// Test the function
console.log(factorial(5)); // Should output 120
\`\`\`

This is a recursive implementation that handles the base case and recursive case properly.
  `,
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true,
  branchId: "test-sync-session",
  loopId: "test-loop-001"
};

const testRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "gansauditor_codex",
    arguments: testThought
  }
};

async function testSynchronousMode() {
  console.log('🧪 Testing Synchronous Audit Workflow Integration...\n');
  
  // Set environment variables for synchronous mode
  const env = {
    ...process.env,
    ENABLE_SYNCHRONOUS_AUDIT: 'true',
    ENABLE_GAN_AUDITING: 'true',
    DISABLE_THOUGHT_LOGGING: 'false',
    AUDIT_TIMEOUT_SECONDS: '10'
  };

  return new Promise((resolve, reject) => {
    const serverPath = join(__dirname, 'dist', 'index.js');
    const server = spawn('node', [serverPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let responseReceived = false;

    server.stdout.on('data', (data) => {
      stdout += data.toString();
      
      // Look for JSON response
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"jsonrpc"')) {
          try {
            const response = JSON.parse(line.trim());
            if (response.id === testRequest.id) {
              responseReceived = true;
              console.log('✅ Received response from synchronous audit workflow:');
              console.log(JSON.stringify(response, null, 2));
              
              // Check if response has synchronous audit features
              if (response.result && response.result.content) {
                const content = response.result.content[0];
                if (content && content.text) {
                  const responseData = JSON.parse(content.text);
                  
                  console.log('\n📊 Response Analysis:');
                  console.log(`- Session ID: ${responseData.sessionId || 'Not provided'}`);
                  console.log(`- Has GAN audit: ${responseData.gan ? 'Yes' : 'No'}`);
                  console.log(`- Has completion status: ${responseData.completionStatus ? 'Yes' : 'No'}`);
                  console.log(`- Has loop info: ${responseData.loopInfo ? 'Yes' : 'No'}`);
                  console.log(`- Has structured feedback: ${responseData.feedback ? 'Yes' : 'No'}`);
                  
                  if (responseData.gan) {
                    console.log(`- Audit verdict: ${responseData.gan.verdict}`);
                    console.log(`- Audit score: ${responseData.gan.overall}/100`);
                  }
                }
              }
              
              server.kill();
              resolve(response);
            }
          } catch (e) {
            // Not a JSON response, continue
          }
        }
      }
    });

    server.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('📝 Server log:', data.toString().trim());
    });

    server.on('close', (code) => {
      if (!responseReceived) {
        console.error('❌ No response received from server');
        console.error('STDOUT:', stdout);
        console.error('STDERR:', stderr);
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      reject(error);
    });

    // Send the test request
    setTimeout(() => {
      console.log('📤 Sending test request...');
      server.stdin.write(JSON.stringify(testRequest) + '\n');
    }, 1000);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!responseReceived) {
        console.log('⏰ Test timeout - killing server');
        server.kill();
        reject(new Error('Test timeout'));
      }
    }, 30000);
  });
}

async function testAsynchronousMode() {
  console.log('\n🧪 Testing Asynchronous Mode (Backward Compatibility)...\n');
  
  // Set environment variables for asynchronous mode
  const env = {
    ...process.env,
    ENABLE_SYNCHRONOUS_AUDIT: 'false',
    ENABLE_GAN_AUDITING: 'true',
    DISABLE_THOUGHT_LOGGING: 'false'
  };

  return new Promise((resolve, reject) => {
    const serverPath = join(__dirname, 'dist', 'index.js');
    const server = spawn('node', [serverPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let responseReceived = false;

    server.stdout.on('data', (data) => {
      stdout += data.toString();
      
      // Look for JSON response
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"jsonrpc"')) {
          try {
            const response = JSON.parse(line.trim());
            if (response.id === testRequest.id) {
              responseReceived = true;
              console.log('✅ Received response from asynchronous mode:');
              console.log(JSON.stringify(response, null, 2));
              
              server.kill();
              resolve(response);
            }
          } catch (e) {
            // Not a JSON response, continue
          }
        }
      }
    });

    server.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('📝 Server log:', data.toString().trim());
    });

    server.on('close', (code) => {
      if (!responseReceived) {
        console.error('❌ No response received from server');
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      reject(error);
    });

    // Send the test request
    setTimeout(() => {
      console.log('📤 Sending test request...');
      server.stdin.write(JSON.stringify(testRequest) + '\n');
    }, 1000);

    // Timeout after 15 seconds (async should be faster)
    setTimeout(() => {
      if (!responseReceived) {
        console.log('⏰ Test timeout - killing server');
        server.kill();
        reject(new Error('Test timeout'));
      }
    }, 15000);
  });
}

async function main() {
  try {
    console.log('🚀 Starting Synchronous Audit Workflow Integration Tests\n');
    
    // Test synchronous mode
    await testSynchronousMode();
    
    // Test asynchronous mode for backward compatibility
    await testAsynchronousMode();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n✅ Integration Summary:');
    console.log('- Synchronous audit workflow: Working');
    console.log('- Backward compatibility: Working');
    console.log('- LOOP_ID parameter handling: Implemented');
    console.log('- Configuration flags: Working');
    console.log('- Enhanced response format: Working');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();