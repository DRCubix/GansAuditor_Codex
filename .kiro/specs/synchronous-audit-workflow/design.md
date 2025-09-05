# Synchronous Audit Workflow Design

## Overview

This design transforms the GansAuditor MCP tool from an asynchronous, fire-and-forget audit system into a synchronous, iterative feedback loop that enables LLMs to continuously improve their work until quality standards are met.

## Architecture

### Current vs. New Architecture

**Current (Async):**
```
LLM → GansAuditor → Immediate Response
                 ↓
              Background Audit → Console Log
```

**New (Sync):**
```
LLM → GansAuditor → Wait for Audit → Enhanced Response with Feedback
  ↑                                           ↓
  └── Make Changes ← Analyze Feedback ←──────┘
```

### Core Components

1. **Synchronous Audit Engine**: Waits for audit completion before responding
2. **Session Manager**: Tracks iterations and progress across calls
3. **Completion Evaluator**: Applies tiered completion criteria and kill switches
4. **Loop Detector**: Identifies stagnation and repeated responses
5. **Feedback Formatter**: Structures audit results for LLM consumption

## Components and Interfaces

### 1. Synchronous Audit Engine

```typescript
interface SynchronousAuditEngine {
  auditAndWait(thought: ThoughtData, sessionId?: string): Promise<AuditResult>;
  isAuditRequired(thought: ThoughtData): boolean;
  getAuditTimeout(): number; // 30 seconds default
}

interface AuditResult {
  review: GansAuditorCodexReview;
  sessionState: SessionState;
  completionStatus: CompletionStatus;
}
```

### 2. Session Manager

```typescript
interface SessionManager {
  getOrCreateSession(sessionId: string, loopId?: string): SessionState;
  updateSession(sessionId: string, iteration: IterationData): void;
  analyzeProgress(sessionId: string): ProgressAnalysis;
  detectStagnation(sessionId: string): StagnationResult;
  startCodexContext(loopId: string): Promise<string>; // Returns context ID
  maintainCodexContext(loopId: string, contextId: string): Promise<void>;
  terminateCodexContext(loopId: string, reason: TerminationReason): Promise<void>;
}

interface IterationData {
  thoughtNumber: number;
  code: string;
  auditResult: GansAuditorCodexReview;
  timestamp: number;
}

interface ProgressAnalysis {
  currentLoop: number;
  scoreProgression: number[];
  averageImprovement: number;
  isStagnant: boolean;
}
```

### 3. Completion Evaluator

```typescript
interface CompletionEvaluator {
  evaluateCompletion(score: number, loop: number): CompletionResult;
  shouldTerminate(sessionState: SessionState): TerminationResult;
}

interface CompletionResult {
  isComplete: boolean;
  reason: CompletionReason;
  nextThoughtNeeded: boolean;
}

type CompletionReason = 
  | "score_95_at_10" 
  | "score_90_at_15" 
  | "score_85_at_20" 
  | "max_loops_reached" 
  | "stagnation_detected"
  | "in_progress";

interface TerminationResult {
  shouldTerminate: boolean;
  reason: string;
  failureRate: number;
  criticalIssues: string[];
}
```

### 4. Loop Detector

```typescript
interface LoopDetector {
  analyzeResponseSimilarity(responses: string[]): SimilarityAnalysis;
  detectStagnation(sessionState: SessionState): StagnationResult;
}

interface SimilarityAnalysis {
  averageSimilarity: number; // 0-1
  isStagnant: boolean; // >0.95 similarity
  repeatedPatterns: string[];
}

interface StagnationResult {
  isStagnant: boolean;
  detectedAtLoop: number;
  similarityScore: number;
  recommendation: string;
}
```

### 5. Enhanced Response Builder

```typescript
interface EnhancedResponseBuilder {
  buildSynchronousResponse(
    standard: StandardResponse,
    audit: AuditResult,
    completion: CompletionResult
  ): EnhancedResponse;
}

interface EnhancedResponse extends GansAuditorCodexEnhancedResponse {
  // Existing fields plus:
  completionStatus: CompletionStatus;
  loopInfo: LoopInfo;
  feedback: StructuredFeedback;
  terminationInfo?: TerminationInfo;
}

interface CompletionStatus {
  isComplete: boolean;
  reason: CompletionReason;
  currentLoop: number;
  score: number;
  threshold: number;
}

interface LoopInfo {
  currentLoop: number;
  maxLoops: number;
  progressTrend: "improving" | "stagnant" | "declining";
  stagnationDetected: boolean;
}

interface StructuredFeedback {
  summary: string;
  improvements: ImprovementSuggestion[];
  criticalIssues: CriticalIssue[];
  nextSteps: string[];
}

interface TerminationInfo {
  reason: string;
  failureRate: number;
  criticalIssues: string[];
  finalAssessment: string;
}
```

## Data Models

### Session State Schema

```typescript
interface SessionState {
  id: string;
  loopId?: string; // For Codex context continuity
  config: SessionConfig;
  iterations: IterationData[];
  currentLoop: number;
  isComplete: boolean;
  completionReason?: CompletionReason;
  stagnationInfo?: StagnationResult;
  codexContextId?: string; // Active Codex context window ID
  codexContextActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### Completion Criteria Configuration

```typescript
interface CompletionCriteria {
  tier1: { score: 95, maxLoops: 10 };
  tier2: { score: 90, maxLoops: 15 };
  tier3: { score: 85, maxLoops: 20 };
  hardStop: { maxLoops: 25 };
  stagnationCheck: { startLoop: 10, similarityThreshold: 0.95 };
}
```

## Error Handling

### Error Categories

1. **Audit Timeout**: When audit takes longer than 30 seconds
2. **Service Unavailable**: When Codex service is down
3. **Session Corruption**: When session state is invalid
4. **Stagnation**: When no progress is being made
5. **Hard Stop**: When maximum loops are reached

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  category: ErrorCategory;
  recoverable: boolean;
  sessionState?: Partial<SessionState>;
  suggestions: string[];
  canRetry: boolean;
}
```

## Testing Strategy

### Unit Tests

1. **Completion Evaluator Tests**
   - Test each tier completion criteria
   - Test kill switch activation
   - Test edge cases (exactly at thresholds)

2. **Loop Detector Tests**
   - Test similarity calculation
   - Test stagnation detection
   - Test false positive prevention

3. **Session Manager Tests**
   - Test session creation and updates
   - Test progress analysis
   - Test concurrent session handling

### Integration Tests

1. **End-to-End Workflow Tests**
   - Test complete improvement cycle
   - Test early completion scenarios
   - Test kill switch scenarios

2. **Performance Tests**
   - Test response times under load
   - Test memory usage with long sessions
   - Test concurrent audit requests

### Behavioral Tests

1. **Completion Criteria Tests**
   - Verify 95%@10, 90%@15, 85%@20 completion
   - Verify hard stop at 25 loops
   - Verify stagnation detection at 10+ loops

2. **Feedback Quality Tests**
   - Verify actionable feedback generation
   - Verify critical issue identification
   - Verify improvement suggestion quality

## Implementation Phases

### Phase 1: Core Synchronous Engine
- Implement synchronous audit waiting
- Add timeout handling
- Update response format

### Phase 2: Session Management
- Implement session state tracking
- Add iteration history
- Add progress analysis

### Phase 3: Completion Logic
- Implement tiered completion criteria
- Add kill switches
- Add termination reporting

### Phase 4: Loop Detection
- Implement similarity analysis
- Add stagnation detection
- Add loop prevention

### Phase 5: Enhanced Feedback
- Improve feedback formatting
- Add structured suggestions
- Add critical issue categorization

## Configuration

### Environment Variables

```bash
ENABLE_GAN_AUDITING=true
AUDIT_TIMEOUT_SECONDS=30
MAX_CONCURRENT_AUDITS=5
SESSION_CLEANUP_INTERVAL=3600
STAGNATION_SIMILARITY_THRESHOLD=0.95
```

### Runtime Configuration

```typescript
interface RuntimeConfig {
  completionCriteria: CompletionCriteria;
  auditTimeout: number;
  maxConcurrentSessions: number;
  enableStagnationDetection: boolean;
  feedbackDetailLevel: "basic" | "detailed" | "verbose";
}
```

## Migration Strategy

### Backward Compatibility

1. **Async Mode Preservation**: Keep async mode as fallback when `ENABLE_SYNC_AUDIT=false`
2. **Response Format**: Extend existing response format without breaking changes
3. **Session Optional**: Sessions only created when `branchId` is provided

### Migration Steps

1. Deploy with sync mode disabled by default
2. Test with selected clients
3. Gradually enable sync mode
4. Monitor performance and adjust
5. Make sync mode default
6. Eventually deprecate async mode

## Performance Considerations

### Optimization Strategies

1. **Audit Caching**: Cache identical code audits
2. **Parallel Processing**: Run multiple audit dimensions in parallel
3. **Smart Timeouts**: Adjust timeouts based on code complexity
4. **Session Cleanup**: Automatically clean up old sessions
5. **Memory Management**: Limit session history size

### Monitoring

1. **Response Times**: Track audit completion times
2. **Success Rates**: Monitor completion vs. termination rates
3. **Session Metrics**: Track average loops to completion
4. **Error Rates**: Monitor timeout and failure rates