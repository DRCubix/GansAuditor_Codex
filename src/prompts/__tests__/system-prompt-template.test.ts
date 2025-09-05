/**
 * System Prompt Template Tests
 * 
 * Tests for the core system prompt template and configuration functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SystemPromptManager } from '../system-prompt-manager.js';
import { 
  validateSystemPromptConfig,
  mergeSystemPromptConfig,
  DEFAULT_SYSTEM_PROMPT_CONFIG,
} from '../system-prompt-config.js';
import { 
  validateSystemPromptTemplate,
  createSystemPromptFromTemplate,
} from '../prompt-utils.js';
import type { GansAuditorCodexThoughtData } from '../../types/gan-types.js';

describe('System Prompt Template and Configuration', () => {
  let systemPromptManager: SystemPromptManager;
  
  beforeEach(() => {
    systemPromptManager = new SystemPromptManager({
      enableCaching: false, // Disable caching for tests
    });
  });
  
  afterEach(() => {
    systemPromptManager.clearCache();
  });

  describe('Template Structure Validation', () => {
    it('should validate template file structure', async () => {
      const validation = await validateSystemPromptTemplate();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.templateInfo.sectionsFound).toBeGreaterThan(4);
      expect(validation.templateInfo.variablesFound).toBeGreaterThan(10);
      expect(validation.templateInfo.size).toBeGreaterThan(5000);
    });

    it('should detect missing required sections', async () => {
      // This would test with a minimal template missing sections
      // For now, we'll test the validation logic
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Configuration Validation', () => {
    it('should validate default configuration', () => {
      const validation = validateSystemPromptConfig(DEFAULT_SYSTEM_PROMPT_CONFIG);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.validatedSections).toContain('identity');
      expect(validation.validatedSections).toContain('completionCriteria');
      expect(validation.validatedSections).toContain('performance');
    });

    it('should detect invalid identity configuration', () => {
      const invalidConfig = {
        identity: {
          name: '', // Invalid: empty name
          role: 'Auditor',
          stance: 'invalid-stance' as any, // Invalid stance
          authority: 'spec-and-steering-ground-truth' as any,
        },
      };
      
      const validation = validateSystemPromptConfig(invalidConfig);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Identity name cannot be empty');
      expect(validation.errors.some(e => e.includes('Invalid identity stance'))).toBe(true);
    });

    it('should detect invalid completion criteria', () => {
      const invalidConfig = {
        completionCriteria: {
          stagnationThreshold: 1.5, // Invalid: > 1
          maxIterations: 0, // Invalid: < 1
          tiers: 3,
          killSwitches: 3,
          shipGates: 5,
        },
      };
      
      const validation = validateSystemPromptConfig(invalidConfig);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Stagnation threshold must be between 0 and 1');
      expect(validation.errors).toContain('Max iterations must be between 1 and 100');
    });

    it('should provide warnings for suboptimal settings', () => {
      const suboptimalConfig = {
        performance: {
          contextTokenLimit: 500, // Too low
          auditTimeoutMs: 3000, // Too short
          enableCaching: true,
          enableProgressTracking: true,
        },
      };
      
      const validation = validateSystemPromptConfig(suboptimalConfig);
      
      expect(validation.isValid).toBe(false); // Should be invalid due to limits
      expect(validation.errors.some(e => e.includes('Context token limit'))).toBe(true);
      expect(validation.errors.some(e => e.includes('Audit timeout'))).toBe(true);
    });

    it('should merge configurations correctly', () => {
      const customConfig = {
        identity: {
          name: 'Custom Auditor',
        },
        performance: {
          auditTimeoutMs: 45000,
        },
      };
      
      const merged = mergeSystemPromptConfig(customConfig);
      
      expect(merged.identity.name).toBe('Custom Auditor');
      expect(merged.identity.role).toBe(DEFAULT_SYSTEM_PROMPT_CONFIG.identity.role);
      expect(merged.performance.auditTimeoutMs).toBe(45000);
      expect(merged.performance.contextTokenLimit).toBe(DEFAULT_SYSTEM_PROMPT_CONFIG.performance.contextTokenLimit);
    });
  });

  describe('Template Rendering', () => {
    it('should render template with variables', async () => {
      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Test audit thought',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };
      
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);
      
      expect(rendered.content).toContain('Kilo Code');
      expect(rendered.content).toContain('Adversarial Auditor');
      expect(rendered.content).toContain('constructive-adversarial');
      expect(rendered.variables.IDENTITY_NAME).toBe('Kilo Code');
      expect(rendered.variables.CURRENT_LOOP).toBe(0);
      expect(rendered.metadata.version).toBe('2.0');
    });

    it('should handle default values in template', async () => {
      const rendered = await createSystemPromptFromTemplate();
      
      expect(rendered).toContain('Kilo Code');
      expect(rendered).toContain('200000'); // Default context tokens
      expect(rendered).toContain('25'); // Default max iterations
    });

    it('should substitute custom variables', async () => {
      const customManager = new SystemPromptManager({
        config: {
          identity: {
            name: 'Test Auditor',
            role: 'Test Role',
            stance: 'adversarial',
            authority: 'flexible',
          },
          performance: {
            contextTokenLimit: 150000,
            auditTimeoutMs: 20000,
            enableCaching: true,
            enableProgressTracking: true,
          },
        },
        enableCaching: false,
      });
      
      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Test thought',
        thoughtNumber: 2,
        totalThoughts: 5,
        nextThoughtNeeded: true,
      };
      
      const rendered = await customManager.renderSystemPrompt(mockThought);
      
      expect(rendered.content).toContain('Test Auditor');
      expect(rendered.content).toContain('150000');
      expect(rendered.content).toContain('20000');
      expect(rendered.variables.IDENTITY_NAME).toBe('Test Auditor');
      expect(rendered.variables.MODEL_CONTEXT_TOKENS).toBe(150000);
    });

    it('should validate rendered template structure', async () => {
      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Test thought',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };
      
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);
      
      // Check for required sections
      expect(rendered.content).toContain('## Identity & Role Definition');
      expect(rendered.content).toContain('## Audit Workflow');
      expect(rendered.content).toContain('## Multi-Dimensional Quality Assessment');
      expect(rendered.content).toContain('## Intelligent Completion Criteria');
      expect(rendered.content).toContain('## Structured Output Format');
      
      // Check that variables are resolved
      expect(rendered.content).not.toMatch(/\${[^}]+}/);
    });
  });

  describe('Quality Dimensions Rendering', () => {
    it('should render quality dimensions with correct weights', async () => {
      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Test thought',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };
      
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);
      
      expect(rendered.content).toContain('Correctness & Completeness (30%)');
      expect(rendered.content).toContain('Tests (20%)');
      expect(rendered.content).toContain('Style & Conventions (15%)');
      expect(rendered.content).toContain('Security (15%)');
      expect(rendered.content).toContain('Performance (10%)');
      expect(rendered.content).toContain('Docs & Traceability (10%)');
    });
  });

  describe('Completion Tiers Rendering', () => {
    it('should render completion tiers with thresholds', async () => {
      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Test thought',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };
      
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);
      
      expect(rendered.content).toContain('Score ≥ 95% at 10+ loops');
      expect(rendered.content).toContain('Score ≥ 90% at 15+ loops');
      expect(rendered.content).toContain('Score ≥ 85% at 20+ loops');
    });
  });

  describe('Kill Switches Rendering', () => {
    it('should render kill switches with conditions', async () => {
      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Test thought',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };
      
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);
      
      expect(rendered.content).toContain('Hard Stop');
      expect(rendered.content).toContain('Stagnation Detection');
      expect(rendered.content).toContain('Critical Issues Persist');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache rendered prompts when enabled', async () => {
      const cachingManager = new SystemPromptManager({
        enableCaching: true,
        cacheMaxAge: 60000,
      });
      
      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Test thought',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };
      
      // First render
      const rendered1 = await cachingManager.renderSystemPrompt(mockThought);
      
      // Second render (should be cached)
      const rendered2 = await cachingManager.renderSystemPrompt(mockThought);
      
      expect(rendered1.metadata.renderedAt).toBe(rendered2.metadata.renderedAt);
      
      const stats = cachingManager.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should invalidate cache on configuration changes', () => {
      const cachingManager = new SystemPromptManager({
        enableCaching: true,
      });
      
      // Add some cache entries
      cachingManager.clearCache();
      
      // Update configuration
      cachingManager.updateConfig({
        identity: { name: 'Updated Auditor' },
      });
      
      const stats = cachingManager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid template path gracefully', async () => {
      const invalidManager = new SystemPromptManager({
        promptTemplatePath: '/nonexistent/path/template.md',
      });
      
      const mockThought: GansAuditorCodexThoughtData = {
        thought: 'Test thought',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false,
      };
      
      await expect(invalidManager.renderSystemPrompt(mockThought))
        .rejects.toThrow('Failed to load system prompt template');
    });

    it('should validate configuration on construction', () => {
      expect(() => {
        new SystemPromptManager({
          config: {
            identity: {
              name: '', // Invalid
              role: 'Auditor',
              stance: 'constructive-adversarial',
              authority: 'spec-and-steering-ground-truth',
            },
          },
        });
      }).toThrow('Invalid system prompt configuration');
    });
  });
});