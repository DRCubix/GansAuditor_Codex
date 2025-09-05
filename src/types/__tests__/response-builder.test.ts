/**
 * Tests for GansAuditor_Codex response builder and formatting functionality
 * 
 * This test suite validates the enhanced response formatting implementation
 * for the GansAuditor_Codex system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ResponseBuilder,
  ResponseFormatter,
  CompatibilityLayer,
  createResponseBuilder,
  createResponseFormatter,
  buildEnhancedResponse,
  formatAsToolResponse,
} from '../response-builder.js';
import {
  isStandardResponse,
  isEnhancedResponse,
  isGanReview,
  isToolResponse,
  ResponseUtils,
} from '../response-types.js';
import type {
  StandardResponse,
  EnhancedToolResponse,
  GanReview,
  ToolResponse,
} from '../gan-types.js';

describe('GansAuditor_Codex ResponseBuilder', () => {
  let builder: ResponseBuilder;
  let standardResponse: StandardResponse;
  let ganReview: GanReview;

  beforeEach(() => {
    builder = new ResponseBuilder();
    
    standardResponse = {
      thoughtNumber: 1,
      totalThoughts: 3,
      nextThoughtNeeded: true,
      branches: ['main', 'feature-branch'],
      thoughtHistoryLength: 5
    };

    ganReview = {
      overall: 85,
      dimensions: [
        { name: 'accuracy', score: 90 },
        { name: 'completeness', score: 80 },
        { name: 'clarity', score: 85 }
      ],
      verdict: 'pass',
      review: {
        summary: 'Code looks good with minor improvements needed',
        inline: [
          { path: 'src/test.ts', line: 10, comment: 'Consider adding error handling' }
        ],
        citations: ['repo://src/test.ts:1-20']
      },
      proposed_diff: null,
      iterations: 1,
      judge_cards: [
        { model: 'internal', score: 85, notes: 'Good overall structure' }
      ]
    };
  });

  describe('setStandardFields', () => {
    it('should set all standard response fields', () => {
      const result = builder
        .setStandardFields(standardResponse)
        .build();

      expect(result.thoughtNumber).toBe(1);
      expect(result.totalThoughts).toBe(3);
      expect(result.nextThoughtNeeded).toBe(true);
      expect(result.branches).toEqual(['main', 'feature-branch']);
      expect(result.thoughtHistoryLength).toBe(5);
    });

    it('should create a copy of branches array', () => {
      const result = builder
        .setStandardFields(standardResponse)
        .build();

      expect(result.branches).not.toBe(standardResponse.branches);
      expect(result.branches).toEqual(standardResponse.branches);
    });
  });

  describe('addGanResults', () => {
    it('should add GAN review to response', () => {
      const result = builder
        .setStandardFields(standardResponse)
        .addGanResults(ganReview)
        .build();

      expect(result.gan).toEqual(ganReview);
    });

    it('should override nextThoughtNeeded when verdict is revise', () => {
      const reviseReview = { ...ganReview, verdict: 'revise' as const };
      
      const result = builder
        .setStandardFields({ ...standardResponse, nextThoughtNeeded: false })
        .addGanResults(reviseReview)
        .build();

      expect(result.nextThoughtNeeded).toBe(true);
    });

    it('should override nextThoughtNeeded when verdict is reject', () => {
      const rejectReview = { ...ganReview, verdict: 'reject' as const };
      
      const result = builder
        .setStandardFields({ ...standardResponse, nextThoughtNeeded: false })
        .addGanResults(rejectReview)
        .build();

      expect(result.nextThoughtNeeded).toBe(true);
    });

    it('should not override nextThoughtNeeded when verdict is pass', () => {
      const passReview = { ...ganReview, verdict: 'pass' as const };
      
      const result = builder
        .setStandardFields({ ...standardResponse, nextThoughtNeeded: false })
        .addGanResults(passReview)
        .build();

      expect(result.nextThoughtNeeded).toBe(false);
    });

    it('should throw error for invalid GAN review', () => {
      const invalidReview = { ...ganReview, overall: 150 }; // Invalid score

      expect(() => {
        builder
          .setStandardFields(standardResponse)
          .addGanResults(invalidReview as GanReview);
      }).toThrow('Invalid GAN review');
    });
  });

  describe('setSessionId', () => {
    it('should set session ID', () => {
      const sessionId = 'test-session-123';
      
      const result = builder
        .setStandardFields(standardResponse)
        .setSessionId(sessionId)
        .build();

      expect(result.sessionId).toBe(sessionId);
    });

    it('should throw error for empty session ID', () => {
      expect(() => {
        builder.setSessionId('');
      }).toThrow('Session ID must be a non-empty string');
    });

    it('should throw error for non-string session ID', () => {
      expect(() => {
        builder.setSessionId(123 as any);
      }).toThrow('Session ID must be a non-empty string');
    });
  });

  describe('validate', () => {
    it('should validate complete response successfully', () => {
      builder.setStandardFields(standardResponse);
      
      const validation = builder.validate();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      // Don't set any fields
      const validation = builder.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing required field: thoughtNumber');
      expect(validation.errors).toContain('Missing required field: totalThoughts');
    });

    it('should validate field types', () => {
      (builder as any).response = {
        thoughtNumber: 'invalid',
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: [],
        thoughtHistoryLength: 5
      };
      
      const validation = builder.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('thoughtNumber must be a number');
    });

    it('should warn when GAN results exist without session ID', () => {
      builder
        .setStandardFields(standardResponse)
        .addGanResults(ganReview);
      
      const validation = builder.validate();
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('sessionId should be provided when GAN results are included');
    });
  });

  describe('build', () => {
    it('should throw error when validation fails', () => {
      // Don't set required fields
      expect(() => {
        builder.build();
      }).toThrow('Invalid response structure');
    });

    it('should build complete enhanced response', () => {
      const sessionId = 'test-session-123';
      
      const result = builder
        .setStandardFields(standardResponse)
        .addGanResults(ganReview)
        .setSessionId(sessionId)
        .build();

      expect(isEnhancedResponse(result)).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.gan).toEqual(ganReview);
    });
  });

  describe('buildAndSerialize', () => {
    it('should build and serialize response to JSON', () => {
      const result = builder
        .setStandardFields(standardResponse)
        .buildAndSerialize();

      const parsed = JSON.parse(result);
      expect(isEnhancedResponse(parsed)).toBe(true);
    });

    it('should respect serialization options', () => {
      const result = builder
        .setStandardFields(standardResponse)
        .buildAndSerialize({ prettyPrint: false });

      expect(result).not.toContain('\n'); // No pretty printing
    });
  });
});

describe('GansAuditor_Codex ResponseFormatter', () => {
  let formatter: ResponseFormatter;
  let enhancedResponse: EnhancedToolResponse;

  beforeEach(() => {
    formatter = new ResponseFormatter();
    
    enhancedResponse = {
      thoughtNumber: 1,
      totalThoughts: 3,
      nextThoughtNeeded: true,
      branches: ['main'],
      thoughtHistoryLength: 5,
      sessionId: 'test-session-123',
      gan: {
        overall: 85,
        dimensions: [{ name: 'accuracy', score: 90 }],
        verdict: 'pass',
        review: {
          summary: 'Good code',
          inline: [],
          citations: []
        },
        iterations: 1,
        judge_cards: [{ model: 'internal', score: 85 }]
      }
    };
  });

  describe('formatAsJson', () => {
    it('should format response as JSON string', () => {
      const result = formatter.formatAsJson(enhancedResponse);
      
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(enhancedResponse);
    });

    it('should remove null fields when requested', () => {
      const responseWithNulls = {
        ...enhancedResponse,
        gan: {
          ...enhancedResponse.gan!,
          proposed_diff: null
        }
      };
      
      const result = formatter.formatAsJson(responseWithNulls, {
        includeNullFields: false
      });
      
      const parsed = JSON.parse(result);
      expect(parsed.gan.proposed_diff).toBeUndefined();
    });

    it('should include metadata when requested', () => {
      const result = formatter.formatAsJson(enhancedResponse, {
        includeMetadata: true
      });
      
      const parsed = JSON.parse(result);
      expect(parsed._metadata).toBeDefined();
      expect(parsed._metadata.version).toBeDefined();
    });

    it('should exclude specified fields', () => {
      const result = formatter.formatAsJson(enhancedResponse, {
        excludeFields: ['sessionId']
      });
      
      const parsed = JSON.parse(result);
      expect(parsed.sessionId).toBeUndefined();
    });
  });

  describe('formatAsToolResponse', () => {
    it('should format as tool response structure', () => {
      const result = formatter.formatAsToolResponse(enhancedResponse);
      
      expect(isToolResponse(result)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(enhancedResponse);
    });
  });

  describe('formatErrorResponse', () => {
    it('should format error as tool response', () => {
      const error = new Error('Test error');
      const result = formatter.formatErrorResponse(error);
      
      expect(isToolResponse(result)).toBe(true);
      expect(result.isError).toBe(true);
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Test error');
      expect(parsed.status).toBe('failed');
    });

    it('should handle string errors', () => {
      const result = formatter.formatErrorResponse('String error');
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('String error');
    });

    it('should include error details when provided', () => {
      const details = { category: 'config', recoverable: true };
      const result = formatter.formatErrorResponse('Test error', details);
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.details).toEqual(details);
    });
  });
});

describe('GansAuditor_Codex CompatibilityLayer', () => {
  let compatibility: CompatibilityLayer;
  let enhancedResponse: EnhancedToolResponse;

  beforeEach(() => {
    compatibility = new CompatibilityLayer();
    
    enhancedResponse = {
      thoughtNumber: 1,
      totalThoughts: 3,
      nextThoughtNeeded: true,
      branches: ['main'],
      thoughtHistoryLength: 5,
      sessionId: 'test-session-123'
    };
  });

  describe('supportsEnhancedFeatures', () => {
    it('should return true for all clients by default', () => {
      expect(compatibility.supportsEnhancedFeatures()).toBe(true);
      expect(compatibility.supportsEnhancedFeatures('1.0.0')).toBe(true);
    });
  });

  describe('transformForClient', () => {
    it('should return enhanced response for supported clients', () => {
      const result = compatibility.transformForClient(enhancedResponse, '1.0.0');
      expect(result).toEqual(enhancedResponse);
    });
  });

  describe('getFallbackResponse', () => {
    it('should return standard response without enhanced fields', () => {
      const result = compatibility.getFallbackResponse(enhancedResponse);
      
      expect(isStandardResponse(result)).toBe(true);
      expect(result.sessionId).toBeUndefined();
      expect(result.gan).toBeUndefined();
    });
  });
});

describe('Utility Functions', () => {
  describe('buildEnhancedResponse', () => {
    it('should build enhanced response from components', () => {
      const standard: StandardResponse = {
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: ['main'],
        thoughtHistoryLength: 5
      };
      
      const result = buildEnhancedResponse(standard);
      
      expect(isEnhancedResponse(result)).toBe(true);
      expect(result.thoughtNumber).toBe(1);
    });

    it('should include session ID when provided', () => {
      const standard: StandardResponse = {
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: ['main'],
        thoughtHistoryLength: 5
      };
      
      const result = buildEnhancedResponse(standard, undefined, 'test-session');
      
      expect(result.sessionId).toBe('test-session');
    });
  });

  describe('formatAsToolResponse', () => {
    it('should format complete response as tool response', () => {
      const standard: StandardResponse = {
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: ['main'],
        thoughtHistoryLength: 5
      };
      
      const result = formatAsToolResponse(standard);
      
      expect(isToolResponse(result)).toBe(true);
    });
  });
});

describe('Type Guards', () => {
  describe('isStandardResponse', () => {
    it('should validate standard response structure', () => {
      const valid = {
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: ['main'],
        thoughtHistoryLength: 5
      };
      
      expect(isStandardResponse(valid)).toBe(true);
    });

    it('should reject invalid structure', () => {
      const invalid = {
        thoughtNumber: 'invalid',
        totalThoughts: 3
      };
      
      expect(isStandardResponse(invalid)).toBe(false);
    });
  });

  describe('isEnhancedResponse', () => {
    it('should validate enhanced response structure', () => {
      const valid = {
        thoughtNumber: 1,
        totalThoughts: 3,
        nextThoughtNeeded: true,
        branches: ['main'],
        thoughtHistoryLength: 5,
        sessionId: 'test'
      };
      
      expect(isEnhancedResponse(valid)).toBe(true);
    });
  });

  describe('isGanReview', () => {
    it('should validate GAN review structure', () => {
      const valid = {
        overall: 85,
        dimensions: [{ name: 'accuracy', score: 90 }],
        verdict: 'pass',
        review: {
          summary: 'Good',
          inline: [],
          citations: []
        },
        iterations: 1,
        judge_cards: [{ model: 'internal', score: 85 }]
      };
      
      expect(isGanReview(valid)).toBe(true);
    });

    it('should reject invalid verdict', () => {
      const invalid = {
        overall: 85,
        dimensions: [],
        verdict: 'invalid',
        review: { summary: '', inline: [], citations: [] },
        iterations: 1,
        judge_cards: []
      };
      
      expect(isGanReview(invalid)).toBe(false);
    });
  });
});

describe('ResponseUtils', () => {
  describe('clone', () => {
    it('should create deep clone of object', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = ResponseUtils.clone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });
  });

  describe('removeNullFields', () => {
    it('should remove null and undefined fields', () => {
      const input = {
        a: 1,
        b: null,
        c: undefined,
        d: { e: null, f: 2 }
      };
      
      const result = ResponseUtils.removeNullFields(input);
      
      expect(result.a).toBe(1);
      expect(result.b).toBeUndefined();
      expect(result.c).toBeUndefined();
      expect(result.d.e).toBeUndefined();
      expect(result.d.f).toBe(2);
    });
  });

  describe('getResponseSize', () => {
    it('should calculate response size in bytes', () => {
      const response = { test: 'data' };
      const size = ResponseUtils.getResponseSize(response);
      
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });
  });

  describe('truncateResponse', () => {
    it('should return original response if under size limit', () => {
      const response = { small: 'data' };
      const result = ResponseUtils.truncateResponse(response, 1000);
      
      expect(result).toEqual(response);
    });

    it('should truncate large responses', () => {
      const largeResponse = {
        gan: {
          review: {
            inline: Array(100).fill({ path: 'test.ts', line: 1, comment: 'Long comment' })
          },
          proposed_diff: 'x'.repeat(2000)
        }
      };
      
      const result = ResponseUtils.truncateResponse(largeResponse, 500);
      
      expect(result.gan.review.inline.length).toBeLessThan(100);
      expect(result.gan.proposed_diff.length).toBeLessThan(2000);
    });
  });
});

describe('Factory Functions', () => {
  it('should create response builder', () => {
    const builder = createResponseBuilder();
    expect(builder).toBeInstanceOf(ResponseBuilder);
  });

  it('should create response formatter', () => {
    const formatter = createResponseFormatter();
    expect(formatter).toBeInstanceOf(ResponseFormatter);
  });
});