#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Fixed chalk import for ESM
import chalk from 'chalk';
import { GanAuditor } from './src/auditor/gan-auditor.js';
import { SynchronousAuditEngine } from './src/auditor/synchronous-audit-engine.js';
import { SynchronousSessionManager } from './src/session/synchronous-session-manager.js';
import { CompletionEvaluator } from './src/auditor/completion-evaluator.js';
import { LoopDetector } from './src/auditor/loop-detector.js';
import { EnhancedResponseBuilder } from './src/types/enhanced-response-builder.js';
import { createRuntimeConfig, getEnvironmentConfigSummary, isSynchronousModeReady } from './src/config/synchronous-config.js';
import { createResponseFormatter, buildEnhancedResponse, } from './src/types/response-builder.js';
// GansAuditorCodexThoughtData interface is now imported from types
class GansAuditorCodexServer {
    thoughtHistory = [];
    branches = {};
    runtimeConfig;
    ganAuditor;
    synchronousAuditEngine;
    sessionManager;
    completionEvaluator;
    loopDetector;
    enhancedResponseBuilder;
    constructor() {
        // Initialize runtime configuration from environment variables
        const { config, validation } = createRuntimeConfig();
        this.runtimeConfig = config;
        // Log configuration validation results
        if (!validation.isValid) {
            console.error(chalk.red('⚠️  Configuration validation failed:'));
            validation.errors.forEach(error => console.error(chalk.red(`   - ${error}`)));
        }
        if (validation.warnings.length > 0) {
            console.error(chalk.yellow('⚠️  Configuration warnings:'));
            validation.warnings.forEach(warning => console.error(chalk.yellow(`   - ${warning}`)));
        }
        // Check if synchronous mode is ready
        const readinessCheck = isSynchronousModeReady();
        if (!readinessCheck.ready) {
            console.error(chalk.yellow('⚠️  Synchronous mode not ready:'));
            readinessCheck.issues.forEach(issue => console.error(chalk.yellow(`   - ${issue}`)));
        }
        if (readinessCheck.recommendations.length > 0) {
            console.error(chalk.blue('💡 Recommendations:'));
            readinessCheck.recommendations.forEach(rec => console.error(chalk.blue(`   - ${rec}`)));
        }
        // Initialize GAN auditor with logging disabled by default to maintain existing console output format
        this.ganAuditor = new GanAuditor({
            logging: {
                enabled: false,
                level: 'error',
            },
        });
        // Initialize synchronous workflow components with configuration
        this.sessionManager = new SynchronousSessionManager({
            stateDirectory: this.runtimeConfig.synchronous.stateDirectory,
            maxSessionAge: this.runtimeConfig.concurrency.maxSessionAge,
            cleanupInterval: this.runtimeConfig.concurrency.sessionCleanupInterval,
        });
        this.synchronousAuditEngine = new SynchronousAuditEngine({
            auditTimeout: this.runtimeConfig.auditTimeout.auditTimeoutSeconds * 1000,
            enabled: this.runtimeConfig.synchronous.enabled,
        }, this.ganAuditor);
        this.completionEvaluator = new CompletionEvaluator(this.runtimeConfig.completionCriteria);
        this.loopDetector = new LoopDetector({
            stagnationThreshold: this.runtimeConfig.completionCriteria.stagnationCheck.similarityThreshold,
            stagnationStartLoop: this.runtimeConfig.completionCriteria.stagnationCheck.startLoop,
            minIterationsForAnalysis: 3,
            recentIterationsWindow: 3,
            identicalThreshold: 0.99,
        });
        this.enhancedResponseBuilder = new EnhancedResponseBuilder();
        // Log startup configuration summary
        if (!this.runtimeConfig.synchronous.enabled) {
            console.error(chalk.blue('🔄 Running in asynchronous mode (ENABLE_SYNCHRONOUS_AUDIT=false)'));
        }
        else {
            console.error(chalk.green('⚡ Running in synchronous mode'));
            console.error(chalk.gray(`   Timeout: ${this.runtimeConfig.auditTimeout.auditTimeoutSeconds}s`));
            console.error(chalk.gray(`   Max concurrent audits: ${this.runtimeConfig.concurrency.maxConcurrentAudits}`));
            console.error(chalk.gray(`   Max concurrent sessions: ${this.runtimeConfig.concurrency.maxConcurrentSessions}`));
        }
        // Set up periodic cleanup for stale Codex contexts
        if (this.runtimeConfig.synchronous.enabled) {
            setInterval(async () => {
                try {
                    await this.sessionManager.cleanupStaleContexts();
                }
                catch (error) {
                    console.error(chalk.yellow(`⚠️  Failed to cleanup stale contexts: ${error instanceof Error ? error.message : String(error)}`));
                }
            }, 5 * 60 * 1000); // Every 5 minutes
        }
    }
    validateThoughtData(input) {
        const data = input;
        if (!data.thought || typeof data.thought !== 'string') {
            throw new Error('Invalid thought: must be a string');
        }
        if (!data.thoughtNumber || typeof data.thoughtNumber !== 'number') {
            throw new Error('Invalid thoughtNumber: must be a number');
        }
        if (!data.totalThoughts || typeof data.totalThoughts !== 'number') {
            throw new Error('Invalid totalThoughts: must be a number');
        }
        if (typeof data.nextThoughtNeeded !== 'boolean') {
            throw new Error('Invalid nextThoughtNeeded: must be a boolean');
        }
        return {
            thought: data.thought,
            thoughtNumber: data.thoughtNumber,
            totalThoughts: data.totalThoughts,
            nextThoughtNeeded: data.nextThoughtNeeded,
            isRevision: data.isRevision,
            revisesThought: data.revisesThought,
            branchFromThought: data.branchFromThought,
            branchId: data.branchId,
            needsMoreThoughts: data.needsMoreThoughts,
        };
    }
    formatThought(thoughtData) {
        const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId } = thoughtData;
        let prefix = '';
        let context = '';
        if (isRevision) {
            prefix = chalk.yellow('🔄 Revision');
            context = ` (revising thought ${revisesThought})`;
        }
        else if (branchFromThought) {
            prefix = chalk.green('🌿 Branch');
            context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
        }
        else {
            prefix = chalk.blue('💭 Thought');
            context = '';
        }
        const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
        const border = '─'.repeat(Math.max(header.length, thought.length) + 4);
        return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
    }
    /**
     * Determine if a thought should trigger GAN auditing
     * Requirement 6.3: Add audit trigger detection (presence of code, diffs, or gan-config blocks)
     */
    shouldAuditThought(thought) {
        const envConfig = getEnvironmentConfigSummary();
        if (!envConfig.enableGanAuditing) {
            return false;
        }
        const thoughtText = thought.thought;
        // Check for gan-config blocks
        if (thoughtText.includes('```gan-config') || thoughtText.includes('```json') && thoughtText.includes('gan-config')) {
            return true;
        }
        // Check for code blocks (common programming languages)
        const codeBlockPatterns = [
            /```(?:javascript|typescript|python|java|cpp|c\+\+|csharp|c#|go|rust|php|ruby|swift|kotlin|scala|sql|html|css|json|yaml|xml|bash|shell|sh)/i,
            /```\w+/, // Any language identifier
            /```\s*\n.*(?:function|class|def|public|private|const|let|var|import|export)/s,
        ];
        for (const pattern of codeBlockPatterns) {
            if (pattern.test(thoughtText)) {
                return true;
            }
        }
        // Check for diff-like content
        const diffPatterns = [
            /^\+.*$/m, // Added lines
            /^-.*$/m, // Removed lines
            /^@@.*@@/m, // Diff headers
            /diff --git/,
            /index [a-f0-9]+\.\.[a-f0-9]+/,
        ];
        for (const pattern of diffPatterns) {
            if (pattern.test(thoughtText)) {
                return true;
            }
        }
        // Check for common programming keywords and patterns
        const programmingPatterns = [
            /\b(?:function|class|interface|type|const|let|var|def|public|private|protected|static|async|await|return|import|export|from|require)\b/,
            /\b(?:if|else|for|while|switch|case|try|catch|finally|throw|new|this|super|extends|implements)\b/,
            /[{}();].*[{}();]/s, // Multiple programming punctuation
            /\w+\([^)]*\)\s*[{=]/, // Function definitions/calls
        ];
        for (const pattern of programmingPatterns) {
            if (pattern.test(thoughtText)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Perform asynchronous GAN audit
     */
    async performAsyncAudit(thought, sessionId) {
        try {
            const auditResult = await this.ganAuditor.auditThought(thought, sessionId);
            const envConfig = getEnvironmentConfigSummary();
            if (!envConfig.disableThoughtLogging) {
                console.error(chalk.cyan(`🔍 GAN Audit Complete: ${auditResult.verdict.toUpperCase()} (${auditResult.overall}/100)`));
                if (auditResult.review.summary) {
                    console.error(chalk.gray(`   ${auditResult.review.summary}`));
                }
            }
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Combine standard and audit responses using enhanced response builder
     * Requirement 6.3: Implement response combination logic to merge standard and audit results
     * Requirement 5.1-5.5: Enhanced response formatting with validation
     */
    combineResponses(standard, audit, sessionId) {
        try {
            // Use the response builder for proper validation and formatting
            return buildEnhancedResponse(standard, audit || undefined, sessionId);
        }
        catch (error) {
            // If building enhanced response fails, fall back to basic combination
            console.error(chalk.yellow(`⚠️  Response building failed: ${error instanceof Error ? error.message : String(error)}`));
            const enhanced = {
                ...standard,
            };
            if (sessionId) {
                enhanced.sessionId = sessionId;
            }
            if (audit) {
                enhanced.gan = audit;
                // If audit suggests revision, override nextThoughtNeeded
                if (audit.verdict === 'revise' || audit.verdict === 'reject') {
                    enhanced.nextThoughtNeeded = true;
                }
            }
            return enhanced;
        }
    }
    /**
     * Process a thought with optional GAN auditing
     * Requirement 6.1: Maintain existing gansauditor_codex tool name and input schema
     * Requirement 6.2: Support all existing parameters and preserve functionality
     * Requirement 6.4: Preserve all existing functionality and maintain backward compatibility
     */
    async processThought(input) {
        try {
            const validatedInput = this.validateThoughtData(input);
            if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
                validatedInput.totalThoughts = validatedInput.thoughtNumber;
            }
            this.thoughtHistory.push(validatedInput);
            if (validatedInput.branchFromThought && validatedInput.branchId) {
                if (!this.branches[validatedInput.branchId]) {
                    this.branches[validatedInput.branchId] = [];
                }
                this.branches[validatedInput.branchId].push(validatedInput);
            }
            const envConfig = getEnvironmentConfigSummary();
            if (!envConfig.disableThoughtLogging) {
                const formattedThought = this.formatThought(validatedInput);
                console.error(formattedThought);
            }
            // Create standard response
            const standardResponse = {
                thoughtNumber: validatedInput.thoughtNumber,
                totalThoughts: validatedInput.totalThoughts,
                nextThoughtNeeded: validatedInput.nextThoughtNeeded,
                branches: Object.keys(this.branches),
                thoughtHistoryLength: this.thoughtHistory.length
            };
            // Handle synchronous vs asynchronous audit workflow
            if (this.runtimeConfig.synchronous.enabled && this.shouldAuditThought(validatedInput)) {
                return await this.processSynchronousWorkflow(validatedInput, standardResponse);
            }
            else {
                return await this.processAsynchronousWorkflow(validatedInput, standardResponse);
            }
        }
        catch (error) {
            // Use the response formatter for consistent error formatting
            const formatter = createResponseFormatter();
            return formatter.formatErrorResponse(error instanceof Error ? error : String(error));
        }
    }
    /**
     * Process synchronous audit workflow with iterative feedback
     * Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 4.4, 5.1-5.4
     */
    async processSynchronousWorkflow(thought, standardResponse) {
        try {
            const sessionId = thought.branchId || `session-${Date.now()}`;
            const loopId = thought.loopId;
            // Get or create session with LOOP_ID support
            const sessionState = await this.sessionManager.getOrCreateSession(sessionId, loopId);
            // Handle Codex context window lifecycle
            if (loopId && !sessionState.codexContextActive) {
                try {
                    const contextId = await this.sessionManager.startCodexContext(loopId);
                    sessionState.codexContextId = contextId;
                    sessionState.codexContextActive = true;
                    await this.sessionManager.updateSession(sessionState);
                    const envConfig = getEnvironmentConfigSummary();
                    if (!envConfig.disableThoughtLogging) {
                        console.error(chalk.blue(`🔗 Codex context started: ${contextId} for loop ${loopId}`));
                    }
                }
                catch (contextError) {
                    const envConfig = getEnvironmentConfigSummary();
                    if (!envConfig.disableThoughtLogging) {
                        console.error(chalk.yellow(`⚠️  Failed to start Codex context for loop ${loopId}: ${contextError instanceof Error ? contextError.message : String(contextError)}`));
                    }
                    // Continue without context - this is not a fatal error
                }
            }
            else if (loopId && sessionState.codexContextActive && sessionState.codexContextId) {
                try {
                    await this.sessionManager.maintainCodexContext(loopId, sessionState.codexContextId);
                    const envConfig = getEnvironmentConfigSummary();
                    if (!envConfig.disableThoughtLogging) {
                        console.error(chalk.gray(`🔗 Codex context maintained: ${sessionState.codexContextId}`));
                    }
                }
                catch (contextError) {
                    const envConfig = getEnvironmentConfigSummary();
                    if (!envConfig.disableThoughtLogging) {
                        console.error(chalk.yellow(`⚠️  Failed to maintain Codex context ${sessionState.codexContextId}: ${contextError instanceof Error ? contextError.message : String(contextError)}`));
                    }
                    // Context maintenance failure is not fatal, continue with audit
                }
            }
            // Perform synchronous audit
            const envConfig = getEnvironmentConfigSummary();
            if (!envConfig.disableThoughtLogging) {
                console.error(chalk.cyan(`🔍 GAN Audit: STARTING (synchronous mode)`));
            }
            const auditResult = await this.synchronousAuditEngine.auditAndWait(thought, sessionId);
            const envConfig2 = getEnvironmentConfigSummary();
            if (!envConfig2.disableThoughtLogging) {
                const status = auditResult.success ? 'COMPLETED' : (auditResult.timedOut ? 'TIMED OUT' : 'FAILED');
                console.error(chalk.cyan(`🔍 GAN Audit: ${status} (${auditResult.duration}ms)`));
                if (auditResult.success) {
                    console.error(chalk.cyan(`   Verdict: ${auditResult.review.verdict.toUpperCase()} (${auditResult.review.overall}/100)`));
                }
            }
            // Add iteration to session
            const iteration = {
                thoughtNumber: thought.thoughtNumber,
                code: thought.thought,
                auditResult: auditResult.review,
                timestamp: Date.now(),
            };
            await this.sessionManager.addIteration(sessionId, iteration);
            // Evaluate completion criteria
            const completionResult = this.completionEvaluator.evaluateCompletion(auditResult.review.overall, sessionState.currentLoop + 1);
            // Check for stagnation
            const stagnationAnalysis = this.loopDetector.detectStagnation(sessionState.iterations || [], sessionState.currentLoop + 1);
            // Check for termination conditions
            const terminationResult = this.completionEvaluator.shouldTerminate(sessionState);
            // Update session completion status
            if (completionResult.isComplete || terminationResult.shouldTerminate) {
                sessionState.isComplete = true;
                sessionState.completionReason = completionResult.reason;
                await this.sessionManager.updateSession(sessionState);
                // Terminate Codex context if active
                if (loopId && sessionState.codexContextActive) {
                    try {
                        const reason = completionResult.isComplete ? 'completion' : 'termination';
                        await this.sessionManager.terminateCodexContext(loopId, reason);
                        sessionState.codexContextActive = false;
                        sessionState.codexContextId = undefined;
                        await this.sessionManager.updateSession(sessionState);
                        const envConfig3 = getEnvironmentConfigSummary();
                        if (!envConfig3.disableThoughtLogging) {
                            console.error(chalk.blue(`🔗 Codex context terminated: ${reason} for loop ${loopId}`));
                        }
                    }
                    catch (contextError) {
                        const envConfig3 = getEnvironmentConfigSummary();
                        if (!envConfig3.disableThoughtLogging) {
                            console.error(chalk.yellow(`⚠️  Failed to terminate Codex context for loop ${loopId}: ${contextError instanceof Error ? contextError.message : String(contextError)}`));
                        }
                        // Force cleanup even if termination failed
                        sessionState.codexContextActive = false;
                        sessionState.codexContextId = undefined;
                        await this.sessionManager.updateSession(sessionState);
                    }
                }
            }
            // Build enhanced response with structured feedback
            const enhancedResponse = this.enhancedResponseBuilder.buildSynchronousResponse(standardResponse, auditResult.review, completionResult, sessionState, stagnationAnalysis, terminationResult.shouldTerminate ? terminationResult : undefined);
            // Override nextThoughtNeeded based on completion result
            enhancedResponse.nextThoughtNeeded = completionResult.nextThoughtNeeded;
            // Use the response formatter for consistent JSON serialization
            const formatter = createResponseFormatter();
            return formatter.formatAsToolResponse(enhancedResponse);
        }
        catch (error) {
            const envConfig4 = getEnvironmentConfigSummary();
            if (!envConfig4.disableThoughtLogging) {
                console.error(chalk.red(`⚠️  Synchronous workflow failed: ${error instanceof Error ? error.message : String(error)}`));
            }
            // Handle session failure with context cleanup
            const sessionId = thought.branchId || `session-${Date.now()}`;
            const loopId = thought.loopId;
            if (loopId) {
                try {
                    await this.sessionManager.handleSessionFailure(sessionId, error instanceof Error ? error : new Error(String(error)));
                }
                catch (cleanupError) {
                    const envConfig5 = getEnvironmentConfigSummary();
                    if (!envConfig5.disableThoughtLogging) {
                        console.error(chalk.red(`⚠️  Failed to cleanup after workflow failure: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`));
                    }
                }
            }
            // Fall back to asynchronous workflow on error
            return await this.processAsynchronousWorkflow(thought, standardResponse);
        }
    }
    /**
     * Process asynchronous audit workflow (backward compatibility)
     * Requirement 6.4: Preserve existing functionality and maintain backward compatibility
     */
    async processAsynchronousWorkflow(thought, standardResponse) {
        // Check if we should perform GAN auditing
        let auditResult = null;
        let sessionId = undefined;
        if (this.shouldAuditThought(thought)) {
            try {
                sessionId = thought.branchId;
                // Perform audit asynchronously but don't wait for it in the main flow
                // This maintains backward compatibility while adding audit capabilities
                this.performAsyncAudit(thought, sessionId).catch(auditError => {
                    const envConfig = getEnvironmentConfigSummary();
                    if (!envConfig.disableThoughtLogging) {
                        console.error(chalk.red(`⚠️  GAN Audit failed: ${auditError instanceof Error ? auditError.message : String(auditError)}`));
                    }
                });
                const envConfig = getEnvironmentConfigSummary();
                if (!envConfig.disableThoughtLogging) {
                    console.error(chalk.cyan(`🔍 GAN Audit: INITIATED (processing asynchronously)`));
                }
            }
            catch (auditError) {
                // Log audit error but don't fail the entire request
                const envConfig5 = getEnvironmentConfigSummary();
                if (!envConfig5.disableThoughtLogging) {
                    console.error(chalk.red(`⚠️  GAN Audit failed to start: ${auditError instanceof Error ? auditError.message : String(auditError)}`));
                }
            }
        }
        // Combine responses using enhanced response formatting
        const enhancedResponse = this.combineResponses(standardResponse, auditResult, sessionId);
        // Use the response formatter for consistent JSON serialization
        const formatter = createResponseFormatter();
        return formatter.formatAsToolResponse(enhancedResponse);
    }
}
const GANSAUDITOR_CODEX_TOOL = {
    name: "gansauditor_codex",
    description: `A detailed tool for dynamic and reflective problem-solving through thoughts with integrated GAN-style code auditing.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out
- Code development and review with automated quality assessment

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer
- **NEW: Automatic code auditing when code, diffs, or gan-config blocks are detected**
- **NEW: Session-based audit continuity across multiple interactions**
- **NEW: Configurable audit parameters through inline gan-config blocks**

GAN Auditing Features (when ENABLE_GAN_AUDITING=true):
- Automatically detects code blocks, diffs, and programming content
- Provides structured feedback with scores, inline comments, and improvement suggestions
- Maintains audit sessions across multiple tool calls using branch_id
- Supports inline configuration via gan-config JSON blocks
- Returns enhanced responses with audit results including verdict (pass/revise/reject)
- Integrates with repository context for accurate code review

Inline Configuration (gan-config):
You can customize audit behavior by including a gan-config block in your thought:
\`\`\`gan-config
{
  "task": "Review this code for security vulnerabilities",
  "scope": "diff",
  "threshold": 90,
  "judges": ["internal"],
  "maxCycles": 2
}
\`\`\`

Parameters explained:
- thought: Your current thinking step, which can include:
* Regular analytical steps
* Revisions of previous thoughts
* Questions about previous decisions
* Realizations about needing more analysis
* Changes in approach
* Hypothesis generation
* Hypothesis verification
* Code blocks for review and auditing
* Inline gan-config blocks for audit customization
- next_thought_needed: True if you need more thinking, even if at what seemed like the end
- thought_number: Current number in sequence (can go beyond initial total if needed)
- total_thoughts: Current estimate of thoughts needed (can be adjusted up/down)
- is_revision: A boolean indicating if this thought revises previous thinking
- revises_thought: If is_revision is true, which thought number is being reconsidered
- branch_from_thought: If branching, which thought number is the branching point
- branch_id: Identifier for the current branch (also used as GAN audit session ID)
- needs_more_thoughts: If more thoughts are needed

Enhanced Response Format:
The tool now returns additional fields when GAN auditing is active:
- sessionId: Unique identifier for the audit session
- gan: Complete audit results including scores, verdict, and feedback

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate
8. Verify the hypothesis based on the Chain of Thought steps
9. Repeat the process until satisfied with the solution
10. Provide a single, ideally correct answer as the final output
11. Only set next_thought_needed to false when truly done and a satisfactory answer is reached
12. **NEW: Use branch_id consistently for audit session continuity**
13. **NEW: Include gan-config blocks to customize audit behavior when needed**`,
    inputSchema: {
        type: "object",
        properties: {
            thought: {
                type: "string",
                description: "Your current thinking step"
            },
            nextThoughtNeeded: {
                type: "boolean",
                description: "Whether another thought step is needed"
            },
            thoughtNumber: {
                type: "integer",
                description: "Current thought number (numeric value, e.g., 1, 2, 3)",
                minimum: 1
            },
            totalThoughts: {
                type: "integer",
                description: "Estimated total thoughts needed (numeric value, e.g., 5, 10)",
                minimum: 1
            },
            isRevision: {
                type: "boolean",
                description: "Whether this revises previous thinking"
            },
            revisesThought: {
                type: "integer",
                description: "Which thought is being reconsidered",
                minimum: 1
            },
            branchFromThought: {
                type: "integer",
                description: "Branching point thought number",
                minimum: 1
            },
            branchId: {
                type: "string",
                description: "Branch identifier"
            },
            loopId: {
                type: "string",
                description: "Loop identifier for Codex context window continuity across iterative improvements"
            },
            needsMoreThoughts: {
                type: "boolean",
                description: "If more thoughts are needed"
            }
        },
        required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
    }
};
const server = new Server({
    name: "gansauditor-codex-server",
    version: "0.2.0",
}, {
    capabilities: {
        tools: {},
    },
});
const gansAuditorCodexServer = new GansAuditorCodexServer();
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [GANSAUDITOR_CODEX_TOOL],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "gansauditor_codex") {
        const result = await gansAuditorCodexServer.processThought(request.params.arguments);
        return result;
    }
    return {
        content: [{
                type: "text",
                text: `Unknown tool: ${request.params.name}`
            }],
        isError: true
    };
});
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GansAuditor_Codex MCP Server running on stdio");
}
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map