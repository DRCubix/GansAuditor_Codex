/**
 * Installation Guidance System for Codex CLI
 *
 * This module provides platform-specific installation instructions,
 * version compatibility checking, and troubleshooting guides.
 *
 * Requirements addressed:
 * - 4.2: Platform-specific installation instructions
 * - 4.3: Version compatibility checking and upgrade guidance
 */
import { spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import { createComponentLogger } from './logger.js';
/**
 * Installation Guidance System
 *
 * Provides comprehensive installation guidance for Codex CLI
 * across different platforms and environments.
 */
export class InstallationGuidanceSystem {
    componentLogger = createComponentLogger('installation-guidance');
    codexExecutable;
    platformInfo;
    constructor(codexExecutable = 'codex') {
        this.codexExecutable = codexExecutable;
        this.platformInfo = this.detectPlatform();
    }
    /**
     * Generate comprehensive installation guidance
     *
     * Requirement 4.2: Platform-specific installation instructions
     */
    async generateGuidance() {
        this.componentLogger.debug('Generating installation guidance', {
            platform: this.platformInfo.platform
        });
        const codexVersion = await this.checkCodexVersion();
        const detectedIssues = await this.detectInstallationIssues();
        const methods = this.getInstallationMethods();
        const guidance = {
            platform: this.platformInfo,
            codexVersion,
            detectedIssues,
            recommendedMethod: methods[0], // First method is recommended
            alternativeMethods: methods.slice(1),
            verificationSteps: this.getVerificationSteps(),
            troubleshootingTips: this.getTroubleshootingTips(),
            supportResources: this.getSupportResources(),
        };
        this.componentLogger.info('Installation guidance generated', {
            platform: guidance.platform.platform,
            issuesCount: guidance.detectedIssues.length,
            methodsCount: guidance.alternativeMethods.length + 1,
        });
        return guidance;
    }
    /**
     * Check version compatibility and upgrade requirements
     *
     * Requirement 4.3: Version compatibility checking and upgrade guidance
     */
    async checkVersionCompatibility() {
        this.componentLogger.debug('Checking version compatibility');
        const requiredVersion = '1.0.0'; // Minimum required version
        let currentVersion;
        let compatible = false;
        let upgradeRequired = false;
        try {
            const result = await this.executeCommand(this.codexExecutable, ['--version']);
            if (result.exitCode === 0) {
                // Extract version from output (e.g., "codex version 1.2.3")
                const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
                if (versionMatch) {
                    currentVersion = versionMatch[1];
                    compatible = this.compareVersions(currentVersion, requiredVersion) >= 0;
                    upgradeRequired = !compatible;
                }
            }
        }
        catch (error) {
            this.componentLogger.debug('Version check failed', { error: error.message });
            upgradeRequired = true;
        }
        // Get latest version (mock implementation - in real scenario, this would query a registry)
        const latestVersion = await this.getLatestVersion();
        return {
            current: currentVersion,
            required: requiredVersion,
            latest: latestVersion,
            compatible,
            upgradeRequired,
        };
    }
    /**
     * Generate upgrade guidance for existing installations
     */
    async generateUpgradeGuidance() {
        const versionInfo = await this.checkVersionCompatibility();
        const targetVersion = versionInfo.latest || versionInfo.required;
        return {
            currentVersion: versionInfo.current,
            targetVersion,
            upgradeSteps: this.getUpgradeSteps(targetVersion),
            backupSteps: this.getBackupSteps(),
            rollbackSteps: this.getRollbackSteps(),
            risks: this.getUpgradeRisks(),
        };
    }
    /**
     * Create troubleshooting guide for common installation issues
     */
    async createTroubleshootingGuide() {
        return {
            commonIssues: [
                {
                    issue: 'Command not found',
                    symptoms: [
                        'Terminal shows "codex: command not found"',
                        'Shell cannot locate codex executable',
                    ],
                    solutions: [
                        'Verify Codex CLI is installed',
                        'Check PATH environment variable includes Codex directory',
                        'Reinstall Codex CLI with proper PATH configuration',
                        'Use absolute path to codex executable as temporary workaround',
                    ],
                    prevention: [
                        'Always verify PATH configuration during installation',
                        'Test installation immediately after setup',
                    ],
                },
                {
                    issue: 'Permission denied',
                    symptoms: [
                        'Error: EACCES: permission denied',
                        'Cannot execute codex binary',
                    ],
                    solutions: [
                        'Check file permissions: ls -la $(which codex)',
                        'Make executable: chmod +x $(which codex)',
                        'Run with sudo if system-wide installation',
                        'Reinstall with proper permissions',
                    ],
                    prevention: [
                        'Install with appropriate user permissions',
                        'Avoid mixing sudo and non-sudo installations',
                    ],
                },
                {
                    issue: 'Version incompatibility',
                    symptoms: [
                        'Codex CLI returns unexpected errors',
                        'Features not working as documented',
                    ],
                    solutions: [
                        'Check current version: codex --version',
                        'Upgrade to latest version',
                        'Verify system requirements are met',
                    ],
                    prevention: [
                        'Regularly update Codex CLI',
                        'Monitor release notes for breaking changes',
                    ],
                },
            ],
            diagnosticCommands: [
                {
                    command: 'which codex',
                    purpose: 'Locate Codex CLI executable',
                    expectedOutput: '/usr/local/bin/codex (or similar path)',
                },
                {
                    command: 'codex --version',
                    purpose: 'Check installed version',
                    expectedOutput: 'codex version X.Y.Z',
                },
                {
                    command: 'echo $PATH',
                    purpose: 'Verify PATH configuration',
                    expectedOutput: 'PATH containing Codex directory',
                },
                {
                    command: 'ls -la $(which codex)',
                    purpose: 'Check file permissions',
                    expectedOutput: 'Executable permissions (-rwxr-xr-x)',
                },
            ],
            emergencyRecovery: [
                'Completely uninstall Codex CLI',
                'Clear all configuration files',
                'Remove from PATH',
                'Restart terminal/shell',
                'Reinstall from scratch using official installer',
                'Verify installation step by step',
            ],
        };
    }
    // ============================================================================
    // Private Implementation Methods
    // ============================================================================
    /**
     * Detect platform information
     */
    detectPlatform() {
        return {
            platform: process.platform,
            arch: process.arch,
            version: process.version,
            release: process.release?.name,
        };
    }
    /**
     * Check current Codex version
     */
    async checkCodexVersion() {
        return this.checkVersionCompatibility();
    }
    /**
     * Detect installation issues
     */
    async detectInstallationIssues() {
        const issues = [];
        // Check if Codex CLI is in PATH
        try {
            await this.executeCommand('which', [this.codexExecutable]);
        }
        catch {
            issues.push('Codex CLI not found in system PATH');
        }
        // Check if Codex CLI is executable
        try {
            const result = await this.executeCommand(this.codexExecutable, ['--version']);
            if (result.exitCode !== 0) {
                issues.push('Codex CLI found but not executable or returns error');
            }
        }
        catch {
            issues.push('Codex CLI execution test failed');
        }
        // Check version compatibility
        const versionInfo = await this.checkVersionCompatibility();
        if (versionInfo.upgradeRequired) {
            issues.push(`Codex CLI version ${versionInfo.current || 'unknown'} is incompatible (requires ${versionInfo.required}+)`);
        }
        // Check permissions
        try {
            const whichResult = await this.executeCommand('which', [this.codexExecutable]);
            if (whichResult.exitCode === 0) {
                const executablePath = whichResult.stdout.trim();
                await access(executablePath, constants.X_OK);
            }
        }
        catch {
            issues.push('Codex CLI executable permissions issue');
        }
        return issues;
    }
    /**
     * Get installation methods for current platform
     */
    getInstallationMethods() {
        switch (this.platformInfo.platform) {
            case 'darwin':
                return [
                    {
                        name: 'Homebrew (Recommended)',
                        description: 'Install using Homebrew package manager',
                        commands: [
                            'brew install codex',
                        ],
                        prerequisites: [
                            'Homebrew must be installed',
                            'Xcode Command Line Tools',
                        ],
                        notes: [
                            'Automatically handles PATH configuration',
                            'Easy to update with brew upgrade',
                        ],
                    },
                    {
                        name: 'Official Installer',
                        description: 'Download and run official macOS installer',
                        commands: [
                            'curl -fsSL https://install.codex.com/macos | sh',
                        ],
                        prerequisites: [
                            'Administrator privileges',
                            'Internet connection',
                        ],
                        notes: [
                            'May require manual PATH configuration',
                            'Includes automatic updates',
                        ],
                    },
                    {
                        name: 'Manual Installation',
                        description: 'Download binary and install manually',
                        commands: [
                            'curl -L https://releases.codex.com/latest/codex-darwin-amd64.tar.gz -o codex.tar.gz',
                            'tar -xzf codex.tar.gz',
                            'sudo mv codex /usr/local/bin/',
                            'sudo chmod +x /usr/local/bin/codex',
                        ],
                        prerequisites: [
                            'Administrator privileges',
                            'Command line familiarity',
                        ],
                        notes: [
                            'Full control over installation location',
                            'Manual updates required',
                        ],
                    },
                ];
            case 'linux':
                return [
                    {
                        name: 'Package Manager (Recommended)',
                        description: 'Install using system package manager',
                        commands: [
                            '# Ubuntu/Debian:',
                            'curl -fsSL https://packages.codex.com/gpg | sudo apt-key add -',
                            'echo "deb https://packages.codex.com/apt stable main" | sudo tee /etc/apt/sources.list.d/codex.list',
                            'sudo apt update && sudo apt install codex',
                            '',
                            '# CentOS/RHEL/Fedora:',
                            'sudo yum install -y yum-utils',
                            'sudo yum-config-manager --add-repo https://packages.codex.com/rpm/codex.repo',
                            'sudo yum install codex',
                        ],
                        prerequisites: [
                            'Root or sudo access',
                            'Package manager (apt/yum/dnf)',
                        ],
                        notes: [
                            'Automatic dependency resolution',
                            'System-wide installation',
                            'Easy updates through package manager',
                        ],
                    },
                    {
                        name: 'Official Installer',
                        description: 'Download and run official Linux installer',
                        commands: [
                            'curl -fsSL https://install.codex.com/linux | sh',
                        ],
                        prerequisites: [
                            'curl or wget',
                            'Internet connection',
                        ],
                        notes: [
                            'Works on most Linux distributions',
                            'Handles PATH configuration automatically',
                        ],
                    },
                    {
                        name: 'Manual Binary Installation',
                        description: 'Download and install binary manually',
                        commands: [
                            'curl -L https://releases.codex.com/latest/codex-linux-amd64.tar.gz -o codex.tar.gz',
                            'tar -xzf codex.tar.gz',
                            'sudo mv codex /usr/local/bin/',
                            'sudo chmod +x /usr/local/bin/codex',
                        ],
                        prerequisites: [
                            'Root or sudo access',
                            'tar utility',
                        ],
                        notes: [
                            'Works on any Linux distribution',
                            'Manual updates required',
                        ],
                    },
                ];
            case 'win32':
                return [
                    {
                        name: 'Windows Installer (Recommended)',
                        description: 'Download and run official Windows installer',
                        commands: [
                            'Download codex-windows-installer.exe from https://releases.codex.com/latest/',
                            'Run installer as Administrator',
                            'Follow installation wizard',
                        ],
                        prerequisites: [
                            'Administrator privileges',
                            'Windows 10 or later',
                        ],
                        notes: [
                            'Automatic PATH configuration',
                            'Includes uninstaller',
                            'Desktop shortcuts created',
                        ],
                    },
                    {
                        name: 'PowerShell Installation',
                        description: 'Install using PowerShell script',
                        commands: [
                            'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser',
                            'Invoke-RestMethod -Uri https://install.codex.com/windows.ps1 | Invoke-Expression',
                        ],
                        prerequisites: [
                            'PowerShell 5.0 or later',
                            'Internet connection',
                        ],
                        notes: [
                            'Command-line installation',
                            'Automatic PATH configuration',
                        ],
                    },
                    {
                        name: 'Manual Installation',
                        description: 'Download and install manually',
                        commands: [
                            'Download codex-windows-amd64.zip from https://releases.codex.com/latest/',
                            'Extract to C:\\Program Files\\Codex\\',
                            'Add C:\\Program Files\\Codex\\ to system PATH',
                            'Restart command prompt',
                        ],
                        prerequisites: [
                            'Administrator privileges',
                            'ZIP extraction utility',
                        ],
                        notes: [
                            'Manual PATH configuration required',
                            'Full control over installation location',
                        ],
                    },
                ];
            default:
                return [
                    {
                        name: 'Generic Installation',
                        description: 'Platform-agnostic installation method',
                        commands: [
                            'Visit https://codex.com/install for platform-specific instructions',
                            'Download appropriate binary for your system',
                            'Add to system PATH',
                            'Verify with: codex --version',
                        ],
                        prerequisites: [
                            'Internet connection',
                            'System administration knowledge',
                        ],
                        notes: [
                            'Consult official documentation',
                            'May require manual configuration',
                        ],
                    },
                ];
        }
    }
    /**
     * Get verification steps
     */
    getVerificationSteps() {
        return [
            'Open a new terminal or command prompt',
            'Run "codex --version" to verify installation',
            'Expected output: "codex version X.Y.Z"',
            'Run "codex --help" to see available commands',
            'Test basic functionality: "codex exec --help"',
            'Verify PATH configuration: "which codex" (Unix) or "where codex" (Windows)',
        ];
    }
    /**
     * Get troubleshooting tips
     */
    getTroubleshootingTips() {
        return [
            'Restart your terminal/command prompt after installation',
            'Ensure you have the latest version installed',
            'Check that your system meets minimum requirements',
            'Verify no antivirus software is blocking execution',
            'Try running with elevated privileges if permission issues occur',
            'Clear any cached configurations that might cause conflicts',
            'Check system logs for additional error information',
            'Ensure no other versions of Codex CLI are installed',
        ];
    }
    /**
     * Get support resources
     */
    getSupportResources() {
        return {
            documentation: [
                'Official Documentation: https://docs.codex.com',
                'Installation Guide: https://docs.codex.com/installation',
                'Troubleshooting: https://docs.codex.com/troubleshooting',
                'FAQ: https://docs.codex.com/faq',
            ],
            community: [
                'GitHub Issues: https://github.com/codex/cli/issues',
                'Community Forum: https://community.codex.com',
                'Discord Server: https://discord.gg/codex',
                'Stack Overflow: https://stackoverflow.com/questions/tagged/codex-cli',
            ],
            support: [
                'Official Support: https://support.codex.com',
                'Enterprise Support: https://codex.com/enterprise-support',
                'Bug Reports: https://github.com/codex/cli/issues/new',
            ],
        };
    }
    /**
     * Get latest version (mock implementation)
     */
    async getLatestVersion() {
        // In a real implementation, this would query the official registry
        return '2.1.0';
    }
    /**
     * Compare version strings
     */
    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            if (v1Part > v2Part)
                return 1;
            if (v1Part < v2Part)
                return -1;
        }
        return 0;
    }
    /**
     * Get upgrade steps
     */
    getUpgradeSteps(targetVersion) {
        const steps = [
            'Create backup of current configuration',
            'Stop any running Codex processes',
        ];
        switch (this.platformInfo.platform) {
            case 'darwin':
                steps.push('Update using Homebrew: brew upgrade codex', 'Or download new installer and run it');
                break;
            case 'linux':
                steps.push('Update using package manager: sudo apt update && sudo apt upgrade codex', 'Or download new binary and replace existing installation');
                break;
            case 'win32':
                steps.push('Download new Windows installer', 'Run installer (it will upgrade existing installation)');
                break;
            default:
                steps.push('Download new version from official website', 'Replace existing installation');
        }
        steps.push('Verify upgrade: codex --version', 'Test functionality with existing projects', 'Restore configuration if needed');
        return steps;
    }
    /**
     * Get backup steps
     */
    getBackupSteps() {
        return [
            'Backup configuration files (~/.codex/ or %APPDATA%\\Codex\\)',
            'Export current settings: codex config export > codex-backup.json',
            'Note current version: codex --version',
            'Document any custom configurations',
            'Backup any project-specific Codex files',
        ];
    }
    /**
     * Get rollback steps
     */
    getRollbackSteps() {
        return [
            'Uninstall current version',
            'Download previous version from releases page',
            'Install previous version',
            'Restore configuration from backup',
            'Import settings: codex config import codex-backup.json',
            'Verify rollback: codex --version',
        ];
    }
    /**
     * Get upgrade risks
     */
    getUpgradeRisks() {
        return [
            'Configuration files may need migration',
            'Some commands or options might change',
            'Existing projects might need updates',
            'Performance characteristics may differ',
            'New bugs might be introduced',
            'Dependencies might have changed',
        ];
    }
    /**
     * Execute command utility
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
 * Global installation guidance system instance
 */
export const installationGuidanceSystem = new InstallationGuidanceSystem();
/**
 * Convenience function to generate installation guidance
 */
export async function generateInstallationGuidance() {
    return installationGuidanceSystem.generateGuidance();
}
/**
 * Convenience function to check version compatibility
 */
export async function checkVersionCompatibility() {
    return installationGuidanceSystem.checkVersionCompatibility();
}
/**
 * Convenience function to generate upgrade guidance
 */
export async function generateUpgradeGuidance() {
    return installationGuidanceSystem.generateUpgradeGuidance();
}
/**
 * Convenience function to create troubleshooting guide
 */
export async function createTroubleshootingGuide() {
    return installationGuidanceSystem.createTroubleshootingGuide();
}
//# sourceMappingURL=installation-guidance.js.map