/**
 * Reproduction and Verification Guide Generator for GAN Auditor System Prompt
 *
 * This module implements reproduction and verification guide generation with exact command
 * generation for issue reproduction, fix verification steps, test execution commands,
 * and lint/format/type-check integration as specified in requirement 5.4.
 *
 * Requirements addressed:
 * - 5.4: Reproduction and verification guide generation
 * - Implement exact command generation for issue reproduction
 * - Add fix verification step creation
 * - Create test execution command generation
 * - Add lint/format/type-check command integration
 */
import type { ReproductionGuide } from '../../types/feedback-types.js';
import type { EvidenceItem, WorkflowStepResult } from '../workflow-types.js';
import type { ProposedDiff } from '../../types/feedback-types.js';
/**
 * Configuration for reproduction guide generation
 */
export interface ReproductionGuideConfig {
    /** Maximum number of reproduction steps */
    maxReproductionSteps: number;
    /** Maximum number of verification steps */
    maxVerificationSteps: number;
    /** Include environment setup steps */
    includeEnvironmentSetup: boolean;
    /** Command execution timeout (seconds) */
    commandTimeout: number;
    /** Project-specific command templates */
    commandTemplates: CommandTemplateConfig;
}
/**
 * Command template configuration
 */
export interface CommandTemplateConfig {
    /** Package manager commands */
    packageManager: {
        install: string;
        test: string;
        build: string;
        lint: string;
        format: string;
    };
    /** Test execution commands */
    testExecution: {
        unit: string[];
        integration: string[];
        e2e: string[];
        all: string[];
    };
    /** Validation commands */
    validation: {
        lint: string[];
        format: string[];
        typeCheck: string[];
        security: string[];
    };
    /** Build and deployment commands */
    buildDeploy: {
        build: string[];
        start: string[];
        dev: string[];
    };
}
/**
 * Context for reproduction guide generation
 */
export interface ReproductionGuideContext {
    /** Evidence items to reproduce */
    evidenceItems: EvidenceItem[];
    /** Workflow step results */
    workflowResults: WorkflowStepResult[];
    /** Proposed diffs (if any) */
    proposedDiffs?: ProposedDiff[];
    /** Repository information */
    repositoryInfo: RepositoryInfo;
    /** Project configuration */
    projectConfig?: ProjectConfiguration;
    /** Session information */
    sessionId?: string;
}
/**
 * Repository information
 */
export interface RepositoryInfo {
    /** Repository root path */
    rootPath: string;
    /** Git branch */
    branch?: string;
    /** Git commit hash */
    commitHash?: string;
    /** Package manager type */
    packageManager: "npm" | "yarn" | "pnpm";
    /** Node.js version */
    nodeVersion?: string;
}
/**
 * Project configuration
 */
export interface ProjectConfiguration {
    /** Test framework */
    testFramework?: "jest" | "vitest" | "mocha" | "ava";
    /** Linter configuration */
    linter?: "eslint" | "tslint" | "biome";
    /** Formatter configuration */
    formatter?: "prettier" | "biome";
    /** TypeScript configuration */
    typescript?: boolean;
    /** Build system */
    buildSystem?: "webpack" | "vite" | "rollup" | "esbuild";
}
/**
 * Generates comprehensive reproduction and verification guides
 */
export declare class ReproductionGuideGenerator {
    private config;
    constructor(config?: Partial<ReproductionGuideConfig>);
    /**
     * Generate reproduction and verification guide
     */
    generateReproductionGuide(context: ReproductionGuideContext): Promise<ReproductionGuide>;
    /**
     * Generate reproduction steps for issues
     */
    private generateReproductionSteps;
    /**
     * Generate environment setup steps
     */
    private generateEnvironmentSetupSteps;
    /**
     * Generate repository setup steps
     */
    private generateRepositorySetupSteps;
    /**
     * Generate issue-specific reproduction steps
     */
    private generateIssueReproductionSteps;
    /**
     * Generate verification steps for fixes
     */
    private generateVerificationSteps;
    /**
     * Generate diff verification steps
     */
    private generateDiffVerificationSteps;
    /**
     * Generate general verification steps
     */
    private generateGeneralVerificationSteps;
    /**
     * Generate test commands
     */
    private generateTestCommands;
    /**
     * Generate validation commands
     */
    private generateValidationCommands;
    /**
     * Generate metadata for the reproduction guide
     */
    private generateMetadata;
    private generateTestFailureReproduction;
    private generateLintViolationReproduction;
    private generateFormatIssueReproduction;
    private generateTypeErrorReproduction;
    private generateSecurityVulnerabilityReproduction;
    private generatePerformanceIssueReproduction;
    private generateGenericReproduction;
    private extractFileFromLocation;
    private getLintConfigFile;
    private getFormatConfigFile;
    private generateTargetDescription;
}
/**
 * Default configuration for reproduction guide generation
 */
export declare const DEFAULT_REPRODUCTION_GUIDE_CONFIG: ReproductionGuideConfig;
/**
 * Create reproduction guide generator with default configuration
 */
export declare function createReproductionGuideGenerator(config?: Partial<ReproductionGuideConfig>): ReproductionGuideGenerator;
/**
 * Validate reproduction guide structure
 */
export declare function validateReproductionGuide(guide: ReproductionGuide): string[];
//# sourceMappingURL=reproduction-guide-generator.d.ts.map