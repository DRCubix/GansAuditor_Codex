/**
 * Tests for main GansAuditor_Codex index.ts module exports
 */

import { describe, it, expect } from 'vitest';
import * as mainModule from '../index.js';

describe('GansAuditor_Codex Main Module Exports', () => {
  it('should export configuration utilities', () => {
    expect(typeof mainModule.extractInlineConfig).toBe('function');
    expect(typeof mainModule.parseJsonWithFallback).toBe('function');
    expect(typeof mainModule.validateAndSanitizeConfig).toBe('function');
  });

  it('should export session management', () => {
    expect(typeof mainModule.SessionManager).toBe('function');
  });

  it('should export context packing', () => {
    expect(typeof mainModule.ContextPacker).toBe('function');
  });

  it('should export Codex integration', () => {
    expect(typeof mainModule.CodexJudge).toBe('function');
    expect(typeof mainModule.MockCodexJudge).toBe('function');
  });

  it('should export GansAuditor_Codex orchestration', () => {
    expect(typeof mainModule.GanAuditor).toBe('function');
    expect(typeof mainModule.createGanAuditor).toBe('function');
    expect(typeof mainModule.createGanAuditorWithComponents).toBe('function');
  });

  it('should export response builder utilities', () => {
    expect(typeof mainModule.createResponseBuilder).toBe('function');
    expect(typeof mainModule.ResponseBuilder).toBe('function');
  });

  it('should not have undefined exports', () => {
    const exports = Object.keys(mainModule);
    exports.forEach(exportName => {
      expect(mainModule[exportName as keyof typeof mainModule]).toBeDefined();
    });
  });
});