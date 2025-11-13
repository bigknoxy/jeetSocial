/**
 * Store.ts - Centralized State Management for jeetSocial
 *
 * Provides a reactive state management system with subscription patterns.
 * Replaces global variables and enables better state tracking for debugging.
 */
import type { AppState, StateUpdate, SubscriptionOptions, SubscriptionMetadata, DebugInfo } from '../types/index.js';
/**
 * Store class for centralized state management
 */
declare class Store {
    private state;
    private subscribers;
    private debug;
    constructor();
    /**
     * Initialize state from localStorage
     */
    private initializeFromStorage;
    /**
     * Get current state (immutable copy)
     */
    getState(): AppState;
    /**
     * Get specific state path
     */
    getPath<T = any>(path: string): T;
    /**
     * Update state with new values
     */
    setState(updates: StateUpdate, source?: string): void;
    /**
     * Subscribe to state changes
     */
    subscribe<T = any>(path: string, callback: (newValue: T, prevValue: T, metadata: SubscriptionMetadata) => void, options?: SubscriptionOptions): () => void;
    /**
     * Notify subscribers of state changes
     */
    private notifySubscribers;
    /**
     * Persist relevant state to localStorage
     */
    private persistToStorage;
    /**
     * Deep merge objects
     */
    private mergeDeep;
    /**
     * Reset state to defaults
     */
    reset(path?: string): void;
    /**
     * Get state statistics for debugging
     */
    getStats(): DebugInfo;
}
declare const store: Store;
export default store;
export { Store };
