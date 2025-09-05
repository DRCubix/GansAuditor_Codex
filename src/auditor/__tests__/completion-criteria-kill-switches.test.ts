/**
 * Unit Tests for Completion Criteria and Kill Switch Logic
 * 
 * Tests for tiered completion system, kill switches, and termination logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  StagnationResult,
} from '../../types/gan-types.js';

describe('CompletionEvaluator', () => {
  let evaluator: CompletionEvaluator;
  let mockSession: GansAuditorCodexSessionState;

  beforeEach(() => {
    evaluator = new CompletionEvaluator();
    
    mockSession = {
      id: 'test-session-123',
      currentLoop: 5,
      iterations: [],
      history: [],
      config: {},
      startTime: Date.now(),
      lastGan: {
        overall: 75,
        dimensions: [],
        verdict: 'revise',
        review: { summary: 'Needs improvement', inline: [], citations: [] },
        proposed_diff: null,
        iterations: 5,
        judge_cards: [],
      },
      stagnationInfo: null,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default criteria', () => {
      const defaultEvaluator = new CompletionEvaluator();
      const criteria = defaultEvaluator.getCriteria();
      
      expect(criteria.tier1.score).toBe(95);
      expect(criteria.tier1.maxLoops).toBe(10);
      expect(criteria.tier2.score).toBe(90);
      expect(criteria.tier2.maxLoops).toBe(15);
      expect(criteria.tier3.score).toBe(85);
      expect(criteria.tier3.maxLoops).toBe(20);
      expect(criteria.hardStop.maxLoops).toBe(25);
    });

    it('should initialize with custom criteria', () => {
      const customCriteria: CompletionCriteria = {
        tier1: { score: 98, maxLoops: 8 },
        tier2: { score: 92, maxLoops: 12 },
        tier3: { score: 88, maxLoops: 18 },
        hardStop: { maxLoops: 30 },
        stagnationCheck: { startLoop: 8, similarityThreshold: 0.98 },
      };

      const customEvaluator = new CompletionEvaluator(customCriteria);
      const criteria = customEvaluator.getCriteria();
      
      expect(criteria.tier1.score).toBe(98);
      expect(criteria.tier1.maxLoops).toBe(8);
      expect(criteria.hardStop.maxLoops).toBe(30);
    });
  });

  describe('evaluateCompletion', () => {
    describe('tier 1 completion (95% at 10+ loops)', () => {
      it('should detect tier 1 completion', () => {
        const result = evaluator.evaluateCompletion(96, 12);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('score_95_at_10');
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain('Tier 1 completion achieved');
        expect(result.message).toContain('96%');
        expect(result.message).toContain('loop 12');
      });

      it('should not complete tier 1 with insufficient score', () => {
        const result = evaluator.evaluateCompletion(94, 12);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe('in_progress');
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should not complete tier 1 with insufficient loops', () => {
        const result = evaluator.evaluateCompletion(96, 8);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe('in_progress');
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should complete tier 1 exactly at threshold', () => {
        const result = evaluator.evaluateCompletion(95, 10);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('score_95_at_10');
        expect(result.nextThoughtNeeded).toBe(false);
      });
    });

    describe('tier 2 completion (90% at 15+ loops)', () => {
      it('should detect tier 2 completion', () => {
        const result = evaluator.evaluateCompletion(91, 16);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('score_90_at_15');
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain('Tier 2 completion achieved');
      });

      it('should not complete tier 2 with insufficient score', () => {
        const result = evaluator.evaluateCompletion(89, 16);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe('in_progress');
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should not complete tier 2 with insufficient loops', () => {
        const result = evaluator.evaluateCompletion(91, 14);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe('in_progress');
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should complete tier 2 exactly at threshold', () => {
        const result = evaluator.evaluateCompletion(90, 15);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('score_90_at_15');
        expect(result.nextThoughtNeeded).toBe(false);
      });
    });

    describe('tier 3 completion (85% at 20+ loops)', () => {
      it('should detect tier 3 completion', () => {
        const result = evaluator.evaluateCompletion(86, 21);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('score_85_at_20');
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain('Tier 3 completion achieved');
      });

      it('should not complete tier 3 with insufficient score', () => {
        const result = evaluator.evaluateCompletion(84, 21);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe('in_progress');
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should not complete tier 3 with insufficient loops', () => {
        const result = evaluator.evaluateCompletion(86, 19);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe('in_progress');
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should complete tier 3 exactly at threshold', () => {
        const result = evaluator.evaluateCompletion(85, 20);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('score_85_at_20');
        expect(result.nextThoughtNeeded).toBe(false);
      });
    });

    describe('tier priority', () => {
      it('should prioritize tier 1 over tier 2 when both qualify', () => {
        const result = evaluator.evaluateCompletion(96, 16);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('score_95_at_10');
        expect(result.message).toContain('Tier 1');
      });

      it('should prioritize tier 2 over tier 3 when both qualify', () => {
        const result = evaluator.evaluateCompletion(91, 21);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('score_90_at_15');
        expect(result.message).toContain('Tier 2');
      });

      it('should use tier 3 when only it qualifies', () => {
        const result = evaluator.evaluateCompletion(86, 21);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('score_85_at_20');
        expect(result.message).toContain('Tier 3');
      });
    });

    describe('hard stop kill switch', () => {
      it('should trigger hard stop at maximum loops', () => {
        const result = evaluator.evaluateCompletion(75, 25);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('max_loops_reached');
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain('Maximum loops (25) reached');
      });

      it('should trigger hard stop beyond maximum loops', () => {
        const result = evaluator.evaluateCompletion(75, 30);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('max_loops_reached');
        expect(result.nextThoughtNeeded).toBe(false);
      });

      it('should not trigger hard stop before maximum loops', () => {
        const result = evaluator.evaluateCompletion(75, 24);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe('in_progress');
        expect(result.nextThoughtNeeded).toBe(true);
      });
    });

    describe('stagnation kill switch', () => {
      it('should trigger stagnation detection', () => {
        const stagnationInfo: StagnationResult = {
          isStagnant: true,
          detectedAtLoop: 12,
          similarityScore: 0.97,
          recommendation: 'Try alternative approach',
        };

        const result = evaluator.evaluateCompletion(75, 12, stagnationInfo);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('stagnation_detected');
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain('Stagnation detected at loop 12');
        expect(result.message).toContain('Try alternative approach');
      });

      it('should not trigger stagnation before start loop', () => {
        const stagnationInfo: StagnationResult = {
          isStagnant: true,
          detectedAtLoop: 8,
          similarityScore: 0.97,
          recommendation: 'Try alternative approach',
        };

        const result = evaluator.evaluateCompletion(75, 8, stagnationInfo);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe('in_progress');
        expect(result.nextThoughtNeeded).toBe(true);
      });

      it('should not trigger when not stagnant', () => {
        const stagnationInfo: StagnationResult = {
          isStagnant: false,
          detectedAtLoop: 0,
          similarityScore: 0.85,
          recommendation: '',
        };

        const result = evaluator.evaluateCompletion(75, 12, stagnationInfo);
        
        expect(result.isComplete).toBe(false);
        expect(result.reason).toBe('in_progress');
        expect(result.nextThoughtNeeded).toBe(true);
      });
    });

    describe('progress messages', () => {
      it('should provide progress message when score meets threshold but loops insufficient', () => {
        const result = evaluator.evaluateCompletion(96, 8);
        
        expect(result.message).toContain('Score 96% meets threshold');
        expect(result.message).toContain('minimum loops not reached');
      });

      it('should provide progress message when score below threshold', () => {
        const result = evaluator.evaluateCompletion(80, 12);
        
        expect(result.message).toContain('Score 80% needs');
        expect(result.message).toContain('improvement to reach');
        expect(result.message).toContain('loops remaining');
      });

      it('should show correct threshold for current loop count', () => {
        // At loop 12, should target tier 1 (95%)
        const result1 = evaluator.evaluateCompletion(80, 12);
        expect(result1.message).toContain('95% threshold');

        // At loop 16, should target tier 2 (90%)
        const result2 = evaluator.evaluateCompletion(80, 16);
        expect(result2.message).toContain('90% threshold');

        // At loop 21, should target tier 3 (85%)
        const result3 = evaluator.evaluateCompletion(80, 21);
        expect(result3.message).toContain('85% threshold');
      });
    });
  });

  describe('shouldTerminate', () => {
    it('should not terminate when criteria not met', () => {
      const result = evaluator.shouldTerminate(mockSession);
      
      expect(result.shouldTerminate).toBe(false);
      expect(result.reason).toContain('Completion criteria not yet met');
    });

    it('should terminate at hard stop', () => {
      const hardStopSession = { ...mockSession, currentLoop: 25 };
      const result = evaluator.shouldTerminate(hardStopSession);
      
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toContain('Maximum loops (25) reached');
      expect(result.finalAssessment).toContain('Final Assessment after 25 loops');
    });

    it('should terminate on stagnation', () => {
      const stagnantSession = {
        ...mockSession,
        currentLoop: 12,
        stagnationInfo: {
          isStagnant: true,
          detectedAtLoop: 11,
          similarityScore: 0.97,
          recommendation: 'Try alternative approach',
        },
      };

      const result = evaluator.shouldTerminate(stagnantSession);
      
      expect(result.shouldTerminate).toBe(true);
      expect(result.reason).toContain('Stagnation detected');
      expect(result.reason).toContain('Try alternative approach');
    });

    it('should calculate failure rate from session history', () => {
      const sessionWithHistory = {
        ...mockSession,
        history: [
          {
            thoughtNumber: 1,
            review: { verdict: 'reject' as const, summary: 'Failed', inline: [], citations: [] },
          },
          {
            thoughtNumber: 2,
            review: { verdict: 'pass' as const, summary: 'Passed', inline: [], citations: [] },
          },
          {
            thoughtNumber: 3,
            review: { verdict: 'reject' as const, summary: 'Failed', inline: [], citations: [] },
          },
        ],
      };

      const result = evaluator.shouldTerminate(sessionWithHistory);
      
      // 2 failures out of 3 = 66.7% failure rate
      expect(result.failureRate).toBeCloseTo(66.7, 1);
    });

    it('should extract critical issues from session history', () => {
      const sessionWithCriticalIssues = {
        ...mockSession,
        history: [
          {
            thoughtNumber: 1,
            review: {
              verdict: 'reject' as const,
              summary: 'Critical security issues found',
              inline: [
                {
                  path: 'src/auth.ts',
                  line: 42,
                  comment: 'Critical: SQL injection vulnerability',
                },
                {
                  path: 'src/user.ts',
                  line: 15,
                  comment: 'Security: Weak password validation',
                },
              ],
              citations: [],
            },
          },
        ],
      };

      const result = evaluator.shouldTerminate(sessionWithCriticalIssues);
      
      expect(result.criticalIssues.length).toBeGreaterThan(0);
      expect(result.criticalIssues[0]).toContain('Critical security issues found');
      expect(result.criticalIssues.some(issue => 
        issue.includes('SQL injection vulnerability')
      )).toBe(true);
    });

    it('should generate final assessment for termination', () => {
      const terminationSession = { ...mockSession, currentLoop: 25 };
      const result = evaluator.shouldTerminate(terminationSession);
      
      expect(result.finalAssessment).toContain('Final Assessment after 25 loops');
      expect(result.finalAssessment).toContain('Final Score: 75%');
      expect(result.finalAssessment).toContain('Final Verdict: revise');
      expect(result.finalAssessment).toContain('Failure Rate:');
      expect(result.finalAssessment).toContain('Recommendation:');
    });
  });

  describe('getCompletionStatus', () => {
    it('should generate completion status for in-progress evaluation', () => {
      const completionResult: CompletionResult = {
        isComplete: false,
        reason: 'in_progress',
        nextThoughtNeeded: true,
        message: 'Score 80% needs 15% improvement',
      };

      const status = evaluator.getCompletionStatus(80, 12, completionResult);
      
      expect(status.isComplete).toBe(false);
      expect(status.reason).toBe('in_progress');
      expect(status.currentLoop).toBe(12);
      expect(status.score).toBe(80);
      expect(status.threshold).toBe(95); // At loop 12, should target tier 1
      expect(status.message).toBe('Score 80% needs 15% improvement');
    });

    it('should generate completion status for completed evaluation', () => {
      const completionResult: CompletionResult = {
        isComplete: true,
        reason: 'score_95_at_10',
        nextThoughtNeeded: false,
        message: 'Tier 1 completion achieved',
      };

      const status = evaluator.getCompletionStatus(96, 12, completionResult);
      
      expect(status.isComplete).toBe(true);
      expect(status.reason).toBe('score_95_at_10');
      expect(status.currentLoop).toBe(12);
      expect(status.score).toBe(96);
      expect(status.message).toBe('Tier 1 completion achieved');
    });

    it('should use appropriate threshold for different loop counts', () => {
      const inProgressResult: CompletionResult = {
        isComplete: false,
        reason: 'in_progress',
        nextThoughtNeeded: true,
      };

      // Early loops should target tier 1 (95%)
      const status1 = evaluator.getCompletionStatus(80, 5, inProgressResult);
      expect(status1.threshold).toBe(95);

      // Mid loops should target tier 2 (90%)
      const status2 = evaluator.getCompletionStatus(80, 16, inProgressResult);
      expect(status2.threshold).toBe(90);

      // Late loops should target tier 3 (85%)
      const status3 = evaluator.getCompletionStatus(80, 21, inProgressResult);
      expect(status3.threshold).toBe(85);
    });
  });

  describe('configuration management', () => {
    it('should update criteria configuration', () => {
      const newCriteria: Partial<CompletionCriteria> = {
        tier1: { score: 98, maxLoops: 8 },
        hardStop: { maxLoops: 30 },
      };

      evaluator.updateCriteria(newCriteria);
      const criteria = evaluator.getCriteria();
      
      expect(criteria.tier1.score).toBe(98);
      expect(criteria.tier1.maxLoops).toBe(8);
      expect(criteria.hardStop.maxLoops).toBe(30);
      expect(criteria.tier2.score).toBe(90); // Should preserve unchanged values
    });

    it('should get current criteria configuration', () => {
      const criteria = evaluator.getCriteria();
      
      expect(criteria).toHaveProperty('tier1');
      expect(criteria).toHaveProperty('tier2');
      expect(criteria).toHaveProperty('tier3');
      expect(criteria).toHaveProperty('hardStop');
      expect(criteria).toHaveProperty('stagnationCheck');
    });
  });
});

describe('createCompletionEvaluator', () => {
  it('should create evaluator with default criteria', () => {
    const evaluator = createCompletionEvaluator();
    const criteria = evaluator.getCriteria();
    
    expect(criteria).toEqual(DEFAULT_COMPLETION_CRITERIA);
  });

  it('should create evaluator with custom criteria', () => {
    const customCriteria: Partial<CompletionCriteria> = {
      tier1: { score: 98, maxLoops: 8 },
      hardStop: { maxLoops: 30 },
    };

    const evaluator = createCompletionEvaluator(customCriteria);
    const criteria = evaluator.getCriteria();
    
    expect(criteria.tier1.score).toBe(98);
    expect(criteria.tier1.maxLoops).toBe(8);
    expect(criteria.hardStop.maxLoops).toBe(30);
    expect(criteria.tier2).toEqual(DEFAULT_COMPLETION_CRITERIA.tier2); // Should merge with defaults
  });
});

describe('validateCompletionCriteria', () => {
  it('should validate correct criteria', () => {
    const validation = validateCompletionCriteria(DEFAULT_COMPLETION_CRITERIA);
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid score ranges', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      tier1: { score: 150, maxLoops: 10 }, // Invalid: > 100
    };

    const validation = validateCompletionCriteria(invalidCriteria);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Tier 1 score must be between 0 and 100');
  });

  it('should detect invalid loop counts', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      tier1: { score: 95, maxLoops: 0 }, // Invalid: < 1
    };

    const validation = validateCompletionCriteria(invalidCriteria);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Tier 1 maxLoops must be at least 1');
  });

  it('should detect incorrect loop progression', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      tier2: { score: 90, maxLoops: 8 }, // Invalid: < tier1.maxLoops (10)
    };

    const validation = validateCompletionCriteria(invalidCriteria);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Tier 2 maxLoops must be >= Tier 1 maxLoops');
  });

  it('should detect incorrect score progression', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      tier2: { score: 98, maxLoops: 15 }, // Invalid: > tier1.score (95)
    };

    const validation = validateCompletionCriteria(invalidCriteria);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Tier 1 score should be >= Tier 2 score');
  });

  it('should detect invalid stagnation threshold', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      stagnationCheck: { startLoop: 10, similarityThreshold: 1.5 }, // Invalid: > 1
    };

    const validation = validateCompletionCriteria(invalidCriteria);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Stagnation similarity threshold must be between 0 and 1');
  });

  it('should detect invalid stagnation start loop', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      stagnationCheck: { startLoop: 0, similarityThreshold: 0.95 }, // Invalid: < 1
    };

    const validation = validateCompletionCriteria(invalidCriteria);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Stagnation check startLoop must be at least 1');
  });

  it('should detect hard stop before tier 3', () => {
    const invalidCriteria: CompletionCriteria = {
      ...DEFAULT_COMPLETION_CRITERIA,
      hardStop: { maxLoops: 15 }, // Invalid: < tier3.maxLoops (20)
    };

    const validation = validateCompletionCriteria(invalidCriteria);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Hard stop maxLoops must be >= Tier 3 maxLoops');
  });

  it('should validate multiple errors', () => {
    const invalidCriteria: CompletionCriteria = {
      tier1: { score: 150, maxLoops: 0 }, // Multiple errors
      tier2: { score: 90, maxLoops: 15 },
      tier3: { score: 85, maxLoops: 20 },
      hardStop: { maxLoops: 25 },
      stagnationCheck: { startLoop: 0, similarityThreshold: 1.5 },
    };

    const validation = validateCompletionCriteria(invalidCriteria);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(1);
    expect(validation.errors).toContain('Tier 1 score must be between 0 and 100');
    expect(validation.errors).toContain('Tier 1 maxLoops must be at least 1');
    expect(validation.errors).toContain('Stagnation check startLoop must be at least 1');
    expect(validation.errors).toContain('Stagnation similarity threshold must be between 0 and 1');
  });
});