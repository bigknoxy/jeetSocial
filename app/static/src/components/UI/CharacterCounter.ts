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

import type { 
  CharacterCounterOptions, 
  CharacterCounterState 
} from '../../types/index.js';

// Global type declarations
declare global {
  interface Window {
    CharacterCounter: any;
  }
}

/**
 * Character counter for managing post input character limits
 */
class CharacterCounter {
  private maxLength: number;
  private warningThreshold: number;
  private textarea: HTMLTextAreaElement | null = null;
  private counter: HTMLElement | null = null;
  private postBtn: HTMLButtonElement | null = null;
  private errorDiv: HTMLElement | null = null;
  private initialized: boolean = false;

  constructor(options: CharacterCounterOptions) {
    this.maxLength = options.maxLength;
    this.warningThreshold = options.warningThreshold;
  }

  /**
   * Initialize character counter with DOM elements
   */
  init(): boolean {
    this.textarea = document.getElementById('message') as HTMLTextAreaElement;
    this.counter = document.getElementById('char-count');
    this.postBtn = document.getElementById('post-btn') as HTMLButtonElement;
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
  private setupEventListeners(): void {
    if (!this.textarea) return;

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
  updateCounter(): void {
    if (!this.textarea || !this.counter || !this.postBtn || !this.errorDiv) return;

    const length = this.textarea.value.length;
    this.counter.textContent = `${length}/${this.maxLength}`;
    
    // Color logic: muted <240, orange 240-279, red 280+
    if (length > this.maxLength) {
      this.setErrorState("Your message is a bit too long. Let's keep it kind and concise!");
    } else if (length >= this.warningThreshold) {
      this.setWarningState();
    } else if (length === 0) {
      this.setEmptyState("Share something uplifting to brighten someone's day!");
    } else {
      this.setNormalState();
    }
  }

  /**
   * Set error state when character limit is exceeded
   */
  private setErrorState(message: string): void {
    if (!this.counter || !this.postBtn || !this.errorDiv) return;

    this.counter.style.color = '#ff4b5c'; // error
    this.postBtn.disabled = true;
    this.postBtn.style.opacity = '0.6';
    this.errorDiv.textContent = message;
    this.errorDiv.style.opacity = '1';
  }

  /**
   * Set warning state when approaching character limit
   */
  private setWarningState(): void {
    if (!this.counter || !this.postBtn || !this.errorDiv) return;

    this.counter.style.color = '#ffb26b'; // warning
    this.postBtn.disabled = false;
    this.postBtn.style.opacity = '1';
    this.errorDiv.textContent = '';
    this.errorDiv.style.opacity = '0';
  }

  /**
   * Set empty state when no text is entered
   */
  private setEmptyState(message: string): void {
    if (!this.counter || !this.postBtn || !this.errorDiv) return;

    this.counter.style.color = '#888';
    this.postBtn.disabled = true;
    this.postBtn.style.opacity = '0.6';
    this.errorDiv.textContent = message;
    this.errorDiv.style.opacity = '1';
  }

  /**
   * Set normal state for valid input
   */
  private setNormalState(): void {
    if (!this.counter || !this.postBtn || !this.errorDiv) return;

    this.counter.style.color = '#888';
    this.postBtn.disabled = false;
    this.postBtn.style.opacity = '1';
    this.errorDiv.textContent = '';
    this.errorDiv.style.opacity = '0';
  }

  /**
   * Get current character count
   */
  getCharacterCount(): number {
    return this.textarea ? this.textarea.value.length : 0;
  }

  /**
   * Get remaining characters
   */
  getRemainingCharacters(): number {
    return this.maxLength - this.getCharacterCount();
  }

  /**
   * Check if current input is valid
   */
  isValid(): boolean {
    const count = this.getCharacterCount();
    return count > 0 && count <= this.maxLength;
  }

  /**
   * Get current state information
   */
  getState(): CharacterCounterState {
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
  reset(): void {
    if (this.textarea) {
      this.textarea.value = '';
    }
    this.updateCounter();
  }

  /**
   * Set maximum length
   */
  setMaxLength(maxLength: number): void {
    this.maxLength = maxLength;
    this.updateCounter();
  }

  /**
   * Set warning threshold
   */
  setWarningThreshold(threshold: number): void {
    this.warningThreshold = threshold;
    this.updateCounter();
  }

  /**
   * Get maximum length
   */
  getMaxLength(): number {
    return this.maxLength;
  }

  /**
   * Get warning threshold
   */
  getWarningThreshold(): number {
    return this.warningThreshold;
  }

  /**
   * Check if counter is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Destroy character counter and clean up event listeners
   */
  destroy(): void {
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
  setErrorMessage(message: string): void {
    if (this.errorDiv) {
      this.errorDiv.textContent = message;
      this.errorDiv.style.opacity = '1';
    }
  }

  /**
   * Clear error message
   */
  clearErrorMessage(): void {
    if (this.errorDiv) {
      this.errorDiv.textContent = '';
      this.errorDiv.style.opacity = '0';
    }
  }

  /**
   * Focus the textarea
   */
  focus(): void {
    if (this.textarea) {
      this.textarea.focus();
    }
  }

  /**
   * Get the textarea element
   */
  getTextarea(): HTMLTextAreaElement | null {
    return this.textarea;
  }

  /**
   * Get the counter element
   */
  getCounter(): HTMLElement | null {
    return this.counter;
  }

  /**
   * Get the post button element
   */
  getPostButton(): HTMLButtonElement | null {
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