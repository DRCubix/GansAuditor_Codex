/**
 * Test fixtures for sample repositories and audit scenarios
 */

import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

export interface TestRepository {
  name: string;
  description: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  expectedIssues?: string[];
  expectedScore?: number;
}

export const sampleRepositories: TestRepository[] = [
  {
    name: 'simple-typescript-project',
    description: 'A simple TypeScript project with basic structure',
    files: [
      {
        path: 'src/index.ts',
        content: `/**
 * Main entry point for the application
 */

export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
}

export default Calculator;`
      },
      {
        path: 'src/utils.ts',
        content: `/**
 * Utility functions
 */

export function isEven(num: number): boolean {
  return num % 2 === 0;
}

export function isOdd(num: number): boolean {
  return !isEven(num);
}

export function factorial(n: number): number {
  if (n < 0) {
    throw new Error('Factorial is not defined for negative numbers');
  }
  if (n === 0 || n === 1) {
    return 1;
  }
  return n * factorial(n - 1);
}`
      },
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'simple-calculator',
          version: '1.0.0',
          description: 'A simple calculator library',
          main: 'dist/index.js',
          scripts: {
            build: 'tsc',
            test: 'jest'
          },
          devDependencies: {
            typescript: '^4.0.0',
            jest: '^27.0.0'
          }
        }, null, 2)
      }
    ],
    expectedScore: 85
  },
  
  {
    name: 'problematic-code-project',
    description: 'A project with various code quality issues',
    files: [
      {
        path: 'src/bad-code.ts',
        content: `// This file has intentional issues for testing

var x = 1; // Should use const/let
var y = 2;

function badFunction(a,b,c) { // No types, poor formatting
return a+b+c; // No spaces around operators
}

class BadClass {
constructor(name) { // No access modifier, no types
this.name = name;
}

getName() { // No return type
return this.name;
}

// Very long method with no documentation
processData(data) {
let result = [];
for(let i=0;i<data.length;i++) {
if(data[i] && data[i].value && data[i].value > 0 && data[i].status === 'active' && data[i].type !== 'disabled') {
result.push({id: data[i].id, value: data[i].value * 2, processed: true});
}
}
return result;
}
}`
      },
      {
        path: 'src/security-issues.ts',
        content: `// Security and best practice violations

import * as fs from 'fs';

export class FileProcessor {
  // Unsafe file operations
  readFile(filename: string) {
    return fs.readFileSync(filename, 'utf8'); // Synchronous operation
  }

  // SQL injection vulnerability pattern
  buildQuery(userInput: string) {
    return \`SELECT * FROM users WHERE name = '\${userInput}'\`; // Direct string interpolation
  }

  // Hardcoded credentials
  private apiKey = 'sk-1234567890abcdef'; // Hardcoded secret
  private dbPassword = 'admin123'; // Another hardcoded secret

  // Unsafe eval usage
  executeCode(code: string) {
    return eval(code); // Direct eval usage
  }
}`
      }
    ],
    expectedIssues: [
      'Use of var instead of const/let',
      'Missing type annotations',
      'Poor code formatting',
      'Synchronous file operations',
      'Hardcoded credentials',
      'SQL injection vulnerability',
      'Use of eval'
    ],
    expectedScore: 35
  },

  {
    name: 'react-component-project',
    description: 'A React project with components',
    files: [
      {
        path: 'src/components/Button.tsx',
        content: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  size = 'medium'
}) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger'
  };
  const sizeClasses = {
    small: 'btn-sm',
    medium: 'btn-md',
    large: 'btn-lg'
  };

  const className = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled ? 'btn-disabled' : ''
  ].filter(Boolean).join(' ');

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
};`
      },
      {
        path: 'src/components/Modal.tsx',
        content: `import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};`
      }
    ],
    expectedScore: 90
  }
];

export const auditScenarios = [
  {
    name: 'syntax-error-scenario',
    description: 'Code with syntax errors that should be caught',
    code: `
function brokenFunction() {
  const obj = {
    prop1: 'value1',
    prop2: 'value2'
    // Missing comma and closing brace
  return obj;
}
`,
    expectedVerdict: 'reject' as const,
    expectedIssues: ['Syntax error', 'Missing closing brace']
  },
  
  {
    name: 'style-violation-scenario',
    description: 'Code with style violations but no functional issues',
    code: `
function calculate(x,y) {
var result=x+y;
return result;
}
`,
    expectedVerdict: 'revise' as const,
    expectedIssues: ['Missing spaces', 'Use const/let instead of var', 'Missing type annotations']
  },
  
  {
    name: 'high-quality-scenario',
    description: 'Well-written code that should pass audit',
    code: `
/**
 * Calculates the sum of two numbers
 * @param x - First number
 * @param y - Second number
 * @returns The sum of x and y
 */
function calculate(x: number, y: number): number {
  const result = x + y;
  return result;
}
`,
    expectedVerdict: 'pass' as const,
    expectedScore: 95
  }
];

/**
 * Creates a test repository in the specified directory
 */
export function createTestRepository(baseDir: string, repo: TestRepository): string {
  const repoPath = join(baseDir, repo.name);
  mkdirSync(repoPath, { recursive: true });
  
  repo.files.forEach(file => {
    const filePath = join(repoPath, file.path);
    const fileDir = join(filePath, '..');
    mkdirSync(fileDir, { recursive: true });
    writeFileSync(filePath, file.content);
  });
  
  return repoPath;
}

/**
 * Creates all sample repositories in the specified directory
 */
export function createAllTestRepositories(baseDir: string): string[] {
  return sampleRepositories.map(repo => createTestRepository(baseDir, repo));
}