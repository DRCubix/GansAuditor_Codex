/**
 * Environment Manager for Codex CLI Integration
 *
 * This module provides comprehensive environment management for Codex CLI execution,
 * including working directory resolution, environment variable handling, and path validation.
 *
 * Requirements addressed:
 * - 3.1: Working directory resolution with repository root detection
 * - 3.2: Environment variable management for MCP compatibility
 * - 3.3: Path resolution and validation for Codex CLI executable
 * - 3.4: File permission and accessibility validation
 * - 3.5: MCP-specific environment handling
 */
import type { GanAuditorError } from '../types/error-types.js';
/**
 * Configuration for environment management
 */
export interface EnvironmentManagerConfig {
    /** Default working directory if none can be determined */
    defaultWorkingDirectory: string;
    /** Environment variables to preserve for Codex CLI */
    preserveEnvironmentVars: string[];
    /** Additional environment variables to set */
    additionalEnvironmentVars: Record<string, string>;
    /** Paths to search for Codex CLI executable */
    executableSearchPaths: string[];
    /** Default Codex CLI executable name */
    defaultExecutableName: string;
    /** Enable fallback to current working directory */
    enableWorkingDirectoryFallback: boolean;
    /** Enable debug logging */
    enableDebugLogging: boolean;
}
/**
 * Working directory resolution result
 */
export interface WorkingDirectoryResult {
    success: boolean;
    path?: string;
    source: 'repository-root' | 'current-directory' | 'fallback' | 'provided';
    repositoryInfo?: {
        isGitRepo: boolean;
        rootPath?: string;
        currentBranch?: string;
    };
    error?: GanAuditorError;
}
/**
 * Environment preparation result
 */
export interface EnvironmentResult {
    success: boolean;
    environment?: Record<string, string>;
    preservedVars: string[];
    addedVars: string[];
    missingVars: string[];
    error?: GanAuditorError;
}
/**
 * Codex executable validation result
 */
export interface CodexExecutableResult {
    success: boolean;
    executablePath?: string;
    version?: string;
    searchedPaths: string[];
    isAccessible: boolean;
    isExecutable: boolean;
    error?: GanAuditorError;
}
/**
 * Path validation result
 */
export interface PathValidationResult {
    success: boolean;
    path?: string;
    exists: boolean;
    isAccessible: boolean;
    isExecutable: boolean;
    permissions?: {
        readable: boolean;
        writable: boolean;
        executable: boolean;
    };
    error?: GanAuditorError;
}
/**
 * Environment Manager for Codex CLI execution
 *
 * Handles working directory resolution, environment variable management,
 * and path validation for reliable Codex CLI execution across different environments.
 */
export declare class EnvironmentManager {
    private config;
    constructor(config?: Partial<EnvironmentManagerConfig>);
    /**
     * Resolve working directory with repository root detection
     * Requirement 3.1: Working directory resolution with repository root detection
     */
    resolveWorkingDirectory(providedPath?: string): Promise<WorkingDirectoryResult>;
    /**
     * Prepare environment variables for Codex CLI execution
     * Requirement 3.2: Environment variable management for MCP compatibility
     * Requirement 3.5: MCP-specific environment handling
     */
    prepareEnvironment(): Promise<EnvironmentResult>;
    /**
     * Validate and resolve Codex CLI executable path
     * Requirement 3.3: Path resolution and validation for Codex CLI executable
     * Requirement 3.4: File permission and accessibility validation
     */
    validateCodexPath(executableName?: string): Promise<CodexExecutableResult>;
    /**
     * Validate path accessibility and permissions
     * Requirement 3.4: File permission and accessibility validation
     */
    validatePath(filePath: string): Promise<PathValidationResult>;
    /**
     * Detect repository root directory
     */
    private detectRepositoryRoot;
    /**
     * Find executable in PATH environment variable
     */
    private findExecutableInPath;
    /**
     * Check file permissions
     */
    private checkPermissions;
    /**
     * Get Codex CLI version
     */
    private getCodexVersion;
    /**
     * Ensure MCP-specific environment variables are set
     */
    private ensureMcpEnvironmentVars;
    /**
     * Validate prepared environment
     */
    private validateEnvironment;
}
/**
 * Create a new EnvironmentManager instance
 */
export declare function createEnvironmentManager(config?: Partial<EnvironmentManagerConfig>): EnvironmentManager;
/**
 * Default EnvironmentManager instance
 */
export declare const defaultEnvironmentManager: EnvironmentManager;
/**
 * Environment Manager Error Classes
 */
export declare class EnvironmentManagerError extends Error {
    readonly code?: string | undefined;
    constructor(message: string, code?: string | undefined);
}
export declare class CodexNotFoundError extends EnvironmentManagerError {
    constructor(message?: string);
}
export declare class WorkingDirectoryError extends EnvironmentManagerError {
    constructor(message?: string);
}
export declare class PathValidationError extends EnvironmentManagerError {
    constructor(message?: string);
}
//# sourceMappingURL=environment-manager.d.ts.map