/**
 * Security Assessment (15% weight)
 *
 * This module implements the security assessment as specified
 * in requirement 3.4. It evaluates:
 * - Input validation checking
 * - Secret detection and validation
 * - Safe defaults verification
 * - Dependency security analysis
 */
// ============================================================================
// Security Assessor
// ============================================================================
/**
 * Assessor for security quality dimension
 */
export class SecurityAssessor {
    /**
     * Evaluate input validation checking criterion
     */
    async evaluateInputValidationChecking(criterion, code, context) {
        const result = await this.analyzeInputValidation(code, context);
        const score = result.overallScore;
        const passed = score >= 85; // 85% input validation threshold (high because it's critical)
        const evidence = [
            {
                type: "input_validation",
                description: `Input validation coverage: ${result.validationAnalysis.validationCoverage}%`,
                proof: `${result.validationAnalysis.validatedInputPoints}/${result.validationAnalysis.totalInputPoints} input points validated`,
                impact: result.validationAnalysis.validationCoverage >= 85 ? "positive" : "negative"
            },
            {
                type: "sanitization",
                description: `Input sanitization coverage: ${result.sanitizationAnalysis.sanitizationCoverage}%`,
                proof: `${result.sanitizationAnalysis.sanitizedInputs}/${result.sanitizationAnalysis.totalInputs} inputs sanitized`,
                impact: result.sanitizationAnalysis.sanitizationCoverage >= 80 ? "positive" : "negative"
            }
        ];
        // Add evidence for critical unvalidated inputs
        const criticalInputs = result.validationAnalysis.unvalidatedInputs.filter(input => input.riskLevel === "Critical");
        if (criticalInputs.length > 0) {
            evidence.push({
                type: "critical_validation_gaps",
                description: "Critical unvalidated inputs detected",
                proof: criticalInputs.map(input => `${input.source} in ${input.filePath}`).join(", "),
                impact: "negative"
            });
        }
        const suggestions = [];
        if (result.validationAnalysis.validationCoverage < 95) {
            suggestions.push("Add input validation for unvalidated inputs");
        }
        if (result.sanitizationAnalysis.sanitizationCoverage < 90) {
            suggestions.push("Implement input sanitization for user-provided data");
        }
        if (result.injectionPrevention.sqlInjectionPrevention < 90) {
            suggestions.push("Implement parameterized queries to prevent SQL injection");
        }
        return {
            criterion,
            score: Math.round(score),
            passed,
            evidence,
            feedback: `Input Validation: ${result.overallScore}% (Validation: ${result.validationAnalysis.validationCoverage}%, Sanitization: ${result.sanitizationAnalysis.sanitizationCoverage}%)`,
            suggestions
        };
    }
    /**
     * Evaluate secret detection and validation criterion
     */
    async evaluateSecretDetection(criterion, code, context) {
        const result = await this.analyzeSecretDetection(code, context);
        const score = result.overallScore;
        const passed = score >= 90; // 90% secret security threshold (very high because it's critical)
        const evidence = [
            {
                type: "secret_scan",
                description: `Secret security score: ${result.overallScore}%`,
                proof: `${result.secretScan.totalSecrets} potential secrets found across ${result.secretScan.filesWithSecrets.length} files`,
                impact: result.secretScan.totalSecrets === 0 ? "positive" : "negative"
            },
            {
                type: "credential_management",
                description: `Credential management score: ${result.credentialManagement.storageScore}%`,
                proof: `Environment variables: ${result.environmentVariables.securityPercentage}% secure`,
                impact: result.credentialManagement.storageScore >= 85 ? "positive" : "negative"
            }
        ];
        // Add evidence for high-confidence secrets
        const highConfidenceSecrets = result.secretScan.secretDetails.filter(secret => secret.confidence === "High");
        if (highConfidenceSecrets.length > 0) {
            evidence.push({
                type: "high_confidence_secrets",
                description: "High-confidence secrets detected in code",
                proof: highConfidenceSecrets.map(secret => `${secret.type} in ${secret.filePath}:${secret.lineNumber}`).join(", "),
                impact: "negative"
            });
        }
        const suggestions = [];
        if (result.secretScan.totalSecrets > 0) {
            suggestions.push("Remove hardcoded secrets from source code");
            suggestions.push("Use environment variables or secure key management");
        }
        if (result.credentialManagement.storageScore < 90) {
            suggestions.push("Improve credential storage security");
        }
        if (result.environmentVariables.securityPercentage < 95) {
            suggestions.push("Secure environment variable usage");
        }
        return {
            criterion,
            score: Math.round(score),
            passed,
            evidence,
            feedback: `Secret Security: ${result.overallScore}% (${result.secretScan.totalSecrets} secrets found, ${result.environmentVariables.securityPercentage}% env vars secure)`,
            suggestions
        };
    }
    /**
     * Evaluate safe defaults verification criterion
     */
    async evaluateSafeDefaultsVerification(criterion, code, context) {
        const result = await this.analyzeSafeDefaults(code, context);
        const score = result.overallScore;
        const passed = score >= 80; // 80% safe defaults threshold
        const evidence = [
            {
                type: "default_security",
                description: `Secure defaults: ${result.defaultSecurity.secureDefaultsPercentage}%`,
                proof: `Configuration security: ${result.defaultSecurity.configurationSecurity}%, Permission defaults: ${result.defaultSecurity.permissionDefaults}%`,
                impact: result.defaultSecurity.secureDefaultsPercentage >= 80 ? "positive" : "negative"
            },
            {
                type: "fail_safe",
                description: `Fail-safe implementation: ${result.failSafe.implementationScore}%`,
                proof: `Error handling security: ${result.failSafe.errorHandlingSecurity}%, Graceful degradation: ${result.failSafe.gracefulDegradation}%`,
                impact: result.failSafe.implementationScore >= 75 ? "positive" : "negative"
            }
        ];
        // Add evidence for privilege violations
        const highRiskPrivilegeViolations = result.leastPrivilege.privilegeViolations.filter(v => v.riskLevel === "High");
        if (highRiskPrivilegeViolations.length > 0) {
            evidence.push({
                type: "privilege_violations",
                description: "High-risk privilege violations detected",
                proof: highRiskPrivilegeViolations.map(v => `${v.type} in ${v.component}`).join(", "),
                impact: "negative"
            });
        }
        const suggestions = [];
        if (result.defaultSecurity.secureDefaultsPercentage < 90) {
            suggestions.push("Review and secure default configurations");
        }
        if (result.leastPrivilege.complianceScore < 85) {
            suggestions.push("Implement principle of least privilege");
        }
        if (result.failSafe.implementationScore < 80) {
            suggestions.push("Improve fail-safe mechanisms and error handling");
        }
        return {
            criterion,
            score: Math.round(score),
            passed,
            evidence,
            feedback: `Safe Defaults: ${result.overallScore}% (Defaults: ${result.defaultSecurity.secureDefaultsPercentage}%, Fail-safe: ${result.failSafe.implementationScore}%, Privileges: ${result.leastPrivilege.complianceScore}%)`,
            suggestions
        };
    }
    /**
     * Evaluate dependency security analysis criterion
     */
    async evaluateDependencySecurityAnalysis(criterion, code, context) {
        const result = await this.analyzeDependencySecurity(code, context);
        const score = result.overallScore;
        const passed = score >= 85; // 85% dependency security threshold
        const evidence = [
            {
                type: "vulnerability_scan",
                description: `Dependency security: ${result.overallScore}%`,
                proof: `${result.vulnerabilityScan.totalVulnerabilities} vulnerabilities found in ${result.vulnerabilityScan.affectedPackages.length} packages`,
                impact: result.vulnerabilityScan.totalVulnerabilities === 0 ? "positive" : "negative"
            },
            {
                type: "dependency_audit",
                description: `Dependency audit: ${result.dependencyAudit.securityPercentage}% secure`,
                proof: `${result.dependencyAudit.secureDependencies}/${result.dependencyAudit.totalDependencies} dependencies secure`,
                impact: result.dependencyAudit.securityPercentage >= 85 ? "positive" : "negative"
            }
        ];
        // Add evidence for critical vulnerabilities
        const criticalVulns = result.vulnerabilityScan.vulnerabilityDetails.filter(v => v.severity === "Critical");
        if (criticalVulns.length > 0) {
            evidence.push({
                type: "critical_vulnerabilities",
                description: "Critical vulnerabilities detected",
                proof: criticalVulns.map(v => `${v.cveId} in ${v.packageName}`).join(", "),
                impact: "negative"
            });
        }
        const suggestions = [];
        if (result.vulnerabilityScan.totalVulnerabilities > 0) {
            suggestions.push("Update vulnerable dependencies to secure versions");
        }
        if (result.dependencyAudit.outdatedDependencies.length > 0) {
            suggestions.push("Update outdated dependencies");
        }
        if (result.versionAnalysis.complianceScore < 80) {
            suggestions.push("Improve dependency version management");
        }
        return {
            criterion,
            score: Math.round(score),
            passed,
            evidence,
            feedback: `Dependency Security: ${result.overallScore}% (${result.vulnerabilityScan.totalVulnerabilities} vulnerabilities, ${result.dependencyAudit.securityPercentage}% secure deps)`,
            suggestions
        };
    }
    // ============================================================================
    // Analysis Methods (Placeholder Implementations)
    // ============================================================================
    /**
     * Analyze input validation
     */
    async analyzeInputValidation(code, context) {
        // Placeholder implementation
        const totalInputPoints = Math.floor(Math.random() * 15) + 10; // 10-25 input points
        const validatedInputPoints = Math.floor(totalInputPoints * (Math.random() * 0.3 + 0.6)); // 60-90% validated
        const validationAnalysis = {
            totalInputPoints,
            validatedInputPoints,
            validationCoverage: Math.round((validatedInputPoints / totalInputPoints) * 100),
            inputTypes: [
                { type: "user_input", total: 8, validated: 7, percentage: 87.5, validationPatterns: ["regex", "length_check"] },
                { type: "api_parameter", total: 6, validated: 5, percentage: 83.3, validationPatterns: ["type_check", "range_validation"] },
                { type: "file_upload", total: 2, validated: 1, percentage: 50, validationPatterns: ["file_type_check"] }
            ],
            unvalidatedInputs: [
                {
                    id: "user_comment",
                    type: "user_input",
                    filePath: context.filePaths[0] || "src/example.ts",
                    lineNumber: 45,
                    source: "request.body.comment",
                    riskLevel: "High",
                    vulnerabilities: ["XSS", "Script injection"]
                }
            ]
        };
        const sanitizationAnalysis = {
            totalInputs: totalInputPoints,
            sanitizedInputs: Math.floor(totalInputPoints * (Math.random() * 0.25 + 0.65)), // 65-90% sanitized
            sanitizationCoverage: 0, // Will be calculated
            sanitizationMethods: [
                { method: "htmlEscape", usageCount: 5, effectiveness: 85, inputTypes: ["user_input", "form_data"] },
                { method: "sqlEscape", usageCount: 3, effectiveness: 95, inputTypes: ["query_parameter"] }
            ],
            unsanitizedInputs: [
                {
                    id: "raw_html",
                    filePath: context.filePaths[0] || "src/example.ts",
                    lineNumber: 32,
                    inputValue: "request.body.html",
                    risk: "XSS vulnerability",
                    suggestedSanitization: "HTML encoding"
                }
            ]
        };
        sanitizationAnalysis.sanitizationCoverage = Math.round((sanitizationAnalysis.sanitizedInputs / sanitizationAnalysis.totalInputs) * 100);
        const injectionPrevention = {
            sqlInjectionPrevention: Math.floor(Math.random() * 20) + 75, // 75-95%
            xssPrevention: Math.floor(Math.random() * 25) + 70, // 70-95%
            commandInjectionPrevention: Math.floor(Math.random() * 30) + 65, // 65-95%
            ldapInjectionPrevention: Math.floor(Math.random() * 15) + 80, // 80-95%
            preventionMechanisms: [
                { type: "parameterized_queries", quality: 90, coverage: 85, files: [context.filePaths[0] || "src/db.ts"] },
                { type: "input_encoding", quality: 80, coverage: 75, files: [context.filePaths[0] || "src/utils.ts"] }
            ]
        };
        const violations = [
            {
                type: "missing_validation",
                filePath: context.filePaths[0] || "src/example.ts",
                lineNumber: 45,
                description: "User input not validated before processing",
                severity: "High",
                impact: "Potential XSS and injection attacks",
                remediation: ["Add input validation", "Implement sanitization", "Use whitelist validation"]
            }
        ];
        const overallScore = Math.round((validationAnalysis.validationCoverage + sanitizationAnalysis.sanitizationCoverage +
            injectionPrevention.sqlInjectionPrevention + injectionPrevention.xssPrevention) / 4);
        return {
            overallScore,
            validationAnalysis,
            sanitizationAnalysis,
            injectionPrevention,
            violations
        };
    }
    /**
     * Analyze secret detection
     */
    async analyzeSecretDetection(code, context) {
        // Placeholder implementation
        const totalSecrets = Math.floor(Math.random() * 3); // 0-3 secrets (should be 0 ideally)
        const secretScan = {
            totalSecrets,
            secretsByType: totalSecrets > 0 ? { "api_key": 1, "password": totalSecrets - 1 } : {},
            filesWithSecrets: totalSecrets > 0 ? [context.filePaths[0] || "src/config.ts"] : [],
            secretDetails: totalSecrets > 0 ? [
                {
                    type: "api_key",
                    filePath: context.filePaths[0] || "src/config.ts",
                    lineNumber: 15,
                    pattern: "API_KEY = 'sk-...'",
                    confidence: "High",
                    maskedValue: "sk-****"
                }
            ] : []
        };
        const credentialManagement = {
            storageScore: Math.floor(Math.random() * 20) + 75, // 75-95%
            accessControlScore: Math.floor(Math.random() * 25) + 70, // 70-95%
            rotationScore: Math.floor(Math.random() * 30) + 60, // 60-90%
            encryptionScore: Math.floor(Math.random() * 15) + 80, // 80-95%
            practices: [
                { type: "environment_variables", count: 8, securityRating: 85, recommendations: ["Use secure env var management"] },
                { type: "hardcoded", count: totalSecrets, securityRating: 0, recommendations: ["Remove hardcoded credentials"] }
            ]
        };
        const environmentVariables = {
            totalEnvVars: 12,
            secureEnvVars: 10,
            securityPercentage: Math.round((10 / 12) * 100),
            envVarDetails: [
                {
                    name: "DATABASE_URL",
                    type: "secret",
                    securityLevel: "Secure",
                    usageLocations: [context.filePaths[0] || "src/db.ts"],
                    recommendations: []
                },
                {
                    name: "DEBUG_MODE",
                    type: "config",
                    securityLevel: "Secure",
                    usageLocations: [context.filePaths[0] || "src/app.ts"],
                    recommendations: []
                }
            ]
        };
        const violations = totalSecrets > 0 ? [
            {
                type: "hardcoded_secret",
                filePath: context.filePaths[0] || "src/config.ts",
                lineNumber: 15,
                description: "API key hardcoded in source code",
                severity: "Critical",
                remediation: ["Move to environment variables", "Use secure key management", "Remove from version control"]
            }
        ] : [];
        const overallScore = totalSecrets === 0 ?
            Math.round((credentialManagement.storageScore + environmentVariables.securityPercentage) / 2) :
            Math.max(0, Math.round((credentialManagement.storageScore + environmentVariables.securityPercentage) / 2) - (totalSecrets * 20));
        return {
            overallScore,
            secretScan,
            credentialManagement,
            environmentVariables,
            violations
        };
    }
    /**
     * Analyze safe defaults
     */
    async analyzeSafeDefaults(code, context) {
        // Placeholder implementation
        const defaultSecurity = {
            secureDefaultsPercentage: Math.floor(Math.random() * 25) + 70, // 70-95%
            configurationSecurity: Math.floor(Math.random() * 20) + 75, // 75-95%
            permissionDefaults: Math.floor(Math.random() * 30) + 65, // 65-95%
            defaultConfigurations: [
                {
                    name: "CORS_ORIGIN",
                    defaultValue: "*",
                    securityLevel: "Insecure",
                    recommendation: "Specify allowed origins explicitly",
                    location: context.filePaths[0] || "src/config.ts"
                },
                {
                    name: "SESSION_SECURE",
                    defaultValue: "true",
                    securityLevel: "Secure",
                    recommendation: "Keep secure flag enabled",
                    location: context.filePaths[0] || "src/session.ts"
                }
            ]
        };
        const failSafe = {
            implementationScore: Math.floor(Math.random() * 25) + 70, // 70-95%
            errorHandlingSecurity: Math.floor(Math.random() * 20) + 75, // 75-95%
            gracefulDegradation: Math.floor(Math.random() * 30) + 65, // 65-95%
            mechanisms: [
                {
                    type: "error_handling",
                    quality: 85,
                    coverage: ["API endpoints", "Database operations"],
                    securityImplications: ["No sensitive data in error messages"]
                },
                {
                    type: "timeout_handling",
                    quality: 75,
                    coverage: ["HTTP requests", "Database queries"],
                    securityImplications: ["Prevents resource exhaustion"]
                }
            ]
        };
        const leastPrivilege = {
            complianceScore: Math.floor(Math.random() * 25) + 70, // 70-95%
            accessControlImplementation: Math.floor(Math.random() * 20) + 75, // 75-95%
            permissionGranularity: Math.floor(Math.random() * 30) + 65, // 65-95%
            privilegeViolations: Math.random() > 0.7 ? [
                {
                    type: "excessive_permissions",
                    component: "User API",
                    currentPermissions: ["read", "write", "delete", "admin"],
                    recommendedPermissions: ["read", "write"],
                    riskLevel: "Medium"
                }
            ] : []
        };
        const violations = [
            {
                type: "insecure_default",
                filePath: context.filePaths[0] || "src/config.ts",
                lineNumber: 20,
                description: "CORS configured to allow all origins by default",
                severity: "Medium",
                remediation: ["Configure specific allowed origins", "Implement origin validation"]
            }
        ];
        const overallScore = Math.round((defaultSecurity.secureDefaultsPercentage + failSafe.implementationScore + leastPrivilege.complianceScore) / 3);
        return {
            overallScore,
            defaultSecurity,
            failSafe,
            leastPrivilege,
            violations
        };
    }
    /**
     * Analyze dependency security
     */
    async analyzeDependencySecurity(code, context) {
        // Placeholder implementation
        const totalVulnerabilities = Math.floor(Math.random() * 5); // 0-5 vulnerabilities
        const vulnerabilityScan = {
            totalVulnerabilities,
            vulnerabilitiesBySeverity: totalVulnerabilities > 0 ? {
                "Critical": Math.floor(totalVulnerabilities * 0.2),
                "High": Math.floor(totalVulnerabilities * 0.3),
                "Medium": Math.floor(totalVulnerabilities * 0.3),
                "Low": Math.floor(totalVulnerabilities * 0.2)
            } : {},
            affectedPackages: totalVulnerabilities > 0 ? ["lodash", "express"] : [],
            vulnerabilityDetails: totalVulnerabilities > 0 ? [
                {
                    cveId: "CVE-2023-1234",
                    packageName: "lodash",
                    affectedVersions: ["< 4.17.21"],
                    severity: "High",
                    description: "Prototype pollution vulnerability",
                    fixAvailable: true,
                    recommendedAction: "Update to version 4.17.21 or later"
                }
            ] : []
        };
        const totalDependencies = Math.floor(Math.random() * 20) + 30; // 30-50 dependencies
        const secureDependencies = totalDependencies - totalVulnerabilities;
        const dependencyAudit = {
            totalDependencies,
            secureDependencies,
            securityPercentage: Math.round((secureDependencies / totalDependencies) * 100),
            outdatedDependencies: [
                {
                    name: "express",
                    currentVersion: "4.17.1",
                    latestVersion: "4.18.2",
                    securityRisk: "Medium",
                    updateRecommendation: "Update to latest version for security patches"
                }
            ],
            suspiciousDependencies: Math.random() > 0.8 ? [
                {
                    name: "suspicious-package",
                    reason: "Recently published with minimal downloads",
                    riskLevel: "Medium",
                    recommendedAction: "Review package legitimacy before use"
                }
            ] : []
        };
        const versionAnalysis = {
            complianceScore: Math.floor(Math.random() * 25) + 70, // 70-95%
            updateFrequency: {
                averageDaysSinceUpdate: Math.floor(Math.random() * 100) + 30, // 30-130 days
                packagesNeedingUpdates: Math.floor(totalDependencies * 0.2), // 20% need updates
                urgencyDistribution: { "High": 2, "Medium": 5, "Low": 8 }
            },
            policyCompliance: {
                compliancePercentage: Math.floor(Math.random() * 20) + 75, // 75-95%
                violations: [
                    {
                        packageName: "old-package",
                        type: "version_policy",
                        description: "Package version is below minimum required version",
                        severity: "Medium"
                    }
                ],
                recommendations: ["Update packages to meet version policy", "Review security policies"]
            }
        };
        const violations = totalVulnerabilities > 0 ? [
            {
                type: "vulnerable_dependency",
                packageName: "lodash",
                description: "Package contains known security vulnerabilities",
                severity: "High",
                remediation: ["Update to secure version", "Review usage patterns", "Consider alternatives"]
            }
        ] : [];
        const overallScore = totalVulnerabilities === 0 ?
            Math.round((dependencyAudit.securityPercentage + versionAnalysis.complianceScore) / 2) :
            Math.max(0, Math.round((dependencyAudit.securityPercentage + versionAnalysis.complianceScore) / 2) - (totalVulnerabilities * 10));
        return {
            overallScore,
            vulnerabilityScan,
            dependencyAudit,
            versionAnalysis,
            violations
        };
    }
}
/**
 * Create a security assessor
 */
export function createSecurityAssessor() {
    return new SecurityAssessor();
}
//# sourceMappingURL=security-assessor.js.map