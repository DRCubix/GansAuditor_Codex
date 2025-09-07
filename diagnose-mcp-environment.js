#!/usr/bin/env node

/**
 * MCP Environment Diagnostic Tool
 * Helps identify issues with Codex CLI execution in MCP environment
 */

import { spawn } from 'child_process';
import { CodexJudge } from './dist/src/codex/codex-judge.js';
import fs from 'fs/promises';

async function diagnoseMCPEnvironment() {
  console.log('🔍 MCP Environment Diagnostics\n');
  
  // Check basic environment
  console.log('📋 Environment Information:');
  console.log(`   Node.js version: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Working directory: ${process.cwd()}`);
  console.log(`   USER: ${process.env.USER || 'undefined'}`);
  console.log(`   HOME: ${process.env.HOME || 'undefined'}`);
  console.log(`   PATH length: ${(process.env.PATH || '').length} characters`);
  console.log(`   PATH contains codex: ${(process.env.PATH || '').includes('codex')}`);
  
  // Check if we're in the right directory
  console.log('\n📁 Directory Information:');
  try {
    const files = await fs.readdir('.');
    console.log(`   Files in current directory: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
    console.log(`   package.json exists: ${files.includes('package.json')}`);
    console.log(`   dist directory exists: ${files.includes('dist')}`);
    console.log(`   .env file exists: ${files.includes('.env')}`);
  } catch (error) {
    console.log(`   ❌ Error reading directory: ${error.message}`);
  }
  
  // Check Codex CLI availability
  console.log('\n🔧 Codex CLI Diagnostics:');
  try {
    const whichResult = await new Promise((resolve, reject) => {
      const child = spawn('which', ['codex'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());
      
      child.on('close', (code) => {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
      });
      
      child.on('error', reject);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('which command timed out'));
      }, 5000);
    });
    
    console.log(`   Codex path: ${whichResult.stdout || 'not found'}`);
    console.log(`   Which exit code: ${whichResult.code}`);
    if (whichResult.stderr) {
      console.log(`   Which stderr: ${whichResult.stderr}`);
    }
  } catch (error) {
    console.log(`   ❌ Error finding codex: ${error.message}`);
  }
  
  // Test direct codex command
  console.log('\n⚡ Direct Codex CLI Test:');
  try {
    const directResult = await new Promise((resolve, reject) => {
      const child = spawn('codex', ['--version'], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000
      });
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());
      
      child.on('close', (code) => {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('Direct codex command timed out'));
      }, 10000);
    });
    
    console.log(`   Direct execution successful: ${directResult.code === 0}`);
    console.log(`   Stdout: ${directResult.stdout}`);
    if (directResult.stderr) {
      console.log(`   Stderr: ${directResult.stderr}`);
    }
  } catch (error) {
    console.log(`   ❌ Direct execution error: ${error.message}`);
  }
  
  // Test CodexJudge class
  console.log('\n🎯 CodexJudge Class Test:');
  try {
    const codexJudge = new CodexJudge({
      timeout: 15000, // 15 second timeout for diagnostics
      workingDirectory: process.cwd()
    });
    
    console.log(`   CodexJudge instance created successfully`);
    
    const isAvailable = await codexJudge.isAvailable();
    console.log(`   Available: ${isAvailable}`);
    
    if (isAvailable) {
      const version = await codexJudge.getVersion();
      console.log(`   Version: ${version}`);
    }
  } catch (error) {
    console.log(`   ❌ CodexJudge error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
  
  // Test simple audit execution
  console.log('\n🧪 Simple Audit Test:');
  try {
    const codexJudge = new CodexJudge({
      timeout: 30000, // 30 second timeout
      workingDirectory: process.cwd()
    });
    
    const auditRequest = {
      task: 'Test audit',
      candidate: 'function test() { return "hello"; }',
      contextPack: 'Simple test function',
      rubric: {
        dimensions: [
          { name: 'accuracy', weight: 1, description: 'Test accuracy' }
        ]
      },
      budget: {
        maxCycles: 1,
        candidates: 1,
        threshold: 70
      }
    };
    
    console.log(`   Starting audit test...`);
    const startTime = Date.now();
    
    const result = await codexJudge.executeAudit(auditRequest);
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Audit completed in ${duration}ms`);
    console.log(`   Overall score: ${result.overall}`);
    console.log(`   Verdict: ${result.verdict}`);
    console.log(`   Summary length: ${result.review.summary.length} characters`);
    
  } catch (error) {
    console.log(`   ❌ Audit test error: ${error.message}`);
    if (error.constructor.name === 'CodexTimeoutError') {
      console.log(`   This was a timeout error`);
    } else if (error.constructor.name === 'CodexNotAvailableError') {
      console.log(`   Codex CLI is not available`);
    } else if (error.constructor.name === 'CodexResponseError') {
      console.log(`   Response parsing error`);
      if (error.rawResponse) {
        console.log(`   Raw response: ${error.rawResponse.substring(0, 200)}...`);
      }
    }
  }
  
  console.log('\n🏁 Diagnostics Complete');
  console.log('\nIf you see errors above, they indicate the specific issues preventing');
  console.log('Codex CLI from working in the MCP environment.');
}

// Run diagnostics
diagnoseMCPEnvironment().catch(error => {
  console.error('💥 Diagnostic failed:', error);
  process.exit(1);
});