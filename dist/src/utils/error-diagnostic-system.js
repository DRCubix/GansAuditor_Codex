/**
 * Error Diagnostic System for GansAuditor_Codex
 *
 * This module provides comprehensive error analysis and diagnostic capabilities
 * to replace fallback mechanisms with actionable error reporting.
 *
 * Requirements addressed:
 * - 4.1: Comprehensive error analysis and categorization
 * - 4.2: Actionable error messages with fix suggestions
 * - 4.3: Environment issue diagnosis
 * - 4.4: Process failure analysis
 * - 4.5: Installation guidance and troubleshooting
 */
import { spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import { createComponentLogger } from './logger.js';
import { installationGuidanceSystem } from './installation-guidance.js';
/**
 * Comprehensive Error Diagnostic System
 *
 * Provides detailed analysis of Codex CLI errors and system issues
 * with actionable recommendations for resolution.
 */
export class ErrorDiagnosticSystem {
    componentLogger = createComponentLogger('error-diagnostic-system');
    codexExecutable;
    platformInfo;
    constructor(codexExecutable = 'codex') {
        this.codexExecutable = codexExecutable;
        this.platformInfo = {
            platform: process.platform,
            arch: process.arch,
            version: process.version,
        };
    }
    /**
     * Diagnose Codex CLI error with comprehensive analysis
     *
     * Requirement 4.1: Comprehensive error analysis and categorization
     */
    async diagnoseCodexError(error, context) {
        this.componentLogger.debug('Starting Codex error diagnosis', {
            error: error.message,
            context
        });
        // Analyze error type and context
        const category = this.categorizeError(error, context);
        const severity = this.determineSeverity(error, category);
        // Generate detailed diagnostic
        const diagnostic = {
            category,
            severity,
            message: this.generateDiagnosticMessage(error, category),
            details: await this.generateDetailedAnalysis(error, context, category),
            suggestions: await this.generateActionableSuggestions(error, context, category),
            documentationLinks: this.getRelevantDocumentationLinks(category),
            context: {
                ...context,
                platform: this.platformInfo,
                errorType: error.constructor.name,
                errorCode: error.code,
                errorErrno: error.errno,
            },
            timestamp: Date.now(),
        };
        this.componentLogger.info('Codex error diagnosis completed', {
            category: diagnostic.category,
            severity: diagnostic.severity,
            suggestionsCount: diagnostic.suggestions.length,
        });
        return diagnostic;
    }
    /**
     * Generate installation guidance for the current platform
     *
     * Requirement 4.5: Installation guidance and troubleshooting
     */
    async generateInstallationGuidance() {
        this.componentLogger.debug('Generating installation guidance', {
            platform: this.platformInfo.platform
        });
        // Use the dedicated installation guidance system
        return installationGuidanceSystem.generateGuidance();
    }
    /**
     * Analyze environment issues comprehensively
     *
     * Requirement 4.3: Environment issue diagnosis
     */
    async analyzeEnvironmentIssues() {
        this.componentLogger.debug('Analyzing environment issues');
        const diagnostics = [];
        // Check PATH environment variable
        diagnostics.push(await this.checkPathEnvironment());
        // Check working directory accessibility
        diagnostics.push(await this.checkWorkingDirectory());
        // Check file permissions
        diagnostics.push(await this.checkFilePermissions());
        // Check system resources
        diagnostics.push(await this.checkSystemResources());
        // Check Node.js version compatibility
        diagnostics.push(await this.checkNodeVersion());
        // Check environment variables
        diagnostics.push(await this.checkEnvironmentVariables());
        return diagnostics.filter(d => d.status !== 'ok');
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Categorize error based on error type and context
     */
    categorizeError(error, context) {
        const message = error.message.toLowerCase();
        const errorCode = error.code;
        // Installation issues
        if (message.includes('command not found') ||
            message.includes('not found') ||
            message.includes('enoent') ||
            errorCode === 'ENOENT') {
            return 'installation';
        }
        // Permission issues
        if (message.includes('permission denied') ||
            message.includes('eacces') ||
            errorCode === 'EACCES') {
            return 'permission';
        }
        // Timeout issues
        if (message.includes('timeout') ||
            message.includes('timed out') ||
            message.includes('etimedout')) {
            return 'timeout';
        }
        // Process issues
        if (message.includes('spawn') ||
            message.includes('child process') ||
            message.includes('exit code')) {
            return 'process';
        }
        // Network issues
        if (message.includes('network') ||
            message.includes('connection') ||
            message.includes('econnrefused')) {
            return 'network';
        }
        // Resource issues
        if (message.includes('memory') ||
            message.includes('disk space') ||
            message.includes('emfile')) {
            return 'resource';
        }
        // Configuration issues
        if (message.includes('config') ||
            message.includes('invalid') ||
            message.includes('malformed')) {
            return 'configuration';
        }
        // Default to environment for unknown issues
        return 'environment';
    }
    /**
     * Determine severity based on error and category
     */
    determineSeverity(error, category) {
        switch (category) {
            case 'installation':
                return 'critical';
            case 'permission':
                return 'error';
            case 'timeout':
                return 'warning';
            case 'process':
                return 'error';
            case 'network':
                return 'warning';
            case 'resource':
                return 'error';
            case 'configuration':
                return 'warning';
            case 'environment':
                return 'warning';
            default:
                return 'error';
        }
    }
    /**
     * Generate diagnostic message based on error and category
     */
    generateDiagnosticMessage(error, category) {
        const baseMessage = error.message;
        switch (category) {
            case 'installation':
                return `Codex CLI installation issue: ${baseMessage}`;
            case 'permission':
                return `Permission denied accessing Codex CLI: ${baseMessage}`;
            case 'timeout':
                return `Codex CLI operation timed out: ${baseMessage}`;
            case 'process':
                return `Codex CLI process execution failed: ${baseMessage}`;
            case 'network':
                return `Network connectivity issue with Codex CLI: ${baseMessage}`;
            case 'resource':
                return `System resource limitation affecting Codex CLI: ${baseMessage}`;
            case 'configuration':
                return `Codex CLI configuration error: ${baseMessage}`;
            case 'environment':
                return `Environment setup issue for Codex CLI: ${baseMessage}`;
            default:
                return `Codex CLI error: ${baseMessage}`;
        }
    }
    /**
     * Generate detailed analysis of the error
     *
     * Requirement 4.2: Actionable error messages with fix suggestions
     */
    async generateDetailedAnalysis(error, context, category) {
        const details = [];
        details.push(`Error occurred at: ${new Date(context.requestTimestamp).toISOString()}`);
        details.push(`Working directory: ${context.workingDirectory}`);
        details.push(`Platform: ${this.platformInfo.platform} ${this.platformInfo.arch}`);
        details.push(`Node.js version: ${this.platformInfo.version}`);
        if (context.command) {
            details.push(`Command: ${context.command} ${(context.arguments || []).join(' ')}`);
        }
        if (context.processId) {
            details.push(`Process ID: ${context.processId}`);
        }
        // Add category-specific analysis
        switch (category) {
            case 'installation':
                details.push(await this.analyzeInstallationIssue(error));
                break;
            case 'permission':
                details.push(await this.analyzePermissionIssue(error, context));
                break;
            case 'timeout':
                details.push(await this.analyzeTimeoutIssue(error, context));
                break;
            case 'process':
                details.push(await this.analyzeProcessIssue(error, context));
                break;
            case 'environment':
                details.push(await this.analyzeEnvironmentIssue(error, context));
                break;
        }
        return details.join('\n');
    }
    /**
     * Generate actionable suggestions for error resolution
     *
     * Requirement 4.2: Actionable error messages with fix suggestions
     */
    async generateActionableSuggestions(error, context, category) {
        const suggestions = [];
        switch (category) {
            case 'installation':
                suggestions.push(...await this.getInstallationSuggestions());
                break;
            case 'permission':
                suggestions.push(...await this.getPermissionSuggestions(context));
                break;
            case 'timeout':
                suggestions.push(...await this.getTimeoutSuggestions(context));
                break;
            case 'process':
                suggestions.push(...await this.getProcessSuggestions(error, context));
                break;
            case 'environment':
                suggestions.push(...await this.getEnvironmentSuggestions(context));
                break;
            case 'configuration':
                suggestions.push(...await this.getConfigurationSuggestions(error));
                break;
            case 'network':
                suggestions.push(...await this.getNetworkSuggestions());
                break;
            case 'resource':
                suggestions.push(...await this.getResourceSuggestions());
                break;
        }
        // Add general suggestions
        suggestions.push('Check the Codex CLI documentation for additional troubleshooting steps');
        suggestions.push('Verify that your system meets the minimum requirements for Codex CLI');
        return suggestions;
    }
    /**
     * Get relevant documentation links for the error category
     */
    getRelevantDocumentationLinks(category) {
        const baseUrl = 'https://docs.codex.com';
        const links = [];
        switch (category) {
            case 'installation':
                links.push(`${baseUrl}/installation`);
                links.push(`${baseUrl}/installation/${this.platformInfo.platform}`);
                break;
            case 'permission':
                links.push(`${baseUrl}/troubleshooting/permissions`);
                break;
            case 'timeout':
                links.push(`${baseUrl}/configuration/timeouts`);
                break;
            case 'process':
                links.push(`${baseUrl}/troubleshooting/process-issues`);
                break;
            case 'environment':
                links.push(`${baseUrl}/configuration/environment`);
                break;
            case 'configuration':
                links.push(`${baseUrl}/configuration`);
                break;
            case 'network':
                links.push(`${baseUrl}/troubleshooting/network`);
                break;
            case 'resource':
                links.push(`${baseUrl}/troubleshooting/resources`);
                break;
        }
        links.push(`${baseUrl}/troubleshooting`);
        return links;
    }
    // ============================================================================
    // Installation Analysis Methods
    // ============================================================================
    // Installation-specific methods moved to installation-guidance.ts
    // ============================================================================
    // Environment Analysis Methods
    // ============================================================================
    /**
     * Check PATH environment variable
     */
    async checkPathEnvironment() {
        const pathEnv = process.env.PATH || '';
        const pathDirs = pathEnv.split(process.platform === 'win32' ? ';' : ':');
        // Check if common installation directories are in PATH
        const commonDirs = process.platform === 'win32'
            ? ['C:\\Program Files\\Codex', 'C:\\Users\\%USERNAME%\\AppData\\Local\\Codex']
            : ['/usr/local/bin', '/usr/bin', '/opt/codex/bin'];
        const foundDirs = pathDirs.filter(dir => commonDirs.some(commonDir => dir.includes('codex') || commonDir === dir));
        if (foundDirs.length === 0) {
            return {
                component: 'PATH Environment',
                status: 'warning',
                message: 'No Codex CLI directories found in PATH',
                expectedValue: 'PATH should include Codex CLI installation directory',
                actualValue: `PATH contains ${pathDirs.length} directories, none appear to be Codex-related`,
                fixSuggestion: 'Add Codex CLI installation directory to your system PATH',
            };
        }
        return {
            component: 'PATH Environment',
            status: 'ok',
            message: 'PATH appears to include Codex CLI directories',
        };
    }
    /**
     * Check working directory accessibility
     */
    async checkWorkingDirectory() {
        const cwd = process.cwd();
        try {
            await access(cwd, constants.R_OK | constants.W_OK);
            return {
                component: 'Working Directory',
                status: 'ok',
                message: 'Working directory is accessible',
            };
        }
        catch (error) {
            return {
                component: 'Working Directory',
                status: 'error',
                message: 'Working directory is not accessible',
                expectedValue: 'Read and write access to working directory',
                actualValue: `No access to ${cwd}`,
                fixSuggestion: 'Ensure the working directory exists and has proper permissions',
            };
        }
    }
    /**
     * Check file permissions
     */
    async checkFilePermissions() {
        try {
            // Try to find Codex CLI executable
            const result = await this.executeCommand('which', [this.codexExecutable]);
            const executablePath = result.stdout.trim();
            if (executablePath) {
                await access(executablePath, constants.X_OK);
                return {
                    component: 'File Permissions',
                    status: 'ok',
                    message: 'Codex CLI executable has proper permissions',
                };
            }
        }
        catch (error) {
            return {
                component: 'File Permissions',
                status: 'error',
                message: 'Codex CLI executable permissions issue',
                fixSuggestion: 'Ensure Codex CLI binary has execute permissions (chmod +x)',
            };
        }
        return {
            component: 'File Permissions',
            status: 'warning',
            message: 'Could not verify Codex CLI executable permissions',
            fixSuggestion: 'Verify Codex CLI is installed and accessible',
        };
    }
    /**
     * Check system resources
     */
    async checkSystemResources() {
        const memoryUsage = process.memoryUsage();
        const freeMemory = memoryUsage.heapTotal - memoryUsage.heapUsed;
        // Check if we have at least 100MB of free memory
        if (freeMemory < 100 * 1024 * 1024) {
            return {
                component: 'System Resources',
                status: 'warning',
                message: 'Low available memory detected',
                expectedValue: 'At least 100MB free memory',
                actualValue: `${Math.round(freeMemory / 1024 / 1024)}MB free`,
                fixSuggestion: 'Close other applications to free up memory',
            };
        }
        return {
            component: 'System Resources',
            status: 'ok',
            message: 'Sufficient system resources available',
        };
    }
    /**
     * Check Node.js version compatibility
     */
    async checkNodeVersion() {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        // Require Node.js 18 or higher
        if (majorVersion < 18) {
            return {
                component: 'Node.js Version',
                status: 'error',
                message: 'Node.js version is too old',
                expectedValue: 'Node.js 18.0.0 or higher',
                actualValue: nodeVersion,
                fixSuggestion: 'Update Node.js to version 18 or higher',
            };
        }
        return {
            component: 'Node.js Version',
            status: 'ok',
            message: 'Node.js version is compatible',
        };
    }
    /**
     * Check environment variables
     */
    async checkEnvironmentVariables() {
        const requiredVars = ['HOME', 'USER'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            return {
                component: 'Environment Variables',
                status: 'warning',
                message: 'Some required environment variables are missing',
                expectedValue: requiredVars.join(', '),
                actualValue: `Missing: ${missingVars.join(', ')}`,
                fixSuggestion: 'Ensure all required environment variables are set',
            };
        }
        return {
            component: 'Environment Variables',
            status: 'ok',
            message: 'Required environment variables are present',
        };
    }
    // ============================================================================
    // Specific Error Analysis Methods
    // ============================================================================
    /**
     * Analyze installation-related issues
     */
    async analyzeInstallationIssue(error) {
        const analysis = [];
        analysis.push('Installation Analysis:');
        // Check if it's a "command not found" error
        if (error.message.includes('command not found') || error.message.includes('ENOENT')) {
            analysis.push('- Codex CLI executable not found in system PATH');
            analysis.push('- This typically indicates Codex CLI is not installed or not properly configured');
        }
        // Check PATH
        const pathEnv = process.env.PATH || '';
        analysis.push(`- Current PATH contains ${pathEnv.split(':').length} directories`);
        // Try to detect if Codex might be installed elsewhere
        const possibleLocations = [
            '/usr/local/bin/codex',
            '/usr/bin/codex',
            '/opt/codex/bin/codex',
            `${process.env.HOME}/.local/bin/codex`,
        ];
        for (const location of possibleLocations) {
            try {
                await access(location, constants.F_OK);
                analysis.push(`- Found potential Codex installation at: ${location}`);
            }
            catch {
                // Location doesn't exist, continue
            }
        }
        return analysis.join('\n');
    }
    /**
     * Analyze permission-related issues
     */
    async analyzePermissionIssue(error, context) {
        const analysis = [];
        analysis.push('Permission Analysis:');
        analysis.push(`- Working directory: ${context.workingDirectory}`);
        analysis.push(`- User: ${process.env.USER || 'unknown'}`);
        analysis.push(`- Process UID: ${process.getuid ? process.getuid() : 'N/A'}`);
        analysis.push(`- Process GID: ${process.getgid ? process.getgid() : 'N/A'}`);
        // Check if it's a file permission issue
        if (error.message.includes('EACCES')) {
            analysis.push('- Access denied error detected');
            analysis.push('- This usually indicates insufficient file or directory permissions');
        }
        return analysis.join('\n');
    }
    /**
     * Analyze timeout-related issues
     */
    async analyzeTimeoutIssue(error, context) {
        const analysis = [];
        analysis.push('Timeout Analysis:');
        const duration = Date.now() - context.requestTimestamp;
        analysis.push(`- Operation duration: ${duration}ms`);
        if (context.command) {
            analysis.push(`- Command: ${context.command} ${(context.arguments || []).join(' ')}`);
        }
        // Analyze potential causes
        if (duration > 60000) {
            analysis.push('- Long execution time suggests complex operation or system performance issues');
        }
        else if (duration > 30000) {
            analysis.push('- Moderate execution time may indicate resource constraints');
        }
        return analysis.join('\n');
    }
    /**
     * Analyze process-related issues
     */
    async analyzeProcessIssue(error, context) {
        const analysis = [];
        analysis.push('Process Analysis:');
        if (context.processId) {
            analysis.push(`- Process ID: ${context.processId}`);
        }
        // Check for specific process errors
        const errorCode = error.code;
        if (errorCode) {
            analysis.push(`- Error code: ${errorCode}`);
            switch (errorCode) {
                case 'ENOENT':
                    analysis.push('- Executable not found');
                    break;
                case 'EACCES':
                    analysis.push('- Permission denied');
                    break;
                case 'EMFILE':
                    analysis.push('- Too many open files');
                    break;
                case 'ENOMEM':
                    analysis.push('- Out of memory');
                    break;
            }
        }
        return analysis.join('\n');
    }
    /**
     * Analyze environment-related issues
     */
    async analyzeEnvironmentIssue(error, context) {
        const analysis = [];
        analysis.push('Environment Analysis:');
        analysis.push(`- Platform: ${this.platformInfo.platform}`);
        analysis.push(`- Architecture: ${this.platformInfo.arch}`);
        analysis.push(`- Node.js: ${this.platformInfo.version}`);
        analysis.push(`- Working directory: ${context.workingDirectory}`);
        // Check environment variables
        const importantVars = ['PATH', 'HOME', 'USER', 'SHELL'];
        for (const varName of importantVars) {
            const value = process.env[varName];
            if (value) {
                analysis.push(`- ${varName}: ${varName === 'PATH' ? `${value.split(':').length} directories` : 'set'}`);
            }
            else {
                analysis.push(`- ${varName}: not set`);
            }
        }
        return analysis.join('\n');
    }
    // ============================================================================
    // Suggestion Generation Methods
    // ============================================================================
    /**
     * Get installation-specific suggestions
     */
    async getInstallationSuggestions() {
        // Get comprehensive installation guidance
        const guidance = await installationGuidanceSystem.generateGuidance();
        const suggestions = [
            `Recommended installation method: ${guidance.recommendedMethod.name}`,
            ...guidance.recommendedMethod.commands.slice(0, 2), // First 2 commands
            'Verify installation with "codex --version"',
            'Check the troubleshooting guide if issues persist',
        ];
        // Add detected issues as suggestions
        if (guidance.detectedIssues.length > 0) {
            suggestions.push('Detected issues:');
            suggestions.push(...guidance.detectedIssues.map(issue => `- ${issue}`));
        }
        return suggestions;
    }
    /**
     * Get permission-specific suggestions
     */
    async getPermissionSuggestions(context) {
        return [
            'Check file and directory permissions in the working directory',
            'Ensure Codex CLI executable has execute permissions',
            'Try running with elevated privileges if necessary',
            'Verify you have write access to temporary directories',
            `Check permissions for: ${context.workingDirectory}`,
        ];
    }
    /**
     * Get timeout-specific suggestions
     */
    async getTimeoutSuggestions(context) {
        return [
            'Increase the timeout configuration for Codex CLI operations',
            'Check system performance and available resources',
            'Consider reducing the scope or complexity of the operation',
            'Verify network connectivity if Codex CLI requires internet access',
            'Monitor system resources during operation execution',
        ];
    }
    /**
     * Get process-specific suggestions
     */
    async getProcessSuggestions(error, context) {
        const suggestions = [
            'Verify Codex CLI is properly installed and accessible',
            'Check system resources (memory, CPU, disk space)',
            'Ensure no other processes are interfering with Codex CLI',
        ];
        const errorCode = error.code;
        switch (errorCode) {
            case 'EMFILE':
                suggestions.push('Increase system file descriptor limits');
                suggestions.push('Close unnecessary file handles');
                break;
            case 'ENOMEM':
                suggestions.push('Free up system memory');
                suggestions.push('Consider reducing operation complexity');
                break;
        }
        return suggestions;
    }
    /**
     * Get environment-specific suggestions
     */
    async getEnvironmentSuggestions(context) {
        return [
            'Verify all required environment variables are set',
            'Check PATH configuration includes Codex CLI directory',
            'Ensure working directory is accessible and has proper permissions',
            'Verify Node.js version compatibility (18.0.0 or higher required)',
            'Check for conflicting environment configurations',
        ];
    }
    /**
     * Get configuration-specific suggestions
     */
    async getConfigurationSuggestions(error) {
        return [
            'Verify Codex CLI configuration files are valid',
            'Check for syntax errors in configuration',
            'Reset configuration to defaults if necessary',
            'Consult documentation for proper configuration format',
        ];
    }
    /**
     * Get network-specific suggestions
     */
    async getNetworkSuggestions() {
        return [
            'Check internet connectivity',
            'Verify firewall settings allow Codex CLI network access',
            'Check proxy configuration if applicable',
            'Ensure DNS resolution is working properly',
        ];
    }
    /**
     * Get resource-specific suggestions
     */
    async getResourceSuggestions() {
        return [
            'Free up system memory by closing unnecessary applications',
            'Check available disk space',
            'Monitor CPU usage during operations',
            'Consider upgrading system resources if consistently insufficient',
        ];
    }
    // ============================================================================
    // Utility Methods
    // ============================================================================
    /**
     * Execute a command and return result
     */
    executeCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const { timeout = 5000 } = options;
            const child = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            let timeoutId = null;
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    child.kill('SIGTERM');
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
 * Global error diagnostic system instance
 */
export const errorDiagnosticSystem = new ErrorDiagnosticSystem();
/**
 * Convenience function to diagnose Codex errors
 */
export async function diagnoseCodexError(error, context) {
    return errorDiagnosticSystem.diagnoseCodexError(error, context);
}
/**
 * Convenience function to generate installation guidance
 */
export async function generateInstallationGuidance() {
    return errorDiagnosticSystem.generateInstallationGuidance();
}
/**
 * Convenience function to analyze environment issues
 */
export async function analyzeEnvironmentIssues() {
    return errorDiagnosticSystem.analyzeEnvironmentIssues();
}
//# sourceMappingURL=error-diagnostic-system.js.map