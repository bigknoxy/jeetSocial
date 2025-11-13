/**
 * CharacterCounter.ts
 *
 * Manages character counting functionality for post input including:
 * - Real-time character counting
 * - Visual feedback with color coding
 * - Post button state management
 * - Error message display
 * - Mobile usability enhancements
 */
import type { CharacterCounterOptions, CharacterCounterState } from '../../types/index.js';
declare global {
    interface Window {
        CharacterCounter: any;
    }
}
/**
 * Character counter for managing post input character limits
 */
declare class CharacterCounter {
    private maxLength;
    private warningThreshold;
    private textarea;
    private counter;
    private postBtn;
    private errorDiv;
    private initialized;
    constructor(options: CharacterCounterOptions);
    /**
     * Initialize character counter with DOM elements
     */
    init(): boolean;
    /**
     * Set up event listeners for character counter
     */
    private setupEventListeners;
    /**
     * Update character counter display and related UI elements
     */
    updateCounter(): void;
    /**
     * Set error state when character limit is exceeded
     */
    private setErrorState;
    /**
     * Set warning state when approaching character limit
     */
    private setWarningState;
    /**
     * Set empty state when no text is entered
     */
    private setEmptyState;
    /**
     * Set normal state for valid input
     */
    private setNormalState;
    /**
     * Get current character count
     */
    getCharacterCount(): number;
    /**
     * Get remaining characters
     */
    getRemainingCharacters(): number;
    /**
     * Check if current input is valid
     */
    isValid(): boolean;
    /**
     * Get current state information
     */
    getState(): CharacterCounterState;
    /**
     * Reset counter to initial state
     */
    reset(): void;
    /**
     * Set maximum length
     */
    setMaxLength(maxLength: number): void;
    /**
     * Set warning threshold
     */
    setWarningThreshold(threshold: number): void;
    /**
     * Get maximum length
     */
    getMaxLength(): number;
    /**
     * Get warning threshold
     */
    getWarningThreshold(): number;
    /**
     * Check if counter is initialized
     */
    isInitialized(): boolean;
    /**
     * Destroy character counter and clean up event listeners
     */
    destroy(): void;
    /**
     * Set custom error message
     */
    setErrorMessage(message: string): void;
    /**
     * Clear error message
     */
    clearErrorMessage(): void;
    /**
     * Focus the textarea
     */
    focus(): void;
    /**
     * Get the textarea element
     */
    getTextarea(): HTMLTextAreaElement | null;
    /**
     * Get the counter element
     */
    getCounter(): HTMLElement | null;
    /**
     * Get the post button element
     */
    getPostButton(): HTMLButtonElement | null;
}
export default CharacterCounter;
export { CharacterCounter };
