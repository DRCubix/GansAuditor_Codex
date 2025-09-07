/**
 * Codex CLI availability validation
 *
 * This module provides comprehensive validation of Codex CLI availability,
 * version compatibility, and environment prerequisites for production use.
 *
 * Requirements: 1.3, 1.4, 4.1, 4.2, 4.3, 4.4
 */
/**
 * Result of Codex CLI validation
 */
export interface CodexValidationResult {
    isAvailable: boolean;
    version: string | null;
    executablePath: string | null;
    environmentIssues: string[];
    recommendations: string[];
}
/**
 * Codex CLI version information
 */
export interface CodexVersionInfo {
    version: string;
    major: number;
    minor: number;
    patch: number;
    isCompatible: boolean;
}
/**
 * Environment validation result
 */
export interface EnvironmentValidationResult {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
    pathResolution: {
        searchPaths: string[];
        foundPath: string | null;
        isExecutable: boolean;
    };
}
/**
 * Error thrown when Codex CLI validation fails
 */
export declare class CodexValidationError extends Error {
    readonly validationResult: CodexValidationResult;
    constructor(message: string, validationResult: CodexValidationResult);
}
/**
 * Comprehensive Codex CLI availability validator
 *
 * Requirements:
 * - 1.3: Version validation and compatibility checking
 * - 1.4: Executable path resolution and validation
 * - 4.1: Environment prerequisite validation
 * - 4.2: Installation guidance in error messages
 * - 4.3: Specific diagnostic information
 * - 4.4: Context about attempted operation and environment state
 */
export declare class CodexValidator {
    private readonly executableName;
    private readonly searchPaths;
    private readonly minVersion;
    private readonly timeout;
    constructor(options?: {
        executableName?: string;
        searchPaths?: string[];
        minVersion?: string;
        timeout?: number;
    });
    /**
     * Perform comprehensive Codex CLI validation
     * Requirement 1.3, 1.4: Comprehensive availability checking with version validation
     */
    validateCodexAvailability(): Promise<CodexValidationResult>;
    /**
     * Validate environment prerequisites
     * Requirement 4.1: Environment prerequisite validation
     */
    private validateEnvironment;
    /**
     * Resolve Codex CLI executable path
     * Requirement 1.4: Executable path resolution and validation
     */
    resolveExecutablePath(): Promise<string | null>;
    /**
     * Validate executable permissions
     */
    private validateExecutablePermissions;
    /**
     * Get Codex CLI version information
     * Requirement 1.3: Version validation and compatibility checking
     */
    getVersionInfo(executablePath: string): Promise<CodexVersionInfo | null>;
    /**
     * Test basic Codex CLI functionality
     */
    private testBasicFunctionality;
    /**
     * Validate search paths
     */
    private validateSearchPaths;
    /**
     * Generate installation guidance based on platform
     * Requirement 4.2: Installation guidance in error messages
     */
    private generateInstallationGuidance;
    /**
     * Get default search paths based on platform
     */
    private getDefaultSearchPaths;
    /**
     * Check if version is compatible with minimum required version
     */
    private isVersionCompatible;
    /**
     * Execute command with timeout support
     */
    private executeCommand;
}
/**
 * Create a CodexValidator with default configuration
 */
export declare function createCodexValidator(options?: {
    executableName?: string;
    searchPaths?: string[];
    minVersion?: string;
    timeout?: number;
}): CodexValidator;
/**
 * Quick validation function for simple availability checks
 */
export declare function validateCodexAvailability(options?: {
    executableName?: string;
    timeout?: number;
    minVersion?: string;
}): Promise<CodexValidationResult>;
//# sourceMappingURL=codex-validator.d.ts.map