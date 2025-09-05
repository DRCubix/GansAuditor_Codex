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

import type {
  StructuredFeedbackOutput,
  StructuredOutputMetadata,
  OutputQualityMetrics
} from '../../types/feedback-types.js';

import type {
  QualityAssessment
} from '../quality-assessment.js';

import type {
  WorkflowStepResult,
  EvidenceItem
} from '../workflow-types.js';

import { ExecutiveVerdictGenerator, type VerdictGenerationContext } from './executive-verdict-generator.js';
import { EvidenceTableGenerator, type EvidenceTableGenerationContext } from './evidence-table-generator.js';
import { ProposedDiffGenerator, type DiffGenerationContext } from './proposed-diff-generator.js';
import { ReproductionGuideGenerator, type ReproductionGuideContext } from './reproduction-guide-generator.js';
import { TraceabilityMatrixGenerator, type TraceabilityMatrixContext } from './traceability-matrix-generator.js';
import { FollowUpTaskGenerator, type FollowUpTaskContext } from './follow-up-task-generator.js';
import { OutputSanitizer, type SanitizationContext } from './output-sanitizer.js';

// ============================================================================
// Structured Feedback System Configuration
// ============================================================================

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

// ============================================================================
// Structured Feedback System Implementation
// ============================================================================

/**
 * Orchestrates all feedback components to generate comprehensive structured output
 */
export class StructuredFeedbackSystem {
  private config: StructuredFeedbackConfig;
  private executiveVerdictGenerator: ExecutiveVerdictGenerator;
  private evidenceTableGenerator: EvidenceTableGenerator;
  private proposedDiffGenerator: ProposedDiffGenerator;
  private reproductionGuideGenerator: ReproductionGuideGenerator;
  private traceabilityMatrixGenerator: TraceabilityMatrixGenerator;
  private followUpTaskGenerator: FollowUpTaskGenerator;
  private outputSanitizer: OutputSanitizer;

  constructor(config?: Partial<StructuredFeedbackConfig>) {
    this.config = {
      ...DEFAULT_STRUCTURED_FEEDBACK_CONFIG,
      ...config
    };

    // Initialize all generators
    this.executiveVerdictGenerator = new ExecutiveVerdictGenerator(this.config.executiveVerdict);
    this.evidenceTableGenerator = new EvidenceTableGenerator(this.config.evidenceTable);
    this.proposedDiffGenerator = new ProposedDiffGenerator(this.config.proposedDiffs);
    this.reproductionGuideGenerator = new ReproductionGuideGenerator(this.config.reproductionGuide);
    this.traceabilityMatrixGenerator = new TraceabilityMatrixGenerator(this.config.traceabilityMatrix);
    this.followUpTaskGenerator = new FollowUpTaskGenerator(this.config.followUpTasks);
    this.outputSanitizer = new OutputSanitizer(this.config.outputSanitization);
  }

  /**
   * Generate complete structured feedback output
   */
  async generateStructuredFeedback(context: StructuredFeedbackContext): Promise<StructuredFeedbackOutput> {
    const startTime = Date.now();

    try {
      // Generate all feedback components
      const components = await this.generateAllComponents(context);

      // Generate metadata
      const metadata = this.generateMetadata(context, startTime);

      // Assemble complete output
      const output: StructuredFeedbackOutput = {
        ...components,
        metadata,
        sanitizationResults: {
          metadata: {
            timestamp: Date.now(),
            rulesApplied: [],
            contentType: "structured_feedback",
            level: "standard"
          },
          sanitizedContent: "",
          actions: [],
          warnings: []
        }
      };

      // Apply sanitization if enabled
      if (this.config.systemSettings.componentFlags.outputSanitization) {
        const sanitizationContext: SanitizationContext = {
          contentType: "structured_feedback",
          source: "gan_auditor",
          audience: "external",
          requirements: []
        };

        return await this.outputSanitizer.sanitizeStructuredOutput(output, sanitizationContext);
      }

      return output;

    } catch (error) {
      throw new Error(`Failed to generate structured feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate all feedback components
   */
  private async generateAllComponents(context: StructuredFeedbackContext): Promise<Omit<StructuredFeedbackOutput, 'metadata' | 'sanitizationResults'>> {
    const components: any = {};

    // Determine which components to generate
    const enabledComponents = this.getEnabledComponents();

    // Generate components in parallel if enabled
    if (this.config.systemSettings.performance.enableParallelProcessing) {
      const promises = [];

      if (enabledComponents.executiveVerdict) {
        promises.push(this.generateExecutiveVerdict(context));
      }

      if (enabledComponents.evidenceTable) {
        promises.push(this.generateEvidenceTable(context));
      }

      if (enabledComponents.proposedDiffs) {
        promises.push(this.generateProposedDiffs(context));
      }

      if (enabledComponents.reproductionGuide) {
        promises.push(this.generateReproductionGuide(context));
      }

      if (enabledComponents.traceabilityMatrix) {
        promises.push(this.generateTraceabilityMatrix(context));
      }

      if (enabledComponents.followUpTasks) {
        promises.push(this.generateFollowUpTasks(context));
      }

      // Wait for all components with timeout
      const results = await Promise.allSettled(
        promises.map(p => this.withTimeout(p as Promise<any>, this.config.systemSettings.performance.componentTimeout))
      );

      // Process results
      let resultIndex = 0;
      if (enabledComponents.executiveVerdict) {
        components.executiveVerdict = this.extractResult(results[resultIndex++], 'executiveVerdict');
      }
      if (enabledComponents.evidenceTable) {
        components.evidenceTable = this.extractResult(results[resultIndex++], 'evidenceTable');
      }
      if (enabledComponents.proposedDiffs) {
        components.proposedDiffs = this.extractResult(results[resultIndex++], 'proposedDiffs');
      }
      if (enabledComponents.reproductionGuide) {
        components.reproductionGuide = this.extractResult(results[resultIndex++], 'reproductionGuide');
      }
      if (enabledComponents.traceabilityMatrix) {
        components.traceabilityMatrix = this.extractResult(results[resultIndex++], 'traceabilityMatrix');
      }
      if (enabledComponents.followUpTasks) {
        components.followUpTasks = this.extractResult(results[resultIndex++], 'followUpTasks');
      }

    } else {
      // Generate components sequentially
      if (enabledComponents.executiveVerdict) {
        components.executiveVerdict = await this.generateExecutiveVerdict(context);
      }

      if (enabledComponents.evidenceTable) {
        components.evidenceTable = await this.generateEvidenceTable(context);
      }

      if (enabledComponents.proposedDiffs) {
        components.proposedDiffs = await this.generateProposedDiffs(context);
      }

      if (enabledComponents.reproductionGuide) {
        components.reproductionGuide = await this.generateReproductionGuide(context);
      }

      if (enabledComponents.traceabilityMatrix) {
        components.traceabilityMatrix = await this.generateTraceabilityMatrix(context);
      }

      if (enabledComponents.followUpTasks) {
        components.followUpTasks = await this.generateFollowUpTasks(context);
      }
    }

    return components;
  }

  /**
   * Generate executive verdict component
   */
  private async generateExecutiveVerdict(context: StructuredFeedbackContext) {
    const verdictContext: VerdictGenerationContext = {
      qualityAssessment: context.qualityAssessment,
      evidence: context.evidenceItems,
      iteration: context.iteration,
      sessionId: context.sessionId
    };

    return await this.executiveVerdictGenerator.generateVerdict(verdictContext);
  }

  /**
   * Generate evidence table component
   */
  private async generateEvidenceTable(context: StructuredFeedbackContext) {
    const tableContext: EvidenceTableGenerationContext = {
      workflowResults: context.workflowResults,
      qualityAssessment: context.qualityAssessment,
      additionalEvidence: context.evidenceItems,
      repositoryPath: context.repositoryInfo?.rootPath,
      sessionId: context.sessionId
    };

    return await this.evidenceTableGenerator.generateEvidenceTable(tableContext);
  }

  /**
   * Generate proposed diffs component
   */
  private async generateProposedDiffs(context: StructuredFeedbackContext) {
    const diffContext: DiffGenerationContext = {
      evidenceItems: context.evidenceItems.filter(e => e.suggestedFix),
      repositoryPath: context.repositoryInfo?.rootPath || "",
      projectConfig: context.projectConfig,
      sessionId: context.sessionId
    };

    return await this.proposedDiffGenerator.generateProposedDiffs(diffContext);
  }

  /**
   * Generate reproduction guide component
   */
  private async generateReproductionGuide(context: StructuredFeedbackContext) {
    const reproContext: ReproductionGuideContext = {
      evidenceItems: context.evidenceItems,
      workflowResults: context.workflowResults,
      repositoryInfo: context.repositoryInfo || {
        rootPath: ".",
        packageManager: "npm" as const
      },
      projectConfig: context.projectConfig,
      sessionId: context.sessionId
    };

    return await this.reproductionGuideGenerator.generateReproductionGuide(reproContext);
  }

  /**
   * Generate traceability matrix component
   */
  private async generateTraceabilityMatrix(context: StructuredFeedbackContext) {
    // Extract acceptance criteria from INIT step results
    const initResult = context.workflowResults.find(r => r.step.name === "INIT");
    const acceptanceCriteria = (initResult?.outputs as any)?.acceptanceCriteria || [];

    const matrixContext: TraceabilityMatrixContext = {
      acceptanceCriteria,
      workflowResults: context.workflowResults,
      fileStructure: {
        rootPath: context.repositoryInfo?.rootPath || ".",
        sourceFiles: [],
        testFiles: [],
        configFiles: [],
        docFiles: []
      },
      sessionId: context.sessionId
    };

    return await this.traceabilityMatrixGenerator.generateTraceabilityMatrix(matrixContext);
  }

  /**
   * Generate follow-up tasks component
   */
  private async generateFollowUpTasks(context: StructuredFeedbackContext) {
    const taskContext: FollowUpTaskContext = {
      evidenceItems: context.evidenceItems,
      criticalIssues: context.qualityAssessment.criticalIssues,
      unmetACs: [], // Would be populated from traceability matrix
      missingTests: [], // Would be populated from traceability matrix
      iteration: context.iteration,
      sessionId: context.sessionId
    };

    return await this.followUpTaskGenerator.generateFollowUpTasks(taskContext);
  }

  /**
   * Get enabled components based on configuration
   */
  private getEnabledComponents(): ComponentFlags {
    if (this.config.systemSettings.enableAllComponents) {
      return {
        executiveVerdict: true,
        evidenceTable: true,
        proposedDiffs: true,
        reproductionGuide: true,
        traceabilityMatrix: true,
        followUpTasks: true,
        outputSanitization: true
      };
    }

    return this.config.systemSettings.componentFlags;
  }

  /**
   * Generate metadata for the structured output
   */
  private generateMetadata(context: StructuredFeedbackContext, startTime: number): StructuredOutputMetadata {
    const qualityMetrics = this.calculateQualityMetrics(context);

    return {
      timestamp: Date.now(),
      version: "1.0.0",
      context: `Structured feedback for session ${context.sessionId || 'unknown'}, iteration ${context.iteration}`,
      qualityMetrics
    };
  }

  /**
   * Calculate output quality metrics
   */
  private calculateQualityMetrics(context: StructuredFeedbackContext): OutputQualityMetrics {
    // Simple quality metrics calculation
    // In a real implementation, this would be more sophisticated

    const completeness = Math.min(
      (context.evidenceItems.length / 10) * 100, // Assume 10 evidence items is complete
      100
    );

    const accuracy = context.qualityAssessment.overallScore;

    const actionability = context.evidenceItems.filter(e => e.suggestedFix).length / 
                         Math.max(context.evidenceItems.length, 1) * 100;

    const evidenceQuality = context.evidenceItems.filter(e => e.reproductionSteps).length /
                           Math.max(context.evidenceItems.length, 1) * 100;

    return {
      completeness: Math.round(completeness),
      accuracy: Math.round(accuracy),
      actionability: Math.round(actionability),
      evidenceQuality: Math.round(evidenceQuality)
    };
  }

  /**
   * Add timeout to a promise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Component generation timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Extract result from Promise.allSettled result
   */
  private extractResult(result: PromiseSettledResult<any>, componentName: string): any {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`Failed to generate ${componentName}:`, result.reason);
      return this.getDefaultComponent(componentName);
    }
  }

  /**
   * Get default component when generation fails
   */
  private getDefaultComponent(componentName: string): any {
    const defaults: Record<string, any> = {
      executiveVerdict: {
        decision: "no-ship",
        overallScore: 0,
        summary: ["Component generation failed"],
        nextSteps: ["Manual review required"],
        justification: {
          primaryReasons: ["Generation error"],
          evidenceLinks: [],
          riskAssessment: { level: "high", risks: [], mitigations: [] },
          confidenceLevel: 0
        },
        timestamp: Date.now()
      },
      evidenceTable: {
        metadata: { timestamp: Date.now(), totalEntries: 0, scope: "error", collectionMethod: "failed" },
        entries: [],
        summary: { severityCounts: { Critical: 0, Major: 0, Minor: 0 }, proofTypeCounts: {}, commonIssues: [], affectedFiles: 0 }
      },
      proposedDiffs: [],
      reproductionGuide: {
        metadata: { timestamp: Date.now(), id: "error", target: "failed", environmentRequirements: [] },
        reproductionSteps: [],
        verificationSteps: [],
        testCommands: [],
        validationCommands: []
      },
      traceabilityMatrix: {
        metadata: { timestamp: Date.now(), id: "error", sourceSpec: "failed", analysisScope: [] },
        acMappings: [],
        coverageSummary: { totalACs: 0, coveredACs: 0, coveragePercentage: 0, coverageByStatus: {} },
        unmetACs: [],
        missingTests: []
      },
      followUpTasks: {
        metadata: { timestamp: Date.now(), id: "error", context: "failed", prioritizationMethod: "severity_first" },
        tasks: [],
        summary: { totalTasks: 0, tasksByPriority: {}, tasksByCategory: {} }
      }
    };

    return defaults[componentName] || {};
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration for structured feedback system
 */
export const DEFAULT_STRUCTURED_FEEDBACK_CONFIG: StructuredFeedbackConfig = {
  executiveVerdict: {},
  evidenceTable: {},
  proposedDiffs: {},
  reproductionGuide: {},
  traceabilityMatrix: {},
  followUpTasks: {},
  outputSanitization: {},
  systemSettings: {
    enableAllComponents: true,
    componentFlags: {
      executiveVerdict: true,
      evidenceTable: true,
      proposedDiffs: true,
      reproductionGuide: true,
      traceabilityMatrix: true,
      followUpTasks: true,
      outputSanitization: true
    },
    qualityThresholds: {
      minCompleteness: 70,
      minAccuracy: 80,
      minActionability: 75,
      minEvidenceQuality: 70
    },
    performance: {
      maxGenerationTime: 30000, // 30 seconds
      enableParallelProcessing: true,
      componentTimeout: 10000 // 10 seconds per component
    }
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create structured feedback system with default configuration
 */
export function createStructuredFeedbackSystem(
  config?: Partial<StructuredFeedbackConfig>
): StructuredFeedbackSystem {
  return new StructuredFeedbackSystem(config);
}

/**
 * Validate structured feedback output
 */
export function validateStructuredFeedbackOutput(output: StructuredFeedbackOutput): string[] {
  const errors: string[] = [];

  if (!output.metadata || !output.metadata.timestamp) {
    errors.push("Missing or invalid metadata");
  }

  if (!output.executiveVerdict) {
    errors.push("Missing executive verdict");
  }

  if (!output.evidenceTable) {
    errors.push("Missing evidence table");
  }

  if (!output.sanitizationResults) {
    errors.push("Missing sanitization results");
  }

  return errors;
}