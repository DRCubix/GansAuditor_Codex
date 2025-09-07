#!/usr/bin/env node

/**
 * Comprehensive test of the full GansAuditor_Codex integration
 * Tests MCP server with actual Codex CLI integration
 */

import { spawn } from 'child_process';

async function testFullIntegration() {
  console.log('🧪 Testing Full GansAuditor_Codex Integration...\n');

  return new Promise((resolve, reject) => {
    // Start the MCP server
    const server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DISABLE_THOUGHT_LOGGING: 'true' }
    });

    let stdout = '';
    let stderr = '';
    let testStep = 0;

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
      console.log('Server:', data.toString().trim());
    });

    server.on('close', (code) => {
      console.log(`\n🏁 Server closed with code ${code}`);
      resolve({ stdout, stderr, code });
    });

    server.on('error', (error) => {
      console.error('💥 Server error:', error);
      reject(error);
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
        // Tools listed, send code audit request
        console.log('\n🔍 Sending code audit request...');
        sendRequest({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "gansauditor_codex",
            arguments: {
              thought: `I need to audit this JavaScript function for potential issues:

\`\`\`javascript
function processUserInput(input) {
  // Validate input
  if (!input) {
    return null;
  }
  
  // Process the input
  const result = input.toString().toUpperCase();
  
  // Return processed result
  return result;
}

// Usage example
const userInput = "hello world";
const processed = processUserInput(userInput);
console.log(processed);
\`\`\`

This function processes user input but I want to make sure it's secure and follows best practices.`,
              thoughtNumber: 1,
              totalThoughts: 1,
              nextThoughtNeeded: false,
              branchId: "codex-integration-test"
            }
          }
        });
      } else if (response.id === 3) {
        // Audit response received
        console.log('\n✅ Audit completed!');
        
        if (response.result && response.result.content) {
          try {
            const content = JSON.parse(response.result.content[0].text);
            
            console.log('\n📊 Audit Results:');
            if (content.gan) {
              console.log(`   Overall Score: ${content.gan.overall}/100`);
              console.log(`   Verdict: ${content.gan.verdict.toUpperCase()}`);
              console.log(`   Summary: ${content.gan.review.summary}`);
              
              if (content.gan.review.inline && content.gan.review.inline.length > 0) {
                console.log('\n💬 Inline Comments:');
                content.gan.review.inline.forEach(comment => {
                  console.log(`   Line ${comment.line}: ${comment.comment}`);
                });
              }
              
              console.log('\n🎯 Judge Cards:');
              content.gan.judge_cards.forEach(card => {
                console.log(`   ${card.model}: ${card.score}/100 - ${card.notes || 'No notes'}`);
              });
            }
            
            if (content.completionStatus) {
              console.log('\n🔄 Completion Status:');
              console.log(`   Complete: ${content.completionStatus.isComplete}`);
              console.log(`   Reason: ${content.completionStatus.reason}`);
              console.log(`   Progress: ${content.completionStatus.progressPercentage * 100}%`);
            }
            
            // Test successful, close server
            setTimeout(() => {
              server.kill('SIGTERM');
            }, 1000);
            
          } catch (parseError) {
            console.error('❌ Failed to parse audit response:', parseError);
            server.kill('SIGTERM');
          }
        } else {
          console.error('❌ No audit content in response');
          server.kill('SIGTERM');
        }
      }
    }

    function sendRequest(request) {
      console.log(`📤 Sending request ${request.id}:`, JSON.stringify(request, null, 2));
      server.stdin.write(JSON.stringify(request) + '\n');
    }

    // Wait for server to start, then initialize
    setTimeout(() => {
      console.log('🚀 Initializing MCP client...');
      sendRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          clientInfo: { name: "integration-test", version: "1.0.0" }
        }
      });
    }, 2000);

    // Timeout after 2 minutes
    setTimeout(() => {
      console.log('⏰ Test timeout reached');
      server.kill('SIGTERM');
    }, 120000);
  });
}

// Run the test
testFullIntegration().catch(error => {
  console.error('💥 Integration test failed:', error);
  process.exit(1);
});