/**
 * helpers.ts
 * 
 * Utility functions for jeetSocial frontend including:
 * - HTML escaping and sanitization
 * - Date formatting and manipulation
 * - String manipulation
 * - DOM utilities
 * - Device detection
 * - Validation helpers
 */

// ===== Type Definitions =====

/**
 * Timestamp formatting options
 */
interface TimestampOptions {
  showFullDate?: boolean;
  locale?: string;
}

/**
 * Timestamp formatting result
 */
interface TimestampResult {
  text: string;
  isFuture?: boolean;
  isRecent?: boolean;
  fullDate?: boolean;
}

/**
 * Cookie options
 */
interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * ScrollIntoView options
 */
interface ScrollOptions {
  behavior?: 'auto' | 'smooth';
  block?: 'start' | 'center' | 'end' | 'nearest';
  inline?: 'start' | 'center' | 'end' | 'nearest';
}

/**
 * Debounced function type
 */
type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

/**
 * Throttled function type
 */
type ThrottledFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
};

// ===== HTML and Text Utilities =====

/**
 * Escape HTML to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  // Convert line breaks to <br> after escaping
  return div.innerHTML.replace(/\n/g, '<br>');
}

/**
 * Sanitize HTML (basic version)
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// ===== Date and Time Utilities =====

/**
 * Format timestamp for display
 */
export function formatTimestamp(
  timestamp: string | number | Date, 
  options: TimestampOptions = {}
): TimestampResult {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Future indicator
  if (diffMs < 0) {
    return { text: 'Future', isFuture: true };
  }

  // Within last hour
  if (diffHours < 1) {
    const minutes = Math.floor(diffMs / (1000 * 60));
    return { 
      text: minutes <= 1 ? 'Just now' : `${minutes}m ago`,
      isRecent: true 
    };
  }

  // Within last 24 hours
  if (diffHours < 24) {
    return { 
      text: `${Math.floor(diffHours)}h ago`,
      isRecent: true 
    };
  }

  // Within last week
  if (diffDays < 7) {
    return { 
      text: `${Math.floor(diffDays)}d ago`,
      isRecent: false 
    };
  }

  // Older than a week - show full date
  const locale = options.locale || 'en-US';
  const dateStr = date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  return { 
    text: dateStr,
    isRecent: false,
    fullDate: true 
  };
}

// ===== Device Detection =====

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device is tablet
 */
export function isTabletDevice(): boolean {
  return /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent);
}

/**
 * Check if device is desktop
 */
export function isDesktopDevice(): boolean {
  return !isMobileDevice() && !isTabletDevice();
}

// ===== Function Utilities =====

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number, 
  immediate: boolean = false
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced as DebouncedFunction<T>;
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  limit: number
): ThrottledFunction<T> {
  let inThrottle: boolean = false;
  
  return function throttledFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ===== ID and Random Utilities =====

/**
 * Generate random ID
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get random item from array
 */
export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== DOM Utilities =====

/**
 * Check if element is in viewport
 */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Scroll element into view smoothly
 */
export function scrollIntoView(element: Element, options: ScrollOptions = {}): void {
  const defaultOptions: ScrollOptions = {
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  };
  
  if (element && typeof (element as any).scrollIntoView === 'function') {
    (element as any).scrollIntoView({ ...defaultOptions, ...options });
  }
}

// ===== Cookie Utilities =====

/**
 * Get cookie value by name
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Set cookie
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  const { expires, maxAge, domain, path, secure, sameSite } = options;
  let cookieString = `${name}=${encodeURIComponent(value)}`;

  if (expires) {
    cookieString += `; expires=${expires.toUTCString()}`;
  }
  
  if (maxAge) {
    cookieString += `; max-age=${maxAge}`;
  }
  
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  
  if (path) {
    cookieString += `; path=${path}`;
  }
  
  if (secure) {
    cookieString += '; secure';
  }
  
  if (sameSite) {
    cookieString += `; samesite=${sameSite}`;
  }

  document.cookie = cookieString;
}

/**
 * Delete cookie
 */
export function deleteCookie(name: string, options: Pick<CookieOptions, 'domain' | 'path'> = {}): void {
  const { domain, path } = options;
  let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  
  if (path) {
    cookieString += `; path=${path}`;
  }

  document.cookie = cookieString;
}

// ===== Clipboard Utilities =====

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('[Helpers] Copy to clipboard failed:', error);
    return false;
  }
}

// ===== Format Utilities =====

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== Validation Utilities =====

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ===== String Utilities =====

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, group =>
    group
      .toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// ===== Color Utilities =====

/**
 * Check if color is light or dark
 */
export function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return brightness > 155;
}

/**
 * Get contrast color (black or white) for given background
 */
export function getContrastColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
}

// ===== Export Object for Browser Compatibility =====

/**
 * Collection of all helper functions
 */
export const Helpers = {
  escapeHtml,
  sanitizeHtml,
  formatTimestamp,
  isMobileDevice,
  isTabletDevice,
  isDesktopDevice,
  debounce,
  throttle,
  generateId,
  isInViewport,
  scrollIntoView,
  getCookie,
  setCookie,
  deleteCookie,
  copyToClipboard,
  formatFileSize,
  isValidEmail,
  isValidUrl,
  truncateText,
  capitalize,
  toCamelCase,
  toKebabCase,
  getRandomItem,
  shuffleArray,
  isLightColor,
  getContrastColor
};

// Global export for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).Helpers = Helpers;
}