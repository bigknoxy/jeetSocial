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
  // Future extensibility for configuration options
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

class EmojiPicker {
  private emojiBtn: HTMLElement | null = null;
  private emojiPicker: HTMLElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private initialized: boolean = false;
  private isVisible: boolean = false;

  constructor(_options: EmojiPickerOptions = {}) {
    // Options reserved for future configuration
  }

  /**
   * Initialize the emoji picker
   */
  init(): boolean {
    this.emojiBtn = document.getElementById('emoji-btn');
    this.emojiPicker = document.getElementById('emoji-picker');
    this.textarea = document.getElementById('message') as HTMLTextAreaElement;

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
  isMobileDevice(): boolean {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Hide emoji picker elements on mobile devices
   */
  private hideForMobile(): void {
    if (this.emojiBtn) this.emojiBtn.style.display = 'none';
    if (this.emojiPicker) this.emojiPicker.style.display = 'none';
    
    // Also hide 'Post on Enter' toggle on mobile
    const enterToggleLabel = document.querySelector('.toggle-switch') as HTMLElement;
    if (enterToggleLabel) enterToggleLabel.style.display = 'none';
  }

  /**
   * Set up event listeners for the emoji picker
   */
  private setupEventListeners(): void {
    if (!this.emojiBtn || !this.emojiPicker) return;

    // Show picker when emoji button is clicked
    this.emojiBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      this.showPicker();
    });

    // Handle emoji selection
    this.emojiPicker.addEventListener('emoji-click', (event: any) => {
      this.insertEmoji(event.detail.unicode);
    });

    // Hide picker when clicking outside
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (this.isVisible && 
          this.emojiPicker && 
          !this.emojiPicker.contains(target) && 
          target !== this.emojiBtn) {
        this.hidePicker();
      }
    });

    // Hide picker when pressing Escape
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hidePicker();
      }
    });
  }

  /**
   * Show the emoji picker
   */
  showPicker(): void {
    if (!this.emojiPicker) return;
    
    this.positionPicker();
    this.emojiPicker.style.display = 'block';
    this.isVisible = true;
  }

  /**
   * Hide the emoji picker
   */
  hidePicker(): void {
    if (!this.emojiPicker) return;
    
    this.emojiPicker.style.display = 'none';
    this.isVisible = false;
  }

  /**
   * Position the picker above the emoji button
   */
  private positionPicker(): void {
    if (!this.emojiBtn || !this.emojiPicker) return;
    
    const rect = this.emojiBtn.getBoundingClientRect();
    this.emojiPicker.style.left = rect.left + 'px';
    this.emojiPicker.style.top = (rect.top + window.scrollY - 10) + 'px';
    this.emojiPicker.style.transform = 'translateY(-100%)';
  }

  /**
   * Insert emoji at cursor position in textarea
   */
  insertEmoji(emoji: string): void {
    if (!this.textarea) return;
    
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
  toggle(): void {
    if (this.isVisible) {
      this.hidePicker();
    } else {
      this.showPicker();
    }
  }

  /**
   * Get current state
   */
  getState(): EmojiPickerState {
    return {
      initialized: this.initialized,
      isVisible: this.isVisible,
      isMobile: this.isMobileDevice()
    };
  }

  /**
   * Destroy the emoji picker and clean up event listeners
   */
  destroy(): void {
    if (this.emojiBtn) {
      this.emojiBtn.removeEventListener('click', this.showPicker);
    }
    if (this.emojiPicker) {
      // Note: Event listener cleanup for custom events may require different approach
      // this.emojiPicker.removeEventListener('emoji-click', this.insertEmoji);
    }
    this.initialized = false;
  }
}

// Export for use in other modules
export default EmojiPicker;