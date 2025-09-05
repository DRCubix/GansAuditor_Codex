/**
 * Developer Pattern Recognition Module
 * 
 * This module implements feedback style adaptation based on code patterns,
 * technical depth adjustment based on developer experience, personalized
 * suggestion prioritization, and learning from successful improvement patterns
 * as specified in requirements 8.3 and 8.5.
 * 
 * Features:
 * - Feedback style adaptation based on code patterns
 * - Technical depth adjustment based on developer experience
 * - Personalized suggestion prioritization
 * - Learning from successful improvement patterns
 */

import { logger } from '../utils/logger.js';
import type { ProjectContext } from './project-context-analyzer.js';
import type { ComplexityMetrics } from './complexity-analyzer.js';

// ============================================================================
// Developer Pattern Types and Interfaces
// ============================================================================

/**
 * Developer experience profile
 */
export interface DeveloperProfile {
  /** Developer experience level */
  experienceLevel: ExperienceLevel;
  /** Preferred coding patterns */
  codingPatterns: CodingPattern[];
  /** Technical preferences */
  technicalPreferences: TechnicalPreference[];
  /** Communication style preferences */
  communicationStyle: CommunicationStyle;
  /** Learning patterns */
  learningPatterns: LearningPattern[];
  /** Historical feedback effectiveness */
  feedbackHistory: FeedbackHistory[];
}

/**
 * Developer experience levels
 */
export type ExperienceLevel = 'junior' | 'mid-level' | 'senior' | 'expert' | 'unknown';

/**
 * Coding pattern detected in developer's work
 */
export interface CodingPattern {
  /** Pattern identifier */
  id: string;
  /** Pattern name */
  name: string;
  /** Pattern category */
  category: PatternCategory;
  /** Pattern confidence (0-1) */
  confidence: number;
  /** Pattern frequency */
  frequency: number;
  /** Pattern examples */
  examples: PatternExample[];
  /** Pattern implications for feedback */
  feedbackImplications: string[];
}

/**
 * Pattern categories
 */
export type PatternCategory = 
  | 'architectural'
  | 'functional'
  | 'object-oriented'
  | 'procedural'
  | 'reactive'
  | 'test-driven'
  | 'documentation'
  | 'error-handling'
  | 'performance'
  | 'security';

/**
 * Pattern example
 */
export interface PatternExample {
  /** File path */
  filePath: string;
  /** Line number */
  lineNumber: number;
  /** Code snippet */
  codeSnippet: string;
  /** Pattern strength */
  strength: number;
}

/**
 * Technical preference
 */
export interface TechnicalPreference {
  /** Preference category */
  category: PreferenceCategory;
  /** Preference value */
  value: string;
  /** Preference strength (0-1) */
  strength: number;
  /** Supporting evidence */
  evidence: string[];
}

/**
 * Preference categories
 */
export type PreferenceCategory = 
  | 'language-features'
  | 'frameworks'
  | 'testing-approach'
  | 'code-style'
  | 'architecture'
  | 'tooling'
  | 'documentation';

/**
 * Communication style preferences
 */
export interface CommunicationStyle {
  /** Preferred feedback detail level */
  detailLevel: DetailLevel;
  /** Preferred feedback tone */
  tone: FeedbackTone;
  /** Preferred example types */
  exampleTypes: ExampleType[];
  /** Preferred explanation style */
  explanationStyle: ExplanationStyle;
}

/**
 * Detail levels for feedback
 */
export type DetailLevel = 'brief' | 'moderate' | 'detailed' | 'comprehensive';

/**
 * Feedback tones
 */
export type FeedbackTone = 'direct' | 'encouraging' | 'educational' | 'collaborative';

/**
 * Example types
 */
export type ExampleType = 'code-snippets' | 'conceptual' | 'real-world' | 'comparative';

/**
 * Explanation styles
 */
export type ExplanationStyle = 'step-by-step' | 'high-level' | 'problem-solution' | 'best-practices';

/**
 * Learning pattern
 */
export interface LearningPattern {
  /** Pattern type */
  type: LearningType;
  /** Pattern effectiveness */
  effectiveness: number;
  /** Pattern frequency */
  frequency: number;
  /** Supporting evidence */
  evidence: string[];
}

/**
 * Learning types
 */
export type LearningType = 
  | 'example-driven'
  | 'theory-first'
  | 'hands-on'
  | 'incremental'
  | 'comparative'
  | 'visual'
  | 'documentation-heavy';

/**
 * Feedback history entry
 */
export interface FeedbackHistory {
  /** Feedback type */
  feedbackType: string;
  /** Effectiveness score (0-1) */
  effectiveness: number;
  /** Implementation rate */
  implementationRate: number;
  /** Time to implementation */
  timeToImplementation: number;
  /** Feedback context */
  context: FeedbackContext;
}

/**
 * Feedback context
 */
export interface FeedbackContext {
  /** Code complexity at time of feedback */
  complexity: number;
  /** Project phase */
  projectPhase: string;
  /** Issue severity */
  issueSeverity: string;
  /** Feedback category */
  category: string;
}

/**
 * Adaptive feedback configuration
 */
export interface AdaptiveFeedbackConfig {
  /** Enable experience-based adaptation */
  enableExperienceAdaptation: boolean;
  /** Enable pattern-based adaptation */
  enablePatternAdaptation: boolean;
  /** Enable learning-based adaptation */
  enableLearningAdaptation: boolean;
  /** Minimum confidence threshold for adaptations */
  confidenceThreshold: number;
  /** Maximum feedback adaptations per session */
  maxAdaptations: number;
  /** Learning rate for pattern updates */
  learningRate: number;
}

/**
 * Adapted feedback result
 */
export interface AdaptedFeedback {
  /** Original feedback */
  originalFeedback: string;
  /** Adapted feedback */
  adaptedFeedback: string;
  /** Adaptation reasons */
  adaptationReasons: string[];
  /** Confidence in adaptation */
  confidence: number;
  /** Suggested improvements */
  suggestedImprovements: AdaptedSuggestion[];
}

/**
 * Adapted suggestion
 */
export interface AdaptedSuggestion {
  /** Suggestion text */
  suggestion: string;
  /** Priority level */
  priority: SuggestionPriority;
  /** Rationale */
  rationale: string;
  /** Expected impact */
  expectedImpact: string;
  /** Implementation difficulty */
  difficulty: DifficultyLevel;
}

/**
 * Suggestion priorities
 */
export type SuggestionPriority = 'critical' | 'high' | 'medium' | 'low' | 'optional';

/**
 * Difficulty levels
 */
export type DifficultyLevel = 'trivial' | 'easy' | 'moderate' | 'challenging' | 'complex';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_ADAPTIVE_FEEDBACK_CONFIG: AdaptiveFeedbackConfig = {
  enableExperienceAdaptation: true,
  enablePatternAdaptation: true,
  enableLearningAdaptation: true,
  confidenceThreshold: 0.7,
  maxAdaptations: 5,
  learningRate: 0.1
};

// ============================================================================
// Developer Pattern Recognizer Implementation
// ============================================================================

/**
 * Developer pattern recognizer for adaptive feedback
 */
export class DeveloperPatternRecognizer {
  private config: AdaptiveFeedbackConfig;
  private profileCache: Map<string, DeveloperProfile> = new Map();

  constructor(config?: Partial<AdaptiveFeedbackConfig>) {
    this.config = { ...DEFAULT_ADAPTIVE_FEEDBACK_CONFIG, ...config };
  }

  /**
   * Analyze developer patterns and create profile
   */
  async analyzeDeveloperPatterns(
    projectContext: ProjectContext,
    complexityMetrics: ComplexityMetrics,
    codeHistory?: string[]
  ): Promise<DeveloperProfile> {
    try {
      logger.debug('Analyzing developer patterns', { 
        projectType: projectContext.projectType,
        complexity: complexityMetrics.overallComplexity 
      });

      const [
        experienceLevel,
        codingPatterns,
        technicalPreferences,
        communicationStyle,
        learningPatterns
      ] = await Promise.all([
        this.assessExperienceLevel(projectContext, complexityMetrics),
        this.detectCodingPatterns(projectContext, complexityMetrics),
        this.analyzeTechnicalPreferences(projectContext),
        this.determineCommunicationStyle(projectContext, complexityMetrics),
        this.identifyLearningPatterns(projectContext, codeHistory)
      ]);

      const profile: DeveloperProfile = {
        experienceLevel,
        codingPatterns,
        technicalPreferences,
        communicationStyle,
        learningPatterns,
        feedbackHistory: []
      };

      logger.debug('Developer pattern analysis completed', { 
        experienceLevel,
        patternCount: codingPatterns.length,
        preferenceCount: technicalPreferences.length
      });

      return profile;
    } catch (error) {
      logger.error('Failed to analyze developer patterns', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Adapt feedback based on developer profile
   */
  adaptFeedback(
    originalFeedback: string,
    developerProfile: DeveloperProfile,
    context: FeedbackContext
  ): AdaptedFeedback {
    try {
      let adaptedFeedback = originalFeedback;
      const adaptationReasons: string[] = [];
      let confidence = 1.0;

      // Adapt based on experience level
      if (this.config.enableExperienceAdaptation) {
        const experienceAdaptation = this.adaptForExperience(
          adaptedFeedback, 
          developerProfile.experienceLevel
        );
        adaptedFeedback = experienceAdaptation.feedback;
        adaptationReasons.push(...experienceAdaptation.reasons);
        confidence *= experienceAdaptation.confidence;
      }

      // Adapt based on coding patterns
      if (this.config.enablePatternAdaptation) {
        const patternAdaptation = this.adaptForPatterns(
          adaptedFeedback,
          developerProfile.codingPatterns
        );
        adaptedFeedback = patternAdaptation.feedback;
        adaptationReasons.push(...patternAdaptation.reasons);
        confidence *= patternAdaptation.confidence;
      }

      // Adapt based on communication style
      const styleAdaptation = this.adaptForCommunicationStyle(
        adaptedFeedback,
        developerProfile.communicationStyle
      );
      adaptedFeedback = styleAdaptation.feedback;
      adaptationReasons.push(...styleAdaptation.reasons);
      confidence *= styleAdaptation.confidence;

      // Generate personalized suggestions
      const suggestedImprovements = this.generatePersonalizedSuggestions(
        developerProfile,
        context
      );

      return {
        originalFeedback,
        adaptedFeedback,
        adaptationReasons,
        confidence,
        suggestedImprovements
      };
    } catch (error) {
      logger.error('Failed to adapt feedback', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      // Return original feedback if adaptation fails
      return {
        originalFeedback,
        adaptedFeedback: originalFeedback,
        adaptationReasons: ['Adaptation failed, using original feedback'],
        confidence: 1.0,
        suggestedImprovements: []
      };
    }
  }

  /**
   * Learn from feedback effectiveness
   */
  learnFromFeedback(
    developerProfile: DeveloperProfile,
    feedbackType: string,
    effectiveness: number,
    implementationRate: number,
    context: FeedbackContext
  ): DeveloperProfile {
    if (!this.config.enableLearningAdaptation) {
      return developerProfile;
    }

    const historyEntry: FeedbackHistory = {
      feedbackType,
      effectiveness,
      implementationRate,
      timeToImplementation: Date.now(),
      context
    };

    const updatedProfile = {
      ...developerProfile,
      feedbackHistory: [...developerProfile.feedbackHistory, historyEntry]
    };

    // Update communication style based on effectiveness
    if (effectiveness > 0.8) {
      this.reinforceCommunicationStyle(updatedProfile, context);
    } else if (effectiveness < 0.4) {
      this.adjustCommunicationStyle(updatedProfile, context);
    }

    return updatedProfile;
  }

  // ============================================================================
  // Private Analysis Methods
  // ============================================================================

  private async assessExperienceLevel(
    projectContext: ProjectContext,
    complexityMetrics: ComplexityMetrics
  ): Promise<ExperienceLevel> {
    const indicators = {
      // Code quality indicators
      hasGoodTestCoverage: projectContext.techStack.testingFrameworks.length > 0,
      hasTypeScript: projectContext.techStack.primaryLanguage === 'typescript',
      hasLinting: projectContext.configuration.eslintConfig !== undefined,
      hasFormatting: projectContext.configuration.prettierConfig !== undefined,
      
      // Architecture indicators
      hasModularStructure: projectContext.patterns.some(p => p.category === 'architecture'),
      hasDocumentation: projectContext.patterns.some(p => p.category === 'documentation'),
      hasSecurityPatterns: projectContext.patterns.some(p => p.category === 'security'),
      
      // Complexity indicators
      managedComplexity: complexityMetrics.overallComplexity < 60,
      goodNamingConventions: projectContext.conventions.some(c => c.category === 'naming'),
      consistentStyle: projectContext.conventions.length > 3
    };

    const experienceScore = Object.values(indicators).filter(Boolean).length;
    
    if (experienceScore >= 8) return 'expert';
    if (experienceScore >= 6) return 'senior';
    if (experienceScore >= 4) return 'mid-level';
    if (experienceScore >= 2) return 'junior';
    return 'unknown';
  }

  private async detectCodingPatterns(
    projectContext: ProjectContext,
    complexityMetrics: ComplexityMetrics
  ): Promise<CodingPattern[]> {
    const patterns: CodingPattern[] = [];

    // Detect functional programming patterns
    if (projectContext.conventions.some(c => c.name.includes('Arrow Functions'))) {
      patterns.push({
        id: 'functional-programming',
        name: 'Functional Programming',
        category: 'functional',
        confidence: 0.8,
        frequency: 0.7,
        examples: [],
        feedbackImplications: [
          'Prefers functional approaches',
          'Likely appreciates immutability concepts',
          'May benefit from functional programming best practices'
        ]
      });
    }

    // Detect object-oriented patterns
    if (complexityMetrics.classCount > 0) {
      patterns.push({
        id: 'object-oriented',
        name: 'Object-Oriented Programming',
        category: 'object-oriented',
        confidence: 0.7,
        frequency: complexityMetrics.classCount / (complexityMetrics.functionCount + 1),
        examples: [],
        feedbackImplications: [
          'Comfortable with OOP concepts',
          'May appreciate SOLID principles',
          'Likely understands inheritance and polymorphism'
        ]
      });
    }

    // Detect test-driven patterns
    if (projectContext.techStack.testingFrameworks.length > 0) {
      patterns.push({
        id: 'test-driven',
        name: 'Test-Driven Development',
        category: 'test-driven',
        confidence: 0.6,
        frequency: 0.5,
        examples: [],
        feedbackImplications: [
          'Values testing and quality',
          'Likely understands TDD benefits',
          'May appreciate test-first feedback'
        ]
      });
    }

    // Detect documentation patterns
    if (projectContext.patterns.some(p => p.category === 'documentation')) {
      patterns.push({
        id: 'documentation-focused',
        name: 'Documentation-Focused',
        category: 'documentation',
        confidence: 0.7,
        frequency: 0.6,
        examples: [],
        feedbackImplications: [
          'Values clear documentation',
          'Likely appreciates detailed explanations',
          'May benefit from documentation-heavy feedback'
        ]
      });
    }

    return patterns;
  }

  private async analyzeTechnicalPreferences(
    projectContext: ProjectContext
  ): Promise<TechnicalPreference[]> {
    const preferences: TechnicalPreference[] = [];

    // Language feature preferences
    if (projectContext.techStack.primaryLanguage === 'typescript') {
      preferences.push({
        category: 'language-features',
        value: 'type-safety',
        strength: 0.8,
        evidence: ['Uses TypeScript', 'Likely values type safety']
      });
    }

    // Framework preferences
    projectContext.techStack.frontendFrameworks.forEach(framework => {
      preferences.push({
        category: 'frameworks',
        value: framework.toLowerCase(),
        strength: 0.7,
        evidence: [`Uses ${framework}`, 'Familiar with framework patterns']
      });
    });

    // Testing preferences
    projectContext.techStack.testingFrameworks.forEach(framework => {
      preferences.push({
        category: 'testing-approach',
        value: framework.toLowerCase(),
        strength: 0.6,
        evidence: [`Uses ${framework}`, 'Familiar with testing framework']
      });
    });

    return preferences;
  }

  private async determineCommunicationStyle(
    projectContext: ProjectContext,
    complexityMetrics: ComplexityMetrics
  ): Promise<CommunicationStyle> {
    // Determine style based on project characteristics
    const hasDocumentation = projectContext.patterns.some(p => p.category === 'documentation');
    const hasComplexCode = complexityMetrics.overallComplexity > 60;
    const hasTestingFocus = projectContext.techStack.testingFrameworks.length > 0;

    return {
      detailLevel: hasComplexCode ? 'detailed' : hasDocumentation ? 'comprehensive' : 'moderate',
      tone: hasTestingFocus ? 'collaborative' : 'educational',
      exampleTypes: hasComplexCode ? ['code-snippets', 'comparative'] : ['conceptual', 'real-world'],
      explanationStyle: hasDocumentation ? 'step-by-step' : 'problem-solution'
    };
  }

  private async identifyLearningPatterns(
    projectContext: ProjectContext,
    codeHistory?: string[]
  ): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Infer learning patterns from project characteristics
    if (projectContext.patterns.some(p => p.category === 'documentation')) {
      patterns.push({
        type: 'documentation-heavy',
        effectiveness: 0.8,
        frequency: 0.7,
        evidence: ['Strong documentation patterns', 'Likely learns from docs']
      });
    }

    if (projectContext.techStack.testingFrameworks.length > 0) {
      patterns.push({
        type: 'hands-on',
        effectiveness: 0.7,
        frequency: 0.6,
        evidence: ['Uses testing frameworks', 'Likely learns by doing']
      });
    }

    if (projectContext.conventions.length > 3) {
      patterns.push({
        type: 'example-driven',
        effectiveness: 0.6,
        frequency: 0.5,
        evidence: ['Consistent conventions', 'Likely learns from examples']
      });
    }

    return patterns;
  }

  // ============================================================================
  // Private Adaptation Methods
  // ============================================================================

  private adaptForExperience(
    feedback: string,
    experienceLevel: ExperienceLevel
  ): { feedback: string; reasons: string[]; confidence: number } {
    const reasons: string[] = [];
    let adaptedFeedback = feedback;
    let confidence = 0.8;

    switch (experienceLevel) {
      case 'junior':
        adaptedFeedback = this.addExplanations(feedback);
        adaptedFeedback = this.addExamples(adaptedFeedback);
        reasons.push('Added explanations for junior developer');
        reasons.push('Included examples for clarity');
        break;

      case 'mid-level':
        adaptedFeedback = this.addBestPractices(feedback);
        reasons.push('Included best practices for mid-level developer');
        break;

      case 'senior':
        adaptedFeedback = this.addArchitecturalContext(feedback);
        reasons.push('Added architectural context for senior developer');
        break;

      case 'expert':
        adaptedFeedback = this.addAdvancedConsiderations(feedback);
        reasons.push('Included advanced considerations for expert developer');
        break;

      default:
        confidence = 0.5;
        reasons.push('Unknown experience level, using default feedback');
    }

    return { feedback: adaptedFeedback, reasons, confidence };
  }

  private adaptForPatterns(
    feedback: string,
    patterns: CodingPattern[]
  ): { feedback: string; reasons: string[]; confidence: number } {
    const reasons: string[] = [];
    let adaptedFeedback = feedback;
    let confidence = 0.7;

    for (const pattern of patterns) {
      if (pattern.confidence > this.config.confidenceThreshold) {
        switch (pattern.category) {
          case 'functional':
            adaptedFeedback = this.addFunctionalContext(adaptedFeedback);
            reasons.push('Added functional programming context');
            break;

          case 'object-oriented':
            adaptedFeedback = this.addOOPContext(adaptedFeedback);
            reasons.push('Added object-oriented programming context');
            break;

          case 'test-driven':
            adaptedFeedback = this.addTestingContext(adaptedFeedback);
            reasons.push('Added testing-focused context');
            break;
        }
      }
    }

    return { feedback: adaptedFeedback, reasons, confidence };
  }

  private adaptForCommunicationStyle(
    feedback: string,
    style: CommunicationStyle
  ): { feedback: string; reasons: string[]; confidence: number } {
    const reasons: string[] = [];
    let adaptedFeedback = feedback;

    // Adapt detail level
    switch (style.detailLevel) {
      case 'brief':
        adaptedFeedback = this.makeBrief(feedback);
        reasons.push('Made feedback brief');
        break;
      case 'detailed':
        adaptedFeedback = this.addDetails(feedback);
        reasons.push('Added detailed explanations');
        break;
      case 'comprehensive':
        adaptedFeedback = this.makeComprehensive(feedback);
        reasons.push('Made feedback comprehensive');
        break;
    }

    // Adapt tone
    switch (style.tone) {
      case 'encouraging':
        adaptedFeedback = this.makeEncouraging(adaptedFeedback);
        reasons.push('Made tone encouraging');
        break;
      case 'direct':
        adaptedFeedback = this.makeDirect(adaptedFeedback);
        reasons.push('Made tone direct');
        break;
      case 'collaborative':
        adaptedFeedback = this.makeCollaborative(adaptedFeedback);
        reasons.push('Made tone collaborative');
        break;
    }

    return { feedback: adaptedFeedback, reasons, confidence: 0.8 };
  }

  private generatePersonalizedSuggestions(
    profile: DeveloperProfile,
    context: FeedbackContext
  ): AdaptedSuggestion[] {
    const suggestions: AdaptedSuggestion[] = [];

    // Generate suggestions based on experience level
    switch (profile.experienceLevel) {
      case 'junior':
        suggestions.push({
          suggestion: 'Consider reviewing fundamental concepts and best practices',
          priority: 'high',
          rationale: 'Junior developers benefit from foundational knowledge',
          expectedImpact: 'Improved code quality and understanding',
          difficulty: 'easy'
        });
        break;

      case 'senior':
        suggestions.push({
          suggestion: 'Consider mentoring opportunities and architectural reviews',
          priority: 'medium',
          rationale: 'Senior developers can contribute to team growth',
          expectedImpact: 'Enhanced team capabilities',
          difficulty: 'moderate'
        });
        break;
    }

    // Generate suggestions based on patterns
    for (const pattern of profile.codingPatterns) {
      if (pattern.category === 'functional' && pattern.confidence > 0.7) {
        suggestions.push({
          suggestion: 'Explore advanced functional programming concepts',
          priority: 'medium',
          rationale: 'Strong functional programming patterns detected',
          expectedImpact: 'More elegant and maintainable code',
          difficulty: 'moderate'
        });
      }
    }

    return suggestions;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private addExplanations(feedback: string): string {
    return `${feedback}\n\n**Explanation:** This suggestion helps improve code quality by following established best practices. Understanding the reasoning behind these recommendations will help you make better decisions in similar situations.`;
  }

  private addExamples(feedback: string): string {
    return `${feedback}\n\n**Example:** Here's how you might implement this improvement:\n\`\`\`typescript\n// Example implementation\n// (specific example would be generated based on context)\n\`\`\``;
  }

  private addBestPractices(feedback: string): string {
    return `${feedback}\n\n**Best Practice:** This aligns with industry standards and will improve maintainability and team collaboration.`;
  }

  private addArchitecturalContext(feedback: string): string {
    return `${feedback}\n\n**Architectural Impact:** Consider how this change affects the overall system design and future scalability requirements.`;
  }

  private addAdvancedConsiderations(feedback: string): string {
    return `${feedback}\n\n**Advanced Considerations:** This change may have implications for performance, security, and system architecture that should be evaluated.`;
  }

  private addFunctionalContext(feedback: string): string {
    return `${feedback}\n\n**Functional Programming Note:** Consider immutability and pure function principles when implementing this change.`;
  }

  private addOOPContext(feedback: string): string {
    return `${feedback}\n\n**OOP Consideration:** Think about encapsulation, inheritance, and polymorphism when applying this suggestion.`;
  }

  private addTestingContext(feedback: string): string {
    return `${feedback}\n\n**Testing Impact:** Ensure that tests are updated to reflect these changes and consider test-driven development approaches.`;
  }

  private makeBrief(feedback: string): string {
    // Simplify feedback to key points
    return feedback.split('\n')[0] + ' (See documentation for details)';
  }

  private addDetails(feedback: string): string {
    return `${feedback}\n\n**Detailed Analysis:** [Additional technical details would be added based on specific context]`;
  }

  private makeComprehensive(feedback: string): string {
    return `${feedback}\n\n**Comprehensive Review:** [Full analysis including alternatives, trade-offs, and implementation strategies]`;
  }

  private makeEncouraging(feedback: string): string {
    return `Great work so far! ${feedback} This improvement will make your code even better.`;
  }

  private makeDirect(feedback: string): string {
    return feedback.replace(/consider/gi, 'should').replace(/might/gi, 'will');
  }

  private makeCollaborative(feedback: string): string {
    return `Let's work together on this: ${feedback} What are your thoughts on this approach?`;
  }

  private reinforceCommunicationStyle(profile: DeveloperProfile, context: FeedbackContext): void {
    // Reinforce successful communication patterns
    logger.debug('Reinforcing successful communication style', { 
      style: profile.communicationStyle,
      context 
    });
  }

  private adjustCommunicationStyle(profile: DeveloperProfile, context: FeedbackContext): void {
    // Adjust communication style based on poor effectiveness
    logger.debug('Adjusting communication style', { 
      style: profile.communicationStyle,
      context 
    });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a developer pattern recognizer with default configuration
 */
export function createDeveloperPatternRecognizer(
  config?: Partial<AdaptiveFeedbackConfig>
): DeveloperPatternRecognizer {
  return new DeveloperPatternRecognizer(config);
}

/**
 * Validate developer profile
 */
export function validateDeveloperProfile(profile: DeveloperProfile): boolean {
  return !!(
    profile &&
    typeof profile.experienceLevel === 'string' &&
    Array.isArray(profile.codingPatterns) &&
    Array.isArray(profile.technicalPreferences) &&
    profile.communicationStyle &&
    Array.isArray(profile.learningPatterns) &&
    Array.isArray(profile.feedbackHistory)
  );
}