/**
 * Project Context Awareness Module
 *
 * This module implements project pattern detection from Steering documents,
 * convention extraction from existing codebase, project-specific feedback
 * adaptation, and technology stack detection as specified in requirement 8.2.
 *
 * Features:
 * - Project pattern detection from Steering documents
 * - Convention extraction from existing codebase
 * - Project-specific feedback adaptation
 * - Technology stack detection and optimization
 */
import { logger } from '../utils/logger.js';
import { readFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync } from 'fs';
// ============================================================================
// Default Configuration
// ============================================================================
export const DEFAULT_PROJECT_ANALYSIS_CONFIG = {
    rootDirectory: '.',
    steeringDirectory: '.kiro/steering',
    includeHidden: false,
    maxFiles: 1000,
    fileExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c'],
    excludeDirectories: ['node_modules', 'dist', 'build', '.git', 'coverage'],
    confidenceThreshold: 0.7
};
// ============================================================================
// Project Context Analyzer Implementation
// ============================================================================
/**
 * Project context analyzer for detecting patterns and conventions
 */
export class ProjectContextAnalyzer {
    config;
    constructor(config) {
        this.config = { ...DEFAULT_PROJECT_ANALYSIS_CONFIG, ...config };
    }
    /**
     * Analyze project context comprehensively
     */
    async analyzeProjectContext() {
        try {
            logger.debug('Starting project context analysis', { rootDirectory: this.config.rootDirectory });
            // Use Promise.allSettled to handle individual failures gracefully
            const results = await Promise.allSettled([
                this.detectProjectType(),
                this.detectTechnologyStack(),
                this.extractProjectPatterns(),
                this.extractCodeConventions(),
                this.loadProjectConfiguration(),
                this.analyzeProjectMetadata()
            ]);
            const [projectTypeResult, techStackResult, patternsResult, conventionsResult, configurationResult, metadataResult] = results;
            const context = {
                projectType: projectTypeResult.status === 'fulfilled' ? projectTypeResult.value : 'unknown',
                techStack: techStackResult.status === 'fulfilled' ? techStackResult.value : this.getDefaultTechStack(),
                patterns: patternsResult.status === 'fulfilled' ? patternsResult.value : [],
                conventions: conventionsResult.status === 'fulfilled' ? conventionsResult.value : [],
                configuration: configurationResult.status === 'fulfilled' ? configurationResult.value : {},
                metadata: metadataResult.status === 'fulfilled' ? metadataResult.value : this.getDefaultMetadata()
            };
            logger.debug('Project context analysis completed', {
                projectType: context.projectType,
                primaryLanguage: context.techStack.primaryLanguage,
                patternCount: context.patterns.length,
                conventionCount: context.conventions.length
            });
            return context;
        }
        catch (error) {
            logger.error('Failed to analyze project context', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Detect project type based on files and configuration
     */
    async detectProjectType() {
        const indicators = await this.gatherProjectTypeIndicators();
        // CLI tool indicators (check first to prioritize over library)
        if (indicators.hasCLIStructure || indicators.hasBinScripts) {
            return 'cli-tool';
        }
        // Web application indicators
        if (indicators.hasReactComponents || indicators.hasVueComponents || indicators.hasAngularComponents) {
            return 'web-application';
        }
        // API service indicators
        if (indicators.hasExpressServer || indicators.hasFastifyServer || indicators.hasKoaServer) {
            return 'api-service';
        }
        // Mobile app indicators
        if (indicators.hasReactNative || indicators.hasFlutter || indicators.hasIonic) {
            return 'mobile-app';
        }
        // Desktop app indicators
        if (indicators.hasElectron || indicators.hasTauri) {
            return 'desktop-app';
        }
        // Microservice indicators
        if (indicators.hasDockerfile && indicators.hasAPIEndpoints) {
            return 'microservice';
        }
        // Monorepo indicators
        if (indicators.hasWorkspaces || indicators.hasLernaConfig) {
            return 'monorepo';
        }
        // Library indicators (check last as it's most generic)
        if (indicators.hasLibraryStructure || indicators.hasIndexExports) {
            return 'library';
        }
        return 'unknown';
    }
    /**
     * Gather project type indicators
     */
    async gatherProjectTypeIndicators() {
        const packageJsonPath = join(this.config.rootDirectory, 'package.json');
        let packageJson = {};
        if (existsSync(packageJsonPath)) {
            try {
                const content = await readFile(packageJsonPath, 'utf-8');
                packageJson = JSON.parse(content);
            }
            catch (error) {
                logger.warn('Failed to parse package.json', { error });
            }
        }
        return {
            // Web framework indicators
            hasReactComponents: this.hasFilePattern('**/*.{jsx,tsx}') || this.hasDependency(packageJson, 'react'),
            hasVueComponents: this.hasFilePattern('**/*.vue') || this.hasDependency(packageJson, 'vue'),
            hasAngularComponents: this.hasFilePattern('**/*.component.ts') || this.hasDependency(packageJson, '@angular/core'),
            // Server framework indicators
            hasExpressServer: this.hasDependency(packageJson, 'express'),
            hasFastifyServer: this.hasDependency(packageJson, 'fastify'),
            hasKoaServer: this.hasDependency(packageJson, 'koa'),
            // CLI indicators (check before library to prioritize CLI detection)
            hasCLIStructure: existsSync(join(this.config.rootDirectory, 'bin')),
            hasBinScripts: packageJson.bin !== undefined,
            // Library indicators
            hasLibraryStructure: existsSync(join(this.config.rootDirectory, 'lib')) || existsSync(join(this.config.rootDirectory, 'src/index.ts')),
            hasIndexExports: existsSync(join(this.config.rootDirectory, 'index.ts')) || existsSync(join(this.config.rootDirectory, 'index.js')),
            // Mobile indicators
            hasReactNative: this.hasDependency(packageJson, 'react-native'),
            hasFlutter: existsSync(join(this.config.rootDirectory, 'pubspec.yaml')),
            hasIonic: this.hasDependency(packageJson, '@ionic/angular'),
            // Desktop indicators
            hasElectron: this.hasDependency(packageJson, 'electron'),
            hasTauri: existsSync(join(this.config.rootDirectory, 'src-tauri')),
            // Infrastructure indicators
            hasDockerfile: existsSync(join(this.config.rootDirectory, 'Dockerfile')),
            hasAPIEndpoints: this.hasFilePattern('**/*{route,controller,endpoint}*'),
            // Monorepo indicators
            hasWorkspaces: packageJson.workspaces !== undefined,
            hasLernaConfig: existsSync(join(this.config.rootDirectory, 'lerna.json'))
        };
    }
    /**
     * Detect technology stack
     */
    async detectTechnologyStack() {
        const packageJsonPath = join(this.config.rootDirectory, 'package.json');
        let packageJson = {};
        if (existsSync(packageJsonPath)) {
            try {
                const content = await readFile(packageJsonPath, 'utf-8');
                packageJson = JSON.parse(content);
            }
            catch (error) {
                logger.warn('Failed to parse package.json for tech stack detection', { error });
            }
        }
        const allDependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
            ...packageJson.peerDependencies
        };
        return {
            primaryLanguage: this.detectPrimaryLanguage(),
            secondaryLanguages: this.detectSecondaryLanguages(),
            frontendFrameworks: this.detectFrontendFrameworks(allDependencies),
            backendFrameworks: this.detectBackendFrameworks(allDependencies),
            databases: this.detectDatabases(allDependencies),
            testingFrameworks: this.detectTestingFrameworks(allDependencies),
            buildTools: this.detectBuildTools(allDependencies),
            packageManagers: this.detectPackageManagers(),
            deploymentPlatforms: this.detectDeploymentPlatforms()
        };
    }
    /**
     * Extract project patterns from Steering documents
     */
    async extractProjectPatterns() {
        const patterns = [];
        const steeringDir = this.config.steeringDirectory;
        if (!existsSync(steeringDir)) {
            logger.debug('Steering directory not found', { steeringDir });
            return patterns;
        }
        try {
            const fs = await import('fs/promises');
            const files = await fs.readdir(steeringDir);
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const filePath = join(steeringDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const filePatterns = await this.parseSteeringDocument(content, filePath);
                    patterns.push(...filePatterns);
                }
            }
        }
        catch (error) {
            logger.warn('Failed to extract project patterns', { error });
        }
        return patterns;
    }
    /**
     * Extract code conventions from codebase
     */
    async extractCodeConventions() {
        const conventions = [];
        try {
            const files = await this.getCodeFiles();
            for (const filePath of files.slice(0, this.config.maxFiles)) {
                const fileConventions = await this.analyzeFileConventions(filePath);
                conventions.push(...fileConventions);
            }
            // Consolidate similar conventions
            return this.consolidateConventions(conventions);
        }
        catch (error) {
            logger.warn('Failed to extract code conventions', { error });
            return conventions;
        }
    }
    /**
     * Load project configuration files
     */
    async loadProjectConfiguration() {
        const config = {};
        const configFiles = [
            { key: 'packageJson', path: 'package.json' },
            { key: 'tsConfig', path: 'tsconfig.json' },
            { key: 'eslintConfig', path: '.eslintrc.json' },
            { key: 'prettierConfig', path: '.prettierrc' },
            { key: 'jestConfig', path: 'jest.config.js' },
            { key: 'vitestConfig', path: 'vitest.config.ts' }
        ];
        for (const { key, path } of configFiles) {
            const fullPath = join(this.config.rootDirectory, path);
            if (existsSync(fullPath)) {
                try {
                    const content = await readFile(fullPath, 'utf-8');
                    if (path.endsWith('.json')) {
                        config[key] = JSON.parse(content);
                    }
                    else {
                        // For JS/TS config files, we'd need to evaluate them
                        // For now, just store the raw content
                        config[key] = { _raw: content };
                    }
                }
                catch (error) {
                    logger.warn(`Failed to load config file: ${path}`, { error });
                }
            }
        }
        return config;
    }
    /**
     * Analyze project metadata
     */
    async analyzeProjectMetadata() {
        const packageJsonPath = join(this.config.rootDirectory, 'package.json');
        let packageJson = {};
        if (existsSync(packageJsonPath)) {
            try {
                const content = await readFile(packageJsonPath, 'utf-8');
                packageJson = JSON.parse(content);
            }
            catch (error) {
                logger.warn('Failed to parse package.json for metadata', { error });
            }
        }
        const size = await this.calculateProjectSize();
        const teamSize = this.estimateTeamSize();
        const maturity = this.assessProjectMaturity(packageJson);
        return {
            name: packageJson.name || basename(this.config.rootDirectory),
            version: packageJson.version || '0.0.0',
            description: packageJson.description || '',
            size,
            teamSize,
            maturity,
            lastModified: new Date()
        };
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    hasFilePattern(pattern) {
        // Simplified pattern matching - in practice, use glob library
        return false; // Placeholder implementation
    }
    hasDependency(packageJson, depName) {
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
            ...packageJson.peerDependencies
        };
        return depName in allDeps;
    }
    detectPrimaryLanguage() {
        // Analyze file extensions to determine primary language
        const extensions = ['.ts', '.js', '.py', '.java', '.go', '.rs'];
        // Simplified implementation
        return 'typescript';
    }
    detectSecondaryLanguages() {
        // Detect other languages used in the project
        return [];
    }
    detectFrontendFrameworks(dependencies) {
        const frameworks = [];
        const frameworkMap = {
            'react': 'React',
            'vue': 'Vue.js',
            '@angular/core': 'Angular',
            'svelte': 'Svelte',
            'solid-js': 'Solid.js'
        };
        for (const [dep, name] of Object.entries(frameworkMap)) {
            if (dep in dependencies) {
                frameworks.push(name);
            }
        }
        return frameworks;
    }
    detectBackendFrameworks(dependencies) {
        const frameworks = [];
        const frameworkMap = {
            'express': 'Express.js',
            'fastify': 'Fastify',
            'koa': 'Koa.js',
            'nestjs': 'NestJS',
            'hapi': 'Hapi.js'
        };
        for (const [dep, name] of Object.entries(frameworkMap)) {
            if (dep in dependencies) {
                frameworks.push(name);
            }
        }
        return frameworks;
    }
    detectDatabases(dependencies) {
        const databases = [];
        const dbMap = {
            'mongodb': 'MongoDB',
            'mongoose': 'MongoDB',
            'pg': 'PostgreSQL',
            'mysql2': 'MySQL',
            'sqlite3': 'SQLite',
            'redis': 'Redis'
        };
        for (const [dep, name] of Object.entries(dbMap)) {
            if (dep in dependencies) {
                databases.push(name);
            }
        }
        return databases;
    }
    detectTestingFrameworks(dependencies) {
        const frameworks = [];
        const testMap = {
            'jest': 'Jest',
            'vitest': 'Vitest',
            'mocha': 'Mocha',
            'jasmine': 'Jasmine',
            'cypress': 'Cypress',
            'playwright': 'Playwright'
        };
        for (const [dep, name] of Object.entries(testMap)) {
            if (dep in dependencies) {
                frameworks.push(name);
            }
        }
        return frameworks;
    }
    detectBuildTools(dependencies) {
        const tools = [];
        const toolMap = {
            'webpack': 'Webpack',
            'vite': 'Vite',
            'rollup': 'Rollup',
            'parcel': 'Parcel',
            'esbuild': 'ESBuild'
        };
        for (const [dep, name] of Object.entries(toolMap)) {
            if (dep in dependencies) {
                tools.push(name);
            }
        }
        return tools;
    }
    detectPackageManagers() {
        const managers = [];
        if (existsSync(join(this.config.rootDirectory, 'package-lock.json'))) {
            managers.push('npm');
        }
        if (existsSync(join(this.config.rootDirectory, 'yarn.lock'))) {
            managers.push('yarn');
        }
        if (existsSync(join(this.config.rootDirectory, 'pnpm-lock.yaml'))) {
            managers.push('pnpm');
        }
        return managers.length > 0 ? managers : ['npm'];
    }
    detectDeploymentPlatforms() {
        const platforms = [];
        if (existsSync(join(this.config.rootDirectory, 'Dockerfile'))) {
            platforms.push('Docker');
        }
        if (existsSync(join(this.config.rootDirectory, 'vercel.json'))) {
            platforms.push('Vercel');
        }
        if (existsSync(join(this.config.rootDirectory, 'netlify.toml'))) {
            platforms.push('Netlify');
        }
        return platforms;
    }
    async parseSteeringDocument(content, filePath) {
        // Parse markdown content to extract patterns
        // This is a simplified implementation
        const patterns = [];
        // Look for pattern sections in markdown
        const patternRegex = /## (.+)\n([\s\S]*?)(?=\n## |\n# |$)/g;
        let match;
        while ((match = patternRegex.exec(content)) !== null) {
            const [, name, description] = match;
            patterns.push({
                id: `${basename(filePath, '.md')}-${name.toLowerCase().replace(/\s+/g, '-')}`,
                name: name.trim(),
                description: description.trim(),
                category: this.categorizePattern(name),
                rules: this.extractRulesFromDescription(description),
                examples: this.extractExamplesFromDescription(description),
                sourceFile: filePath
            });
        }
        return patterns;
    }
    categorizePattern(name) {
        const nameUpper = name.toUpperCase();
        if (nameUpper.includes('ARCHITECTURE') || nameUpper.includes('STRUCTURE')) {
            return 'architecture';
        }
        if (nameUpper.includes('NAMING') || nameUpper.includes('CONVENTION')) {
            return 'naming';
        }
        if (nameUpper.includes('TEST') || nameUpper.includes('SPEC')) {
            return 'testing';
        }
        if (nameUpper.includes('SECURITY') || nameUpper.includes('AUTH')) {
            return 'security';
        }
        if (nameUpper.includes('PERFORMANCE') || nameUpper.includes('OPTIMIZATION')) {
            return 'performance';
        }
        if (nameUpper.includes('DOCUMENTATION') || nameUpper.includes('DOCS')) {
            return 'documentation';
        }
        if (nameUpper.includes('DEPLOYMENT') || nameUpper.includes('DEPLOY')) {
            return 'deployment';
        }
        return 'code-style';
    }
    extractRulesFromDescription(description) {
        // Extract rules from description text
        // This is a simplified implementation
        const rules = [];
        const ruleRegex = /- (MUST|SHOULD|MAY|MUST NOT|SHOULD NOT) (.+)/gi;
        let match;
        while ((match = ruleRegex.exec(description)) !== null) {
            const [, type, ruleDescription] = match;
            rules.push({
                id: `rule-${rules.length + 1}`,
                description: ruleDescription.trim(),
                type: type.toLowerCase().replace(' ', '-'),
                pattern: '', // Would need more sophisticated parsing
                enforcement: type.includes('MUST') ? 'error' : type.includes('SHOULD') ? 'warning' : 'info',
                examples: []
            });
        }
        return rules;
    }
    extractExamplesFromDescription(description) {
        // Extract examples from description
        const examples = [];
        const exampleRegex = /```[\s\S]*?```/g;
        let match;
        while ((match = exampleRegex.exec(description)) !== null) {
            examples.push(match[0]);
        }
        return examples;
    }
    async getCodeFiles() {
        // Get all code files in the project
        // This is a simplified implementation
        const files = [];
        try {
            const fs = await import('fs/promises');
            async function walkDir(dir) {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = join(dir, entry.name);
                    if (entry.isDirectory()) {
                        if (!this.config.excludeDirectories.includes(entry.name)) {
                            await walkDir(fullPath);
                        }
                    }
                    else if (entry.isFile()) {
                        const ext = extname(entry.name);
                        if (this.config.fileExtensions.includes(ext)) {
                            files.push(fullPath);
                        }
                    }
                }
            }
            await walkDir.call(this, this.config.rootDirectory);
        }
        catch (error) {
            logger.warn('Failed to walk directory for code files', { error });
        }
        return files;
    }
    async analyzeFileConventions(filePath) {
        // Analyze a single file for conventions
        const conventions = [];
        try {
            const content = await readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            // Analyze naming conventions
            conventions.push(...this.analyzeNamingConventions(content, filePath, lines));
            // Analyze import style
            conventions.push(...this.analyzeImportStyle(content, filePath, lines));
            // Analyze function style
            conventions.push(...this.analyzeFunctionStyle(content, filePath, lines));
        }
        catch (error) {
            logger.warn(`Failed to analyze file conventions: ${filePath}`, { error });
        }
        return conventions;
    }
    analyzeNamingConventions(content, filePath, lines) {
        const conventions = [];
        // Analyze variable naming
        const variableRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let match;
        const variableNames = [];
        while ((match = variableRegex.exec(content)) !== null) {
            variableNames.push(match[1]);
        }
        if (variableNames.length > 0) {
            const camelCaseCount = variableNames.filter(name => /^[a-z][a-zA-Z0-9]*$/.test(name)).length;
            const confidence = camelCaseCount / variableNames.length;
            if (confidence > this.config.confidenceThreshold) {
                conventions.push({
                    id: 'variable-naming-camelcase',
                    name: 'Variable Naming: camelCase',
                    category: 'naming',
                    pattern: '^[a-z][a-zA-Z0-9]*$',
                    confidence,
                    evidence: variableNames.slice(0, 3).map((name, index) => ({
                        filePath,
                        lineNumber: index + 1, // Simplified
                        example: name,
                        confidence: 1.0
                    })),
                    description: 'Variables use camelCase naming convention'
                });
            }
        }
        return conventions;
    }
    analyzeImportStyle(content, filePath, lines) {
        const conventions = [];
        const importLines = lines.filter(line => line.trim().startsWith('import'));
        if (importLines.length > 0) {
            const relativeImports = importLines.filter(line => line.includes("'./") || line.includes('"./'));
            const confidence = relativeImports.length / importLines.length;
            if (confidence > this.config.confidenceThreshold) {
                conventions.push({
                    id: 'import-style-relative',
                    name: 'Import Style: Relative Paths',
                    category: 'import-style',
                    pattern: "import .* from ['\"]\\./",
                    confidence,
                    evidence: relativeImports.slice(0, 3).map((line, index) => ({
                        filePath,
                        lineNumber: lines.indexOf(line) + 1,
                        example: line.trim(),
                        confidence: 1.0
                    })),
                    description: 'Imports use relative paths for local modules'
                });
            }
        }
        return conventions;
    }
    analyzeFunctionStyle(content, filePath, lines) {
        const conventions = [];
        const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const arrowFunctionRegex = /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(/g;
        const functionDeclarations = Array.from(content.matchAll(functionRegex));
        const arrowFunctions = Array.from(content.matchAll(arrowFunctionRegex));
        const totalFunctions = functionDeclarations.length + arrowFunctions.length;
        if (totalFunctions > 0) {
            const arrowFunctionRatio = arrowFunctions.length / totalFunctions;
            if (arrowFunctionRatio > this.config.confidenceThreshold) {
                conventions.push({
                    id: 'function-style-arrow',
                    name: 'Function Style: Arrow Functions',
                    category: 'function-style',
                    pattern: 'const \\w+ = \\(',
                    confidence: arrowFunctionRatio,
                    evidence: arrowFunctions.slice(0, 3).map((match, index) => ({
                        filePath,
                        lineNumber: index + 1, // Simplified
                        example: match[0],
                        confidence: 1.0
                    })),
                    description: 'Functions prefer arrow function syntax'
                });
            }
        }
        return conventions;
    }
    consolidateConventions(conventions) {
        // Group conventions by ID and consolidate evidence
        const consolidated = new Map();
        for (const convention of conventions) {
            if (consolidated.has(convention.id)) {
                const existing = consolidated.get(convention.id);
                existing.evidence.push(...convention.evidence);
                existing.confidence = (existing.confidence + convention.confidence) / 2;
            }
            else {
                consolidated.set(convention.id, { ...convention });
            }
        }
        return Array.from(consolidated.values())
            .filter(convention => convention.confidence >= this.config.confidenceThreshold);
    }
    async calculateProjectSize() {
        // Calculate project size based on lines of code
        const files = await this.getCodeFiles();
        let totalLines = 0;
        for (const file of files.slice(0, 100)) { // Sample first 100 files
            try {
                const content = await readFile(file, 'utf-8');
                totalLines += content.split('\n').length;
            }
            catch (error) {
                // Ignore files that can't be read
            }
        }
        if (totalLines < 1000)
            return 'small';
        if (totalLines < 10000)
            return 'medium';
        if (totalLines < 100000)
            return 'large';
        return 'enterprise';
    }
    estimateTeamSize() {
        // Estimate team size based on git history or other indicators
        // This is a simplified implementation
        return 'small';
    }
    assessProjectMaturity(packageJson) {
        const version = packageJson.version || '0.0.0';
        const [major, minor] = version.split('.').map(Number);
        if (major === 0 && minor === 0)
            return 'prototype';
        if (major === 0)
            return 'development';
        if (major === 1)
            return 'stable';
        if (major >= 2)
            return 'mature';
        return 'development';
    }
    getDefaultTechStack() {
        return {
            primaryLanguage: 'typescript',
            secondaryLanguages: [],
            frontendFrameworks: [],
            backendFrameworks: [],
            databases: [],
            testingFrameworks: [],
            buildTools: [],
            packageManagers: ['npm'],
            deploymentPlatforms: []
        };
    }
    getDefaultMetadata() {
        return {
            name: basename(this.config.rootDirectory),
            version: '0.0.0',
            description: '',
            size: 'small',
            teamSize: 'small',
            maturity: 'prototype',
            lastModified: new Date()
        };
    }
}
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create a project context analyzer with default configuration
 */
export function createProjectContextAnalyzer(config) {
    return new ProjectContextAnalyzer(config);
}
/**
 * Validate project context
 */
export function validateProjectContext(context) {
    try {
        return !!(context &&
            typeof context.projectType === 'string' &&
            context.techStack &&
            typeof context.techStack.primaryLanguage === 'string' &&
            Array.isArray(context.techStack.frontendFrameworks) &&
            Array.isArray(context.patterns) &&
            Array.isArray(context.conventions) &&
            context.configuration &&
            typeof context.configuration === 'object' &&
            context.metadata &&
            typeof context.metadata.name === 'string' &&
            typeof context.metadata.version === 'string');
    }
    catch (error) {
        return false;
    }
}
//# sourceMappingURL=project-context-analyzer.js.map