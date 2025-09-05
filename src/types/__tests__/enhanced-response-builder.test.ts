/**
 * Unit tests for Enhanced Response Builder
 * 
 * Tests the enhanced response builder functionality for synchronous audit workflow,
 * including structured feedback generation, critical issue categorization, and
 * completion status tracking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EnhancedResponseBuilder,
  createEnhancedResponseBuilder,
  createMinimalEnhancedResponseBuilder,
  createComprehensiveEnhancedResponseBuilder,
} from '../enhanced-response-builder.js';

import type {
  GansAuditorCodexStandardResponse,
  GansAuditorCodexReview,
  GansAuditorCodexSessionState,
} from '../gan-types.js';

import type {
  CompletionResult,
  TerminationResult,
} from '../../auditor/completion-evaluator.js';

import type {
  DetailedStagnationAnalysis,
} from '../../auditor/loop-detector.js';

import {
  IssueCategory,
  Priority,
  Severity,
  CriticalIssueType,
  ProgressTrend,
  FeedbackDetailLevel,
} from '../synchronous-response-types.js';

// ============================================================================
// Test Data Setup
// ============================================================================

const mockStandardResponse: GansAuditorCodexStandardResponse = {
  thoughtNumber: 5,
  totalThoughts: 10,
  nextThoughtNeeded: true,
  branches: ['main'],
  thoughtHistoryLength: 5,
};

const mockAuditResult: GansAuditorCodexReview = {
  overall: 75,
  dimensions: [
    { name: 'accuracy', score: 80 },
    { name: 'completeness', score: 70 },
    { name: 'clarity', score: 75 },
  ],
  verdict: 'revise',
  review: {
    summary: 'Code needs improvement in several areas',
    inline: [
      {
        path: 'src/test.ts',
        line: 10,
        comment: 'Security vulnerability: SQL injection risk detected',
      },
      {
        path: 'src/test.ts',
        line: 25,
        comment: 'Performance issue: inefficient loop implementation',
      },
      {
        path: 'src/utils.ts',
        line: 5,
        comment: 'Style issue: inconsistent naming convention',
      },
    ],
    citations: ['repo://src/test.ts:10-15'],
  },
  iterations: 3,
  judge_cards: [
    { model: 'internal', score: 75 },
  ],
};

const mockCompletionResult: CompletionResult = {
  isComplete: false,
  reason: 'in_progress',
  nextThoughtNeeded: true,
  message: 'Continue improving to reach threshold',
};

const mockSessionState: GansAuditorCodexSessionState = {
  id: 'test-session-123',
  loopId: 'loop-456',
  config: {
    task: 'Test audit task',
    scope: 'diff',
    threshold: 85,
    maxCycles: 5,
    candidates: 1,
    judges: ['internal'],
    applyFixes: false,
  },
  history: [
    {
      timestamp: Date.now() - 60000,
      thoughtNumber: 3,
      review: { ...mockAuditResult, overall: 65 },
      config: {
        task: 'Test audit task',
        scope: 'diff',
        threshold: 85,
        maxCycles: 5,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      },
    },
    {
      timestamp: Date.now() - 30000,
      thoughtNumber: 4,
      review: { ...mockAuditResult, overall: 70 },
      config: {
        task: 'Test audit task',
        scope: 'diff',
        threshold: 85,
        maxCycles: 5,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      },
    },
  ],
  iterations: [
    {
      thoughtNumber: 3,
      code: 'const x = 1;',
      auditResult: { ...mockAuditResult, overall: 65 },
      timestamp: Date.now() - 60000,
    },
    {
      thoughtNumber: 4,
      code: 'const x = 2;',
      auditResult: { ...mockAuditResult, overall: 70 },
      timestamp: Date.now() - 30000,
    },
  ],
  currentLoop: 5,
  isComplete: false,
  codexContextActive: true,
  lastGan: mockAuditResult,
  createdAt: Date.now() - 120000,
  updatedAt: Date.now(),
};

const mockStagnationAnalysis: DetailedStagnationAnalysis = {
  isStagnant: false,
  detectedAtLoop: 5,
  similarityScore: 0.3,
  recommendation: 'Continue iterating',
  patterns: {
    repeatedBlocks: [],
    errorPatterns: ['performance'],
    failedImprovements: [],
  },
  similarityProgression: [0.2, 0.3, 0.25],
  progressAnalysis: {
    stuckOnSameIssues: false,
    cosmeticChangesOnly: false,
    revertingChanges: false,
    showsConfusion: false,
  },
  alternativeSuggestions: ['Try different approach', 'Focus on core issues'],
};

const mockTerminationResult: TerminationResult = {
  shouldTerminate: false,
  reason: 'Completion criteria not yet met',
  failureRate: 20,
  criticalIssues: ['Security vulnerability in authentication'],
  finalAssessment: 'Good progress but needs security fixes',
};

// ============================================================================
// Enhanced Response Builder Tests
// ============================================================================

describe('EnhancedResponseBuilder', () => {
  let builder: EnhancedResponseBuilder;

  beforeEach(() => {
    builder = new EnhancedResponseBuilder();
  });

  describe('Constructor and Configuration', () => {
    it('should create builder with default configuration', () => {
      const config = builder.getConfig();
      expect(config.includeDetailedFeedback).toBe(true);
      expect(config.includeLoopInfo).toBe(true);
      expect(config.includeSessionMetadata).toBe(true);
      expect(config.maxImprovements).toBe(10);
      expect(config.maxCriticalIssues).toBe(5);
      expect(config.maxNextSteps).toBe(5);
      expect(config.feedbackDetailLevel).toBe(FeedbackDetailLevel.STANDARD);
    });

    it('should create builder with custom configuration', () => {
      const customBuilder = new EnhancedResponseBuilder({
        maxImprovements: 15,
        feedbackDetailLevel: FeedbackDetailLevel.COMPREHENSIVE,
      });

      const config = customBuilder.getConfig();
      expect(config.maxImprovements).toBe(15);
      expect(config.feedbackDetailLevel).toBe(FeedbackDetailLevel.COMPREHENSIVE);
      expect(config.includeDetailedFeedback).toBe(true); // Should keep defaults
    });

    it('should update configuration', () => {
      builder.updateConfig({
        maxImprovements: 20,
        includeLoopInfo: false,
      });

      const config = builder.getConfig();
      expect(config.maxImprovements).toBe(20);
      expect(config.includeLoopInfo).toBe(false);
      expect(config.includeDetailedFeedback).toBe(true); // Should keep existing
    });
  });

  describe('Basic Response Building', () => {
    it('should build basic synchronous response without optional data', () => {
      const response = builder.buildSynchronousResponse(mockStandardResponse);

      expect(response.thoughtNumber).toBe(5);
      expect(response.totalThoughts).toBe(10);
      expect(response.nextThoughtNeeded).toBe(true);
      expect(response.branches).toEqual(['main']);
      expect(response.thoughtHistoryLength).toBe(5);
      expect(response.feedback).toBeUndefined();
      expect(response.completionStatus).toBeUndefined();
      expect(response.loopInfo).toBeUndefined();
    });

    it('should build response with audit results', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult
      );

      expect(response.gan).toEqual(mockAuditResult);
      expect(response.feedback).toBeDefined();
      expect(response.feedback?.summary).toContain('75% score');
      expect(response.feedback?.summary).toContain('revise');
    });

    it('should build response with session ID', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState
      );

      expect(response.sessionId).toBe('test-session-123');
      expect(response.sessionMetadata).toBeDefined();
      expect(response.sessionMetadata?.sessionId).toBe('test-session-123');
      expect(response.sessionMetadata?.loopId).toBe('loop-456');
    });
  });

  describe('Structured Feedback Generation', () => {
    it('should extract improvement suggestions from audit results', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult
      );

      expect(response.feedback?.improvements).toBeDefined();
      expect(response.feedback!.improvements.length).toBeGreaterThan(0);

      const securityImprovement = response.feedback!.improvements.find(
        imp => imp.category === IssueCategory.SECURITY
      );
      expect(securityImprovement).toBeDefined();
      expect(securityImprovement?.priority).toBe(Priority.CRITICAL);
      expect(securityImprovement?.location?.path).toBe('src/test.ts');
      expect(securityImprovement?.location?.line).toBe(10);
    });

    it('should categorize improvements correctly', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult
      );

      const improvements = response.feedback!.improvements;
      
      // Should have security, performance, and style improvements
      const categories = improvements.map(imp => imp.category);
      expect(categories).toContain(IssueCategory.SECURITY);
      expect(categories).toContain(IssueCategory.PERFORMANCE);
      expect(categories).toContain(IssueCategory.STYLE);
    });

    it('should prioritize improvements correctly', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult
      );

      const improvements = response.feedback!.improvements;
      
      // Security issues should be critical priority
      const securityImprovement = improvements.find(
        imp => imp.category === IssueCategory.SECURITY
      );
      expect(securityImprovement?.priority).toBe(Priority.CRITICAL);

      // Style issues should be lower priority
      const styleImprovement = improvements.find(
        imp => imp.category === IssueCategory.STYLE
      );
      expect(styleImprovement?.priority).toBe(Priority.LOW);
    });

    it('should extract critical issues', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult
      );

      expect(response.feedback?.criticalIssues).toBeDefined();
      
      const criticalIssue = response.feedback!.criticalIssues.find(
        issue => issue.type === CriticalIssueType.SECURITY_VULNERABILITY
      );
      expect(criticalIssue).toBeDefined();
      expect(criticalIssue?.severity).toBe(Severity.CRITICAL);
      expect(criticalIssue?.description).toContain('SQL injection');
    });

    it('should generate actionable next steps', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState
      );

      expect(response.feedback?.nextSteps).toBeDefined();
      expect(response.feedback!.nextSteps.length).toBeGreaterThan(0);

      const firstStep = response.feedback!.nextSteps[0];
      expect(firstStep.step).toBe(1);
      expect(firstStep.action).toBeDefined();
      expect(firstStep.rationale).toBeDefined();
      expect(firstStep.expectedOutcome).toBeDefined();
      expect(firstStep.priority).toBeDefined();
    });

    it('should assess progress correctly', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState
      );

      expect(response.feedback?.progressAssessment).toBeDefined();
      expect(response.feedback!.progressAssessment.trend).toBe(ProgressTrend.IMPROVING);
      expect(response.feedback!.progressAssessment.confidence).toBeGreaterThan(0);
      expect(response.feedback!.progressAssessment.factors.length).toBeGreaterThan(0);
      expect(response.feedback!.progressAssessment.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Completion Status Building', () => {
    it('should build completion status from completion result', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState
      );

      expect(response.completionStatus).toBeDefined();
      expect(response.completionStatus!.isComplete).toBe(false);
      expect(response.completionStatus!.reason).toBe('in_progress');
      expect(response.completionStatus!.currentLoop).toBe(5);
      expect(response.completionStatus!.score).toBe(75);
      expect(response.completionStatus!.threshold).toBe(95); // Should be 95 for loop 5
      expect(response.completionStatus!.progressPercentage).toBeGreaterThan(0);
      expect(response.completionStatus!.progressPercentage).toBeLessThan(1);
    });

    it('should calculate progress percentage correctly', () => {
      const completedResult: CompletionResult = {
        isComplete: true,
        reason: 'score_95_at_10',
        nextThoughtNeeded: false,
        message: 'Completion achieved',
      };

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        { ...mockAuditResult, overall: 95 },
        completedResult,
        { ...mockSessionState, currentLoop: 10 }
      );

      expect(response.completionStatus!.progressPercentage).toBe(1.0);
    });
  });

  describe('Loop Information Building', () => {
    it('should build loop information from session state', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState
      );

      expect(response.loopInfo).toBeDefined();
      expect(response.loopInfo!.currentLoop).toBe(5);
      expect(response.loopInfo!.maxLoops).toBe(25);
      expect(response.loopInfo!.progressTrend).toBe(ProgressTrend.IMPROVING);
      expect(response.loopInfo!.stagnationDetected).toBe(false);
      expect(response.loopInfo!.loopsRemaining).toBe(20);
    });

    it('should calculate score progression correctly', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState
      );

      expect(response.loopInfo!.scoreProgression).toEqual([65, 70]);
      expect(response.loopInfo!.averageImprovement).toBe(5); // 70 - 65 = 5
    });

    it('should detect stagnation in loop info', () => {
      const stagnantAnalysis: DetailedStagnationAnalysis = {
        ...mockStagnationAnalysis,
        isStagnant: true,
      };

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState,
        stagnantAnalysis
      );

      expect(response.loopInfo!.stagnationDetected).toBe(true);
      expect(response.loopInfo!.progressTrend).toBe(ProgressTrend.STAGNANT);
    });
  });

  describe('Termination Information Building', () => {
    it('should build termination info when termination is required', () => {
      const terminationRequired: TerminationResult = {
        shouldTerminate: true,
        reason: 'Maximum loops reached without achieving completion criteria',
        failureRate: 40,
        criticalIssues: ['Security vulnerability', 'Logic error'],
        finalAssessment: 'Unable to complete within loop limit',
      };

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState,
        mockStagnationAnalysis,
        terminationRequired
      );

      expect(response.terminationInfo).toBeDefined();
      expect(response.terminationInfo!.reason).toContain('Maximum loops');
      expect(response.terminationInfo!.type).toBe('timeout');
      expect(response.terminationInfo!.failureRate).toBe(40);
      expect(response.terminationInfo!.criticalIssues).toEqual(['Security vulnerability', 'Logic error']);
      expect(response.terminationInfo!.recommendations.length).toBeGreaterThan(0);
    });

    it('should categorize termination types correctly', () => {
      const stagnationTermination: TerminationResult = {
        shouldTerminate: true,
        reason: 'Stagnation detected: no meaningful progress',
        failureRate: 30,
        criticalIssues: [],
        finalAssessment: 'Stagnant progress',
      };

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState,
        mockStagnationAnalysis,
        stagnationTermination
      );

      expect(response.terminationInfo!.type).toBe('stagnation');
    });
  });

  describe('Session Metadata Building', () => {
    it('should build session metadata correctly', () => {
      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState
      );

      expect(response.sessionMetadata).toBeDefined();
      expect(response.sessionMetadata!.sessionId).toBe('test-session-123');
      expect(response.sessionMetadata!.loopId).toBe('loop-456');
      expect(response.sessionMetadata!.sessionStartTime).toBe(mockSessionState.createdAt);
      expect(response.sessionMetadata!.totalSessionTime).toBeGreaterThan(0);
      expect(response.sessionMetadata!.sessionConfig.threshold).toBe(85);
      expect(response.sessionMetadata!.sessionConfig.maxCycles).toBe(5);
    });
  });

  describe('Configuration Limits', () => {
    it('should respect maxImprovements limit', () => {
      builder.updateConfig({ maxImprovements: 2 });

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult
      );

      expect(response.feedback!.improvements.length).toBeLessThanOrEqual(2);
    });

    it('should respect maxCriticalIssues limit', () => {
      builder.updateConfig({ maxCriticalIssues: 1 });

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult
      );

      expect(response.feedback!.criticalIssues.length).toBeLessThanOrEqual(1);
    });

    it('should respect maxNextSteps limit', () => {
      builder.updateConfig({ maxNextSteps: 3 });

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState
      );

      expect(response.feedback!.nextSteps.length).toBeLessThanOrEqual(3);
    });

    it('should disable components based on configuration', () => {
      builder.updateConfig({
        includeDetailedFeedback: false,
        includeLoopInfo: false,
        includeSessionMetadata: false,
      });

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState
      );

      expect(response.feedback).toBeUndefined();
      expect(response.loopInfo).toBeUndefined();
      expect(response.sessionMetadata).toBeUndefined();
    });
  });

  describe('Stagnation Handling', () => {
    it('should handle stagnation in next steps generation', () => {
      const stagnantAnalysis: DetailedStagnationAnalysis = {
        ...mockStagnationAnalysis,
        isStagnant: true,
        recommendation: 'Try alternative approach',
        alternativeSuggestions: ['Use different algorithm', 'Simplify design'],
      };

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState,
        stagnantAnalysis
      );

      const nextSteps = response.feedback!.nextSteps;
      expect(nextSteps[0].action).toContain('stagnation');
      expect(nextSteps[0].priority).toBe(Priority.CRITICAL);
      
      // Should include alternative suggestions
      const alternativeSteps = nextSteps.filter(step => 
        step.action.includes('algorithm') || step.action.includes('design')
      );
      expect(alternativeSteps.length).toBeGreaterThan(0);
    });

    it('should reflect stagnation in progress assessment', () => {
      const stagnantAnalysis: DetailedStagnationAnalysis = {
        ...mockStagnationAnalysis,
        isStagnant: true,
      };

      const response = builder.buildSynchronousResponse(
        mockStandardResponse,
        mockAuditResult,
        mockCompletionResult,
        mockSessionState,
        stagnantAnalysis
      );

      expect(response.feedback!.progressAssessment.trend).toBe(ProgressTrend.STAGNANT);
      expect(response.feedback!.progressAssessment.factors).toContain('Stagnation detected in recent iterations');
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('Factory Functions', () => {
  describe('createEnhancedResponseBuilder', () => {
    it('should create builder with default configuration', () => {
      const builder = createEnhancedResponseBuilder();
      const config = builder.getConfig();
      expect(config.feedbackDetailLevel).toBe(FeedbackDetailLevel.STANDARD);
    });

    it('should create builder with custom configuration', () => {
      const builder = createEnhancedResponseBuilder({
        maxImprovements: 20,
        feedbackDetailLevel: FeedbackDetailLevel.DETAILED,
      });
      const config = builder.getConfig();
      expect(config.maxImprovements).toBe(20);
      expect(config.feedbackDetailLevel).toBe(FeedbackDetailLevel.DETAILED);
    });
  });

  describe('createMinimalEnhancedResponseBuilder', () => {
    it('should create builder with minimal configuration', () => {
      const builder = createMinimalEnhancedResponseBuilder();
      const config = builder.getConfig();
      expect(config.feedbackDetailLevel).toBe(FeedbackDetailLevel.MINIMAL);
      expect(config.includeLoopInfo).toBe(false);
      expect(config.includeSessionMetadata).toBe(false);
      expect(config.maxImprovements).toBe(5);
      expect(config.maxCriticalIssues).toBe(3);
      expect(config.maxNextSteps).toBe(3);
    });
  });

  describe('createComprehensiveEnhancedResponseBuilder', () => {
    it('should create builder with comprehensive configuration', () => {
      const builder = createComprehensiveEnhancedResponseBuilder();
      const config = builder.getConfig();
      expect(config.feedbackDetailLevel).toBe(FeedbackDetailLevel.COMPREHENSIVE);
      expect(config.includeLoopInfo).toBe(true);
      expect(config.includeSessionMetadata).toBe(true);
      expect(config.maxImprovements).toBe(15);
      expect(config.maxCriticalIssues).toBe(10);
      expect(config.maxNextSteps).toBe(8);
    });
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases and Error Handling', () => {
  let builder: EnhancedResponseBuilder;

  beforeEach(() => {
    builder = new EnhancedResponseBuilder();
  });

  it('should handle empty audit results gracefully', () => {
    const emptyAudit: GansAuditorCodexReview = {
      overall: 0,
      dimensions: [],
      verdict: 'reject',
      review: {
        summary: '',
        inline: [],
        citations: [],
      },
      iterations: 0,
      judge_cards: [],
    };

    const response = builder.buildSynchronousResponse(
      mockStandardResponse,
      emptyAudit
    );

    expect(response.feedback).toBeDefined();
    expect(response.feedback!.improvements).toEqual([]);
    expect(response.feedback!.criticalIssues).toEqual([]);
    expect(response.feedback!.summary).toContain('0% score');
  });

  it('should handle missing session state gracefully', () => {
    const response = builder.buildSynchronousResponse(
      mockStandardResponse,
      mockAuditResult,
      mockCompletionResult
    );

    expect(response.completionStatus).toBeDefined();
    expect(response.loopInfo).toBeUndefined();
    expect(response.sessionMetadata).toBeUndefined();
  });

  it('should handle malformed inline comments', () => {
    const malformedAudit: GansAuditorCodexReview = {
      ...mockAuditResult,
      dimensions: [], // Remove dimensional suggestions to isolate inline comment test
      review: {
        ...mockAuditResult.review,
        inline: [
          { path: '', line: 0, comment: '' }, // Empty comment
          { path: 'test.ts', line: 5, comment: 'Valid comment' },
        ],
      },
    };

    const response = builder.buildSynchronousResponse(
      mockStandardResponse,
      malformedAudit
    );

    expect(response.feedback!.improvements.length).toBe(1); // Should skip empty comment
  });

  it('should handle extreme scores correctly', () => {
    const perfectAudit: GansAuditorCodexReview = {
      ...mockAuditResult,
      overall: 100,
      verdict: 'pass',
    };

    const response = builder.buildSynchronousResponse(
      mockStandardResponse,
      perfectAudit
    );

    expect(response.feedback!.progressAssessment.factors).toContain('High audit score achieved');
  });

  it('should handle very low scores correctly', () => {
    const poorAudit: GansAuditorCodexReview = {
      ...mockAuditResult,
      overall: 10,
      verdict: 'reject',
    };

    const response = builder.buildSynchronousResponse(
      mockStandardResponse,
      poorAudit
    );

    expect(response.feedback!.progressAssessment.factors).toContain('Low audit score indicates fundamental issues');
  });
});