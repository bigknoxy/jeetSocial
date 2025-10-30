/**
 * EmojiPicker.js
 * 
 * Manages emoji picker functionality including:
 * - Mobile device detection and hiding
 * - Picker positioning
 * - Emoji insertion at cursor position
 * - Click outside handling
 */

class EmojiPicker {
  constructor(options = {}) {
    this.emojiBtn = null;
    this.emojiPicker = null;
    this.textarea = null;
    this.initialized = false;
    this.isVisible = false;
  }

  /**
   * Initialize the emoji picker
   */
  init() {
    this.emojiBtn = document.getElementById('emoji-btn');
    this.emojiPicker = document.getElementById('emoji-picker');
    this.textarea = document.getElementById('message');

    if (!this.emojiBtn || !this.emojiPicker || !this.textarea) {
      console.debug('[EmojiPicker] missing elements', {
        emojiBtn: !!this.emojiBtn,
        emojiPicker: !!this.emojiPicker,
        textarea: !!this.textarea
      });
      return false;
    }

    // Hide emoji button and picker on mobile devices
    if (this.isMobileDevice()) {
      this.hideForMobile();
      return false;
    }

    this.setupEventListeners();
    this.initialized = true;
    return true;
  }

  /**
   * Check if the current device is mobile
   */
  isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Hide emoji picker elements on mobile devices
   */
  hideForMobile() {
    if (this.emojiBtn) this.emojiBtn.style.display = 'none';
    if (this.emojiPicker) this.emojiPicker.style.display = 'none';
    
    // Also hide 'Post on Enter' toggle on mobile
    const enterToggleLabel = document.querySelector('.toggle-switch');
    if (enterToggleLabel) enterToggleLabel.style.display = 'none';
  }

  /**
   * Set up event listeners for the emoji picker
   */
  setupEventListeners() {
    // Show picker when emoji button is clicked
    this.emojiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.showPicker();
    });

    // Handle emoji selection
    this.emojiPicker.addEventListener('emoji-click', (event) => {
      this.insertEmoji(event.detail.unicode);
    });

    // Hide picker when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.emojiPicker.contains(e.target) && e.target !== this.emojiBtn) {
        this.hidePicker();
      }
    });

    // Hide picker when pressing Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hidePicker();
      }
    });
  }

  /**
   * Show the emoji picker
   */
  showPicker() {
    this.positionPicker();
    this.emojiPicker.style.display = 'block';
    this.isVisible = true;
  }

  /**
   * Hide the emoji picker
   */
  hidePicker() {
    this.emojiPicker.style.display = 'none';
    this.isVisible = false;
  }

  /**
   * Position the picker above the emoji button
   */
  positionPicker() {
    const rect = this.emojiBtn.getBoundingClientRect();
    this.emojiPicker.style.left = rect.left + 'px';
    this.emojiPicker.style.top = (rect.top + window.scrollY - 10) + 'px';
    this.emojiPicker.style.transform = 'translateY(-100%)';
  }

  /**
   * Insert emoji at cursor position in textarea
   */
  insertEmoji(emoji) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const value = this.textarea.value;
    
    // Insert emoji at cursor position
    this.textarea.value = value.slice(0, start) + emoji + value.slice(end);
    
    // Set cursor position after emoji
    this.textarea.focus();
    this.textarea.selectionStart = this.textarea.selectionEnd = start + emoji.length;
    
    // Hide picker after selection
    this.hidePicker();
    
    // Trigger input event for character counter
    const inputEvent = new Event('input', { bubbles: true });
    this.textarea.dispatchEvent(inputEvent);
  }

  /**
   * Toggle picker visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hidePicker();
    } else {
      this.showPicker();
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      initialized: this.initialized,
      isVisible: this.isVisible,
      isMobile: this.isMobileDevice()
    };
  }

  /**
   * Destroy the emoji picker and clean up event listeners
   */
  destroy() {
    if (this.emojiBtn) {
      this.emojiBtn.removeEventListener('click', this.showPicker);
    }
    if (this.emojiPicker) {
      this.emojiPicker.removeEventListener('emoji-click', this.insertEmoji);
    }
    this.initialized = false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmojiPicker;
} else {
  window.EmojiPicker = EmojiPicker;
}