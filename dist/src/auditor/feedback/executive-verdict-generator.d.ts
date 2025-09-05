/**
 * Executive Verdict Generator for GAN Auditor System Prompt
 *
 * This module implements executive verdict generation with ship/no-ship decision logic,
 * score integration, bullet point summaries, and evidence-based justification
 * as specified in requirement 5.1.
 *
 * Requirements addressed:
 * - 5.1: Executive verdict generation with ship/no-ship decision
 * - Create ship/no-ship decision logic with score integration
 * - Add 3-6 bullet point summary generation
 * - Implement next steps guidance creation
 * - Add verdict justification with evidence links
 */
import type { ExecutiveVerdict, RiskLevel } from '../../types/feedback-types.js';
import type { QualityAssessment } from '../quality-assessment.js';
import type { EvidenceItem } from '../workflow-types.js';
/**
 * Configuration for executive verdict generation
 */
export interface ExecutiveVerdictConfig {
    /** Minimum score threshold for ship decision */
    shipScoreThreshold: number;
    /** Maximum critical issues allowed for ship */
    maxCriticalIssuesForShip: number;
    /** Minimum confidence level required */
    minConfidenceLevel: number;
    /** Risk tolerance level */
    riskTolerance: RiskLevel;
    /** Summary bullet point limits */
    summaryLimits: {
        min: number;
        max: number;
    };
}
/**
 * Context for verdict generation
 */
export interface VerdictGenerationContext {
    /** Quality assessment results */
    qualityAssessment: QualityAssessment;
    /** Collected evidence items */
    evidence: EvidenceItem[];
    /** Current iteration number */
    iteration: number;
    /** Previous verdicts (for consistency) */
    previousVerdicts?: ExecutiveVerdict[];
    /** Session context */
    sessionId?: string;
}
/**
 * Generates executive verdicts with ship/no-ship decisions and justifications
 */
export declare class ExecutiveVerdictGenerator {
    private config;
    constructor(config?: Partial<ExecutiveVerdictConfig>);
    /**
     * Generate executive verdict based on quality assessment and evidence
     */
    generateVerdict(context: VerdictGenerationContext): Promise<ExecutiveVerdict>;
    /**
     * Make ship/no-ship decision based on quality assessment and evidence
     */
    private makeShipDecision;
    /**
     * Generate 3-6 bullet point summary explaining the decision
     */
    private generateSummary;
    /**
     * Generate next steps guidance based on verdict and context
     */
    private generateNextSteps;
    /**
     * Generate justification with evidence links and risk assessment
     */
    private generateJustification;
    /**
     * Generate primary reasons for the decision
     */
    private generatePrimaryReasons;
    /**
     * Create evidence links for supporting documentation
     */
    private createEvidenceLinks;
    /**
     * Generate comprehensive risk assessment
     */
    private generateRiskAssessment;
    /**
     * Identify specific risks from assessment and evidence
     */
    private identifyRisks;
    /**
     * Assess overall risk level
     */
    private assessOverallRisk;
    /**
     * Generate risk mitigation strategies
     */
    private generateMitigations;
    /**
     * Calculate confidence level in the verdict
     */
    private calculateConfidenceLevel;
    /**
     * Get critical issues from assessment and evidence
     */
    private getCriticalIssues;
    /**
     * Check if risk level is above tolerance
     */
    private isRiskAboveTolerance;
    /**
     * Trim summary to configured limits
     */
    private trimSummaryToLimits;
    /**
     * Calculate variance of an array of numbers
     */
    private calculateVariance;
}
/**
 * Default configuration for executive verdict generation
 */
export declare const DEFAULT_EXECUTIVE_VERDICT_CONFIG: ExecutiveVerdictConfig;
/**
 * Create executive verdict generator with default configuration
 */
export declare function createExecutiveVerdictGenerator(config?: Partial<ExecutiveVerdictConfig>): ExecutiveVerdictGenerator;
/**
 * Validate executive verdict structure
 */
export declare function validateExecutiveVerdict(verdict: ExecutiveVerdict): string[];
//# sourceMappingURL=executive-verdict-generator.d.ts.map