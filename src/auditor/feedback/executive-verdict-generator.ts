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

import type {
  ExecutiveVerdict,
  ShipDecision,
  VerdictJustification,
  EvidenceLink,
  RiskAssessment,
  Risk,
  RiskLevel
} from '../../types/feedback-types.js';

import type {
  QualityAssessment,
  DimensionEvaluation,
  CriticalIssue
} from '../quality-assessment.js';

import type {
  EvidenceItem,
  SeverityLevel
} from '../workflow-types.js';

// ============================================================================
// Executive Verdict Generator Configuration
// ============================================================================

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

// ============================================================================
// Executive Verdict Generator Implementation
// ============================================================================

/**
 * Generates executive verdicts with ship/no-ship decisions and justifications
 */
export class ExecutiveVerdictGenerator {
  private config: ExecutiveVerdictConfig;

  constructor(config?: Partial<ExecutiveVerdictConfig>) {
    this.config = {
      ...DEFAULT_EXECUTIVE_VERDICT_CONFIG,
      ...config
    };
  }

  /**
   * Generate executive verdict based on quality assessment and evidence
   */
  async generateVerdict(context: VerdictGenerationContext): Promise<ExecutiveVerdict> {
    const { qualityAssessment, evidence, iteration } = context;

    // Make ship/no-ship decision
    const decision = this.makeShipDecision(qualityAssessment, evidence);

    // Generate summary bullet points
    const summary = this.generateSummary(qualityAssessment, evidence, decision);

    // Generate next steps guidance
    const nextSteps = this.generateNextSteps(qualityAssessment, evidence, decision, iteration);

    // Generate justification with evidence links
    const justification = this.generateJustification(qualityAssessment, evidence, decision);

    return {
      decision,
      overallScore: qualityAssessment.overallScore,
      summary,
      nextSteps,
      justification,
      timestamp: Date.now()
    };
  }

  /**
   * Make ship/no-ship decision based on quality assessment and evidence
   */
  private makeShipDecision(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[]
  ): ShipDecision {
    // Check for critical blocking issues
    const criticalIssues = this.getCriticalIssues(qualityAssessment, evidence);
    if (criticalIssues.length > this.config.maxCriticalIssuesForShip) {
      return "no-ship";
    }

    // Check overall score threshold
    if (qualityAssessment.overallScore < this.config.shipScoreThreshold) {
      return "no-ship";
    }

    // Check if all required dimensions pass
    const failedRequiredDimensions = qualityAssessment.dimensionEvaluations.filter(
      dim => dim.dimension.required && !dim.passed
    );
    if (failedRequiredDimensions.length > 0) {
      return "no-ship";
    }

    // Check risk tolerance
    const riskLevel = this.assessOverallRisk(qualityAssessment, evidence);
    if (this.isRiskAboveTolerance(riskLevel)) {
      return "no-ship";
    }

    return "ship";
  }

  /**
   * Generate 3-6 bullet point summary explaining the decision
   */
  private generateSummary(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[],
    decision: ShipDecision
  ): string[] {
    const summary: string[] = [];

    // Add decision statement
    const scoreText = `Overall quality score: ${qualityAssessment.overallScore}%`;
    summary.push(`${decision.toUpperCase()}: ${scoreText}`);

    // Add strongest dimensions
    const topDimensions = qualityAssessment.dimensionEvaluations
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    
    if (topDimensions.length > 0) {
      const strengthsText = topDimensions
        .map(dim => `${dim.dimension.name} (${dim.score}%)`)
        .join(", ");
      summary.push(`Strongest areas: ${strengthsText}`);
    }

    // Add areas needing improvement
    const bottomDimensions = qualityAssessment.dimensionEvaluations
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);
    
    if (bottomDimensions.length > 0 && bottomDimensions[0].score < 80) {
      const improvementText = bottomDimensions
        .map(dim => `${dim.dimension.name} (${dim.score}%)`)
        .join(", ");
      summary.push(`Areas needing improvement: ${improvementText}`);
    }

    // Add critical issues if any
    const criticalIssues = this.getCriticalIssues(qualityAssessment, evidence);
    if (criticalIssues.length > 0) {
      summary.push(`${criticalIssues.length} critical issue(s) must be addressed`);
    }

    // Add risk assessment
    const riskLevel = this.assessOverallRisk(qualityAssessment, evidence);
    if (riskLevel !== "low") {
      summary.push(`Risk level: ${riskLevel} - requires attention`);
    }

    // Add completion status if shipping
    if (decision === "ship") {
      summary.push("Code quality meets shipping criteria and is ready for deployment");
    }

    // Ensure summary is within limits
    return this.trimSummaryToLimits(summary);
  }

  /**
   * Generate next steps guidance based on verdict and context
   */
  private generateNextSteps(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[],
    decision: ShipDecision,
    iteration: number
  ): string[] {
    const nextSteps: string[] = [];

    if (decision === "no-ship") {
      // Add critical issue resolution steps
      const criticalIssues = this.getCriticalIssues(qualityAssessment, evidence);
      if (criticalIssues.length > 0) {
        nextSteps.push(`Address ${criticalIssues.length} critical issue(s) before proceeding`);
        
        // Add specific critical issue fixes
        criticalIssues.slice(0, 3).forEach(issue => {
          if (issue.suggestedFix) {
            nextSteps.push(`Fix: ${issue.suggestedFix}`);
          }
        });
      }

      // Add dimension improvement steps
      const failedDimensions = qualityAssessment.dimensionEvaluations
        .filter(dim => !dim.passed)
        .sort((a, b) => a.score - b.score);
      
      failedDimensions.slice(0, 2).forEach(dim => {
        if (dim.improvements.length > 0) {
          nextSteps.push(`Improve ${dim.dimension.name}: ${dim.improvements[0]}`);
        }
      });

      // Add iteration guidance
      if (iteration > 15) {
        nextSteps.push("Consider alternative approach - multiple iterations without significant improvement");
      } else {
        nextSteps.push("Continue iterative improvement cycle");
      }
    } else {
      // Ship decision - add deployment steps
      nextSteps.push("Proceed with deployment - quality criteria met");
      nextSteps.push("Run final validation: tests, lint, format, type-check");
      
      // Add monitoring recommendations
      const mediumRisks = evidence.filter(e => e.severity === "Major");
      if (mediumRisks.length > 0) {
        nextSteps.push("Monitor for issues related to medium-severity findings");
      }
      
      nextSteps.push("Update documentation and changelog as needed");
    }

    return nextSteps.slice(0, 6); // Limit to 6 steps
  }

  /**
   * Generate justification with evidence links and risk assessment
   */
  private generateJustification(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[],
    decision: ShipDecision
  ): VerdictJustification {
    // Generate primary reasons
    const primaryReasons = this.generatePrimaryReasons(qualityAssessment, evidence, decision);

    // Create evidence links
    const evidenceLinks = this.createEvidenceLinks(evidence);

    // Assess risks
    const riskAssessment = this.generateRiskAssessment(qualityAssessment, evidence);

    // Calculate confidence level
    const confidenceLevel = this.calculateConfidenceLevel(qualityAssessment, evidence);

    return {
      primaryReasons,
      evidenceLinks,
      riskAssessment,
      confidenceLevel
    };
  }

  /**
   * Generate primary reasons for the decision
   */
  private generatePrimaryReasons(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[],
    decision: ShipDecision
  ): string[] {
    const reasons: string[] = [];

    if (decision === "ship") {
      reasons.push(`Overall quality score ${qualityAssessment.overallScore}% exceeds threshold`);
      
      const passedDimensions = qualityAssessment.dimensionEvaluations.filter(dim => dim.passed);
      reasons.push(`${passedDimensions.length}/${qualityAssessment.dimensionEvaluations.length} quality dimensions pass requirements`);
      
      const criticalIssues = this.getCriticalIssues(qualityAssessment, evidence);
      if (criticalIssues.length === 0) {
        reasons.push("No critical blocking issues identified");
      }
    } else {
      const criticalIssues = this.getCriticalIssues(qualityAssessment, evidence);
      if (criticalIssues.length > 0) {
        reasons.push(`${criticalIssues.length} critical issue(s) block shipping`);
      }
      
      if (qualityAssessment.overallScore < this.config.shipScoreThreshold) {
        reasons.push(`Quality score ${qualityAssessment.overallScore}% below threshold ${this.config.shipScoreThreshold}%`);
      }
      
      const failedRequiredDimensions = qualityAssessment.dimensionEvaluations.filter(
        dim => dim.dimension.required && !dim.passed
      );
      if (failedRequiredDimensions.length > 0) {
        const dimNames = failedRequiredDimensions.map(dim => dim.dimension.name).join(", ");
        reasons.push(`Required dimensions below threshold: ${dimNames}`);
      }
    }

    return reasons;
  }

  /**
   * Create evidence links for supporting documentation
   */
  private createEvidenceLinks(evidence: EvidenceItem[]): EvidenceLink[] {
    return evidence
      .filter(item => item.severity === "Critical" || item.severity === "Major")
      .slice(0, 10) // Limit to top 10 evidence items
      .map((item, index) => ({
        evidenceId: `evidence_${index + 1}`,
        type: item.type,
        description: item.description,
        location: item.location
      }));
  }

  /**
   * Generate comprehensive risk assessment
   */
  private generateRiskAssessment(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[]
  ): RiskAssessment {
    const risks = this.identifyRisks(qualityAssessment, evidence);
    const level = this.assessOverallRisk(qualityAssessment, evidence);
    const mitigations = this.generateMitigations(risks);

    return {
      level,
      risks,
      mitigations
    };
  }

  /**
   * Identify specific risks from assessment and evidence
   */
  private identifyRisks(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[]
  ): Risk[] {
    const risks: Risk[] = [];

    // Security risks
    const securityIssues = evidence.filter(e => e.type === "security_vulnerability");
    if (securityIssues.length > 0) {
      risks.push({
        id: "security_vulnerabilities",
        description: `${securityIssues.length} security vulnerability(ies) identified`,
        category: "security",
        impact: "high",
        probability: "medium"
      });
    }

    // Performance risks
    const performanceIssues = evidence.filter(e => e.type === "performance_issue");
    if (performanceIssues.length > 0) {
      risks.push({
        id: "performance_degradation",
        description: `${performanceIssues.length} performance issue(s) may impact user experience`,
        category: "performance",
        impact: "medium",
        probability: "high"
      });
    }

    // Test coverage risks
    const testingDim = qualityAssessment.dimensionEvaluations.find(
      dim => dim.dimension.id === "testing_quality"
    );
    if (testingDim && testingDim.score < 70) {
      risks.push({
        id: "insufficient_test_coverage",
        description: "Low test coverage may lead to undetected bugs in production",
        category: "quality",
        impact: "high",
        probability: "medium"
      });
    }

    // Maintainability risks
    const styleConventionsDim = qualityAssessment.dimensionEvaluations.find(
      dim => dim.dimension.id === "style_conventions"
    );
    if (styleConventionsDim && styleConventionsDim.score < 60) {
      risks.push({
        id: "maintainability_issues",
        description: "Poor code style may impact long-term maintainability",
        category: "maintainability",
        impact: "medium",
        probability: "high"
      });
    }

    return risks;
  }

  /**
   * Assess overall risk level
   */
  private assessOverallRisk(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[]
  ): RiskLevel {
    const criticalIssues = this.getCriticalIssues(qualityAssessment, evidence);
    
    if (criticalIssues.length > 0) {
      return "critical";
    }

    const majorIssues = evidence.filter(e => e.severity === "Major");
    if (majorIssues.length > 5) {
      return "high";
    }

    if (qualityAssessment.overallScore < 70) {
      return "high";
    }

    if (qualityAssessment.overallScore < 85 || majorIssues.length > 2) {
      return "medium";
    }

    return "low";
  }

  /**
   * Generate risk mitigation strategies
   */
  private generateMitigations(risks: Risk[]): string[] {
    const mitigations: string[] = [];

    risks.forEach(risk => {
      switch (risk.category) {
        case "security":
          mitigations.push("Conduct security review and penetration testing");
          break;
        case "performance":
          mitigations.push("Implement performance monitoring and optimization");
          break;
        case "quality":
          mitigations.push("Increase test coverage and implement quality gates");
          break;
        case "maintainability":
          mitigations.push("Refactor code to improve readability and structure");
          break;
      }
    });

    return [...new Set(mitigations)]; // Remove duplicates
  }

  /**
   * Calculate confidence level in the verdict
   */
  private calculateConfidenceLevel(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[]
  ): number {
    let confidence = 100;

    // Reduce confidence for low scores
    if (qualityAssessment.overallScore < 50) {
      confidence -= 30;
    } else if (qualityAssessment.overallScore < 70) {
      confidence -= 15;
    }

    // Reduce confidence for insufficient evidence
    if (evidence.length < 5) {
      confidence -= 20;
    }

    // Reduce confidence for inconsistent dimension scores
    const scores = qualityAssessment.dimensionEvaluations.map(dim => dim.score);
    const scoreVariance = this.calculateVariance(scores);
    if (scoreVariance > 400) { // High variance
      confidence -= 15;
    }

    return Math.max(confidence, this.config.minConfidenceLevel);
  }

  /**
   * Get critical issues from assessment and evidence
   */
  private getCriticalIssues(
    qualityAssessment: QualityAssessment,
    evidence: EvidenceItem[]
  ): (CriticalIssue | EvidenceItem)[] {
    const issues: (CriticalIssue | EvidenceItem)[] = [];
    
    // Add critical issues from quality assessment
    issues.push(...qualityAssessment.criticalIssues);
    
    // Add critical evidence items
    const criticalEvidence = evidence.filter(e => e.severity === "Critical");
    issues.push(...criticalEvidence);
    
    return issues;
  }

  /**
   * Check if risk level is above tolerance
   */
  private isRiskAboveTolerance(riskLevel: RiskLevel): boolean {
    const riskLevels: Record<RiskLevel, number> = {
      "low": 1,
      "medium": 2,
      "high": 3,
      "critical": 4
    };

    const toleranceLevels: Record<RiskLevel, number> = {
      "low": 4,
      "medium": 3,
      "high": 2,
      "critical": 1
    };

    return riskLevels[riskLevel] > toleranceLevels[this.config.riskTolerance];
  }

  /**
   * Trim summary to configured limits
   */
  private trimSummaryToLimits(summary: string[]): string[] {
    const { min, max } = this.config.summaryLimits;
    
    if (summary.length < min) {
      // Pad with generic statements if needed
      while (summary.length < min) {
        summary.push("Additional analysis completed");
      }
    }
    
    return summary.slice(0, max);
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration for executive verdict generation
 */
export const DEFAULT_EXECUTIVE_VERDICT_CONFIG: ExecutiveVerdictConfig = {
  shipScoreThreshold: 85,
  maxCriticalIssuesForShip: 0,
  minConfidenceLevel: 60,
  riskTolerance: "medium",
  summaryLimits: {
    min: 3,
    max: 6
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create executive verdict generator with default configuration
 */
export function createExecutiveVerdictGenerator(
  config?: Partial<ExecutiveVerdictConfig>
): ExecutiveVerdictGenerator {
  return new ExecutiveVerdictGenerator(config);
}

/**
 * Validate executive verdict structure
 */
export function validateExecutiveVerdict(verdict: ExecutiveVerdict): string[] {
  const errors: string[] = [];

  if (!verdict.decision || !["ship", "no-ship"].includes(verdict.decision)) {
    errors.push("Invalid or missing decision");
  }

  if (typeof verdict.overallScore !== "number" || verdict.overallScore < 0 || verdict.overallScore > 100) {
    errors.push("Invalid overall score - must be between 0 and 100");
  }

  if (!Array.isArray(verdict.summary) || verdict.summary.length < 3 || verdict.summary.length > 6) {
    errors.push("Summary must contain 3-6 bullet points");
  }

  if (!Array.isArray(verdict.nextSteps) || verdict.nextSteps.length === 0) {
    errors.push("Next steps must be provided");
  }

  if (!verdict.justification || !verdict.justification.primaryReasons) {
    errors.push("Justification with primary reasons is required");
  }

  return errors;
}