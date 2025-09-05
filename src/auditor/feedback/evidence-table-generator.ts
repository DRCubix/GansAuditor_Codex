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

import type {
  EvidenceTable,
  EvidenceTableMetadata,
  EvidenceEntry,
  EvidenceTableSummary,
  LocationInfo,
  ProofInfo,
  EvidenceEntryMetadata,
  SeverityLevel,
  ProofType
} from '../../types/feedback-types.js';

import type {
  EvidenceItem,
  WorkflowStepResult,
  EvidenceType
} from '../workflow-types.js';

import type {
  QualityAssessment,
  CriterionEvidence
} from '../quality-assessment.js';

// ============================================================================
// Evidence Table Generator Configuration
// ============================================================================

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

// ============================================================================
// Evidence Table Generator Implementation
// ============================================================================

/**
 * Generates structured evidence tables with comprehensive issue documentation
 */
export class EvidenceTableGenerator {
  private config: EvidenceTableConfig;

  constructor(config?: Partial<EvidenceTableConfig>) {
    this.config = {
      ...DEFAULT_EVIDENCE_TABLE_CONFIG,
      ...config
    };
  }

  /**
   * Generate evidence table from workflow results and quality assessment
   */
  async generateEvidenceTable(context: EvidenceTableGenerationContext): Promise<EvidenceTable> {
    const startTime = Date.now();

    // Collect all evidence from various sources
    const allEvidence = this.collectAllEvidence(context);

    // Filter and prioritize evidence
    const filteredEvidence = this.filterAndPrioritizeEvidence(allEvidence);

    // Convert to evidence entries
    const entries = await this.convertToEvidenceEntries(filteredEvidence, context);

    // Group related evidence if configured
    const finalEntries = this.config.groupRelatedEvidence 
      ? this.groupRelatedEvidence(entries)
      : entries;

    // Generate metadata
    const metadata = this.generateMetadata(context, finalEntries.length);

    // Generate summary statistics
    const summary = this.generateSummary(finalEntries);

    return {
      metadata,
      entries: finalEntries.slice(0, this.config.maxEntries),
      summary
    };
  }

  /**
   * Collect evidence from all available sources
   */
  private collectAllEvidence(context: EvidenceTableGenerationContext): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];

    // Collect from workflow step results
    for (const stepResult of context.workflowResults) {
      evidence.push(...stepResult.evidence);
    }

    // Collect from quality assessment
    if (context.qualityAssessment) {
      const qualityEvidence = this.extractEvidenceFromQualityAssessment(
        context.qualityAssessment
      );
      evidence.push(...qualityEvidence);
    }

    // Add additional evidence
    if (context.additionalEvidence) {
      evidence.push(...context.additionalEvidence);
    }

    return evidence;
  }

  /**
   * Extract evidence items from quality assessment
   */
  private extractEvidenceFromQualityAssessment(assessment: QualityAssessment): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];

    // Convert critical issues to evidence items
    for (const criticalIssue of assessment.criticalIssues) {
      evidence.push({
        type: "missing_requirement",
        severity: criticalIssue.severity,
        location: criticalIssue.location,
        description: criticalIssue.title,
        proof: criticalIssue.description,
        suggestedFix: criticalIssue.suggestedFix
      });
    }

    // Extract evidence from dimension evaluations
    for (const dimEval of assessment.dimensionEvaluations) {
      for (const criterionEval of dimEval.criterionEvaluations) {
        for (const criterionEvidence of criterionEval.evidence) {
          if (criterionEvidence.impact === "negative") {
            evidence.push({
              type: this.mapCriterionEvidenceType(criterionEvidence.type),
              severity: this.determineSeverityFromScore(criterionEval.score),
              location: criterionEvidence.location || "unknown",
              description: criterionEvidence.description,
              proof: criterionEvidence.proof,
              suggestedFix: criterionEval.suggestions[0]
            });
          }
        }
      }
    }

    return evidence;
  }

  /**
   * Filter and prioritize evidence based on configuration and relevance
   */
  private filterAndPrioritizeEvidence(evidence: EvidenceItem[]): EvidenceItem[] {
    // Remove duplicates
    const uniqueEvidence = this.removeDuplicateEvidence(evidence);

    // Filter by confidence level (if available in metadata)
    const filteredEvidence = uniqueEvidence.filter(item => {
      // For now, assume all evidence meets minimum confidence
      // In a real implementation, this would check evidence metadata
      return true;
    });

    // Sort by priority: Critical > Major > Minor, then by type importance
    return filteredEvidence.sort((a, b) => {
      const severityOrder = { "Critical": 3, "Major": 2, "Minor": 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) {
        return severityDiff;
      }

      // Secondary sort by type importance
      const typeImportance = this.getEvidenceTypeImportance(a.type) - 
                           this.getEvidenceTypeImportance(b.type);
      return typeImportance;
    });
  }

  /**
   * Convert evidence items to structured evidence entries
   */
  private async convertToEvidenceEntries(
    evidence: EvidenceItem[],
    context: EvidenceTableGenerationContext
  ): Promise<EvidenceEntry[]> {
    const entries: EvidenceEntry[] = [];

    for (let i = 0; i < evidence.length; i++) {
      const item = evidence[i];
      
      const entry: EvidenceEntry = {
        id: `evidence_${i + 1}`,
        issue: this.formatIssueDescription(item),
        severity: item.severity,
        location: this.formatLocation(item.location, context),
        proof: this.formatProof(item, context),
        fixSummary: this.formatFixSummary(item),
        metadata: this.generateEvidenceEntryMetadata(item, i)
      };

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Format issue description for clarity and consistency
   */
  private formatIssueDescription(item: EvidenceItem): string {
    const typeDescriptions: Record<string, string> = {
      "lint_violation": "Linting Rule Violation",
      "format_issue": "Code Formatting Issue",
      "type_error": "Type Safety Error",
      "test_failure": "Test Failure",
      "coverage_gap": "Test Coverage Gap",
      "security_vulnerability": "Security Vulnerability",
      "performance_issue": "Performance Issue",
      "naming_violation": "Naming Convention Violation",
      "architecture_violation": "Architecture Pattern Violation",
      "missing_requirement": "Missing Requirement Implementation",
      "code_smell": "Code Quality Issue",
      "documentation_gap": "Documentation Gap"
    };

    const typePrefix = typeDescriptions[item.type] || "Quality Issue";
    return `${typePrefix}: ${item.description}`;
  }

  /**
   * Format location information with consistent formatting
   */
  private formatLocation(location: string, context: EvidenceTableGenerationContext): LocationInfo {
    const locationInfo: LocationInfo = {
      formatted: location
    };

    // Parse different location formats
    if (location.includes(":")) {
      const parts = location.split(":");
      
      if (parts.length >= 2) {
        locationInfo.file = parts[0];
        
        // Try to parse line number
        const lineNum = parseInt(parts[1], 10);
        if (!isNaN(lineNum)) {
          locationInfo.line = lineNum;
        }
        
        // Try to parse column number
        if (parts.length >= 3) {
          const colNum = parseInt(parts[2], 10);
          if (!isNaN(colNum)) {
            locationInfo.column = colNum;
          }
        }
      }
    }

    // Format according to configuration
    locationInfo.formatted = this.formatLocationString(locationInfo, context);

    return locationInfo;
  }

  /**
   * Format location string according to configuration
   */
  private formatLocationString(
    locationInfo: LocationInfo,
    context: EvidenceTableGenerationContext
  ): string {
    const { fileFormat, useRelativePaths, maxPathLength } = this.config.locationFormatting;

    let formatted = locationInfo.file || "unknown";

    // Apply relative path formatting
    if (useRelativePaths && context.repositoryPath && locationInfo.file) {
      formatted = locationInfo.file.replace(context.repositoryPath, ".");
    }

    // Truncate long paths
    if (formatted.length > maxPathLength) {
      formatted = "..." + formatted.slice(-(maxPathLength - 3));
    }

    // Add line/column information based on format
    switch (fileFormat) {
      case "file:line":
        if (locationInfo.line) {
          formatted += `:${locationInfo.line}`;
        }
        break;
      case "file:line:column":
        if (locationInfo.line) {
          formatted += `:${locationInfo.line}`;
          if (locationInfo.column) {
            formatted += `:${locationInfo.column}`;
          }
        }
        break;
      case "component:method":
        if (locationInfo.component && locationInfo.method) {
          formatted = `${locationInfo.component}:${locationInfo.method}`;
        }
        break;
    }

    return formatted;
  }

  /**
   * Format proof information with appropriate type handling
   */
  private formatProof(item: EvidenceItem, context: EvidenceTableGenerationContext): ProofInfo {
    const proofType = this.determineProofType(item);
    let content = item.proof;

    // Apply proof handling configuration
    if (this.config.proofHandling.sanitizeProof) {
      content = this.sanitizeProofContent(content);
    }

    // Truncate if too long
    if (content.length > this.config.proofHandling.maxProofLength) {
      content = content.substring(0, this.config.proofHandling.maxProofLength) + "...";
    }

    // Handle code snippets
    if (proofType === "snippets" && this.config.proofHandling.includeCodeSnippets) {
      content = this.formatCodeSnippet(content);
    }

    return {
      type: proofType,
      content,
      context: this.generateProofContext(item),
      artifacts: this.collectProofArtifacts(item)
    };
  }

  /**
   * Determine proof type based on evidence characteristics
   */
  private determineProofType(item: EvidenceItem): ProofType {
    // Map evidence types to proof types
    const typeMapping: Record<string, ProofType> = {
      "lint_violation": "logs",
      "format_issue": "snippets",
      "type_error": "logs",
      "test_failure": "tests",
      "coverage_gap": "metrics",
      "security_vulnerability": "logs",
      "performance_issue": "metrics",
      "naming_violation": "snippets",
      "architecture_violation": "docs",
      "missing_requirement": "docs",
      "code_smell": "snippets",
      "documentation_gap": "docs"
    };

    return typeMapping[item.type] || "logs";
  }

  /**
   * Format fix summary for actionability
   */
  private formatFixSummary(item: EvidenceItem): string {
    if (!item.suggestedFix) {
      return "Manual review required";
    }

    // Ensure fix summary is concise and actionable
    let fix = item.suggestedFix;
    
    // Add action verb if missing
    if (!fix.match(/^(Add|Remove|Update|Fix|Refactor|Implement|Change)/i)) {
      fix = `Fix: ${fix}`;
    }

    // Limit length
    if (fix.length > 100) {
      fix = fix.substring(0, 97) + "...";
    }

    return fix;
  }

  /**
   * Generate evidence entry metadata
   */
  private generateEvidenceEntryMetadata(
    item: EvidenceItem,
    index: number
  ): EvidenceEntryMetadata {
    return {
      detectionMethod: this.getDetectionMethod(item.type),
      confidence: this.calculateConfidence(item),
      relatedEvidence: [], // Would be populated by grouping logic
      tags: this.generateTags(item)
    };
  }

  /**
   * Group related evidence entries
   */
  private groupRelatedEvidence(entries: EvidenceEntry[]): EvidenceEntry[] {
    // Simple grouping by file location
    const groups = new Map<string, EvidenceEntry[]>();

    for (const entry of entries) {
      const groupKey = entry.location.file || "unknown";
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(entry);
    }

    // Update related evidence metadata
    for (const [, groupEntries] of groups) {
      if (groupEntries.length > 1) {
        const entryIds = groupEntries.map(e => e.id);
        for (const entry of groupEntries) {
          entry.metadata.relatedEvidence = entryIds.filter(id => id !== entry.id);
        }
      }
    }

    return entries;
  }

  /**
   * Generate evidence table metadata
   */
  private generateMetadata(
    context: EvidenceTableGenerationContext,
    entryCount: number
  ): EvidenceTableMetadata {
    return {
      timestamp: Date.now(),
      totalEntries: entryCount,
      scope: this.determineScope(context),
      collectionMethod: "automated_workflow_analysis"
    };
  }

  /**
   * Generate evidence table summary statistics
   */
  private generateSummary(entries: EvidenceEntry[]): EvidenceTableSummary {
    const severityCounts: Record<SeverityLevel, number> = {
      "Critical": 0,
      "Major": 0,
      "Minor": 0
    };

    const proofTypeCounts: Record<ProofType, number> = {
      "logs": 0,
      "tests": 0,
      "snippets": 0,
      "docs": 0,
      "metrics": 0,
      "screenshots": 0
    };

    const issueTypes: string[] = [];
    const files = new Set<string>();

    for (const entry of entries) {
      severityCounts[entry.severity]++;
      proofTypeCounts[entry.proof.type]++;
      
      // Extract issue type from issue description
      const issueType = entry.issue.split(":")[0];
      issueTypes.push(issueType);
      
      if (entry.location.file) {
        files.add(entry.location.file);
      }
    }

    // Find most common issues
    const issueTypeCounts = issueTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonIssues = Object.entries(issueTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);

    return {
      severityCounts,
      proofTypeCounts,
      commonIssues,
      affectedFiles: files.size
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private removeDuplicateEvidence(evidence: EvidenceItem[]): EvidenceItem[] {
    const seen = new Set<string>();
    return evidence.filter(item => {
      const key = `${item.type}:${item.location}:${item.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private getEvidenceTypeImportance(type: string): number {
    const importance: Record<string, number> = {
      "security_vulnerability": 10,
      "test_failure": 9,
      "type_error": 8,
      "missing_requirement": 7,
      "performance_issue": 6,
      "lint_violation": 5,
      "coverage_gap": 4,
      "architecture_violation": 3,
      "naming_violation": 2,
      "format_issue": 1,
      "documentation_gap": 1
    };
    return importance[type] || 0;
  }

  private mapCriterionEvidenceType(type: string): EvidenceType {
    const mapping: Record<string, EvidenceType> = {
      "critical": "missing_requirement",
      "error": "type_error",
      "warning": "lint_violation",
      "info": "code_smell"
    };
    return mapping[type] || "code_smell";
  }

  private determineSeverityFromScore(score: number): SeverityLevel {
    if (score < 40) return "Critical";
    if (score < 70) return "Major";
    return "Minor";
  }

  private sanitizeProofContent(content: string): string {
    // Remove potential PII and sensitive information
    return content
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[email]")
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[phone]")
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[ssn]");
  }

  private formatCodeSnippet(content: string): string {
    const lines = content.split("\n");
    const maxLines = this.config.proofHandling.maxSnippetLines;
    
    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join("\n") + "\n... [truncated]";
    }
    
    return content;
  }

  private generateProofContext(item: EvidenceItem): string {
    return `Evidence collected from ${item.type} analysis`;
  }

  private collectProofArtifacts(item: EvidenceItem): string[] {
    const artifacts: string[] = [];
    
    if (item.reproductionSteps) {
      artifacts.push(...item.reproductionSteps);
    }
    
    return artifacts;
  }

  private getDetectionMethod(type: string): string {
    const methods: Record<string, string> = {
      "lint_violation": "static_analysis",
      "format_issue": "formatting_check",
      "type_error": "type_checking",
      "test_failure": "test_execution",
      "coverage_gap": "coverage_analysis",
      "security_vulnerability": "security_scan",
      "performance_issue": "performance_analysis"
    };
    return methods[type] || "manual_review";
  }

  private calculateConfidence(item: EvidenceItem): number {
    // Base confidence on evidence type and available information
    let confidence = 80;
    
    if (item.suggestedFix) confidence += 10;
    if (item.reproductionSteps) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  private generateTags(item: EvidenceItem): string[] {
    const tags: string[] = [item.type, item.severity.toLowerCase()];
    
    if (item.suggestedFix) tags.push("fixable");
    if (item.reproductionSteps) tags.push("reproducible");
    
    return tags;
  }

  private determineScope(context: EvidenceTableGenerationContext): string {
    const stepNames = context.workflowResults.map(r => r.step.name);
    return `Workflow steps: ${stepNames.join(", ")}`;
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration for evidence table generation
 */
export const DEFAULT_EVIDENCE_TABLE_CONFIG: EvidenceTableConfig = {
  maxEntries: 50,
  minConfidenceLevel: 60,
  groupRelatedEvidence: true,
  locationFormatting: {
    fileFormat: "file:line",
    useRelativePaths: true,
    maxPathLength: 60,
    includeLineNumbers: true
  },
  proofHandling: {
    maxProofLength: 500,
    includeCodeSnippets: true,
    maxSnippetLines: 10,
    sanitizeProof: true
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create evidence table generator with default configuration
 */
export function createEvidenceTableGenerator(
  config?: Partial<EvidenceTableConfig>
): EvidenceTableGenerator {
  return new EvidenceTableGenerator(config);
}

/**
 * Validate evidence table structure
 */
export function validateEvidenceTable(table: EvidenceTable): string[] {
  const errors: string[] = [];

  if (!table.metadata || !table.metadata.timestamp) {
    errors.push("Missing or invalid metadata");
  }

  if (!Array.isArray(table.entries)) {
    errors.push("Entries must be an array");
  }

  for (const entry of table.entries) {
    if (!entry.id || !entry.issue || !entry.severity || !entry.location || !entry.proof) {
      errors.push(`Invalid entry ${entry.id}: missing required fields`);
    }

    if (!["Critical", "Major", "Minor"].includes(entry.severity)) {
      errors.push(`Invalid severity level: ${entry.severity}`);
    }
  }

  if (!table.summary) {
    errors.push("Missing summary statistics");
  }

  return errors;
}