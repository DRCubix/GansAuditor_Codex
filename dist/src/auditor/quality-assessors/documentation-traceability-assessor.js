/**
 * Documentation and Traceability Assessment (10% weight)
 *
 * This module implements the documentation and traceability assessment as specified
 * in requirement 3.6. It evaluates:
 * - Inline documentation validation
 * - ADR requirement checking
 * - Changelog entry validation
 * - API documentation completeness checking
 */
// ============================================================================
// Documentation and Traceability Assessor
// ============================================================================
/**
 * Assessor for documentation and traceability quality dimension
 */
export class DocumentationTraceabilityAssessor {
    /**
     * Evaluate inline documentation validation criterion
     */
    async evaluateInlineDocumentationValidation(criterion, code, context) {
        const result = await this.analyzeInlineDocumentation(code, context);
        const score = result.overallScore;
        const passed = score >= 70; // 70% inline documentation threshold
        const evidence = [
            {
                type: "comment_coverage",
                description: `Inline documentation coverage: ${result.commentCoverage.coveragePercentage}%`,
                proof: `${result.commentCoverage.documentedFunctions}/${result.commentCoverage.totalFunctions} functions documented`,
                impact: result.commentCoverage.coveragePercentage >= 70 ? "positive" : "negative"
            },
            {
                type: "complexity_documentation",
                description: `Complex function documentation: ${result.complexityDocumentation.adequacyPercentage}%`,
                proof: `${result.complexityDocumentation.complexFunctionsDocumented}/${result.complexityDocumentation.complexFunctionsTotal} complex functions documented`,
                impact: result.complexityDocumentation.adequacyPercentage >= 80 ? "positive" : "negative"
            }
        ];
        // Add evidence for high-priority undocumented functions
        const highPriorityUndocumented = result.commentCoverage.undocumentedFunctions.filter(f => f.priority === "High");
        if (highPriorityUndocumented.length > 0) {
            evidence.push({
                type: "high_priority_gaps",
                description: "High-priority functions lack documentation",
                proof: highPriorityUndocumented.map(f => `${f.name} (${f.priorityReason})`).join(", "),
                impact: "negative"
            });
        }
        const suggestions = [];
        if (result.commentCoverage.coveragePercentage < 80) {
            suggestions.push("Add documentation for undocumented functions");
        }
        if (result.qualityAnalysis.overallQuality < 75) {
            suggestions.push("Improve documentation quality and clarity");
        }
        if (result.complexityDocumentation.intentExplanation.coveragePercentage < 85) {
            suggestions.push("Add intent explanations for complex logic");
        }
        return {
            criterion,
            score: Math.round(score),
            passed,
            evidence,
            feedback: `Inline Documentation: ${result.overallScore}% (Coverage: ${result.commentCoverage.coveragePercentage}%, Quality: ${result.qualityAnalysis.overallQuality}%, Complex functions: ${result.complexityDocumentation.adequacyPercentage}%)`,
            suggestions
        };
    }
    /**
     * Evaluate ADR requirement checking criterion
     */
    async evaluateADRRequirementChecking(criterion, code, context) {
        const result = await this.analyzeADRRequirements(code, context);
        const score = result.overallScore;
        const passed = score >= 60; // 60% ADR threshold (lower because ADRs are project-specific)
        const evidence = [
            {
                type: "adr_presence",
                description: `ADR coverage: ${result.adrAnalysis.coveragePercentage}%`,
                proof: `${result.adrAnalysis.decisionsWithADRs}/${result.adrAnalysis.totalDecisions} architectural decisions documented`,
                impact: result.adrAnalysis.coveragePercentage >= 60 ? "positive" : "negative"
            },
            {
                type: "decision_rationale",
                description: `Decision rationale coverage: ${result.decisionDocumentation.rationaleCoverage}%`,
                proof: `Alternative consideration: ${result.alternativeConsideration.coveragePercentage}%`,
                impact: result.decisionDocumentation.rationaleCoverage >= 70 ? "positive" : "negative"
            }
        ];
        // Add evidence for high-priority missing ADRs
        const highPriorityMissing = result.adrAnalysis.missingADRs.filter(adr => adr.priority === "High");
        if (highPriorityMissing.length > 0) {
            evidence.push({
                type: "missing_critical_adrs",
                description: "High-priority architectural decisions lack ADRs",
                proof: highPriorityMissing.map(adr => `${adr.decisionArea}: ${adr.rationale}`).join(", "),
                impact: "negative"
            });
        }
        const suggestions = [];
        if (result.adrAnalysis.missingADRs.length > 0) {
            suggestions.push("Create ADRs for undocumented architectural decisions");
        }
        if (result.alternativeConsideration.coveragePercentage < 70) {
            suggestions.push("Document alternatives considered for decisions");
        }
        if (result.adrAnalysis.qualityScore < 75) {
            suggestions.push("Improve ADR quality and completeness");
        }
        return {
            criterion,
            score: Math.round(score),
            passed,
            evidence,
            feedback: `ADR Requirements: ${result.overallScore}% (Coverage: ${result.adrAnalysis.coveragePercentage}%, Quality: ${result.adrAnalysis.qualityScore}%, Alternatives: ${result.alternativeConsideration.coveragePercentage}%)`,
            suggestions
        };
    }
    /**
     * Evaluate changelog entry validation criterion
     */
    async evaluateChangelogEntryValidation(criterion, code, context) {
        const result = await this.analyzeChangelogValidation(code, context);
        const score = result.overallScore;
        const passed = score >= 75; // 75% changelog threshold
        const evidence = [
            {
                type: "changelog_entry",
                description: `Changelog coverage: ${result.changelogAnalysis.coveragePercentage}%`,
                proof: `${result.changelogAnalysis.documentedChanges}/${result.changelogAnalysis.totalChanges} behavior changes documented`,
                impact: result.changelogAnalysis.coveragePercentage >= 75 ? "positive" : "negative"
            },
            {
                type: "breaking_changes",
                description: `Breaking changes documentation: ${result.breakingChanges.coveragePercentage}%`,
                proof: `${result.breakingChanges.documentedBreakingChanges}/${result.breakingChanges.totalBreakingChanges} breaking changes documented`,
                impact: result.breakingChanges.coveragePercentage >= 90 ? "positive" : "negative"
            }
        ];
        // Add evidence for migration guides
        if (result.migrationGuide.guidesNeeded > 0) {
            evidence.push({
                type: "migration_guide",
                description: `Migration guide coverage: ${result.migrationGuide.coveragePercentage}%`,
                proof: `${result.migrationGuide.guidesAvailable}/${result.migrationGuide.guidesNeeded} migration guides available`,
                impact: result.migrationGuide.coveragePercentage >= 80 ? "positive" : "negative"
            });
        }
        const suggestions = [];
        if (result.changelogAnalysis.missingEntries.length > 0) {
            suggestions.push("Add missing changelog entries for behavior changes");
        }
        if (result.breakingChanges.coveragePercentage < 95) {
            suggestions.push("Document all breaking changes with migration information");
        }
        if (result.migrationGuide.coveragePercentage < 90) {
            suggestions.push("Create migration guides for breaking changes");
        }
        return {
            criterion,
            score: Math.round(score),
            passed,
            evidence,
            feedback: `Changelog Validation: ${result.overallScore}% (Coverage: ${result.changelogAnalysis.coveragePercentage}%, Breaking changes: ${result.breakingChanges.coveragePercentage}%, Migration guides: ${result.migrationGuide.coveragePercentage}%)`,
            suggestions
        };
    }
    /**
     * Evaluate API documentation completeness criterion
     */
    async evaluateAPIDocumentationCompleteness(criterion, code, context) {
        const result = await this.analyzeAPIDocumentation(code, context);
        const score = result.overallScore;
        const passed = score >= 80; // 80% API documentation threshold
        const evidence = [
            {
                type: "api_docs",
                description: `API documentation coverage: ${result.apiCoverage.coveragePercentage}%`,
                proof: `${result.apiCoverage.documentedAPIs}/${result.apiCoverage.totalAPIs} public APIs documented`,
                impact: result.apiCoverage.coveragePercentage >= 80 ? "positive" : "negative"
            },
            {
                type: "parameter_documentation",
                description: `Parameter documentation: ${result.parameterDocumentation.coveragePercentage}%`,
                proof: `${result.parameterDocumentation.documentedParameters}/${result.parameterDocumentation.totalParameters} parameters documented`,
                impact: result.parameterDocumentation.coveragePercentage >= 85 ? "positive" : "negative"
            },
            {
                type: "return_value_docs",
                description: `Return value documentation: ${result.returnValueDocumentation.coveragePercentage}%`,
                proof: `${result.returnValueDocumentation.functionsWithDocumentedReturns}/${result.returnValueDocumentation.totalFunctionsWithReturns} return values documented`,
                impact: result.returnValueDocumentation.coveragePercentage >= 80 ? "positive" : "negative"
            }
        ];
        const suggestions = [];
        if (result.apiCoverage.undocumentedAPIs.length > 0) {
            suggestions.push("Add documentation for undocumented public APIs");
        }
        if (result.parameterDocumentation.coveragePercentage < 90) {
            suggestions.push("Complete parameter documentation for all functions");
        }
        if (result.returnValueDocumentation.coveragePercentage < 85) {
            suggestions.push("Document return values for all functions");
        }
        return {
            criterion,
            score: Math.round(score),
            passed,
            evidence,
            feedback: `API Documentation: ${result.overallScore}% (APIs: ${result.apiCoverage.coveragePercentage}%, Parameters: ${result.parameterDocumentation.coveragePercentage}%, Returns: ${result.returnValueDocumentation.coveragePercentage}%)`,
            suggestions
        };
    }
    // ============================================================================
    // Analysis Methods (Placeholder Implementations)
    // ============================================================================
    /**
     * Analyze inline documentation
     */
    async analyzeInlineDocumentation(code, context) {
        // Placeholder implementation
        const totalFunctions = Math.floor(Math.random() * 20) + 15; // 15-35 functions
        const documentedFunctions = Math.floor(totalFunctions * (Math.random() * 0.4 + 0.5)); // 50-90% documented
        const commentCoverage = {
            totalFunctions,
            documentedFunctions,
            coveragePercentage: Math.round((documentedFunctions / totalFunctions) * 100),
            coverageByVisibility: {
                publicFunctions: { total: 12, documented: 10, percentage: 83 },
                privateFunctions: { total: 8, documented: 5, percentage: 63 },
                protectedFunctions: { total: 3, documented: 2, percentage: 67 }
            },
            coverageByComplexity: {
                highComplexity: { total: 5, documented: 4, percentage: 80 },
                mediumComplexity: { total: 8, documented: 6, percentage: 75 },
                lowComplexity: { total: 10, documented: 7, percentage: 70 }
            },
            undocumentedFunctions: [
                {
                    name: "complexAlgorithm",
                    filePath: context.filePaths[0] || "src/algorithm.ts",
                    lineNumber: 45,
                    visibility: "public",
                    complexity: 8,
                    priority: "High",
                    priorityReason: "High complexity public function"
                }
            ]
        };
        const qualityAnalysis = {
            overallQuality: Math.floor(Math.random() * 25) + 70, // 70-95%
            qualityMetrics: {
                clarity: Math.floor(Math.random() * 20) + 75, // 75-95%
                completeness: Math.floor(Math.random() * 25) + 70, // 70-95%
                accuracy: Math.floor(Math.random() * 15) + 80, // 80-95%
                consistency: Math.floor(Math.random() * 30) + 65, // 65-95%
                usefulness: Math.floor(Math.random() * 20) + 75 // 75-95%
            },
            qualityIssues: [
                {
                    type: "unclear_description",
                    functionName: "processData",
                    filePath: context.filePaths[0] || "src/processor.ts",
                    lineNumber: 25,
                    description: "Function description is vague and doesn't explain the processing logic",
                    severity: "Medium",
                    suggestedImprovement: "Add specific details about what processing is performed"
                }
            ],
            bestPracticesAdherence: {
                jsDocCompliance: Math.floor(Math.random() * 20) + 75, // 75-95%
                parameterDocumentation: Math.floor(Math.random() * 25) + 70, // 70-95%
                returnValueDocumentation: Math.floor(Math.random() * 20) + 75, // 75-95%
                exampleUsage: Math.floor(Math.random() * 40) + 50, // 50-90%
                errorDocumentation: Math.floor(Math.random() * 30) + 60 // 60-90%
            }
        };
        const complexityDocumentation = {
            complexFunctionsTotal: 8,
            complexFunctionsDocumented: 6,
            adequacyPercentage: 75,
            intentExplanation: {
                functionsWithIntent: 5,
                totalFunctionsNeedingIntent: 8,
                coveragePercentage: 63,
                missingIntentExplanations: [
                    {
                        functionName: "optimizeQuery",
                        filePath: context.filePaths[0] || "src/optimizer.ts",
                        complexityReason: "Complex optimization algorithm",
                        suggestedFocus: ["Algorithm choice rationale", "Performance trade-offs", "Edge case handling"]
                    }
                ]
            },
            algorithmExplanation: {
                functionsWithAlgorithm: 4,
                totalFunctionsNeedingAlgorithm: 6,
                coveragePercentage: 67,
                missingAlgorithmExplanations: [
                    {
                        functionName: "sortAndFilter",
                        filePath: context.filePaths[0] || "src/utils.ts",
                        algorithmComplexity: "O(n log n)",
                        suggestedAreas: ["Sorting algorithm choice", "Filter optimization", "Memory usage"]
                    }
                ]
            }
        };
        const violations = [
            {
                type: "missing_documentation",
                target: "complexAlgorithm",
                filePath: context.filePaths[0] || "src/algorithm.ts",
                lineNumber: 45,
                description: "High-complexity public function lacks documentation",
                severity: "High",
                remediation: ["Add comprehensive JSDoc documentation", "Include algorithm explanation", "Document parameters and return value"]
            }
        ];
        const overallScore = Math.round((commentCoverage.coveragePercentage + qualityAnalysis.overallQuality + complexityDocumentation.adequacyPercentage) / 3);
        return {
            overallScore,
            commentCoverage,
            qualityAnalysis,
            complexityDocumentation,
            violations
        };
    }
    /**
     * Analyze ADR requirements
     */
    async analyzeADRRequirements(code, context) {
        // Placeholder implementation
        const totalDecisions = Math.floor(Math.random() * 8) + 3; // 3-11 architectural decisions
        const decisionsWithADRs = Math.floor(totalDecisions * (Math.random() * 0.5 + 0.4)); // 40-90% with ADRs
        const adrAnalysis = {
            totalDecisions,
            decisionsWithADRs,
            coveragePercentage: Math.round((decisionsWithADRs / totalDecisions) * 100),
            qualityScore: Math.floor(Math.random() * 25) + 70, // 70-95%
            existingADRs: [
                {
                    id: "ADR-001",
                    title: "Use TypeScript for type safety",
                    filePath: "docs/adr/001-typescript.md",
                    status: "Accepted",
                    qualityScore: 85,
                    completeness: {
                        hasContext: true,
                        hasDecision: true,
                        hasConsequences: true,
                        hasAlternatives: true,
                        hasRationale: true,
                        completenessPercentage: 100
                    }
                }
            ],
            missingADRs: totalDecisions > decisionsWithADRs ? [
                {
                    decisionArea: "Database choice",
                    description: "Selection of database technology for the application",
                    affectedComponents: ["Data layer", "Performance", "Scalability"],
                    priority: "High",
                    rationale: "Significant architectural impact on system design and performance"
                }
            ] : []
        };
        const decisionDocumentation = {
            rationaleCoverage: Math.floor(Math.random() * 25) + 70, // 70-95%
            tradeoffDocumentation: Math.floor(Math.random() * 30) + 65, // 65-95%
            impactAssessment: Math.floor(Math.random() * 20) + 75, // 75-95%
            contextDocumentation: Math.floor(Math.random() * 25) + 70 // 70-95%
        };
        const alternativeConsideration = {
            decisionsWithAlternatives: Math.floor(decisionsWithADRs * 0.8), // 80% of ADRs have alternatives
            totalDecisionsRequiringAlternatives: decisionsWithADRs,
            coveragePercentage: 80,
            analysisQuality: Math.floor(Math.random() * 20) + 75 // 75-95%
        };
        const violations = adrAnalysis.missingADRs.length > 0 ? [
            {
                type: "missing_adr",
                target: adrAnalysis.missingADRs[0].decisionArea,
                description: `Architectural decision "${adrAnalysis.missingADRs[0].decisionArea}" lacks documentation`,
                severity: "High",
                impact: "Difficult to understand design rationale and maintain consistency",
                remediation: ["Create ADR document", "Document decision context", "Analyze alternatives", "Document consequences"]
            }
        ] : [];
        const overallScore = Math.round((adrAnalysis.coveragePercentage + adrAnalysis.qualityScore +
            decisionDocumentation.rationaleCoverage + alternativeConsideration.coveragePercentage) / 4);
        return {
            overallScore,
            adrAnalysis,
            decisionDocumentation,
            alternativeConsideration,
            violations
        };
    }
    /**
     * Analyze changelog validation
     */
    async analyzeChangelogValidation(code, context) {
        // Placeholder implementation
        const totalChanges = Math.floor(Math.random() * 10) + 5; // 5-15 behavior changes
        const documentedChanges = Math.floor(totalChanges * (Math.random() * 0.3 + 0.6)); // 60-90% documented
        const changelogAnalysis = {
            totalChanges,
            documentedChanges,
            coveragePercentage: Math.round((documentedChanges / totalChanges) * 100),
            qualityScore: Math.floor(Math.random() * 20) + 75, // 75-95%
            entries: [
                {
                    type: "Added",
                    description: "New user authentication system",
                    version: "2.1.0",
                    date: "2024-01-15",
                    qualityScore: 90,
                    completeness: {
                        hasClearDescription: true,
                        hasImpactInformation: true,
                        hasMigrationInformation: false,
                        completenessPercentage: 67
                    }
                },
                {
                    type: "Changed",
                    description: "Updated API response format",
                    version: "2.1.0",
                    date: "2024-01-15",
                    qualityScore: 85,
                    completeness: {
                        hasClearDescription: true,
                        hasImpactInformation: true,
                        hasMigrationInformation: true,
                        completenessPercentage: 100
                    }
                }
            ],
            missingEntries: totalChanges > documentedChanges ? [
                {
                    changeType: "Performance improvement",
                    description: "Database query optimization",
                    affectedFunctionality: ["User data retrieval", "Search functionality"],
                    priority: "Medium",
                    userImpact: "Improved response times"
                }
            ] : []
        };
        const totalBreakingChanges = Math.floor(Math.random() * 3) + 1; // 1-4 breaking changes
        const documentedBreakingChanges = Math.floor(totalBreakingChanges * (Math.random() * 0.3 + 0.7)); // 70-100%
        const breakingChanges = {
            totalBreakingChanges,
            documentedBreakingChanges,
            coveragePercentage: Math.round((documentedBreakingChanges / totalBreakingChanges) * 100),
            breakingChangeDetails: [
                {
                    description: "API response format changed",
                    affectedAPIs: ["/api/users", "/api/posts"],
                    migrationComplexity: "Medium",
                    documentationQuality: 85,
                    hasMigrationGuide: true
                }
            ]
        };
        const migrationGuide = {
            guidesAvailable: documentedBreakingChanges,
            guidesNeeded: totalBreakingChanges,
            coveragePercentage: Math.round((documentedBreakingChanges / totalBreakingChanges) * 100),
            qualityScore: Math.floor(Math.random() * 20) + 75, // 75-95%
            guideDetails: [
                {
                    title: "Migrating to new API response format",
                    targetChange: "API response format change",
                    completeness: 90,
                    hasExamples: true,
                    hasStepByStep: true,
                    qualityScore: 90
                }
            ]
        };
        const violations = [];
        if (changelogAnalysis.missingEntries.length > 0) {
            violations.push({
                type: "missing_entry",
                target: changelogAnalysis.missingEntries[0].changeType,
                description: `Behavior change "${changelogAnalysis.missingEntries[0].changeType}" not documented in changelog`,
                severity: "Medium",
                userImpact: changelogAnalysis.missingEntries[0].userImpact,
                remediation: ["Add changelog entry", "Document user impact", "Include version information"]
            });
        }
        const overallScore = Math.round((changelogAnalysis.coveragePercentage + changelogAnalysis.qualityScore +
            breakingChanges.coveragePercentage + migrationGuide.coveragePercentage) / 4);
        return {
            overallScore,
            changelogAnalysis,
            breakingChanges,
            migrationGuide,
            violations
        };
    }
    /**
     * Analyze API documentation
     */
    async analyzeAPIDocumentation(code, context) {
        // Placeholder implementation
        const totalAPIs = Math.floor(Math.random() * 25) + 15; // 15-40 APIs
        const documentedAPIs = Math.floor(totalAPIs * (Math.random() * 0.3 + 0.6)); // 60-90% documented
        const apiCoverage = {
            totalAPIs,
            documentedAPIs,
            coveragePercentage: Math.round((documentedAPIs / totalAPIs) * 100),
            qualityScore: Math.floor(Math.random() * 20) + 75, // 75-95%
            apiCategories: [
                { category: "functions", total: 15, documented: 12, coveragePercentage: 80, qualityScore: 85 },
                { category: "classes", total: 8, documented: 7, coveragePercentage: 88, qualityScore: 80 },
                { category: "interfaces", total: 10, documented: 9, coveragePercentage: 90, qualityScore: 90 },
                { category: "types", total: 5, documented: 4, coveragePercentage: 80, qualityScore: 75 }
            ],
            undocumentedAPIs: [
                {
                    name: "processUserData",
                    type: "function",
                    filePath: context.filePaths[0] || "src/user.ts",
                    lineNumber: 45,
                    visibility: "public",
                    priority: "High",
                    usageFrequency: "High"
                }
            ]
        };
        const totalParameters = Math.floor(Math.random() * 50) + 30; // 30-80 parameters
        const documentedParameters = Math.floor(totalParameters * (Math.random() * 0.25 + 0.70)); // 70-95% documented
        const parameterDocumentation = {
            totalParameters,
            documentedParameters,
            coveragePercentage: Math.round((documentedParameters / totalParameters) * 100),
            qualityScore: Math.floor(Math.random() * 20) + 75, // 75-95%
            missingParameterDocs: [
                {
                    functionName: "createUser",
                    parameterName: "options",
                    parameterType: "UserOptions",
                    filePath: context.filePaths[0] || "src/user.ts",
                    lineNumber: 25,
                    isOptional: true,
                    priority: "Medium"
                }
            ]
        };
        const totalFunctionsWithReturns = Math.floor(Math.random() * 20) + 15; // 15-35 functions
        const functionsWithDocumentedReturns = Math.floor(totalFunctionsWithReturns * (Math.random() * 0.25 + 0.70)); // 70-95%
        const returnValueDocumentation = {
            totalFunctionsWithReturns,
            functionsWithDocumentedReturns,
            coveragePercentage: Math.round((functionsWithDocumentedReturns / totalFunctionsWithReturns) * 100),
            qualityScore: Math.floor(Math.random() * 20) + 75, // 75-95%
            missingReturnDocs: [
                {
                    functionName: "getUserById",
                    returnType: "Promise<User | null>",
                    filePath: context.filePaths[0] || "src/user.ts",
                    lineNumber: 35,
                    returnComplexity: "Union",
                    priority: "High"
                }
            ]
        };
        const violations = [];
        if (apiCoverage.undocumentedAPIs.length > 0) {
            violations.push({
                type: "missing_api_docs",
                apiName: apiCoverage.undocumentedAPIs[0].name,
                filePath: apiCoverage.undocumentedAPIs[0].filePath,
                lineNumber: apiCoverage.undocumentedAPIs[0].lineNumber,
                description: `Public API "${apiCoverage.undocumentedAPIs[0].name}" lacks documentation`,
                severity: "High",
                usabilityImpact: "Developers cannot understand API usage without reading implementation",
                remediation: ["Add JSDoc documentation", "Document parameters", "Document return value", "Add usage examples"]
            });
        }
        const overallScore = Math.round((apiCoverage.coveragePercentage + apiCoverage.qualityScore +
            parameterDocumentation.coveragePercentage + returnValueDocumentation.coveragePercentage) / 4);
        return {
            overallScore,
            apiCoverage,
            parameterDocumentation,
            returnValueDocumentation,
            violations
        };
    }
}
/**
 * Create a documentation and traceability assessor
 */
export function createDocumentationTraceabilityAssessor() {
    return new DocumentationTraceabilityAssessor();
}
//# sourceMappingURL=documentation-traceability-assessor.js.map