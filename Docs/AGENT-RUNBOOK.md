# AGENT Runbook

Operational guidance for using and maintaining the Sequential Thinking MCP server with GAN Auditor.

## Prerequisites
- Node.js ≥ 18
- npm
- (Optional) Codex CLI in PATH as `codex` for real audits. Without it, the system returns structured fallback audits.

## Build, Test, Run
- Install deps: `npm install`
- Build: `npm run build`
- Run tests (full): `npm run test:run`
  - For focused auditor tests: `npx vitest run src/auditor/**.test.ts src/auditor/**/**.test.ts`
- Start MCP server (stdio): `node dist/index.js`

## Configuration
- Environment variables:
  - `ENABLE_GAN_AUDITING=true` to enable auditing
  - `DISABLE_THOUGHT_LOGGING=true` to suppress decorative logs
- Session state directory: `.mcp-gan-state` (default)
- Codex settings (if embedding GanAuditor directly):
  - `codexJudge.executable` default: `codex`
  - `codexJudge.timeout` default: 30000 ms
  - `codexJudge.retries` default: 2 (auditor orchestration may prefer graceful fallback instead of retries)

## Smoke Tests
1) Build and launch:
   - `npm run build`
   - `ENABLE_GAN_AUDITING=true node dist/index.js`
   - Expect: `Sequential Thinking MCP Server running on stdio`
2) From an MCP client, list tools and call `sequentialthinking` with a basic thought.
3) Include a small `gan-config` block and code snippet to trigger an audit; verify the JSON response content includes `gan`.

## Using Inline `gan-config`
- Use fenced block with JSON inside the `thought` text.
- Recommended minimal override:
  - Set `scope` to `diff` (fastest) when working with VCS changes
  - Increase `threshold` for stricter reviews (e.g., 90+)
  - Use `paths` scope for targeted files (requires `paths` array)

## Sessions & Persistence
- Provide `branchId` consistently to reuse the same audit session across thoughts.
- Session data includes last review and history; stored on disk.
- To reset, delete individual session files within `.mcp-gan-state/`.

## Troubleshooting
- Codex not found
  - Ensure `codex --version` works
  - Set `codexJudge.executable` to a full path if necessary
  - The system will fall back to a structured `gan` response with `verdict: "revise"`
- Large context / timeouts
  - Prefer `scope: "diff"` or provide explicit `paths`
  - Reduce file sizes and snippet lengths in thoughts
- No `gan` in response
  - Ensure `ENABLE_GAN_AUDITING=true`
  - Include a code block or a `gan-config` fenced block to trigger auditing

## Conventions
- Keep thoughts short and focused; add more steps rather than a single massive one
- Use `isRevision`/`revisesThought` when backtracking
- Use `branchFromThought`/`branchId` for alternative explorations

## Change Management
- See `CHANGELOG.md`
- Tests for orchestration in `src/auditor/__tests__/gan-auditor-integration.test.ts`
- Error handling and fallbacks in `src/utils/error-handler.ts`

