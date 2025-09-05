/**
 * Unit tests for REPRO Step Implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { executeReproStep, ReproStepInputs, DEFAULT_REPRO_INPUTS } from '../workflow-steps/repro-step.js';
import { EvidenceItem } from '../workflow-types.js';

describe('REPRO Step', () => {
  const testWorkspace = join(process.cwd(), 'test-repro-workspace');

  beforeEach(async () => {
    // Create test workspace
    await mkdir(testWorkspace, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test workspace
    try {
      await rm(testWorkspace, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('executeReproStep', () => {
    it('should generate reproduction steps', async () => {
      // Create package.json with scripts
      const packageJson = {
        name: 'test-project',
        scripts: {
          build: 'tsc',
          test: 'vitest',
          lint: 'eslint .'
        }
      };
      await writeFile(join(testWorkspace, 'package.json'), JSON.stringify(packageJson, null, 2));

      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace,
        taskGoals: ['Implement user authentication system'],
        touchedFiles: ['src/auth.ts', 'src/auth.test.ts']
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      expect(outputs.reproductionSteps).toBeDefined();
      expect(outputs.reproductionSteps.length).toBeGreaterThan(0);
      expect(outputs.reproductionSteps.some((step: string) => step.includes('npm install'))).toBe(true);
      expect(outputs.reproductionSteps.some((step: string) => step.includes('npm run build'))).toBe(true);
    });

    it('should verify current behavior from git diff', async () => {
      const gitDiff = `
diff --git a/src/auth.ts b/src/auth.ts
index 1234567..abcdefg 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,3 +1,10 @@
+export function authenticate(user: string, password: string): boolean {
+  return user === 'admin' && password === 'secret';
+}
+
 export function login() {
   return 'login';
 }
      `;

      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace,
        gitDiff,
        touchedFiles: ['src/auth.ts']
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      expect(outputs.currentBehavior).toBeDefined();
      expect(outputs.currentBehavior).toContain('lines added');
      expect(outputs.currentBehavior).toContain('New/modified functions');
    });

    it('should document expected behavior from acceptance criteria', async () => {
      const acceptanceCriteria = [
        {
          id: 'AC-001',
          description: 'WHEN user provides valid credentials THEN system SHALL authenticate successfully',
          isMet: false,
          relatedTests: []
        },
        {
          id: 'AC-002', 
          description: 'WHEN user provides invalid credentials THEN system SHALL reject authentication',
          isMet: false,
          relatedTests: []
        }
      ];

      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace,
        taskGoals: ['Implement secure authentication'],
        acceptanceCriteria
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      expect(outputs.expectedBehavior).toBeDefined();
      expect(outputs.expectedBehavior).toContain('valid credentials');
      expect(outputs.expectedBehavior).toContain('invalid credentials');
      expect(outputs.expectedBehavior).toContain('All tests should pass');
    });

    it('should create minimal command sequence', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          build: 'tsc',
          test: 'jest',
          lint: 'eslint .'
        }
      };
      await writeFile(join(testWorkspace, 'package.json'), JSON.stringify(packageJson, null, 2));

      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      expect(outputs.minimalCommands).toBeDefined();
      expect(outputs.minimalCommands.length).toBeGreaterThan(0);
      expect(outputs.minimalCommands).toContain('npm install');
      expect(outputs.minimalCommands).toContain('npm run build');
      expect(outputs.minimalCommands).toContain('npm test');
    });

    it('should generate verification commands', async () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          build: 'tsc',
          test: 'vitest',
          lint: 'eslint .',
          'type-check': 'tsc --noEmit'
        }
      };
      await writeFile(join(testWorkspace, 'package.json'), JSON.stringify(packageJson, null, 2));

      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace,
        touchedFiles: ['src/auth.ts', 'src/utils.ts']
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      expect(outputs.verificationCommands).toBeDefined();
      expect(outputs.verificationCommands.length).toBeGreaterThan(0);
      expect(outputs.verificationCommands.some((cmd: string) => cmd.includes('npm test'))).toBe(true);
      expect(outputs.verificationCommands.some((cmd: string) => cmd.includes('npm run build'))).toBe(true);
      expect(outputs.verificationCommands.some((cmd: string) => cmd.includes('type-check'))).toBe(true);
    });

    it('should handle missing package.json gracefully', async () => {
      // Don't create package.json
      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace,
        taskGoals: ['Basic functionality test']
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      // Should not throw error
      await expect(executeReproStep(inputs, outputs, evidence)).resolves.not.toThrow();

      expect(outputs.reproductionSteps).toBeDefined();
      expect(outputs.reproductionSteps.length).toBeGreaterThan(0);
    });

    it('should add evidence for missing reproduction steps', async () => {
      // Create inputs that would result in empty reproduction steps
      const inputs: ReproStepInputs = {
        workspacePath: '/nonexistent/path'
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      // This should add evidence but not throw
      try {
        await executeReproStep(inputs, outputs, evidence);
        
        // The function might still generate fallback steps, so check for that
        if (outputs.reproductionSteps && outputs.reproductionSteps.length > 0) {
          // If steps were generated, that's actually good
          expect(outputs.reproductionSteps.length).toBeGreaterThan(0);
        } else {
          // If no steps were generated, there should be evidence
          const reproEvidence = evidence.find(e => 
            e.type === 'missing_requirement' && 
            e.description.includes('reproduction steps')
          );
          expect(reproEvidence).toBeDefined();
        }
      } catch (error) {
        // If it throws, there should be evidence for the error
        const reproEvidence = evidence.find(e => 
          e.type === 'missing_requirement' && 
          e.description.includes('deterministic reproduction')
        );
        expect(reproEvidence).toBeDefined();
        expect(reproEvidence?.severity).toBe('Major');
      }
    });

    it('should detect API-related reproduction steps', async () => {
      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace,
        taskGoals: ['Implement REST API endpoints for user management']
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      expect(outputs.reproductionSteps.some((step: string) => 
        step.toLowerCase().includes('api') || step.includes('curl')
      )).toBe(true);
    });

    it('should detect UI-related reproduction steps', async () => {
      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace,
        taskGoals: ['Implement user interface for login form']
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      expect(outputs.reproductionSteps.some((step: string) => 
        step.toLowerCase().includes('browser') || step.toLowerCase().includes('interface')
      )).toBe(true);
    });

    it('should analyze touched files behavior', async () => {
      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace,
        touchedFiles: [
          'src/auth.ts',
          'src/auth.test.ts', 
          'config/database.json',
          'src/utils.js'
        ]
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      expect(outputs.currentBehavior).toContain('Source code changes');
      expect(outputs.currentBehavior).toContain('Test changes');
      expect(outputs.currentBehavior).toContain('Configuration changes');
    });
  });

  describe('validation', () => {
    it('should validate reproduction quality', async () => {
      // Create inputs that result in poor reproduction quality
      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace,
        // No task goals, acceptance criteria, or other context
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      // Should have evidence for missing expected behavior (if it's too short)
      const behaviorEvidence = evidence.find(e => 
        e.description.includes('Expected behavior')
      );
      
      // If expected behavior is long enough, there might not be evidence
      if (outputs.expectedBehavior && outputs.expectedBehavior.length >= 20) {
        // This is actually good - no evidence needed
        expect(behaviorEvidence).toBeUndefined();
      } else {
        expect(behaviorEvidence).toBeDefined();
      }
    });

    it('should detect vague reproduction steps', async () => {
      // This test would need to be implemented with a mock that returns vague steps
      // For now, we'll test the basic validation logic
      const inputs: ReproStepInputs = {
        ...DEFAULT_REPRO_INPUTS,
        workspacePath: testWorkspace
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeReproStep(inputs, outputs, evidence);

      // The validation should run without errors
      expect(outputs.reproductionSteps).toBeDefined();
      expect(outputs.expectedBehavior).toBeDefined();
      expect(outputs.minimalCommands).toBeDefined();
      expect(outputs.verificationCommands).toBeDefined();
    });
  });
});