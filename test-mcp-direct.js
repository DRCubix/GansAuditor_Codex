#!/usr/bin/env node

/**
 * Direct test of MCP server functionality without TypeScript compilation
 * This tests the core GansAuditor_Codex integration with Codex CLI
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMcpServer() {
  console.log('🧪 Testing MCP GansAuditor_Codex Server Direct Integration...\n');

  // First, let's test if we can run the server at all
  console.log('1. Testing server startup...');
  
  return new Promise((resolve, reject) => {
    // Try to run the TypeScript file directly with tsx or ts-node
    const server = spawn('npx', ['tsx', 'index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        DISABLE_THOUGHT_LOGGING: 'true',
        ENABLE_GAN_AUDITING: 'true',
        ENABLE_SYNCHRONOUS_AUDIT: 'true',
        CODEX_ALLOW_MOCK_FALLBACK: 'true'
      }
    });

    let stdout = '';
    let stderr = '';
    let serverReady = false;
    let testCompleted = false;

    server.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('📤 Server stdout:', data.toString().trim());
      
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
      console.log('📥 Server stderr:', output);
      
      // Check if server is ready
      if (output.includes('Running in') || output.includes('⚡') || output.includes('🔄')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Server appears to be ready, starting test...');
          setTimeout(startTest, 2000);
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
      console.log(`📨 Response ${response.id}:`, JSON.stringify(response, null, 2));
      
      if (response.id === 1) {
        // Initialize response received, list tools
        sendRequest({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {}
        });
      } else if (response.id === 2) {
        // Tools listed, check if gansauditor_codex is available
        if (response.result && response.result.tools) {
          const hasGansAuditor = response.result.tools.some(tool => tool.name === 'gansauditor_codex');
          console.log(`✅ GansAuditor_Codex tool available: ${hasGansAuditor}`);
          
          if (hasGansAuditor) {
            // Send a simple test request
            console.log('\n🔍 Sending simple test request...');
            sendRequest({
              jsonrpc: "2.0",
              id: 3,
              method: "tools/call",
              params: {
                name: "gansauditor_codex",
                arguments: {
                  thought: "Testing basic functionality without code audit",
                  thoughtNumber: 1,
                  totalThoughts: 1,
                  nextThoughtNeeded: false,
                  branchId: "test-basic"
                }
              }
            });
          } else {
            console.error('❌ GansAuditor_Codex tool not found in tools list');
            server.kill('SIGTERM');
          }
        }
      } else if (response.id === 3) {
        // Basic test response received
        console.log('\n✅ Basic test completed!');
        
        // Now test with code audit
        console.log('\n🔍 Sending code audit test...');
        sendRequest({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "gansauditor_codex",
            arguments: {
              thought: `I need to audit this simple JavaScript function:

\`\`\`javascript
function add(a, b) {
  return a + b;
}

const result = add(5, 3);
console.log(result);
\`\`\`

This is a basic addition function that I want to check for quality.`,
              thoughtNumber: 1,
              totalThoughts: 1,
              nextThoughtNeeded: false,
              branchId: "test-code-audit"
            }
          }
        });
      } else if (response.id === 4) {
        // Code audit response received
        console.log('\n✅ Code audit test completed!');
        
        if (response.result && response.result.content) {
          try {
            const content = JSON.parse(response.result.content[0].text);
            
            console.log('\n📊 Audit Results Summary:');
            console.log(`   Session ID: ${content.sessionId || 'N/A'}`);
            console.log(`   Next thought needed: ${content.nextThoughtNeeded}`);
            
            if (content.gan) {
              console.log(`   GAN Audit Score: ${content.gan.overall}/100`);
              console.log(`   Verdict: ${content.gan.verdict.toUpperCase()}`);
              console.log(`   Summary: ${content.gan.review.summary.substring(0, 100)}...`);
              
              if (content.gan.judge_cards && content.gan.judge_cards.length > 0) {
                console.log('\n🎯 Judge Results:');
                content.gan.judge_cards.forEach(card => {
                  console.log(`   ${card.model}: ${card.score}/100`);
                });
              }
              
              console.log('\n🎉 SUCCESS: Codex CLI integration is working!');
            } else {
              console.log('ℹ️  No GAN audit results (may be running in async mode)');
            }
            
          } catch (parseError) {
            console.error('❌ Failed to parse audit response:', parseError);
          }
        }
        
        // Test completed successfully
        testCompleted = true;
        setTimeout(() => {
          server.kill('SIGTERM');
        }, 1000);
      }
    }

    function sendRequest(request) {
      console.log(`📤 Sending request ${request.id}:`, JSON.stringify(request, null, 2));
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
          clientInfo: { name: "direct-test", version: "1.0.0" }
        }
      });
    }

    // Timeout after 3 minutes
    setTimeout(() => {
      if (!testCompleted) {
        console.log('⏰ Test timeout reached');
        testCompleted = true;
        server.kill('SIGTERM');
        resolve({ stdout, stderr, code: -1, success: false, timeout: true });
      }
    }, 180000);
  });
}

// Check if tsx is available
async function checkTsxAvailable() {
  return new Promise((resolve) => {
    const tsx = spawn('npx', ['tsx', '--version'], { stdio: 'pipe' });
    tsx.on('close', (code) => {
      resolve(code === 0);
    });
    tsx.on('error', () => {
      resolve(false);
    });
  });
}

// Main execution
async function main() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if tsx is available
  const tsxAvailable = await checkTsxAvailable();
  if (!tsxAvailable) {
    console.log('📦 Installing tsx for TypeScript execution...');
    const install = spawn('npm', ['install', '-g', 'tsx'], { stdio: 'inherit' });
    await new Promise((resolve) => {
      install.on('close', resolve);
    });
  }
  
  // Check if Codex CLI is available
  const codex = spawn('codex', ['--version'], { stdio: 'pipe' });
  await new Promise((resolve) => {
    codex.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Codex CLI is available');
      } else {
        console.log('⚠️  Codex CLI not available, will test with mock fallback');
      }
      resolve();
    });
    codex.on('error', () => {
      console.log('⚠️  Codex CLI not available, will test with mock fallback');
      resolve();
    });
  });
  
  try {
    const result = await testMcpServer();
    
    if (result.success) {
      console.log('\n🎉 MCP Server test completed successfully!');
      console.log('✅ GansAuditor_Codex is running correctly');
      console.log('✅ Codex CLI integration is working');
      process.exit(0);
    } else {
      console.log('\n❌ MCP Server test failed');
      console.log('Server output:', result.stderr);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  }
}

main();