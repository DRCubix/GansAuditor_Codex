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

import { promises as fs, constants as fsConstants } from 'fs';
import { resolve, join, dirname, basename } from 'path';
import { spawn } from 'child_process';
import { logger, createTimer } from '../utils/logger.js';
import { handleError } from '../utils/error-handler.js';
import { isGitRepo, getGitRepoInfo } from '../utils/git-utils.js';
import { pathExists } from '../utils/file-utils.js';
import type { GanAuditorError } from '../types/error-types.js';

// ============================================================================
// Environment Manager Configuration
// ============================================================================

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
 * Default environment manager configuration
 */
const DEFAULT_ENV_CONFIG: EnvironmentManagerConfig = {
  defaultWorkingDirectory: process.cwd(),
  preserveEnvironmentVars: [
    'PATH',
    'HOME',
    'USER',
    'SHELL',
    'TERM',
    'LANG',
    'LC_ALL',
    'NODE_ENV',
    'CODEX_CONFIG_DIR',
    'CODEX_API_KEY',
    'CODEX_MODEL',
    'CODEX_TIMEOUT',
  ],
  additionalEnvironmentVars: {},
  executableSearchPaths: [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/opt/homebrew/bin',
    process.env.HOME ? join(process.env.HOME, '.local/bin') : '',
    process.env.HOME ? join(process.env.HOME, 'bin') : '',
  ].filter(Boolean),
  defaultExecutableName: 'codex',
  enableWorkingDirectoryFallback: true,
  enableDebugLogging: process.env.NODE_ENV !== 'production' || process.env.CODEX_DEBUG === 'true',
};

// ============================================================================
// Environment Manager Types
// ============================================================================

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

// ============================================================================
// Environment Manager Implementation
// ============================================================================

/**
 * Environment Manager for Codex CLI execution
 * 
 * Handles working directory resolution, environment variable management,
 * and path validation for reliable Codex CLI execution across different environments.
 */
export class EnvironmentManager {
  private config: EnvironmentManagerConfig;

  constructor(config: Partial<EnvironmentManagerConfig> = {}) {
    this.config = { ...DEFAULT_ENV_CONFIG, ...config };
    
    if (this.config.enableDebugLogging) {
      logger.debug('EnvironmentManager initialized', {
        defaultWorkingDirectory: this.config.defaultWorkingDirectory,
        preserveVarsCount: this.config.preserveEnvironmentVars.length,
        searchPathsCount: this.config.executableSearchPaths.length,
      }, 'environment-manager');
    }
  }

  /**
   * Resolve working directory with repository root detection
   * Requirement 3.1: Working directory resolution with repository root detection
   */
  async resolveWorkingDirectory(providedPath?: string): Promise<WorkingDirectoryResult> {
    const timer = createTimer('resolve-working-directory', 'environment-manager');
    
    try {
      // If a path is explicitly provided, validate and use it
      if (providedPath) {
        const resolvedPath = resolve(providedPath);
        const exists = await pathExists(resolvedPath);
        
        if (exists) {
          const stats = await fs.stat(resolvedPath);
          if (stats.isDirectory()) {
            timer.end({ success: true, source: 'provided' });
            return {
              success: true,
              path: resolvedPath,
              source: 'provided',
            };
          }
        }
        
        // Provided path is invalid, log warning and continue with detection
        if (this.config.enableDebugLogging) {
          logger.warn('Provided working directory is invalid, falling back to detection', {
            providedPath,
            resolvedPath,
            exists,
          }, 'environment-manager');
        }
      }

      // Try to detect repository root
      const repoResult = await this.detectRepositoryRoot();
      if (repoResult.success && repoResult.path) {
        timer.end({ success: true, source: 'repository-root' });
        return {
          success: true,
          path: repoResult.path,
          source: 'repository-root',
          repositoryInfo: repoResult.repositoryInfo,
        };
      }

      // Fallback to current working directory
      if (this.config.enableWorkingDirectoryFallback) {
        const currentDir = process.cwd();
        const exists = await pathExists(currentDir);
        
        if (exists) {
          timer.end({ success: true, source: 'current-directory' });
          return {
            success: true,
            path: currentDir,
            source: 'current-directory',
          };
        }
      }

      // Final fallback to configured default
      const defaultDir = this.config.defaultWorkingDirectory;
      const exists = await pathExists(defaultDir);
      
      if (exists) {
        timer.end({ success: true, source: 'fallback' });
        return {
          success: true,
          path: defaultDir,
          source: 'fallback',
        };
      }

      // All options exhausted
      const error = new Error('Unable to resolve working directory: no valid directory found');
      timer.endWithError(error);
      return {
        success: false,
        source: 'fallback',
        error: {
          name: 'EnvironmentError',
          message: error.message,
        } as unknown as GanAuditorError,
      };
    } catch (error) {
      timer.endWithError(error as Error);
      return {
        success: false,
        source: 'fallback',
        error: {
          name: 'EnvironmentError',
          message: (error as Error).message,
        } as unknown as GanAuditorError,
      };
    }
  }

  /**
   * Prepare environment variables for Codex CLI execution
   * Requirement 3.2: Environment variable management for MCP compatibility
   * Requirement 3.5: MCP-specific environment handling
   */
  async prepareEnvironment(): Promise<EnvironmentResult> {
    const timer = createTimer('prepare-environment', 'environment-manager');
    
    try {
      const environment: Record<string, string> = {};
      const preservedVars: string[] = [];
      const addedVars: string[] = [];
      const missingVars: string[] = [];

      // Preserve specified environment variables
      for (const varName of this.config.preserveEnvironmentVars) {
        const value = process.env[varName];
        if (value !== undefined) {
          environment[varName] = value;
          preservedVars.push(varName);
        } else {
          missingVars.push(varName);
        }
      }

      // Add additional environment variables
      for (const [varName, value] of Object.entries(this.config.additionalEnvironmentVars)) {
        environment[varName] = value;
        addedVars.push(varName);
      }

      // Ensure critical MCP-specific environment variables
      await this.ensureMcpEnvironmentVars(environment, addedVars);

      // Validate critical environment variables
      const validationResult = this.validateEnvironment(environment);
      if (!validationResult.success) {
        timer.end({ success: false, reason: 'validation-failed' });
        return {
          success: false,
          preservedVars,
          addedVars,
          missingVars,
          error: validationResult.error,
        };
      }

      if (this.config.enableDebugLogging) {
        logger.debug('Environment prepared successfully', {
          preservedCount: preservedVars.length,
          addedCount: addedVars.length,
          missingCount: missingVars.length,
          totalVars: Object.keys(environment).length,
        }, 'environment-manager');
      }

      timer.end({ success: true });
      return {
        success: true,
        environment,
        preservedVars,
        addedVars,
        missingVars,
      };
    } catch (error) {
      timer.endWithError(error as Error);
      return {
        success: false,
        preservedVars: [],
        addedVars: [],
        missingVars: [],
        error: {
          name: 'EnvironmentError',
          message: (error as Error).message,
        } as unknown as GanAuditorError,
      };
    }
  }

  /**
   * Validate and resolve Codex CLI executable path
   * Requirement 3.3: Path resolution and validation for Codex CLI executable
   * Requirement 3.4: File permission and accessibility validation
   */
  async validateCodexPath(executableName?: string): Promise<CodexExecutableResult> {
    const timer = createTimer('validate-codex-path', 'environment-manager');
    const executable = executableName || this.config.defaultExecutableName;
    const searchedPaths: string[] = [];
    
    try {
      // First, try to find executable in PATH
      const pathResult = await this.findExecutableInPath(executable);
      if (pathResult.success && pathResult.path) {
        const validation = await this.validatePath(pathResult.path);
        if (validation.success && validation.isExecutable) {
          const version = await this.getCodexVersion(pathResult.path);
          timer.end({ success: true, source: 'path' });
          return {
            success: true,
            executablePath: pathResult.path,
            version,
            searchedPaths: pathResult.searchedPaths || [],
            isAccessible: true,
            isExecutable: true,
          };
        }
      }
      
      if (pathResult.searchedPaths) {
        searchedPaths.push(...pathResult.searchedPaths);
      }

      // Search in configured paths
      for (const searchPath of this.config.executableSearchPaths) {
        const fullPath = join(searchPath, executable);
        searchedPaths.push(fullPath);
        
        const validation = await this.validatePath(fullPath);
        if (validation.success && validation.isExecutable) {
          const version = await this.getCodexVersion(fullPath);
          timer.end({ success: true, source: 'search-paths' });
          return {
            success: true,
            executablePath: fullPath,
            version,
            searchedPaths,
            isAccessible: true,
            isExecutable: true,
          };
        }
      }

      // Executable not found
      const error = new Error(`Codex CLI executable '${executable}' not found in PATH or search paths`);
      timer.endWithError(error);
      return {
        success: false,
        searchedPaths,
        isAccessible: false,
        isExecutable: false,
        error: {
          name: 'CodexNotFoundError',
          message: error.message,
        } as unknown as GanAuditorError,
      };
    } catch (error) {
      timer.endWithError(error as Error);
      return {
        success: false,
        searchedPaths,
        isAccessible: false,
        isExecutable: false,
        error: {
          name: 'EnvironmentError',
          message: (error as Error).message,
        } as unknown as GanAuditorError,
      };
    }
  }

  /**
   * Validate path accessibility and permissions
   * Requirement 3.4: File permission and accessibility validation
   */
  async validatePath(filePath: string): Promise<PathValidationResult> {
    const timer = createTimer(`validate-path-${basename(filePath)}`, 'environment-manager');
    
    try {
      const resolvedPath = resolve(filePath);
      
      // Check if path exists
      const exists = await pathExists(resolvedPath);
      if (!exists) {
        timer.end({ success: false, reason: 'not-found' });
        return {
          success: false,
          path: resolvedPath,
          exists: false,
          isAccessible: false,
          isExecutable: false,
        };
      }

      // Check permissions
      const permissions = await this.checkPermissions(resolvedPath);
      const isAccessible = permissions.readable;
      const isExecutable = permissions.executable;

      const success = exists && isAccessible;
      
      timer.end({ 
        success, 
        accessible: isAccessible, 
        executable: isExecutable 
      });
      
      return {
        success,
        path: resolvedPath,
        exists: true,
        isAccessible,
        isExecutable,
        permissions,
      };
    } catch (error) {
      timer.endWithError(error as Error);
      return {
        success: false,
        path: filePath,
        exists: false,
        isAccessible: false,
        isExecutable: false,
        error: {
          name: 'PathValidationError',
          message: (error as Error).message,
        } as unknown as GanAuditorError,
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Detect repository root directory
   */
  private async detectRepositoryRoot(startPath?: string): Promise<{
    success: boolean;
    path?: string;
    repositoryInfo?: any;
    error?: GanAuditorError;
  }> {
    try {
      const searchPath = startPath || process.cwd();
      
      // Check if current directory is a git repository using git utils
      const isRepo = await isGitRepo(searchPath);
      if (isRepo) {
        const repoInfo = await getGitRepoInfo(searchPath);
        if (repoInfo.isGitRepo && repoInfo.rootPath) {
          return {
            success: true,
            path: repoInfo.rootPath,
            repositoryInfo: {
              isGitRepo: true,
              rootPath: repoInfo.rootPath,
              currentBranch: repoInfo.currentBranch,
            },
          };
        }
      }

      // If git utils didn't find a repo, try manual detection by walking up the directory tree
      let currentPath = resolve(searchPath);
      const maxDepth = 10; // Prevent infinite loops
      let depth = 0;

      while (depth < maxDepth) {
        const gitDir = join(currentPath, '.git');
        const gitExists = await pathExists(gitDir);
        
        if (gitExists) {
          return {
            success: true,
            path: currentPath,
            repositoryInfo: {
              isGitRepo: true,
              rootPath: currentPath,
            },
          };
        }

        const parentPath = dirname(currentPath);
        if (parentPath === currentPath) {
          // Reached filesystem root
          break;
        }
        
        currentPath = parentPath;
        depth++;
      }

      // No repository found
      return {
        success: false,
        error: {
          name: 'RepositoryNotFoundError',
          message: 'No git repository found in directory tree',
        } as unknown as GanAuditorError,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'EnvironmentError',
          message: (error as Error).message,
        } as unknown as GanAuditorError,
      };
    }
  }

  /**
   * Find executable in PATH environment variable
   */
  private async findExecutableInPath(executable: string): Promise<{
    success: boolean;
    path?: string;
    searchedPaths?: string[];
  }> {
    try {
      const pathEnv = process.env.PATH || '';
      const pathSeparator = process.platform === 'win32' ? ';' : ':';
      const paths = pathEnv.split(pathSeparator).filter(Boolean);
      const searchedPaths: string[] = [];

      for (const pathDir of paths) {
        const fullPath = join(pathDir, executable);
        searchedPaths.push(fullPath);
        
        const exists = await pathExists(fullPath);
        if (exists) {
          const validation = await this.validatePath(fullPath);
          if (validation.success && validation.isExecutable) {
            return {
              success: true,
              path: fullPath,
              searchedPaths,
            };
          }
        }
      }

      return {
        success: false,
        searchedPaths,
      };
    } catch (error) {
      return {
        success: false,
        searchedPaths: [],
      };
    }
  }

  /**
   * Check file permissions
   */
  private async checkPermissions(filePath: string): Promise<{
    readable: boolean;
    writable: boolean;
    executable: boolean;
  }> {
    const permissions = {
      readable: false,
      writable: false,
      executable: false,
    };

    // Check readable
    try {
      await fs.access(filePath, fsConstants.R_OK);
      permissions.readable = true;
    } catch {
      // Not readable
    }

    // Check writable
    try {
      await fs.access(filePath, fsConstants.W_OK);
      permissions.writable = true;
    } catch {
      // Not writable
    }

    // Check executable
    try {
      await fs.access(filePath, fsConstants.X_OK);
      permissions.executable = true;
    } catch {
      // Not executable
    }

    return permissions;
  }

  /**
   * Get Codex CLI version
   */
  private async getCodexVersion(executablePath: string): Promise<string | undefined> {
    try {
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const child = spawn(executablePath, ['--version'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 5000,
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Version check failed with code ${code}`));
          }
        });

        child.on('error', reject);
      });

      return result.stdout.trim() || result.stderr.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Ensure MCP-specific environment variables are set
   */
  private async ensureMcpEnvironmentVars(
    environment: Record<string, string>,
    addedVars: string[]
  ): Promise<void> {
    // Set CODEX_CONFIG_DIR if not already set
    if (!environment.CODEX_CONFIG_DIR && process.env.HOME) {
      environment.CODEX_CONFIG_DIR = join(process.env.HOME, '.codex');
      addedVars.push('CODEX_CONFIG_DIR');
    }

    // Ensure PATH includes common binary locations
    if (environment.PATH) {
      const pathSeparator = process.platform === 'win32' ? ';' : ':';
      const currentPaths = environment.PATH.split(pathSeparator);
      const additionalPaths = this.config.executableSearchPaths.filter(
        path => !currentPaths.includes(path)
      );
      
      if (additionalPaths.length > 0) {
        environment.PATH = [...currentPaths, ...additionalPaths].join(pathSeparator);
      }
    }

    // Set NODE_ENV if not set (important for MCP environment detection)
    if (!environment.NODE_ENV) {
      environment.NODE_ENV = 'production';
      addedVars.push('NODE_ENV');
    }
  }

  /**
   * Validate prepared environment
   */
  private validateEnvironment(environment: Record<string, string>): {
    success: boolean;
    error?: GanAuditorError;
  } {
    const criticalVars = ['PATH'];
    const missingCritical: string[] = [];

    for (const varName of criticalVars) {
      if (!environment[varName]) {
        missingCritical.push(varName);
      }
    }

    if (missingCritical.length > 0) {
      return {
        success: false,
        error: {
          name: 'EnvironmentValidationError',
          message: `Missing critical environment variables: ${missingCritical.join(', ')}`,
        } as unknown as GanAuditorError,
      };
    }

    return { success: true };
  }
}

// ============================================================================
// Factory Functions and Exports
// ============================================================================

/**
 * Create a new EnvironmentManager instance
 */
export function createEnvironmentManager(config?: Partial<EnvironmentManagerConfig>): EnvironmentManager {
  return new EnvironmentManager(config);
}

/**
 * Default EnvironmentManager instance
 */
export const defaultEnvironmentManager = new EnvironmentManager();

/**
 * Environment Manager Error Classes
 */
export class EnvironmentManagerError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'EnvironmentManagerError';
  }
}

export class CodexNotFoundError extends EnvironmentManagerError {
  constructor(message: string = 'Codex CLI executable not found') {
    super(message, 'CODEX_NOT_FOUND');
    this.name = 'CodexNotFoundError';
  }
}

export class WorkingDirectoryError extends EnvironmentManagerError {
  constructor(message: string = 'Unable to resolve working directory') {
    super(message, 'WORKING_DIRECTORY_ERROR');
    this.name = 'WorkingDirectoryError';
  }
}

export class PathValidationError extends EnvironmentManagerError {
  constructor(message: string = 'Path validation failed') {
    super(message, 'PATH_VALIDATION_ERROR');
    this.name = 'PathValidationError';
  }
}