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
// ============================================================================
// Default Configuration
// ============================================================================
export const DEFAULT_ADAPTIVE_FEEDBACK_CONFIG = {
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
    config;
    profileCache = new Map();
    constructor(config) {
        this.config = { ...DEFAULT_ADAPTIVE_FEEDBACK_CONFIG, ...config };
    }
    /**
     * Analyze developer patterns and create profile
     */
    async analyzeDeveloperPatterns(projectContext, complexityMetrics, codeHistory) {
        try {
            logger.debug('Analyzing developer patterns', {
                projectType: projectContext.projectType,
                complexity: complexityMetrics.overallComplexity
            });
            const [experienceLevel, codingPatterns, technicalPreferences, communicationStyle, learningPatterns] = await Promise.all([
                this.assessExperienceLevel(projectContext, complexityMetrics),
                this.detectCodingPatterns(projectContext, complexityMetrics),
                this.analyzeTechnicalPreferences(projectContext),
                this.determineCommunicationStyle(projectContext, complexityMetrics),
                this.identifyLearningPatterns(projectContext, codeHistory)
            ]);
            const profile = {
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
        }
        catch (error) {
            logger.error('Failed to analyze developer patterns', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    /**
     * Adapt feedback based on developer profile
     */
    adaptFeedback(originalFeedback, developerProfile, context) {
        try {
            let adaptedFeedback = originalFeedback;
            const adaptationReasons = [];
            let confidence = 1.0;
            // Adapt based on experience level
            if (this.config.enableExperienceAdaptation) {
                const experienceAdaptation = this.adaptForExperience(adaptedFeedback, developerProfile.experienceLevel);
                adaptedFeedback = experienceAdaptation.feedback;
                adaptationReasons.push(...experienceAdaptation.reasons);
                confidence *= experienceAdaptation.confidence;
            }
            // Adapt based on coding patterns
            if (this.config.enablePatternAdaptation) {
                const patternAdaptation = this.adaptForPatterns(adaptedFeedback, developerProfile.codingPatterns);
                adaptedFeedback = patternAdaptation.feedback;
                adaptationReasons.push(...patternAdaptation.reasons);
                confidence *= patternAdaptation.confidence;
            }
            // Adapt based on communication style
            const styleAdaptation = this.adaptForCommunicationStyle(adaptedFeedback, developerProfile.communicationStyle);
            adaptedFeedback = styleAdaptation.feedback;
            adaptationReasons.push(...styleAdaptation.reasons);
            confidence *= styleAdaptation.confidence;
            // Generate personalized suggestions
            const suggestedImprovements = this.generatePersonalizedSuggestions(developerProfile, context);
            return {
                originalFeedback,
                adaptedFeedback,
                adaptationReasons,
                confidence,
                suggestedImprovements
            };
        }
        catch (error) {
            logger.error('Failed to adapt feedback', error instanceof Error ? error : new Error(String(error)));
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
    learnFromFeedback(developerProfile, feedbackType, effectiveness, implementationRate, context) {
        if (!this.config.enableLearningAdaptation) {
            return developerProfile;
        }
        const historyEntry = {
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
        }
        else if (effectiveness < 0.4) {
            this.adjustCommunicationStyle(updatedProfile, context);
        }
        return updatedProfile;
    }
    // ============================================================================
    // Private Analysis Methods
    // ============================================================================
    async assessExperienceLevel(projectContext, complexityMetrics) {
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
        if (experienceScore >= 8)
            return 'expert';
        if (experienceScore >= 6)
            return 'senior';
        if (experienceScore >= 4)
            return 'mid-level';
        if (experienceScore >= 2)
            return 'junior';
        return 'unknown';
    }
    async detectCodingPatterns(projectContext, complexityMetrics) {
        const patterns = [];
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
    async analyzeTechnicalPreferences(projectContext) {
        const preferences = [];
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
    async determineCommunicationStyle(projectContext, complexityMetrics) {
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
    async identifyLearningPatterns(projectContext, codeHistory) {
        const patterns = [];
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
    adaptForExperience(feedback, experienceLevel) {
        const reasons = [];
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
    adaptForPatterns(feedback, patterns) {
        const reasons = [];
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
    adaptForCommunicationStyle(feedback, style) {
        const reasons = [];
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
    generatePersonalizedSuggestions(profile, context) {
        const suggestions = [];
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
    addExplanations(feedback) {
        return `${feedback}\n\n**Explanation:** This suggestion helps improve code quality by following established best practices. Understanding the reasoning behind these recommendations will help you make better decisions in similar situations.`;
    }
    addExamples(feedback) {
        return `${feedback}\n\n**Example:** Here's how you might implement this improvement:\n\`\`\`typescript\n// Example implementation\n// (specific example would be generated based on context)\n\`\`\``;
    }
    addBestPractices(feedback) {
        return `${feedback}\n\n**Best Practice:** This aligns with industry standards and will improve maintainability and team collaboration.`;
    }
    addArchitecturalContext(feedback) {
        return `${feedback}\n\n**Architectural Impact:** Consider how this change affects the overall system design and future scalability requirements.`;
    }
    addAdvancedConsiderations(feedback) {
        return `${feedback}\n\n**Advanced Considerations:** This change may have implications for performance, security, and system architecture that should be evaluated.`;
    }
    addFunctionalContext(feedback) {
        return `${feedback}\n\n**Functional Programming Note:** Consider immutability and pure function principles when implementing this change.`;
    }
    addOOPContext(feedback) {
        return `${feedback}\n\n**OOP Consideration:** Think about encapsulation, inheritance, and polymorphism when applying this suggestion.`;
    }
    addTestingContext(feedback) {
        return `${feedback}\n\n**Testing Impact:** Ensure that tests are updated to reflect these changes and consider test-driven development approaches.`;
    }
    makeBrief(feedback) {
        // Simplify feedback to key points
        return feedback.split('\n')[0] + ' (See documentation for details)';
    }
    addDetails(feedback) {
        return `${feedback}\n\n**Detailed Analysis:** [Additional technical details would be added based on specific context]`;
    }
    makeComprehensive(feedback) {
        return `${feedback}\n\n**Comprehensive Review:** [Full analysis including alternatives, trade-offs, and implementation strategies]`;
    }
    makeEncouraging(feedback) {
        return `Great work so far! ${feedback} This improvement will make your code even better.`;
    }
    makeDirect(feedback) {
        return feedback.replace(/consider/gi, 'should').replace(/might/gi, 'will');
    }
    makeCollaborative(feedback) {
        return `Let's work together on this: ${feedback} What are your thoughts on this approach?`;
    }
    reinforceCommunicationStyle(profile, context) {
        // Reinforce successful communication patterns
        logger.debug('Reinforcing successful communication style', {
            style: profile.communicationStyle,
            context
        });
    }
    adjustCommunicationStyle(profile, context) {
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
export function createDeveloperPatternRecognizer(config) {
    return new DeveloperPatternRecognizer(config);
}
/**
 * Validate developer profile
 */
export function validateDeveloperProfile(profile) {
    return !!(profile &&
        typeof profile.experienceLevel === 'string' &&
        Array.isArray(profile.codingPatterns) &&
        Array.isArray(profile.technicalPreferences) &&
        profile.communicationStyle &&
        Array.isArray(profile.learningPatterns) &&
        Array.isArray(profile.feedbackHistory));
}
//# sourceMappingURL=developer-pattern-recognizer.js.map