/**
 * Structured Output and Evidence-Based Feedback System
 *
 * This module exports all components of the structured feedback system
 * for the GAN Auditor System Prompt as specified in requirement 5.
 *
 * Requirements addressed:
 * - 5: Complete structured output and evidence-based feedback system
 * - 5.1: Executive verdict generation
 * - 5.2: Evidence table generation
 * - 5.3: Proposed diff generation
 * - 5.4: Reproduction and verification guide
 * - 5.5: Traceability matrix generation
 * - 5.6: Follow-up task generation
 * - 5.7: Output sanitization and security
 */
export { StructuredFeedbackSystem, createStructuredFeedbackSystem, validateStructuredFeedbackOutput, DEFAULT_STRUCTURED_FEEDBACK_CONFIG } from './structured-feedback-system.js';
export type { StructuredFeedbackConfig, StructuredFeedbackContext, SystemSettings, ComponentFlags, QualityThresholds, PerformanceSettings } from './structured-feedback-system.js';
export { ExecutiveVerdictGenerator, createExecutiveVerdictGenerator, validateExecutiveVerdict, DEFAULT_EXECUTIVE_VERDICT_CONFIG } from './executive-verdict-generator.js';
export type { ExecutiveVerdictConfig, VerdictGenerationContext } from './executive-verdict-generator.js';
export { EvidenceTableGenerator, createEvidenceTableGenerator, validateEvidenceTable, DEFAULT_EVIDENCE_TABLE_CONFIG } from './evidence-table-generator.js';
export type { EvidenceTableConfig, EvidenceTableGenerationContext, LocationFormattingConfig, ProofHandlingConfig } from './evidence-table-generator.js';
export { ProposedDiffGenerator, createProposedDiffGenerator, validateProposedDiff, DEFAULT_PROPOSED_DIFF_CONFIG } from './proposed-diff-generator.js';
export type { ProposedDiffConfig, DiffGenerationContext, VerificationCommandConfig, ProjectConfig, FixProposal } from './proposed-diff-generator.js';
export { ReproductionGuideGenerator, createReproductionGuideGenerator, validateReproductionGuide, DEFAULT_REPRODUCTION_GUIDE_CONFIG } from './reproduction-guide-generator.js';
export type { ReproductionGuideConfig, ReproductionGuideContext, CommandTemplateConfig, RepositoryInfo, ProjectConfiguration } from './reproduction-guide-generator.js';
export { TraceabilityMatrixGenerator, createTraceabilityMatrixGenerator, validateTraceabilityMatrix, DEFAULT_TRACEABILITY_MATRIX_CONFIG } from './traceability-matrix-generator.js';
export type { TraceabilityMatrixConfig, TraceabilityMatrixContext, FileStructureInfo, CodeAnalysisResult, TestAnalysisResult, AnalysisDepth } from './traceability-matrix-generator.js';
export { FollowUpTaskGenerator, createFollowUpTaskGenerator, validateFollowUpTaskList, DEFAULT_FOLLOW_UP_TASK_CONFIG } from './follow-up-task-generator.js';
export type { FollowUpTaskConfig, FollowUpTaskContext, PrioritizationMethod, CategorizationRules, EffortEstimationConfig, ProjectContext } from './follow-up-task-generator.js';
export { OutputSanitizer, createOutputSanitizer, validateSanitizationResult, DEFAULT_OUTPUT_SANITIZER_CONFIG } from './output-sanitizer.js';
export type { OutputSanitizerConfig, SanitizationContext, SecretPattern, ToolSyntaxPattern, PathAnonymizationConfig, ContentFilteringConfig, SanitizationRequirement, SecretCategory } from './output-sanitizer.js';
export type { StructuredFeedbackOutput, ExecutiveVerdict, EvidenceTable, ProposedDiff, ReproductionGuide, TraceabilityMatrix, FollowUpTaskList, SanitizationResult } from '../../types/feedback-types.js';
//# sourceMappingURL=index.d.ts.map