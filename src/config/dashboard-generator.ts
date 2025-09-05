/**
 * Dashboard Generator for System Prompt Configuration Monitoring
 * 
 * This module generates HTML dashboards and reports for monitoring
 * system prompt configuration, deployments, and performance metrics.
 * 
 * Requirements: 11.3 - Dashboards for audit success rates and patterns
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  SystemPromptMonitoringSystem,
  DashboardData,
  SystemPromptMetrics,
  AlertEvent,
  MetricDataPoint,
} from './monitoring-system.js';

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

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default dashboard configuration
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  title: 'System Prompt Configuration Dashboard',
  refreshInterval: 30000, // 30 seconds
  theme: 'light',
  showAlerts: true,
  showMetrics: true,
  showCharts: true,
  timeRange: '24h',
  outputPath: './monitoring/dashboard.html',
};

/**
 * Default chart configurations
 */
export const DEFAULT_CHARTS: ChartConfig[] = [
  {
    type: 'line',
    title: 'Configuration Validations',
    metric: 'configValidationCount',
    aggregation: 'sum',
    timeWindow: 3600000, // 1 hour
    color: '#4CAF50',
  },
  {
    type: 'line',
    title: 'Deployment Success Rate',
    metric: 'configDeploymentErrors',
    aggregation: 'sum',
    timeWindow: 3600000,
    color: '#F44336',
  },
  {
    type: 'gauge',
    title: 'Audit Success Rate',
    metric: 'auditSuccessRate',
    aggregation: 'avg',
    timeWindow: 3600000,
    color: '#2196F3',
  },
  {
    type: 'line',
    title: 'Memory Usage',
    metric: 'memoryUsage',
    aggregation: 'avg',
    timeWindow: 3600000,
    color: '#FF9800',
  },
  {
    type: 'bar',
    title: 'Feature Flag Evaluations',
    metric: 'featureFlagEvaluations',
    aggregation: 'sum',
    timeWindow: 3600000,
    color: '#9C27B0',
  },
];

// ============================================================================
// Dashboard Generator Class
// ============================================================================

export class DashboardGenerator {
  private config: DashboardConfig;
  private monitoring: SystemPromptMonitoringSystem;

  constructor(
    monitoring: SystemPromptMonitoringSystem,
    config: DashboardConfig = DEFAULT_DASHBOARD_CONFIG
  ) {
    this.monitoring = monitoring;
    this.config = config;
  }

  /**
   * Generate complete HTML dashboard
   */
  generateDashboard(): string {
    const dashboardData = this.monitoring.generateDashboardData();
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title}</title>
    <style>
        ${this.generateCSS()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="${this.config.theme}">
    <div class="dashboard">
        <header class="dashboard-header">
            <h1>${this.config.title}</h1>
            <div class="header-info">
                <span class="last-updated">Last Updated: ${new Date(dashboardData.timestamp).toLocaleString()}</span>
                <span class="system-status status-${dashboardData.systemHealth.status}">
                    ${dashboardData.systemHealth.status.toUpperCase()}
                </span>
            </div>
        </header>

        <main class="dashboard-content">
            ${this.generateSystemHealthSection(dashboardData)}
            ${this.generateMetricsSection(dashboardData.metrics)}
            ${this.generateChartsSection(dashboardData)}
            ${this.generateAlertsSection(dashboardData.alerts)}
            ${this.generateRecentActivitySection(dashboardData)}
            ${this.generateFeatureFlagsSection(dashboardData)}
        </main>
    </div>

    <script>
        ${this.generateJavaScript(dashboardData)}
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * Generate and save dashboard to file
   */
  saveDashboard(): {
    success: boolean;
    path: string;
    error?: string;
  } {
    try {
      const html = this.generateDashboard();
      writeFileSync(this.config.outputPath, html, 'utf-8');
      
      return {
        success: true,
        path: this.config.outputPath,
      };
    } catch (error) {
      return {
        success: false,
        path: this.config.outputPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate metrics report in JSON format
   */
  generateMetricsReport(): {
    timestamp: number;
    summary: SystemPromptMetrics;
    trends: Record<string, { current: number; previous: number; change: number }>;
    alerts: AlertEvent[];
    recommendations: string[];
  } {
    const dashboardData = this.monitoring.generateDashboardData();
    
    // Calculate trends (simplified - would need historical data in real implementation)
    const trends: Record<string, { current: number; previous: number; change: number }> = {};
    
    const trendMetrics = [
      'configValidationCount',
      'configDeploymentCount',
      'auditSuccessRate',
      'auditAverageScore',
    ];
    
    for (const metric of trendMetrics) {
      const current = (dashboardData.metrics as any)[metric] || 0;
      const previous = current * 0.9; // Simplified - would use actual historical data
      trends[metric] = {
        current,
        previous,
        change: ((current - previous) / previous) * 100,
      };
    }

    // Generate recommendations based on metrics
    const recommendations = this.generateRecommendations(dashboardData.metrics, dashboardData.alerts);

    return {
      timestamp: dashboardData.timestamp,
      summary: dashboardData.metrics,
      trends,
      alerts: dashboardData.alerts,
      recommendations,
    };
  }

  /**
   * Generate CSS styles for dashboard
   */
  private generateCSS(): string {
    const isDark = this.config.theme === 'dark';
    
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: ${isDark ? '#1a1a1a' : '#f5f5f5'};
            color: ${isDark ? '#ffffff' : '#333333'};
            line-height: 1.6;
        }

        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 20px;
            background: ${isDark ? '#2d2d2d' : '#ffffff'};
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .dashboard-header h1 {
            color: ${isDark ? '#ffffff' : '#2c3e50'};
            font-size: 2rem;
            font-weight: 600;
        }

        .header-info {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
        }

        .last-updated {
            font-size: 0.9rem;
            color: ${isDark ? '#cccccc' : '#666666'};
        }

        .system-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-healthy {
            background-color: #4CAF50;
            color: white;
        }

        .status-degraded {
            background-color: #FF9800;
            color: white;
        }

        .status-critical {
            background-color: #F44336;
            color: white;
        }

        .dashboard-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .dashboard-section {
            background: ${isDark ? '#2d2d2d' : '#ffffff'};
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .section-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: ${isDark ? '#ffffff' : '#2c3e50'};
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }

        .metric-card {
            text-align: center;
            padding: 15px;
            background: ${isDark ? '#3d3d3d' : '#f8f9fa'};
            border-radius: 6px;
        }

        .metric-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: #2196F3;
            margin-bottom: 5px;
        }

        .metric-label {
            font-size: 0.9rem;
            color: ${isDark ? '#cccccc' : '#666666'};
        }

        .alert-item {
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 6px;
            border-left: 4px solid;
        }

        .alert-critical {
            background-color: ${isDark ? '#4a1a1a' : '#ffebee'};
            border-left-color: #F44336;
        }

        .alert-error {
            background-color: ${isDark ? '#4a1a1a' : '#ffebee'};
            border-left-color: #F44336;
        }

        .alert-warning {
            background-color: ${isDark ? '#4a3a1a' : '#fff8e1'};
            border-left-color: #FF9800;
        }

        .alert-info {
            background-color: ${isDark ? '#1a2a4a' : '#e3f2fd'};
            border-left-color: #2196F3;
        }

        .alert-title {
            font-weight: 600;
            margin-bottom: 5px;
        }

        .alert-message {
            font-size: 0.9rem;
            color: ${isDark ? '#cccccc' : '#666666'};
        }

        .alert-time {
            font-size: 0.8rem;
            color: ${isDark ? '#999999' : '#999999'};
            margin-top: 5px;
        }

        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 15px;
        }

        .activity-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }

        .activity-item {
            text-align: center;
            padding: 15px;
            background: ${isDark ? '#3d3d3d' : '#f8f9fa'};
            border-radius: 6px;
        }

        .activity-count {
            font-size: 1.5rem;
            font-weight: 700;
            color: #4CAF50;
            margin-bottom: 5px;
        }

        .activity-label {
            font-size: 0.9rem;
            color: ${isDark ? '#cccccc' : '#666666'};
        }

        .feature-flags {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .flag-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .flag-enabled {
            background-color: #4CAF50;
            color: white;
        }

        .flag-disabled {
            background-color: #F44336;
            color: white;
        }

        @media (max-width: 768px) {
            .dashboard {
                padding: 10px;
            }
            
            .dashboard-header {
                flex-direction: column;
                text-align: center;
                gap: 15px;
            }
            
            .dashboard-content {
                grid-template-columns: 1fr;
            }
        }
    `;
  }

  /**
   * Generate system health section
   */
  private generateSystemHealthSection(data: DashboardData): string {
    const uptime = this.formatUptime(data.systemHealth.uptime);
    
    return `
        <section class="dashboard-section">
            <h2 class="section-title">System Health</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value status-${data.systemHealth.status}">${data.systemHealth.status.toUpperCase()}</div>
                    <div class="metric-label">Status</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${uptime}</div>
                    <div class="metric-label">Uptime</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.systemHealth.version}</div>
                    <div class="metric-label">Version</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${data.systemHealth.environment}</div>
                    <div class="metric-label">Environment</div>
                </div>
            </div>
        </section>
    `;
  }

  /**
   * Generate metrics section
   */
  private generateMetricsSection(metrics: SystemPromptMetrics): string {
    return `
        <section class="dashboard-section">
            <h2 class="section-title">Key Metrics</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${metrics.configValidationCount}</div>
                    <div class="metric-label">Validations</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metrics.configDeploymentCount}</div>
                    <div class="metric-label">Deployments</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${(metrics.auditSuccessRate * 100).toFixed(1)}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metrics.auditAverageScore.toFixed(1)}</div>
                    <div class="metric-label">Avg Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metrics.configValidationErrors}</div>
                    <div class="metric-label">Validation Errors</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metrics.migrationCount}</div>
                    <div class="metric-label">Migrations</div>
                </div>
            </div>
        </section>
    `;
  }

  /**
   * Generate charts section
   */
  private generateChartsSection(data: DashboardData): string {
    if (!this.config.showCharts) {
      return '';
    }

    return `
        <section class="dashboard-section" style="grid-column: 1 / -1;">
            <h2 class="section-title">Performance Charts</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                ${DEFAULT_CHARTS.map((chart, index) => `
                    <div>
                        <h3 style="margin-bottom: 10px; font-size: 1rem;">${chart.title}</h3>
                        <div class="chart-container">
                            <canvas id="chart-${index}"></canvas>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
  }

  /**
   * Generate alerts section
   */
  private generateAlertsSection(alerts: AlertEvent[]): string {
    if (!this.config.showAlerts || alerts.length === 0) {
      return `
        <section class="dashboard-section">
            <h2 class="section-title">Recent Alerts</h2>
            <p style="color: #4CAF50; text-align: center; padding: 20px;">No recent alerts</p>
        </section>
      `;
    }

    return `
        <section class="dashboard-section">
            <h2 class="section-title">Recent Alerts (${alerts.length})</h2>
            <div>
                ${alerts.slice(0, 5).map(alert => `
                    <div class="alert-item alert-${alert.severity}">
                        <div class="alert-title">${alert.alertName}</div>
                        <div class="alert-message">${alert.message}</div>
                        <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
  }

  /**
   * Generate recent activity section
   */
  private generateRecentActivitySection(data: DashboardData): string {
    return `
        <section class="dashboard-section">
            <h2 class="section-title">Recent Activity</h2>
            <div class="activity-grid">
                <div class="activity-item">
                    <div class="activity-count">${data.recentActivity.deployments}</div>
                    <div class="activity-label">Deployments</div>
                </div>
                <div class="activity-item">
                    <div class="activity-count">${data.recentActivity.migrations}</div>
                    <div class="activity-label">Migrations</div>
                </div>
                <div class="activity-item">
                    <div class="activity-count">${data.recentActivity.validations}</div>
                    <div class="activity-label">Validations</div>
                </div>
                <div class="activity-item">
                    <div class="activity-count">${data.recentActivity.alerts}</div>
                    <div class="activity-label">Alerts</div>
                </div>
            </div>
        </section>
    `;
  }

  /**
   * Generate feature flags section
   */
  private generateFeatureFlagsSection(data: DashboardData): string {
    const allFlags = [...data.featureFlags.enabled, ...data.featureFlags.disabled];
    
    if (allFlags.length === 0) {
      return '';
    }

    return `
        <section class="dashboard-section">
            <h2 class="section-title">Feature Flags</h2>
            <div class="feature-flags">
                ${data.featureFlags.enabled.map(flag => `
                    <span class="flag-badge flag-enabled">${flag}</span>
                `).join('')}
                ${data.featureFlags.disabled.map(flag => `
                    <span class="flag-badge flag-disabled">${flag}</span>
                `).join('')}
            </div>
        </section>
    `;
  }

  /**
   * Generate JavaScript for charts and interactivity
   */
  private generateJavaScript(data: DashboardData): string {
    return `
        // Auto-refresh dashboard
        setTimeout(() => {
            window.location.reload();
        }, ${this.config.refreshInterval});

        // Initialize charts
        document.addEventListener('DOMContentLoaded', function() {
            ${DEFAULT_CHARTS.map((chart, index) => `
                // Chart ${index}: ${chart.title}
                const ctx${index} = document.getElementById('chart-${index}');
                if (ctx${index}) {
                    new Chart(ctx${index}, {
                        type: '${chart.type === 'gauge' ? 'doughnut' : chart.type}',
                        data: {
                            labels: ['Current', 'Previous'],
                            datasets: [{
                                label: '${chart.title}',
                                data: [${this.getChartData(chart, data)}],
                                backgroundColor: ['${chart.color}', '#e0e0e0'],
                                borderColor: '${chart.color}',
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: ${chart.type !== 'gauge'}
                                }
                            }
                        }
                    });
                }
            `).join('\n')}
        });
    `;
  }

  /**
   * Get chart data for specific metric
   */
  private getChartData(chart: ChartConfig, data: DashboardData): string {
    const metricValue = (data.metrics as any)[chart.metric] || 0;
    
    if (chart.type === 'gauge') {
      return `${metricValue}, ${100 - metricValue}`;
    }
    
    // For other chart types, return sample data (would use real historical data)
    return `${metricValue}, ${metricValue * 0.8}`;
  }

  /**
   * Format uptime duration
   */
  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Generate recommendations based on metrics and alerts
   */
  private generateRecommendations(metrics: SystemPromptMetrics, alerts: AlertEvent[]): string[] {
    const recommendations: string[] = [];

    // Check validation error rate
    if (metrics.configValidationErrors > 5) {
      recommendations.push('High validation error rate detected. Review configuration templates and validation rules.');
    }

    // Check deployment success rate
    if (metrics.configDeploymentErrors > 0) {
      recommendations.push('Deployment errors detected. Review deployment process and environment configurations.');
    }

    // Check audit success rate
    if (metrics.auditSuccessRate < 0.8) {
      recommendations.push('Audit success rate is below 80%. Consider reviewing audit criteria and system prompt configuration.');
    }

    // Check memory usage
    if (metrics.memoryUsage > 0.8) {
      recommendations.push('High memory usage detected. Consider optimizing configuration caching and cleanup processes.');
    }

    // Check for critical alerts
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(`${criticalAlerts.length} critical alerts require immediate attention.`);
    }

    // Check migration activity
    if (metrics.migrationErrors > 0) {
      recommendations.push('Migration errors detected. Review migration scripts and backup procedures.');
    }

    // Default recommendation if no issues
    if (recommendations.length === 0) {
      recommendations.push('System is operating normally. Continue monitoring for optimal performance.');
    }

    return recommendations;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create dashboard generator with default configuration
 */
export function createDashboardGenerator(
  monitoring: SystemPromptMonitoringSystem,
  config?: Partial<DashboardConfig>
): DashboardGenerator {
  const fullConfig = { ...DEFAULT_DASHBOARD_CONFIG, ...config };
  return new DashboardGenerator(monitoring, fullConfig);
}

/**
 * Generate and save dashboard quickly
 */
export function generateDashboard(
  monitoring: SystemPromptMonitoringSystem,
  outputPath?: string
): {
  success: boolean;
  path: string;
  error?: string;
} {
  const config = outputPath ? { ...DEFAULT_DASHBOARD_CONFIG, outputPath } : DEFAULT_DASHBOARD_CONFIG;
  const generator = new DashboardGenerator(monitoring, config);
  return generator.saveDashboard();
}