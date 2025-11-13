/**
 * Module Bootstrap for jeetSocial
 * 
 * Dynamically imports TypeScript modules and attaches them to window
 * for backward compatibility with existing main.js code
 */

(async function() {
  'use strict';
  
  console.debug('[module-bootstrap] Loading TypeScript modules...');
  
  try {
    // Import WebSocketService
    const { WebSocketService } = await import('/static/dist/services/WebSocketService.js');
    window.WebSocketService = WebSocketService;
    window.wsService = new WebSocketService();
    console.debug('[module-bootstrap] WebSocketService loaded');
    
    // Import ApiService
    const { ApiService } = await import('/static/dist/services/ApiService.js');
    window.ApiService = ApiService;
    window.apiService = new ApiService();
    console.debug('[module-bootstrap] ApiService loaded');
    
    // Import Store
    const { Store } = await import('/static/dist/state/Store.js');
    const storeInstance = new Store();
    window.Store = storeInstance; // Set to instance for backward compatibility
    window.store = storeInstance;
    console.debug('[module-bootstrap] Store loaded');
    
    // Import FeedManager
    console.log('[module-bootstrap] Loading FeedManager from:', '/static/dist/components/Feed/FeedManager.js?v=' + Date.now());
    const { FeedManager } = await import('/static/dist/components/Feed/FeedManager.js?v=' + Date.now());
    console.log('[module-bootstrap] FeedManager imported:', FeedManager);
    console.log('[module-bootstrap] FeedManager methods:', Object.getOwnPropertyNames(FeedManager.prototype));
    
    window.FeedManager = FeedManager;
    window.feedManager = new FeedManager();
    console.log('[module-bootstrap] FeedManager instance:', window.feedManager);
    console.log('[module-bootstrap] Instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.feedManager)));
    console.debug('[module-bootstrap] FeedManager loaded');
    
    // Import KindnessManager
    const { KindnessManager } = await import('/static/dist/components/Kindness/KindnessManager.js');
    window.KindnessManager = KindnessManager;
    window.kindnessManager = new KindnessManager();
    console.debug('[module-bootstrap] KindnessManager loaded');
    
    // WebSocket connection will be handled by FeedManager
    console.debug('[module-bootstrap] WebSocket connection delegated to FeedManager');
    
    console.debug('[module-bootstrap] All modules loaded successfully');
    console.debug('[module-bootstrap] window.kindnessManager:', typeof window.kindnessManager, window.kindnessManager);
    
  } catch (error) {
    console.error('[module-bootstrap] Failed to load modules:', error);
  }
})();