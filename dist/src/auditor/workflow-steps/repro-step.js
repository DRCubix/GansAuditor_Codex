/**
 * REPRO Step Implementation
 *
 * This module implements the REPRO step of the audit workflow, which handles:
 * - Reproduction step generation logic
 * - Current behavior verification
 * - Expected vs actual behavior documentation
 * - Minimal command sequence generation
 *
 * Requirements: 2.2
 */
import { readFile } from 'fs/promises';
import { join } from 'path';
// ============================================================================
// REPRO Step Implementation
// ============================================================================
/**
 * Execute the REPRO step of the audit workflow
 */
export async function executeReproStep(inputs, outputs, evidence) {
    try {
        // Generate reproduction steps
        const reproductionSteps = await generateReproductionSteps(inputs);
        // Verify current behavior
        const currentBehavior = await verifyCurrentBehavior(inputs);
        // Document expected behavior
        const expectedBehavior = await documentExpectedBehavior(inputs);
        // Create minimal command sequence
        const minimalCommands = await createMinimalCommands(inputs);
        // Generate verification commands
        const verificationCommands = await generateVerificationCommands(inputs);
        // Set outputs
        const reproOutputs = {
            reproductionSteps,
            currentBehavior,
            expectedBehavior,
            minimalCommands,
            verificationCommands
        };
        Object.assign(outputs, reproOutputs);
        // Validate reproduction quality
        await validateReproductionQuality(reproOutputs, evidence);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        evidence.push({
            type: "missing_requirement",
            severity: "Major",
            location: "REPRO step",
            description: `Failed to establish deterministic reproduction: ${errorMessage}`,
            proof: errorMessage,
            suggestedFix: "Ensure the feature/bugfix has clear reproduction steps and expected behavior"
        });
        throw error;
    }
}
// ============================================================================
// Reproduction Step Generation
// ============================================================================
/**
 * Generate reproduction steps based on task goals and changes
 */
async function generateReproductionSteps(inputs) {
    const steps = [];
    try {
        // Add basic setup steps
        steps.push("Navigate to project root directory");
        // Check if dependencies need to be installed
        const packageJsonPath = join(inputs.workspacePath, 'package.json');
        try {
            await readFile(packageJsonPath, 'utf-8');
            steps.push("Install dependencies: npm install");
        }
        catch (error) {
            // No package.json found
        }
        // Add build step if build command exists
        if (inputs.buildCommand) {
            steps.push(`Build the project: ${inputs.buildCommand}`);
        }
        else {
            // Check for common build scripts
            const buildStep = await detectBuildStep(inputs.workspacePath);
            if (buildStep) {
                steps.push(buildStep);
            }
        }
        // Add steps based on touched files
        if (inputs.touchedFiles && inputs.touchedFiles.length > 0) {
            const testFiles = inputs.touchedFiles.filter(f => f.includes('test') || f.includes('spec'));
            const sourceFiles = inputs.touchedFiles.filter(f => !f.includes('test') && !f.includes('spec'));
            if (sourceFiles.length > 0) {
                steps.push(`Examine modified source files: ${sourceFiles.slice(0, 3).join(', ')}`);
            }
            if (testFiles.length > 0) {
                steps.push(`Run related tests: ${testFiles.slice(0, 3).join(', ')}`);
            }
        }
        // Add test execution step
        if (inputs.testCommand) {
            steps.push(`Run tests: ${inputs.testCommand}`);
        }
        else {
            const testStep = await detectTestStep(inputs.workspacePath);
            if (testStep) {
                steps.push(testStep);
            }
        }
        // Add steps based on task goals
        if (inputs.taskGoals) {
            for (const goal of inputs.taskGoals) {
                if (goal.toLowerCase().includes('api')) {
                    steps.push("Test API endpoints using curl or similar tool");
                }
                if (goal.toLowerCase().includes('ui') || goal.toLowerCase().includes('interface')) {
                    steps.push("Open application in browser and test user interface");
                }
                if (goal.toLowerCase().includes('performance')) {
                    steps.push("Run performance benchmarks or profiling");
                }
            }
        }
        // Add verification step
        steps.push("Verify expected behavior matches actual behavior");
    }
    catch (error) {
        // Fallback to basic steps
        steps.push("Navigate to project root directory");
        steps.push("Install dependencies if needed");
        steps.push("Run tests to verify current behavior");
        steps.push("Compare with expected behavior");
    }
    return steps;
}
/**
 * Detect build step from package.json or common patterns
 */
async function detectBuildStep(workspacePath) {
    try {
        const packageJsonPath = join(workspacePath, 'package.json');
        const packageContent = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        if (packageJson.scripts) {
            if (packageJson.scripts.build) {
                return "Build the project: npm run build";
            }
            if (packageJson.scripts.compile) {
                return "Compile the project: npm run compile";
            }
            if (packageJson.scripts.tsc) {
                return "Compile TypeScript: npm run tsc";
            }
        }
    }
    catch (error) {
        // Package.json not found or invalid
    }
    return null;
}
/**
 * Detect test step from package.json or common patterns
 */
async function detectTestStep(workspacePath) {
    try {
        const packageJsonPath = join(workspacePath, 'package.json');
        const packageContent = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        if (packageJson.scripts) {
            if (packageJson.scripts.test) {
                return "Run tests: npm test";
            }
            if (packageJson.scripts['test:unit']) {
                return "Run unit tests: npm run test:unit";
            }
            if (packageJson.scripts.jest) {
                return "Run Jest tests: npm run jest";
            }
            if (packageJson.scripts.vitest) {
                return "Run Vitest tests: npm run vitest";
            }
        }
    }
    catch (error) {
        // Package.json not found or invalid
    }
    return null;
}
// ============================================================================
// Current Behavior Verification
// ============================================================================
/**
 * Verify and document current behavior
 */
async function verifyCurrentBehavior(inputs) {
    let behavior = "";
    try {
        // Analyze git diff to understand what changed
        if (inputs.gitDiff) {
            behavior += "Current changes based on git diff:\n";
            behavior += analyzeGitDiffBehavior(inputs.gitDiff);
        }
        // Analyze touched files to understand functionality
        if (inputs.touchedFiles && inputs.touchedFiles.length > 0) {
            behavior += "\nAffected functionality:\n";
            behavior += analyzeTouchedFilesBehavior(inputs.touchedFiles);
        }
        // Add behavior based on task goals
        if (inputs.taskGoals) {
            behavior += "\nCurrent implementation status:\n";
            for (const goal of inputs.taskGoals) {
                behavior += `- ${goal}: Implementation in progress\n`;
            }
        }
        if (!behavior) {
            behavior = "Current behavior: Code changes are present but specific behavior needs manual verification";
        }
    }
    catch (error) {
        behavior = "Current behavior: Unable to automatically determine - manual verification required";
    }
    return behavior;
}
/**
 * Analyze git diff to understand behavior changes
 */
function analyzeGitDiffBehavior(gitDiff) {
    let analysis = "";
    // Count additions and deletions
    const additions = (gitDiff.match(/^\+(?!\+)/gm) || []).length;
    const deletions = (gitDiff.match(/^-(?!-)/gm) || []).length;
    analysis += `- ${additions} lines added, ${deletions} lines removed\n`;
    // Look for function/method changes
    const functionChanges = gitDiff.match(/^\+.*(?:function|def|class|interface|type)\s+(\w+)/gm);
    if (functionChanges && functionChanges.length > 0) {
        analysis += `- New/modified functions: ${functionChanges.length}\n`;
    }
    // Look for import/export changes
    const importChanges = gitDiff.match(/^\+.*(?:import|export|require)/gm);
    if (importChanges && importChanges.length > 0) {
        analysis += `- Import/export changes: ${importChanges.length}\n`;
    }
    // Look for test changes
    const testChanges = gitDiff.match(/^\+.*(?:test|it|describe|expect)/gm);
    if (testChanges && testChanges.length > 0) {
        analysis += `- Test changes: ${testChanges.length}\n`;
    }
    return analysis;
}
/**
 * Analyze touched files to understand behavior
 */
function analyzeTouchedFilesBehavior(touchedFiles) {
    let analysis = "";
    const sourceFiles = touchedFiles.filter(f => !f.includes('test') &&
        !f.includes('spec') &&
        (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')));
    const testFiles = touchedFiles.filter(f => f.includes('test') || f.includes('spec'));
    const configFiles = touchedFiles.filter(f => f.includes('config') || f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml'));
    if (sourceFiles.length > 0) {
        analysis += `- Source code changes in ${sourceFiles.length} files\n`;
    }
    if (testFiles.length > 0) {
        analysis += `- Test changes in ${testFiles.length} files\n`;
    }
    if (configFiles.length > 0) {
        analysis += `- Configuration changes in ${configFiles.length} files\n`;
    }
    return analysis;
}
// ============================================================================
// Expected Behavior Documentation
// ============================================================================
/**
 * Document expected behavior based on acceptance criteria and task goals
 */
async function documentExpectedBehavior(inputs) {
    let expectedBehavior = "";
    try {
        // Document behavior based on acceptance criteria
        if (inputs.acceptanceCriteria && inputs.acceptanceCriteria.length > 0) {
            expectedBehavior += "Expected behavior based on acceptance criteria:\n";
            for (const ac of inputs.acceptanceCriteria) {
                expectedBehavior += `- ${ac.description}\n`;
            }
        }
        // Document behavior based on task goals
        if (inputs.taskGoals && inputs.taskGoals.length > 0) {
            expectedBehavior += "\nExpected outcomes:\n";
            for (const goal of inputs.taskGoals) {
                expectedBehavior += `- ${goal}\n`;
            }
        }
        // Add general quality expectations
        expectedBehavior += "\nGeneral expectations:\n";
        expectedBehavior += "- All tests should pass\n";
        expectedBehavior += "- Code should compile without errors\n";
        expectedBehavior += "- Linting should pass without violations\n";
        expectedBehavior += "- No runtime errors in normal usage\n";
        if (!expectedBehavior) {
            expectedBehavior = "Expected behavior: Implementation should meet project quality standards and requirements";
        }
    }
    catch (error) {
        expectedBehavior = "Expected behavior: Implementation should be functional and meet basic quality standards";
    }
    return expectedBehavior;
}
// ============================================================================
// Minimal Command Sequence
// ============================================================================
/**
 * Create minimal command sequence for reproduction
 */
async function createMinimalCommands(inputs) {
    const commands = [];
    try {
        // Add basic commands
        commands.push("cd " + (inputs.workspacePath || "."));
        // Check for package.json and add install command
        try {
            const packageJsonPath = join(inputs.workspacePath, 'package.json');
            await readFile(packageJsonPath, 'utf-8');
            commands.push("npm install");
        }
        catch (error) {
            // No package.json
        }
        // Add build command if available
        const buildCommand = inputs.buildCommand || await detectBuildCommand(inputs.workspacePath);
        if (buildCommand) {
            commands.push(buildCommand);
        }
        // Add test command
        const testCommand = inputs.testCommand || await detectTestCommand(inputs.workspacePath);
        if (testCommand) {
            commands.push(testCommand);
        }
        else {
            commands.push("# Run relevant tests");
        }
        // Add lint command if available
        const lintCommand = await detectLintCommand(inputs.workspacePath);
        if (lintCommand) {
            commands.push(lintCommand);
        }
    }
    catch (error) {
        // Fallback commands
        commands.push("cd .");
        commands.push("npm install");
        commands.push("npm test");
    }
    return commands;
}
/**
 * Detect build command from package.json
 */
async function detectBuildCommand(workspacePath) {
    try {
        const packageJsonPath = join(workspacePath, 'package.json');
        const packageContent = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        if (packageJson.scripts?.build) {
            return "npm run build";
        }
        if (packageJson.scripts?.compile) {
            return "npm run compile";
        }
    }
    catch (error) {
        // Package.json not found
    }
    return null;
}
/**
 * Detect test command from package.json
 */
async function detectTestCommand(workspacePath) {
    try {
        const packageJsonPath = join(workspacePath, 'package.json');
        const packageContent = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        if (packageJson.scripts?.test) {
            return "npm test";
        }
        if (packageJson.scripts?.['test:unit']) {
            return "npm run test:unit";
        }
    }
    catch (error) {
        // Package.json not found
    }
    return null;
}
/**
 * Detect lint command from package.json
 */
async function detectLintCommand(workspacePath) {
    try {
        const packageJsonPath = join(workspacePath, 'package.json');
        const packageContent = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        if (packageJson.scripts?.lint) {
            return "npm run lint";
        }
        if (packageJson.scripts?.eslint) {
            return "npm run eslint";
        }
    }
    catch (error) {
        // Package.json not found
    }
    return null;
}
// ============================================================================
// Verification Commands
// ============================================================================
/**
 * Generate verification commands to validate the reproduction
 */
async function generateVerificationCommands(inputs) {
    const commands = [];
    try {
        // Add test verification
        const testCommand = inputs.testCommand || await detectTestCommand(inputs.workspacePath);
        if (testCommand) {
            commands.push(`Verify tests pass: ${testCommand}`);
        }
        // Add build verification
        const buildCommand = inputs.buildCommand || await detectBuildCommand(inputs.workspacePath);
        if (buildCommand) {
            commands.push(`Verify build succeeds: ${buildCommand}`);
        }
        // Add lint verification
        const lintCommand = await detectLintCommand(inputs.workspacePath);
        if (lintCommand) {
            commands.push(`Verify linting passes: ${lintCommand}`);
        }
        // Add type checking verification
        const typeCheckCommand = await detectTypeCheckCommand(inputs.workspacePath);
        if (typeCheckCommand) {
            commands.push(`Verify type checking: ${typeCheckCommand}`);
        }
        // Add manual verification steps
        commands.push("Manually verify expected behavior matches actual behavior");
        if (inputs.touchedFiles && inputs.touchedFiles.length > 0) {
            commands.push(`Check modified files: ${inputs.touchedFiles.slice(0, 3).join(', ')}`);
        }
    }
    catch (error) {
        // Fallback verification
        commands.push("Run tests to verify functionality");
        commands.push("Check for compilation errors");
        commands.push("Verify expected behavior");
    }
    return commands;
}
/**
 * Detect type check command from package.json
 */
async function detectTypeCheckCommand(workspacePath) {
    try {
        const packageJsonPath = join(workspacePath, 'package.json');
        const packageContent = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        if (packageJson.scripts?.['type-check']) {
            return "npm run type-check";
        }
        if (packageJson.scripts?.tsc) {
            return "npm run tsc";
        }
        if (packageJson.scripts?.typecheck) {
            return "npm run typecheck";
        }
    }
    catch (error) {
        // Package.json not found
    }
    return null;
}
// ============================================================================
// Validation and Evidence Collection
// ============================================================================
/**
 * Validate reproduction quality and add evidence for issues
 */
async function validateReproductionQuality(outputs, evidence) {
    // Check for missing reproduction steps
    if (outputs.reproductionSteps.length === 0) {
        evidence.push({
            type: "missing_requirement",
            severity: "Critical",
            location: "REPRO step",
            description: "No reproduction steps generated",
            proof: "Reproduction steps array is empty",
            suggestedFix: "Add clear steps to reproduce the feature or bug"
        });
    }
    // Check for vague reproduction steps
    const vagueSteps = outputs.reproductionSteps.filter(step => step.length < 10 ||
        step.includes("TODO") ||
        step.includes("manual verification required"));
    if (vagueSteps.length > 0) {
        evidence.push({
            type: "missing_requirement",
            severity: "Minor",
            location: "Reproduction steps",
            description: `${vagueSteps.length} reproduction steps are too vague`,
            proof: `Vague steps: ${vagueSteps.join(', ')}`,
            suggestedFix: "Make reproduction steps more specific and actionable"
        });
    }
    // Check for missing expected behavior
    if (!outputs.expectedBehavior || outputs.expectedBehavior.length < 20) {
        evidence.push({
            type: "missing_requirement",
            severity: "Major",
            location: "Expected behavior",
            description: "Expected behavior is not clearly defined",
            proof: "Expected behavior is empty or too brief",
            suggestedFix: "Define clear expected behavior based on acceptance criteria"
        });
    }
    // Check for missing minimal commands
    if (outputs.minimalCommands.length === 0) {
        evidence.push({
            type: "missing_requirement",
            severity: "Minor",
            location: "Minimal commands",
            description: "No minimal command sequence provided",
            proof: "Minimal commands array is empty",
            suggestedFix: "Provide minimal commands to reproduce the issue or test the feature"
        });
    }
}
/**
 * Default REPRO step inputs
 */
export const DEFAULT_REPRO_INPUTS = {
    workspacePath: process.cwd()
};
//# sourceMappingURL=repro-step.js.map