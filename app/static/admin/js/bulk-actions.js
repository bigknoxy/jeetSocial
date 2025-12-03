/**
 * Bulk Actions JavaScript
 * Handles bulk moderation actions on selected reports
 */

class BulkActions {
    constructor(reportListManager) {
        this.reportListManager = reportListManager;
        this.authClient = new AuthClient();
        
        this.init();
    }

    init() {
        // Bulk actions are handled through global functions
        // This class provides the implementation
    }

    async bulkAction(action) {
        const selectedReports = this.reportListManager.getSelectedReports();
        
        if (selectedReports.length === 0) {
            this.reportListManager.showError('No reports selected');
            return;
        }

        const confirmed = this.confirmAction(action, selectedReports.length);
        if (!confirmed) return;

        try {
            this.reportListManager.showLoading(true);

            const response = await fetch('/api/admin/reports/bulk-action', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    report_ids: selectedReports,
                    reason: this.getBulkActionReason(action)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            this.reportListManager.showSuccess(
                `Successfully ${action}d ${result.processed || selectedReports.length} reports`
            );
            
            // Clear selection and refresh
            this.clearSelection();
            await this.reportListManager.refreshReports();
            
        } catch (error) {
            console.error('Failed to perform bulk action:', error);
            this.reportListManager.showError('Failed to perform bulk action');
        } finally {
            this.reportListManager.showLoading(false);
        }
    }

    confirmAction(action, count) {
        const messages = {
            'resolve': `Resolve ${count} selected reports? This will mark them as resolved and close them.`,
            'dismiss': `Dismiss ${count} selected reports? This will mark them as dismissed without further action.`,
            'delete': `Delete content for ${count} selected reports? This action cannot be undone.`,
            'escalate': `Escalate ${count} selected reports to senior moderators?`,
            'assign': `Assign ${count} selected reports to yourself?`
        };

        const message = messages[action] || `Perform ${action} on ${count} selected reports?`;
        return confirm(message);
    }

    getBulkActionReason(action) {
        const reasons = {
            'resolve': 'Bulk resolved from reports list',
            'dismiss': 'Bulk dismissed from reports list',
            'delete': 'Bulk content deletion from reports list',
            'escalate': 'Bulk escalated to senior moderators',
            'assign': 'Bulk assigned to moderator'
        };

        return reasons[action] || `Bulk ${action} action`;
    }

    clearSelection() {
        // Clear all checkboxes
        document.querySelectorAll('.report-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Clear select all checkbox
        const selectAll = document.getElementById('select-all');
        if (selectAll) {
            selectAll.checked = false;
        }

        // Clear selected reports set
        this.reportListManager.selectedReports.clear();
        this.reportListManager.updateBulkActions();
    }

    async bulkAssign(assigneeId) {
        const selectedReports = this.reportListManager.getSelectedReports();
        
        if (selectedReports.length === 0) {
            this.reportListManager.showError('No reports selected');
            return;
        }

        try {
            this.reportListManager.showLoading(true);

            const response = await fetch('/api/admin/reports/bulk-assign', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    report_ids: selectedReports,
                    assigned_to: assigneeId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            this.reportListManager.showSuccess(
                `Successfully assigned ${result.assigned || selectedReports.length} reports`
            );
            
            this.clearSelection();
            await this.reportListManager.refreshReports();
            
        } catch (error) {
            console.error('Failed to assign reports:', error);
            this.reportListManager.showError('Failed to assign reports');
        } finally {
            this.reportListManager.showLoading(false);
        }
    }

    async bulkUpdatePriority(priority) {
        const selectedReports = this.reportListManager.getSelectedReports();
        
        if (selectedReports.length === 0) {
            this.reportListManager.showError('No reports selected');
            return;
        }

        try {
            this.reportListManager.showLoading(true);

            const response = await fetch('/api/admin/reports/bulk-priority', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    report_ids: selectedReports,
                    priority: priority
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            this.reportListManager.showSuccess(
                `Successfully updated priority for ${result.updated || selectedReports.length} reports`
            );
            
            this.clearSelection();
            await this.reportListManager.refreshReports();
            
        } catch (error) {
            console.error('Failed to update priority:', error);
            this.reportListManager.showError('Failed to update priority');
        } finally {
            this.reportListManager.showLoading(false);
        }
    }

    async bulkAddTag(tag) {
        const selectedReports = this.reportListManager.getSelectedReports();
        
        if (selectedReports.length === 0) {
            this.reportListManager.showError('No reports selected');
            return;
        }

        try {
            this.reportListManager.showLoading(true);

            const response = await fetch('/api/admin/reports/bulk-tag', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    report_ids: selectedReports,
                    tag: tag
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            this.reportListManager.showSuccess(
                `Successfully added tag to ${result.tagged || selectedReports.length} reports`
            );
            
            this.clearSelection();
            await this.reportListManager.refreshReports();
            
        } catch (error) {
            console.error('Failed to add tag:', error);
            this.reportListManager.showError('Failed to add tag');
        } finally {
            this.reportListManager.showLoading(false);
        }
    }

    async bulkExport(format = 'csv') {
        const selectedReports = this.reportListManager.getSelectedReports();
        
        if (selectedReports.length === 0) {
            this.reportListManager.showError('No reports selected');
            return;
        }

        try {
            this.reportListManager.showLoading(true);

            const response = await fetch('/api/admin/reports/bulk-export', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    report_ids: selectedReports,
                    format: format
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `selected_reports_export_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.reportListManager.showSuccess('Selected reports exported successfully');
            
        } catch (error) {
            console.error('Failed to export reports:', error);
            this.reportListManager.showError('Failed to export reports');
        } finally {
            this.reportListManager.showLoading(false);
        }
    }

    // Advanced bulk actions
    showBulkActionsModal() {
        const selectedReports = this.reportListManager.getSelectedReports();
        
        if (selectedReports.length === 0) {
            this.reportListManager.showError('No reports selected');
            return;
        }

        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Bulk Actions (${selectedReports.length} selected)</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="bulk-actions-grid">
                        <div class="action-category">
                            <h4>Status Actions</h4>
                            <div class="action-buttons">
                                <button class="btn btn-success" onclick="bulkActions.bulkAction('resolve')">
                                    <i class="fas fa-check"></i> Resolve All
                                </button>
                                <button class="btn btn-warning" onclick="bulkActions.bulkAction('dismiss')">
                                    <i class="fas fa-times"></i> Dismiss All
                                </button>
                            </div>
                        </div>
                        
                        <div class="action-category">
                            <h4>Content Actions</h4>
                            <div class="action-buttons">
                                <button class="btn btn-danger" onclick="bulkActions.bulkAction('delete')">
                                    <i class="fas fa-trash"></i> Delete Content
                                </button>
                                <button class="btn btn-secondary" onclick="bulkActions.showAssignModal()">
                                    <i class="fas fa-user"></i> Assign
                                </button>
                            </div>
                        </div>
                        
                        <div class="action-category">
                            <h4>Priority Actions</h4>
                            <div class="action-buttons">
                                <button class="btn btn-danger" onclick="bulkActions.bulkUpdatePriority('high')">
                                    <i class="fas fa-arrow-up"></i> Set High
                                </button>
                                <button class="btn btn-warning" onclick="bulkActions.bulkUpdatePriority('medium')">
                                    <i class="fas fa-minus"></i> Set Medium
                                </button>
                                <button class="btn btn-secondary" onclick="bulkActions.bulkUpdatePriority('low')">
                                    <i class="fas fa-arrow-down"></i> Set Low
                                </button>
                            </div>
                        </div>
                        
                        <div class="action-category">
                            <h4>Export Actions</h4>
                            <div class="action-buttons">
                                <button class="btn btn-primary" onclick="bulkActions.bulkExport('csv')">
                                    <i class="fas fa-file-csv"></i> Export CSV
                                </button>
                                <button class="btn btn-primary" onclick="bulkActions.bulkExport('json')">
                                    <i class="fas fa-file-code"></i> Export JSON
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .bulk-actions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 2rem;
                    margin-top: 1rem;
                }
                
                .action-category h4 {
                    margin-bottom: 1rem;
                    color: #333;
                }
                
                .action-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .action-buttons .btn {
                    justify-content: flex-start;
                }
            </style>
        `;

        document.body.appendChild(modal);
    }

    showAssignModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Assign Reports</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="assignee">Assign to:</label>
                        <select id="assignee">
                            <option value="">Select moderator...</option>
                            <option value="me">Me</option>
                            <option value="unassigned">Unassigned</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="bulkActions.confirmAssign()">
                            Assign Reports
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Load moderators list
        this.loadModerators(modal.querySelector('#assignee'));
    }

    async loadModerators(selectElement) {
        try {
            const response = await fetch('/api/admin/moderators', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (response.ok) {
                const moderators = await response.json();
                
                moderators.forEach(moderator => {
                    const option = document.createElement('option');
                    option.value = moderator.id;
                    option.textContent = moderator.username;
                    selectElement.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load moderators:', error);
        }
    }

    confirmAssign() {
        const selectElement = document.getElementById('assignee');
        const assigneeId = selectElement.value;
        
        if (!assigneeId) {
            alert('Please select a moderator to assign to');
            return;
        }

        this.bulkAssign(assigneeId);
        document.querySelector('.modal').remove();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BulkActions;
} else if (typeof window !== 'undefined') {
    window.BulkActions = BulkActions;
}