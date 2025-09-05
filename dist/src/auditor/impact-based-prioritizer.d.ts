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
import type { ProjectContext } from './project-context-analyzer.js';
import type { ComplexityMetrics } from './complexity-analyzer.js';
import type { DeveloperProfile } from './developer-pattern-recognizer.js';
/**
 * Suggestion with impact analysis
 */
export interface ImpactAnalyzedSuggestion {
    /** Original suggestion */
    suggestion: string;
    /** Suggestion category */
    category: SuggestionCategory;
    /** Impact assessment */
    impact: ImpactAssessment;
    /** Feasibility analysis */
    feasibility: FeasibilityAnalysis;
    /** ROI calculation */
    roi: ROIAnalysis;
    /** Priority score (0-100) */
    priorityScore: number;
    /** Implementation pathway */
    pathway: ImplementationPathway;
}
/**
 * Suggestion categories
 */
export type SuggestionCategory = 'code-quality' | 'performance' | 'security' | 'maintainability' | 'testing' | 'documentation' | 'architecture' | 'tooling' | 'process';
/**
 * Impact assessment
 */
export interface ImpactAssessment {
    /** Overall impact score (0-100) */
    overallImpact: number;
    /** Impact dimensions */
    dimensions: ImpactDimension[];
    /** Affected stakeholders */
    stakeholders: Stakeholder[];
    /** Risk assessment */
    risks: RiskAssessment[];
    /** Benefits assessment */
    benefits: BenefitAssessment[];
}
/**
 * Impact dimension
 */
export interface ImpactDimension {
    /** Dimension name */
    name: ImpactDimensionType;
    /** Impact score (0-100) */
    score: number;
    /** Impact description */
    description: string;
    /** Supporting evidence */
    evidence: string[];
}
/**
 * Impact dimension types
 */
export type ImpactDimensionType = 'code-quality' | 'performance' | 'security' | 'maintainability' | 'developer-productivity' | 'user-experience' | 'business-value' | 'technical-debt';
/**
 * Stakeholder affected by suggestion
 */
export interface Stakeholder {
    /** Stakeholder type */
    type: StakeholderType;
    /** Impact level on stakeholder */
    impactLevel: ImpactLevel;
    /** Specific concerns */
    concerns: string[];
}
/**
 * Stakeholder types
 */
export type StakeholderType = 'developers' | 'users' | 'product-managers' | 'devops' | 'security-team' | 'qa-team' | 'business';
/**
 * Impact levels
 */
export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
/**
 * Risk assessment
 */
export interface RiskAssessment {
    /** Risk type */
    type: RiskType;
    /** Risk probability (0-1) */
    probability: number;
    /** Risk impact (0-100) */
    impact: number;
    /** Risk score (probability * impact) */
    riskScore: number;
    /** Mitigation strategies */
    mitigations: string[];
}
/**
 * Risk types
 */
export type RiskType = 'implementation-complexity' | 'breaking-changes' | 'performance-regression' | 'security-vulnerability' | 'maintenance-burden' | 'team-resistance' | 'timeline-impact';
/**
 * Benefit assessment
 */
export interface BenefitAssessment {
    /** Benefit type */
    type: BenefitType;
    /** Benefit value (0-100) */
    value: number;
    /** Benefit description */
    description: string;
    /** Measurable outcomes */
    outcomes: string[];
}
/**
 * Benefit types
 */
export type BenefitType = 'reduced-bugs' | 'improved-performance' | 'enhanced-security' | 'better-maintainability' | 'increased-productivity' | 'improved-user-experience' | 'reduced-technical-debt' | 'better-code-quality';
/**
 * Feasibility analysis
 */
export interface FeasibilityAnalysis {
    /** Overall feasibility score (0-100) */
    overallFeasibility: number;
    /** Technical feasibility */
    technical: TechnicalFeasibility;
    /** Resource feasibility */
    resource: ResourceFeasibility;
    /** Timeline feasibility */
    timeline: TimelineFeasibility;
    /** Organizational feasibility */
    organizational: OrganizationalFeasibility;
}
/**
 * Technical feasibility
 */
export interface TechnicalFeasibility {
    /** Feasibility score (0-100) */
    score: number;
    /** Technical complexity */
    complexity: ComplexityLevel;
    /** Required skills */
    requiredSkills: string[];
    /** Technical constraints */
    constraints: string[];
    /** Dependencies */
    dependencies: string[];
}
/**
 * Complexity levels
 */
export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex';
/**
 * Resource feasibility
 */
export interface ResourceFeasibility {
    /** Feasibility score (0-100) */
    score: number;
    /** Estimated effort (hours) */
    estimatedEffort: number;
    /** Required team size */
    requiredTeamSize: number;
    /** Budget requirements */
    budgetRequirements: BudgetRequirement[];
    /** Resource availability */
    availability: ResourceAvailability;
}
/**
 * Budget requirement
 */
export interface BudgetRequirement {
    /** Requirement type */
    type: string;
    /** Estimated cost */
    cost: number;
    /** Cost justification */
    justification: string;
}
/**
 * Resource availability
 */
export type ResourceAvailability = 'immediately' | 'short-term' | 'medium-term' | 'long-term' | 'unavailable';
/**
 * Timeline feasibility
 */
export interface TimelineFeasibility {
    /** Feasibility score (0-100) */
    score: number;
    /** Estimated duration (days) */
    estimatedDuration: number;
    /** Critical path items */
    criticalPath: string[];
    /** Timeline constraints */
    constraints: string[];
}
/**
 * Organizational feasibility
 */
export interface OrganizationalFeasibility {
    /** Feasibility score (0-100) */
    score: number;
    /** Team readiness */
    teamReadiness: ReadinessLevel;
    /** Change resistance */
    changeResistance: ResistanceLevel;
    /** Alignment with goals */
    goalAlignment: AlignmentLevel;
}
/**
 * Readiness levels
 */
export type ReadinessLevel = 'not-ready' | 'partially-ready' | 'ready' | 'very-ready';
/**
 * Resistance levels
 */
export type ResistanceLevel = 'high' | 'medium' | 'low' | 'none';
/**
 * Alignment levels
 */
export type AlignmentLevel = 'misaligned' | 'partially-aligned' | 'aligned' | 'strongly-aligned';
/**
 * ROI analysis
 */
export interface ROIAnalysis {
    /** ROI score (0-100) */
    roiScore: number;
    /** Investment cost */
    investment: InvestmentCost;
    /** Expected returns */
    returns: ExpectedReturn[];
    /** Payback period (days) */
    paybackPeriod: number;
    /** Net present value */
    netPresentValue: number;
}
/**
 * Investment cost
 */
export interface InvestmentCost {
    /** Development cost */
    development: number;
    /** Testing cost */
    testing: number;
    /** Deployment cost */
    deployment: number;
    /** Training cost */
    training: number;
    /** Total cost */
    total: number;
}
/**
 * Expected return
 */
export interface ExpectedReturn {
    /** Return type */
    type: ReturnType;
    /** Return value */
    value: number;
    /** Time to realize (days) */
    timeToRealize: number;
    /** Confidence level (0-1) */
    confidence: number;
}
/**
 * Return types
 */
export type ReturnType = 'time-savings' | 'bug-reduction' | 'performance-improvement' | 'maintenance-reduction' | 'productivity-increase' | 'quality-improvement';
/**
 * Implementation pathway
 */
export interface ImplementationPathway {
    /** Pathway phases */
    phases: PathwayPhase[];
    /** Total duration (days) */
    totalDuration: number;
    /** Dependencies between phases */
    dependencies: PhaseDependency[];
    /** Milestones */
    milestones: Milestone[];
}
/**
 * Pathway phase
 */
export interface PathwayPhase {
    /** Phase identifier */
    id: string;
    /** Phase name */
    name: string;
    /** Phase description */
    description: string;
    /** Phase duration (days) */
    duration: number;
    /** Phase tasks */
    tasks: PhaseTask[];
    /** Success criteria */
    successCriteria: string[];
}
/**
 * Phase task
 */
export interface PhaseTask {
    /** Task name */
    name: string;
    /** Task description */
    description: string;
    /** Estimated effort (hours) */
    effort: number;
    /** Required skills */
    skills: string[];
}
/**
 * Phase dependency
 */
export interface PhaseDependency {
    /** Dependent phase ID */
    dependentPhase: string;
    /** Prerequisite phase ID */
    prerequisitePhase: string;
    /** Dependency type */
    type: DependencyType;
}
/**
 * Dependency types
 */
export type DependencyType = 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
/**
 * Milestone
 */
export interface Milestone {
    /** Milestone name */
    name: string;
    /** Milestone description */
    description: string;
    /** Target date (days from start) */
    targetDate: number;
    /** Success criteria */
    criteria: string[];
}
/**
 * Prioritization configuration
 */
export interface PrioritizationConfig {
    /** Impact weight (0-1) */
    impactWeight: number;
    /** Feasibility weight (0-1) */
    feasibilityWeight: number;
    /** ROI weight (0-1) */
    roiWeight: number;
    /** Risk tolerance (0-1) */
    riskTolerance: number;
    /** Minimum priority threshold */
    minPriorityThreshold: number;
    /** Maximum suggestions to return */
    maxSuggestions: number;
}
export declare const DEFAULT_PRIORITIZATION_CONFIG: PrioritizationConfig;
/**
 * Impact-based suggestion prioritizer
 */
export declare class ImpactBasedPrioritizer {
    private config;
    constructor(config?: Partial<PrioritizationConfig>);
    /**
     * Prioritize suggestions based on impact, feasibility, and ROI
     */
    prioritizeSuggestions(suggestions: string[], projectContext: ProjectContext, complexityMetrics: ComplexityMetrics, developerProfile: DeveloperProfile): Promise<ImpactAnalyzedSuggestion[]>;
    /**
     * Generate incremental improvement pathway
     */
    generateImprovementPathway(suggestions: ImpactAnalyzedSuggestion[], projectContext: ProjectContext, developerProfile: DeveloperProfile): ImplementationPathway;
    private analyzeSuggestion;
    private categorizeSuggestion;
    private assessImpact;
    private calculateImpactDimensions;
    private identifyStakeholders;
    private assessRisks;
    private assessBenefits;
    private analyzeFeasibility;
    private assessTechnicalFeasibility;
    private getRequiredSkills;
    private getTechnicalConstraints;
    private getTechnicalDependencies;
    private assessResourceFeasibility;
    private assessTimelineFeasibility;
    private assessOrganizationalFeasibility;
    private assessTeamReadiness;
    private assessChangeResistance;
    private assessGoalAlignment;
    private calculateROI;
    private calculateInvestmentCost;
    private calculateExpectedReturns;
    private calculatePaybackPeriod;
    private calculateNetPresentValue;
    private calculateROIScore;
    private calculatePriorityScore;
    private createImplementationPathway;
    private groupSuggestionsIntoPhases;
    private calculatePhaseDependencies;
    private createMilestones;
}
/**
 * Create an impact-based prioritizer with default configuration
 */
export declare function createImpactBasedPrioritizer(config?: Partial<PrioritizationConfig>): ImpactBasedPrioritizer;
/**
 * Validate impact analyzed suggestion
 */
export declare function validateImpactAnalyzedSuggestion(suggestion: ImpactAnalyzedSuggestion): boolean;
//# sourceMappingURL=impact-based-prioritizer.d.ts.map