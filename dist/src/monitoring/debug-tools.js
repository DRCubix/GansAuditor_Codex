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
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { createComponentLogger } from '../utils/logger.js';
import { metricsCollector } from './metrics-collector.js';
import { healthChecker } from './health-checker.js';
/**
 * Default debug configuration
 */
export const DEFAULT_DEBUG_CONFIG = {
    sessionStateDirectory: '.mcp-gan-state',
    maxInspectionResults: 100,
    performanceAnalysisWindow: 24 * 60 * 60 * 1000, // 24 hours
    enableDetailedLogging: false,
};
// ============================================================================
// Debug Tools Implementation
// ============================================================================
/**
 * Comprehensive debugging and inspection tools
 */
export class DebugTools {
    config;
    componentLogger;
    constructor(config = {}) {
        this.config = { ...DEFAULT_DEBUG_CONFIG, ...config };
        this.componentLogger = createComponentLogger('debug-tools', {
            enabled: this.config.enableDetailedLogging,
        });
        this.componentLogger.info('Debug tools initialized', {
            sessionDirectory: this.config.sessionStateDirectory,
            maxResults: this.config.maxInspectionResults,
        });
    }
    // ============================================================================
    // Session Inspection Methods
    // ============================================================================
    /**
     * Inspect a specific session state
     */
    async inspectSession(sessionId) {
        this.componentLogger.debug(`Inspecting session: ${sessionId}`);
        const result = {
            sessionId,
            exists: false,
            isValid: false,
            issues: [],
            recommendations: [],
        };
        try {
            const sessionPath = join(this.config.sessionStateDirectory, `${sessionId}.json`);
            // Check if session file exists
            try {
                const fileStats = await stat(sessionPath);
                result.exists = true;
                result.fileInfo = {
                    path: sessionPath,
                    size: fileStats.size,
                    lastModified: fileStats.mtime.getTime(),
                };
            }
            catch (error) {
                result.issues.push('Session file does not exist');
                result.recommendations.push('Verify session ID and check if session was created');
                return result;
            }
            // Read and parse session state
            try {
                const sessionData = await readFile(sessionPath, 'utf-8');
                const sessionState = JSON.parse(sessionData);
                result.state = sessionState;
                result.isValid = true;
                // Validate session state structure
                const validationIssues = this.validateSessionState(sessionState);
                result.issues.push(...validationIssues);
                if (validationIssues.length > 0) {
                    result.isValid = false;
                    result.recommendations.push('Session state has validation issues - consider resetting session');
                }
                // Generate recommendations based on session state
                const recommendations = this.generateSessionRecommendations(sessionState);
                result.recommendations.push(...recommendations);
            }
            catch (error) {
                result.issues.push(`Failed to parse session data: ${error.message}`);
                result.recommendations.push('Session file may be corrupted - consider deleting and recreating');
                return result;
            }
        }
        catch (error) {
            result.issues.push(`Session inspection failed: ${error.message}`);
            result.recommendations.push('Check file system permissions and session directory');
        }
        return result;
    }
    /**
     * Analyze session performance and progress
     */
    async analyzeSession(sessionId) {
        this.componentLogger.debug(`Analyzing session: ${sessionId}`);
        const inspection = await this.inspectSession(sessionId);
        if (!inspection.exists || !inspection.state) {
            throw new Error(`Cannot analyze session ${sessionId}: session not found or invalid`);
        }
        const state = inspection.state;
        const iterations = state.iterations || [];
        // Calculate summary metrics
        const summary = {
            totalIterations: iterations.length,
            currentLoop: state.currentLoop || 0,
            isComplete: state.isComplete || false,
            completionReason: state.completionReason,
            duration: state.updatedAt - state.createdAt,
            averageIterationTime: iterations.length > 0
                ? (state.updatedAt - state.createdAt) / iterations.length
                : 0,
        };
        // Analyze progress
        const scores = iterations.map(iter => iter.auditResult?.overall || 0);
        const progressAnalysis = {
            scoreProgression: scores,
            improvementTrend: this.calculateImprovementTrend(scores),
            stagnationDetected: !!state.stagnationInfo?.isStagnant,
            stagnationLoop: state.stagnationInfo?.detectedAtLoop,
        };
        // Calculate performance metrics
        const auditDurations = iterations
            .map(iter => iter.timestamp)
            .slice(1)
            .map((timestamp, index) => timestamp - iterations[index].timestamp)
            .filter(duration => duration > 0);
        const performanceMetrics = {
            fastestIteration: auditDurations.length > 0 ? Math.min(...auditDurations) : 0,
            slowestIteration: auditDurations.length > 0 ? Math.max(...auditDurations) : 0,
            averageAuditDuration: auditDurations.length > 0
                ? auditDurations.reduce((sum, duration) => sum + duration, 0) / auditDurations.length
                : 0,
            totalAuditTime: auditDurations.reduce((sum, duration) => sum + duration, 0),
        };
        // Identify issues and generate recommendations
        const issues = [];
        const recommendations = [];
        if (summary.totalIterations > 20) {
            issues.push('Session has exceeded 20 iterations');
            recommendations.push('Consider reviewing completion criteria or terminating session');
        }
        if (progressAnalysis.improvementTrend === 'declining') {
            issues.push('Session shows declining performance trend');
            recommendations.push('Review recent changes and consider alternative approaches');
        }
        if (progressAnalysis.stagnationDetected) {
            issues.push('Stagnation detected in session progress');
            recommendations.push('Consider adjusting similarity thresholds or providing different guidance');
        }
        if (performanceMetrics.averageAuditDuration > 30000) {
            issues.push('Slow audit performance detected');
            recommendations.push('Consider optimizing audit configuration or enabling caching');
        }
        return {
            sessionId,
            summary,
            progressAnalysis,
            performanceMetrics,
            issues,
            recommendations,
        };
    }
    /**
     * List all sessions in the state directory
     */
    async listSessions() {
        try {
            const files = await readdir(this.config.sessionStateDirectory);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => basename(file, '.json'))
                .slice(0, this.config.maxInspectionResults);
        }
        catch (error) {
            this.componentLogger.error('Failed to list sessions', error);
            return [];
        }
    }
    /**
     * Find sessions matching criteria
     */
    async findSessions(criteria) {
        const allSessions = await this.listSessions();
        const matchingSessions = [];
        for (const sessionId of allSessions) {
            try {
                const inspection = await this.inspectSession(sessionId);
                if (!inspection.exists || !inspection.state) {
                    continue;
                }
                const state = inspection.state;
                // Apply filters
                if (criteria.isComplete !== undefined && state.isComplete !== criteria.isComplete) {
                    continue;
                }
                if (criteria.hasStagnation !== undefined && !!state.stagnationInfo?.isStagnant !== criteria.hasStagnation) {
                    continue;
                }
                if (criteria.minLoops !== undefined && state.currentLoop < criteria.minLoops) {
                    continue;
                }
                if (criteria.maxLoops !== undefined && state.currentLoop > criteria.maxLoops) {
                    continue;
                }
                if (criteria.createdAfter !== undefined && state.createdAt < criteria.createdAfter) {
                    continue;
                }
                if (criteria.createdBefore !== undefined && state.createdAt > criteria.createdBefore) {
                    continue;
                }
                matchingSessions.push(sessionId);
            }
            catch (error) {
                this.componentLogger.warn(`Failed to inspect session ${sessionId}`, { error: error.message });
            }
        }
        return matchingSessions.slice(0, this.config.maxInspectionResults);
    }
    // ============================================================================
    // System Diagnostics Methods
    // ============================================================================
    /**
     * Perform comprehensive system diagnostics
     */
    async performSystemDiagnostics() {
        this.componentLogger.debug('Performing system diagnostics');
        const timestamp = Date.now();
        const issues = [];
        const recommendations = [];
        // Gather system information
        const systemInfo = {
            uptime: process.uptime() * 1000, // Convert to milliseconds
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            platform: process.platform,
            nodeVersion: process.version,
        };
        // Analyze session directory
        const sessionDirectory = await this.analyzeSessionDirectory();
        // Get current metrics and health
        const metrics = metricsCollector.getMetricsSnapshot();
        const health = await healthChecker.performHealthCheck();
        // Identify system-level issues
        if (systemInfo.memoryUsage.heapUsed / systemInfo.memoryUsage.heapTotal > 0.8) {
            issues.push('High memory usage detected');
            recommendations.push('Consider restarting the service or optimizing memory usage');
        }
        if (sessionDirectory.sessionCount > 1000) {
            issues.push('Large number of session files detected');
            recommendations.push('Consider implementing session cleanup or archiving');
        }
        if (metrics.health.errorRate > 5) {
            issues.push('High error rate detected');
            recommendations.push('Review error logs and investigate root causes');
        }
        return {
            timestamp,
            systemInfo,
            sessionDirectory,
            metrics,
            health,
            issues,
            recommendations,
        };
    }
    /**
     * Analyze performance over time
     */
    async analyzePerformance(timeWindow) {
        const window = timeWindow || this.config.performanceAnalysisWindow;
        const endTime = Date.now();
        const startTime = endTime - window;
        this.componentLogger.debug('Analyzing performance', { startTime, endTime, window });
        const metrics = metricsCollector.getMetricsSnapshot();
        // Analyze audit performance
        const auditPerformance = {
            totalAudits: metrics.completion.totalAudits,
            averageDuration: metrics.performance.averageAuditDuration,
            medianDuration: metrics.performance.medianAuditDuration,
            p95Duration: metrics.performance.p95AuditDuration,
            p99Duration: metrics.performance.p99AuditDuration,
            slowestAudits: [], // Would need to track individual audit records
        };
        // Analyze session performance
        const sessionPerformance = {
            totalSessions: metrics.sessions.totalSessions,
            averageLoops: metrics.loops.averageLoopsPerSession,
            completionRate: metrics.completion.completionRate,
            stagnationRate: metrics.loops.stagnationRate,
            longestSessions: [], // Would need to track individual session records
        };
        // Analyze resource usage
        const memUsage = process.memoryUsage();
        const resourceUsage = {
            peakMemoryUsage: memUsage.heapUsed,
            averageMemoryUsage: memUsage.heapUsed, // Simplified - would need historical data
            memoryTrend: 'stable', // Would need historical data to determine trend
        };
        // Identify bottlenecks
        const bottlenecks = this.identifyBottlenecks(metrics);
        return {
            timeRange: {
                start: startTime,
                end: endTime,
                duration: window,
            },
            auditPerformance,
            sessionPerformance,
            resourceUsage,
            bottlenecks,
        };
    }
    /**
     * Export diagnostic data
     */
    async exportDiagnostics(outputPath) {
        this.componentLogger.info(`Exporting diagnostics to: ${outputPath}`);
        const diagnostics = {
            timestamp: Date.now(),
            systemDiagnostics: await this.performSystemDiagnostics(),
            performanceAnalysis: await this.analyzePerformance(),
            recentSessions: await this.getRecentSessionsSummary(10),
            healthReport: await healthChecker.performHealthCheck(),
            metricsSnapshot: metricsCollector.getMetricsSnapshot(),
        };
        await writeFile(outputPath, JSON.stringify(diagnostics, null, 2), 'utf-8');
        this.componentLogger.info('Diagnostics exported successfully');
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    /**
     * Validate session state structure
     */
    validateSessionState(state) {
        const issues = [];
        if (!state.id) {
            issues.push('Missing session ID');
        }
        if (!state.createdAt || !state.updatedAt) {
            issues.push('Missing timestamp information');
        }
        if (state.createdAt > state.updatedAt) {
            issues.push('Invalid timestamp order (created after updated)');
        }
        if (!Array.isArray(state.iterations)) {
            issues.push('Invalid iterations array');
        }
        if (state.currentLoop < 0) {
            issues.push('Invalid current loop count');
        }
        if (state.iterations && state.iterations.length !== state.currentLoop) {
            issues.push('Mismatch between iteration count and current loop');
        }
        return issues;
    }
    /**
     * Generate recommendations based on session state
     */
    generateSessionRecommendations(state) {
        const recommendations = [];
        if (state.currentLoop > 15 && !state.isComplete) {
            recommendations.push('Session has many iterations - consider reviewing completion criteria');
        }
        if (state.stagnationInfo?.isStagnant) {
            recommendations.push('Stagnation detected - consider alternative approaches or termination');
        }
        if (state.iterations && state.iterations.length > 0) {
            const lastIteration = state.iterations[state.iterations.length - 1];
            const timeSinceLastUpdate = Date.now() - lastIteration.timestamp;
            if (timeSinceLastUpdate > 30 * 60 * 1000) { // 30 minutes
                recommendations.push('Session has been inactive for a long time - consider cleanup');
            }
        }
        return recommendations;
    }
    /**
     * Calculate improvement trend from score progression
     */
    calculateImprovementTrend(scores) {
        if (scores.length < 3) {
            return 'stagnant';
        }
        const recentScores = scores.slice(-5); // Last 5 scores
        const trend = recentScores.reduce((acc, score, index) => {
            if (index === 0)
                return acc;
            return acc + (score - recentScores[index - 1]);
        }, 0);
        if (trend > 5)
            return 'improving';
        if (trend < -5)
            return 'declining';
        return 'stagnant';
    }
    /**
     * Analyze session directory
     */
    async analyzeSessionDirectory() {
        const result = {
            path: this.config.sessionStateDirectory,
            exists: false,
            sessionCount: 0,
            totalSize: 0,
            oldestSession: undefined,
            newestSession: undefined,
        };
        try {
            const files = await readdir(this.config.sessionStateDirectory);
            result.exists = true;
            const sessionFiles = files.filter(file => file.endsWith('.json'));
            result.sessionCount = sessionFiles.length;
            let oldestTime = Infinity;
            let newestTime = 0;
            for (const file of sessionFiles) {
                const filePath = join(this.config.sessionStateDirectory, file);
                const stats = await stat(filePath);
                result.totalSize += stats.size;
                if (stats.mtime.getTime() < oldestTime) {
                    oldestTime = stats.mtime.getTime();
                    result.oldestSession = basename(file, '.json');
                }
                if (stats.mtime.getTime() > newestTime) {
                    newestTime = stats.mtime.getTime();
                    result.newestSession = basename(file, '.json');
                }
            }
        }
        catch (error) {
            // Directory doesn't exist or can't be read
        }
        return result;
    }
    /**
     * Identify performance bottlenecks
     */
    identifyBottlenecks(metrics) {
        const bottlenecks = [];
        if (metrics.performance.averageAuditDuration > 10000) {
            bottlenecks.push({
                type: 'audit-performance',
                description: 'Slow audit response times detected',
                severity: 'high',
                recommendation: 'Enable caching, optimize audit configuration, or scale resources',
            });
        }
        if (metrics.loops.stagnationRate > 30) {
            bottlenecks.push({
                type: 'stagnation',
                description: 'High stagnation rate in sessions',
                severity: 'medium',
                recommendation: 'Adjust similarity thresholds or improve completion criteria',
            });
        }
        if (metrics.completion.completionRate < 70) {
            bottlenecks.push({
                type: 'completion',
                description: 'Low completion rate for audits',
                severity: 'high',
                recommendation: 'Review audit criteria, timeout settings, and service availability',
            });
        }
        if (metrics.health.memoryUsage.percentage > 80) {
            bottlenecks.push({
                type: 'memory',
                description: 'High memory usage detected',
                severity: 'medium',
                recommendation: 'Optimize memory usage, implement cleanup, or increase available memory',
            });
        }
        return bottlenecks;
    }
    /**
     * Get summary of recent sessions
     */
    async getRecentSessionsSummary(count) {
        const sessions = await this.listSessions();
        const summaries = [];
        for (const sessionId of sessions.slice(0, count)) {
            try {
                const inspection = await this.inspectSession(sessionId);
                if (inspection.exists && inspection.state) {
                    summaries.push({
                        sessionId,
                        loops: inspection.state.currentLoop,
                        isComplete: inspection.state.isComplete,
                        lastUpdated: inspection.state.updatedAt,
                    });
                }
            }
            catch (error) {
                // Skip sessions that can't be inspected
            }
        }
        // Sort by last updated (most recent first)
        return summaries.sort((a, b) => b.lastUpdated - a.lastUpdated);
    }
}
// ============================================================================
// Global Debug Tools Instance
// ============================================================================
/**
 * Global debug tools instance
 */
export const debugTools = new DebugTools();
/**
 * Convenience functions for debugging
 */
export const inspectSession = (sessionId) => debugTools.inspectSession(sessionId);
export const analyzeSession = (sessionId) => debugTools.analyzeSession(sessionId);
export const listSessions = () => debugTools.listSessions();
export const findSessions = (criteria) => debugTools.findSessions(criteria);
export const performSystemDiagnostics = () => debugTools.performSystemDiagnostics();
export const analyzePerformance = (timeWindow) => debugTools.analyzePerformance(timeWindow);
export const exportDiagnostics = (outputPath) => debugTools.exportDiagnostics(outputPath);
//# sourceMappingURL=debug-tools.js.map