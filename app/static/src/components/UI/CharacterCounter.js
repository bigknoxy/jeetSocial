/**
 * CharacterCounter.js
 * 
 * Manages character counting functionality for post input including:
 * - Real-time character counting
 * - Visual feedback with color coding
 * - Post button state management
 * - Error message display
 * - Mobile usability enhancements
 */

class CharacterCounter {
  constructor(options = {}) {
    this.maxLength = options.maxLength || 280;
    this.warningThreshold = options.warningThreshold || 240;
    this.textarea = null;
    this.counter = null;
    this.postBtn = null;
    this.errorDiv = null;
    this.initialized = false;
  }

  /**
   * Initialize the character counter with DOM elements
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
   * Set up event listeners for the character counter
   */
  setupEventListeners() {
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
   * Update the character counter display and related UI elements
   */
  updateCounter() {
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
  setErrorState(message) {
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
    return {
      count: this.getCharacterCount(),
      remaining: this.getRemainingCharacters(),
      isValid: this.isValid(),
      isWarning: this.getCharacterCount() >= this.warningThreshold,
      isError: this.getCharacterCount() > this.maxLength,
      isEmpty: this.getCharacterCount() === 0
    };
  }

  /**
   * Reset the counter to initial state
   */
  reset() {
    if (this.textarea) {
      this.textarea.value = '';
    }
    this.updateCounter();
  }

  /**
   * Destroy the character counter and clean up event listeners
   */
  destroy() {
    if (this.textarea) {
      this.textarea.removeEventListener('input', this.updateCounter);
      this.textarea.removeEventListener('focus', this.setupMobileScroll);
    }
    this.initialized = false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CharacterCounter;
} else {
  window.CharacterCounter = CharacterCounter;
}