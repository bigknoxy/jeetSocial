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

import type { StorageServiceOptions, StorageItem } from '../types/index.js';

/**
 * Storage service for managing localStorage and sessionStorage
 */
class StorageService {
  private prefix: string;
  private fallbackMemory: Record<string, any>;
  private isStorageAvailable: boolean;

  constructor(options: StorageServiceOptions = {}) {
    this.prefix = options.prefix || 'jeet_';
    this.fallbackMemory = {}; // In-memory fallback for when storage is unavailable
    this.isStorageAvailable = this.checkStorageAvailability();
  }

  /**
   * Check if localStorage and sessionStorage are available
   */
  private checkStorageAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('[StorageService] Storage not available:', (error as Error).message);
      return false;
    }
  }

  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Set item in localStorage
   */
  setLocalStorage<T = any>(key: string, value: T, options: { ttl?: number } = {}): boolean {
    if (!this.isStorageAvailable) {
      this.fallbackMemory[key] = value;
      return false;
    }

    try {
      const prefixedKey = this.getKey(key);
      const item: StorageItem = {
        value,
        timestamp: Date.now(),
        ...(options.ttl && { ttl: options.ttl })
      };
      
      localStorage.setItem(prefixedKey, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('[StorageService] localStorage set error:', error);
      return false;
    }
  }

  /**
   * Get item from localStorage
   */
  getLocalStorage<T = any>(key: string, defaultValue: T | null = null): T | null {
    if (!this.isStorageAvailable) {
      return this.fallbackMemory[key] || defaultValue;
    }

    try {
      const prefixedKey = this.getKey(key);
      const item = localStorage.getItem(prefixedKey);
      
      if (!item) {
        return defaultValue;
      }

      const parsed = JSON.parse(item) as StorageItem;
      
      // Check TTL if set
      if (parsed.ttl && Date.now() > parsed.timestamp + parsed.ttl) {
        localStorage.removeItem(prefixedKey);
        return defaultValue;
      }

      return parsed.value as T;
    } catch (error) {
      console.error('[StorageService] localStorage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeLocalStorage(key: string): boolean {
    if (!this.isStorageAvailable) {
      delete this.fallbackMemory[key];
      return true;
    }

    try {
      const prefixedKey = this.getKey(key);
      localStorage.removeItem(prefixedKey);
      return true;
    } catch (error) {
      console.error('[StorageService] localStorage remove error:', error);
      return false;
    }
  }

  /**
   * Set item in sessionStorage
   */
  setSessionStorage<T = any>(key: string, value: T, options: { ttl?: number } = {}): boolean {
    if (!this.isStorageAvailable) {
      this.fallbackMemory[`session_${key}`] = value;
      return false;
    }

    try {
      const prefixedKey = this.getKey(key);
      const item: StorageItem = {
        value,
        timestamp: Date.now(),
        ...(options.ttl && { ttl: options.ttl })
      };
      
      sessionStorage.setItem(prefixedKey, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('[StorageService] sessionStorage set error:', error);
      return false;
    }
  }

  /**
   * Get item from sessionStorage
   */
  getSessionStorage<T = any>(key: string, defaultValue: T | null = null): T | null {
    if (!this.isStorageAvailable) {
      return this.fallbackMemory[`session_${key}`] || defaultValue;
    }

    try {
      const prefixedKey = this.getKey(key);
      const item = sessionStorage.getItem(prefixedKey);
      
      if (!item) {
        return defaultValue;
      }

      const parsed = JSON.parse(item) as StorageItem;
      
      // Check TTL if set
      if (parsed.ttl && Date.now() > parsed.timestamp + parsed.ttl) {
        sessionStorage.removeItem(prefixedKey);
        return defaultValue;
      }

      return parsed.value as T;
    } catch (error) {
      console.error('[StorageService] sessionStorage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Remove item from sessionStorage
   */
  removeSessionStorage(key: string): boolean {
    if (!this.isStorageAvailable) {
      delete this.fallbackMemory[`session_${key}`];
      return true;
    }

    try {
      const prefixedKey = this.getKey(key);
      sessionStorage.removeItem(prefixedKey);
      return true;
    } catch (error) {
      console.error('[StorageService] sessionStorage remove error:', error);
      return false;
    }
  }

  /**
   * Clear all localStorage items with prefix
   */
  clearLocalStorage(): boolean {
    if (!this.isStorageAvailable) {
      this.fallbackMemory = {};
      return true;
    }

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('[StorageService] localStorage clear error:', error);
      return false;
    }
  }

  /**
   * Clear all sessionStorage items with prefix
   */
  clearSessionStorage(): boolean {
    if (!this.isStorageAvailable) {
      Object.keys(this.fallbackMemory).forEach(key => {
        if (key.startsWith('session_')) {
          delete this.fallbackMemory[key];
        }
      });
      return true;
    }

    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          sessionStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('[StorageService] sessionStorage clear error:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): {
    available: boolean;
    localStorage: { used: number; available: number };
    sessionStorage: { used: number; available: number };
    error?: string;
  } {
    if (!this.isStorageAvailable) {
      return {
        available: false,
        localStorage: { used: 0, available: 0 },
        sessionStorage: { used: 0, available: 0 }
      };
    }

    try {
      const localStorageUsed = JSON.stringify(localStorage).length;
      const sessionStorageUsed = JSON.stringify(sessionStorage).length;
      
      // Estimate available space (rough approximation)
      const estimatedQuota = 5 * 1024 * 1024; // 5MB typical limit
      
      return {
        available: true,
        localStorage: {
          used: localStorageUsed,
          available: estimatedQuota - localStorageUsed
        },
        sessionStorage: {
          used: sessionStorageUsed,
          available: estimatedQuota - sessionStorageUsed
        }
      };
    } catch (error) {
      console.error('[StorageService] Storage info error:', error);
      return { 
        available: false, 
        localStorage: { used: 0, available: 0 },
        sessionStorage: { used: 0, available: 0 },
        error: (error as Error).message 
      };
    }
  }

  /**
   * Broadcast message to other tabs via localStorage
   */
  broadcast<T = any>(key: string, message: T, options: { ttl?: number; id?: string } = {}): boolean {
    const broadcastKey = `${key}_broadcast`;
    const payload = {
      message,
      timestamp: Date.now(),
      id: options.id || Math.random().toString(36).substr(2, 9)
    };

    return this.setLocalStorage(broadcastKey, payload, { ttl: options.ttl || 1000 });
  }

  /**
   * Listen for broadcast messages from other tabs
   */
  onBroadcast<T = any>(
    key: string, 
    callback: (message: T, payload: { message: T; timestamp: number; id: string }) => void,
    options: { once?: boolean } = {}
  ): () => void {
    const broadcastKey = `${key}_broadcast`;
    
    const handler = (event: StorageEvent) => {
      if (event.key === this.getKey(broadcastKey) && event.newValue) {
        try {
          const payload = JSON.parse(event.newValue);
          if (payload.message && payload.timestamp) {
            callback(payload.message, payload);
            
            if (options.once) {
              window.removeEventListener('storage', handler);
            }
          }
        } catch (error) {
          console.error('[StorageService] Broadcast parse error:', error);
        }
      }
    };

    window.addEventListener('storage', handler);

    // Return unsubscribe function
    return () => {
      window.removeEventListener('storage', handler);
    };
  }

  /**
   * Clean up expired items
   */
  cleanup(): void {
    if (!this.isStorageAvailable) {
      return;
    }

    try {
      // Clean localStorage
      const localKeys = Object.keys(localStorage);
      localKeys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item) as StorageItem;
              if (parsed.ttl && Date.now() > parsed.timestamp + parsed.ttl) {
                localStorage.removeItem(key);
              }
            } catch {
              // Remove invalid items
              localStorage.removeItem(key);
            }
          }
        }
      });

      // Clean sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          const item = sessionStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item) as StorageItem;
              if (parsed.ttl && Date.now() > parsed.timestamp + parsed.ttl) {
                sessionStorage.removeItem(key);
              }
            } catch {
              // Remove invalid items
              sessionStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.error('[StorageService] Cleanup error:', error);
    }
  }

  /**
   * Get all keys with prefix
   */
  getKeys(storage: 'localStorage' | 'sessionStorage' = 'localStorage'): string[] {
    if (!this.isStorageAvailable) {
      return Object.keys(this.fallbackMemory).filter(key => 
        storage === 'sessionStorage' ? key.startsWith('session_') : !key.startsWith('session_')
      );
    }

    try {
      const storageObj = storage === 'sessionStorage' ? sessionStorage : localStorage;
      return Object.keys(storageObj).filter(key => key.startsWith(this.prefix));
    } catch (error) {
      console.error('[StorageService] Get keys error:', error);
      return [];
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    return this.isStorageAvailable;
  }

  /**
   * Get the current prefix
   */
  getPrefix(): string {
    return this.prefix;
  }

  /**
   * Set a new prefix (affects future operations)
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }
}

// Export for use in other modules
export default StorageService;

// Also export as named export for consistency
export { StorageService };

// Global export for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).StorageService = StorageService;
}