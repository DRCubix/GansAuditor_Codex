/**
 * Unit tests for ProjectContextAnalyzer
 * 
 * Tests project pattern detection, convention extraction, and context analysis.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  ProjectContextAnalyzer, 
  createProjectContextAnalyzer,
  validateProjectContext,
  type ProjectAnalysisConfig,
  type ProjectContext,
  DEFAULT_PROJECT_ANALYSIS_CONFIG
} from '../project-context-analyzer.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn()
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn()
}));

describe('ProjectContextAnalyzer', () => {
  let analyzer: ProjectContextAnalyzer;
  let mockConfig: Partial<ProjectAnalysisConfig>;

  beforeEach(() => {
    mockConfig = {
      rootDirectory: '/test/project',
      steeringDirectory: '/test/project/.kiro/steering',
      maxFiles: 10,
      confidenceThreshold: 0.5
    };
    analyzer = createProjectContextAnalyzer(mockConfig);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create analyzer with default config', () => {
      const defaultAnalyzer = new ProjectContextAnalyzer();
      expect(defaultAnalyzer).toBeInstanceOf(ProjectContextAnalyzer);
    });

    it('should create analyzer with custom config', () => {
      const customConfig: Partial<ProjectAnalysisConfig> = {
        rootDirectory: '/custom/path',
        maxFiles: 500
      };
      const customAnalyzer = new ProjectContextAnalyzer(customConfig);
      expect(customAnalyzer).toBeInstanceOf(ProjectContextAnalyzer);
    });
  });

  describe('analyzeProjectContext', () => {
    it('should analyze project context successfully', async () => {
      // Mock file system operations
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0',
          'express': '^4.18.0'
        }
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context).toBeDefined();
      expect(context.projectType).toBeDefined();
      expect(context.techStack).toBeDefined();
      expect(Array.isArray(context.patterns)).toBe(true);
      expect(Array.isArray(context.conventions)).toBe(true);
      expect(context.configuration).toBeDefined();
      expect(context.metadata).toBeDefined();
    });

    it('should handle missing package.json gracefully', async () => {
      const { existsSync } = await import('fs');
      const { readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context).toBeDefined();
      expect(context.projectType).toBe('unknown');
    });

    it('should handle file system errors gracefully', async () => {
      const { existsSync } = await import('fs');
      const { readFile } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockRejectedValue(new Error('File read error'));

      await expect(analyzer.analyzeProjectContext()).rejects.toThrow();
    });
  });

  describe('project type detection', () => {
    it('should detect web application project', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        dependencies: { 'react': '^18.0.0' }
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.projectType).toBe('web-application');
    });

    it('should detect API service project', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        dependencies: { 'express': '^4.18.0' }
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.projectType).toBe('api-service');
    });

    it('should detect CLI tool project', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        bin: { 'my-cli': './bin/cli.js' }
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.projectType).toBe('cli-tool');
    });

    it('should detect library project', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      // Mock existsSync to return true for index.ts
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return path.toString().includes('index.ts') || path.toString().includes('package.json');
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        name: 'my-library'
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.projectType).toBe('library');
    });
  });

  describe('technology stack detection', () => {
    it('should detect frontend frameworks', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        dependencies: {
          'react': '^18.0.0',
          'vue': '^3.0.0'
        }
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.techStack.frontendFrameworks).toContain('React');
      expect(context.techStack.frontendFrameworks).toContain('Vue.js');
    });

    it('should detect backend frameworks', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        dependencies: {
          'express': '^4.18.0',
          'fastify': '^4.0.0'
        }
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.techStack.backendFrameworks).toContain('Express.js');
      expect(context.techStack.backendFrameworks).toContain('Fastify');
    });

    it('should detect testing frameworks', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        devDependencies: {
          'jest': '^29.0.0',
          'vitest': '^1.0.0'
        }
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.techStack.testingFrameworks).toContain('Jest');
      expect(context.techStack.testingFrameworks).toContain('Vitest');
    });

    it('should detect databases', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        dependencies: {
          'mongodb': '^5.0.0',
          'pg': '^8.0.0'
        }
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.techStack.databases).toContain('MongoDB');
      expect(context.techStack.databases).toContain('PostgreSQL');
    });
  });

  describe('pattern extraction', () => {
    it('should extract patterns from steering documents', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify({ name: 'test-project' })) // package.json
        .mockResolvedValueOnce(`
          ## Naming Conventions
          
          - MUST use camelCase for variables
          - SHOULD use PascalCase for classes
          
          ## Architecture Patterns
          
          - MUST follow MVC pattern
          - SHOULD use dependency injection
        `); // steering document
      vi.mocked(readdir).mockResolvedValue([{ name: 'conventions.md', isFile: () => true, isDirectory: () => false } as any]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.patterns.length).toBeGreaterThan(0);
      expect(context.patterns.some(p => p.name.includes('Naming Conventions'))).toBe(true);
      expect(context.patterns.some(p => p.name.includes('Architecture Patterns'))).toBe(true);
    });

    it('should categorize patterns correctly', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify({ name: 'test-project' }))
        .mockResolvedValueOnce(`
          ## Security Guidelines
          
          - MUST validate all inputs
          
          ## Testing Standards
          
          - SHOULD have 80% test coverage
        `);
      vi.mocked(readdir).mockResolvedValue([{ name: 'guidelines.md', isFile: () => true, isDirectory: () => false } as any]);

      const context = await analyzer.analyzeProjectContext();

      const securityPattern = context.patterns.find(p => p.category === 'security');
      const testingPattern = context.patterns.find(p => p.category === 'testing');
      
      expect(securityPattern).toBeDefined();
      expect(testingPattern).toBeDefined();
    });
  });

  describe('convention extraction', () => {
    it('should extract naming conventions from code', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify({ name: 'test-project' })) // package.json
        .mockResolvedValueOnce(`
          const userName = 'john';
          const userAge = 25;
          const isActive = true;
        `); // code file
      vi.mocked(readdir)
        .mockResolvedValueOnce([]) // steering directory
        .mockResolvedValueOnce([{ name: 'test.ts', isFile: () => true, isDirectory: () => false } as any]); // code directory

      const context = await analyzer.analyzeProjectContext();

      const namingConvention = context.conventions.find(c => c.category === 'naming');
      expect(namingConvention).toBeDefined();
      expect(namingConvention?.confidence).toBeGreaterThan(0.5);
    });

    it('should extract import style conventions', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify({ name: 'test-project' }))
        .mockResolvedValueOnce(`
          import { helper } from './utils/helper';
          import { config } from './config/config';
          import { logger } from './utils/logger';
        `);
      vi.mocked(readdir)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ name: 'test.ts', isFile: () => true, isDirectory: () => false } as any]);

      const context = await analyzer.analyzeProjectContext();

      const importConvention = context.conventions.find(c => c.category === 'import-style');
      expect(importConvention).toBeDefined();
      expect(importConvention?.name).toContain('Relative Paths');
    });

    it('should extract function style conventions', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify({ name: 'test-project' }))
        .mockResolvedValueOnce(`
          const processData = (data) => {
            return data.map(item => item.value);
          };
          
          const validateInput = (input) => {
            return input && input.length > 0;
          };
        `);
      vi.mocked(readdir)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ name: 'test.ts', isFile: () => true, isDirectory: () => false } as any]);

      const context = await analyzer.analyzeProjectContext();

      const functionConvention = context.conventions.find(c => c.category === 'function-style');
      expect(functionConvention).toBeDefined();
      expect(functionConvention?.name).toContain('Arrow Functions');
    });
  });

  describe('project metadata analysis', () => {
    it('should analyze project size correctly', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify({
          name: 'test-project',
          version: '1.2.3',
          description: 'A test project'
        }))
        .mockResolvedValue('// Small file content\nconst x = 1;'); // Mock small files
      vi.mocked(readdir)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ name: 'test.ts', isFile: () => true, isDirectory: () => false } as any]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.metadata.name).toBe('test-project');
      expect(context.metadata.version).toBe('1.2.3');
      expect(context.metadata.description).toBe('A test project');
      expect(context.metadata.size).toBe('small');
    });

    it('should assess project maturity based on version', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        name: 'mature-project',
        version: '2.5.1'
      }));
      vi.mocked(readdir).mockResolvedValue([]);

      const context = await analyzer.analyzeProjectContext();

      expect(context.metadata.maturity).toBe('mature');
    });
  });

  describe('factory functions', () => {
    it('should create analyzer with createProjectContextAnalyzer', () => {
      const analyzer = createProjectContextAnalyzer();
      expect(analyzer).toBeInstanceOf(ProjectContextAnalyzer);
    });

    it('should create analyzer with custom config', () => {
      const config: Partial<ProjectAnalysisConfig> = {
        rootDirectory: '/custom/path'
      };
      const analyzer = createProjectContextAnalyzer(config);
      expect(analyzer).toBeInstanceOf(ProjectContextAnalyzer);
    });
  });

  describe('validateProjectContext', () => {
    it('should validate correct project context', () => {
      const validContext: ProjectContext = {
        projectType: 'web-application',
        techStack: {
          primaryLanguage: 'typescript',
          secondaryLanguages: [],
          frontendFrameworks: ['React'],
          backendFrameworks: [],
          databases: [],
          testingFrameworks: ['Jest'],
          buildTools: ['Webpack'],
          packageManagers: ['npm'],
          deploymentPlatforms: []
        },
        patterns: [],
        conventions: [],
        configuration: {},
        metadata: {
          name: 'test-project',
          version: '1.0.0',
          description: 'Test project',
          size: 'small',
          teamSize: 'solo',
          maturity: 'development',
          lastModified: new Date()
        }
      };

      expect(validateProjectContext(validContext)).toBe(true);
    });

    it('should reject invalid project context', () => {
      const invalidContext = {
        projectType: 'web-application',
        // Missing required fields
      } as any;

      expect(validateProjectContext(invalidContext)).toBe(false);
    });
  });

  describe('configuration handling', () => {
    it('should use default configuration when none provided', () => {
      const analyzer = new ProjectContextAnalyzer();
      expect(analyzer).toBeInstanceOf(ProjectContextAnalyzer);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<ProjectAnalysisConfig> = {
        maxFiles: 2000,
        confidenceThreshold: 0.8
      };
      const analyzer = new ProjectContextAnalyzer(customConfig);
      expect(analyzer).toBeInstanceOf(ProjectContextAnalyzer);
    });
  });

  describe('error handling', () => {
    it('should handle missing steering directory gracefully', async () => {
      const { existsSync } = await import('fs');
      const { readFile } = await import('fs/promises');
      
      vi.mocked(existsSync).mockImplementation((path: any) => {
        return !path.toString().includes('.kiro/steering');
      });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ name: 'test' }));

      const context = await analyzer.analyzeProjectContext();

      expect(context.patterns).toEqual([]);
    });

    it('should handle file read errors gracefully', async () => {
      const { existsSync } = await import('fs');
      const { readFile, readdir } = await import('fs/promises');
      
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockRejectedValue(new Error('Permission denied'));
      vi.mocked(readdir).mockResolvedValue([]);

      await expect(analyzer.analyzeProjectContext()).rejects.toThrow();
    });
  });
});