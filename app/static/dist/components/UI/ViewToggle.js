/**
 * ViewToggle.ts
 *
 * Manages view toggle functionality including:
 * - Recent/Top view switching
 * - URL parameter management
 * - Accessibility features (ARIA attributes)
 * - Keyboard navigation
 * - Visual state management
 */
class ViewToggle {
    constructor(options = {}) {
        this.currentView = 'latest';
        this.recentBtn = null;
        this.topBtn = null;
        this.heading = null;
        this.onViewChange = null;
        this.initialized = false;
        this.onViewChange = options.onViewChange || null;
    }
    /**
     * Initialize view toggle
     */
    init() {
        this.recentBtn = document.getElementById('view-toggle-recent');
        this.topBtn = document.getElementById('view-toggle-top');
        this.heading = document.getElementById('feed-heading');
        if (!this.recentBtn || !this.topBtn) {
            console.debug('[ViewToggle] missing elements', {
                recentBtn: !!this.recentBtn,
                topBtn: !!this.topBtn,
                heading: !!this.heading
            });
            return false;
        }
        // Check URL for initial view
        this.initializeFromURL();
        this.setupEventListeners();
        this.setActive(this.currentView);
        this.initialized = true;
        return true;
    }
    /**
     * Initialize view from URL parameters
     */
    initializeFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        if (viewParam === 'top') {
            this.currentView = 'top';
        }
        else {
            this.currentView = 'latest';
        }
    }
    /**
     * Set up event listeners for view toggle
     */
    setupEventListeners() {
        if (!this.recentBtn || !this.topBtn)
            return;
        // Recent button click
        this.recentBtn.addEventListener('click', () => {
            if (this.currentView !== 'latest') {
                this.setView('latest');
            }
        });
        // Top button click
        this.topBtn.addEventListener('click', () => {
            if (this.currentView !== 'top') {
                this.setView('top');
            }
        });
        // Keyboard navigation
        this.setupKeyboardNavigation();
    }
    /**
     * Set up keyboard navigation for view tabs
     */
    setupKeyboardNavigation() {
        if (!this.recentBtn || !this.topBtn)
            return;
        const tabs = [this.recentBtn, this.topBtn];
        tabs.forEach((btn, index) => {
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const nextIndex = e.key === 'ArrowLeft'
                        ? (index - 1 + tabs.length) % tabs.length
                        : (index + 1) % tabs.length;
                    tabs[nextIndex].focus();
                    tabs[nextIndex].click();
                }
            });
        });
    }
    /**
     * Set the current view
     */
    setView(view) {
        if (this.currentView === view)
            return;
        this.currentView = view;
        this.setActive(view);
        this.updateURL(view);
        // Call callback if provided
        if (this.onViewChange) {
            this.onViewChange(view);
        }
    }
    /**
     * Set active state for view buttons
     */
    setActive(view) {
        if (view === 'top') {
            this.activateTopView();
        }
        else {
            this.activateRecentView();
        }
    }
    /**
     * Activate top view
     */
    activateTopView() {
        if (!this.recentBtn || !this.topBtn)
            return;
        this.recentBtn.classList.remove('active');
        this.topBtn.classList.add('active');
        this.recentBtn.setAttribute('aria-selected', 'false');
        this.topBtn.setAttribute('aria-selected', 'true');
        this.recentBtn.setAttribute('tabindex', '-1');
        this.topBtn.setAttribute('tabindex', '0');
        this.topBtn.focus();
        if (this.heading) {
            this.heading.textContent = 'Top Posts — last 24 hours';
        }
    }
    /**
     * Activate recent view
     */
    activateRecentView() {
        if (!this.recentBtn || !this.topBtn)
            return;
        this.recentBtn.classList.add('active');
        this.topBtn.classList.remove('active');
        this.recentBtn.setAttribute('aria-selected', 'true');
        this.topBtn.setAttribute('aria-selected', 'false');
        this.recentBtn.setAttribute('tabindex', '0');
        this.topBtn.setAttribute('tabindex', '-1');
        this.recentBtn.focus();
        if (this.heading) {
            this.heading.textContent = 'Recent Posts';
        }
    }
    /**
     * Update URL with view parameter
     */
    updateURL(view) {
        const url = new URL(window.location.href);
        if (view === 'top') {
            url.searchParams.set('view', 'top');
        }
        else {
            url.searchParams.delete('view');
        }
        window.history.pushState({}, '', url);
    }
    /**
     * Get current view
     */
    getCurrentView() {
        return this.currentView;
    }
    /**
     * Get current state
     */
    getState() {
        return {
            currentView: this.currentView,
            initialized: this.initialized,
            hasRecentBtn: !!this.recentBtn,
            hasTopBtn: !!this.topBtn,
            hasHeading: !!this.heading
        };
    }
    /**
     * Check if a specific view is active
     */
    isViewActive(view) {
        return this.currentView === view;
    }
    /**
     * Reset to default view (latest)
     */
    reset() {
        this.setView('latest');
    }
    /**
     * Destroy view toggle and clean up event listeners
     */
    destroy() {
        // Note: Event listener cleanup for bound methods requires storing references
        // This is a simplified cleanup - in production, store bound function references
        if (this.recentBtn) {
            this.recentBtn.replaceWith(this.recentBtn.cloneNode(true));
        }
        if (this.topBtn) {
            this.topBtn.replaceWith(this.topBtn.cloneNode(true));
        }
        this.initialized = false;
    }
}
// Export for use in other modules
export default ViewToggle;
//# sourceMappingURL=ViewToggle.js.map