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
import type { ProposedDiff, ChangeCategory, ChangePriority } from '../../types/feedback-types.js';
import type { EvidenceItem } from '../workflow-types.js';
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
/**
 * Generates proposed diffs for specific fixes with validation and prioritization
 */
export declare class ProposedDiffGenerator {
    private config;
    constructor(config?: Partial<ProposedDiffConfig>);
    /**
     * Generate proposed diffs from evidence items and fix suggestions
     */
    generateProposedDiffs(context: DiffGenerationContext): Promise<ProposedDiff[]>;
    /**
     * Extract fix proposals from evidence items
     */
    private extractFixProposals;
    /**
     * Prioritize fix proposals with test-first approach
     */
    private prioritizeFixProposals;
    /**
     * Group related fixes that can be combined into single diffs
     */
    private groupRelatedFixes;
    /**
     * Generate diff for a group of related fixes
     */
    private generateDiffForGroup;
    /**
     * Generate unified diff format
     */
    private generateUnifiedDiff;
    /**
     * Generate diff hunks for a proposal
     */
    private generateDiffHunks;
    /**
     * Generate file changes summary
     */
    private generateFileChanges;
    /**
     * Validate that changes are small and isolated
     */
    private validateChanges;
    /**
     * Generate verification commands for the diff
     */
    private generateVerificationCommands;
    /**
     * Generate diff metadata
     */
    private generateDiffMetadata;
    private parseLocation;
    private getFileContent;
    private generateFixedContent;
    private applyLintFix;
    private applyFormatFix;
    private applyNamingFix;
    private categorizeChange;
    private prioritizeChange;
    private isTestFile;
    private areFixesRelated;
    private findChangedRegions;
    private createHunkFromChange;
    private countAdditions;
    private countDeletions;
    private generateDiffDescription;
    private getHighestPriority;
}
/**
 * Default configuration for proposed diff generation
 */
export declare const DEFAULT_PROPOSED_DIFF_CONFIG: ProposedDiffConfig;
/**
 * Create proposed diff generator with default configuration
 */
export declare function createProposedDiffGenerator(config?: Partial<ProposedDiffConfig>): ProposedDiffGenerator;
/**
 * Validate proposed diff structure
 */
export declare function validateProposedDiff(diff: ProposedDiff): string[];
//# sourceMappingURL=proposed-diff-generator.d.ts.map