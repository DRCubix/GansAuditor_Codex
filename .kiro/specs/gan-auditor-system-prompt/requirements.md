# GAN Auditor System Prompt Requirements

## Introduction

This feature implements a comprehensive system prompt for the GansAuditor_Codex MCP server that manages the adversarial code auditing process. The system prompt will guide the GAN auditor to perform thorough, iterative code reviews with structured feedback, completion criteria, and intelligent termination conditions. The prompt integrates with the existing synchronous audit workflow, session management, and Codex CLI integration to provide a complete adversarial auditing experience.

## Requirements

### Requirement 1: Adversarial Audit Identity and Role Definition

**User Story:** As a GAN auditor system, I want a clear identity and role definition that establishes my adversarial nature and audit responsibilities, so that I can provide consistent, thorough code reviews.

#### Acceptance Criteria

1. WHEN the system prompt is activated THEN it SHALL establish the auditor as "Kilo Code" - the adversarial auditor
2. WHEN defining the role THEN it SHALL specify validation of completed work without modifying product code
3. WHEN describing the goal THEN it SHALL emphasize GAN-style improvement through iterative feedback loops
4. WHEN outlining scope THEN it SHALL clarify that the auditor validates, tests, and reports with fixes but does not change application code
5. WHEN establishing authority THEN it SHALL treat Spec and Steering documents as ground truth

### Requirement 2: Comprehensive Audit Workflow Implementation

**User Story:** As a GAN auditor, I want a structured audit workflow that covers all aspects of code quality assessment, so that I can provide thorough and consistent evaluations.

#### Acceptance Criteria

1. WHEN starting an audit THEN the system SHALL restate task goals, acceptance criteria, and constraints from Spec
2. WHEN establishing reproduction THEN the system SHALL create deterministic repro steps using narrowest commands possible
3. WHEN performing static checks THEN the system SHALL run lint/format/type-check and scan for code smells per Steering
4. WHEN testing THEN the system SHALL run existing tests and add focused tests for missing coverage
5. WHEN performing dynamic checks THEN the system SHALL conduct runtime validation, boundary testing, and security checks
6. WHEN checking conformance THEN the system SHALL verify naming/structure/library usage per Steering guidelines
7. WHEN ensuring traceability THEN the system SHALL map changed artifacts to Spec requirements and mark unmet ACs
8. WHEN providing verdict THEN the system SHALL score and determine ship/no-ship with concrete evidence

### Requirement 3: Multi-Dimensional Quality Assessment

**User Story:** As a GAN auditor, I want to evaluate code across multiple quality dimensions with weighted scoring, so that I can provide comprehensive quality assessments.

#### Acceptance Criteria

1. WHEN scoring code THEN the system SHALL evaluate Correctness & Completeness (30% weight)
2. WHEN assessing testing THEN the system SHALL evaluate Tests coverage and quality (20% weight)
3. WHEN reviewing style THEN the system SHALL evaluate Style & Conventions adherence (15% weight)
4. WHEN checking security THEN the system SHALL evaluate Security practices and vulnerabilities (15% weight)
5. WHEN analyzing performance THEN the system SHALL evaluate Performance considerations (10% weight)
6. WHEN reviewing documentation THEN the system SHALL evaluate Docs & Traceability (10% weight)
7. WHEN calculating overall score THEN the system SHALL use weighted average of dimensional scores (0-100 scale)

### Requirement 4: Intelligent Completion Criteria and Kill Switches

**User Story:** As a GAN auditor, I want intelligent completion criteria and automatic termination conditions, so that I can efficiently guide iterative improvement without endless loops.

#### Acceptance Criteria

1. WHEN score reaches 95% at 10 loops THEN the system SHALL indicate completion with "pass" verdict
2. WHEN score reaches 90% at 15 loops THEN the system SHALL indicate completion with "pass" verdict
3. WHEN score reaches 85% at 20 loops THEN the system SHALL indicate completion with "pass" verdict
4. WHEN 25 loops are reached THEN the system SHALL terminate with failure analysis and critical issues report
5. WHEN stagnation is detected after 10 loops THEN the system SHALL report loop detection and provide alternative approaches
6. WHEN completion criteria met THEN the system SHALL set nextThoughtNeeded to false
7. WHEN kill switch triggered THEN the system SHALL provide termination reason and final assessment

### Requirement 5: Structured Output and Evidence-Based Feedback

**User Story:** As a GAN auditor, I want to provide structured, evidence-based feedback with concrete examples and actionable recommendations, so that developers can efficiently address identified issues.

#### Acceptance Criteria

1. WHEN providing executive verdict THEN the system SHALL include Ship/No-ship decision with score and 3-6 bullet summary
2. WHEN documenting evidence THEN the system SHALL provide table with Issue | Severity | Location | Proof | Fix Summary
3. WHEN proposing fixes THEN the system SHALL provide unified diffs for specific, isolated changes
4. WHEN enabling reproduction THEN the system SHALL provide exact commands to reproduce, test, and verify fixes
5. WHEN ensuring traceability THEN the system SHALL provide matrix of ACs to tests/files with unmet ACs noted
6. WHEN creating follow-ups THEN the system SHALL provide ordered, tightly scoped TODO list for worker
7. WHEN formatting output THEN the system SHALL hide tool syntax and sanitize secrets/PII

### Requirement 6: Session Management and Context Awareness

**User Story:** As a GAN auditor, I want to maintain context across audit sessions and integrate with the existing session management system, so that I can provide contextual feedback based on audit history.

#### Acceptance Criteria

1. WHEN receiving branchId THEN the system SHALL use it for session continuity with previous audit results
2. WHEN analyzing progress THEN the system SHALL consider previous iterations and score progression
3. WHEN detecting patterns THEN the system SHALL identify repeated issues and stagnation across sessions
4. WHEN providing feedback THEN the system SHALL reference previous audit results and improvement trends
5. WHEN managing context THEN the system SHALL integrate with Codex context windows for continuity
6. WHEN persisting state THEN the system SHALL update session state with audit results and progress metrics

### Requirement 7: Integration with Existing Architecture

**User Story:** As a GAN auditor, I want to seamlessly integrate with the existing GansAuditor_Codex architecture and tools, so that I can leverage existing capabilities while providing enhanced audit functionality.

#### Acceptance Criteria

1. WHEN integrating with Codex CLI THEN the system SHALL use existing CodexJudge interface for audit execution
2. WHEN managing sessions THEN the system SHALL use existing SessionManager for state persistence
3. WHEN building context THEN the system SHALL use existing ContextPacker for repository analysis
4. WHEN handling errors THEN the system SHALL use existing error handling patterns and fallback mechanisms
5. WHEN logging activities THEN the system SHALL use existing logging infrastructure with appropriate levels
6. WHEN responding to requests THEN the system SHALL maintain compatibility with existing response formats

### Requirement 8: Adaptive Feedback and Learning

**User Story:** As a GAN auditor, I want to adapt my feedback based on code complexity, project context, and developer patterns, so that I can provide increasingly relevant and effective guidance.

#### Acceptance Criteria

1. WHEN analyzing code complexity THEN the system SHALL adjust audit depth and focus areas accordingly
2. WHEN reviewing project context THEN the system SHALL consider project-specific patterns and conventions
3. WHEN detecting developer patterns THEN the system SHALL adapt feedback style and technical depth
4. WHEN providing suggestions THEN the system SHALL prioritize improvements based on project impact and feasibility
5. WHEN learning from iterations THEN the system SHALL refine audit criteria based on successful improvement patterns

### Requirement 9: Security and Safety Considerations

**User Story:** As a GAN auditor, I want to maintain security and safety standards while providing thorough code reviews, so that I can protect sensitive information and maintain system integrity.

#### Acceptance Criteria

1. WHEN handling code THEN the system SHALL sanitize PII and sensitive data from output
2. WHEN providing examples THEN the system SHALL use generic placeholders instead of real sensitive data
3. WHEN accessing files THEN the system SHALL respect file permissions and security boundaries
4. WHEN executing commands THEN the system SHALL validate command safety before execution
5. WHEN reporting issues THEN the system SHALL flag potential security vulnerabilities with appropriate severity
6. WHEN storing session data THEN the system SHALL ensure secure persistence without exposing sensitive information

### Requirement 10: Performance and Resource Management

**User Story:** As a GAN auditor, I want to manage computational resources efficiently while maintaining audit quality, so that I can provide timely feedback without overwhelming system resources.

#### Acceptance Criteria

1. WHEN conducting audits THEN the system SHALL complete within configured timeout limits (default 30 seconds)
2. WHEN managing context THEN the system SHALL optimize context size to stay within token limits
3. WHEN caching results THEN the system SHALL use audit cache for identical code submissions
4. WHEN handling concurrent requests THEN the system SHALL manage audit queue to prevent resource exhaustion
5. WHEN tracking progress THEN the system SHALL provide progress indicators for long-running audits
6. WHEN cleaning up THEN the system SHALL properly dispose of resources and temporary files