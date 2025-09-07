#!/usr/bin/env node

/**
 * Debug Codex CLI output to understand response format
 */

import { spawn } from 'child_process';

async function testCodexDirectly() {
  console.log('🔍 Testing Codex CLI directly...\n');

  const prompt = `You are a code auditor. Please analyze the following JavaScript function and provide feedback.

CODE TO AUDIT:
\`\`\`javascript
function addNumbers(a, b) {
  return a + b;
}

const result = addNumbers(5, 3);
console.log(result);
\`\`\`

Please provide:
1. Overall assessment (good/needs improvement/poor)
2. Specific issues or improvements
3. Best practices recommendations

Be concise and specific.`;

  console.log('📝 Prompt being sent to Codex:');
  console.log('=' .repeat(50));
  console.log(prompt);
  console.log('=' .repeat(50));

  return new Promise((resolve, reject) => {
    const child = spawn('codex', [
      'exec',
      '--sandbox', 'read-only',
      '--json',
      '--skip-git-repo-check',
      prompt
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      console.log('\n📤 Codex CLI Response:');
      console.log('Exit code:', code);
      console.log('\n📄 STDOUT:');
      console.log('=' .repeat(50));
      console.log(stdout);
      console.log('=' .repeat(50));
      
      if (stderr) {
        console.log('\n⚠️  STDERR:');
        console.log('=' .repeat(50));
        console.log(stderr);
        console.log('=' .repeat(50));
      }

      // Try to parse as JSON
      console.log('\n🔍 JSON Parsing Attempt:');
      try {
        const parsed = JSON.parse(stdout);
        console.log('✅ Successfully parsed as JSON');
        console.log('Structure:', Object.keys(parsed));
        console.log('Full object:', JSON.stringify(parsed, null, 2));
      } catch (error) {
        console.log('❌ Failed to parse as JSON:', error.message);
        console.log('Attempting to find JSON-like content...');
        
        // Look for JSON-like patterns
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('Found potential JSON block:');
          console.log(jsonMatch[0]);
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ Successfully parsed extracted JSON');
            console.log('Structure:', Object.keys(parsed));
          } catch (e) {
            console.log('❌ Extracted content is not valid JSON');
          }
        }
      }

      resolve({ stdout, stderr, code });
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Close stdin
    child.stdin.end();
  });
}

// Run the test
testCodexDirectly().catch(error => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});