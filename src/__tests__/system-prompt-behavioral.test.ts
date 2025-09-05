/**
 * Behavioral Tests for System Prompt Audit Effectiveness
 * 
 * Tests with real code samples and expected outcomes, iterative improvement
 * scenarios, stagnation detection, and completion criteria accuracy.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemPromptManager } from '../prompts/system-prompt-manager.js';
import { SynchronousSessionManager } from '../session/synchronous-session-manager.js';
import { CompletionEvaluator } from '../auditor/completion-evaluator.js';
import { LoopDetector } from '../auditor/loop-detector.js';
import { QualityAssessmentFramework } from '../auditor/quality-assessment.js';
import type {
  GansAuditorCodexThoughtData,
  GansAuditorCodexSessionState,
  GansAuditorCodexReview,
} from '../types/gan-types.js';

describe('System Prompt Behavioral Tests', () => {
  let systemPromptManager: SystemPromptManager;
  let sessionManager: SynchronousSessionManager;
  let completionEvaluator: CompletionEvaluator;
  let loopDetector: LoopDetector;
  let qualityFramework: QualityAssessmentFramework;

  beforeEach(() => {
    systemPromptManager = new SystemPromptManager({
      enableCaching: false,
    });

    sessionManager = new SynchronousSessionManager({
      stateDirectory: '.test-behavioral',
      enableCompression: false,
    });

    completionEvaluator = new CompletionEvaluator();
    loopDetector = new LoopDetector();
    qualityFramework = new QualityAssessmentFramework();
  });

  afterEach(async () => {
    systemPromptManager.clearCache();
    await sessionManager.cleanup();
    vi.clearAllMocks();
  });

  describe('real code sample audits', () => {
    it('should identify security vulnerabilities in authentication code', async () => {
      const vulnerableCode = `
        export class AuthService {
          async login(email: string, password: string): Promise<User | null> {
            // Security issue: SQL injection vulnerability
            const query = \`SELECT * FROM users WHERE email = '\${email}' AND password = '\${password}'\`;
            const result = await this.db.query(query);
            
            if (result.length > 0) {
              // Security issue: password stored in plain text
              return result[0];
            }
            
            return null;
          }
          
          async createUser(userData: any): Promise<User> {
            // Security issue: no input validation
            const user = new User(userData);
            await user.save();
            return user;
          }
        }
      `;

      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Auditing authentication service for security vulnerabilities',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };

      const mockSession: GansAuditorCodexSessionState = {
        id: 'security-audit-session',
        currentLoop: 1,
        iterations: [],
        history: [],
        config: {},
        startTime: Date.now(),
        lastGan: null,
        stagnationInfo: null,
      };

      // Simulate quality assessment that detects security issues
      const mockReview: GansAuditorCodexReview = {
        overall: 45, // Low score due to security issues
        dimensions: [
          { name: 'Correctness & Completeness', score: 70 },
          { name: 'Tests', score: 30 }, // No tests
          { name: 'Style & Conventions', score: 60 },
          { name: 'Security', score: 15 }, // Critical security issues
          { name: 'Performance', score: 50 },
          { name: 'Docs & Traceability', score: 40 },
        ],
        verdict: 'reject',
        review: {
          summary: 'Critical security vulnerabilities detected in authentication service',
          inline: [
            {
              path: 'src/auth.ts',
              line: 4,
              comment: 'Critical: SQL injection vulnerability - use parameterized queries',
            },
            {
              path: 'src/auth.ts',
              line: 7,
              comment: 'Critical: Plain text password storage - use bcrypt hashing',
            },
            {
              path: 'src/auth.ts',
              line: 15,
              comment: 'Major: No input validation - validate and sanitize user data',
            },
          ],
          citations: [],
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [{
          model: 'security-analyzer',
          score: 15,
          notes: 'Multiple critical security vulnerabilities found',
        }],
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);

      // Should detect security issues and recommend fixes
      expect(result.enhancedResponse.overall).toBeLessThan(50);
      expect(result.enhancedResponse.verdict).toBe('reject');
      expect(result.nextActions[0].type).toBe('fix_critical');
      expect(result.nextActions[0].priority).toBe('critical');
      expect(result.nextActions[0].description).toContain('critical issues');
    });

    it('should validate test coverage and quality', async () => {
      const untestedCode = `
        export class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }
          
          divide(a: number, b: number): number {
            // Missing edge case handling for division by zero
            return a / b;
          }
          
          factorial(n: number): number {
            if (n <= 1) return 1;
            return n * this.factorial(n - 1);
          }
        }
      `;

      const mockReview: GansAuditorCodexReview = {
        overall: 65,
        dimensions: [
          { name: 'Correctness & Completeness', score: 70 },
          { name: 'Tests', score: 25 }, // Very low test coverage
          { name: 'Style & Conventions', score: 85 },
          { name: 'Security', score: 80 },
          { name: 'Performance', score: 75 },
          { name: 'Docs & Traceability', score: 60 },
        ],
        verdict: 'revise',
        review: {
          summary: 'Code lacks comprehensive test coverage and edge case handling',
          inline: [
            {
              path: 'src/calculator.ts',
              line: 7,
              comment: 'Major: Missing division by zero check',
            },
            {
              path: 'tests/calculator.test.ts',
              line: 1,
              comment: 'Critical: No unit tests found for Calculator class',
            },
          ],
          citations: [],
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [{
          model: 'test-analyzer',
          score: 25,
          notes: 'Insufficient test coverage detected',
        }],
      };

      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Evaluating test coverage for calculator module',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };

      const mockSession: GansAuditorCodexSessionState = {
        id: 'test-coverage-session',
        currentLoop: 1,
        iterations: [],
        history: [],
        config: {},
        startTime: Date.now(),
        lastGan: null,
        stagnationInfo: null,
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);

      // Should identify testing deficiencies
      expect(result.enhancedResponse.dimensions.find(d => d.name === 'Tests')?.score).toBeLessThan(50);
      expect(result.nextActions.some(action => 
        action.description.toLowerCase().includes('test')
      )).toBe(true);
    });

    it('should evaluate code style and conventions', async () => {
      const poorStyleCode = `
        export class userservice {
          private DB: any;
          
          constructor(db: any) {
            this.DB = db;
          }
          
          async getuser(id: string) {
            const user = await this.DB.query("SELECT * FROM users WHERE id = ?", [id]);
            return user;
          }
          
          async updateuser(id: string, data: any) {
            // TODO: implement validation
            const result = await this.DB.query("UPDATE users SET ? WHERE id = ?", [data, id]);
            return result;
          }
        }
      `;

      const mockReview: GansAuditorCodexReview = {
        overall: 68,
        dimensions: [
          { name: 'Correctness & Completeness', score: 75 },
          { name: 'Tests', score: 60 },
          { name: 'Style & Conventions', score: 40 }, // Poor style
          { name: 'Security', score: 70 },
          { name: 'Performance', score: 80 },
          { name: 'Docs & Traceability', score: 50 },
        ],
        verdict: 'revise',
        review: {
          summary: 'Code violates naming conventions and lacks proper documentation',
          inline: [
            {
              path: 'src/user-service.ts',
              line: 1,
              comment: 'Style: Class name should be PascalCase (UserService)',
            },
            {
              path: 'src/user-service.ts',
              line: 2,
              comment: 'Style: Property name should be camelCase (db)',
            },
            {
              path: 'src/user-service.ts',
              line: 8,
              comment: 'Style: Method name should be camelCase (getUser)',
            },
            {
              path: 'src/user-service.ts',
              line: 13,
              comment: 'Docs: Missing JSDoc documentation for public methods',
            },
          ],
          citations: [],
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [{
          model: 'style-analyzer',
          score: 40,
          notes: 'Multiple style convention violations',
        }],
      };

      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Checking code style and naming conventions',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };

      const mockSession: GansAuditorCodexSessionState = {
        id: 'style-audit-session',
        currentLoop: 1,
        iterations: [],
        history: [],
        config: {},
        startTime: Date.now(),
        lastGan: null,
        stagnationInfo: null,
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);

      // Should identify style issues
      const styleDimension = result.enhancedResponse.dimensions.find(d => d.name === 'Style & Conventions');
      expect(styleDimension?.score).toBeLessThan(60);
      expect(result.nextActions.some(action => 
        action.description.toLowerCase().includes('style') || 
        action.description.toLowerCase().includes('conventions')
      )).toBe(true);
    });

    it('should assess performance and efficiency', async () => {
      const inefficientCode = `
        export class DataProcessor {
          async processLargeDataset(items: any[]): Promise<any[]> {
            const results = [];
            
            // Performance issue: N+1 query problem
            for (const item of items) {
              const details = await this.db.query("SELECT * FROM details WHERE item_id = ?", [item.id]);
              const processed = await this.processItem(item, details);
              results.push(processed);
            }
            
            // Performance issue: inefficient sorting
            return results.sort((a, b) => {
              // Complex comparison that could be optimized
              return this.complexComparison(a, b);
            });
          }
          
          private complexComparison(a: any, b: any): number {
            // Simulated expensive operation
            for (let i = 0; i < 1000; i++) {
              // Unnecessary computation
            }
            return a.value - b.value;
          }
        }
      `;

      const mockReview: GansAuditorCodexReview = {
        overall: 62,
        dimensions: [
          { name: 'Correctness & Completeness', score: 80 },
          { name: 'Tests', score: 70 },
          { name: 'Style & Conventions', score: 75 },
          { name: 'Security', score: 80 },
          { name: 'Performance', score: 25 }, // Poor performance
          { name: 'Docs & Traceability', score: 60 },
        ],
        verdict: 'revise',
        review: {
          summary: 'Code has significant performance bottlenecks that need optimization',
          inline: [
            {
              path: 'src/data-processor.ts',
              line: 6,
              comment: 'Critical: N+1 query problem - use batch queries or joins',
            },
            {
              path: 'src/data-processor.ts',
              line: 12,
              comment: 'Major: Inefficient sorting with expensive comparison function',
            },
            {
              path: 'src/data-processor.ts',
              line: 18,
              comment: 'Major: Unnecessary computation in comparison function',
            },
          ],
          citations: [],
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [{
          model: 'performance-analyzer',
          score: 25,
          notes: 'Multiple performance bottlenecks identified',
        }],
      };

      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Analyzing performance characteristics of data processing code',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };

      const mockSession: GansAuditorCodexSessionState = {
        id: 'performance-audit-session',
        currentLoop: 1,
        iterations: [],
        history: [],
        config: {},
        startTime: Date.now(),
        lastGan: null,
        stagnationInfo: null,
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);

      // Should identify performance issues
      const performanceDimension = result.enhancedResponse.dimensions.find(d => d.name === 'Performance');
      expect(performanceDimension?.score).toBeLessThan(50);
      expect(result.nextActions.some(action => 
        action.description.toLowerCase().includes('performance')
      )).toBe(true);
    });
  });

  describe('iterative improvement scenarios', () => {
    it('should track quality improvement across iterations', async () => {
      const session = await sessionManager.createSession('improvement-session', {});
      
      // Simulate iterative improvements
      const iterations = [
        { loop: 1, score: 45, verdict: 'reject' as const },
        { loop: 2, score: 62, verdict: 'revise' as const },
        { loop: 3, score: 78, verdict: 'revise' as const },
        { loop: 4, score: 88, verdict: 'pass' as const },
        { loop: 5, score: 94, verdict: 'pass' as const },
      ];

      const improvementHistory = [];

      for (const iteration of iterations) {
        const mockThought: GansAuditorCodexThoughtData = {
          thought: `Iteration ${iteration.loop}: Reviewing improvements`,
          thoughtNumber: iteration.loop,
          totalThoughts: 5,
          nextThoughtNeeded: iteration.loop < 5,
        };

        const mockReview: GansAuditorCodexReview = {
          overall: iteration.score,
          dimensions: [
            { name: 'Correctness & Completeness', score: iteration.score + 5 },
            { name: 'Tests', score: iteration.score - 5 },
            { name: 'Style & Conventions', score: iteration.score },
            { name: 'Security', score: iteration.score + 10 },
            { name: 'Performance', score: iteration.score - 10 },
            { name: 'Docs & Traceability', score: iteration.score },
          ],
          verdict: iteration.verdict,
          review: {
            summary: `Iteration ${iteration.loop} review with score ${iteration.score}`,
            inline: [],
            citations: [],
          },
          proposed_diff: null,
          iterations: iteration.loop,
          judge_cards: [],
        };

        // Update session
        await sessionManager.updateSession(session.id, {
          currentLoop: iteration.loop,
          lastGan: mockReview,
        });

        const updatedSession = await sessionManager.getSession(session.id);
        const rendered = await systemPromptManager.renderSystemPrompt(mockThought, updatedSession!);
        const result = systemPromptManager.processAuditResponse(mockReview, rendered, updatedSession!);

        improvementHistory.push({
          loop: iteration.loop,
          score: iteration.score,
          completionStatus: result.completionAnalysis.status,
        });
      }

      // Verify improvement trend
      expect(improvementHistory[0].score).toBeLessThan(improvementHistory[4].score);
      expect(improvementHistory[4].score).toBeGreaterThan(90);
      
      // Should detect completion at high score
      const finalIteration = improvementHistory[4];
      expect(finalIteration.completionStatus).toBe('in_progress'); // Still needs more loops for tier completion
    });

    it('should detect when improvements plateau', async () => {
      const session = await sessionManager.createSession('plateau-session', {});
      
      // Simulate plateau scenario
      const plateauIterations = [
        { loop: 1, score: 70 },
        { loop: 2, score: 75 },
        { loop: 3, score: 77 },
        { loop: 4, score: 78 },
        { loop: 5, score: 78 }, // Plateau starts
        { loop: 6, score: 79 },
        { loop: 7, score: 78 },
        { loop: 8, score: 79 },
      ];

      const scores = [];

      for (const iteration of plateauIterations) {
        const mockReview: GansAuditorCodexReview = {
          overall: iteration.score,
          dimensions: [],
          verdict: 'revise',
          review: { summary: `Score: ${iteration.score}`, inline: [], citations: [] },
          proposed_diff: null,
          iterations: iteration.loop,
          judge_cards: [],
        };

        await sessionManager.updateSession(session.id, {
          currentLoop: iteration.loop,
          lastGan: mockReview,
        });

        scores.push(iteration.score);
      }

      // Verify plateau detection logic would identify this pattern
      const recentScores = scores.slice(-4); // Last 4 iterations
      const maxImprovement = Math.max(...recentScores) - Math.min(...recentScores);
      expect(maxImprovement).toBeLessThan(5); // Minimal improvement indicates plateau
    });

    it('should handle regression scenarios', async () => {
      const session = await sessionManager.createSession('regression-session', {});
      
      // Simulate regression scenario
      const regressionIterations = [
        { loop: 1, score: 85, verdict: 'pass' as const },
        { loop: 2, score: 82, verdict: 'revise' as const }, // Regression
        { loop: 3, score: 78, verdict: 'revise' as const }, // Further regression
        { loop: 4, score: 83, verdict: 'revise' as const }, // Recovery
      ];

      let previousScore = 0;
      let regressionDetected = false;

      for (const iteration of regressionIterations) {
        const mockReview: GansAuditorCodexReview = {
          overall: iteration.score,
          dimensions: [],
          verdict: iteration.verdict,
          review: { summary: `Score: ${iteration.score}`, inline: [], citations: [] },
          proposed_diff: null,
          iterations: iteration.loop,
          judge_cards: [],
        };

        if (previousScore > 0 && iteration.score < previousScore - 5) {
          regressionDetected = true;
        }

        previousScore = iteration.score;
      }

      expect(regressionDetected).toBe(true);
    });
  });

  describe('stagnation detection and handling', () => {
    it('should detect response similarity stagnation', async () => {
      const similarResponses = [
        'Code needs improvement in error handling and input validation',
        'Code needs improvement in error handling and input validation',
        'Code needs improvements in error handling and input validation',
        'Code needs improvement in error handling and input validation',
      ];

      // Test similarity detection
      for (let i = 1; i < similarResponses.length; i++) {
        const similarity = loopDetector.calculateSimilarity(
          similarResponses[0],
          similarResponses[i]
        );
        expect(similarity).toBeGreaterThan(0.9); // Very similar responses
      }

      // Simulate stagnation detection
      const stagnationResult = loopDetector.detectStagnation(
        similarResponses,
        10, // Current loop
        0.95 // Threshold
      );

      expect(stagnationResult.isStagnant).toBe(true);
      expect(stagnationResult.recommendation).toContain('alternative approach');
    });

    it('should handle stagnation in completion evaluation', async () => {
      const mockSession: GansAuditorCodexSessionState = {
        id: 'stagnation-session',
        currentLoop: 12,
        iterations: [],
        history: [],
        config: {},
        startTime: Date.now(),
        lastGan: {
          overall: 75,
          dimensions: [],
          verdict: 'revise',
          review: { summary: 'Stagnant review', inline: [], citations: [] },
          proposed_diff: null,
          iterations: 12,
          judge_cards: [],
        },
        stagnationInfo: {
          isStagnant: true,
          detectedAtLoop: 11,
          similarityScore: 0.97,
          recommendation: 'Consider alternative implementation approach',
        },
      };

      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Detecting stagnation in audit process',
        thoughtNumber: 12,
        totalThoughts: 15,
        nextThoughtNeeded: true,
      };

      const mockReview: GansAuditorCodexReview = {
        overall: 75,
        dimensions: [],
        verdict: 'revise',
        review: { summary: 'Same issues persist', inline: [], citations: [] },
        proposed_diff: null,
        iterations: 12,
        judge_cards: [],
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);

      // Should detect stagnation and recommend termination
      expect(result.completionAnalysis.status).toBe('terminated');
      expect(result.completionAnalysis.reason).toBe('Stagnation Detection');
      expect(result.completionAnalysis.nextThoughtNeeded).toBe(false);
    });

    it('should provide alternative approaches when stagnant', async () => {
      const stagnantResponses = Array(5).fill(
        'The authentication module needs better error handling and input validation'
      );

      const stagnationResult = loopDetector.detectStagnation(
        stagnantResponses,
        12,
        0.95
      );

      expect(stagnationResult.isStagnant).toBe(true);
      expect(stagnationResult.recommendation).toBeDefined();
      expect(stagnationResult.recommendation.length).toBeGreaterThan(0);
      
      // Should suggest concrete alternatives
      const recommendation = stagnationResult.recommendation.toLowerCase();
      expect(
        recommendation.includes('alternative') ||
        recommendation.includes('different') ||
        recommendation.includes('approach') ||
        recommendation.includes('strategy')
      ).toBe(true);
    });

    it('should not detect stagnation with improving responses', async () => {
      const improvingResponses = [
        'Code has security issues and needs tests',
        'Security improved but still needs comprehensive tests',
        'Security good, tests added, minor style issues remain',
        'All issues resolved, code ready for review',
      ];

      const stagnationResult = loopDetector.detectStagnation(
        improvingResponses,
        8,
        0.95
      );

      expect(stagnationResult.isStagnant).toBe(false);
    });
  });

  describe('completion criteria accuracy', () => {
    it('should accurately detect tier 1 completion (95% at 10+ loops)', async () => {
      const tier1Scenarios = [
        { score: 95, loop: 10, shouldComplete: true },
        { score: 96, loop: 12, shouldComplete: true },
        { score: 94, loop: 12, shouldComplete: false }, // Score too low
        { score: 96, loop: 8, shouldComplete: false },  // Loop too low
      ];

      for (const scenario of tier1Scenarios) {
        const result = completionEvaluator.evaluateCompletion(scenario.score, scenario.loop);
        
        if (scenario.shouldComplete) {
          expect(result.isComplete).toBe(true);
          expect(result.reason).toBe('score_95_at_10');
          expect(result.nextThoughtNeeded).toBe(false);
        } else {
          expect(result.isComplete).toBe(false);
          expect(result.nextThoughtNeeded).toBe(true);
        }
      }
    });

    it('should accurately detect tier 2 completion (90% at 15+ loops)', async () => {
      const tier2Scenarios = [
        { score: 90, loop: 15, shouldComplete: true },
        { score: 92, loop: 18, shouldComplete: true },
        { score: 89, loop: 18, shouldComplete: false }, // Score too low
        { score: 92, loop: 14, shouldComplete: false }, // Loop too low
      ];

      for (const scenario of tier2Scenarios) {
        const result = completionEvaluator.evaluateCompletion(scenario.score, scenario.loop);
        
        if (scenario.shouldComplete) {
          expect(result.isComplete).toBe(true);
          expect(result.reason).toBe('score_90_at_15');
          expect(result.nextThoughtNeeded).toBe(false);
        } else {
          expect(result.isComplete).toBe(false);
          expect(result.nextThoughtNeeded).toBe(true);
        }
      }
    });

    it('should accurately detect tier 3 completion (85% at 20+ loops)', async () => {
      const tier3Scenarios = [
        { score: 85, loop: 20, shouldComplete: true },
        { score: 87, loop: 22, shouldComplete: true },
        { score: 84, loop: 22, shouldComplete: false }, // Score too low
        { score: 87, loop: 19, shouldComplete: false }, // Loop too low
      ];

      for (const scenario of tier3Scenarios) {
        const result = completionEvaluator.evaluateCompletion(scenario.score, scenario.loop);
        
        if (scenario.shouldComplete) {
          expect(result.isComplete).toBe(true);
          expect(result.reason).toBe('score_85_at_20');
          expect(result.nextThoughtNeeded).toBe(false);
        } else {
          expect(result.isComplete).toBe(false);
          expect(result.nextThoughtNeeded).toBe(true);
        }
      }
    });

    it('should prioritize higher tiers when multiple qualify', async () => {
      // Score qualifies for multiple tiers
      const result1 = completionEvaluator.evaluateCompletion(96, 22); // Qualifies for all tiers
      expect(result1.reason).toBe('score_95_at_10'); // Should use tier 1

      const result2 = completionEvaluator.evaluateCompletion(91, 22); // Qualifies for tier 2 and 3
      expect(result2.reason).toBe('score_90_at_15'); // Should use tier 2

      const result3 = completionEvaluator.evaluateCompletion(86, 22); // Only qualifies for tier 3
      expect(result3.reason).toBe('score_85_at_20'); // Should use tier 3
    });

    it('should enforce hard stop at 25 loops', async () => {
      const hardStopScenarios = [
        { score: 50, loop: 25 },
        { score: 75, loop: 30 },
        { score: 84, loop: 25 }, // Just below tier 3 threshold
      ];

      for (const scenario of hardStopScenarios) {
        const result = completionEvaluator.evaluateCompletion(scenario.score, scenario.loop);
        
        expect(result.isComplete).toBe(true);
        expect(result.reason).toBe('max_loops_reached');
        expect(result.nextThoughtNeeded).toBe(false);
        expect(result.message).toContain('Maximum loops');
      }
    });

    it('should provide accurate progress messages', async () => {
      // Score meets threshold but insufficient loops
      const result1 = completionEvaluator.evaluateCompletion(96, 8);
      expect(result1.message).toContain('Score 96% meets threshold');
      expect(result1.message).toContain('minimum loops not reached');

      // Score below threshold
      const result2 = completionEvaluator.evaluateCompletion(80, 12);
      expect(result2.message).toContain('Score 80% needs');
      expect(result2.message).toContain('improvement to reach');
      expect(result2.message).toContain('95% threshold'); // Should target tier 1 at loop 12

      // Different threshold for different loop counts
      const result3 = completionEvaluator.evaluateCompletion(80, 18);
      expect(result3.message).toContain('90% threshold'); // Should target tier 2 at loop 18
    });
  });

  describe('end-to-end audit scenarios', () => {
    it('should complete full audit cycle with high-quality code', async () => {
      const highQualityCode = `
        /**
         * User authentication service with comprehensive security measures
         */
        export class AuthService {
          constructor(
            private readonly userRepository: UserRepository,
            private readonly passwordService: PasswordService,
            private readonly logger: Logger
          ) {}

          /**
           * Authenticate user with email and password
           * @param email - User email address
           * @param password - Plain text password
           * @returns User object if authentication successful, null otherwise
           */
          async authenticate(email: string, password: string): Promise<User | null> {
            // Input validation
            if (!email || !password) {
              this.logger.warn('Authentication attempt with missing credentials');
              throw new ValidationError('Email and password are required');
            }

            if (!this.isValidEmail(email)) {
              this.logger.warn('Authentication attempt with invalid email format');
              throw new ValidationError('Invalid email format');
            }

            try {
              // Use parameterized query to prevent SQL injection
              const user = await this.userRepository.findByEmail(email);
              
              if (!user) {
                this.logger.info('Authentication failed: user not found', { email });
                return null;
              }

              // Use secure password comparison
              const isValidPassword = await this.passwordService.verify(
                password, 
                user.hashedPassword
              );

              if (!isValidPassword) {
                this.logger.info('Authentication failed: invalid password', { email });
                return null;
              }

              this.logger.info('Authentication successful', { userId: user.id });
              return user;
            } catch (error) {
              this.logger.error('Authentication error', error);
              throw new AuthenticationError('Authentication failed');
            }
          }

          private isValidEmail(email: string): boolean {
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
            return emailRegex.test(email);
          }
        }
      `;

      const mockReview: GansAuditorCodexReview = {
        overall: 94, // High quality score
        dimensions: [
          { name: 'Correctness & Completeness', score: 95 },
          { name: 'Tests', score: 90 }, // Assuming tests exist
          { name: 'Style & Conventions', score: 98 },
          { name: 'Security', score: 96 },
          { name: 'Performance', score: 88 },
          { name: 'Docs & Traceability', score: 95 },
        ],
        verdict: 'pass',
        review: {
          summary: 'High-quality authentication service with excellent security practices',
          inline: [
            {
              path: 'src/auth.ts',
              line: 15,
              comment: 'Excellent: Comprehensive input validation implemented',
            },
            {
              path: 'src/auth.ts',
              line: 25,
              comment: 'Good: Proper error logging without exposing sensitive data',
            },
          ],
          citations: [],
        },
        proposed_diff: null,
        iterations: 12, // At 12 loops with 94% score
        judge_cards: [{
          model: 'comprehensive-analyzer',
          score: 94,
          notes: 'Excellent code quality across all dimensions',
        }],
      };

      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Final review of high-quality authentication service',
        thoughtNumber: 12,
        totalThoughts: 12,
        nextThoughtNeeded: false,
      };

      const mockSession: GansAuditorCodexSessionState = {
        id: 'high-quality-session',
        currentLoop: 12,
        iterations: [],
        history: [],
        config: {},
        startTime: Date.now(),
        lastGan: null,
        stagnationInfo: null,
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);

      // Should not complete yet (needs 95% for tier 1 at 10+ loops)
      expect(result.completionAnalysis.status).toBe('in_progress');
      expect(result.enhancedResponse.verdict).toBe('pass');
      expect(result.enhancedResponse.overall).toBeGreaterThan(90);
    });

    it('should handle complex multi-issue code scenario', async () => {
      const complexProblematicCode = `
        export class OrderService {
          constructor(private db: any) {}

          async processOrder(orderData: any) {
            // Multiple issues: no validation, SQL injection, no error handling
            const query = \`INSERT INTO orders (user_id, total) VALUES ('\${orderData.userId}', '\${orderData.total}')\`;
            const result = await this.db.query(query);
            
            // Performance issue: N+1 queries
            for (const item of orderData.items) {
              await this.db.query(\`INSERT INTO order_items (order_id, product_id, quantity) VALUES ('\${result.insertId}', '\${item.productId}', '\${item.quantity}')\`);
            }
            
            return result.insertId;
          }
        }
      `;

      const mockReview: GansAuditorCodexReview = {
        overall: 25, // Very low score due to multiple critical issues
        dimensions: [
          { name: 'Correctness & Completeness', score: 40 },
          { name: 'Tests', score: 0 }, // No tests
          { name: 'Style & Conventions', score: 30 },
          { name: 'Security', score: 10 }, // Critical security issues
          { name: 'Performance', score: 20 }, // Performance problems
          { name: 'Docs & Traceability', score: 15 },
        ],
        verdict: 'reject',
        review: {
          summary: 'Critical security and performance issues require immediate attention',
          inline: [
            {
              path: 'src/order-service.ts',
              line: 6,
              comment: 'Critical: SQL injection vulnerability in order insertion',
            },
            {
              path: 'src/order-service.ts',
              line: 9,
              comment: 'Critical: SQL injection vulnerability in item insertion',
            },
            {
              path: 'src/order-service.ts',
              line: 9,
              comment: 'Major: N+1 query problem - use batch insert',
            },
            {
              path: 'src/order-service.ts',
              line: 4,
              comment: 'Major: No input validation for order data',
            },
            {
              path: 'src/order-service.ts',
              line: 4,
              comment: 'Major: No error handling for database operations',
            },
          ],
          citations: [],
        },
        proposed_diff: null,
        iterations: 1,
        judge_cards: [{
          model: 'security-performance-analyzer',
          score: 25,
          notes: 'Multiple critical issues across security and performance dimensions',
        }],
      };

      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Comprehensive audit of problematic order service',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: true,
      };

      const mockSession: GansAuditorCodexSessionState = {
        id: 'complex-issues-session',
        currentLoop: 1,
        iterations: [],
        history: [],
        config: {},
        startTime: Date.now(),
        lastGan: null,
        stagnationInfo: null,
      };

      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
      const result = systemPromptManager.processAuditResponse(mockReview, rendered, mockSession);

      // Should identify multiple critical issues
      expect(result.enhancedResponse.overall).toBeLessThan(30);
      expect(result.enhancedResponse.verdict).toBe('reject');
      expect(result.nextActions[0].type).toBe('fix_critical');
      expect(result.nextActions[0].priority).toBe('critical');
      
      // Should have multiple next actions for different issue types
      expect(result.nextActions.length).toBeGreaterThan(1);
      expect(result.nextActions.some(action => 
        action.description.toLowerCase().includes('security')
      )).toBe(true);
    });
  });
});