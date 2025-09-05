/**
 * Synchronous Session Manager for GAN Auditor Integration
 * 
 * Extends the base SessionManager with synchronous audit workflow capabilities
 * including iteration tracking, progress analysis, stagnation detection, and
 * Codex context window management.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4 (Synchronous Audit Workflow)
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type {
  GansAuditorCodexSessionState,
  GansAuditorCodexSessionConfig,
  IterationData,
  ProgressAnalysis,
  StagnationResult,
  TerminationReason,
  SimilarityAnalysis,
} from '../types/gan-types.js';
import { DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG } from '../types/gan-types.js';
import type {
  IGansAuditorCodexSessionManager,
} from '../types/integration-types.js';
import { SessionManager, SessionManagerConfig } from './session-manager.js';
import { logger, createComponentLogger } from '../utils/logger.js';
import {
  SessionError,
  SessionNotFoundError,
  SessionCorruptionError,
} from '../types/error-types.js';
import {
  handleSessionCorruption,
  handleSessionError,
} from '../utils/error-handler.js';
import { LoopDetector, type LoopDetectorConfig } from '../auditor/loop-detector.js';

const execFileAsync = promisify(execFile);

/**
 * Configuration for SynchronousSessionManager
 */
export interface SynchronousSessionManagerConfig extends SessionManagerConfig {
  stagnationThreshold: number; // Similarity threshold for stagnation detection (0-1)
  stagnationStartLoop: number; // Loop number to start checking for stagnation
  codexExecutable: string; // Path to Codex CLI executable
  codexTimeout: number; // Timeout for Codex operations in milliseconds
}

/**
 * Default configuration for SynchronousSessionManager
 */
export const DEFAULT_SYNCHRONOUS_SESSION_MANAGER_CONFIG: SynchronousSessionManagerConfig = {
  stateDirectory: '.mcp-gan-state',
  maxSessionAge: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  stagnationThreshold: 0.95,
  stagnationStartLoop: 10,
  codexExecutable: 'codex',
  codexTimeout: 30000, // 30 seconds
};

/**
 * Enhanced SessionManager with synchronous audit workflow support
 * 
 * Requirement 4.1: Session continuity across calls
 * Requirement 4.2: Iteration history and progress tracking
 * Requirement 4.3: LOOP_ID support for context continuity
 * Requirement 4.4: Codex context window management
 */
export class SynchronousSessionManager extends SessionManager implements IGansAuditorCodexSessionManager {
  private readonly syncConfig: SynchronousSessionManagerConfig;
  private readonly syncComponentLogger: typeof logger;
  private readonly activeContexts: Map<string, string> = new Map(); // loopId -> contextId

  constructor(config: Partial<SynchronousSessionManagerConfig> = {}) {
    const fullConfig = { ...DEFAULT_SYNCHRONOUS_SESSION_MANAGER_CONFIG, ...config };
    super(fullConfig);
    this.syncConfig = fullConfig;
    this.syncComponentLogger = createComponentLogger('synchronous-session-manager');
  }

  /**
   * Get or create session with LOOP_ID support
   * Requirement 4.3: LOOP_ID support for context continuity
   */
  public async getOrCreateSession(sessionId: string, loopId?: string): Promise<GansAuditorCodexSessionState> {
    let session = await this.getSession(sessionId);
    
    if (!session) {
      // Create new session with enhanced schema
      const config = { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG };
      session = await this.createEnhancedSession(sessionId, config, loopId);
    } else {
      // Update existing session with loopId if provided
      if (loopId && session.loopId !== loopId) {
        session.loopId = loopId;
        await this.updateSession(session);
      }
    }

    return session;
  }

  /**
   * Create new session with enhanced schema for synchronous workflow
   */
  private async createEnhancedSession(
    id: string, 
    config: GansAuditorCodexSessionConfig,
    loopId?: string
  ): Promise<GansAuditorCodexSessionState> {
    try {
      
      const now = Date.now();
      const session: GansAuditorCodexSessionState = {
        id,
        loopId,
        config: { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG, ...config },
        history: [],
        iterations: [], // Enhanced iteration tracking
        currentLoop: 0,
        isComplete: false,
        codexContextActive: false,
        createdAt: now,
        updatedAt: now,
      };

      await this.updateSession(session);
      this.syncComponentLogger.info(`Created new enhanced session ${id}${loopId ? ` with loopId ${loopId}` : ''}`);
      return session;
    } catch (error) {
      this.syncComponentLogger.error(`Failed to create enhanced session ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Analyze progress across iterations
   * Requirement 4.2: Progress tracking and analysis
   */
  public async analyzeProgress(sessionId: string): Promise<ProgressAnalysis> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    const iterations = session.iterations || [];
    const scoreProgression = iterations.map(iter => iter.auditResult.overall);
    
    let averageImprovement = 0;
    if (scoreProgression.length > 1) {
      const improvements = [];
      for (let i = 1; i < scoreProgression.length; i++) {
        improvements.push(scoreProgression[i] - scoreProgression[i - 1]);
      }
      averageImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
    }

    const stagnationResult = await this.detectStagnation(sessionId);

    return {
      currentLoop: session.currentLoop,
      scoreProgression,
      averageImprovement,
      isStagnant: stagnationResult.isStagnant,
    };
  }

  /**
   * Detect stagnation in session responses
   * Requirement 4.2: Stagnation detection and prevention
   */
  public async detectStagnation(sessionId: string): Promise<StagnationResult> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    const iterations = session.iterations || [];
    
    // Only check for stagnation after the configured start loop
    if (iterations.length < this.syncConfig.stagnationStartLoop) {
      return {
        isStagnant: false,
        detectedAtLoop: 0,
        similarityScore: 0,
        recommendation: "Not enough iterations to detect stagnation",
      };
    }

    // Analyze similarity of recent responses
    const recentIterations = iterations.slice(-3); // Check last 3 iterations
    const codes = recentIterations.map(iter => iter.code);
    
    const similarity = this.calculateSimilarity(codes);
    const isStagnant = similarity.averageSimilarity > this.syncConfig.stagnationThreshold;

    let recommendation = "Continue iterating";
    if (isStagnant) {
      recommendation = "Stagnation detected. Consider changing approach or terminating session.";
    }

    return {
      isStagnant,
      detectedAtLoop: session.currentLoop,
      similarityScore: similarity.averageSimilarity,
      recommendation,
    };
  }

  /**
   * Calculate similarity between code strings
   */
  private calculateSimilarity(codes: string[]): SimilarityAnalysis {
    if (codes.length < 2) {
      return {
        averageSimilarity: 0,
        isStagnant: false,
        repeatedPatterns: [],
      };
    }

    const similarities: number[] = [];
    const patterns: string[] = [];

    for (let i = 1; i < codes.length; i++) {
      const similarity = this.stringSimilarity(codes[i - 1], codes[i]);
      similarities.push(similarity);

      // Check for repeated patterns (simple approach)
      if (similarity > 0.9) {
        patterns.push(`Iteration ${i - 1} and ${i} are highly similar`);
      }
    }

    const averageSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    
    // Only consider stagnant if we have enough similar pairs
    const highSimilarityCount = similarities.filter(sim => sim > 0.9).length;
    const isStagnant = averageSimilarity > this.syncConfig.stagnationThreshold && 
                      highSimilarityCount >= Math.ceil(similarities.length / 2);

    return {
      averageSimilarity,
      isStagnant,
      repeatedPatterns: patterns,
    };
  }

  /**
   * Calculate string similarity using simple character-based approach
   */
  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // Simple Levenshtein distance-based similarity
    const maxLength = Math.max(str1.length, str2.length);
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Start Codex context window
   * Requirement 4.4: Codex context window management
   */
  public async startCodexContext(loopId: string): Promise<string> {
    try {
      // Check if context already exists for this loopId
      const existingContextId = this.activeContexts.get(loopId);
      if (existingContextId) {
        this.syncComponentLogger.debug(`Codex context ${existingContextId} already active for loop ${loopId}`);
        return existingContextId;
      }

      // Execute codex context start command
      const { stdout } = await execFileAsync(
        this.syncConfig.codexExecutable,
        ['context', 'start', '--loop-id', loopId],
        { timeout: this.syncConfig.codexTimeout }
      );

      const contextId = stdout.trim();
      if (!contextId) {
        throw new Error('Codex CLI returned empty context ID');
      }

      this.activeContexts.set(loopId, contextId);
      
      this.syncComponentLogger.info(`Started Codex context ${contextId} for loop ${loopId}`);
      return contextId;
    } catch (error) {
      this.syncComponentLogger.error(`Failed to start Codex context for loop ${loopId}`, error as Error);
      throw new SessionError(`Failed to start Codex context: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Maintain Codex context window
   * Requirement 4.4: Context window maintenance
   */
  public async maintainCodexContext(loopId: string, contextId: string): Promise<void> {
    try {
      // Verify context is still active
      const activeContextId = this.activeContexts.get(loopId);
      if (!activeContextId || activeContextId !== contextId) {
        this.syncComponentLogger.warn(`Context ${contextId} is not active for loop ${loopId}, skipping maintenance`);
        return;
      }

      await execFileAsync(
        this.syncConfig.codexExecutable,
        ['context', 'maintain', '--context-id', contextId, '--loop-id', loopId],
        { timeout: this.syncConfig.codexTimeout }
      );

      this.syncComponentLogger.debug(`Maintained Codex context ${contextId} for loop ${loopId}`);
    } catch (error) {
      this.syncComponentLogger.error(`Failed to maintain Codex context ${contextId}`, error as Error);
      // Don't throw - maintenance failure is not critical
      // But remove from active contexts if it's a permanent failure
      if (error instanceof Error && error.message.includes('context not found')) {
        this.activeContexts.delete(loopId);
        this.syncComponentLogger.warn(`Removed stale context ${contextId} for loop ${loopId}`);
      }
    }
  }

  /**
   * Terminate Codex context window
   * Requirement 4.4: Context window cleanup
   */
  public async terminateCodexContext(loopId: string, reason: TerminationReason): Promise<void> {
    const contextId = this.activeContexts.get(loopId);
    if (!contextId) {
      this.syncComponentLogger.debug(`No active context found for loop ${loopId}, nothing to terminate`);
      return;
    }

    try {
      await execFileAsync(
        this.syncConfig.codexExecutable,
        ['context', 'terminate', '--context-id', contextId, '--reason', reason],
        { timeout: this.syncConfig.codexTimeout }
      );

      this.activeContexts.delete(loopId);
      this.syncComponentLogger.info(`Terminated Codex context ${contextId} for loop ${loopId} (reason: ${reason})`);
    } catch (error) {
      this.syncComponentLogger.error(`Failed to terminate Codex context ${contextId}`, error as Error);
      // Still remove from active contexts to prevent memory leaks
      this.activeContexts.delete(loopId);
      
      // Log additional context for debugging
      this.syncComponentLogger.debug(`Removed context ${contextId} from active contexts despite termination failure`);
    }
  }

  /**
   * Add iteration data to session
   * Requirement 4.2: Iteration tracking
   */
  public async addIteration(sessionId: string, iteration: IterationData): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    // Initialize iterations array if it doesn't exist (for backward compatibility)
    if (!session.iterations) {
      session.iterations = [];
    }

    session.iterations.push(iteration);
    session.currentLoop = Math.max(session.currentLoop, iteration.thoughtNumber);
    
    await this.updateSession(session);
    this.syncComponentLogger.debug(`Added iteration ${iteration.thoughtNumber} to session ${sessionId}`);
  }

  /**
   * Override updateSession to handle enhanced schema
   */
  public async updateSession(session: GansAuditorCodexSessionState): Promise<void> {
    // Ensure enhanced fields are present
    const enhancedSession: GansAuditorCodexSessionState = {
      ...session,
      iterations: session.iterations || [],
      currentLoop: session.currentLoop || 0,
      isComplete: session.isComplete || false,
      codexContextActive: session.codexContextActive || false,
      updatedAt: Date.now(),
    };

    await super.updateSession(enhancedSession);
  }

  /**
   * Override getSession to handle legacy session migration
   */
  public async getSession(id: string): Promise<GansAuditorCodexSessionState | null> {
    try {
      // First, validate session integrity
      const validation = await this.validateSessionIntegrity(id);
      
      if (!validation.isValid && validation.recoverable) {
        this.syncComponentLogger.warn(`Session ${id} is corrupted but recoverable`, {
          corruptionType: validation.corruptionType,
          issues: validation.issues,
        });

        // Attempt recovery
        const recovered = await this.recoverCorruptedSession(id, validation.corruptionType!);
        if (recovered) {
          return recovered;
        }

        // If recovery failed, handle as corruption error
        const corruptionError = new SessionCorruptionError(
          id,
          validation.corruptionType!,
          [
            'Automatic recovery failed',
            'Create a new session with default configuration',
            'Contact support if this issue persists',
          ]
        );

        const result = await handleSessionCorruption(
          corruptionError,
          id,
          validation.corruptionType!
        );

        return result.recoveredSession || null;
      }

      if (!validation.isValid && !validation.recoverable) {
        this.syncComponentLogger.error(`Session ${id} is corrupted and not recoverable`, undefined, {
          corruptionType: validation.corruptionType || 'unknown',
          issues: validation.issues,
        });

        return null;
      }

      // Session is valid, proceed with normal loading
      const session = await super.getSession(id);
      
      // Migrate legacy session if needed
      if (session && this.needsMigration(session)) {
        const migratedSession = this.migrateLegacySession(session);
        await this.updateSession(migratedSession);
        return migratedSession;
      }

      return session;

    } catch (error) {
      this.syncComponentLogger.error(`Error loading session ${id}`, error as Error);
      
      // Handle as generic session error
      const result = await handleSessionError(error, id);
      return result;
    }
  }

  /**
   * Check if a session needs migration to enhanced schema
   */
  private needsMigration(session: any): boolean {
    return !session.hasOwnProperty('iterations') || 
           !session.hasOwnProperty('currentLoop') || 
           !session.hasOwnProperty('isComplete') || 
           !session.hasOwnProperty('codexContextActive');
  }

  /**
   * Migrate legacy session to enhanced schema
   */
  private migrateLegacySession(session: any): GansAuditorCodexSessionState {
    this.syncComponentLogger.info(`Migrating legacy session ${session.id} to enhanced schema`);
    
    return {
      id: session.id,
      loopId: session.loopId,
      config: session.config || { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG },
      history: session.history || [],
      iterations: session.iterations || [],
      currentLoop: session.currentLoop || 0,
      isComplete: session.isComplete || false,
      completionReason: session.completionReason,
      stagnationInfo: session.stagnationInfo,
      codexContextId: session.codexContextId,
      codexContextActive: session.codexContextActive || false,
      lastGan: session.lastGan,
      createdAt: session.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }



  // ============================================================================
  // Session Corruption Detection and Recovery (Requirement 7.3)
  // ============================================================================

  /**
   * Validate session integrity and detect corruption
   */
  public async validateSessionIntegrity(sessionId: string): Promise<{
    isValid: boolean;
    corruptionType?: string;
    issues: string[];
    recoverable: boolean;
  }> {
    try {
      const session = await super.getSession(sessionId);
      if (!session) {
        return {
          isValid: false,
          corruptionType: 'session_not_found',
          issues: ['Session file does not exist'],
          recoverable: false,
        };
      }

      const issues: string[] = [];
      let corruptionType: string | undefined;

      // Check required fields
      if (!session.id) {
        issues.push('Missing session ID');
        corruptionType = 'missing_fields';
      }

      if (!session.config) {
        issues.push('Missing session configuration');
        corruptionType = 'missing_fields';
      }

      if (!session.createdAt || !session.updatedAt) {
        issues.push('Missing timestamp fields');
        corruptionType = 'missing_fields';
      }

      // Check data types
      if (session.history && !Array.isArray(session.history)) {
        issues.push('Invalid history data type');
        corruptionType = 'format_mismatch';
      }

      if (session.iterations && !Array.isArray(session.iterations)) {
        issues.push('Invalid iterations data type');
        corruptionType = 'format_mismatch';
      }

      // Check for data consistency
      if (session.currentLoop && session.iterations) {
        const maxIterationNumber = Math.max(...session.iterations.map(iter => iter.thoughtNumber), 0);
        if (session.currentLoop < maxIterationNumber) {
          issues.push('Current loop number is inconsistent with iterations');
          corruptionType = 'data_inconsistency';
        }
      }

      // Check for partial data corruption
      if (session.iterations) {
        for (let i = 0; i < session.iterations.length; i++) {
          const iteration = session.iterations[i];
          if (!iteration.thoughtNumber || !iteration.code || !iteration.auditResult) {
            issues.push(`Incomplete iteration data at index ${i}`);
            corruptionType = 'partial_data';
          }
        }
      }

      const isValid = issues.length === 0;
      const recoverable = corruptionType !== 'session_not_found' && 
                         ['missing_fields', 'format_mismatch', 'partial_data'].includes(corruptionType || '');

      return {
        isValid,
        corruptionType,
        issues,
        recoverable,
      };

    } catch (error) {
      this.syncComponentLogger.error(`Failed to validate session ${sessionId}`, error as Error);
      return {
        isValid: false,
        corruptionType: 'validation_error',
        issues: [`Validation failed: ${(error as Error).message}`],
        recoverable: false,
      };
    }
  }

  /**
   * Attempt to recover a corrupted session (Requirement 7.3)
   */
  public async recoverCorruptedSession(
    sessionId: string,
    corruptionType: string
  ): Promise<GansAuditorCodexSessionState | null> {
    this.syncComponentLogger.info(`Attempting to recover corrupted session ${sessionId}`, {
      corruptionType,
    });

    try {
      const session = await super.getSession(sessionId);
      if (!session) {
        return null;
      }

      let recoveredSession: GansAuditorCodexSessionState;

      switch (corruptionType) {
        case 'missing_fields':
          recoveredSession = await this.recoverMissingFields(session);
          break;
        
        case 'format_mismatch':
          recoveredSession = await this.recoverFormatMismatch(session);
          break;
        
        case 'partial_data':
          recoveredSession = await this.recoverPartialData(session);
          break;
        
        case 'data_inconsistency':
          recoveredSession = await this.recoverDataInconsistency(session);
          break;
        
        default:
          this.syncComponentLogger.warn(`Unknown corruption type: ${corruptionType}`);
          return null;
      }

      // Validate the recovered session
      const validation = await this.validateSessionIntegrity(recoveredSession.id);
      if (!validation.isValid) {
        this.syncComponentLogger.error('Session recovery failed validation', undefined, {
          sessionId: sessionId,
          issues: validation.issues,
        });
        return null;
      }

      // Save the recovered session
      await this.updateSession(recoveredSession);
      
      this.syncComponentLogger.info(`Successfully recovered session ${sessionId}`, {
        corruptionType,
      });

      return recoveredSession;

    } catch (error) {
      this.syncComponentLogger.error(`Session recovery failed for ${sessionId}`, error as Error);
      return null;
    }
  }

  /**
   * Recover session with missing fields
   */
  private async recoverMissingFields(session: any): Promise<GansAuditorCodexSessionState> {
    const now = Date.now();
    
    return {
      id: session.id || `recovered-${Date.now()}`,
      loopId: session.loopId,
      config: session.config || { ...DEFAULT_GANSAUDITOR_CODEX_SESSION_CONFIG },
      history: session.history || [],
      iterations: session.iterations || [],
      currentLoop: session.currentLoop || 0,
      isComplete: session.isComplete || false,
      codexContextActive: session.codexContextActive || false,
      createdAt: session.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Recover session with format mismatches
   */
  private async recoverFormatMismatch(session: any): Promise<GansAuditorCodexSessionState> {
    const recovered = await this.recoverMissingFields(session);
    
    // Fix array fields that might be corrupted
    if (session.history && !Array.isArray(session.history)) {
      recovered.history = [];
    }
    
    if (session.iterations && !Array.isArray(session.iterations)) {
      recovered.iterations = [];
    }

    return recovered;
  }

  /**
   * Recover session with partial data corruption
   */
  private async recoverPartialData(session: any): Promise<GansAuditorCodexSessionState> {
    const recovered = await this.recoverMissingFields(session);
    
    // Filter out corrupted iterations
    if (session.iterations && Array.isArray(session.iterations)) {
      recovered.iterations = session.iterations.filter((iter: any) => 
        iter && iter.thoughtNumber && iter.code && iter.auditResult
      );
    }

    // Recalculate current loop based on valid iterations
    if (recovered.iterations.length > 0) {
      recovered.currentLoop = Math.max(...recovered.iterations.map(iter => iter.thoughtNumber));
    }

    return recovered;
  }

  /**
   * Recover session with data inconsistencies
   */
  private async recoverDataInconsistency(session: any): Promise<GansAuditorCodexSessionState> {
    const recovered = await this.recoverMissingFields(session);
    
    // Fix current loop number based on iterations
    if (recovered.iterations.length > 0) {
      recovered.currentLoop = Math.max(...recovered.iterations.map(iter => iter.thoughtNumber));
    } else {
      recovered.currentLoop = 0;
    }

    return recovered;
  }



  /**
   * Get active Codex contexts
   * Requirement 4.4: Context window monitoring
   */
  public getActiveContexts(): Map<string, string> {
    return new Map(this.activeContexts);
  }

  /**
   * Check if a Codex context is active for a given loopId
   * Requirement 4.4: Context window status checking
   */
  public isContextActive(loopId: string): boolean {
    return this.activeContexts.has(loopId);
  }

  /**
   * Get context ID for a given loopId
   * Requirement 4.4: Context window identification
   */
  public getContextId(loopId: string): string | undefined {
    return this.activeContexts.get(loopId);
  }

  /**
   * Terminate all active Codex contexts
   * Requirement 4.4: Bulk context cleanup
   */
  public async terminateAllContexts(reason: TerminationReason = 'manual'): Promise<void> {
    const activeContexts = Array.from(this.activeContexts.keys());
    
    if (activeContexts.length === 0) {
      this.syncComponentLogger.debug('No active contexts to terminate');
      return;
    }

    this.syncComponentLogger.info(`Terminating ${activeContexts.length} active contexts (reason: ${reason})`);

    // Terminate all contexts in parallel
    const terminationPromises = activeContexts.map(loopId => 
      this.terminateCodexContext(loopId, reason).catch(error => {
        this.syncComponentLogger.error(`Failed to terminate context for loop ${loopId}`, error as Error);
      })
    );

    await Promise.allSettled(terminationPromises);
    
    this.syncComponentLogger.info('Completed termination of all active contexts');
  }

  /**
   * Cleanup stale contexts (contexts that may have been orphaned)
   * Requirement 4.4: Context window resource management
   */
  public async cleanupStaleContexts(): Promise<void> {
    const staleContexts: string[] = [];
    
    for (const [loopId, contextId] of this.activeContexts.entries()) {
      try {
        // Try to ping the context to see if it's still valid
        await execFileAsync(
          this.syncConfig.codexExecutable,
          ['context', 'status', '--context-id', contextId],
          { timeout: 5000 } // Short timeout for status check
        );
      } catch (error) {
        // If status check fails, consider it stale
        staleContexts.push(loopId);
        this.syncComponentLogger.warn(`Detected stale context ${contextId} for loop ${loopId}`);
      }
    }

    if (staleContexts.length > 0) {
      this.syncComponentLogger.info(`Cleaning up ${staleContexts.length} stale contexts`);
      
      for (const loopId of staleContexts) {
        this.activeContexts.delete(loopId);
      }
    }
  }

  /**
   * Handle session timeout with context cleanup
   * Requirement 4.4: Redundant termination on session timeout/failure
   */
  public async handleSessionTimeout(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session?.loopId && session.codexContextActive) {
        this.syncComponentLogger.info(`Handling session timeout for ${sessionId}, terminating context`);
        await this.terminateCodexContext(session.loopId, 'timeout');
        
        // Update session state
        session.codexContextActive = false;
        session.codexContextId = undefined;
        await this.updateSession(session);
      }
    } catch (error) {
      this.syncComponentLogger.error(`Failed to handle session timeout for ${sessionId}`, error as Error);
    }
  }

  /**
   * Handle session failure with context cleanup
   * Requirement 4.4: Redundant termination on session failure
   */
  public async handleSessionFailure(sessionId: string, error: Error): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session?.loopId && session.codexContextActive) {
        this.syncComponentLogger.info(`Handling session failure for ${sessionId}, terminating context`);
        await this.terminateCodexContext(session.loopId, 'failure');
        
        // Update session state
        session.codexContextActive = false;
        session.codexContextId = undefined;
        await this.updateSession(session);
      }
    } catch (cleanupError) {
      this.syncComponentLogger.error(`Failed to handle session failure for ${sessionId}`, cleanupError as Error);
    }
  }

  /**
   * Clean up Codex contexts on destroy
   */
  public destroy(): void {
    // Terminate all active contexts
    this.terminateAllContexts('manual').catch(error => {
      this.syncComponentLogger.error('Failed to cleanup contexts during destroy', error as Error);
    });

    super.destroy();
  }
}