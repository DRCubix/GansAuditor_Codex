/**
 * Unit tests for ComplexityAnalyzer
 * 
 * Tests code complexity analysis and audit depth adjustment functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ComplexityAnalyzer, 
  createComplexityAnalyzer,
  validateComplexityMetrics,
  type CodeAnalysisContext,
  type ComplexityMetrics,
  type ComplexityAuditConfig,
  DEFAULT_COMPLEXITY_AUDIT_CONFIG
} from '../complexity-analyzer.js';

describe('ComplexityAnalyzer', () => {
  let analyzer: ComplexityAnalyzer;
  let mockContext: CodeAnalysisContext;

  beforeEach(() => {
    analyzer = createComplexityAnalyzer();
    mockContext = {
      filePath: 'test.ts',
      language: 'typescript',
      content: `
        function simpleFunction() {
          return 42;
        }
        
        class TestClass {
          method() {
            if (true) {
              for (let i = 0; i < 10; i++) {
                console.log(i);
              }
            }
          }
        }
      `
    };
  });

  describe('constructor', () => {
    it('should create analyzer with default config', () => {
      const defaultAnalyzer = new ComplexityAnalyzer();
      expect(defaultAnalyzer).toBeInstanceOf(ComplexityAnalyzer);
    });

    it('should create analyzer with custom config', () => {
      const customConfig: Partial<ComplexityAuditConfig> = {
        baseTimeoutSeconds: 60,
        timeoutMultiplier: 2.0
      };
      const customAnalyzer = new ComplexityAnalyzer(customConfig);
      expect(customAnalyzer).toBeInstanceOf(ComplexityAnalyzer);
    });
  });

  describe('analyzeComplexity', () => {
    it('should analyze simple code complexity', async () => {
      const simpleContext: CodeAnalysisContext = {
        filePath: 'simple.ts',
        language: 'typescript',
        content: 'function simple() { return 1; }'
      };

      const metrics = await analyzer.analyzeComplexity(simpleContext);

      expect(metrics).toBeDefined();
      expect(metrics.overallComplexity).toBeGreaterThanOrEqual(0);
      expect(metrics.overallComplexity).toBeLessThanOrEqual(100);
      expect(metrics.cyclomaticComplexity).toBeGreaterThanOrEqual(1);
      expect(metrics.linesOfCode).toBeGreaterThan(0);
    });

    it('should analyze complex code with higher complexity score', async () => {
      const complexContext: CodeAnalysisContext = {
        filePath: 'complex.ts',
        language: 'typescript',
        content: `
          class ComplexClass {
            complexMethod(input: any) {
              if (input.type === 'A') {
                for (let i = 0; i < input.items.length; i++) {
                  if (input.items[i].valid) {
                    switch (input.items[i].category) {
                      case 'urgent':
                        if (input.items[i].priority > 5) {
                          this.processUrgent(input.items[i]);
                        } else {
                          this.processNormal(input.items[i]);
                        }
                        break;
                      case 'normal':
                        this.processNormal(input.items[i]);
                        break;
                      default:
                        throw new Error('Unknown category');
                    }
                  }
                }
              } else if (input.type === 'B') {
                this.processBatch(input);
              } else {
                throw new Error('Invalid input type');
              }
            }
          }
        `
      };

      const metrics = await analyzer.analyzeComplexity(complexContext);

      expect(metrics.overallComplexity).toBeGreaterThan(30);
      expect(metrics.cyclomaticComplexity).toBeGreaterThan(5);
      expect(metrics.nestingDepth).toBeGreaterThan(3);
    });

    it('should handle different programming languages', async () => {
      const pythonContext: CodeAnalysisContext = {
        filePath: 'test.py',
        language: 'python',
        content: `
          def complex_function(data):
              if data:
                  for item in data:
                      if item.valid:
                          return item.value
              return None
        `
      };

      const metrics = await analyzer.analyzeComplexity(pythonContext);

      expect(metrics).toBeDefined();
      expect(metrics.overallComplexity).toBeGreaterThanOrEqual(0);
      expect(metrics.cyclomaticComplexity).toBeGreaterThan(1);
    });

    it('should throw error for invalid input', async () => {
      const invalidContext = {
        filePath: 'test.ts',
        language: 'typescript',
        content: null as any
      };

      await expect(analyzer.analyzeComplexity(invalidContext)).rejects.toThrow();
    });
  });

  describe('adjustAuditDepth', () => {
    it('should recommend shallow audit for low complexity', () => {
      const lowComplexityMetrics: ComplexityMetrics = {
        cyclomaticComplexity: 2,
        cognitiveComplexity: 3,
        linesOfCode: 10,
        functionCount: 1,
        classCount: 0,
        nestingDepth: 1,
        dependencyCount: 2,
        halsteadComplexity: {
          distinctOperators: 5,
          distinctOperands: 8,
          totalOperators: 10,
          totalOperands: 15,
          vocabulary: 13,
          length: 25,
          calculatedLength: 20,
          volume: 100,
          difficulty: 3,
          effort: 300
        },
        overallComplexity: 15
      };

      const adjustment = analyzer.adjustAuditDepth(lowComplexityMetrics, mockContext);

      expect(adjustment.auditDepth).toBe('shallow');
      expect(adjustment.timeoutSeconds).toBeLessThanOrEqual(DEFAULT_COMPLEXITY_AUDIT_CONFIG.baseTimeoutSeconds * 1.5);
      expect(adjustment.focusAreas).toHaveLength(3);
      expect(adjustment.recommendations).toBeDefined();
      expect(adjustment.justification).toContain('shallow');
    });

    it('should recommend comprehensive audit for high complexity', () => {
      const highComplexityMetrics: ComplexityMetrics = {
        cyclomaticComplexity: 25,
        cognitiveComplexity: 35,
        linesOfCode: 500,
        functionCount: 20,
        classCount: 5,
        nestingDepth: 8,
        dependencyCount: 30,
        halsteadComplexity: {
          distinctOperators: 20,
          distinctOperands: 50,
          totalOperators: 100,
          totalOperands: 200,
          vocabulary: 70,
          length: 300,
          calculatedLength: 250,
          volume: 1500,
          difficulty: 15,
          effort: 22500
        },
        overallComplexity: 85
      };

      const adjustment = analyzer.adjustAuditDepth(highComplexityMetrics, mockContext);

      expect(adjustment.auditDepth).toBe('comprehensive');
      expect(adjustment.timeoutSeconds).toBeGreaterThan(DEFAULT_COMPLEXITY_AUDIT_CONFIG.baseTimeoutSeconds);
      expect(adjustment.focusAreas).toContain('testing');
      expect(adjustment.recommendations).toContain('High complexity detected - comprehensive audit recommended');
      expect(adjustment.justification).toContain('comprehensive');
    });

    it('should prioritize focus areas based on complexity patterns', () => {
      const securityFocusMetrics: ComplexityMetrics = {
        cyclomaticComplexity: 10,
        cognitiveComplexity: 12,
        linesOfCode: 200,
        functionCount: 8,
        classCount: 2,
        nestingDepth: 3,
        dependencyCount: 25, // High dependency count should prioritize security
        halsteadComplexity: {
          distinctOperators: 15,
          distinctOperands: 30,
          totalOperators: 50,
          totalOperands: 80,
          vocabulary: 45,
          length: 130,
          calculatedLength: 120,
          volume: 800,
          difficulty: 8,
          effort: 6400
        },
        overallComplexity: 45
      };

      const adjustment = analyzer.adjustAuditDepth(securityFocusMetrics, mockContext);

      expect(adjustment.focusAreas).toContain('security');
    });

    it('should generate appropriate recommendations for different complexity patterns', () => {
      const complexityMetrics: ComplexityMetrics = {
        cyclomaticComplexity: 15, // High cyclomatic complexity
        cognitiveComplexity: 20, // High cognitive complexity
        linesOfCode: 100,
        functionCount: 25, // Many functions
        classCount: 1,
        nestingDepth: 6, // Deep nesting
        dependencyCount: 5,
        halsteadComplexity: {
          distinctOperators: 10,
          distinctOperands: 20,
          totalOperators: 30,
          totalOperands: 50,
          vocabulary: 30,
          length: 80,
          calculatedLength: 75,
          volume: 400,
          difficulty: 5,
          effort: 2000
        },
        overallComplexity: 60
      };

      const adjustment = analyzer.adjustAuditDepth(complexityMetrics, mockContext);

      expect(adjustment.recommendations).toContain('Consider breaking down complex functions to reduce cyclomatic complexity');
      expect(adjustment.recommendations).toContain('Simplify logic flow to reduce cognitive load');
      expect(adjustment.recommendations).toContain('Reduce nesting depth through early returns or helper functions');
      expect(adjustment.recommendations).toContain('Consider organizing functions into classes or modules');
    });
  });

  describe('complexity calculation methods', () => {
    it('should calculate lines of code correctly', async () => {
      const codeWithComments: CodeAnalysisContext = {
        filePath: 'test.ts',
        language: 'typescript',
        content: `
          // This is a comment
          function test() {
            /* Multi-line
               comment */
            return 42; // Inline comment
          }
          
          // Another comment
        `
      };

      const metrics = await analyzer.analyzeComplexity(codeWithComments);

      // Should exclude comment lines and empty lines
      expect(metrics.linesOfCode).toBeLessThan(8);
      expect(metrics.linesOfCode).toBeGreaterThan(0);
    });

    it('should detect functions correctly', async () => {
      const functionsCode: CodeAnalysisContext = {
        filePath: 'functions.ts',
        language: 'typescript',
        content: `
          function regularFunction() {}
          const arrowFunction = () => {};
          async function asyncFunction() {}
          const asyncArrow = async () => {};
        `
      };

      const metrics = await analyzer.analyzeComplexity(functionsCode);

      expect(metrics.functionCount).toBeGreaterThanOrEqual(2);
    });

    it('should detect classes correctly', async () => {
      const classesCode: CodeAnalysisContext = {
        filePath: 'classes.ts',
        language: 'typescript',
        content: `
          class TestClass {}
          interface TestInterface {}
          class AnotherClass extends TestClass {}
        `
      };

      const metrics = await analyzer.analyzeComplexity(classesCode);

      expect(metrics.classCount).toBeGreaterThanOrEqual(2);
    });

    it('should calculate nesting depth correctly', async () => {
      const nestedCode: CodeAnalysisContext = {
        filePath: 'nested.ts',
        language: 'typescript',
        content: `
          function nested() {
            if (true) {
              for (let i = 0; i < 10; i++) {
                if (i % 2 === 0) {
                  console.log(i);
                }
              }
            }
          }
        `
      };

      const metrics = await analyzer.analyzeComplexity(nestedCode);

      expect(metrics.nestingDepth).toBeGreaterThan(2);
    });
  });

  describe('factory functions', () => {
    it('should create analyzer with createComplexityAnalyzer', () => {
      const analyzer = createComplexityAnalyzer();
      expect(analyzer).toBeInstanceOf(ComplexityAnalyzer);
    });

    it('should create analyzer with custom config', () => {
      const config: Partial<ComplexityAuditConfig> = {
        baseTimeoutSeconds: 45
      };
      const analyzer = createComplexityAnalyzer(config);
      expect(analyzer).toBeInstanceOf(ComplexityAnalyzer);
    });
  });

  describe('validateComplexityMetrics', () => {
    it('should validate correct metrics', () => {
      const validMetrics: ComplexityMetrics = {
        cyclomaticComplexity: 5,
        cognitiveComplexity: 8,
        linesOfCode: 100,
        functionCount: 3,
        classCount: 1,
        nestingDepth: 2,
        dependencyCount: 5,
        halsteadComplexity: {
          distinctOperators: 10,
          distinctOperands: 15,
          totalOperators: 25,
          totalOperands: 35,
          vocabulary: 25,
          length: 60,
          calculatedLength: 55,
          volume: 300,
          difficulty: 5,
          effort: 1500
        },
        overallComplexity: 45
      };

      expect(validateComplexityMetrics(validMetrics)).toBe(true);
    });

    it('should reject invalid metrics', () => {
      const invalidMetrics: ComplexityMetrics = {
        cyclomaticComplexity: 0, // Invalid: should be >= 1
        cognitiveComplexity: 8,
        linesOfCode: 100,
        functionCount: 3,
        classCount: 1,
        nestingDepth: 2,
        dependencyCount: 5,
        halsteadComplexity: {
          distinctOperators: 10,
          distinctOperands: 15,
          totalOperators: 25,
          totalOperands: 35,
          vocabulary: 25,
          length: 60,
          calculatedLength: 55,
          volume: 300,
          difficulty: 5,
          effort: 1500
        },
        overallComplexity: 150 // Invalid: should be <= 100
      };

      expect(validateComplexityMetrics(invalidMetrics)).toBe(false);
    });
  });

  describe('timeout calculation', () => {
    it('should increase timeout for higher complexity', () => {
      const lowComplexityMetrics: ComplexityMetrics = {
        cyclomaticComplexity: 2,
        cognitiveComplexity: 3,
        linesOfCode: 20,
        functionCount: 1,
        classCount: 0,
        nestingDepth: 1,
        dependencyCount: 2,
        halsteadComplexity: {
          distinctOperators: 5,
          distinctOperands: 8,
          totalOperators: 10,
          totalOperands: 15,
          vocabulary: 13,
          length: 25,
          calculatedLength: 20,
          volume: 100,
          difficulty: 3,
          effort: 300
        },
        overallComplexity: 10
      };

      const highComplexityMetrics: ComplexityMetrics = {
        ...lowComplexityMetrics,
        overallComplexity: 90
      };

      const lowAdjustment = analyzer.adjustAuditDepth(lowComplexityMetrics, mockContext);
      const highAdjustment = analyzer.adjustAuditDepth(highComplexityMetrics, mockContext);

      expect(highAdjustment.timeoutSeconds).toBeGreaterThan(lowAdjustment.timeoutSeconds);
    });

    it('should respect maximum timeout', () => {
      const veryHighComplexityMetrics: ComplexityMetrics = {
        cyclomaticComplexity: 50,
        cognitiveComplexity: 80,
        linesOfCode: 1000,
        functionCount: 50,
        classCount: 10,
        nestingDepth: 10,
        dependencyCount: 100,
        halsteadComplexity: {
          distinctOperators: 50,
          distinctOperands: 100,
          totalOperators: 200,
          totalOperands: 400,
          vocabulary: 150,
          length: 600,
          calculatedLength: 550,
          volume: 5000,
          difficulty: 25,
          effort: 125000
        },
        overallComplexity: 100
      };

      const adjustment = analyzer.adjustAuditDepth(veryHighComplexityMetrics, mockContext);

      expect(adjustment.timeoutSeconds).toBeLessThanOrEqual(DEFAULT_COMPLEXITY_AUDIT_CONFIG.maxTimeoutSeconds);
    });
  });
});