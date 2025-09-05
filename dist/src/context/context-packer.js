/**
 * Repository Context Packer for GAN Auditor Integration
 *
 * This module implements context building functionality for different scope modes,
 * git integration, file relevance scoring, and context size management.
 *
 * Requirements: 4.1-4.5 - Repository context analysis
 */
import { spawn } from 'child_process';
import { readFile, readdir, stat, access } from 'fs/promises';
import { join, relative, resolve, extname, basename } from 'path';
// ============================================================================
// Constants and Configuration
// ============================================================================
const MAX_CONTEXT_SIZE = 50000; // 50KB default
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const RELEVANCE_THRESHOLD = 0.3;
const MAX_TREE_DEPTH = 3;
const TOP_FILES_LIMIT = 20;
const SNIPPET_MAX_TOKENS = 10000;
// File extensions and their relevance weights
const FILE_RELEVANCE_WEIGHTS = {
    '.ts': 1.0,
    '.js': 1.0,
    '.tsx': 0.9,
    '.jsx': 0.9,
    '.py': 0.9,
    '.java': 0.8,
    '.cpp': 0.8,
    '.c': 0.8,
    '.cs': 0.8,
    '.go': 0.8,
    '.rs': 0.8,
    '.php': 0.7,
    '.rb': 0.7,
    '.swift': 0.7,
    '.kt': 0.7,
    '.scala': 0.7,
    '.json': 0.6,
    '.yaml': 0.6,
    '.yml': 0.6,
    '.toml': 0.6,
    '.xml': 0.5,
    '.html': 0.5,
    '.css': 0.4,
    '.scss': 0.4,
    '.less': 0.4,
    '.md': 0.3,
    '.txt': 0.2,
};
// Directories to ignore during workspace scanning
const IGNORED_DIRECTORIES = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'target',
    '.next',
    '.nuxt',
    'coverage',
    '.nyc_output',
    '__pycache__',
    '.pytest_cache',
    'venv',
    'env',
    '.env',
    '.vscode',
    '.idea',
    'tmp',
    'temp',
]);
// ============================================================================
// Helper Classes
// ============================================================================
/**
 * Git operations helper
 */
class GitHelper {
    async getDiff(cwd = process.cwd()) {
        try {
            const result = await this.executeGitCommand(['diff', '--no-color'], cwd);
            return result.stdout;
        }
        catch (error) {
            throw new Error(`Failed to get git diff: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getBranch(cwd = process.cwd()) {
        try {
            const result = await this.executeGitCommand(['branch', '--show-current'], cwd);
            return result.stdout.trim();
        }
        catch (error) {
            throw new Error(`Failed to get git branch: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getRepoRoot(cwd = process.cwd()) {
        try {
            const result = await this.executeGitCommand(['rev-parse', '--show-toplevel'], cwd);
            return result.stdout.trim();
        }
        catch (error) {
            throw new Error(`Failed to get repo root: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getFileTree(cwd = process.cwd(), maxDepth = MAX_TREE_DEPTH) {
        try {
            const result = await this.executeGitCommand(['ls-tree', '-r', '--name-only', 'HEAD'], cwd);
            const files = result.stdout.split('\n').filter(f => f.trim());
            // Build tree structure
            const tree = this.buildTreeStructure(files, maxDepth);
            return tree;
        }
        catch (error) {
            // Fallback to filesystem tree if git fails
            return this.buildFileSystemTree(cwd, maxDepth);
        }
    }
    async executeGitCommand(args, cwd) {
        return new Promise((resolve, reject) => {
            const child = spawn('git', args, { cwd, stdio: 'pipe' });
            let stdout = '';
            let stderr = '';
            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            child.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                }
                else {
                    reject(new Error(`Git command failed with code ${code}: ${stderr}`));
                }
            });
            child.on('error', (error) => {
                reject(error);
            });
        });
    }
    buildTreeStructure(files, maxDepth) {
        const tree = {};
        for (const file of files) {
            const parts = file.split('/');
            if (parts.length > maxDepth)
                continue;
            let current = tree;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = {};
                }
                current = current[part];
            }
            current[parts[parts.length - 1]] = null; // File marker
        }
        return this.formatTree(tree, 0);
    }
    formatTree(node, depth) {
        const indent = '  '.repeat(depth);
        let result = '';
        const entries = Object.entries(node).sort(([a], [b]) => a.localeCompare(b));
        for (const [name, children] of entries) {
            if (children === null) {
                // File
                result += `${indent}${name}\n`;
            }
            else {
                // Directory
                result += `${indent}${name}/\n`;
                result += this.formatTree(children, depth + 1);
            }
        }
        return result;
    }
    async buildFileSystemTree(cwd, maxDepth) {
        const buildTree = async (dir, currentDepth) => {
            if (currentDepth >= maxDepth)
                return '';
            try {
                const entries = await readdir(dir);
                const indent = '  '.repeat(currentDepth);
                let result = '';
                for (const entry of entries.sort()) {
                    if (IGNORED_DIRECTORIES.has(entry))
                        continue;
                    const fullPath = join(dir, entry);
                    const stats = await stat(fullPath);
                    if (stats.isDirectory()) {
                        result += `${indent}${entry}/\n`;
                        result += await buildTree(fullPath, currentDepth + 1);
                    }
                    else {
                        result += `${indent}${entry}\n`;
                    }
                }
                return result;
            }
            catch (error) {
                return '';
            }
        };
        return buildTree(cwd, 0);
    }
}
/**
 * File system operations helper
 */
class FileSystemHelper {
    async readFile(path) {
        try {
            return await readFile(path, 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to read file ${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async writeFile(path, content) {
        throw new Error('Write operations not implemented in ContextPacker');
    }
    async exists(path) {
        try {
            await access(path);
            return true;
        }
        catch {
            return false;
        }
    }
    async mkdir(path, recursive) {
        throw new Error('Directory creation not implemented in ContextPacker');
    }
    async readdir(path) {
        try {
            return await readdir(path);
        }
        catch (error) {
            throw new Error(`Failed to read directory ${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
/**
 * Calculate relevance score for a file based on various heuristics
 */
function calculateFileRelevance(filePath, stats) {
    let score = 0;
    // Extension-based scoring
    const ext = extname(filePath).toLowerCase();
    const extensionScore = FILE_RELEVANCE_WEIGHTS[ext] || 0.1;
    score += extensionScore * 0.4;
    // Size-based scoring (prefer medium-sized files)
    const sizeScore = Math.max(0, 1 - Math.abs(stats.size - 5000) / 10000);
    score += sizeScore * 0.2;
    // Path-based scoring (prefer src, lib, app directories)
    const pathParts = filePath.split('/');
    let pathScore = 0;
    for (const part of pathParts) {
        if (['src', 'lib', 'app', 'components', 'utils', 'services'].includes(part.toLowerCase())) {
            pathScore += 0.3;
        }
        if (['test', 'tests', '__tests__', 'spec', 'specs'].includes(part.toLowerCase())) {
            pathScore += 0.1;
        }
    }
    score += Math.min(pathScore, 0.4) * 0.3;
    // Filename-based scoring
    const filename = basename(filePath, ext).toLowerCase();
    if (['index', 'main', 'app', 'server', 'client'].includes(filename)) {
        score += 0.1;
    }
    return Math.min(score, 1.0);
}
// ============================================================================
// Context Packer Implementation
// ============================================================================
/**
 * Repository context packer implementation
 * Requirement 4.1-4.5: Context building for different scope modes
 */
export class ContextPacker {
    gitHelper;
    fsHelper;
    maxContextSize;
    maxFileSize;
    relevanceThreshold;
    constructor(options = {}) {
        this.gitHelper = new GitHelper();
        this.fsHelper = new FileSystemHelper();
        this.maxContextSize = options.maxContextSize || MAX_CONTEXT_SIZE;
        this.maxFileSize = options.maxFileSize || MAX_FILE_SIZE;
        this.relevanceThreshold = options.relevanceThreshold || RELEVANCE_THRESHOLD;
    }
    /**
     * Build context pack based on session configuration
     * Requirement 4.1: Different scope modes support
     */
    async buildContextPack(config, cwd = process.cwd()) {
        try {
            let context = '';
            // Add git header information
            context += await this.getGitHeader(cwd);
            context += '\n\n';
            // Build context based on scope
            switch (config.scope) {
                case 'diff':
                    context += await this.buildDiffContext(cwd);
                    break;
                case 'paths':
                    if (!config.paths || config.paths.length === 0) {
                        throw new Error('Paths must be specified when scope is "paths"');
                    }
                    context += await this.buildPathsContext(config.paths, cwd);
                    break;
                case 'workspace':
                    context += await this.buildWorkspaceContext(cwd);
                    break;
                default:
                    throw new Error(`Unknown scope: ${config.scope}`);
            }
            // Truncate if necessary
            if (context.length > this.maxContextSize) {
                context = this.truncateContext(context, this.maxContextSize);
            }
            return context;
        }
        catch (error) {
            throw new Error(`Failed to build context pack: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Build git diff context
     * Requirement 4.2: Git integration functions
     */
    async buildDiffContext(cwd = process.cwd()) {
        try {
            const diff = await this.gitHelper.getDiff(cwd);
            if (!diff.trim()) {
                return '# Git Diff Context\n\nNo changes detected in the working directory.\n';
            }
            return `# Git Diff Context\n\n\`\`\`diff\n${diff}\n\`\`\`\n`;
        }
        catch (error) {
            return `# Git Diff Context\n\nError retrieving git diff: ${error instanceof Error ? error.message : String(error)}\n`;
        }
    }
    /**
     * Build context from specific file paths
     * Requirement 4.3: File relevance scoring algorithm
     */
    async buildPathsContext(paths, cwd = process.cwd()) {
        let context = '# Paths Context\n\n';
        for (const path of paths) {
            try {
                const fullPath = resolve(cwd, path);
                const relativePath = relative(cwd, fullPath);
                if (!(await this.fsHelper.exists(fullPath))) {
                    context += `## ${relativePath}\n\n*File not found*\n\n`;
                    continue;
                }
                const stats = await stat(fullPath);
                if (stats.isDirectory()) {
                    context += await this.buildDirectoryContext(fullPath, relativePath, cwd);
                }
                else {
                    context += await this.buildFileContext(fullPath, relativePath);
                }
            }
            catch (error) {
                context += `## ${path}\n\n*Error reading file: ${error instanceof Error ? error.message : String(error)}*\n\n`;
            }
        }
        return context;
    }
    /**
     * Build workspace context using heuristics
     * Requirement 4.4: Context size management with truncation
     */
    async buildWorkspaceContext(cwd = process.cwd()) {
        try {
            let context = '# Workspace Context\n\n';
            // Add repository tree
            context += '## Repository Structure\n\n';
            const tree = await this.gitHelper.getFileTree(cwd, MAX_TREE_DEPTH);
            context += `\`\`\`\n${tree}\`\`\`\n\n`;
            // Find and score relevant files
            const relevantFiles = await this.pickRelevantFiles(cwd, TOP_FILES_LIMIT);
            if (relevantFiles.length > 0) {
                context += '## Relevant Files\n\n';
                context += await this.collectTopSnippets(relevantFiles.map(f => f.path), TOP_FILES_LIMIT, SNIPPET_MAX_TOKENS);
            }
            return context;
        }
        catch (error) {
            throw new Error(`Failed to build workspace context: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get git repository header information
     * Requirement 4.2: Git integration functions
     */
    async getGitHeader(cwd) {
        try {
            const branch = await this.gitHelper.getBranch(cwd);
            const repoRoot = await this.gitHelper.getRepoRoot(cwd);
            const relativeCwd = relative(repoRoot, cwd);
            return `# Repository Information\n\n` +
                `- **Branch:** ${branch}\n` +
                `- **Repository Root:** ${repoRoot}\n` +
                `- **Working Directory:** ${relativeCwd || '(root)'}\n`;
        }
        catch (error) {
            return `# Repository Information\n\n*Error retrieving git information: ${error instanceof Error ? error.message : String(error)}*\n`;
        }
    }
    /**
     * Pick relevant files using scoring algorithm
     * Requirement 4.3: File relevance scoring algorithm
     */
    async pickRelevantFiles(root, limit) {
        const scores = [];
        const scanDirectory = async (dir) => {
            try {
                const entries = await this.fsHelper.readdir(dir);
                for (const entry of entries) {
                    if (IGNORED_DIRECTORIES.has(entry))
                        continue;
                    const fullPath = join(dir, entry);
                    const stats = await stat(fullPath);
                    if (stats.isDirectory()) {
                        await scanDirectory(fullPath);
                    }
                    else if (stats.size <= this.maxFileSize) {
                        const relativePath = relative(root, fullPath);
                        const score = calculateFileRelevance(relativePath, { size: stats.size });
                        if (score >= this.relevanceThreshold) {
                            scores.push({
                                path: fullPath,
                                score,
                                size: stats.size,
                            });
                        }
                    }
                }
            }
            catch (error) {
                // Skip directories that can't be read
            }
        };
        await scanDirectory(root);
        // Sort by score and return top files
        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    /**
     * Collect code snippets from top files
     * Requirement 4.4: Context size management with truncation
     */
    async collectTopSnippets(paths, topK, maxTokens) {
        let context = '';
        let totalTokens = 0;
        for (let i = 0; i < Math.min(paths.length, topK); i++) {
            const path = paths[i];
            try {
                const content = await this.fsHelper.readFile(path);
                const snippet = this.createFileSnippet(path, content, maxTokens - totalTokens);
                if (snippet) {
                    context += snippet + '\n\n';
                    totalTokens += snippet.length;
                    if (totalTokens >= maxTokens) {
                        break;
                    }
                }
            }
            catch (error) {
                // Skip files that can't be read
            }
        }
        return context;
    }
    /**
     * Create a file snippet with appropriate truncation
     */
    createFileSnippet(filePath, content, maxLength) {
        if (content.length === 0)
            return null;
        const header = `### ${filePath}\n\n\`\`\`${this.getLanguageFromPath(filePath)}\n`;
        const footer = '\n```';
        const headerFooterLength = header.length + footer.length;
        if (headerFooterLength >= maxLength)
            return null;
        const availableLength = maxLength - headerFooterLength;
        let truncatedContent = content;
        if (content.length > availableLength) {
            truncatedContent = content.substring(0, availableLength - 20) + '\n\n// ... truncated';
        }
        return header + truncatedContent + footer;
    }
    /**
     * Get language identifier for syntax highlighting
     */
    getLanguageFromPath(filePath) {
        const ext = extname(filePath).toLowerCase();
        const languageMap = {
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.toml': 'toml',
            '.xml': 'xml',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.md': 'markdown',
        };
        return languageMap[ext] || 'text';
    }
    /**
     * Build context for a directory
     */
    async buildDirectoryContext(fullPath, relativePath, cwd) {
        let context = `## ${relativePath}/\n\n`;
        try {
            const entries = await this.fsHelper.readdir(fullPath);
            const files = [];
            for (const entry of entries) {
                if (IGNORED_DIRECTORIES.has(entry))
                    continue;
                const entryPath = join(fullPath, entry);
                const stats = await stat(entryPath);
                if (stats.isFile() && stats.size <= this.maxFileSize) {
                    files.push(entry);
                }
            }
            if (files.length > 0) {
                context += `Files: ${files.join(', ')}\n\n`;
            }
            else {
                context += '*No accessible files*\n\n';
            }
        }
        catch (error) {
            context += `*Error reading directory: ${error instanceof Error ? error.message : String(error)}*\n\n`;
        }
        return context;
    }
    /**
     * Build context for a single file
     */
    async buildFileContext(fullPath, relativePath) {
        try {
            const content = await this.fsHelper.readFile(fullPath);
            const language = this.getLanguageFromPath(fullPath);
            return `## ${relativePath}\n\n\`\`\`${language}\n${content}\n\`\`\`\n\n`;
        }
        catch (error) {
            return `## ${relativePath}\n\n*Error reading file: ${error instanceof Error ? error.message : String(error)}*\n\n`;
        }
    }
    /**
     * Truncate context to fit within size limits
     * Requirement 4.5: Context size management with truncation
     */
    truncateContext(context, maxSize) {
        if (context.length <= maxSize) {
            return context;
        }
        const truncationMessage = '\n\n... [Context truncated to fit size limits] ...';
        const availableSize = maxSize - truncationMessage.length;
        return context.substring(0, availableSize) + truncationMessage;
    }
}
// ============================================================================
// Factory Function
// ============================================================================
/**
 * Create a new ContextPacker instance with optional configuration
 */
export function createContextPacker(options) {
    return new ContextPacker(options);
}
//# sourceMappingURL=context-packer.js.map