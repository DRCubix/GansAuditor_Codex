/**
 * TRACE Step Implementation
 * 
 * This module implements the TRACE step of the audit workflow, which handles:
 * - Traceability matrix generation
 * - AC to implementation mapping
 * - Unmet AC identification and reporting
 * - Missing implementation detection
 * 
 * Requirements: 2.7
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { 
  EvidenceItem,
  AcceptanceCriterion
} from '../workflow-types.js';

// ============================================================================
// TRACE Step Implementation
// ============================================================================

/**
 * Execute the TRACE step of the audit workflow
 */
export async function executeTraceStep(
  inputs: TraceStepInputs,
  outputs: Record<string, any>,
  evidence: EvidenceItem[]
): Promise<void> {
  try {
    // Generate traceability matrix
    const traceabilityMatrix = await generateTraceabilityMatrix(inputs);
    
    // Map ACs to implementation files
    const acImplementationMapping = await mapACsToImplementation(inputs);
    
    // Identify unmet ACs
    const unmetACs = await identifyUnmetACs(inputs, traceabilityMatrix);
    
    // Detect missing implementations
    const missingImplementations = await detectMissingImplementations(inputs, traceabilityMatrix);
    
    // Generate coverage report
    const coverageReport = await generateCoverageReport(inputs, traceabilityMatrix);

    // Set outputs
    const traceOutputs: TraceStepOutputs = {
      traceabilityMatrix,
      acImplementationMapping,
      unmetACs,
      missingImplementations,
      coverageReport
    };

    Object.assign(outputs, traceOutputs);

    // Add evidence based on traceability analysis results
    await addTraceabilityEvidence(traceOutputs, evidence);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    evidence.push({
      type: "missing_requirement",
      severity: "Critical",
      location: "TRACE step",
      description: `Failed to perform traceability analysis: ${errorMessage}`,
      proof: errorMessage,
      suggestedFix: "Ensure acceptance criteria and implementation files are accessible"
    });
    throw error;
  }
}

/**
 * Input parameters for TRACE step
 */
export interface TraceStepInputs {
  /** Workspace root path */
  workspacePath: string;
  /** Acceptance criteria from INIT step */
  acceptanceCriteria?: AcceptanceCriterion[];
  /** Touched files from INIT step */
  touchedFiles?: string[];
  /** Test results from TESTS step */
  testResults?: any[];
  /** Path to spec documents */
  specPath?: string;
  /** Additional implementation files to analyze */
  implementationFiles?: string[];
}

/**
 * Output from TRACE step
 */
export interface TraceStepOutputs {
  /** Traceability matrix mapping ACs to implementations and tests */
  traceabilityMatrix: TraceabilityMatrix;
  /** AC to implementation file mapping */
  acImplementationMapping: ACImplementationMapping;
  /** List of unmet acceptance criteria */
  unmetACs: string[];
  /** Missing implementation details */
  missingImplementations: MissingImplementation[];
  /** Coverage report summary */
  coverageReport: CoverageReport;
}

/**
 * Traceability matrix structure
 */
export interface TraceabilityMatrix {
  [acId: string]: {
    /** AC description */
    description: string;
    /** Implementation files that address this AC */
    implementationFiles: string[];
    /** Test files that verify this AC */
    testFiles: string[];
    /** Whether this AC is fully covered */
    covered: boolean;
    /** Coverage percentage (0-100) */
    coveragePercentage: number;
    /** Evidence of implementation */
    evidence: string[];
    /** Related code snippets */
    codeReferences: CodeReference[];
  };
}

/**
 * AC to implementation mapping
 */
export interface ACImplementationMapping {
  [acId: string]: {
    /** Primary implementation files */
    primaryFiles: string[];
    /** Supporting implementation files */
    supportingFiles: string[];
    /** Test files */
    testFiles: string[];
    /** Implementation status */
    status: 'complete' | 'partial' | 'missing';
    /** Implementation confidence (0-100) */
    confidence: number;
  };
}

/**
 * Missing implementation details
 */
export interface MissingImplementation {
  /** AC ID */
  acId: string;
  /** AC description */
  description: string;
  /** What is missing */
  missingAspects: string[];
  /** Suggested implementation approach */
  suggestedApproach: string;
  /** Priority level */
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

/**
 * Coverage report summary
 */
export interface CoverageReport {
  /** Total number of ACs */
  totalACs: number;
  /** Number of implemented ACs */
  implementedACs: number;
  /** Number of tested ACs */
  testedACs: number;
  /** Number of fully covered ACs */
  fullyCoveredACs: number;
  /** Overall coverage percentage */
  coveragePercentage: number;
  /** Implementation coverage percentage */
  implementationCoverage: number;
  /** Test coverage percentage */
  testCoverage: number;
  /** Coverage gaps summary */
  gapsSummary: string[];
}

/**
 * Code reference for traceability
 */
export interface CodeReference {
  /** File path */
  file: string;
  /** Line number */
  line: number;
  /** Code snippet */
  snippet: string;
  /** Reference type */
  type: 'implementation' | 'test' | 'comment' | 'documentation';
}

// ============================================================================
// Traceability Matrix Generation
// ============================================================================

/**
 * Generate traceability matrix mapping ACs to implementations and tests
 */
async function generateTraceabilityMatrix(inputs: TraceStepInputs): Promise<TraceabilityMatrix> {
  const matrix: TraceabilityMatrix = {};
  
  try {
    const acceptanceCriteria = inputs.acceptanceCriteria || [];
    
    for (const ac of acceptanceCriteria) {
      // Find implementation files for this AC
      const implementationFiles = await findImplementationFiles(ac, inputs);
      
      // Find test files for this AC
      const testFiles = await findTestFiles(ac, inputs);
      
      // Find code references
      const codeReferences = await findCodeReferences(ac, inputs);
      
      // Calculate coverage
      const coveragePercentage = calculateACCoverage(implementationFiles, testFiles, codeReferences);
      const covered = coveragePercentage >= 80; // 80% threshold for "covered"
      
      // Collect evidence
      const evidence = await collectACEvidence(ac, implementationFiles, testFiles, inputs);
      
      matrix[ac.id] = {
        description: ac.description,
        implementationFiles,
        testFiles,
        covered,
        coveragePercentage,
        evidence,
        codeReferences
      };
    }
    
  } catch (error) {
    // Matrix generation failed
  }
  
  return matrix;
}

/**
 * Find implementation files that address a specific AC
 */
async function findImplementationFiles(ac: AcceptanceCriterion, inputs: TraceStepInputs): Promise<string[]> {
  const implementationFiles: string[] = [];
  
  try {
    // Extract keywords from AC description
    const keywords = extractKeywords(ac.description);
    
    // Search in touched files first
    if (inputs.touchedFiles) {
      for (const file of inputs.touchedFiles) {
        if (isImplementationFile(file)) {
          const relevance = await calculateFileRelevance(file, keywords, inputs.workspacePath);
          if (relevance > 0.3) { // 30% relevance threshold
            implementationFiles.push(file);
          }
        }
      }
    }
    
    // Search in additional implementation files
    if (inputs.implementationFiles) {
      for (const file of inputs.implementationFiles) {
        const relevance = await calculateFileRelevance(file, keywords, inputs.workspacePath);
        if (relevance > 0.3) {
          implementationFiles.push(file);
        }
      }
    }
    
    // If no files found, search more broadly
    if (implementationFiles.length === 0) {
      const broadSearchFiles = await searchImplementationFiles(keywords, inputs.workspacePath);
      implementationFiles.push(...broadSearchFiles);
    }
    
  } catch (error) {
    // Implementation file search failed
  }
  
  return [...new Set(implementationFiles)]; // Remove duplicates
}

/**
 * Find test files that verify a specific AC
 */
async function findTestFiles(ac: AcceptanceCriterion, inputs: TraceStepInputs): Promise<string[]> {
  const testFiles: string[] = [];
  
  try {
    // Extract keywords from AC description
    const keywords = extractKeywords(ac.description);
    
    // Search in test results
    if (inputs.testResults) {
      for (const testResult of inputs.testResults) {
        if (testResult.file && isTestFile(testResult.file)) {
          const relevance = await calculateFileRelevance(testResult.file, keywords, inputs.workspacePath);
          if (relevance > 0.2) { // 20% relevance threshold for tests
            testFiles.push(testResult.file);
          }
        }
      }
    }
    
    // Search for test files related to implementation files
    if (inputs.touchedFiles) {
      for (const file of inputs.touchedFiles) {
        if (isTestFile(file)) {
          const relevance = await calculateFileRelevance(file, keywords, inputs.workspacePath);
          if (relevance > 0.2) {
            testFiles.push(file);
          }
        }
      }
    }
    
  } catch (error) {
    // Test file search failed
  }
  
  return [...new Set(testFiles)]; // Remove duplicates
}

/**
 * Find code references for a specific AC
 */
async function findCodeReferences(ac: AcceptanceCriterion, inputs: TraceStepInputs): Promise<CodeReference[]> {
  const references: CodeReference[] = [];
  
  try {
    const keywords = extractKeywords(ac.description);
    const filesToSearch = [...(inputs.touchedFiles || []), ...(inputs.implementationFiles || [])];
    
    for (const file of filesToSearch) {
      const fileReferences = await searchCodeReferences(file, keywords, inputs.workspacePath);
      references.push(...fileReferences);
    }
    
  } catch (error) {
    // Code reference search failed
  }
  
  return references;
}

/**
 * Extract keywords from AC description
 */
function extractKeywords(description: string): string[] {
  // Remove common words and extract meaningful keywords
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'when', 'then', 'shall', 'should', 'must', 'will', 'can', 'may'];
  
  const words = description
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word));
  
  // Return unique keywords
  return [...new Set(words)];
}

/**
 * Calculate file relevance to keywords
 */
async function calculateFileRelevance(file: string, keywords: string[], workspacePath: string): Promise<number> {
  try {
    const filePath = join(workspacePath, file);
    const content = await readFile(filePath, 'utf-8');
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    let totalKeywords = keywords.length;
    
    for (const keyword of keywords) {
      if (contentLower.includes(keyword)) {
        matches++;
      }
    }
    
    return totalKeywords > 0 ? matches / totalKeywords : 0;
    
  } catch (error) {
    return 0;
  }
}

/**
 * Search for implementation files broadly
 */
async function searchImplementationFiles(keywords: string[], workspacePath: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    // This would typically use a more sophisticated search
    // For now, return empty array as fallback
  } catch (error) {
    // Search failed
  }
  
  return files;
}

/**
 * Search for code references in a file
 */
async function searchCodeReferences(file: string, keywords: string[], workspacePath: string): Promise<CodeReference[]> {
  const references: CodeReference[] = [];
  
  try {
    const filePath = join(workspacePath, file);
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      
      for (const keyword of keywords) {
        if (lineLower.includes(keyword)) {
          references.push({
            file,
            line: i + 1,
            snippet: line.trim(),
            type: determineReferenceType(line, file)
          });
          break; // Only one reference per line
        }
      }
    }
    
  } catch (error) {
    // File search failed
  }
  
  return references;
}

/**
 * Determine the type of code reference
 */
function determineReferenceType(line: string, file: string): 'implementation' | 'test' | 'comment' | 'documentation' {
  if (isTestFile(file)) {
    return 'test';
  }
  
  if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
    return 'comment';
  }
  
  if (file.endsWith('.md') || file.endsWith('.txt')) {
    return 'documentation';
  }
  
  return 'implementation';
}

/**
 * Calculate AC coverage percentage
 */
function calculateACCoverage(implementationFiles: string[], testFiles: string[], codeReferences: CodeReference[]): number {
  let score = 0;
  
  // Implementation files contribute 60%
  if (implementationFiles.length > 0) {
    score += 60;
  }
  
  // Test files contribute 30%
  if (testFiles.length > 0) {
    score += 30;
  }
  
  // Code references contribute 10%
  if (codeReferences.length > 0) {
    score += 10;
  }
  
  return Math.min(score, 100);
}

/**
 * Collect evidence for AC implementation
 */
async function collectACEvidence(
  ac: AcceptanceCriterion, 
  implementationFiles: string[], 
  testFiles: string[], 
  inputs: TraceStepInputs
): Promise<string[]> {
  const evidence: string[] = [];
  
  if (implementationFiles.length > 0) {
    evidence.push(`Implementation found in ${implementationFiles.length} file(s): ${implementationFiles.join(', ')}`);
  }
  
  if (testFiles.length > 0) {
    evidence.push(`Tests found in ${testFiles.length} file(s): ${testFiles.join(', ')}`);
  }
  
  if (implementationFiles.length === 0 && testFiles.length === 0) {
    evidence.push('No implementation or tests found for this acceptance criterion');
  }
  
  return evidence;
}

// ============================================================================
// AC Implementation Mapping
// ============================================================================

/**
 * Map ACs to implementation files with detailed analysis
 */
async function mapACsToImplementation(inputs: TraceStepInputs): Promise<ACImplementationMapping> {
  const mapping: ACImplementationMapping = {};
  
  try {
    const acceptanceCriteria = inputs.acceptanceCriteria || [];
    
    for (const ac of acceptanceCriteria) {
      const implementationFiles = await findImplementationFiles(ac, inputs);
      const testFiles = await findTestFiles(ac, inputs);
      
      // Categorize implementation files
      const primaryFiles = implementationFiles.slice(0, 2); // Top 2 most relevant
      const supportingFiles = implementationFiles.slice(2);
      
      // Determine implementation status
      let status: 'complete' | 'partial' | 'missing';
      let confidence: number;
      
      if (implementationFiles.length === 0) {
        status = 'missing';
        confidence = 0;
      } else if (implementationFiles.length >= 1 && testFiles.length >= 1) {
        status = 'complete';
        confidence = 90;
      } else if (implementationFiles.length >= 1) {
        status = 'partial';
        confidence = 60;
      } else {
        status = 'missing';
        confidence = 20;
      }
      
      mapping[ac.id] = {
        primaryFiles,
        supportingFiles,
        testFiles,
        status,
        confidence
      };
    }
    
  } catch (error) {
    // Mapping failed
  }
  
  return mapping;
}

// ============================================================================
// Unmet AC Identification
// ============================================================================

/**
 * Identify unmet acceptance criteria
 */
async function identifyUnmetACs(inputs: TraceStepInputs, matrix: TraceabilityMatrix): Promise<string[]> {
  const unmetACs: string[] = [];
  
  try {
    for (const [acId, traceInfo] of Object.entries(matrix)) {
      if (!traceInfo.covered || traceInfo.coveragePercentage < 50) {
        unmetACs.push(acId);
      }
    }
    
  } catch (error) {
    // Unmet AC identification failed
  }
  
  return unmetACs;
}

// ============================================================================
// Missing Implementation Detection
// ============================================================================

/**
 * Detect missing implementations
 */
async function detectMissingImplementations(inputs: TraceStepInputs, matrix: TraceabilityMatrix): Promise<MissingImplementation[]> {
  const missingImplementations: MissingImplementation[] = [];
  
  try {
    for (const [acId, traceInfo] of Object.entries(matrix)) {
      if (!traceInfo.covered) {
        const missingAspects: string[] = [];
        let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
        
        if (traceInfo.implementationFiles.length === 0) {
          missingAspects.push('Implementation code');
          priority = 'Critical';
        }
        
        if (traceInfo.testFiles.length === 0) {
          missingAspects.push('Test coverage');
          if (priority !== 'Critical') priority = 'High';
        }
        
        if (traceInfo.codeReferences.length === 0) {
          missingAspects.push('Code documentation/comments');
          if (priority === 'Medium') priority = 'Low';
        }
        
        const suggestedApproach = generateImplementationSuggestion(traceInfo.description, missingAspects);
        
        missingImplementations.push({
          acId,
          description: traceInfo.description,
          missingAspects,
          suggestedApproach,
          priority
        });
      }
    }
    
  } catch (error) {
    // Missing implementation detection failed
  }
  
  return missingImplementations;
}

/**
 * Generate implementation suggestion
 */
function generateImplementationSuggestion(description: string, missingAspects: string[]): string {
  let suggestion = '';
  
  if (missingAspects.includes('Implementation code')) {
    suggestion += 'Implement the required functionality based on the acceptance criteria. ';
  }
  
  if (missingAspects.includes('Test coverage')) {
    suggestion += 'Add unit and integration tests to verify the implementation. ';
  }
  
  if (missingAspects.includes('Code documentation/comments')) {
    suggestion += 'Add code comments and documentation to explain the implementation. ';
  }
  
  // Add specific suggestions based on AC content
  if (description.toLowerCase().includes('error')) {
    suggestion += 'Ensure proper error handling and validation. ';
  }
  
  if (description.toLowerCase().includes('user')) {
    suggestion += 'Consider user experience and interface design. ';
  }
  
  if (description.toLowerCase().includes('performance')) {
    suggestion += 'Optimize for performance and scalability. ';
  }
  
  return suggestion.trim();
}

// ============================================================================
// Coverage Report Generation
// ============================================================================

/**
 * Generate coverage report summary
 */
async function generateCoverageReport(inputs: TraceStepInputs, matrix: TraceabilityMatrix): Promise<CoverageReport> {
  try {
    const totalACs = Object.keys(matrix).length;
    let implementedACs = 0;
    let testedACs = 0;
    let fullyCoveredACs = 0;
    
    for (const traceInfo of Object.values(matrix)) {
      if (traceInfo.implementationFiles.length > 0) {
        implementedACs++;
      }
      
      if (traceInfo.testFiles.length > 0) {
        testedACs++;
      }
      
      if (traceInfo.covered) {
        fullyCoveredACs++;
      }
    }
    
    const coveragePercentage = totalACs > 0 ? Math.round((fullyCoveredACs / totalACs) * 100) : 0;
    const implementationCoverage = totalACs > 0 ? Math.round((implementedACs / totalACs) * 100) : 0;
    const testCoverage = totalACs > 0 ? Math.round((testedACs / totalACs) * 100) : 0;
    
    // Generate gaps summary
    const gapsSummary: string[] = [];
    
    if (implementationCoverage < 100) {
      gapsSummary.push(`${totalACs - implementedACs} ACs lack implementation`);
    }
    
    if (testCoverage < 100) {
      gapsSummary.push(`${totalACs - testedACs} ACs lack test coverage`);
    }
    
    if (coveragePercentage < 80) {
      gapsSummary.push('Overall coverage below 80% threshold');
    }
    
    return {
      totalACs,
      implementedACs,
      testedACs,
      fullyCoveredACs,
      coveragePercentage,
      implementationCoverage,
      testCoverage,
      gapsSummary
    };
    
  } catch (error) {
    // Return default report if generation fails
    return {
      totalACs: 0,
      implementedACs: 0,
      testedACs: 0,
      fullyCoveredACs: 0,
      coveragePercentage: 0,
      implementationCoverage: 0,
      testCoverage: 0,
      gapsSummary: ['Coverage report generation failed']
    };
  }
}

// ============================================================================
// Evidence Collection
// ============================================================================

/**
 * Add evidence based on traceability analysis results
 */
async function addTraceabilityEvidence(
  outputs: TraceStepOutputs,
  evidence: EvidenceItem[]
): Promise<void> {
  
  // Add evidence for unmet ACs
  if (outputs.unmetACs.length > 0) {
    evidence.push({
      type: "missing_requirement",
      severity: "Critical",
      location: "Requirements traceability",
      description: `${outputs.unmetACs.length} acceptance criteria are not met`,
      proof: `Unmet ACs: ${outputs.unmetACs.join(', ')}`,
      suggestedFix: "Implement missing acceptance criteria"
    });
  }
  
  // Add evidence for missing implementations
  const criticalMissing = outputs.missingImplementations.filter(m => m.priority === 'Critical');
  if (criticalMissing.length > 0) {
    evidence.push({
      type: "missing_requirement",
      severity: "Critical",
      location: "Implementation coverage",
      description: `${criticalMissing.length} critical implementations are missing`,
      proof: `Critical missing: ${criticalMissing.map(m => m.acId).join(', ')}`,
      suggestedFix: "Implement critical missing functionality immediately"
    });
  }
  
  const highMissing = outputs.missingImplementations.filter(m => m.priority === 'High');
  if (highMissing.length > 0) {
    evidence.push({
      type: "missing_requirement",
      severity: "Major",
      location: "Implementation coverage",
      description: `${highMissing.length} high-priority implementations are missing`,
      proof: `High priority missing: ${highMissing.map(m => m.acId).join(', ')}`,
      suggestedFix: "Implement high-priority missing functionality"
    });
  }
  
  // Add evidence for low coverage
  if (outputs.coverageReport.coveragePercentage < 80) {
    evidence.push({
      type: "missing_requirement",
      severity: outputs.coverageReport.coveragePercentage < 50 ? "Critical" : "Major",
      location: "Requirements coverage",
      description: `Requirements coverage is ${outputs.coverageReport.coveragePercentage}%, below 80% threshold`,
      proof: `Coverage gaps: ${outputs.coverageReport.gapsSummary.join(', ')}`,
      suggestedFix: "Improve requirements coverage by implementing missing ACs and adding tests"
    });
  }
  
  // Add evidence for implementation gaps
  if (outputs.coverageReport.implementationCoverage < 90) {
    evidence.push({
      type: "missing_requirement",
      severity: "Major",
      location: "Implementation coverage",
      description: `Only ${outputs.coverageReport.implementationCoverage}% of ACs have implementation`,
      proof: `${outputs.coverageReport.totalACs - outputs.coverageReport.implementedACs} ACs lack implementation`,
      suggestedFix: "Complete implementation for all acceptance criteria"
    });
  }
  
  // Add evidence for test coverage gaps
  if (outputs.coverageReport.testCoverage < 80) {
    evidence.push({
      type: "test_failure",
      severity: "Major",
      location: "Test coverage",
      description: `Only ${outputs.coverageReport.testCoverage}% of ACs have test coverage`,
      proof: `${outputs.coverageReport.totalACs - outputs.coverageReport.testedACs} ACs lack tests`,
      suggestedFix: "Add tests to verify all acceptance criteria"
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if file is an implementation file
 */
function isImplementationFile(filename: string): boolean {
  return (filename.endsWith('.ts') || filename.endsWith('.js') || filename.endsWith('.tsx') || filename.endsWith('.jsx')) &&
         !isTestFile(filename);
}

/**
 * Check if file is a test file
 */
function isTestFile(filename: string): boolean {
  return filename.includes('test') || filename.includes('spec') || filename.includes('__tests__');
}

/**
 * Default TRACE step inputs
 */
export const DEFAULT_TRACE_INPUTS: Partial<TraceStepInputs> = {
  workspacePath: process.cwd(),
  specPath: '.kiro/specs'
};