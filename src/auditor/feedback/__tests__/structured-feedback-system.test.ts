/**
 * Tests for Structured Feedback System
 * 
 * This module tests the structured feedback system implementation
 * to ensure all components work together correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StructuredFeedbackSystem } from '../structured-feedback-system.js';
import type { StructuredFeedbackContext } from '../structured-feedback-system.js';
import type { QualityAssessment } from '../../quality-assessment.js';
import type { WorkflowStepResult, EvidenceItem } from '../../workflow-types.js';

describe('StructuredFeedbackSystem', () => {
  let feedbackSystem: StructuredFeedbackSystem;
  let mockContext: StructuredFeedbackContext;

  beforeEach(() => {
    feedbackSystem = new StructuredFeedbackSystem();

    // Create mock context
    const mockQualityAssessment: QualityAssessment = {
      overallScore: 75,
      passesShipCriteria: false,
      dimensionEvaluations: [],
      timestamp: Date.now(),
      duration: 1000,
      criticalIssues: [],
      executiveSummary: "Test assessment",
      nextActions: []
    };

    const mockEvidenceItems: EvidenceItem[] = [
      {
        type: "lint_violation",
        severity: "Major",
        location: "src/test.ts:10",
        description: "Missing semicolon",
        proof: "Expected ';' at end of statement",
        suggestedFix: "Add semicolon at end of line"
      }
    ];

    const mockWorkflowResults: WorkflowStepResult[] = [
      {
        step: {
          name: "INIT",
          description: "Initialize audit",
          actions: [],
          order: 1,
          required: true,
          expectedOutputs: []
        },
        success: true,
        timestamp: Date.now(),
        duration: 500,
        evidence: mockEvidenceItems,
        errors: [],
        outputs: {},
        nextActions: []
      }
    ];

    mockContext = {
      qualityAssessment: mockQualityAssessment,
      workflowResults: mockWorkflowResults,
      evidenceItems: mockEvidenceItems,
      iteration: 1,
      sessionId: "test-session"
    };
  });

  it('should create structured feedback system', () => {
    expect(feedbackSystem).toBeDefined();
    expect(feedbackSystem).toBeInstanceOf(StructuredFeedbackSystem);
  });

  it('should generate structured feedback output', async () => {
    const result = await feedbackSystem.generateStructuredFeedback(mockContext);

    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.timestamp).toBeTypeOf('number');
    expect(result.metadata.version).toBe('1.0.0');
    
    // Check that all components are present
    expect(result.executiveVerdict).toBeDefined();
    expect(result.evidenceTable).toBeDefined();
    expect(result.proposedDiffs).toBeDefined();
    expect(result.reproductionGuide).toBeDefined();
    expect(result.traceabilityMatrix).toBeDefined();
    expect(result.followUpTasks).toBeDefined();
    expect(result.sanitizationResults).toBeDefined();
  });

  it('should generate executive verdict', async () => {
    const result = await feedbackSystem.generateStructuredFeedback(mockContext);
    
    expect(result.executiveVerdict).toBeDefined();
    expect(result.executiveVerdict.decision).toMatch(/^(ship|no-ship)$/);
    expect(result.executiveVerdict.overallScore).toBeTypeOf('number');
    expect(result.executiveVerdict.summary).toBeInstanceOf(Array);
    expect(result.executiveVerdict.nextSteps).toBeInstanceOf(Array);
    expect(result.executiveVerdict.justification).toBeDefined();
  });

  it('should generate evidence table', async () => {
    const result = await feedbackSystem.generateStructuredFeedback(mockContext);
    
    expect(result.evidenceTable).toBeDefined();
    expect(result.evidenceTable.metadata).toBeDefined();
    expect(result.evidenceTable.entries).toBeInstanceOf(Array);
    expect(result.evidenceTable.summary).toBeDefined();
  });

  it('should generate quality metrics', async () => {
    const result = await feedbackSystem.generateStructuredFeedback(mockContext);
    
    expect(result.metadata.qualityMetrics).toBeDefined();
    expect(result.metadata.qualityMetrics.completeness).toBeTypeOf('number');
    expect(result.metadata.qualityMetrics.accuracy).toBeTypeOf('number');
    expect(result.metadata.qualityMetrics.actionability).toBeTypeOf('number');
    expect(result.metadata.qualityMetrics.evidenceQuality).toBeTypeOf('number');
  });

  it('should handle empty evidence gracefully', async () => {
    const emptyContext = {
      ...mockContext,
      evidenceItems: [],
      workflowResults: [] // Also empty workflow results
    };

    const result = await feedbackSystem.generateStructuredFeedback(emptyContext);
    
    expect(result).toBeDefined();
    expect(result.evidenceTable.entries).toHaveLength(0);
    expect(result.proposedDiffs).toHaveLength(0);
  });

  it('should apply sanitization', async () => {
    const result = await feedbackSystem.generateStructuredFeedback(mockContext);
    
    expect(result.sanitizationResults).toBeDefined();
    expect(result.sanitizationResults.metadata).toBeDefined();
    expect(result.sanitizationResults.actions).toBeInstanceOf(Array);
    expect(result.sanitizationResults.warnings).toBeInstanceOf(Array);
  });
});