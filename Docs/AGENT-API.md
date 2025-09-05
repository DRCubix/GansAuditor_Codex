# AGENT API: MCP Tool and Schemas

This server speaks the MCP protocol over stdio and exposes a single tool: `sequentialthinking`.

## Tool: `sequentialthinking`
- Description: Dynamic multi‑step reasoning with optional GAN audit of code changes
- Transport: MCP stdio (see MCP SDK for framing)

### Input Schema (JSON)
- `thought` (string, required): the current thinking step
- `nextThoughtNeeded` (boolean, required): whether another step is needed
- `thoughtNumber` (integer ≥1, required)
- `totalThoughts` (integer ≥1, required)
- `isRevision` (boolean, optional)
- `revisesThought` (integer ≥1, optional)
- `branchFromThought` (integer ≥1, optional)
- `branchId` (string, optional) — acts as the GAN audit session ID
- `needsMoreThoughts` (boolean, optional)

Example arguments:
```json
{
  "thought": "Review this patch for error handling.",
  "nextThoughtNeeded": true,
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "branchId": "feature-audit-123"
}
```

### Response Shape
The tool returns a single `content` item with a JSON string payload. The JSON follows the enhanced response format.

Standard fields:
- `thoughtNumber` (number)
- `totalThoughts` (number)
- `nextThoughtNeeded` (boolean)
- `branches` (string[])
- `thoughtHistoryLength` (number)

Enhanced fields:
- `sessionId?` (string)
- `gan?` (GanReview)

Error responses use:
```json
{
  "error": "<message>",
  "status": "failed",
  "details": { /* optional structured details */ }
}
```

### GanReview
```ts
type GanVerdict = "pass" | "revise" | "reject";

interface GanReview {
  overall: number; // 0-100
  dimensions: Array<{ name: string; score: number }>;
  verdict: GanVerdict;
  review: {
    summary: string;
    inline: Array<{ path: string; line: number; comment: string }>;
    citations: string[]; // e.g., "repo://path:start-end"
  };
  proposed_diff?: string | null;
  iterations: number;
  judge_cards: Array<{ model: string; score: number; notes?: string }>;
}
```

### SessionConfig (drives auditing)
```ts
interface SessionConfig {
  task: string;                       // default: "Audit and improve the provided candidate"
  scope: "diff" | "paths" | "workspace"; // default: "diff"
  paths?: string[];                   // required when scope = "paths"
  threshold: number;                  // default: 85
  maxCycles: number;                  // default: 1
  candidates: number;                 // default: 1
  judges: string[];                   // default: ["internal"]
  applyFixes: boolean;                // default: false
}
```

### Inline Config Block
Embed JSON inside a fenced block within `thought` to override `SessionConfig` for this call. Invalid values are sanitized.

```gan-config
{ "scope": "workspace", "threshold": 90, "maxCycles": 2 }
```

### Audit Trigger Heuristics
Auditing occurs only when `ENABLE_GAN_AUDITING=true` and the thought contains any of:
- `gan-config` fenced block
- Code block (```lang … ```), or common programming tokens/keywords
- Diff markers: `+`, `-`, `@@`, `diff --git`, etc.

### Response Combination Rules
- The standard response is always present.
- If `gan` is present and `verdict` is `revise` or `reject`, `nextThoughtNeeded` is forced to `true`.
- `sessionId` is included whenever a session was resolved (i.e., when auditing is initiated).

## MCP Call Examples

List tools (MCP request):
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

Call tool:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "sequentialthinking",
    "arguments": {
      "thought": "Check this change.\n\n```gan-config\n{ \"threshold\": 90 }\n```",
      "nextThoughtNeeded": true,
      "thoughtNumber": 1,
      "totalThoughts": 3,
      "branchId": "audit-abc"
    }
  }
}
```

Response content (simplified):
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "nextThoughtNeeded": true,
  "branches": ["audit-abc"],
  "thoughtHistoryLength": 1,
  "sessionId": "audit-abc",
  "gan": {
    "overall": 88,
    "dimensions": [ { "name": "accuracy", "score": 90 } ],
    "verdict": "revise",
    "review": {
      "summary": "Consider adding types.",
      "inline": [ { "path": "src/x.ts", "line": 12, "comment": "Add type annotation" } ],
      "citations": ["repo://src/x.ts:1-40"]
    },
    "proposed_diff": null,
    "iterations": 1,
    "judge_cards": [ { "model": "internal", "score": 88 } ]
  }
}
```

