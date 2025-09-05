# Requirements Document

## Introduction

This feature implements a GAN-style auditor system that enhances the existing sequential thinking MCP server with automated code review and quality assessment capabilities. The system maintains state across editor-tool-editor loops, providing continuous feedback and improvement suggestions until code quality meets specified thresholds. The auditor integrates with the Codex CLI to perform headless code analysis and returns structured feedback including scores, edits, and unified diff suggestions.

## Requirements

### Requirement 1

**User Story:** As a developer using an MCP-enabled editor, I want the sequential thinking tool to automatically audit my code changes and provide feedback, so that I can iteratively improve code quality before finalizing changes.

#### Acceptance Criteria

1. WHEN I call the sequentialthinking tool with a code change THEN the system SHALL audit the change using a GAN-style judge
2. WHEN the audit is complete THEN the system SHALL return a structured response containing verdict (pass/revise/reject), scores, and actionable feedback
3. WHEN the code quality is below threshold THEN the system SHALL set nextThoughtNeeded to true and provide specific improvement suggestions
4. WHEN the code quality meets or exceeds threshold THEN the system SHALL set nextThoughtNeeded to false indicating completion

### Requirement 2

**User Story:** As a developer, I want to configure audit parameters through inline configuration blocks, so that I can customize the auditing behavior for different tasks and contexts.

#### Acceptance Criteria

1. WHEN I include a gan-config fenced block in my thought THEN the system SHALL parse and apply the configuration settings
2. WHEN no configuration is provided THEN the system SHALL use sensible default values
3. WHEN configuration includes task, scope, threshold, judges, maxCycles, or candidates THEN the system SHALL validate and apply these settings
4. IF configuration parsing fails THEN the system SHALL fall back to default configuration without error

### Requirement 3

**User Story:** As a developer, I want the auditor to maintain session state across multiple interactions, so that I can resume auditing sessions and track progress over time.

#### Acceptance Criteria

1. WHEN I provide a branchId parameter THEN the system SHALL use it as a session identifier
2. WHEN no branchId is provided THEN the system SHALL generate a unique session identifier
3. WHEN a session exists THEN the system SHALL load previous state and configuration
4. WHEN audit results are generated THEN the system SHALL persist session state to disk for future retrieval
5. WHEN I call the tool with the same session ID THEN the system SHALL resume from the previous state

### Requirement 4

**User Story:** As a developer, I want the auditor to analyze repository context relevant to my changes, so that the audit feedback is accurate and contextually appropriate.

#### Acceptance Criteria

1. WHEN scope is set to "diff" THEN the system SHALL include git diff context in the audit
2. WHEN scope is set to "paths" THEN the system SHALL include specified file paths in the context
3. WHEN scope is set to "workspace" THEN the system SHALL include relevant workspace files based on heuristics
4. WHEN building context THEN the system SHALL include repository metadata, file tree, and relevant code snippets
5. WHEN context exceeds size limits THEN the system SHALL truncate appropriately while preserving essential information

### Requirement 5

**User Story:** As a developer, I want detailed audit feedback with specific line-level comments and proposed fixes, so that I can understand exactly what needs to be improved and how.

#### Acceptance Criteria

1. WHEN audit is complete THEN the system SHALL provide overall score and dimensional scores (accuracy, completeness, clarity, actionability, human_likeness)
2. WHEN issues are identified THEN the system SHALL provide inline comments with specific file paths and line numbers
3. WHEN fixes are available THEN the system SHALL generate unified diff suggestions
4. WHEN providing feedback THEN the system SHALL include citations to relevant repository sections
5. WHEN multiple judge models are configured THEN the system SHALL aggregate scores and provide individual judge cards

### Requirement 6

**User Story:** As a developer, I want the tool to integrate seamlessly with existing sequential thinking workflows, so that I can use familiar interfaces and parameters.

#### Acceptance Criteria

1. WHEN calling the tool THEN the system SHALL maintain the existing "sequentialthinking" tool name and input schema
2. WHEN processing thoughts THEN the system SHALL support all existing parameters (thoughtNumber, totalThoughts, isRevision, etc.)
3. WHEN returning responses THEN the system SHALL extend the existing response format with GAN audit results
4. WHEN errors occur THEN the system SHALL return structured error responses compatible with existing error handling
5. WHEN logging is enabled THEN the system SHALL format thought output consistently with existing formatting

### Requirement 7

**User Story:** As a developer, I want the auditor to work with the Codex CLI for code analysis, so that I can leverage advanced AI models for comprehensive code review.

#### Acceptance Criteria

1. WHEN performing audits THEN the system SHALL execute Codex CLI commands in headless mode
2. WHEN Codex execution fails THEN the system SHALL handle errors gracefully and provide fallback responses
3. WHEN Codex returns results THEN the system SHALL parse JSON responses and validate structure
4. WHEN JSON parsing fails THEN the system SHALL attempt greedy parsing to extract valid results
5. WHEN Codex is unavailable THEN the system SHALL provide clear error messages indicating the dependency requirement