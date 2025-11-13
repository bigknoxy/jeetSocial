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
/**
 * Character counter for managing post input character limits
 */
class CharacterCounter {
    constructor(options) {
        this.textarea = null;
        this.counter = null;
        this.postBtn = null;
        this.errorDiv = null;
        this.initialized = false;
        this.maxLength = options.maxLength;
        this.warningThreshold = options.warningThreshold;
    }
    /**
     * Initialize character counter with DOM elements
     */
    init() {
        this.textarea = document.getElementById('message');
        this.counter = document.getElementById('char-count');
        this.postBtn = document.getElementById('post-btn');
        this.errorDiv = document.getElementById('error');
        if (!this.textarea || !this.counter || !this.postBtn || !this.errorDiv) {
            console.debug('[CharacterCounter] missing elements', {
                textarea: !!this.textarea,
                counter: !!this.counter,
                postBtn: !!this.postBtn,
                errorDiv: !!this.errorDiv
            });
            return false;
        }
        this.setupEventListeners();
        this.updateCounter(); // Initial update
        this.initialized = true;
        return true;
    }
    /**
     * Set up event listeners for character counter
     */
    setupEventListeners() {
        if (!this.textarea)
            return;
        // Input event for real-time counting
        this.textarea.addEventListener('input', () => this.updateCounter());
        // Mobile usability: scroll form into view when keyboard opens
        this.textarea.addEventListener('focus', () => {
            if (window.innerWidth < 600) {
                setTimeout(() => {
                    const postForm = document.getElementById('post-form');
                    if (postForm && typeof postForm.scrollIntoView === 'function') {
                        postForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        });
    }
    /**
     * Update character counter display and related UI elements
     */
    updateCounter() {
        if (!this.textarea || !this.counter || !this.postBtn || !this.errorDiv)
            return;
        const length = this.textarea.value.length;
        this.counter.textContent = `${length}/${this.maxLength}`;
        // Color logic: muted <240, orange 240-279, red 280+
        if (length > this.maxLength) {
            this.setErrorState("Your message is a bit too long. Let's keep it kind and concise!");
        }
        else if (length >= this.warningThreshold) {
            this.setWarningState();
        }
        else if (length === 0) {
            this.setEmptyState("Share something uplifting to brighten someone's day!");
        }
        else {
            this.setNormalState();
        }
    }
    /**
     * Set error state when character limit is exceeded
     */
    setErrorState(message) {
        if (!this.counter || !this.postBtn || !this.errorDiv)
            return;
        this.counter.style.color = '#ff4b5c'; // error
        this.postBtn.disabled = true;
        this.postBtn.style.opacity = '0.6';
        this.errorDiv.textContent = message;
        this.errorDiv.style.opacity = '1';
    }
    /**
     * Set warning state when approaching character limit
     */
    setWarningState() {
        if (!this.counter || !this.postBtn || !this.errorDiv)
            return;
        this.counter.style.color = '#ffb26b'; // warning
        this.postBtn.disabled = false;
        this.postBtn.style.opacity = '1';
        this.errorDiv.textContent = '';
        this.errorDiv.style.opacity = '0';
    }
    /**
     * Set empty state when no text is entered
     */
    setEmptyState(message) {
        if (!this.counter || !this.postBtn || !this.errorDiv)
            return;
        this.counter.style.color = '#888';
        this.postBtn.disabled = true;
        this.postBtn.style.opacity = '0.6';
        this.errorDiv.textContent = message;
        this.errorDiv.style.opacity = '1';
    }
    /**
     * Set normal state for valid input
     */
    setNormalState() {
        if (!this.counter || !this.postBtn || !this.errorDiv)
            return;
        this.counter.style.color = '#888';
        this.postBtn.disabled = false;
        this.postBtn.style.opacity = '1';
        this.errorDiv.textContent = '';
        this.errorDiv.style.opacity = '0';
    }
    /**
     * Get current character count
     */
    getCharacterCount() {
        return this.textarea ? this.textarea.value.length : 0;
    }
    /**
     * Get remaining characters
     */
    getRemainingCharacters() {
        return this.maxLength - this.getCharacterCount();
    }
    /**
     * Check if current input is valid
     */
    isValid() {
        const count = this.getCharacterCount();
        return count > 0 && count <= this.maxLength;
    }
    /**
     * Get current state information
     */
    getState() {
        const count = this.getCharacterCount();
        return {
            currentLength: count,
            maxLength: this.maxLength,
            isOverLimit: count > this.maxLength,
            isNearLimit: count >= this.warningThreshold
        };
    }
    /**
     * Reset counter to initial state
     */
    reset() {
        if (this.textarea) {
            this.textarea.value = '';
        }
        this.updateCounter();
    }
    /**
     * Set maximum length
     */
    setMaxLength(maxLength) {
        this.maxLength = maxLength;
        this.updateCounter();
    }
    /**
     * Set warning threshold
     */
    setWarningThreshold(threshold) {
        this.warningThreshold = threshold;
        this.updateCounter();
    }
    /**
     * Get maximum length
     */
    getMaxLength() {
        return this.maxLength;
    }
    /**
     * Get warning threshold
     */
    getWarningThreshold() {
        return this.warningThreshold;
    }
    /**
     * Check if counter is initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Destroy character counter and clean up event listeners
     */
    destroy() {
        if (this.textarea) {
            this.textarea.removeEventListener('input', () => this.updateCounter());
            this.textarea.removeEventListener('focus', () => {
                // Mobile scroll handler would be here if extracted
            });
        }
        this.initialized = false;
    }
    /**
     * Set custom error message
     */
    setErrorMessage(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.style.opacity = '1';
        }
    }
    /**
     * Clear error message
     */
    clearErrorMessage() {
        if (this.errorDiv) {
            this.errorDiv.textContent = '';
            this.errorDiv.style.opacity = '0';
        }
    }
    /**
     * Focus the textarea
     */
    focus() {
        if (this.textarea) {
            this.textarea.focus();
        }
    }
    /**
     * Get the textarea element
     */
    getTextarea() {
        return this.textarea;
    }
    /**
     * Get the counter element
     */
    getCounter() {
        return this.counter;
    }
    /**
     * Get the post button element
     */
    getPostButton() {
        return this.postBtn;
    }
}
// Export for use in other modules
export default CharacterCounter;
// Also export as named export for consistency
export { CharacterCounter };
// Global export for backward compatibility
if (typeof window !== 'undefined') {
    window.CharacterCounter = CharacterCounter;
}
//# sourceMappingURL=CharacterCounter.js.map