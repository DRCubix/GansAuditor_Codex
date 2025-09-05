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
import type { QualityCriterion, CriterionEvaluation, QualityEvaluationContext } from '../quality-assessment.js';
/**
 * Input validation checking result
 */
export interface InputValidationResult {
    /** Overall validation score (0-100) */
    overallScore: number;
    /** Input validation analysis */
    validationAnalysis: ValidationAnalysis;
    /** Sanitization analysis */
    sanitizationAnalysis: SanitizationAnalysis;
    /** Injection prevention analysis */
    injectionPrevention: InjectionPreventionAnalysis;
    /** Validation violations */
    violations: ValidationViolation[];
}
/**
 * Validation analysis
 */
export interface ValidationAnalysis {
    /** Total input points */
    totalInputPoints: number;
    /** Validated input points */
    validatedInputPoints: number;
    /** Validation coverage percentage */
    validationCoverage: number;
    /** Input types analyzed */
    inputTypes: InputTypeAnalysis[];
    /** Unvalidated inputs */
    unvalidatedInputs: UnvalidatedInput[];
}
/**
 * Input type analysis
 */
export interface InputTypeAnalysis {
    /** Input type */
    type: "user_input" | "api_parameter" | "file_upload" | "query_parameter" | "form_data" | "json_payload";
    /** Total inputs of this type */
    total: number;
    /** Validated inputs of this type */
    validated: number;
    /** Validation percentage */
    percentage: number;
    /** Common validation patterns */
    validationPatterns: string[];
}
/**
 * Unvalidated input detail
 */
export interface UnvalidatedInput {
    /** Input identifier */
    id: string;
    /** Input type */
    type: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Input source */
    source: string;
    /** Risk level */
    riskLevel: "Critical" | "High" | "Medium" | "Low";
    /** Potential vulnerabilities */
    vulnerabilities: string[];
}
/**
 * Sanitization analysis
 */
export interface SanitizationAnalysis {
    /** Total inputs requiring sanitization */
    totalInputs: number;
    /** Properly sanitized inputs */
    sanitizedInputs: number;
    /** Sanitization coverage percentage */
    sanitizationCoverage: number;
    /** Sanitization methods used */
    sanitizationMethods: SanitizationMethod[];
    /** Unsanitized inputs */
    unsanitizedInputs: UnsanitizedInput[];
}
/**
 * Sanitization method
 */
export interface SanitizationMethod {
    /** Method name */
    method: string;
    /** Usage count */
    usageCount: number;
    /** Effectiveness score */
    effectiveness: number;
    /** Input types it handles */
    inputTypes: string[];
}
/**
 * Unsanitized input detail
 */
export interface UnsanitizedInput {
    /** Input identifier */
    id: string;
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Input value */
    inputValue: string;
    /** Risk assessment */
    risk: string;
    /** Suggested sanitization */
    suggestedSanitization: string;
}
/**
 * Injection prevention analysis
 */
export interface InjectionPreventionAnalysis {
    /** SQL injection prevention score */
    sqlInjectionPrevention: number;
    /** XSS prevention score */
    xssPrevention: number;
    /** Command injection prevention score */
    commandInjectionPrevention: number;
    /** LDAP injection prevention score */
    ldapInjectionPrevention: number;
    /** Prevention mechanisms */
    preventionMechanisms: PreventionMechanism[];
}
/**
 * Prevention mechanism
 */
export interface PreventionMechanism {
    /** Mechanism type */
    type: "parameterized_queries" | "input_encoding" | "whitelist_validation" | "escape_sequences";
    /** Implementation quality */
    quality: number;
    /** Coverage percentage */
    coverage: number;
    /** Files using this mechanism */
    files: string[];
}
/**
 * Validation violation
 */
export interface ValidationViolation {
    /** Violation type */
    type: "missing_validation" | "weak_validation" | "bypass_possible" | "insufficient_sanitization";
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Description */
    description: string;
    /** Severity */
    severity: "Critical" | "High" | "Medium" | "Low";
    /** Potential impact */
    impact: string;
    /** Remediation steps */
    remediation: string[];
}
/**
 * Secret detection result
 */
export interface SecretDetectionResult {
    /** Overall security score (0-100) */
    overallScore: number;
    /** Secret scan results */
    secretScan: SecretScanResults;
    /** Credential management analysis */
    credentialManagement: CredentialManagementAnalysis;
    /** Environment variable analysis */
    environmentVariables: EnvironmentVariableAnalysis;
    /** Security violations */
    violations: SecretViolation[];
}
/**
 * Secret scan results
 */
export interface SecretScanResults {
    /** Total secrets found */
    totalSecrets: number;
    /** Secrets by type */
    secretsByType: Record<string, number>;
    /** Files with secrets */
    filesWithSecrets: string[];
    /** Secret details */
    secretDetails: SecretDetail[];
}
/**
 * Secret detail
 */
export interface SecretDetail {
    /** Secret type */
    type: "api_key" | "password" | "token" | "certificate" | "private_key" | "connection_string";
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Pattern matched */
    pattern: string;
    /** Confidence level */
    confidence: "High" | "Medium" | "Low";
    /** Masked value */
    maskedValue: string;
}
/**
 * Credential management analysis
 */
export interface CredentialManagementAnalysis {
    /** Credential storage security score */
    storageScore: number;
    /** Access control score */
    accessControlScore: number;
    /** Rotation policy score */
    rotationScore: number;
    /** Encryption usage score */
    encryptionScore: number;
    /** Management practices */
    practices: CredentialPractice[];
}
/**
 * Credential practice
 */
export interface CredentialPractice {
    /** Practice type */
    type: "environment_variables" | "key_vault" | "encrypted_storage" | "hardcoded" | "config_files";
    /** Usage count */
    count: number;
    /** Security rating */
    securityRating: number;
    /** Recommendations */
    recommendations: string[];
}
/**
 * Environment variable analysis
 */
export interface EnvironmentVariableAnalysis {
    /** Total environment variables */
    totalEnvVars: number;
    /** Secure environment variables */
    secureEnvVars: number;
    /** Security percentage */
    securityPercentage: number;
    /** Environment variable details */
    envVarDetails: EnvVarDetail[];
}
/**
 * Environment variable detail
 */
export interface EnvVarDetail {
    /** Variable name */
    name: string;
    /** Variable type */
    type: "secret" | "config" | "feature_flag" | "url" | "other";
    /** Security level */
    securityLevel: "Secure" | "Questionable" | "Insecure";
    /** Usage locations */
    usageLocations: string[];
    /** Security recommendations */
    recommendations: string[];
}
/**
 * Secret violation
 */
export interface SecretViolation {
    /** Violation type */
    type: "hardcoded_secret" | "weak_encryption" | "insecure_storage" | "exposed_credentials";
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Description */
    description: string;
    /** Severity */
    severity: "Critical" | "High" | "Medium" | "Low";
    /** Remediation steps */
    remediation: string[];
}
/**
 * Safe defaults verification result
 */
export interface SafeDefaultsResult {
    /** Overall safety score (0-100) */
    overallScore: number;
    /** Default security analysis */
    defaultSecurity: DefaultSecurityAnalysis;
    /** Fail-safe analysis */
    failSafe: FailSafeAnalysis;
    /** Principle of least privilege analysis */
    leastPrivilege: LeastPrivilegeAnalysis;
    /** Safety violations */
    violations: SafetyViolation[];
}
/**
 * Default security analysis
 */
export interface DefaultSecurityAnalysis {
    /** Secure defaults percentage */
    secureDefaultsPercentage: number;
    /** Configuration security score */
    configurationSecurity: number;
    /** Permission defaults score */
    permissionDefaults: number;
    /** Default configurations */
    defaultConfigurations: DefaultConfiguration[];
}
/**
 * Default configuration
 */
export interface DefaultConfiguration {
    /** Configuration name */
    name: string;
    /** Current default value */
    defaultValue: string;
    /** Security level */
    securityLevel: "Secure" | "Questionable" | "Insecure";
    /** Recommendation */
    recommendation: string;
    /** File location */
    location: string;
}
/**
 * Fail-safe analysis
 */
export interface FailSafeAnalysis {
    /** Fail-safe implementation score */
    implementationScore: number;
    /** Error handling security score */
    errorHandlingSecurity: number;
    /** Graceful degradation score */
    gracefulDegradation: number;
    /** Fail-safe mechanisms */
    mechanisms: FailSafeMechanism[];
}
/**
 * Fail-safe mechanism
 */
export interface FailSafeMechanism {
    /** Mechanism type */
    type: "error_handling" | "timeout_handling" | "resource_limits" | "circuit_breaker";
    /** Implementation quality */
    quality: number;
    /** Coverage areas */
    coverage: string[];
    /** Security implications */
    securityImplications: string[];
}
/**
 * Least privilege analysis
 */
export interface LeastPrivilegeAnalysis {
    /** Privilege compliance score */
    complianceScore: number;
    /** Access control implementation */
    accessControlImplementation: number;
    /** Permission granularity score */
    permissionGranularity: number;
    /** Privilege violations */
    privilegeViolations: PrivilegeViolation[];
}
/**
 * Privilege violation
 */
export interface PrivilegeViolation {
    /** Violation type */
    type: "excessive_permissions" | "missing_access_control" | "privilege_escalation" | "insecure_defaults";
    /** Component */
    component: string;
    /** Current permissions */
    currentPermissions: string[];
    /** Recommended permissions */
    recommendedPermissions: string[];
    /** Risk level */
    riskLevel: "High" | "Medium" | "Low";
}
/**
 * Safety violation
 */
export interface SafetyViolation {
    /** Violation type */
    type: "insecure_default" | "unsafe_fallback" | "privilege_violation" | "missing_safeguard";
    /** File path */
    filePath: string;
    /** Line number */
    lineNumber: number;
    /** Description */
    description: string;
    /** Severity */
    severity: "Critical" | "High" | "Medium" | "Low";
    /** Remediation steps */
    remediation: string[];
}
/**
 * Dependency security analysis result
 */
export interface DependencySecurityResult {
    /** Overall security score (0-100) */
    overallScore: number;
    /** Vulnerability scan results */
    vulnerabilityScan: VulnerabilityScanResults;
    /** Dependency audit results */
    dependencyAudit: DependencyAuditResults;
    /** Version analysis */
    versionAnalysis: VersionAnalysisResults;
    /** Security violations */
    violations: DependencyViolation[];
}
/**
 * Vulnerability scan results
 */
export interface VulnerabilityScanResults {
    /** Total vulnerabilities found */
    totalVulnerabilities: number;
    /** Vulnerabilities by severity */
    vulnerabilitiesBySeverity: Record<string, number>;
    /** Affected packages */
    affectedPackages: string[];
    /** Vulnerability details */
    vulnerabilityDetails: VulnerabilityDetail[];
}
/**
 * Vulnerability detail
 */
export interface VulnerabilityDetail {
    /** CVE identifier */
    cveId: string;
    /** Package name */
    packageName: string;
    /** Affected versions */
    affectedVersions: string[];
    /** Severity */
    severity: "Critical" | "High" | "Medium" | "Low";
    /** Description */
    description: string;
    /** Fix available */
    fixAvailable: boolean;
    /** Recommended action */
    recommendedAction: string;
}
/**
 * Dependency audit results
 */
export interface DependencyAuditResults {
    /** Total dependencies */
    totalDependencies: number;
    /** Secure dependencies */
    secureDependencies: number;
    /** Security percentage */
    securityPercentage: number;
    /** Outdated dependencies */
    outdatedDependencies: OutdatedDependency[];
    /** Suspicious dependencies */
    suspiciousDependencies: SuspiciousDependency[];
}
/**
 * Outdated dependency
 */
export interface OutdatedDependency {
    /** Package name */
    name: string;
    /** Current version */
    currentVersion: string;
    /** Latest version */
    latestVersion: string;
    /** Security risk */
    securityRisk: "High" | "Medium" | "Low";
    /** Update recommendation */
    updateRecommendation: string;
}
/**
 * Suspicious dependency
 */
export interface SuspiciousDependency {
    /** Package name */
    name: string;
    /** Suspicion reason */
    reason: string;
    /** Risk level */
    riskLevel: "High" | "Medium" | "Low";
    /** Recommended action */
    recommendedAction: string;
}
/**
 * Version analysis results
 */
export interface VersionAnalysisResults {
    /** Version compliance score */
    complianceScore: number;
    /** Update frequency analysis */
    updateFrequency: UpdateFrequencyAnalysis;
    /** Version policy compliance */
    policyCompliance: PolicyComplianceAnalysis;
}
/**
 * Update frequency analysis
 */
export interface UpdateFrequencyAnalysis {
    /** Average days since last update */
    averageDaysSinceUpdate: number;
    /** Packages needing updates */
    packagesNeedingUpdates: number;
    /** Update urgency distribution */
    urgencyDistribution: Record<string, number>;
}
/**
 * Policy compliance analysis
 */
export interface PolicyComplianceAnalysis {
    /** Policy compliance percentage */
    compliancePercentage: number;
    /** Policy violations */
    violations: PolicyViolation[];
    /** Compliance recommendations */
    recommendations: string[];
}
/**
 * Policy violation
 */
export interface PolicyViolation {
    /** Package name */
    packageName: string;
    /** Violation type */
    type: "version_policy" | "security_policy" | "license_policy";
    /** Description */
    description: string;
    /** Severity */
    severity: "High" | "Medium" | "Low";
}
/**
 * Dependency violation
 */
export interface DependencyViolation {
    /** Violation type */
    type: "vulnerable_dependency" | "outdated_dependency" | "suspicious_package" | "policy_violation";
    /** Package name */
    packageName: string;
    /** Description */
    description: string;
    /** Severity */
    severity: "Critical" | "High" | "Medium" | "Low";
    /** Remediation steps */
    remediation: string[];
}
/**
 * Assessor for security quality dimension
 */
export declare class SecurityAssessor {
    /**
     * Evaluate input validation checking criterion
     */
    evaluateInputValidationChecking(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate secret detection and validation criterion
     */
    evaluateSecretDetection(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate safe defaults verification criterion
     */
    evaluateSafeDefaultsVerification(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Evaluate dependency security analysis criterion
     */
    evaluateDependencySecurityAnalysis(criterion: QualityCriterion, code: string, context: QualityEvaluationContext): Promise<CriterionEvaluation>;
    /**
     * Analyze input validation
     */
    private analyzeInputValidation;
    /**
     * Analyze secret detection
     */
    private analyzeSecretDetection;
    /**
     * Analyze safe defaults
     */
    private analyzeSafeDefaults;
    /**
     * Analyze dependency security
     */
    private analyzeDependencySecurity;
}
/**
 * Create a security assessor
 */
export declare function createSecurityAssessor(): SecurityAssessor;
//# sourceMappingURL=security-assessor.d.ts.map