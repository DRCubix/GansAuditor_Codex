/**
 * Output Sanitizer for GAN Auditor System Prompt
 * 
 * This module implements output sanitization and security with PII detection,
 * sensitive data placeholder replacement, tool syntax hiding, and secret masking
 * as specified in requirement 5.7.
 * 
 * Requirements addressed:
 * - 5.7: Output sanitization and security
 * - Implement PII detection and sanitization
 * - Add sensitive data placeholder replacement
 * - Create tool syntax hiding
 * - Add secret detection and masking
 */

import type {
  SanitizationResult,
  SanitizationMetadata,
  SanitizationAction,
  SanitizationLevel,
  SanitizationType,
  PIIPattern,
  StructuredFeedbackOutput
} from '../../types/feedback-types.js';

// ============================================================================
// Output Sanitizer Configuration
// ============================================================================

/**
 * Configuration for output sanitization
 */
export interface OutputSanitizerConfig {
  /** Sanitization level */
  sanitizationLevel: SanitizationLevel;
  /** PII detection patterns */
  piiPatterns: PIIPattern[];
  /** Secret detection patterns */
  secretPatterns: SecretPattern[];
  /** Tool syntax patterns to hide */
  toolSyntaxPatterns: ToolSyntaxPattern[];
  /** Path anonymization settings */
  pathAnonymization: PathAnonymizationConfig;
  /** Content filtering settings */
  contentFiltering: ContentFilteringConfig;
}

/**
 * Secret detection pattern
 */
export interface SecretPattern {
  /** Pattern name */
  name: string;
  /** Regular expression */
  pattern: RegExp;
  /** Replacement value */
  replacement: string;
  /** Confidence threshold */
  confidenceThreshold: number;
  /** Pattern category */
  category: SecretCategory;
}

/**
 * Secret category enumeration
 */
export type SecretCategory = 
  | "api_key"
  | "password"
  | "token"
  | "certificate"
  | "connection_string"
  | "credential";

/**
 * Tool syntax pattern
 */
export interface ToolSyntaxPattern {
  /** Pattern name */
  name: string;
  /** Regular expression */
  pattern: RegExp;
  /** Replacement value */
  replacement: string;
  /** Whether to preserve functionality */
  preserveFunctionality: boolean;
}

/**
 * Path anonymization configuration
 */
export interface PathAnonymizationConfig {
  /** Enable path anonymization */
  enabled: boolean;
  /** Preserve relative paths */
  preserveRelativePaths: boolean;
  /** Anonymize user directories */
  anonymizeUserDirectories: boolean;
  /** Maximum path depth to show */
  maxPathDepth: number;
}

/**
 * Content filtering configuration
 */
export interface ContentFilteringConfig {
  /** Remove debug information */
  removeDebugInfo: boolean;
  /** Remove internal comments */
  removeInternalComments: boolean;
  /** Sanitize error messages */
  sanitizeErrorMessages: boolean;
  /** Remove stack traces */
  removeStackTraces: boolean;
}

/**
 * Sanitization context
 */
export interface SanitizationContext {
  /** Content type being sanitized */
  contentType: string;
  /** Source of the content */
  source: string;
  /** Target audience */
  audience: "internal" | "external" | "public";
  /** Sanitization requirements */
  requirements: SanitizationRequirement[];
}

/**
 * Sanitization requirement
 */
export interface SanitizationRequirement {
  /** Requirement type */
  type: SanitizationType;
  /** Requirement level */
  level: "required" | "recommended" | "optional";
  /** Custom patterns */
  customPatterns?: RegExp[];
}

// ============================================================================
// Output Sanitizer Implementation
// ============================================================================

/**
 * Sanitizes output content to remove PII, secrets, and sensitive information
 */
export class OutputSanitizer {
  private config: OutputSanitizerConfig;

  constructor(config?: Partial<OutputSanitizerConfig>) {
    this.config = {
      ...DEFAULT_OUTPUT_SANITIZER_CONFIG,
      ...config
    };
  }

  /**
   * Sanitize structured feedback output
   */
  async sanitizeStructuredOutput(
    output: StructuredFeedbackOutput,
    context?: SanitizationContext
  ): Promise<StructuredFeedbackOutput> {
    const sanitizedOutput = JSON.parse(JSON.stringify(output)); // Deep clone

    // Sanitize each component
    sanitizedOutput.executiveVerdict = await this.sanitizeExecutiveVerdict(
      sanitizedOutput.executiveVerdict,
      context
    );

    sanitizedOutput.evidenceTable = await this.sanitizeEvidenceTable(
      sanitizedOutput.evidenceTable,
      context
    );

    sanitizedOutput.proposedDiffs = await this.sanitizeProposedDiffs(
      sanitizedOutput.proposedDiffs,
      context
    );

    sanitizedOutput.reproductionGuide = await this.sanitizeReproductionGuide(
      sanitizedOutput.reproductionGuide,
      context
    );

    sanitizedOutput.traceabilityMatrix = await this.sanitizeTraceabilityMatrix(
      sanitizedOutput.traceabilityMatrix,
      context
    );

    sanitizedOutput.followUpTasks = await this.sanitizeFollowUpTasks(
      sanitizedOutput.followUpTasks,
      context
    );

    // Generate sanitization results
    const sanitizationResults = await this.generateSanitizationResults(
      JSON.stringify(output),
      JSON.stringify(sanitizedOutput),
      context
    );

    sanitizedOutput.sanitizationResults = sanitizationResults;

    return sanitizedOutput;
  }

  /**
   * Sanitize text content
   */
  async sanitizeText(
    content: string,
    context?: SanitizationContext
  ): Promise<SanitizationResult> {
    const actions: SanitizationAction[] = [];
    let sanitizedContent = content;

    // Apply PII sanitization
    const piiResult = await this.sanitizePII(sanitizedContent, context);
    sanitizedContent = piiResult.sanitizedContent;
    actions.push(...piiResult.actions);

    // Apply secret sanitization
    const secretResult = await this.sanitizeSecrets(sanitizedContent, context);
    sanitizedContent = secretResult.sanitizedContent;
    actions.push(...secretResult.actions);

    // Apply tool syntax hiding
    const toolSyntaxResult = await this.hideToolSyntax(sanitizedContent, context);
    sanitizedContent = toolSyntaxResult.sanitizedContent;
    actions.push(...toolSyntaxResult.actions);

    // Apply path anonymization
    const pathResult = await this.anonymizePaths(sanitizedContent, context);
    sanitizedContent = pathResult.sanitizedContent;
    actions.push(...pathResult.actions);

    // Apply content filtering
    const filterResult = await this.filterContent(sanitizedContent, context);
    sanitizedContent = filterResult.sanitizedContent;
    actions.push(...filterResult.actions);

    // Generate metadata
    const metadata = this.generateSanitizationMetadata(context);

    return {
      metadata,
      originalContent: content,
      sanitizedContent,
      actions,
      warnings: this.generateWarnings(actions)
    };
  }

  /**
   * Sanitize PII from content
   */
  private async sanitizePII(
    content: string,
    context?: SanitizationContext
  ): Promise<{ sanitizedContent: string; actions: SanitizationAction[] }> {
    let sanitizedContent = content;
    const actions: SanitizationAction[] = [];

    for (const pattern of this.config.piiPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          const confidence = this.calculatePIIConfidence(match, pattern);
          
          if (confidence >= pattern.confidenceThreshold) {
            sanitizedContent = sanitizedContent.replace(pattern.pattern, pattern.replacement);
            
            actions.push({
              type: "pii_detection",
              description: `Detected and replaced ${pattern.name}`,
              location: this.findMatchLocation(content, match),
              replacement: pattern.replacement,
              confidence
            });
          }
        }
      }
    }

    return { sanitizedContent, actions };
  }

  /**
   * Sanitize secrets from content
   */
  private async sanitizeSecrets(
    content: string,
    context?: SanitizationContext
  ): Promise<{ sanitizedContent: string; actions: SanitizationAction[] }> {
    let sanitizedContent = content;
    const actions: SanitizationAction[] = [];

    for (const pattern of this.config.secretPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          const confidence = this.calculateSecretConfidence(match, pattern);
          
          if (confidence >= pattern.confidenceThreshold) {
            sanitizedContent = sanitizedContent.replace(pattern.pattern, pattern.replacement);
            
            actions.push({
              type: "secret_masking",
              description: `Detected and masked ${pattern.name}`,
              location: this.findMatchLocation(content, match),
              replacement: pattern.replacement,
              confidence
            });
          }
        }
      }
    }

    return { sanitizedContent, actions };
  }

  /**
   * Hide tool syntax from content
   */
  private async hideToolSyntax(
    content: string,
    context?: SanitizationContext
  ): Promise<{ sanitizedContent: string; actions: SanitizationAction[] }> {
    let sanitizedContent = content;
    const actions: SanitizationAction[] = [];

    for (const pattern of this.config.toolSyntaxPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          sanitizedContent = sanitizedContent.replace(pattern.pattern, pattern.replacement);
          
          actions.push({
            type: "tool_syntax_hiding",
            description: `Hidden ${pattern.name} syntax`,
            location: this.findMatchLocation(content, match),
            replacement: pattern.replacement,
            confidence: 100
          });
        }
      }
    }

    return { sanitizedContent, actions };
  }

  /**
   * Anonymize file paths
   */
  private async anonymizePaths(
    content: string,
    context?: SanitizationContext
  ): Promise<{ sanitizedContent: string; actions: SanitizationAction[] }> {
    let sanitizedContent = content;
    const actions: SanitizationAction[] = [];

    if (!this.config.pathAnonymization.enabled) {
      return { sanitizedContent, actions };
    }

    // Pattern for file paths
    const pathPattern = /(?:\/[^\/\s]+)+(?:\.[a-zA-Z0-9]+)?/g;
    const matches = content.match(pathPattern);

    if (matches) {
      for (const match of matches) {
        const anonymizedPath = this.anonymizePath(match);
        
        if (anonymizedPath !== match) {
          sanitizedContent = sanitizedContent.replace(match, anonymizedPath);
          
          actions.push({
            type: "path_anonymization",
            description: "Anonymized file path",
            location: this.findMatchLocation(content, match),
            replacement: anonymizedPath,
            confidence: 90
          });
        }
      }
    }

    return { sanitizedContent, actions };
  }

  /**
   * Filter sensitive content
   */
  private async filterContent(
    content: string,
    context?: SanitizationContext
  ): Promise<{ sanitizedContent: string; actions: SanitizationAction[] }> {
    let sanitizedContent = content;
    const actions: SanitizationAction[] = [];

    // Remove debug information
    if (this.config.contentFiltering.removeDebugInfo) {
      const debugPattern = /DEBUG:\s*.*$/gm;
      const debugMatches = content.match(debugPattern);
      
      if (debugMatches) {
        sanitizedContent = sanitizedContent.replace(debugPattern, "[DEBUG INFO REMOVED]");
        
        actions.push({
          type: "sensitive_data_replacement",
          description: "Removed debug information",
          location: "multiple locations",
          replacement: "[DEBUG INFO REMOVED]",
          confidence: 100
        });
      }
    }

    // Remove stack traces
    if (this.config.contentFiltering.removeStackTraces) {
      const stackTracePattern = /\s+at\s+.*\(.*:\d+:\d+\)/g;
      const stackMatches = content.match(stackTracePattern);
      
      if (stackMatches) {
        sanitizedContent = sanitizedContent.replace(stackTracePattern, "\n    [STACK TRACE REMOVED]");
        
        actions.push({
          type: "sensitive_data_replacement",
          description: "Removed stack trace information",
          location: "multiple locations",
          replacement: "[STACK TRACE REMOVED]",
          confidence: 100
        });
      }
    }

    return { sanitizedContent, actions };
  }

  /**
   * Sanitize individual components
   */
  private async sanitizeExecutiveVerdict(verdict: any, context?: SanitizationContext): Promise<any> {
    const sanitized = { ...verdict };
    
    // Sanitize summary points
    if (sanitized.summary) {
      for (let i = 0; i < sanitized.summary.length; i++) {
        const result = await this.sanitizeText(sanitized.summary[i], context);
        sanitized.summary[i] = result.sanitizedContent;
      }
    }

    // Sanitize next steps
    if (sanitized.nextSteps) {
      for (let i = 0; i < sanitized.nextSteps.length; i++) {
        const result = await this.sanitizeText(sanitized.nextSteps[i], context);
        sanitized.nextSteps[i] = result.sanitizedContent;
      }
    }

    return sanitized;
  }

  private async sanitizeEvidenceTable(table: any, context?: SanitizationContext): Promise<any> {
    const sanitized = { ...table };
    
    if (sanitized.entries) {
      for (const entry of sanitized.entries) {
        const issueResult = await this.sanitizeText(entry.issue, context);
        entry.issue = issueResult.sanitizedContent;
        
        const proofResult = await this.sanitizeText(entry.proof.content, context);
        entry.proof.content = proofResult.sanitizedContent;
        
        const fixResult = await this.sanitizeText(entry.fixSummary, context);
        entry.fixSummary = fixResult.sanitizedContent;
      }
    }

    return sanitized;
  }

  private async sanitizeProposedDiffs(diffs: any[], context?: SanitizationContext): Promise<any[]> {
    const sanitized = [];
    
    for (const diff of diffs) {
      const sanitizedDiff = { ...diff };
      
      // Sanitize unified diff content
      const diffResult = await this.sanitizeText(sanitizedDiff.unifiedDiff, context);
      sanitizedDiff.unifiedDiff = diffResult.sanitizedContent;
      
      sanitized.push(sanitizedDiff);
    }

    return sanitized;
  }

  private async sanitizeReproductionGuide(guide: any, context?: SanitizationContext): Promise<any> {
    const sanitized = { ...guide };
    
    // Sanitize reproduction steps
    if (sanitized.reproductionSteps) {
      for (const step of sanitized.reproductionSteps) {
        const descResult = await this.sanitizeText(step.description, context);
        step.description = descResult.sanitizedContent;
        
        const cmdResult = await this.sanitizeText(step.command, context);
        step.command = cmdResult.sanitizedContent;
      }
    }

    return sanitized;
  }

  private async sanitizeTraceabilityMatrix(matrix: any, context?: SanitizationContext): Promise<any> {
    const sanitized = { ...matrix };
    
    // Sanitize AC descriptions
    if (sanitized.acMappings) {
      for (const mapping of sanitized.acMappings) {
        const descResult = await this.sanitizeText(mapping.acDescription, context);
        mapping.acDescription = descResult.sanitizedContent;
      }
    }

    return sanitized;
  }

  private async sanitizeFollowUpTasks(taskList: any, context?: SanitizationContext): Promise<any> {
    const sanitized = { ...taskList };
    
    if (sanitized.tasks) {
      for (const task of sanitized.tasks) {
        const titleResult = await this.sanitizeText(task.title, context);
        task.title = titleResult.sanitizedContent;
        
        const descResult = await this.sanitizeText(task.description, context);
        task.description = descResult.sanitizedContent;
      }
    }

    return sanitized;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculatePIIConfidence(match: string, pattern: PIIPattern): number {
    // Simple confidence calculation based on pattern specificity
    let confidence = pattern.confidenceThreshold;
    
    // Increase confidence for longer matches
    if (match.length > 10) {
      confidence += 10;
    }
    
    // Increase confidence for specific formats
    if (pattern.name === "email" && match.includes("@")) {
      confidence += 15;
    }
    
    return Math.min(confidence, 100);
  }

  private calculateSecretConfidence(match: string, pattern: SecretPattern): number {
    let confidence = pattern.confidenceThreshold;
    
    // Increase confidence for longer secrets
    if (match.length > 20) {
      confidence += 20;
    }
    
    // Increase confidence for specific patterns
    if (pattern.category === "api_key" && /^[A-Za-z0-9]{32,}$/.test(match)) {
      confidence += 25;
    }
    
    return Math.min(confidence, 100);
  }

  private findMatchLocation(content: string, match: string): string {
    const index = content.indexOf(match);
    if (index === -1) return "unknown";
    
    const lines = content.substring(0, index).split("\n");
    return `line ${lines.length}, column ${lines[lines.length - 1].length + 1}`;
  }

  private anonymizePath(path: string): string {
    if (!this.config.pathAnonymization.enabled) {
      return path;
    }

    // Replace user directories
    if (this.config.pathAnonymization.anonymizeUserDirectories) {
      path = path.replace(/\/Users\/[^\/]+/, "/Users/[user]");
      path = path.replace(/\/home\/[^\/]+/, "/home/[user]");
      path = path.replace(/C:\\Users\\[^\\]+/, "C:\\Users\\[user]");
    }

    // Limit path depth
    const parts = path.split("/");
    if (parts.length > this.config.pathAnonymization.maxPathDepth) {
      const start = parts.slice(0, 2);
      const end = parts.slice(-2);
      return [...start, "...", ...end].join("/");
    }

    return path;
  }

  private generateSanitizationMetadata(context?: SanitizationContext): SanitizationMetadata {
    return {
      timestamp: Date.now(),
      rulesApplied: [
        "pii_detection",
        "secret_masking",
        "tool_syntax_hiding",
        "path_anonymization"
      ],
      contentType: context?.contentType || "structured_feedback",
      level: this.config.sanitizationLevel
    };
  }

  private generateWarnings(actions: SanitizationAction[]): string[] {
    const warnings: string[] = [];
    
    const criticalActions = actions.filter(a => a.confidence < 70);
    if (criticalActions.length > 0) {
      warnings.push(`${criticalActions.length} sanitization action(s) have low confidence`);
    }
    
    const piiActions = actions.filter(a => a.type === "pii_detection");
    if (piiActions.length > 5) {
      warnings.push("High amount of PII detected - review sanitization carefully");
    }
    
    return warnings;
  }

  private async generateSanitizationResults(
    original: string,
    sanitized: string,
    context?: SanitizationContext
  ): Promise<SanitizationResult> {
    const result = await this.sanitizeText(original, context);
    
    // Override with actual sanitized content
    result.sanitizedContent = sanitized;
    
    return result;
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default configuration for output sanitization
 */
export const DEFAULT_OUTPUT_SANITIZER_CONFIG: OutputSanitizerConfig = {
  sanitizationLevel: "standard",
  piiPatterns: [
    {
      name: "email",
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: "[email]",
      confidenceThreshold: 90
    },
    {
      name: "phone",
      pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      replacement: "[phone_number]",
      confidenceThreshold: 80
    },
    {
      name: "ssn",
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      replacement: "[ssn]",
      confidenceThreshold: 95
    },
    {
      name: "credit_card",
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      replacement: "[credit_card]",
      confidenceThreshold: 85
    }
  ],
  secretPatterns: [
    {
      name: "api_key",
      pattern: /(?:api[_-]?key|apikey)[\s=:]+['"]*([A-Za-z0-9]{20,})['"]*\b/gi,
      replacement: "[API_KEY]",
      confidenceThreshold: 80,
      category: "api_key"
    },
    {
      name: "password",
      pattern: /(?:password|pwd|pass)[\s=:]+['"]*([^\s'"]{8,})['"]*\b/gi,
      replacement: "[PASSWORD]",
      confidenceThreshold: 70,
      category: "password"
    },
    {
      name: "token",
      pattern: /(?:token|bearer)[\s=:]+['"]*([A-Za-z0-9._-]{20,})['"]*\b/gi,
      replacement: "[TOKEN]",
      confidenceThreshold: 85,
      category: "token"
    }
  ],
  toolSyntaxPatterns: [
    {
      name: "function_call",
      pattern: /<function_calls>[\s\S]*?<\/antml:function_calls>/g,
      replacement: "[TOOL EXECUTION]",
      preserveFunctionality: false
    },
    {
      name: "tool_invocation",
      pattern: /<invoke[^>]*>[\s\S]*?<\/antml:invoke>/g,
      replacement: "[TOOL CALL]",
      preserveFunctionality: false
    }
  ],
  pathAnonymization: {
    enabled: true,
    preserveRelativePaths: true,
    anonymizeUserDirectories: true,
    maxPathDepth: 5
  },
  contentFiltering: {
    removeDebugInfo: true,
    removeInternalComments: false,
    sanitizeErrorMessages: true,
    removeStackTraces: true
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create output sanitizer with default configuration
 */
export function createOutputSanitizer(
  config?: Partial<OutputSanitizerConfig>
): OutputSanitizer {
  return new OutputSanitizer(config);
}

/**
 * Validate sanitization result structure
 */
export function validateSanitizationResult(result: SanitizationResult): string[] {
  const errors: string[] = [];

  if (!result.metadata || !result.metadata.timestamp) {
    errors.push("Missing or invalid metadata");
  }

  if (!result.sanitizedContent) {
    errors.push("Missing sanitized content");
  }

  if (!Array.isArray(result.actions)) {
    errors.push("Actions must be an array");
  }

  if (!Array.isArray(result.warnings)) {
    errors.push("Warnings must be an array");
  }

  return errors;
}