/**
 * Evidence Table Generator for GAN Auditor System Prompt
 *
 * This module implements evidence table generation with Issue|Severity|Location|Proof|Fix format,
 * severity level classification, location formatting, and proof type handling
 * as specified in requirement 5.2.
 *
 * Requirements addressed:
 * - 5.2: Evidence table generation with structured format
 * - Implement EvidenceTable class with Issue|Severity|Location|Proof|Fix format
 * - Add severity level classification (Critical/Major/Minor)
 * - Create location formatting (file:line, component:method)
 * - Add proof type handling (logs, tests, snippets, docs)
 */
import type { EvidenceTable } from '../../types/feedback-types.js';
import type { EvidenceItem, WorkflowStepResult } from '../workflow-types.js';
import type { QualityAssessment } from '../quality-assessment.js';
/**
 * Configuration for evidence table generation
 */
export interface EvidenceTableConfig {
    /** Maximum number of entries to include */
    maxEntries: number;
    /** Minimum confidence level for inclusion */
    minConfidenceLevel: number;
    /** Whether to group related evidence */
    groupRelatedEvidence: boolean;
    /** Location formatting preferences */
    locationFormatting: LocationFormattingConfig;
    /** Proof handling configuration */
    proofHandling: ProofHandlingConfig;
}
/**
 * Location formatting configuration
 */
export interface LocationFormattingConfig {
    /** Preferred format for file locations */
    fileFormat: "file:line" | "file:line:column" | "component:method";
    /** Whether to use relative paths */
    useRelativePaths: boolean;
    /** Maximum path length before truncation */
    maxPathLength: number;
    /** Whether to include line numbers */
    includeLineNumbers: boolean;
}
/**
 * Proof handling configuration
 */
export interface ProofHandlingConfig {
    /** Maximum proof content length */
    maxProofLength: number;
    /** Whether to include code snippets */
    includeCodeSnippets: boolean;
    /** Maximum snippet lines */
    maxSnippetLines: number;
    /** Whether to sanitize proof content */
    sanitizeProof: boolean;
}
/**
 * Context for evidence table generation
 */
export interface EvidenceTableGenerationContext {
    /** Workflow step results */
    workflowResults: WorkflowStepResult[];
    /** Quality assessment results */
    qualityAssessment?: QualityAssessment;
    /** Additional evidence items */
    additionalEvidence?: EvidenceItem[];
    /** Repository context */
    repositoryPath?: string;
    /** Session information */
    sessionId?: string;
}
/**
 * Generates structured evidence tables with comprehensive issue documentation
 */
export declare class EvidenceTableGenerator {
    private config;
    constructor(config?: Partial<EvidenceTableConfig>);
    /**
     * Generate evidence table from workflow results and quality assessment
     */
    generateEvidenceTable(context: EvidenceTableGenerationContext): Promise<EvidenceTable>;
    /**
     * Collect evidence from all available sources
     */
    private collectAllEvidence;
    /**
     * Extract evidence items from quality assessment
     */
    private extractEvidenceFromQualityAssessment;
    /**
     * Filter and prioritize evidence based on configuration and relevance
     */
    private filterAndPrioritizeEvidence;
    /**
     * Convert evidence items to structured evidence entries
     */
    private convertToEvidenceEntries;
    /**
     * Format issue description for clarity and consistency
     */
    private formatIssueDescription;
    /**
     * Format location information with consistent formatting
     */
    private formatLocation;
    /**
     * Format location string according to configuration
     */
    private formatLocationString;
    /**
     * Format proof information with appropriate type handling
     */
    private formatProof;
    /**
     * Determine proof type based on evidence characteristics
     */
    private determineProofType;
    /**
     * Format fix summary for actionability
     */
    private formatFixSummary;
    /**
     * Generate evidence entry metadata
     */
    private generateEvidenceEntryMetadata;
    /**
     * Group related evidence entries
     */
    private groupRelatedEvidence;
    /**
     * Generate evidence table metadata
     */
    private generateMetadata;
    /**
     * Generate evidence table summary statistics
     */
    private generateSummary;
    private removeDuplicateEvidence;
    private getEvidenceTypeImportance;
    private mapCriterionEvidenceType;
    private determineSeverityFromScore;
    private sanitizeProofContent;
    private formatCodeSnippet;
    private generateProofContext;
    private collectProofArtifacts;
    private getDetectionMethod;
    private calculateConfidence;
    private generateTags;
    private determineScope;
}
/**
 * Default configuration for evidence table generation
 */
export declare const DEFAULT_EVIDENCE_TABLE_CONFIG: EvidenceTableConfig;
/**
 * Create evidence table generator with default configuration
 */
export declare function createEvidenceTableGenerator(config?: Partial<EvidenceTableConfig>): EvidenceTableGenerator;
/**
 * Validate evidence table structure
 */
export declare function validateEvidenceTable(table: EvidenceTable): string[];
//# sourceMappingURL=evidence-table-generator.d.ts.map