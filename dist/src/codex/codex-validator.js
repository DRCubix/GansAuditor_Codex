/**
 * Codex CLI availability validation
 *
 * This module provides comprehensive validation of Codex CLI availability,
 * version compatibility, and environment prerequisites for production use.
 *
 * Requirements: 1.3, 1.4, 4.1, 4.2, 4.3, 4.4
 */
import { spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import { resolve } from 'path';
/**
 * Error thrown when Codex CLI validation fails
 */
export class CodexValidationError extends Error {
    validationResult;
    constructor(message, validationResult) {
        super(message);
        this.validationResult = validationResult;
        this.name = 'CodexValidationError';
    }
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
export class CodexValidator {
    executableName;
    searchPaths;
    minVersion;
    timeout;
    constructor(options = {}) {
        this.executableName = options.executableName || 'codex';
        this.searchPaths = options.searchPaths || this.getDefaultSearchPaths();
        this.minVersion = options.minVersion || '0.29.0';
        this.timeout = options.timeout || 5000;
    }
    /**
     * Perform comprehensive Codex CLI validation
     * Requirement 1.3, 1.4: Comprehensive availability checking with version validation
     */
    async validateCodexAvailability() {
        const result = {
            isAvailable: false,
            version: null,
            executablePath: null,
            environmentIssues: [],
            recommendations: [],
        };
        try {
            // Step 1: Validate environment prerequisites
            const envValidation = await this.validateEnvironment();
            result.environmentIssues.push(...envValidation.issues);
            result.recommendations.push(...envValidation.recommendations);
            if (!envValidation.isValid) {
                return result;
            }
            // Step 2: Resolve executable path
            const executablePath = await this.resolveExecutablePath();
            if (!executablePath) {
                result.environmentIssues.push('Codex CLI executable not found in PATH or specified locations');
                result.recommendations.push(...this.generateInstallationGuidance());
                return result;
            }
            result.executablePath = executablePath;
            // Step 3: Validate executable permissions
            const isExecutable = await this.validateExecutablePermissions(executablePath);
            if (!isExecutable) {
                result.environmentIssues.push(`Codex CLI found at ${executablePath} but is not executable`);
                result.recommendations.push(`Make the file executable: chmod +x ${executablePath}`);
                return result;
            }
            // Step 4: Get and validate version
            const versionInfo = await this.getVersionInfo(executablePath);
            if (!versionInfo) {
                result.environmentIssues.push('Unable to determine Codex CLI version');
                result.recommendations.push('Ensure Codex CLI is properly installed and supports --version flag');
                return result;
            }
            result.version = versionInfo.version;
            // Step 5: Check version compatibility
            if (!versionInfo.isCompatible) {
                result.environmentIssues.push(`Codex CLI version ${versionInfo.version} is not compatible (minimum required: ${this.minVersion})`);
                result.recommendations.push(`Upgrade Codex CLI to version ${this.minVersion} or higher`);
                return result;
            }
            // Step 6: Perform basic functionality test
            const functionalityTest = await this.testBasicFunctionality(executablePath);
            if (!functionalityTest.success) {
                result.environmentIssues.push(`Codex CLI functionality test failed: ${functionalityTest.error}`);
                result.recommendations.push('Verify Codex CLI installation and configuration');
                return result;
            }
            // All validations passed
            result.isAvailable = true;
            result.recommendations.push('Codex CLI is properly configured and ready for use');
        }
        catch (error) {
            result.environmentIssues.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
            result.recommendations.push('Check Codex CLI installation and system configuration');
        }
        return result;
    }
    /**
     * Validate environment prerequisites
     * Requirement 4.1: Environment prerequisite validation
     */
    async validateEnvironment() {
        const result = {
            isValid: true,
            issues: [],
            recommendations: [],
            pathResolution: {
                searchPaths: this.searchPaths,
                foundPath: null,
                isExecutable: false,
            },
        };
        // Check if PATH environment variable exists
        if (!process.env.PATH) {
            result.isValid = false;
            result.issues.push('PATH environment variable is not set');
            result.recommendations.push('Set PATH environment variable to include system executables');
            return result;
        }
        // Check if we have necessary permissions to execute commands
        try {
            await this.executeCommand('echo', ['test'], { timeout: 1000 });
        }
        catch (error) {
            result.isValid = false;
            result.issues.push('Unable to execute system commands');
            result.recommendations.push('Check system permissions and shell configuration');
            return result;
        }
        // Validate search paths
        const pathValidation = await this.validateSearchPaths();
        result.pathResolution = pathValidation;
        if (!pathValidation.foundPath) {
            result.issues.push('Codex CLI not found in any search paths');
            result.recommendations.push(...this.generateInstallationGuidance());
        }
        return result;
    }
    /**
     * Resolve Codex CLI executable path
     * Requirement 1.4: Executable path resolution and validation
     */
    async resolveExecutablePath() {
        // First, try to find in PATH
        try {
            const result = await this.executeCommand('which', [this.executableName], { timeout: 2000 });
            if (result.exitCode === 0 && result.stdout.trim()) {
                const path = result.stdout.trim();
                if (await this.validateExecutablePermissions(path)) {
                    return path;
                }
            }
        }
        catch {
            // which command failed, continue with manual search
        }
        // Try whereis command as fallback
        try {
            const result = await this.executeCommand('whereis', [this.executableName], { timeout: 2000 });
            if (result.exitCode === 0 && result.stdout.trim()) {
                const paths = result.stdout.split(' ').slice(1); // Remove the command name
                for (const path of paths) {
                    if (path.trim() && await this.validateExecutablePermissions(path.trim())) {
                        return path.trim();
                    }
                }
            }
        }
        catch {
            // whereis command failed, continue with manual search
        }
        // Manual search in common paths
        const searchPaths = [
            ...this.searchPaths,
            '/usr/local/bin',
            '/usr/bin',
            '/bin',
            '/opt/bin',
            `${process.env.HOME}/.local/bin`,
            `${process.env.HOME}/bin`,
        ];
        for (const searchPath of searchPaths) {
            try {
                const fullPath = resolve(searchPath, this.executableName);
                if (await this.validateExecutablePermissions(fullPath)) {
                    return fullPath;
                }
            }
            catch {
                // Path doesn't exist or not accessible, continue
            }
        }
        return null;
    }
    /**
     * Validate executable permissions
     */
    async validateExecutablePermissions(path) {
        try {
            await access(path, constants.F_OK | constants.X_OK);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get Codex CLI version information
     * Requirement 1.3: Version validation and compatibility checking
     */
    async getVersionInfo(executablePath) {
        try {
            const result = await this.executeCommand(executablePath, ['--version'], { timeout: this.timeout });
            if (result.exitCode !== 0) {
                return null;
            }
            const versionOutput = result.stdout.trim();
            const versionMatch = versionOutput.match(/(\d+)\.(\d+)\.(\d+)/);
            if (!versionMatch) {
                return null;
            }
            const [, majorStr, minorStr, patchStr] = versionMatch;
            const major = parseInt(majorStr, 10);
            const minor = parseInt(minorStr, 10);
            const patch = parseInt(patchStr, 10);
            const version = `${major}.${minor}.${patch}`;
            // Check compatibility with minimum version
            const isCompatible = this.isVersionCompatible(version, this.minVersion);
            return {
                version,
                major,
                minor,
                patch,
                isCompatible,
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Test basic Codex CLI functionality
     */
    async testBasicFunctionality(executablePath) {
        try {
            // Test help command to ensure basic functionality
            const result = await this.executeCommand(executablePath, ['-h'], { timeout: this.timeout });
            if (result.exitCode === 0) {
                return { success: true };
            }
            else {
                return { success: false, error: `Help command failed with exit code ${result.exitCode}` };
            }
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    /**
     * Validate search paths
     */
    async validateSearchPaths() {
        const result = {
            searchPaths: this.searchPaths,
            foundPath: null,
            isExecutable: false,
        };
        for (const searchPath of this.searchPaths) {
            try {
                const fullPath = resolve(searchPath, this.executableName);
                if (await this.validateExecutablePermissions(fullPath)) {
                    result.foundPath = fullPath;
                    result.isExecutable = true;
                    break;
                }
            }
            catch {
                // Continue searching
            }
        }
        return result;
    }
    /**
     * Generate installation guidance based on platform
     * Requirement 4.2: Installation guidance in error messages
     */
    generateInstallationGuidance() {
        const platform = process.platform;
        const guidance = [];
        guidance.push('Codex CLI is not installed or not found in PATH');
        guidance.push('');
        guidance.push('Installation instructions:');
        switch (platform) {
            case 'darwin':
                guidance.push('  macOS:');
                guidance.push('    - Install via Homebrew: brew install codex');
                guidance.push('    - Or download from: https://github.com/codex/codex/releases');
                guidance.push('    - Add to PATH: export PATH="/usr/local/bin:$PATH"');
                break;
            case 'linux':
                guidance.push('  Linux:');
                guidance.push('    - Ubuntu/Debian: apt-get install codex');
                guidance.push('    - CentOS/RHEL: yum install codex');
                guidance.push('    - Or download from: https://github.com/codex/codex/releases');
                guidance.push('    - Add to PATH: export PATH="/usr/local/bin:$PATH"');
                break;
            case 'win32':
                guidance.push('  Windows:');
                guidance.push('    - Download from: https://github.com/codex/codex/releases');
                guidance.push('    - Add to PATH via System Properties > Environment Variables');
                guidance.push('    - Or use Windows Package Manager: winget install codex');
                break;
            default:
                guidance.push('  Generic:');
                guidance.push('    - Download from: https://github.com/codex/codex/releases');
                guidance.push('    - Extract and add to PATH environment variable');
                break;
        }
        guidance.push('');
        guidance.push('After installation, verify with: codex --version');
        return guidance;
    }
    /**
     * Get default search paths based on platform
     */
    getDefaultSearchPaths() {
        const paths = (process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':');
        // Add common installation paths
        const commonPaths = [
            '/usr/local/bin',
            '/usr/bin',
            '/bin',
            '/opt/bin',
        ];
        if (process.env.HOME) {
            commonPaths.push(`${process.env.HOME}/.local/bin`, `${process.env.HOME}/bin`);
        }
        return [...new Set([...paths, ...commonPaths])].filter(Boolean);
    }
    /**
     * Check if version is compatible with minimum required version
     */
    isVersionCompatible(version, minVersion) {
        const parseVersion = (v) => {
            const parts = v.split('.').map(n => parseInt(n, 10));
            return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
        };
        const current = parseVersion(version);
        const minimum = parseVersion(minVersion);
        if (current.major > minimum.major)
            return true;
        if (current.major < minimum.major)
            return false;
        if (current.minor > minimum.minor)
            return true;
        if (current.minor < minimum.minor)
            return false;
        return current.patch >= minimum.patch;
    }
    /**
     * Execute command with timeout support
     */
    executeCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const { timeout = this.timeout } = options;
            const child = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: process.env,
            });
            let stdout = '';
            let stderr = '';
            let timeoutId = null;
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!child.killed) {
                            child.kill('SIGKILL');
                        }
                    }, 1000);
                    reject(new Error(`Command timed out after ${timeout}ms`));
                }, timeout);
            }
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }
            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }
            child.on('close', (code) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                resolve({
                    stdout,
                    stderr,
                    exitCode: code || 0,
                });
            });
            child.on('error', (error) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                reject(error);
            });
        });
    }
}
/**
 * Create a CodexValidator with default configuration
 */
export function createCodexValidator(options) {
    return new CodexValidator(options);
}
/**
 * Quick validation function for simple availability checks
 */
export async function validateCodexAvailability(options) {
    const validator = createCodexValidator(options);
    return validator.validateCodexAvailability();
}
//# sourceMappingURL=codex-validator.js.map