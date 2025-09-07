/**
 * Production Codex CLI integration for GAN auditing
 *
 * This module implements the production-ready CodexJudge class that executes
 * Codex CLI commands for code analysis and audit feedback generation.
 *
 * This implementation removes all mock functionality and fallback responses,
 * using robust process management and comprehensive error handling.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
import { DEFAULT_AUDIT_RUBRIC } from '../types/gan-types.js';
import { ProcessManager } from './process-manager.js';
import { EnvironmentManager } from './environment-manager.js';
import { CodexValidator } from './codex-validator.js';
import { errorDiagnosticSystem } from '../utils/error-diagnostic-system.js';
import { createComponentLogger } from '../utils/logger.js';
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
 * Production implementation of Codex CLI integration for GAN auditing
 *
 * This implementation completely removes all mock functionality and fallback responses.
 * It uses robust process management, comprehensive error handling, and strict validation.
 *
 * Requirements:
 * - 1.1: Execute actual Codex CLI without any mock fallback
 * - 1.2: Return proper error responses instead of mock data
 * - 1.5: Never use mock data under any circumstances
 */
export class CodexJudge {
    config;
    processManager;
    environmentManager;
    codexValidator;
    componentLogger = createComponentLogger('codex-judge');
    isInitialized = false;
    constructor(config = {}) {
        this.config = {
            executable: 'codex',
            timeout: 120000, // 2 minutes for complex operations
            retries: 2,
            workingDirectory: process.cwd(),
            maxConcurrentProcesses: 3,
            processCleanupTimeout: 5000,
            enableDebugLogging: process.env.NODE_ENV !== 'production' || process.env.CODEX_DEBUG === 'true',
            failFast: true, // Always fail fast in production - no fallbacks
            ...config,
        };
        // Initialize components
        this.processManager = new ProcessManager({
            maxConcurrentProcesses: this.config.maxConcurrentProcesses,
            defaultTimeout: this.config.timeout,
            processCleanupTimeout: this.config.processCleanupTimeout,
            enableMetrics: this.config.enableDebugLogging,
        });
        this.environmentManager = new EnvironmentManager({
            defaultWorkingDirectory: this.config.workingDirectory || process.cwd(),
            defaultExecutableName: this.config.executable,
            enableDebugLogging: this.config.enableDebugLogging,
        });
        this.codexValidator = new CodexValidator({
            executableName: this.config.executable,
            timeout: 10000, // 10 seconds for validation
            minVersion: '0.29.0', // Support current Codex CLI version
        });
        if (this.config.enableDebugLogging) {
            this.componentLogger.info('Production CodexJudge initialized', {
                executable: this.config.executable,
                timeout: this.config.timeout,
                retries: this.config.retries,
                maxConcurrentProcesses: this.config.maxConcurrentProcesses,
                failFast: this.config.failFast,
            });
        }
    }
    /**
     * Execute audit using Codex CLI with production-ready process management
     * Requirements: 1.1, 1.2, 1.5 - Execute actual Codex CLI without any mock fallback
     */
    async executeAudit(request) {
        // Ensure system is initialized and validated
        await this.ensureInitialized();
        const executionContext = {
            workingDirectory: this.config.workingDirectory || process.cwd(),
            requestTimestamp: Date.now(),
            command: this.config.executable,
            arguments: ['exec', '--sandbox', 'read-only', '--json', '--skip-git-repo-check'],
        };
        this.componentLogger.debug('Starting Codex audit execution', {
            sessionId: executionContext.sessionId,
            task: request.task,
            candidateLength: request.candidate.length,
        });
        let lastError = null;
        // Retry logic for robustness (but no fallbacks)
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                const response = await this.executeCodexCommandWithProcessManager(request, executionContext);
                const result = this.parseCodexResponse(response);
                this.componentLogger.info('Codex audit completed successfully', {
                    attempt: attempt + 1,
                    overall: result.overall,
                    verdict: result.verdict,
                });
                return result;
            }
            catch (error) {
                lastError = error;
                this.componentLogger.warn('Codex execution attempt failed', {
                    attempt: attempt + 1,
                    error: error instanceof Error ? error.message : String(error),
                });
                // Don't retry on certain error types - fail fast
                if (error instanceof CodexNotAvailableError ||
                    error instanceof CodexResponseError) {
                    // Generate comprehensive diagnostic and throw immediately
                    const diagnostic = await errorDiagnosticSystem.diagnoseCodexError(error, executionContext);
                    throw this.createEnhancedError(error, diagnostic);
                }
                // For timeout errors, provide diagnostic and throw immediately
                if (error instanceof CodexTimeoutError) {
                    const diagnostic = await errorDiagnosticSystem.diagnoseCodexError(error, executionContext);
                    throw this.createEnhancedError(error, diagnostic);
                }
                // Wait before retry (exponential backoff)
                if (attempt < this.config.retries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    this.componentLogger.debug('Waiting before retry', { delay, nextAttempt: attempt + 2 });
                    await this.delay(delay);
                }
            }
        }
        // All retries failed - provide comprehensive diagnostic and throw
        if (lastError) {
            const diagnostic = await errorDiagnosticSystem.diagnoseCodexError(lastError, executionContext);
            const enhancedError = new Error(`Codex execution failed after ${this.config.retries + 1} attempts: ${lastError.message}`);
            throw this.createEnhancedError(enhancedError, diagnostic);
        }
        throw new Error('Unknown error during Codex execution - no fallback available');
    }
    /**
     * Ensure the system is initialized and Codex CLI is available
     * Requirements: 1.3, 1.4 - Validate Codex CLI before accepting requests
     */
    async ensureInitialized() {
        if (this.isInitialized) {
            return;
        }
        this.componentLogger.debug('Initializing Codex CLI validation');
        // Validate Codex CLI availability
        const validationResult = await this.codexValidator.validateCodexAvailability();
        if (!validationResult.isAvailable) {
            const error = new CodexNotAvailableError('Codex CLI is not available. Please install Codex CLI to use GAN auditing features.');
            // Create execution context for diagnostic
            const executionContext = {
                workingDirectory: this.config.workingDirectory || process.cwd(),
                requestTimestamp: Date.now(),
                command: this.config.executable,
            };
            const diagnostic = await errorDiagnosticSystem.diagnoseCodexError(error, executionContext);
            throw this.createEnhancedError(error, diagnostic);
        }
        this.componentLogger.info('Codex CLI validation successful', {
            version: validationResult.version,
            executablePath: validationResult.executablePath,
        });
        this.isInitialized = true;
    }
    /**
     * Check if Codex CLI is available (simplified interface)
     * Requirements: 1.3, 1.4 - Comprehensive availability checking
     */
    async isAvailable() {
        try {
            const validationResult = await this.codexValidator.validateCodexAvailability();
            return validationResult.isAvailable;
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
            const validationResult = await this.codexValidator.validateCodexAvailability();
            return validationResult.version;
        }
        catch {
            return null;
        }
    }
    /**
     * Get active process count from process manager
     * Requirements: 6.1 - Process management integration
     */
    getActiveProcessCount() {
        return this.processManager.getActiveProcessCount();
    }
    /**
     * Terminate all active processes
     * Requirements: 6.2, 6.4 - Proper cleanup mechanisms
     */
    async terminateAllProcesses() {
        await this.processManager.terminateAllProcesses();
    }
    /**
     * Get health status from process manager
     * Requirements: 6.5 - Health monitoring
     */
    getHealthStatus() {
        return this.processManager.getHealthStatus();
    }
    /**
     * Execute Codex CLI command using ProcessManager
     * Requirements: 1.1, 1.3 - Reliable execution with proper process management
     */
    async executeCodexCommandWithProcessManager(request, context) {
        // Resolve working directory
        const workingDirResult = await this.environmentManager.resolveWorkingDirectory(this.config.workingDirectory);
        if (!workingDirResult.success || !workingDirResult.path) {
            throw new Error(`Unable to resolve working directory: ${workingDirResult.error?.message || 'Unknown error'}`);
        }
        // Prepare environment
        const envResult = await this.environmentManager.prepareEnvironment();
        if (!envResult.success || !envResult.environment) {
            throw new Error(`Unable to prepare environment: ${envResult.error?.message || 'Unknown error'}`);
        }
        // Validate Codex executable path
        const codexPathResult = await this.environmentManager.validateCodexPath(this.config.executable);
        if (!codexPathResult.success || !codexPathResult.executablePath) {
            throw new CodexNotAvailableError(`Codex CLI executable not found: ${codexPathResult.error?.message || 'Unknown error'}`);
        }
        // Generate audit prompt
        const auditPrompt = this.generateAuditPrompt(request);
        // Prepare command arguments
        const args = [
            'exec',
            '--sandbox', 'read-only',
            '--json',
            '--skip-git-repo-check',
            auditPrompt
        ];
        // Execute using ProcessManager
        const processOptions = {
            workingDirectory: workingDirResult.path,
            timeout: this.config.timeout,
            environment: envResult.environment,
            input: undefined, // No stdin input needed for this command
        };
        this.componentLogger.debug('Executing Codex CLI command', {
            executable: codexPathResult.executablePath,
            args: args.slice(0, -1), // Don't log the full prompt
            workingDirectory: workingDirResult.path,
            timeout: this.config.timeout,
        });
        const result = await this.processManager.executeCommand(codexPathResult.executablePath, args, processOptions);
        if (result.exitCode !== 0) {
            const error = new Error(`Codex CLI failed with exit code ${result.exitCode}: ${result.stderr || 'No error details'}`);
            // Add process result details to error
            error.processResult = {
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                executionTime: result.executionTime,
                timedOut: result.timedOut,
            };
            throw error;
        }
        if (result.timedOut) {
            throw new CodexTimeoutError(this.config.timeout);
        }
        this.componentLogger.debug('Codex CLI execution completed', {
            exitCode: result.exitCode,
            executionTime: result.executionTime,
            stdoutLength: result.stdout.length,
            stderrLength: result.stderr.length,
        });
        return result.stdout;
    }
    /**
     * Generate structured audit prompt for Codex CLI with proper input validation
     * Requirements: 1.1, 1.3 - Fix command argument generation for reliable execution
     */
    generateAuditPrompt(request) {
        // Validate input parameters
        this.validateAuditRequest(request);
        const { task, candidate, contextPack, rubric, budget } = request;
        // Sanitize inputs to prevent command injection
        const sanitizedTask = this.sanitizeInput(task);
        const sanitizedCandidate = this.sanitizeInput(candidate);
        const sanitizedContext = this.sanitizeInput(contextPack || '');
        // Create a structured prompt for Codex exec with proper escaping
        const prompt = `You are a professional code auditor. Analyze the provided code and return your assessment as a JSON object.

TASK: ${sanitizedTask}

CODE TO AUDIT:
\`\`\`
${sanitizedCandidate}
\`\`\`

${sanitizedContext ? `CONTEXT: ${sanitizedContext}` : ''}

EVALUATION CRITERIA:
${this.formatRubricDimensions(rubric)}

INSTRUCTIONS:
1. Analyze the code for correctness, security, performance, and best practices
2. Score each dimension from 0-100 based on quality
3. Calculate overall score as weighted average of dimensional scores
4. Determine verdict: "pass" (≥${budget.threshold}), "revise" (needs improvement), or "reject" (major issues)
5. Provide specific, actionable feedback with line numbers where applicable

CRITICAL: Respond with ONLY a valid JSON object. No markdown formatting, no additional text.

Required JSON format:
{
  "overall": <number 0-100>,
  "dimensions": [
    ${this.generateDimensionTemplate(rubric)}
  ],
  "verdict": "pass|revise|reject",
  "review": {
    "summary": "<detailed analysis summary>",
    "inline": [{"path": "code", "line": <number>, "comment": "<specific feedback>"}],
    "citations": []
  },
  "proposed_diff": null,
  "iterations": 1,
  "judge_cards": [{"model": "codex-cli", "score": <number>, "notes": "<brief analysis notes>"}]
}`;
        return prompt;
    }
    /**
     * Validate audit request parameters
     * Requirements: 1.1, 1.3 - Add proper input handling and validation
     */
    validateAuditRequest(request) {
        if (!request) {
            throw new Error('Audit request is required');
        }
        if (!request.task || typeof request.task !== 'string') {
            throw new Error('Audit request must include a valid task description');
        }
        if (!request.candidate || typeof request.candidate !== 'string') {
            throw new Error('Audit request must include candidate code to analyze');
        }
        if (!request.rubric || !Array.isArray(request.rubric.dimensions)) {
            throw new Error('Audit request must include a valid rubric with dimensions');
        }
        if (!request.budget || typeof request.budget.threshold !== 'number') {
            throw new Error('Audit request must include a valid budget with threshold');
        }
        // Validate rubric dimensions
        for (const dimension of request.rubric.dimensions) {
            if (!dimension.name || typeof dimension.name !== 'string') {
                throw new Error('Each rubric dimension must have a valid name');
            }
            if (typeof dimension.weight !== 'number' || dimension.weight < 0) {
                throw new Error('Each rubric dimension must have a valid weight');
            }
        }
        // Check for reasonable input sizes to prevent resource exhaustion
        if (request.task.length > 10000) {
            throw new Error('Task description is too long (maximum 10,000 characters)');
        }
        if (request.candidate.length > 100000) {
            throw new Error('Candidate code is too long (maximum 100,000 characters)');
        }
        if (request.contextPack && request.contextPack.length > 50000) {
            throw new Error('Context pack is too long (maximum 50,000 characters)');
        }
    }
    /**
     * Sanitize input to prevent command injection and formatting issues
     * Requirements: 1.1, 1.3 - Proper input handling and validation
     */
    sanitizeInput(input) {
        if (!input)
            return '';
        // Remove or escape potentially dangerous characters
        return input
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
            .replace(/`/g, '\\`') // Escape backticks
            .replace(/\$/g, '\\$') // Escape dollar signs
            .replace(/\\/g, '\\\\') // Escape backslashes
            .trim();
    }
    /**
     * Format rubric dimensions for prompt
     */
    formatRubricDimensions(rubric) {
        return rubric.dimensions
            .map((d) => `- ${d.name} (weight: ${d.weight}): ${d.description || 'Evaluate this aspect of the code'}`)
            .join('\n');
    }
    /**
     * Generate dimension template for JSON response
     */
    generateDimensionTemplate(rubric) {
        return rubric.dimensions
            .map((d) => `{"name": "${d.name}", "score": <number>}`)
            .join(',\n    ');
    }
    /**
     * Parse and validate Codex CLI response with strict validation
     * Requirements: 1.2, 4.1, 4.5 - Strict response validation without fallbacks
     */
    parseCodexResponse(rawResponse) {
        if (!rawResponse || rawResponse.trim().length === 0) {
            throw new CodexResponseError('Empty response from Codex CLI', rawResponse);
        }
        this.componentLogger.debug('Parsing Codex response', {
            responseLength: rawResponse.length,
            firstChars: rawResponse.substring(0, 100),
        });
        let parsed;
        try {
            // First attempt: parse JSONL format from Codex CLI
            parsed = this.parseCodexJsonLines(rawResponse);
        }
        catch (jsonlError) {
            this.componentLogger.debug('JSONL parsing failed, trying standard JSON', {
                error: jsonlError instanceof Error ? jsonlError.message : String(jsonlError),
            });
            try {
                // Second attempt: standard JSON parsing
                parsed = JSON.parse(rawResponse);
            }
            catch (jsonError) {
                // No fallback parsing - throw comprehensive error
                const error = new CodexResponseError(`Failed to parse Codex CLI response as JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`, rawResponse);
                this.componentLogger.error('Response parsing failed completely');
                throw error;
            }
        }
        // Strict validation and normalization - no fallbacks
        return this.validateAndNormalizeResponse(parsed, rawResponse);
    }
    /**
     * Parse Codex CLI JSONL (JSON Lines) format with strict validation
     * Requirements: 1.2, 4.1 - Strict response validation without fallbacks
     */
    parseCodexJsonLines(rawResponse) {
        const lines = rawResponse.trim().split('\n').filter(line => line.trim().length > 0);
        if (lines.length === 0) {
            throw new CodexResponseError('Empty JSONL response from Codex CLI', rawResponse);
        }
        let agentMessage = '';
        let foundAgentMessage = false;
        // Find the agent_message line which contains the actual response
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.msg && parsed.msg.type === 'agent_message') {
                    agentMessage = parsed.msg.message;
                    foundAgentMessage = true;
                    break;
                }
            }
            catch (parseError) {
                // Log but continue - some lines might not be JSON
                this.componentLogger.debug('Skipping non-JSON line in JSONL response', {
                    line: line.substring(0, 100),
                    error: parseError instanceof Error ? parseError.message : String(parseError),
                });
                continue;
            }
        }
        if (!foundAgentMessage || !agentMessage) {
            throw new CodexResponseError('No agent message found in Codex JSONL response', rawResponse);
        }
        // Try to parse the agent message as JSON first
        try {
            const directJson = JSON.parse(agentMessage);
            if (this.isValidCodexResponse(directJson)) {
                return directJson;
            }
        }
        catch {
            // Agent message is not direct JSON, try to extract JSON from it
        }
        // Extract JSON from natural language response
        return this.extractJsonFromNaturalLanguage(agentMessage);
    }
    /**
     * Extract JSON from natural language response with strict validation
     * Requirements: 1.2, 4.1, 4.5 - Remove greedy parsing fallbacks that mask errors
     */
    extractJsonFromNaturalLanguage(message) {
        // Try to extract JSON block from the message
        const jsonMatch = message.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new CodexResponseError('No JSON object found in Codex CLI response', message);
        }
        try {
            const extractedJson = JSON.parse(jsonMatch[0]);
            // Validate that it's a proper Codex response
            if (!this.isValidCodexResponse(extractedJson)) {
                throw new CodexResponseError('Extracted JSON does not match expected Codex response format', message);
            }
            return extractedJson;
        }
        catch (parseError) {
            throw new CodexResponseError(`Failed to parse extracted JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`, message);
        }
    }
    /**
     * Validate if response has required Codex format
     * Requirements: 1.2, 4.1 - Strict response validation without fallbacks
     */
    isValidCodexResponse(response) {
        if (!response || typeof response !== 'object') {
            return false;
        }
        // Check for required fields
        const requiredFields = ['overall', 'verdict'];
        for (const field of requiredFields) {
            if (!(field in response)) {
                this.componentLogger.debug('Missing required field in response', { field });
                return false;
            }
        }
        // Validate overall score
        if (typeof response.overall !== 'number' || response.overall < 0 || response.overall > 100) {
            this.componentLogger.debug('Invalid overall score', { overall: response.overall });
            return false;
        }
        // Validate verdict
        if (!['pass', 'revise', 'reject'].includes(response.verdict)) {
            this.componentLogger.debug('Invalid verdict', { verdict: response.verdict });
            return false;
        }
        return true;
    }
    /**
     * Validate and normalize parsed response with strict validation
     * Requirements: 1.2, 4.1, 4.5 - Comprehensive JSON parsing with proper error handling
     */
    validateAndNormalizeResponse(parsed, rawResponse) {
        const errors = [];
        // Strict validation of required fields
        const overall = this.validateScore(parsed.overall, errors);
        const verdict = this.validateVerdict(parsed.verdict, errors);
        const dimensions = this.validateDimensions(parsed.dimensions, overall, errors);
        const review = this.validateReview(parsed.review, errors);
        const iterations = this.validateIterations(parsed.iterations, errors);
        const judgeCards = this.validateJudgeCards(parsed.judge_cards, overall, errors);
        // If there are validation errors, throw with details
        if (errors.length > 0) {
            const errorMessage = `Response validation failed:\n${errors.map(e => `- ${e}`).join('\n')}`;
            throw new CodexResponseError(errorMessage, rawResponse);
        }
        this.componentLogger.debug('Response validation successful', {
            overall,
            verdict,
            dimensionsCount: dimensions.length,
            judgeCardsCount: judgeCards.length,
        });
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
     * Validate score value (0-100) with strict error collection
     */
    validateScore(score, errors) {
        if (typeof score !== 'number') {
            errors.push(`Invalid score type: expected number, got ${typeof score}`);
            return 0;
        }
        if (isNaN(score) || !isFinite(score)) {
            errors.push(`Invalid score value: ${score} (must be a finite number)`);
            return 0;
        }
        if (score < 0 || score > 100) {
            errors.push(`Score out of range: ${score} (must be between 0 and 100)`);
            return Math.max(0, Math.min(100, score));
        }
        return Math.round(score);
    }
    /**
     * Validate verdict value with strict error collection
     */
    validateVerdict(verdict, errors) {
        if (typeof verdict !== 'string') {
            errors.push(`Invalid verdict type: expected string, got ${typeof verdict}`);
            return 'revise';
        }
        if (!['pass', 'revise', 'reject'].includes(verdict)) {
            errors.push(`Invalid verdict value: "${verdict}" (must be "pass", "revise", or "reject")`);
            return 'revise';
        }
        return verdict;
    }
    /**
     * Validate dimensional scores with strict error collection
     */
    validateDimensions(dimensions, overallScore, errors) {
        if (!Array.isArray(dimensions)) {
            errors.push(`Invalid dimensions type: expected array, got ${typeof dimensions}`);
            return this.createDefaultDimensions(overallScore);
        }
        if (dimensions.length === 0) {
            errors.push('Dimensions array is empty');
            return this.createDefaultDimensions(overallScore);
        }
        const validDimensions = [];
        const dimensionErrors = [];
        for (let i = 0; i < dimensions.length; i++) {
            const d = dimensions[i];
            if (typeof d !== 'object' || d === null) {
                dimensionErrors.push(`Dimension ${i}: expected object, got ${typeof d}`);
                continue;
            }
            if (typeof d.name !== 'string') {
                dimensionErrors.push(`Dimension ${i}: invalid name type (expected string, got ${typeof d.name})`);
                continue;
            }
            if (typeof d.score !== 'number') {
                dimensionErrors.push(`Dimension ${i}: invalid score type (expected number, got ${typeof d.score})`);
                continue;
            }
            validDimensions.push({
                name: d.name,
                score: this.validateScore(d.score, dimensionErrors),
            });
        }
        if (dimensionErrors.length > 0) {
            errors.push(...dimensionErrors);
        }
        if (validDimensions.length === 0) {
            errors.push('No valid dimensions found');
            return this.createDefaultDimensions(overallScore);
        }
        return validDimensions;
    }
    /**
     * Validate review details with strict error collection
     */
    validateReview(review, errors) {
        if (typeof review !== 'object' || review === null) {
            errors.push(`Invalid review type: expected object, got ${typeof review}`);
            return this.createDefaultReview();
        }
        const r = review;
        const result = {
            summary: '',
            inline: [],
            citations: [],
        };
        // Validate summary
        if (typeof r.summary !== 'string') {
            errors.push(`Invalid review summary type: expected string, got ${typeof r.summary}`);
            result.summary = 'No summary provided';
        }
        else {
            result.summary = r.summary;
        }
        // Validate inline comments
        if (r.inline !== undefined) {
            if (!Array.isArray(r.inline)) {
                errors.push(`Invalid inline comments type: expected array, got ${typeof r.inline}`);
            }
            else {
                result.inline = r.inline.filter((comment, index) => {
                    if (!this.isValidInlineComment(comment)) {
                        errors.push(`Invalid inline comment at index ${index}`);
                        return false;
                    }
                    return true;
                });
            }
        }
        // Validate citations
        if (r.citations !== undefined) {
            if (!Array.isArray(r.citations)) {
                errors.push(`Invalid citations type: expected array, got ${typeof r.citations}`);
            }
            else {
                result.citations = r.citations.filter((citation, index) => {
                    if (typeof citation !== 'string') {
                        errors.push(`Invalid citation at index ${index}: expected string, got ${typeof citation}`);
                        return false;
                    }
                    return true;
                });
            }
        }
        return result;
    }
    /**
     * Validate iterations with strict error collection
     */
    validateIterations(iterations, errors) {
        if (iterations === undefined) {
            return 1; // Default value
        }
        if (typeof iterations !== 'number') {
            errors.push(`Invalid iterations type: expected number, got ${typeof iterations}`);
            return 1;
        }
        if (!Number.isInteger(iterations) || iterations < 1) {
            errors.push(`Invalid iterations value: ${iterations} (must be a positive integer)`);
            return 1;
        }
        return iterations;
    }
    /**
     * Validate inline comment structure
     */
    isValidInlineComment(comment) {
        return (typeof comment === 'object' &&
            comment !== null &&
            typeof comment.path === 'string' &&
            typeof comment.line === 'number' &&
            Number.isInteger(comment.line) &&
            comment.line > 0 &&
            typeof comment.comment === 'string');
    }
    /**
     * Validate judge cards with strict error collection
     */
    validateJudgeCards(judgeCards, overallScore, errors) {
        if (judgeCards === undefined) {
            return this.createDefaultJudgeCards(overallScore);
        }
        if (!Array.isArray(judgeCards)) {
            errors.push(`Invalid judge cards type: expected array, got ${typeof judgeCards}`);
            return this.createDefaultJudgeCards(overallScore);
        }
        if (judgeCards.length === 0) {
            return this.createDefaultJudgeCards(overallScore);
        }
        const validCards = [];
        const cardErrors = [];
        for (let i = 0; i < judgeCards.length; i++) {
            const card = judgeCards[i];
            if (typeof card !== 'object' || card === null) {
                cardErrors.push(`Judge card ${i}: expected object, got ${typeof card}`);
                continue;
            }
            if (typeof card.model !== 'string') {
                cardErrors.push(`Judge card ${i}: invalid model type (expected string, got ${typeof card.model})`);
                continue;
            }
            if (typeof card.score !== 'number') {
                cardErrors.push(`Judge card ${i}: invalid score type (expected number, got ${typeof card.score})`);
                continue;
            }
            validCards.push({
                model: card.model,
                score: this.validateScore(card.score, cardErrors),
                notes: typeof card.notes === 'string' ? card.notes : undefined,
            });
        }
        if (cardErrors.length > 0) {
            errors.push(...cardErrors);
        }
        if (validCards.length === 0) {
            errors.push('No valid judge cards found');
            return this.createDefaultJudgeCards(overallScore);
        }
        return validCards;
    }
    /**
     * Create default dimensions
     */
    createDefaultDimensions(overallScore) {
        return DEFAULT_AUDIT_RUBRIC.dimensions.map(d => ({
            name: d.name,
            score: overallScore,
        }));
    }
    /**
     * Create default review
     */
    createDefaultReview() {
        return {
            summary: 'Audit completed but response parsing encountered issues.',
            inline: [],
            citations: [],
        };
    }
    /**
     * Create default judge cards
     */
    createDefaultJudgeCards(overallScore) {
        return [{
                model: 'codex-cli',
                score: overallScore,
                notes: 'Generated from Codex CLI response',
            }];
    }
    /**
     * Create enhanced error with diagnostic information
     * Requirements: 4.1, 4.2 - Comprehensive error handling with actionable guidance
     */
    createEnhancedError(originalError, diagnostic) {
        const enhancedMessage = [
            originalError.message,
            '',
            'Diagnostic Analysis:',
            diagnostic.details,
            '',
            'Suggestions:',
            ...diagnostic.suggestions.map(s => `- ${s}`),
        ].join('\n');
        const enhancedError = new originalError.constructor(enhancedMessage);
        // Preserve original error properties
        Object.setPrototypeOf(enhancedError, Object.getPrototypeOf(originalError));
        // Add diagnostic information
        enhancedError.diagnostic = diagnostic;
        enhancedError.originalError = originalError;
        return enhancedError;
    }
    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // ============================================================================
    // Legacy Interface Methods - Not Supported in Production
    // ============================================================================
    /**
     * Execute audit with system prompt - Not supported in production mode
     * Requirements: 5.1, 5.3, 5.5 - Remove all fallback functionality
     */
    async executeAuditWithSystemPrompt() {
        throw new Error('executeAuditWithSystemPrompt is not supported in production mode. ' +
            'Use executeAudit() instead for production-ready Codex CLI integration.');
    }
    /**
     * Parse workflow step results - Not supported in production mode
     * Requirements: 5.1, 5.3, 5.5 - Remove all fallback functionality
     */
    parseWorkflowStepResults() {
        throw new Error('parseWorkflowStepResults is not supported in production mode. ' +
            'Production mode focuses on core audit functionality without workflow steps.');
    }
    /**
     * Validate prompt-driven response - Not supported in production mode
     * Requirements: 5.1, 5.3, 5.5 - Remove all fallback functionality
     */
    validatePromptDrivenResponse() {
        throw new Error('validatePromptDrivenResponse is not supported in production mode. ' +
            'Production mode uses strict JSON validation without prompt-driven features.');
    }
    /**
     * Generate structured audit prompt - Not supported in production mode
     * Requirements: 5.1, 5.3, 5.5 - Remove all fallback functionality
     */
    generateStructuredAuditPrompt() {
        throw new Error('generateStructuredAuditPrompt is not supported in production mode. ' +
            'Production mode uses standard audit prompts without system prompt injection.');
    }
}
//# sourceMappingURL=codex-judge.js.map