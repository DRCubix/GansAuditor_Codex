/**
 * Unit Tests for Quality Assessment Calculations
 * 
 * Tests for quality dimension scoring, weighted averages, and assessment framework.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  QualityAssessmentFramework,
  createDefaultQualityFramework,
  validateQualityDimensions,
  DEFAULT_QUALITY_DIMENSIONS,
  DEFAULT_QUALITY_FRAMEWORK_CONFIG,
  type QualityDimension,
  type QualityAssessment,
  type QualityEvaluationContext,
  type DimensionEvaluation,
  type CriterionEvaluation,
} from '../quality-assessment.js';

describe('QualityAssessmentFramework', () => {
  let framework: QualityAssessmentFramework;
  let mockContext: QualityEvaluationContext;
  let mockCode: string;

  beforeEach(() => {
    framework = createDefaultQualityFramework();
    
    mockContext = {
      filePaths: ['src/auth.ts', 'src/user.ts'],
      repositoryPath: '/test/repo',
      specDocuments: ['requirements.md'],
      steeringDocuments: ['coding-standards.md'],
      sessionId: 'test-session-123',
    };

    mockCode = `
      export class UserService {
        async authenticate(email: string, password: string): Promise<User | null> {
          if (!email || !password) {
            throw new Error('Email and password are required');
          }
          
          const user = await this.userRepository.findByEmail(email);
          if (!user) {
            return null;
          }
          
          const isValid = await this.passwordService.verify(password, user.hashedPassword);
          return isValid ? user : null;
        }
      }
    `;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default dimensions and config', () => {
      const defaultFramework = new QualityAssessmentFramework();
      expect(defaultFramework).toBeDefined();
    });

    it('should initialize with custom dimensions', () => {
      const customDimensions: QualityDimension[] = [
        {
          id: 'custom_dimension',
          name: 'Custom Dimension',
          weight: 1.0,
          description: 'A custom quality dimension',
          minThreshold: 70,
          required: true,
          criteria: [{
            id: 'custom_criterion',
            name: 'Custom Criterion',
            description: 'A custom criterion',
            weight: 1.0,
            evaluationMethod: 'manual_review',
            expectedEvidence: ['manual_review'],
          }],
        },
      ];

      const customFramework = new QualityAssessmentFramework(customDimensions);
      expect(customFramework).toBeDefined();
    });

    it('should validate dimension weights sum to 1.0', () => {
      const invalidDimensions: QualityDimension[] = [
        {
          id: 'dim1',
          name: 'Dimension 1',
          weight: 0.6, // Total will be 1.1 with dim2
          description: 'First dimension',
          minThreshold: 70,
          required: true,
          criteria: [{
            id: 'crit1',
            name: 'Criterion 1',
            description: 'Test criterion',
            weight: 1.0,
            evaluationMethod: 'automated_check',
            expectedEvidence: ['test'],
          }],
        },
        {
          id: 'dim2',
          name: 'Dimension 2',
          weight: 0.5, // Total will be 1.1
          description: 'Second dimension',
          minThreshold: 70,
          required: true,
          criteria: [{
            id: 'crit2',
            name: 'Criterion 2',
            description: 'Test criterion',
            weight: 1.0,
            evaluationMethod: 'automated_check',
            expectedEvidence: ['test'],
          }],
        },
      ];

      expect(() => {
        new QualityAssessmentFramework(invalidDimensions);
      }).toThrow('Dimension weights must sum to 1.0');
    });

    it('should validate criterion weights within dimensions', () => {
      const invalidDimensions: QualityDimension[] = [
        {
          id: 'dim1',
          name: 'Dimension 1',
          weight: 1.0,
          description: 'Test dimension',
          minThreshold: 70,
          required: true,
          criteria: [
            {
              id: 'crit1',
              name: 'Criterion 1',
              description: 'Test criterion',
              weight: 0.6, // Total will be 1.1 with crit2
              evaluationMethod: 'automated_check',
              expectedEvidence: ['test'],
            },
            {
              id: 'crit2',
              name: 'Criterion 2',
              description: 'Test criterion',
              weight: 0.5, // Total will be 1.1
              evaluationMethod: 'automated_check',
              expectedEvidence: ['test'],
            },
          ],
        },
      ];

      expect(() => {
        new QualityAssessmentFramework(invalidDimensions);
      }).toThrow('Criterion weights in dimension Dimension 1 must sum to 1.0');
    });
  });

  describe('evaluateQuality', () => {
    it('should evaluate quality across all dimensions', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      expect(assessment).toBeDefined();
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.dimensionEvaluations).toHaveLength(6); // Default 6 dimensions
      expect(assessment.timestamp).toBeGreaterThan(0);
      expect(assessment.duration).toBeGreaterThan(0);
    });

    it('should calculate weighted overall score correctly', async () => {
      // Mock dimension evaluations with known scores
      const mockEvaluations: DimensionEvaluation[] = [
        {
          dimension: { ...DEFAULT_QUALITY_DIMENSIONS[0], weight: 0.5 }, // 50% weight
          score: 80,
          passed: true,
          criterionEvaluations: [],
          feedback: 'Good',
          improvements: [],
        },
        {
          dimension: { ...DEFAULT_QUALITY_DIMENSIONS[1], weight: 0.5 }, // 50% weight
          score: 60,
          passed: true,
          criterionEvaluations: [],
          feedback: 'Needs improvement',
          improvements: [],
        },
      ];

      // Mock the framework to return our test evaluations
      const testFramework = new QualityAssessmentFramework([
        { ...DEFAULT_QUALITY_DIMENSIONS[0], weight: 0.5 },
        { ...DEFAULT_QUALITY_DIMENSIONS[1], weight: 0.5 },
      ]);

      vi.spyOn(testFramework as any, 'evaluateDimension')
        .mockResolvedValueOnce(mockEvaluations[0])
        .mockResolvedValueOnce(mockEvaluations[1]);

      const assessment = await testFramework.evaluateQuality(mockCode, mockContext);

      // Expected weighted score: (80 * 0.5) + (60 * 0.5) = 70
      expect(assessment.overallScore).toBe(70);
    });

    it('should determine ship criteria correctly', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      // Ship criteria depends on score threshold, critical issues, and required dimensions
      expect(typeof assessment.passesShipCriteria).toBe('boolean');
      
      if (assessment.criticalIssues.length === 0 && assessment.overallScore >= 85) {
        expect(assessment.passesShipCriteria).toBe(true);
      }
    });

    it('should generate executive summary', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      expect(assessment.executiveSummary).toBeDefined();
      expect(assessment.executiveSummary.length).toBeGreaterThan(0);
      expect(assessment.executiveSummary).toContain(assessment.passesShipCriteria ? 'SHIP' : 'NO-SHIP');
      expect(assessment.executiveSummary).toContain(`${assessment.overallScore}%`);
    });

    it('should generate next actions', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      expect(assessment.nextActions).toBeDefined();
      expect(Array.isArray(assessment.nextActions)).toBe(true);
      expect(assessment.nextActions.length).toBeGreaterThan(0);
    });

    it('should identify critical issues', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      expect(assessment.criticalIssues).toBeDefined();
      expect(Array.isArray(assessment.criticalIssues)).toBe(true);
      
      // Each critical issue should have required properties
      for (const issue of assessment.criticalIssues) {
        expect(issue).toHaveProperty('id');
        expect(issue).toHaveProperty('title');
        expect(issue).toHaveProperty('description');
        expect(issue).toHaveProperty('dimension');
        expect(issue).toHaveProperty('location');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('suggestedFix');
      }
    });
  });

  describe('dimension evaluation', () => {
    it('should evaluate each dimension with correct structure', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      for (const dimEval of assessment.dimensionEvaluations) {
        expect(dimEval.dimension).toBeDefined();
        expect(dimEval.score).toBeGreaterThanOrEqual(0);
        expect(dimEval.score).toBeLessThanOrEqual(100);
        expect(typeof dimEval.passed).toBe('boolean');
        expect(Array.isArray(dimEval.criterionEvaluations)).toBe(true);
        expect(dimEval.feedback).toBeDefined();
        expect(Array.isArray(dimEval.improvements)).toBe(true);
      }
    });

    it('should evaluate criteria within dimensions', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      for (const dimEval of assessment.dimensionEvaluations) {
        expect(dimEval.criterionEvaluations.length).toBeGreaterThan(0);
        
        for (const critEval of dimEval.criterionEvaluations) {
          expect(critEval.criterion).toBeDefined();
          expect(critEval.score).toBeGreaterThanOrEqual(0);
          expect(critEval.score).toBeLessThanOrEqual(100);
          expect(typeof critEval.passed).toBe('boolean');
          expect(Array.isArray(critEval.evidence)).toBe(true);
          expect(critEval.feedback).toBeDefined();
          expect(Array.isArray(critEval.suggestions)).toBe(true);
        }
      }
    });

    it('should calculate dimension scores as weighted average of criteria', async () => {
      // Test with a simple dimension with known criterion scores
      const testDimension: QualityDimension = {
        id: 'test_dimension',
        name: 'Test Dimension',
        weight: 1.0,
        description: 'Test dimension',
        minThreshold: 70,
        required: true,
        criteria: [
          {
            id: 'crit1',
            name: 'Criterion 1',
            description: 'First criterion',
            weight: 0.6, // 60% weight
            evaluationMethod: 'automated_check',
            expectedEvidence: ['test'],
          },
          {
            id: 'crit2',
            name: 'Criterion 2',
            description: 'Second criterion',
            weight: 0.4, // 40% weight
            evaluationMethod: 'automated_check',
            expectedEvidence: ['test'],
          },
        ],
      };

      const testFramework = new QualityAssessmentFramework([testDimension]);

      // Mock criterion evaluations with known scores
      vi.spyOn(testFramework as any, 'evaluateCriterion')
        .mockResolvedValueOnce({
          criterion: testDimension.criteria[0],
          score: 80,
          passed: true,
          evidence: [],
          feedback: 'Good',
          suggestions: [],
        })
        .mockResolvedValueOnce({
          criterion: testDimension.criteria[1],
          score: 60,
          passed: true,
          evidence: [],
          feedback: 'Needs improvement',
          suggestions: [],
        });

      const assessment = await testFramework.evaluateQuality(mockCode, mockContext);

      // Expected dimension score: (80 * 0.6) + (60 * 0.4) = 48 + 24 = 72
      expect(assessment.dimensionEvaluations[0].score).toBe(72);
    });
  });

  describe('default quality dimensions', () => {
    it('should have correct weights for all dimensions', () => {
      const totalWeight = DEFAULT_QUALITY_DIMENSIONS.reduce(
        (sum, dim) => sum + dim.weight, 
        0
      );
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.01);
    });

    it('should have Correctness & Completeness with 30% weight', () => {
      const dimension = DEFAULT_QUALITY_DIMENSIONS.find(
        d => d.name === 'Correctness & Completeness'
      );
      expect(dimension).toBeDefined();
      expect(dimension!.weight).toBe(0.30);
    });

    it('should have Tests with 20% weight', () => {
      const dimension = DEFAULT_QUALITY_DIMENSIONS.find(
        d => d.name === 'Tests'
      );
      expect(dimension).toBeDefined();
      expect(dimension!.weight).toBe(0.20);
    });

    it('should have Style & Conventions with 15% weight', () => {
      const dimension = DEFAULT_QUALITY_DIMENSIONS.find(
        d => d.name === 'Style & Conventions'
      );
      expect(dimension).toBeDefined();
      expect(dimension!.weight).toBe(0.15);
    });

    it('should have Security with 15% weight', () => {
      const dimension = DEFAULT_QUALITY_DIMENSIONS.find(
        d => d.name === 'Security'
      );
      expect(dimension).toBeDefined();
      expect(dimension!.weight).toBe(0.15);
    });

    it('should have Performance with 10% weight', () => {
      const dimension = DEFAULT_QUALITY_DIMENSIONS.find(
        d => d.name === 'Performance'
      );
      expect(dimension).toBeDefined();
      expect(dimension!.weight).toBe(0.10);
    });

    it('should have Docs & Traceability with 10% weight', () => {
      const dimension = DEFAULT_QUALITY_DIMENSIONS.find(
        d => d.name === 'Docs & Traceability'
      );
      expect(dimension).toBeDefined();
      expect(dimension!.weight).toBe(0.10);
    });

    it('should have all required dimensions marked as required', () => {
      const requiredDimensions = [
        'Correctness & Completeness',
        'Tests',
        'Security',
      ];

      for (const dimName of requiredDimensions) {
        const dimension = DEFAULT_QUALITY_DIMENSIONS.find(d => d.name === dimName);
        expect(dimension).toBeDefined();
        expect(dimension!.required).toBe(true);
      }
    });

    it('should have appropriate minimum thresholds', () => {
      for (const dimension of DEFAULT_QUALITY_DIMENSIONS) {
        expect(dimension.minThreshold).toBeGreaterThanOrEqual(60);
        expect(dimension.minThreshold).toBeLessThanOrEqual(85);
      }
    });

    it('should have criteria with weights summing to 1.0', () => {
      for (const dimension of DEFAULT_QUALITY_DIMENSIONS) {
        const totalWeight = dimension.criteria.reduce(
          (sum, crit) => sum + crit.weight,
          0
        );
        expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.01);
      }
    });
  });

  describe('ship criteria evaluation', () => {
    it('should fail ship criteria with critical issues', async () => {
      // Mock a framework that generates critical issues
      const testFramework = new QualityAssessmentFramework(
        DEFAULT_QUALITY_DIMENSIONS,
        { ...DEFAULT_QUALITY_FRAMEWORK_CONFIG, maxCriticalIssues: 0 }
      );

      // Mock dimension evaluation that creates critical issues
      vi.spyOn(testFramework as any, 'extractCriticalIssues').mockReturnValue([
        {
          id: 'critical_issue_1',
          title: 'Critical Security Issue',
          description: 'SQL injection vulnerability',
          dimension: 'Security',
          location: 'src/auth.ts:42',
          severity: 'Critical',
          blockingReason: 'Security vulnerability',
          suggestedFix: 'Use parameterized queries',
        },
      ]);

      const assessment = await testFramework.evaluateQuality(mockCode, mockContext);
      expect(assessment.passesShipCriteria).toBe(false);
    });

    it('should fail ship criteria with low overall score', async () => {
      // Mock evaluations with low scores
      const lowScoreFramework = new QualityAssessmentFramework(
        DEFAULT_QUALITY_DIMENSIONS,
        { ...DEFAULT_QUALITY_FRAMEWORK_CONFIG, shipScoreThreshold: 85 }
      );

      vi.spyOn(lowScoreFramework as any, 'calculateWeightedScore').mockReturnValue(70);
      vi.spyOn(lowScoreFramework as any, 'extractCriticalIssues').mockReturnValue([]);

      const assessment = await lowScoreFramework.evaluateQuality(mockCode, mockContext);
      expect(assessment.passesShipCriteria).toBe(false);
    });

    it('should fail ship criteria when required dimensions fail', async () => {
      // Mock a required dimension that fails its threshold
      const mockDimEval: DimensionEvaluation = {
        dimension: { ...DEFAULT_QUALITY_DIMENSIONS[0], required: true, minThreshold: 80 },
        score: 70, // Below threshold
        passed: false,
        criterionEvaluations: [],
        feedback: 'Below threshold',
        improvements: [],
      };

      vi.spyOn(framework as any, 'evaluateDimension').mockResolvedValueOnce(mockDimEval);
      vi.spyOn(framework as any, 'calculateWeightedScore').mockReturnValue(90);
      vi.spyOn(framework as any, 'extractCriticalIssues').mockReturnValue([]);

      const assessment = await framework.evaluateQuality(mockCode, mockContext);
      expect(assessment.passesShipCriteria).toBe(false);
    });

    it('should pass ship criteria when all conditions are met', async () => {
      // Mock successful evaluations
      vi.spyOn(framework as any, 'calculateWeightedScore').mockReturnValue(90);
      vi.spyOn(framework as any, 'extractCriticalIssues').mockReturnValue([]);
      
      // Mock all dimensions as passing
      const mockDimEvals = DEFAULT_QUALITY_DIMENSIONS.map(dim => ({
        dimension: dim,
        score: 85,
        passed: true,
        criterionEvaluations: [],
        feedback: 'Good',
        improvements: [],
      }));

      vi.spyOn(framework as any, 'evaluateDimension').mockImplementation(
        (dimension: QualityDimension) => Promise.resolve(
          mockDimEvals.find(eval => eval.dimension.id === dimension.id)
        )
      );

      const assessment = await framework.evaluateQuality(mockCode, mockContext);
      expect(assessment.passesShipCriteria).toBe(true);
    });
  });

  describe('evidence and feedback generation', () => {
    it('should generate appropriate feedback for dimensions', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      for (const dimEval of assessment.dimensionEvaluations) {
        expect(dimEval.feedback).toBeDefined();
        expect(dimEval.feedback.length).toBeGreaterThan(0);
        expect(dimEval.feedback).toContain(dimEval.dimension.name);
        expect(dimEval.feedback).toContain(`${dimEval.score}%`);
      }
    });

    it('should generate improvement suggestions for failed criteria', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      for (const dimEval of assessment.dimensionEvaluations) {
        if (!dimEval.passed) {
          expect(dimEval.improvements.length).toBeGreaterThan(0);
        }
      }
    });

    it('should generate next actions based on assessment results', async () => {
      const assessment = await framework.evaluateQuality(mockCode, mockContext);

      expect(assessment.nextActions.length).toBeGreaterThan(0);
      expect(assessment.nextActions.length).toBeLessThanOrEqual(5); // Should be limited

      if (assessment.criticalIssues.length > 0) {
        expect(assessment.nextActions[0]).toContain('critical');
      }

      if (assessment.passesShipCriteria) {
        expect(assessment.nextActions.some(action => 
          action.toLowerCase().includes('ready') || action.toLowerCase().includes('ship')
        )).toBe(true);
      }
    });
  });
});

describe('validateQualityDimensions', () => {
  it('should validate correct dimensions', () => {
    const errors = validateQualityDimensions(DEFAULT_QUALITY_DIMENSIONS);
    expect(errors).toHaveLength(0);
  });

  it('should detect empty dimensions array', () => {
    const errors = validateQualityDimensions([]);
    expect(errors).toContain('At least one quality dimension must be defined');
  });

  it('should detect incorrect total weight', () => {
    const invalidDimensions: QualityDimension[] = [
      {
        id: 'dim1',
        name: 'Dimension 1',
        weight: 0.7, // Total will be 1.2 with dim2
        description: 'First dimension',
        minThreshold: 70,
        required: true,
        criteria: [{
          id: 'crit1',
          name: 'Criterion 1',
          description: 'Test criterion',
          weight: 1.0,
          evaluationMethod: 'automated_check',
          expectedEvidence: ['test'],
        }],
      },
      {
        id: 'dim2',
        name: 'Dimension 2',
        weight: 0.5, // Total will be 1.2
        description: 'Second dimension',
        minThreshold: 70,
        required: true,
        criteria: [{
          id: 'crit2',
          name: 'Criterion 2',
          description: 'Test criterion',
          weight: 1.0,
          evaluationMethod: 'automated_check',
          expectedEvidence: ['test'],
        }],
      },
    ];

    const errors = validateQualityDimensions(invalidDimensions);
    expect(errors).toContain('Dimension weights must sum to 1.0, got 1.2');
  });

  it('should detect invalid dimension weights', () => {
    const invalidDimensions: QualityDimension[] = [
      {
        id: 'dim1',
        name: 'Dimension 1',
        weight: -0.1, // Invalid negative weight
        description: 'Invalid dimension',
        minThreshold: 70,
        required: true,
        criteria: [{
          id: 'crit1',
          name: 'Criterion 1',
          description: 'Test criterion',
          weight: 1.0,
          evaluationMethod: 'automated_check',
          expectedEvidence: ['test'],
        }],
      },
    ];

    const errors = validateQualityDimensions(invalidDimensions);
    expect(errors.some(error => error.includes('weight must be between 0 and 1'))).toBe(true);
  });

  it('should detect dimensions without criteria', () => {
    const invalidDimensions: QualityDimension[] = [
      {
        id: 'dim1',
        name: 'Dimension 1',
        weight: 1.0,
        description: 'Dimension without criteria',
        minThreshold: 70,
        required: true,
        criteria: [], // No criteria
      },
    ];

    const errors = validateQualityDimensions(invalidDimensions);
    expect(errors).toContain('Dimension Dimension 1 must have at least one criterion');
  });
});

describe('createDefaultQualityFramework', () => {
  it('should create framework with default configuration', () => {
    const framework = createDefaultQualityFramework();
    expect(framework).toBeInstanceOf(QualityAssessmentFramework);
  });

  it('should create framework with custom configuration', () => {
    const customConfig = {
      shipScoreThreshold: 90,
      criterionPassThreshold: 70,
      maxCriticalIssues: 1,
      requireAllDimensions: false,
    };

    const framework = createDefaultQualityFramework(customConfig);
    expect(framework).toBeInstanceOf(QualityAssessmentFramework);
  });

  it('should use default dimensions', async () => {
    const framework = createDefaultQualityFramework();
    const mockContext: QualityEvaluationContext = {
      filePaths: ['test.ts'],
      repositoryPath: '/test',
    };

    const assessment = await framework.evaluateQuality('test code', mockContext);
    expect(assessment.dimensionEvaluations).toHaveLength(6); // Default 6 dimensions
  });
});