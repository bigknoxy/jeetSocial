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
type ViewType = 'latest' | 'top';
interface ViewToggleOptions {
    onViewChange?: (view: ViewType) => void;
}
interface ViewToggleState {
    currentView: ViewType;
    initialized: boolean;
    hasRecentBtn: boolean;
    hasTopBtn: boolean;
    hasHeading: boolean;
}
declare class ViewToggle {
    private currentView;
    private recentBtn;
    private topBtn;
    private heading;
    private onViewChange;
    private initialized;
    constructor(options?: ViewToggleOptions);
    /**
     * Initialize view toggle
     */
    init(): boolean;
    /**
     * Initialize view from URL parameters
     */
    private initializeFromURL;
    /**
     * Set up event listeners for view toggle
     */
    private setupEventListeners;
    /**
     * Set up keyboard navigation for view tabs
     */
    private setupKeyboardNavigation;
    /**
     * Set the current view
     */
    setView(view: ViewType): void;
    /**
     * Set active state for view buttons
     */
    private setActive;
    /**
     * Activate top view
     */
    private activateTopView;
    /**
     * Activate recent view
     */
    private activateRecentView;
    /**
     * Update URL with view parameter
     */
    private updateURL;
    /**
     * Get current view
     */
    getCurrentView(): ViewType;
    /**
     * Get current state
     */
    getState(): ViewToggleState;
    /**
     * Check if a specific view is active
     */
    isViewActive(view: ViewType): boolean;
    /**
     * Reset to default view (latest)
     */
    reset(): void;
    /**
     * Destroy view toggle and clean up event listeners
     */
    destroy(): void;
}
export default ViewToggle;
