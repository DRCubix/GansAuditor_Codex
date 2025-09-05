/**
 * End-to-end tests for enhanced response formatting
 * 
 * This test suite validates that the enhanced response formatting
 * works correctly in realistic scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  buildEnhancedResponse,
  formatAsToolResponse,
  createResponseFormatter,
} from '../response-builder.js';
import {
  isToolResponse,
  isEnhancedResponse,
} from '../response-types.js';
import type {
  StandardResponse,
  GanReview,
  ThoughtData,
} from '../gan-types.js';

describe('End-to-End Response Formatting', () => {
  describe('Task 8 Requirements Validation', () => {
    it('should extend existing response format to include sessionId and gan fields (Requirement 5.1)', () => {
      const standard: StandardResponse = {
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: ['main'],
        thoughtHistoryLength: 5
      };

      const ganReview: GanReview = {
        overall: 85,
        dimensions: [{ name: 'accuracy', score: 90 }],
        verdict: 'pass',
        review: {
          summary: 'Good code quality',
          inline: [],
          citations: []
        },
        iterations: 1,
        judge_cards: [{ model: 'internal', score: 85 }]
      };

      const sessionId = 'test-session-123';

      const enhanced = buildEnhancedResponse(standard, ganReview, sessionId);

      // Verify all standard fields are preserved
      expect(enhanced.thoughtNumber).toBe(standard.thoughtNumber);
      expect(enhanced.totalThoughts).toBe(standard.totalThoughts);
      expect(enhanced.nextThoughtNeeded).toBe(standard.nextThoughtNeeded);
      expect(enhanced.branches).toEqual(standard.branches);
      expect(enhanced.thoughtHistoryLength).toBe(standard.thoughtHistoryLength);

      // Verify new fields are added
      expect(enhanced.sessionId).toBe(sessionId);
      expect(enhanced.gan).toEqual(ganReview);
    });

    it('should ensure response structure maintains compatibility with existing clients (Requirement 5.2)', () => {
      const standard: StandardResponse = {
        thoughtNumber: 2,
        totalThoughts: 4,
        nextThoughtNeeded: false,
        branches: ['feature-branch'],
        thoughtHistoryLength: 8
      };

      // Test without enhanced fields (backward compatibility)
      const basicEnhanced = buildEnhancedResponse(standard);
      
      expect(isEnhancedResponse(basicEnhanced)).toBe(true);
      expect(basicEnhanced.sessionId).toBeUndefined();
      expect(basicEnhanced.gan).toBeUndefined();

      // Should still have all required standard fields
      expect(basicEnhanced.thoughtNumber).toBeDefined();
      expect(basicEnhanced.totalThoughts).toBeDefined();
      expect(basicEnhanced.nextThoughtNeeded).toBeDefined();
      expect(basicEnhanced.branches).toBeDefined();
      expect(basicEnhanced.thoughtHistoryLength).toBeDefined();
    });

    it('should add proper JSON serialization for all new data types (Requirement 5.3)', () => {
      const standard: StandardResponse = {
        thoughtNumber: 1,
        totalThoughts: 2,
        nextThoughtNeeded: true,
        branches: [],
        thoughtHistoryLength: 1
      };

      const ganReview: GanReview = {
        overall: 75,
        dimensions: [
          { name: 'accuracy', score: 80 },
          { name: 'completeness', score: 70 }
        ],
        verdict: 'revise',
        review: {
          summary: 'Needs improvement',
          inline: [
            { path: 'test.ts', line: 10, comment: 'Add error handling' }
          ],
          citations: ['repo://test.ts:5-15']
        },
        proposed_diff: '--- a/test.ts\n+++ b/test.ts\n@@ -8,0 +8,2 @@\n+  if (!input) throw new Error("Invalid input");\n+',
        iterations: 2,
        judge_cards: [
          { model: 'internal', score: 75, notes: 'Good structure' }
        ]
      };

      const enhanced = buildEnhancedResponse(standard, ganReview, 'json-test-session');
      const formatter = createResponseFormatter();
      
      // Test JSON serialization
      const jsonString = formatter.formatAsJson(enhanced);
      
      // Should be valid JSON
      expect(() => JSON.parse(jsonString)).not.toThrow();
      
      // Parse and verify structure
      const parsed = JSON.parse(jsonString);
      expect(parsed.sessionId).toBe('json-test-session');
      expect(parsed.gan.overall).toBe(75);
      expect(parsed.gan.verdict).toBe('revise');
      expect(parsed.gan.dimensions).toHaveLength(2);
      expect(parsed.gan.review.inline).toHaveLength(1);
      expect(parsed.gan.judge_cards).toHaveLength(1);
    });

    it('should implement response validation to ensure required fields are present (Requirement 5.4)', () => {
      const standard: StandardResponse = {
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: ['main'],
        thoughtHistoryLength: 5
      };

      // Valid response should pass validation
      const validEnhanced = buildEnhancedResponse(standard);
      expect(isEnhancedResponse(validEnhanced)).toBe(true);

      // Invalid response should fail validation
      const invalidResponse = {
        thoughtNumber: 'invalid', // Should be number
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: ['main'],
        thoughtHistoryLength: 5
      };

      expect(isEnhancedResponse(invalidResponse)).toBe(false);
    });

    it('should ensure required fields are present in all responses (Requirement 5.5)', () => {
      const standard: StandardResponse = {
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: ['main'],
        thoughtHistoryLength: 5
      };

      const enhanced = buildEnhancedResponse(standard);
      const toolResponse = formatAsToolResponse(standard);

      // Verify tool response structure
      expect(isToolResponse(toolResponse)).toBe(true);
      expect(toolResponse.content).toHaveLength(1);
      expect(toolResponse.content[0].type).toBe('text');

      // Parse content and verify all required fields
      const parsed = JSON.parse(toolResponse.content[0].text);
      
      // All standard response fields should be present
      expect(parsed.thoughtNumber).toBeDefined();
      expect(parsed.totalThoughts).toBeDefined();
      expect(parsed.nextThoughtNeeded).toBeDefined();
      expect(parsed.branches).toBeDefined();
      expect(parsed.thoughtHistoryLength).toBeDefined();
    });

    it('should maintain extended response format compatibility (Requirement 6.3)', () => {
      const thoughtData: ThoughtData = {
        thought: 'Testing enhanced response format',
        thoughtNumber: 1,
        totalThoughts: 2,
        nextThoughtNeeded: true,
        branchId: 'compatibility-test'
      };

      const standard: StandardResponse = {
        thoughtNumber: thoughtData.thoughtNumber,
        totalThoughts: thoughtData.totalThoughts,
        nextThoughtNeeded: thoughtData.nextThoughtNeeded,
        branches: [thoughtData.branchId!],
        thoughtHistoryLength: 1
      };

      const ganReview: GanReview = {
        overall: 90,
        dimensions: [{ name: 'compatibility', score: 95 }],
        verdict: 'pass',
        review: {
          summary: 'Excellent compatibility',
          inline: [],
          citations: []
        },
        iterations: 1,
        judge_cards: [{ model: 'compatibility-checker', score: 90 }]
      };

      // Build enhanced response with all components
      const enhanced = buildEnhancedResponse(
        standard,
        ganReview,
        thoughtData.branchId
      );

      // Should maintain all existing functionality
      expect(enhanced.thoughtNumber).toBe(thoughtData.thoughtNumber);
      expect(enhanced.totalThoughts).toBe(thoughtData.totalThoughts);
      expect(enhanced.branches).toContain(thoughtData.branchId);

      // Should add new functionality
      expect(enhanced.sessionId).toBe(thoughtData.branchId);
      expect(enhanced.gan).toEqual(ganReview);

      // Should be serializable as tool response
      const toolResponse = formatAsToolResponse(standard, ganReview, thoughtData.branchId);
      expect(isToolResponse(toolResponse)).toBe(true);
    });
  });

  describe('Real-world Integration Scenarios', () => {
    it('should handle complete audit workflow response', () => {
      // Simulate a complete audit workflow
      const auditThought: ThoughtData = {
        thought: `I'm implementing a user authentication system:

\`\`\`typescript
export class AuthService {
  async authenticate(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.hashedPassword);
    return isValid ? user : null;
  }
}
\`\`\`

This looks secure but I want to make sure it follows best practices.`,
        thoughtNumber: 2,
        totalThoughts: 4,
        nextThoughtNeeded: true,
        branchId: 'auth-implementation'
      };

      const auditResult: GanReview = {
        overall: 88,
        dimensions: [
          { name: 'accuracy', score: 90 },
          { name: 'completeness', score: 85 },
          { name: 'clarity', score: 90 },
          { name: 'actionability', score: 85 },
          { name: 'human_likeness', score: 90 }
        ],
        verdict: 'pass',
        review: {
          summary: 'Good authentication implementation with proper password hashing. Consider adding rate limiting and input validation.',
          inline: [
            {
              path: 'src/auth/auth-service.ts',
              line: 3,
              comment: 'Consider adding email format validation before database lookup'
            },
            {
              path: 'src/auth/auth-service.ts',
              line: 7,
              comment: 'Good use of bcrypt for password comparison'
            }
          ],
          citations: [
            'repo://src/auth/auth-service.ts:1-10',
            'repo://src/auth/user-repository.ts:15-25'
          ]
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [
          {
            model: 'security-expert',
            score: 88,
            notes: 'Secure implementation, minor improvements suggested'
          }
        ]
      };

      const standardResponse: StandardResponse = {
        thoughtNumber: auditThought.thoughtNumber,
        totalThoughts: auditThought.totalThoughts,
        nextThoughtNeeded: auditThought.nextThoughtNeeded,
        branches: [auditThought.branchId!],
        thoughtHistoryLength: 3
      };

      // Build complete response
      const completeResponse = buildEnhancedResponse(
        standardResponse,
        auditResult,
        auditThought.branchId
      );

      // Verify complete structure
      expect(completeResponse.sessionId).toBe('auth-implementation');
      expect(completeResponse.gan?.verdict).toBe('pass');
      expect(completeResponse.gan?.overall).toBe(88);
      expect(completeResponse.nextThoughtNeeded).toBe(true); // Original value preserved for 'pass'

      // Format as tool response
      const toolResponse = formatAsToolResponse(
        standardResponse,
        auditResult,
        auditThought.branchId
      );

      expect(isToolResponse(toolResponse)).toBe(true);
      
      const parsed = JSON.parse(toolResponse.content[0].text);
      expect(parsed.sessionId).toBe('auth-implementation');
      expect(parsed.gan.review.inline).toHaveLength(2);
      expect(parsed.gan.review.citations).toHaveLength(2);
    });

    it('should handle error scenarios gracefully', () => {
      const formatter = createResponseFormatter();
      
      // Test various error types
      const jsError = new Error('JavaScript runtime error');
      const stringError = 'Simple string error';
      
      const jsErrorResponse = formatter.formatErrorResponse(jsError);
      const stringErrorResponse = formatter.formatErrorResponse(stringError);
      
      // Both should be valid tool responses
      expect(isToolResponse(jsErrorResponse)).toBe(true);
      expect(isToolResponse(stringErrorResponse)).toBe(true);
      
      // Both should be marked as errors
      expect(jsErrorResponse.isError).toBe(true);
      expect(stringErrorResponse.isError).toBe(true);
      
      // Content should be parseable
      const jsParsed = JSON.parse(jsErrorResponse.content[0].text);
      const stringParsed = JSON.parse(stringErrorResponse.content[0].text);
      
      expect(jsParsed.error).toBe('JavaScript runtime error');
      expect(jsParsed.status).toBe('failed');
      expect(stringParsed.error).toBe('Simple string error');
      expect(stringParsed.status).toBe('failed');
    });
  });
});