/**
 * Enhanced Response Builder for Synchronous Audit Workflow
 * 
 * This module implements the enhanced response builder that creates structured
 * feedback responses for the synchronous audit workflow, including improvement
 * suggestions, critical issue categorization, and next steps guidance.
 * 
 * Requirements addressed:
 * - 5.1: Detailed feedback format with improvement suggestions
 * - 5.2: Critical issue categorization and next steps guidance
 * - 5.3: Completion status and loop information in responses
 * - 5.4: Structured feedback format for LLM consumption
 */

import type {
  GansAuditorCodexStandardResponse,
  GansAuditorCodexReview,
  GansAuditorCodexSessionState,
  CompletionReason,
  TerminationReason,
} from './gan-types.js';

import type {
  CompletionResult,
  TerminationResult,
} from '../auditor/completion-evaluator.js';

import type {
  DetailedStagnationAnalysis,
} from '../auditor/loop-detector.js';

import type {
  SynchronousEnhancedResponse,
  StructuredFeedback,
  ImprovementSuggestion,
  CriticalIssue,
  NextStep,
  LoopInfo,
  TerminationInfo,
  SessionMetadata,
  ProgressAssessment,
  FeedbackAnalysis,
  ImprovementTracking,
  EnhancedResponseConfig,
  CompletionStatus,
} from './synchronous-response-types.js';

import {
  IssueCategory,
  Priority,
  Severity,
  CriticalIssueType,
  ProgressTrend,
  FeedbackDetailLevel,
  DEFAULT_ENHANCED_RESPONSE_CONFIG,
} from './synchronous-response-types.js';

import { logger, createComponentLogger } from '../utils/logger.js';

// ============================================================================
// Enhanced Response Builder Implementation
// ============================================================================

/**
 * Builder for creating enhanced responses with structured feedback
 * 
 * This class transforms audit results into structured, actionable feedback
 * that helps LLMs understand what needs to be improved and how to proceed.
 */
export class EnhancedResponseBuilder {
  private readonly componentLogger: typeof logger;
  private config: EnhancedResponseConfig;

  constructor(config: Partial<EnhancedResponseConfig> = {}) {
    this.config = { ...DEFAULT_ENHANCED_RESPONSE_CONFIG, ...config };
    this.componentLogger = createComponentLogger('enhanced-response-builder');
  }

  /**
   * Build a synchronous enhanced response from audit results
   * 
   * @param standardResponse Base response structure
   * @param auditResult GAN audit results
   * @param completionResult Completion evaluation
   * @param sessionState Current session state
   * @param stagnationAnalysis Stagnation detection results
   * @param terminationResult Termination analysis if applicable
   * @returns Enhanced response with structured feedback
   */
  public buildSynchronousResponse(
    standardResponse: GansAuditorCodexStandardResponse,
    auditResult?: GansAuditorCodexReview,
    completionResult?: CompletionResult,
    sessionState?: GansAuditorCodexSessionState,
    stagnationAnalysis?: DetailedStagnationAnalysis,
    terminationResult?: TerminationResult
  ): SynchronousEnhancedResponse {
    this.componentLogger.debug('Building synchronous enhanced response', {
      hasAudit: !!auditResult,
      hasCompletion: !!completionResult,
      hasSession: !!sessionState,
      hasStagnation: !!stagnationAnalysis,
      hasTermination: !!terminationResult,
    });

    // Start with the base enhanced response
    const response: SynchronousEnhancedResponse = {
      ...standardResponse,
    };

    // Add session ID if available
    if (sessionState?.id) {
      response.sessionId = sessionState.id;
    }

    // Add GAN audit results if available
    if (auditResult) {
      response.gan = auditResult;
    }

    // Build structured feedback
    if (auditResult && this.config.includeDetailedFeedback) {
      response.feedback = this.buildStructuredFeedback(
        auditResult,
        sessionState,
        stagnationAnalysis,
        terminationResult
      );
    }

    // Build completion status
    if (completionResult && auditResult) {
      response.completionStatus = this.buildCompletionStatus(
        completionResult,
        auditResult.overall,
        sessionState?.currentLoop || 1
      );
    }

    // Build loop information
    if (sessionState && this.config.includeLoopInfo) {
      response.loopInfo = this.buildLoopInfo(
        sessionState,
        stagnationAnalysis
      );
    }

    // Build termination information
    if (terminationResult?.shouldTerminate) {
      response.terminationInfo = this.buildTerminationInfo(
        terminationResult,
        sessionState
      );
    }

    // Build session metadata
    if (sessionState && this.config.includeSessionMetadata) {
      response.sessionMetadata = this.buildSessionMetadata(sessionState);
    }

    this.componentLogger.debug('Enhanced response built successfully', {
      hasFeedback: !!response.feedback,
      hasCompletionStatus: !!response.completionStatus,
      hasLoopInfo: !!response.loopInfo,
      hasTerminationInfo: !!response.terminationInfo,
    });

    return response;
  }

  /**
   * Update configuration for response building
   */
  public updateConfig(newConfig: Partial<EnhancedResponseConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.componentLogger.debug('Enhanced response builder config updated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): EnhancedResponseConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Private Builder Methods
  // ============================================================================

  /**
   * Build structured feedback from audit results
   */
  private buildStructuredFeedback(
    auditResult: GansAuditorCodexReview,
    sessionState?: GansAuditorCodexSessionState,
    stagnationAnalysis?: DetailedStagnationAnalysis,
    terminationResult?: TerminationResult
  ): StructuredFeedback {
    // Extract improvement suggestions from audit
    const improvements = this.extractImprovementSuggestions(auditResult);
    
    // Extract critical issues
    const criticalIssues = this.extractCriticalIssues(auditResult, terminationResult);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(
      auditResult,
      improvements,
      criticalIssues,
      stagnationAnalysis
    );
    
    // Assess progress
    const progressAssessment = this.assessProgress(
      auditResult,
      sessionState,
      stagnationAnalysis
    );

    // Build summary
    const summary = this.buildFeedbackSummary(
      auditResult,
      improvements.length,
      criticalIssues.length,
      progressAssessment
    );

    return {
      summary,
      improvements: improvements.slice(0, this.config.maxImprovements),
      criticalIssues: criticalIssues.slice(0, this.config.maxCriticalIssues),
      nextSteps: nextSteps.slice(0, this.config.maxNextSteps),
      progressAssessment,
    };
  }

  /**
   * Extract improvement suggestions from audit results
   */
  private extractImprovementSuggestions(auditResult: GansAuditorCodexReview): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // Process inline comments
    if (auditResult.review.inline) {
      for (const comment of auditResult.review.inline) {
        const suggestion = this.convertCommentToSuggestion(comment);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    // Process dimensional scores for additional suggestions
    for (const dimension of auditResult.dimensions) {
      if (dimension.score < 80) { // Below good threshold
        const suggestion = this.createDimensionalSuggestion(dimension);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    // Sort by priority and category
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Convert inline comment to improvement suggestion
   */
  private convertCommentToSuggestion(comment: any): ImprovementSuggestion | null {
    if (!comment.comment || !comment.path || comment.comment.trim() === '' || comment.path.trim() === '') {
      return null;
    }

    const category = this.categorizeComment(comment.comment);
    const priority = this.determinePriority(comment.comment, category);
    
    // Extract actionable guidance from comment
    const action = this.extractActionFromComment(comment.comment);

    return {
      category,
      priority,
      description: comment.comment,
      action,
      location: {
        path: comment.path,
        line: comment.line,
      },
    };
  }

  /**
   * Categorize comment by content analysis
   */
  private categorizeComment(comment: string): IssueCategory {
    const lowerComment = comment.toLowerCase();

    if (lowerComment.includes('security') || lowerComment.includes('vulnerability') || 
        lowerComment.includes('injection') || lowerComment.includes('xss')) {
      return IssueCategory.SECURITY;
    }
    if (lowerComment.includes('performance') || lowerComment.includes('optimization') || 
        lowerComment.includes('slow') || lowerComment.includes('inefficient')) {
      return IssueCategory.PERFORMANCE;
    }
    if (lowerComment.includes('style') || lowerComment.includes('formatting') || 
        lowerComment.includes('convention') || lowerComment.includes('lint')) {
      return IssueCategory.STYLE;
    }
    if (lowerComment.includes('logic') || lowerComment.includes('algorithm') || 
        lowerComment.includes('incorrect') || lowerComment.includes('bug')) {
      return IssueCategory.LOGIC;
    }
    if (lowerComment.includes('error') || lowerComment.includes('exception') || 
        lowerComment.includes('handling') || lowerComment.includes('catch')) {
      return IssueCategory.ERROR_HANDLING;
    }
    if (lowerComment.includes('test') || lowerComment.includes('coverage') || 
        lowerComment.includes('assertion')) {
      return IssueCategory.TESTING;
    }
    if (lowerComment.includes('document') || lowerComment.includes('comment') || 
        lowerComment.includes('readme')) {
      return IssueCategory.DOCUMENTATION;
    }
    if (lowerComment.includes('architecture') || lowerComment.includes('design') || 
        lowerComment.includes('structure')) {
      return IssueCategory.ARCHITECTURE;
    }
    if (lowerComment.includes('maintain') || lowerComment.includes('readable') || 
        lowerComment.includes('clean')) {
      return IssueCategory.MAINTAINABILITY;
    }

    return IssueCategory.LOGIC; // Default category
  }

  /**
   * Determine priority based on comment content and category
   */
  private determinePriority(comment: string, category: IssueCategory): Priority {
    const lowerComment = comment.toLowerCase();

    // Critical priority indicators
    if (lowerComment.includes('critical') || lowerComment.includes('blocker') || 
        lowerComment.includes('security') || lowerComment.includes('vulnerability') ||
        lowerComment.includes('data loss') || lowerComment.includes('crash')) {
      return Priority.CRITICAL;
    }

    // High priority indicators
    if (lowerComment.includes('important') || lowerComment.includes('must') || 
        lowerComment.includes('required') || lowerComment.includes('error') ||
        category === IssueCategory.SECURITY || category === IssueCategory.LOGIC) {
      return Priority.HIGH;
    }

    // Low priority indicators
    if (lowerComment.includes('minor') || lowerComment.includes('style') || 
        lowerComment.includes('cosmetic') || lowerComment.includes('suggestion') ||
        category === IssueCategory.STYLE || category === IssueCategory.DOCUMENTATION) {
      return Priority.LOW;
    }

    return Priority.MEDIUM; // Default priority
  }

  /**
   * Extract actionable guidance from comment
   */
  private extractActionFromComment(comment: string): string {
    // Look for action verbs and suggestions
    const actionPatterns = [
      /should\s+(.+?)(?:\.|$)/i,
      /need\s+to\s+(.+?)(?:\.|$)/i,
      /must\s+(.+?)(?:\.|$)/i,
      /consider\s+(.+?)(?:\.|$)/i,
      /try\s+(.+?)(?:\.|$)/i,
      /use\s+(.+?)(?:\.|$)/i,
      /add\s+(.+?)(?:\.|$)/i,
      /remove\s+(.+?)(?:\.|$)/i,
      /fix\s+(.+?)(?:\.|$)/i,
      /implement\s+(.+?)(?:\.|$)/i,
    ];

    for (const pattern of actionPatterns) {
      const match = comment.match(pattern);
      if (match && match[1]) {
        return `${match[0].split(' ')[0].toLowerCase()} ${match[1].trim()}`;
      }
    }

    // If no specific action found, create generic action
    return `Address the issue: ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}`;
  }

  /**
   * Create suggestion from dimensional score
   */
  private createDimensionalSuggestion(dimension: any): ImprovementSuggestion | null {
    const dimensionName = dimension.name.toLowerCase();
    let category: IssueCategory;
    let action: string;

    switch (dimensionName) {
      case 'accuracy':
        category = IssueCategory.LOGIC;
        action = 'Review and correct logical errors to improve accuracy';
        break;
      case 'completeness':
        category = IssueCategory.ARCHITECTURE;
        action = 'Add missing functionality to achieve completeness';
        break;
      case 'clarity':
        category = IssueCategory.MAINTAINABILITY;
        action = 'Improve code readability and add explanatory comments';
        break;
      case 'actionability':
        category = IssueCategory.DOCUMENTATION;
        action = 'Provide more specific and actionable implementation details';
        break;
      case 'human_likeness':
        category = IssueCategory.STYLE;
        action = 'Adopt more natural and idiomatic coding patterns';
        break;
      default:
        return null;
    }

    return {
      category,
      priority: dimension.score < 60 ? Priority.HIGH : Priority.MEDIUM,
      description: `${dimension.name} score is ${dimension.score}% - below optimal threshold`,
      action,
    };
  }

  /**
   * Extract critical issues from audit results
   */
  private extractCriticalIssues(
    auditResult: GansAuditorCodexReview,
    terminationResult?: TerminationResult
  ): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    // Extract from inline comments
    if (auditResult.review.inline) {
      for (const comment of auditResult.review.inline) {
        const issue = this.convertCommentToCriticalIssue(comment);
        if (issue) {
          issues.push(issue);
        }
      }
    }

    // Add termination-related critical issues
    if (terminationResult?.shouldTerminate && terminationResult.criticalIssues) {
      for (const issueDescription of terminationResult.criticalIssues) {
        issues.push({
          type: CriticalIssueType.LOGIC_ERROR,
          severity: Severity.MAJOR,
          description: issueDescription,
          impact: 'Prevents successful completion of the task',
          resolution: 'Address the underlying issue causing repeated failures',
        });
      }
    }

    // Sort by severity
    return issues.sort((a, b) => {
      const severityOrder = { blocker: 0, critical: 1, major: 2, minor: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Convert comment to critical issue if applicable
   */
  private convertCommentToCriticalIssue(comment: any): CriticalIssue | null {
    if (!comment.comment) {
      return null;
    }

    const lowerComment = comment.comment.toLowerCase();
    
    // Only convert comments that indicate critical issues
    if (!this.isCriticalComment(lowerComment)) {
      return null;
    }

    const type = this.determineCriticalIssueType(lowerComment);
    const severity = this.determineSeverity(lowerComment);

    return {
      type,
      severity,
      description: comment.comment,
      impact: this.generateImpactDescription(type, severity),
      resolution: this.generateResolutionGuidance(type, comment.comment),
      location: comment.path ? {
        path: comment.path,
        line: comment.line,
      } : undefined,
    };
  }

  /**
   * Check if comment indicates a critical issue
   */
  private isCriticalComment(comment: string): boolean {
    const criticalIndicators = [
      'critical', 'blocker', 'security', 'vulnerability', 'injection',
      'crash', 'data loss', 'corruption', 'deadlock', 'race condition',
      'infinite loop', 'null pointer', 'memory leak', 'buffer overflow',
    ];

    return criticalIndicators.some(indicator => comment.includes(indicator));
  }

  /**
   * Determine critical issue type from comment
   */
  private determineCriticalIssueType(comment: string): CriticalIssueType {
    if (comment.includes('security') || comment.includes('vulnerability') || comment.includes('injection')) {
      return CriticalIssueType.SECURITY_VULNERABILITY;
    }
    if (comment.includes('performance') || comment.includes('bottleneck')) {
      return CriticalIssueType.PERFORMANCE_BOTTLENECK;
    }
    if (comment.includes('infinite loop') || comment.includes('endless')) {
      return CriticalIssueType.INFINITE_LOOP;
    }
    if (comment.includes('null') || comment.includes('undefined')) {
      return CriticalIssueType.NULL_POINTER;
    }
    if (comment.includes('race') || comment.includes('concurrent')) {
      return CriticalIssueType.RACE_CONDITION;
    }
    if (comment.includes('deadlock')) {
      return CriticalIssueType.DEADLOCK_RISK;
    }
    if (comment.includes('leak') || comment.includes('memory')) {
      return CriticalIssueType.RESOURCE_LEAK;
    }
    if (comment.includes('corruption') || comment.includes('data loss')) {
      return CriticalIssueType.DATA_CORRUPTION_RISK;
    }
    if (comment.includes('compatibility')) {
      return CriticalIssueType.COMPATIBILITY_ISSUE;
    }

    return CriticalIssueType.LOGIC_ERROR; // Default
  }

  /**
   * Determine severity from comment content
   */
  private determineSeverity(comment: string): Severity {
    if (comment.includes('blocker') || comment.includes('critical') || 
        comment.includes('crash') || comment.includes('data loss')) {
      return Severity.BLOCKER;
    }
    if (comment.includes('security') || comment.includes('vulnerability') || 
        comment.includes('corruption')) {
      return Severity.CRITICAL;
    }
    if (comment.includes('important') || comment.includes('significant')) {
      return Severity.MAJOR;
    }

    return Severity.MINOR;
  }

  /**
   * Generate impact description for critical issue
   */
  private generateImpactDescription(type: CriticalIssueType, severity: Severity): string {
    const impactMap: Record<CriticalIssueType, string> = {
      [CriticalIssueType.SECURITY_VULNERABILITY]: 'Could allow unauthorized access or data breach',
      [CriticalIssueType.LOGIC_ERROR]: 'May cause incorrect behavior or unexpected results',
      [CriticalIssueType.PERFORMANCE_BOTTLENECK]: 'Could significantly degrade system performance',
      [CriticalIssueType.COMPATIBILITY_ISSUE]: 'May prevent proper operation in target environment',
      [CriticalIssueType.DATA_CORRUPTION_RISK]: 'Could result in loss or corruption of important data',
      [CriticalIssueType.RESOURCE_LEAK]: 'May cause memory or resource exhaustion over time',
      [CriticalIssueType.INFINITE_LOOP]: 'Could cause application to hang or become unresponsive',
      [CriticalIssueType.NULL_POINTER]: 'May cause application crashes or undefined behavior',
      [CriticalIssueType.RACE_CONDITION]: 'Could lead to unpredictable behavior in concurrent scenarios',
      [CriticalIssueType.DEADLOCK_RISK]: 'May cause application to freeze or become unresponsive',
    };

    let impact = impactMap[type] || 'Could cause system malfunction';
    
    if (severity === Severity.BLOCKER || severity === Severity.CRITICAL) {
      impact += ' - immediate attention required';
    }

    return impact;
  }

  /**
   * Generate resolution guidance for critical issue
   */
  private generateResolutionGuidance(type: CriticalIssueType, comment: string): string {
    const resolutionMap: Record<CriticalIssueType, string> = {
      [CriticalIssueType.SECURITY_VULNERABILITY]: 'Implement proper input validation and security controls',
      [CriticalIssueType.LOGIC_ERROR]: 'Review and correct the logical flow and conditions',
      [CriticalIssueType.PERFORMANCE_BOTTLENECK]: 'Optimize algorithms and data structures for better performance',
      [CriticalIssueType.COMPATIBILITY_ISSUE]: 'Update code to use compatible APIs and patterns',
      [CriticalIssueType.DATA_CORRUPTION_RISK]: 'Add proper data validation and backup mechanisms',
      [CriticalIssueType.RESOURCE_LEAK]: 'Ensure proper resource cleanup and disposal',
      [CriticalIssueType.INFINITE_LOOP]: 'Add proper loop termination conditions',
      [CriticalIssueType.NULL_POINTER]: 'Add null checks and proper error handling',
      [CriticalIssueType.RACE_CONDITION]: 'Implement proper synchronization mechanisms',
      [CriticalIssueType.DEADLOCK_RISK]: 'Review and redesign locking strategy',
    };

    return resolutionMap[type] || 'Review and address the identified issue';
  }

  /**
   * Generate next steps based on audit results and analysis
   */
  private generateNextSteps(
    auditResult: GansAuditorCodexReview,
    improvements: ImprovementSuggestion[],
    criticalIssues: CriticalIssue[],
    stagnationAnalysis?: DetailedStagnationAnalysis
  ): NextStep[] {
    const steps: NextStep[] = [];
    let stepNumber = 1;

    // Handle stagnation first
    if (stagnationAnalysis?.isStagnant) {
      steps.push({
        step: stepNumber++,
        action: 'Break out of stagnation pattern',
        rationale: stagnationAnalysis.recommendation,
        expectedOutcome: 'Resume meaningful progress toward completion',
        priority: Priority.CRITICAL,
      });

      // Add alternative suggestions from stagnation analysis
      for (const suggestion of stagnationAnalysis.alternativeSuggestions.slice(0, 2)) {
        steps.push({
          step: stepNumber++,
          action: suggestion,
          rationale: 'Alternative approach to overcome current obstacles',
          expectedOutcome: 'Different perspective may lead to breakthrough',
          priority: Priority.HIGH,
        });
      }
    }

    // Address critical issues first
    const blockerIssues = criticalIssues.filter(issue => 
      issue.severity === Severity.BLOCKER || issue.severity === Severity.CRITICAL
    );
    
    for (const issue of blockerIssues.slice(0, 2)) {
      steps.push({
        step: stepNumber++,
        action: issue.resolution,
        rationale: `Critical issue: ${issue.description}`,
        expectedOutcome: `Resolve ${issue.type} to prevent ${issue.impact.toLowerCase()}`,
        priority: Priority.CRITICAL,
      });
    }

    // Address high-priority improvements
    const highPriorityImprovements = improvements.filter(imp => 
      imp.priority === Priority.CRITICAL || imp.priority === Priority.HIGH
    );

    for (const improvement of highPriorityImprovements.slice(0, 3)) {
      steps.push({
        step: stepNumber++,
        action: improvement.action,
        rationale: `${improvement.category} improvement needed: ${improvement.description}`,
        expectedOutcome: `Improved ${improvement.category} score and overall quality`,
        priority: improvement.priority,
      });
    }

    // Add general improvement step based on verdict
    if (auditResult.verdict === 'revise') {
      steps.push({
        step: stepNumber++,
        action: 'Implement remaining improvements and resubmit',
        rationale: 'Code needs revision to meet quality standards',
        expectedOutcome: 'Higher audit score and potential approval',
        priority: Priority.MEDIUM,
      });
    } else if (auditResult.verdict === 'reject') {
      steps.push({
        step: stepNumber++,
        action: 'Redesign approach to address fundamental issues',
        rationale: 'Current implementation has significant problems',
        expectedOutcome: 'Fresh approach may resolve persistent issues',
        priority: Priority.HIGH,
      });
    }

    return steps;
  }

  /**
   * Assess progress based on audit results and session state
   */
  private assessProgress(
    auditResult: GansAuditorCodexReview,
    sessionState?: GansAuditorCodexSessionState,
    stagnationAnalysis?: DetailedStagnationAnalysis
  ): ProgressAssessment {
    let trend: ProgressTrend = ProgressTrend.IMPROVING;
    let confidence = 0.5;
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Analyze stagnation first (highest priority)
    if (stagnationAnalysis?.isStagnant) {
      trend = ProgressTrend.STAGNANT;
      confidence = 0.9;
      factors.push('Stagnation detected in recent iterations');
      recommendations.push('Try alternative approaches to break stagnation');
      
      return {
        trend,
        confidence,
        factors,
        recommendations,
      };
    }

    // Analyze score progression
    if (sessionState?.history && sessionState.history.length > 1) {
      const recentScores = sessionState.history.slice(-3).map(h => h.review.overall);
      const scoreChange = recentScores[recentScores.length - 1] - recentScores[0];
      
      if (scoreChange > 2) {
        trend = ProgressTrend.IMPROVING;
        factors.push('Scores improving over recent iterations');
        recommendations.push('Continue current approach with refinements');
      } else if (scoreChange < -2) {
        trend = ProgressTrend.DECLINING;
        factors.push('Scores declining in recent iterations');
        recommendations.push('Review recent changes and consider reverting problematic modifications');
      } else if (Math.abs(scoreChange) <= 1) {
        trend = ProgressTrend.STAGNANT;
        factors.push('Scores plateauing without significant improvement');
        recommendations.push('Focus on addressing different types of issues');
      } else {
        trend = ProgressTrend.OSCILLATING;
        factors.push('Scores fluctuating without clear direction');
        recommendations.push('Establish consistent improvement strategy');
      }
      
      confidence = Math.min(0.9, 0.5 + (recentScores.length * 0.1));
    }

    // Analyze verdict progression
    if (sessionState?.history) {
      const recentVerdicts = sessionState.history.slice(-2).map(h => h.review.verdict);
      if (recentVerdicts.length > 1) {
        if (recentVerdicts[0] === 'reject' && recentVerdicts[1] === 'revise') {
          factors.push('Verdict improved from reject to revise');
        } else if (recentVerdicts[0] === 'revise' && recentVerdicts[1] === 'reject') {
          factors.push('Verdict declined from revise to reject');
          trend = ProgressTrend.DECLINING;
        }
      }
    }

    // Current score analysis
    if (auditResult.overall >= 90) {
      factors.push('High audit score achieved');
      recommendations.push('Focus on final polish and edge cases');
    } else if (auditResult.overall >= 70) {
      factors.push('Good progress with room for improvement');
      recommendations.push('Address remaining medium-priority issues');
    } else if (auditResult.overall >= 50) {
      factors.push('Moderate progress but significant work needed');
      recommendations.push('Focus on high-priority issues first');
    } else {
      factors.push('Low audit score indicates fundamental issues');
      recommendations.push('Consider redesigning approach or seeking guidance');
      if (trend === ProgressTrend.IMPROVING) {
        trend = ProgressTrend.STAGNANT; // Override if score is too low
      }
    }

    return {
      trend,
      confidence,
      factors,
      recommendations,
    };
  }

  /**
   * Build feedback summary
   */
  private buildFeedbackSummary(
    auditResult: GansAuditorCodexReview,
    improvementCount: number,
    criticalCount: number,
    progressAssessment: ProgressAssessment
  ): string {
    const score = auditResult.overall;
    const verdict = auditResult.verdict;
    
    let summary = `Audit completed with ${score}% score and "${verdict}" verdict. `;
    
    if (criticalCount > 0) {
      summary += `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} identified that require immediate attention. `;
    }
    
    if (improvementCount > 0) {
      summary += `${improvementCount} improvement suggestion${improvementCount > 1 ? 's' : ''} provided. `;
    }
    
    summary += `Progress trend: ${progressAssessment.trend}. `;
    
    if (progressAssessment.recommendations.length > 0) {
      summary += `Key recommendation: ${progressAssessment.recommendations[0]}`;
    }

    return summary;
  }

  /**
   * Build completion status information
   */
  private buildCompletionStatus(
    completionResult: CompletionResult,
    score: number,
    currentLoop: number
  ): CompletionStatus {
    // Calculate progress percentage based on score and loop
    let progressPercentage = 0;
    
    if (completionResult.isComplete) {
      progressPercentage = 1.0;
    } else {
      // Base progress on score achievement
      const scoreProgress = score / 100;
      // Add loop progress (diminishing returns)
      const loopProgress = Math.min(currentLoop / 25, 0.3); // Max 30% from loops
      progressPercentage = Math.min(scoreProgress + loopProgress, 0.95); // Cap at 95% until complete
    }

    // Determine threshold based on current loop
    let threshold = 95; // Default to highest standard
    if (currentLoop >= 20) threshold = 85;
    else if (currentLoop >= 15) threshold = 90;
    else if (currentLoop >= 10) threshold = 95;

    return {
      isComplete: completionResult.isComplete,
      reason: completionResult.reason,
      currentLoop,
      score,
      threshold,
      message: completionResult.message || 'Processing...',
      progressPercentage,
    };
  }

  /**
   * Build loop information
   */
  private buildLoopInfo(
    sessionState: GansAuditorCodexSessionState,
    stagnationAnalysis?: DetailedStagnationAnalysis
  ): LoopInfo {
    const currentLoop = sessionState.currentLoop;
    const maxLoops = 25; // Hard stop limit
    
    // Calculate score progression
    const scoreProgression = sessionState.history.slice(-5).map(h => h.review.overall);
    
    // Calculate average improvement
    let averageImprovement = 0;
    if (scoreProgression.length > 1) {
      const improvements = [];
      for (let i = 1; i < scoreProgression.length; i++) {
        improvements.push(scoreProgression[i] - scoreProgression[i - 1]);
      }
      averageImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
    }

    // Determine progress trend
    let progressTrend: ProgressTrend = ProgressTrend.IMPROVING;
    if (stagnationAnalysis?.isStagnant) {
      progressTrend = ProgressTrend.STAGNANT;
    } else if (averageImprovement < -1) {
      progressTrend = ProgressTrend.DECLINING;
    } else if (Math.abs(averageImprovement) < 0.5) {
      progressTrend = ProgressTrend.OSCILLATING;
    }

    return {
      currentLoop,
      maxLoops,
      progressTrend,
      stagnationDetected: stagnationAnalysis?.isStagnant || false,
      scoreProgression,
      averageImprovement,
      loopsRemaining: maxLoops - currentLoop,
    };
  }

  /**
   * Build termination information
   */
  private buildTerminationInfo(
    terminationResult: TerminationResult,
    sessionState?: GansAuditorCodexSessionState
  ): TerminationInfo {
    // Determine termination type
    let type: TerminationReason = 'completion';
    const reasonLower = terminationResult.reason.toLowerCase();
    if (reasonLower.includes('stagnation')) {
      type = 'stagnation';
    } else if (reasonLower.includes('maximum') || reasonLower.includes('loops')) {
      type = 'timeout';
    } else if (reasonLower.includes('failure') || reasonLower.includes('failed')) {
      type = 'failure';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (type === 'stagnation') {
      recommendations.push('Try a completely different approach or implementation strategy');
      recommendations.push('Consider breaking the problem into smaller, more manageable pieces');
      recommendations.push('Seek additional context or requirements clarification');
    } else if (type === 'timeout') {
      recommendations.push('Focus on the most critical issues identified in the final assessment');
      recommendations.push('Consider manual review of the remaining issues');
      recommendations.push('Use the current implementation as a foundation for future iterations');
    } else if (type === 'failure') {
      recommendations.push('Review the fundamental approach and requirements');
      recommendations.push('Consider starting with a simpler implementation');
      recommendations.push('Seek guidance on the specific technical challenges encountered');
    }

    return {
      reason: terminationResult.reason,
      type,
      failureRate: terminationResult.failureRate,
      criticalIssues: terminationResult.criticalIssues,
      finalAssessment: terminationResult.finalAssessment,
      recommendations,
    };
  }

  /**
   * Build session metadata
   */
  private buildSessionMetadata(sessionState: GansAuditorCodexSessionState): SessionMetadata {
    const currentTime = Date.now();
    const totalSessionTime = currentTime - sessionState.createdAt;

    return {
      sessionId: sessionState.id,
      loopId: sessionState.loopId,
      sessionStartTime: sessionState.createdAt,
      currentIterationTime: currentTime,
      totalSessionTime,
      sessionConfig: {
        threshold: sessionState.config.threshold,
        maxCycles: sessionState.config.maxCycles,
        judges: sessionState.config.judges,
        scope: sessionState.config.scope,
      },
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an enhanced response builder with default configuration
 */
export function createEnhancedResponseBuilder(
  config?: Partial<EnhancedResponseConfig>
): EnhancedResponseBuilder {
  return new EnhancedResponseBuilder(config);
}

/**
 * Create a minimal enhanced response builder for basic feedback
 */
export function createMinimalEnhancedResponseBuilder(): EnhancedResponseBuilder {
  return new EnhancedResponseBuilder({
    includeDetailedFeedback: true,
    includeLoopInfo: false,
    includeSessionMetadata: false,
    maxImprovements: 5,
    maxCriticalIssues: 3,
    maxNextSteps: 3,
    feedbackDetailLevel: FeedbackDetailLevel.MINIMAL,
  });
}

/**
 * Create a comprehensive enhanced response builder for detailed analysis
 */
export function createComprehensiveEnhancedResponseBuilder(): EnhancedResponseBuilder {
  return new EnhancedResponseBuilder({
    includeDetailedFeedback: true,
    includeLoopInfo: true,
    includeSessionMetadata: true,
    maxImprovements: 15,
    maxCriticalIssues: 10,
    maxNextSteps: 8,
    feedbackDetailLevel: FeedbackDetailLevel.COMPREHENSIVE,
  });
}