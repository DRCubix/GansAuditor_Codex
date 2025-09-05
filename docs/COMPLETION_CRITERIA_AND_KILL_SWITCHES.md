# Completion Criteria and Kill Switch Behavior

This document provides a comprehensive explanation of how the GansAuditor synchronous audit workflow determines when code is complete and implements safety mechanisms to prevent infinite loops.

## Table of Contents

1. [Overview](#overview)
2. [Tiered Completion System](#tiered-completion-system)
3. [Kill Switch Mechanisms](#kill-switch-mechanisms)
4. [Stagnation Detection](#stagnation-detection)
5. [Configuration Options](#configuration-options)
6. [Behavioral Examples](#behavioral-examples)
7. [Best Practices](#best-practices)

## Overview

The synchronous audit workflow uses a sophisticated multi-tiered completion system designed to balance code quality with practical development constraints. The system implements several safety mechanisms to prevent endless improvement loops while ensuring code meets appropriate quality standards.

### Key Principles

1. **Quality Thresholds**: Different quality standards based on iteration count
2. **Progressive Relaxation**: Lower quality requirements as iterations increase
3. **Safety Limits**: Hard stops to prevent infinite loops
4. **Stagnation Prevention**: Detection of non-productive iteration cycles
5. **Contextual Completion**: Completion criteria adapt to development context

## Tiered Completion System

### Tier Structure

The completion system uses three tiers plus a hard stop, each with decreasing quality requirements but increasing loop limits:

```
Tier 1: 95% quality at ≤10 loops  (Excellent quality, early completion)
Tier 2: 90% quality at ≤15 loops  (Good quality, reasonable effort)
Tier 3: 85% quality at ≤20 loops  (Acceptable quality, extended effort)
Hard Stop: Any quality at 25 loops (Forced termination)
```

### Tier 1: Excellence Standard (95% at 10 loops)

**Purpose**: Reward high-quality code that meets standards quickly

**Criteria**:
- Audit score ≥ 95%
- Loop count ≤ 10
- No critical security or performance issues

**Typical Scenarios**:
- Well-structured code with minor improvements needed
- Experienced developers following best practices
- Code reviews of mature, tested implementations

**Example Response**:
```json
{
  "completionStatus": {
    "isComplete": true,
    "reason": "score_95_at_10",
    "currentLoop": 7,
    "score": 96,
    "threshold": 95
  },
  "gan": {
    "verdict": "pass",
    "overall": 96,
    "review": {
      "summary": "Excellent implementation meeting all quality standards"
    }
  }
}
```

### Tier 2: Quality Standard (90% at 15 loops)

**Purpose**: Accommodate good code that needs moderate refinement

**Criteria**:
- Audit score ≥ 90%
- Loop count ≤ 15
- Major issues resolved, minor improvements acceptable

**Typical Scenarios**:
- Code with architectural soundness but implementation details to refine
- Complex features requiring iterative improvement
- Learning scenarios where developers improve through feedback

**Example Response**:
```json
{
  "completionStatus": {
    "isComplete": true,
    "reason": "score_90_at_15",
    "currentLoop": 13,
    "score": 91,
    "threshold": 90
  },
  "gan": {
    "verdict": "pass",
    "overall": 91,
    "review": {
      "summary": "Good implementation with acceptable quality level achieved"
    }
  }
}
```

### Tier 3: Acceptable Standard (85% at 20 loops)

**Purpose**: Provide completion path for challenging implementations

**Criteria**:
- Audit score ≥ 85%
- Loop count ≤ 20
- Critical issues resolved, some improvements may remain

**Typical Scenarios**:
- Complex legacy code refactoring
- Challenging technical requirements
- Time-constrained development with acceptable quality trade-offs

**Example Response**:
```json
{
  "completionStatus": {
    "isComplete": true,
    "reason": "score_85_at_20",
    "currentLoop": 18,
    "score": 87,
    "threshold": 85
  },
  "gan": {
    "verdict": "pass",
    "overall": 87,
    "review": {
      "summary": "Acceptable implementation meeting minimum quality requirements"
    }
  }
}
```

### Hard Stop: Safety Limit (25 loops maximum)

**Purpose**: Prevent infinite loops and resource exhaustion

**Criteria**:
- Loop count reaches 25
- Forced termination regardless of score
- Comprehensive failure analysis provided

**Typical Scenarios**:
- Fundamental architectural problems requiring redesign
- Insufficient technical knowledge or guidance
- Overly complex requirements for iterative improvement

**Example Response**:
```json
{
  "completionStatus": {
    "isComplete": false,
    "reason": "max_loops_reached",
    "currentLoop": 25,
    "score": 78,
    "threshold": 85
  },
  "gan": {
    "verdict": "reject",
    "overall": 78,
    "terminationInfo": {
      "reason": "Maximum loops (25) reached without achieving completion criteria",
      "failureRate": 0.22,
      "criticalIssues": [
        "Persistent security vulnerabilities in authentication flow",
        "Incomplete error handling throughout application",
        "Performance bottlenecks in data access layer"
      ],
      "finalAssessment": "Code shows improvement from 45 to 78 points but requires fundamental architectural changes",
      "recommendations": [
        "Consider redesigning authentication system with established security patterns",
        "Implement comprehensive error handling strategy across all modules",
        "Optimize database queries and implement caching layer",
        "Break down complex features into smaller, manageable components"
      ]
    }
  }
}
```

## Kill Switch Mechanisms

### 1. Loop Count Kill Switch

**Trigger**: When `currentLoop >= SYNC_AUDIT_HARD_STOP_LOOPS` (default: 25)

**Behavior**:
- Immediate termination of improvement cycle
- Comprehensive failure analysis
- Detailed recommendations for next steps
- Session marked as incomplete with termination reason

**Configuration**:
```bash
export SYNC_AUDIT_HARD_STOP_LOOPS=25  # Adjust based on complexity tolerance
```

### 2. Stagnation Kill Switch

**Trigger**: When response similarity exceeds threshold for consecutive iterations

**Behavior**:
- Detects when improvements have plateaued
- Analyzes response similarity using text comparison algorithms
- Provides alternative approaches or architectural suggestions
- Can terminate early to prevent wasted effort

**Configuration**:
```bash
export ENABLE_STAGNATION_DETECTION=true
export SYNC_AUDIT_STAGNATION_THRESHOLD=0.95  # 95% similarity threshold
export SYNC_AUDIT_STAGNATION_START_LOOP=10   # Start checking at loop 10
```

### 3. Timeout Kill Switch

**Trigger**: When individual audit operations exceed time limits

**Behavior**:
- Prevents hanging on complex or problematic code
- Returns partial results when possible
- Allows retry mechanisms for transient issues
- Maintains system responsiveness

**Configuration**:
```bash
export AUDIT_TIMEOUT_SECONDS=30
export AUDIT_TIMEOUT_RETRY_ATTEMPTS=1
export AUDIT_PARTIAL_RESULTS_ON_TIMEOUT=true
```

### 4. Resource Kill Switch

**Trigger**: When system resources are exhausted

**Behavior**:
- Monitors memory and CPU usage
- Limits concurrent operations
- Implements queue management
- Graceful degradation under load

**Configuration**:
```bash
export MAX_CONCURRENT_AUDITS=5
export MAX_CONCURRENT_SESSIONS=50
export ENABLE_AUDIT_QUEUE=true
```

## Stagnation Detection

### Algorithm Overview

The stagnation detection system analyzes response similarity across iterations to identify when improvements have plateaued:

1. **Text Similarity Analysis**: Compares response content using normalized text comparison
2. **Score Plateau Detection**: Identifies when audit scores stop improving
3. **Pattern Recognition**: Detects repeated approaches or solutions
4. **Trend Analysis**: Evaluates improvement velocity over time

### Similarity Calculation

```typescript
interface SimilarityAnalysis {
  textSimilarity: number;      // 0-1, based on content comparison
  scoreSimilarity: number;     // 0-1, based on audit score changes
  patternSimilarity: number;   // 0-1, based on approach patterns
  overallSimilarity: number;   // Weighted average of above
}

// Stagnation detected when overallSimilarity > threshold
const isStagnant = analysis.overallSimilarity > STAGNATION_THRESHOLD;
```

### Stagnation Response

When stagnation is detected, the system provides:

1. **Analysis Report**: Detailed explanation of why stagnation was detected
2. **Alternative Suggestions**: Different approaches to try
3. **Architectural Guidance**: Higher-level design recommendations
4. **Break-down Suggestions**: Ways to simplify the problem

**Example Stagnation Response**:
```json
{
  "loopInfo": {
    "currentLoop": 14,
    "stagnationDetected": true,
    "progressTrend": "stagnant",
    "similarityScore": 0.97
  },
  "feedback": {
    "stagnationAnalysis": {
      "detectedAtLoop": 12,
      "repeatedPatterns": [
        "Similar error handling approaches across iterations",
        "Consistent validation logic without architectural changes",
        "Repeated attempts at performance optimization without profiling"
      ],
      "recommendation": "Consider a different architectural approach or break the problem into smaller components",
      "alternatives": [
        "Implement a different design pattern (e.g., Strategy, Observer)",
        "Break the feature into smaller, independent modules",
        "Research established solutions for similar problems",
        "Consult with senior developers or architects"
      ]
    }
  }
}
```

## Configuration Options

### Environment Variables

```bash
# Completion Criteria
export SYNC_AUDIT_TIER1_SCORE=95        # Tier 1 score threshold
export SYNC_AUDIT_TIER1_LOOPS=10        # Tier 1 loop limit
export SYNC_AUDIT_TIER2_SCORE=90        # Tier 2 score threshold
export SYNC_AUDIT_TIER2_LOOPS=15        # Tier 2 loop limit
export SYNC_AUDIT_TIER3_SCORE=85        # Tier 3 score threshold
export SYNC_AUDIT_TIER3_LOOPS=20        # Tier 3 loop limit
export SYNC_AUDIT_HARD_STOP_LOOPS=25    # Hard stop limit

# Stagnation Detection
export ENABLE_STAGNATION_DETECTION=true
export SYNC_AUDIT_STAGNATION_THRESHOLD=0.95
export SYNC_AUDIT_STAGNATION_START_LOOP=10

# Kill Switches
export AUDIT_TIMEOUT_SECONDS=30
export MAX_CONCURRENT_AUDITS=5
export MAX_CONCURRENT_SESSIONS=50
```

### Runtime Configuration

```typescript
interface CompletionCriteria {
  tier1: { score: number; maxLoops: number };
  tier2: { score: number; maxLoops: number };
  tier3: { score: number; maxLoops: number };
  hardStop: { maxLoops: number };
  stagnationCheck: {
    enabled: boolean;
    startLoop: number;
    similarityThreshold: number;
  };
}
```

### Custom Configuration via gan-config

```javascript
{
  "thought": "```gan-config\n{\n  \"threshold\": 88,\n  \"maxCycles\": 15\n}\n```\n\n// Your code here..."
}
```

## Behavioral Examples

### Example 1: Quick Excellence (Tier 1 Completion)

**Scenario**: Well-written function with minor documentation issues

```
Loop 1: Score 89 - "Add JSDoc comments and input validation"
Loop 2: Score 94 - "Improve error messages"
Loop 3: Score 97 - "Perfect! Tier 1 completion achieved"
Result: Completed at loop 3 with 97% score (Tier 1: 95% at ≤10 loops)
```

### Example 2: Iterative Improvement (Tier 2 Completion)

**Scenario**: Complex API with multiple issues to resolve

```
Loop 1: Score 45 - "Critical security vulnerabilities"
Loop 5: Score 72 - "Security fixed, performance issues remain"
Loop 10: Score 85 - "Performance improved, documentation needed"
Loop 13: Score 91 - "Good! Tier 2 completion achieved"
Result: Completed at loop 13 with 91% score (Tier 2: 90% at ≤15 loops)
```

### Example 3: Challenging Implementation (Tier 3 Completion)

**Scenario**: Legacy code refactoring with architectural constraints

```
Loop 1: Score 35 - "Multiple architectural issues"
Loop 8: Score 58 - "Some improvements, major issues remain"
Loop 15: Score 74 - "Progress slowing, architectural limits"
Loop 19: Score 86 - "Acceptable! Tier 3 completion achieved"
Result: Completed at loop 19 with 86% score (Tier 3: 85% at ≤20 loops)
```

### Example 4: Stagnation Detection

**Scenario**: Developer stuck on architectural problem

```
Loop 1: Score 55 - "Multiple issues identified"
Loop 8: Score 73 - "Good progress on implementation details"
Loop 12: Score 75 - "Minor improvements, similar approach"
Loop 14: Score 76 - "Stagnation detected - similar responses"
Result: Terminated with stagnation analysis and architectural suggestions
```

### Example 5: Hard Stop Activation

**Scenario**: Fundamental design problems requiring complete rework

```
Loop 1: Score 25 - "Critical architectural flaws"
Loop 10: Score 48 - "Some improvements, core issues remain"
Loop 20: Score 65 - "Progress slowing, fundamental problems persist"
Loop 25: Score 72 - "Hard stop reached - requires redesign"
Result: Terminated with comprehensive failure analysis and recommendations
```

## Best Practices

### For Development Teams

1. **Start with Appropriate Thresholds**
   - Development: Tier 1: 85%, Tier 2: 80%, Tier 3: 75%
   - Production: Tier 1: 95%, Tier 2: 90%, Tier 3: 85%
   - Learning: Tier 1: 80%, Tier 2: 75%, Tier 3: 70%

2. **Monitor Completion Patterns**
   - Track which tier most completions occur in
   - Adjust thresholds based on team capability and requirements
   - Identify common stagnation points for training opportunities

3. **Use Stagnation Detection Wisely**
   - Enable for complex features where developers might get stuck
   - Disable for simple tasks where false positives are likely
   - Adjust sensitivity based on team experience level

### For Individual Developers

1. **Understand the Tier System**
   - Aim for Tier 1 completion when possible
   - Don't be discouraged by Tier 2 or 3 completions
   - Use hard stop analysis for learning opportunities

2. **Respond to Stagnation Detection**
   - Take stagnation warnings seriously
   - Consider alternative approaches suggested
   - Don't hesitate to seek help or research solutions

3. **Learn from Termination Analysis**
   - Review critical issues identified at hard stop
   - Use recommendations for future development
   - Consider breaking complex problems into smaller parts

### For System Administrators

1. **Tune for Your Environment**
   - Adjust loop limits based on typical code complexity
   - Set appropriate timeouts for your infrastructure
   - Monitor completion rates and adjust thresholds accordingly

2. **Monitor System Health**
   - Track stagnation detection rates for false positive tuning
   - Monitor hard stop frequency for threshold adjustment
   - Ensure adequate resources for concurrent operations

3. **Provide Appropriate Documentation**
   - Educate users on the tier system
   - Provide examples of successful completion patterns
   - Document local configuration and best practices

The completion criteria and kill switch system provides a balanced approach to code quality assurance while preventing resource waste and infinite loops. By understanding and properly configuring these mechanisms, teams can achieve optimal results from the synchronous audit workflow.