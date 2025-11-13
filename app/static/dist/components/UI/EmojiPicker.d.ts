/**
 * EmojiPicker.ts
 *
 * Manages emoji picker functionality including:
 * - Mobile device detection and hiding
 * - Picker positioning
 * - Emoji insertion at cursor position
 * - Click outside handling
 */
interface EmojiPickerOptions {
}
interface EmojiPickerState {
    initialized: boolean;
    isVisible: boolean;
    isMobile: boolean;
}
interface EmojiClickEvent extends CustomEvent {
    detail: {
        unicode: string;
    };
}
declare global {
    interface DocumentEventMap {
        'emoji-click': EmojiClickEvent;
    }
}
declare class EmojiPicker {
    private emojiBtn;
    private emojiPicker;
    private textarea;
    private initialized;
    private isVisible;
    constructor(_options?: EmojiPickerOptions);
    /**
     * Initialize the emoji picker
     */
    init(): boolean;
    /**
     * Check if the current device is mobile
     */
    isMobileDevice(): boolean;
    /**
     * Hide emoji picker elements on mobile devices
     */
    private hideForMobile;
    /**
     * Set up event listeners for the emoji picker
     */
    private setupEventListeners;
    /**
     * Show the emoji picker
     */
    showPicker(): void;
    /**
     * Hide the emoji picker
     */
    hidePicker(): void;
    /**
     * Position the picker above the emoji button
     */
    private positionPicker;
    /**
     * Insert emoji at cursor position in textarea
     */
    insertEmoji(emoji: string): void;
    /**
     * Toggle picker visibility
     */
    toggle(): void;
    /**
     * Get current state
     */
    getState(): EmojiPickerState;
    /**
     * Destroy the emoji picker and clean up event listeners
     */
    destroy(): void;
}
export default EmojiPicker;
