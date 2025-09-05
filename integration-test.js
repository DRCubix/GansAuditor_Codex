#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== GansAuditor MCP Integration Test ===\n');

// Test scenarios
const testScenarios = [
  {
    name: "Basic Thought Processing",
    thought: "I need to analyze this problem step by step.",
    thoughtNumber: 1,
    totalThoughts: 2,
    nextThoughtNeeded: true
  },
  {
    name: "Code Review with Security Issues",
    thought: `Let me review this authentication code:

\`\`\`javascript
function login(username, password) {
  // Bad: SQL injection vulnerability
  const query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'";
  const result = db.query(query);
  
  if (result.length > 0) {
    // Bad: storing password in session
    session.user = { username, password };
    return true;
  }
  return false;
}
\`\`\`

This code has multiple security vulnerabilities that need immediate attention.`,
    thoughtNumber: 1,
    totalThoughts: 3,
    nextThoughtNeeded: true,
    branchId: "security-review"
  },
  {
    name: "Custom Audit Configuration",
    thought: `Now let me test custom audit settings:

\`\`\`gan-config
{
  "task": "Performance optimization review",
  "scope": "algorithm",
  "threshold": 75,
  "judges": ["internal"],
  "maxCycles": 2
}
\`\`\`

\`\`\`python
def fibonacci(n):
    # Inefficient recursive implementation
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def process_large_list(items):
    # Inefficient nested loops
    result = []
    for i in range(len(items)):
        for j in range(len(items)):
            if items[i] > items[j]:
                result.append((items[i], items[j]))
    return result
\`\`\`

This code has performance issues that could be optimized.`,
    thoughtNumber: 2,
    totalThoughts: 3,
    nextThoughtNeeded: true,
    branchId: "security-review"
  }
];

async function runTest(scenario, serverProcess) {
  return new Promise((resolve) => {
    console.log(`\n--- ${scenario.name} ---`);
    
    const request = {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000),
      method: "tools/call",
      params: {
        name: "gansauditor_codex",
        arguments: scenario
      }
    };

    let responseReceived = false;
    
    const responseHandler = (data) => {
      if (responseReceived) return;
      
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        try {
          const response = JSON.parse(line);
          if (response.id === request.id) {
            responseReceived = true;
            console.log('✅ Response received:');
            
            // Parse the JSON content from the response
            const content = response.result?.content?.[0]?.text;
            if (content) {
              try {
                const parsedContent = JSON.parse(content);
                console.log(`   Thought: ${parsedContent.thoughtNumber}/${parsedContent.totalThoughts}`);
                console.log(`   Next needed: ${parsedContent.nextThoughtNeeded}`);
                console.log(`   History length: ${parsedContent.thoughtHistoryLength}`);
                if (parsedContent.sessionId) {
                  console.log(`   Session ID: ${parsedContent.sessionId}`);
                }
                if (parsedContent.gan) {
                  console.log(`   🔍 GAN Audit: ${parsedContent.gan.verdict} (${parsedContent.gan.overall}/100)`);
                }
              } catch (e) {
                console.log(`   Raw content: ${content.substring(0, 100)}...`);
              }
            }
            
            serverProcess.stdout.removeListener('data', responseHandler);
            setTimeout(resolve, 500); // Give time for async audit messages
          }
        } catch (e) {
          // Ignore non-JSON lines
        }
      });
    };

    serverProcess.stdout.on('data', responseHandler);
    
    console.log('📤 Sending request...');
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    
    // Timeout after 3 seconds
    setTimeout(() => {
      if (!responseReceived) {
        console.log('⚠️  Timeout - no response received');
        serverProcess.stdout.removeListener('data', responseHandler);
        resolve();
      }
    }, 3000);
  });
}

async function main() {
  // Start server with auditing enabled
  const serverProcess = spawn('node', [join(__dirname, 'dist/index.js')], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      ENABLE_GAN_AUDITING: 'true',
      DISABLE_THOUGHT_LOGGING: 'false'
    }
  });

  // Initialize the server
  const initRequest = {
    jsonrpc: "2.0",
    id: 0,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "integration-test", version: "1.0.0" }
    }
  };

  serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 500));

  // Run test scenarios
  for (const scenario of testScenarios) {
    await runTest(scenario, serverProcess);
  }

  console.log('\n=== Integration Test Complete ===');
  serverProcess.kill();
}

main().catch(console.error);