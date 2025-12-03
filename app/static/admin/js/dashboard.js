/**
 * Admin Dashboard JavaScript
 * Handles dashboard functionality, metrics, charts, and real-time updates
 */

class AdminDashboard {
    constructor() {
        this.authClient = new AuthClient();
        this.websocketClient = null;
        this.refreshInterval = null;
        this.metrics = {};
        this.charts = {};
        
        this.init();
    }

    async init() {
        try {
            // Check authentication
            if (!await this.authClient.isAuthenticated()) {
                window.location.href = '/admin/login.html';
                return;
            }

            // Initialize UI components
            this.setupEventListeners();
            this.setupWebSocket();
            
            // Load initial data
            await this.loadDashboardData();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('Admin Dashboard initialized successfully');
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to initialize dashboard. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.authClient.logout();
        });

        // Refresh metrics button
        document.getElementById('refresh-metrics').addEventListener('click', () => {
            this.refreshMetrics();
        });

        // Quick action buttons
        document.querySelectorAll('.action-button').forEach(button => {
            button.addEventListener('click', (e) => {
                if (button.id === 'refresh-metrics') {
                    e.preventDefault();
                    this.refreshMetrics();
                }
            });
        });
    }

    setupWebSocket() {
        try {
            this.websocketClient = new WebSocketClient({
                onConnect: () => {
                    console.log('Dashboard WebSocket connected');
                    this.updateConnectionStatus(true);
                },
                onDisconnect: () => {
                    console.log('Dashboard WebSocket disconnected');
                    this.updateConnectionStatus(false);
                },
                onMessage: (message) => {
                    this.handleWebSocketMessage(message);
                },
                onError: (error) => {
                    console.error('Dashboard WebSocket error:', error);
                    this.updateConnectionStatus(false);
                }
            });

            this.websocketClient.connect();
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
            this.updateConnectionStatus(false);
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading(true);
            
            // Load all dashboard data in parallel
            const [metrics, activity, charts] = await Promise.all([
                this.loadMetrics(),
                this.loadRecentActivity(),
                this.loadChartData()
            ]);

            this.metrics = metrics;
            this.updateMetricsDisplay(metrics);
            this.updateActivityDisplay(activity);
            this.updateChartsDisplay(charts);
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showError('Failed to load dashboard data');
        } finally {
            this.showLoading(false);
        }
    }

    async loadMetrics() {
        try {
            const response = await fetch('/api/admin/dashboard/metrics', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to load metrics:', error);
            // Return default metrics on error
            return {
                total_reports: 0,
                pending_reports: 0,
                resolved_today: 0,
                active_moderators: 0,
                reports_change: { value: 0, percentage: 0 },
                pending_change: { value: 0, percentage: 0 },
                resolved_change: { value: 0, percentage: 0 },
                moderators_change: { value: 0, percentage: 0 }
            };
        }
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/api/admin/activity/recent?limit=10', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to load recent activity:', error);
            return [];
        }
    }

    async loadChartData() {
        try {
            const [reportsTrend, categories, actions] = await Promise.all([
                this.fetchChartData('/api/admin/charts/reports-trend'),
                this.fetchChartData('/api/admin/charts/report-categories'),
                this.fetchChartData('/api/admin/charts/moderation-actions')
            ]);

            return {
                reportsTrend,
                categories,
                actions
            };
        } catch (error) {
            console.error('Failed to load chart data:', error);
            return {
                reportsTrend: [],
                categories: [],
                actions: []
            };
        }
    }

    async fetchChartData(endpoint) {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.authClient.getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    updateMetricsDisplay(metrics) {
        // Update metric values
        this.updateMetricValue('total-reports', metrics.total_reports);
        this.updateMetricValue('pending-reports', metrics.pending_reports);
        this.updateMetricValue('resolved-today', metrics.resolved_today);
        this.updateMetricValue('active-moderators', metrics.active_moderators);

        // Update change indicators
        this.updateChangeIndicator('reports-change', metrics.reports_change);
        this.updateChangeIndicator('pending-change', metrics.pending_change);
        this.updateChangeIndicator('resolved-change', metrics.resolved_change);
        this.updateChangeIndicator('moderators-change', metrics.moderators_change);

        // Update quick action counts
        this.updateQuickActionCounts(metrics);
    }

    updateMetricValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.formatNumber(value);
        }
    }

    updateChangeIndicator(elementId, change) {
        const element = document.getElementById(elementId);
        if (element) {
            const isPositive = change.percentage >= 0;
            const arrow = isPositive ? '↑' : '↓';
            const sign = isPositive ? '+' : '';
            
            element.innerHTML = `${arrow} ${sign}${change.percentage}% from last period`;
            element.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
        }
    }

    updateQuickActionCounts(metrics) {
        // Update pending reports badge
        const badge = document.getElementById('pending-reports-badge');
        if (badge && metrics.pending_reports > 0) {
            badge.textContent = metrics.pending_reports;
            badge.style.display = 'inline-block';
        }

        // Update quick action counts
        const pendingCount = document.getElementById('pending-reports-count');
        if (pendingCount) {
            pendingCount.textContent = `${metrics.pending_reports} pending`;
        }

        const resolvedCount = document.getElementById('resolved-today-count');
        if (resolvedCount) {
            resolvedCount.textContent = metrics.resolved_today;
        }
    }

    updateActivityDisplay(activities) {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-header">
                        <span class="activity-type">System</span>
                        <span class="activity-time">Just now</span>
                    </div>
                    <div class="activity-details">No recent activity to display</div>
                </div>
            `;
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-header">
                    <span class="activity-type">${this.getActivityTypeLabel(activity.action)}</span>
                    <span class="activity-time">${this.formatRelativeTime(activity.timestamp)}</span>
                </div>
                <div class="activity-details">${this.getActivityDescription(activity)}</div>
            </div>
        `).join('');
    }

    updateChartsDisplay(charts) {
        this.renderReportsTrendChart(charts.reportsTrend);
        this.renderCategoriesChart(charts.categories);
        this.renderActionsChart(charts.actions);
    }

    renderReportsTrendChart(data) {
        const container = document.getElementById('reports-chart');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<i class="fas fa-chart-line"></i> No data available';
            return;
        }

        // Simple chart rendering (in production, use a proper charting library)
        const maxValue = Math.max(...data.map(d => d.count));
        const chartHTML = data.map(item => {
            const height = (item.count / maxValue) * 200;
            return `
                <div style="display: inline-block; margin: 0 5px; text-align: center;">
                    <div style="height: ${height}px; width: 30px; background: #007bff; margin-bottom: 5px;"></div>
                    <div style="font-size: 0.7rem;">${new Date(item.date).toLocaleDateString('en', { weekday: 'short' })}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 250px; padding: 20px;">
                ${chartHTML}
            </div>
        `;
    }

    renderCategoriesChart(data) {
        const container = document.getElementById('categories-chart');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<i class="fas fa-chart-pie"></i> No data available';
            return;
        }

        const total = data.reduce((sum, item) => sum + item.count, 0);
        const chartHTML = data.map(item => {
            const percentage = ((item.count / total) * 100).toFixed(1);
            return `
                <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>${item.category}</span>
                        <span>${item.count} (${percentage}%)</span>
                    </div>
                    <div style="background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="background: #28a745; height: 100%; width: ${percentage}%;"></div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = chartHTML;
    }

    renderActionsChart(data) {
        const container = document.getElementById('actions-chart');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<i class="fas fa-chart-bar"></i> No data available';
            return;
        }

        const maxValue = Math.max(...data.map(d => d.count));
        const chartHTML = data.map(item => {
            const width = (item.count / maxValue) * 100;
            return `
                <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>${item.action}</span>
                        <span>${item.count}</span>
                    </div>
                    <div style="background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="background: #ffc107; height: 100%; width: ${width}%;"></div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = chartHTML;
    }

    handleWebSocketMessage(message) {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'new_report':
                    this.handleNewReport(data.payload);
                    break;
                case 'report_resolved':
                    this.handleReportResolved(data.payload);
                    break;
                case 'admin_activity':
                    this.handleAdminActivity(data.payload);
                    break;
                case 'metrics_update':
                    this.handleMetricsUpdate(data.payload);
                    break;
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Failed to handle WebSocket message:', error);
        }
    }

    handleNewReport(report) {
        this.showAlert(`New report received: ${report.reason}`, 'warning');
        this.refreshMetrics();
    }

    handleReportResolved(report) {
        this.showAlert(`Report resolved: ${report.reason}`, 'success');
        this.refreshMetrics();
    }

    handleAdminActivity(activity) {
        // Add to recent activity if it's recent enough
        const activityList = document.getElementById('activity-list');
        if (activityList) {
            const newActivity = document.createElement('div');
            newActivity.className = 'activity-item';
            newActivity.innerHTML = `
                <div class="activity-header">
                    <span class="activity-type">${this.getActivityTypeLabel(activity.action)}</span>
                    <span class="activity-time">Just now</span>
                </div>
                <div class="activity-details">${this.getActivityDescription(activity)}</div>
            `;
            
            activityList.insertBefore(newActivity, activityList.firstChild);
            
            // Remove last item if too many
            const items = activityList.querySelectorAll('.activity-item');
            if (items.length > 10) {
                items[items.length - 1].remove();
            }
        }
    }

    handleMetricsUpdate(metrics) {
        this.metrics = { ...this.metrics, ...metrics };
        this.updateMetricsDisplay(this.metrics);
    }

    async refreshMetrics() {
        try {
            const button = document.getElementById('refresh-metrics');
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
            button.disabled = true;

            await this.loadDashboardData();
            
            button.innerHTML = originalContent;
            button.disabled = false;
            
            this.showAlert('Dashboard data refreshed successfully', 'success');
        } catch (error) {
            console.error('Failed to refresh metrics:', error);
            this.showError('Failed to refresh dashboard data');
        }
    }

    startAutoRefresh() {
        // Refresh metrics every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshMetrics();
        }, 5 * 60 * 1000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    updateConnectionStatus(connected) {
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${connected ? 'online' : 'offline'}`;
        }
    }

    showLoading(show) {
        // Add loading spinners to metric cards
        document.querySelectorAll('.metric-value').forEach(element => {
            if (show && element.textContent === '-') {
                element.innerHTML = '<div class="loading-spinner"></div>';
            }
        });
    }

    showAlert(message, type = 'info') {
        const container = document.getElementById('alerts-container');
        if (!container) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            ${message}
            <button type="button" style="float: right; background: none; border: none; font-size: 1.2rem; cursor: pointer;" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    showError(message) {
        this.showAlert(message, 'error');
    }

    // Utility methods
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatRelativeTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    getActivityTypeLabel(action) {
        const labels = {
            'report_created': 'New Report',
            'report_resolved': 'Report Resolved',
            'moderation_action': 'Moderation',
            'admin_login': 'Admin Login',
            'admin_logout': 'Admin Logout',
            'system_alert': 'System Alert'
        };
        return labels[action] || action;
    }

    getActivityDescription(activity) {
        const descriptions = {
            'report_created': `Report #${activity.report_id} created: ${activity.reason}`,
            'report_resolved': `Report #${activity.report_id} resolved by ${activity.admin_username}`,
            'moderation_action': `${activity.action} taken on post by ${activity.admin_username}`,
            'admin_login': `Admin ${activity.admin_username} logged in`,
            'admin_logout': `Admin ${activity.admin_username} logged out`,
            'system_alert': activity.details || 'System notification'
        };
        return descriptions[activity.action] || activity.details || 'Activity recorded';
    }

    // Cleanup method
    destroy() {
        this.stopAutoRefresh();
        if (this.websocketClient) {
            this.websocketClient.disconnect();
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.adminDashboard) {
        window.adminDashboard.destroy();
    }
});