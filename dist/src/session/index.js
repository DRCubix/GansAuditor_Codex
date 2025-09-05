/**
 * Session management module for GAN Auditor Integration
 *
 * Exports SessionManager and related types for managing audit sessions
 * with file-based persistence and error recovery. Also exports the enhanced
 * SynchronousSessionManager for synchronous audit workflow support.
 */
export { SessionManager, DEFAULT_SESSION_MANAGER_CONFIG } from './session-manager.js';
export { SynchronousSessionManager, DEFAULT_SYNCHRONOUS_SESSION_MANAGER_CONFIG } from './synchronous-session-manager.js';
export { MemoryEfficientSessionManager, createMemoryEfficientSessionManager, DEFAULT_MEMORY_EFFICIENT_CONFIG } from './memory-efficient-session-manager.js';
//# sourceMappingURL=index.js.map