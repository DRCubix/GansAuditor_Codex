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
/**
 * Platform information
 */
export interface PlatformInfo {
    platform: string;
    arch: string;
    version: string;
    release?: string;
}
/**
 * Version information
 */
export interface VersionInfo {
    current?: string;
    required: string;
    latest?: string;
    compatible: boolean;
    upgradeRequired: boolean;
}
/**
 * Installation method information
 */
export interface InstallationMethod {
    name: string;
    description: string;
    commands: string[];
    prerequisites: string[];
    notes: string[];
}
/**
 * Comprehensive installation guidance
 */
export interface InstallationGuidance {
    platform: PlatformInfo;
    codexVersion: VersionInfo;
    detectedIssues: string[];
    recommendedMethod: InstallationMethod;
    alternativeMethods: InstallationMethod[];
    verificationSteps: string[];
    troubleshootingTips: string[];
    supportResources: {
        documentation: string[];
        community: string[];
        support: string[];
    };
}
/**
 * Installation Guidance System
 *
 * Provides comprehensive installation guidance for Codex CLI
 * across different platforms and environments.
 */
export declare class InstallationGuidanceSystem {
    private readonly componentLogger;
    private readonly codexExecutable;
    private readonly platformInfo;
    constructor(codexExecutable?: string);
    /**
     * Generate comprehensive installation guidance
     *
     * Requirement 4.2: Platform-specific installation instructions
     */
    generateGuidance(): Promise<InstallationGuidance>;
    /**
     * Check version compatibility and upgrade requirements
     *
     * Requirement 4.3: Version compatibility checking and upgrade guidance
     */
    checkVersionCompatibility(): Promise<VersionInfo>;
    /**
     * Generate upgrade guidance for existing installations
     */
    generateUpgradeGuidance(): Promise<{
        currentVersion?: string;
        targetVersion: string;
        upgradeSteps: string[];
        backupSteps: string[];
        rollbackSteps: string[];
        risks: string[];
    }>;
    /**
     * Create troubleshooting guide for common installation issues
     */
    createTroubleshootingGuide(): Promise<{
        commonIssues: Array<{
            issue: string;
            symptoms: string[];
            solutions: string[];
            prevention: string[];
        }>;
        diagnosticCommands: Array<{
            command: string;
            purpose: string;
            expectedOutput: string;
        }>;
        emergencyRecovery: string[];
    }>;
    /**
     * Detect platform information
     */
    private detectPlatform;
    /**
     * Check current Codex version
     */
    private checkCodexVersion;
    /**
     * Detect installation issues
     */
    private detectInstallationIssues;
    /**
     * Get installation methods for current platform
     */
    private getInstallationMethods;
    /**
     * Get verification steps
     */
    private getVerificationSteps;
    /**
     * Get troubleshooting tips
     */
    private getTroubleshootingTips;
    /**
     * Get support resources
     */
    private getSupportResources;
    /**
     * Get latest version (mock implementation)
     */
    private getLatestVersion;
    /**
     * Compare version strings
     */
    private compareVersions;
    /**
     * Get upgrade steps
     */
    private getUpgradeSteps;
    /**
     * Get backup steps
     */
    private getBackupSteps;
    /**
     * Get rollback steps
     */
    private getRollbackSteps;
    /**
     * Get upgrade risks
     */
    private getUpgradeRisks;
    /**
     * Execute command utility
     */
    private executeCommand;
}
/**
 * Global installation guidance system instance
 */
export declare const installationGuidanceSystem: InstallationGuidanceSystem;
/**
 * Convenience function to generate installation guidance
 */
export declare function generateInstallationGuidance(): Promise<InstallationGuidance>;
/**
 * Convenience function to check version compatibility
 */
export declare function checkVersionCompatibility(): Promise<VersionInfo>;
/**
 * Convenience function to generate upgrade guidance
 */
export declare function generateUpgradeGuidance(): Promise<{
    currentVersion?: string;
    targetVersion: string;
    upgradeSteps: string[];
    backupSteps: string[];
    rollbackSteps: string[];
    risks: string[];
}>;
/**
 * Convenience function to create troubleshooting guide
 */
export declare function createTroubleshootingGuide(): Promise<{
    commonIssues: Array<{
        issue: string;
        symptoms: string[];
        solutions: string[];
        prevention: string[];
    }>;
    diagnosticCommands: Array<{
        command: string;
        purpose: string;
        expectedOutput: string;
    }>;
    emergencyRecovery: string[];
}>;
//# sourceMappingURL=installation-guidance.d.ts.map