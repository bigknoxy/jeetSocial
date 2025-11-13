/**
 * Core TypeScript interfaces for jeetSocial
 * Defines the data structures used throughout the application
 */
// ===== Type Guards and Utilities =====
/**
 * Type guard for API responses
 */
export function isApiResponse(obj) {
    return obj && typeof obj === 'object' && 'data' in obj && 'status' in obj && 'ok' in obj;
}
/**
 * Type guard for Post objects
 */
export function isPost(obj) {
    return obj &&
        typeof obj === 'object' &&
        typeof obj.id === 'string' &&
        typeof obj.message === 'string' &&
        typeof obj.username === 'string' &&
        typeof obj.timestamp === 'string';
}
/**
 * Type guard for KindnessToken objects
 */
export function isKindnessToken(obj) {
    return obj &&
        typeof obj === 'object' &&
        typeof obj.token === 'string' &&
        typeof obj.post_id === 'string';
}
//# sourceMappingURL=index.js.map