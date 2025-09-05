/**
 * Integration tests for Enhanced Response Builder
 * 
 * Tests the integration of the enhanced response builder with other components
 * of the synchronous audit workflow system.
 */

import { describe, it, expect } from 'vitest';
import {
  EnhancedResponseBuilder,
  createEnhancedResponseBuilder,
} from '../enhanced-response-builder.js';

import { CompletionEvaluator } from '../../auditor/completion-evaluator.js';
import { LoopDetector } from '../../auditor/loop-detector.js';

import type {
  GansAuditorCodexStandardResponse,
  GansAuditorCodexReview,
  GansAuditorCodexSessionState,
} from '../gan-types.js';

import {
  IssueCategory,
  Priority,
  ProgressTrend,
} from '../synchronous-response-types.js';

// ============================================================================
// Integration Test Data
// ============================================================================

const mockStandardResponse: GansAuditorCodexStandardResponse = {
  thoughtNumber: 8,
  totalThoughts: 15,
  nextThoughtNeeded: true,
  branches: ['main', 'feature-branch'],
  thoughtHistoryLength: 8,
};

const mockHighQualityAudit: GansAuditorCodexReview = {
  overall: 92,
  dimensions: [
    { name: 'accuracy', score: 95 },
    { name: 'completeness', score: 90 },
    { name: 'clarity', score: 88 },
    { name: 'actionability', score: 94 },
    { name: 'human_likeness', score: 91 },
  ],
  verdict: 'pass',
  review: {
    summary: 'Excellent implementation with minor style improvements needed',
    inline: [
      {
        path: 'src/main.ts',
        line: 15,
        comment: 'Consider using const instead of let for immutable variables',
      },
    ],
    citations: ['repo://src/main.ts:15-20'],
  },
  iterations: 8,
  judge_cards: [
    { model: 'internal', score: 92 },
  ],
};

const mockProgressiveSessionState: GansAuditorCodexSessionState = {
  id: 'progressive-session-456',
  loopId: 'loop-789',
  config: {
    task: 'Implement user authentication system',
    scope: 'diff',
    threshold: 90,
    maxCycles: 3,
    candidates: 1,
    judges: ['internal'],
    applyFixes: false,
  },
  history: [
    {
      timestamp: Date.now() - 180000, // 3 minutes ago
      thoughtNumber: 6,
      review: { ...mockHighQualityAudit, overall: 75, verdict: 'revise' },
      config: {
        task: 'Implement user authentication system',
        scope: 'diff',
        threshold: 90,
        maxCycles: 3,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      },
    },
    {
      timestamp: Date.now() - 120000, // 2 minutes ago
      thoughtNumber: 7,
      review: { ...mockHighQualityAudit, overall: 85, verdict: 'revise' },
      config: {
        task: 'Implement user authentication system',
        scope: 'diff',
        threshold: 90,
        maxCycles: 3,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      },
    },
  ],
  iterations: [
    {
      thoughtNumber: 6,
      code: 'function authenticate(user) { /* basic implementation */ }',
      auditResult: { ...mockHighQualityAudit, overall: 75, verdict: 'revise' },
      timestamp: Date.now() - 180000,
    },
    {
      thoughtNumber: 7,
      code: 'function authenticate(user: User): AuthResult { /* improved implementation */ }',
      auditResult: { ...mockHighQualityAudit, overall: 85, verdict: 'revise' },
      timestamp: Date.now() - 120000,
    },
  ],
  currentLoop: 8,
  isComplete: false,
  codexContextActive: true,
  lastGan: mockHighQualityAudit,
  createdAt: Date.now() - 300000, // 5 minutes ago
  updatedAt: Date.now(),
};

// ============================================================================
// Integration Tests
// ============================================================================

describe('Enhanced Response Builder Integration', () => {
  describe('Integration with Completion Evaluator', () => {
    it('should integrate completion evaluation into enhanced response', () => {
      const builder = createEnhancedResponseBuilder();
      const completionEvaluator = new CompletionEvaluator();
      
      // Evaluate completion for high-quality audit
      const completionResult = completionEvaluator.evaluateCompletion(
        mockHighQualityAudit.overall,
        mockProgressiveSessionState.currentLoop
      );
      
      // Build enhanced response
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockHighQualityAudit,
        completionResult,
        mockProgressiveSessionState
      );
      
      // Verify completion status integration
      expect(response.completionStatus).toBeDefined();
      expect(response.completionStatus!.isComplete).toBe(false); // Not at 10 loops yet
      expect(response.completionStatus!.score).toBe(92);
      expect(response.completionStatus!.currentLoop).toBe(8);
      expect(response.completionStatus!.progressPercentage).toBeGreaterThan(0.9);
      
      // Verify feedback reflects high quality
      expect(response.feedback?.summary).toContain('92% score');
      expect(response.feedback?.summary).toContain('pass');
      expect(response.feedback?.progressAssessment.trend).toBe(ProgressTrend.IMPROVING);
    });

    it('should handle completion at tier thresholds', () => {
      const builder = createEnhancedResponseBuilder();
      const completionEvaluator = new CompletionEvaluator();
      
      // Simulate reaching tier 1 completion (95% at 10 loops)
      const tier1SessionState = {
        ...mockProgressiveSessionState,
        currentLoop: 10,
      };
      
      const tier1Audit = {
        ...mockHighQualityAudit,
        overall: 95,
      };
      
      const completionResult = completionEvaluator.evaluateCompletion(
        tier1Audit.overall,
        tier1SessionState.currentLoop
      );
      
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        tier1Audit,
        completionResult,
        tier1SessionState
      );
      
      expect(response.completionStatus!.isComplete).toBe(true);
      expect(response.completionStatus!.reason).toBe('score_95_at_10');
      expect(response.completionStatus!.progressPercentage).toBe(1.0);
      // Note: nextThoughtNeeded comes from the standard response, not the enhanced builder
      // The completion evaluator would set this in a real workflow
    });
  });

  describe('Integration with Loop Detector', () => {
    it('should integrate stagnation detection into enhanced response', () => {
      const builder = createEnhancedResponseBuilder();
      const loopDetector = new LoopDetector();
      
      // Create stagnant iterations (similar code)
      const stagnantIterations = [
        {
          thoughtNumber: 6,
          code: 'function test() { return "hello"; }',
          auditResult: { ...mockHighQualityAudit, overall: 70 },
          timestamp: Date.now() - 180000,
        },
        {
          thoughtNumber: 7,
          code: 'function test() { return "hello world"; }', // Minor change
          auditResult: { ...mockHighQualityAudit, overall: 71 },
          timestamp: Date.now() - 120000,
        },
        {
          thoughtNumber: 8,
          code: 'function test() { return "hello"; }', // Reverted
          auditResult: { ...mockHighQualityAudit, overall: 70 },
          timestamp: Date.now() - 60000,
        },
      ];
      
      const stagnantSessionState = {
        ...mockProgressiveSessionState,
        currentLoop: 12, // Past stagnation check threshold
        iterations: stagnantIterations,
      };
      
      // Detect stagnation
      const stagnationAnalysis = loopDetector.detectStagnation(
        stagnantIterations,
        stagnantSessionState.currentLoop
      );
      
      // Build enhanced response with stagnation analysis
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockHighQualityAudit,
        undefined,
        stagnantSessionState,
        stagnationAnalysis
      );
      
      // Verify stagnation is reflected in response
      expect(response.loopInfo?.stagnationDetected).toBe(stagnationAnalysis.isStagnant);
      expect(response.feedback?.progressAssessment.trend).toBe(
        stagnationAnalysis.isStagnant ? ProgressTrend.STAGNANT : ProgressTrend.IMPROVING
      );
      
      if (stagnationAnalysis.isStagnant) {
        expect(response.feedback?.nextSteps[0].action).toContain('stagnation');
        expect(response.feedback?.nextSteps[0].priority).toBe(Priority.CRITICAL);
      }
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should create comprehensive enhanced response for complete workflow', () => {
      const builder = createEnhancedResponseBuilder({
        includeDetailedFeedback: true,
        includeLoopInfo: true,
        includeSessionMetadata: true,
        maxImprovements: 10,
        maxCriticalIssues: 5,
        maxNextSteps: 8,
      });
      
      const completionEvaluator = new CompletionEvaluator();
      const loopDetector = new LoopDetector();
      
      // Evaluate completion
      const completionResult = completionEvaluator.evaluateCompletion(
        mockHighQualityAudit.overall,
        mockProgressiveSessionState.currentLoop
      );
      
      // Detect stagnation
      const stagnationAnalysis = loopDetector.detectStagnation(
        mockProgressiveSessionState.iterations,
        mockProgressiveSessionState.currentLoop
      );
      
      // Check for termination
      const terminationResult = completionEvaluator.shouldTerminate(
        mockProgressiveSessionState
      );
      
      // Build comprehensive enhanced response
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockHighQualityAudit,
        completionResult,
        mockProgressiveSessionState,
        stagnationAnalysis,
        terminationResult
      );
      
      // Verify all components are present
      expect(response.sessionId).toBe('progressive-session-456');
      expect(response.gan).toEqual(mockHighQualityAudit);
      expect(response.feedback).toBeDefined();
      expect(response.completionStatus).toBeDefined();
      expect(response.loopInfo).toBeDefined();
      expect(response.sessionMetadata).toBeDefined();
      
      // Verify structured feedback quality
      expect(response.feedback!.summary).toContain('92% score');
      expect(response.feedback!.improvements.length).toBeGreaterThan(0);
      expect(response.feedback!.nextSteps.length).toBeGreaterThan(0);
      expect(response.feedback!.progressAssessment).toBeDefined();
      
      // Verify loop information
      expect(response.loopInfo!.currentLoop).toBe(8);
      expect(response.loopInfo!.progressTrend).toBe(ProgressTrend.IMPROVING);
      expect(response.loopInfo!.scoreProgression).toEqual([75, 85]);
      expect(response.loopInfo!.averageImprovement).toBe(10); // 85 - 75
      
      // Verify session metadata
      expect(response.sessionMetadata!.sessionId).toBe('progressive-session-456');
      expect(response.sessionMetadata!.loopId).toBe('loop-789');
      expect(response.sessionMetadata!.totalSessionTime).toBeGreaterThan(0);
      
      // Verify completion status
      expect(response.completionStatus!.score).toBe(92);
      expect(response.completionStatus!.currentLoop).toBe(8);
      expect(response.completionStatus!.threshold).toBe(95); // Should be tier 1 threshold
    });

    it('should handle minimal configuration for lightweight responses', () => {
      const builder = createEnhancedResponseBuilder({
        includeDetailedFeedback: true,
        includeLoopInfo: false,
        includeSessionMetadata: false,
        maxImprovements: 3,
        maxCriticalIssues: 2,
        maxNextSteps: 3,
      });
      
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockHighQualityAudit
      );
      
      // Verify minimal response structure
      expect(response.feedback).toBeDefined();
      expect(response.loopInfo).toBeUndefined();
      expect(response.sessionMetadata).toBeUndefined();
      expect(response.completionStatus).toBeUndefined();
      
      // Verify limits are respected
      expect(response.feedback!.improvements.length).toBeLessThanOrEqual(3);
      expect(response.feedback!.criticalIssues.length).toBeLessThanOrEqual(2);
      expect(response.feedback!.nextSteps.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Response Quality and Consistency', () => {
    it('should maintain consistent response structure across different scenarios', () => {
      const builder = createEnhancedResponseBuilder();
      
      // Test with different audit qualities
      const scenarios = [
        { audit: { ...mockHighQualityAudit, overall: 95, verdict: 'pass' as const }, expectedTrend: ProgressTrend.IMPROVING },
        { audit: { ...mockHighQualityAudit, overall: 50, verdict: 'reject' as const }, expectedTrend: ProgressTrend.IMPROVING },
        { audit: { ...mockHighQualityAudit, overall: 75, verdict: 'revise' as const }, expectedTrend: ProgressTrend.IMPROVING },
      ];
      
      for (const scenario of scenarios) {
        const response = builder.buildSynchronousResponse(
          mockStandardResponse,
          scenario.audit,
          undefined,
          mockProgressiveSessionState
        );
        
        // Verify consistent structure
        expect(response.thoughtNumber).toBe(mockStandardResponse.thoughtNumber);
        expect(response.totalThoughts).toBe(mockStandardResponse.totalThoughts);
        expect(response.branches).toEqual(mockStandardResponse.branches);
        expect(response.gan).toEqual(scenario.audit);
        expect(response.feedback).toBeDefined();
        expect(response.feedback!.summary).toContain(`${scenario.audit.overall}% score`);
        expect(response.feedback!.progressAssessment.trend).toBe(scenario.expectedTrend);
      }
    });

    it('should provide actionable feedback regardless of audit quality', () => {
      const builder = createEnhancedResponseBuilder();
      
      // Test with poor quality audit
      const poorAudit: GansAuditorCodexReview = {
        overall: 25,
        dimensions: [
          { name: 'accuracy', score: 20 },
          { name: 'completeness', score: 30 },
          { name: 'clarity', score: 25 },
        ],
        verdict: 'reject',
        review: {
          summary: 'Significant issues found requiring major revision',
          inline: [
            {
              path: 'src/auth.ts',
              line: 10,
              comment: 'Critical security vulnerability: SQL injection risk',
            },
            {
              path: 'src/auth.ts',
              line: 25,
              comment: 'Logic error: incorrect password validation',
            },
          ],
          citations: ['repo://src/auth.ts:10-30'],
        },
        iterations: 5,
        judge_cards: [
          { model: 'internal', score: 25 },
        ],
      };
      
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        poorAudit,
        undefined,
        mockProgressiveSessionState
      );
      
      // Verify actionable feedback is provided
      expect(response.feedback!.improvements.length).toBeGreaterThan(0);
      expect(response.feedback!.criticalIssues.length).toBeGreaterThan(0);
      expect(response.feedback!.nextSteps.length).toBeGreaterThan(0);
      
      // Verify critical issues are prioritized
      const securityIssue = response.feedback!.criticalIssues.find(
        issue => issue.description.toLowerCase().includes('security')
      );
      expect(securityIssue).toBeDefined();
      
      // Verify next steps are actionable
      const firstStep = response.feedback!.nextSteps[0];
      expect(firstStep.action).toBeDefined();
      expect(firstStep.rationale).toBeDefined();
      expect(firstStep.expectedOutcome).toBeDefined();
    });
  });
});