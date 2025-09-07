/**
 * Prompt Resource Manager
 *
 * Manages resource cleanup, memory monitoring, and garbage collection
 * for prompt execution and long-running sessions.
 *
 * Requirements: 10.6 - Resource cleanup and management
 */
import { EventEmitter } from 'events';
/**
 * Resource usage metrics
 */
export interface ResourceMetrics {
    /** Memory usage in bytes */
    memoryUsage: {
        /** Heap used */
        heapUsed: number;
        /** Heap total */
        heapTotal: number;
        /** External memory */
        external: number;
        /** RSS (Resident Set Size) */
        rss: number;
    };
    /** CPU usage */
    cpuUsage: {
        /** User CPU time in microseconds */
        user: number;
        /** System CPU time in microseconds */
        system: number;
    };
    /** File descriptor count */
    fileDescriptors: number;
    /** Active timer count */
    activeTimers: number;
    /** Active handle count */
    activeHandles: number;
}
/**
 * Resource limits configuration
 */
export interface ResourceLimits {
    /** Maximum heap memory in bytes */
    maxHeapMemory: number;
    /** Maximum RSS memory in bytes */
    maxRssMemory: number;
    /** Maximum file descriptors */
    maxFileDescriptors: number;
    /** Maximum active timers */
    maxActiveTimers: number;
    /** Memory warning threshold (percentage) */
    memoryWarningThreshold: number;
    /** Memory critical threshold (percentage) */
    memoryCriticalThreshold: number;
}
/**
 * Cleanup task configuration
 */
export interface CleanupTask {
    /** Unique task identifier */
    id: string;
    /** Task name */
    name: string;
    /** Cleanup function */
    cleanup: () => Promise<void> | void;
    /** Priority (higher = more important) */
    priority: number;
    /** Whether task is critical (must complete) */
    critical: boolean;
    /** Timeout for cleanup task in milliseconds */
    timeout: number;
}
/**
 * Resource manager configuration
 */
export interface PromptResourceManagerConfig {
    /** Resource monitoring interval in milliseconds */
    monitoringInterval: number;
    /** Garbage collection interval in milliseconds */
    gcInterval: number;
    /** Cleanup timeout in milliseconds */
    cleanupTimeout: number;
    /** Whether to enable automatic garbage collection */
    enableAutoGC: boolean;
    /** Whether to enable memory pressure monitoring */
    enableMemoryPressure: boolean;
    /** Resource limits */
    resourceLimits: ResourceLimits;
    /** Whether to enable detailed resource logging */
    enableDetailedLogging: boolean;
}
/**
 * Resource cleanup result
 */
export interface CleanupResult {
    /** Whether cleanup completed successfully */
    success: boolean;
    /** Number of tasks executed */
    tasksExecuted: number;
    /** Number of tasks failed */
    tasksFailed: number;
    /** Total cleanup duration in milliseconds */
    duration: number;
    /** Memory freed in bytes */
    memoryFreed: number;
    /** Errors encountered during cleanup */
    errors: Error[];
}
/**
 * Default resource manager configuration
 */
export declare const DEFAULT_RESOURCE_MANAGER_CONFIG: PromptResourceManagerConfig;
/**
 * Prompt Resource Manager Implementation
 *
 * Provides comprehensive resource management including memory monitoring,
 * automatic cleanup, and garbage collection for prompt execution.
 */
export declare class PromptResourceManager extends EventEmitter {
    private readonly config;
    private readonly componentLogger;
    private readonly cleanupTasks;
    private readonly temporaryArtifacts;
    private monitoringTimer?;
    private gcTimer?;
    private isCleaningUp;
    private lastResourceMetrics?;
    constructor(config?: Partial<PromptResourceManagerConfig>);
    /**
     * Register cleanup task
     */
    registerCleanupTask(task: CleanupTask): void;
    /**
     * Unregister cleanup task
     */
    unregisterCleanupTask(taskId: string): boolean;
    /**
     * Register temporary artifact for cleanup
     */
    registerTemporaryArtifact(artifactPath: string): void;
    /**
     * Unregister temporary artifact
     */
    unregisterTemporaryArtifact(artifactPath: string): boolean;
    /**
     * Get current resource metrics
     */
    getResourceMetrics(): ResourceMetrics;
    /**
     * Check if resource limits are exceeded
     */
    checkResourceLimits(): {
        withinLimits: boolean;
        warnings: string[];
        critical: string[];
    };
    /**
     * Force garbage collection
     */
    forceGarbageCollection(): void;
    /**
     * Execute cleanup tasks
     */
    executeCleanup(force?: boolean): Promise<CleanupResult>;
    /**
     * Get resource manager statistics
     */
    getStats(): {
        cleanupTasks: number;
        temporaryArtifacts: number;
        lastCleanupDuration: number;
        memoryUsage: ResourceMetrics['memoryUsage'];
        resourceLimitStatus: any;
    };
    /**
     * Destroy resource manager and cleanup all resources
     */
    destroy(): Promise<void>;
    /**
     * Start resource monitoring
     */
    private startResourceMonitoring;
    /**
     * Start automatic garbage collection
     */
    private startGarbageCollection;
    /**
     * Monitor resource usage
     */
    private monitorResources;
    /**
     * Execute all cleanup tasks
     */
    private executeCleanupTasks;
    /**
     * Execute cleanup task with timeout
     */
    private executeCleanupTaskWithTimeout;
    /**
     * Cleanup temporary artifacts
     */
    private cleanupTemporaryArtifacts;
    /**
     * Get file descriptor count (Unix-like systems)
     */
    private getFileDescriptorCount;
    /**
     * Get active timer count
     */
    private getActiveTimerCount;
    /**
     * Get active handle count
     */
    private getActiveHandleCount;
    /**
     * Register process cleanup handlers
     */
    private registerProcessHandlers;
}
/**
 * Create prompt resource manager with default configuration
 */
export declare function createPromptResourceManager(config?: Partial<PromptResourceManagerConfig>): PromptResourceManager;
//# sourceMappingURL=prompt-resource-manager.d.ts.map