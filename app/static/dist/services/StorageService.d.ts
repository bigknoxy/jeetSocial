/**
 * StorageService.ts
 *
 * Centralized storage management service including:
 * - localStorage operations
 * - sessionStorage operations
 * - Cross-tab communication
 * - Storage quota management
 * - Error handling and fallbacks
 */
import type { StorageServiceOptions } from '../types/index.js';
/**
 * Storage service for managing localStorage and sessionStorage
 */
declare class StorageService {
    private prefix;
    private fallbackMemory;
    private isStorageAvailable;
    constructor(options?: StorageServiceOptions);
    /**
     * Check if localStorage and sessionStorage are available
     */
    private checkStorageAvailability;
    /**
     * Get prefixed key
     */
    private getKey;
    /**
     * Set item in localStorage
     */
    setLocalStorage<T = any>(key: string, value: T, options?: {
        ttl?: number;
    }): boolean;
    /**
     * Get item from localStorage
     */
    getLocalStorage<T = any>(key: string, defaultValue?: T | null): T | null;
    /**
     * Remove item from localStorage
     */
    removeLocalStorage(key: string): boolean;
    /**
     * Set item in sessionStorage
     */
    setSessionStorage<T = any>(key: string, value: T, options?: {
        ttl?: number;
    }): boolean;
    /**
     * Get item from sessionStorage
     */
    getSessionStorage<T = any>(key: string, defaultValue?: T | null): T | null;
    /**
     * Remove item from sessionStorage
     */
    removeSessionStorage(key: string): boolean;
    /**
     * Clear all localStorage items with prefix
     */
    clearLocalStorage(): boolean;
    /**
     * Clear all sessionStorage items with prefix
     */
    clearSessionStorage(): boolean;
    /**
     * Get storage usage information
     */
    getStorageInfo(): {
        available: boolean;
        localStorage: {
            used: number;
            available: number;
        };
        sessionStorage: {
            used: number;
            available: number;
        };
        error?: string;
    };
    /**
     * Broadcast message to other tabs via localStorage
     */
    broadcast<T = any>(key: string, message: T, options?: {
        ttl?: number;
        id?: string;
    }): boolean;
    /**
     * Listen for broadcast messages from other tabs
     */
    onBroadcast<T = any>(key: string, callback: (message: T, payload: {
        message: T;
        timestamp: number;
        id: string;
    }) => void, options?: {
        once?: boolean;
    }): () => void;
    /**
     * Clean up expired items
     */
    cleanup(): void;
    /**
     * Get all keys with prefix
     */
    getKeys(storage?: 'localStorage' | 'sessionStorage'): string[];
    /**
     * Check if storage is available
     */
    isAvailable(): boolean;
    /**
     * Get the current prefix
     */
    getPrefix(): string;
    /**
     * Set a new prefix (affects future operations)
     */
    setPrefix(prefix: string): void;
}
export default StorageService;
export { StorageService };
