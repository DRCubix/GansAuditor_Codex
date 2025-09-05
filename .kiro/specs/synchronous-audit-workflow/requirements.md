# Synchronous Audit Workflow Requirements

## Introduction

The GansAuditor MCP tool needs to support a synchronous, iterative workflow where an LLM can submit completed work for review, receive detailed feedback, make improvements, and continue this cycle until the auditor is satisfied with 100% completion.

## Requirements

### Requirement 1: Synchronous Audit Response

**User Story:** As an LLM using the GansAuditor tool, I want to receive audit results immediately in the response, so that I can act on the feedback without needing to make separate calls.

#### Acceptance Criteria

1. WHEN I submit code for audit THEN the tool SHALL return audit results in the same response
2. WHEN audit is enabled THEN the tool SHALL wait for audit completion before responding
3. WHEN audit fails THEN the tool SHALL return error details in the response
4. WHEN no code is detected THEN the tool SHALL return standard response without audit delay

### Requirement 2: Iterative Feedback Loop

**User Story:** As an LLM, I want to receive specific feedback about what needs to be improved, so that I can make targeted changes and resubmit for review.

#### Acceptance Criteria

1. WHEN audit verdict is "revise" THEN the response SHALL include specific improvement suggestions
2. WHEN audit verdict is "reject" THEN the response SHALL include reasons for rejection
3. WHEN audit verdict is "pass" THEN the response SHALL indicate work is complete
4. WHEN audit score is below threshold THEN the response SHALL set nextThoughtNeeded to true

### Requirement 3: Completion Criteria and Kill Switches

**User Story:** As an LLM, I want clear completion criteria and automatic termination conditions, so that I don't get stuck in endless improvement loops.

#### Acceptance Criteria

1. WHEN audit score reaches 95% or better at 10 loops THEN the tool SHALL indicate completion
2. WHEN audit score reaches 90% or better at 15 loops THEN the tool SHALL indicate completion
3. WHEN audit score reaches 85% or better at 20 loops THEN the tool SHALL indicate completion
4. WHEN 25 loops are reached THEN the tool SHALL stop and report failure rate and critical issues
5. WHEN after 10 loops the same answers are being repeated with 0 change THEN the tool SHALL report loop detection to user
6. WHEN completion criteria is met THEN nextThoughtNeeded SHALL be false
7. WHEN kill switch is triggered THEN the response SHALL include termination reason and final assessment

### Requirement 4: Session Continuity

**User Story:** As an LLM, I want my iterative improvements to be tracked across multiple calls, so that the auditor can see the progression and provide contextual feedback.

#### Acceptance Criteria

1. WHEN I provide a branchId THEN the tool SHALL maintain session state across calls
2. WHEN I submit improved work THEN the tool SHALL compare against previous iterations
3. WHEN session exists THEN the tool SHALL provide contextual feedback based on history
4. WHEN session reaches completion THEN the tool SHALL summarize the improvement journey

### Requirement 5: Detailed Feedback Format

**User Story:** As an LLM, I want to receive structured, actionable feedback, so that I can understand exactly what needs to be changed.

#### Acceptance Criteria

1. WHEN audit provides feedback THEN the response SHALL include specific line-by-line comments
2. WHEN improvements are needed THEN the response SHALL include suggested changes
3. WHEN code has issues THEN the response SHALL categorize problems by type (security, performance, etc.)
4. WHEN audit is complete THEN the response SHALL include overall assessment summary

### Requirement 6: Workflow Control

**User Story:** As an LLM, I want to control the audit process parameters, so that I can customize the review criteria for different types of work.

#### Acceptance Criteria

1. WHEN I include gan-config THEN the tool SHALL use custom audit parameters
2. WHEN I set threshold THEN the tool SHALL use that completion criteria
3. WHEN I set maxCycles THEN the tool SHALL limit iterations accordingly
4. WHEN I specify judges THEN the tool SHALL use those evaluation models

### Requirement 7: Error Handling and Recovery

**User Story:** As an LLM, I want clear error messages when auditing fails, so that I can understand what went wrong and how to proceed.

#### Acceptance Criteria

1. WHEN audit service is unavailable THEN the tool SHALL return graceful error message
2. WHEN code format is invalid THEN the tool SHALL provide format guidance
3. WHEN session is corrupted THEN the tool SHALL offer session reset option
4. WHEN timeout occurs THEN the tool SHALL return partial results with timeout indication

### Requirement 8: Loop Detection and Stagnation Prevention

**User Story:** As an LLM, I want the system to detect when I'm not making progress, so that I don't waste time in unproductive loops.

#### Acceptance Criteria

1. WHEN 10 loops have occurred THEN the tool SHALL analyze response similarity
2. WHEN responses are identical or substantially similar (>95% match) THEN the tool SHALL detect stagnation
3. WHEN stagnation is detected THEN the tool SHALL report loop detection to user
4. WHEN stagnation occurs THEN the tool SHALL provide alternative suggestions or terminate session
5. WHEN loop detection triggers THEN the response SHALL include analysis of why progress stopped

### Requirement 9: Performance Optimization

**User Story:** As an LLM, I want audit responses to be reasonably fast, so that the iterative workflow doesn't become too slow to be practical.

#### Acceptance Criteria

1. WHEN audit is requested THEN the tool SHALL complete within 30 seconds for typical code
2. WHEN large code is submitted THEN the tool SHALL provide progress indicators
3. WHEN multiple iterations occur THEN the tool SHALL optimize based on previous results
4. WHEN audit is cached THEN the tool SHALL return cached results for identical code
