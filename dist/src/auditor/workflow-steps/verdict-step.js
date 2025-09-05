/**
 * VERDICT Step Implementation
 *
 * This module implements the VERDICT step of the audit workflow, which handles:
 * - Dimensional scoring calculation
 * - Overall verdict determination logic
 * - Structured feedback generation
 * - Evidence-based decision documentation
 *
 * Requirements: 2.8
 */
// ============================================================================
// VERDICT Step Implementation
// ============================================================================
/**
 * Execute the VERDICT step of the audit workflow
 */
export async function executeVerdictStep(inputs, outputs, evidence) {
    try {
        // Calculate dimensional scores
        const dimensionalScores = await calculateDimensionalScores(inputs, evidence);
        // Determine overall verdict
        const overallVerdict = await determineOverallVerdict(dimensionalScores, evidence, inputs);
        // Generate structured feedback
        const structuredFeedback = await generateStructuredFeedback(dimensionalScores, overallVerdict, evidence, inputs);
        // Create evidence-based decision documentation
        const decisionDocumentation = await createDecisionDocumentation(dimensionalScores, overallVerdict, evidence, inputs);
        // Set outputs
        const verdictOutputs = {
            dimensionalScores,
            overallVerdict,
            structuredFeedback,
            decisionDocumentation
        };
        Object.assign(outputs, verdictOutputs);
        // Add final evidence summary
        await addFinalEvidenceSummary(verdictOutputs, evidence);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        evidence.push({
            type: "missing_requirement",
            severity: "Critical",
            location: "VERDICT step",
            description: `Failed to generate verdict: ${errorMessage}`,
            proof: errorMessage,
            suggestedFix: "Review audit results and ensure all workflow steps completed successfully"
        });
        throw error;
    }
}
// ============================================================================
// Dimensional Scoring
// ============================================================================
/**
 * Calculate dimensional quality scores
 */
async function calculateDimensionalScores(inputs, evidence) {
    const dimensions = [
        { name: 'Correctness & Completeness', weight: 0.30 },
        { name: 'Tests', weight: 0.20 },
        { name: 'Style & Conventions', weight: 0.15 },
        { name: 'Security', weight: 0.15 },
        { name: 'Performance', weight: 0.10 },
        { name: 'Docs & Traceability', weight: 0.10 }
    ];
    const scores = [];
    for (const dimension of dimensions) {
        const score = await calculateDimensionScore(dimension.name, evidence, inputs);
        const weightedScore = score * dimension.weight;
        const issues = extractDimensionIssues(dimension.name, evidence);
        const recommendations = generateDimensionRecommendations(dimension.name, issues, score);
        scores.push({
            name: dimension.name,
            score,
            weight: dimension.weight,
            weightedScore,
            issues,
            recommendations
        });
    }
    return scores;
}
/**
 * Calculate score for a specific dimension
 */
async function calculateDimensionScore(dimensionName, evidence, inputs) {
    let baseScore = 100;
    const relevantEvidence = filterEvidenceByDimension(dimensionName, evidence);
    // Deduct points based on evidence severity
    for (const item of relevantEvidence) {
        switch (item.severity) {
            case 'Critical':
                baseScore -= 25;
                break;
            case 'Major':
                baseScore -= 15;
                break;
            case 'Minor':
                baseScore -= 5;
                break;
        }
    }
    // Apply dimension-specific scoring logic
    baseScore = await applyDimensionSpecificScoring(dimensionName, baseScore, inputs);
    // Ensure score is within bounds
    return Math.max(0, Math.min(100, baseScore));
}
/**
 * Filter evidence by dimension
 */
function filterEvidenceByDimension(dimensionName, evidence) {
    const dimensionMappings = {
        'Correctness & Completeness': ['missing_requirement', 'logic_error'],
        'Tests': ['test_failure', 'coverage_gap'],
        'Style & Conventions': ['lint_violation', 'format_issue', 'naming_violation'],
        'Security': ['security_vulnerability'],
        'Performance': ['performance_issue'],
        'Docs & Traceability': ['documentation_gap', 'missing_requirement']
    };
    const relevantTypes = dimensionMappings[dimensionName] || [];
    return evidence.filter(item => relevantTypes.includes(item.type));
}
/**
 * Apply dimension-specific scoring adjustments
 */
async function applyDimensionSpecificScoring(dimensionName, baseScore, inputs) {
    let adjustedScore = baseScore;
    // Apply specific logic based on workflow results
    const workflowResults = inputs.workflowResults || {};
    switch (dimensionName) {
        case 'Correctness & Completeness':
            // Boost score if all ACs are met
            if (workflowResults.traceabilityMatrix) {
                const coverage = workflowResults.coverageReport?.coveragePercentage || 0;
                if (coverage >= 90)
                    adjustedScore += 10;
                else if (coverage >= 80)
                    adjustedScore += 5;
            }
            break;
        case 'Tests':
            // Adjust based on test coverage
            if (workflowResults.testQualityMetrics) {
                const coverage = workflowResults.testQualityMetrics.coverage || 0;
                if (coverage >= 90)
                    adjustedScore += 10;
                else if (coverage >= 80)
                    adjustedScore += 5;
                else if (coverage < 60)
                    adjustedScore -= 10;
            }
            break;
        case 'Style & Conventions':
            // Boost score if no linting violations
            if (workflowResults.lintResults && workflowResults.lintResults.length === 0) {
                adjustedScore += 5;
            }
            break;
        case 'Security':
            // Penalize heavily for security issues
            if (workflowResults.securityFindings) {
                const criticalSecurity = workflowResults.securityFindings.filter((f) => f.severity === 'Critical');
                adjustedScore -= criticalSecurity.length * 20;
            }
            break;
        case 'Performance':
            // Adjust based on performance metrics
            if (workflowResults.performanceMetrics) {
                const responseTime = workflowResults.performanceMetrics.averageResponseTime || 0;
                if (responseTime > 1000)
                    adjustedScore -= 15;
                else if (responseTime > 500)
                    adjustedScore -= 5;
            }
            break;
        case 'Docs & Traceability':
            // Boost score for good traceability
            if (workflowResults.coverageReport) {
                const coverage = workflowResults.coverageReport.coveragePercentage || 0;
                if (coverage >= 95)
                    adjustedScore += 10;
                else if (coverage >= 85)
                    adjustedScore += 5;
            }
            break;
    }
    return adjustedScore;
}
/**
 * Extract issues for a specific dimension
 */
function extractDimensionIssues(dimensionName, evidence) {
    const relevantEvidence = filterEvidenceByDimension(dimensionName, evidence);
    return relevantEvidence.map(item => ({
        severity: item.severity,
        description: item.description,
        impact: getSeverityImpact(item.severity),
        location: item.location
    }));
}
/**
 * Get numeric impact for severity level
 */
function getSeverityImpact(severity) {
    switch (severity) {
        case 'Critical': return 25;
        case 'Major': return 15;
        case 'Minor': return 5;
    }
}
/**
 * Generate recommendations for a dimension
 */
function generateDimensionRecommendations(dimensionName, issues, score) {
    const recommendations = [];
    if (score < 60) {
        recommendations.push(`${dimensionName} needs significant improvement`);
    }
    const criticalIssues = issues.filter(i => i.severity === 'Critical');
    if (criticalIssues.length > 0) {
        recommendations.push(`Address ${criticalIssues.length} critical ${dimensionName.toLowerCase()} issues immediately`);
    }
    const majorIssues = issues.filter(i => i.severity === 'Major');
    if (majorIssues.length > 0) {
        recommendations.push(`Resolve ${majorIssues.length} major ${dimensionName.toLowerCase()} issues`);
    }
    // Add dimension-specific recommendations
    switch (dimensionName) {
        case 'Correctness & Completeness':
            if (score < 80)
                recommendations.push('Complete implementation of all acceptance criteria');
            break;
        case 'Tests':
            if (score < 80)
                recommendations.push('Improve test coverage and add missing tests');
            break;
        case 'Style & Conventions':
            if (score < 80)
                recommendations.push('Fix linting violations and follow coding standards');
            break;
        case 'Security':
            if (score < 90)
                recommendations.push('Address security vulnerabilities and implement security best practices');
            break;
        case 'Performance':
            if (score < 80)
                recommendations.push('Optimize performance bottlenecks and improve response times');
            break;
        case 'Docs & Traceability':
            if (score < 80)
                recommendations.push('Improve documentation and requirements traceability');
            break;
    }
    return recommendations;
}
// ============================================================================
// Overall Verdict Determination
// ============================================================================
/**
 * Determine overall verdict based on dimensional scores and evidence
 */
async function determineOverallVerdict(dimensionalScores, evidence, inputs) {
    // Calculate overall score
    const overallScore = Math.round(dimensionalScores.reduce((sum, dim) => sum + dim.weightedScore, 0));
    // Count critical issues
    const criticalIssues = evidence.filter(e => e.severity === 'Critical').length;
    const majorIssues = evidence.filter(e => e.severity === 'Major').length;
    // Get quality thresholds
    const thresholds = inputs.qualityThresholds || {
        shipThreshold: 85,
        reviseThreshold: 60,
        maxCriticalIssues: 0,
        maxMajorIssues: 3
    };
    // Determine decision
    let decision;
    let confidence;
    const reasons = [];
    const blockers = [];
    const nextActions = [];
    // Check for critical blockers
    if (criticalIssues > thresholds.maxCriticalIssues) {
        decision = 'reject';
        confidence = 95;
        reasons.push(`${criticalIssues} critical issues found (max allowed: ${thresholds.maxCriticalIssues})`);
        blockers.push('Critical issues must be resolved before shipping');
        nextActions.push('Fix all critical issues');
    }
    else if (overallScore >= thresholds.shipThreshold && majorIssues <= thresholds.maxMajorIssues) {
        decision = 'ship';
        confidence = Math.min(95, 70 + (overallScore - thresholds.shipThreshold));
        reasons.push(`Quality score ${overallScore}% meets shipping threshold`);
        reasons.push(`No critical blockers found`);
        nextActions.push('Code is ready for deployment');
    }
    else if (overallScore >= thresholds.reviseThreshold) {
        decision = 'revise';
        confidence = 80;
        reasons.push(`Quality score ${overallScore}% requires improvement`);
        if (majorIssues > thresholds.maxMajorIssues) {
            reasons.push(`${majorIssues} major issues exceed threshold (${thresholds.maxMajorIssues})`);
        }
        nextActions.push('Address major issues and re-audit');
    }
    else {
        decision = 'reject';
        confidence = 90;
        reasons.push(`Quality score ${overallScore}% below minimum threshold`);
        blockers.push('Significant quality improvements required');
        nextActions.push('Major refactoring and improvement needed');
    }
    // Add dimension-specific reasons
    const poorDimensions = dimensionalScores.filter(d => d.score < 60);
    if (poorDimensions.length > 0) {
        reasons.push(`Poor performance in: ${poorDimensions.map(d => d.name).join(', ')}`);
    }
    return {
        decision,
        overallScore,
        confidence,
        reasons,
        blockers,
        nextActions
    };
}
// ============================================================================
// Structured Feedback Generation
// ============================================================================
/**
 * Generate structured feedback summary
 */
async function generateStructuredFeedback(dimensionalScores, overallVerdict, evidence, inputs) {
    // Generate executive summary
    const executiveSummary = generateExecutiveSummary(overallVerdict, dimensionalScores, evidence);
    // Generate detailed findings by category
    const detailedFindings = generateDetailedFindings(dimensionalScores);
    // Generate priority recommendations
    const priorityRecommendations = generatePriorityRecommendations(dimensionalScores, evidence);
    // Identify success highlights
    const successHighlights = identifySuccessHighlights(dimensionalScores, evidence);
    // Identify improvement areas
    const improvementAreas = identifyImprovementAreas(dimensionalScores, evidence);
    return {
        executiveSummary,
        detailedFindings,
        priorityRecommendations,
        successHighlights,
        improvementAreas
    };
}
/**
 * Generate executive summary
 */
function generateExecutiveSummary(verdict, dimensionalScores, evidence) {
    const summary = [];
    // Overall verdict
    summary.push(`Overall Quality Score: ${verdict.overallScore}% - ${verdict.decision.toUpperCase()}`);
    // Evidence summary
    const criticalCount = evidence.filter(e => e.severity === 'Critical').length;
    const majorCount = evidence.filter(e => e.severity === 'Major').length;
    const minorCount = evidence.filter(e => e.severity === 'Minor').length;
    summary.push(`Found ${criticalCount} critical, ${majorCount} major, and ${minorCount} minor issues`);
    // Best and worst dimensions
    const sortedDimensions = [...dimensionalScores].sort((a, b) => b.score - a.score);
    const bestDimension = sortedDimensions[0];
    const worstDimension = sortedDimensions[sortedDimensions.length - 1];
    summary.push(`Strongest area: ${bestDimension.name} (${bestDimension.score}%)`);
    if (worstDimension.score < 70) {
        summary.push(`Needs improvement: ${worstDimension.name} (${worstDimension.score}%)`);
    }
    // Decision rationale
    if (verdict.decision === 'ship') {
        summary.push('Code meets quality standards and is ready for deployment');
    }
    else if (verdict.decision === 'revise') {
        summary.push('Code requires improvements before shipping');
    }
    else {
        summary.push('Code needs significant work before it can be shipped');
    }
    return summary;
}
/**
 * Generate detailed findings by category
 */
function generateDetailedFindings(dimensionalScores) {
    return dimensionalScores.map(dimension => {
        let status;
        if (dimension.score >= 90)
            status = 'excellent';
        else if (dimension.score >= 80)
            status = 'good';
        else if (dimension.score >= 70)
            status = 'acceptable';
        else if (dimension.score >= 50)
            status = 'needs-work';
        else
            status = 'poor';
        return {
            category: dimension.name,
            score: dimension.score,
            issues: dimension.issues.map(i => i.description),
            recommendations: dimension.recommendations,
            status
        };
    });
}
/**
 * Generate priority recommendations
 */
function generatePriorityRecommendations(dimensionalScores, evidence) {
    const recommendations = [];
    // Critical issues first
    const criticalEvidence = evidence.filter(e => e.severity === 'Critical');
    for (const item of criticalEvidence.slice(0, 3)) { // Top 3 critical
        recommendations.push({
            priority: 'Critical',
            recommendation: item.suggestedFix || `Address critical issue: ${item.description}`,
            impact: 'High - blocks shipping',
            effort: 'High'
        });
    }
    // Major issues from worst-performing dimensions
    const worstDimensions = dimensionalScores
        .filter(d => d.score < 70)
        .sort((a, b) => a.score - b.score)
        .slice(0, 2);
    for (const dimension of worstDimensions) {
        const majorIssues = dimension.issues.filter(i => i.severity === 'Major');
        if (majorIssues.length > 0) {
            recommendations.push({
                priority: 'High',
                recommendation: `Improve ${dimension.name}: ${dimension.recommendations[0]}`,
                impact: 'Medium - improves quality score',
                effort: 'Medium'
            });
        }
    }
    // General improvements
    const mediumScoreDimensions = dimensionalScores.filter(d => d.score >= 70 && d.score < 85);
    for (const dimension of mediumScoreDimensions.slice(0, 2)) {
        recommendations.push({
            priority: 'Medium',
            recommendation: `Enhance ${dimension.name}: ${dimension.recommendations[0] || 'Address remaining issues'}`,
            impact: 'Low - polish and best practices',
            effort: 'Low'
        });
    }
    return recommendations;
}
/**
 * Identify success highlights
 */
function identifySuccessHighlights(dimensionalScores, evidence) {
    const highlights = [];
    // High-scoring dimensions
    const excellentDimensions = dimensionalScores.filter(d => d.score >= 90);
    for (const dimension of excellentDimensions) {
        highlights.push(`Excellent ${dimension.name} (${dimension.score}%)`);
    }
    // Good dimensions
    const goodDimensions = dimensionalScores.filter(d => d.score >= 80 && d.score < 90);
    if (goodDimensions.length > 0) {
        highlights.push(`Good performance in ${goodDimensions.map(d => d.name).join(', ')}`);
    }
    // No critical issues
    const criticalIssues = evidence.filter(e => e.severity === 'Critical').length;
    if (criticalIssues === 0) {
        highlights.push('No critical issues found');
    }
    // Overall score highlights
    const overallScore = Math.round(dimensionalScores.reduce((sum, d) => sum + d.weightedScore, 0));
    if (overallScore >= 85) {
        highlights.push(`High overall quality score (${overallScore}%)`);
    }
    return highlights;
}
/**
 * Identify improvement areas
 */
function identifyImprovementAreas(dimensionalScores, evidence) {
    const areas = [];
    // Poor-performing dimensions
    const poorDimensions = dimensionalScores.filter(d => d.score < 70);
    for (const dimension of poorDimensions) {
        areas.push(`${dimension.name} needs significant improvement (${dimension.score}%)`);
    }
    // Dimensions with many issues
    const problematicDimensions = dimensionalScores.filter(d => d.issues.length > 3);
    for (const dimension of problematicDimensions) {
        areas.push(`${dimension.name} has multiple issues (${dimension.issues.length} found)`);
    }
    // Evidence-based areas
    const majorIssues = evidence.filter(e => e.severity === 'Major').length;
    if (majorIssues > 5) {
        areas.push(`High number of major issues (${majorIssues}) needs attention`);
    }
    return areas;
}
// ============================================================================
// Decision Documentation
// ============================================================================
/**
 * Create evidence-based decision documentation
 */
async function createDecisionDocumentation(dimensionalScores, overallVerdict, evidence, inputs) {
    const timestamp = new Date().toISOString();
    const iteration = inputs.iteration || 1;
    const evidenceCount = evidence.length;
    // Evidence breakdown
    const evidenceBreakdown = {
        critical: evidence.filter(e => e.severity === 'Critical').length,
        major: evidence.filter(e => e.severity === 'Major').length,
        minor: evidence.filter(e => e.severity === 'Minor').length,
        total: evidence.length
    };
    // Decision rationale
    const rationale = generateDecisionRationale(overallVerdict, dimensionalScores, evidenceBreakdown);
    // Supporting evidence
    const supportingEvidence = generateSupportingEvidence(evidence, dimensionalScores);
    // Risk assessment
    const riskAssessment = generateRiskAssessment(overallVerdict, evidence, dimensionalScores);
    // Quality progression (if available)
    const qualityProgression = generateQualityProgression(inputs.previousResults, overallVerdict.overallScore);
    return {
        timestamp,
        iteration,
        evidenceCount,
        evidenceBreakdown,
        rationale,
        supportingEvidence,
        riskAssessment,
        qualityProgression
    };
}
/**
 * Generate decision rationale
 */
function generateDecisionRationale(verdict, dimensionalScores, evidenceBreakdown) {
    let rationale = `Decision: ${verdict.decision.toUpperCase()} based on overall quality score of ${verdict.overallScore}%. `;
    rationale += `Analysis of ${evidenceBreakdown.total} evidence items revealed `;
    rationale += `${evidenceBreakdown.critical} critical, ${evidenceBreakdown.major} major, and ${evidenceBreakdown.minor} minor issues. `;
    if (verdict.decision === 'ship') {
        rationale += 'Quality standards are met with no critical blockers. ';
    }
    else if (verdict.decision === 'revise') {
        rationale += 'Quality improvements needed before shipping. ';
    }
    else {
        rationale += 'Significant quality issues prevent shipping. ';
    }
    const worstDimension = dimensionalScores.reduce((worst, current) => current.score < worst.score ? current : worst);
    rationale += `Primary concern: ${worstDimension.name} (${worstDimension.score}%).`;
    return rationale;
}
/**
 * Generate supporting evidence
 */
function generateSupportingEvidence(evidence, dimensionalScores) {
    const supporting = [];
    // Critical evidence
    const criticalEvidence = evidence.filter(e => e.severity === 'Critical');
    if (criticalEvidence.length > 0) {
        supporting.push(`Critical issues: ${criticalEvidence.map(e => e.description).join('; ')}`);
    }
    // Dimensional performance
    const excellentDimensions = dimensionalScores.filter(d => d.score >= 90);
    if (excellentDimensions.length > 0) {
        supporting.push(`Strong performance: ${excellentDimensions.map(d => `${d.name} (${d.score}%)`).join(', ')}`);
    }
    const poorDimensions = dimensionalScores.filter(d => d.score < 60);
    if (poorDimensions.length > 0) {
        supporting.push(`Weak performance: ${poorDimensions.map(d => `${d.name} (${d.score}%)`).join(', ')}`);
    }
    return supporting;
}
/**
 * Generate risk assessment
 */
function generateRiskAssessment(verdict, evidence, dimensionalScores) {
    let riskLevel;
    const riskFactors = [];
    const mitigationStrategies = [];
    const criticalIssues = evidence.filter(e => e.severity === 'Critical').length;
    const majorIssues = evidence.filter(e => e.severity === 'Major').length;
    const securityIssues = evidence.filter(e => e.type === 'security_vulnerability').length;
    // Determine risk level
    if (criticalIssues > 0 || securityIssues > 0) {
        riskLevel = 'Critical';
        riskFactors.push('Critical security or functionality issues present');
    }
    else if (majorIssues > 5 || verdict.overallScore < 60) {
        riskLevel = 'High';
        riskFactors.push('Multiple major issues or low quality score');
    }
    else if (majorIssues > 2 || verdict.overallScore < 80) {
        riskLevel = 'Medium';
        riskFactors.push('Some major issues or moderate quality concerns');
    }
    else {
        riskLevel = 'Low';
    }
    // Add specific risk factors
    if (securityIssues > 0) {
        riskFactors.push(`${securityIssues} security vulnerabilities`);
        mitigationStrategies.push('Immediate security review and fixes required');
    }
    const testingScore = dimensionalScores.find(d => d.name === 'Tests')?.score || 0;
    if (testingScore < 70) {
        riskFactors.push('Insufficient test coverage');
        mitigationStrategies.push('Increase test coverage before deployment');
    }
    const performanceScore = dimensionalScores.find(d => d.name === 'Performance')?.score || 0;
    if (performanceScore < 60) {
        riskFactors.push('Performance concerns');
        mitigationStrategies.push('Performance testing and optimization needed');
    }
    // General mitigation strategies
    if (verdict.decision !== 'ship') {
        mitigationStrategies.push('Address all critical and major issues');
        mitigationStrategies.push('Re-audit after improvements');
    }
    return {
        riskLevel,
        riskFactors,
        mitigationStrategies
    };
}
/**
 * Generate quality progression tracking
 */
function generateQualityProgression(previousResults, currentScore) {
    if (!previousResults || previousResults.length === 0) {
        return undefined;
    }
    // Get the most recent previous score
    const previousScore = previousResults[previousResults.length - 1]?.overallScore || 0;
    const improvement = currentScore - previousScore;
    let trend;
    if (improvement > 5)
        trend = 'improving';
    else if (improvement < -5)
        trend = 'declining';
    else
        trend = 'stable';
    return {
        previousScore,
        currentScore,
        improvement,
        trend
    };
}
// ============================================================================
// Evidence Collection
// ============================================================================
/**
 * Add final evidence summary
 */
async function addFinalEvidenceSummary(outputs, evidence) {
    const verdict = outputs.overallVerdict;
    // Add verdict evidence
    evidence.push({
        type: verdict.decision === 'ship' ? 'documentation_gap' : 'missing_requirement',
        severity: verdict.decision === 'reject' ? 'Critical' : verdict.decision === 'revise' ? 'Major' : 'Minor',
        location: 'Final verdict',
        description: `Audit verdict: ${verdict.decision.toUpperCase()} (Score: ${verdict.overallScore}%)`,
        proof: `Decision based on ${evidence.length} evidence items and dimensional analysis`,
        suggestedFix: verdict.nextActions[0] || 'Follow recommended next actions'
    });
    // Add summary of dimensional performance
    const poorDimensions = outputs.dimensionalScores.filter(d => d.score < 70);
    if (poorDimensions.length > 0) {
        evidence.push({
            type: 'missing_requirement',
            severity: 'Major',
            location: 'Quality dimensions',
            description: `${poorDimensions.length} quality dimensions below acceptable threshold`,
            proof: `Poor dimensions: ${poorDimensions.map(d => `${d.name} (${d.score}%)`).join(', ')}`,
            suggestedFix: 'Improve performance in identified quality dimensions'
        });
    }
}
/**
 * Default VERDICT step inputs
 */
export const DEFAULT_VERDICT_INPUTS = {
    workspacePath: process.cwd(),
    iteration: 1,
    qualityThresholds: {
        shipThreshold: 85,
        reviseThreshold: 60,
        maxCriticalIssues: 0,
        maxMajorIssues: 3
    }
};
//# sourceMappingURL=verdict-step.js.map