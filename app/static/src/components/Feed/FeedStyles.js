/**
 * FeedStyles.js
 * 
 * Contains CSS styles for feed components including:
 * - Rainbow button styling
 * - Animation styles for new posts
 * - Skeleton loader styles
 */

class FeedStyles {
  constructor() {
    this.injectStyles();
  }

  injectStyles() {
    // Rainbow button style
    const rainbowStyle = document.createElement('style');
    rainbowStyle.innerHTML = `
      .rainbow-btn {
        background: linear-gradient(90deg, #ff4b5c, #ffb26b, #ffe347, #43e97b, #3fa7d6, #7c4dff, #c86dd7);
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 0.5em 1.5em;
        font-weight: bold;
        cursor: pointer;
        transition: box-shadow 0.2s;
        font-size: 1em;
      }
      .rainbow-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .rainbow-btn:hover:not(:disabled) {
        box-shadow: 0 0 8px #43e97b;
      }
    `;
    document.head.appendChild(rainbowStyle);

    // Animation styles for new posts
    const animationStyle = document.createElement('style');
    animationStyle.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .new-post {
        background: #23232b;
        box-shadow: 0 0 8px #ffe347;
      }
      .bump {
        animation: bump 0.35s ease-in-out;
      }
      @keyframes bump {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(animationStyle);

    // Skeleton loader styles
    const skeletonStyle = document.createElement('style');
    skeletonStyle.innerHTML = `
      .skeleton-loader {
        padding: 1em;
      }
      .skeleton-post {
        background: #3a3a4a;
        border-radius: 8px;
        margin: 1em 0;
        padding: 1em;
        border-left: 6px solid #555;
      }
      .skeleton-animate {
        background: linear-gradient(90deg, #3a3a4a 25%, #4a4a5a 50%, #3a3a4a 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
        height: 20px;
        margin: 0.5em 0;
      }
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(skeletonStyle);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeedStyles;
} else {
  window.FeedStyles = FeedStyles;
}