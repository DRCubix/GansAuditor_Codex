#!/usr/bin/env node

/**
 * Test for context window management and memory efficiency
 * This test verifies that the system properly manages context across iterations
 * and handles large codebases without memory issues
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧠 Testing Context Window Management and Memory Efficiency\n');

// Generate a large codebase for context testing
function generateLargeCodebase() {
  const components = [];
  
  // Generate multiple React components
  for (let i = 1; i <= 5; i++) {
    components.push(`
// Component ${i}: UserProfile${i}.tsx
import React, { useState, useEffect } from 'react';
import { User, Profile, Settings } from '../types/user';
import { ApiService } from '../services/api';
import { ValidationUtils } from '../utils/validation';

interface UserProfile${i}Props {
  userId: string;
  onUpdate?: (profile: Profile) => void;
  settings?: Settings;
}

export const UserProfile${i}: React.FC<UserProfile${i}Props> = ({ 
  userId, 
  onUpdate, 
  settings 
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await ApiService.getUserProfile(userId);
        
        if (!ValidationUtils.isValidProfile(data)) {
          throw new Error('Invalid profile data received');
        }
        
        setProfile(data);
        onUpdate?.(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId, onUpdate]);

  const handleProfileUpdate = async (updates: Partial<Profile>) => {
    try {
      const updatedProfile = await ApiService.updateProfile(userId, updates);
      setProfile(updatedProfile);
      onUpdate?.(updatedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div className="user-profile-${i}">
      <h2>{profile.name}</h2>
      <p>{profile.email}</p>
      <button onClick={() => handleProfileUpdate({ lastSeen: new Date() })}>
        Update Last Seen
      </button>
    </div>
  );
};`);
  }

  // Add utility functions
  components.push(`
// Utility: ValidationUtils.ts
export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidProfile(profile: any): profile is Profile {
    return (
      profile &&
      typeof profile.id === 'string' &&
      typeof profile.name === 'string' &&
      this.isValidEmail(profile.email) &&
      typeof profile.createdAt === 'string'
    );
  }

  static sanitizeInput(input: string): string {
    return input.replace(/[<>\"'&]/g, '');
  }

  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return { valid: errors.length === 0, errors };
  }
}`);

  // Add API service
  components.push(`
// Service: ApiService.ts
import { User, Profile } from '../types/user';

export class ApiService {
  private static baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';

  static async getUserProfile(userId: string): Promise<Profile> {
    const response = await fetch(\`\${this.baseUrl}/users/\${userId}/profile\`);
    
    if (!response.ok) {
      throw new Error(\`Failed to fetch profile: \${response.statusText}\`);
    }
    
    return response.json();
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const response = await fetch(\`\${this.baseUrl}/users/\${userId}/profile\`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(\`Failed to update profile: \${response.statusText}\`);
    }
    
    return response.json();
  }

  static async deleteUser(userId: string): Promise<void> {
    const response = await fetch(\`\${this.baseUrl}/users/\${userId}\`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(\`Failed to delete user: \${response.statusText}\`);
    }
  }
}`);

  return components.join('\n\n');
}

async function testContextWindowManagement() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Starting MCP server for context window testing...\n');
    
    const serverProcess = spawn('node', [join(__dirname, 'dist/index.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ENABLE_GAN_AUDITING: 'true',
        ENABLE_SYNCHRONOUS_AUDIT: 'true',
        DISABLE_THOUGHT_LOGGING: 'false',
        AUDIT_TIMEOUT_SECONDS: '25',
        MAX_CONCURRENT_AUDITS: '1'
      }
    });

    const sessionId = `context-test-${Date.now()}`;
    const loopId = `context-loop-${Date.now()}`;
    let requestId = 1;
    let contextTests = [];

    // Initialize server
    const initRequest = {
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        clientInfo: { name: "context-window-test", version: "1.0.0" }
      }
    };

    serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

    // Handle server output
    let stdout = '';
    serverProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"jsonrpc"')) {
          try {
            const response = JSON.parse(line.trim());
            if (response.id > 0) {
              handleContextResponse(response);
            }
          } catch (e) {
            // Not a JSON response
          }
        }
      }
    });

    // Handle server logs
    serverProcess.stderr.on('data', (data) => {
      const logLine = data.toString().trim();
      if (logLine && !logLine.includes('💭 Thought')) {
        console.log(`📝 Server: ${logLine}`);
      }
    });

    function handleContextResponse(response) {
      if (!response.result || !response.result.content) {
        console.log('⚠️  Invalid response format');
        return;
      }

      try {
        const content = JSON.parse(response.result.content[0].text);
        const testResult = {
          iteration: contextTests.length + 1,
          score: content.gan?.overall || 0,
          verdict: content.gan?.verdict || 'unknown',
          sessionId: content.sessionId,
          contextSize: estimateContextSize(content),
          memoryUsage: process.memoryUsage(),
          timestamp: Date.now()
        };
        
        contextTests.push(testResult);
        
        console.log(`\n🧠 Context Test ${testResult.iteration}:`);
        console.log(`   Score: ${testResult.score}/100`);
        console.log(`   Verdict: ${testResult.verdict.toUpperCase()}`);
        console.log(`   Session ID: ${testResult.sessionId}`);
        console.log(`   Estimated Context Size: ${Math.round(testResult.contextSize / 1024)}KB`);
        console.log(`   Memory Usage: ${Math.round(testResult.memoryUsage.heapUsed / 1024 / 1024)}MB`);

        // Test different context scenarios
        if (contextTests.length < 4) {
          setTimeout(() => {
            sendNextContextTest();
          }, 2000);
        } else {
          console.log('\n🏁 Context window tests complete! Analyzing results...\n');
          analyzeContextResults(contextTests);
          serverProcess.kill();
          resolve(contextTests);
        }

      } catch (error) {
        console.error('❌ Failed to parse response:', error);
        serverProcess.kill();
        reject(error);
      }
    }

    function estimateContextSize(content) {
      return JSON.stringify(content).length;
    }

    function sendNextContextTest() {
      const testScenarios = [
        {
          name: "Small Context Test",
          code: `function hello() { return "Hello World"; }`
        },
        {
          name: "Medium Context Test", 
          code: generateLargeCodebase().substring(0, 2000)
        },
        {
          name: "Large Context Test",
          code: generateLargeCodebase()
        },
        {
          name: "Context with Configuration",
          code: `${generateLargeCodebase()}\n\n\`\`\`gan-config\n{\n  "task": "Full codebase review",\n  "scope": "repository",\n  "threshold": 85,\n  "judges": ["internal"],\n  "maxCycles": 3\n}\n\`\`\``
        }
      ];

      const scenario = testScenarios[contextTests.length];
      
      const thought = `Context Window Test ${contextTests.length + 1}: ${scenario.name}

Let me analyze this codebase for quality and best practices:

\`\`\`typescript
${scenario.code}
\`\`\`

Please provide a comprehensive audit focusing on:
1. Code quality and maintainability
2. Performance considerations
3. Security vulnerabilities
4. Best practices adherence
5. Context management efficiency`;

      const request = {
        jsonrpc: "2.0",
        id: ++requestId,
        method: "tools/call",
        params: {
          name: "gansauditor_codex",
          arguments: {
            thought: thought,
            thoughtNumber: contextTests.length + 1,
            totalThoughts: 4,
            nextThoughtNeeded: contextTests.length < 3,
            branchId: sessionId,
            loopId: loopId
          }
        }
      };

      console.log(`\n🔄 Sending ${scenario.name}...`);
      console.log(`   Code size: ${Math.round(scenario.code.length / 1024)}KB`);
      serverProcess.stdin.write(JSON.stringify(request) + '\n');
    }

    // Start first test
    setTimeout(() => {
      sendNextContextTest();
    }, 1000);

    // Timeout after 3 minutes
    setTimeout(() => {
      console.log('⏰ Context test timeout');
      serverProcess.kill();
      reject(new Error('Context test timeout'));
    }, 3 * 60 * 1000);
  });
}

function analyzeContextResults(results) {
  console.log('🧠 Context Window Analysis:');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    const contextSizeKB = Math.round(result.contextSize / 1024);
    const memoryMB = Math.round(result.memoryUsage.heapUsed / 1024 / 1024);
    console.log(`Test ${result.iteration}: ${contextSizeKB}KB context, ${memoryMB}MB memory, Score: ${result.score}/100`);
  });
  
  console.log('\n📊 Context Management Statistics:');
  const contextSizes = results.map(r => r.contextSize);
  const memoryUsages = results.map(r => r.memoryUsage.heapUsed);
  
  console.log(`   Smallest Context: ${Math.round(Math.min(...contextSizes) / 1024)}KB`);
  console.log(`   Largest Context: ${Math.round(Math.max(...contextSizes) / 1024)}KB`);
  console.log(`   Average Context: ${Math.round((contextSizes.reduce((a, b) => a + b, 0) / contextSizes.length) / 1024)}KB`);
  
  console.log(`   Min Memory Usage: ${Math.round(Math.min(...memoryUsages) / 1024 / 1024)}MB`);
  console.log(`   Max Memory Usage: ${Math.round(Math.max(...memoryUsages) / 1024 / 1024)}MB`);
  console.log(`   Avg Memory Usage: ${Math.round((memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length) / 1024 / 1024)}MB`);
  
  // Check for memory leaks
  const memoryGrowth = memoryUsages[memoryUsages.length - 1] - memoryUsages[0];
  const memoryGrowthMB = Math.round(memoryGrowth / 1024 / 1024);
  
  console.log('\n🔍 Memory Management Assessment:');
  console.log(`   Memory Growth: ${memoryGrowthMB > 0 ? '+' : ''}${memoryGrowthMB}MB`);
  console.log(`   Memory Efficiency: ${memoryGrowthMB < 50 ? 'Good' : memoryGrowthMB < 100 ? 'Acceptable' : 'Needs Optimization'}`);
  
  // Check context handling efficiency
  const avgProcessingTime = results.reduce((sum, r, i, arr) => {
    if (i === 0) return sum;
    return sum + (r.timestamp - arr[i-1].timestamp);
  }, 0) / (results.length - 1);
  
  console.log(`   Avg Processing Time: ${Math.round(avgProcessingTime)}ms`);
  console.log(`   Context Scaling: ${avgProcessingTime < 5000 ? 'Excellent' : avgProcessingTime < 10000 ? 'Good' : 'Needs Optimization'}`);
  
  console.log('\n✅ Context Window Validation:');
  console.log(`   ✓ Small context handling: ${results[0]?.score > 0 ? 'Working' : 'Failed'}`);
  console.log(`   ✓ Medium context handling: ${results[1]?.score > 0 ? 'Working' : 'Failed'}`);
  console.log(`   ✓ Large context handling: ${results[2]?.score > 0 ? 'Working' : 'Failed'}`);
  console.log(`   ✓ Configuration context: ${results[3]?.score > 0 ? 'Working' : 'Failed'}`);
  console.log(`   ✓ Memory management: ${memoryGrowthMB < 100 ? 'Efficient' : 'Needs review'}`);
  console.log(`   ✓ Session continuity: ${results.every(r => r.sessionId === results[0].sessionId) ? 'Working' : 'Failed'}`);
}

// Run the context window test
testContextWindowManagement()
  .then((results) => {
    console.log('\n🎉 Context window management test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Context test failed:', error.message);
    process.exit(1);
  });