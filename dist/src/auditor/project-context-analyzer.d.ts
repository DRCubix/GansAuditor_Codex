/**
 * Project Context Awareness Module
 *
 * This module implements project pattern detection from Steering documents,
 * convention extraction from existing codebase, project-specific feedback
 * adaptation, and technology stack detection as specified in requirement 8.2.
 *
 * Features:
 * - Project pattern detection from Steering documents
 * - Convention extraction from existing codebase
 * - Project-specific feedback adaptation
 * - Technology stack detection and optimization
 */
/**
 * Project context information
 */
export interface ProjectContext {
    /** Project type classification */
    projectType: ProjectType;
    /** Technology stack detected */
    techStack: TechnologyStack;
    /** Project patterns from Steering documents */
    patterns: ProjectPattern[];
    /** Code conventions extracted from codebase */
    conventions: CodeConvention[];
    /** Project configuration */
    configuration: ProjectConfiguration;
    /** Project metadata */
    metadata: ProjectMetadata;
}
/**
 * Project type classifications
 */
export type ProjectType = 'web-application' | 'api-service' | 'library' | 'cli-tool' | 'mobile-app' | 'desktop-app' | 'microservice' | 'monorepo' | 'unknown';
/**
 * Technology stack information
 */
export interface TechnologyStack {
    /** Primary programming language */
    primaryLanguage: string;
    /** Secondary languages */
    secondaryLanguages: string[];
    /** Frontend frameworks */
    frontendFrameworks: string[];
    /** Backend frameworks */
    backendFrameworks: string[];
    /** Databases */
    databases: string[];
    /** Testing frameworks */
    testingFrameworks: string[];
    /** Build tools */
    buildTools: string[];
    /** Package managers */
    packageManagers: string[];
    /** Deployment platforms */
    deploymentPlatforms: string[];
}
/**
 * Project pattern from Steering documents
 */
export interface ProjectPattern {
    /** Pattern identifier */
    id: string;
    /** Pattern name */
    name: string;
    /** Pattern description */
    description: string;
    /** Pattern category */
    category: PatternCategory;
    /** Pattern rules */
    rules: PatternRule[];
    /** Pattern examples */
    examples: string[];
    /** Pattern source file */
    sourceFile: string;
}
/**
 * Pattern categories
 */
export type PatternCategory = 'architecture' | 'naming' | 'testing' | 'security' | 'performance' | 'documentation' | 'deployment' | 'code-style';
/**
 * Pattern rule definition
 */
export interface PatternRule {
    /** Rule identifier */
    id: string;
    /** Rule description */
    description: string;
    /** Rule type */
    type: RuleType;
    /** Rule pattern (regex or glob) */
    pattern: string;
    /** Rule enforcement level */
    enforcement: EnforcementLevel;
    /** Rule examples */
    examples: RuleExample[];
}
/**
 * Rule types
 */
export type RuleType = 'must' | 'should' | 'may' | 'must-not' | 'should-not';
/**
 * Enforcement levels
 */
export type EnforcementLevel = 'error' | 'warning' | 'info';
/**
 * Rule example
 */
export interface RuleExample {
    /** Example description */
    description: string;
    /** Good example */
    good?: string;
    /** Bad example */
    bad?: string;
}
/**
 * Code convention extracted from codebase
 */
export interface CodeConvention {
    /** Convention identifier */
    id: string;
    /** Convention name */
    name: string;
    /** Convention category */
    category: ConventionCategory;
    /** Convention pattern */
    pattern: string;
    /** Convention confidence (0-1) */
    confidence: number;
    /** Supporting evidence */
    evidence: ConventionEvidence[];
    /** Convention description */
    description: string;
}
/**
 * Convention categories
 */
export type ConventionCategory = 'naming' | 'file-structure' | 'import-style' | 'function-style' | 'class-style' | 'variable-style' | 'comment-style' | 'error-handling';
/**
 * Convention evidence
 */
export interface ConventionEvidence {
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Code example */
    example: string;
    /** Match confidence */
    confidence: number;
}
/**
 * Project configuration
 */
export interface ProjectConfiguration {
    /** Package.json configuration */
    packageJson?: any;
    /** TypeScript configuration */
    tsConfig?: any;
    /** ESLint configuration */
    eslintConfig?: any;
    /** Prettier configuration */
    prettierConfig?: any;
    /** Jest configuration */
    jestConfig?: any;
    /** Vitest configuration */
    vitestConfig?: any;
    /** Webpack configuration */
    webpackConfig?: any;
    /** Vite configuration */
    viteConfig?: any;
}
/**
 * Project metadata
 */
export interface ProjectMetadata {
    /** Project name */
    name: string;
    /** Project version */
    version: string;
    /** Project description */
    description: string;
    /** Project size (lines of code) */
    size: ProjectSize;
    /** Team size estimate */
    teamSize: TeamSize;
    /** Project maturity */
    maturity: ProjectMaturity;
    /** Last modified date */
    lastModified: Date;
}
/**
 * Project size classifications
 */
export type ProjectSize = 'small' | 'medium' | 'large' | 'enterprise';
/**
 * Team size classifications
 */
export type TeamSize = 'solo' | 'small' | 'medium' | 'large';
/**
 * Project maturity levels
 */
export type ProjectMaturity = 'prototype' | 'development' | 'stable' | 'mature' | 'legacy';
/**
 * Project analysis configuration
 */
export interface ProjectAnalysisConfig {
    /** Root directory to analyze */
    rootDirectory: string;
    /** Steering documents directory */
    steeringDirectory: string;
    /** Include hidden files */
    includeHidden: boolean;
    /** Maximum files to analyze */
    maxFiles: number;
    /** File extensions to analyze */
    fileExtensions: string[];
    /** Directories to exclude */
    excludeDirectories: string[];
    /** Confidence threshold for conventions */
    confidenceThreshold: number;
}
export declare const DEFAULT_PROJECT_ANALYSIS_CONFIG: ProjectAnalysisConfig;
/**
 * Project context analyzer for detecting patterns and conventions
 */
export declare class ProjectContextAnalyzer {
    private config;
    constructor(config?: Partial<ProjectAnalysisConfig>);
    /**
     * Analyze project context comprehensively
     */
    analyzeProjectContext(): Promise<ProjectContext>;
    /**
     * Detect project type based on files and configuration
     */
    private detectProjectType;
    /**
     * Gather project type indicators
     */
    private gatherProjectTypeIndicators;
    /**
     * Detect technology stack
     */
    private detectTechnologyStack;
    /**
     * Extract project patterns from Steering documents
     */
    private extractProjectPatterns;
    /**
     * Extract code conventions from codebase
     */
    private extractCodeConventions;
    /**
     * Load project configuration files
     */
    private loadProjectConfiguration;
    /**
     * Analyze project metadata
     */
    private analyzeProjectMetadata;
    private hasFilePattern;
    private hasDependency;
    private detectPrimaryLanguage;
    private detectSecondaryLanguages;
    private detectFrontendFrameworks;
    private detectBackendFrameworks;
    private detectDatabases;
    private detectTestingFrameworks;
    private detectBuildTools;
    private detectPackageManagers;
    private detectDeploymentPlatforms;
    private parseSteeringDocument;
    private categorizePattern;
    private extractRulesFromDescription;
    private extractExamplesFromDescription;
    private getCodeFiles;
    private analyzeFileConventions;
    private analyzeNamingConventions;
    private analyzeImportStyle;
    private analyzeFunctionStyle;
    private consolidateConventions;
    private calculateProjectSize;
    private estimateTeamSize;
    private assessProjectMaturity;
    private getDefaultTechStack;
    private getDefaultMetadata;
}
/**
 * Create a project context analyzer with default configuration
 */
export declare function createProjectContextAnalyzer(config?: Partial<ProjectAnalysisConfig>): ProjectContextAnalyzer;
/**
 * Validate project context
 */
export declare function validateProjectContext(context: ProjectContext): boolean;
//# sourceMappingURL=project-context-analyzer.d.ts.map