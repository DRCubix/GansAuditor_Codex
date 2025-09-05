/**
 * Integration types for GansAuditor_Codex Server
 * 
 * This module defines interfaces for integrating GansAuditor_Codex auditing capabilities
 * with the GansAuditor_Codex MCP server, ensuring backward
 * compatibility while adding new audit functionality.
 */

import type {
  GansAuditorCodexThoughtData,
  GansAuditorCodexReview,
  GansAuditorCodexSessionConfig,
  GansAuditorCodexSessionState,
  GansAuditorCodexAuditRequest,
  GansAuditorCodexToolResponse,
  GansAuditorCodexStandardResponse,
  GansAuditorCodexEnhancedResponse,
  IterationData,
  ProgressAnalysis,
  StagnationResult,
  TerminationReason,
} from './gan-types.js';

// ============================================================================
// Server Integration Interfaces
// ============================================================================

/**
 * Interface for the enhanced GansAuditor_Codex Server
 * Requirement 6.1-6.5: Seamless integration with existing workflows
 */
export interface IGansAuditorCodexServer {
  /**
   * Process a thought with optional GansAuditor_Codex auditing
   */
  processThought(input: unknown): Promise<GansAuditorCodexToolResponse>;
  
  /**
   * Determine if a thought should trigger GansAuditor_Codex auditing
   */
  shouldAuditThought(thought: GansAuditorCodexThoughtData): boolean;
  
  /**
   * Combine standard and audit responses
   */
  combineResponses(standard: GansAuditorCodexStandardResponse, audit: GansAuditorCodexReview | null): GansAuditorCodexEnhancedResponse;
}

/**
 * Interface for the GansAuditor_Codex core component
 * Requirement 1.1-1.4: GansAuditor_Codex orchestration
 */
export interface IGansAuditorCodexAuditor {
  /**
   * Audit a thought and return review results
   */
  auditThought(thought: GansAuditorCodexThoughtData, sessionId?: string): Promise<GansAuditorCodexReview>;
  
  /**
   * Extract inline configuration from thought text
   */
  extractInlineConfig(thought: string): Partial<GansAuditorCodexSessionConfig> | null;
  
  /**
   * Validate audit configuration
   */
  validateConfig(config: Partial<GansAuditorCodexSessionConfig>): GansAuditorCodexSessionConfig;
}

/**
 * Interface for session management
 * Requirement 3.1-3.5: Session state management
 * Extended for synchronous audit workflow support
 */
export interface IGansAuditorCodexSessionManager {
  /**
   * Get existing session or return null
   */
  getSession(id: string): Promise<GansAuditorCodexSessionState | null>;
  
  /**
   * Get or create session with LOOP_ID support
   */
  getOrCreateSession(sessionId: string, loopId?: string): Promise<GansAuditorCodexSessionState>;
  
  /**
   * Create new session with configuration
   */
  createSession(id: string, config: GansAuditorCodexSessionConfig): Promise<GansAuditorCodexSessionState>;
  
  /**
   * Update existing session state
   */
  updateSession(session: GansAuditorCodexSessionState): Promise<void>;
  
  /**
   * Generate unique session identifier
   */
  generateSessionId(cwd?: string, username?: string): string;
  
  /**
   * Clean up old or corrupted sessions
   */
  cleanupSessions(maxAge?: number): Promise<void>;
  
  /**
   * Add audit result to session history
   */
  addAuditToHistory(
    sessionId: string,
    thoughtNumber: number,
    review: any,
    config: GansAuditorCodexSessionConfig
  ): Promise<void>;

  // ============================================================================
  // Synchronous Workflow Methods
  // ============================================================================

  /**
   * Analyze progress across iterations
   */
  analyzeProgress(sessionId: string): Promise<ProgressAnalysis>;
  
  /**
   * Detect stagnation in session responses
   */
  detectStagnation(sessionId: string): Promise<StagnationResult>;
  
  /**
   * Start Codex context window
   */
  startCodexContext(loopId: string): Promise<string>;
  
  /**
   * Maintain Codex context window
   */
  maintainCodexContext(loopId: string, contextId: string): Promise<void>;
  
  /**
   * Terminate Codex context window
   */
  terminateCodexContext(loopId: string, reason: TerminationReason): Promise<void>;
  
  /**
   * Add iteration data to session
   */
  addIteration(sessionId: string, iteration: IterationData): Promise<void>;

  // ============================================================================
  // Prompt-Driven Audit Integration Methods (Requirements 6.1, 6.2, 6.3)
  // ============================================================================

  /**
   * Add workflow step result to session history
   */
  addWorkflowStepResult(
    sessionId: string,
    stepName: string,
    stepResult: {
      success: boolean;
      evidence: string[];
      issues: Array<{
        severity: 'critical' | 'major' | 'minor';
        description: string;
        location?: string;
      }>;
      score?: number;
      duration?: number;
      metadata?: Record<string, any>;
    },
    thoughtNumber: number
  ): Promise<void>;

  /**
   * Track quality progression across iterations
   */
  trackQualityProgression(
    sessionId: string,
    qualityMetrics: {
      timestamp: number;
      thoughtNumber: number;
      overallScore: number;
      dimensionalScores: Array<{
        name: string;
        score: number;
      }>;
      completionAnalysis?: {
        status: 'completed' | 'terminated' | 'in_progress';
        reason: string;
        nextThoughtNeeded: boolean;
      };
      criticalIssuesCount: number;
      improvementAreas: string[];
    }
  ): Promise<void>;

  /**
   * Store prompt context for session continuity
   */
  storePromptContext(
    sessionId: string,
    promptContext: {
      promptVersion: string;
      configHash: string;
      renderedPrompt: string;
      variables: Record<string, any>;
      projectContext?: {
        steering?: string;
        spec?: string;
        repository?: string;
      };
    }
  ): Promise<void>;

  /**
   * Retrieve prompt context for session continuity
   */
  getPromptContext(sessionId: string): Promise<{
    promptVersion: string;
    configHash: string;
    renderedPrompt: string;
    variables: Record<string, any>;
    projectContext?: {
      steering?: string;
      spec?: string;
      repository?: string;
    };
    storedAt?: number;
    sessionLoop?: number;
  } | null>;

  /**
   * Analyze audit progress across iterations
   */
  analyzeAuditProgress(sessionId: string): Promise<{
    sessionId: string;
    currentLoop: number;
    totalIterations: number;
    scoreProgression: Array<{
      thoughtNumber: number;
      score: number;
      timestamp: number;
    }>;
    averageImprovement: number;
    isStagnant: boolean;
    stagnationRisk: number;
    workflowStepStats: {
      totalSteps: number;
      stepBreakdown: Record<string, {
        count: number;
        averageDuration: number;
      }>;
      mostFrequentStep: string | null;
      averageStepsPerLoop: number;
    };
    completionProbability: number;
    recommendedActions: string[];
  }>;

  /**
   * Get session statistics for monitoring
   */
  getSessionStatistics(sessionId: string): Promise<{
    sessionId: string;
    sessionDuration: number;
    lastActivity: number;
    timeSinceLastActivity: number;
    currentLoop: number;
    isComplete: boolean;
    completionReason?: string;
    qualityStats: {
      currentScore: number;
      highestScore: number;
      lowestScore: number;
      averageScore: number;
      scoreImprovement: number;
    };
    workflowStats: {
      totalSteps: number;
      uniqueSteps: number;
      averageStepDuration: number;
      mostFrequentStep: string | null;
    };
    memoryUsage: number;
  }>;
}

/**
 * Interface for repository context building
 * Requirement 4.1-4.5: Repository context analysis
 */
export interface IGansAuditorCodexContextPacker {
  /**
   * Build context pack based on configuration
   */
  buildContextPack(config: GansAuditorCodexSessionConfig, cwd?: string): Promise<string>;
  
  /**
   * Build git diff context
   */
  buildDiffContext(cwd?: string): Promise<string>;
  
  /**
   * Build context from specific file paths
   */
  buildPathsContext(paths: string[], cwd?: string): Promise<string>;
  
  /**
   * Build workspace context using heuristics
   */
  buildWorkspaceContext(cwd?: string): Promise<string>;
}

/**
 * Interface for Codex CLI integration
 * Requirement 7.1-7.5: Codex CLI integration
 * Extended for prompt-driven auditing (Requirement 6.2)
 */
export interface IGansAuditorCodexJudge {
  /**
   * Execute audit using Codex CLI
   */
  executeAudit(request: GansAuditorCodexAuditRequest): Promise<GansAuditorCodexReview>;
  
  /**
   * Check if Codex CLI is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get Codex CLI version information
   */
  getVersion(): Promise<string | null>;

  // ============================================================================
  // Prompt-Driven Audit Integration Methods (Requirement 6.2)
  // ============================================================================

  /**
   * Execute audit with structured system prompt injection
   */
  executeAuditWithSystemPrompt(
    request: GansAuditorCodexAuditRequest,
    systemPrompt: string,
    promptContext?: {
      variables: Record<string, any>;
      metadata: any;
    }
  ): Promise<GansAuditorCodexReview>;

  /**
   * Parse workflow step results from Codex response
   */
  parseWorkflowStepResults(rawResponse: string): {
    steps: Array<{
      stepName: string;
      success: boolean;
      evidence: string[];
      issues: Array<{
        severity: 'critical' | 'major' | 'minor';
        description: string;
        location?: string;
      }>;
      score?: number;
      duration?: number;
      metadata?: Record<string, any>;
    }>;
    overallSuccess: boolean;
    totalDuration: number;
    criticalIssuesCount: number;
  };

  /**
   * Validate response structure for prompt-driven outputs
   */
  validatePromptDrivenResponse(
    response: any,
    expectedStructure?: {
      requireWorkflowSteps: boolean;
      requireCompletionAnalysis: boolean;
      requireNextActions: boolean;
    }
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    score: number;
  };

  /**
   * Generate structured audit prompt with system prompt integration
   */
  generateStructuredAuditPrompt(
    request: GansAuditorCodexAuditRequest,
    systemPrompt: string,
    promptContext?: {
      variables: Record<string, any>;
      metadata: any;
    }
  ): string;
}

// ============================================================================
// Configuration and Factory Interfaces
// ============================================================================

/**
 * Configuration for GansAuditor_Codex components
 */
export interface GansAuditorCodexConfig {
  sessionManager: {
    stateDirectory: string;
    maxSessionAge: number; // milliseconds
    cleanupInterval: number; // milliseconds
  };
  contextPacker: {
    maxContextSize: number; // characters
    maxFileSize: number; // bytes
    relevanceThreshold: number; // 0-1
  };
  codexJudge: {
    executable: string;
    timeout: number; // milliseconds
    retries: number;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Factory interface for creating GansAuditor_Codex components
 */
export interface IGansAuditorCodexFactory {
  createAuditor(config: GansAuditorCodexConfig): IGansAuditorCodexAuditor;
  createSessionManager(config: GansAuditorCodexConfig['sessionManager']): IGansAuditorCodexSessionManager;
  createContextPacker(config: GansAuditorCodexConfig['contextPacker']): IGansAuditorCodexContextPacker;
  createCodexJudge(config: GansAuditorCodexConfig['codexJudge']): IGansAuditorCodexJudge;
}

// ============================================================================
// Event and Hook Interfaces
// ============================================================================

/**
 * Events emitted during audit process
 */
export type AuditEvent = 
  | { type: 'audit_started'; sessionId: string; thoughtNumber: number }
  | { type: 'context_built'; sessionId: string; contextSize: number }
  | { type: 'codex_executed'; sessionId: string; duration: number }
  | { type: 'audit_completed'; sessionId: string; verdict: GansAuditorCodexReview['verdict'] }
  | { type: 'audit_failed'; sessionId: string; error: string };

/**
 * Event listener interface
 */
export interface IGansAuditorCodexEventListener {
  onAuditEvent(event: AuditEvent): void | Promise<void>;
}

/**
 * Hook interface for extending audit behavior
 */
export interface IGansAuditorCodexHook {
  /**
   * Called before audit execution
   */
  beforeAudit?(request: GansAuditorCodexAuditRequest): Promise<GansAuditorCodexAuditRequest>;
  
  /**
   * Called after audit execution
   */
  afterAudit?(request: GansAuditorCodexAuditRequest, review: GansAuditorCodexReview): Promise<GansAuditorCodexReview>;
  
  /**
   * Called when audit fails
   */
  onAuditError?(request: GansAuditorCodexAuditRequest, error: Error): Promise<void>;
}

// ============================================================================
// Middleware and Plugin Interfaces
// ============================================================================

/**
 * Middleware for processing thoughts before auditing
 */
export interface IGansAuditorCodexMiddleware {
  process(thought: GansAuditorCodexThoughtData): Promise<GansAuditorCodexThoughtData>;
}

/**
 * Plugin interface for extending GansAuditor_Codex functionality
 */
export interface IGansAuditorCodexPlugin {
  name: string;
  version: string;
  
  /**
   * Initialize plugin with auditor instance
   */
  initialize(auditor: IGansAuditorCodexAuditor): Promise<void>;
  
  /**
   * Cleanup plugin resources
   */
  cleanup(): Promise<void>;
  
  /**
   * Optional middleware for thought processing
   */
  middleware?: IGansAuditorCodexMiddleware;
  
  /**
   * Optional hooks for audit process
   */
  hooks?: IGansAuditorCodexHook;
}

// ============================================================================
// Testing and Mock Interfaces
// ============================================================================

/**
 * Mock implementation interface for testing
 */
export interface IGansAuditorCodexMockJudge extends IGansAuditorCodexJudge {
  /**
   * Set mock response for next audit
   */
  setMockResponse(response: GansAuditorCodexReview): void;
  
  /**
   * Set mock error for next audit
   */
  setMockError(error: Error): void;
  
  /**
   * Get call history for testing
   */
  getCallHistory(): GansAuditorCodexAuditRequest[];
}

/**
 * Test fixture interface
 */
export interface IGansAuditorCodexTestFixture {
  sessionId: string;
  config: GansAuditorCodexSessionConfig;
  thoughtData: GansAuditorCodexThoughtData;
  expectedReview: GansAuditorCodexReview;
  contextPack: string;
}

// ============================================================================
// Utility and Helper Interfaces
// ============================================================================

/**
 * Interface for file system operations
 */
export interface IGansAuditorCodexFileSystemHelper {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  readdir(path: string): Promise<string[]>;
}

/**
 * Interface for git operations
 */
export interface IGansAuditorCodexGitHelper {
  getDiff(cwd?: string): Promise<string>;
  getBranch(cwd?: string): Promise<string>;
  getRepoRoot(cwd?: string): Promise<string>;
  getFileTree(cwd?: string, maxDepth?: number): Promise<string>;
}

/**
 * Interface for process execution
 */
export interface IGansAuditorCodexProcessHelper {
  spawn(command: string, args: string[], options?: { cwd?: string; timeout?: number }): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration for GansAuditor_Codex components
 */
export const DEFAULT_GANSAUDITOR_CODEX_CONFIG: GansAuditorCodexConfig = {
  sessionManager: {
    stateDirectory: '.mcp-gan-state',
    maxSessionAge: 24 * 60 * 60 * 1000, // 24 hours
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  },
  contextPacker: {
    maxContextSize: 50000, // 50KB
    maxFileSize: 1024 * 1024, // 1MB
    relevanceThreshold: 0.3,
  },
  codexJudge: {
    executable: 'codex',
    timeout: 30000, // 30 seconds
    retries: 2,
  },
  logging: {
    enabled: false,
    level: 'info',
  },
};

// ============================================================================
// Backward Compatibility Type Aliases
// ============================================================================

/**
 * Type aliases for backward compatibility with existing code
 * These maintain compatibility while the codebase transitions to new naming
 */

// Legacy interface aliases
export type IGanAuditor = IGansAuditorCodexAuditor;
export type ISessionManager = IGansAuditorCodexSessionManager;
export type IContextPacker = IGansAuditorCodexContextPacker;
export type ICodexJudge = IGansAuditorCodexJudge;
export type IMockCodexJudge = IGansAuditorCodexMockJudge;
export type IGitHelper = IGansAuditorCodexGitHelper;
export type IFileSystemHelper = IGansAuditorCodexFileSystemHelper;