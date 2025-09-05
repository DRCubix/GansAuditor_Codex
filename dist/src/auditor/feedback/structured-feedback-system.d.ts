/**
 * Structured Feedback System for GAN Auditor System Prompt
 *
 * This module orchestrates all feedback components to generate comprehensive
 * structured output with evidence-based feedback as specified in requirement 5.
 *
 * Requirements addressed:
 * - 5: Complete structured output and evidence-based feedback system
 * - Orchestrates all feedback components (5.1-5.7)
 * - Provides unified interface for feedback generation
 * - Ensures consistency across all feedback components
 */
import type { StructuredFeedbackOutput } from '../../types/feedback-types.js';
import type { QualityAssessment } from '../quality-assessment.js';
import type { WorkflowStepResult, EvidenceItem } from '../workflow-types.js';
/**
 * Configuration for the structured feedback system
 */
export interface StructuredFeedbackConfig {
    /** Executive verdict generation config */
    executiveVerdict: any;
    /** Evidence table generation config */
    evidenceTable: any;
    /** Proposed diff generation config */
    proposedDiffs: any;
    /** Reproduction guide generation config */
    reproductionGuide: any;
    /** Traceability matrix generation config */
    traceabilityMatrix: any;
    /** Follow-up task generation config */
    followUpTasks: any;
    /** Output sanitization config */
    outputSanitization: any;
    /** System-wide settings */
    systemSettings: SystemSettings;
}
/**
 * System-wide settings
 */
export interface SystemSettings {
    /** Enable all components */
    enableAllComponents: boolean;
    /** Component enablement flags */
    componentFlags: ComponentFlags;
    /** Quality thresholds */
    qualityThresholds: QualityThresholds;
    /** Performance settings */
    performance: PerformanceSettings;
}
/**
 * Component enablement flags
 */
export interface ComponentFlags {
    executiveVerdict: boolean;
    evidenceTable: boolean;
    proposedDiffs: boolean;
    reproductionGuide: boolean;
    traceabilityMatrix: boolean;
    followUpTasks: boolean;
    outputSanitization: boolean;
}
/**
 * Quality thresholds for feedback generation
 */
export interface QualityThresholds {
    /** Minimum completeness score */
    minCompleteness: number;
    /** Minimum accuracy score */
    minAccuracy: number;
    /** Minimum actionability score */
    minActionability: number;
    /** Minimum evidence quality score */
    minEvidenceQuality: number;
}
/**
 * Performance settings
 */
export interface PerformanceSettings {
    /** Maximum generation time (ms) */
    maxGenerationTime: number;
    /** Enable parallel processing */
    enableParallelProcessing: boolean;
    /** Component timeout (ms) */
    componentTimeout: number;
}
/**
 * Context for structured feedback generation
 */
export interface StructuredFeedbackContext {
    /** Quality assessment results */
    qualityAssessment: QualityAssessment;
    /** Workflow step results */
    workflowResults: WorkflowStepResult[];
    /** Evidence items */
    evidenceItems: EvidenceItem[];
    /** Session information */
    sessionId?: string;
    /** Iteration number */
    iteration: number;
    /** Repository information */
    repositoryInfo?: any;
    /** Project configuration */
    projectConfig?: any;
}
/**
 * Orchestrates all feedback components to generate comprehensive structured output
 */
export declare class StructuredFeedbackSystem {
    private config;
    private executiveVerdictGenerator;
    private evidenceTableGenerator;
    private proposedDiffGenerator;
    private reproductionGuideGenerator;
    private traceabilityMatrixGenerator;
    private followUpTaskGenerator;
    private outputSanitizer;
    constructor(config?: Partial<StructuredFeedbackConfig>);
    /**
     * Generate complete structured feedback output
     */
    generateStructuredFeedback(context: StructuredFeedbackContext): Promise<StructuredFeedbackOutput>;
    /**
     * Generate all feedback components
     */
    private generateAllComponents;
    /**
     * Generate executive verdict component
     */
    private generateExecutiveVerdict;
    /**
     * Generate evidence table component
     */
    private generateEvidenceTable;
    /**
     * Generate proposed diffs component
     */
    private generateProposedDiffs;
    /**
     * Generate reproduction guide component
     */
    private generateReproductionGuide;
    /**
     * Generate traceability matrix component
     */
    private generateTraceabilityMatrix;
    /**
     * Generate follow-up tasks component
     */
    private generateFollowUpTasks;
    /**
     * Get enabled components based on configuration
     */
    private getEnabledComponents;
    /**
     * Generate metadata for the structured output
     */
    private generateMetadata;
    /**
     * Calculate output quality metrics
     */
    private calculateQualityMetrics;
    /**
     * Add timeout to a promise
     */
    private withTimeout;
    /**
     * Extract result from Promise.allSettled result
     */
    private extractResult;
    /**
     * Get default component when generation fails
     */
    private getDefaultComponent;
}
/**
 * Default configuration for structured feedback system
 */
export declare const DEFAULT_STRUCTURED_FEEDBACK_CONFIG: StructuredFeedbackConfig;
/**
 * Create structured feedback system with default configuration
 */
export declare function createStructuredFeedbackSystem(config?: Partial<StructuredFeedbackConfig>): StructuredFeedbackSystem;
/**
 * Validate structured feedback output
 */
export declare function validateStructuredFeedbackOutput(output: StructuredFeedbackOutput): string[];
//# sourceMappingURL=structured-feedback-system.d.ts.map