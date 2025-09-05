# Implementation Plan

STATUS: Complete

- [x] 1. Set up core data types and interfaces

  - Create TypeScript interfaces for GAN audit types (GanReview, SessionConfig, SessionState)
  - Define enhanced response format that extends existing tool response
  - Add type definitions for audit requests, rubrics, and budgets
  - _Requirements: 1.1, 2.1, 5.1_

- [x] 2. Implement configuration parsing and validation

  - Create function to extract inline gan-config blocks from thought text using regex
  - Implement configuration validation with type checking and default value application
  - Add configuration sanitization (clamp threshold values, validate scope options)
  - Write unit tests for configuration parsing edge cases
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Create session management system

  - Implement SessionManager class with file-based persistence in .mcp-gan-state directory
  - Add methods for session creation, loading, updating, and cleanup
  - Implement unique session ID generation using hash of cwd + username + timestamp
  - Create session state validation and error recovery for corrupted files
  - Write unit tests for session lifecycle management
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Build repository context packer

  - Implement ContextPacker class with methods for different scope modes (diff, paths, workspace)
  - Add git integration functions (git diff, branch info, repo tree generation)
  - Create file relevance scoring algorithm for workspace scope
  - Implement context size management with truncation and snippet collection
  - Add error handling for git command failures and file access issues
  - Write unit tests for context building with mock git repositories
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Implement Codex CLI integration

  - Create CodexJudge class that executes Codex CLI commands using child_process.spawn
  - Implement audit prompt generation with structured rubric and context
  - Add JSON response parsing with greedy fallback for malformed responses
  - Implement error handling for Codex CLI failures and timeouts
  - Create mock Codex responses for testing
  - Write unit tests for Codex integration and error scenarios
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Create GAN auditor orchestration layer

  - Implement GanAuditor class that coordinates session management, context building, and judging
  - Add audit workflow logic (load session → build context → execute audit → persist results)
  - Implement audit result processing and verdict determination
  - Add integration between inline config parsing and session configuration
  - Write integration tests for complete audit workflow
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - ✅ Note: Refined fallback context wording and disabled Codex retries to prefer graceful fallback; see `src/auditor/gan-auditor.ts`.

- [x] 7. Extend SequentialThinkingServer with GAN integration

  - Modify processThought method to conditionally trigger GAN auditing
  - Implement response combination logic to merge standard and audit results
  - Add audit trigger detection (presence of code, diffs, or gan-config blocks)
  - Preserve all existing functionality and maintain backward compatibility
  - Update tool description to document GAN auditing capabilities
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Implement enhanced response formatting

  - Extend existing response format to include sessionId and gan fields
  - Ensure response structure maintains compatibility with existing clients
  - Add proper JSON serialization for all new data types
  - Implement response validation to ensure required fields are present
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.3_

- [x] 9. Add comprehensive error handling

  - Implement error categorization (config, codex, filesystem, session)
  - Add graceful degradation for non-critical failures
  - Create structured error responses with actionable suggestions
  - Add logging for debugging while maintaining existing console output format
  - Write error handling tests for all failure scenarios
  - _Requirements: 6.4, 7.5_
  - ✅ Note: Adjusted fallback summary text to match expectations; see `src/auditor/gan-auditor.ts`.

- [x] 10. Create utility functions and helpers

  - Implement file system utilities (safe file operations, directory creation)
  - Add string processing utilities (truncation, formatting, escaping)
  - Create git command wrappers with error handling
  - Implement JSON parsing utilities with fallback strategies
  - Add validation helpers for configuration and data types
  - _Requirements: 4.5, 7.3, 7.4_

- [x] 11. Write comprehensive test suite

  - Create unit tests for all new classes and functions
  - Add integration tests for complete audit workflows
  - Implement mock implementations for external dependencies (Codex, git, filesystem)
  - Create test fixtures with sample repositories and audit scenarios
  - Add performance tests for context building and session management
  - _Requirements: All requirements validation_

- [x] 12. Update package dependencies and build configuration
  - Add any new dependencies required for file operations and process spawning
  - Update TypeScript configuration if needed for new module structure
  - Ensure build process includes all new files and maintains existing output structure
  - Update package.json scripts if additional build steps are needed
  - _Requirements: 7.1_
