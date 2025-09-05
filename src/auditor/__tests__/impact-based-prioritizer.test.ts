/**
 * Unit tests for ImpactBasedPrioritizer
 * 
 * Tests impact assessment, feasibility analysis, and ROI-based prioritization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ImpactBasedPrioritizer, 
  createImpactBasedPrioritizer,
  validateImpactAnalyzedSuggestion,
  type PrioritizationConfig,
  type ImpactAnalyzedSuggestion,
  DEFAULT_PRIORITIZATION_CONFIG
} from '../impact-based-prioritizer.js';
import type { ProjectContext } from '../project-context-analyzer.js';
import type { ComplexityMetrics } from '../complexity-analyzer.js';
import type { DeveloperProfile } from '../developer-pattern-recognizer.js';

describe('ImpactBasedPrioritizer', () => {
  let prioritizer: ImpactBasedPrioritizer;
  let mockProjectContext: ProjectContext;
  let mockComplexityMetrics: ComplexityMetrics;
  let mockDeveloperProfile: DeveloperProfile;
  let mockSuggestions: string[];

  beforeEach(() => {
    prioritizer = createImpactBasedPrioritizer();
    
    mockProjectContext = {
      projectType: 'web-application',
      techStack: {
        primaryLanguage: 'typescript',
        secondaryLanguages: [],
        frontendFrameworks: ['React'],
        backendFrameworks: ['Express.js'],
        databases: ['PostgreSQL'],
        testingFrameworks: ['Jest'],
        buildTools: ['Webpack'],
        packageManagers: ['npm'],
        deploymentPlatforms: ['Docker']
      },
      patterns: [],
      conventions: [],
      configuration: {
        packageJson: { name: 'test-project' }
      },
      metadata: {
        name: 'test-project',
        version: '1.0.0',
        description: 'Test project',
        size: 'medium',
        teamSize: 'small',
        maturity: 'stable',
        lastModified: new Date()
      }
    };

    mockComplexityMetrics = {
      cyclomaticComplexity: 8,
      cognitiveComplexity: 12,
      linesOfCode: 500,
      functionCount: 15,
      classCount: 3,
      nestingDepth: 4,
      dependencyCount: 10,
      halsteadComplexity: {
        distinctOperators: 15,
        distinctOperands: 30,
        totalOperators: 50,
        totalOperands: 80,
        vocabulary: 45,
        length: 130,
        calculatedLength: 120,
        volume: 800,
        difficulty: 8,
        effort: 6400
      },
      overallComplexity: 45
    };

    mockDeveloperProfile = {
      experienceLevel: 'mid-level',
      codingPatterns: [],
      technicalPreferences: [],
      communicationStyle: {
        detailLevel: 'moderate',
        tone: 'educational',
        exampleTypes: ['code-snippets'],
        explanationStyle: 'step-by-step'
      },
      learningPatterns: [],
      feedbackHistory: []
    };

    mockSuggestions = [
      'Add unit tests for the authentication module',
      'Optimize database queries for better performance',
      'Implement input validation for security',
      'Refactor complex functions to improve maintainability',
      'Add comprehensive documentation for the API'
    ];
  });

  describe('constructor', () => {
    it('should create prioritizer with default config', () => {
      const defaultPrioritizer = new ImpactBasedPrioritizer();
      expect(defaultPrioritizer).toBeInstanceOf(ImpactBasedPrioritizer);
    });

    it('should create prioritizer with custom config', () => {
      const customConfig: Partial<PrioritizationConfig> = {
        impactWeight: 0.5,
        feasibilityWeight: 0.3,
        roiWeight: 0.2
      };
      const customPrioritizer = new ImpactBasedPrioritizer(customConfig);
      expect(customPrioritizer).toBeInstanceOf(ImpactBasedPrioritizer);
    });
  });

  describe('prioritizeSuggestions', () => {
    it('should prioritize suggestions successfully', async () => {
      const prioritized = await prioritizer.prioritizeSuggestions(
        mockSuggestions,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      expect(Array.isArray(prioritized)).toBe(true);
      expect(prioritized.length).toBeGreaterThan(0);
      expect(prioritized.length).toBeLessThanOrEqual(mockSuggestions.length);
      
      // Should be sorted by priority score (descending)
      for (let i = 1; i < prioritized.length; i++) {
        expect(prioritized[i - 1].priorityScore).toBeGreaterThanOrEqual(prioritized[i].priorityScore);
      }
    });

    it('should categorize suggestions correctly', async () => {
      const testSuggestions = [
        'Add unit tests for better coverage',
        'Optimize performance bottlenecks',
        'Implement security measures',
        'Improve code documentation'
      ];

      const prioritized = await prioritizer.prioritizeSuggestions(
        testSuggestions,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      const categories = prioritized.map(s => s.category);
      expect(categories).toContain('testing');
      expect(categories).toContain('performance');
      expect(categories).toContain('security');
      expect(categories).toContain('documentation');
    });

    it('should assess impact correctly for different categories', async () => {
      const securitySuggestion = ['Implement input validation for security'];
      
      const prioritized = await prioritizer.prioritizeSuggestions(
        securitySuggestion,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      expect(prioritized.length).toBe(1);
      const suggestion = prioritized[0];
      
      expect(suggestion.category).toBe('security');
      expect(suggestion.impact.overallImpact).toBeGreaterThan(70); // Security should have high impact
      expect(suggestion.impact.dimensions.some(d => d.name === 'security')).toBe(true);
    });

    it('should assess feasibility based on developer experience', async () => {
      const juniorProfile = {
        ...mockDeveloperProfile,
        experienceLevel: 'junior' as const
      };

      const seniorProfile = {
        ...mockDeveloperProfile,
        experienceLevel: 'senior' as const
      };

      const [juniorResult, seniorResult] = await Promise.all([
        prioritizer.prioritizeSuggestions(['Refactor complex architecture'], mockProjectContext, mockComplexityMetrics, juniorProfile),
        prioritizer.prioritizeSuggestions(['Refactor complex architecture'], mockProjectContext, mockComplexityMetrics, seniorProfile)
      ]);

      // Senior developer should have higher feasibility for complex tasks
      if (juniorResult.length > 0 && seniorResult.length > 0) {
        expect(seniorResult[0].feasibility.resource.estimatedEffort)
          .toBeLessThan(juniorResult[0].feasibility.resource.estimatedEffort);
      }
    });

    it('should calculate ROI correctly', async () => {
      const performanceSuggestion = ['Optimize database queries for better performance'];
      
      const prioritized = await prioritizer.prioritizeSuggestions(
        performanceSuggestion,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      expect(prioritized.length).toBe(1);
      const suggestion = prioritized[0];
      
      expect(suggestion.roi.roiScore).toBeGreaterThan(0);
      expect(suggestion.roi.investment.total).toBeGreaterThan(0);
      expect(suggestion.roi.returns.length).toBeGreaterThan(0);
      expect(suggestion.roi.paybackPeriod).toBeGreaterThan(0);
    });

    it('should filter suggestions below minimum threshold', async () => {
      const lowThresholdPrioritizer = new ImpactBasedPrioritizer({
        minPriorityThreshold: 90 // Very high threshold
      });

      const prioritized = await lowThresholdPrioritizer.prioritizeSuggestions(
        mockSuggestions,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      // Should filter out most suggestions due to high threshold
      expect(prioritized.length).toBeLessThan(mockSuggestions.length);
    });

    it('should limit results to maximum suggestions', async () => {
      const limitedPrioritizer = new ImpactBasedPrioritizer({
        maxSuggestions: 2
      });

      const prioritized = await limitedPrioritizer.prioritizeSuggestions(
        mockSuggestions,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      expect(prioritized.length).toBeLessThanOrEqual(2);
    });

    it('should handle empty suggestions array', async () => {
      const prioritized = await prioritizer.prioritizeSuggestions(
        [],
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      expect(prioritized).toEqual([]);
    });

    it('should handle complex project with high complexity metrics', async () => {
      const highComplexityMetrics = {
        ...mockComplexityMetrics,
        overallComplexity: 85,
        cyclomaticComplexity: 25,
        nestingDepth: 8
      };

      const prioritized = await prioritizer.prioritizeSuggestions(
        mockSuggestions,
        mockProjectContext,
        highComplexityMetrics,
        mockDeveloperProfile
      );

      expect(prioritized.length).toBeGreaterThan(0);
      // High complexity should affect impact and feasibility scores
      prioritized.forEach(suggestion => {
        expect(suggestion.priorityScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.priorityScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('generateImprovementPathway', () => {
    let mockAnalyzedSuggestions: ImpactAnalyzedSuggestion[];

    beforeEach(() => {
      mockAnalyzedSuggestions = [
        {
          suggestion: 'Add unit tests',
          category: 'testing',
          impact: {
            overallImpact: 75,
            dimensions: [],
            stakeholders: [],
            risks: [],
            benefits: []
          },
          feasibility: {
            overallFeasibility: 85,
            technical: {
              score: 85,
              complexity: 'simple',
              requiredSkills: ['Testing'],
              constraints: [],
              dependencies: []
            },
            resource: {
              score: 80,
              estimatedEffort: 8,
              requiredTeamSize: 1,
              budgetRequirements: [],
              availability: 'immediately'
            },
            timeline: {
              score: 90,
              estimatedDuration: 3,
              criticalPath: [],
              constraints: []
            },
            organizational: {
              score: 85,
              teamReadiness: 'ready',
              changeResistance: 'low',
              goalAlignment: 'aligned'
            }
          },
          roi: {
            roiScore: 70,
            investment: { development: 800, testing: 200, deployment: 100, training: 200, total: 1300 },
            returns: [],
            paybackPeriod: 60,
            netPresentValue: 2000
          },
          priorityScore: 78,
          pathway: {
            phases: [],
            totalDuration: 3,
            dependencies: [],
            milestones: []
          }
        },
        {
          suggestion: 'Refactor architecture',
          category: 'architecture',
          impact: {
            overallImpact: 90,
            dimensions: [],
            stakeholders: [],
            risks: [],
            benefits: []
          },
          feasibility: {
            overallFeasibility: 50,
            technical: {
              score: 50,
              complexity: 'complex',
              requiredSkills: ['Architecture'],
              constraints: [],
              dependencies: []
            },
            resource: {
              score: 40,
              estimatedEffort: 40,
              requiredTeamSize: 2,
              budgetRequirements: [],
              availability: 'medium-term'
            },
            timeline: {
              score: 50,
              estimatedDuration: 20,
              criticalPath: [],
              constraints: []
            },
            organizational: {
              score: 60,
              teamReadiness: 'partially-ready',
              changeResistance: 'medium',
              goalAlignment: 'aligned'
            }
          },
          roi: {
            roiScore: 85,
            investment: { development: 4000, testing: 1600, deployment: 800, training: 800, total: 7200 },
            returns: [],
            paybackPeriod: 120,
            netPresentValue: 5000
          },
          priorityScore: 72,
          pathway: {
            phases: [],
            totalDuration: 20,
            dependencies: [],
            milestones: []
          }
        }
      ];
    });

    it('should generate improvement pathway successfully', () => {
      const pathway = prioritizer.generateImprovementPathway(
        mockAnalyzedSuggestions,
        mockProjectContext,
        mockDeveloperProfile
      );

      expect(pathway).toBeDefined();
      expect(Array.isArray(pathway.phases)).toBe(true);
      expect(pathway.totalDuration).toBeGreaterThan(0);
      expect(Array.isArray(pathway.dependencies)).toBe(true);
      expect(Array.isArray(pathway.milestones)).toBe(true);
    });

    it('should group suggestions into appropriate phases', () => {
      const pathway = prioritizer.generateImprovementPathway(
        mockAnalyzedSuggestions,
        mockProjectContext,
        mockDeveloperProfile
      );

      expect(pathway.phases.length).toBeGreaterThan(0);
      
      // Should have quick wins phase for low-effort suggestions
      const quickWinsPhase = pathway.phases.find(p => p.id === 'quick-wins');
      expect(quickWinsPhase).toBeDefined();
      
      // Should have long-term phase for high-effort suggestions
      const longTermPhase = pathway.phases.find(p => p.id === 'long-term');
      expect(longTermPhase).toBeDefined();
    });

    it('should create sequential dependencies between phases', () => {
      const pathway = prioritizer.generateImprovementPathway(
        mockAnalyzedSuggestions,
        mockProjectContext,
        mockDeveloperProfile
      );

      if (pathway.phases.length > 1) {
        expect(pathway.dependencies.length).toBeGreaterThan(0);
        
        // Check that dependencies are properly structured
        pathway.dependencies.forEach(dep => {
          expect(dep.dependentPhase).toBeDefined();
          expect(dep.prerequisitePhase).toBeDefined();
          expect(dep.type).toBeDefined();
        });
      }
    });

    it('should create milestones for each phase', () => {
      const pathway = prioritizer.generateImprovementPathway(
        mockAnalyzedSuggestions,
        mockProjectContext,
        mockDeveloperProfile
      );

      expect(pathway.milestones.length).toBe(pathway.phases.length);
      
      pathway.milestones.forEach(milestone => {
        expect(milestone.name).toBeDefined();
        expect(milestone.description).toBeDefined();
        expect(milestone.targetDate).toBeGreaterThan(0);
        expect(Array.isArray(milestone.criteria)).toBe(true);
      });
    });

    it('should handle empty suggestions array', () => {
      const pathway = prioritizer.generateImprovementPathway(
        [],
        mockProjectContext,
        mockDeveloperProfile
      );

      expect(pathway.phases).toEqual([]);
      expect(pathway.totalDuration).toBe(0);
      expect(pathway.dependencies).toEqual([]);
      expect(pathway.milestones).toEqual([]);
    });
  });

  describe('suggestion categorization', () => {
    it('should categorize testing suggestions correctly', async () => {
      const testingSuggestions = [
        'Add unit tests for better coverage',
        'Implement integration tests',
        'Improve test coverage'
      ];

      const prioritized = await prioritizer.prioritizeSuggestions(
        testingSuggestions,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      prioritized.forEach(suggestion => {
        expect(suggestion.category).toBe('testing');
      });
    });

    it('should categorize performance suggestions correctly', async () => {
      const performanceSuggestions = [
        'Optimize database queries',
        'Improve performance bottlenecks',
        'Optimize memory usage'
      ];

      const prioritized = await prioritizer.prioritizeSuggestions(
        performanceSuggestions,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      prioritized.forEach(suggestion => {
        expect(suggestion.category).toBe('performance');
      });
    });

    it('should categorize security suggestions correctly', async () => {
      const securitySuggestions = [
        'Implement input validation',
        'Fix security vulnerabilities',
        'Add authentication checks'
      ];

      const prioritized = await prioritizer.prioritizeSuggestions(
        securitySuggestions,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      prioritized.forEach(suggestion => {
        expect(suggestion.category).toBe('security');
      });
    });

    it('should default to code-quality for uncategorized suggestions', async () => {
      const genericSuggestions = [
        'Improve this code',
        'Make changes here',
        'Fix this issue'
      ];

      const prioritized = await prioritizer.prioritizeSuggestions(
        genericSuggestions,
        mockProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      prioritized.forEach(suggestion => {
        expect(suggestion.category).toBe('code-quality');
      });
    });
  });

  describe('factory functions', () => {
    it('should create prioritizer with createImpactBasedPrioritizer', () => {
      const prioritizer = createImpactBasedPrioritizer();
      expect(prioritizer).toBeInstanceOf(ImpactBasedPrioritizer);
    });

    it('should create prioritizer with custom config', () => {
      const config: Partial<PrioritizationConfig> = {
        impactWeight: 0.6,
        feasibilityWeight: 0.4
      };
      const prioritizer = createImpactBasedPrioritizer(config);
      expect(prioritizer).toBeInstanceOf(ImpactBasedPrioritizer);
    });
  });

  describe('validateImpactAnalyzedSuggestion', () => {
    it('should validate correct impact analyzed suggestion', () => {
      const validSuggestion: ImpactAnalyzedSuggestion = {
        suggestion: 'Test suggestion',
        category: 'testing',
        impact: {
          overallImpact: 75,
          dimensions: [],
          stakeholders: [],
          risks: [],
          benefits: []
        },
        feasibility: {
          overallFeasibility: 80,
          technical: {
            score: 80,
            complexity: 'simple',
            requiredSkills: [],
            constraints: [],
            dependencies: []
          },
          resource: {
            score: 80,
            estimatedEffort: 8,
            requiredTeamSize: 1,
            budgetRequirements: [],
            availability: 'immediately'
          },
          timeline: {
            score: 80,
            estimatedDuration: 3,
            criticalPath: [],
            constraints: []
          },
          organizational: {
            score: 80,
            teamReadiness: 'ready',
            changeResistance: 'low',
            goalAlignment: 'aligned'
          }
        },
        roi: {
          roiScore: 70,
          investment: { development: 800, testing: 200, deployment: 100, training: 200, total: 1300 },
          returns: [],
          paybackPeriod: 60,
          netPresentValue: 2000
        },
        priorityScore: 75,
        pathway: {
          phases: [],
          totalDuration: 3,
          dependencies: [],
          milestones: []
        }
      };

      expect(validateImpactAnalyzedSuggestion(validSuggestion)).toBe(true);
    });

    it('should reject invalid impact analyzed suggestion', () => {
      const invalidSuggestion = {
        suggestion: 'Test suggestion',
        // Missing required fields
      } as any;

      expect(validateImpactAnalyzedSuggestion(invalidSuggestion)).toBe(false);
    });
  });

  describe('configuration handling', () => {
    it('should use default configuration when none provided', () => {
      const prioritizer = new ImpactBasedPrioritizer();
      expect(prioritizer).toBeInstanceOf(ImpactBasedPrioritizer);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<PrioritizationConfig> = {
        impactWeight: 0.5,
        maxSuggestions: 5
      };
      const prioritizer = new ImpactBasedPrioritizer(customConfig);
      expect(prioritizer).toBeInstanceOf(ImpactBasedPrioritizer);
    });
  });

  describe('edge cases', () => {
    it('should handle suggestions with very high complexity', async () => {
      const veryHighComplexityMetrics = {
        ...mockComplexityMetrics,
        overallComplexity: 95,
        cyclomaticComplexity: 50,
        nestingDepth: 15
      };

      const prioritized = await prioritizer.prioritizeSuggestions(
        mockSuggestions,
        mockProjectContext,
        veryHighComplexityMetrics,
        mockDeveloperProfile
      );

      expect(prioritized.length).toBeGreaterThanOrEqual(0);
      // Very high complexity should still produce valid results
      prioritized.forEach(suggestion => {
        expect(suggestion.priorityScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.priorityScore).toBeLessThanOrEqual(100);
      });
    });

    it('should handle expert developer profile', async () => {
      const expertProfile = {
        ...mockDeveloperProfile,
        experienceLevel: 'expert' as const
      };

      const prioritized = await prioritizer.prioritizeSuggestions(
        mockSuggestions,
        mockProjectContext,
        mockComplexityMetrics,
        expertProfile
      );

      expect(prioritized.length).toBeGreaterThan(0);
      // Expert developers should have better feasibility scores
      prioritized.forEach(suggestion => {
        expect(suggestion.feasibility.organizational.teamReadiness).toBe('very-ready');
      });
    });

    it('should handle legacy project context', async () => {
      const legacyProjectContext = {
        ...mockProjectContext,
        metadata: {
          ...mockProjectContext.metadata,
          maturity: 'legacy' as const
        }
      };

      const prioritized = await prioritizer.prioritizeSuggestions(
        mockSuggestions,
        legacyProjectContext,
        mockComplexityMetrics,
        mockDeveloperProfile
      );

      expect(prioritized.length).toBeGreaterThanOrEqual(0);
      // Legacy projects should have additional constraints
      prioritized.forEach(suggestion => {
        expect(suggestion.feasibility.technical.constraints).toContain('Legacy system constraints');
      });
    });
  });
});