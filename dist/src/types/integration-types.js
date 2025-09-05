/**
 * Integration types for GansAuditor_Codex Server
 *
 * This module defines interfaces for integrating GansAuditor_Codex auditing capabilities
 * with the GansAuditor_Codex MCP server, ensuring backward
 * compatibility while adding new audit functionality.
 */
// ============================================================================
// Default Configuration
// ============================================================================
/**
 * Default configuration for GansAuditor_Codex components
 */
export const DEFAULT_GANSAUDITOR_CODEX_CONFIG = {
    sessionManager: {
        stateDirectory: '.mcp-gan-state',
        maxSessionAge: 24 * 60 * 60 * 1000, // 24 hours
        cleanupInterval: 60 * 60 * 1000, // 1 hour
    },
    contextPacker: {
        maxContextSize: 50000, // 50KB
        maxFileSize: 1024 * 1024, // 1MB
        relevanceThreshold: 0.3,
    },
    codexJudge: {
        executable: 'codex',
        timeout: 30000, // 30 seconds
        retries: 2,
    },
    logging: {
        enabled: false,
        level: 'info',
    },
};
//# sourceMappingURL=integration-types.js.map