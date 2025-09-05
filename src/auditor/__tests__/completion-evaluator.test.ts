/**
 * Unit tests for CompletionEvaluator
 * 
 * Tests all completion criteria and kill switch functionality as specified
 * in requirements 3.1-3.4 and 3.7.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CompletionEvaluator,
  createCompletionEvaluator,
  validateCompletionCriteria,
  DEFAULT_COMPLETION_CRITERIA,
  type CompletionCriteria,
  type CompletionResult,
  type TerminationResult,
  type CompletionStatus,
} from '../completion-evaluator.js';
import type {
  GansAuditorCodexSessionState,
  GansAuditorCodexSessionConfig,
  GansAuditorCodexReview,
  GansAuditorCodexHistoryEntry,
  StagnationResult,
} from '../../types/gan-types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockSessionConfig: GansAuditorCodexSessionConfig = {
  task: "Test audit task",
  scope: "diff",
  threshold: 85,
  maxCycles: 1,
  candidates: 1,
  judges: ["internal"],
  applyFixes: false,
};

const createMockReview = (score: number, verdict: "pass" | "revise" | "reject"): GansAuditorCodexReview => ({
  overall: score,
  dimensions: [
    { name: "accuracy", score: score },
    { name: "completeness", score: score },
  ],
  verdict,
  review: {
    summary: `Test review with ${score}% score`,
    inline: [
      {
        path: "test.ts",
        line: 1,
        comment: "Test comment",
      },
    ],
    citations: [],
  },
  iterations: 1,
  judge_cards: [
    {
      model: "internal",
      score,
      notes: "Test notes",
    },
  ],
});

const createMockSessionState = (
  currentLoop: number,
  lastScore: number,
  isComplete: boolean = false
): GansAuditorCodexSessionState => {
  const history: GansAuditorCodexHistoryEntry[] = [];
  
  // Create history entries for each loop
  for (let i = 1; i <= currentLoop; i++) {
    const score = Math.min(lastScore + (i - currentLoop) * 5, 100);
    const verdict = score >= 85 ? "pass" : score >= 70 ? "revise" : "reject";
    
    history.push({
      timestamp: Date.now() - (currentLoop - i) * 1000,
      thoughtNumber: i,
      review: createMockReview(score, verdict),
      config: mockSessionConfig,
    });
  }

  return {
    id: "test-session",
    config: mockSessionConfig,
    history,
    iterations: [],
    currentLoop,
    isComplete,
    lastGan: history.length > 0 ? history[history.length - 1].review : undefined,
    codexContextActive: false,
    createdAt: Date.now() - currentLoop * 1000,
    updatedAt: Date.now(),
  };
};

// ============================================================================
// CompletionEvaluator Tests
// ============================================================================

describe('CompletionEvaluator', () => {
  let evaluator: CompletionEvaluator;

  beforeEach(() => {
    evaluator = new CompletionEvaluator();
  });

  describe('constructor', () => {
    it('should use default criteria when none provided', () => {
      const defaultEvaluator = new CompletionEvaluator();
      expect(defaultEvaluator.getCriteria()).toEqual(DEFAULT_COMPLETION_CRITERIA);
    });

    it('should use custom criteria when provided', () => {
      const customCriteria: CompletionCriteria = {
        tier1: { score: 98, maxLoops: 8 },
        tier2: { score: 92, maxLoops: 12 },
        tier3: { score: 88, maxLoops: 18 },
        hardStop: { maxLoops: 22 },
        stagnationCheck: { startLoop: 8, similarityThreshold: 0.9 },
      };

      const customEvaluator = new CompletionEvaluator(customCriteria);
      expect(customEvaluator.getCriteria()).toEqual(customCriteria);
    });
  });

  describe('evaluateCompletion', () => {
    // Requirement 3.1: 95%@10 loops completion criteria
    describe('Tier 1 completion (95%@10)', () => {
      it('should complete when score >= 95% at loop 10', () => {
        const result = evaluator.evaluateCompletion(95, 10);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("score_95_at_10");
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain("Tier 1 completion achieved");
      });

      it('should complete when score > 95% at loop 10', () => {
        const result = evaluator.evaluateCompletion(98, 10);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("score_95_at_10");
        expect(result.nextThoughtNeeded).toBe(false);
      });

      it('should not complete when score < 95% at loop 10', () => {
        const result = evaluator.evaluateCompletion(94, 10);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe("in_progress");
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should not complete when score >= 95% but loop < 10', () => {
        const result = evaluator.evaluateCompletion(96, 9);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe("in_progress");
        expect(result.nextThoughtNeeded).toBe(true);
      });
    });

    // Requirement 3.2: 90%@15 loops completion criteria
    describe('Tier 2 completion (90%@15)', () => {
      it('should complete when score >= 90% at loop 15', () => {
        const result = evaluator.evaluateCompletion(90, 15);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("score_90_at_15");
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain("Tier 2 completion achieved");
      });

      it('should complete when score > 90% at loop 15', () => {
        const result = evaluator.evaluateCompletion(93, 15);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("score_90_at_15");
        expect(result.nextThoughtNeeded).toBe(false);
      });

      it('should not complete when score < 90% at loop 15', () => {
        const result = evaluator.evaluateCompletion(89, 15);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe("in_progress");
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should prefer tier 1 over tier 2 when both conditions met', () => {
        const result = evaluator.evaluateCompletion(95, 15);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("score_95_at_10");
      });
    });

    // Requirement 3.3: 85%@20 loops completion criteria
    describe('Tier 3 completion (85%@20)', () => {
      it('should complete when score >= 85% at loop 20', () => {
        const result = evaluator.evaluateCompletion(85, 20);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("score_85_at_20");
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain("Tier 3 completion achieved");
      });

      it('should complete when score > 85% at loop 20', () => {
        const result = evaluator.evaluateCompletion(88, 20);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("score_85_at_20");
        expect(result.nextThoughtNeeded).toBe(false);
      });

      it('should not complete when score < 85% at loop 20', () => {
        const result = evaluator.evaluateCompletion(84, 20);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe("in_progress");
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should prefer higher tier when multiple conditions met', () => {
        const result = evaluator.evaluateCompletion(96, 20); // Score >= 95 to trigger tier 1
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("score_95_at_10");
      });
    });

    // Requirement 3.4: Hard stop at 25 loops with failure reporting
    describe('Hard stop at 25 loops', () => {
      it('should terminate at loop 25 regardless of score', () => {
        const result = evaluator.evaluateCompletion(50, 25);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("max_loops_reached");
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain("Maximum loops (25) reached");
      });

      it('should terminate at loop > 25', () => {
        const result = evaluator.evaluateCompletion(80, 30);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("max_loops_reached");
        expect(result.nextThoughtNeeded).toBe(false);
      });

      it('should not terminate at loop < 25 if no other criteria met', () => {
        const result = evaluator.evaluateCompletion(50, 24);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe("in_progress");
        expect(result.nextThoughtNeeded).toBe(true);
      });
    });

    // Requirement 3.5: Stagnation detection
    describe('Stagnation detection', () => {
      it('should complete when stagnation detected after loop 10', () => {
        const stagnationInfo: StagnationResult = {
          isStagnant: true,
          detectedAtLoop: 12,
          similarityScore: 0.96,
          recommendation: "Try alternative approach",
        };

        const result = evaluator.evaluateCompletion(80, 12, stagnationInfo);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("stagnation_detected");
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain("Stagnation detected");
        expect(result.message).toContain("Try alternative approach");
      });

      it('should not complete when stagnation detected before loop 10', () => {
        const stagnationInfo: StagnationResult = {
          isStagnant: true,
          detectedAtLoop: 8,
          similarityScore: 0.96,
          recommendation: "Continue iterating",
        };

        const result = evaluator.evaluateCompletion(80, 8, stagnationInfo);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe("in_progress");
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should prioritize stagnation over other completion criteria', () => {
        const stagnationInfo: StagnationResult = {
          isStagnant: true,
          detectedAtLoop: 15,
          similarityScore: 0.98,
          recommendation: "Manual intervention required",
        };

        const result = evaluator.evaluateCompletion(95, 15, stagnationInfo);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe("stagnation_detected");
      });
    });

    describe('Progress messages', () => {
      it('should provide helpful progress message when score meets threshold but loops insufficient', () => {
        const result = evaluator.evaluateCompletion(96, 8);
        
        expect(result.message).toContain("meets threshold");
        expect(result.message).toContain("minimum loops not reached");
      });

      it('should provide improvement guidance when score below threshold', () => {
        const result = evaluator.evaluateCompletion(80, 12);
        
        expect(result.message).toContain("needs");
        expect(result.message).toContain("improvement");
        expect(result.message).toContain("remaining");
      });
    });
  });

  describe('shouldTerminate', () => {
    it('should terminate when max loops reached', () => {
      const sessionState = createMockSessionState(25, 80);
      const result = evaluator.shouldTerminate(sessionState);
      
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toContain("Maximum loops (25) reached");
      expect(result.finalAssessment).toContain("Final Assessment after 25 loops");
    });

    it('should terminate when stagnation detected', () => {
      const sessionState = createMockSessionState(15, 80);
      sessionState.stagnationInfo = {
        isStagnant: true,
        detectedAtLoop: 12,
        similarityScore: 0.96,
        recommendation: "Try different approach",
      };

      const result = evaluator.shouldTerminate(sessionState);
      
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toContain("Stagnation detected");
      expect(result.reason).toContain("Try different approach");
    });

    it('should not terminate when criteria not met', () => {
      const sessionState = createMockSessionState(15, 80);
      const result = evaluator.shouldTerminate(sessionState);
      
      expect(result.shouldTerminate).toBe(false);
      expect(result.reason).toContain("Completion criteria not yet met");
    });

    it('should calculate failure rate correctly', () => {
      const sessionState = createMockSessionState(10, 60); // Low score = reject verdicts
      const result = evaluator.shouldTerminate(sessionState);
      
      expect(result.failureRate).toBeGreaterThan(0);
    });

    it('should extract critical issues from history', () => {
      const sessionState = createMockSessionState(10, 60);
      // Add critical issue to last review
      if (sessionState.lastGan) {
        sessionState.lastGan.review.inline.push({
          path: "security.ts",
          line: 10,
          comment: "Critical security vulnerability detected",
        });
      }

      const result = evaluator.shouldTerminate(sessionState);
      
      expect(result.criticalIssues.length).toBeGreaterThan(0);
      expect(result.criticalIssues.some(issue => issue.includes("security"))).toBe(true);
    });
  });

  describe('getCompletionStatus', () => {
    it('should return complete status with correct information', () => {
      const completionResult: CompletionResult = {
        isComplete: true,
        reason: "score_95_at_10",
        nextThoughtNeeded: false,
        message: "Tier 1 completion achieved",
      };

      const status = evaluator.getCompletionStatus(95, 10, completionResult);
      
      expect(status.isComplete).toBe(true);
      expect(status.reason).toBe("score_95_at_10");
      expect(status.currentLoop).toBe(10);
      expect(status.score).toBe(95);
      expect(status.threshold).toBe(95);
      expect(status.message).toBe("Tier 1 completion achieved");
    });

    it('should return in-progress status with correct threshold', () => {
      const completionResult: CompletionResult = {
        isComplete: false,
        reason: "in_progress",
        nextThoughtNeeded: true,
      };

      const status = evaluator.getCompletionStatus(88, 18, completionResult);
      
      expect(status.isComplete).toBe(false);
      expect(status.reason).toBe("in_progress");
      expect(status.currentLoop).toBe(18);
      expect(status.score).toBe(88);
      expect(status.threshold).toBe(90); // Tier 2 threshold at loop 18
    });
  });

  describe('updateCriteria', () => {
    it('should update criteria partially', () => {
      const originalCriteria = evaluator.getCriteria();
      
      evaluator.updateCriteria({
        tier1: { score: 98, maxLoops: 8 },
      });

      const updatedCriteria = evaluator.getCriteria();
      
      expect(updatedCriteria.tier1.score).toBe(98);
      expect(updatedCriteria.tier1.maxLoops).toBe(8);
      expect(updatedCriteria.tier2).toEqual(originalCriteria.tier2);
      expect(updatedCriteria.tier3).toEqual(originalCriteria.tier3);
    });

    it('should affect completion evaluation after update', () => {
      evaluator.updateCriteria({
        tier1: { score: 98, maxLoops: 8 },
      });

      const result = evaluator.evaluateCompletion(95, 8);
      
      expect(result.isComplete).toBe(false); // 95 < 98
      expect(result.reason).toBe("in_progress");
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('createCompletionEvaluator', () => {
  it('should create evaluator with default criteria', () => {
    const evaluator = createCompletionEvaluator();
    expect(evaluator.getCriteria()).toEqual(DEFAULT_COMPLETION_CRITERIA);
  });

  it('should create evaluator with custom criteria', () => {
    const customCriteria = {
      tier1: { score: 98, maxLoops: 8 },
    };

    const evaluator = createCompletionEvaluator(customCriteria);
    const criteria = evaluator.getCriteria();
    
    expect(criteria.tier1.score).toBe(98);
    expect(criteria.tier1.maxLoops).toBe(8);
    expect(criteria.tier2).toEqual(DEFAULT_COMPLETION_CRITERIA.tier2);
  });
});

describe('validateCompletionCriteria', () => {
  it('should validate correct criteria', () => {
    const result = validateCompletionCriteria(DEFAULT_COMPLETION_CRITERIA);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid score ranges', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      tier1: { score: 150, maxLoops: 10 }, // Invalid score > 100
    };

    const result = validateCompletionCriteria(invalidCriteria);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tier 1 score must be between 0 and 100");
  });

  it('should detect invalid loop progression', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      tier2: { score: 90, maxLoops: 5 }, // Less than tier1 maxLoops (10)
    };

    const result = validateCompletionCriteria(invalidCriteria);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tier 2 maxLoops must be >= Tier 1 maxLoops");
  });

  it('should detect invalid score progression', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      tier2: { score: 98, maxLoops: 15 }, // Higher than tier1 score (95)
    };

    const result = validateCompletionCriteria(invalidCriteria);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tier 1 score should be >= Tier 2 score");
  });

  it('should detect invalid stagnation settings', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      stagnationCheck: { startLoop: 0, similarityThreshold: 1.5 }, // Invalid values
    };

    const result = validateCompletionCriteria(invalidCriteria);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Stagnation check startLoop must be at least 1");
    expect(result.errors).toContain("Stagnation similarity threshold must be between 0 and 1");
  });

  it('should detect multiple validation errors', () => {
    const invalidCriteria: CompletionCriteria = {
      tier1: { score: -10, maxLoops: 0 },
      tier2: { score: 200, maxLoops: 5 },
      tier3: { score: 300, maxLoops: 3 },
      hardStop: { maxLoops: 1 },
      stagnationCheck: { startLoop: -1, similarityThreshold: 2.0 },
    };

    const result = validateCompletionCriteria(invalidCriteria);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(5);
  });
});

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('CompletionEvaluator edge cases', () => {
  let evaluator: CompletionEvaluator;

  beforeEach(() => {
    evaluator = new CompletionEvaluator();
  });

  it('should handle exact threshold scores', () => {
    const result = evaluator.evaluateCompletion(95, 10);
    expect(result.isComplete).toBe(true);
    expect(result.reason).toBe("score_95_at_10");
  });

  it('should handle exact loop counts', () => {
    const result = evaluator.evaluateCompletion(94, 10);
    expect(result.isComplete).toBe(false);
    expect(result.reason).toBe("in_progress");
  });

  it('should handle zero scores', () => {
    const result = evaluator.evaluateCompletion(0, 5);
    expect(result.isComplete).toBe(false);
    expect(result.reason).toBe("in_progress");
    expect(result.nextThoughtNeeded).toBe(true);
  });

  it('should handle perfect scores early', () => {
    const result = evaluator.evaluateCompletion(100, 5);
    expect(result.isComplete).toBe(false); // Still need minimum loops
    expect(result.reason).toBe("in_progress");
  });

  it('should handle session state with no history', () => {
    const emptySessionState: GansAuditorCodexSessionState = {
      id: "empty-session",
      config: mockSessionConfig,
      history: [],
      iterations: [],
      currentLoop: 0,
      isComplete: false,
      codexContextActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = evaluator.shouldTerminate(emptySessionState);
    
    expect(result.shouldTerminate).toBe(false);
    expect(result.failureRate).toBe(0);
    expect(result.criticalIssues).toHaveLength(0);
  });

  it('should handle session state with no lastGan', () => {
    const sessionState = createMockSessionState(5, 80);
    sessionState.lastGan = undefined;

    const result = evaluator.shouldTerminate(sessionState);
    
    expect(result.shouldTerminate).toBe(false);
    expect(result.finalAssessment).toBe(""); // No assessment when not terminating
  });
});