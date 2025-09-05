# Project Structure & Organization

## Root Structure

```
├── index.ts                    # Main MCP server entry point
├── src/                        # Source code modules
├── dist/                       # Compiled JavaScript output
├── docs/                       # Documentation
├── Docs/                       # Additional guides
├── config/                     # Environment configurations
├── scripts/                    # Build and validation scripts
├── logs/                       # Runtime logs
└── .*-mcp-gan-state/          # Session state directories
```

## Source Code Organization (`src/`)

### Core Modules

- **`auditor/`**: GAN-style auditing engine and orchestration
  - `gan-auditor.ts`: Main auditor orchestration
  - `synchronous-audit-engine.ts`: Synchronous workflow engine
  - `completion-evaluator.ts`: Completion criteria evaluation
  - `loop-detector.ts`: Stagnation and loop detection
  - `audit-cache.ts`: Audit result caching
  - `progress-tracker.ts`: Audit progress tracking
  - `audit-queue.ts`: Audit job queue management

- **`session/`**: Session state management
  - `session-manager.ts`: Basic session operations
  - `synchronous-session-manager.ts`: Enhanced session management
  - `memory-efficient-session-manager.ts`: Optimized memory usage

- **`types/`**: TypeScript type definitions
  - `gan-types.ts`: Core GAN auditing types
  - `validation-types.ts`: Validation and utility types
  - `integration-types.ts`: Component integration interfaces
  - `response-types.ts`: Response formatting types
  - `synchronous-response-types.ts`: Synchronous workflow types
  - `enhanced-response-builder.ts`: Advanced response building

- **`config/`**: Configuration management
  - `config-parser.ts`: Configuration parsing utilities
  - `synchronous-config.ts`: Synchronous mode configuration

- **`context/`**: Repository context building
  - `context-packer.ts`: Repository analysis and context creation

- **`codex/`**: Codex CLI integration
  - `codex-judge.ts`: Codex CLI interface
  - `mock-codex-judge.ts`: Mock implementation for testing

- **`utils/`**: Shared utilities
  - `error-handler.ts`: Error handling utilities
  - `file-utils.ts`: File system operations
  - `git-utils.ts`: Git repository utilities
  - `json-utils.ts`: JSON parsing and validation
  - `logger.ts`: Logging utilities
  - `string-utils.ts`: String manipulation
  - `validation-utils.ts`: Validation helpers

- **`monitoring/`**: System monitoring and observability
  - `audit-logger.ts`: Audit-specific logging
  - `debug-tools.ts`: Debugging utilities
  - `health-checker.ts`: System health monitoring
  - `metrics-collector.ts`: Performance metrics

## Test Structure

### Test Organization
- **Unit Tests**: `src/**/*.test.ts` - Component-specific tests
- **Integration Tests**: `src/**/__tests__/**/*.ts` - Cross-component tests
- **Mocks**: `src/__tests__/mocks/` - Test doubles and stubs
- **Fixtures**: `src/__tests__/fixtures/` - Test data and scenarios

### Test Categories
- **Functional**: Core feature testing
- **Integration**: Component interaction testing
- **Performance**: Speed and memory testing
- **Error Handling**: Failure scenario testing

## Configuration Files

### Build & Development
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript compilation settings
- `vitest.config.ts`: Test framework configuration
- `Dockerfile`: Container build instructions

### Runtime Configuration
- `config/development.env`: Development environment settings
- `config/production.env`: Production environment settings
- `.env.example`: Environment variable template
- `mcp-config-example.json`: MCP client configuration example

## Documentation Structure

### Primary Documentation (`docs/`)
- `CONFIGURATION_QUICK_START.md`: Essential setup guide
- `SYNCHRONOUS_AUDIT_CONFIGURATION.md`: Synchronous mode config
- `SYNCHRONOUS_AUDIT_MIGRATION_GUIDE.md`: Migration instructions
- `SYNCHRONOUS_WORKFLOW_EXAMPLES.md`: Usage examples
- `SYNCHRONOUS_WORKFLOW_TROUBLESHOOTING.md`: Problem resolution
- `CODEX_CONTEXT_MANAGEMENT.md`: Context handling guide
- `COMPLETION_CRITERIA_AND_KILL_SWITCHES.md`: Termination logic

### Guides (`Docs/`)
- `Starter-Guides/GansAuditorCodex.md`: Getting started guide
- `AGENT-API.md`: API reference
- `AGENT-RUNBOOK.md`: Operational procedures
- `AGENT.md`: Agent integration guide

### Root Documentation
- `README.md`: Project overview and setup
- `MCP-INTEGRATION-GUIDE.md`: MCP client integration
- `CHANGELOG.md`: Version history
- Various implementation summaries

## State Management

### Session State Directories
- `.mcp-gan-state/`: Default session storage
- `.test-*-mcp-gan-state*/`: Test-specific state directories
- Session files: `{sessionId}.json` format

## Naming Conventions

### Files and Directories
- **kebab-case**: File and directory names
- **PascalCase**: Class names and interfaces
- **camelCase**: Function and variable names
- **SCREAMING_SNAKE_CASE**: Constants and environment variables

### Module Exports
- Default exports for main classes
- Named exports for utilities and types
- Barrel exports in `index.ts` files
- `.js` extensions in import statements (ESM requirement)

## Architecture Patterns

### Dependency Injection
- Interface-based component design
- Factory functions for component creation
- Configuration-driven initialization

### Error Handling
- Structured error types with context
- Graceful degradation patterns
- Comprehensive error logging

### Async Patterns
- Promise-based APIs throughout
- Proper error propagation
- Timeout and cancellation support

### State Management
- Immutable state updates
- Session-based persistence
- Memory-efficient cleanup