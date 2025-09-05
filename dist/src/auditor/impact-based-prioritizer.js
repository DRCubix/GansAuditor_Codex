/**
 * Impact-Based Suggestion Prioritization Module
 *
 * This module implements project impact assessment for suggestions,
 * feasibility analysis for proposed improvements, ROI-based prioritization
 * of recommendations, and incremental improvement pathway generation
 * as specified in requirement 8.4.
 *
 * Features:
 * - Project impact assessment for suggestions
 * - Feasibility analysis for proposed improvements
 * - ROI-based prioritization of recommendations
 * - Incremental improvement pathway generation
 */
import { logger } from '../utils/logger.js';
// ============================================================================
// Default Configuration
// ============================================================================
export const DEFAULT_PRIORITIZATION_CONFIG = {
    impactWeight: 0.4,
    feasibilityWeight: 0.3,
    roiWeight: 0.3,
    riskTolerance: 0.7,
    minPriorityThreshold: 30,
    maxSuggestions: 10
};
// ============================================================================
// Impact-Based Prioritizer Implementation
// ============================================================================
/**
 * Impact-based suggestion prioritizer
 */
export class ImpactBasedPrioritizer {
    config;
    constructor(config) {
        this.config = { ...DEFAULT_PRIORITIZATION_CONFIG, ...config };
    }
    /**
     * Prioritize suggestions based on impact, feasibility, and ROI
     */
    async prioritizeSuggestions(suggestions, projectContext, complexityMetrics, developerProfile) {
        try {
            logger.debug('Prioritizing suggestions', {
                suggestionCount: suggestions.length,
                projectType: projectContext.projectType
            });
            const analyzedSuggestions = [];
            for (const suggestion of suggestions) {
                const analyzed = await this.analyzeSuggestion(suggestion, projectContext, complexityMetrics, developerProfile);
                analyzedSuggestions.push(analyzed);
            }
            // Sort by priority score (descending)
            const prioritized = analyzedSuggestions
                .filter(s => s.priorityScore >= this.config.minPriorityThreshold)
                .sort((a, b) => b.priorityScore - a.priorityScore)
                .slice(0, this.config.maxSuggestions);
            logger.debug('Suggestion prioritization completed', {
                originalCount: suggestions.length,
                prioritizedCount: prioritized.length,
                averagePriority: prioritized.reduce((sum, s) => sum + s.priorityScore, 0) / prioritized.length
            });
            return prioritized;
        }
        catch (error) {
            logger.error('Failed to prioritize suggestions', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Generate incremental improvement pathway
     */
    generateImprovementPathway(suggestions, projectContext, developerProfile) {
        try {
            // Group suggestions by category and complexity
            const phases = this.groupSuggestionsIntoPhases(suggestions, developerProfile);
            // Calculate dependencies
            const dependencies = this.calculatePhaseDependencies(phases);
            // Create milestones
            const milestones = this.createMilestones(phases);
            // Calculate total duration
            const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
            return {
                phases,
                totalDuration,
                dependencies,
                milestones
            };
        }
        catch (error) {
            logger.error('Failed to generate improvement pathway', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    // ============================================================================
    // Private Analysis Methods
    // ============================================================================
    async analyzeSuggestion(suggestion, projectContext, complexityMetrics, developerProfile) {
        const category = this.categorizeSuggestion(suggestion);
        const [impact, feasibility, roi] = await Promise.all([
            this.assessImpact(suggestion, category, projectContext, complexityMetrics),
            this.analyzeFeasibility(suggestion, category, projectContext, developerProfile),
            this.calculateROI(suggestion, category, projectContext, complexityMetrics)
        ]);
        const priorityScore = this.calculatePriorityScore(impact, feasibility, roi);
        const pathway = this.createImplementationPathway(suggestion, category, feasibility);
        return {
            suggestion,
            category,
            impact,
            feasibility,
            roi,
            priorityScore,
            pathway
        };
    }
    categorizeSuggestion(suggestion) {
        const suggestionLower = suggestion.toLowerCase();
        if (suggestionLower.includes('test') || suggestionLower.includes('coverage')) {
            return 'testing';
        }
        if (suggestionLower.includes('performance') || suggestionLower.includes('optimize')) {
            return 'performance';
        }
        if (suggestionLower.includes('security') || suggestionLower.includes('vulnerability')) {
            return 'security';
        }
        if (suggestionLower.includes('document') || suggestionLower.includes('comment')) {
            return 'documentation';
        }
        if (suggestionLower.includes('architecture') || suggestionLower.includes('design')) {
            return 'architecture';
        }
        if (suggestionLower.includes('maintain') || suggestionLower.includes('refactor')) {
            return 'maintainability';
        }
        if (suggestionLower.includes('tool') || suggestionLower.includes('build')) {
            return 'tooling';
        }
        if (suggestionLower.includes('process') || suggestionLower.includes('workflow')) {
            return 'process';
        }
        return 'code-quality';
    }
    async assessImpact(suggestion, category, projectContext, complexityMetrics) {
        const dimensions = this.calculateImpactDimensions(suggestion, category, projectContext, complexityMetrics);
        const stakeholders = this.identifyStakeholders(category, projectContext);
        const risks = this.assessRisks(suggestion, category, complexityMetrics);
        const benefits = this.assessBenefits(suggestion, category, projectContext);
        const overallImpact = dimensions.reduce((sum, dim) => sum + dim.score, 0) / dimensions.length;
        return {
            overallImpact,
            dimensions,
            stakeholders,
            risks,
            benefits
        };
    }
    calculateImpactDimensions(suggestion, category, projectContext, complexityMetrics) {
        const dimensions = [];
        // Base impact scores by category
        const categoryImpacts = {
            'code-quality': { 'code-quality': 80, 'maintainability': 70, 'developer-productivity': 60 },
            'performance': { 'performance': 90, 'user-experience': 80, 'business-value': 70 },
            'security': { 'security': 95, 'business-value': 85, 'code-quality': 60 },
            'maintainability': { 'maintainability': 85, 'developer-productivity': 75, 'technical-debt': 80 },
            'testing': { 'code-quality': 75, 'maintainability': 70, 'developer-productivity': 65 },
            'documentation': { 'maintainability': 60, 'developer-productivity': 55, 'code-quality': 50 },
            'architecture': { 'maintainability': 90, 'code-quality': 80, 'technical-debt': 85 },
            'tooling': { 'developer-productivity': 70, 'maintainability': 60, 'code-quality': 55 },
            'process': { 'developer-productivity': 65, 'maintainability': 60, 'business-value': 50 }
        };
        const impacts = categoryImpacts[category] || {};
        for (const [dimensionType, baseScore] of Object.entries(impacts)) {
            // Adjust score based on project complexity
            const complexityMultiplier = complexityMetrics.overallComplexity > 60 ? 1.2 : 1.0;
            const adjustedScore = Math.min(100, baseScore * complexityMultiplier);
            dimensions.push({
                name: dimensionType,
                score: adjustedScore,
                description: `Impact on ${dimensionType.replace('-', ' ')}`,
                evidence: [`Category: ${category}`, `Complexity: ${complexityMetrics.overallComplexity}`]
            });
        }
        return dimensions;
    }
    identifyStakeholders(category, projectContext) {
        const stakeholders = [];
        // Always affected
        stakeholders.push({
            type: 'developers',
            impactLevel: 'medium',
            concerns: ['Implementation effort', 'Learning curve', 'Workflow changes']
        });
        // Category-specific stakeholders
        switch (category) {
            case 'performance':
            case 'security':
                stakeholders.push({
                    type: 'users',
                    impactLevel: 'high',
                    concerns: ['User experience', 'System reliability']
                });
                break;
            case 'architecture':
            case 'tooling':
                stakeholders.push({
                    type: 'devops',
                    impactLevel: 'medium',
                    concerns: ['Deployment complexity', 'Infrastructure changes']
                });
                break;
            case 'testing':
                stakeholders.push({
                    type: 'qa-team',
                    impactLevel: 'high',
                    concerns: ['Test strategy', 'Quality assurance']
                });
                break;
        }
        return stakeholders;
    }
    assessRisks(suggestion, category, complexityMetrics) {
        const risks = [];
        // Implementation complexity risk
        const complexityRisk = complexityMetrics.overallComplexity / 100;
        risks.push({
            type: 'implementation-complexity',
            probability: complexityRisk,
            impact: 60,
            riskScore: complexityRisk * 60,
            mitigations: ['Incremental implementation', 'Thorough testing', 'Code reviews']
        });
        // Category-specific risks
        if (category === 'architecture' || category === 'performance') {
            risks.push({
                type: 'breaking-changes',
                probability: 0.3,
                impact: 80,
                riskScore: 24,
                mitigations: ['Backward compatibility', 'Feature flags', 'Gradual rollout']
            });
        }
        if (category === 'security') {
            risks.push({
                type: 'security-vulnerability',
                probability: 0.2,
                impact: 90,
                riskScore: 18,
                mitigations: ['Security review', 'Penetration testing', 'Code audit']
            });
        }
        return risks;
    }
    assessBenefits(suggestion, category, projectContext) {
        const benefits = [];
        // Category-specific benefits
        const categoryBenefits = {
            'code-quality': [{
                    type: 'better-code-quality',
                    value: 75,
                    description: 'Improved code maintainability and readability',
                    outcomes: ['Fewer bugs', 'Easier maintenance', 'Better team collaboration']
                }],
            'performance': [{
                    type: 'improved-performance',
                    value: 85,
                    description: 'Better system performance and user experience',
                    outcomes: ['Faster response times', 'Better user satisfaction', 'Reduced resource usage']
                }],
            'security': [{
                    type: 'enhanced-security',
                    value: 90,
                    description: 'Improved system security and data protection',
                    outcomes: ['Reduced security vulnerabilities', 'Better compliance', 'Increased trust']
                }],
            'testing': [{
                    type: 'reduced-bugs',
                    value: 80,
                    description: 'Fewer production bugs and issues',
                    outcomes: ['Higher quality releases', 'Reduced support burden', 'Better reliability']
                }],
            'maintainability': [{
                    type: 'better-maintainability',
                    value: 70,
                    description: 'Easier code maintenance and updates',
                    outcomes: ['Faster feature development', 'Reduced technical debt', 'Better code organization']
                }],
            'documentation': [{
                    type: 'increased-productivity',
                    value: 60,
                    description: 'Better team productivity through documentation',
                    outcomes: ['Faster onboarding', 'Reduced knowledge silos', 'Better collaboration']
                }],
            'architecture': [{
                    type: 'reduced-technical-debt',
                    value: 85,
                    description: 'Reduced technical debt and improved architecture',
                    outcomes: ['Better scalability', 'Easier maintenance', 'Improved performance']
                }],
            'tooling': [{
                    type: 'increased-productivity',
                    value: 65,
                    description: 'Improved developer productivity through better tooling',
                    outcomes: ['Faster development', 'Automated processes', 'Better developer experience']
                }],
            'process': [{
                    type: 'increased-productivity',
                    value: 55,
                    description: 'Improved team productivity through better processes',
                    outcomes: ['Better coordination', 'Reduced waste', 'Improved quality']
                }]
        };
        return categoryBenefits[category] || [];
    }
    async analyzeFeasibility(suggestion, category, projectContext, developerProfile) {
        const technical = this.assessTechnicalFeasibility(suggestion, category, projectContext);
        const resource = this.assessResourceFeasibility(suggestion, category, developerProfile);
        const timeline = this.assessTimelineFeasibility(suggestion, category, projectContext);
        const organizational = this.assessOrganizationalFeasibility(suggestion, category, developerProfile);
        const overallFeasibility = (technical.score + resource.score + timeline.score + organizational.score) / 4;
        return {
            overallFeasibility,
            technical,
            resource,
            timeline,
            organizational
        };
    }
    assessTechnicalFeasibility(suggestion, category, projectContext) {
        // Base complexity by category
        const categoryComplexity = {
            'code-quality': 'simple',
            'performance': 'moderate',
            'security': 'moderate',
            'maintainability': 'simple',
            'testing': 'simple',
            'documentation': 'trivial',
            'architecture': 'complex',
            'tooling': 'moderate',
            'process': 'simple'
        };
        const complexity = categoryComplexity[category];
        const complexityScores = {
            'trivial': 95,
            'simple': 85,
            'moderate': 70,
            'complex': 50,
            'very-complex': 30
        };
        return {
            score: complexityScores[complexity],
            complexity,
            requiredSkills: this.getRequiredSkills(category, projectContext),
            constraints: this.getTechnicalConstraints(category, projectContext),
            dependencies: this.getTechnicalDependencies(category, projectContext)
        };
    }
    getRequiredSkills(category, projectContext) {
        const skills = [];
        skills.push(projectContext.techStack.primaryLanguage);
        switch (category) {
            case 'performance':
                skills.push('Performance optimization', 'Profiling tools');
                break;
            case 'security':
                skills.push('Security best practices', 'Vulnerability assessment');
                break;
            case 'architecture':
                skills.push('System design', 'Architecture patterns');
                break;
            case 'testing':
                skills.push('Test automation', 'Testing frameworks');
                break;
        }
        return skills;
    }
    getTechnicalConstraints(category, projectContext) {
        const constraints = [];
        if (projectContext.metadata.maturity === 'legacy') {
            constraints.push('Legacy system constraints');
        }
        if (projectContext.techStack.databases.length > 0) {
            constraints.push('Database compatibility');
        }
        return constraints;
    }
    getTechnicalDependencies(category, projectContext) {
        const dependencies = [];
        switch (category) {
            case 'performance':
                dependencies.push('Performance monitoring tools');
                break;
            case 'security':
                dependencies.push('Security scanning tools');
                break;
            case 'testing':
                dependencies.push('Testing infrastructure');
                break;
        }
        return dependencies;
    }
    assessResourceFeasibility(suggestion, category, developerProfile) {
        // Estimate effort based on category and experience
        const baseEfforts = {
            'code-quality': 8,
            'performance': 24,
            'security': 16,
            'maintainability': 12,
            'testing': 16,
            'documentation': 4,
            'architecture': 40,
            'tooling': 20,
            'process': 8
        };
        const baseEffort = baseEfforts[category];
        // Adjust based on developer experience
        const experienceMultipliers = {
            'junior': 1.5,
            'mid-level': 1.0,
            'senior': 0.8,
            'expert': 0.6,
            'unknown': 1.2
        };
        const estimatedEffort = baseEffort * experienceMultipliers[developerProfile.experienceLevel];
        return {
            score: Math.max(0, 100 - estimatedEffort * 2), // Higher effort = lower feasibility
            estimatedEffort,
            requiredTeamSize: estimatedEffort > 40 ? 2 : 1,
            budgetRequirements: [],
            availability: estimatedEffort <= 8 ? 'immediately' : estimatedEffort <= 24 ? 'short-term' : 'medium-term'
        };
    }
    assessTimelineFeasibility(suggestion, category, projectContext) {
        // Base durations by category (in days)
        const baseDurations = {
            'code-quality': 2,
            'performance': 5,
            'security': 3,
            'maintainability': 3,
            'testing': 4,
            'documentation': 1,
            'architecture': 10,
            'tooling': 5,
            'process': 2
        };
        const estimatedDuration = baseDurations[category];
        return {
            score: Math.max(0, 100 - estimatedDuration * 5), // Longer duration = lower feasibility
            estimatedDuration,
            criticalPath: [suggestion],
            constraints: []
        };
    }
    assessOrganizationalFeasibility(suggestion, category, developerProfile) {
        // Assess based on developer experience and patterns
        const teamReadiness = this.assessTeamReadiness(developerProfile);
        const changeResistance = this.assessChangeResistance(category, developerProfile);
        const goalAlignment = this.assessGoalAlignment(category);
        const readinessScores = { 'not-ready': 20, 'partially-ready': 50, 'ready': 80, 'very-ready': 95 };
        const resistanceScores = { 'high': 20, 'medium': 50, 'low': 80, 'none': 95 };
        const alignmentScores = { 'misaligned': 20, 'partially-aligned': 50, 'aligned': 80, 'strongly-aligned': 95 };
        const score = (readinessScores[teamReadiness] + resistanceScores[changeResistance] + alignmentScores[goalAlignment]) / 3;
        return {
            score,
            teamReadiness,
            changeResistance,
            goalAlignment
        };
    }
    assessTeamReadiness(developerProfile) {
        switch (developerProfile.experienceLevel) {
            case 'expert':
            case 'senior':
                return 'very-ready';
            case 'mid-level':
                return 'ready';
            case 'junior':
                return 'partially-ready';
            default:
                return 'not-ready';
        }
    }
    assessChangeResistance(category, developerProfile) {
        // Categories that typically have higher resistance
        const highResistanceCategories = ['architecture', 'process', 'tooling'];
        if (highResistanceCategories.includes(category)) {
            return developerProfile.experienceLevel === 'expert' ? 'low' : 'medium';
        }
        return 'low';
    }
    assessGoalAlignment(category) {
        // Categories that typically align well with business goals
        const highAlignmentCategories = ['performance', 'security', 'code-quality'];
        if (highAlignmentCategories.includes(category)) {
            return 'strongly-aligned';
        }
        return 'aligned';
    }
    async calculateROI(suggestion, category, projectContext, complexityMetrics) {
        const investment = this.calculateInvestmentCost(category, complexityMetrics);
        const returns = this.calculateExpectedReturns(category, projectContext);
        const paybackPeriod = this.calculatePaybackPeriod(investment, returns);
        const netPresentValue = this.calculateNetPresentValue(investment, returns);
        const roiScore = this.calculateROIScore(investment.total, returns);
        return {
            roiScore,
            investment,
            returns,
            paybackPeriod,
            netPresentValue
        };
    }
    calculateInvestmentCost(category, complexityMetrics) {
        // Base costs by category (in hours * hourly rate)
        const hourlyRate = 100; // Assumed developer hourly rate
        const baseCosts = {
            'code-quality': { dev: 8, test: 4, deploy: 1, training: 2 },
            'performance': { dev: 24, test: 8, deploy: 4, training: 4 },
            'security': { dev: 16, test: 8, deploy: 2, training: 6 },
            'maintainability': { dev: 12, test: 4, deploy: 1, training: 2 },
            'testing': { dev: 16, test: 8, deploy: 2, training: 4 },
            'documentation': { dev: 4, test: 1, deploy: 0, training: 1 },
            'architecture': { dev: 40, test: 16, deploy: 8, training: 8 },
            'tooling': { dev: 20, test: 4, deploy: 4, training: 8 },
            'process': { dev: 8, test: 2, deploy: 1, training: 4 }
        };
        const costs = baseCosts[category];
        const complexityMultiplier = 1 + (complexityMetrics.overallComplexity / 100);
        const development = costs.dev * hourlyRate * complexityMultiplier;
        const testing = costs.test * hourlyRate * complexityMultiplier;
        const deployment = costs.deploy * hourlyRate;
        const training = costs.training * hourlyRate;
        return {
            development,
            testing,
            deployment,
            training,
            total: development + testing + deployment + training
        };
    }
    calculateExpectedReturns(category, projectContext) {
        const returns = [];
        // Category-specific returns
        switch (category) {
            case 'performance':
                returns.push({
                    type: 'performance-improvement',
                    value: 5000, // Estimated value in dollars
                    timeToRealize: 30,
                    confidence: 0.8
                });
                break;
            case 'security':
                returns.push({
                    type: 'bug-reduction',
                    value: 8000,
                    timeToRealize: 60,
                    confidence: 0.7
                });
                break;
            case 'testing':
                returns.push({
                    type: 'bug-reduction',
                    value: 3000,
                    timeToRealize: 45,
                    confidence: 0.9
                });
                break;
            case 'maintainability':
                returns.push({
                    type: 'maintenance-reduction',
                    value: 2000,
                    timeToRealize: 90,
                    confidence: 0.6
                });
                break;
            default:
                returns.push({
                    type: 'productivity-increase',
                    value: 1500,
                    timeToRealize: 60,
                    confidence: 0.5
                });
        }
        return returns;
    }
    calculatePaybackPeriod(investment, returns) {
        const totalReturns = returns.reduce((sum, ret) => sum + ret.value * ret.confidence, 0);
        return totalReturns > 0 ? (investment.total / totalReturns) * 365 : Infinity;
    }
    calculateNetPresentValue(investment, returns) {
        const discountRate = 0.1; // 10% annual discount rate
        let npv = -investment.total;
        for (const ret of returns) {
            const presentValue = (ret.value * ret.confidence) / Math.pow(1 + discountRate, ret.timeToRealize / 365);
            npv += presentValue;
        }
        return npv;
    }
    calculateROIScore(investment, returns) {
        const totalReturns = returns.reduce((sum, ret) => sum + ret.value * ret.confidence, 0);
        const roi = investment > 0 ? ((totalReturns - investment) / investment) * 100 : 0;
        return Math.max(0, Math.min(100, roi + 50)); // Normalize to 0-100 scale
    }
    calculatePriorityScore(impact, feasibility, roi) {
        const weightedScore = impact.overallImpact * this.config.impactWeight +
            feasibility.overallFeasibility * this.config.feasibilityWeight +
            roi.roiScore * this.config.roiWeight;
        // Apply risk adjustment
        const avgRisk = impact.risks.reduce((sum, risk) => sum + risk.riskScore, 0) / impact.risks.length;
        const riskAdjustment = 1 - (avgRisk / 100) * (1 - this.config.riskTolerance);
        return Math.round(weightedScore * riskAdjustment);
    }
    createImplementationPathway(suggestion, category, feasibility) {
        const phases = [
            {
                id: 'planning',
                name: 'Planning and Analysis',
                description: 'Detailed planning and impact analysis',
                duration: Math.ceil(feasibility.timeline.estimatedDuration * 0.2),
                tasks: [
                    {
                        name: 'Requirements analysis',
                        description: 'Analyze detailed requirements',
                        effort: feasibility.resource.estimatedEffort * 0.1,
                        skills: ['Analysis', 'Planning']
                    }
                ],
                successCriteria: ['Requirements documented', 'Plan approved']
            },
            {
                id: 'implementation',
                name: 'Implementation',
                description: 'Core implementation work',
                duration: Math.ceil(feasibility.timeline.estimatedDuration * 0.6),
                tasks: [
                    {
                        name: 'Core development',
                        description: 'Implement the suggested changes',
                        effort: feasibility.resource.estimatedEffort * 0.7,
                        skills: feasibility.technical.requiredSkills
                    }
                ],
                successCriteria: ['Implementation complete', 'Code reviewed']
            },
            {
                id: 'validation',
                name: 'Testing and Validation',
                description: 'Testing and quality assurance',
                duration: Math.ceil(feasibility.timeline.estimatedDuration * 0.2),
                tasks: [
                    {
                        name: 'Testing',
                        description: 'Comprehensive testing of changes',
                        effort: feasibility.resource.estimatedEffort * 0.2,
                        skills: ['Testing', 'Quality Assurance']
                    }
                ],
                successCriteria: ['All tests passing', 'Quality gates met']
            }
        ];
        const dependencies = [
            {
                dependentPhase: 'implementation',
                prerequisitePhase: 'planning',
                type: 'finish-to-start'
            },
            {
                dependentPhase: 'validation',
                prerequisitePhase: 'implementation',
                type: 'finish-to-start'
            }
        ];
        const milestones = [
            {
                name: 'Planning Complete',
                description: 'Planning phase completed successfully',
                targetDate: phases[0].duration,
                criteria: ['Requirements approved', 'Resources allocated']
            },
            {
                name: 'Implementation Complete',
                description: 'Implementation phase completed successfully',
                targetDate: phases[0].duration + phases[1].duration,
                criteria: ['Code complete', 'Code review passed']
            }
        ];
        return {
            phases,
            totalDuration: feasibility.timeline.estimatedDuration,
            dependencies,
            milestones
        };
    }
    // ============================================================================
    // Private Pathway Generation Methods
    // ============================================================================
    groupSuggestionsIntoPhases(suggestions, developerProfile) {
        // Group by complexity and dependencies
        const phases = [];
        // Phase 1: Quick wins (high impact, low effort)
        const quickWins = suggestions.filter(s => s.feasibility.resource.estimatedEffort <= 8 && s.impact.overallImpact >= 60);
        if (quickWins.length > 0) {
            phases.push({
                id: 'quick-wins',
                name: 'Quick Wins',
                description: 'High-impact, low-effort improvements',
                duration: 5,
                tasks: quickWins.map(s => ({
                    name: s.suggestion,
                    description: `Implement: ${s.suggestion}`,
                    effort: s.feasibility.resource.estimatedEffort,
                    skills: s.feasibility.technical.requiredSkills
                })),
                successCriteria: ['All quick wins implemented', 'Immediate value delivered']
            });
        }
        // Phase 2: Medium-term improvements
        const mediumTerm = suggestions.filter(s => s.feasibility.resource.estimatedEffort > 8 && s.feasibility.resource.estimatedEffort <= 24);
        if (mediumTerm.length > 0) {
            phases.push({
                id: 'medium-term',
                name: 'Medium-term Improvements',
                description: 'Moderate effort improvements with good ROI',
                duration: 15,
                tasks: mediumTerm.map(s => ({
                    name: s.suggestion,
                    description: `Implement: ${s.suggestion}`,
                    effort: s.feasibility.resource.estimatedEffort,
                    skills: s.feasibility.technical.requiredSkills
                })),
                successCriteria: ['Medium-term goals achieved', 'Quality improvements visible']
            });
        }
        // Phase 3: Long-term strategic improvements
        const longTerm = suggestions.filter(s => s.feasibility.resource.estimatedEffort > 24);
        if (longTerm.length > 0) {
            phases.push({
                id: 'long-term',
                name: 'Strategic Improvements',
                description: 'Long-term strategic improvements',
                duration: 30,
                tasks: longTerm.map(s => ({
                    name: s.suggestion,
                    description: `Implement: ${s.suggestion}`,
                    effort: s.feasibility.resource.estimatedEffort,
                    skills: s.feasibility.technical.requiredSkills
                })),
                successCriteria: ['Strategic goals achieved', 'Significant quality improvements']
            });
        }
        return phases;
    }
    calculatePhaseDependencies(phases) {
        const dependencies = [];
        // Sequential dependencies by default
        for (let i = 1; i < phases.length; i++) {
            dependencies.push({
                dependentPhase: phases[i].id,
                prerequisitePhase: phases[i - 1].id,
                type: 'finish-to-start'
            });
        }
        return dependencies;
    }
    createMilestones(phases) {
        const milestones = [];
        let cumulativeDuration = 0;
        for (const phase of phases) {
            cumulativeDuration += phase.duration;
            milestones.push({
                name: `${phase.name} Complete`,
                description: `${phase.name} phase completed successfully`,
                targetDate: cumulativeDuration,
                criteria: phase.successCriteria
            });
        }
        return milestones;
    }
}
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create an impact-based prioritizer with default configuration
 */
export function createImpactBasedPrioritizer(config) {
    return new ImpactBasedPrioritizer(config);
}
/**
 * Validate impact analyzed suggestion
 */
export function validateImpactAnalyzedSuggestion(suggestion) {
    return !!(suggestion &&
        typeof suggestion.suggestion === 'string' &&
        typeof suggestion.category === 'string' &&
        suggestion.impact &&
        suggestion.feasibility &&
        suggestion.roi &&
        typeof suggestion.priorityScore === 'number' &&
        suggestion.pathway);
}
//# sourceMappingURL=impact-based-prioritizer.js.map