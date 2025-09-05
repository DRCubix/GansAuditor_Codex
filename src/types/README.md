# GansAuditor_Codex Type Definitions

This directory contains all TypeScript type definitions for the GansAuditor_Codex MCP server.

## Overview

The type system is organized into three main modules:

### 1. `gan-types.ts` - Core GansAuditor_Codex Types
Contains the fundamental data structures for GansAuditor_Codex auditing:
- `GanReview` - Complete audit results with scores and feedback
- `SessionConfig` - Configuration for audit behavior and scope
- `SessionState` - Persistent session state across interactions
- `AuditRequest` - Request structure for Codex CLI integration
- `ThoughtData` - Extended thought data with session support
- `EnhancedToolResponse` - Response format with GansAuditor_Codex audit results

### 2. `validation-types.ts` - Validation and Utility Types
Defines types for validation, parsing, and error handling:
- `ValidationResult<T>` - Generic validation result structure
- `ConfigParseResult` - Result of parsing inline configuration
- `ErrorContext` - Structured error information with context
- `TypeGuard<T>` - Type guard function signatures
- Various utility types for configuration management

### 3. `integration-types.ts` - Integration Interfaces
Provides interfaces for component integration and dependency injection:
- `IGanAuditor` - Main GansAuditor_Codex orchestration interface
- `ISessionManager` - Session state persistence interface
- `IContextPacker` - Repository context building interface
- `ICodexJudge` - Codex CLI integration interface
- Plugin and middleware interfaces for extensibility

## Usage

Import types from the main index:

```typescript
import type {
  GanReview,
  SessionConfig,
  EnhancedToolResponse,
  IGanAuditor,
  ValidationResult
} from './types/index.js';

// Import constants and default values
import {
  DEFAULT_SESSION_CONFIG,
  DEFAULT_AUDIT_RUBRIC,
  CONFIG_CONSTRAINTS
} from './types/index.js';
```

## Key Design Principles

1. **Backward Compatibility**: All types extend existing structures without breaking changes
2. **Type Safety**: Comprehensive type definitions with strict validation
3. **Modularity**: Clear separation of concerns across type modules
4. **Extensibility**: Plugin and middleware interfaces for future enhancements
5. **Error Handling**: Structured error types with context and recovery information

## Requirements Mapping

- **Requirement 1.1**: `GanReview`, `EnhancedToolResponse` - Audit results and response format
- **Requirement 2.1**: `SessionConfig`, `InlineConfig` - Configurable audit parameters
- **Requirement 5.1**: `ReviewDetails`, `InlineComment` - Detailed feedback structures
- **Requirement 6.3**: `EnhancedToolResponse` - Extended response format compatibility
- **Requirement 7.1-7.5**: `AuditRequest`, `ICodexJudge` - Codex CLI integration types

## Default Values

The module exports several default configurations:

- `DEFAULT_SESSION_CONFIG`: Standard audit configuration
- `DEFAULT_AUDIT_RUBRIC`: Standard code quality evaluation dimensions
- `CONFIG_CONSTRAINTS`: Validation limits for configuration values

## Type Validation

All major data structures include corresponding validation types and interfaces to ensure runtime type safety and proper error handling.