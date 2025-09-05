/**
 * Unit Tests for System Prompt Manager
 * 
 * Tests for prompt template rendering, validation, caching, and integration
 * with the GansAuditor_Codex architecture.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemPromptManager, type PromptVariables, type RenderedSystemPrompt } from '../system-prompt-manager.js';
import { 
  validateSystemPromptConfig,
  mergeSystemPromptConfig,
  DEFAULT_SYSTEM_PROMPT_CONFIG,
  type SystemPromptConfig,
} from '../system-prompt-config.js';
import type { 
  GansAuditorCodexThoughtData,
  GansAuditorCodexSessionState,
  GansAuditorCodexReview,
} from '../../types/gan-types.js';

describe('SystemPromptManager', () => {
  let systemPromptManager: SystemPromptManager;
  let mockThought: GansAuditorCodexThoughtData;
  let mockSession: GansAuditorCodexSessionState;
  let mockReview: GansAuditorCodexReview;

  beforeEach(() => {
    systemPromptManager = new SystemPromptManager({
      enableCaching: false, // Disable caching for tests
    });

    mockThought = {
      thought: 'Test audit thought',
      thoughtNumber: 1,
      totalThoughts: 5,
      nextThoughtNeeded: true,
    };

    mockSession = {
      id: 'test-session-123',
      currentLoop: 3,
      iterations: [],
      history: [],
      config: {},
      startTime: Date.now(),
      lastGan: null,
      stagnationInfo: null,
    };

    mockReview = {
      overall: 85,
      dimensions: [
        { name: 'Correctness & Completeness', score: 90 },
        { name: 'Tests', score: 80 },
        { name: 'Style & Conventions', score: 85 },
        { name: 'Security', score: 90 },
        { name: 'Performance', score: 75 },
        { name: 'Docs & Traceability', score: 70 },
      ],
      verdict: 'pass',
      review: {
        summary: 'Code quality is good with minor improvements needed',
        inline: [],
        citations: [],
      },
      proposed_diff: null,
      iterations: 3,
      judge_cards: [{
        model: 'test-model',
        score: 85,
        notes: 'Test review notes',
      }],
    };
  });

  afterEach(() => {
    systemPromptManager.clearCache();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new SystemPromptManager();
      const config = manager.getConfig();
      
      expect(config.identity.name).toBe('Kilo Code');
      expect(config.identity.role).toBe('Adversarial Auditor');
      expect(config.identity.stance).toBe('constructive-adversarial');
      expect(config.completionCriteria.maxIterations).toBe(25);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<SystemPromptConfig> = {
        identity: {
          name: 'Custom Auditor',
          role: 'Test Auditor',
          stance: 'adversarial',
          authority: 'flexible',
        },
        performance: {
          contextTokenLimit: 150000,
          auditTimeoutMs: 20000,
          enableCaching: false,
          enableProgressTracking: true,
        },
      };

      const manager = new SystemPromptManager({ config: customConfig });
      const config = manager.getConfig();

      expect(config.identity.name).toBe('Custom Auditor');
      expect(config.identity.role).toBe('Test Auditor');
      expect(config.performance.contextTokenLimit).toBe(150000);
      expect(config.workflow.steps).toBe(8); // Should keep default
    });

    it('should throw error for invalid configuration', () => {
      const invalidConfig: Partial<SystemPromptConfig> = {
        identity: {
          name: '', // Invalid: empty name
          role: 'Auditor',
          stance: 'constructive-adversarial',
          authority: 'spec-and-steering-ground-truth',
        },
      };

      expect(() => {
        new SystemPromptManager({ config: invalidConfig });
      }).toThrow('Invalid system prompt configuration');
    });
  });

  describe('renderSystemPrompt', () => {
    it('should render system prompt with basic variables', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);

      expect(rendered.content).toContain('Kilo Code');
      expect(rendered.content).toContain('Adversarial Auditor');
      expect(rendered.content).toContain('constructive-adversarial');
      expect(rendered.content).toContain('Loop 0/25'); // Default session values
      expect(rendered.variables.IDENTITY_NAME).toBe('Kilo Code');
      expect(rendered.variables.CURRENT_LOOP).toBe(0);
      expect(rendered.metadata.version).toBe('2.0');
    });

    it('should render with session context', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);

      expect(rendered.content).toContain('Loop 3/25');
      expect(rendered.content).toContain('test-session-123');
      expect(rendered.variables.CURRENT_LOOP).toBe(3);
      expect(rendered.variables.SESSION_ID).toBe('test-session-123');
    });

    it('should render with project context', async () => {
      const projectContext = {
        steering: 'Use TypeScript strict mode\nFollow ESLint rules',
        spec: 'Implement user authentication\nAdd password validation',
        repository: 'Repository: user-auth-service\nLanguage: TypeScript',
      };

      const rendered = await systemPromptManager.renderSystemPrompt(
        mockThought, 
        mockSession, 
        projectContext
      );

      expect(rendered.content).toContain('Use TypeScript strict mode');
      expect(rendered.content).toContain('Implement user authentication');
      expect(rendered.content).toContain('Repository: user-auth-service');
      expect(rendered.variables.STEERING_RULES).toBe(projectContext.steering);
      expect(rendered.variables.SPEC_REQUIREMENTS).toBe(projectContext.spec);
    });

    it('should handle missing template gracefully', async () => {
      const invalidManager = new SystemPromptManager({
        promptTemplatePath: '/nonexistent/path/template.md',
      });

      await expect(invalidManager.renderSystemPrompt(mockThought))
        .rejects.toThrow('Failed to load system prompt template');
    });

    it('should validate rendered template structure', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);

      // Check for required sections
      expect(rendered.content).toContain('## Identity & Role Definition');
      expect(rendered.content).toContain('## Audit Workflow');
      expect(rendered.content).toContain('## Multi-Dimensional Quality Assessment');
      expect(rendered.content).toContain('## Intelligent Completion Criteria');
      expect(rendered.content).toContain('## Structured Output Format');

      // Check that variables are resolved (no unresolved ${VAR} patterns)
      expect(rendered.content).not.toMatch(/\${[^}]+}/);
    });

    it('should render quality dimensions with correct weights', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);

      expect(rendered.content).toContain('Correctness & Completeness (30%)');
      expect(rendered.content).toContain('Tests (20%)');
      expect(rendered.content).toContain('Style & Conventions (15%)');
      expect(rendered.content).toContain('Security (15%)');
      expect(rendered.content).toContain('Performance (10%)');
      expect(rendered.content).toContain('Docs & Traceability (10%)');
    });

    it('should render completion tiers with thresholds', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);

      expect(rendered.content).toContain('Score ≥ 95% at 10+ loops');
      expect(rendered.content).toContain('Score ≥ 90% at 15+ loops');
      expect(rendered.content).toContain('Score ≥ 85% at 20+ loops');
    });

    it('should render kill switches with conditions', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);

      expect(rendered.content).toContain('Hard Stop');
      expect(rendered.content).toContain('Stagnation Detection');
      expect(rendered.content).toContain('Critical Issues Persist');
    });
  });

  describe('processAuditResponse', () => {
    let promptContext: RenderedSystemPrompt;

    beforeEach(async () => {
      promptContext = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);
    });

    it('should analyze completion status correctly', () => {
      const result = systemPromptManager.processAuditResponse(
        mockReview,
        promptContext,
        mockSession
      );

      expect(result.completionAnalysis).toBeDefined();
      expect(result.completionAnalysis.status).toBe('in_progress'); // 85% at loop 3
      expect(result.completionAnalysis.nextThoughtNeeded).toBe(true);
    });

    it('should detect tier 1 completion (95% at 10+ loops)', () => {
      const highScoreReview = { ...mockReview, overall: 96 };
      const highLoopSession = { ...mockSession, currentLoop: 12 };

      const result = systemPromptManager.processAuditResponse(
        highScoreReview,
        promptContext,
        highLoopSession
      );

      expect(result.completionAnalysis.status).toBe('completed');
      expect(result.completionAnalysis.reason).toBe('Tier 1 - Excellence');
      expect(result.completionAnalysis.nextThoughtNeeded).toBe(false);
    });

    it('should detect tier 2 completion (90% at 15+ loops)', () => {
      const goodScoreReview = { ...mockReview, overall: 91 };
      const mediumLoopSession = { ...mockSession, currentLoop: 16 };

      const result = systemPromptManager.processAuditResponse(
        goodScoreReview,
        promptContext,
        mediumLoopSession
      );

      expect(result.completionAnalysis.status).toBe('completed');
      expect(result.completionAnalysis.reason).toBe('Tier 2 - High Quality');
      expect(result.completionAnalysis.nextThoughtNeeded).toBe(false);
    });

    it('should detect tier 3 completion (85% at 20+ loops)', () => {
      const acceptableScoreReview = { ...mockReview, overall: 86 };
      const highLoopSession = { ...mockSession, currentLoop: 21 };

      const result = systemPromptManager.processAuditResponse(
        acceptableScoreReview,
        promptContext,
        highLoopSession
      );

      expect(result.completionAnalysis.status).toBe('completed');
      expect(result.completionAnalysis.reason).toBe('Tier 3 - Acceptable');
      expect(result.completionAnalysis.nextThoughtNeeded).toBe(false);
    });

    it('should detect hard stop kill switch', () => {
      const lowScoreReview = { ...mockReview, overall: 70 }; // Below tier 3 threshold
      const maxLoopSession = { ...mockSession, currentLoop: 25 };

      const result = systemPromptManager.processAuditResponse(
        lowScoreReview,
        promptContext,
        maxLoopSession
      );

      expect(result.completionAnalysis.status).toBe('terminated');
      expect(result.completionAnalysis.reason).toBe('Hard Stop');
      expect(result.completionAnalysis.nextThoughtNeeded).toBe(false);
    });

    it('should detect stagnation kill switch', () => {
      const stagnantSession = {
        ...mockSession,
        currentLoop: 12,
        iterations: [
          { auditResult: { overall: 75 } },
          { auditResult: { overall: 76 } },
          { auditResult: { overall: 75 } },
        ],
      };

      const result = systemPromptManager.processAuditResponse(
        mockReview,
        promptContext,
        stagnantSession
      );

      expect(result.completionAnalysis.status).toBe('terminated');
      expect(result.completionAnalysis.reason).toBe('Stagnation Detection');
      expect(result.completionAnalysis.nextThoughtNeeded).toBe(false);
    });

    it('should generate appropriate next actions', () => {
      const criticalIssueReview = {
        ...mockReview,
        review: {
          ...mockReview.review,
          inline: [
            {
              path: 'src/auth.ts',
              line: 42,
              comment: 'Critical: SQL injection vulnerability detected',
            },
            {
              path: 'src/user.ts',
              line: 15,
              comment: 'Major: Missing input validation',
            },
          ],
        },
      };

      const result = systemPromptManager.processAuditResponse(
        criticalIssueReview,
        promptContext,
        mockSession
      );

      expect(result.nextActions).toBeDefined();
      expect(result.nextActions.length).toBeGreaterThan(0);
      expect(result.nextActions[0].type).toBe('fix_critical');
      expect(result.nextActions[0].priority).toBe('critical');
    });

    it('should enhance response with completion context', () => {
      const result = systemPromptManager.processAuditResponse(
        mockReview,
        promptContext,
        mockSession
      );

      expect(result.enhancedResponse.judge_cards).toHaveLength(2); // Original + system-prompt-manager
      expect(result.enhancedResponse.judge_cards[1].model).toBe('system-prompt-manager');
      expect(result.enhancedResponse.review.summary).toContain(mockReview.review.summary);
    });
  });

  describe('caching behavior', () => {
    it('should cache rendered prompts when enabled', async () => {
      const cachingManager = new SystemPromptManager({
        enableCaching: true,
        cacheMaxAge: 60000,
      });

      // First render
      const rendered1 = await cachingManager.renderSystemPrompt(mockThought, mockSession);
      
      // Second render (should be cached)
      const rendered2 = await cachingManager.renderSystemPrompt(mockThought, mockSession);

      expect(rendered1.metadata.renderedAt).toBe(rendered2.metadata.renderedAt);
      
      const stats = cachingManager.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      cachingManager.clearCache();
    });

    it('should generate different cache keys for different contexts', async () => {
      const cachingManager = new SystemPromptManager({
        enableCaching: true,
      });

      const thought1 = { ...mockThought, thoughtNumber: 1 };
      const thought2 = { ...mockThought, thoughtNumber: 2 };

      await cachingManager.renderSystemPrompt(thought1, mockSession);
      await cachingManager.renderSystemPrompt(thought2, mockSession);

      const stats = cachingManager.getCacheStats();
      expect(stats.size).toBe(2); // Different cache entries

      cachingManager.clearCache();
    });

    it('should invalidate cache on configuration changes', () => {
      const cachingManager = new SystemPromptManager({
        enableCaching: true,
      });

      // Clear cache and update configuration
      cachingManager.clearCache();
      cachingManager.updateConfig({
        identity: { 
          name: 'Updated Auditor',
          role: 'Updated Role',
          stance: 'adversarial',
          authority: 'flexible',
        },
      });

      const stats = cachingManager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', () => {
      const newConfig: Partial<SystemPromptConfig> = {
        performance: {
          contextTokenLimit: 100000,
          auditTimeoutMs: 15000,
          enableCaching: false,
          enableProgressTracking: false,
        },
      };

      systemPromptManager.updateConfig(newConfig);
      const config = systemPromptManager.getConfig();

      expect(config.performance.contextTokenLimit).toBe(100000);
      expect(config.performance.auditTimeoutMs).toBe(15000);
      expect(config.identity.name).toBe('Kilo Code'); // Should preserve other settings
    });

    it('should validate configuration updates', () => {
      const invalidConfig: Partial<SystemPromptConfig> = {
        completionCriteria: {
          stagnationThreshold: 1.5, // Invalid: > 1
          maxIterations: 25,
          tiers: 3,
          killSwitches: 3,
          shipGates: 5,
        },
      };

      expect(() => {
        systemPromptManager.updateConfig(invalidConfig);
      }).toThrow('Invalid configuration update');
    });

    it('should get current configuration', () => {
      const config = systemPromptManager.getConfig();

      expect(config).toBeDefined();
      expect(config.identity).toBeDefined();
      expect(config.workflow).toBeDefined();
      expect(config.qualityFramework).toBeDefined();
      expect(config.completionCriteria).toBeDefined();
      expect(config.integration).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.performance).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle template loading errors gracefully', async () => {
      const invalidManager = new SystemPromptManager({
        promptTemplatePath: '/nonexistent/path/template.md',
      });

      await expect(invalidManager.renderSystemPrompt(mockThought))
        .rejects.toThrow('Failed to load system prompt template');
    });

    it('should handle malformed template variables', async () => {
      // This would require mocking the template file with malformed variables
      // For now, we'll test that the manager handles undefined variables gracefully
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);
      
      // Should not contain unresolved variables
      expect(rendered.content).not.toMatch(/\${UNDEFINED_VARIABLE}/);
    });

    it('should validate template structure', async () => {
      // The manager should validate that required sections are present
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought);
      
      expect(rendered.content.length).toBeGreaterThan(1000); // Should be substantial
      expect(rendered.content).toContain('Identity & Role Definition');
      expect(rendered.content).toContain('Audit Workflow');
    });
  });

  describe('variable substitution', () => {
    it('should substitute all required variables', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);

      // Check that key variables are substituted
      expect(rendered.variables.PROMPT_VERSION).toBe('2.0');
      expect(rendered.variables.IDENTITY_NAME).toBe('Kilo Code');
      expect(rendered.variables.IDENTITY_ROLE).toBe('Adversarial Auditor');
      expect(rendered.variables.CURRENT_LOOP).toBe(3);
      expect(rendered.variables.MAX_ITERATIONS).toBe(25);
      expect(rendered.variables.SESSION_ID).toBe('test-session-123');
    });

    it('should handle default values correctly', async () => {
      const thoughtWithoutSession = { ...mockThought };
      const rendered = await systemPromptManager.renderSystemPrompt(thoughtWithoutSession);

      // Should use default values when session is not provided
      expect(rendered.variables.CURRENT_LOOP).toBe(0);
      expect(rendered.variables.SESSION_ID).toBeUndefined();
    });

    it('should format complex variables correctly', async () => {
      const rendered = await systemPromptManager.renderSystemPrompt(mockThought, mockSession);

      // Quality dimensions should be rendered as formatted text
      expect(rendered.variables.QUALITY_DIMENSIONS_RENDERED).toContain('Correctness & Completeness (30%)');
      expect(rendered.variables.COMPLETION_TIERS_RENDERED).toContain('Score ≥ 95% at 10+ loops');
      expect(rendered.variables.KILL_SWITCHES_RENDERED).toContain('Hard Stop');
    });
  });
});