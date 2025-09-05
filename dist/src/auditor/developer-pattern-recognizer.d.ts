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
import type { ProjectContext } from './project-context-analyzer.js';
import type { ComplexityMetrics } from './complexity-analyzer.js';
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
export type PatternCategory = 'architectural' | 'functional' | 'object-oriented' | 'procedural' | 'reactive' | 'test-driven' | 'documentation' | 'error-handling' | 'performance' | 'security';
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
export type PreferenceCategory = 'language-features' | 'frameworks' | 'testing-approach' | 'code-style' | 'architecture' | 'tooling' | 'documentation';
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
export type LearningType = 'example-driven' | 'theory-first' | 'hands-on' | 'incremental' | 'comparative' | 'visual' | 'documentation-heavy';
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
export declare const DEFAULT_ADAPTIVE_FEEDBACK_CONFIG: AdaptiveFeedbackConfig;
/**
 * Developer pattern recognizer for adaptive feedback
 */
export declare class DeveloperPatternRecognizer {
    private config;
    private profileCache;
    constructor(config?: Partial<AdaptiveFeedbackConfig>);
    /**
     * Analyze developer patterns and create profile
     */
    analyzeDeveloperPatterns(projectContext: ProjectContext, complexityMetrics: ComplexityMetrics, codeHistory?: string[]): Promise<DeveloperProfile>;
    /**
     * Adapt feedback based on developer profile
     */
    adaptFeedback(originalFeedback: string, developerProfile: DeveloperProfile, context: FeedbackContext): AdaptedFeedback;
    /**
     * Learn from feedback effectiveness
     */
    learnFromFeedback(developerProfile: DeveloperProfile, feedbackType: string, effectiveness: number, implementationRate: number, context: FeedbackContext): DeveloperProfile;
    private assessExperienceLevel;
    private detectCodingPatterns;
    private analyzeTechnicalPreferences;
    private determineCommunicationStyle;
    private identifyLearningPatterns;
    private adaptForExperience;
    private adaptForPatterns;
    private adaptForCommunicationStyle;
    private generatePersonalizedSuggestions;
    private addExplanations;
    private addExamples;
    private addBestPractices;
    private addArchitecturalContext;
    private addAdvancedConsiderations;
    private addFunctionalContext;
    private addOOPContext;
    private addTestingContext;
    private makeBrief;
    private addDetails;
    private makeComprehensive;
    private makeEncouraging;
    private makeDirect;
    private makeCollaborative;
    private reinforceCommunicationStyle;
    private adjustCommunicationStyle;
}
/**
 * Create a developer pattern recognizer with default configuration
 */
export declare function createDeveloperPatternRecognizer(config?: Partial<AdaptiveFeedbackConfig>): DeveloperPatternRecognizer;
/**
 * Validate developer profile
 */
export declare function validateDeveloperProfile(profile: DeveloperProfile): boolean;
//# sourceMappingURL=developer-pattern-recognizer.d.ts.map