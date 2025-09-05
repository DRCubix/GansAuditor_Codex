/**
 * Unit tests for DeveloperPatternRecognizer
 * 
 * Tests developer pattern recognition and adaptive feedback functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  DeveloperPatternRecognizer, 
  createDeveloperPatternRecognizer,
  validateDeveloperProfile,
  type DeveloperProfile,
  type AdaptiveFeedbackConfig,
  type FeedbackContext,
  DEFAULT_ADAPTIVE_FEEDBACK_CONFIG
} from '../developer-pattern-recognizer.js';
import type { ProjectContext } from '../project-context-analyzer.js';
import type { ComplexityMetrics } from '../complexity-analyzer.js';

describe('DeveloperPatternRecognizer', () => {
  let recognizer: DeveloperPatternRecognizer;
  let mockProjectContext: ProjectContext;
  let mockComplexityMetrics: ComplexityMetrics;
  let mockFeedbackContext: FeedbackContext;

  beforeEach(() => {
    recognizer = createDeveloperPatternRecognizer();
    
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
      patterns: [
        {
          id: 'architecture-pattern',
          name: 'MVC Architecture',
          description: 'Uses MVC pattern',
          category: 'architecture',
          rules: [],
          examples: [],
          sourceFile: 'steering.md'
        }
      ],
      conventions: [
        {
          id: 'naming-convention',
          name: 'Variable Naming: camelCase',
          category: 'naming',
          pattern: '^[a-z][a-zA-Z0-9]*$',
          confidence: 0.8,
          evidence: [],
          description: 'Variables use camelCase'
        }
      ],
      configuration: {
        packageJson: { name: 'test-project' },
        eslintConfig: { rules: {} }
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

    mockFeedbackContext = {
      complexity: 45,
      projectPhase: 'development',
      issueSeverity: 'medium',
      category: 'code-quality'
    };
  });

  describe('constructor', () => {
    it('should create recognizer with default config', () => {
      const defaultRecognizer = new DeveloperPatternRecognizer();
      expect(defaultRecognizer).toBeInstanceOf(DeveloperPatternRecognizer);
    });

    it('should create recognizer with custom config', () => {
      const customConfig: Partial<AdaptiveFeedbackConfig> = {
        confidenceThreshold: 0.8,
        maxAdaptations: 3
      };
      const customRecognizer = new DeveloperPatternRecognizer(customConfig);
      expect(customRecognizer).toBeInstanceOf(DeveloperPatternRecognizer);
    });
  });

  describe('analyzeDeveloperPatterns', () => {
    it('should analyze developer patterns successfully', async () => {
      const profile = await recognizer.analyzeDeveloperPatterns(
        mockProjectContext,
        mockComplexityMetrics
      );

      expect(profile).toBeDefined();
      expect(profile.experienceLevel).toBeDefined();
      expect(Array.isArray(profile.codingPatterns)).toBe(true);
      expect(Array.isArray(profile.technicalPreferences)).toBe(true);
      expect(profile.communicationStyle).toBeDefined();
      expect(Array.isArray(profile.learningPatterns)).toBe(true);
      expect(Array.isArray(profile.feedbackHistory)).toBe(true);
    });

    it('should assess experience level correctly for senior developer', async () => {
      // Mock a senior developer project
      const seniorProjectContext = {
        ...mockProjectContext,
        techStack: {
          ...mockProjectContext.techStack,
          testingFrameworks: ['Jest', 'Cypress']
        },
        patterns: [
          ...mockProjectContext.patterns,
          { 
            id: 'security-pattern', 
            name: 'Security Guidelines', 
            category: 'security' as const,
            description: 'Security patterns',
            rules: [],
            examples: [],
            sourceFile: 'security.md'
          },
          { 
            id: 'docs-pattern', 
            name: 'Documentation Standards', 
            category: 'documentation' as const,
            description: 'Documentation patterns',
            rules: [],
            examples: [],
            sourceFile: 'docs.md'
          }
        ],
        configuration: {
          ...mockProjectContext.configuration,
          eslintConfig: { rules: {} },
          prettierConfig: { semi: true }
        }
      };

      const profile = await recognizer.analyzeDeveloperPatterns(
        seniorProjectContext,
        { ...mockComplexityMetrics, overallComplexity: 35 }
      );

      expect(profile.experienceLevel).toBe('senior');
    });

    it('should assess experience level correctly for junior developer', async () => {
      // Mock a junior developer project
      const juniorProjectContext = {
        ...mockProjectContext,
        techStack: {
          ...mockProjectContext.techStack,
          primaryLanguage: 'javascript',
          testingFrameworks: []
        },
        patterns: [],
        conventions: [],
        configuration: {}
      };

      const profile = await recognizer.analyzeDeveloperPatterns(
        juniorProjectContext,
        { ...mockComplexityMetrics, overallComplexity: 75 }
      );

      expect(profile.experienceLevel).toBe('junior');
    });

    it('should detect functional programming patterns', async () => {
      const functionalProjectContext = {
        ...mockProjectContext,
        conventions: [
          {
            id: 'arrow-functions',
            name: 'Function Style: Arrow Functions',
            category: 'function-style' as const,
            pattern: 'const \\w+ = \\(',
            confidence: 0.8,
            evidence: [],
            description: 'Uses arrow functions'
          }
        ]
      };

      const profile = await recognizer.analyzeDeveloperPatterns(
        functionalProjectContext,
        mockComplexityMetrics
      );

      const functionalPattern = profile.codingPatterns.find(p => p.category === 'functional');
      expect(functionalPattern).toBeDefined();
      expect(functionalPattern?.name).toBe('Functional Programming');
    });

    it('should detect object-oriented patterns', async () => {
      const oopComplexityMetrics = {
        ...mockComplexityMetrics,
        classCount: 5,
        functionCount: 10
      };

      const profile = await recognizer.analyzeDeveloperPatterns(
        mockProjectContext,
        oopComplexityMetrics
      );

      const oopPattern = profile.codingPatterns.find(p => p.category === 'object-oriented');
      expect(oopPattern).toBeDefined();
      expect(oopPattern?.name).toBe('Object-Oriented Programming');
    });

    it('should detect test-driven patterns', async () => {
      const profile = await recognizer.analyzeDeveloperPatterns(
        mockProjectContext,
        mockComplexityMetrics
      );

      const testPattern = profile.codingPatterns.find(p => p.category === 'test-driven');
      expect(testPattern).toBeDefined();
      expect(testPattern?.name).toBe('Test-Driven Development');
    });

    it('should analyze technical preferences', async () => {
      const profile = await recognizer.analyzeDeveloperPatterns(
        mockProjectContext,
        mockComplexityMetrics
      );

      expect(profile.technicalPreferences.length).toBeGreaterThan(0);
      
      const typeSafetyPref = profile.technicalPreferences.find(p => p.value === 'type-safety');
      expect(typeSafetyPref).toBeDefined();
      
      const reactPref = profile.technicalPreferences.find(p => p.value === 'react');
      expect(reactPref).toBeDefined();
    });

    it('should determine communication style', async () => {
      const profile = await recognizer.analyzeDeveloperPatterns(
        mockProjectContext,
        mockComplexityMetrics
      );

      expect(profile.communicationStyle).toBeDefined();
      expect(profile.communicationStyle.detailLevel).toBeDefined();
      expect(profile.communicationStyle.tone).toBeDefined();
      expect(Array.isArray(profile.communicationStyle.exampleTypes)).toBe(true);
      expect(profile.communicationStyle.explanationStyle).toBeDefined();
    });
  });

  describe('adaptFeedback', () => {
    let mockProfile: DeveloperProfile;

    beforeEach(() => {
      mockProfile = {
        experienceLevel: 'mid-level',
        codingPatterns: [
          {
            id: 'functional',
            name: 'Functional Programming',
            category: 'functional',
            confidence: 0.8,
            frequency: 0.7,
            examples: [],
            feedbackImplications: ['Prefers functional approaches']
          }
        ],
        technicalPreferences: [
          {
            category: 'language-features',
            value: 'type-safety',
            strength: 0.8,
            evidence: ['Uses TypeScript']
          }
        ],
        communicationStyle: {
          detailLevel: 'moderate',
          tone: 'educational',
          exampleTypes: ['code-snippets'],
          explanationStyle: 'step-by-step'
        },
        learningPatterns: [],
        feedbackHistory: []
      };
    });

    it('should adapt feedback for experience level', () => {
      const originalFeedback = 'Consider refactoring this function.';
      
      const adapted = recognizer.adaptFeedback(
        originalFeedback,
        mockProfile,
        mockFeedbackContext
      );

      expect(adapted.adaptedFeedback).not.toBe(originalFeedback);
      expect(adapted.adaptationReasons).toContain('Included best practices for mid-level developer');
      expect(adapted.confidence).toBeGreaterThan(0);
    });

    it('should adapt feedback for junior developer', () => {
      const juniorProfile = {
        ...mockProfile,
        experienceLevel: 'junior' as const
      };

      const originalFeedback = 'Refactor this code.';
      
      const adapted = recognizer.adaptFeedback(
        originalFeedback,
        juniorProfile,
        mockFeedbackContext
      );

      expect(adapted.adaptedFeedback).toContain('Explanation:');
      expect(adapted.adaptedFeedback).toContain('Example:');
      expect(adapted.adaptationReasons).toContain('Added explanations for junior developer');
    });

    it('should adapt feedback for senior developer', () => {
      const seniorProfile = {
        ...mockProfile,
        experienceLevel: 'senior' as const
      };

      const originalFeedback = 'Improve this implementation.';
      
      const adapted = recognizer.adaptFeedback(
        originalFeedback,
        seniorProfile,
        mockFeedbackContext
      );

      expect(adapted.adaptedFeedback).toContain('Architectural Impact:');
      expect(adapted.adaptationReasons).toContain('Added architectural context for senior developer');
    });

    it('should adapt feedback for coding patterns', () => {
      const originalFeedback = 'Optimize this function.';
      
      const adapted = recognizer.adaptFeedback(
        originalFeedback,
        mockProfile,
        mockFeedbackContext
      );

      expect(adapted.adaptedFeedback).toContain('Functional Programming Note:');
      expect(adapted.adaptationReasons).toContain('Added functional programming context');
    });

    it('should adapt feedback for communication style', () => {
      const briefProfile = {
        ...mockProfile,
        communicationStyle: {
          ...mockProfile.communicationStyle,
          detailLevel: 'brief' as const,
          tone: 'direct' as const
        }
      };

      const originalFeedback = 'Consider improving this code for better maintainability.';
      
      const adapted = recognizer.adaptFeedback(
        originalFeedback,
        briefProfile,
        mockFeedbackContext
      );

      expect(adapted.adaptedFeedback.length).toBeLessThan(originalFeedback.length + 50);
      expect(adapted.adaptationReasons).toContain('Made feedback brief');
      expect(adapted.adaptationReasons).toContain('Made tone direct');
    });

    it('should generate personalized suggestions', () => {
      const adapted = recognizer.adaptFeedback(
        'Improve code quality.',
        mockProfile,
        mockFeedbackContext
      );

      expect(Array.isArray(adapted.suggestedImprovements)).toBe(true);
      if (adapted.suggestedImprovements.length > 0) {
        const suggestion = adapted.suggestedImprovements[0];
        expect(suggestion.suggestion).toBeDefined();
        expect(suggestion.priority).toBeDefined();
        expect(suggestion.rationale).toBeDefined();
        expect(suggestion.expectedImpact).toBeDefined();
        expect(suggestion.difficulty).toBeDefined();
      }
    });

    it('should handle adaptation errors gracefully', () => {
      const invalidProfile = {} as DeveloperProfile;
      
      const adapted = recognizer.adaptFeedback(
        'Test feedback',
        invalidProfile,
        mockFeedbackContext
      );

      expect(adapted.originalFeedback).toBe('Test feedback');
      expect(adapted.adaptedFeedback).toBe('Test feedback');
      expect(adapted.adaptationReasons).toContain('Adaptation failed, using original feedback');
    });
  });

  describe('learnFromFeedback', () => {
    let mockProfile: DeveloperProfile;

    beforeEach(() => {
      mockProfile = {
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
    });

    it('should learn from effective feedback', () => {
      const updatedProfile = recognizer.learnFromFeedback(
        mockProfile,
        'code-quality',
        0.9, // High effectiveness
        0.8, // High implementation rate
        mockFeedbackContext
      );

      expect(updatedProfile.feedbackHistory.length).toBe(1);
      expect(updatedProfile.feedbackHistory[0].effectiveness).toBe(0.9);
      expect(updatedProfile.feedbackHistory[0].implementationRate).toBe(0.8);
    });

    it('should learn from ineffective feedback', () => {
      const updatedProfile = recognizer.learnFromFeedback(
        mockProfile,
        'code-quality',
        0.2, // Low effectiveness
        0.1, // Low implementation rate
        mockFeedbackContext
      );

      expect(updatedProfile.feedbackHistory.length).toBe(1);
      expect(updatedProfile.feedbackHistory[0].effectiveness).toBe(0.2);
    });

    it('should not learn when learning is disabled', () => {
      const noLearningRecognizer = new DeveloperPatternRecognizer({
        enableLearningAdaptation: false
      });

      const updatedProfile = noLearningRecognizer.learnFromFeedback(
        mockProfile,
        'code-quality',
        0.9,
        0.8,
        mockFeedbackContext
      );

      expect(updatedProfile).toBe(mockProfile); // Should return same object
    });
  });

  describe('factory functions', () => {
    it('should create recognizer with createDeveloperPatternRecognizer', () => {
      const recognizer = createDeveloperPatternRecognizer();
      expect(recognizer).toBeInstanceOf(DeveloperPatternRecognizer);
    });

    it('should create recognizer with custom config', () => {
      const config: Partial<AdaptiveFeedbackConfig> = {
        confidenceThreshold: 0.9
      };
      const recognizer = createDeveloperPatternRecognizer(config);
      expect(recognizer).toBeInstanceOf(DeveloperPatternRecognizer);
    });
  });

  describe('validateDeveloperProfile', () => {
    it('should validate correct developer profile', () => {
      const validProfile: DeveloperProfile = {
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

      expect(validateDeveloperProfile(validProfile)).toBe(true);
    });

    it('should reject invalid developer profile', () => {
      const invalidProfile = {
        experienceLevel: 'mid-level',
        // Missing required fields
      } as any;

      expect(validateDeveloperProfile(invalidProfile)).toBe(false);
    });
  });

  describe('configuration handling', () => {
    it('should use default configuration when none provided', () => {
      const recognizer = new DeveloperPatternRecognizer();
      expect(recognizer).toBeInstanceOf(DeveloperPatternRecognizer);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<AdaptiveFeedbackConfig> = {
        confidenceThreshold: 0.9,
        maxAdaptations: 10
      };
      const recognizer = new DeveloperPatternRecognizer(customConfig);
      expect(recognizer).toBeInstanceOf(DeveloperPatternRecognizer);
    });
  });

  describe('pattern detection edge cases', () => {
    it('should handle projects with no patterns', async () => {
      const emptyProjectContext = {
        ...mockProjectContext,
        patterns: [],
        conventions: [],
        techStack: {
          ...mockProjectContext.techStack,
          testingFrameworks: []
        }
      };

      const profile = await recognizer.analyzeDeveloperPatterns(
        emptyProjectContext,
        { ...mockComplexityMetrics, classCount: 0 }
      );

      expect(profile.codingPatterns.length).toBe(0);
      expect(profile.experienceLevel).toBe('unknown');
    });

    it('should handle complex projects with multiple patterns', async () => {
      const complexProjectContext = {
        ...mockProjectContext,
        techStack: {
          ...mockProjectContext.techStack,
          testingFrameworks: ['Jest', 'Cypress', 'Playwright']
        },
        patterns: [
          ...mockProjectContext.patterns,
          { 
            id: 'security', 
            name: 'Security', 
            category: 'security' as const,
            description: 'Security patterns',
            rules: [],
            examples: [],
            sourceFile: 'security.md'
          },
          { 
            id: 'docs', 
            name: 'Documentation', 
            category: 'documentation' as const,
            description: 'Documentation patterns',
            rules: [],
            examples: [],
            sourceFile: 'docs.md'
          }
        ],
        conventions: [
          ...mockProjectContext.conventions,
          {
            id: 'arrow-functions',
            name: 'Function Style: Arrow Functions',
            category: 'function-style' as const,
            pattern: 'arrow',
            confidence: 0.9,
            evidence: [],
            description: 'Arrow functions'
          }
        ]
      };

      const profile = await recognizer.analyzeDeveloperPatterns(
        complexProjectContext,
        { ...mockComplexityMetrics, classCount: 8 }
      );

      expect(profile.codingPatterns.length).toBeGreaterThan(2);
      expect(profile.experienceLevel).toBe('expert');
    });
  });
});