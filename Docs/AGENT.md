# AGENT Overview

This project implements an MCP server that exposes a single tool, `sequentialthinking`, augmented with a GAN‑style auditor that provides automated code review and structured feedback. It preserves full backward compatibility with existing clients while adding optional auditing that runs in parallel and enriches responses with audit data.

## Capabilities
- Sequential thinking loop with rich metadata (revisions, branching, flexible totals)
- Optional GAN‑style audit of code and diffs (enabled via env var)
- Inline `gan-config` to tune audits per thought
- Repository context packing (diff, paths, workspace heuristics)
- Headless Codex CLI integration (with robust fallbacks)
- Session continuity and persistence across calls (`branchId`)
- Structured results: overall/dimensional scores, verdict, inline comments, unified diff suggestions, judge cards

## When To Use
- Multi‑step problem solving where you refine and branch thoughts
- Code design/implementation with auto‑review and actionable fixes
- Iterative reviews that benefit from context of repo changes

## Architecture
- MCP Server (`index.ts`) exposes `sequentialthinking` on stdio
- GanAuditor orchestrates: SessionManager ↔ ContextPacker ↔ CodexJudge
- Session state persists under `.mcp-gan-state` by default
- Responses are combined through `src/types/response-builder.ts` to keep clients compatible

Key Modules
- `src/auditor/gan-auditor.ts`: Orchestration loop, config merge, fallbacks
- `src/session/session-manager.ts`: File‑based session lifecycle and history
- `src/context/context-packer.ts`: Repo metadata, git diff, path/workspace selection, truncation
- `src/codex/codex-judge.ts`: Codex CLI execution and result parsing; `src/codex/mock-codex-judge.ts` for tests
- `src/types/*`: Data models and validation for requests/responses
- `src/utils/*`: Logger, error handler, file/git helpers

## Tool Summary: `sequentialthinking`
- Input fields (required):
  - `thought` (string): current step content
  - `nextThoughtNeeded` (boolean): whether another step is required
  - `thoughtNumber` (integer ≥1): step index
  - `totalThoughts` (integer ≥1): estimated total (may adjust over time)
- Optional fields:
  - `isRevision` (boolean), `revisesThought` (integer): marks a revision
  - `branchFromThought` (integer), `branchId` (string): branch metadata (also used for GAN session)
  - `needsMoreThoughts` (boolean)
- Response (enhanced, JSON as a single text content item):
  - Standard: `thoughtNumber`, `totalThoughts`, `nextThoughtNeeded`, `branches`, `thoughtHistoryLength`
  - New: `sessionId?`, `gan?` (audit results)

## Audit Triggering
Auditing is enabled only when `ENABLE_GAN_AUDITING=true`. When enabled, the server decides to audit if the thought contains any of:
- A fenced `gan-config` block
- Code blocks (```lang …```), common language keywords, or diff‑like patterns (`+`, `-`, `@@`, `diff --git`)

Auditing runs asynchronously so base tool behavior remains responsive; enhanced response may mark `nextThoughtNeeded` true if audit verdict is `revise` or `reject`.

## Inline `gan-config`
Embed a fenced block in the thought body:

```gan-config
{
  "task": "Review TypeScript changes in this diff",
  "scope": "diff",            // one of: diff | paths | workspace
  "paths": ["src/a.ts"],      // required when scope=paths
  "threshold": 90,             // 0-100, default 85
  "maxCycles": 1,              // default 1
  "candidates": 1,             // default 1
  "judges": ["internal"],     // default ["internal"]
  "applyFixes": false          // default false
}
```

Invalid or partial configs are sanitized and merged with the current session config.

## Session Continuity
- Input `branchId` (or explicit `sessionId` param to GanAuditor internally) identifies a session
- If missing, a new unique session is generated
- State is persisted and loaded per session to maintain history and evolving config

## Context Packing
- `diff`: include git diff and headers
- `paths`: include specified paths
- `workspace`: heuristic selection of relevant files; repo tree and top snippets
- Size management: truncates context safely and includes repository metadata

## Codex Integration
- Default executable: `codex` (override via GanAuditor config if embedding)
- Executes audits headlessly, parses JSON, retries where appropriate
- Fallbacks: if Codex unavailable/timeout/malformed JSON, returns structured fallback review

## Error Handling
- Categories: `config`, `codex`, `filesystem`, `session`
- Strategies: retry, graceful degradation, fallback responses, or skip
- Error responses use a consistent JSON structure compatible with clients

## Environment Variables
- `ENABLE_GAN_AUDITING=true` to turn on auditing
- `DISABLE_THOUGHT_LOGGING=true` to suppress decorative console logs

## Example Thought With Audit
```
We updated the utility functions. Please check edge cases.

```gan-config
{ "scope": "diff", "threshold": 88 }
```

```typescript
export function sum(a: number, b: number) { return a + b; }
```
```

Expected Response (content text is JSON):
- Standard fields plus `sessionId` and `gan` block with `overall`, `dimensions`, `verdict`, `review.inline`, maybe `proposed_diff`.

## Do / Don’t
- Do: include `branchId` to preserve session state across thoughts
- Do: include `gan-config` only when you need to override defaults
- Do: keep code/diff snippets concise to improve context quality
- Don’t: rely on auditing when `ENABLE_GAN_AUDITING` is false; base tool still works
- Don’t: hard‑code secrets in thoughts; repo context may surface them

## Project Layout (high‑level)
- `index.ts`: MCP server and tool definition
- `src/auditor/*`: GAN orchestration
- `src/context/*`: repo context builder
- `src/codex/*`: Codex integration
- `src/session/*`: session persistence
- `src/types/*`: types and response builders
- `src/utils/*`: logger, error handler, file/git utilities

## References
- MCP SDK: `@modelcontextprotocol/sdk`
- Tests: `src/auditor/__tests__/*`, `src/context/__tests__/*`, etc.

