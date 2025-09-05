/**
 * Multi-Dimensional Quality Assessment Framework for GAN Auditor System Prompt
 *
 * This module implements the quality dimension definitions, scoring algorithms,
 * and weighted average calculations as specified in requirements 3.1-3.7.
 *
 * The framework provides:
 * - QualityDimension interface with weight and criteria
 * - Dimensional scoring algorithms (0-100 scale)
 * - Weighted average calculation for overall score
 * - Scoring validation and normalization
 */
// ============================================================================
// Quality Assessment Framework
// ============================================================================
/**
 * Multi-dimensional quality assessment framework
 * Implements the 6-dimension quality model with weighted scoring
 */
export class QualityAssessmentFramework {
    dimensions;
    config;
    constructor(dimensions, config) {
        this.dimensions = dimensions || DEFAULT_QUALITY_DIMENSIONS;
        this.config = { ...DEFAULT_QUALITY_FRAMEWORK_CONFIG, ...config };
        this.validateDimensions();
    }
    /**
     * Evaluate code quality across all dimensions
     */
    async evaluateQuality(code, context) {
        const startTime = Date.now();
        const dimensionEvaluations = [];
        const criticalIssues = [];
        // Evaluate each dimension
        for (const dimension of this.dimensions) {
            const evaluation = await this.evaluateDimension(dimension, code, context);
            dimensionEvaluations.push(evaluation);
            // Collect critical issues
            const dimensionCriticalIssues = this.extractCriticalIssues(evaluation);
            criticalIssues.push(...dimensionCriticalIssues);
        }
        // Calculate overall weighted score
        const overallScore = this.calculateWeightedScore(dimensionEvaluations);
        // Determine if passes ship criteria
        const passesShipCriteria = this.evaluateShipCriteria(overallScore, dimensionEvaluations, criticalIssues);
        // Generate executive summary
        const executiveSummary = this.generateExecutiveSummary(overallScore, dimensionEvaluations, passesShipCriteria);
        // Generate next actions
        const nextActions = this.generateNextActions(dimensionEvaluations, criticalIssues, passesShipCriteria);
        return {
            overallScore,
            passesShipCriteria,
            dimensionEvaluations,
            timestamp: startTime,
            duration: Date.now() - startTime,
            criticalIssues,
            executiveSummary,
            nextActions
        };
    }
    /**
     * Evaluate a single quality dimension
     */
    async evaluateDimension(dimension, code, context) {
        const criterionEvaluations = [];
        // Evaluate each criterion in the dimension
        for (const criterion of dimension.criteria) {
            const evaluation = await this.evaluateCriterion(criterion, code, context);
            criterionEvaluations.push(evaluation);
        }
        // Calculate dimension score as weighted average of criteria
        const score = this.calculateCriterionWeightedScore(criterionEvaluations);
        const passed = score >= dimension.minThreshold;
        // Generate dimension feedback
        const feedback = this.generateDimensionFeedback(dimension, criterionEvaluations, score);
        // Generate improvement suggestions
        const improvements = this.generateDimensionImprovements(criterionEvaluations);
        return {
            dimension,
            score,
            passed,
            criterionEvaluations,
            feedback,
            improvements
        };
    }
    /**
     * Evaluate a single quality criterion
     */
    async evaluateCriterion(criterion, code, context) {
        // This is a placeholder implementation
        // In a real implementation, this would dispatch to specific evaluators
        // based on the criterion's evaluation method
        const evidence = [];
        let score = 75; // Default score
        let feedback = `Evaluated ${criterion.name}`;
        const suggestions = [];
        // Simulate evaluation based on method
        switch (criterion.evaluationMethod) {
            case "automated_check":
                // Would integrate with linting tools, formatters, etc.
                score = Math.random() * 40 + 60; // 60-100 range
                break;
            case "manual_review":
                // Would perform code review analysis
                score = Math.random() * 30 + 50; // 50-80 range
                break;
            case "metric_analysis":
                // Would analyze code metrics
                score = Math.random() * 50 + 50; // 50-100 range
                break;
            case "pattern_matching":
                // Would detect code patterns
                score = Math.random() * 40 + 40; // 40-80 range
                break;
            case "coverage_analysis":
                // Would analyze test coverage
                score = Math.random() * 60 + 40; // 40-100 range
                break;
            case "security_scan":
                // Would perform security analysis
                score = Math.random() * 30 + 70; // 70-100 range
                break;
        }
        const passed = score >= this.config.criterionPassThreshold;
        return {
            criterion,
            score: Math.round(score),
            passed,
            evidence,
            feedback,
            suggestions
        };
    }
    /**
     * Calculate weighted average score from dimension evaluations
     */
    calculateWeightedScore(evaluations) {
        let weightedSum = 0;
        let totalWeight = 0;
        for (const evaluation of evaluations) {
            weightedSum += evaluation.score * evaluation.dimension.weight;
            totalWeight += evaluation.dimension.weight;
        }
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }
    /**
     * Calculate weighted average score from criterion evaluations
     */
    calculateCriterionWeightedScore(evaluations) {
        let weightedSum = 0;
        let totalWeight = 0;
        for (const evaluation of evaluations) {
            weightedSum += evaluation.score * evaluation.criterion.weight;
            totalWeight += evaluation.criterion.weight;
        }
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }
    /**
     * Validate that dimensions are properly configured
     */
    validateDimensions() {
        if (this.dimensions.length === 0) {
            throw new Error("At least one quality dimension must be defined");
        }
        // Check that weights sum to approximately 1.0
        const totalWeight = this.dimensions.reduce((sum, dim) => sum + dim.weight, 0);
        if (Math.abs(totalWeight - 1.0) > 0.01) {
            throw new Error(`Dimension weights must sum to 1.0, got ${totalWeight}`);
        }
        // Validate each dimension
        for (const dimension of this.dimensions) {
            this.validateDimension(dimension);
        }
    }
    /**
     * Validate a single dimension configuration
     */
    validateDimension(dimension) {
        if (dimension.weight < 0 || dimension.weight > 1) {
            throw new Error(`Dimension weight must be between 0 and 1, got ${dimension.weight}`);
        }
        if (dimension.criteria.length === 0) {
            throw new Error(`Dimension ${dimension.name} must have at least one criterion`);
        }
        // Check that criterion weights sum to approximately 1.0
        const totalWeight = dimension.criteria.reduce((sum, crit) => sum + crit.weight, 0);
        if (Math.abs(totalWeight - 1.0) > 0.01) {
            throw new Error(`Criterion weights in dimension ${dimension.name} must sum to 1.0, got ${totalWeight}`);
        }
    }
    /**
     * Evaluate whether code passes ship criteria
     */
    evaluateShipCriteria(overallScore, dimensionEvaluations, criticalIssues) {
        // Must have no critical issues
        if (criticalIssues.length > 0) {
            return false;
        }
        // Must meet overall score threshold
        if (overallScore < this.config.shipScoreThreshold) {
            return false;
        }
        // All required dimensions must pass their thresholds
        for (const evaluation of dimensionEvaluations) {
            if (evaluation.dimension.required && !evaluation.passed) {
                return false;
            }
        }
        return true;
    }
    /**
     * Extract critical issues from dimension evaluation
     */
    extractCriticalIssues(evaluation) {
        const issues = [];
        // Check if dimension fails minimum threshold
        if (evaluation.dimension.required && !evaluation.passed) {
            issues.push({
                id: `${evaluation.dimension.id}_threshold_failure`,
                title: `${evaluation.dimension.name} Below Threshold`,
                description: `Dimension score ${evaluation.score} is below required threshold ${evaluation.dimension.minThreshold}`,
                dimension: evaluation.dimension.name,
                location: "overall",
                severity: "Critical",
                blockingReason: "Required dimension below minimum threshold",
                suggestedFix: `Improve ${evaluation.dimension.name} to reach minimum score of ${evaluation.dimension.minThreshold}`
            });
        }
        // Extract critical issues from criterion evaluations
        for (const criterionEval of evaluation.criterionEvaluations) {
            for (const evidence of criterionEval.evidence) {
                if (evidence.impact === "negative" && evidence.type === "critical") {
                    issues.push({
                        id: `${criterionEval.criterion.id}_critical`,
                        title: evidence.description,
                        description: evidence.proof,
                        dimension: evaluation.dimension.name,
                        location: evidence.location || "unknown",
                        severity: "Critical",
                        blockingReason: "Critical quality issue detected",
                        suggestedFix: criterionEval.suggestions[0] || "Manual review required"
                    });
                }
            }
        }
        return issues;
    }
    /**
     * Generate executive summary of the assessment
     */
    generateExecutiveSummary(overallScore, dimensionEvaluations, passesShipCriteria) {
        const verdict = passesShipCriteria ? "SHIP" : "NO-SHIP";
        const topDimensions = dimensionEvaluations
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .map(e => `${e.dimension.name} (${e.score}%)`)
            .join(", ");
        const bottomDimensions = dimensionEvaluations
            .sort((a, b) => a.score - b.score)
            .slice(0, 2)
            .map(e => `${e.dimension.name} (${e.score}%)`)
            .join(", ");
        return `${verdict}: Overall score ${overallScore}%. Strongest areas: ${topDimensions}. Areas needing improvement: ${bottomDimensions}.`;
    }
    /**
     * Generate next recommended actions
     */
    generateNextActions(dimensionEvaluations, criticalIssues, passesShipCriteria) {
        const actions = [];
        if (criticalIssues.length > 0) {
            actions.push(`Address ${criticalIssues.length} critical issue(s) before shipping`);
            actions.push(...criticalIssues.slice(0, 3).map(issue => issue.suggestedFix));
        }
        if (!passesShipCriteria) {
            // Find lowest scoring dimensions
            const lowestDimensions = dimensionEvaluations
                .sort((a, b) => a.score - b.score)
                .slice(0, 2);
            for (const dim of lowestDimensions) {
                if (dim.improvements.length > 0) {
                    actions.push(`Improve ${dim.dimension.name}: ${dim.improvements[0]}`);
                }
            }
        }
        if (passesShipCriteria) {
            actions.push("Code quality meets ship criteria - ready for deployment");
        }
        return actions.slice(0, 5); // Limit to 5 actions
    }
    /**
     * Generate feedback for a dimension
     */
    generateDimensionFeedback(dimension, criterionEvaluations, score) {
        const passedCriteria = criterionEvaluations.filter(e => e.passed).length;
        const totalCriteria = criterionEvaluations.length;
        return `${dimension.name}: ${score}% (${passedCriteria}/${totalCriteria} criteria passed)`;
    }
    /**
     * Generate improvement suggestions for a dimension
     */
    generateDimensionImprovements(criterionEvaluations) {
        const improvements = [];
        // Get suggestions from failed criteria
        const failedCriteria = criterionEvaluations.filter(e => !e.passed);
        for (const criterion of failedCriteria) {
            improvements.push(...criterion.suggestions);
        }
        return improvements.slice(0, 3); // Limit to top 3 improvements
    }
}
// ============================================================================
// Default Configuration
// ============================================================================
/**
 * Default quality framework configuration
 */
export const DEFAULT_QUALITY_FRAMEWORK_CONFIG = {
    shipScoreThreshold: 85,
    criterionPassThreshold: 60,
    maxCriticalIssues: 0,
    requireAllDimensions: true
};
// ============================================================================
// Default Quality Dimensions (Requirements 3.1-3.7)
// ============================================================================
/**
 * Default quality dimensions implementing the 6-dimension quality model
 * with weights as specified in requirements 3.1-3.7
 */
export const DEFAULT_QUALITY_DIMENSIONS = [
    // Requirement 3.1: Correctness & Completeness (30% weight)
    {
        id: "correctness_completeness",
        name: "Correctness & Completeness",
        weight: 0.30,
        description: "Evaluates functional correctness, requirement fulfillment, and implementation completeness",
        minThreshold: 80,
        required: true,
        criteria: [
            {
                id: "ac_fulfillment",
                name: "Acceptance Criteria Fulfillment",
                description: "All acceptance criteria are properly implemented and validated",
                weight: 0.35,
                evaluationMethod: "coverage_analysis",
                expectedEvidence: ["requirement_mapping", "test_coverage", "implementation_proof"]
            },
            {
                id: "edge_case_coverage",
                name: "Edge Case Coverage",
                description: "Edge cases and boundary conditions are properly handled",
                weight: 0.25,
                evaluationMethod: "pattern_matching",
                expectedEvidence: ["edge_case_tests", "boundary_validation", "error_handling"]
            },
            {
                id: "error_path_validation",
                name: "Error Path Validation",
                description: "Error conditions are properly handled and tested",
                weight: 0.25,
                evaluationMethod: "automated_check",
                expectedEvidence: ["error_tests", "exception_handling", "graceful_degradation"]
            },
            {
                id: "idempotency_checking",
                name: "Idempotency Checking",
                description: "Operations are idempotent where required",
                weight: 0.15,
                evaluationMethod: "pattern_matching",
                expectedEvidence: ["idempotency_tests", "state_validation", "repeat_operation_safety"]
            }
        ]
    },
    // Requirement 3.2: Testing Quality (20% weight)
    {
        id: "testing_quality",
        name: "Tests",
        weight: 0.20,
        description: "Evaluates test coverage, quality, and test-driven development practices",
        minThreshold: 75,
        required: true,
        criteria: [
            {
                id: "test_coverage_analysis",
                name: "Test Coverage Analysis",
                description: "Adequate test coverage for new and changed functionality",
                weight: 0.40,
                evaluationMethod: "coverage_analysis",
                expectedEvidence: ["coverage_report", "line_coverage", "branch_coverage"]
            },
            {
                id: "test_quality_metrics",
                name: "Test Quality Metrics",
                description: "Tests are well-written with meaningful assertions",
                weight: 0.30,
                evaluationMethod: "manual_review",
                expectedEvidence: ["assertion_quality", "test_structure", "test_maintainability"]
            },
            {
                id: "meaningful_assertions",
                name: "Meaningful Assertions",
                description: "Test assertions validate actual behavior and outcomes",
                weight: 0.20,
                evaluationMethod: "pattern_matching",
                expectedEvidence: ["assertion_analysis", "behavior_validation", "outcome_verification"]
            },
            {
                id: "tdd_workflow_validation",
                name: "TDD Workflow Validation",
                description: "Evidence of test-driven development practices",
                weight: 0.10,
                evaluationMethod: "manual_review",
                expectedEvidence: ["failing_test_first", "red_green_refactor", "test_commit_history"]
            }
        ]
    },
    // Requirement 3.3: Style & Conventions (15% weight)
    {
        id: "style_conventions",
        name: "Style & Conventions",
        weight: 0.15,
        description: "Evaluates code style, formatting, naming conventions, and documentation",
        minThreshold: 70,
        required: false,
        criteria: [
            {
                id: "linting_formatting_integration",
                name: "Linting and Formatting Integration",
                description: "Code passes linting and formatting checks per project standards",
                weight: 0.40,
                evaluationMethod: "automated_check",
                expectedEvidence: ["lint_results", "format_check", "style_compliance"]
            },
            {
                id: "naming_convention_validation",
                name: "Naming Convention Validation",
                description: "Consistent and meaningful naming throughout the codebase",
                weight: 0.30,
                evaluationMethod: "pattern_matching",
                expectedEvidence: ["naming_analysis", "convention_compliance", "readability_score"]
            },
            {
                id: "import_organization",
                name: "Import Organization",
                description: "Imports are properly organized and follow project conventions",
                weight: 0.20,
                evaluationMethod: "automated_check",
                expectedEvidence: ["import_order", "unused_imports", "dependency_organization"]
            },
            {
                id: "documentation_quality",
                name: "Documentation Quality",
                description: "Adequate inline documentation and comments",
                weight: 0.10,
                evaluationMethod: "manual_review",
                expectedEvidence: ["comment_coverage", "docstring_quality", "api_documentation"]
            }
        ]
    },
    // Requirement 3.4: Security (15% weight)
    {
        id: "security_assessment",
        name: "Security",
        weight: 0.15,
        description: "Evaluates security practices, vulnerability prevention, and safe coding patterns",
        minThreshold: 85,
        required: true,
        criteria: [
            {
                id: "input_validation_checking",
                name: "Input Validation Checking",
                description: "All inputs are properly validated and sanitized",
                weight: 0.35,
                evaluationMethod: "security_scan",
                expectedEvidence: ["input_validation", "sanitization", "injection_prevention"]
            },
            {
                id: "secret_detection",
                name: "Secret Detection and Validation",
                description: "No secrets or sensitive data in code or logs",
                weight: 0.25,
                evaluationMethod: "security_scan",
                expectedEvidence: ["secret_scan", "credential_management", "environment_variables"]
            },
            {
                id: "safe_defaults_verification",
                name: "Safe Defaults Verification",
                description: "Secure defaults and fail-safe error handling",
                weight: 0.25,
                evaluationMethod: "pattern_matching",
                expectedEvidence: ["default_security", "fail_safe", "principle_least_privilege"]
            },
            {
                id: "dependency_security_analysis",
                name: "Dependency Security Analysis",
                description: "Dependencies are secure and up-to-date",
                weight: 0.15,
                evaluationMethod: "security_scan",
                expectedEvidence: ["vulnerability_scan", "dependency_audit", "version_analysis"]
            }
        ]
    },
    // Requirement 3.5: Performance (10% weight)
    {
        id: "performance_assessment",
        name: "Performance",
        weight: 0.10,
        description: "Evaluates performance characteristics, efficiency, and resource management",
        minThreshold: 65,
        required: false,
        criteria: [
            {
                id: "performance_bottleneck_detection",
                name: "Performance Bottleneck Detection",
                description: "No obvious performance bottlenecks in critical paths",
                weight: 0.40,
                evaluationMethod: "metric_analysis",
                expectedEvidence: ["performance_profile", "bottleneck_analysis", "critical_path_timing"]
            },
            {
                id: "algorithm_efficiency_analysis",
                name: "Algorithm Efficiency Analysis",
                description: "Efficient algorithms and data structures are used",
                weight: 0.30,
                evaluationMethod: "pattern_matching",
                expectedEvidence: ["complexity_analysis", "algorithm_choice", "data_structure_efficiency"]
            },
            {
                id: "resource_management_validation",
                name: "Resource Management Validation",
                description: "Proper resource allocation, cleanup, and memory management",
                weight: 0.20,
                evaluationMethod: "pattern_matching",
                expectedEvidence: ["memory_management", "resource_cleanup", "leak_prevention"]
            },
            {
                id: "caching_opportunity_identification",
                name: "Caching Opportunity Identification",
                description: "Appropriate use of caching where beneficial",
                weight: 0.10,
                evaluationMethod: "manual_review",
                expectedEvidence: ["caching_strategy", "cache_invalidation", "performance_improvement"]
            }
        ]
    },
    // Requirement 3.6: Documentation & Traceability (10% weight)
    {
        id: "documentation_traceability",
        name: "Docs & Traceability",
        weight: 0.10,
        description: "Evaluates documentation completeness, traceability, and maintainability",
        minThreshold: 60,
        required: false,
        criteria: [
            {
                id: "inline_documentation_validation",
                name: "Inline Documentation Validation",
                description: "Complex logic is properly documented with inline comments",
                weight: 0.35,
                evaluationMethod: "manual_review",
                expectedEvidence: ["comment_coverage", "complexity_documentation", "intent_explanation"]
            },
            {
                id: "adr_requirement_checking",
                name: "ADR Requirement Checking",
                description: "Architectural decisions are documented where required",
                weight: 0.25,
                evaluationMethod: "manual_review",
                expectedEvidence: ["adr_presence", "decision_rationale", "alternative_consideration"]
            },
            {
                id: "changelog_entry_validation",
                name: "Changelog Entry Validation",
                description: "Behavior changes are documented in changelog",
                weight: 0.25,
                evaluationMethod: "manual_review",
                expectedEvidence: ["changelog_entry", "breaking_changes", "migration_guide"]
            },
            {
                id: "api_documentation_completeness",
                name: "API Documentation Completeness",
                description: "Public APIs are properly documented",
                weight: 0.15,
                evaluationMethod: "automated_check",
                expectedEvidence: ["api_docs", "parameter_documentation", "return_value_docs"]
            }
        ]
    }
];
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Create a quality assessment framework with default dimensions
 */
export function createDefaultQualityFramework(config) {
    return new QualityAssessmentFramework(DEFAULT_QUALITY_DIMENSIONS, config);
}
/**
 * Validate quality dimension configuration
 */
export function validateQualityDimensions(dimensions) {
    const errors = [];
    if (dimensions.length === 0) {
        errors.push("At least one quality dimension must be defined");
        return errors;
    }
    // Check total weight
    const totalWeight = dimensions.reduce((sum, dim) => sum + dim.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
        errors.push(`Dimension weights must sum to 1.0, got ${totalWeight}`);
    }
    // Validate each dimension
    for (const dimension of dimensions) {
        const dimensionErrors = validateQualityDimension(dimension);
        errors.push(...dimensionErrors);
    }
    return errors;
}
/**
 * Validate a single quality dimension
 */
export function validateQualityDimension(dimension) {
    const errors = [];
    if (dimension.weight < 0 || dimension.weight > 1) {
        errors.push(`Dimension ${dimension.name} weight must be between 0 and 1, got ${dimension.weight}`);
    }
    if (dimension.criteria.length === 0) {
        errors.push(`Dimension ${dimension.name} must have at least one criterion`);
    }
    // Check criterion weights
    const totalWeight = dimension.criteria.reduce((sum, crit) => sum + crit.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
        errors.push(`Criterion weights in dimension ${dimension.name} must sum to 1.0, got ${totalWeight}`);
    }
    // Validate each criterion
    for (const criterion of dimension.criteria) {
        if (criterion.weight < 0 || criterion.weight > 1) {
            errors.push(`Criterion ${criterion.name} weight must be between 0 and 1, got ${criterion.weight}`);
        }
    }
    return errors;
}
/**
 * Get quality dimension by ID
 */
export function getQualityDimensionById(dimensions, id) {
    return dimensions.find(dim => dim.id === id);
}
/**
 * Get quality criterion by ID within a dimension
 */
export function getQualityCriterionById(dimension, id) {
    return dimension.criteria.find(crit => crit.id === id);
}
/**
 * Calculate score distribution across dimensions
 */
export function calculateScoreDistribution(assessment) {
    const distribution = {};
    for (const evaluation of assessment.dimensionEvaluations) {
        distribution[evaluation.dimension.name] = evaluation.score;
    }
    return distribution;
}
/**
 * Get failing dimensions from assessment
 */
export function getFailingDimensions(assessment) {
    return assessment.dimensionEvaluations.filter(evaluation => !evaluation.passed);
}
/**
 * Get critical issues by dimension
 */
export function getCriticalIssuesByDimension(assessment) {
    const issuesByDimension = {};
    for (const issue of assessment.criticalIssues) {
        if (!issuesByDimension[issue.dimension]) {
            issuesByDimension[issue.dimension] = [];
        }
        issuesByDimension[issue.dimension].push(issue);
    }
    return issuesByDimension;
}
//# sourceMappingURL=quality-assessment.js.map