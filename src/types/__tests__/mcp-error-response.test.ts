/**
 * Tests for MCP Error Response System
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5 - Structured error responses with diagnostic information
 */

import { describe, it, expect } from 'vitest';
import {
  McpErrorResponseBuilder,
  createValidationError,
  createCodexError,
  createConfigurationError,
  createTimeoutError,
  createSessionError,
  createInternalError,
  createErrorResponseFromError,
  toMcpToolResponse,
} from '../mcp-error-response.js';

describe('McpErrorResponseBuilder', () => {
  it('should build a complete error response', () => {
    const response = new McpErrorResponseBuilder()
      .category('codex')
      .severity('critical')
      .message('Codex CLI not found')
      .details('The codex executable could not be located in PATH')
      .suggestions(['Install Codex CLI', 'Check PATH configuration'])
      .documentation(['https://docs.example.com/codex'])
      .context({ executable: 'codex', path: '/usr/bin' })
      .errorCode('CODEX_NOT_FOUND')
      .requestId('req-123')
      .status(503)
      .isRecoverable(false)
      .retry(false)
      .build();

    expect(response.isError).toBe(true);
    expect(response.error).toBe('Codex CLI not found');
    expect(response.diagnostic.category).toBe('codex');
    expect(response.diagnostic.severity).toBe('critical');
    expect(response.diagnostic.suggestions).toEqual(['Install Codex CLI', 'Check PATH configuration']);
    expect(response.diagnostic.documentationLinks).toEqual(['https://docs.example.com/codex']);
    expect(response.diagnostic.context).toEqual({ executable: 'codex', path: '/usr/bin' });
    expect(response.diagnostic.errorCode).toBe('CODEX_NOT_FOUND');
    expect(response.diagnostic.requestId).toBe('req-123');
    expect(response.statusCode).toBe(503);
    expect(response.recoverable).toBe(false);
    expect(response.retryInfo?.canRetry).toBe(false);
  });

  it('should provide defaults for missing fields', () => {
    const response = new McpErrorResponseBuilder()
      .message('Test error')
      .build();

    expect(response.diagnostic.category).toBe('unknown');
    expect(response.diagnostic.severity).toBe('error');
    expect(response.diagnostic.suggestions).toEqual(['Contact support for assistance']);
    expect(response.statusCode).toBe(500);
    expect(response.recoverable).toBe(false);
    expect(response.diagnostic.timestamp).toBeDefined();
  });
});

describe('Error Factory Functions', () => {
  it('should create validation error', () => {
    const error = createValidationError(
      'Invalid input',
      'Parameter must be a string',
      { parameter: 'test' }
    );

    expect(error.diagnostic.category).toBe('validation');
    expect(error.diagnostic.severity).toBe('error');
    expect(error.statusCode).toBe(400);
    expect(error.recoverable).toBe(true);
    expect(error.diagnostic.context).toEqual({ parameter: 'test' });
  });

  it('should create Codex error', () => {
    const error = createCodexError(
      'Codex CLI failed',
      'Exit code 1',
      { command: 'codex audit' }
    );

    expect(error.diagnostic.category).toBe('codex');
    expect(error.diagnostic.severity).toBe('critical');
    expect(error.statusCode).toBe(503);
    expect(error.recoverable).toBe(false);
    expect(error.diagnostic.suggestions).toContain('Verify Codex CLI is installed and accessible in PATH');
  });

  it('should create configuration error', () => {
    const error = createConfigurationError(
      'Missing environment variable',
      'CODEX_EXECUTABLE not set',
      { variable: 'CODEX_EXECUTABLE' }
    );

    expect(error.diagnostic.category).toBe('configuration');
    expect(error.diagnostic.severity).toBe('critical');
    expect(error.statusCode).toBe(500);
    expect(error.recoverable).toBe(false);
  });

  it('should create timeout error', () => {
    const error = createTimeoutError('audit', 30000, { sessionId: 'test-123' });

    expect(error.diagnostic.category).toBe('timeout');
    expect(error.diagnostic.severity).toBe('error');
    expect(error.statusCode).toBe(408);
    expect(error.recoverable).toBe(true);
    expect(error.retryInfo?.canRetry).toBe(true);
    expect(error.retryInfo?.retryAfterMs).toBe(5000);
    expect(error.retryInfo?.maxRetries).toBe(2);
  });

  it('should create session error', () => {
    const error = createSessionError('Session not found', 'session-123');

    expect(error.diagnostic.category).toBe('session');
    expect(error.diagnostic.severity).toBe('error');
    expect(error.statusCode).toBe(422);
    expect(error.recoverable).toBe(true);
    expect(error.diagnostic.context?.sessionId).toBe('session-123');
  });

  it('should create internal error', () => {
    const originalError = new Error('Database connection failed');
    const error = createInternalError('Internal server error', originalError);

    expect(error.diagnostic.category).toBe('internal');
    expect(error.diagnostic.severity).toBe('critical');
    expect(error.statusCode).toBe(500);
    expect(error.recoverable).toBe(false);
    expect(error.diagnostic.details).toBe('Database connection failed');
    expect(error.diagnostic.context?.errorType).toBe('Error');
  });
});

describe('createErrorResponseFromError', () => {
  it('should detect Codex errors', () => {
    const error = new Error('Codex executable not found');
    const response = createErrorResponseFromError(error);

    expect(response.diagnostic.category).toBe('codex');
    expect(response.diagnostic.severity).toBe('critical');
  });

  it('should detect timeout errors', () => {
    const error = new Error('Operation timed out after 30000ms');
    const response = createErrorResponseFromError(error);

    expect(response.diagnostic.category).toBe('timeout');
    expect(response.diagnostic.severity).toBe('error');
  });

  it('should detect session errors', () => {
    const error = new Error('Session state is corrupted');
    const response = createErrorResponseFromError(error);

    expect(response.diagnostic.category).toBe('session');
    expect(response.diagnostic.severity).toBe('error');
  });

  it('should detect validation errors', () => {
    const error = new Error('Invalid parameter format');
    const response = createErrorResponseFromError(error);

    expect(response.diagnostic.category).toBe('validation');
    expect(response.diagnostic.severity).toBe('error');
  });

  it('should detect configuration errors', () => {
    const error = new Error('Environment variable not set');
    const response = createErrorResponseFromError(error);

    expect(response.diagnostic.category).toBe('configuration');
    expect(response.diagnostic.severity).toBe('critical');
  });

  it('should default to internal error for unknown errors', () => {
    const error = new Error('Something went wrong');
    const response = createErrorResponseFromError(error);

    expect(response.diagnostic.category).toBe('internal');
    expect(response.diagnostic.severity).toBe('critical');
  });

  it('should handle non-Error objects', () => {
    const response = createErrorResponseFromError('String error');

    expect(response.diagnostic.category).toBe('internal');
    expect(response.diagnostic.message).toBe('An unknown error occurred');
    expect(response.diagnostic.context?.originalError).toBe('String error');
  });
});

describe('toMcpToolResponse', () => {
  it('should convert error response to MCP tool response format', () => {
    const errorResponse = createValidationError('Test error');
    const toolResponse = toMcpToolResponse(errorResponse);

    expect(toolResponse.isError).toBe(true);
    expect(toolResponse.content).toHaveLength(1);
    expect(toolResponse.content[0].type).toBe('text');
    
    const parsedContent = JSON.parse(toolResponse.content[0].text);
    expect(parsedContent.isError).toBe(true);
    expect(parsedContent.error).toBe('Test error');
    expect(parsedContent.diagnostic).toBeDefined();
  });
});