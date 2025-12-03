/**
 * Report Filter JavaScript
 * Handles filtering and searching of reports
 */

class ReportFilter {
    constructor(reportListManager) {
        this.reportListManager = reportListManager;
        this.filters = {};
        this.debounceTimer = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedFilters();
    }

    setupEventListeners() {
        // Filter change events
        document.getElementById('status-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('priority-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('reason-filter').addEventListener('change', () => {
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
                        this.clearFilters();
                        break;
                }
            }
        });
    }

    debounceSearch(query) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            // Store the search query temporarily for filtering
            this.searchQuery = query;
            this.applyFilters();
        }, 300); // 300ms delay
    }

    applyFilters() {
        this.collectFilters();
        this.saveFilters();
        this.reportListManager.applyFilters(this.filters);
        this.updateFilterUI();
    }

    collectFilters() {
        this.filters = {};

        // Status filter
        const status = document.getElementById('status-filter').value;
        if (status) {
            this.filters.status = status;
        }

        // Priority filter
        const priority = document.getElementById('priority-filter').value;
        if (priority) {
            this.filters.priority = priority;
        }

        // Reason filter
        const reason = document.getElementById('reason-filter').value;
        if (reason) {
            this.filters.reason = reason;
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
        document.getElementById('status-filter').value = '';
        document.getElementById('priority-filter').value = '';
        document.getElementById('reason-filter').value = '';
        document.getElementById('date-filter').value = '';
        document.getElementById('search-filter').value = '';

        // Clear filters object
        this.filters = {};

        // Apply empty filters
        this.reportListManager.applyFilters(this.filters);
        this.updateFilterUI();
        
        // Clear saved filters
        localStorage.removeItem('admin_report_filters');
    }

    updateFilterUI() {
        // Update filter indicators
        const activeFilters = Object.keys(this.filters).length;
        const filterSection = document.querySelector('.filters-section');
        
        if (filterSection) {
            if (activeFilters > 0) {
                filterSection.style.borderLeft = '4px solid #007bff';
            } else {
                filterSection.style.borderLeft = 'none';
            }
        }

        // Update apply filters button
        const applyBtn = document.getElementById('apply-filters');
        if (applyBtn) {
            if (activeFilters > 0) {
                applyBtn.textContent = `Apply Filters (${activeFilters})`;
                applyBtn.classList.add('btn-primary');
                applyBtn.classList.remove('btn-secondary');
            } else {
                applyBtn.textContent = 'Apply Filters';
                applyBtn.classList.remove('btn-primary');
                applyBtn.classList.add('btn-secondary');
            }
        }
    }

    saveFilters() {
        try {
            localStorage.setItem('admin_report_filters', JSON.stringify(this.filters));
        } catch (error) {
            console.warn('Failed to save filters to localStorage:', error);
        }
    }

    loadSavedFilters() {
        try {
            const saved = localStorage.getItem('admin_report_filters');
            if (saved) {
                this.filters = JSON.parse(saved);
                this.populateFilterInputs();
                this.updateFilterUI();
            }
        } catch (error) {
            console.warn('Failed to load saved filters:', error);
        }
    }

    populateFilterInputs() {
        // Status filter
        if (this.filters.status) {
            document.getElementById('status-filter').value = this.filters.status;
        }

        // Priority filter
        if (this.filters.priority) {
            document.getElementById('priority-filter').value = this.filters.priority;
        }

        // Reason filter
        if (this.filters.reason) {
            document.getElementById('reason-filter').value = this.filters.reason;
        }

        // Date filter
        if (this.filters.date_range) {
            document.getElementById('date-filter').value = this.filters.date_range;
        }

        // Search filter
        if (this.filters.search) {
            document.getElementById('search-filter').value = this.filters.search;
        }
    }

    // Advanced filtering methods
    filterByDateRange(reports, dateRange) {
        if (!dateRange) return reports;

        const now = new Date();
        let startDate;

        switch (dateRange) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return reports;
        }

        return reports.filter(report => {
            const reportDate = new Date(report.created_at);
            return reportDate >= startDate;
        });
    }

    filterBySearch(reports, searchTerm) {
        if (!searchTerm) return reports;

        const term = searchTerm.toLowerCase();
        
        return reports.filter(report => {
            // Search in content
            if (report.content && report.content.toLowerCase().includes(term)) {
                return true;
            }

            // Search in reason
            if (report.reason && report.reason.toLowerCase().includes(term)) {
                return true;
            }

            // Search in reporter username
            if (report.reported_by_username && 
                report.reported_by_username.toLowerCase().includes(term)) {
                return true;
            }

            // Search in ID
            if (report.id && report.id.toString().includes(term)) {
                return true;
            }

            return false;
        });
    }

    // Utility methods for filter presets
    applyPreset(presetName) {
        switch (presetName) {
            case 'pending_high_priority':
                this.filters = {
                    status: 'pending',
                    priority: 'high'
                };
                break;
            case 'recent_spam':
                this.filters = {
                    reason: 'spam',
                    date_range: 'week'
                };
                break;
            case 'my_pending':
                this.filters = {
                    status: 'pending',
                    assigned_to: 'me' // This would need backend support
                };
                break;
            case 'resolved_today':
                this.filters = {
                    status: 'resolved',
                    date_range: 'today'
                };
                break;
            default:
                console.warn('Unknown preset:', presetName);
                return;
        }

        this.populateFilterInputs();
        this.applyFilters();
    }

    // Export current filter configuration
    exportFilters() {
        const filterConfig = {
            filters: this.filters,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(filterConfig, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_filters_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // Import filter configuration
    importFilters(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                
                if (config.filters && typeof config.filters === 'object') {
                    this.filters = config.filters;
                    this.populateFilterInputs();
                    this.applyFilters();
                    this.reportListManager.showSuccess('Filters imported successfully');
                } else {
                    throw new Error('Invalid filter configuration');
                }
            } catch (error) {
                console.error('Failed to import filters:', error);
                this.reportListManager.showError('Failed to import filters: Invalid file format');
            }
        };

        reader.onerror = () => {
            this.reportListManager.showError('Failed to read filter file');
        };

        reader.readAsText(file);
    }

    // Get filter statistics
    getFilterStats() {
        const total = Object.keys(this.filters).length;
        const activeFilters = {};

        if (this.filters.status) activeFilters.status = this.filters.status;
        if (this.filters.priority) activeFilters.priority = this.filters.priority;
        if (this.filters.reason) activeFilters.reason = this.filters.reason;
        if (this.filters.date_range) activeFilters.date_range = this.filters.date_range;
        if (this.filters.search) activeFilters.search = this.filters.search;

        return {
            total,
            activeFilters,
            hasActiveFilters: total > 0
        };
    }

    // Public API
    getCurrentFilters() {
        return { ...this.filters };
    }

    setFilters(filters) {
        this.filters = { ...filters };
        this.populateFilterInputs();
        this.applyFilters();
    }

    resetFilters() {
        this.clearFilters();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportFilter;
} else if (typeof window !== 'undefined') {
    window.ReportFilter = ReportFilter;
}