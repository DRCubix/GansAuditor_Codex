# Technology Stack & Build System

## Core Technologies

- **Runtime**: Node.js 18+ (ESM modules)
- **Language**: TypeScript 5.3+ with strict mode
- **Build System**: TypeScript compiler (tsc)
- **Testing**: Vitest with Node.js environment
- **Package Manager**: npm with package-lock.json
- **Module System**: ES Modules (NodeNext resolution)

## Key Dependencies

- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **chalk**: Terminal styling and colored output
- **yargs**: Command-line argument parsing

## Development Dependencies

- **@types/node**: Node.js type definitions
- **@types/yargs**: Yargs type definitions
- **shx**: Cross-platform shell commands
- **vitest**: Testing framework with coverage support

## Build Configuration

### TypeScript Configuration
- Target: ES2022
- Module: NodeNext with NodeNext resolution
- Strict mode enabled with comprehensive type checking
- Source maps and declarations generated
- Tests excluded from compilation

### Build Scripts
```bash
# Clean build artifacts
npm run clean

# Full rebuild
npm run rebuild

# Build with executable permissions
npm run build

# Development with watch mode
npm run watch
```

## Testing

### Test Framework: Vitest
- **Environment**: Node.js
- **Timeout**: 30 seconds for integration tests
- **Coverage**: Built-in coverage reporting
- **Globals**: Enabled for test utilities

### Test Commands
```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm run test:coverage
```

### Test Structure
- Unit tests: `src/**/*.test.ts`
- Integration tests: `src/**/__tests__/**/*.ts`
- Mocks: `src/__tests__/mocks/`
- Fixtures: `src/__tests__/fixtures/`

## Configuration Validation

```bash
# Validate configuration files
npm run validate-config

# JSON output for CI
npm run validate-config:json
```

## Deployment

### Docker Build
```bash
# Multi-stage build with Alpine Linux
docker build -t mcp/gansauditor-codex -f Dockerfile .
```

### Production Environment
- Node.js 22 Alpine base image
- Production dependencies only
- Optimized for container deployment

## Environment Variables

### Core Settings
- `ENABLE_GAN_AUDITING`: Enable/disable auditing features
- `ENABLE_SYNCHRONOUS_AUDIT`: Enable synchronous workflow
- `DISABLE_THOUGHT_LOGGING`: Control console output

### Performance Tuning
- `AUDIT_TIMEOUT_SECONDS`: Audit operation timeout
- `MAX_CONCURRENT_AUDITS`: Concurrent audit limit
- `MAX_CONCURRENT_SESSIONS`: Session limit

## Code Quality Standards

- **ESM Modules**: All imports use .js extensions
- **Strict TypeScript**: No any types, comprehensive interfaces
- **Error Handling**: Structured error types with context
- **Async/Await**: Consistent async patterns
- **Modular Architecture**: Clear separation of concerns