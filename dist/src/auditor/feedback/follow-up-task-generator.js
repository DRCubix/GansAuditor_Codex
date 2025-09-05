/**
 * Follow-up Task Generator for GAN Auditor System Prompt
 *
 * This module implements follow-up task generation with ordered, scoped TODO list creation,
 * task prioritization, actionable item specification, and effort estimation
 * as specified in requirement 5.6.
 *
 * Requirements addressed:
 * - 5.6: Follow-up task generation
 * - Implement ordered, scoped TODO list creation
 * - Add task prioritization (critical issues first)
 * - Create actionable item specification
 * - Add effort estimation where helpful
 */
// ============================================================================
// Follow-up Task Generator Implementation
// ============================================================================
/**
 * Generates prioritized follow-up task lists with effort estimation
 */
export class FollowUpTaskGenerator {
    config;
    constructor(config) {
        this.config = {
            ...DEFAULT_FOLLOW_UP_TASK_CONFIG,
            ...config
        };
    }
    /**
     * Generate follow-up task list from evidence and issues
     */
    async generateFollowUpTasks(context) {
        // Generate metadata
        const metadata = this.generateMetadata(context);
        // Create tasks from various sources
        const allTasks = await this.createTasksFromSources(context);
        // Prioritize and order tasks
        const prioritizedTasks = this.prioritizeTasks(allTasks, context);
        // Limit to maximum tasks
        const finalTasks = prioritizedTasks.slice(0, this.config.maxTasks);
        // Generate summary
        const summary = this.generateSummary(finalTasks);
        return {
            metadata,
            tasks: finalTasks,
            summary
        };
    }
    /**
     * Create tasks from various sources
     */
    async createTasksFromSources(context) {
        const tasks = [];
        // Create tasks from critical issues
        const criticalTasks = await this.createTasksFromCriticalIssues(context.criticalIssues, context);
        tasks.push(...criticalTasks);
        // Create tasks from evidence items
        const evidenceTasks = await this.createTasksFromEvidence(context.evidenceItems, context);
        tasks.push(...evidenceTasks);
        // Create tasks from unmet ACs
        const acTasks = await this.createTasksFromUnmetACs(context.unmetACs, context);
        tasks.push(...acTasks);
        // Create tasks from missing tests
        const testTasks = await this.createTasksFromMissingTests(context.missingTests, context);
        tasks.push(...testTasks);
        return tasks;
    }
    /**
     * Create tasks from critical issues
     */
    async createTasksFromCriticalIssues(criticalIssues, context) {
        const tasks = [];
        for (const issue of criticalIssues) {
            const task = {
                id: `critical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: `Fix Critical Issue: ${issue.title}`,
                description: issue.description,
                category: "critical_fix",
                priority: "critical",
                dependencies: [],
                acceptanceCriteria: [
                    "Issue is completely resolved",
                    "No regression in existing functionality",
                    "Appropriate tests are added or updated"
                ],
                relatedEvidence: [issue.id]
            };
            // Add effort estimation if enabled
            if (this.config.includeEffortEstimation) {
                task.effortEstimate = this.estimateEffort(task, context);
            }
            tasks.push(task);
        }
        return tasks;
    }
    /**
     * Create tasks from evidence items
     */
    async createTasksFromEvidence(evidenceItems, context) {
        const tasks = [];
        for (const evidence of evidenceItems) {
            // Skip if already covered by critical issues
            if (evidence.severity === "Critical") {
                continue;
            }
            const task = {
                id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: this.generateTaskTitle(evidence),
                description: this.generateTaskDescription(evidence),
                category: this.categorizeTask(evidence),
                priority: this.prioritizeTask(evidence),
                dependencies: [],
                acceptanceCriteria: this.generateAcceptanceCriteria(evidence),
                relatedEvidence: [evidence.type]
            };
            // Add effort estimation if enabled
            if (this.config.includeEffortEstimation) {
                task.effortEstimate = this.estimateEffort(task, context);
            }
            tasks.push(task);
        }
        return tasks;
    }
    /**
     * Create tasks from unmet acceptance criteria
     */
    async createTasksFromUnmetACs(unmetACs, context) {
        const tasks = [];
        for (const unmetAC of unmetACs) {
            const task = {
                id: `ac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: `Implement Missing AC: ${unmetAC.acId}`,
                description: unmetAC.suggestedImplementation,
                category: "improvement",
                priority: unmetAC.priority === "high" ? "high" : "medium",
                dependencies: [],
                acceptanceCriteria: [
                    `Acceptance criterion ${unmetAC.acId} is fully implemented`,
                    "Implementation is tested and verified",
                    "Code follows project standards"
                ],
                relatedEvidence: [unmetAC.acId]
            };
            // Add effort estimation if enabled
            if (this.config.includeEffortEstimation) {
                task.effortEstimate = this.estimateEffort(task, context);
            }
            tasks.push(task);
        }
        return tasks;
    }
    /**
     * Create tasks from missing tests
     */
    async createTasksFromMissingTests(missingTests, context) {
        const tasks = [];
        for (const missingTest of missingTests) {
            const task = {
                id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: `Add Missing Test: ${missingTest.testDescription}`,
                description: `Create ${missingTest.testType} test for ${missingTest.acId}`,
                category: "test",
                priority: missingTest.priority === "high" ? "high" : "medium",
                dependencies: [],
                acceptanceCriteria: [
                    "Test is implemented and passing",
                    "Test covers the specified acceptance criteria",
                    "Test follows project testing standards"
                ],
                relatedEvidence: [missingTest.acId]
            };
            // Add effort estimation if enabled
            if (this.config.includeEffortEstimation) {
                task.effortEstimate = this.estimateEffort(task, context);
            }
            tasks.push(task);
        }
        return tasks;
    }
    /**
     * Prioritize tasks based on configuration
     */
    prioritizeTasks(tasks, context) {
        switch (this.config.prioritizationMethod) {
            case "severity_first":
                return this.prioritizeBySeverity(tasks);
            case "impact_based":
                return this.prioritizeByImpact(tasks, context);
            case "effort_weighted":
                return this.prioritizeByEffort(tasks);
            case "dependency_aware":
                return this.prioritizeByDependencies(tasks);
            default:
                return this.prioritizeBySeverity(tasks);
        }
    }
    /**
     * Prioritize by severity/priority level
     */
    prioritizeBySeverity(tasks) {
        const priorityOrder = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        };
        return tasks.sort((a, b) => {
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            // Secondary sort by category
            const categoryOrder = {
                "critical_fix": 6,
                "security": 5,
                "test": 4,
                "improvement": 3,
                "refactor": 2,
                "documentation": 1
            };
            return categoryOrder[b.category] - categoryOrder[a.category];
        });
    }
    /**
     * Prioritize by estimated impact
     */
    prioritizeByImpact(tasks, context) {
        return tasks.sort((a, b) => {
            const impactA = this.calculateImpact(a, context);
            const impactB = this.calculateImpact(b, context);
            return impactB - impactA;
        });
    }
    /**
     * Prioritize by effort (easier tasks first)
     */
    prioritizeByEffort(tasks) {
        return tasks.sort((a, b) => {
            const effortA = this.getEffortScore(a.effortEstimate);
            const effortB = this.getEffortScore(b.effortEstimate);
            return effortA - effortB; // Lower effort first
        });
    }
    /**
     * Prioritize considering dependencies
     */
    prioritizeByDependencies(tasks) {
        // Simple topological sort based on dependencies
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = (task) => {
            if (visiting.has(task.id)) {
                // Circular dependency - skip
                return;
            }
            if (visited.has(task.id)) {
                return;
            }
            visiting.add(task.id);
            // Visit dependencies first
            for (const depId of task.dependencies) {
                const depTask = tasks.find(t => t.id === depId);
                if (depTask) {
                    visit(depTask);
                }
            }
            visiting.delete(task.id);
            visited.add(task.id);
            sorted.push(task);
        };
        for (const task of tasks) {
            visit(task);
        }
        return sorted;
    }
    /**
     * Generate task title from evidence
     */
    generateTaskTitle(evidence) {
        const titleMap = {
            "lint_violation": "Fix Linting Issue",
            "format_issue": "Fix Formatting Issue",
            "type_error": "Fix Type Error",
            "test_failure": "Fix Failing Test",
            "coverage_gap": "Improve Test Coverage",
            "security_vulnerability": "Fix Security Vulnerability",
            "performance_issue": "Optimize Performance",
            "naming_violation": "Fix Naming Convention",
            "architecture_violation": "Fix Architecture Issue",
            "code_smell": "Refactor Code Quality Issue",
            "documentation_gap": "Add Missing Documentation"
        };
        const baseTitle = titleMap[evidence.type] || "Fix Quality Issue";
        return `${baseTitle}: ${evidence.description.substring(0, 50)}...`;
    }
    /**
     * Generate task description from evidence
     */
    generateTaskDescription(evidence) {
        let description = evidence.description;
        if (evidence.suggestedFix) {
            description += `\n\nSuggested fix: ${evidence.suggestedFix}`;
        }
        if (evidence.location) {
            description += `\n\nLocation: ${evidence.location}`;
        }
        return description;
    }
    /**
     * Categorize task based on evidence
     */
    categorizeTask(evidence) {
        const categoryMap = {
            "security_vulnerability": "security",
            "test_failure": "test",
            "coverage_gap": "test",
            "lint_violation": "improvement",
            "format_issue": "improvement",
            "type_error": "improvement",
            "performance_issue": "improvement",
            "code_smell": "refactor",
            "architecture_violation": "refactor",
            "naming_violation": "refactor",
            "documentation_gap": "documentation"
        };
        return categoryMap[evidence.type] || "improvement";
    }
    /**
     * Prioritize task based on evidence severity
     */
    prioritizeTask(evidence) {
        const priorityMap = {
            "Critical": "critical",
            "Major": "high",
            "Minor": "medium"
        };
        return priorityMap[evidence.severity] || "low";
    }
    /**
     * Generate acceptance criteria for evidence-based task
     */
    generateAcceptanceCriteria(evidence) {
        const baseCriteria = [
            "Issue is resolved and verified",
            "No regression in existing functionality"
        ];
        // Add type-specific criteria
        switch (evidence.type) {
            case "test_failure":
                baseCriteria.push("All tests pass");
                break;
            case "coverage_gap":
                baseCriteria.push("Test coverage meets project standards");
                break;
            case "security_vulnerability":
                baseCriteria.push("Security scan passes");
                break;
            case "performance_issue":
                baseCriteria.push("Performance metrics meet requirements");
                break;
            case "lint_violation":
                baseCriteria.push("Linting passes without errors");
                break;
            case "format_issue":
                baseCriteria.push("Code formatting is consistent");
                break;
        }
        return baseCriteria;
    }
    /**
     * Estimate effort for a task
     */
    estimateEffort(task, context) {
        const complexity = this.calculateComplexity(task, context);
        const estimatedTime = this.calculateTimeEstimate(complexity, task.category);
        return {
            estimatedTime,
            complexity,
            confidence: this.calculateEstimationConfidence(task, context),
            method: this.config.effortEstimation.method
        };
    }
    /**
     * Calculate task complexity
     */
    calculateComplexity(task, context) {
        let complexityScore = 0;
        // Base complexity by category
        const categoryComplexity = {
            "critical_fix": 4,
            "security": 4,
            "refactor": 3,
            "improvement": 2,
            "test": 2,
            "documentation": 1
        };
        complexityScore += categoryComplexity[task.category] || 2;
        // Adjust by priority
        const priorityComplexity = {
            "critical": 2,
            "high": 1,
            "medium": 0,
            "low": -1
        };
        complexityScore += priorityComplexity[task.priority] || 0;
        // Adjust by dependencies
        complexityScore += task.dependencies.length * 0.5;
        // Map to complexity level
        if (complexityScore <= 1)
            return "trivial";
        if (complexityScore <= 2)
            return "simple";
        if (complexityScore <= 3)
            return "moderate";
        if (complexityScore <= 4)
            return "complex";
        return "very_complex";
    }
    /**
     * Calculate time estimate based on complexity
     */
    calculateTimeEstimate(complexity, category) {
        const baseTimeMap = {
            "trivial": 0.5,
            "simple": 1,
            "moderate": 2,
            "complex": 4,
            "very_complex": 8
        };
        const categoryMultiplier = {
            "critical_fix": 1.5,
            "security": 1.5,
            "refactor": 1.2,
            "improvement": 1.0,
            "test": 0.8,
            "documentation": 0.6
        };
        const baseHours = baseTimeMap[complexity];
        const adjustedHours = baseHours * (categoryMultiplier[category] || 1.0);
        if (adjustedHours < 1) {
            return "< 1 hour";
        }
        else if (adjustedHours < 4) {
            return `${Math.round(adjustedHours)} hours`;
        }
        else if (adjustedHours < 8) {
            return "Half day";
        }
        else if (adjustedHours < 16) {
            return "1 day";
        }
        else {
            return `${Math.ceil(adjustedHours / 8)} days`;
        }
    }
    /**
     * Calculate estimation confidence
     */
    calculateEstimationConfidence(task, context) {
        let confidence = 70; // Base confidence
        // Increase confidence for well-defined categories
        if (["test", "documentation"].includes(task.category)) {
            confidence += 15;
        }
        // Decrease confidence for complex tasks
        if (task.effortEstimate?.complexity === "very_complex") {
            confidence -= 20;
        }
        // Adjust based on project context
        if (context.projectContext?.projectSize === "large") {
            confidence -= 10;
        }
        return Math.max(Math.min(confidence, 95), 30);
    }
    /**
     * Calculate impact score for prioritization
     */
    calculateImpact(task, context) {
        let impact = 0;
        // Base impact by category
        const categoryImpact = {
            "critical_fix": 100,
            "security": 90,
            "test": 70,
            "improvement": 60,
            "refactor": 50,
            "documentation": 30
        };
        impact += categoryImpact[task.category] || 50;
        // Adjust by priority
        const priorityImpact = {
            "critical": 50,
            "high": 30,
            "medium": 10,
            "low": 0
        };
        impact += priorityImpact[task.priority] || 0;
        return impact;
    }
    /**
     * Get effort score for sorting
     */
    getEffortScore(effortEstimate) {
        if (!effortEstimate)
            return 50;
        const complexityScore = {
            "trivial": 10,
            "simple": 25,
            "moderate": 50,
            "complex": 75,
            "very_complex": 100
        };
        return complexityScore[effortEstimate.complexity] || 50;
    }
    /**
     * Generate metadata for task list
     */
    generateMetadata(context) {
        return {
            timestamp: Date.now(),
            id: `tasks_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            context: `Follow-up tasks for iteration ${context.iteration}`,
            prioritizationMethod: this.config.prioritizationMethod
        };
    }
    /**
     * Generate summary statistics
     */
    generateSummary(tasks) {
        const tasksByPriority = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0
        };
        const tasksByCategory = {
            "critical_fix": 0,
            "security": 0,
            "test": 0,
            "improvement": 0,
            "refactor": 0,
            "documentation": 0
        };
        let totalEffortHours = 0;
        for (const task of tasks) {
            tasksByPriority[task.priority]++;
            tasksByCategory[task.category]++;
            if (task.effortEstimate) {
                // Simple effort parsing for summary
                const timeStr = task.effortEstimate.estimatedTime;
                if (timeStr.includes("hour")) {
                    const hours = parseFloat(timeStr) || 1;
                    totalEffortHours += hours;
                }
                else if (timeStr.includes("day")) {
                    const days = parseFloat(timeStr) || 1;
                    totalEffortHours += days * 8;
                }
            }
        }
        const estimatedTotalEffort = totalEffortHours > 0 ?
            `${Math.round(totalEffortHours)} hours (${Math.ceil(totalEffortHours / 8)} days)` :
            undefined;
        return {
            totalTasks: tasks.length,
            tasksByPriority,
            tasksByCategory,
            estimatedTotalEffort
        };
    }
}
// ============================================================================
// Default Configuration
// ============================================================================
/**
 * Default configuration for follow-up task generation
 */
export const DEFAULT_FOLLOW_UP_TASK_CONFIG = {
    maxTasks: 20,
    includeEffortEstimation: true,
    prioritizationMethod: "severity_first",
    categorizationRules: {
        criticalPatterns: ["critical", "blocking", "urgent", "security"],
        securityPatterns: ["security", "vulnerability", "auth", "permission"],
        testPatterns: ["test", "coverage", "spec", "assertion"],
        documentationPatterns: ["doc", "comment", "readme", "guide"]
    },
    effortEstimation: {
        enabled: true,
        method: "complexity_based",
        complexityFactors: {
            fileCountWeight: 0.2,
            lineCountWeight: 0.3,
            dependencyWeight: 0.3,
            testRequirementWeight: 0.2
        }
    }
};
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Create follow-up task generator with default configuration
 */
export function createFollowUpTaskGenerator(config) {
    return new FollowUpTaskGenerator(config);
}
/**
 * Validate follow-up task list structure
 */
export function validateFollowUpTaskList(taskList) {
    const errors = [];
    if (!taskList.metadata || !taskList.metadata.id) {
        errors.push("Missing or invalid metadata");
    }
    if (!Array.isArray(taskList.tasks)) {
        errors.push("Tasks must be an array");
    }
    if (!taskList.summary) {
        errors.push("Missing summary");
    }
    // Validate individual tasks
    for (const task of taskList.tasks) {
        if (!task.id || !task.title || !task.description) {
            errors.push(`Invalid task ${task.id}: missing required fields`);
        }
        if (!["critical_fix", "security", "test", "improvement", "refactor", "documentation"].includes(task.category)) {
            errors.push(`Invalid task category: ${task.category}`);
        }
        if (!["critical", "high", "medium", "low"].includes(task.priority)) {
            errors.push(`Invalid task priority: ${task.priority}`);
        }
        if (!Array.isArray(task.acceptanceCriteria) || task.acceptanceCriteria.length === 0) {
            errors.push(`Task ${task.id}: must have acceptance criteria`);
        }
    }
    return errors;
}
//# sourceMappingURL=follow-up-task-generator.js.map