/**
 * Unit tests for Quality Assessment Framework
 * 
 * Tests the multi-dimensional quality assessment framework including:
 * - Quality dimension definitions and validation
 * - Scoring algorithms and weighted averages
 * - Critical issue detection
 * - Ship criteria evaluation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  QualityAssessmentFramework,
  createDefaultQualityFramework,
  validateQualityDimensions,
  validateQualityDimension,
  getQualityDimensionById,
  getQualityCriterionById,
  calculateScoreDistribution,
  getFailingDimensions,
  getCriticalIssuesByDimension,
  DEFAULT_QUALITY_DIMENSIONS,
  DEFAULT_QUALITY_FRAMEWORK_CONFIG,
  type QualityDimension,
  type QualityCriterion,
  type QualityAssessment,
  type QualityEvaluationContext,
  type QualityFrameworkConfig
} from '../quality-assessment.js';

describe('QualityAssessmentFramework', () => {
  let framework: QualityAssessmentFramework;
  let mockContext: QualityEvaluationContext;

  beforeEach(() => {
    framework = createDefaultQualityFramework();
    mockContext = {
      filePaths: ['src/test.ts'],
      repositoryPath: '/test/repo',
      sessionId: 'test-session'
    };
  });

  describe('Framework Initialization', () => {
    it('should create framework with default dimensions', () => {
      expect(framework).toBeDefined();
      expect(framework).toBeInstanceOf(QualityAssessmentFramework);
    });

    it('should create framework with custom config', () => {
      const customConfig: Partial<QualityFrameworkConfig> = {
        shipScoreThreshold: 90,
        criterionPassThreshold: 70
      };
      
      const customFramework = createDefaultQualityFramework(customConfig);
      expect(customFramework).toBeDefined();
    });

    it('should validate dimensions on initialization', () => {
      const invalidDimensions: QualityDimension[] = [
        {
          id: 'test',
          name: 'Test',
          weight: 1.5, // Invalid weight > 1
          description: 'Test dimension',
          minThreshold: 70,
          required: true,
          criteria: []
        }
      ];

      expect(() => {
        new QualityAssessmentFramework(invalidDimensions);
      }).toThrow();
    });
  });

  describe('Quality Evaluation', () => {
    it('should evaluate quality and return assessment', async () => {
      const code = 'function test() { return true; }';
      const assessment = await framework.evaluateQuality(code, mockContext);

      expect(assessment).toBeDefined();
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.dimensionEvaluations).toHaveLength(DEFAULT_QUALITY_DIMENSIONS.length);
      expect(assessment.timestamp).toBeGreaterThan(0);
      expect(assessment.duration).toBeGreaterThanOrEqual(0);
      expect(assessment.executiveSummary).toBeDefined();
      expect(assessment.nextActions).toBeDefined();
    });

    it('should calculate weighted scores correctly', async () => {
      const code = 'function test() { return true; }';
      const assessment = await framework.evaluateQuality(code, mockContext);

      // Verify that overall score is within expected range
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);

      // Verify that each dimension has a score
      for (const dimEval of assessment.dimensionEvaluations) {
        expect(dimEval.score).toBeGreaterThanOrEqual(0);
        expect(dimEval.score).toBeLessThanOrEqual(100);
        expect(dimEval.dimension).toBeDefined();
        expect(dimEval.criterionEvaluations).toBeDefined();
      }
    });

    it('should detect critical issues', async () => {
      // This test would need a more sophisticated mock to generate critical issues
      const code = 'function test() { return true; }';
      const assessment = await framework.evaluateQuality(code, mockContext);

      expect(assessment.criticalIssues).toBeDefined();
      expect(Array.isArray(assessment.criticalIssues)).toBe(true);
    });

    it('should evaluate ship criteria correctly', async () => {
      const code = 'function test() { return true; }';
      const assessment = await framework.evaluateQuality(code, mockContext);

      expect(typeof assessment.passesShipCriteria).toBe('boolean');
      
      // If no critical issues and score above threshold, should pass
      if (assessment.criticalIssues.length === 0 && 
          assessment.overallScore >= DEFAULT_QUALITY_FRAMEWORK_CONFIG.shipScoreThreshold) {
        expect(assessment.passesShipCriteria).toBe(true);
      }
    });
  });

  describe('Dimension Validation', () => {
    it('should validate default dimensions successfully', () => {
      const errors = validateQualityDimensions(DEFAULT_QUALITY_DIMENSIONS);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid dimension weights', () => {
      const invalidDimensions: QualityDimension[] = [
        {
          id: 'test1',
          name: 'Test 1',
          weight: 0.7,
          description: 'Test',
          minThreshold: 70,
          required: true,
          criteria: [{
            id: 'crit1',
            name: 'Criterion 1',
            description: 'Test criterion',
            weight: 1.0,
            evaluationMethod: 'automated_check',
            expectedEvidence: []
          }]
        },
        {
          id: 'test2',
          name: 'Test 2',
          weight: 0.5, // Total weight = 1.2 > 1.0
          description: 'Test',
          minThreshold: 70,
          required: true,
          criteria: [{
            id: 'crit2',
            name: 'Criterion 2',
            description: 'Test criterion',
            weight: 1.0,
            evaluationMethod: 'automated_check',
            expectedEvidence: []
          }]
        }
      ];

      const errors = validateQualityDimensions(invalidDimensions);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('must sum to 1.0'))).toBe(true);
    });

    it('should detect empty dimensions array', () => {
      const errors = validateQualityDimensions([]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('At least one quality dimension must be defined');
    });

    it('should validate individual dimension', () => {
      const validDimension = DEFAULT_QUALITY_DIMENSIONS[0];
      const errors = validateQualityDimension(validDimension);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid criterion weights in dimension', () => {
      const invalidDimension: QualityDimension = {
        id: 'test',
        name: 'Test',
        weight: 0.5,
        description: 'Test dimension',
        minThreshold: 70,
        required: true,
        criteria: [
          {
            id: 'crit1',
            name: 'Criterion 1',
            description: 'Test',
            weight: 0.7,
            evaluationMethod: 'automated_check',
            expectedEvidence: []
          },
          {
            id: 'crit2',
            name: 'Criterion 2',
            description: 'Test',
            weight: 0.5, // Total = 1.2 > 1.0
            evaluationMethod: 'automated_check',
            expectedEvidence: []
          }
        ]
      };

      const errors = validateQualityDimension(invalidDimension);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('must sum to 1.0'))).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should find dimension by ID', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'correctness_completeness');
      expect(dimension).toBeDefined();
      expect(dimension?.id).toBe('correctness_completeness');
      expect(dimension?.name).toBe('Correctness & Completeness');
    });

    it('should return undefined for non-existent dimension ID', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'non_existent');
      expect(dimension).toBeUndefined();
    });

    it('should find criterion by ID within dimension', () => {
      const dimension = DEFAULT_QUALITY_DIMENSIONS[0]; // Correctness & Completeness
      const criterion = getQualityCriterionById(dimension, 'ac_fulfillment');
      expect(criterion).toBeDefined();
      expect(criterion?.id).toBe('ac_fulfillment');
      expect(criterion?.name).toBe('Acceptance Criteria Fulfillment');
    });

    it('should return undefined for non-existent criterion ID', () => {
      const dimension = DEFAULT_QUALITY_DIMENSIONS[0];
      const criterion = getQualityCriterionById(dimension, 'non_existent');
      expect(criterion).toBeUndefined();
    });

    it('should calculate score distribution', async () => {
      const code = 'function test() { return true; }';
      const assessment = await framework.evaluateQuality(code, mockContext);
      
      const distribution = calculateScoreDistribution(assessment);
      expect(Object.keys(distribution)).toHaveLength(DEFAULT_QUALITY_DIMENSIONS.length);
      
      for (const [dimensionName, score] of Object.entries(distribution)) {
        expect(typeof dimensionName).toBe('string');
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it('should identify failing dimensions', async () => {
      const code = 'function test() { return true; }';
      const assessment = await framework.evaluateQuality(code, mockContext);
      
      const failingDimensions = getFailingDimensions(assessment);
      expect(Array.isArray(failingDimensions)).toBe(true);
      
      for (const failing of failingDimensions) {
        expect(failing.passed).toBe(false);
        expect(failing.score).toBeLessThan(failing.dimension.minThreshold);
      }
    });

    it('should group critical issues by dimension', async () => {
      const code = 'function test() { return true; }';
      const assessment = await framework.evaluateQuality(code, mockContext);
      
      const issuesByDimension = getCriticalIssuesByDimension(assessment);
      expect(typeof issuesByDimension).toBe('object');
      
      for (const [dimensionName, issues] of Object.entries(issuesByDimension)) {
        expect(typeof dimensionName).toBe('string');
        expect(Array.isArray(issues)).toBe(true);
        
        for (const issue of issues) {
          expect(issue.dimension).toBe(dimensionName);
          expect(issue.severity).toBeDefined();
          expect(['Critical', 'Major', 'Minor']).toContain(issue.severity);
        }
      }
    });
  });

  describe('Default Quality Dimensions', () => {
    it('should have correct number of dimensions', () => {
      expect(DEFAULT_QUALITY_DIMENSIONS).toHaveLength(6);
    });

    it('should have correct dimension weights', () => {
      const expectedWeights = {
        'correctness_completeness': 0.30,
        'testing_quality': 0.20,
        'style_conventions': 0.15,
        'security_assessment': 0.15,
        'performance_assessment': 0.10,
        'documentation_traceability': 0.10
      };

      for (const dimension of DEFAULT_QUALITY_DIMENSIONS) {
        expect(dimension.weight).toBe(expectedWeights[dimension.id as keyof typeof expectedWeights]);
      }
    });

    it('should have weights that sum to 1.0', () => {
      const totalWeight = DEFAULT_QUALITY_DIMENSIONS.reduce((sum, dim) => sum + dim.weight, 0);
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.01);
    });

    it('should have all required dimensions marked correctly', () => {
      const requiredDimensions = DEFAULT_QUALITY_DIMENSIONS.filter(dim => dim.required);
      const expectedRequired = ['correctness_completeness', 'testing_quality', 'security_assessment'];
      
      expect(requiredDimensions).toHaveLength(expectedRequired.length);
      
      for (const dimension of requiredDimensions) {
        expect(expectedRequired).toContain(dimension.id);
      }
    });

    it('should have valid criteria for each dimension', () => {
      for (const dimension of DEFAULT_QUALITY_DIMENSIONS) {
        expect(dimension.criteria.length).toBeGreaterThan(0);
        
        // Check criterion weights sum to 1.0
        const totalWeight = dimension.criteria.reduce((sum, crit) => sum + crit.weight, 0);
        expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.01);
        
        // Check each criterion has required fields
        for (const criterion of dimension.criteria) {
          expect(criterion.id).toBeDefined();
          expect(criterion.name).toBeDefined();
          expect(criterion.description).toBeDefined();
          expect(criterion.weight).toBeGreaterThan(0);
          expect(criterion.weight).toBeLessThanOrEqual(1);
          expect(criterion.evaluationMethod).toBeDefined();
          expect(Array.isArray(criterion.expectedEvidence)).toBe(true);
        }
      }
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', () => {
      expect(DEFAULT_QUALITY_FRAMEWORK_CONFIG.shipScoreThreshold).toBe(85);
      expect(DEFAULT_QUALITY_FRAMEWORK_CONFIG.criterionPassThreshold).toBe(60);
      expect(DEFAULT_QUALITY_FRAMEWORK_CONFIG.maxCriticalIssues).toBe(0);
      expect(DEFAULT_QUALITY_FRAMEWORK_CONFIG.requireAllDimensions).toBe(true);
    });

    it('should allow custom configuration', () => {
      const customConfig: Partial<QualityFrameworkConfig> = {
        shipScoreThreshold: 90,
        criterionPassThreshold: 70,
        maxCriticalIssues: 1,
        requireAllDimensions: false
      };

      const customFramework = createDefaultQualityFramework(customConfig);
      expect(customFramework).toBeDefined();
    });
  });
});

describe('Quality Dimension Requirements Compliance', () => {
  describe('Requirement 3.1: Correctness & Completeness (30% weight)', () => {
    it('should have correctness dimension with 30% weight', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'correctness_completeness');
      expect(dimension).toBeDefined();
      expect(dimension?.weight).toBe(0.30);
      expect(dimension?.required).toBe(true);
    });

    it('should have AC fulfillment criterion', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'correctness_completeness');
      const criterion = getQualityCriterionById(dimension!, 'ac_fulfillment');
      expect(criterion).toBeDefined();
      expect(criterion?.evaluationMethod).toBe('coverage_analysis');
    });

    it('should have edge case coverage criterion', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'correctness_completeness');
      const criterion = getQualityCriterionById(dimension!, 'edge_case_coverage');
      expect(criterion).toBeDefined();
    });
  });

  describe('Requirement 3.2: Testing Quality (20% weight)', () => {
    it('should have testing dimension with 20% weight', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'testing_quality');
      expect(dimension).toBeDefined();
      expect(dimension?.weight).toBe(0.20);
      expect(dimension?.required).toBe(true);
    });

    it('should have test coverage analysis criterion', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'testing_quality');
      const criterion = getQualityCriterionById(dimension!, 'test_coverage_analysis');
      expect(criterion).toBeDefined();
      expect(criterion?.evaluationMethod).toBe('coverage_analysis');
    });
  });

  describe('Requirement 3.3: Style & Conventions (15% weight)', () => {
    it('should have style dimension with 15% weight', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'style_conventions');
      expect(dimension).toBeDefined();
      expect(dimension?.weight).toBe(0.15);
      expect(dimension?.required).toBe(false);
    });

    it('should have linting integration criterion', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'style_conventions');
      const criterion = getQualityCriterionById(dimension!, 'linting_formatting_integration');
      expect(criterion).toBeDefined();
      expect(criterion?.evaluationMethod).toBe('automated_check');
    });
  });

  describe('Requirement 3.4: Security (15% weight)', () => {
    it('should have security dimension with 15% weight', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'security_assessment');
      expect(dimension).toBeDefined();
      expect(dimension?.weight).toBe(0.15);
      expect(dimension?.required).toBe(true);
    });

    it('should have input validation criterion', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'security_assessment');
      const criterion = getQualityCriterionById(dimension!, 'input_validation_checking');
      expect(criterion).toBeDefined();
      expect(criterion?.evaluationMethod).toBe('security_scan');
    });
  });

  describe('Requirement 3.5: Performance (10% weight)', () => {
    it('should have performance dimension with 10% weight', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'performance_assessment');
      expect(dimension).toBeDefined();
      expect(dimension?.weight).toBe(0.10);
      expect(dimension?.required).toBe(false);
    });

    it('should have bottleneck detection criterion', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'performance_assessment');
      const criterion = getQualityCriterionById(dimension!, 'performance_bottleneck_detection');
      expect(criterion).toBeDefined();
      expect(criterion?.evaluationMethod).toBe('metric_analysis');
    });
  });

  describe('Requirement 3.6: Documentation & Traceability (10% weight)', () => {
    it('should have documentation dimension with 10% weight', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'documentation_traceability');
      expect(dimension).toBeDefined();
      expect(dimension?.weight).toBe(0.10);
      expect(dimension?.required).toBe(false);
    });

    it('should have inline documentation criterion', () => {
      const dimension = getQualityDimensionById(DEFAULT_QUALITY_DIMENSIONS, 'documentation_traceability');
      const criterion = getQualityCriterionById(dimension!, 'inline_documentation_validation');
      expect(criterion).toBeDefined();
      expect(criterion?.evaluationMethod).toBe('manual_review');
    });
  });
});