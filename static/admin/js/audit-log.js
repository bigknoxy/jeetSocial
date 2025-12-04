/**
 * Audit Log JavaScript
 * Handles audit log viewing, filtering, and management
 */

class AuditLog {
    constructor() {
        this.authClient = new AdminAuth();
        this.websocketClient = null;
        this.auditEntries = [];
        this.filteredEntries = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalPages = 0;
        this.totalRecords = 0;
        this.filters = {};
        this.sortField = 'timestamp';
        this.sortDirection = 'desc';
        this.debounceTimer = null;
        
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
            await this.loadAuditLog();
            await this.loadStats();
            await this.loadAdmins();
            
            console.log('Audit Log initialized successfully');
        } catch (error) {
            console.error('Failed to initialize audit log:', error);
            this.showError('Failed to initialize audit log. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.authClient.logout();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshAuditLog();
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportAuditLog();
        });

        // Filter events
        document.getElementById('action-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('admin-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('target-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('date-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        // Search with debouncing
        document.getElementById('search-filter').addEventListener('input', (e) => {
            this.debounceSearch(e.target.value);
        });

        // Filter action buttons
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderAuditLog();
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.renderAuditLog();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        document.getElementById('search-filter').focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshAuditLog();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportAuditLog();
                        break;
                }
            }
        });
    }

    setupWebSocket() {
        try {
            this.websocketClient = new WebSocketClient({
                onConnect: () => {
                    console.log('Audit Log WebSocket connected');
                    this.updateConnectionStatus(true);
                },
                onDisconnect: () => {
                    console.log('Audit Log WebSocket disconnected');
                    this.updateConnectionStatus(false);
                },
                onMessage: (message) => {
                    this.handleWebSocketMessage(message);
                },
                onError: (error) => {
                    console.error('Audit Log WebSocket error:', error);
                    this.updateConnectionStatus(false);
                }
            });

            this.websocketClient.connect();
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
            this.updateConnectionStatus(false);
        }
    }

    async loadAuditLog() {
        try {
            this.showLoading(true);
            
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                sort: this.sortField,
                direction: this.sortDirection,
                ...this.filters
            });

            const response = await fetch(`/api/admin/audit-log?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            this.auditEntries = data.entries || [];
            this.totalRecords = data.total || 0;
            this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
            
            this.filteredEntries = [...this.auditEntries];
            this.renderAuditLog();
            this.updatePagination();
            
        } catch (error) {
            console.error('Failed to load audit log:', error);
            this.showError('Failed to load audit log');
            this.renderEmptyState();
        } finally {
            this.showLoading(false);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/audit-log/stats', {
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
                total_entries: 0,
                today_entries: 0,
                active_admins: 0,
                moderation_actions: 0
            });
        }
    }

    async loadAdmins() {
        try {
            const response = await fetch('/api/admin/admins', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (response.ok) {
                const admins = await response.json();
                this.populateAdminFilter(admins);
            }
        } catch (error) {
            console.error('Failed to load admins:', error);
        }
    }

    renderAuditLog() {
        const tbody = document.getElementById('audit-tbody');
        if (!tbody) return;

        if (this.filteredEntries.length === 0) {
            this.renderEmptyState();
            return;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredEntries.length);
        const pageEntries = this.filteredEntries.slice(startIndex, endIndex);

        tbody.innerHTML = pageEntries.map(entry => `
            <tr data-entry-id="${entry.id}">
                <td>${this.formatDate(entry.timestamp)}</td>
                <td>
                    <span class="action-type action-${entry.action_type}">
                        ${this.formatAction(entry.action_type)}
                    </span>
                </td>
                <td>${this.escapeHtml(entry.admin_username || 'System')}</td>
                <td>${this.formatTarget(entry.target_type, entry.target_id)}</td>
                <td class="audit-details" title="${this.escapeHtml(entry.details || '')}">
                    ${this.escapeHtml(entry.details || 'No details')}
                </td>
                <td>${entry.ip_address || '-'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="auditLog.viewDetails(${entry.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');

        this.updatePaginationInfo(startIndex + 1, endIndex);
    }

    renderEmptyState() {
        const tbody = document.getElementById('audit-tbody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-inbox" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <div style="color: #666;">No audit entries found</div>
                    <div style="color: #999; font-size: 0.9rem; margin-top: 0.5rem;">
                        Try adjusting your filters or check back later
                    </div>
                </td>
            </tr>
        `;
    }

    updateStatsDisplay(stats) {
        this.updateElement('total-entries', stats.total_entries || 0);
        this.updateElement('today-entries', stats.today_entries || 0);
        this.updateElement('active-admins', stats.active_admins || 0);
        this.updateElement('moderation-actions', stats.moderation_actions || 0);
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

    populateAdminFilter(admins) {
        const select = document.getElementById('admin-filter');
        if (!select) return;

        admins.forEach(admin => {
            const option = document.createElement('option');
            option.value = admin.id;
            option.textContent = admin.username;
            select.appendChild(option);
        });
    }

    debounceSearch(query) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            // Store search query temporarily for filtering
            this.searchQuery = query;
            this.applyFilters();
        }, 300); // 300ms delay
    }

    applyFilters() {
        this.collectFilters();
        this.currentPage = 1;
        this.loadAuditLog();
    }

    collectFilters() {
        this.filters = {};

        // Action filter
        const action = document.getElementById('action-filter').value;
        if (action) {
            this.filters.action_type = action;
        }

        // Admin filter
        const admin = document.getElementById('admin-filter').value;
        if (admin) {
            this.filters.admin_id = admin;
        }

        // Target filter
        const target = document.getElementById('target-filter').value;
        if (target) {
            this.filters.target_type = target;
        }

        // Date filter
        const dateRange = document.getElementById('date-filter').value;
        if (dateRange) {
            this.filters.date_range = dateRange;
        }

        // Search filter
        const search = document.getElementById('search-filter').value.trim();
        if (search) {
            this.filters.search = search;
        }
    }

    clearFilters() {
        // Reset all filter inputs
        document.getElementById('action-filter').value = '';
        document.getElementById('admin-filter').value = '';
        document.getElementById('target-filter').value = '';
        document.getElementById('date-filter').value = '';
        document.getElementById('search-filter').value = '';

        // Clear filters object
        this.filters = {};

        // Apply empty filters
        this.currentPage = 1;
        this.loadAuditLog();
    }

    async refreshAuditLog() {
        try {
            const button = document.getElementById('refresh-btn');
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
            button.disabled = true;

            await Promise.all([
                this.loadAuditLog(),
                this.loadStats()
            ]);
            
            button.innerHTML = originalContent;
            button.disabled = false;
            
            this.showSuccess('Audit log refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh audit log:', error);
            this.showError('Failed to refresh audit log');
        }
    }

    async exportAuditLog() {
        try {
            this.showLoading(true);
            
            const queryParams = new URLSearchParams({
                export: 'true',
                ...this.filters
            });

            const response = await fetch(`/api/admin/audit-log/export?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Download file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_log_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showSuccess('Audit log exported successfully');
        } catch (error) {
            console.error('Failed to export audit log:', error);
            this.showError('Failed to export audit log');
        } finally {
            this.showLoading(false);
        }
    }

    async viewDetails(entryId) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/admin/audit-log/${entryId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const entry = await response.json();
            this.renderEntryDetails(entry);
            this.openDetailModal();
            
        } catch (error) {
            console.error('Failed to load entry details:', error);
            this.showError('Failed to load entry details');
        } finally {
            this.showLoading(false);
        }
    }

    renderEntryDetails(entry) {
        const modalBody = document.getElementById('detail-modal-body');
        
        modalBody.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Entry ID:</label>
                    <span>${entry.id}</span>
                </div>
                <div class="detail-item">
                    <label>Timestamp:</label>
                    <span>${this.formatDate(entry.timestamp)}</span>
                </div>
                <div class="detail-item">
                    <label>Action:</label>
                    <span class="action-type action-${entry.action_type}">
                        ${this.formatAction(entry.action_type)}
                    </span>
                </div>
                <div class="detail-item">
                    <label>Admin:</label>
                    <span>${this.escapeHtml(entry.admin_username || 'System')}</span>
                </div>
                <div class="detail-item">
                    <label>Target Type:</label>
                    <span>${entry.target_type || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>Target ID:</label>
                    <span>${entry.target_id || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>IP Address:</label>
                    <span>${entry.ip_address || '-'}</span>
                </div>
                <div class="detail-item">
                    <label>User Agent:</label>
                    <span>${this.escapeHtml(entry.user_agent || '-')}</span>
                </div>
            </div>

            <div class="detail-section">
                <h4>Details</h4>
                <pre>${this.escapeHtml(entry.details || 'No details available')}</pre>
            </div>

            ${entry.previous_values ? `
                <div class="detail-section">
                    <h4>Previous Values</h4>
                    <pre>${JSON.stringify(entry.previous_values, null, 2)}</pre>
                </div>
            ` : ''}

            ${entry.new_values ? `
                <div class="detail-section">
                    <h4>New Values</h4>
                    <pre>${JSON.stringify(entry.new_values, null, 2)}</pre>
                </div>
            ` : ''}

            <style>
                .detail-section {
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #eee;
                }
                
                .detail-section:last-child {
                    border-bottom: none;
                }
                
                .detail-section h4 {
                    margin-bottom: 1rem;
                    color: #333;
                }
                
                .detail-section pre {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 4px;
                    overflow-x: auto;
                    font-size: 0.85rem;
                    max-height: 300px;
                    overflow-y: auto;
                }
            </style>
        `;
    }

    handleWebSocketMessage(message) {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'audit_entry') {
                this.handleNewAuditEntry(data.payload);
            }
        } catch (error) {
            console.error('Failed to handle WebSocket message:', error);
        }
    }

    handleNewAuditEntry(entry) {
        // Add to the beginning of the list
        this.auditEntries.unshift(entry);
        this.filteredEntries = [...this.auditEntries];
        
        // Re-render if on first page
        if (this.currentPage === 1) {
            this.renderAuditLog();
        }
        
        // Update stats
        this.loadStats();
        
        // Show notification
        this.showAlert(`New audit entry: ${this.formatAction(entry.action_type)}`, 'info');
    }

    openDetailModal() {
        const modal = document.getElementById('detail-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
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
    formatAction(action) {
        const labels = {
            'login': 'Login',
            'logout': 'Logout',
            'create': 'Create',
            'update': 'Update',
            'delete': 'Delete',
            'moderate': 'Moderate',
            'view': 'View',
            'export': 'Export'
        };
        return labels[action] || action;
    }

    formatTarget(type, id) {
        if (!type) return '-';
        return `${type} #${id}`;
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

    // Cleanup method
    destroy() {
        if (this.websocketClient) {
            this.websocketClient.disconnect();
        }
    }
}

// Global function for modal close
window.closeDetailModal = () => {
    const modal = document.getElementById('detail-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.auditLog = new AuditLog();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.auditLog) {
        window.auditLog.destroy();
    }
});