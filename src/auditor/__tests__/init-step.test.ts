/**
 * Unit tests for INIT Step Implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { executeInitStep, InitStepInputs, DEFAULT_INIT_INPUTS } from '../workflow-steps/init-step.js';
import { EvidenceItem } from '../workflow-types.js';

describe('INIT Step', () => {
  const testWorkspace = join(process.cwd(), 'test-workspace');
  const specPath = '.kiro/specs/test-feature';
  const steeringPath = '.kiro/steering';

  beforeEach(async () => {
    // Create test workspace
    await mkdir(testWorkspace, { recursive: true });
    await mkdir(join(testWorkspace, specPath), { recursive: true });
    await mkdir(join(testWorkspace, steeringPath), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test workspace
    try {
      await rm(testWorkspace, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('executeInitStep', () => {
    it('should extract task goals from requirements.md', async () => {
      // Create requirements.md with task goals
      const requirementsContent = `
# Test Feature Requirements

## Introduction

This feature implements a comprehensive test system for validating code quality.

## Requirements

### Requirement 1

**User Story:** As a developer, I want automated testing, so that I can ensure code quality

#### Acceptance Criteria

1. WHEN tests are run THEN the system SHALL validate all code paths
2. IF errors are found THEN the system SHALL report them clearly
      `;

      await writeFile(join(testWorkspace, specPath, 'requirements.md'), requirementsContent);

      const inputs: InitStepInputs = {
        ...DEFAULT_INIT_INPUTS,
        workspacePath: testWorkspace,
        sessionId: 'test-session'
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeInitStep(inputs, outputs, evidence);

      expect(outputs.taskGoals).toBeDefined();
      expect(outputs.taskGoals.length).toBeGreaterThan(0);
      expect(outputs.taskGoals[0]).toContain('comprehensive test system');
    });

    it('should parse acceptance criteria in EARS format', async () => {
      const requirementsContent = `
# Test Requirements

## Requirements

### Requirement 1

#### Acceptance Criteria

1. WHEN the user submits valid data THEN the system SHALL process it successfully
2. IF invalid data is provided THEN the system SHALL return an error message
3. WHEN processing completes THEN the system SHALL notify the user
      `;

      await writeFile(join(testWorkspace, specPath, 'requirements.md'), requirementsContent);

      const inputs: InitStepInputs = {
        ...DEFAULT_INIT_INPUTS,
        workspacePath: testWorkspace
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeInitStep(inputs, outputs, evidence);

      expect(outputs.acceptanceCriteria).toBeDefined();
      expect(outputs.acceptanceCriteria.length).toBe(3);
      expect(outputs.acceptanceCriteria[0].id).toBe('AC-001');
      expect(outputs.acceptanceCriteria[0].description).toContain('WHEN the user submits valid data');
      expect(outputs.acceptanceCriteria[1].description).toContain('IF invalid data is provided');
    });

    it('should identify constraints from steering documents', async () => {
      const steeringContent = `
# Code Standards

## Rules

- MUST use TypeScript for all new code
- SHALL follow ESLint configuration
- REQUIRED: All functions must have JSDoc comments
- FORBIDDEN: Use of any type without justification

## Constraints

- Performance: Response time MUST be under 100ms
- Security: Input validation is MANDATORY
      `;

      await writeFile(join(testWorkspace, steeringPath, 'standards.md'), steeringContent);

      const inputs: InitStepInputs = {
        ...DEFAULT_INIT_INPUTS,
        workspacePath: testWorkspace
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeInitStep(inputs, outputs, evidence);

      expect(outputs.constraints).toBeDefined();
      expect(outputs.constraints.length).toBeGreaterThan(0);
      expect(outputs.constraints.some(c => c.includes('TypeScript'))).toBe(true);
      expect(outputs.constraints.some(c => c.includes('ESLint'))).toBe(true);
    });

    it('should detect touched files from git diff', async () => {
      const gitDiff = `
diff --git a/src/test.ts b/src/test.ts
index 1234567..abcdefg 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,4 @@
 export function test() {
   return 'hello';
+  // Added comment
 }

diff --git a/src/utils.ts b/src/utils.ts
new file mode 100644
index 0000000..xyz789
--- /dev/null
+++ b/src/utils.ts
@@ -0,0 +1,3 @@
+export function utils() {
+  return 'utils';
+}
      `;

      const inputs: InitStepInputs = {
        ...DEFAULT_INIT_INPUTS,
        workspacePath: testWorkspace,
        gitDiff
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeInitStep(inputs, outputs, evidence);

      expect(outputs.touchedFiles).toBeDefined();
      expect(outputs.touchedFiles).toContain('src/test.ts');
      expect(outputs.touchedFiles).toContain('src/utils.ts');
    });

    it('should create session context', async () => {
      const inputs: InitStepInputs = {
        ...DEFAULT_INIT_INPUTS,
        workspacePath: testWorkspace,
        sessionId: 'test-session-123',
        branchId: 'feature-branch',
        iteration: 2
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeInitStep(inputs, outputs, evidence);

      expect(outputs.sessionContext).toBeDefined();
      expect(outputs.sessionContext.sessionId).toBe('test-session-123');
      expect(outputs.sessionContext.branchId).toBe('feature-branch');
      expect(outputs.sessionContext.iteration).toBe(2);
    });

    it('should add evidence for missing specifications', async () => {
      // Don't create any spec files - should generate evidence
      const inputs: InitStepInputs = {
        ...DEFAULT_INIT_INPUTS,
        workspacePath: testWorkspace
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeInitStep(inputs, outputs, evidence);

      // Should have evidence for missing acceptance criteria
      const missingACEvidence = evidence.find(e => 
        e.type === 'missing_requirement' && 
        e.description.includes('acceptance criteria')
      );
      expect(missingACEvidence).toBeDefined();
      expect(missingACEvidence?.severity).toBe('Critical');
    });

    it('should handle missing spec directories gracefully', async () => {
      // Use non-existent spec path
      const inputs: InitStepInputs = {
        specPath: '.kiro/nonexistent',
        steeringPath: '.kiro/nonexistent',
        workspacePath: testWorkspace
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      // Should not throw error
      await expect(executeInitStep(inputs, outputs, evidence)).resolves.not.toThrow();

      // Should have default task goals
      expect(outputs.taskGoals).toBeDefined();
      expect(outputs.taskGoals.length).toBeGreaterThan(0);
      expect(outputs.taskGoals[0]).toContain('Audit and improve code quality');
    });

    it('should generate session ID when not provided', async () => {
      const inputs: InitStepInputs = {
        ...DEFAULT_INIT_INPUTS,
        workspacePath: testWorkspace
        // No sessionId provided
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeInitStep(inputs, outputs, evidence);

      expect(outputs.sessionContext.sessionId).toBeDefined();
      expect(outputs.sessionContext.sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);
    });

    it('should detect source files when no git diff provided', async () => {
      // Create some source files
      await mkdir(join(testWorkspace, 'src'), { recursive: true });
      await writeFile(join(testWorkspace, 'src', 'index.ts'), 'export const test = 1;');
      await writeFile(join(testWorkspace, 'src', 'utils.js'), 'function utils() {}');
      await writeFile(join(testWorkspace, 'README.md'), '# Test'); // Not a source file

      const inputs: InitStepInputs = {
        ...DEFAULT_INIT_INPUTS,
        workspacePath: testWorkspace
        // No gitDiff provided
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeInitStep(inputs, outputs, evidence);

      expect(outputs.touchedFiles).toBeDefined();
      expect(outputs.touchedFiles).toContain('src/index.ts');
      expect(outputs.touchedFiles).toContain('src/utils.js');
      expect(outputs.touchedFiles).not.toContain('README.md');
    });
  });

  describe('validation', () => {
    it('should validate vague acceptance criteria', async () => {
      const requirementsContent = `
# Test Requirements

## Requirements

### Requirement 1

#### Acceptance Criteria

1. WHEN user clicks THEN it works
2. The system SHALL be good
      `;

      await writeFile(join(testWorkspace, specPath, 'requirements.md'), requirementsContent);

      const inputs: InitStepInputs = {
        ...DEFAULT_INIT_INPUTS,
        workspacePath: testWorkspace
      };

      const outputs: Record<string, any> = {};
      const evidence: EvidenceItem[] = [];

      await executeInitStep(inputs, outputs, evidence);

      // Should have evidence for vague ACs
      const vagueACEvidence = evidence.find(e => 
        e.description.includes('vague or incomplete')
      );
      expect(vagueACEvidence).toBeDefined();
      expect(vagueACEvidence?.severity).toBe('Minor');
    });
  });
});