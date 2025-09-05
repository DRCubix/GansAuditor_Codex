/**
 * Mock git utilities for testing
 */

import { vi } from 'vitest';

export interface MockGitRepository {
  branch: string;
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: Date;
  }>;
  stagedFiles: string[];
  modifiedFiles: string[];
  untrackedFiles: string[];
  diff: string;
}

export function createMockGitRepository(): MockGitRepository {
  return {
    branch: 'main',
    commits: [
      {
        hash: 'abc123',
        message: 'Initial commit',
        author: 'Test User <test@example.com>',
        date: new Date('2024-01-01')
      },
      {
        hash: 'def456',
        message: 'Add feature implementation',
        author: 'Test User <test@example.com>',
        date: new Date('2024-01-02')
      }
    ],
    stagedFiles: ['src/new-feature.ts'],
    modifiedFiles: ['src/index.ts', 'README.md'],
    untrackedFiles: ['temp.log'],
    diff: `diff --git a/src/index.ts b/src/index.ts
index 1234567..abcdefg 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,6 @@
 export class TestClass {
+  private newProperty: string;
+  
   constructor(private value: string) {
+    this.newProperty = 'default';
   }
`
  };
}

export function createMockGitUtils(mockRepo: MockGitRepository) {
  const execSync = vi.fn((command: string) => {
    if (command.includes('git status --porcelain')) {
      const output: string[] = [];
      mockRepo.stagedFiles.forEach(file => output.push(`A  ${file}`));
      mockRepo.modifiedFiles.forEach(file => output.push(` M ${file}`));
      mockRepo.untrackedFiles.forEach(file => output.push(`?? ${file}`));
      return output.join('\n');
    }
    
    if (command.includes('git diff')) {
      return mockRepo.diff;
    }
    
    if (command.includes('git log')) {
      return mockRepo.commits.map(commit => 
        `commit ${commit.hash}\nAuthor: ${commit.author}\nDate: ${commit.date.toISOString()}\n\n    ${commit.message}\n`
      ).join('\n');
    }
    
    if (command.includes('git branch --show-current')) {
      return mockRepo.branch;
    }
    
    if (command.includes('git rev-parse --show-toplevel')) {
      return '/mock/repo/path';
    }
    
    if (command.includes('git ls-files')) {
      return ['src/index.ts', 'src/utils.ts', 'package.json', 'README.md'].join('\n');
    }
    
    return '';
  });

  const isGitRepository = vi.fn(() => true);
  
  const getRepoInfo = vi.fn(() => ({
    branch: mockRepo.branch,
    commit: mockRepo.commits[0].hash,
    author: mockRepo.commits[0].author,
    message: mockRepo.commits[0].message,
    stagedFiles: mockRepo.stagedFiles,
    modifiedFiles: mockRepo.modifiedFiles,
    untrackedFiles: mockRepo.untrackedFiles
  }));
  
  const getDiff = vi.fn(() => ({
    diff: mockRepo.diff,
    stats: {
      files: mockRepo.modifiedFiles.length,
      insertions: 3,
      deletions: 0
    }
  }));
  
  const getFileTree = vi.fn(() => `
src/
├── index.ts
└── utils.ts
package.json
README.md
`);

  return {
    execSync,
    isGitRepository,
    getRepoInfo,
    getDiff,
    getFileTree
  };
}