/**
 * KindnessManager.js
 * 
 * Manages kindness point functionality including:
 * - Token management and validation
 * - Cross-tab synchronization via localStorage and BroadcastChannel
 * - Optimistic UI updates for kindness awards
 * - Accessibility features and screen reader support
 */

class KindnessManager {
    constructor(store) {
        this.store = store || window.Store;
        this._lastAppliedKindnessTs = 0; // timestamp of last applied storage event
        this._bc = null; // BroadcastChannel instance
        
        // Initialize token from store or sessionStorage
        this.initializeToken();
        
        // Setup subscriptions
        this.unsubscribeFunctions = [];
        this.setupSubscriptions();
        
        console.log('[KINDNESS-CLIENT] constructor - initial token present?', !!this.getToken(), 'expiry=', this.getTokenExpiry());

        this.setupCrossTabSync();
    }
    
    /**
     * Initialize token from storage
     */
    initializeToken() {
        const token = sessionStorage.getItem('kindness_token');
        const expiry = sessionStorage.getItem('kindness_token_expiry');
        
        if (token && expiry) {
            this.store.setState({
                session: {
                    ...this.store.getState().session,
                    kindnessToken: token,
                    kindnessTokenExpiry: expiry
                }
            }, 'KindnessManager.initializeToken');
        }
    }
    
    /**
     * Get current token
     */
    getToken() {
        return this.store.getPath('session.kindnessToken') || sessionStorage.getItem('kindness_token');
    }
    
    /**
     * Get token expiry
     */
    getTokenExpiry() {
        return this.store.getPath('session.kindnessTokenExpiry') || sessionStorage.getItem('kindness_token_expiry');
    }
    
    /**
     * Setup state subscriptions
     */
    setupSubscriptions() {
        // Subscribe to session changes
        const unsubscribeSession = this.store.subscribe('session', (newSession, oldSession) => {
            if (newSession.kindnessToken !== oldSession.kindnessToken) {
                sessionStorage.setItem('kindness_token', newSession.kindnessToken || '');
            }
            if (newSession.kindnessTokenExpiry !== oldSession.kindnessTokenExpiry) {
                sessionStorage.setItem('kindness_token_expiry', newSession.kindnessTokenExpiry || '');
            }
        }, { id: 'kindnessManager-session' });
        
        this.unsubscribeFunctions.push(unsubscribeSession);
    }

    /**
     * Set up cross-tab synchronization using localStorage and BroadcastChannel
     */
    setupCrossTabSync() {
        // Listen for cross-tab kindness updates broadcast via localStorage
        window.addEventListener('storage', (event) => {
            try {
                // Log raw event for E2E debugging
                console.debug('[KINDNESS-CLIENT] storage event received', { key: event.key, newValue: event.newValue, oldValue: event.oldValue });
                if (!event.key || event.key !== 'jeet_kindness_update') return;
                // If key was removed (newValue === null) ignore removal event
                if (event.newValue === null) {
                    console.debug('[KINDNESS-CLIENT] storage event: key removed, ignoring');
                    return;
                }
                const payload = JSON.parse(event.newValue);
                if (!payload || !payload.post_id || typeof payload.new_points === 'undefined' || !payload.ts) {
                    console.debug('[KINDNESS-CLIENT] storage event: payload invalid', payload);
                    return;
                }
                // Ignore older events
                if (payload.ts <= this._lastAppliedKindnessTs) return;
                this._lastAppliedKindnessTs = payload.ts;
                console.debug('[KINDNESS-CLIENT] storage event – updating kindness for', payload.post_id, 'to', payload.new_points);
                this.updateKindnessDisplay(payload.post_id, payload.new_points);
            } catch (err) {
                console.debug('[KINDNESS-CLIENT] storage handler error:', err);
            }
        });

        // BroadcastChannel fallback for more reliable cross-tab messaging
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                this._bc = new BroadcastChannel('jeet_kindness');
                this._bc.addEventListener('message', (event) => {
                    try {
                        const payload = event.data;
                        console.debug('[KINDNESS-CLIENT] BroadcastChannel message received', payload);
                        if (!payload || !payload.post_id || typeof payload.new_points === 'undefined' || !payload.ts) return;
                        if (payload.ts <= this._lastAppliedKindnessTs) return;
                        this._lastAppliedKindnessTs = payload.ts;
                        this.updateKindnessDisplay(payload.post_id, payload.new_points);
                    } catch (err) {
                        console.debug('[KINDNESS-CLIENT] BroadcastChannel handler error:', err);
                    }
                });
            }
        } catch (err) {
            console.debug('[KINDNESS-CLIENT] BroadcastChannel init error:', err);
        }
    }
    
    /**
     * Ensure we have a valid token for the given post
     */
    async ensureToken(postId) {
        // Always refresh from sessionStorage in case a token was set after page load
        try {
            const ssToken = sessionStorage.getItem('kindness_token');
            const ssExpiry = sessionStorage.getItem('kindness_token_expiry');
            if (ssToken) this.token = ssToken;
            if (ssExpiry) this.tokenExpiry = ssExpiry;
         } catch (err) {
            console.debug('[KINDNESS-CLIENT] unable to read sessionStorage:', err);
        }

        // Debug logging to help E2E visibility
        console.debug('[KINDNESS-CLIENT] ensureToken start - this.token present?', !!this.token, 'this.tokenExpiry=', this.tokenExpiry);

        // Check if current token is valid
        if (this.token && this.tokenExpiry && Date.now() < parseInt(this.tokenExpiry)) {
            console.debug('[KINDNESS-CLIENT] using existing token from sessionStorage');
            return this.token;
        }

        // Request new token (include postId to satisfy server requirement)
        try {
            // Use query parameter fallback to avoid issues with empty request bodies
            console.log('[KINDNESS-CLIENT] POST /api/kindness/token via query param post_id=', postId);
            const response = await fetch(`/api/kindness/token?post_id=${encodeURIComponent(postId)}`, {
                method: 'POST'
            });
            if (!response.ok) {
                const bodyText = await response.text().catch(() => '<no body>');
                console.error('[KINDNESS-CLIENT] token endpoint returned', response.status, bodyText);
                throw new Error('Token request failed');
            }
            const data = await response.json();
            this.token = data.token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            sessionStorage.setItem('kindness_token', this.token);
            sessionStorage.setItem('kindness_token_expiry', this.tokenExpiry);
            console.log('[KINDNESS-CLIENT] received token, expiry=', this.tokenExpiry);
            return this.token;
        } catch (err) {
            console.error('Failed to get kindness token:', err);
            return null;
        }
    }
    
    /**
     * Optimistic kindness award logic:
     * - Immediately increments badge and animates for fast feedback
     * - Disables button to prevent double-award
     * - On API success: updates badge, broadcasts to other tabs, shows success toast
     * - On error: reverts badge, re-enables button, refocuses for accessibility, shows error toast
     */
    async awardKindness(postId, buttonElement) {
        // Optimistic UI: increment count, animate, disable button
        const countElement = document.querySelector(`[data-kindness-count="${postId}"]`);
        let originalCount = 0;
        if (countElement) {
            const text = (countElement.textContent || '').trim();
            const match = text.match(/(\d+)/);
            originalCount = match ? parseInt(match[1], 10) : 0;
            // Update ARIA live region for screen readers with optimistic announcement
            const liveRegion = document.getElementById('kindness-live');
            if (liveRegion) liveRegion.textContent = `Kindness Given for post ${postId}. New count ${originalCount + 1}`;
            countElement.textContent = `🌈 ${originalCount + 1}`;
            countElement.classList.add('bump');
            setTimeout(() => countElement.classList.remove('bump'), 350);
        }
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.setAttribute('aria-pressed', 'true');
        }
        
        let token;
        try {
            token = await this.ensureToken(postId);
        } catch {
            this.showToast('Unable to get kindness token', 'error');
            if (countElement) countElement.textContent = `🌈 ${originalCount}`;
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.setAttribute('aria-pressed', 'false');
            }
            return;
        }
        
        if (!token) {
            this.showToast('Unable to get kindness token', 'error');
            if (countElement) countElement.textContent = `🌈 ${originalCount}`;
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.setAttribute('aria-pressed', 'false');
            }
            return;
        }
        
        try {
            const response = await fetch(`/api/kindness/redeem?post_id=${encodeURIComponent(postId)}&token=${encodeURIComponent(token)}`, {
                method: 'POST'
            });
            const data = await response.json();
            if (response.ok && data.success) {
                this.updateKindnessDisplay(postId, data.new_points);
                // Broadcast to other open tabs/windows via localStorage
                this.broadcastKindnessUpdate(postId, data.new_points);
                
                if (buttonElement) {
                    buttonElement.disabled = true;
                    buttonElement.setAttribute('aria-pressed', 'true');
                }
                sessionStorage.removeItem('kindness_token');
                sessionStorage.removeItem('kindness_token_expiry');
                this.token = null;
                this.showToast('Kindness Given!', 'success');
            } else {
                this.showToast(data.error || 'Failed to award kindness', 'error');
                if (countElement) countElement.textContent = `🌈 ${originalCount}`;
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.setAttribute('aria-pressed', 'false');
                    // Accessibility: refocus button on error for keyboard users
                    if (typeof buttonElement.focus === 'function') buttonElement.focus();
                }
            }
        } catch (error) {
            console.error('Failed to award kindness:', error);
            this.showToast('Network error', 'error');
            if (countElement) countElement.textContent = `🌈 ${originalCount}`;
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.setAttribute('aria-pressed', 'false');
            }
        }
    }

    /**
     * Broadcast kindness update to other tabs
     */
    broadcastKindnessUpdate(postId, newPoints) {
        try {
            const payload = { post_id: postId, new_points: newPoints, ts: Date.now() };
            try {
                localStorage.setItem('jeet_kindness_update', JSON.stringify(payload));
                if (this._bc) {
                    this._bc.postMessage(payload);
                }
                setTimeout(() => {
                    try {
                        localStorage.removeItem('jeet_kindness_update');
                    } catch (remErr) {
                        console.debug('[KINDNESS-CLIENT] error removing kindness broadcast key:', remErr);
                    }
                }, 200);
            } catch (err) {
                console.debug('[KINDNESS-CLIENT] unable to write kindness broadcast to localStorage:', err);
            }
        } catch (err) {
            console.debug('[KINDNESS-CLIENT] unable to write kindness broadcast to localStorage:', err);
        }
    }

    /**
     * Update kindness display for a post
     */
    updateKindnessDisplay(postId, newCount) {
        const countElement = document.querySelector(`[data-kindness-count="${postId}"]`);
        if (countElement) {
            // Coerce to explicit numeric value and avoid 'undefined' or non-numeric strings
            const displayKp = Number.isFinite(Number(newCount)) ? Number(newCount) : 0;
            // Keep display format consistent with initial render: emoji + number
            countElement.textContent = `🌈 ${displayKp}`;
            // Announce change to offscreen live region for screen readers
            try {
                const liveRegion = document.getElementById('kindness-live');
                if (liveRegion) {
                    liveRegion.textContent = `Kindness count for post ${postId} is now ${displayKp}`;
                }
             } catch {
                 console.debug('[KINDNESS-CLIENT] updateKindnessDisplay aria announcement failed');
             }
        }
    }

    /**
     * Show toast notification (will be replaced with proper ToastManager later)
     */
    showToast(message, type = 'info') {
        // Fallback toast implementation
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`Toast (${type}): ${message}`);
        }
    }

    /**
     * Get current token status
     */
    getTokenStatus() {
        return {
            hasToken: !!this.token,
            expiry: this.tokenExpiry,
            isValid: this.token && this.tokenExpiry && Date.now() < parseInt(this.tokenExpiry)
        };
    }

    /**
     * Clear all token data
     */
    clearTokens() {
        this.token = null;
        this.tokenExpiry = null;
        try {
            sessionStorage.removeItem('kindness_token');
            sessionStorage.removeItem('kindness_token_expiry');
        } catch (err) {
            console.debug('[KINDNESS-CLIENT] error clearing sessionStorage:', err);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KindnessManager;
} else {
    window.KindnessManager = KindnessManager;
}