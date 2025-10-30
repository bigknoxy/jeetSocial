/**
 * StorageService.js
 * 
 * Centralized storage management service including:
 * - localStorage operations
 * - sessionStorage operations
 * - Cross-tab communication
 * - Storage quota management
 * - Error handling and fallbacks
 */

class StorageService {
  constructor(options = {}) {
    this.prefix = options.prefix || 'jeet_';
    this.fallbackMemory = {}; // In-memory fallback for when storage is unavailable
    this.isStorageAvailable = this.checkStorageAvailability();
  }

  /**
   * Check if localStorage and sessionStorage are available
   */
  checkStorageAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('[StorageService] Storage not available:', error.message);
      return false;
    }
  }

  /**
   * Get prefixed key
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Set item in localStorage
   */
  setLocalStorage(key, value, options = {}) {
    if (!this.isStorageAvailable) {
      this.fallbackMemory[key] = value;
      return false;
    }

    try {
      const prefixedKey = this.getKey(key);
      const item = {
        value,
        timestamp: Date.now(),
        ttl: options.ttl || null
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
  getLocalStorage(key, defaultValue = null) {
    if (!this.isStorageAvailable) {
      return this.fallbackMemory[key] || defaultValue;
    }

    try {
      const prefixedKey = this.getKey(key);
      const item = localStorage.getItem(prefixedKey);
      
      if (!item) {
        return defaultValue;
      }

      const parsed = JSON.parse(item);
      
      // Check TTL if set
      if (parsed.ttl && Date.now() > parsed.timestamp + parsed.ttl) {
        localStorage.removeItem(prefixedKey);
        return defaultValue;
      }

      return parsed.value;
    } catch (error) {
      console.error('[StorageService] localStorage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeLocalStorage(key) {
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
  setSessionStorage(key, value, options = {}) {
    if (!this.isStorageAvailable) {
      this.fallbackMemory[`session_${key}`] = value;
      return false;
    }

    try {
      const prefixedKey = this.getKey(key);
      const item = {
        value,
        timestamp: Date.now(),
        ttl: options.ttl || null
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
  getSessionStorage(key, defaultValue = null) {
    if (!this.isStorageAvailable) {
      return this.fallbackMemory[`session_${key}`] || defaultValue;
    }

    try {
      const prefixedKey = this.getKey(key);
      const item = sessionStorage.getItem(prefixedKey);
      
      if (!item) {
        return defaultValue;
      }

      const parsed = JSON.parse(item);
      
      // Check TTL if set
      if (parsed.ttl && Date.now() > parsed.timestamp + parsed.ttl) {
        sessionStorage.removeItem(prefixedKey);
        return defaultValue;
      }

      return parsed.value;
    } catch (error) {
      console.error('[StorageService] sessionStorage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Remove item from sessionStorage
   */
  removeSessionStorage(key) {
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
  clearLocalStorage() {
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
  clearSessionStorage() {
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
  getStorageInfo() {
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
      return { available: false, error: error.message };
    }
  }

  /**
   * Broadcast message to other tabs via localStorage
   */
  broadcast(key, message, options = {}) {
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
  onBroadcast(key, callback, options = {}) {
    const broadcastKey = `${key}_broadcast`;
    
    const handler = (event) => {
      if (event.key === this.getKey(broadcastKey) && event.newValue) {
        try {
          const payload = JSON.parse(event.newValue);
          if (payload.message && payload.timestamp) {
            callback(payload.message, payload);
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
  cleanup() {
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
              const parsed = JSON.parse(item);
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
              const parsed = JSON.parse(item);
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
  getKeys(storage = 'localStorage') {
    if (!this.isStorageAvailable) {
      return Object.keys(this.fallbackMemory).filter(key => 
        storage === 'session' ? key.startsWith('session_') : !key.startsWith('session_')
      );
    }

    try {
      const storageObj = storage === 'session' ? sessionStorage : localStorage;
      return Object.keys(storageObj).filter(key => key.startsWith(this.prefix));
    } catch (error) {
      console.error('[StorageService] Get keys error:', error);
      return [];
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
} else {
  window.StorageService = StorageService;
}