/**
 * INIT Step Implementation
 * 
 * This module implements the INIT step of the audit workflow, which handles:
 * - Task goal extraction from Spec documents
 * - Acceptance criteria parsing and validation
 * - Constraint identification from Steering documents
 * - Touched files/modules detection logic
 * 
 * Requirements: 2.1
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { 
  InitStepOutputs, 
  AcceptanceCriterion, 
  SessionContext, 
  EvidenceItem 
} from '../workflow-types.js';

// ============================================================================
// INIT Step Implementation
// ============================================================================

/**
 * Execute the INIT step of the audit workflow
 */
export async function executeInitStep(
  inputs: InitStepInputs,
  outputs: Record<string, any>,
  evidence: EvidenceItem[]
): Promise<void> {
  try {
    // Extract task goals from Spec documents
    const taskGoals = await extractTaskGoals(inputs.specPath, inputs.workspacePath);
    
    // Parse acceptance criteria
    const acceptanceCriteria = await parseAcceptanceCriteria(inputs.specPath, inputs.workspacePath);
    
    // Identify constraints from Steering documents
    const constraints = await identifyConstraints(inputs.steeringPath, inputs.workspacePath);
    
    // Detect touched files/modules
    const touchedFiles = await detectTouchedFiles(inputs.workspacePath, inputs.gitDiff);
    
    // Create session context
    const sessionContext: SessionContext = {
      sessionId: inputs.sessionId || generateSessionId(),
      branchId: inputs.branchId,
      previousResults: inputs.previousResults || [],
      iteration: inputs.iteration || 1
    };

    // Set outputs
    const initOutputs: InitStepOutputs = {
      taskGoals,
      acceptanceCriteria,
      constraints,
      touchedFiles,
      sessionContext
    };

    Object.assign(outputs, initOutputs);

    // Add evidence for missing or incomplete specifications
    await validateSpecificationCompleteness(taskGoals, acceptanceCriteria, constraints, evidence);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    evidence.push({
      type: "missing_requirement",
      severity: "Critical",
      location: "INIT step",
      description: `Failed to initialize audit workflow: ${errorMessage}`,
      proof: errorMessage,
      suggestedFix: "Ensure Spec and Steering documents are accessible and properly formatted"
    });
    throw error;
  }
}

/**
 * Input parameters for INIT step
 */
export interface InitStepInputs {
  /** Path to the spec directory */
  specPath?: string;
  /** Path to the steering directory */
  steeringPath?: string;
  /** Workspace root path */
  workspacePath: string;
  /** Git diff for detecting changes */
  gitDiff?: string;
  /** Session identifier */
  sessionId?: string;
  /** Branch identifier for continuity */
  branchId?: string;
  /** Previous audit results */
  previousResults?: any[];
  /** Current iteration number */
  iteration?: number;
}

// ============================================================================
// Task Goal Extraction
// ============================================================================

/**
 * Extract task goals from Spec documents
 */
async function extractTaskGoals(specPath: string = '.kiro/specs', workspacePath: string): Promise<string[]> {
  const goals: string[] = [];
  
  try {
    // Look for requirements.md in spec directories
    const specDirs = await findSpecDirectories(specPath, workspacePath);
    
    for (const specDir of specDirs) {
      const requirementsPath = join(workspacePath, specDir, 'requirements.md');
      
      try {
        const content = await readFile(requirementsPath, 'utf-8');
        const extractedGoals = parseTaskGoalsFromRequirements(content);
        goals.push(...extractedGoals);
      } catch (error) {
        // Requirements file not found or not readable - continue with other specs
        continue;
      }
    }
    
    // If no goals found, add a default goal
    if (goals.length === 0) {
      goals.push("Audit and improve code quality according to project standards");
    }
    
  } catch (error) {
    // Fallback to default goal
    goals.push("Audit and improve code quality according to project standards");
  }
  
  return goals;
}

/**
 * Find spec directories in the workspace
 */
async function findSpecDirectories(specPath: string, workspacePath: string): Promise<string[]> {
  const specDirs: string[] = [];
  
  try {
    const { readdir, stat } = await import('fs/promises');
    const fullSpecPath = join(workspacePath, specPath);
    
    const entries = await readdir(fullSpecPath);
    
    for (const entry of entries) {
      const entryPath = join(fullSpecPath, entry);
      const stats = await stat(entryPath);
      
      if (stats.isDirectory()) {
        specDirs.push(join(specPath, entry));
      }
    }
  } catch (error) {
    // Spec directory not found or not accessible
  }
  
  return specDirs;
}

/**
 * Parse task goals from requirements document content
 */
function parseTaskGoalsFromRequirements(content: string): string[] {
  const goals: string[] = [];
  
  // Look for introduction section
  const introMatch = content.match(/## Introduction\s*\n([\s\S]*?)(?=\n## |$)/i);
  if (introMatch) {
    const intro = introMatch[1].trim();
    if (intro) {
      goals.push(intro);
    }
  }
  
  // Look for user stories
  const userStoryRegex = /\*\*User Story:\*\*\s*(.+?)(?=\n|$)/gi;
  let match;
  while ((match = userStoryRegex.exec(content)) !== null) {
    goals.push(match[1].trim());
  }
  
  return goals;
}

// ============================================================================
// Acceptance Criteria Parsing
// ============================================================================

/**
 * Parse acceptance criteria from Spec documents
 */
async function parseAcceptanceCriteria(specPath: string = '.kiro/specs', workspacePath: string): Promise<AcceptanceCriterion[]> {
  const criteria: AcceptanceCriterion[] = [];
  
  try {
    const specDirs = await findSpecDirectories(specPath, workspacePath);
    
    for (const specDir of specDirs) {
      const requirementsPath = join(workspacePath, specDir, 'requirements.md');
      
      try {
        const content = await readFile(requirementsPath, 'utf-8');
        const extractedCriteria = parseAcceptanceCriteriaFromContent(content);
        criteria.push(...extractedCriteria);
      } catch (error) {
        // Requirements file not found - continue
        continue;
      }
    }
  } catch (error) {
    // Spec directory not accessible
  }
  
  return criteria;
}

/**
 * Parse acceptance criteria from requirements content
 */
function parseAcceptanceCriteriaFromContent(content: string): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];
  
  // Look for EARS format criteria (WHEN/IF...THEN...SHALL)
  const earsRegex = /^\s*\d+\.\s*((?:WHEN|IF)\s+.+?\s+THEN\s+.+?\s+SHALL\s+.+?)$/gim;
  let match;
  let criterionId = 1;
  
  while ((match = earsRegex.exec(content)) !== null) {
    const description = match[1].trim();
    
    criteria.push({
      id: `AC-${criterionId.toString().padStart(3, '0')}`,
      description,
      isMet: false, // Will be determined during audit
      relatedTests: [] // Will be populated during TRACE step
    });
    
    criterionId++;
  }
  
  // Also look for numbered acceptance criteria
  const numberedRegex = /^\s*\d+\.\s*(.+?)(?=\n\s*\d+\.|$)/gim;
  const numberedMatches = content.match(numberedRegex);
  
  if (numberedMatches && criteria.length === 0) {
    // Only use numbered criteria if no EARS format found
    numberedMatches.forEach((match, index) => {
      const description = match.replace(/^\s*\d+\.\s*/, '').trim();
      if (description && !description.startsWith('WHEN') && !description.startsWith('IF')) {
        criteria.push({
          id: `AC-${(index + 1).toString().padStart(3, '0')}`,
          description,
          isMet: false,
          relatedTests: []
        });
      }
    });
  }
  
  return criteria;
}

// ============================================================================
// Constraint Identification
// ============================================================================

/**
 * Identify constraints from Steering documents
 */
async function identifyConstraints(steeringPath: string = '.kiro/steering', workspacePath: string): Promise<string[]> {
  const constraints: string[] = [];
  
  try {
    const { readdir } = await import('fs/promises');
    const fullSteeringPath = join(workspacePath, steeringPath);
    
    const files = await readdir(fullSteeringPath);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(fullSteeringPath, file);
        
        try {
          const content = await readFile(filePath, 'utf-8');
          const extractedConstraints = parseConstraintsFromContent(content, file);
          constraints.push(...extractedConstraints);
        } catch (error) {
          // File not readable - continue
          continue;
        }
      }
    }
  } catch (error) {
    // Steering directory not found or not accessible
  }
  
  return constraints;
}

/**
 * Parse constraints from steering document content
 */
function parseConstraintsFromContent(content: string, filename: string): string[] {
  const constraints: string[] = [];
  
  // Look for constraint indicators
  const constraintPatterns = [
    /(?:MUST|SHALL|REQUIRED|MANDATORY)[\s:]+(.+?)(?=\n|$)/gi,
    /(?:MUST NOT|SHALL NOT|FORBIDDEN|PROHIBITED)[\s:]+(.+?)(?=\n|$)/gi,
    /(?:Constraint|Rule|Standard)[\s:]+(.+?)(?=\n|$)/gi
  ];
  
  for (const pattern of constraintPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const constraint = match[1].trim();
      if (constraint) {
        constraints.push(`[${filename}] ${constraint}`);
      }
    }
  }
  
  // Look for bulleted constraints
  const bulletRegex = /^[\s]*[-*+]\s*(.+?)$/gim;
  let bulletMatch;
  while ((bulletMatch = bulletRegex.exec(content)) !== null) {
    const item = bulletMatch[1].trim();
    if (item.toLowerCase().includes('must') || 
        item.toLowerCase().includes('shall') || 
        item.toLowerCase().includes('required')) {
      constraints.push(`[${filename}] ${item}`);
    }
  }
  
  return constraints;
}

// ============================================================================
// Touched Files Detection
// ============================================================================

/**
 * Detect touched files/modules from git diff or workspace analysis
 */
async function detectTouchedFiles(workspacePath: string, gitDiff?: string): Promise<string[]> {
  const touchedFiles: string[] = [];
  
  if (gitDiff) {
    // Parse git diff to find changed files
    const diffFiles = parseGitDiffFiles(gitDiff);
    touchedFiles.push(...diffFiles);
  } else {
    // Fallback: analyze recent changes or all source files
    const sourceFiles = await findSourceFiles(workspacePath);
    touchedFiles.push(...sourceFiles);
  }
  
  return touchedFiles;
}

/**
 * Parse file paths from git diff
 */
function parseGitDiffFiles(gitDiff: string): string[] {
  const files: string[] = [];
  
  // Look for diff headers
  const diffHeaderRegex = /^diff --git a\/(.+?) b\/(.+?)$/gim;
  let match;
  
  while ((match = diffHeaderRegex.exec(gitDiff)) !== null) {
    const filePath = match[2]; // Use the "b/" path (after changes)
    if (!files.includes(filePath)) {
      files.push(filePath);
    }
  }
  
  // Also look for +++ headers
  const plusHeaderRegex = /^\+\+\+ b\/(.+?)$/gim;
  while ((match = plusHeaderRegex.exec(gitDiff)) !== null) {
    const filePath = match[1];
    if (!files.includes(filePath)) {
      files.push(filePath);
    }
  }
  
  return files;
}

/**
 * Find source files in workspace (fallback when no git diff)
 */
async function findSourceFiles(workspacePath: string): Promise<string[]> {
  const sourceFiles: string[] = [];
  
  try {
    const { readdir, stat } = await import('fs/promises');
    
    async function scanDirectory(dirPath: string, relativePath: string = ''): Promise<void> {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        // Skip common non-source directories
        if (entry.startsWith('.') || 
            entry === 'node_modules' || 
            entry === 'dist' || 
            entry === 'build') {
          continue;
        }
        
        const fullPath = join(dirPath, entry);
        const relativeFilePath = relativePath ? join(relativePath, entry) : entry;
        
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          await scanDirectory(fullPath, relativeFilePath);
        } else if (stats.isFile() && isSourceFile(entry)) {
          sourceFiles.push(relativeFilePath);
        }
      }
    }
    
    await scanDirectory(workspacePath);
  } catch (error) {
    // Error scanning workspace
  }
  
  return sourceFiles;
}

/**
 * Check if file is a source file
 */
function isSourceFile(filename: string): boolean {
  const sourceExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs'];
  return sourceExtensions.some(ext => filename.endsWith(ext));
}

// ============================================================================
// Validation and Evidence Collection
// ============================================================================

/**
 * Validate specification completeness and add evidence for issues
 */
async function validateSpecificationCompleteness(
  taskGoals: string[],
  acceptanceCriteria: AcceptanceCriterion[],
  constraints: string[],
  evidence: EvidenceItem[]
): Promise<void> {
  
  // Check for missing task goals
  if (taskGoals.length === 0 || taskGoals.every(goal => goal.includes("default"))) {
    evidence.push({
      type: "missing_requirement",
      severity: "Major",
      location: "Spec documents",
      description: "No clear task goals found in specification documents",
      proof: "Task goals array is empty or contains only default values",
      suggestedFix: "Add clear task goals to requirements.md in the Introduction section"
    });
  }
  
  // Check for missing acceptance criteria
  if (acceptanceCriteria.length === 0) {
    evidence.push({
      type: "missing_requirement",
      severity: "Critical",
      location: "Spec documents",
      description: "No acceptance criteria found in specification documents",
      proof: "Acceptance criteria array is empty",
      suggestedFix: "Add EARS format acceptance criteria to requirements.md"
    });
  }
  
  // Check for vague acceptance criteria
  const vagueACs = acceptanceCriteria.filter(ac => 
    ac.description.length < 30 || 
    (!ac.description.includes('SHALL') && !ac.description.includes('THEN')) ||
    ac.description.split(' ').length < 7 ||
    // Check for vague words
    /\b(good|bad|nice|better|works|fine|ok|okay)\b/i.test(ac.description)
  );
  
  if (vagueACs.length > 0) {
    evidence.push({
      type: "missing_requirement",
      severity: "Minor",
      location: "Acceptance criteria",
      description: `${vagueACs.length} acceptance criteria are too vague or incomplete`,
      proof: `Vague ACs: ${vagueACs.map(ac => ac.id).join(', ')}`,
      suggestedFix: "Rewrite acceptance criteria using EARS format with specific, testable conditions"
    });
  }
  
  // Check for missing constraints
  if (constraints.length === 0) {
    evidence.push({
      type: "missing_requirement",
      severity: "Minor",
      location: "Steering documents",
      description: "No constraints found in steering documents",
      proof: "Constraints array is empty",
      suggestedFix: "Add project constraints and standards to .kiro/steering/ documents"
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default INIT step inputs
 */
export const DEFAULT_INIT_INPUTS: Partial<InitStepInputs> = {
  specPath: '.kiro/specs',
  steeringPath: '.kiro/steering',
  iteration: 1
};