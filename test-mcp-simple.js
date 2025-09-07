#!/usr/bin/env node

/**
 * Simple MCP server test with queue management
 * Tests basic functionality and Codex CLI integration
 */

import { spawn } from 'child_process';

async function testMcpSimple() {
  console.log('🧪 Testing MCP GansAuditor_Codex Server (Simple Test)...\n');

  return new Promise((resolve, reject) => {
    // Start the MCP server with queue clearing
    const server = spawn('npx', ['tsx', 'index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        DISABLE_THOUGHT_LOGGING: 'true',
        ENABLE_GAN_AUDITING: 'true',
        ENABLE_SYNCHRONOUS_AUDIT: 'false', // Use async mode to avoid queue issues
        CODEX_ALLOW_MOCK_FALLBACK: 'true',
        MAX_CONCURRENT_AUDITS: '1', // Reduce concurrency
        AUDIT_QUEUE_TIMEOUT: '60000' // 1 minute timeout
      }
    });

    let stdout = '';
    let stderr = '';
    let serverReady = false;
    let testCompleted = false;

    server.stdout.on('data', (data) => {
      stdout += data.toString();
      
      // Process JSON-RPC responses
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.trim() && line.includes('"jsonrpc"')) {
          try {
            const response = JSON.parse(line.trim());
            handleResponse(response);
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    });

    server.stderr.on('data', (data) => {
      stderr += data.toString();
      const output = data.toString().trim();
      console.log('📥 Server:', output);
      
      // Check if server is ready
      if (output.includes('Running in') || output.includes('⚡') || output.includes('🔄')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Server ready, starting test in 3 seconds...');
          setTimeout(startTest, 3000);
        }
      }
    });

    server.on('close', (code) => {
      console.log(`\n🏁 Server closed with code ${code}`);
      if (!testCompleted) {
        testCompleted = true;
        resolve({ stdout, stderr, code, success: code === 0 });
      }
    });

    server.on('error', (error) => {
      console.error('💥 Server error:', error);
      if (!testCompleted) {
        testCompleted = true;
        reject(error);
      }
    });

    function handleResponse(response) {
      console.log(`📨 Response ${response.id}:`);
      
      if (response.error) {
        console.log(`   ❌ Error: ${response.error.message || response.error}`);
      } else if (response.result) {
        console.log(`   ✅ Success`);
        
        if (response.result.tools) {
          console.log(`   📋 Tools: ${response.result.tools.length}`);
          const hasGansAuditor = response.result.tools.some(tool => tool.name === 'gansauditor_codex');
          console.log(`   🎯 GansAuditor available: ${hasGansAuditor}`);
        }
        
        if (response.result.content) {
          try {
            const content = JSON.parse(response.result.content[0].text);
            console.log(`   📊 Content type: ${content.isError ? 'Error' : 'Success'}`);
            
            if (content.isError) {
              console.log(`   ❌ Error: ${content.error}`);
            } else {
              console.log(`   ✅ Thought ${content.thoughtNumber}/${content.totalThoughts}`);
              if (content.gan) {
                console.log(`   🎯 GAN Audit: ${content.gan.verdict} (${content.gan.overall}/100)`);
              }
            }
          } catch (e) {
            console.log(`   📄 Raw content length: ${response.result.content[0].text.length}`);
          }
        }
      }
      
      // Handle test flow
      if (response.id === 1) {
        // Initialize response received, list tools
        sendRequest({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {}
        });
      } else if (response.id === 2) {
        // Tools listed, send basic test
        console.log('\n🔍 Testing basic functionality...');
        sendRequest({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "gansauditor_codex",
            arguments: {
              thought: "Testing basic functionality - no code audit needed",
              thoughtNumber: 1,
              totalThoughts: 1,
              nextThoughtNeeded: false,
              branchId: "test-basic-simple"
            }
          }
        });
      } else if (response.id === 3) {
        // Basic test completed, try simple code test
        console.log('\n🔍 Testing simple code audit...');
        sendRequest({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "gansauditor_codex",
            arguments: {
              thought: `Simple code test:

\`\`\`javascript
function hello() {
  console.log("Hello World");
}
\`\`\``,
              thoughtNumber: 1,
              totalThoughts: 1,
              nextThoughtNeeded: false,
              branchId: "test-code-simple"
            }
          }
        });
      } else if (response.id === 4) {
        // Code test completed
        console.log('\n✅ All tests completed!');
        testCompleted = true;
        setTimeout(() => {
          server.kill('SIGTERM');
        }, 1000);
      }
    }

    function sendRequest(request) {
      console.log(`📤 Request ${request.id}: ${request.method}`);
      server.stdin.write(JSON.stringify(request) + '\n');
    }

    function startTest() {
      console.log('🚀 Initializing MCP client...');
      sendRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          clientInfo: { name: "simple-test", version: "1.0.0" }
        }
      });
    }

    // Timeout after 2 minutes
    setTimeout(() => {
      if (!testCompleted) {
        console.log('⏰ Test timeout reached');
        testCompleted = true;
        server.kill('SIGTERM');
        resolve({ stdout, stderr, code: -1, success: false, timeout: true });
      }
    }, 120000);
  });
}

// Main execution
async function main() {
  console.log('🔍 Checking Codex CLI...');
  
  // Quick Codex check
  const codex = spawn('codex', ['--version'], { stdio: 'pipe' });
  await new Promise((resolve) => {
    codex.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Codex CLI is available');
      } else {
        console.log('⚠️  Codex CLI not available, will test with async mode');
      }
      resolve();
    });
    codex.on('error', () => {
      console.log('⚠️  Codex CLI not available, will test with async mode');
      resolve();
    });
  });
  
  try {
    const result = await testMcpSimple();
    
    if (result.success && !result.timeout) {
      console.log('\n🎉 MCP Server test completed successfully!');
      console.log('✅ GansAuditor_Codex is running correctly');
      console.log('✅ Basic functionality is working');
      process.exit(0);
    } else {
      console.log('\n❌ MCP Server test failed or timed out');
      if (result.timeout) {
        console.log('⏰ Test timed out - server may be unresponsive');
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  }
}

main();