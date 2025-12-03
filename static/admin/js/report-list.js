/**
 * Report List Management JavaScript
 * Handles loading, displaying, and managing reports
 */

class ReportListManager {
    constructor() {
        this.authClient = new AuthClient();
        this.websocketClient = null;
        this.reports = [];
        this.filteredReports = [];
        this.currentPage = 1;
        this.pageSize = 25;
        this.totalPages = 0;
        this.totalRecords = 0;
        this.selectedReports = new Set();
        this.filters = {};
        this.sortField = 'created_at';
        this.sortDirection = 'desc';
        
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
            await this.loadReports();
            await this.loadStats();
            
            console.log('Report List Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize report list:', error);
            this.showError('Failed to initialize reports page. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.authClient.logout();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshReports();
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportReports();
        });

        // Select all checkbox
        document.getElementById('select-all').addEventListener('change', (e) => {
            this.selectAllReports(e.target.checked);
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderReports();
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.renderReports();
            }
        });

        // Filter events are handled by ReportFilter class
    }

    setupWebSocket() {
        try {
            this.websocketClient = new WebSocketClient({
                onConnect: () => {
                    console.log('Reports WebSocket connected');
                    this.updateConnectionStatus(true);
                },
                onDisconnect: () => {
                    console.log('Reports WebSocket disconnected');
                    this.updateConnectionStatus(false);
                },
                onMessage: (message) => {
                    this.handleWebSocketMessage(message);
                },
                onError: (error) => {
                    console.error('Reports WebSocket error:', error);
                    this.updateConnectionStatus(false);
                }
            });

            this.websocketClient.connect();
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
            this.updateConnectionStatus(false);
        }
    }

    async loadReports() {
        try {
            this.showLoading(true);
            
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                sort: this.sortField,
                direction: this.sortDirection,
                ...this.filters
            });

            const response = await fetch(`/api/admin/reports?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            this.reports = data.reports || [];
            this.totalRecords = data.total || 0;
            this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
            
            this.filteredReports = [...this.reports];
            this.renderReports();
            this.updatePagination();
            
        } catch (error) {
            console.error('Failed to load reports:', error);
            this.showError('Failed to load reports');
            this.renderEmptyState();
        } finally {
            this.showLoading(false);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/reports/stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const stats = await response.json();
            this.updateStatsDisplay(stats);
            
        } catch (error) {
            console.error('Failed to load stats:', error);
            // Use default values on error
            this.updateStatsDisplay({
                total: 0,
                pending: 0,
                resolved_today: 0,
                avg_resolution_time: '0h'
            });
        }
    }

    renderReports() {
        const tbody = document.getElementById('reports-tbody');
        if (!tbody) return;

        if (this.filteredReports.length === 0) {
            this.renderEmptyState();
            return;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredReports.length);
        const pageReports = this.filteredReports.slice(startIndex, endIndex);

        tbody.innerHTML = pageReports.map(report => `
            <tr data-report-id="${report.id}">
                <td class="checkbox-cell">
                    <input type="checkbox" class="report-checkbox" value="${report.id}" 
                           ${this.selectedReports.has(report.id) ? 'checked' : ''}>
                </td>
                <td>${report.id}</td>
                <td>
                    <span class="report-status status-${report.status}">
                        ${this.formatStatus(report.status)}
                    </span>
                </td>
                <td>
                    <span class="report-priority priority-${report.priority}">
                        ${this.formatPriority(report.priority)}
                    </span>
                </td>
                <td>${this.formatReason(report.reason)}</td>
                <td class="report-content" title="${this.escapeHtml(report.content)}">
                    ${this.escapeHtml(report.content)}
                </td>
                <td>${this.escapeHtml(report.reported_by_username || 'Anonymous')}</td>
                <td>${this.formatDate(report.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="viewReport(${report.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${report.status === 'pending' ? `
                            <button class="btn btn-success btn-sm" onclick="quickResolve(${report.id})">
                                <i class="fas fa-check"></i> Resolve
                            </button>
                        ` : ''}
                        <button class="btn btn-warning btn-sm" onclick="reviewReport(${report.id})">
                            <i class="fas fa-gavel"></i> Review
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners to checkboxes
        tbody.querySelectorAll('.report-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const reportId = parseInt(e.target.value);
                if (e.target.checked) {
                    this.selectedReports.add(reportId);
                } else {
                    this.selectedReports.delete(reportId);
                }
                this.updateBulkActions();
            });
        });

        this.updatePaginationInfo(startIndex + 1, endIndex);
    }

    renderEmptyState() {
        const tbody = document.getElementById('reports-tbody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-inbox" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <div style="color: #666;">No reports found</div>
                    <div style="color: #999; font-size: 0.9rem; margin-top: 0.5rem;">
                        Try adjusting your filters or check back later
                    </div>
                </td>
            </tr>
        `;
    }

    updateStatsDisplay(stats) {
        this.updateElement('total-reports', stats.total || 0);
        this.updateElement('pending-reports', stats.pending || 0);
        this.updateElement('resolved-today', stats.resolved_today || 0);
        this.updateElement('avg-resolution-time', stats.avg_resolution_time || '0h');

        // Update badge if there are pending reports
        const badge = document.getElementById('pending-reports-badge');
        if (badge && stats.pending > 0) {
            badge.textContent = stats.pending;
            badge.style.display = 'inline-block';
        }
    }

    updatePagination() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
    }

    updatePaginationInfo(start, end) {
        this.updateElement('start-record', start);
        this.updateElement('end-record', end);
        this.updateElement('total-records', this.totalRecords);
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');

        if (selectedCount) {
            selectedCount.textContent = this.selectedReports.size;
        }

        if (bulkActions) {
            if (this.selectedReports.size > 0) {
                bulkActions.classList.add('active');
            } else {
                bulkActions.classList.remove('active');
            }
        }
    }

    selectAllReports(checked) {
        const checkboxes = document.querySelectorAll('.report-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const reportId = parseInt(checkbox.value);
            
            if (checked) {
                this.selectedReports.add(reportId);
            } else {
                this.selectedReports.delete(reportId);
            }
        });

        this.updateBulkActions();
    }

    async refreshReports() {
        try {
            const button = document.getElementById('refresh-btn');
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
            button.disabled = true;

            await Promise.all([
                this.loadReports(),
                this.loadStats()
            ]);
            
            button.innerHTML = originalContent;
            button.disabled = false;
            
            this.showSuccess('Reports refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh reports:', error);
            this.showError('Failed to refresh reports');
        }
    }

    async exportReports() {
        try {
            this.showLoading(true);
            
            const queryParams = new URLSearchParams({
                export: 'true',
                ...this.filters
            });

            const response = await fetch(`/api/admin/reports/export?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reports_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showSuccess('Reports exported successfully');
        } catch (error) {
            console.error('Failed to export reports:', error);
            this.showError('Failed to export reports');
        } finally {
            this.showLoading(false);
        }
    }

    handleWebSocketMessage(message) {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'new_report':
                    this.handleNewReport(data.payload);
                    break;
                case 'report_updated':
                    this.handleReportUpdated(data.payload);
                    break;
                case 'report_deleted':
                    this.handleReportDeleted(data.payload);
                    break;
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Failed to handle WebSocket message:', error);
        }
    }

    handleNewReport(report) {
        // Add to the beginning of the list
        this.reports.unshift(report);
        this.filteredReports = [...this.reports];
        
        // Re-render if on first page
        if (this.currentPage === 1) {
            this.renderReports();
        }
        
        // Update stats
        this.loadStats();
        
        // Show notification
        this.showAlert(`New report received: ${report.reason}`, 'warning');
    }

    handleReportUpdated(report) {
        // Find and update the report
        const index = this.reports.findIndex(r => r.id === report.id);
        if (index !== -1) {
            this.reports[index] = report;
            this.filteredReports = [...this.reports];
            this.renderReports();
        }
        
        // Update stats
        this.loadStats();
    }

    handleReportDeleted(reportId) {
        // Remove from the list
        this.reports = this.reports.filter(r => r.id !== reportId);
        this.filteredReports = [...this.reports];
        this.selectedReports.delete(reportId);
        
        this.renderReports();
        this.updateBulkActions();
        
        // Update stats
        this.loadStats();
    }

    updateConnectionStatus(connected) {
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${connected ? 'online' : 'offline'}`;
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'error');
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 3000;
            padding: 1rem;
            border-radius: 4px;
            max-width: 400px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        `;
        
        alert.innerHTML = `
            ${message}
            <button type="button" style="float: right; background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-left: 1rem;" onclick="this.parentElement.remove()">×</button>
        `;

        document.body.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Utility methods
    formatStatus(status) {
        const labels = {
            'pending': 'Pending',
            'reviewing': 'Reviewing',
            'resolved': 'Resolved',
            'dismissed': 'Dismissed'
        };
        return labels[status] || status;
    }

    formatPriority(priority) {
        const labels = {
            'high': 'High',
            'medium': 'Medium',
            'low': 'Low'
        };
        return labels[priority] || priority;
    }

    formatReason(reason) {
        const labels = {
            'spam': 'Spam',
            'hate_speech': 'Hate Speech',
            'harassment': 'Harassment',
            'inappropriate': 'Inappropriate',
            'other': 'Other'
        };
        return labels[reason] || reason;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public methods for other modules
    getSelectedReports() {
        return Array.from(this.selectedReports);
    }

    getReportById(id) {
        return this.reports.find(r => r.id === id);
    }

    applyFilters(filters) {
        this.filters = { ...filters };
        this.currentPage = 1;
        this.loadReports();
    }

    // Cleanup method
    destroy() {
        if (this.websocketClient) {
            this.websocketClient.disconnect();
        }
    }
}

// Global functions for inline event handlers
window.viewReport = (reportId) => {
    window.reportListManager.viewReport(reportId);
};

window.quickResolve = (reportId) => {
    window.reportListManager.quickResolve(reportId);
};

window.reviewReport = (reportId) => {
    window.reportListManager.reviewReport(reportId);
};

window.bulkAction = (action) => {
    window.reportListManager.bulkAction(action);
};

window.closeReviewModal = () => {
    window.reportListManager.closeReviewModal();
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.reportListManager = new ReportListManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.reportListManager) {
        window.reportListManager.destroy();
    }
});