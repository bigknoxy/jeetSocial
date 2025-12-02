/**
 * Authentication module for jeetSocial Admin Portal
 * 
 * Handles secure login, JWT token management, MFA verification,
 * CSRF protection, and session management with privacy-first approach.
 */

class AdminAuth {
    constructor() {
        this.apiBase = '/admin';
        this.form = document.getElementById('loginForm');
        this.loginBtn = document.getElementById('loginBtn');
        this.errorContainer = document.getElementById('errorContainer');
        this.successContainer = document.getElementById('successContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // CRITICAL FIX: Ensure overlay is hidden on initialization
        this.forceHideOverlay();
        
        this.init();
    }

    init() {
        // Form submission handler
        this.form.addEventListener('submit', this.handleLogin.bind(this));
        
        // Input validation handlers
        const adminIdInput = document.getElementById('adminId');
        const passwordInput = document.getElementById('password');
        const mfaCodeInput = document.getElementById('mfaCode');
        
        // Real-time validation
        adminIdInput.addEventListener('input', this.validateAdminId.bind(this));
        passwordInput.addEventListener('input', this.validatePassword.bind(this));
        mfaCodeInput.addEventListener('input', this.validateMfaCode.bind(this));
        
        // Clear sensitive data on paste
        passwordInput.addEventListener('paste', this.handleSensitivePaste.bind(this));
        mfaCodeInput.addEventListener('paste', this.handleSensitivePaste.bind(this));
        
        // Check for existing session
        this.checkExistingSession();
        
        // Setup CSRF token fetch
        this.fetchCsrfToken();
    }

    async handleLogin(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            this.showError('Please correct the errors below');
            return;
        }

        this.setLoading(true);
        this.hideMessages();

        try {
            const formData = new FormData(this.form);
            const loginData = {
                admin_id: formData.get('admin_id'),
                password: formData.get('password'),
                mfa_code: formData.get('mfa_code')
            };

            const response = await this.makeRequest('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': window.csrfToken || ''
                },
                body: JSON.stringify(loginData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Login failed');
            }

            const result = await response.json();
            
            // Store tokens securely
            this.storeTokens(result);
            
            // Show success message
            this.showSuccess('Login successful! Redirecting...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/admin/';
            }, 1500);

        } catch (error) {
            this.showError(error.message || 'Login failed');
        } finally {
            // Always ensure loading state is cleared
            this.setLoading(false);
        }
    }

    validateForm() {
        const adminId = document.getElementById('adminId').value.trim();
        const password = document.getElementById('password').value;
        const mfaCode = document.getElementById('mfaCode').value.trim();

        let isValid = true;

        // Validate Admin ID
        if (!adminId) {
            this.setFieldError('adminId', 'Admin ID is required');
            isValid = false;
        } else if (!/^[a-zA-Z0-9_-]+$/.test(adminId)) {
            this.setFieldError('adminId', 'Invalid format');
            isValid = false;
        } else {
            this.clearFieldError('adminId');
        }

        // Validate Password
        if (!password) {
            this.setFieldError('password', 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            this.setFieldError('password', 'Password must be at least 8 characters');
            isValid = false;
        } else {
            this.clearFieldError('password');
        }

        // Validate MFA Code
        if (!mfaCode) {
            this.setFieldError('mfaCode', 'MFA code is required');
            isValid = false;
        } else if (!/^[0-9]{6}$/.test(mfaCode)) {
            this.setFieldError('mfaCode', 'MFA code must be 6 digits');
            isValid = false;
        } else {
            this.clearFieldError('mfaCode');
        }

        return isValid;
    }

    validateAdminId(event) {
        const input = event.target;
        const value = input.value.trim();
        
        if (!value) {
            this.setFieldError('adminId', 'Admin ID is required');
        } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            this.setFieldError('adminId', 'Only letters, numbers, underscores, and hyphens allowed');
        } else {
            this.clearFieldError('adminId');
        }
    }

    validatePassword(event) {
        const input = event.target;
        const value = input.value;
        
        if (!value) {
            this.setFieldError('password', 'Password is required');
        } else if (value.length < 8) {
            this.setFieldError('password', 'Password must be at least 8 characters');
        } else {
            this.clearFieldError('password');
        }
    }

    validateMfaCode(event) {
        const input = event.target;
        const value = input.value.trim();
        
        if (!value) {
            this.setFieldError('mfaCode', 'MFA code is required');
        } else if (!/^[0-9]{6}$/.test(value)) {
            this.setFieldError('mfaCode', 'MFA code must be 6 digits');
        } else {
            this.clearFieldError('mfaCode');
        }
    }

    handleSensitivePaste(event) {
        event.preventDefault();
        this.showError('Pasting sensitive data is not allowed');
    }

    setFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const helpElement = document.getElementById(fieldId + 'Help');
        
        field.classList.add('error');
        helpElement.textContent = message;
        helpElement.classList.add('error');
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const helpElement = document.getElementById(fieldId + 'Help');
        
        field.classList.remove('error');
        helpElement.textContent = this.getDefaultHelp(fieldId);
        helpElement.classList.remove('error');
    }

    getDefaultHelp(fieldId) {
        const helpTexts = {
            'adminId': 'Enter your admin identifier',
            'password': 'Enter your admin password',
            'mfaCode': 'Enter your 6-digit authenticator code'
        };
        return helpTexts[fieldId] || '';
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.loginBtn.disabled = true;
            this.loginBtn.classList.add('loading');
            this.loadingOverlay.hidden = false;
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.classList.remove('loading');
            this.loadingOverlay.hidden = true;
        }
    }

    showError(message) {
        this.hideMessages();
        this.errorContainer.querySelector('#errorMessage').textContent = message;
        this.errorContainer.hidden = false;
        
        // Auto-hide after 10 seconds
        setTimeout(() => this.hideMessages(), 10000);
        
        // Focus to first error field
        const firstErrorField = this.form.querySelector('.error');
        if (firstErrorField) {
            firstErrorField.focus();
        }
    }

    showSuccess(message) {
        this.hideMessages();
        this.successContainer.querySelector('#successMessage').textContent = message;
        this.successContainer.hidden = false;
    }

    hideMessages() {
        this.errorContainer.hidden = true;
        this.successContainer.hidden = true;
    }

    async fetchCsrfToken() {
        try {
            const response = await this.makeRequest('/csrf-token', {
                method: 'GET'
            });
            
            if (response.ok) {
                const data = await response.json();
                window.csrfToken = data.csrf_token;
            }
        } catch (error) {
            console.warn('Could not fetch CSRF token:', error);
        }
    }

    storeTokens(tokenData) {
        // Tokens are stored as HttpOnly cookies by the server
        // We just need to store the CSRF token in memory for AJAX requests
        if (tokenData.csrf_token) {
            window.csrfToken = tokenData.csrf_token;
        }
    }

    async checkExistingSession() {
        try {
            const response = await this.makeRequest('/session-check', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    this.showSuccess('Already authenticated! Redirecting...');
                    setTimeout(() => {
                        window.location.href = '/admin/';
                    }, 1500);
                }
            }
        } catch (error) {
            // Session check failed, continue with login form
            console.warn('Session check failed:', error);
        }
    }

    async makeRequest(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        return fetch(this.apiBase + url, finalOptions);
    }

    // CRITICAL FIX: Force hide loading overlay with multiple methods
    forceHideOverlay() {
        if (this.loadingOverlay) {
            // Method 1: Set hidden attribute
            this.loadingOverlay.setAttribute('hidden', '');
            
            // Method 2: Direct style manipulation
            this.loadingOverlay.style.display = 'none';
            this.loadingOverlay.style.visibility = 'hidden';
            this.loadingOverlay.style.opacity = '0';
            this.loadingOverlay.style.pointerEvents = 'none';
            
            // Method 3: Add class for CSS targeting
            this.loadingOverlay.classList.add('force-hidden');
            
            // Method 4: Remove from DOM temporarily and re-add (last resort)
            setTimeout(() => {
                if (this.loadingOverlay && this.loadingOverlay.style.display !== 'none') {
                    const parent = this.loadingOverlay.parentNode;
                    if (parent) {
                        const nextSibling = this.loadingOverlay.nextSibling;
                        parent.removeChild(this.loadingOverlay);
                        setTimeout(() => {
                            parent.insertBefore(this.loadingOverlay, nextSibling);
                            this.loadingOverlay.setAttribute('hidden', '');
                            this.loadingOverlay.style.display = 'none';
                        }, 0);
                    }
                }
            }, 100);
            
            console.log('Loading overlay force-hidden with multiple methods');
        }
    }

    // Security: Clear sensitive data from memory
    clearSensitiveData() {
        document.getElementById('password').value = '';
        document.getElementById('mfaCode').value = '';
        this.form.reset();
    }

    // Security: Handle visibility change (tab switching)
    handleVisibilityChange() {
        if (document.hidden) {
            // Clear sensitive fields when tab is not visible
            this.clearSensitiveData();
        }
    }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL FIX: Force hide loading overlay immediately
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.setAttribute('hidden', '');
        loadingOverlay.style.display = 'none';
        loadingOverlay.style.visibility = 'hidden';
        loadingOverlay.style.opacity = '0';
        console.log('Loading overlay force-hidden on page load');
    }
    
    new AdminAuth();
    
    // Security: Handle visibility changes
    document.addEventListener('visibilitychange', () => {
        if (window.adminAuth) {
            window.adminAuth.handleVisibilityChange();
        }
    });
    
    // Security: Clear console logs in production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log = () => {};
        console.error = () => {};
        console.warn = () => {};
    }
});

// Security: Prevent right-click on sensitive fields
document.addEventListener('contextmenu', (e) => {
    if (e.target && (e.target.type === 'password' || e.target.type === 'text' && 
        (e.target.id === 'password' || e.target.id === 'mfaCode'))) {
        e.preventDefault();
    }
});

// Security: Prevent text selection in password fields
document.addEventListener('selectstart', (e) => {
    if (e.target && e.target.type === 'password') {
        e.preventDefault();
    }
});