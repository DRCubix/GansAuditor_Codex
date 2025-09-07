#!/usr/bin/env node

/**
 * Test Codex CLI integration directly
 */

import { CodexJudge } from './dist/src/codex/codex-judge.js';
import { DEFAULT_AUDIT_RUBRIC } from './dist/src/types/gan-types.js';

async function testCodexIntegration() {
  console.log('🧪 Testing Codex CLI Integration...\n');

  const codexJudge = new CodexJudge({
    timeout: 60000, // 60 seconds
    retries: 1
  });

  // Test 1: Check if Codex is available
  console.log('1. Checking Codex availability...');
  try {
    const isAvailable = await codexJudge.isAvailable();
    console.log(`   ✅ Codex available: ${isAvailable}`);
    
    if (!isAvailable) {
      console.log('   ❌ Codex CLI not available. Please install Codex CLI first.');
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ❌ Error checking Codex: ${error.message}`);
    process.exit(1);
  }

  // Test 2: Get Codex version
  console.log('\n2. Getting Codex version...');
  try {
    const version = await codexJudge.getVersion();
    console.log(`   ✅ Codex version: ${version || 'Unknown'}`);
  } catch (error) {
    console.log(`   ⚠️  Could not get version: ${error.message}`);
  }

  // Test 3: Execute simple audit
  console.log('\n3. Testing simple audit execution...');
  try {
    const auditRequest = {
      task: 'Review this simple JavaScript function for best practices',
      candidate: `
function addNumbers(a, b) {
  return a + b;
}

// Usage example
const result = addNumbers(5, 3);
console.log(result);
      `.trim(),
      contextPack: 'This is a simple utility function for adding two numbers.',
      rubric: DEFAULT_AUDIT_RUBRIC,
      budget: {
        maxCycles: 1,
        candidates: 1,
        threshold: 70
      }
    };

    console.log('   📝 Sending audit request to Codex...');
    const startTime = Date.now();
    
    const result = await codexJudge.executeAudit(auditRequest);
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Audit completed in ${duration}ms`);
    console.log(`   📊 Overall score: ${result.overall}`);
    console.log(`   🏆 Verdict: ${result.verdict}`);
    console.log(`   📝 Summary: ${result.review.summary.substring(0, 100)}...`);
    console.log(`   🔍 Dimensions: ${result.dimensions.length} evaluated`);
    console.log(`   👥 Judge cards: ${result.judge_cards.length} judges`);
    
    // Show dimensional scores
    console.log('\n   📈 Dimensional Scores:');
    result.dimensions.forEach(dim => {
      console.log(`      ${dim.name}: ${dim.score}`);
    });

    // Show inline comments if any
    if (result.review.inline.length > 0) {
      console.log('\n   💬 Inline Comments:');
      result.review.inline.forEach(comment => {
        console.log(`      Line ${comment.line}: ${comment.comment}`);
      });
    }

  } catch (error) {
    console.log(`   ❌ Audit execution failed: ${error.message}`);
    console.log(`   🔍 Error type: ${error.constructor.name}`);
    
    if (error.rawResponse) {
      console.log(`   📄 Raw response: ${error.rawResponse.substring(0, 200)}...`);
    }
    
    // Don't exit here, continue with other tests
  }

  // Test 4: Test with system prompt (if available)
  console.log('\n4. Testing system prompt integration...');
  try {
    const systemPrompt = `
You are a code auditor focused on JavaScript best practices.
Analyze the code for:
1. Function naming conventions
2. Parameter validation
3. Error handling
4. Documentation quality
5. Performance considerations

Provide specific, actionable feedback.
    `.trim();

    const auditRequest = {
      task: 'Review this function with enhanced system prompt',
      candidate: `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}
      `.trim(),
      contextPack: 'E-commerce utility function for calculating order totals.',
      rubric: DEFAULT_AUDIT_RUBRIC,
      budget: {
        maxCycles: 1,
        candidates: 1,
        threshold: 70
      }
    };

    console.log('   📝 Sending audit with system prompt...');
    const startTime = Date.now();
    
    const result = await codexJudge.executeAuditWithSystemPrompt(
      auditRequest, 
      systemPrompt,
      {
        variables: { focus: 'best_practices' },
        metadata: { test: true }
      }
    );
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ System prompt audit completed in ${duration}ms`);
    console.log(`   📊 Overall score: ${result.overall}`);
    console.log(`   🏆 Verdict: ${result.verdict}`);
    
  } catch (error) {
    console.log(`   ❌ System prompt audit failed: ${error.message}`);
    console.log(`   🔍 Error type: ${error.constructor.name}`);
  }

  console.log('\n🎉 Codex integration test completed!');
}

// Run the test
testCodexIntegration().catch(error => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});