/**
 * Reproduction and Verification Guide Generator for GAN Auditor System Prompt
 *
 * This module implements reproduction and verification guide generation with exact command
 * generation for issue reproduction, fix verification steps, test execution commands,
 * and lint/format/type-check integration as specified in requirement 5.4.
 *
 * Requirements addressed:
 * - 5.4: Reproduction and verification guide generation
 * - Implement exact command generation for issue reproduction
 * - Add fix verification step creation
 * - Create test execution command generation
 * - Add lint/format/type-check command integration
 */
// ============================================================================
// Reproduction Guide Generator Implementation
// ============================================================================
/**
 * Generates comprehensive reproduction and verification guides
 */
export class ReproductionGuideGenerator {
    config;
    constructor(config) {
        this.config = {
            ...DEFAULT_REPRODUCTION_GUIDE_CONFIG,
            ...config
        };
    }
    /**
     * Generate reproduction and verification guide
     */
    async generateReproductionGuide(context) {
        // Generate metadata
        const metadata = this.generateMetadata(context);
        // Generate reproduction steps
        const reproductionSteps = await this.generateReproductionSteps(context);
        // Generate verification steps
        const verificationSteps = await this.generateVerificationSteps(context);
        // Generate test commands
        const testCommands = this.generateTestCommands(context);
        // Generate validation commands
        const validationCommands = this.generateValidationCommands(context);
        return {
            metadata,
            reproductionSteps,
            verificationSteps,
            testCommands,
            validationCommands
        };
    }
    /**
     * Generate reproduction steps for issues
     */
    async generateReproductionSteps(context) {
        const steps = [];
        let stepNumber = 1;
        // Add environment setup steps if configured
        if (this.config.includeEnvironmentSetup) {
            const envSteps = this.generateEnvironmentSetupSteps(context);
            steps.push(...envSteps.map(step => ({ ...step, stepNumber: stepNumber++ })));
        }
        // Add repository setup steps
        const repoSteps = this.generateRepositorySetupSteps(context);
        steps.push(...repoSteps.map(step => ({ ...step, stepNumber: stepNumber++ })));
        // Add issue-specific reproduction steps
        for (const evidence of context.evidenceItems) {
            const issueSteps = await this.generateIssueReproductionSteps(evidence, context);
            steps.push(...issueSteps.map(step => ({ ...step, stepNumber: stepNumber++ })));
        }
        return steps.slice(0, this.config.maxReproductionSteps);
    }
    /**
     * Generate environment setup steps
     */
    generateEnvironmentSetupSteps(context) {
        const steps = [];
        // Node.js version check
        if (context.repositoryInfo.nodeVersion) {
            steps.push({
                description: `Ensure Node.js version ${context.repositoryInfo.nodeVersion} is installed`,
                command: "node --version",
                expectedOutput: `v${context.repositoryInfo.nodeVersion}`,
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        // Package manager check
        const pmCommands = {
            npm: "npm --version",
            yarn: "yarn --version",
            pnpm: "pnpm --version"
        };
        steps.push({
            description: `Verify ${context.repositoryInfo.packageManager} is available`,
            command: pmCommands[context.repositoryInfo.packageManager],
            workingDirectory: context.repositoryInfo.rootPath
        });
        return steps;
    }
    /**
     * Generate repository setup steps
     */
    generateRepositorySetupSteps(context) {
        const steps = [];
        const pm = context.repositoryInfo.packageManager;
        // Navigate to repository
        steps.push({
            description: "Navigate to repository root",
            command: `cd ${context.repositoryInfo.rootPath}`,
            workingDirectory: context.repositoryInfo.rootPath
        });
        // Checkout specific branch/commit if specified
        if (context.repositoryInfo.branch) {
            steps.push({
                description: `Checkout branch ${context.repositoryInfo.branch}`,
                command: `git checkout ${context.repositoryInfo.branch}`,
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        if (context.repositoryInfo.commitHash) {
            steps.push({
                description: `Checkout specific commit ${context.repositoryInfo.commitHash}`,
                command: `git checkout ${context.repositoryInfo.commitHash}`,
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        // Install dependencies
        const installCommand = this.config.commandTemplates.packageManager.install
            .replace("{pm}", pm);
        steps.push({
            description: "Install project dependencies",
            command: installCommand,
            expectedOutput: "Dependencies installed successfully",
            workingDirectory: context.repositoryInfo.rootPath
        });
        // Build project if needed
        if (context.projectConfig?.buildSystem) {
            const buildCommand = this.config.commandTemplates.packageManager.build
                .replace("{pm}", pm);
            steps.push({
                description: "Build the project",
                command: buildCommand,
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        return steps;
    }
    /**
     * Generate issue-specific reproduction steps
     */
    async generateIssueReproductionSteps(evidence, context) {
        const steps = [];
        // Use existing reproduction steps if available
        if (evidence.reproductionSteps) {
            for (const reproStep of evidence.reproductionSteps) {
                steps.push({
                    description: `Reproduce ${evidence.type}: ${evidence.description}`,
                    command: reproStep,
                    workingDirectory: context.repositoryInfo.rootPath
                });
            }
            return steps;
        }
        // Generate reproduction steps based on evidence type
        switch (evidence.type) {
            case "test_failure":
                steps.push(...this.generateTestFailureReproduction(evidence, context));
                break;
            case "lint_violation":
                steps.push(...this.generateLintViolationReproduction(evidence, context));
                break;
            case "format_issue":
                steps.push(...this.generateFormatIssueReproduction(evidence, context));
                break;
            case "type_error":
                steps.push(...this.generateTypeErrorReproduction(evidence, context));
                break;
            case "security_vulnerability":
                steps.push(...this.generateSecurityVulnerabilityReproduction(evidence, context));
                break;
            case "performance_issue":
                steps.push(...this.generatePerformanceIssueReproduction(evidence, context));
                break;
            default:
                steps.push(...this.generateGenericReproduction(evidence, context));
                break;
        }
        return steps;
    }
    /**
     * Generate verification steps for fixes
     */
    async generateVerificationSteps(context) {
        const steps = [];
        let stepNumber = 1;
        // Add diff application verification if diffs are provided
        if (context.proposedDiffs && context.proposedDiffs.length > 0) {
            for (const diff of context.proposedDiffs) {
                const diffSteps = this.generateDiffVerificationSteps(diff, context);
                steps.push(...diffSteps.map(step => ({ ...step, stepNumber: stepNumber++ })));
            }
        }
        // Add general verification steps
        const generalSteps = this.generateGeneralVerificationSteps(context);
        steps.push(...generalSteps.map(step => ({ ...step, stepNumber: stepNumber++ })));
        return steps.slice(0, this.config.maxVerificationSteps);
    }
    /**
     * Generate diff verification steps
     */
    generateDiffVerificationSteps(diff, context) {
        const steps = [];
        // Apply diff
        steps.push({
            description: `Apply proposed diff: ${diff.metadata.description}`,
            command: `git apply <<'EOF'\n${diff.unifiedDiff}\nEOF`,
            successCriteria: "Diff applied successfully without conflicts",
            failureIndicators: ["patch does not apply", "conflict", "error"]
        });
        // Verify diff application
        steps.push({
            description: "Verify diff was applied correctly",
            command: "git status",
            successCriteria: "Modified files shown in git status",
            failureIndicators: ["nothing to commit", "working tree clean"]
        });
        // Run verification commands from diff
        for (const verifyCommand of diff.validation.verificationCommands) {
            steps.push({
                description: `Run verification: ${verifyCommand}`,
                command: verifyCommand,
                successCriteria: "Command completes successfully",
                failureIndicators: ["error", "failed", "FAIL"]
            });
        }
        return steps;
    }
    /**
     * Generate general verification steps
     */
    generateGeneralVerificationSteps(context) {
        const steps = [];
        const pm = context.repositoryInfo.packageManager;
        // Run tests
        steps.push({
            description: "Run all tests to verify fixes",
            command: this.config.commandTemplates.packageManager.test.replace("{pm}", pm),
            successCriteria: "All tests pass",
            failureIndicators: ["FAIL", "failed", "error", "✗"]
        });
        // Run linting
        steps.push({
            description: "Verify code passes linting",
            command: this.config.commandTemplates.packageManager.lint.replace("{pm}", pm),
            successCriteria: "No linting errors",
            failureIndicators: ["error", "✗", "problems"]
        });
        // Check formatting
        steps.push({
            description: "Verify code formatting is correct",
            command: this.config.commandTemplates.packageManager.format.replace("{pm}", pm),
            successCriteria: "Code is properly formatted",
            failureIndicators: ["would change", "needs formatting", "✗"]
        });
        // Type checking (if TypeScript)
        if (context.projectConfig?.typescript) {
            steps.push({
                description: "Verify TypeScript type checking",
                command: "npx tsc --noEmit",
                successCriteria: "No type errors",
                failureIndicators: ["error TS", "Found", "errors"]
            });
        }
        return steps;
    }
    /**
     * Generate test commands
     */
    generateTestCommands(context) {
        const commands = [];
        // Unit tests
        for (const cmd of this.config.commandTemplates.testExecution.unit) {
            commands.push({
                description: "Run unit tests",
                command: cmd,
                scope: "unit",
                expectedDuration: "< 30 seconds"
            });
        }
        // Integration tests
        for (const cmd of this.config.commandTemplates.testExecution.integration) {
            commands.push({
                description: "Run integration tests",
                command: cmd,
                scope: "integration",
                expectedDuration: "< 2 minutes"
            });
        }
        // End-to-end tests
        for (const cmd of this.config.commandTemplates.testExecution.e2e) {
            commands.push({
                description: "Run end-to-end tests",
                command: cmd,
                scope: "e2e",
                expectedDuration: "< 5 minutes"
            });
        }
        // All tests
        for (const cmd of this.config.commandTemplates.testExecution.all) {
            commands.push({
                description: "Run all tests",
                command: cmd,
                scope: "all",
                expectedDuration: "< 10 minutes"
            });
        }
        return commands;
    }
    /**
     * Generate validation commands
     */
    generateValidationCommands(context) {
        const commands = [];
        // Linting commands
        for (const cmd of this.config.commandTemplates.validation.lint) {
            commands.push({
                type: "lint",
                description: "Run code linting",
                command: cmd,
                configFile: this.getLintConfigFile(context.projectConfig)
            });
        }
        // Formatting commands
        for (const cmd of this.config.commandTemplates.validation.format) {
            commands.push({
                type: "format",
                description: "Check code formatting",
                command: cmd,
                configFile: this.getFormatConfigFile(context.projectConfig)
            });
        }
        // Type checking commands
        for (const cmd of this.config.commandTemplates.validation.typeCheck) {
            commands.push({
                type: "type-check",
                description: "Run TypeScript type checking",
                command: cmd,
                configFile: "tsconfig.json"
            });
        }
        // Security commands
        for (const cmd of this.config.commandTemplates.validation.security) {
            commands.push({
                type: "security",
                description: "Run security audit",
                command: cmd
            });
        }
        return commands;
    }
    /**
     * Generate metadata for the reproduction guide
     */
    generateMetadata(context) {
        const environmentRequirements = [];
        if (context.repositoryInfo.nodeVersion) {
            environmentRequirements.push(`Node.js ${context.repositoryInfo.nodeVersion}`);
        }
        environmentRequirements.push(`${context.repositoryInfo.packageManager} package manager`);
        if (context.projectConfig?.typescript) {
            environmentRequirements.push("TypeScript support");
        }
        return {
            timestamp: Date.now(),
            id: `repro_guide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            target: this.generateTargetDescription(context),
            environmentRequirements
        };
    }
    // ============================================================================
    // Evidence Type-Specific Reproduction Methods
    // ============================================================================
    generateTestFailureReproduction(evidence, context) {
        const steps = [];
        const pm = context.repositoryInfo.packageManager;
        // Extract test file from location
        const testFile = this.extractFileFromLocation(evidence.location);
        if (testFile) {
            steps.push({
                description: `Run specific failing test: ${testFile}`,
                command: `${pm} test ${testFile}`,
                expectedOutput: "Test failure with error details",
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        else {
            steps.push({
                description: "Run all tests to reproduce failure",
                command: `${pm} test`,
                expectedOutput: "Test failure output",
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        return steps;
    }
    generateLintViolationReproduction(evidence, context) {
        const steps = [];
        const file = this.extractFileFromLocation(evidence.location);
        if (file) {
            steps.push({
                description: `Run linter on specific file: ${file}`,
                command: `npx eslint ${file}`,
                expectedOutput: "Linting errors displayed",
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        else {
            steps.push({
                description: "Run linter on all files",
                command: "npx eslint .",
                expectedOutput: "Linting violations shown",
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        return steps;
    }
    generateFormatIssueReproduction(evidence, context) {
        const steps = [];
        const file = this.extractFileFromLocation(evidence.location);
        if (file) {
            steps.push({
                description: `Check formatting on specific file: ${file}`,
                command: `npx prettier --check ${file}`,
                expectedOutput: "Formatting issues displayed",
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        else {
            steps.push({
                description: "Check formatting on all files",
                command: "npx prettier --check .",
                expectedOutput: "Files with formatting issues listed",
                workingDirectory: context.repositoryInfo.rootPath
            });
        }
        return steps;
    }
    generateTypeErrorReproduction(evidence, context) {
        const steps = [];
        steps.push({
            description: "Run TypeScript compiler to reproduce type errors",
            command: "npx tsc --noEmit",
            expectedOutput: "Type errors displayed",
            workingDirectory: context.repositoryInfo.rootPath
        });
        return steps;
    }
    generateSecurityVulnerabilityReproduction(evidence, context) {
        const steps = [];
        const pm = context.repositoryInfo.packageManager;
        steps.push({
            description: "Run security audit to identify vulnerabilities",
            command: `${pm} audit`,
            expectedOutput: "Security vulnerabilities listed",
            workingDirectory: context.repositoryInfo.rootPath
        });
        return steps;
    }
    generatePerformanceIssueReproduction(evidence, context) {
        const steps = [];
        steps.push({
            description: "Run performance tests to reproduce performance issues",
            command: "npm run test:performance",
            expectedOutput: "Performance metrics showing issues",
            workingDirectory: context.repositoryInfo.rootPath
        });
        return steps;
    }
    generateGenericReproduction(evidence, context) {
        const steps = [];
        steps.push({
            description: `Investigate ${evidence.type}: ${evidence.description}`,
            command: "# Manual investigation required",
            expectedOutput: "Issue details visible",
            workingDirectory: context.repositoryInfo.rootPath
        });
        return steps;
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    extractFileFromLocation(location) {
        const parts = location.split(":");
        return parts.length > 0 ? parts[0] : null;
    }
    getLintConfigFile(projectConfig) {
        if (projectConfig?.linter === "eslint") {
            return ".eslintrc.js";
        }
        return undefined;
    }
    getFormatConfigFile(projectConfig) {
        if (projectConfig?.formatter === "prettier") {
            return ".prettierrc";
        }
        return undefined;
    }
    generateTargetDescription(context) {
        const evidenceTypes = [...new Set(context.evidenceItems.map(e => e.type))];
        return `Reproduce and verify fixes for: ${evidenceTypes.join(", ")}`;
    }
}
// ============================================================================
// Default Configuration
// ============================================================================
/**
 * Default configuration for reproduction guide generation
 */
export const DEFAULT_REPRODUCTION_GUIDE_CONFIG = {
    maxReproductionSteps: 20,
    maxVerificationSteps: 15,
    includeEnvironmentSetup: true,
    commandTimeout: 300, // 5 minutes
    commandTemplates: {
        packageManager: {
            install: "{pm} install",
            test: "{pm} test",
            build: "{pm} run build",
            lint: "{pm} run lint",
            format: "{pm} run format:check"
        },
        testExecution: {
            unit: ["npm run test:unit", "npm test -- --testPathPattern=unit"],
            integration: ["npm run test:integration", "npm test -- --testPathPattern=integration"],
            e2e: ["npm run test:e2e", "npm test -- --testPathPattern=e2e"],
            all: ["npm test", "npm run test:all"]
        },
        validation: {
            lint: ["npm run lint", "npx eslint .", "npx biome check ."],
            format: ["npm run format:check", "npx prettier --check .", "npx biome format --check ."],
            typeCheck: ["npx tsc --noEmit", "npm run type-check"],
            security: ["npm audit", "npx audit-ci", "npm run security:check"]
        },
        buildDeploy: {
            build: ["npm run build", "npm run compile"],
            start: ["npm start", "npm run start:prod"],
            dev: ["npm run dev", "npm run start:dev"]
        }
    }
};
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Create reproduction guide generator with default configuration
 */
export function createReproductionGuideGenerator(config) {
    return new ReproductionGuideGenerator(config);
}
/**
 * Validate reproduction guide structure
 */
export function validateReproductionGuide(guide) {
    const errors = [];
    if (!guide.metadata || !guide.metadata.id) {
        errors.push("Missing or invalid metadata");
    }
    if (!Array.isArray(guide.reproductionSteps)) {
        errors.push("Reproduction steps must be an array");
    }
    if (!Array.isArray(guide.verificationSteps)) {
        errors.push("Verification steps must be an array");
    }
    if (!Array.isArray(guide.testCommands)) {
        errors.push("Test commands must be an array");
    }
    if (!Array.isArray(guide.validationCommands)) {
        errors.push("Validation commands must be an array");
    }
    // Validate step structure
    for (const step of guide.reproductionSteps) {
        if (!step.stepNumber || !step.description || !step.command) {
            errors.push(`Invalid reproduction step: missing required fields`);
        }
    }
    for (const step of guide.verificationSteps) {
        if (!step.stepNumber || !step.description || !step.command || !step.successCriteria) {
            errors.push(`Invalid verification step: missing required fields`);
        }
    }
    return errors;
}
//# sourceMappingURL=reproduction-guide-generator.js.map