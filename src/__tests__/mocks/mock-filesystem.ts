/**
 * Mock filesystem utilities for testing
 */

import { vi } from 'vitest';

export interface MockFileSystem {
  files: Map<string, string>;
  directories: Set<string>;
  readFileSync: ReturnType<typeof vi.fn>;
  writeFileSync: ReturnType<typeof vi.fn>;
  existsSync: ReturnType<typeof vi.fn>;
  mkdirSync: ReturnType<typeof vi.fn>;
  readdirSync: ReturnType<typeof vi.fn>;
  statSync: ReturnType<typeof vi.fn>;
}

export function createMockFileSystem(): MockFileSystem {
  const files = new Map<string, string>();
  const directories = new Set<string>();

  const readFileSync = vi.fn((path: string) => {
    if (!files.has(path)) {
      const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
      (error as any).code = 'ENOENT';
      throw error;
    }
    return files.get(path);
  });

  const writeFileSync = vi.fn((path: string, content: string) => {
    files.set(path, content);
  });

  const existsSync = vi.fn((path: string) => {
    return files.has(path) || directories.has(path);
  });

  const mkdirSync = vi.fn((path: string, options?: any) => {
    directories.add(path);
  });

  const readdirSync = vi.fn((path: string) => {
    const entries: string[] = [];
    
    // Find files and directories under this path
    for (const filePath of files.keys()) {
      if (filePath.startsWith(path + '/')) {
        const relativePath = filePath.substring(path.length + 1);
        const firstSegment = relativePath.split('/')[0];
        if (!entries.includes(firstSegment)) {
          entries.push(firstSegment);
        }
      }
    }
    
    for (const dirPath of directories) {
      if (dirPath.startsWith(path + '/')) {
        const relativePath = dirPath.substring(path.length + 1);
        const firstSegment = relativePath.split('/')[0];
        if (!entries.includes(firstSegment)) {
          entries.push(firstSegment);
        }
      }
    }
    
    return entries;
  });

  const statSync = vi.fn((path: string) => {
    if (!files.has(path) && !directories.has(path)) {
      const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
      (error as any).code = 'ENOENT';
      throw error;
    }
    
    return {
      isFile: () => files.has(path),
      isDirectory: () => directories.has(path),
      size: files.has(path) ? files.get(path)!.length : 0,
      mtime: new Date(),
      ctime: new Date(),
      atime: new Date()
    };
  });

  return {
    files,
    directories,
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    statSync
  };
}

export function setupMockFileSystem(mockFs: MockFileSystem) {
  // Add some default files and directories
  mockFs.directories.add('/');
  mockFs.directories.add('/src');
  mockFs.directories.add('/test');
  
  mockFs.files.set('/package.json', JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    scripts: {
      test: 'vitest',
      build: 'tsc'
    }
  }, null, 2));
  
  mockFs.files.set('/src/index.ts', `
export class TestClass {
  constructor(private value: string) {}
  
  getValue(): string {
    return this.value;
  }
}
`);
  
  mockFs.files.set('/src/utils.ts', `
export function helper(input: string): string {
  return input.toUpperCase();
}
`);
  
  return mockFs;
}