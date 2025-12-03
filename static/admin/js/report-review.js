/**
 * Report Review JavaScript
 * Handles the report review modal and moderation actions
 */

class ReportReview {
    constructor(reportListManager) {
        this.reportListManager = reportListManager;
        this.authClient = new AuthClient();
        this.currentReport = null;
        this.modal = null;
        
        this.init();
    }

    init() {
        this.modal = document.getElementById('review-modal');
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    async viewReport(reportId) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/admin/reports/${reportId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const report = await response.json();
            this.currentReport = report;
            this.renderReportDetails(report);
            this.openModal();
            
        } catch (error) {
            console.error('Failed to load report details:', error);
            this.reportListManager.showError('Failed to load report details');
        } finally {
            this.showLoading(false);
        }
    }

    async quickResolve(reportId) {
        try {
            const confirmed = confirm('Are you sure you want to resolve this report?');
            if (!confirmed) return;

            this.showLoading(true);

            const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'resolve',
                    reason: 'Quick resolved from reports list'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            await response.json();
            this.reportListManager.showSuccess('Report resolved successfully');
            
            // Refresh the reports list
            await this.reportListManager.refreshReports();
            
        } catch (error) {
            console.error('Failed to resolve report:', error);
            this.reportListManager.showError('Failed to resolve report');
        } finally {
            this.showLoading(false);
        }
    }

    async reviewReport(reportId) {
        await this.viewReport(reportId);
    }

    renderReportDetails(report) {
        const modalBody = document.getElementById('review-modal-body');
        
        modalBody.innerHTML = `
            <div class="report-details">
                <!-- Report Information -->
                <div class="detail-section">
                    <h4>Report Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Report ID:</label>
                            <span>${report.id}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="report-status status-${report.status}">
                                ${this.formatStatus(report.status)}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Priority:</label>
                            <span class="report-priority priority-${report.priority}">
                                ${this.formatPriority(report.priority)}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Reason:</label>
                            <span>${this.formatReason(report.reason)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Created:</label>
                            <span>${this.formatDate(report.created_at)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Reported By:</label>
                            <span>${this.escapeHtml(report.reported_by_username || 'Anonymous')}</span>
                        </div>
                    </div>
                </div>

                <!-- Reported Content -->
                <div class="detail-section">
                    <h4>Reported Content</h4>
                    <div class="content-preview">
                        <div class="post-info">
                            <strong>Post ID:</strong> ${report.post_id}<br>
                            <strong>Author:</strong> ${this.escapeHtml(report.post_author_username || 'Anonymous')}<br>
                            <strong>Posted:</strong> ${this.formatDate(report.post_created_at)}
                        </div>
                        <div class="post-content">
                            <strong>Content:</strong>
                            <div class="content-box">${this.escapeHtml(report.post_content)}</div>
                        </div>
                    </div>
                </div>

                <!-- Report History -->
                ${report.actions && report.actions.length > 0 ? `
                    <div class="detail-section">
                        <h4>Action History</h4>
                        <div class="action-history">
                            ${report.actions.map(action => `
                                <div class="action-item">
                                    <div class="action-header">
                                        <span class="action-type">${action.action_type}</span>
                                        <span class="action-time">${this.formatDate(action.created_at)}</span>
                                    </div>
                                    <div class="action-details">
                                        <strong>By:</strong> ${this.escapeHtml(action.admin_username)}<br>
                                        <strong>Reason:</strong> ${this.escapeHtml(action.reason)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Moderation Actions -->
                <div class="detail-section">
                    <h4>Moderation Actions</h4>
                    <div class="moderation-actions">
                        <div class="action-group">
                            <h5>Quick Actions</h5>
                            <div class="button-group">
                                <button class="btn btn-success" onclick="reportReview.resolveReport('resolve')">
                                    <i class="fas fa-check"></i> Resolve Report
                                </button>
                                <button class="btn btn-warning" onclick="reportReview.resolveReport('dismiss')">
                                    <i class="fas fa-times"></i> Dismiss Report
                                </button>
                            </div>
                        </div>

                        <div class="action-group">
                            <h5>Content Actions</h5>
                            <div class="button-group">
                                <button class="btn btn-danger" onclick="reportReview.deleteContent()">
                                    <i class="fas fa-trash"></i> Delete Content
                                </button>
                                <button class="btn btn-secondary" onclick="reportReview.warnUser()">
                                    <i class="fas fa-exclamation-triangle"></i> Warn User
                                </button>
                            </div>
                        </div>

                        <div class="action-group">
                            <h5>Custom Action</h5>
                            <div class="custom-action-form">
                                <div class="form-group">
                                    <label for="action-type">Action Type:</label>
                                    <select id="action-type">
                                        <option value="resolve">Resolve</option>
                                        <option value="dismiss">Dismiss</option>
                                        <option value="escalate">Escalate</option>
                                        <option value="investigate">Investigate Further</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="action-reason">Reason:</label>
                                    <textarea id="action-reason" placeholder="Enter reason for this action..." rows="3"></textarea>
                                </div>
                                <button class="btn btn-primary" onclick="reportReview.submitCustomAction()">
                                    <i class="fas fa-gavel"></i> Submit Action
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .report-details {
                    max-height: 70vh;
                    overflow-y: auto;
                }
                
                .detail-section {
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #eee;
                }
                
                .detail-section:last-child {
                    border-bottom: none;
                }
                
                .detail-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .detail-item {
                    display: flex;
                    flex-direction: column;
                }
                
                .detail-item label {
                    font-weight: bold;
                    margin-bottom: 0.25rem;
                    color: #333;
                }
                
                .content-preview {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 4px;
                    margin-top: 1rem;
                }
                
                .post-info {
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                }
                
                .content-box {
                    background: white;
                    padding: 1rem;
                    border-radius: 4px;
                    border: 1px solid #ddd;
                    margin-top: 0.5rem;
                    white-space: pre-wrap;
                    max-height: 200px;
                    overflow-y: auto;
                }
                
                .action-history {
                    margin-top: 1rem;
                }
                
                .action-item {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 4px;
                    margin-bottom: 0.5rem;
                }
                
                .action-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }
                
                .action-type {
                    font-weight: bold;
                    color: #007bff;
                }
                
                .action-time {
                    font-size: 0.85rem;
                    color: #666;
                }
                
                .action-details {
                    font-size: 0.9rem;
                }
                
                .moderation-actions {
                    margin-top: 1rem;
                }
                
                .action-group {
                    margin-bottom: 1.5rem;
                }
                
                .action-group h5 {
                    margin-bottom: 0.75rem;
                    color: #333;
                }
                
                .button-group {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .custom-action-form {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 4px;
                }
                
                .custom-action-form .form-group {
                    margin-bottom: 1rem;
                }
                
                .custom-action-form label {
                    display: block;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }
                
                .custom-action-form select,
                .custom-action-form textarea {
                    width: 100%;
                    padding: 0.5rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
            </style>
        `;
    }

    async resolveReport(action) {
        if (!this.currentReport) return;

        const reason = prompt(`Enter reason for ${action} action:`, `${action}ed from review panel`);
        if (!reason) return;

        await this.submitAction(action, reason);
    }

    async deleteContent() {
        if (!this.currentReport) return;

        const confirmed = confirm('Are you sure you want to delete this content? This action cannot be undone.');
        if (!confirmed) return;

        const reason = prompt('Enter reason for content deletion:', 'Content violates community guidelines');
        if (!reason) return;

        await this.submitAction('delete_content', reason);
    }

    async warnUser() {
        if (!this.currentReport) return;

        const reason = prompt('Enter warning message for user:', 'Your content has been reviewed and found to violate our community guidelines.');
        if (!reason) return;

        await this.submitAction('warn_user', reason);
    }

    async submitCustomAction() {
        if (!this.currentReport) return;

        const actionType = document.getElementById('action-type').value;
        const actionReason = document.getElementById('action-reason').value.trim();

        if (!actionReason) {
            alert('Please enter a reason for this action.');
            return;
        }

        await this.submitAction(actionType, actionReason);
    }

    async submitAction(action, reason) {
        try {
            this.showLoading(true);

            const response = await fetch(`/api/admin/reports/${this.currentReport.id}/action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authClient.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    reason: reason
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            await response.json();
            this.reportListManager.showSuccess(`Action completed successfully: ${action}`);
            
            // Close modal and refresh list
            this.closeModal();
            await this.reportListManager.refreshReports();
            
        } catch (error) {
            console.error('Failed to submit action:', error);
            this.reportListManager.showError('Failed to submit action');
        } finally {
            this.showLoading(false);
        }
    }

    openModal() {
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentReport = null;
    }

    showLoading(show) {
        this.reportListManager.showLoading(show);
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportReview;
} else if (typeof window !== 'undefined') {
    window.ReportReview = ReportReview;
}