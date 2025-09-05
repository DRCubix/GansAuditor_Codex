/**
 * Codex CLI integration for GAN auditing
 *
 * This module implements the CodexJudge class that executes Codex CLI commands
 * for code analysis and audit feedback generation.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
import { spawn } from 'child_process';
import { DEFAULT_AUDIT_RUBRIC } from '../types/gan-types.js';
/**
 * Error thrown when Codex CLI is not available
 */
export class CodexNotAvailableError extends Error {
    constructor(message = 'Codex CLI is not available') {
        super(message);
        this.name = 'CodexNotAvailableError';
    }
}
/**
 * Error thrown when Codex CLI execution times out
 */
export class CodexTimeoutError extends Error {
    constructor(timeout) {
        super(`Codex CLI execution timed out after ${timeout}ms`);
        this.name = 'CodexTimeoutError';
    }
}
/**
 * Error thrown when Codex CLI returns invalid response
 */
export class CodexResponseError extends Error {
    rawResponse;
    constructor(message, rawResponse) {
        super(message);
        this.rawResponse = rawResponse;
        this.name = 'CodexResponseError';
    }
}
/**
 * Implementation of Codex CLI integration for GAN auditing
 *
 * Requirement 7.1: Execute Codex CLI commands in headless mode
 * Requirement 7.2: Handle errors gracefully with fallback responses
 * Requirement 7.3: Parse JSON responses and validate structure
 * Requirement 7.4: Attempt greedy parsing for malformed responses
 * Requirement 7.5: Provide clear error messages for unavailable Codex
 *
 * Enhanced for prompt-driven auditing (Requirements 6.2):
 * - Structured prompt generation with system prompt injection
 * - Workflow step result parsing from Codex responses
 * - Response validation for prompt-driven outputs
 */
export class CodexJudge {
    config;
    constructor(config = {}) {
        this.config = {
            executable: 'codex',
            timeout: 30000,
            retries: 2,
            ...config,
        };
    }
    /**
     * Execute audit using Codex CLI
     * Requirement 7.1: Execute Codex CLI commands in headless mode
     */
    async executeAudit(request) {
        // Check if Codex is available
        if (!(await this.isAvailable())) {
            throw new CodexNotAvailableError('Codex CLI is not available. Please install Codex CLI to use GAN auditing features.');
        }
        let lastError = null;
        // Retry logic for robustness
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                const response = await this.executeCodexCommand(request);
                return this.parseCodexResponse(response);
            }
            catch (error) {
                lastError = error;
                // Don't retry on certain error types
                if (error instanceof CodexNotAvailableError ||
                    error instanceof CodexResponseError) {
                    throw error;
                }
                // For timeout errors, return fallback response immediately
                if (error instanceof CodexTimeoutError) {
                    return this.createFallbackResponse(request, 'Codex CLI execution timed out');
                }
                // Wait before retry (exponential backoff)
                if (attempt < this.config.retries) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        // All retries failed, check if we should return fallback or throw
        if (lastError instanceof CodexTimeoutError) {
            return this.createFallbackResponse(request, 'Codex CLI execution timed out');
        }
        // For other errors, throw them
        throw lastError || new Error('Unknown error during Codex execution');
    }
    /**
     * Check if Codex CLI is available
     * Requirement 7.5: Provide clear error messages for unavailable Codex
     */
    async isAvailable() {
        try {
            await this.executeCommand(['-h'], { timeout: 5000 });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get Codex CLI version information
     */
    async getVersion() {
        try {
            const result = await this.executeCommand(['--version'], { timeout: 5000 });
            return result.stdout.trim();
        }
        catch {
            return null;
        }
    }
    /**
     * Execute Codex CLI command with audit request
     * Requirement 7.1: Execute Codex CLI commands in headless mode
     */
    async executeCodexCommand(request) {
        const auditPrompt = this.generateAuditPrompt(request);
        // Create temporary input for Codex CLI
        const args = [
            'audit',
            '--format', 'json',
            '--headless',
            '--stdin'
        ];
        const result = await this.executeCommand(args, {
            timeout: this.config.timeout,
            input: auditPrompt,
        });
        if (result.exitCode !== 0) {
            throw new Error(`Codex CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
        }
        return result.stdout;
    }
    /**
     * Generate structured audit prompt for Codex CLI
     * Requirement 7.2: Implement audit prompt generation with structured rubric and context
     */
    generateAuditPrompt(request) {
        const { task, candidate, contextPack, rubric, budget } = request;
        const prompt = {
            task,
            candidate,
            context: contextPack,
            rubric: {
                dimensions: rubric.dimensions.map((d) => ({
                    name: d.name,
                    weight: d.weight,
                    description: d.description || '',
                })),
            },
            budget: {
                maxCycles: budget.maxCycles,
                candidates: budget.candidates,
                threshold: budget.threshold,
            },
            instructions: [
                'Analyze the provided candidate code against the given task and context.',
                'Evaluate each rubric dimension and provide scores from 0-100.',
                'Generate an overall score as a weighted average of dimensional scores.',
                'Provide actionable feedback with specific line-level comments.',
                'Include citations to relevant context sections.',
                'Generate a unified diff for proposed improvements if applicable.',
                'Return response in JSON format matching the expected schema.',
            ],
            responseFormat: {
                overall: 'number (0-100)',
                dimensions: 'array of {name: string, score: number}',
                verdict: 'string (pass|revise|reject)',
                review: {
                    summary: 'string',
                    inline: 'array of {path: string, line: number, comment: string}',
                    citations: 'array of strings in format "repo://path:start-end"',
                },
                proposed_diff: 'string (unified diff format) or null',
                iterations: 'number',
                judge_cards: 'array of {model: string, score: number, notes?: string}',
            },
        };
        return JSON.stringify(prompt, null, 2);
    }
    /**
     * Parse and validate Codex CLI response
     * Requirement 7.3: Parse JSON responses and validate structure
     * Requirement 7.4: Attempt greedy parsing for malformed responses
     */
    parseCodexResponse(rawResponse) {
        let parsed;
        try {
            // First attempt: standard JSON parsing
            parsed = JSON.parse(rawResponse);
        }
        catch {
            // Second attempt: greedy parsing for malformed JSON
            parsed = this.greedyJsonParse(rawResponse);
        }
        // Validate and normalize the response
        return this.validateAndNormalizeResponse(parsed, rawResponse);
    }
    /**
     * Attempt greedy parsing for malformed JSON responses
     * Requirement 7.4: Attempt greedy parsing for malformed responses
     */
    greedyJsonParse(rawResponse) {
        const result = {};
        try {
            // Extract overall score
            const overallMatch = rawResponse.match(/"overall"\s*:\s*(\d+(?:\.\d+)?)/);
            if (overallMatch) {
                result.overall = parseFloat(overallMatch[1]);
            }
            // Extract verdict
            const verdictMatch = rawResponse.match(/"verdict"\s*:\s*"(pass|revise|reject)"/);
            if (verdictMatch) {
                result.verdict = verdictMatch[1];
            }
            // Extract dimensions (simplified)
            const dimensionsMatch = rawResponse.match(/"dimensions"\s*:\s*\[(.*?)\]/s);
            if (dimensionsMatch) {
                try {
                    result.dimensions = JSON.parse(`[${dimensionsMatch[1]}]`);
                }
                catch {
                    // Fallback to default dimensions with extracted overall score
                    result.dimensions = DEFAULT_AUDIT_RUBRIC.dimensions.map(d => ({
                        name: d.name,
                        score: result.overall || 0,
                    }));
                }
            }
            // Extract summary
            const summaryMatch = rawResponse.match(/"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
            if (summaryMatch) {
                result.review = {
                    summary: summaryMatch[1].replace(/\\"/g, '"'),
                    inline: [],
                    citations: [],
                };
            }
            // Extract iterations
            const iterationsMatch = rawResponse.match(/"iterations"\s*:\s*(\d+)/);
            if (iterationsMatch) {
                result.iterations = parseInt(iterationsMatch[1], 10);
            }
        }
        catch (error) {
            throw new CodexResponseError(`Failed to parse Codex response with greedy parsing: ${error}`, rawResponse);
        }
        return result;
    }
    /**
     * Validate and normalize parsed response
     * Requirement 7.3: Parse JSON responses and validate structure
     */
    validateAndNormalizeResponse(parsed, rawResponse) {
        // Validate required fields and provide defaults
        const overall = this.validateScore(parsed.overall, 0);
        const verdict = this.validateVerdict(parsed.verdict);
        const dimensions = this.validateDimensions(parsed.dimensions, overall);
        const review = this.validateReview(parsed.review);
        const iterations = Math.max(1, parsed.iterations || 1);
        const judgeCards = this.validateJudgeCards(parsed.judge_cards, overall);
        return {
            overall,
            dimensions,
            verdict,
            review,
            proposed_diff: parsed.proposed_diff || null,
            iterations,
            judge_cards: judgeCards,
        };
    }
    /**
     * Validate score value (0-100)
     */
    validateScore(score, fallback) {
        if (typeof score === 'number') {
            // Clamp to valid range
            return Math.round(Math.max(0, Math.min(100, score)));
        }
        return fallback;
    }
    /**
     * Validate verdict value
     */
    validateVerdict(verdict) {
        if (verdict === 'pass' || verdict === 'revise' || verdict === 'reject') {
            return verdict;
        }
        return 'revise'; // Default to revise for safety
    }
    /**
     * Validate dimensional scores
     */
    validateDimensions(dimensions, overallScore) {
        if (Array.isArray(dimensions)) {
            const validDimensions = dimensions
                .filter((d) => typeof d === 'object' && d !== null &&
                typeof d.name === 'string' &&
                typeof d.score === 'number')
                .map(d => ({
                name: d.name,
                score: this.validateScore(d.score, overallScore),
            }));
            // If we have some valid dimensions but not all expected ones, 
            // fill in the missing ones from the default rubric
            if (validDimensions.length > 0) {
                const existingNames = new Set(validDimensions.map(d => d.name));
                const missingDimensions = DEFAULT_AUDIT_RUBRIC.dimensions
                    .filter(d => !existingNames.has(d.name))
                    .map(d => ({
                    name: d.name,
                    score: overallScore,
                }));
                return [...validDimensions, ...missingDimensions];
            }
        }
        // Fallback to default dimensions with overall score
        return DEFAULT_AUDIT_RUBRIC.dimensions.map(d => ({
            name: d.name,
            score: overallScore,
        }));
    }
    /**
     * Validate review details
     */
    validateReview(review) {
        const defaultReview = {
            summary: 'Audit completed with limited feedback due to response parsing issues.',
            inline: [],
            citations: [],
        };
        if (typeof review !== 'object' || review === null) {
            return defaultReview;
        }
        const r = review;
        return {
            summary: typeof r.summary === 'string' ? r.summary : defaultReview.summary,
            inline: Array.isArray(r.inline) ?
                r.inline.filter(this.isValidInlineComment) : [],
            citations: Array.isArray(r.citations) ?
                r.citations.filter((c) => typeof c === 'string') : [],
        };
    }
    /**
     * Validate inline comment structure
     */
    isValidInlineComment(comment) {
        return (typeof comment === 'object' &&
            comment !== null &&
            typeof comment.path === 'string' &&
            typeof comment.line === 'number' &&
            typeof comment.comment === 'string');
    }
    /**
     * Validate judge cards
     */
    validateJudgeCards(judgeCards, overallScore) {
        if (Array.isArray(judgeCards)) {
            const validCards = judgeCards
                .filter((card) => typeof card === 'object' && card !== null &&
                typeof card.model === 'string' &&
                typeof card.score === 'number')
                .map(card => ({
                model: card.model,
                score: this.validateScore(card.score, overallScore),
                notes: typeof card.notes === 'string' ? card.notes : undefined,
            }));
            if (validCards.length > 0) {
                return validCards;
            }
        }
        // Fallback to single internal judge card
        return [{
                model: 'internal',
                score: overallScore,
                notes: 'Generated from Codex CLI response',
            }];
    }
    /**
     * Create fallback response for error scenarios
     * Requirement 7.2: Handle errors gracefully with fallback responses
     */
    createFallbackResponse(request, errorMessage) {
        const fallbackScore = 50; // Neutral score for error cases
        return {
            overall: fallbackScore,
            dimensions: DEFAULT_AUDIT_RUBRIC.dimensions.map(d => ({
                name: d.name,
                score: fallbackScore,
            })),
            verdict: 'revise',
            review: {
                summary: `Audit could not be completed: ${errorMessage}. Please review the code manually.`,
                inline: [],
                citations: [],
            },
            proposed_diff: null,
            iterations: 1,
            judge_cards: [{
                    model: 'fallback',
                    score: fallbackScore,
                    notes: `Fallback response due to: ${errorMessage}`,
                }],
        };
    }
    /**
     * Execute command with timeout and input support
     */
    executeCommand(args, options = {}) {
        return new Promise((resolve, reject) => {
            const { timeout = this.config.timeout, input } = options;
            const child = spawn(this.config.executable, args, {
                cwd: this.config.workingDirectory,
                stdio: input ? 'pipe' : 'inherit',
            });
            let stdout = '';
            let stderr = '';
            let timeoutId = null;
            // Set up timeout
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    child.kill('SIGTERM');
                    reject(new CodexTimeoutError(timeout));
                }, timeout);
            }
            // Collect output
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }
            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }
            // Handle process completion
            child.on('close', (code) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                resolve({
                    stdout,
                    stderr,
                    exitCode: code || 0,
                });
            });
            child.on('error', (error) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                reject(error);
            });
            // Send input if provided
            if (input && child.stdin) {
                child.stdin.write(input);
                child.stdin.end();
            }
        });
    }
    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // ============================================================================
    // Prompt-Driven Audit Integration Methods (Requirement 6.2)
    // ============================================================================
    /**
     * Execute audit with structured system prompt injection
     * Requirement 6.2: Implement prompt template injection into Codex requests
     */
    async executeAuditWithSystemPrompt(request, systemPrompt, promptContext) {
        // Check if Codex is available
        if (!(await this.isAvailable())) {
            throw new CodexNotAvailableError('Codex CLI is not available. Please install Codex CLI to use GAN auditing features.');
        }
        let lastError = null;
        // Retry logic for robustness
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                const response = await this.executeCodexCommandWithPrompt(request, systemPrompt, promptContext);
                return this.parseCodexResponseWithPromptValidation(response, promptContext);
            }
            catch (error) {
                lastError = error;
                // Don't retry on certain error types
                if (error instanceof CodexNotAvailableError ||
                    error instanceof CodexResponseError) {
                    throw error;
                }
                // For timeout errors, return fallback response immediately
                if (error instanceof CodexTimeoutError) {
                    return this.createPromptAwareFallbackResponse(request, systemPrompt, 'Codex CLI execution timed out');
                }
                // Wait before retry (exponential backoff)
                if (attempt < this.config.retries) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        // All retries failed, check if we should return fallback or throw
        if (lastError instanceof CodexTimeoutError) {
            return this.createPromptAwareFallbackResponse(request, systemPrompt, 'Codex CLI execution timed out');
        }
        // For other errors, throw them
        throw lastError || new Error('Unknown error during Codex execution');
    }
    /**
     * Parse workflow step results from Codex response
     * Requirement 6.2: Add workflow step result parsing from Codex responses
     */
    parseWorkflowStepResults(rawResponse) {
        try {
            const parsed = JSON.parse(rawResponse);
            // Extract workflow step information if present
            const workflowSteps = parsed.workflow_steps || [];
            const stepResults = [];
            for (const step of workflowSteps) {
                if (this.isValidWorkflowStep(step)) {
                    stepResults.push({
                        stepName: step.name,
                        success: step.success !== false,
                        evidence: Array.isArray(step.evidence) ? step.evidence : [],
                        issues: this.parseStepIssues(step.issues || []),
                        score: typeof step.score === 'number' ? step.score : undefined,
                        duration: typeof step.duration === 'number' ? step.duration : undefined,
                        metadata: step.metadata || {},
                    });
                }
            }
            return {
                steps: stepResults,
                overallSuccess: stepResults.every(step => step.success),
                totalDuration: stepResults.reduce((sum, step) => sum + (step.duration || 0), 0),
                criticalIssuesCount: stepResults.reduce((count, step) => count + step.issues.filter(issue => issue.severity === 'critical').length, 0),
            };
        }
        catch (error) {
            // Fallback parsing for malformed responses
            return this.parseWorkflowStepsGreedy(rawResponse);
        }
    }
    /**
     * Validate response structure for prompt-driven outputs
     * Requirement 6.2: Create response validation for prompt-driven outputs
     */
    validatePromptDrivenResponse(response, expectedStructure) {
        const errors = [];
        const warnings = [];
        // Validate basic GAN review structure
        if (!this.isValidGanReview(response)) {
            errors.push('Response does not match expected GAN review structure');
        }
        // Validate prompt-specific fields if expected structure is provided
        if (expectedStructure) {
            // Check for required prompt fields
            if (expectedStructure.requireWorkflowSteps && !response.workflow_steps) {
                errors.push('Missing required workflow_steps field');
            }
            if (expectedStructure.requireCompletionAnalysis && !response.completion_analysis) {
                errors.push('Missing required completion_analysis field');
            }
            if (expectedStructure.requireNextActions && !response.next_actions) {
                warnings.push('Missing recommended next_actions field');
            }
            // Validate workflow step structure
            if (response.workflow_steps && Array.isArray(response.workflow_steps)) {
                for (let i = 0; i < response.workflow_steps.length; i++) {
                    const step = response.workflow_steps[i];
                    if (!this.isValidWorkflowStep(step)) {
                        errors.push(`Invalid workflow step structure at index ${i}`);
                    }
                }
            }
            // Validate completion analysis structure
            if (response.completion_analysis) {
                const analysis = response.completion_analysis;
                if (!analysis.status || !['completed', 'terminated', 'in_progress'].includes(analysis.status)) {
                    errors.push('Invalid completion analysis status');
                }
                if (typeof analysis.nextThoughtNeeded !== 'boolean') {
                    errors.push('Missing or invalid nextThoughtNeeded in completion analysis');
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5)),
        };
    }
    /**
     * Generate structured audit prompt with system prompt integration
     * Requirement 6.2: Extend CodexJudge to support structured prompt generation
     */
    generateStructuredAuditPrompt(request, systemPrompt, promptContext) {
        const { task, candidate, contextPack, rubric, budget } = request;
        // Create enhanced prompt structure with system prompt integration
        const structuredPrompt = {
            system_prompt: systemPrompt,
            prompt_context: promptContext || {},
            audit_request: {
                task,
                candidate,
                context: contextPack,
                rubric: {
                    dimensions: rubric.dimensions.map((d) => ({
                        name: d.name,
                        weight: d.weight,
                        description: d.description || '',
                    })),
                },
                budget: {
                    maxCycles: budget.maxCycles,
                    candidates: budget.candidates,
                    threshold: budget.threshold,
                },
            },
            instructions: [
                'Follow the system prompt guidelines for comprehensive audit execution.',
                'Execute the 8-step audit workflow as defined in the system prompt.',
                'Analyze the provided candidate code against the given task and context.',
                'Evaluate each rubric dimension and provide scores from 0-100.',
                'Generate an overall score as a weighted average of dimensional scores.',
                'Provide actionable feedback with specific line-level comments.',
                'Include workflow step results with evidence and issue tracking.',
                'Provide completion analysis with next thought recommendations.',
                'Include citations to relevant context sections.',
                'Generate a unified diff for proposed improvements if applicable.',
                'Return response in JSON format matching the expected schema.',
            ],
            expected_response_format: {
                // Standard GAN review fields
                overall: 'number (0-100)',
                dimensions: 'array of {name: string, score: number}',
                verdict: 'string (pass|revise|reject)',
                review: {
                    summary: 'string',
                    inline: 'array of {path: string, line: number, comment: string}',
                    citations: 'array of strings in format "repo://path:start-end"',
                },
                proposed_diff: 'string (unified diff format) or null',
                iterations: 'number',
                judge_cards: 'array of {model: string, score: number, notes?: string}',
                // Prompt-driven audit extensions
                workflow_steps: 'array of workflow step results with evidence and issues',
                completion_analysis: {
                    status: 'string (completed|terminated|in_progress)',
                    reason: 'string',
                    nextThoughtNeeded: 'boolean',
                    tier: 'object (optional completion tier info)',
                    killSwitch: 'object (optional kill switch info)',
                },
                next_actions: 'array of recommended next actions with priorities',
            },
        };
        return JSON.stringify(structuredPrompt, null, 2);
    }
    // ============================================================================
    // Private Helper Methods for Prompt Integration
    // ============================================================================
    /**
     * Execute Codex CLI command with system prompt injection
     */
    async executeCodexCommandWithPrompt(request, systemPrompt, promptContext) {
        const auditPrompt = this.generateStructuredAuditPrompt(request, systemPrompt, promptContext);
        // Create temporary input for Codex CLI with enhanced arguments
        const args = [
            'audit',
            '--format', 'json',
            '--headless',
            '--enhanced', // Flag for prompt-driven mode
            '--stdin'
        ];
        const result = await this.executeCommand(args, {
            timeout: this.config.timeout,
            input: auditPrompt,
        });
        if (result.exitCode !== 0) {
            throw new Error(`Codex CLI failed with exit code ${result.exitCode}: ${result.stderr}`);
        }
        return result.stdout;
    }
    /**
     * Parse Codex response with prompt-specific validation
     */
    parseCodexResponseWithPromptValidation(rawResponse, promptContext) {
        let parsed;
        try {
            // First attempt: standard JSON parsing
            parsed = JSON.parse(rawResponse);
        }
        catch {
            // Second attempt: greedy parsing for malformed JSON
            parsed = this.greedyJsonParse(rawResponse);
        }
        // Validate prompt-driven response structure
        const validation = this.validatePromptDrivenResponse(parsed, {
            requireWorkflowSteps: true,
            requireCompletionAnalysis: true,
            requireNextActions: false,
        });
        if (!validation.isValid) {
            console.warn('Prompt-driven response validation failed:', validation.errors);
        }
        // Validate and normalize the response with prompt enhancements
        return this.validateAndNormalizePromptResponse(parsed, rawResponse, promptContext);
    }
    /**
     * Validate and normalize parsed response with prompt enhancements
     */
    validateAndNormalizePromptResponse(parsed, rawResponse, promptContext) {
        // Start with standard validation
        const baseReview = this.validateAndNormalizeResponse(parsed, rawResponse);
        // Add prompt-driven enhancements
        const enhancedReview = {
            ...baseReview,
            // Add workflow step information to judge cards if available
            judge_cards: [
                ...baseReview.judge_cards,
                ...(parsed.workflow_steps ? [{
                        model: 'workflow-analyzer',
                        score: this.calculateWorkflowScore(parsed.workflow_steps),
                        notes: `Workflow analysis: ${parsed.workflow_steps.length} steps executed`,
                    }] : []),
            ],
        };
        // Enhance review summary with completion analysis if available
        if (parsed.completion_analysis) {
            const analysis = parsed.completion_analysis;
            const statusEmoji = analysis.status === 'completed' ? '✅' :
                analysis.status === 'terminated' ? '⚠️' : '🔄';
            enhancedReview.review.summary += `\n\n${statusEmoji} **Completion Status**: ${analysis.status} - ${analysis.reason}`;
            if (analysis.nextThoughtNeeded === false) {
                enhancedReview.review.summary += '\n\n🎯 **Ready for completion** - Quality standards met.';
            }
        }
        return enhancedReview;
    }
    /**
     * Create prompt-aware fallback response
     */
    createPromptAwareFallbackResponse(request, systemPrompt, errorMessage) {
        const fallbackResponse = this.createFallbackResponse(request, errorMessage);
        // Enhance with prompt-aware information
        fallbackResponse.judge_cards.push({
            model: 'prompt-fallback',
            score: fallbackResponse.overall,
            notes: `Fallback response with system prompt context. Original error: ${errorMessage}`,
        });
        // Add system prompt context to review summary
        fallbackResponse.review.summary += `\n\n⚠️ **System Prompt Context**: This audit was attempted with enhanced prompt-driven analysis but fell back to basic auditing due to: ${errorMessage}`;
        return fallbackResponse;
    }
    /**
     * Parse workflow steps with greedy parsing for malformed responses
     */
    parseWorkflowStepsGreedy(rawResponse) {
        const fallbackSteps = [];
        // Try to extract step information using regex patterns
        const stepPatterns = [
            /INIT.*?(?=REPRO|$)/gs,
            /REPRO.*?(?=STATIC|$)/gs,
            /STATIC.*?(?=TESTS|$)/gs,
            /TESTS.*?(?=DYNAMIC|$)/gs,
            /DYNAMIC.*?(?=CONFORM|$)/gs,
            /CONFORM.*?(?=TRACE|$)/gs,
            /TRACE.*?(?=VERDICT|$)/gs,
            /VERDICT.*?$/gs,
        ];
        const stepNames = ['INIT', 'REPRO', 'STATIC', 'TESTS', 'DYNAMIC', 'CONFORM', 'TRACE', 'VERDICT'];
        for (let i = 0; i < stepPatterns.length; i++) {
            const match = rawResponse.match(stepPatterns[i]);
            if (match) {
                fallbackSteps.push({
                    stepName: stepNames[i],
                    success: !match[0].toLowerCase().includes('failed'),
                    evidence: this.extractEvidenceFromText(match[0]),
                    issues: this.extractIssuesFromText(match[0]),
                    score: this.extractScoreFromText(match[0]),
                    duration: undefined,
                    metadata: { source: 'greedy_parsing' },
                });
            }
        }
        return {
            steps: fallbackSteps,
            overallSuccess: fallbackSteps.length > 0 && fallbackSteps.every(step => step.success),
            totalDuration: 0,
            criticalIssuesCount: fallbackSteps.reduce((count, step) => count + step.issues.filter(issue => issue.severity === 'critical').length, 0),
        };
    }
    /**
     * Validate workflow step structure
     */
    isValidWorkflowStep(step) {
        return (typeof step === 'object' &&
            step !== null &&
            typeof step.name === 'string' &&
            (step.success === undefined || typeof step.success === 'boolean') &&
            (step.evidence === undefined || Array.isArray(step.evidence)) &&
            (step.issues === undefined || Array.isArray(step.issues)));
    }
    /**
     * Parse step issues from raw data
     */
    parseStepIssues(issues) {
        return issues
            .filter(issue => typeof issue === 'object' && issue !== null)
            .map(issue => ({
            severity: ['critical', 'major', 'minor'].includes(issue.severity) ? issue.severity : 'minor',
            description: typeof issue.description === 'string' ? issue.description : 'Unknown issue',
            location: typeof issue.location === 'string' ? issue.location : undefined,
        }));
    }
    /**
     * Calculate workflow score from step results
     */
    calculateWorkflowScore(workflowSteps) {
        if (!Array.isArray(workflowSteps) || workflowSteps.length === 0) {
            return 50; // Neutral score for missing workflow data
        }
        const successfulSteps = workflowSteps.filter(step => step.success !== false).length;
        const totalSteps = workflowSteps.length;
        return Math.round((successfulSteps / totalSteps) * 100);
    }
    /**
     * Extract evidence from text using pattern matching
     */
    extractEvidenceFromText(text) {
        const evidencePatterns = [
            /✓\s*(.+)/g,
            /Evidence:\s*(.+)/gi,
            /Found:\s*(.+)/gi,
            /Verified:\s*(.+)/gi,
        ];
        const evidence = [];
        for (const pattern of evidencePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                evidence.push(match[1].trim());
            }
        }
        return evidence;
    }
    /**
     * Extract issues from text using pattern matching
     */
    extractIssuesFromText(text) {
        const issuePatterns = [
            /❌\s*(.+)/g,
            /Error:\s*(.+)/gi,
            /Issue:\s*(.+)/gi,
            /Problem:\s*(.+)/gi,
        ];
        const issues = [];
        for (const pattern of issuePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const description = match[1].trim();
                const severity = description.toLowerCase().includes('critical') ? 'critical' :
                    description.toLowerCase().includes('major') ? 'major' : 'minor';
                issues.push({
                    severity,
                    description,
                    location: undefined,
                });
            }
        }
        return issues;
    }
    /**
     * Extract score from text using pattern matching
     */
    extractScoreFromText(text) {
        const scorePatterns = [
            /Score:\s*(\d+)/i,
            /(\d+)\/100/,
            /(\d+)%/,
        ];
        for (const pattern of scorePatterns) {
            const match = text.match(pattern);
            if (match) {
                const score = parseInt(match[1], 10);
                if (!isNaN(score) && score >= 0 && score <= 100) {
                    return score;
                }
            }
        }
        return undefined;
    }
    /**
     * Validate GAN review structure
     */
    isValidGanReview(obj) {
        return (typeof obj === 'object' &&
            obj !== null &&
            typeof obj.overall === 'number' &&
            Array.isArray(obj.dimensions) &&
            typeof obj.verdict === 'string' &&
            ['pass', 'revise', 'reject'].includes(obj.verdict) &&
            typeof obj.review === 'object' &&
            obj.review !== null &&
            typeof obj.iterations === 'number' &&
            Array.isArray(obj.judge_cards));
    }
}
//# sourceMappingURL=codex-judge.js.map