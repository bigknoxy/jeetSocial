/**
 * Store.ts - Centralized State Management for jeetSocial
 *
 * Provides a reactive state management system with subscription patterns.
 * Replaces global variables and enables better state tracking for debugging.
 */
/**
 * Store class for centralized state management
 */
class Store {
    constructor() {
        // Core application state
        this.state = {
            // Pagination state
            pagination: {
                currentPage: 1,
                totalPages: 1,
                pageLimit: 20,
                currentView: 'latest' // 'latest' or 'top'
            },
            // Feed state
            feed: {
                posts: [],
                isLoading: false,
                lastUpdated: null,
                hasNewPosts: false
            },
            // Live polling state
            polling: {
                intervalId: null,
                isActive: false,
                interval: 15000 // 15 seconds
            },
            // UI state
            ui: {
                newPostsBannerVisible: false,
                characterCount: 0,
                isSubmitting: false
            },
            // User session state
            session: {
                username: null,
                kindnessPoints: 0
            },
            // Real-time connection state
            realtime: {
                connected: false,
                reconnectAttempts: 0,
                maxReconnectAttempts: 5
            }
        };
        // Subscribers for state changes
        this.subscribers = new Map();
        // Debug mode flag
        this.debug = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
        // Initialize with localStorage if available
        this.initializeFromStorage();
    }
    /**
     * Initialize state from localStorage
     */
    initializeFromStorage() {
        try {
            const savedView = localStorage.getItem('jeet_current_view');
            if (savedView && ['latest', 'top'].includes(savedView)) {
                this.state.pagination.currentView = savedView;
            }
            const savedUsername = localStorage.getItem('jeet_username');
            if (savedUsername) {
                this.state.session.username = savedUsername;
            }
            const savedKindnessPoints = localStorage.getItem('jeet_kindness_points');
            if (savedKindnessPoints) {
                this.state.session.kindnessPoints = parseInt(savedKindnessPoints, 10) || 0;
            }
        }
        catch (error) {
            console.warn('[Store] Failed to initialize from localStorage:', error);
        }
    }
    /**
     * Get current state (immutable copy)
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    /**
     * Get specific state path
     */
    getPath(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    /**
     * Update state with new values
     */
    setState(updates, source = 'unknown') {
        const prevState = this.getState();
        // Apply updates
        if (typeof updates === 'function') {
            updates(this.state);
        }
        else {
            this.mergeDeep(this.state, updates);
        }
        // Notify subscribers
        this.notifySubscribers(prevState, this.state, source);
        // Persist to localStorage if needed
        this.persistToStorage(updates);
        // Debug logging
        if (this.debug) {
            console.debug(`[Store] State updated from ${source}:`, {
                updates,
                prevState,
                newState: this.getState()
            });
        }
    }
    /**
     * Subscribe to state changes
     */
    subscribe(path, callback, options = {}) {
        const id = options.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.subscribers.set(id, {
            path,
            callback: callback,
            options,
            lastValue: this.getPath(path)
        });
        if (this.debug) {
            console.debug(`[Store] Subscriber added: ${id} for path: ${path}`);
        }
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(id);
            if (this.debug) {
                console.debug(`[Store] Subscriber removed: ${id}`);
            }
        };
    }
    /**
     * Notify subscribers of state changes
     */
    notifySubscribers(prevState, newState, source) {
        for (const [id, subscriber] of this.subscribers) {
            const prevValue = subscriber.path.split('.').reduce((obj, key) => obj?.[key], prevState);
            const newValue = subscriber.path.split('.').reduce((obj, key) => obj?.[key], newState);
            // Only notify if value actually changed
            if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
                try {
                    subscriber.callback(newValue, prevValue, {
                        path: subscriber.path,
                        source,
                        timestamp: Date.now()
                    });
                    subscriber.lastValue = newValue;
                }
                catch (error) {
                    console.error(`[Store] Error in subscriber ${id}:`, error);
                }
            }
        }
    }
    /**
     * Persist relevant state to localStorage
     */
    persistToStorage(updates) {
        try {
            const updateObj = updates;
            if (updateObj.pagination?.currentView) {
                localStorage.setItem('jeet_current_view', updateObj.pagination.currentView);
            }
            if (updateObj.session?.username) {
                localStorage.setItem('jeet_username', updateObj.session.username);
            }
            if (updateObj.session?.kindnessPoints !== undefined) {
                localStorage.setItem('jeet_kindness_points', updateObj.session.kindnessPoints.toString());
            }
        }
        catch (error) {
            console.warn('[Store] Failed to persist to localStorage:', error);
        }
    }
    /**
     * Deep merge objects
     */
    mergeDeep(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                this.mergeDeep(target[key], source[key]);
            }
            else {
                target[key] = source[key];
            }
        }
    }
    /**
     * Reset state to defaults
     */
    reset(path) {
        if (path) {
            // Reset specific path
            const pathParts = path.split('.');
            const target = pathParts.slice(0, -1).reduce((obj, key) => obj[key], this.state);
            const key = pathParts[pathParts.length - 1];
            // Get default value
            const defaultState = new Store().state;
            const defaultValue = pathParts.reduce((obj, k) => obj?.[k], defaultState);
            target[key] = defaultValue;
        }
        else {
            // Reset entire state
            this.state = new Store().state;
        }
    }
    /**
     * Get state statistics for debugging
     */
    getStats() {
        return {
            subscriberCount: this.subscribers.size,
            stateKeys: Object.keys(this.state).length,
            pollingActive: this.state.polling.isActive,
            realtimeConnected: this.state.realtime.connected,
            postsCount: this.state.feed.posts.length,
            currentPage: this.state.pagination.currentPage
        };
    }
}
// Create singleton instance
const store = new Store();
// Export for use in modules
export default store;
// Also export as named export for consistency
export { Store };
// Global export for backward compatibility
if (typeof window !== 'undefined') {
    window.Store = store;
}
//# sourceMappingURL=Store.js.map