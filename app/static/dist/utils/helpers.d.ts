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
/**
 * Escape HTML to prevent XSS attacks
 */
export declare function escapeHtml(text: string): string;
/**
 * Sanitize HTML (basic version)
 */
export declare function sanitizeHtml(html: string): string;
/**
 * Format timestamp for display
 */
export declare function formatTimestamp(timestamp: string | number | Date, options?: TimestampOptions): TimestampResult;
/**
 * Check if device is mobile
 */
export declare function isMobileDevice(): boolean;
/**
 * Check if device is tablet
 */
export declare function isTabletDevice(): boolean;
/**
 * Check if device is desktop
 */
export declare function isDesktopDevice(): boolean;
/**
 * Debounce function calls
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number, immediate?: boolean): DebouncedFunction<T>;
/**
 * Throttle function calls
 */
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): ThrottledFunction<T>;
/**
 * Generate random ID
 */
export declare function generateId(length?: number): string;
/**
 * Get random item from array
 */
export declare function getRandomItem<T>(array: T[]): T;
/**
 * Shuffle array
 */
export declare function shuffleArray<T>(array: T[]): T[];
/**
 * Check if element is in viewport
 */
export declare function isInViewport(element: Element): boolean;
/**
 * Scroll element into view smoothly
 */
export declare function scrollIntoView(element: Element, options?: ScrollOptions): void;
/**
 * Get cookie value by name
 */
export declare function getCookie(name: string): string | null;
/**
 * Set cookie
 */
export declare function setCookie(name: string, value: string, options?: CookieOptions): void;
/**
 * Delete cookie
 */
export declare function deleteCookie(name: string, options?: Pick<CookieOptions, 'domain' | 'path'>): void;
/**
 * Copy text to clipboard
 */
export declare function copyToClipboard(text: string): Promise<boolean>;
/**
 * Format file size
 */
export declare function formatFileSize(bytes: number): string;
/**
 * Validate email format
 */
export declare function isValidEmail(email: string): boolean;
/**
 * Validate URL format
 */
export declare function isValidUrl(url: string): boolean;
/**
 * Truncate text with ellipsis
 */
export declare function truncateText(text: string, maxLength: number, suffix?: string): string;
/**
 * Capitalize first letter of string
 */
export declare function capitalize(str: string): string;
/**
 * Convert string to camelCase
 */
export declare function toCamelCase(str: string): string;
/**
 * Convert string to kebab-case
 */
export declare function toKebabCase(str: string): string;
/**
 * Check if color is light or dark
 */
export declare function isLightColor(color: string): boolean;
/**
 * Get contrast color (black or white) for given background
 */
export declare function getContrastColor(backgroundColor: string): string;
/**
 * Collection of all helper functions
 */
export declare const Helpers: {
    escapeHtml: typeof escapeHtml;
    sanitizeHtml: typeof sanitizeHtml;
    formatTimestamp: typeof formatTimestamp;
    isMobileDevice: typeof isMobileDevice;
    isTabletDevice: typeof isTabletDevice;
    isDesktopDevice: typeof isDesktopDevice;
    debounce: typeof debounce;
    throttle: typeof throttle;
    generateId: typeof generateId;
    isInViewport: typeof isInViewport;
    scrollIntoView: typeof scrollIntoView;
    getCookie: typeof getCookie;
    setCookie: typeof setCookie;
    deleteCookie: typeof deleteCookie;
    copyToClipboard: typeof copyToClipboard;
    formatFileSize: typeof formatFileSize;
    isValidEmail: typeof isValidEmail;
    isValidUrl: typeof isValidUrl;
    truncateText: typeof truncateText;
    capitalize: typeof capitalize;
    toCamelCase: typeof toCamelCase;
    toKebabCase: typeof toKebabCase;
    getRandomItem: typeof getRandomItem;
    shuffleArray: typeof shuffleArray;
    isLightColor: typeof isLightColor;
    getContrastColor: typeof getContrastColor;
};
export {};
