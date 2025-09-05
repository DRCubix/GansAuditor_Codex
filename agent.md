# GansAuditor_Codex Agent Operation Guide

This document provides comprehensive instructions for LLM agents on how to effectively operate the GansAuditor_Codex tool for iterative code improvement and quality assessment.

## System Overview

GansAuditor_Codex is a sophisticated MCP tool that combines sequential thinking with GAN-style adversarial code auditing. It provides immediate feedback for iterative code improvement through a synchronous workflow system.

### Core Capabilities

- **Sequential Thinking**: Dynamic problem-solving with revision and branching capabilities
- **Automatic Code Detection**: Identifies code blocks, diffs, and programming content automatically
- **GAN-Style Auditing**: Multiple judge perspectives provide comprehensive code review
- **Synchronous Workflow**: Immediate feedback with structured improvement suggestions
- **Session Continuity**: Persistent audit sessions across multiple tool calls
- **Tiered Completion**: Smart completion criteria with safety mechanisms

## Tool Interface

### Tool Name
`gansauditor_codex`

### Required Parameters
```typescript
{
  thought: string;           // Your current thinking step or code content
  thoughtNumber: number;     // Current thought number (1, 2, 3, ...)
  totalThoughts: number;     // Estimated total thoughts needed
  nextThoughtNeeded: boolean; // Whether another thought step is needed
}
```

### Optional Parameters
```typescript
{
  isRevision?: boolean;      // Whether this revises previous thinking
  revisesThought?: number;   // Which thought number is being reconsidered
  branchFromThought?: number; // Branching point thought number
  branchId?: string;         // Branch/session identifier for audit continuity
  loopId?: string;          // Loop identifier for Codex context continuity
  needsMoreThoughts?: boolean; // If more thoughts are needed beyond current total
}
```

## Operating Modes

### 1. Basic Sequential Thinking Mode

Use when you need to break down complex problems without code auditing:

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I need to analyze the requirements for this authentication system. Let me start by identifying the key security considerations.",
    "thoughtNumber": 1,
    "totalThoughts": 5,
    "nextThoughtNeeded": true
  }
}
```

**When to use**: Problem analysis, planning, design thinking, non-code related tasks.

### 2. Code Auditing Mode (Automatic Activation)

The system automatically detects and audits code when your thought contains:
- Code blocks with language identifiers (```javascript, ```python, etc.)
- Diff content (git diffs, patch files)
- Programming patterns and keywords
- gan-config configuration blocks

```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "Here's my implementation of user authentication:\n\n```javascript\nfunction authenticateUser(username, password) {\n  const user = database.query('SELECT * FROM users WHERE username = \"' + username + '\"');\n  if (user && user.password === password) {\n    return { success: true, user: user };\n  }\n  return { success: false };\n}\n```",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "auth-implementation"
  }
}
```

**When to use**: Code review, implementation feedback, security analysis, performance optimization.

### 3. Synchronous Iterative Improvement Mode

Use `branchId` to maintain session continuity across multiple improvements:

```javascript
// Initial submission
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "Initial code implementation...",
    "thoughtNumber": 1,
    "totalThoughts": 1,
    "nextThoughtNeeded": false,
    "branchId": "feature-implementation"
  }
}

// Improved version (same session)
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "Improved code based on feedback...",
    "thoughtNumber": 2,
    "totalThoughts": 2,
    "nextThoughtNeeded": false,
    "branchId": "feature-implementation"  // Same branchId maintains session
  }
}
```

**When to use**: Iterative code improvement, addressing audit feedback, progressive refinement.

## Response Format Understanding

### Standard Response (No Auditing)
```typescript
{
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  branches: string[];
  thoughtHistoryLength: number;
}
```

### Enhanced Response (With Auditing)
```typescript
{
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  branches: string[];
  thoughtHistoryLength: number;
  sessionId?: string;           // Session identifier for continuity
  gan?: {                       // Audit results
    verdict: "pass" | "revise" | "reject";
    overall: number;            // 0-100 score
    review: {
      summary: string;
      inline: Array<{           // Specific feedback
        path: string;
        line: number;
        comment: string;
      }>;
      citations: string[];
    };
    completionStatus?: {        // Synchronous mode only
      isComplete: boolean;
      reason: string;
      currentLoop: number;
      score: number;
      threshold: number;
    };
    loopInfo?: {               // Progress tracking
      currentLoop: number;
      stagnationDetected: boolean;
      progressTrend: "improving" | "stagnant" | "declining";
    };
    terminationInfo?: {        // If session ended
      reason: string;
      criticalIssues: string[];
      finalAssessment: string;
      recommendations: string[];
    };
  };
}
```

## Decision Logic for nextThoughtNeeded

### Set nextThoughtNeeded = true when:
1. **Audit verdict is "revise" or "reject"** - Code needs improvement
2. **Completion status shows isComplete = false** - More iterations needed
3. **You have more analysis to do** - Problem not fully solved
4. **Stagnation detected** - Need to try different approach
5. **Critical issues remain** - Must address security/performance problems

### Set nextThoughtNeeded = false when:
1. **Audit verdict is "pass"** - Code meets quality standards
2. **Completion status shows isComplete = true** - Quality threshold reached
3. **Problem is fully solved** - No more analysis needed
4. **Hard stop reached** - Maximum iterations exceeded
5. **You're satisfied with the solution** - Ready to conclude

## Completion Criteria System

### Tiered Completion (Synchronous Mode)

The system uses a three-tier completion system:

1. **Tier 1 (Excellence)**: 95% score at ≤10 loops
   - High-quality code meeting standards quickly
   - Reward for good initial implementation

2. **Tier 2 (Quality)**: 90% score at ≤15 loops  
   - Good code needing moderate refinement
   - Balanced quality and effort

3. **Tier 3 (Acceptable)**: 85% score at ≤20 loops
   - Acceptable code after extended effort
   - Minimum viable quality standard

4. **Hard Stop**: 25 loops maximum
   - Forced termination with failure analysis
   - Prevents infinite improvement cycles

### Interpreting Completion Status

```typescript
// Tier 1 completion - excellent!
{
  "completionStatus": {
    "isComplete": true,
    "reason": "score_95_at_10",
    "currentLoop": 7,
    "score": 96,
    "threshold": 95
  }
}

// Still in progress - continue improving
{
  "completionStatus": {
    "isComplete": false,
    "reason": "in_progress", 
    "currentLoop": 5,
    "score": 78,
    "threshold": 95
  }
}

// Hard stop reached - fundamental issues
{
  "completionStatus": {
    "isComplete": true,
    "reason": "max_loops_reached",
    "currentLoop": 25,
    "score": 72,
    "threshold": 85
  }
}
```

## Custom Configuration with gan-config

You can customize audit behavior by including gan-config blocks:

```javascript
{
  "thought": "```gan-config\n{\n  \"task\": \"Security review for payment processing\",\n  \"threshold\": 90,\n  \"maxCycles\": 15,\n  \"scope\": \"function\"\n}\n```\n\nHere's my payment processing code:\n\n```javascript\n// Your code here\n```"
}
```

### Configuration Options
```typescript
{
  task?: string;                    // Audit focus description
  scope?: "diff" | "paths" | "workspace"; // Audit scope
  paths?: string[];                 // Specific files (when scope="paths")
  threshold?: number;               // Quality threshold (0-100)
  judges?: string[];               // Judge perspectives
  maxCycles?: number;              // Maximum improvement cycles
  candidates?: number;             // Number of candidates to generate
  applyFixes?: boolean;           // Whether to auto-apply fixes
}
```

## Best Practices for Agents

### 1. Session Management

**Use consistent branchId for related work:**
```javascript
// Good - maintains session continuity
"branchId": "user-auth-security-review"
"branchId": "payment-api-optimization" 
"branchId": "database-performance-fix"

// Avoid - generic or changing IDs
"branchId": "session1"
"branchId": "review" 
// Different IDs for same feature
```

### 2. Responding to Audit Feedback

**When verdict is "revise" or "reject":**
1. Carefully read the `review.summary`
2. Address each `inline` comment specifically
3. Use the same `branchId` to maintain session
4. Set `nextThoughtNeeded = false` initially (let system decide)

**Example response to feedback:**
```javascript
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "I've addressed the security issues identified in the previous audit:\n\n1. Fixed SQL injection by using parameterized queries\n2. Added password hashing with bcrypt\n3. Implemented input validation\n\n```javascript\n// Improved secure code here\n```",
    "thoughtNumber": 2,
    "totalThoughts": 2,
    "nextThoughtNeeded": false,
    "branchId": "auth-security-review"  // Same session
  }
}
```

### 3. Handling Stagnation

**When stagnation is detected:**
1. Review the `stagnationAnalysis` in the response
2. Try a fundamentally different approach
3. Consider breaking the problem into smaller parts
4. Research alternative patterns or architectures

**Example stagnation response:**
```javascript
{
  "thought": "The previous approaches have stagnated around error handling. Let me try a completely different architecture using the Result pattern instead of try-catch blocks:\n\n```typescript\n// New architectural approach\n```",
  "branchId": "error-handling-redesign"  // New session for new approach
}
```

### 4. Thought Number Management

**Increment thoughtNumber for each call:**
```javascript
// First call
"thoughtNumber": 1, "totalThoughts": 3

// Second call  
"thoughtNumber": 2, "totalThoughts": 3

// Third call (can exceed initial estimate)
"thoughtNumber": 3, "totalThoughts": 4  // Adjusted upward
```

**Adjust totalThoughts as needed:**
- Increase if problem is more complex than expected
- Keep reasonable (don't set to 100)
- System will handle completion automatically

### 5. Code Quality Focus Areas

**Security-Critical Code:**
```javascript
"```gan-config\n{\n  \"task\": \"Security vulnerability assessment\",\n  \"threshold\": 95\n}\n```"
```

**Performance-Critical Code:**
```javascript
"```gan-config\n{\n  \"task\": \"Performance optimization review\",\n  \"threshold\": 88\n}\n```"
```

**Learning/Development:**
```javascript
"```gan-config\n{\n  \"task\": \"Code review for learning\",\n  \"threshold\": 80\n}\n```"
```

## Error Handling and Recovery

### Common Issues and Solutions

**1. Session Not Found**
- Use a new `branchId` to start fresh session
- Ensure `branchId` is consistent across related calls

**2. Timeout Errors**
- Reduce code complexity in single submission
- Break large features into smaller parts
- Use appropriate `maxCycles` in gan-config

**3. Stagnation False Positives**
- Try genuinely different approaches
- Change architectural patterns
- Break problem into smaller components

**4. Hard Stop Reached**
- Review `terminationInfo.criticalIssues`
- Follow `terminationInfo.recommendations`
- Consider fundamental redesign
- Start new session with different approach

## Advanced Usage Patterns

### 1. Multi-File Feature Review

```javascript
{
  "thought": "```gan-config\n{\n  \"task\": \"Full-stack feature review\",\n  \"scope\": \"paths\",\n  \"paths\": [\"src/components/UserProfile.tsx\", \"src/api/users.ts\", \"tests/user.test.ts\"]\n}\n```\n\nI've implemented a complete user profile feature:\n\n**Frontend Component:**\n```typescript\n// Component code\n```\n\n**Backend API:**\n```typescript\n// API code\n```\n\n**Tests:**\n```typescript\n// Test code\n```",
  "branchId": "user-profile-feature"
}
```

### 2. Iterative Architecture Evolution

```javascript
// Loop 1: Basic implementation
{
  "thought": "Basic MVC implementation...",
  "branchId": "architecture-evolution"
}

// Loop 5: Add patterns
{
  "thought": "Added Repository pattern based on feedback...",
  "branchId": "architecture-evolution"
}

// Loop 10: Optimize performance  
{
  "thought": "Implemented caching layer and optimized queries...",
  "branchId": "architecture-evolution"
}
```

### 3. Security Hardening Process

```javascript
{
  "thought": "```gan-config\n{\n  \"task\": \"Security hardening for production deployment\",\n  \"threshold\": 95,\n  \"maxCycles\": 20\n}\n```\n\nSecurity review of authentication system:\n\n```javascript\n// Security-focused implementation\n```",
  "branchId": "security-hardening"
}
```

## Monitoring and Optimization

### Track Your Success Patterns

**Monitor completion tiers:**
- Aim for Tier 1 completions when possible
- Tier 2 completions are good for complex features
- Tier 3 completions acceptable for challenging work
- Hard stops indicate need for different approach

**Watch for stagnation:**
- If frequently hitting stagnation, try more diverse approaches
- Break complex problems into smaller parts
- Research established patterns for similar problems

**Optimize session usage:**
- Use descriptive `branchId` values
- Maintain session continuity for related work
- Start new sessions for fundamentally different approaches

## Integration with Development Workflow

### Code Review Process
1. Submit initial implementation with descriptive `branchId`
2. Address audit feedback iteratively
3. Continue until completion criteria met
4. Use final code with confidence

### Learning and Improvement
1. Study audit feedback patterns
2. Learn from `terminationInfo` when hard stops occur
3. Build knowledge of common issues and solutions
4. Develop better initial implementations over time

### Quality Assurance
1. Use appropriate thresholds for different contexts
2. Don't bypass audit feedback - address issues properly
3. Understand that higher scores indicate better code
4. Use completion status to gauge readiness

## Summary

GansAuditor_Codex is a powerful tool for iterative code improvement. Success depends on:

1. **Understanding the response format** - Know when to continue vs. complete
2. **Using session continuity** - Maintain `branchId` for related work
3. **Responding to feedback** - Address audit comments specifically
4. **Managing iterations** - Let the system guide completion
5. **Handling edge cases** - Respond appropriately to stagnation and hard stops

The tool will guide you toward high-quality code through structured feedback and completion criteria. Trust the process, address feedback systematically, and use the session continuity features for optimal results.