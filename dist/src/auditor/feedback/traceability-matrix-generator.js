/**
 * Traceability Matrix Generator for GAN Auditor System Prompt
 *
 * This module implements traceability matrix generation with AC to implementation
 * file mapping, test file coverage tracking, unmet AC identification, and missing
 * test detection as specified in requirement 5.5.
 *
 * Requirements addressed:
 * - 5.5: Traceability matrix generation
 * - Create AC to implementation file mapping
 * - Add test file coverage tracking
 * - Implement unmet AC identification
 * - Add missing test detection and reporting
 */
// ============================================================================
// Traceability Matrix Generator Implementation
// ============================================================================
/**
 * Generates comprehensive traceability matrices mapping ACs to implementation and tests
 */
export class TraceabilityMatrixGenerator {
    config;
    constructor(config) {
        this.config = {
            ...DEFAULT_TRACEABILITY_MATRIX_CONFIG,
            ...config
        };
    }
    /**
     * Generate traceability matrix from acceptance criteria and code analysis
     */
    async generateTraceabilityMatrix(context) {
        // Generate metadata
        const metadata = this.generateMetadata(context);
        // Create AC mappings
        const acMappings = await this.createAcceptanceCriteriaMappings(context);
        // Generate coverage summary
        const coverageSummary = this.generateCoverageSummary(acMappings);
        // Identify unmet ACs
        const unmetACs = this.identifyUnmetAcceptanceCriteria(acMappings, context);
        // Identify missing tests
        const missingTests = this.identifyMissingTests(acMappings, context);
        return {
            metadata,
            acMappings,
            coverageSummary,
            unmetACs,
            missingTests
        };
    }
    /**
     * Create acceptance criteria mappings to implementation and tests
     */
    async createAcceptanceCriteriaMappings(context) {
        const mappings = [];
        for (const ac of context.acceptanceCriteria.slice(0, this.config.maxAcceptanceCriteria)) {
            // Find implementation files
            const implementationFiles = await this.findImplementationFiles(ac, context);
            // Find test files
            const testFiles = await this.findTestFiles(ac, context);
            // Determine coverage status
            const coverageStatus = this.determineCoverageStatus(implementationFiles, testFiles);
            mappings.push({
                acId: ac.id,
                acDescription: ac.description,
                implementationFiles,
                testFiles,
                coverageStatus
            });
        }
        return mappings;
    }
    /**
     * Find implementation files related to an acceptance criterion
     */
    async findImplementationFiles(ac, context) {
        const implementationFiles = [];
        // Use code analysis if available
        if (context.codeAnalysis) {
            const mappings = this.findImplementationMappings(ac, context.codeAnalysis);
            for (const mapping of mappings) {
                if (mapping.confidence >= this.config.mappingConfidenceThreshold) {
                    implementationFiles.push({
                        filePath: mapping.filePath,
                        lineRanges: [mapping.lineRange],
                        confidence: mapping.confidence,
                        notes: `Mapped via ${mapping.type} analysis`
                    });
                }
            }
        }
        // Fallback to keyword-based file search
        if (implementationFiles.length === 0) {
            const keywordMappings = await this.findImplementationByKeywords(ac, context);
            implementationFiles.push(...keywordMappings);
        }
        return implementationFiles;
    }
    /**
     * Find test files related to an acceptance criterion
     */
    async findTestFiles(ac, context) {
        const testFiles = [];
        // Use test analysis if available
        if (context.testAnalysis) {
            const testMappings = this.findTestMappings(ac, context.testAnalysis);
            for (const mapping of testMappings) {
                const testCases = mapping.testCases.map(tc => ({
                    name: tc.name,
                    lineRange: tc.lineRange,
                    type: tc.type
                }));
                testFiles.push({
                    filePath: mapping.filePath,
                    testCases,
                    coverage: this.calculateTestCoverage(mapping, context)
                });
            }
        }
        // Fallback to keyword-based test search
        if (testFiles.length === 0) {
            const keywordTestMappings = await this.findTestsByKeywords(ac, context);
            testFiles.push(...keywordTestMappings);
        }
        return testFiles;
    }
    /**
     * Find implementation mappings using code analysis
     */
    findImplementationMappings(ac, codeAnalysis) {
        const mappings = [];
        // Search in function mappings
        for (const funcMapping of codeAnalysis.functions) {
            const confidence = this.calculateMappingConfidence(ac, funcMapping.name, funcMapping.relatedACs);
            if (confidence > 0) {
                mappings.push({
                    filePath: funcMapping.filePath,
                    lineRange: funcMapping.lineRange,
                    confidence,
                    type: "function"
                });
            }
        }
        // Search in class mappings
        for (const classMapping of codeAnalysis.classes) {
            const confidence = this.calculateMappingConfidence(ac, classMapping.name, classMapping.relatedACs);
            if (confidence > 0) {
                mappings.push({
                    filePath: classMapping.filePath,
                    lineRange: classMapping.lineRange,
                    confidence,
                    type: "class"
                });
            }
        }
        // Search in module mappings
        for (const moduleMapping of codeAnalysis.modules) {
            const confidence = this.calculateMappingConfidence(ac, moduleMapping.name, moduleMapping.relatedACs);
            if (confidence > 0) {
                mappings.push({
                    filePath: moduleMapping.filePath,
                    lineRange: { start: 1, end: 1 }, // Module level
                    confidence,
                    type: "module"
                });
            }
        }
        return mappings.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Find test mappings using test analysis
     */
    findTestMappings(ac, testAnalysis) {
        const mappings = [];
        for (const testFile of testAnalysis.testFiles) {
            const relatedTestCases = testFile.testCases.filter(tc => tc.relatedACs.includes(ac.id) ||
                this.calculateMappingConfidence(ac, tc.name, tc.relatedACs) >= this.config.mappingConfidenceThreshold);
            if (relatedTestCases.length > 0) {
                mappings.push({
                    ...testFile,
                    testCases: relatedTestCases
                });
            }
        }
        return mappings;
    }
    /**
     * Find implementation files by keyword matching
     */
    async findImplementationByKeywords(ac, context) {
        const implementationFiles = [];
        const keywords = this.extractKeywords(ac.description);
        for (const filePath of context.fileStructure.sourceFiles) {
            const confidence = this.calculateKeywordConfidence(keywords, filePath);
            if (confidence >= this.config.mappingConfidenceThreshold) {
                implementationFiles.push({
                    filePath,
                    lineRanges: [{ start: 1, end: 1 }], // Placeholder
                    confidence,
                    notes: "Mapped via keyword analysis"
                });
            }
        }
        return implementationFiles;
    }
    /**
     * Find test files by keyword matching
     */
    async findTestsByKeywords(ac, context) {
        const testFiles = [];
        const keywords = this.extractKeywords(ac.description);
        for (const filePath of context.fileStructure.testFiles) {
            const confidence = this.calculateKeywordConfidence(keywords, filePath);
            if (confidence >= this.config.mappingConfidenceThreshold) {
                testFiles.push({
                    filePath,
                    testCases: [{
                            name: `Test for ${ac.id}`,
                            lineRange: { start: 1, end: 1 },
                            type: "acceptance"
                        }],
                    coverage: confidence
                });
            }
        }
        return testFiles;
    }
    /**
     * Determine coverage status for an AC mapping
     */
    determineCoverageStatus(implementationFiles, testFiles) {
        const hasImplementation = implementationFiles.length > 0;
        const hasTests = testFiles.length > 0;
        if (!hasImplementation && !hasTests) {
            return "not_covered";
        }
        if (hasImplementation && hasTests) {
            // Check if tests adequately cover implementation
            const avgTestCoverage = testFiles.reduce((sum, tf) => sum + tf.coverage, 0) / testFiles.length;
            if (avgTestCoverage >= 80) {
                return "fully_covered";
            }
            else if (avgTestCoverage >= 50) {
                return "partially_covered";
            }
            else {
                return "not_covered";
            }
        }
        if (hasImplementation && !hasTests) {
            return "not_covered";
        }
        if (!hasImplementation && hasTests) {
            return "over_covered"; // Tests exist but no implementation found
        }
        return "not_covered";
    }
    /**
     * Generate coverage summary statistics
     */
    generateCoverageSummary(mappings) {
        const totalACs = mappings.length;
        const coverageByStatus = {
            "fully_covered": 0,
            "partially_covered": 0,
            "not_covered": 0,
            "over_covered": 0
        };
        for (const mapping of mappings) {
            coverageByStatus[mapping.coverageStatus]++;
        }
        const coveredACs = coverageByStatus.fully_covered + coverageByStatus.partially_covered;
        const coveragePercentage = totalACs > 0 ? Math.round((coveredACs / totalACs) * 100) : 0;
        return {
            totalACs,
            coveredACs,
            coveragePercentage,
            coverageByStatus
        };
    }
    /**
     * Identify unmet acceptance criteria
     */
    identifyUnmetAcceptanceCriteria(mappings, context) {
        const unmetACs = [];
        for (const mapping of mappings) {
            if (mapping.coverageStatus === "not_covered" ||
                (mapping.implementationFiles.length === 0 && mapping.testFiles.length === 0)) {
                unmetACs.push({
                    acId: mapping.acId,
                    acDescription: mapping.acDescription,
                    reason: this.determineUnmetReason(mapping),
                    suggestedImplementation: this.generateImplementationSuggestion(mapping, context),
                    priority: this.determineUnmetPriority(mapping, context)
                });
            }
        }
        return unmetACs;
    }
    /**
     * Identify missing tests
     */
    identifyMissingTests(mappings, context) {
        const missingTests = [];
        for (const mapping of mappings) {
            if (mapping.implementationFiles.length > 0 && mapping.testFiles.length === 0) {
                missingTests.push({
                    acId: mapping.acId,
                    testDescription: `Test coverage for ${mapping.acDescription}`,
                    testType: this.determineRequiredTestType(mapping),
                    suggestedTestFile: this.suggestTestFile(mapping, context),
                    priority: this.determineTestPriority(mapping)
                });
            }
        }
        return missingTests;
    }
    /**
     * Generate metadata for the traceability matrix
     */
    generateMetadata(context) {
        return {
            timestamp: Date.now(),
            id: `traceability_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sourceSpec: "Acceptance Criteria from INIT step",
            analysisScope: [
                ...context.fileStructure.sourceFiles.slice(0, 10),
                ...context.fileStructure.testFiles.slice(0, 10)
            ]
        };
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    calculateMappingConfidence(ac, elementName, relatedACs) {
        let confidence = 0;
        // Direct AC reference
        if (relatedACs.includes(ac.id)) {
            confidence += 80;
        }
        // Keyword matching
        const acKeywords = this.extractKeywords(ac.description);
        const nameKeywords = this.extractKeywords(elementName);
        const keywordMatch = this.calculateKeywordOverlap(acKeywords, nameKeywords);
        confidence += keywordMatch * 20;
        return Math.min(confidence, 100);
    }
    calculateKeywordConfidence(keywords, filePath) {
        const fileKeywords = this.extractKeywords(filePath);
        return this.calculateKeywordOverlap(keywords, fileKeywords) * 100;
    }
    extractKeywords(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter(word => word.length > 2)
            .filter(word => !this.isStopWord(word));
    }
    isStopWord(word) {
        const stopWords = ["the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "man", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its", "let", "put", "say", "she", "too", "use"];
        return stopWords.includes(word);
    }
    calculateKeywordOverlap(keywords1, keywords2) {
        if (keywords1.length === 0 || keywords2.length === 0) {
            return 0;
        }
        const set1 = new Set(keywords1);
        const set2 = new Set(keywords2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        return intersection.size / Math.max(set1.size, set2.size);
    }
    calculateTestCoverage(testMapping, context) {
        // Simple coverage calculation based on test case count
        return Math.min(testMapping.testCases.length * 25, 100);
    }
    determineUnmetReason(mapping) {
        if (mapping.implementationFiles.length === 0 && mapping.testFiles.length === 0) {
            return "No implementation or tests found";
        }
        if (mapping.implementationFiles.length === 0) {
            return "Implementation not found";
        }
        if (mapping.testFiles.length === 0) {
            return "Tests not found";
        }
        return "Insufficient coverage";
    }
    generateImplementationSuggestion(mapping, context) {
        const keywords = this.extractKeywords(mapping.acDescription);
        const suggestedFile = keywords.length > 0 ?
            `src/${keywords[0]}.ts` :
            `src/feature-${mapping.acId.toLowerCase()}.ts`;
        return `Implement ${mapping.acDescription} in ${suggestedFile}`;
    }
    determineUnmetPriority(mapping, context) {
        // Priority based on AC description keywords
        const description = mapping.acDescription.toLowerCase();
        if (description.includes("critical") || description.includes("must") || description.includes("required")) {
            return "high";
        }
        if (description.includes("should") || description.includes("important")) {
            return "medium";
        }
        return "low";
    }
    determineRequiredTestType(mapping) {
        const description = mapping.acDescription.toLowerCase();
        if (description.includes("integration") || description.includes("workflow")) {
            return "integration";
        }
        if (description.includes("acceptance") || description.includes("user")) {
            return "acceptance";
        }
        return "unit";
    }
    suggestTestFile(mapping, context) {
        if (mapping.implementationFiles.length > 0) {
            const implFile = mapping.implementationFiles[0].filePath;
            const baseName = implFile.replace(/\.[^/.]+$/, "");
            return `${baseName}.test.ts`;
        }
        return `tests/${mapping.acId.toLowerCase()}.test.ts`;
    }
    determineTestPriority(mapping) {
        // High priority if implementation exists but no tests
        if (mapping.implementationFiles.length > 0 && mapping.testFiles.length === 0) {
            return "high";
        }
        return "medium";
    }
}
// ============================================================================
// Default Configuration
// ============================================================================
/**
 * Default configuration for traceability matrix generation
 */
export const DEFAULT_TRACEABILITY_MATRIX_CONFIG = {
    maxAcceptanceCriteria: 50,
    mappingConfidenceThreshold: 60,
    includeImplementationDetails: true,
    testFilePatterns: [
        "**/*.test.ts",
        "**/*.test.js",
        "**/*.spec.ts",
        "**/*.spec.js",
        "**/test/**/*.ts",
        "**/test/**/*.js",
        "**/__tests__/**/*.ts",
        "**/__tests__/**/*.js"
    ],
    sourceFilePatterns: [
        "src/**/*.ts",
        "src/**/*.js",
        "lib/**/*.ts",
        "lib/**/*.js"
    ],
    analysisDepth: {
        functionLevel: true,
        classLevel: true,
        moduleLevel: true,
        includeComments: true
    }
};
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Create traceability matrix generator with default configuration
 */
export function createTraceabilityMatrixGenerator(config) {
    return new TraceabilityMatrixGenerator(config);
}
/**
 * Validate traceability matrix structure
 */
export function validateTraceabilityMatrix(matrix) {
    const errors = [];
    if (!matrix.metadata || !matrix.metadata.id) {
        errors.push("Missing or invalid metadata");
    }
    if (!Array.isArray(matrix.acMappings)) {
        errors.push("AC mappings must be an array");
    }
    if (!matrix.coverageSummary) {
        errors.push("Missing coverage summary");
    }
    if (!Array.isArray(matrix.unmetACs)) {
        errors.push("Unmet ACs must be an array");
    }
    if (!Array.isArray(matrix.missingTests)) {
        errors.push("Missing tests must be an array");
    }
    // Validate AC mappings
    for (const mapping of matrix.acMappings) {
        if (!mapping.acId || !mapping.acDescription) {
            errors.push(`Invalid AC mapping: missing required fields`);
        }
        if (!["fully_covered", "partially_covered", "not_covered", "over_covered"].includes(mapping.coverageStatus)) {
            errors.push(`Invalid coverage status: ${mapping.coverageStatus}`);
        }
    }
    return errors;
}
//# sourceMappingURL=traceability-matrix-generator.js.map