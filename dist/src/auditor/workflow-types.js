/**
 * Workflow Step Definitions and Interfaces for GAN Auditor System Prompt
 *
 * This module defines the 8-step audit workflow structure with step definitions,
 * execution logic, validation, and evidence collection as specified in
 * requirements 2.1 and 2.2.
 */
// ============================================================================
// Default Workflow Definition
// ============================================================================
/**
 * Default 8-step GAN audit workflow
 */
export const DEFAULT_AUDIT_WORKFLOW = {
    id: "gan-audit-8-step",
    name: "GAN Auditor 8-Step Workflow",
    description: "Comprehensive 8-step adversarial audit workflow for code quality assessment",
    steps: [
        {
            name: "INIT",
            description: "Restate task goal, acceptance criteria (ACs), and constraints from Spec",
            actions: [
                "Load session state",
                "Parse requirements from Spec documents",
                "Extract acceptance criteria",
                "Identify constraints from Steering documents",
                "Detect touched files/modules"
            ],
            order: 1,
            required: true,
            expectedOutputs: ["taskGoals", "acceptanceCriteria", "constraints", "touchedFiles"]
        },
        {
            name: "REPRO",
            description: "Establish deterministic repro for the feature/bugfix",
            actions: [
                "Create minimal reproduction steps",
                "Verify current behavior",
                "Document expected vs actual behavior",
                "Generate minimal command sequence"
            ],
            order: 2,
            required: true,
            expectedOutputs: ["reproductionSteps", "currentBehavior", "expectedBehavior", "minimalCommands"]
        },
        {
            name: "STATIC",
            description: "Lint/format/type-check and scan for code smells",
            actions: [
                "Run linting tools",
                "Check formatting compliance",
                "Perform type checking",
                "Detect code smells and anti-patterns"
            ],
            order: 3,
            required: true,
            expectedOutputs: ["lintResults", "formatIssues", "typeCheckResults", "codeSmells"]
        },
        {
            name: "TESTS",
            description: "Run existing tests and add focused tests for missing coverage",
            actions: [
                "Execute existing test suite",
                "Identify coverage gaps",
                "Create focused tests for missing coverage",
                "Validate test quality and assertions"
            ],
            order: 4,
            required: true,
            expectedOutputs: ["testResults", "coverageGaps", "suggestedTests", "testQualityMetrics"]
        },
        {
            name: "DYNAMIC",
            description: "Runtime validation and boundary testing",
            actions: [
                "Test edge cases and boundary conditions",
                "Validate error handling paths",
                "Check performance characteristics",
                "Scan for security vulnerabilities"
            ],
            order: 5,
            required: true,
            expectedOutputs: ["edgeCaseResults", "errorHandlingResults", "performanceMetrics", "securityFindings"]
        },
        {
            name: "CONFORM",
            description: "Verify naming/structure/library usage per Steering",
            actions: [
                "Check naming conventions",
                "Validate architecture patterns",
                "Review library usage",
                "Analyze dependencies"
            ],
            order: 6,
            required: true,
            expectedOutputs: ["namingViolations", "architectureViolations", "libraryIssues", "dependencyAnalysis"]
        },
        {
            name: "TRACE",
            description: "Map changed artifacts to Spec requirements",
            actions: [
                "Create traceability matrix",
                "Map ACs to implementation files",
                "Identify unmet ACs",
                "Detect missing implementations"
            ],
            order: 7,
            required: true,
            expectedOutputs: ["traceabilityMatrix", "unmetACs", "missingImplementations", "coverageReport"]
        },
        {
            name: "VERDICT",
            description: "Score and determine ship/no-ship with evidence",
            actions: [
                "Calculate dimensional scores",
                "Determine overall verdict",
                "Generate structured feedback",
                "Create evidence-based decision documentation"
            ],
            order: 8,
            required: true,
            expectedOutputs: ["dimensionalScores", "overallVerdict", "structuredFeedback", "decisionDocumentation"]
        }
    ],
    config: {
        enforceOrder: true,
        allowSkipping: false,
        requireEvidence: true,
        stepTimeout: 30000, // 30 seconds per step
        continueOnFailure: false
    }
};
/**
 * Default workflow configuration
 */
export const DEFAULT_WORKFLOW_CONFIG = {
    enforceOrder: true,
    allowSkipping: false,
    requireEvidence: true,
    stepTimeout: 30000,
    continueOnFailure: false
};
//# sourceMappingURL=workflow-types.js.map