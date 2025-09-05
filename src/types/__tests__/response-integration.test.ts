/**
 * Integration tests for response formatting with the main server
 * 
 * This test suite validates that the enhanced response formatting
 * integrates correctly with the GansAuditor_Codex server.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildEnhancedResponse,
  formatAsToolResponse,
  createResponseFormatter,
} from '../response-builder.js';
import {
  isToolResponse,
  isEnhancedResponse,
  ResponseUtils,
} from '../response-types.js';
import type {
  StandardResponse,
  EnhancedToolResponse,
  GanReview,
  ToolResponse,
  ThoughtData,
} from '../gan-types.js';

describe('Response Integration Tests', () => {
  let standardResponse: StandardResponse;
  let ganReview: GanReview;
  let thoughtData: ThoughtData;

  beforeEach(() => {
    standardResponse = {
      thoughtNumber: 2,
      totalThoughts: 5,
      nextThoughtNeeded: true,
      branches: ['main', 'feature-1'],
      thoughtHistoryLength: 8
    };

    ganReview = {
      overall: 78,
      dimensions: [
        { name: 'accuracy', score: 85 },
        { name: 'completeness', score: 70 },
        { name: 'clarity', score: 80 },
        { name: 'actionability', score: 75 },
        { name: 'human_likeness', score: 80 }
      ],
      verdict: 'revise',
      review: {
        summary: 'Code has good structure but needs error handling improvements',
        inline: [
          {
            path: 'src/utils/parser.ts',
            line: 45,
            comment: 'Add try-catch block for JSON parsing'
          },
          {
            path: 'src/utils/parser.ts',
            line: 67,
            comment: 'Validate input parameters before processing'
          }
        ],
        citations: [
          'repo://src/utils/parser.ts:40-50',
          'repo://src/utils/parser.ts:65-70'
        ]
      },
      proposed_diff: `--- a/src/utils/parser.ts
+++ b/src/utils/parser.ts
@@ -42,7 +42,11 @@ export function parseConfig(input: string): Config {
   }
   
   try {
-    const parsed = JSON.parse(input);
+    if (!input || typeof input !== 'string') {
+      throw new Error('Invalid input: must be a non-empty string');
+    }
+    
+    const parsed = JSON.parse(input);
     return validateConfig(parsed);
   } catch (error) {
     throw new ConfigParseError(\`Failed to parse config: \${error.message}\`);`,
      iterations: 2,
      judge_cards: [
        {
          model: 'internal',
          score: 78,
          notes: 'Good overall structure, needs error handling'
        }
      ]
    };

    thoughtData = {
      thought: `Looking at this code, I need to improve error handling:

\`\`\`typescript
export function parseConfig(input: string): Config {
  const parsed = JSON.parse(input);
  return validateConfig(parsed);
}
\`\`\`

This function should validate inputs and handle JSON parsing errors properly.`,
      thoughtNumber: 2,
      totalThoughts: 5,
      nextThoughtNeeded: true,
      branchId: 'error-handling-improvements'
    };
  });

  describe('Enhanced Response Building', () => {
    it('should build enhanced response with all components', () => {
      const sessionId = 'test-session-456';
      
      const enhanced = buildEnhancedResponse(
        standardResponse,
        ganReview,
        sessionId
      );

      // Verify structure
      expect(isEnhancedResponse(enhanced)).toBe(true);
      
      // Verify standard fields are preserved
      expect(enhanced.thoughtNumber).toBe(standardResponse.thoughtNumber);
      expect(enhanced.totalThoughts).toBe(standardResponse.totalThoughts);
      expect(enhanced.branches).toEqual(standardResponse.branches);
      expect(enhanced.thoughtHistoryLength).toBe(standardResponse.thoughtHistoryLength);
      
      // Verify enhanced fields are added
      expect(enhanced.sessionId).toBe(sessionId);
      expect(enhanced.gan).toEqual(ganReview);
      
      // Verify nextThoughtNeeded is overridden by GAN verdict
      expect(enhanced.nextThoughtNeeded).toBe(true); // Should be true due to 'revise' verdict
    });

    it('should handle response without GAN results', () => {
      const enhanced = buildEnhancedResponse(standardResponse);

      expect(isEnhancedResponse(enhanced)).toBe(true);
      expect(enhanced.sessionId).toBeUndefined();
      expect(enhanced.gan).toBeUndefined();
      expect(enhanced.nextThoughtNeeded).toBe(standardResponse.nextThoughtNeeded);
    });

    it('should handle response with session ID but no GAN results', () => {
      const sessionId = 'session-without-gan';
      
      const enhanced = buildEnhancedResponse(
        standardResponse,
        undefined,
        sessionId
      );

      expect(enhanced.sessionId).toBe(sessionId);
      expect(enhanced.gan).toBeUndefined();
    });
  });

  describe('Tool Response Formatting', () => {
    it('should format complete response as tool response', () => {
      const sessionId = 'integration-test-session';
      
      const toolResponse = formatAsToolResponse(
        standardResponse,
        ganReview,
        sessionId
      );

      // Verify tool response structure
      expect(isToolResponse(toolResponse)).toBe(true);
      expect(toolResponse.content).toHaveLength(1);
      expect(toolResponse.content[0].type).toBe('text');
      expect(toolResponse.isError).toBeUndefined();

      // Parse and verify content
      const parsedContent = JSON.parse(toolResponse.content[0].text);
      expect(isEnhancedResponse(parsedContent)).toBe(true);
      expect(parsedContent.sessionId).toBe(sessionId);
      expect(parsedContent.gan).toEqual(ganReview);
    });

    it('should format response with custom serialization options', () => {
      const formatter = createResponseFormatter();
      const enhanced = buildEnhancedResponse(
        standardResponse,
        ganReview,
        'test-session'
      );
      
      const jsonText = formatter.formatAsJson(enhanced, { 
        prettyPrint: false, 
        includeNullFields: false 
      });
      
      // Should not contain newlines (not pretty printed)
      expect(jsonText.includes('\n')).toBe(false);
      
      // Should not contain null fields
      expect(jsonText.includes('null')).toBe(false);
    });
  });

  describe('Response Size Management', () => {
    it('should handle large responses appropriately', () => {
      // Create a large GAN review with many inline comments
      const largeGanReview: GanReview = {
        ...ganReview,
        review: {
          ...ganReview.review,
          inline: Array(50).fill(null).map((_, i) => ({
            path: `src/file${i}.ts`,
            line: i * 10,
            comment: `This is a very long comment that explains in detail what needs to be fixed in this particular line of code. Comment number ${i}.`
          })),
          citations: Array(30).fill(null).map((_, i) => `repo://src/file${i}.ts:${i*10}-${i*10+5}`)
        },
        proposed_diff: 'x'.repeat(5000) // Very large diff
      };

      const enhanced = buildEnhancedResponse(
        standardResponse,
        largeGanReview,
        'large-response-session'
      );

      const responseSize = ResponseUtils.getResponseSize(enhanced);
      expect(responseSize).toBeGreaterThan(1000);

      // Test truncation
      const truncated = ResponseUtils.truncateResponse(enhanced, 2000);
      const truncatedSize = ResponseUtils.getResponseSize(truncated);
      
      if (responseSize > 2000) {
        expect(truncatedSize).toBeLessThan(responseSize);
      }
    });
  });

  describe('Error Handling in Response Formatting', () => {
    it('should handle malformed GAN review gracefully', () => {
      const malformedGanReview = {
        ...ganReview,
        overall: 150, // Invalid score
        verdict: 'invalid-verdict' // Invalid verdict
      } as any;

      expect(() => {
        buildEnhancedResponse(
          standardResponse,
          malformedGanReview,
          'test-session'
        );
      }).toThrow();
    });

    it('should format error responses correctly', () => {
      const formatter = createResponseFormatter();
      const error = new Error('Test integration error');
      
      const errorResponse = formatter.formatErrorResponse(error, {
        category: 'integration',
        recoverable: true,
        suggestions: ['Check your configuration', 'Retry the operation']
      });

      expect(isToolResponse(errorResponse)).toBe(true);
      expect(errorResponse.isError).toBe(true);

      const parsedError = JSON.parse(errorResponse.content[0].text);
      expect(parsedError.error).toBe('Test integration error');
      expect(parsedError.status).toBe('failed');
      expect(parsedError.details.category).toBe('integration');
      expect(parsedError.details.suggestions).toHaveLength(2);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing clients', () => {
      // Test that enhanced response contains all standard fields
      const enhanced = buildEnhancedResponse(standardResponse);
      
      // All standard fields should be present
      expect(enhanced.thoughtNumber).toBeDefined();
      expect(enhanced.totalThoughts).toBeDefined();
      expect(enhanced.nextThoughtNeeded).toBeDefined();
      expect(enhanced.branches).toBeDefined();
      expect(enhanced.thoughtHistoryLength).toBeDefined();
      
      // Enhanced fields should be optional
      expect(enhanced.sessionId).toBeUndefined();
      expect(enhanced.gan).toBeUndefined();
    });

    it('should serialize to JSON that can be parsed by existing clients', () => {
      const enhanced = buildEnhancedResponse(
        standardResponse,
        ganReview,
        'compatibility-test'
      );

      const toolResponse = formatAsToolResponse(
        standardResponse,
        ganReview,
        'compatibility-test'
      );

      // Should be valid JSON
      expect(() => {
        JSON.parse(toolResponse.content[0].text);
      }).not.toThrow();

      // Parsed content should have expected structure
      const parsed = JSON.parse(toolResponse.content[0].text);
      expect(typeof parsed.thoughtNumber).toBe('number');
      expect(typeof parsed.nextThoughtNeeded).toBe('boolean');
      expect(Array.isArray(parsed.branches)).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle code review scenario', () => {
      const codeReviewThought: ThoughtData = {
        thought: `I need to review this authentication function:

\`\`\`typescript
function authenticate(username: string, password: string): boolean {
  const user = users.find(u => u.username === username);
  return user && user.password === password;
}
\`\`\`

This has security issues - passwords should be hashed!`,
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branchId: 'security-review'
      };

      const securityGanReview: GanReview = {
        overall: 25,
        dimensions: [
          { name: 'accuracy', score: 80 },
          { name: 'completeness', score: 30 },
          { name: 'clarity', score: 70 },
          { name: 'actionability', score: 20 },
          { name: 'human_likeness', score: 25 }
        ],
        verdict: 'reject',
        review: {
          summary: 'Critical security vulnerability: plaintext password comparison',
          inline: [
            {
              path: 'src/auth.ts',
              line: 3,
              comment: 'CRITICAL: Never compare passwords in plaintext. Use bcrypt or similar.'
            },
            {
              path: 'src/auth.ts',
              line: 2,
              comment: 'Add input validation for username and password parameters'
            }
          ],
          citations: ['repo://src/auth.ts:1-5']
        },
        proposed_diff: `--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,4 +1,8 @@
+import bcrypt from 'bcrypt';
+
 function authenticate(username: string, password: string): boolean {
+  if (!username || !password) return false;
   const user = users.find(u => u.username === username);
-  return user && user.password === password;
+  return user && bcrypt.compareSync(password, user.hashedPassword);
 }`,
        iterations: 1,
        judge_cards: [
          {
            model: 'security-focused',
            score: 25,
            notes: 'Major security flaw detected'
          }
        ]
      };

      const response = buildEnhancedResponse(
        {
          thoughtNumber: codeReviewThought.thoughtNumber,
          totalThoughts: codeReviewThought.totalThoughts,
          nextThoughtNeeded: codeReviewThought.nextThoughtNeeded,
          branches: [codeReviewThought.branchId!],
          thoughtHistoryLength: 1
        },
        securityGanReview,
        codeReviewThought.branchId
      );

      expect(response.gan?.verdict).toBe('reject');
      expect(response.nextThoughtNeeded).toBe(true);
      expect(response.sessionId).toBe('security-review');
      expect(response.gan?.overall).toBe(25);
    });

    it('should handle successful code completion scenario', () => {
      const completionGanReview: GanReview = {
        overall: 92,
        dimensions: [
          { name: 'accuracy', score: 95 },
          { name: 'completeness', score: 90 },
          { name: 'clarity', score: 88 },
          { name: 'actionability', score: 95 },
          { name: 'human_likeness', score: 92 }
        ],
        verdict: 'pass',
        review: {
          summary: 'Excellent implementation with proper error handling and type safety',
          inline: [],
          citations: ['repo://src/parser.ts:1-50']
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [
          {
            model: 'code-quality',
            score: 92,
            notes: 'Well-structured, follows best practices'
          }
        ]
      };

      const response = buildEnhancedResponse(
        {
          thoughtNumber: 3,
          totalThoughts: 3,
          nextThoughtNeeded: false,
          branches: ['implementation'],
          thoughtHistoryLength: 5
        },
        completionGanReview,
        'completion-session'
      );

      expect(response.gan?.verdict).toBe('pass');
      expect(response.nextThoughtNeeded).toBe(false); // Should remain false for 'pass'
      expect(response.gan?.overall).toBe(92);
      expect(response.gan?.review.inline).toHaveLength(0);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle response building efficiently', () => {
      const startTime = performance.now();
      
      // Build many responses
      for (let i = 0; i < 100; i++) {
        buildEnhancedResponse(
          standardResponse,
          ganReview,
          `session-${i}`
        );
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second for 100 responses
    });

    it('should handle JSON serialization efficiently', () => {
      const largeResponse = buildEnhancedResponse(
        standardResponse,
        {
          ...ganReview,
          review: {
            ...ganReview.review,
            inline: Array(1000).fill({
              path: 'test.ts',
              line: 1,
              comment: 'Test comment'
            })
          }
        },
        'performance-test'
      );

      const startTime = performance.now();
      
      const toolResponse = formatAsToolResponse(
        standardResponse,
        largeResponse.gan!,
        'performance-test'
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should serialize quickly
      expect(isToolResponse(toolResponse)).toBe(true);
    });
  });
});