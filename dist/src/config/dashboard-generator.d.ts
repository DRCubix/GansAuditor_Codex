/**
 * Dashboard Generator for System Prompt Configuration Monitoring
 *
 * This module generates HTML dashboards and reports for monitoring
 * system prompt configuration, deployments, and performance metrics.
 *
 * Requirements: 11.3 - Dashboards for audit success rates and patterns
 */
import { SystemPromptMonitoringSystem, SystemPromptMetrics, AlertEvent } from './monitoring-system.js';
/**
 * Dashboard configuration
 */
export interface DashboardConfig {
    title: string;
    refreshInterval: number;
    theme: 'light' | 'dark';
    showAlerts: boolean;
    showMetrics: boolean;
    showCharts: boolean;
    timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
    outputPath: string;
}
/**
 * Chart configuration
 */
export interface ChartConfig {
    type: 'line' | 'bar' | 'pie' | 'gauge';
    title: string;
    metric: string;
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
    timeWindow: number;
    color?: string;
}
/**
 * Dashboard section
 */
export interface DashboardSection {
    id: string;
    title: string;
    type: 'metrics' | 'chart' | 'alerts' | 'table' | 'status';
    config: any;
    order: number;
}
/**
 * Default dashboard configuration
 */
export declare const DEFAULT_DASHBOARD_CONFIG: DashboardConfig;
/**
 * Default chart configurations
 */
export declare const DEFAULT_CHARTS: ChartConfig[];
export declare class DashboardGenerator {
    private config;
    private monitoring;
    constructor(monitoring: SystemPromptMonitoringSystem, config?: DashboardConfig);
    /**
     * Generate complete HTML dashboard
     */
    generateDashboard(): string;
    /**
     * Generate and save dashboard to file
     */
    saveDashboard(): {
        success: boolean;
        path: string;
        error?: string;
    };
    /**
     * Generate metrics report in JSON format
     */
    generateMetricsReport(): {
        timestamp: number;
        summary: SystemPromptMetrics;
        trends: Record<string, {
            current: number;
            previous: number;
            change: number;
        }>;
        alerts: AlertEvent[];
        recommendations: string[];
    };
    /**
     * Generate CSS styles for dashboard
     */
    private generateCSS;
    /**
     * Generate system health section
     */
    private generateSystemHealthSection;
    /**
     * Generate metrics section
     */
    private generateMetricsSection;
    /**
     * Generate charts section
     */
    private generateChartsSection;
    /**
     * Generate alerts section
     */
    private generateAlertsSection;
    /**
     * Generate recent activity section
     */
    private generateRecentActivitySection;
    /**
     * Generate feature flags section
     */
    private generateFeatureFlagsSection;
    /**
     * Generate JavaScript for charts and interactivity
     */
    private generateJavaScript;
    /**
     * Get chart data for specific metric
     */
    private getChartData;
    /**
     * Format uptime duration
     */
    private formatUptime;
    /**
     * Generate recommendations based on metrics and alerts
     */
    private generateRecommendations;
}
/**
 * Create dashboard generator with default configuration
 */
export declare function createDashboardGenerator(monitoring: SystemPromptMonitoringSystem, config?: Partial<DashboardConfig>): DashboardGenerator;
/**
 * Generate and save dashboard quickly
 */
export declare function generateDashboard(monitoring: SystemPromptMonitoringSystem, outputPath?: string): {
    success: boolean;
    path: string;
    error?: string;
};
//# sourceMappingURL=dashboard-generator.d.ts.map