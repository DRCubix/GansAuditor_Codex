/**
 * Follow-up Task Generator for GAN Auditor System Prompt
 *
 * This module implements follow-up task generation with ordered, scoped TODO list creation,
 * task prioritization, actionable item specification, and effort estimation
 * as specified in requirement 5.6.
 *
 * Requirements addressed:
 * - 5.6: Follow-up task generation
 * - Implement ordered, scoped TODO list creation
 * - Add task prioritization (critical issues first)
 * - Create actionable item specification
 * - Add effort estimation where helpful
 */
import type { FollowUpTaskList } from '../../types/feedback-types.js';
import type { EvidenceItem } from '../workflow-types.js';
import type { CriticalIssue } from '../quality-assessment.js';
import type { UnmetAcceptanceCriteria, MissingTest } from '../../types/feedback-types.js';
/**
 * Configuration for follow-up task generation
 */
export interface FollowUpTaskConfig {
    /** Maximum number of tasks to generate */
    maxTasks: number;
    /** Include effort estimation */
    includeEffortEstimation: boolean;
    /** Prioritization method */
    prioritizationMethod: PrioritizationMethod;
    /** Task categorization rules */
    categorizationRules: CategorizationRules;
    /** Effort estimation configuration */
    effortEstimation: EffortEstimationConfig;
}
/**
 * Prioritization method enumeration
 */
export type PrioritizationMethod = "severity_first" | "impact_based" | "effort_weighted" | "dependency_aware";
/**
 * Categorization rules
 */
export interface CategorizationRules {
    /** Critical issue patterns */
    criticalPatterns: string[];
    /** Security issue patterns */
    securityPatterns: string[];
    /** Test-related patterns */
    testPatterns: string[];
    /** Documentation patterns */
    documentationPatterns: string[];
}
/**
 * Effort estimation configuration
 */
export interface EffortEstimationConfig {
    /** Enable effort estimation */
    enabled: boolean;
    /** Estimation method */
    method: EstimationMethod;
    /** Complexity factors */
    complexityFactors: ComplexityFactors;
}
/**
 * Estimation method enumeration
 */
export type EstimationMethod = "story_points" | "time_based" | "complexity_based" | "historical_data";
/**
 * Complexity factors for estimation
 */
export interface ComplexityFactors {
    /** File count impact */
    fileCountWeight: number;
    /** Line count impact */
    lineCountWeight: number;
    /** Dependency impact */
    dependencyWeight: number;
    /** Test requirement impact */
    testRequirementWeight: number;
}
/**
 * Context for follow-up task generation
 */
export interface FollowUpTaskContext {
    /** Evidence items requiring action */
    evidenceItems: EvidenceItem[];
    /** Critical issues */
    criticalIssues: CriticalIssue[];
    /** Unmet acceptance criteria */
    unmetACs: UnmetAcceptanceCriteria[];
    /** Missing tests */
    missingTests: MissingTest[];
    /** Current iteration number */
    iteration: number;
    /** Session information */
    sessionId?: string;
    /** Project context */
    projectContext?: ProjectContext;
}
/**
 * Project context for task generation
 */
export interface ProjectContext {
    /** Project size */
    projectSize: "small" | "medium" | "large";
    /** Team size */
    teamSize: number;
    /** Technology stack */
    techStack: string[];
    /** Development methodology */
    methodology: "agile" | "waterfall" | "kanban";
}
/**
 * Generates prioritized follow-up task lists with effort estimation
 */
export declare class FollowUpTaskGenerator {
    private config;
    constructor(config?: Partial<FollowUpTaskConfig>);
    /**
     * Generate follow-up task list from evidence and issues
     */
    generateFollowUpTasks(context: FollowUpTaskContext): Promise<FollowUpTaskList>;
    /**
     * Create tasks from various sources
     */
    private createTasksFromSources;
    /**
     * Create tasks from critical issues
     */
    private createTasksFromCriticalIssues;
    /**
     * Create tasks from evidence items
     */
    private createTasksFromEvidence;
    /**
     * Create tasks from unmet acceptance criteria
     */
    private createTasksFromUnmetACs;
    /**
     * Create tasks from missing tests
     */
    private createTasksFromMissingTests;
    /**
     * Prioritize tasks based on configuration
     */
    private prioritizeTasks;
    /**
     * Prioritize by severity/priority level
     */
    private prioritizeBySeverity;
    /**
     * Prioritize by estimated impact
     */
    private prioritizeByImpact;
    /**
     * Prioritize by effort (easier tasks first)
     */
    private prioritizeByEffort;
    /**
     * Prioritize considering dependencies
     */
    private prioritizeByDependencies;
    /**
     * Generate task title from evidence
     */
    private generateTaskTitle;
    /**
     * Generate task description from evidence
     */
    private generateTaskDescription;
    /**
     * Categorize task based on evidence
     */
    private categorizeTask;
    /**
     * Prioritize task based on evidence severity
     */
    private prioritizeTask;
    /**
     * Generate acceptance criteria for evidence-based task
     */
    private generateAcceptanceCriteria;
    /**
     * Estimate effort for a task
     */
    private estimateEffort;
    /**
     * Calculate task complexity
     */
    private calculateComplexity;
    /**
     * Calculate time estimate based on complexity
     */
    private calculateTimeEstimate;
    /**
     * Calculate estimation confidence
     */
    private calculateEstimationConfidence;
    /**
     * Calculate impact score for prioritization
     */
    private calculateImpact;
    /**
     * Get effort score for sorting
     */
    private getEffortScore;
    /**
     * Generate metadata for task list
     */
    private generateMetadata;
    /**
     * Generate summary statistics
     */
    private generateSummary;
}
/**
 * Default configuration for follow-up task generation
 */
export declare const DEFAULT_FOLLOW_UP_TASK_CONFIG: FollowUpTaskConfig;
/**
 * Create follow-up task generator with default configuration
 */
export declare function createFollowUpTaskGenerator(config?: Partial<FollowUpTaskConfig>): FollowUpTaskGenerator;
/**
 * Validate follow-up task list structure
 */
export declare function validateFollowUpTaskList(taskList: FollowUpTaskList): string[];
//# sourceMappingURL=follow-up-task-generator.d.ts.map