/**
 * Session Manager for GAN Auditor Integration
 *
 * Implements file-based persistence for audit sessions in .mcp-gan-state directory.
 * Provides session creation, loading, updating, and cleanup functionality with
 * error recovery for corrupted session files.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG } from '../types/gan-types.js';
import { SessionNotFoundError, SessionCorruptionError, SessionPersistenceError, DirectoryCreationError, } from '../types/error-types.js';
import { createComponentLogger } from '../utils/logger.js';
import { withRetry } from '../utils/error-handler.js';
/**
 * Default configuration for SessionManager
 */
export const DEFAULT_SESSION_MANAGER_CONFIG = {
    stateDirectory: '.mcp-gan-state',
    maxSessionAge: 24 * 60 * 60 * 1000, // 24 hours
    cleanupInterval: 60 * 60 * 1000, // 1 hour
};
/**
 * SessionManager implementation with file-based persistence
 *
 * Requirement 3.1: Session creation and management
 * Requirement 3.2: File-based persistence in .mcp-gan-state directory
 * Requirement 3.3: Unique session ID generation
 * Requirement 3.4: Session state validation and error recovery
 * Requirement 3.5: Session cleanup functionality
 */
export class SessionManager {
    config;
    stateDir;
    cleanupTimer;
    componentLogger;
    constructor(config = {}) {
        this.config = { ...DEFAULT_SESSION_MANAGER_CONFIG, ...config };
        this.stateDir = this.resolveStateDirectory();
        this.componentLogger = createComponentLogger('session-manager');
        this.startCleanupTimer();
    }
    /**
     * Resolve the absolute path to the state directory
     */
    resolveStateDirectory() {
        const { stateDirectory } = this.config;
        // If absolute path, use as-is
        if (stateDirectory.startsWith('/') || stateDirectory.match(/^[A-Za-z]:/)) {
            return stateDirectory;
        }
        // If starts with ~, resolve to home directory
        if (stateDirectory.startsWith('~/')) {
            return join(homedir(), stateDirectory.slice(2));
        }
        // Otherwise, resolve relative to current working directory
        return join(process.cwd(), stateDirectory);
    }
    /**
     * Ensure state directory exists
     */
    async ensureStateDirectory() {
        try {
            await fs.access(this.stateDir);
        }
        catch {
            try {
                await fs.mkdir(this.stateDir, { recursive: true });
                this.componentLogger.debug(`Created state directory: ${this.stateDir}`);
            }
            catch (error) {
                throw new DirectoryCreationError(this.stateDir, error instanceof Error ? error.message : String(error));
            }
        }
    }
    /**
     * Get file path for session
     */
    getSessionFilePath(sessionId) {
        return join(this.stateDir, `${sessionId}.json`);
    }
    /**
     * Generate unique session ID using hash of cwd + username + timestamp
     * Requirement 3.3: Unique session ID generation
     */
    generateSessionId(cwd, username) {
        const currentCwd = cwd || process.cwd();
        const currentUsername = username || process.env.USER || process.env.USERNAME || 'unknown';
        const timestamp = Date.now();
        const input = `${currentCwd}:${currentUsername}:${timestamp}`;
        const hash = createHash('sha256').update(input).digest('hex');
        // Use first 16 characters for readability while maintaining uniqueness
        return hash.substring(0, 16);
    }
    /**
     * Validate session state structure
     * Requirement 3.4: Session state validation
     */
    validateSessionState(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        const required = ['id', 'config', 'history', 'createdAt', 'updatedAt'];
        for (const field of required) {
            if (!(field in data)) {
                return false;
            }
        }
        // Validate config structure
        if (!data.config || typeof data.config !== 'object') {
            return false;
        }
        // Validate history is array
        if (!Array.isArray(data.history)) {
            return false;
        }
        // Validate timestamps
        if (typeof data.createdAt !== 'number' || typeof data.updatedAt !== 'number') {
            return false;
        }
        return true;
    }
    /**
     * Sanitize and repair session state
     * Requirement 3.4: Error recovery for corrupted files
     */
    sanitizeSessionState(data, sessionId) {
        const now = Date.now();
        return {
            id: sessionId,
            config: { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG, ...(data.config || {}) },
            history: Array.isArray(data.history) ? data.history : [],
            lastGan: data.lastGan || undefined,
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : now,
            updatedAt: now,
            // Enhanced fields for synchronous workflow
            iterations: Array.isArray(data.iterations) ? data.iterations : [],
            currentLoop: typeof data.currentLoop === 'number' ? data.currentLoop : 0,
            isComplete: typeof data.isComplete === 'boolean' ? data.isComplete : false,
            codexContextActive: typeof data.codexContextActive === 'boolean' ? data.codexContextActive : false,
            loopId: data.loopId || undefined,
            codexContextId: data.codexContextId || undefined,
            completionReason: data.completionReason || undefined,
            stagnationInfo: data.stagnationInfo || undefined,
        };
    }
    /**
     * Get existing session or return null
     * Requirement 3.1: Session loading
     */
    async getSession(id) {
        try {
            const filePath = this.getSessionFilePath(id);
            const content = await withRetry(() => fs.readFile(filePath, 'utf-8'), 'session-file-read', { maxAttempts: 2, retryableErrors: ['filesystem'] });
            let data;
            try {
                data = JSON.parse(content);
            }
            catch (parseError) {
                throw new SessionCorruptionError(id, 'Invalid JSON format');
            }
            if (this.validateSessionState(data)) {
                this.componentLogger.debug(`Successfully loaded session ${id}`);
                return data;
            }
            else {
                // Attempt to recover corrupted session
                this.componentLogger.warn(`Session ${id} has invalid structure, attempting recovery`);
                const recovered = this.sanitizeSessionState(data, id);
                await this.updateSession(recovered);
                return recovered;
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, return null
                this.componentLogger.debug(`Session ${id} not found`);
                return null;
            }
            // Handle other errors with recovery attempt
            if (error instanceof SessionCorruptionError) {
                this.componentLogger.warn(`Session ${id} is corrupted, attempting recovery`);
                try {
                    const recovered = this.sanitizeSessionState({}, id);
                    await this.updateSession(recovered);
                    return recovered;
                }
                catch (recoveryError) {
                    this.componentLogger.error(`Failed to recover session ${id}`, recoveryError);
                    return null;
                }
            }
            // For other errors, log and return null
            this.componentLogger.error(`Failed to load session ${id}`, error);
            return null;
        }
    }
    /**
     * Create new session with configuration
     * Requirement 3.1: Session creation
     */
    async createSession(id, config) {
        try {
            await this.ensureStateDirectory();
            const now = Date.now();
            const session = {
                id,
                config: { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG, ...config },
                history: [],
                createdAt: now,
                updatedAt: now,
                // Enhanced fields for synchronous workflow
                iterations: [],
                currentLoop: 0,
                isComplete: false,
                codexContextActive: false,
            };
            await this.updateSession(session);
            this.componentLogger.info(`Created new session ${id}`);
            return session;
        }
        catch (error) {
            this.componentLogger.error(`Failed to create session ${id}`, error);
            throw new SessionPersistenceError(id, 'create', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Update existing session state
     * Requirement 3.2: File-based persistence
     */
    async updateSession(session) {
        try {
            await this.ensureStateDirectory();
            const updatedSession = {
                ...session,
                updatedAt: Date.now(),
            };
            const filePath = this.getSessionFilePath(session.id);
            const content = JSON.stringify(updatedSession, null, 2);
            await withRetry(() => fs.writeFile(filePath, content, 'utf-8'), 'session-file-write', { maxAttempts: 2, retryableErrors: ['filesystem'] });
            this.componentLogger.debug(`Updated session ${session.id}`);
        }
        catch (error) {
            this.componentLogger.error(`Failed to update session ${session.id}`, error);
            throw new SessionPersistenceError(session.id, 'update', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Add audit result to session history
     */
    async addAuditToHistory(sessionId, thoughtNumber, review, config) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }
            const historyEntry = {
                timestamp: Date.now(),
                thoughtNumber,
                review,
                config,
            };
            session.history.push(historyEntry);
            session.lastGan = review;
            await this.updateSession(session);
            this.componentLogger.debug(`Added audit to history for session ${sessionId}, thought ${thoughtNumber}`);
        }
        catch (error) {
            if (error instanceof SessionNotFoundError) {
                throw error;
            }
            this.componentLogger.error(`Failed to add audit to history for session ${sessionId}`, error);
            throw new SessionPersistenceError(sessionId, 'add-audit-history', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Record Codex failure in session state
     * Requirements: 4.1, 4.5 - Handle Codex failures properly without fallbacks
     */
    async recordCodexFailure(sessionId, thoughtNumber, error, context) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }
            // Add failure information to session metadata
            if (!session.codexFailures) {
                session.codexFailures = [];
            }
            session.codexFailures.push({
                timestamp: Date.now(),
                thoughtNumber,
                errorType: error.constructor.name,
                errorMessage: error.message,
                context: context || {},
            });
            // Mark session as having Codex issues
            session.hasCodexIssues = true;
            session.lastCodexFailure = Date.now();
            session.updatedAt = Date.now();
            await this.updateSession(session);
            this.componentLogger.warn(`Recorded Codex failure for session ${sessionId}`, {
                thoughtNumber,
                errorType: error.constructor.name,
                errorMessage: error.message
            });
        }
        catch (updateError) {
            this.componentLogger.error(`Failed to record Codex failure for session ${sessionId}`, updateError);
            // Don't throw here - failure to record failure shouldn't break the main flow
        }
    }
    /**
     * Check if session has recent Codex failures
     * Requirements: 4.1, 4.5 - Track Codex failure patterns
     */
    async hasRecentCodexFailures(sessionId, withinMinutes = 10) {
        try {
            const session = await this.getSession(sessionId);
            if (!session || !session.lastCodexFailure) {
                return false;
            }
            const cutoffTime = Date.now() - (withinMinutes * 60 * 1000);
            return session.lastCodexFailure > cutoffTime;
        }
        catch (error) {
            this.componentLogger.warn(`Failed to check recent Codex failures for session ${sessionId}`, error);
            return false;
        }
    }
    /**
     * Get Codex failure summary for session
     * Requirements: 4.1, 4.5 - Provide diagnostic information for Codex failures
     */
    async getCodexFailureSummary(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            if (!session || !session.codexFailures) {
                return {
                    totalFailures: 0,
                    recentFailures: 0,
                    commonErrorTypes: [],
                };
            }
            const recentCutoff = Date.now() - (10 * 60 * 1000); // 10 minutes
            const recentFailures = session.codexFailures.filter(f => f.timestamp > recentCutoff);
            const errorTypeCounts = session.codexFailures.reduce((acc, failure) => {
                acc[failure.errorType] = (acc[failure.errorType] || 0) + 1;
                return acc;
            }, {});
            const commonErrorTypes = Object.entries(errorTypeCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([type]) => type);
            return {
                totalFailures: session.codexFailures.length,
                recentFailures: recentFailures.length,
                lastFailureTime: session.lastCodexFailure,
                commonErrorTypes,
            };
        }
        catch (error) {
            this.componentLogger.warn(`Failed to get Codex failure summary for session ${sessionId}`, error);
            return {
                totalFailures: 0,
                recentFailures: 0,
                commonErrorTypes: [],
            };
        }
    }
    /**
     * Clean up old or corrupted sessions
     * Requirement 3.5: Session cleanup
     */
    async cleanupSessions(maxAge) {
        const ageLimit = maxAge || this.config.maxSessionAge;
        const cutoffTime = Date.now() - ageLimit;
        try {
            await this.ensureStateDirectory();
            const files = await fs.readdir(this.stateDir);
            let cleanedCount = 0;
            for (const file of files) {
                if (!file.endsWith('.json')) {
                    continue;
                }
                const filePath = join(this.stateDir, file);
                try {
                    const stats = await fs.stat(filePath);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const data = JSON.parse(content);
                    // Remove if file is too old or session is invalid
                    const shouldRemove = stats.mtime.getTime() < cutoffTime ||
                        !this.validateSessionState(data) ||
                        (data.updatedAt && data.updatedAt < cutoffTime);
                    if (shouldRemove) {
                        await fs.unlink(filePath);
                        cleanedCount++;
                        this.componentLogger.debug(`Cleaned up session file: ${file}`);
                    }
                }
                catch (error) {
                    // Remove corrupted files that can't be parsed
                    this.componentLogger.warn(`Removing corrupted session file ${file}`, error);
                    try {
                        await fs.unlink(filePath);
                        cleanedCount++;
                    }
                    catch (unlinkError) {
                        this.componentLogger.error(`Failed to remove corrupted session file ${file}`, unlinkError);
                    }
                }
            }
            if (cleanedCount > 0) {
                this.componentLogger.info(`Cleaned up ${cleanedCount} session files`);
            }
        }
        catch (error) {
            this.componentLogger.error('Failed to cleanup sessions', error);
            // Don't throw - cleanup is non-critical
        }
    }
    /**
     * Start automatic cleanup timer
     */
    startCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cleanupTimer = setInterval(() => {
            this.cleanupSessions().catch(error => {
                this.componentLogger.error('Automatic session cleanup failed', error);
            });
        }, this.config.cleanupInterval);
        this.componentLogger.debug(`Started automatic cleanup timer (interval: ${this.config.cleanupInterval}ms)`);
    }
    /**
     * Stop automatic cleanup and release resources
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }
    /**
     * Get all active sessions (for debugging/monitoring)
     */
    async getAllSessions() {
        try {
            await this.ensureStateDirectory();
            const files = await fs.readdir(this.stateDir);
            const sessions = [];
            for (const file of files) {
                if (!file.endsWith('.json')) {
                    continue;
                }
                const sessionId = file.replace('.json', '');
                const session = await this.getSession(sessionId);
                if (session) {
                    sessions.push(session);
                }
            }
            return sessions;
        }
        catch (error) {
            console.error('Failed to get all sessions:', error);
            return [];
        }
    }
    /**
     * Delete specific session
     */
    async deleteSession(sessionId) {
        try {
            const filePath = this.getSessionFilePath(sessionId);
            await fs.unlink(filePath);
            return true;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return false; // Session didn't exist
            }
            throw error;
        }
    }
    // ============================================================================
    // Prompt-Driven Audit Integration Methods
    // ============================================================================
    /**
     * Add workflow step result to session history
     * Requirement 6.1: Add audit history tracking with workflow step results
     */
    async addWorkflowStepResult(sessionId, stepName, stepResult, thoughtNumber) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }
            // Initialize workflow history if not present
            if (!session.workflowHistory) {
                session.workflowHistory = [];
            }
            const workflowEntry = {
                timestamp: Date.now(),
                thoughtNumber,
                stepName,
                stepResult,
                sessionLoop: session.currentLoop,
            };
            session.workflowHistory.push(workflowEntry);
            // Keep only last 100 workflow entries to prevent unbounded growth
            if (session.workflowHistory.length > 100) {
                session.workflowHistory = session.workflowHistory.slice(-100);
            }
            await this.updateSession(session);
            this.componentLogger.debug(`Added workflow step result for session ${sessionId}`, {
                stepName,
                thoughtNumber,
                currentLoop: session.currentLoop,
            });
        }
        catch (error) {
            this.componentLogger.error(`Failed to add workflow step result for session ${sessionId}`, error);
            throw new SessionPersistenceError(sessionId, 'add-workflow-step', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Track quality progression across iterations
     * Requirement 6.2: Implement quality progression tracking across iterations
     */
    async trackQualityProgression(sessionId, qualityMetrics) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }
            // Initialize quality progression if not present
            if (!session.qualityProgression) {
                session.qualityProgression = [];
            }
            session.qualityProgression.push(qualityMetrics);
            // Keep only last 50 quality entries
            if (session.qualityProgression.length > 50) {
                session.qualityProgression = session.qualityProgression.slice(-50);
            }
            // Update session completion status based on quality metrics
            if (qualityMetrics.completionAnalysis) {
                session.isComplete = qualityMetrics.completionAnalysis.status === 'completed';
                session.completionReason = qualityMetrics.completionAnalysis.reason;
            }
            await this.updateSession(session);
            this.componentLogger.debug(`Tracked quality progression for session ${sessionId}`, {
                overallScore: qualityMetrics.overallScore,
                completionStatus: qualityMetrics.completionAnalysis?.status,
                thoughtNumber: qualityMetrics.thoughtNumber,
            });
        }
        catch (error) {
            this.componentLogger.error(`Failed to track quality progression for session ${sessionId}`, error);
            throw new SessionPersistenceError(sessionId, 'track-quality-progression', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Store prompt context for session continuity
     * Requirement 6.3: Create session state persistence for prompt context
     */
    async storePromptContext(sessionId, promptContext) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }
            // Store prompt context with timestamp
            session.promptContext = {
                ...promptContext,
                storedAt: Date.now(),
                sessionLoop: session.currentLoop,
            };
            await this.updateSession(session);
            this.componentLogger.debug(`Stored prompt context for session ${sessionId}`, {
                promptVersion: promptContext.promptVersion,
                configHash: promptContext.configHash,
                currentLoop: session.currentLoop,
            });
        }
        catch (error) {
            this.componentLogger.error(`Failed to store prompt context for session ${sessionId}`, error);
            throw new SessionPersistenceError(sessionId, 'store-prompt-context', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Retrieve prompt context for session continuity
     * Requirement 6.3: Create session state persistence for prompt context
     */
    async getPromptContext(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            if (!session || !session.promptContext) {
                return null;
            }
            this.componentLogger.debug(`Retrieved prompt context for session ${sessionId}`, {
                promptVersion: session.promptContext.promptVersion,
                storedAt: session.promptContext.storedAt,
            });
            return session.promptContext;
        }
        catch (error) {
            this.componentLogger.error(`Failed to get prompt context for session ${sessionId}`, error);
            return null;
        }
    }
    /**
     * Analyze audit progress across iterations
     * Requirement 6.2: Implement quality progression tracking across iterations
     */
    async analyzeAuditProgress(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }
            const qualityProgression = session.qualityProgression || [];
            const workflowHistory = session.workflowHistory || [];
            // Calculate score progression
            const scoreProgression = qualityProgression.map(entry => ({
                thoughtNumber: entry.thoughtNumber,
                score: entry.overallScore,
                timestamp: entry.timestamp,
            }));
            // Calculate average improvement
            let averageImprovement = 0;
            if (scoreProgression.length > 1) {
                const improvements = [];
                for (let i = 1; i < scoreProgression.length; i++) {
                    improvements.push(scoreProgression[i].score - scoreProgression[i - 1].score);
                }
                averageImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
            }
            // Detect stagnation
            const isStagnant = this.detectProgressStagnation(scoreProgression);
            // Analyze workflow completion rates
            const workflowStepStats = this.analyzeWorkflowSteps(workflowHistory);
            // Calculate completion probability
            const completionProbability = this.calculateCompletionProbability(scoreProgression, session.currentLoop, isStagnant);
            const analysis = {
                sessionId,
                currentLoop: session.currentLoop,
                totalIterations: qualityProgression.length,
                scoreProgression,
                averageImprovement,
                isStagnant,
                stagnationRisk: isStagnant ? 0.8 : Math.max(0, 0.5 - averageImprovement / 10),
                workflowStepStats,
                completionProbability,
                recommendedActions: this.generateProgressRecommendations(scoreProgression, isStagnant, averageImprovement, session.currentLoop),
            };
            this.componentLogger.debug(`Analyzed audit progress for session ${sessionId}`, {
                currentLoop: analysis.currentLoop,
                averageImprovement: analysis.averageImprovement,
                isStagnant: analysis.isStagnant,
                completionProbability: analysis.completionProbability,
            });
            return analysis;
        }
        catch (error) {
            this.componentLogger.error(`Failed to analyze audit progress for session ${sessionId}`, error);
            throw new SessionPersistenceError(sessionId, 'analyze-audit-progress', error instanceof Error ? error.message : String(error));
        }
    }
    /**
     * Get session statistics for monitoring
     * Requirement 6.1: Add audit history tracking with workflow step results
     */
    async getSessionStatistics(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }
            const now = Date.now();
            const sessionDuration = now - session.createdAt;
            const lastActivity = session.updatedAt;
            const timeSinceLastActivity = now - lastActivity;
            const qualityProgression = session.qualityProgression || [];
            const workflowHistory = session.workflowHistory || [];
            // Calculate quality statistics
            const scores = qualityProgression.map(entry => entry.overallScore);
            const qualityStats = {
                currentScore: scores.length > 0 ? scores[scores.length - 1] : 0,
                highestScore: scores.length > 0 ? Math.max(...scores) : 0,
                lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
                averageScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
                scoreImprovement: scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0,
            };
            // Calculate workflow statistics
            const workflowStats = {
                totalSteps: workflowHistory.length,
                uniqueSteps: new Set(workflowHistory.map(entry => entry.stepName)).size,
                averageStepDuration: this.calculateAverageStepDuration(workflowHistory),
                mostFrequentStep: this.getMostFrequentStep(workflowHistory),
            };
            const statistics = {
                sessionId,
                sessionDuration,
                lastActivity,
                timeSinceLastActivity,
                currentLoop: session.currentLoop,
                isComplete: session.isComplete,
                completionReason: session.completionReason,
                qualityStats,
                workflowStats,
                memoryUsage: this.estimateSessionMemoryUsage(session),
            };
            return statistics;
        }
        catch (error) {
            this.componentLogger.error(`Failed to get session statistics for ${sessionId}`, error);
            throw new SessionPersistenceError(sessionId, 'get-session-statistics', error instanceof Error ? error.message : String(error));
        }
    }
    // ============================================================================
    // Synchronous Workflow Methods (Enhanced implementations)
    // ============================================================================
    /**
     * Get or create session with LOOP_ID support (enhanced implementation)
     */
    async getOrCreateSession(sessionId, loopId) {
        let session = await this.getSession(sessionId);
        if (!session) {
            const config = { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG };
            session = await this.createSession(sessionId, config);
        }
        // Update loop ID if provided
        if (loopId && session.loopId !== loopId) {
            session.loopId = loopId;
            await this.updateSession(session);
        }
        return session;
    }
    /**
     * Analyze progress across iterations (enhanced implementation)
     */
    async analyzeProgress(sessionId) {
        const analysis = await this.analyzeAuditProgress(sessionId);
        return {
            currentLoop: analysis.currentLoop,
            scoreProgression: analysis.scoreProgression.map(entry => entry.score),
            averageImprovement: analysis.averageImprovement,
            isStagnant: analysis.isStagnant,
        };
    }
    /**
     * Detect stagnation in session responses (enhanced implementation)
     */
    async detectStagnation(sessionId) {
        const analysis = await this.analyzeAuditProgress(sessionId);
        if (analysis.isStagnant) {
            const recentScores = analysis.scoreProgression.slice(-5).map(entry => entry.score);
            const similarity = this.calculateScoreSimilarity(recentScores);
            return {
                isStagnant: true,
                detectedAtLoop: analysis.currentLoop,
                similarityScore: similarity,
                recommendation: this.generateStagnationRecommendation(analysis),
            };
        }
        return {
            isStagnant: false,
            detectedAtLoop: 0,
            similarityScore: 0,
            recommendation: "Progress is being made, continue with current approach",
        };
    }
    /**
     * Start Codex context window (enhanced implementation)
     */
    async startCodexContext(loopId) {
        const contextId = `context-${loopId}-${Date.now()}`;
        // Store context information for tracking
        this.componentLogger.info(`Started Codex context window`, {
            loopId,
            contextId,
        });
        return contextId;
    }
    /**
     * Maintain Codex context window (enhanced implementation)
     */
    async maintainCodexContext(loopId, contextId) {
        this.componentLogger.debug(`Maintaining Codex context window`, {
            loopId,
            contextId,
        });
        // Context maintenance logic would go here
        // For now, just log the activity
    }
    /**
     * Terminate Codex context window (enhanced implementation)
     */
    async terminateCodexContext(loopId, reason) {
        this.componentLogger.info(`Terminated Codex context window`, {
            loopId,
            reason,
        });
        // Context cleanup logic would go here
    }
    /**
     * Add iteration data to session (enhanced implementation)
     */
    async addIteration(sessionId, iteration) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }
            session.iterations.push(iteration);
            session.currentLoop = session.iterations.length;
            // Keep only last 25 iterations to prevent unbounded growth
            if (session.iterations.length > 25) {
                session.iterations = session.iterations.slice(-25);
            }
            await this.updateSession(session);
            this.componentLogger.debug(`Added iteration data for session ${sessionId}`, {
                loop: session.currentLoop,
                iterationsCount: session.iterations.length,
            });
        }
        catch (error) {
            this.componentLogger.error(`Failed to add iteration for session ${sessionId}`, error);
            throw new SessionPersistenceError(sessionId, 'add-iteration', error instanceof Error ? error.message : String(error));
        }
    }
    // ============================================================================
    // Private Helper Methods for Prompt Integration
    // ============================================================================
    /**
     * Detect progress stagnation based on score progression
     */
    detectProgressStagnation(scoreProgression) {
        if (scoreProgression.length < 3) {
            return false;
        }
        const recentScores = scoreProgression.slice(-5).map(entry => entry.score);
        const maxScore = Math.max(...recentScores);
        const minScore = Math.min(...recentScores);
        const scoreRange = maxScore - minScore;
        // Consider stagnant if score range is less than 2 points over last 5 iterations
        return scoreRange < 2;
    }
    /**
     * Analyze workflow step completion patterns
     */
    analyzeWorkflowSteps(workflowHistory) {
        const stepCounts = new Map();
        const stepDurations = new Map();
        for (const entry of workflowHistory) {
            const stepName = entry.stepName;
            stepCounts.set(stepName, (stepCounts.get(stepName) || 0) + 1);
            if (entry.stepResult.duration) {
                if (!stepDurations.has(stepName)) {
                    stepDurations.set(stepName, []);
                }
                stepDurations.get(stepName).push(entry.stepResult.duration);
            }
        }
        const stepStats = {};
        for (const [stepName, count] of stepCounts) {
            const durations = stepDurations.get(stepName) || [];
            const averageDuration = durations.length > 0
                ? durations.reduce((sum, d) => sum + d, 0) / durations.length
                : 0;
            stepStats[stepName] = { count, averageDuration };
        }
        return {
            totalSteps: workflowHistory.length,
            stepBreakdown: stepStats,
            mostFrequentStep: this.getMostFrequentStep(workflowHistory),
            averageStepsPerLoop: workflowHistory.length > 0
                ? workflowHistory.length / (Math.max(...workflowHistory.map(e => e.sessionLoop)) + 1)
                : 0,
        };
    }
    /**
     * Calculate completion probability based on current progress
     */
    calculateCompletionProbability(scoreProgression, currentLoop, isStagnant) {
        if (scoreProgression.length === 0) {
            return 0.1; // Low probability with no data
        }
        const currentScore = scoreProgression[scoreProgression.length - 1].score;
        // Base probability on current score
        let probability = Math.min(currentScore / 100, 0.9);
        // Adjust for stagnation
        if (isStagnant) {
            probability *= 0.5;
        }
        // Adjust for loop count (higher loops reduce probability)
        if (currentLoop > 15) {
            probability *= Math.max(0.3, 1 - (currentLoop - 15) / 20);
        }
        return Math.max(0.05, Math.min(0.95, probability));
    }
    /**
     * Generate progress-based recommendations
     */
    generateProgressRecommendations(scoreProgression, isStagnant, averageImprovement, currentLoop) {
        const recommendations = [];
        if (isStagnant) {
            recommendations.push("Consider alternative approaches - current strategy may have reached its limit");
            recommendations.push("Review recent feedback for patterns that might indicate systematic issues");
        }
        if (averageImprovement < 1 && currentLoop > 5) {
            recommendations.push("Improvement rate is low - focus on addressing high-impact issues first");
        }
        if (currentLoop > 20) {
            recommendations.push("Consider manual review - automated iteration limit approaching");
        }
        const currentScore = scoreProgression.length > 0 ? scoreProgression[scoreProgression.length - 1].score : 0;
        if (currentScore > 85) {
            recommendations.push("Quality is high - consider completing the audit");
        }
        else if (currentScore < 60) {
            recommendations.push("Quality needs significant improvement - focus on critical issues");
        }
        return recommendations;
    }
    /**
     * Calculate score similarity for stagnation detection
     */
    calculateScoreSimilarity(scores) {
        if (scores.length < 2) {
            return 0;
        }
        const differences = [];
        for (let i = 1; i < scores.length; i++) {
            differences.push(Math.abs(scores[i] - scores[i - 1]));
        }
        const averageDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
        // Convert to similarity score (0-1, where 1 is identical)
        return Math.max(0, 1 - averageDifference / 10);
    }
    /**
     * Generate stagnation-specific recommendations
     */
    generateStagnationRecommendation(analysis) {
        const recommendations = [
            "Try a different approach to address remaining issues",
            "Break down complex problems into smaller, manageable tasks",
            "Consider seeking additional context or clarification",
            "Review the audit criteria to ensure alignment with requirements",
            "Focus on the most critical issues that are blocking progress",
        ];
        // Select recommendation based on current state
        const index = Math.min(analysis.currentLoop % recommendations.length, recommendations.length - 1);
        return recommendations[index];
    }
    /**
     * Calculate average step duration from workflow history
     */
    calculateAverageStepDuration(workflowHistory) {
        const durations = workflowHistory
            .map(entry => entry.stepResult.duration)
            .filter((duration) => duration !== undefined);
        return durations.length > 0
            ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
            : 0;
    }
    /**
     * Get the most frequently executed workflow step
     */
    getMostFrequentStep(workflowHistory) {
        if (workflowHistory.length === 0) {
            return null;
        }
        const stepCounts = new Map();
        for (const entry of workflowHistory) {
            stepCounts.set(entry.stepName, (stepCounts.get(entry.stepName) || 0) + 1);
        }
        let mostFrequent = '';
        let maxCount = 0;
        for (const [stepName, count] of stepCounts) {
            if (count > maxCount) {
                maxCount = count;
                mostFrequent = stepName;
            }
        }
        return mostFrequent || null;
    }
    /**
     * Estimate memory usage of session data
     */
    estimateSessionMemoryUsage(session) {
        try {
            const sessionStr = JSON.stringify(session);
            return new TextEncoder().encode(sessionStr).length;
        }
        catch {
            return 0;
        }
    }
}
//# sourceMappingURL=session-manager.js.map