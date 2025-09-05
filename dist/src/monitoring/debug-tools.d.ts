/**
 * Debug Tools for Synchronous Audit Workflow
 *
 * This module provides debugging and inspection tools for session state,
 * audit performance analysis, and system diagnostics.
 *
 * Requirements addressed:
 * - Add debugging tools for session state inspection
 * - Performance and reliability monitoring
 * - System diagnostics and troubleshooting
 */
import { type MetricsSnapshot } from './metrics-collector.js';
import { type SystemHealthReport } from './health-checker.js';
import type { GansAuditorCodexSessionState } from '../types/gan-types.js';
/**
 * Session inspection result
 */
export interface SessionInspectionResult {
    sessionId: string;
    exists: boolean;
    isValid: boolean;
    state?: GansAuditorCodexSessionState;
    issues: string[];
    recommendations: string[];
    fileInfo?: {
        path: string;
        size: number;
        lastModified: number;
    };
}
/**
 * Session analysis result
 */
export interface SessionAnalysisResult {
    sessionId: string;
    summary: {
        totalIterations: number;
        currentLoop: number;
        isComplete: boolean;
        completionReason?: string;
        duration: number;
        averageIterationTime: number;
    };
    progressAnalysis: {
        scoreProgression: number[];
        improvementTrend: 'improving' | 'stagnant' | 'declining';
        stagnationDetected: boolean;
        stagnationLoop?: number;
    };
    performanceMetrics: {
        fastestIteration: number;
        slowestIteration: number;
        averageAuditDuration: number;
        totalAuditTime: number;
    };
    issues: string[];
    recommendations: string[];
}
/**
 * System diagnostic result
 */
export interface SystemDiagnosticResult {
    timestamp: number;
    systemInfo: {
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: NodeJS.CpuUsage;
        platform: string;
        nodeVersion: string;
    };
    sessionDirectory: {
        path: string;
        exists: boolean;
        sessionCount: number;
        totalSize: number;
        oldestSession?: string;
        newestSession?: string;
    };
    metrics: MetricsSnapshot;
    health: SystemHealthReport;
    issues: string[];
    recommendations: string[];
}
/**
 * Performance analysis result
 */
export interface PerformanceAnalysisResult {
    timeRange: {
        start: number;
        end: number;
        duration: number;
    };
    auditPerformance: {
        totalAudits: number;
        averageDuration: number;
        medianDuration: number;
        p95Duration: number;
        p99Duration: number;
        slowestAudits: Array<{
            sessionId: string;
            thoughtNumber: number;
            duration: number;
            timestamp: number;
        }>;
    };
    sessionPerformance: {
        totalSessions: number;
        averageLoops: number;
        completionRate: number;
        stagnationRate: number;
        longestSessions: Array<{
            sessionId: string;
            loops: number;
            duration: number;
        }>;
    };
    resourceUsage: {
        peakMemoryUsage: number;
        averageMemoryUsage: number;
        memoryTrend: 'increasing' | 'stable' | 'decreasing';
    };
    bottlenecks: Array<{
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
        recommendation: string;
    }>;
}
/**
 * Debug configuration
 */
export interface DebugConfig {
    sessionStateDirectory: string;
    maxInspectionResults: number;
    performanceAnalysisWindow: number;
    enableDetailedLogging: boolean;
}
/**
 * Default debug configuration
 */
export declare const DEFAULT_DEBUG_CONFIG: DebugConfig;
/**
 * Comprehensive debugging and inspection tools
 */
export declare class DebugTools {
    private readonly config;
    private readonly componentLogger;
    constructor(config?: Partial<DebugConfig>);
    /**
     * Inspect a specific session state
     */
    inspectSession(sessionId: string): Promise<SessionInspectionResult>;
    /**
     * Analyze session performance and progress
     */
    analyzeSession(sessionId: string): Promise<SessionAnalysisResult>;
    /**
     * List all sessions in the state directory
     */
    listSessions(): Promise<string[]>;
    /**
     * Find sessions matching criteria
     */
    findSessions(criteria: {
        isComplete?: boolean;
        hasStagnation?: boolean;
        minLoops?: number;
        maxLoops?: number;
        createdAfter?: number;
        createdBefore?: number;
    }): Promise<string[]>;
    /**
     * Perform comprehensive system diagnostics
     */
    performSystemDiagnostics(): Promise<SystemDiagnosticResult>;
    /**
     * Analyze performance over time
     */
    analyzePerformance(timeWindow?: number): Promise<PerformanceAnalysisResult>;
    /**
     * Export diagnostic data
     */
    exportDiagnostics(outputPath: string): Promise<void>;
    /**
     * Validate session state structure
     */
    private validateSessionState;
    /**
     * Generate recommendations based on session state
     */
    private generateSessionRecommendations;
    /**
     * Calculate improvement trend from score progression
     */
    private calculateImprovementTrend;
    /**
     * Analyze session directory
     */
    private analyzeSessionDirectory;
    /**
     * Identify performance bottlenecks
     */
    private identifyBottlenecks;
    /**
     * Get summary of recent sessions
     */
    private getRecentSessionsSummary;
}
/**
 * Global debug tools instance
 */
export declare const debugTools: DebugTools;
/**
 * Convenience functions for debugging
 */
export declare const inspectSession: (sessionId: string) => Promise<SessionInspectionResult>;
export declare const analyzeSession: (sessionId: string) => Promise<SessionAnalysisResult>;
export declare const listSessions: () => Promise<string[]>;
export declare const findSessions: (criteria: Parameters<typeof debugTools.findSessions>[0]) => Promise<string[]>;
export declare const performSystemDiagnostics: () => Promise<SystemDiagnosticResult>;
export declare const analyzePerformance: (timeWindow?: number) => Promise<PerformanceAnalysisResult>;
export declare const exportDiagnostics: (outputPath: string) => Promise<void>;
//# sourceMappingURL=debug-tools.d.ts.map