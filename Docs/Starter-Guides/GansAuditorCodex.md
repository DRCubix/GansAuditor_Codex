how to mesh **GansAuditor_Codex** with a **GAN‑style auditor** that keeps state across editor→tool→editor loops.

Below is a **drop‑in replacement** for your `index.ts` that:

* Keeps the **same tool name** (`gansauditor_codex`) and input schema your editors already know.
* Treats each **thought** as the *candidate output from the editor*.
* Runs a **Codex CLI** "GAN judge" over the repo snapshot/diff and that candidate.
* Returns a **strict JSON bundle** containing: verdict (`pass|revise|reject`), per‑dimension scores, actionable edits, and an optional **unified diff** suggestion.
* **Persists state** per session (using `branchId` or an auto ID), so the editor can call again "from where we left off" until the MCP tool agrees it's done (verdict `pass`).

> **How you'll use it from any editor (Cursor, Claude Code, Kiro, …):**
>
> 1. The editor calls the tool with a *thought* (its current output or patch).
> 2. The tool audits and returns **edits + proposed diff** and sets `nextThoughtNeeded: true` (unless it's satisfied).
> 3. The editor applies changes and calls the tool again with the new *thought*.
> 4. Repeat until the tool returns `nextThoughtNeeded: false` (verdict `pass`).

---

## What changes vs your original

* Adds a **GAN judge** function that shells out to `codex exec` (non‑interactive, headless).
* Adds a **Repo Context Pack** (tiny snapshot/diff + top‑K snippets) automatically per call.
* Extends the **response** to include a `gan` block (scores, edits, diff).
* Uses `branchId` (already in your schema) as the **session key** so we keep history & thresholds across calls.
* Allows an optional **inline config** inside the first thought (or any thought) using a fenced block:

````text
```gan-config
{ "task": "Refactor payments API", "scope": "diff", "threshold": 88,
  "judges": ["internal"], "maxCycles": 1, "candidates": 1 }
````

````

If omitted, sensible defaults apply.

---

## Drop‑in replacement: `index.ts`

> This keeps your ESM style and the public tool contract exactly the same.  
> Requires `codex` on PATH and Node 18+.

```ts
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import chalk from "chalk";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

/* =========================
   Types (unchanged + GAN)
========================= */

interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;           // <-- we'll treat this as sessionId when present
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
}

type GanVerdict = "pass" | "revise" | "reject";
interface GanJudgeCard {
  model: string;
  score: number;
  notes?: string;
}
interface GanReview {
  overall: number;
  dimensions: { name: string; score: number }[];
  verdict: GanVerdict;
  review: {
    summary: string;
    inline: { path: string; line: number; comment: string }[];
    citations: string[]; // repo://path:start-end
  };
  proposed_diff?: string | null;
  iterations: number;
  judge_cards: GanJudgeCard[];
}

interface SessionConfig {
  task: string;
  scope: "diff" | "paths" | "workspace";
  paths?: string[];
  threshold: number;
  maxCycles: number;
  candidates: number;
  judges: string[];       // ["internal"] by default; can be MCP judges later
  applyFixes: boolean;    // we only propose diffs; editors apply
}

interface SessionState {
  id: string;
  config: SessionConfig;
  history: { thoughtNumber: number; verdict: GanVerdict; overall: number }[];
  lastGan?: GanReview;
}

/* =========================
   GansAuditor_Codex Server
========================= */

class GansAuditorCodexServer {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};
  private disableThoughtLogging: boolean;
  private sessions: Map<string, SessionState> = new Map();
  private stateDir = path.join(process.cwd(), ".mcp-gan-state");

  constructor() {
    this.disableThoughtLogging = (process.env.DISABLE_THOUGHT_LOGGING || "").toLowerCase() === "true";
    if (!fs.existsSync(this.stateDir)) fs.mkdirSync(this.stateDir, { recursive: true });
  }

  /* ---------- Core: process a single step ---------- */
  public async processThought(input: unknown) {
    try {
      const t = this.validateThoughtData(input);
      const sessionId = t.branchId || this.defaultSessionId();
      const session = this.ensureSession(sessionId, t);

      // 1) Record thought
      this.thoughtHistory.push(t);
      if (t.branchFromThought && t.branchId) {
        if (!this.branches[t.branchId]) this.branches[t.branchId] = [];
        this.branches[t.branchId].push(t);
      }
      if (!this.disableThoughtLogging) {
        console.error(this.formatThought(t, session));
      }

      // 2) Build repo context pack (diff/paths/workspace, small + relevant)
      const contextPack = await buildContextPack(session.config);

      // 3) Run GAN audit via Codex CLI (headless)
      const gan = await runCodexGanAudit({
        task: session.config.task,
        candidate: t.thought,
        scope: { mode: session.config.scope, paths: session.config.paths },
        rubric: {
          dimensions: [
            { name: "accuracy", weight: 0.35 },
            { name: "completeness", weight: 0.25 },
            { name: "clarity", weight: 0.15 },
            { name: "actionability", weight: 0.15 },
            { name: "human_likeness", weight: 0.10 }
          ]
        },
        budget: {
          maxCycles: Math.max(1, session.config.maxCycles),
          candidates: Math.max(1, session.config.candidates),
          threshold: session.config.threshold
        },
        judges: session.config.judges,
        contextPack
      });

      session.lastGan = gan;
      session.history.push({ thoughtNumber: t.thoughtNumber, verdict: gan.verdict, overall: gan.overall });
      this.persist(session);

      // 4) Decide next step
      const satisfied = gan.verdict === "pass" && gan.overall >= session.config.threshold;
      const nextThoughtNeeded = !satisfied;

      const response = {
        thoughtNumber: t.thoughtNumber,
        totalThoughts: Math.max(t.totalThoughts, t.thoughtNumber),
        nextThoughtNeeded,
        branches: Object.keys(this.branches),
        thoughtHistoryLength: this.thoughtHistory.length,
        sessionId,
        gan
      };

      return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: "failed"
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /* ---------- Validate (unchanged inputs) + tiny extension via inline config ---------- */
  private validateThoughtData(input: unknown): ThoughtData {
    const data = input as Record<string, unknown>;
    if (!data.thought || typeof data.thought !== "string") throw new Error("Invalid thought: must be a string");
    if (!data.thoughtNumber || typeof data.thoughtNumber !== "number") throw new Error("Invalid thoughtNumber: must be a number");
    if (!data.totalThoughts || typeof data.totalThoughts !== "number") throw new Error("Invalid totalThoughts: must be a number");
    if (typeof data.nextThoughtNeeded !== "boolean") throw new Error("Invalid nextThoughtNeeded: must be a boolean");
    return {
      thought: String(data.thought),
      thoughtNumber: Number(data.thoughtNumber),
      totalThoughts: Number(data.totalThoughts),
      nextThoughtNeeded: Boolean(data.nextThoughtNeeded),
      isRevision: data.isRevision as boolean | undefined,
      revisesThought: data.revisesThought as number | undefined,
      branchFromThought: data.branchFromThought as number | undefined,
      branchId: data.branchId as string | undefined,
      needsMoreThoughts: data.needsMoreThoughts as boolean | undefined,
    };
  }

  /* ---------- Session handling ---------- */
  private ensureSession(id: string, t: ThoughtData): SessionState {
    let s = this.sessions.get(id) ?? this.load(id);
    if (!s) {
      const cfg = extractInlineConfig(t.thought) ?? defaultConfig();
      s = { id, config: cfg, history: [] };
    } else {
      // Allow config refresh if a new gan-config block appears
      const maybeCfg = extractInlineConfig(t.thought);
      if (maybeCfg) s.config = { ...s.config, ...maybeCfg };
    }
    this.sessions.set(id, s);
    return s;
  }

  private persist(s: SessionState) {
    const f = path.join(this.stateDir, `${s.id}.json`);
    fs.writeFileSync(f, JSON.stringify(s, null, 2), "utf8");
  }
  private load(id: string): SessionState | undefined {
    const f = path.join(this.stateDir, `${id}.json`);
    if (!fs.existsSync(f)) return undefined;
    try { return JSON.parse(fs.readFileSync(f, "utf8")) as SessionState; }
    catch { return undefined; }
  }
  private defaultSessionId(): string {
    const cwd = process.cwd();
    const salt = String(Date.now());
    return crypto.createHash("sha1").update(cwd + os.userInfo().username + salt).digest("hex").slice(0, 8);
  }

  /* ---------- Pretty console box (your original) ---------- */
  private formatThought(t: ThoughtData, s: SessionState): string {
    const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId } = t;
    let prefix = "", context = "";
    if (isRevision) { prefix = chalk.yellow("🔄 Revision"); context = ` (revising thought ${revisesThought})`; }
    else if (branchFromThought) { prefix = chalk.green("🌿 Branch"); context = ` (from thought ${branchFromThought}, ID: ${branchId})`; }
    else { prefix = chalk.blue("💭 Thought"); }
    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}  [session: ${s.id}]`;
    const border = "─".repeat(Math.max(header.length, Math.min(thought.length, 100)) + 4);
    return `\n┌${border}┐\n│ ${header} │\n├${border}┤\n│ ${trimForBox(thought, border.length - 2)} │\n└${border}┘`;
  }
}

/* =========================
   Tool definition (unchanged)
========================= */

const GANSAUDITOR_CODEX_TOOL: Tool = {
  name: "gansauditor_codex",
  description: `GansAuditor_Codex with GAN-style auditing.
Send the editor's output as 'thought'. The tool audits (GAN) and returns edits/diff until it passes.
Optionally include a fenced gan-config block in any thought to set task/scope/threshold/judges.

gan-config example:
\`\`\`gan-config
{ "task":"Refactor payments API", "scope":"diff", "threshold":88, "judges":["internal"], "maxCycles":1, "candidates":1 }
\`\`\``,
  inputSchema: {
    type: "object",
    properties: {
      thought: { type: "string", description: "Editor output (analysis, code, or unified diff). May include a gan-config fenced block." },
      nextThoughtNeeded: { type: "boolean", description: "Whether another step is needed (editor sets; tool returns its own assessment too)" },
      thoughtNumber: { type: "integer", minimum: 1 },
      totalThoughts: { type: "integer", minimum: 1 },
      isRevision: { type: "boolean" },
      revisesThought: { type: "integer", minimum: 1 },
      branchFromThought: { type: "integer", minimum: 1 },
      branchId: { type: "string", description: "Acts as sessionId for resume" },
      needsMoreThoughts: { type: "boolean" }
    },
    required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
  }
};

const server = new Server(
  { name: "gansauditor-codex-server", version: "0.3.0" },
  { capabilities: { tools: {} } }
);

const gansAuditorCodexServer = new GansAuditorCodexServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [GANSAUDITOR_CODEX_TOOL] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "gansauditor_codex") {
    return await gansAuditorCodexServer.processThought(request.params.arguments);
  }
  return { content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }], isError: true };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GansAuditor_Codex + GAN Auditor MCP Server running on stdio");
}
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});

/* =========================
   Helpers: Config extraction
========================= */

function defaultConfig(): SessionConfig {
  return {
    task: "Audit and improve the provided candidate against repo context.",
    scope: "diff",
    threshold: 85,
    maxCycles: 1,
    candidates: 1,
    judges: ["internal"], // Codex as strict judge; can be extended to external MCP judges
    applyFixes: false
  };
}

function extractInlineConfig(thought: string): Partial<SessionConfig> | null {
  const m = thought.match(/```gan-config\s*([\s\S]*?)```/i);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1]);
    const cfg: Partial<SessionConfig> = {};
    if (typeof obj.task === "string") cfg.task = obj.task;
    if (obj.scope === "diff" || obj.scope === "paths" || obj.scope === "workspace") cfg.scope = obj.scope;
    if (Array.isArray(obj.paths)) cfg.paths = obj.paths.map(String);
    if (Number.isFinite(obj.threshold)) cfg.threshold = Number(obj.threshold);
    if (Number.isFinite(obj.maxCycles)) cfg.maxCycles = Number(obj.maxCycles);
    if (Number.isFinite(obj.candidates)) cfg.candidates = Number(obj.candidates);
    if (Array.isArray(obj.judges)) cfg.judges = obj.judges.map(String);
    if (typeof obj.applyFixes === "boolean") cfg.applyFixes = obj.applyFixes;
    return cfg;
  } catch {
    return null;
  }
}

/* =========================
   Repo Context Pack builder
========================= */

async function buildContextPack(cfg: SessionConfig): Promise<string> {
  const header = await gitHeader();
  const tree = await repoTree(2);
  const base = `REPO:\n${header}\n\n${tree}`;

  if (cfg.scope === "diff") {
    const diff = await safeExec("git", ["diff", "--unified=20", "--no-color", "origin/main...HEAD"]);
    return `${base}\n\n=== DIFF ===\n${truncate(diff, 20_000)}`;
  }

  if (cfg.scope === "paths" && cfg.paths?.length) {
    const snippets = collectTopSnippets(cfg.paths, 12, 800);
    return `${base}\n\n=== EXCERPTS ===\n${snippets}`;
  }

  // workspace (fallback): take top files by keyword hits
  const files = pickRelevantFiles(process.cwd(), 30);
  const snippets = collectTopSnippets(files, 12, 800);
  return `${base}\n\n=== EXCERPTS ===\n${snippets}`;
}

async function gitHeader() {
  const branch = (await safeExec("git", ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
  const hash = (await safeExec("git", ["rev-parse", "--short", "HEAD"])).trim();
  return `branch: ${branch} @ ${hash}`;
}
async function repoTree(depthMax: number) {
  const lines: string[] = [];
  const skip = new Set([".git", "node_modules", "dist", "build", "target", ".next", ".venv"]);
  function walk(dir: string, depth: number) {
    if (depth > depthMax) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { lines.push(`${"  ".repeat(depth)}- ${e.name}/`); walk(p, depth + 1); }
      else { lines.push(`${"  ".repeat(depth)}- ${e.name}`); }
    }
  }
  walk(process.cwd(), 0);
  return lines.join("\n");
}
function pickRelevantFiles(root: string, limit: number): string[] {
  const out: string[] = [];
  const allowed = new Set([".md",".txt",".ts",".tsx",".js",".jsx",".py",".go",".rs",".java",".kt",".c",".cc",".cpp",".cs",".rb",".swift",".sh",".yaml",".yml",".toml",".json"]);
  const skip = new Set([".git","node_modules","dist","build","target",".next",".venv",".idea",".vscode"]);
  function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!skip.has(e.name)) walk(p); }
      else {
        if (allowed.has(path.extname(e.name)) && fs.statSync(p).size < 200_000) out.push(p);
      }
    }
  }
  walk(root);
  // naive "relevance": filenames with common code terms first
  out.sort((a, b) => scoreName(b) - scoreName(a));
  return out.slice(0, limit);
}
function scoreName(p: string) {
  const n = p.toLowerCase();
  return ["readme","package","api","route","controller","service","model","schema","config","index","server","main"].reduce((s,w)=> s + (n.includes(w) ? 2 : 0), 0) + (/\.(ts|tsx|py|go|rs|js|java|kt|c|cpp|cs)$/.test(n) ? 1 : 0);
}
function collectTopSnippets(paths: string[] | undefined, topK: number, approxTokens: number) {
  if (!paths?.length) return "";
  const chunks: { path: string; start: number; end: number; text: string; score: number }[] = [];
  for (const p of paths) {
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) continue;
    const text = fs.readFileSync(p, "utf8");
    const lines = text.split(/\n/);
    for (let i=0;i<lines.length;i+=300) {
      const start = i+1, end = Math.min(lines.length, i+300);
      const snippet = lines.slice(i, end).join("\n");
      const score = (snippet.match(/\bTODO|FIXME|error|handler|route|schema|test|auth|payment|config\b/gi)?.length ?? 0);
      chunks.push({ path: p, start, end, text: snippet, score });
    }
  }
  chunks.sort((a,b)=> b.score - a.score);
  const pick = chunks.slice(0, topK);
  return pick.map(c => `# ${c.path}:${c.start}-${c.end}\n${c.text}`).join("\n\n");
}

/* =========================
   Codex CLI GAN Audit (headless)
========================= */

async function runCodexGanAudit(args: {
  task: string;
  candidate: string;
  scope: { mode: "diff"|"paths"|"workspace"; paths?: string[] };
  rubric: { dimensions: { name: string; weight: number }[] };
  budget: { maxCycles: number; candidates: number; threshold: number };
  judges: string[];                // ["internal"] supported in this MVP
  contextPack: string;
}): Promise<GanReview> {
  const controller = `
You are the GAN Judge. Evaluate the CANDIDATE against the repository context.

Return EXACT JSON with:
{ "overall":0..100,
  "dimensions":[{"name":"accuracy","score":0..100},...],
  "verdict":"pass"|"revise"|"reject",
  "review":{"summary":"...", "inline":[{"path":"...","line":0,"comment":"..."}], "citations":["repo://path:start-end"]},
  "proposed_diff": "unified diff or null",
  "iterations": 1,
  "judge_cards": [{"model":"codex-internal","score":0..100,"notes":"..."}]
}

SCORING GUIDE (strict):
- Accuracy (repo-grounded): Penalize any claim not supported by CONTEXT. Reward correct [repo://...] citations.
- Completeness: Does the candidate fully address TASK and obvious edge cases?
- Clarity: Is it readable and well-structured?
- Actionability: Are fixes/tests or diffs concrete and correct?
- Human_likeness: Avoid boilerplate hedging and verbosity.

CONTEXT (read-only):
${args.contextPack}

TASK:
${args.task}

CANDIDATE:
${args.candidate}

RUBRIC:
${JSON.stringify(args.rubric.dimensions)}
  `.trim();

  const out = await codexExec(controller);
  const json = greedyParseJson(out);
  // Minimal shape validation; fall back defaults if missing fields
  return {
    overall: clamp(json.overall ?? 0, 0, 100),
    dimensions: Array.isArray(json.dimensions) ? json.dimensions : [],
    verdict: (json.verdict === "pass" || json.verdict === "revise" || json.verdict === "reject") ? json.verdict : "revise",
    review: {
      summary: json?.review?.summary ?? "",
      inline: Array.isArray(json?.review?.inline) ? json.review.inline : [],
      citations: Array.isArray(json?.review?.citations) ? json.review.citations : []
    },
    proposed_diff: json.proposed_diff ?? null,
    iterations: json.iterations ?? 1,
    judge_cards: Array.isArray(json.judge_cards) ? json.judge_cards : [{ model: "codex-internal", score: json.overall ?? 0 }]
  };
}

function codexExec(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", ["exec", prompt], { cwd: process.cwd(), env: process.env, stdio: ["ignore","pipe","pipe"] });
    let out = "", err = "";
    child.stdout.on("data", d => out += d.toString());
    child.stderr.on("data", d => err += d.toString());
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(out) : reject(new Error(`codex exec failed (${code}): ${err.slice(0,800)}`)));
  });
}

/* =========================
   Tiny utils
========================= */

async function safeExec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: process.cwd(), env: process.env, stdio: ["ignore","pipe","pipe"] });
    let out = "";
    child.stdout.on("data", d => out += d.toString());
    child.on("close", () => resolve(out));
  });
}

function greedyParseJson(s: string) {
  try { return JSON.parse(s.trim()); } catch {}
  const m = s.match(/\{[\s\S]*\}$/);
  if (!m) throw new Error("GAN judge did not return JSON");
  return JSON.parse(m[0]);
}
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
function truncate(s: string, maxBytes: number) { const buf = Buffer.from(s, "utf8"); return buf.length <= maxBytes ? s : buf.subarray(0, maxBytes).toString("utf8"); }
function trimForBox(s: string, width: number) {
  const lines = s.split(/\n/)[0] ?? "";
  const txt = lines.length > width ? lines.slice(0, width-3) + "..." : lines;
  return txt.padEnd(width, " ");
}
````

---

## How editors should call it (no new schema to learn)

Your **tool name stays** `gansauditor_codex`. The editor should:

* Send its output (analysis, code, or a **unified diff**) as `thought`.
* Maintain `thoughtNumber` and `totalThoughts` as usual.
* Pass a **session key** with `branchId` (recommended) so the server can **resume** cleanly.
* Optionally include a **`gan-config` fenced block** in the first thought (or any later thought) to set `task`, `scope` (`diff|paths|workspace`), `threshold`, etc.

**Example call (editor → MCP tool):**

````json
{
  "name": "gansauditor_codex",
  "arguments": {
    "thought": "```gan-config\n{ \"task\":\"Refactor payments API\", \"scope\":\"diff\", \"threshold\":88 }\n```\n\nHere is my proposed patch:\n*** begin diff ***\n<your unified diff here>\n*** end diff ***",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 3,
    "branchId": "payments-refactor"
  }
}
````

**Example response (tool → editor)** — the editor should read `gan.verdict`, show `gan.review.inline`, optionally apply `gan.proposed_diff`, and **call again** with the revised output until `nextThoughtNeeded` becomes `false`:

```json
{
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "nextThoughtNeeded": true,
  "sessionId": "payments-refactor",
  "gan": {
    "overall": 86,
    "verdict": "revise",
    "review": { "summary": "...", "inline": [ { "path": "src/payments/api.ts", "line": 143, "comment": "..." } ], "citations": ["repo://src/payments/api.ts:120-180"] },
    "proposed_diff": "--- a/src/payments/api.ts\n+++ b/src/payments/api.ts\n@@ ...",
    "judge_cards": [{ "model": "codex-internal", "score": 86 }]
  }
}
```

The editor then generates a new *thought* (revised patch or explanation) and sends it with `thoughtNumber: 2`. The server will use the **same session** (via `branchId`) and continue until `gan.verdict === "pass"` **and** `gan.overall ≥ threshold`, at which point it will return `nextThoughtNeeded: false`.

---

## Notes & options

* **No background work.** This server only runs when called and returns a complete audit result in the same response.
* **State & resume.** Session state is stored in `.mcp-gan-state/<session>.json`. This lets you close/open the editor and continue.
* **Codex as judge.** This MVP uses **Codex CLI** internally as the strict judge ("codex‑internal"). If you later want **cross‑model** judging, you can:

  * Register additional MCP judges (e.g., `judge-openai`, `judge-gemini`), and
  * Update `judges` in `gan-config` to include them. The controller can then call those tools and average scores (the wrapper already anticipates this).
* **Apply fixes.** We only **propose diffs**. The editor applies them; then calls the tool again. This keeps the MCP server safe and editor‑controlled.
* **Scope.** `scope: "diff"` is the fastest and most accurate for PR‑like workflows. Use `"paths"` to focus audits on subtrees; `"workspace"` is a broader sweep with top‑K excerpts.

---

## Quick checklist to run

1. Install Codex CLI and ensure `codex` is on PATH (and configured with your models/API keys).
2. Replace your `index.ts` with the version above, build, and register the server to your editors (stdio).
3. In the editor, call `gansauditor_codex` exactly as before—just pass the repo patch/analysis as the **thought**, optionally with `gan-config`.
4. Loop until `nextThoughtNeeded: false`.

If you want, I can also produce a **tiny test harness** that simulates an editor loop (generate → audit → apply diff → re‑audit) so you can validate the end‑to‑end flow locally in one command.