/**
 * Unit Tests for Audit Workflow Execution
 * 
 * Tests for workflow step execution, ordering, validation, and evidence collection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  AuditWorkflowEngine,
  createAuditWorkflowEngine,
  validateWorkflow,
} from '../audit-workflow.js';
import {
  DEFAULT_AUDIT_WORKFLOW,
  DEFAULT_WORKFLOW_CONFIG,
  type AuditWorkflow,
  type WorkflowConfig,
  type WorkflowStep,
  type WorkflowStepResult,
  type EvidenceItem,
} from '../workflow-types.js';

describe('AuditWorkflowEngine', () => {
  let workflowEngine: AuditWorkflowEngine;
  let mockWorkflow: AuditWorkflow;
  let mockConfig: WorkflowConfig;

  beforeEach(() => {
    mockConfig = {
      ...DEFAULT_WORKFLOW_CONFIG,
      enforceOrder: true,
      continueOnFailure: false,
      requireEvidence: true,
    };

    mockWorkflow = {
      ...DEFAULT_AUDIT_WORKFLOW,
      steps: [
        {
          name: "INIT",
          description: "Initialize audit context",
          order: 1,
          required: true,
          actions: ["Load session state", "Parse requirements"],
          expectedOutputs: ["taskGoals", "acceptanceCriteria", "touchedFiles"],
        },
        {
          name: "REPRO",
          description: "Establish deterministic reproduction",
          order: 2,
          required: true,
          actions: ["Create reproduction steps", "Verify current behavior"],
          expectedOutputs: ["reproductionSteps", "currentBehavior"],
        },
        {
          name: "STATIC",
          description: "Static code analysis",
          order: 3,
          required: true,
          actions: ["Run linting", "Check formatting", "Type checking"],
          expectedOutputs: ["lintResults", "formatResults", "typeCheckResults"],
        },
      ],
    };

    workflowEngine = new AuditWorkflowEngine(mockWorkflow, mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default workflow and config', () => {
      const engine = new AuditWorkflowEngine();
      const state = engine.getExecutionState();
      
      expect(state.workflow).toBeDefined();
      expect(state.status).toBe('not_started');
      expect(state.currentStepIndex).toBe(0);
      expect(state.completedSteps).toHaveLength(0);
    });

    it('should initialize with custom workflow and config', () => {
      const customWorkflow = { ...mockWorkflow };
      const customConfig = { ...mockConfig, enforceOrder: false };
      
      const engine = new AuditWorkflowEngine(customWorkflow, customConfig);
      const state = engine.getExecutionState();
      
      expect(state.workflow).toEqual(customWorkflow);
      expect(state.status).toBe('not_started');
    });

    it('should validate workflow on creation', () => {
      const invalidWorkflow: AuditWorkflow = {
        name: "Invalid Workflow",
        description: "Test workflow with invalid steps",
        version: "1.0",
        steps: [
          {
            name: "",
            description: "Invalid step with empty name",
            order: 1,
            required: true,
            actions: [],
            expectedOutputs: [],
          },
        ],
      };

      expect(() => {
        createAuditWorkflowEngine(invalidWorkflow);
      }).toThrow('Workflow validation failed');
    });
  });

  describe('workflow execution', () => {
    it('should start execution correctly', async () => {
      await workflowEngine.startExecution();
      const state = workflowEngine.getExecutionState();
      
      expect(state.status).toBe('in_progress');
      expect(state.startTime).toBeGreaterThan(0);
    });

    it('should not allow starting execution twice', async () => {
      await workflowEngine.startExecution();
      
      await expect(workflowEngine.startExecution())
        .rejects.toThrow('Cannot start workflow in status: in_progress');
    });

    it('should execute steps in order', async () => {
      await workflowEngine.startExecution();
      
      // Execute first step (INIT)
      const step1Result = await workflowEngine.executeNextStep({
        specPath: '.kiro/specs/test',
        workspacePath: '/test/workspace',
      });
      
      expect(step1Result.step.name).toBe('INIT');
      expect(step1Result.success).toBe(true);
      expect(step1Result.evidence).toBeDefined();
      
      const state1 = workflowEngine.getExecutionState();
      expect(state1.currentStepIndex).toBe(1);
      expect(state1.completedSteps).toHaveLength(1);
      
      // Execute second step (REPRO)
      const step2Result = await workflowEngine.executeNextStep({
        workspacePath: '/test/workspace',
        taskGoals: step1Result.outputs.taskGoals,
      });
      
      expect(step2Result.step.name).toBe('REPRO');
      expect(step2Result.success).toBe(true);
      
      const state2 = workflowEngine.getExecutionState();
      expect(state2.currentStepIndex).toBe(2);
      expect(state2.completedSteps).toHaveLength(2);
    });

    it('should enforce step order when configured', async () => {
      await workflowEngine.startExecution();
      
      // Try to skip to step 3 without executing steps 1 and 2
      workflowEngine.skipToStep('STATIC');
      
      await expect(workflowEngine.executeNextStep())
        .rejects.toThrow('Step order violation');
    });

    it('should allow step skipping when configured', async () => {
      const flexibleConfig = { ...mockConfig, enforceOrder: false, allowSkipping: true };
      const flexibleEngine = new AuditWorkflowEngine(mockWorkflow, flexibleConfig);
      
      await flexibleEngine.startExecution();
      
      // Skip to step 3
      flexibleEngine.skipToStep('STATIC');
      
      const result = await flexibleEngine.executeNextStep({
        workspacePath: '/test/workspace',
        touchedFiles: ['src/test.ts'],
      });
      
      expect(result.step.name).toBe('STATIC');
      expect(result.success).toBe(true);
    });

    it('should complete workflow when all steps are executed', async () => {
      await workflowEngine.startExecution();
      
      // Execute all steps
      for (let i = 0; i < mockWorkflow.steps.length; i++) {
        await workflowEngine.executeNextStep({
          workspacePath: '/test/workspace',
        });
      }
      
      const state = workflowEngine.getExecutionState();
      expect(state.status).toBe('completed');
      expect(workflowEngine.isComplete()).toBe(true);
    });

    it('should throw error when trying to execute beyond workflow end', async () => {
      await workflowEngine.startExecution();
      
      // Execute all steps
      for (let i = 0; i < mockWorkflow.steps.length; i++) {
        await workflowEngine.executeNextStep({
          workspacePath: '/test/workspace',
        });
      }
      
      // Try to execute another step
      await expect(workflowEngine.executeNextStep())
        .rejects.toThrow('All workflow steps have been completed');
    });
  });

  describe('step execution', () => {
    beforeEach(async () => {
      await workflowEngine.startExecution();
    });

    it('should execute INIT step correctly', async () => {
      const inputs = {
        specPath: '.kiro/specs/test-feature',
        steeringPath: '.kiro/steering',
        workspacePath: '/test/workspace',
        sessionId: 'test-session-123',
      };
      
      const result = await workflowEngine.executeNextStep(inputs);
      
      expect(result.step.name).toBe('INIT');
      expect(result.success).toBe(true);
      expect(result.outputs).toHaveProperty('taskGoals');
      expect(result.outputs).toHaveProperty('acceptanceCriteria');
      expect(result.outputs).toHaveProperty('touchedFiles');
      expect(result.evidence).toBeDefined();
      expect(result.nextActions).toBeDefined();
    });

    it('should execute REPRO step correctly', async () => {
      // First execute INIT
      await workflowEngine.executeNextStep({
        specPath: '.kiro/specs/test-feature',
        workspacePath: '/test/workspace',
      });
      
      // Then execute REPRO
      const inputs = {
        workspacePath: '/test/workspace',
        taskGoals: ['Implement user authentication'],
        acceptanceCriteria: ['Users can log in with email/password'],
      };
      
      const result = await workflowEngine.executeNextStep(inputs);
      
      expect(result.step.name).toBe('REPRO');
      expect(result.success).toBe(true);
      expect(result.outputs).toHaveProperty('reproductionSteps');
      expect(result.outputs).toHaveProperty('currentBehavior');
    });

    it('should execute STATIC step correctly', async () => {
      // Execute INIT and REPRO first
      await workflowEngine.executeNextStep({ workspacePath: '/test/workspace' });
      await workflowEngine.executeNextStep({ workspacePath: '/test/workspace' });
      
      // Then execute STATIC
      const inputs = {
        workspacePath: '/test/workspace',
        touchedFiles: ['src/auth.ts', 'src/user.ts'],
        lintCommand: 'npm run lint',
        formatCommand: 'npm run format:check',
      };
      
      const result = await workflowEngine.executeNextStep(inputs);
      
      expect(result.step.name).toBe('STATIC');
      expect(result.success).toBe(true);
      expect(result.outputs).toHaveProperty('lintResults');
      expect(result.outputs).toHaveProperty('formatResults');
    });

    it('should collect evidence from each step', async () => {
      const result = await workflowEngine.executeNextStep({
        workspacePath: '/test/workspace',
      });
      
      expect(result.evidence).toBeDefined();
      expect(Array.isArray(result.evidence)).toBe(true);
      
      const allEvidence = workflowEngine.getAllEvidence();
      expect(allEvidence.length).toBeGreaterThanOrEqual(result.evidence.length);
    });

    it('should generate next actions based on evidence', async () => {
      const result = await workflowEngine.executeNextStep({
        workspacePath: '/test/workspace',
      });
      
      expect(result.nextActions).toBeDefined();
      expect(Array.isArray(result.nextActions)).toBe(true);
      expect(result.nextActions.length).toBeGreaterThan(0);
    });

    it('should validate required outputs', async () => {
      // Mock a step that doesn't produce required outputs
      const invalidWorkflow: AuditWorkflow = {
        ...mockWorkflow,
        steps: [{
          name: "INVALID",
          description: "Invalid step",
          order: 1,
          required: true,
          actions: ["Do nothing"],
          expectedOutputs: ["requiredOutput"],
        }],
      };
      
      const invalidEngine = new AuditWorkflowEngine(invalidWorkflow, mockConfig);
      await invalidEngine.startExecution();
      
      // This should fail because the step doesn't produce the required output
      await expect(invalidEngine.executeNextStep())
        .rejects.toThrow("Missing required output 'requiredOutput'");
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await workflowEngine.startExecution();
    });

    it('should handle step execution errors when continueOnFailure is false', async () => {
      // Mock a step that will fail
      vi.spyOn(workflowEngine as any, 'executeInitStep').mockRejectedValue(
        new Error('Simulated step failure')
      );
      
      await expect(workflowEngine.executeNextStep())
        .rejects.toThrow('Simulated step failure');
      
      const state = workflowEngine.getExecutionState();
      expect(state.status).toBe('failed');
      expect(workflowEngine.hasFailed()).toBe(true);
    });

    it('should continue on failure when configured', async () => {
      const tolerantConfig = { ...mockConfig, continueOnFailure: true };
      const tolerantEngine = new AuditWorkflowEngine(mockWorkflow, tolerantConfig);
      await tolerantEngine.startExecution();
      
      // Mock a step that will fail
      vi.spyOn(tolerantEngine as any, 'executeInitStep').mockRejectedValue(
        new Error('Simulated step failure')
      );
      
      const result = await tolerantEngine.executeNextStep();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Simulated step failure');
      
      const state = tolerantEngine.getExecutionState();
      expect(state.status).toBe('in_progress'); // Should continue
      expect(state.errors).toContain('Simulated step failure');
    });

    it('should track errors in execution state', async () => {
      const tolerantConfig = { ...mockConfig, continueOnFailure: true };
      const tolerantEngine = new AuditWorkflowEngine(mockWorkflow, tolerantConfig);
      await tolerantEngine.startExecution();
      
      // Mock multiple failing steps
      vi.spyOn(tolerantEngine as any, 'executeInitStep').mockRejectedValue(
        new Error('Init failure')
      );
      
      await tolerantEngine.executeNextStep();
      
      const state = tolerantEngine.getExecutionState();
      expect(state.errors).toContain('Init failure');
      expect(state.errors.length).toBe(1);
    });
  });

  describe('evidence collection', () => {
    beforeEach(async () => {
      await workflowEngine.startExecution();
    });

    it('should collect evidence from all executed steps', async () => {
      // Execute first step
      await workflowEngine.executeNextStep({ workspacePath: '/test/workspace' });
      
      const evidence = workflowEngine.getAllEvidence();
      expect(evidence).toBeDefined();
      expect(Array.isArray(evidence)).toBe(true);
    });

    it('should filter evidence by severity', async () => {
      // Execute a step that generates evidence
      await workflowEngine.executeNextStep({ workspacePath: '/test/workspace' });
      
      const criticalEvidence = workflowEngine.getEvidenceBySeverity('Critical');
      const majorEvidence = workflowEngine.getEvidenceBySeverity('Major');
      const minorEvidence = workflowEngine.getEvidenceBySeverity('Minor');
      
      expect(Array.isArray(criticalEvidence)).toBe(true);
      expect(Array.isArray(majorEvidence)).toBe(true);
      expect(Array.isArray(minorEvidence)).toBe(true);
    });

    it('should accumulate evidence across steps', async () => {
      // Execute multiple steps
      await workflowEngine.executeNextStep({ workspacePath: '/test/workspace' });
      const evidenceAfterStep1 = workflowEngine.getAllEvidence().length;
      
      await workflowEngine.executeNextStep({ workspacePath: '/test/workspace' });
      const evidenceAfterStep2 = workflowEngine.getAllEvidence().length;
      
      expect(evidenceAfterStep2).toBeGreaterThanOrEqual(evidenceAfterStep1);
    });
  });

  describe('workflow state management', () => {
    it('should provide current execution state', () => {
      const state = workflowEngine.getExecutionState();
      
      expect(state).toHaveProperty('workflow');
      expect(state).toHaveProperty('currentStepIndex');
      expect(state).toHaveProperty('completedSteps');
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('startTime');
      expect(state).toHaveProperty('allEvidence');
      expect(state).toHaveProperty('errors');
    });

    it('should provide current step information', async () => {
      await workflowEngine.startExecution();
      
      const currentStep = workflowEngine.getCurrentStep();
      expect(currentStep).toBeDefined();
      expect(currentStep?.name).toBe('INIT');
      expect(currentStep?.order).toBe(1);
    });

    it('should return null for current step when workflow is complete', async () => {
      await workflowEngine.startExecution();
      
      // Execute all steps
      for (let i = 0; i < mockWorkflow.steps.length; i++) {
        await workflowEngine.executeNextStep({ workspacePath: '/test/workspace' });
      }
      
      const currentStep = workflowEngine.getCurrentStep();
      expect(currentStep).toBeNull();
    });

    it('should reset workflow execution', async () => {
      await workflowEngine.startExecution();
      await workflowEngine.executeNextStep({ workspacePath: '/test/workspace' });
      
      workflowEngine.reset();
      
      const state = workflowEngine.getExecutionState();
      expect(state.status).toBe('not_started');
      expect(state.currentStepIndex).toBe(0);
      expect(state.completedSteps).toHaveLength(0);
      expect(state.allEvidence).toHaveLength(0);
    });

    it('should track completion status', async () => {
      expect(workflowEngine.isComplete()).toBe(false);
      expect(workflowEngine.hasFailed()).toBe(false);
      
      await workflowEngine.startExecution();
      
      // Execute all steps
      for (let i = 0; i < mockWorkflow.steps.length; i++) {
        await workflowEngine.executeNextStep({ workspacePath: '/test/workspace' });
      }
      
      expect(workflowEngine.isComplete()).toBe(true);
      expect(workflowEngine.hasFailed()).toBe(false);
    });
  });

  describe('step skipping', () => {
    it('should allow skipping to specific step when configured', async () => {
      const flexibleConfig = { ...mockConfig, allowSkipping: true };
      const flexibleEngine = new AuditWorkflowEngine(mockWorkflow, flexibleConfig);
      
      await flexibleEngine.startExecution();
      
      flexibleEngine.skipToStep('STATIC');
      
      const currentStep = flexibleEngine.getCurrentStep();
      expect(currentStep?.name).toBe('STATIC');
    });

    it('should not allow skipping when not configured', () => {
      expect(() => {
        workflowEngine.skipToStep('STATIC');
      }).toThrow('Step skipping is not allowed in current configuration');
    });

    it('should throw error for non-existent step', async () => {
      const flexibleConfig = { ...mockConfig, allowSkipping: true };
      const flexibleEngine = new AuditWorkflowEngine(mockWorkflow, flexibleConfig);
      
      expect(() => {
        flexibleEngine.skipToStep('NONEXISTENT');
      }).toThrow("Step 'NONEXISTENT' not found in workflow");
    });
  });
});

describe('validateWorkflow', () => {
  it('should validate correct workflow', () => {
    const errors = validateWorkflow(DEFAULT_AUDIT_WORKFLOW);
    expect(errors).toHaveLength(0);
  });

  it('should detect missing step names', () => {
    const invalidWorkflow: AuditWorkflow = {
      name: "Invalid Workflow",
      description: "Test workflow",
      version: "1.0",
      steps: [{
        name: "",
        description: "Step with empty name",
        order: 1,
        required: true,
        actions: ["Do something"],
        expectedOutputs: ["output"],
      }],
    };
    
    const errors = validateWorkflow(invalidWorkflow);
    expect(errors).toContain("Step at order 1 must have a non-empty name");
  });

  it('should detect incorrect step ordering', () => {
    const invalidWorkflow: AuditWorkflow = {
      name: "Invalid Workflow",
      description: "Test workflow",
      version: "1.0",
      steps: [
        {
          name: "STEP1",
          description: "First step",
          order: 1,
          required: true,
          actions: ["Action 1"],
          expectedOutputs: ["output1"],
        },
        {
          name: "STEP2",
          description: "Second step",
          order: 3, // Should be 2
          required: true,
          actions: ["Action 2"],
          expectedOutputs: ["output2"],
        },
      ],
    };
    
    const errors = validateWorkflow(invalidWorkflow);
    expect(errors).toContain("Workflow steps must have consecutive order numbers starting from 1");
  });

  it('should detect duplicate step names', () => {
    const invalidWorkflow: AuditWorkflow = {
      name: "Invalid Workflow",
      description: "Test workflow",
      version: "1.0",
      steps: [
        {
          name: "DUPLICATE",
          description: "First step",
          order: 1,
          required: true,
          actions: ["Action 1"],
          expectedOutputs: ["output1"],
        },
        {
          name: "DUPLICATE",
          description: "Second step",
          order: 2,
          required: true,
          actions: ["Action 2"],
          expectedOutputs: ["output2"],
        },
      ],
    };
    
    const errors = validateWorkflow(invalidWorkflow);
    expect(errors).toContain("Workflow steps must have unique names");
  });

  it('should require at least one required step', () => {
    const invalidWorkflow: AuditWorkflow = {
      name: "Invalid Workflow",
      description: "Test workflow",
      version: "1.0",
      steps: [{
        name: "OPTIONAL",
        description: "Optional step",
        order: 1,
        required: false,
        actions: ["Action 1"],
        expectedOutputs: ["output1"],
      }],
    };
    
    const errors = validateWorkflow(invalidWorkflow);
    expect(errors).toContain("Workflow must have at least one required step");
  });

  it('should validate step properties', () => {
    const invalidWorkflow: AuditWorkflow = {
      name: "Invalid Workflow",
      description: "Test workflow",
      version: "1.0",
      steps: [{
        name: "INVALID",
        description: "",
        order: 1,
        required: true,
        actions: [],
        expectedOutputs: [],
      }],
    };
    
    const errors = validateWorkflow(invalidWorkflow);
    expect(errors).toContain("Step 'INVALID' must have a non-empty description");
    expect(errors).toContain("Step 'INVALID' must have at least one action");
    expect(errors).toContain("Step 'INVALID' must have at least one expected output");
  });
});

describe('createAuditWorkflowEngine', () => {
  it('should create engine with default workflow', () => {
    const engine = createAuditWorkflowEngine();
    expect(engine).toBeInstanceOf(AuditWorkflowEngine);
    
    const state = engine.getExecutionState();
    expect(state.workflow).toBeDefined();
    expect(state.workflow.steps.length).toBeGreaterThan(0);
  });

  it('should create engine with custom workflow', () => {
    const customWorkflow: AuditWorkflow = {
      name: "Custom Workflow",
      description: "Test workflow",
      version: "1.0",
      steps: [{
        name: "CUSTOM",
        description: "Custom step",
        order: 1,
        required: true,
        actions: ["Custom action"],
        expectedOutputs: ["customOutput"],
      }],
    };
    
    const engine = createAuditWorkflowEngine(customWorkflow);
    const state = engine.getExecutionState();
    expect(state.workflow.name).toBe("Custom Workflow");
    expect(state.workflow.steps[0].name).toBe("CUSTOM");
  });

  it('should validate workflow before creating engine', () => {
    const invalidWorkflow: AuditWorkflow = {
      name: "Invalid Workflow",
      description: "Test workflow",
      version: "1.0",
      steps: [], // No steps
    };
    
    expect(() => {
      createAuditWorkflowEngine(invalidWorkflow);
    }).toThrow('Workflow validation failed');
  });
});