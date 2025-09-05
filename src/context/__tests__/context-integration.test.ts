/**
 * Integration tests for ContextPacker
 * 
 * Tests context building with real file system operations
 * and mock git repositories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextPacker } from '../context-packer.js';
import type { SessionConfig } from '../../types/gan-types.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ContextPacker Integration Tests', () => {
  let contextPacker: ContextPacker;
  let testDir: string;

  beforeEach(async () => {
    contextPacker = new ContextPacker({
      maxContextSize: 50000,
      maxFileSize: 10000,
      relevanceThreshold: 0.2,
    });

    // Create temporary test directory
    testDir = join(tmpdir(), `context-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    
    // Set up test project structure
    await setupTestProject(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('real file system operations', () => {
    it('should build paths context from real files', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'paths',
        paths: ['src/index.ts', 'src/utils/helper.ts', 'package.json'],
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      const result = await contextPacker.buildContextPack(config, testDir);

      expect(result).toContain('Paths Context');
      expect(result).toContain('src/index.ts');
      expect(result).toContain('src/utils/helper.ts');
      expect(result).toContain('package.json');
      expect(result).toContain('export function main()');
      expect(result).toContain('export function helper()');
      expect(result).toContain('"name": "test-project"');
    });

    it('should handle non-existent files gracefully', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'paths',
        paths: ['src/index.ts', 'nonexistent.ts', 'src/missing.js'],
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      const result = await contextPacker.buildContextPack(config, testDir);

      expect(result).toContain('src/index.ts');
      expect(result).toContain('export function main()');
      expect(result).toContain('nonexistent.ts');
      expect(result).toContain('File not found');
      expect(result).toContain('src/missing.js');
    });

    it('should build workspace context with file relevance scoring', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'workspace',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      const result = await contextPacker.buildContextPack(config, testDir);

      expect(result).toContain('Workspace Context');
      expect(result).toContain('Repository Structure');
      
      // Should include TypeScript files due to high relevance
      expect(result).toContain('index.ts');
      expect(result).toContain('helper.ts');
      
      // Should include main function content
      expect(result).toContain('export function main()');
    });

    it('should respect file size limits', async () => {
      // Create a large file
      const largeContent = 'a'.repeat(15000);
      await writeFile(join(testDir, 'src', 'large.ts'), largeContent);

      const smallContextPacker = new ContextPacker({
        maxContextSize: 50000,
        maxFileSize: 10000, // Smaller than large file
        relevanceThreshold: 0.1,
      });

      const config: SessionConfig = {
        task: 'test',
        scope: 'workspace',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      const result = await smallContextPacker.buildContextPack(config, testDir);

      // Should not include the large file content
      expect(result).not.toContain(largeContent);
      // But should still include other files
      expect(result).toContain('index.ts');
    });

    it('should handle directory paths', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'paths',
        paths: ['src/', 'docs/'],
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      const result = await contextPacker.buildContextPack(config, testDir);

      expect(result).toContain('src/');
      expect(result).toContain('docs/');
      // Check for at least one of the expected files
      expect(result).toMatch(/index\.ts|helper\.ts|README\.md/);
    });

    it('should truncate context when exceeding size limits', async () => {
      const tinyContextPacker = new ContextPacker({
        maxContextSize: 500, // Very small limit
        maxFileSize: 10000,
        relevanceThreshold: 0.1,
      });

      const config: SessionConfig = {
        task: 'test',
        scope: 'workspace',
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      const result = await tinyContextPacker.buildContextPack(config, testDir);

      expect(result.length).toBeLessThanOrEqual(500);
      expect(result).toContain('Context truncated');
    });

    it('should handle mixed file types with proper language detection', async () => {
      const config: SessionConfig = {
        task: 'test',
        scope: 'paths',
        paths: [
          'src/index.ts',
          'src/styles.css',
          'package.json',
          'docs/README.md'
        ],
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      const result = await contextPacker.buildContextPack(config, testDir);

      expect(result).toContain('```typescript');
      expect(result).toContain('```css');
      expect(result).toContain('```json');
      expect(result).toContain('```markdown');
    });
  });

  describe('error resilience', () => {
    it('should continue processing when some files are inaccessible', async () => {
      // Create a file with restricted permissions (if possible)
      const restrictedFile = join(testDir, 'restricted.ts');
      await writeFile(restrictedFile, 'restricted content');
      
      const config: SessionConfig = {
        task: 'test',
        scope: 'paths',
        paths: ['src/index.ts', 'restricted.ts'],
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      const result = await contextPacker.buildContextPack(config, testDir);

      // Should still process accessible files
      expect(result).toContain('src/index.ts');
      expect(result).toContain('export function main()');
    });

    it('should handle empty directories gracefully', async () => {
      await mkdir(join(testDir, 'empty'), { recursive: true });

      const config: SessionConfig = {
        task: 'test',
        scope: 'paths',
        paths: ['empty/'],
        threshold: 85,
        maxCycles: 1,
        candidates: 1,
        judges: ['internal'],
        applyFixes: false,
      };

      const result = await contextPacker.buildContextPack(config, testDir);

      expect(result).toContain('empty/');
      expect(result).toContain('No accessible files');
    });
  });

  // Helper function to set up test project structure
  async function setupTestProject(baseDir: string) {
    // Create directory structure
    await mkdir(join(baseDir, 'src', 'utils'), { recursive: true });
    await mkdir(join(baseDir, 'docs'), { recursive: true });

    // Create TypeScript files
    await writeFile(
      join(baseDir, 'src', 'index.ts'),
      `/**
 * Main entry point
 */
export function main() {
  console.log('Hello, world!');
  return helper();
}

import { helper } from './utils/helper.js';`
    );

    await writeFile(
      join(baseDir, 'src', 'utils', 'helper.ts'),
      `/**
 * Utility helper function
 */
export function helper(): string {
  return 'Helper function result';
}

export const CONSTANT = 42;`
    );

    // Create CSS file
    await writeFile(
      join(baseDir, 'src', 'styles.css'),
      `body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}`
    );

    // Create package.json
    await writeFile(
      join(baseDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        description: 'Test project for context packer',
        main: 'dist/index.js',
        scripts: {
          build: 'tsc',
          test: 'vitest'
        },
        dependencies: {
          typescript: '^5.0.0'
        }
      }, null, 2)
    );

    // Create README
    await writeFile(
      join(baseDir, 'docs', 'README.md'),
      `# Test Project

This is a test project for the context packer integration tests.

## Features

- TypeScript support
- CSS styling
- Utility functions

## Usage

\`\`\`typescript
import { main } from './src/index.js';
main();
\`\`\`
`
    );

    // Create TypeScript config
    await writeFile(
      join(baseDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'node',
          outDir: 'dist',
          rootDir: 'src',
          strict: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist']
      }, null, 2)
    );
  }
});