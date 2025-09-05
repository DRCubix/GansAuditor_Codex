/**
 * Proposed Diff Generator for GAN Auditor System Prompt
 * 
 * This module implements proposed diff generation for specific fixes with unified diff format,
 * small isolated change validation, test-first prioritization, and verification commands
 * as specified in requirement 5.3.
 * 
 * Requirements addressed:
 * - 5.3: Proposed diff generation for specific fixes
 * - Create unified diff generation for specific fixes
 * - Add small, isolated change validation
 * - Implement test-first diff prioritization
 * - Add verification command generation
 */

import type {
  ProposedDiff,
  DiffMetadata,
  FileChange,
  DiffHunk,
  DiffLine,
  DiffValidation,
  ChangeCategory,
  ChangePriority,
  FileChangeType,
  DiffLineType
} from '../../types/feedback-types.js';

import type {
  EvidenceItem
} from '../workflow-types.js';

// ============================================================================
// Proposed Diff Generator Configuration
// ============================================================================

/**
 * Configuration for proposed diff generation
 */
export interface ProposedDiffConfig {
  /** Maximum lines per diff */
  maxLinesPerDiff: number;
  /** Maximum files per diff */
  maxFilesPerDiff: number;
  /** Whether to prioritize test files */
  prioritizeTestFiles: boolean;
  /** Maximum hunk size for isolation validation */
  maxHunkSizeForIsolation: number;
  /** Verification command templates */
  verificationCommands: VerificationCommandConfig;
}

/**
 * Verification command configuration
 */
export interface VerificationCommandConfig {
  /** Test execution commands */
  testCommands: string[];
  /** Linting commands */
  lintCommands: string[];
  /** Format check commands */
  formatCommands: string[];
  /** Type check commands */
  typeCheckCommands: string[];
  /** Build commands */
  buildCommands: string[];
}

/**
 * Context for diff generation
 */
export interface DiffGenerationContext {
  /** Evidence items requiring fixes */
  evidenceItems: EvidenceItem[];
  /** Repository root path */
  repositoryPath: string;
  /** Current file contents (for context) */
  fileContents?: Map<string, string>;
  /** Project configuration */
  projectConfig?: ProjectConfig;
  /** Session information */
  sessionId?: string;
}

/**
 * Project configuration for diff generation
 */
export interface ProjectConfig {
  /** Test file patterns */
  testFilePatterns: string[];
  /** Source file patterns */
  sourceFilePatterns: string[];
  /** Configuration file patterns */
  configFilePatterns: string[];
  /** Package manager type */
  packageManager: "npm" | "yarn" | "pnpm";
  /** Build system */
  buildSystem?: string;
}

/**
 * Fix proposal for generating diffs
 */
export interface FixProposal {
  /** Target file path */
  filePath: string;
  /** Fix description */
  description: string;
  /** Fix category */
  category: ChangeCategory;
  /** Fix priority */
  priority: ChangePriority;
  /** Original content */
  originalContent: string;
  /** Fixed content */
  fixedContent: string;
  /** Line range affected */
  lineRange: {
    start: number;
    end: number;
  };
  /** Related evidence */
  relatedEvidence: string[];
}

// ============================================================================
// Proposed Diff Generator Implementation
// ============================================================================

/**
 * Generates proposed diffs for specific fixes with validation and prioritization
 */
export class ProposedDiffGenerator {
  private config: ProposedDiffConfig;

  constructor(config?: Partial<ProposedDiffConfig>) {
    this.config = {
      ...DEFAULT_PROPOSED_DIFF_CONFIG,
      ...config
    };
  }

  /**
   * Generate proposed diffs from evidence items and fix suggestions
   */
  async generateProposedDiffs(context: DiffGenerationContext): Promise<ProposedDiff[]> {
    // Extract fix proposals from evidence
    const fixProposals = await this.extractFixProposals(context);

    // Prioritize fixes (test-first approach)
    const prioritizedProposals = this.prioritizeFixProposals(fixProposals, context);

    // Group related fixes
    const groupedProposals = this.groupRelatedFixes(prioritizedProposals);

    // Generate diffs for each group
    const diffs: ProposedDiff[] = [];
    for (const group of groupedProposals) {
      const diff = await this.generateDiffForGroup(group, context);
      if (diff) {
        diffs.push(diff);
      }
    }

    return diffs;
  }

  /**
   * Extract fix proposals from evidence items
   */
  private async extractFixProposals(context: DiffGenerationContext): Promise<FixProposal[]> {
    const proposals: FixProposal[] = [];

    for (const evidence of context.evidenceItems) {
      if (!evidence.suggestedFix) {
        continue;
      }

      // Parse location to get file path and line information
      const locationInfo = this.parseLocation(evidence.location);
      if (!locationInfo.filePath) {
        continue;
      }

      // Get current file content
      const originalContent = await this.getFileContent(locationInfo.filePath, context);
      if (!originalContent) {
        continue;
      }

      // Generate fixed content based on evidence type and suggestion
      const fixedContent = await this.generateFixedContent(
        evidence,
        originalContent,
        locationInfo
      );

      if (fixedContent && fixedContent !== originalContent) {
        proposals.push({
          filePath: locationInfo.filePath,
          description: evidence.suggestedFix,
          category: this.categorizeChange(evidence),
          priority: this.prioritizeChange(evidence),
          originalContent,
          fixedContent,
          lineRange: {
            start: locationInfo.lineStart || 1,
            end: locationInfo.lineEnd || 1
          },
          relatedEvidence: [evidence.type]
        });
      }
    }

    return proposals;
  }

  /**
   * Prioritize fix proposals with test-first approach
   */
  private prioritizeFixProposals(
    proposals: FixProposal[],
    context: DiffGenerationContext
  ): FixProposal[] {
    return proposals.sort((a, b) => {
      // Test-first prioritization
      if (this.config.prioritizeTestFiles) {
        const aIsTest = this.isTestFile(a.filePath, context.projectConfig);
        const bIsTest = this.isTestFile(b.filePath, context.projectConfig);
        
        if (aIsTest && !bIsTest) return -1;
        if (!aIsTest && bIsTest) return 1;
      }

      // Priority-based sorting
      const priorityOrder = { "critical": 4, "high": 3, "medium": 2, "low": 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Category-based sorting (fixes before improvements)
      const categoryOrder = { "fix": 4, "test": 3, "refactor": 2, "improvement": 1, "documentation": 0 };
      return categoryOrder[b.category] - categoryOrder[a.category];
    });
  }

  /**
   * Group related fixes that can be combined into single diffs
   */
  private groupRelatedFixes(proposals: FixProposal[]): FixProposal[][] {
    const groups: FixProposal[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < proposals.length; i++) {
      if (processed.has(i)) continue;

      const group = [proposals[i]];
      processed.add(i);

      // Find related proposals
      for (let j = i + 1; j < proposals.length; j++) {
        if (processed.has(j)) continue;

        if (this.areFixesRelated(proposals[i], proposals[j])) {
          group.push(proposals[j]);
          processed.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Generate diff for a group of related fixes
   */
  private async generateDiffForGroup(
    group: FixProposal[],
    context: DiffGenerationContext
  ): Promise<ProposedDiff | null> {
    if (group.length === 0) return null;

    // Validate that changes are small and isolated
    const validation = this.validateChanges(group);
    if (!validation.isSmallAndIsolated) {
      return null;
    }

    // Generate unified diff
    const unifiedDiff = this.generateUnifiedDiff(group);

    // Generate file changes
    const fileChanges = this.generateFileChanges(group);

    // Generate metadata
    const metadata = this.generateDiffMetadata(group, context);

    // Generate verification commands
    const verificationCommands = this.generateVerificationCommands(group, context);
    validation.verificationCommands = verificationCommands;

    return {
      metadata,
      unifiedDiff,
      fileChanges,
      validation
    };
  }

  /**
   * Generate unified diff format
   */
  private generateUnifiedDiff(group: FixProposal[]): string {
    const diffLines: string[] = [];

    for (const proposal of group) {
      // Generate diff header
      diffLines.push(`--- a/${proposal.filePath}`);
      diffLines.push(`+++ b/${proposal.filePath}`);

      // Generate hunks
      const hunks = this.generateDiffHunks(proposal);
      for (const hunk of hunks) {
        // Hunk header
        diffLines.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);
        
        // Hunk lines
        for (const line of hunk.lines) {
          const prefix = line.type === "addition" ? "+" : 
                        line.type === "deletion" ? "-" : " ";
          diffLines.push(`${prefix}${line.content}`);
        }
      }

      diffLines.push(""); // Empty line between files
    }

    return diffLines.join("\n");
  }

  /**
   * Generate diff hunks for a proposal
   */
  private generateDiffHunks(proposal: FixProposal): DiffHunk[] {
    const originalLines = proposal.originalContent.split("\n");
    const fixedLines = proposal.fixedContent.split("\n");

    // Simple diff algorithm - in a real implementation, use a proper diff library
    const hunks: DiffHunk[] = [];
    
    // Find changed regions
    const changes = this.findChangedRegions(originalLines, fixedLines);
    
    for (const change of changes) {
      const hunk = this.createHunkFromChange(change, originalLines, fixedLines);
      hunks.push(hunk);
    }

    return hunks;
  }

  /**
   * Generate file changes summary
   */
  private generateFileChanges(group: FixProposal[]): FileChange[] {
    const fileChanges: FileChange[] = [];

    for (const proposal of group) {
      const originalLines = proposal.originalContent.split("\n");
      const fixedLines = proposal.fixedContent.split("\n");

      const additions = this.countAdditions(originalLines, fixedLines);
      const deletions = this.countDeletions(originalLines, fixedLines);
      const hunks = this.generateDiffHunks(proposal);

      fileChanges.push({
        filePath: proposal.filePath,
        changeType: "modified",
        additions,
        deletions,
        hunks
      });
    }

    return fileChanges;
  }

  /**
   * Validate that changes are small and isolated
   */
  private validateChanges(group: FixProposal[]): DiffValidation {
    const validation: DiffValidation = {
      isSmallAndIsolated: true,
      testFirstPriority: false,
      verificationCommands: [],
      warnings: []
    };

    // Check total size
    const totalLines = group.reduce((sum, proposal) => {
      return sum + proposal.fixedContent.split("\n").length;
    }, 0);

    if (totalLines > this.config.maxLinesPerDiff) {
      validation.isSmallAndIsolated = false;
      validation.warnings.push(`Total lines (${totalLines}) exceeds maximum (${this.config.maxLinesPerDiff})`);
    }

    // Check number of files
    if (group.length > this.config.maxFilesPerDiff) {
      validation.isSmallAndIsolated = false;
      validation.warnings.push(`Number of files (${group.length}) exceeds maximum (${this.config.maxFilesPerDiff})`);
    }

    // Check for test-first priority
    const hasTestChanges = group.some(proposal => proposal.category === "test");
    validation.testFirstPriority = hasTestChanges;

    // Check hunk sizes
    for (const proposal of group) {
      const hunks = this.generateDiffHunks(proposal);
      for (const hunk of hunks) {
        if (hunk.lines.length > this.config.maxHunkSizeForIsolation) {
          validation.isSmallAndIsolated = false;
          validation.warnings.push(`Hunk in ${proposal.filePath} is too large (${hunk.lines.length} lines)`);
        }
      }
    }

    return validation;
  }

  /**
   * Generate verification commands for the diff
   */
  private generateVerificationCommands(
    group: FixProposal[],
    context: DiffGenerationContext
  ): string[] {
    const commands: string[] = [];

    // Add test commands
    commands.push(...this.config.verificationCommands.testCommands);

    // Add linting commands
    commands.push(...this.config.verificationCommands.lintCommands);

    // Add format commands
    commands.push(...this.config.verificationCommands.formatCommands);

    // Add type check commands
    commands.push(...this.config.verificationCommands.typeCheckCommands);

    // Add build commands if needed
    const hasSourceChanges = group.some(proposal => 
      !this.isTestFile(proposal.filePath, context.projectConfig)
    );
    if (hasSourceChanges) {
      commands.push(...this.config.verificationCommands.buildCommands);
    }

    return commands;
  }

  /**
   * Generate diff metadata
   */
  private generateDiffMetadata(
    group: FixProposal[],
    context: DiffGenerationContext
  ): DiffMetadata {
    const categories = [...new Set(group.map(p => p.category))];
    const priorities = [...new Set(group.map(p => p.priority))];

    return {
      timestamp: Date.now(),
      id: `diff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: this.generateDiffDescription(group),
      category: categories.length === 1 ? categories[0] : "fix",
      priority: this.getHighestPriority(priorities)
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private parseLocation(location: string): {
    filePath?: string;
    lineStart?: number;
    lineEnd?: number;
  } {
    const parts = location.split(":");
    const result: any = {};

    if (parts.length >= 1) {
      result.filePath = parts[0];
    }

    if (parts.length >= 2) {
      const lineNum = parseInt(parts[1], 10);
      if (!isNaN(lineNum)) {
        result.lineStart = lineNum;
        result.lineEnd = lineNum;
      }
    }

    return result;
  }

  private async getFileContent(
    filePath: string,
    context: DiffGenerationContext
  ): Promise<string | null> {
    if (context.fileContents?.has(filePath)) {
      return context.fileContents.get(filePath)!;
    }

    // In a real implementation, this would read from the file system
    // For now, return null to indicate content is not available
    return null;
  }

  private async generateFixedContent(
    evidence: EvidenceItem,
    originalContent: string,
    locationInfo: any
  ): Promise<string | null> {
    // This is a simplified implementation
    // In a real system, this would apply specific fixes based on evidence type
    
    const lines = originalContent.split("\n");
    const lineIndex = (locationInfo.lineStart || 1) - 1;

    if (lineIndex >= 0 && lineIndex < lines.length) {
      // Apply simple fix based on evidence type
      switch (evidence.type) {
        case "lint_violation":
          return this.applyLintFix(lines, lineIndex, evidence);
        case "format_issue":
          return this.applyFormatFix(lines, lineIndex, evidence);
        case "naming_violation":
          return this.applyNamingFix(lines, lineIndex, evidence);
        default:
          // Generic fix - add comment
          lines.splice(lineIndex, 0, `// TODO: ${evidence.suggestedFix}`);
          return lines.join("\n");
      }
    }

    return null;
  }

  private applyLintFix(lines: string[], lineIndex: number, evidence: EvidenceItem): string {
    // Simple lint fix examples
    if (evidence.description.includes("semicolon")) {
      lines[lineIndex] = lines[lineIndex].replace(/([^;])$/, "$1;");
    } else if (evidence.description.includes("quotes")) {
      lines[lineIndex] = lines[lineIndex].replace(/'/g, '"');
    }
    return lines.join("\n");
  }

  private applyFormatFix(lines: string[], lineIndex: number, evidence: EvidenceItem): string {
    // Simple format fix examples
    if (evidence.description.includes("indentation")) {
      lines[lineIndex] = "  " + lines[lineIndex].trim();
    } else if (evidence.description.includes("spacing")) {
      lines[lineIndex] = lines[lineIndex].replace(/\s+/g, " ");
    }
    return lines.join("\n");
  }

  private applyNamingFix(lines: string[], lineIndex: number, evidence: EvidenceItem): string {
    // Simple naming fix - convert to camelCase
    lines[lineIndex] = lines[lineIndex].replace(/[a-z]+_[a-z]+/g, (match) => {
      return match.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    });
    return lines.join("\n");
  }

  private categorizeChange(evidence: EvidenceItem): ChangeCategory {
    const categoryMap: Record<string, ChangeCategory> = {
      "test_failure": "test",
      "coverage_gap": "test",
      "security_vulnerability": "fix",
      "type_error": "fix",
      "lint_violation": "fix",
      "format_issue": "fix",
      "performance_issue": "improvement",
      "code_smell": "refactor",
      "documentation_gap": "documentation"
    };

    return categoryMap[evidence.type] || "fix";
  }

  private prioritizeChange(evidence: EvidenceItem): ChangePriority {
    const priorityMap: Record<string, ChangePriority> = {
      "Critical": "critical",
      "Major": "high",
      "Minor": "medium"
    };

    return priorityMap[evidence.severity] || "low";
  }

  private isTestFile(filePath: string, projectConfig?: ProjectConfig): boolean {
    if (!projectConfig?.testFilePatterns) {
      return filePath.includes("test") || filePath.includes("spec");
    }

    return projectConfig.testFilePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      return regex.test(filePath);
    });
  }

  private areFixesRelated(fix1: FixProposal, fix2: FixProposal): boolean {
    // Same file
    if (fix1.filePath === fix2.filePath) {
      return true;
    }

    // Same category and priority
    if (fix1.category === fix2.category && fix1.priority === fix2.priority) {
      return true;
    }

    // Related evidence types
    const relatedTypes = new Set([...fix1.relatedEvidence, ...fix2.relatedEvidence]);
    return relatedTypes.size < fix1.relatedEvidence.length + fix2.relatedEvidence.length;
  }

  private findChangedRegions(originalLines: string[], fixedLines: string[]): any[] {
    // Simplified change detection - in a real implementation, use proper diff algorithm
    const changes = [];
    
    const maxLength = Math.max(originalLines.length, fixedLines.length);
    let changeStart = -1;
    
    for (let i = 0; i < maxLength; i++) {
      const originalLine = originalLines[i] || "";
      const fixedLine = fixedLines[i] || "";
      
      if (originalLine !== fixedLine) {
        if (changeStart === -1) {
          changeStart = i;
        }
      } else if (changeStart !== -1) {
        changes.push({
          start: changeStart,
          end: i - 1,
          originalLines: originalLines.slice(changeStart, i),
          fixedLines: fixedLines.slice(changeStart, i)
        });
        changeStart = -1;
      }
    }
    
    if (changeStart !== -1) {
      changes.push({
        start: changeStart,
        end: maxLength - 1,
        originalLines: originalLines.slice(changeStart),
        fixedLines: fixedLines.slice(changeStart)
      });
    }
    
    return changes;
  }

  private createHunkFromChange(change: any, originalLines: string[], fixedLines: string[]): DiffHunk {
    const lines: DiffLine[] = [];
    
    // Add context lines before
    const contextBefore = 3;
    const startContext = Math.max(0, change.start - contextBefore);
    for (let i = startContext; i < change.start; i++) {
      lines.push({
        type: "context",
        content: originalLines[i] || "",
        oldLineNumber: i + 1,
        newLineNumber: i + 1
      });
    }
    
    // Add deleted lines
    for (let i = 0; i < change.originalLines.length; i++) {
      lines.push({
        type: "deletion",
        content: change.originalLines[i],
        oldLineNumber: change.start + i + 1
      });
    }
    
    // Add added lines
    for (let i = 0; i < change.fixedLines.length; i++) {
      lines.push({
        type: "addition",
        content: change.fixedLines[i],
        newLineNumber: change.start + i + 1
      });
    }
    
    // Add context lines after
    const contextAfter = 3;
    const endContext = Math.min(originalLines.length, change.end + contextAfter + 1);
    for (let i = change.end + 1; i < endContext; i++) {
      lines.push({
        type: "context",
        content: originalLines[i] || "",
        oldLineNumber: i + 1,
        newLineNumber: i + 1
      });
    }

    return {
      oldStart: startContext + 1,
      oldCount: change.end - startContext + 1,
      newStart: startContext + 1,
      newCount: change.end - startContext + 1 + (change.fixedLines.length - change.originalLines.length),
      lines
    };
  }

  private countAdditions(originalLines: string[], fixedLines: string[]): number {
    return Math.max(0, fixedLines.length - originalLines.length);
  }

  private countDeletions(originalLines: string[], fixedLines: string[]): number {
    return Math.max(0, originalLines.length - fixedLines.length);
  }

  private generateDiffDescription(group: FixProposal[]): string {
    if (group.length === 1) {
      return group[0].description;
    }

    const categories = [...new Set(group.map(p => p.category))];
    const fileCount = group.length;

    return `Apply ${categories.join(", ")} fixes to ${fileCount} file(s)`;
  }

  private getHighestPriority(priorities: ChangePriority[]): ChangePriority {
    const priorityOrder: ChangePriority[] = ["critical", "high", "medium", "low"];
    
    for (const priority of priorityOrder) {
      if (priorities.includes(priority)) {
        return priority;
      }
    }
    
    return "low";
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration for proposed diff generation
 */
export const DEFAULT_PROPOSED_DIFF_CONFIG: ProposedDiffConfig = {
  maxLinesPerDiff: 100,
  maxFilesPerDiff: 5,
  prioritizeTestFiles: true,
  maxHunkSizeForIsolation: 20,
  verificationCommands: {
    testCommands: ["npm test", "npm run test:unit"],
    lintCommands: ["npm run lint", "npx eslint ."],
    formatCommands: ["npm run format:check", "npx prettier --check ."],
    typeCheckCommands: ["npm run type-check", "npx tsc --noEmit"],
    buildCommands: ["npm run build", "npm run compile"]
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create proposed diff generator with default configuration
 */
export function createProposedDiffGenerator(
  config?: Partial<ProposedDiffConfig>
): ProposedDiffGenerator {
  return new ProposedDiffGenerator(config);
}

/**
 * Validate proposed diff structure
 */
export function validateProposedDiff(diff: ProposedDiff): string[] {
  const errors: string[] = [];

  if (!diff.metadata || !diff.metadata.id) {
    errors.push("Missing or invalid metadata");
  }

  if (!diff.unifiedDiff || typeof diff.unifiedDiff !== "string") {
    errors.push("Missing or invalid unified diff");
  }

  if (!Array.isArray(diff.fileChanges)) {
    errors.push("File changes must be an array");
  }

  if (!diff.validation) {
    errors.push("Missing validation information");
  }

  return errors;
}