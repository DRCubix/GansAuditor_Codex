/**
 * Unit tests for Audit Workflow Implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  AuditWorkflowEngine, 
  createAuditWorkflowEngine,
  validateWorkflow 
} from '../audit-workflow.js';
import { 
  AuditWorkflow, 
  WorkflowStep, 
  WorkflowConfig,
  DEFAULT_AUDIT_WORKFLOW,
  DEFAULT_WORKFLOW_CONFIG 
} from '../workflow-types.js';

describe('AuditWorkflowEngine', () => {
  let engine: AuditWorkflowEngine;

  beforeEach(() => {
    engine = new AuditWorkflowEngine();
  });

  describe('initialization', () => {
    it('should initialize with default workflow', () => {
      const state = engine.getExecutionState();
      expect(state.workflow).toEqual(DEFAULT_AUDIT_WORKFLOW);
      expect(state.status).toBe('not_started');
      expect(state.currentStepIndex).toBe(0);
      expect(state.completedSteps).toHaveLength(0);
    });

    it('should initialize with custom workflow', () => {
      const customWorkflow: AuditWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test workflow description',
        steps: [
          {
            name: 'TEST_STEP',
            description: 'Test step',
            actions: ['Test action'],
            order: 1,
            required: true,
            expectedOutputs: ['testOutput']
          }
        ],
        config: DEFAULT_WORKFLOW_CONFIG
      };

      const customEngine = new AuditWorkflowEngine(customWorkflow);
      const state = customEngine.getExecutionState();
      expect(state.workflow.id).toBe('test-workflow');
      expect(state.workflow.steps).toHaveLength(1);
    });

    it('should initialize with custom config', () => {
      const customConfig: Partial<WorkflowConfig> = {
        enforceOrder: false,
        allowSkipping: true
      };

      const customEngine = new AuditWorkflowEngine(undefined, customConfig);
      // Config is private, but we can test behavior
      expect(() => customEngine.skipToStep('STATIC')).not.toThrow();
    });
  });

  describe('workflow execution', () => {
    it('should start execution successfully', async () => {
      await engine.startExecution();
      const state = engine.getExecutionState();
      expect(state.status).toBe('in_progress');
      expect(state.startTime).toBeGreaterThan(0);
    });

    it('should not allow starting execution twice', async () => {
      await engine.startExecution();
      await expect(engine.startExecution()).rejects.toThrow('Cannot start workflow in status: in_progress');
    });

    it('should execute first step (INIT)', async () => {
      await engine.startExecution();
      const result = await engine.executeNextStep();
      
      expect(result.success).toBe(true);
      expect(result.step.name).toBe('INIT');
      expect(result.outputs).toHaveProperty('taskGoals');
      expect(result.outputs).toHaveProperty('acceptanceCriteria');
      expect(result.outputs).toHaveProperty('constraints');
      expect(result.outputs).toHaveProperty('touchedFiles');
    });

    it('should execute steps in order', async () => {
      await engine.startExecution();
      
      // Execute INIT
      const initResult = await engine.executeNextStep();
      expect(initResult.step.name).toBe('INIT');
      
      // Execute REPRO
      const reproResult = await engine.executeNextStep();
      expect(reproResult.step.name).toBe('REPRO');
      
      // Check state
      const state = engine.getExecutionState();
      expect(state.currentStepIndex).toBe(2);
      expect(state.completedSteps).toHaveLength(2);
    });

    it('should complete workflow after all steps', async () => {
      await engine.startExecution();
      
      // Execute all 8 steps
      for (let i = 0; i < 8; i++) {
        await engine.executeNextStep();
      }
      
      const state = engine.getExecutionState();
      expect(state.status).toBe('completed');
      expect(state.completedSteps).toHaveLength(8);
      expect(engine.isComplete()).toBe(true);
    });

    it('should not allow execution after completion', async () => {
      await engine.startExecution();
      
      // Execute all steps
      for (let i = 0; i < 8; i++) {
        await engine.executeNextStep();
      }
      
      await expect(engine.executeNextStep()).rejects.toThrow('Cannot execute step in status: completed');
    });
  });

  describe('step validation', () => {
    it('should validate step outputs', async () => {
      await engine.startExecution();
      
      // This should work with placeholder implementation
      const result = await engine.executeNextStep();
      expect(result.success).toBe(true);
    });

    it('should enforce step order by default', async () => {
      await engine.startExecution();
      
      // Try to skip to a later step - should fail with order enforcement
      expect(() => engine.skipToStep('VERDICT')).toThrow('Step skipping is not allowed');
    });
  });

  describe('evidence collection', () => {
    it('should collect evidence from steps', async () => {
      await engine.startExecution();
      await engine.executeNextStep();
      
      const evidence = engine.getAllEvidence();
      expect(Array.isArray(evidence)).toBe(true);
    });

    it('should filter evidence by severity', async () => {
      await engine.startExecution();
      await engine.executeNextStep();
      
      const criticalEvidence = engine.getEvidenceBySeverity('Critical');
      const majorEvidence = engine.getEvidenceBySeverity('Major');
      const minorEvidence = engine.getEvidenceBySeverity('Minor');
      
      expect(Array.isArray(criticalEvidence)).toBe(true);
      expect(Array.isArray(majorEvidence)).toBe(true);
      expect(Array.isArray(minorEvidence)).toBe(true);
    });
  });

  describe('workflow state management', () => {
    it('should track current step', async () => {
      await engine.startExecution();
      
      let currentStep = engine.getCurrentStep();
      expect(currentStep?.name).toBe('INIT');
      
      await engine.executeNextStep();
      currentStep = engine.getCurrentStep();
      expect(currentStep?.name).toBe('REPRO');
    });

    it('should return null for current step when complete', async () => {
      await engine.startExecution();
      
      // Execute all steps
      for (let i = 0; i < 8; i++) {
        await engine.executeNextStep();
      }
      
      const currentStep = engine.getCurrentStep();
      expect(currentStep).toBeNull();
    });

    it('should reset workflow state', async () => {
      await engine.startExecution();
      await engine.executeNextStep();
      
      engine.reset();
      
      const state = engine.getExecutionState();
      expect(state.status).toBe('not_started');
      expect(state.currentStepIndex).toBe(0);
      expect(state.completedSteps).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle step execution errors', async () => {
      // Create engine with continue on failure
      const engineWithContinue = new AuditWorkflowEngine(undefined, { continueOnFailure: true });
      await engineWithContinue.startExecution();
      
      // This should not throw even if there are errors
      const result = await engineWithContinue.executeNextStep();
      expect(result).toBeDefined();
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
      ...DEFAULT_AUDIT_WORKFLOW,
      steps: [
        {
          name: '',
          description: 'Test step',
          actions: ['Test action'],
          order: 1,
          required: true,
          expectedOutputs: ['output']
        }
      ]
    };

    const errors = validateWorkflow(invalidWorkflow);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('non-empty name'))).toBe(true);
  });

  it('should detect duplicate step names', () => {
    const invalidWorkflow: AuditWorkflow = {
      ...DEFAULT_AUDIT_WORKFLOW,
      steps: [
        {
          name: 'DUPLICATE',
          description: 'First step',
          actions: ['Action 1'],
          order: 1,
          required: true,
          expectedOutputs: ['output1']
        },
        {
          name: 'DUPLICATE',
          description: 'Second step',
          actions: ['Action 2'],
          order: 2,
          required: true,
          expectedOutputs: ['output2']
        }
      ]
    };

    const errors = validateWorkflow(invalidWorkflow);
    expect(errors.some(e => e.includes('unique names'))).toBe(true);
  });

  it('should detect incorrect step ordering', () => {
    const invalidWorkflow: AuditWorkflow = {
      ...DEFAULT_AUDIT_WORKFLOW,
      steps: [
        {
          name: 'STEP1',
          description: 'First step',
          actions: ['Action 1'],
          order: 1,
          required: true,
          expectedOutputs: ['output1']
        },
        {
          name: 'STEP2',
          description: 'Second step',
          actions: ['Action 2'],
          order: 3, // Should be 2
          required: true,
          expectedOutputs: ['output2']
        }
      ]
    };

    const errors = validateWorkflow(invalidWorkflow);
    expect(errors.some(e => e.includes('consecutive order numbers'))).toBe(true);
  });
});

describe('createAuditWorkflowEngine', () => {
  it('should create engine with valid workflow', () => {
    const engine = createAuditWorkflowEngine();
    expect(engine).toBeInstanceOf(AuditWorkflowEngine);
  });

  it('should throw error for invalid workflow', () => {
    const invalidWorkflow: AuditWorkflow = {
      id: 'invalid',
      name: 'Invalid Workflow',
      description: 'Invalid workflow',
      steps: [], // No steps
      config: DEFAULT_WORKFLOW_CONFIG
    };

    expect(() => createAuditWorkflowEngine(invalidWorkflow)).toThrow('Workflow validation failed');
  });
});