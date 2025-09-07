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
import { type InstallationGuidance as InstallationGuidanceType } from './installation-guidance.js';
/**
 * Error diagnostic categories for comprehensive analysis
 */
export type DiagnosticCategory = 'installation' | 'environment' | 'process' | 'timeout' | 'permission' | 'configuration' | 'network' | 'resource';
/**
 * Diagnostic severity levels
 */
export type DiagnosticSeverity = 'critical' | 'error' | 'warning' | 'info';
/**
 * Comprehensive diagnostic result
 */
export interface CodexDiagnostic {
    category: DiagnosticCategory;
    severity: DiagnosticSeverity;
    message: string;
    details: string;
    suggestions: string[];
    documentationLinks: string[];
    context: Record<string, any>;
    timestamp: number;
}
/**
 * Environment diagnostic result
 */
export interface EnvironmentDiagnostic {
    component: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    expectedValue?: string;
    actualValue?: string;
    fixSuggestion?: string;
}
/**
 * Execution context for error analysis
 */
export interface ExecutionContext {
    sessionId?: string;
    thoughtNumber?: number;
    workingDirectory: string;
    requestTimestamp: number;
    processId?: number;
    command?: string;
    arguments?: string[];
    environment?: Record<string, string>;
}
/**
 * Comprehensive Error Diagnostic System
 *
 * Provides detailed analysis of Codex CLI errors and system issues
 * with actionable recommendations for resolution.
 */
export declare class ErrorDiagnosticSystem {
    private readonly componentLogger;
    private readonly codexExecutable;
    private readonly platformInfo;
    constructor(codexExecutable?: string);
    /**
     * Diagnose Codex CLI error with comprehensive analysis
     *
     * Requirement 4.1: Comprehensive error analysis and categorization
     */
    diagnoseCodexError(error: Error, context: ExecutionContext): Promise<CodexDiagnostic>;
    /**
     * Generate installation guidance for the current platform
     *
     * Requirement 4.5: Installation guidance and troubleshooting
     */
    generateInstallationGuidance(): Promise<InstallationGuidanceType>;
    /**
     * Analyze environment issues comprehensively
     *
     * Requirement 4.3: Environment issue diagnosis
     */
    analyzeEnvironmentIssues(): Promise<EnvironmentDiagnostic[]>;
    /**
     * Categorize error based on error type and context
     */
    private categorizeError;
    /**
     * Determine severity based on error and category
     */
    private determineSeverity;
    /**
     * Generate diagnostic message based on error and category
     */
    private generateDiagnosticMessage;
    /**
     * Generate detailed analysis of the error
     *
     * Requirement 4.2: Actionable error messages with fix suggestions
     */
    private generateDetailedAnalysis;
    /**
     * Generate actionable suggestions for error resolution
     *
     * Requirement 4.2: Actionable error messages with fix suggestions
     */
    private generateActionableSuggestions;
    /**
     * Get relevant documentation links for the error category
     */
    private getRelevantDocumentationLinks;
    /**
     * Check PATH environment variable
     */
    private checkPathEnvironment;
    /**
     * Check working directory accessibility
     */
    private checkWorkingDirectory;
    /**
     * Check file permissions
     */
    private checkFilePermissions;
    /**
     * Check system resources
     */
    private checkSystemResources;
    /**
     * Check Node.js version compatibility
     */
    private checkNodeVersion;
    /**
     * Check environment variables
     */
    private checkEnvironmentVariables;
    /**
     * Analyze installation-related issues
     */
    private analyzeInstallationIssue;
    /**
     * Analyze permission-related issues
     */
    private analyzePermissionIssue;
    /**
     * Analyze timeout-related issues
     */
    private analyzeTimeoutIssue;
    /**
     * Analyze process-related issues
     */
    private analyzeProcessIssue;
    /**
     * Analyze environment-related issues
     */
    private analyzeEnvironmentIssue;
    /**
     * Get installation-specific suggestions
     */
    private getInstallationSuggestions;
    /**
     * Get permission-specific suggestions
     */
    private getPermissionSuggestions;
    /**
     * Get timeout-specific suggestions
     */
    private getTimeoutSuggestions;
    /**
     * Get process-specific suggestions
     */
    private getProcessSuggestions;
    /**
     * Get environment-specific suggestions
     */
    private getEnvironmentSuggestions;
    /**
     * Get configuration-specific suggestions
     */
    private getConfigurationSuggestions;
    /**
     * Get network-specific suggestions
     */
    private getNetworkSuggestions;
    /**
     * Get resource-specific suggestions
     */
    private getResourceSuggestions;
    /**
     * Execute a command and return result
     */
    private executeCommand;
}
/**
 * Global error diagnostic system instance
 */
export declare const errorDiagnosticSystem: ErrorDiagnosticSystem;
/**
 * Convenience function to diagnose Codex errors
 */
export declare function diagnoseCodexError(error: Error, context: ExecutionContext): Promise<CodexDiagnostic>;
/**
 * Convenience function to generate installation guidance
 */
export declare function generateInstallationGuidance(): Promise<InstallationGuidance>;
/**
 * Convenience function to analyze environment issues
 */
export declare function analyzeEnvironmentIssues(): Promise<EnvironmentDiagnostic[]>;
//# sourceMappingURL=error-diagnostic-system.d.ts.map