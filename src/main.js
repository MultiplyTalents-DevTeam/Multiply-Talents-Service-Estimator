/**
 * MAIN MODULE - Orchestration
 * Initializes everything and ties all modules together
 */

class ServiceEstimatorApp {
    constructor() {
        // Initialize modules - Assumes these are global instances from your other files
        this.state = estimatorState;
        this.ui = uiHandler;
        this.calculator = calculator;
        this.ghl = ghlIntegration;
        
        // App state
        this.isInitialized = false;
        this.eventHandlers = new Map();
        this.lastStep = null;
        this.lastServices = [];
        
        // GHL-specific setup
        this.setupGHLCompatibility();
    }

    // ==================== INITIALIZATION ====================
    async init() {
        if (this.isInitialized) {
            console.warn('Estimator already initialized');
            return;
        }

        console.log('Initializing Service Estimator...');
        
        try {
            // 1. Wait for DOM/GHL to be ready
            await this.waitForGHLDom();
            
            // 2. Initial Cache (GHL specific)
            if (this.ui.cacheElements) {
                this.ui.cacheElements();
            }
            
            // 3. Set up state observers (UI reacts when data changes)
            this.setupStateObservers();
            
            // 4. Set up event listeners (User clicks)
            this.setupEventListeners();
            
            // 5. Initial UI render & Step visibility
            if (this.ui.updateUI) this.ui.updateUI();
            if (this.ui.showStep) this.ui.showStep(this.state.currentStep || 'services');
            
            // 6. Mark as initialized
            this.isInitialized = true;
            
            // 7. Retry any failed GHL submissions
            if (this.ghl && this.ghl.retryFailedSubmissions) {
                this.ghl.retryFailedSubmissions().then(count => {
                    if (count > 0) console.log(`Retried ${count} failed submissions`);
                });
            }
            
            console.log('Service Estimator initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize estimator:', error);
            this.showErrorScreen(error);
        }
    }

    // ==================== GHL COMPATIBILITY ====================
    setupGHLCompatibility() {
        if (typeof MutationObserver !== 'undefined') {
            this.observer = new MutationObserver((mutations) => {
                // If GHL swaps out DOM elements, we re-cache our references
                const shouldRecache = mutations.some(m => m.addedNodes.length > 0);
                if (shouldRecache && this.ui.cacheElements) {
                    this.ui.cacheElements();
                }
            });
            this.observer.observe(document.body, { childList: true, subtree: true });
        }
        
        window.__MT_ESTIMATOR = {
            version: '2.0.0',
            modules: {
                state: this.state,
                ui: this.ui,
                calculator: this.calculator,
                ghl: this.ghl
            }
        };
    }

    async waitForGHLDom() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    // ==================== STATE OBSERVERS ====================
    setupStateObservers() {
        // Subscribe UI to state changes
        this.state.subscribe(() => {
            if (this.ui.updateUI) this.ui.updateUI();
        });
        
        // Subscribe to analytics
        this.state.subscribe((state) => {
            this.trackAnalytics(state);
        });
    }

    // ==================== EVENT HANDLING ====================
    setupEventListeners() {
        // Use Delegation for dynamic items (Cards/Tabs)
        this.delegateClick('.service-card', (event, element) => {
            const serviceId = element.dataset.serviceId;
            if (serviceId) this.state.toggleService(serviceId);
        });
        
        this.delegateClick('[data-industry-id]', (event, element) => {
            const industryId = element.dataset.industryId;
            this.state.update({ 
                commonConfig: { ...this.state.commonConfig, industry: industryId } 
            });
        });
        
        this.delegateClick('[data-scale-id]', (event, element) => {
            const scaleId = element.dataset.scaleId;
            this.state.update({ 
                commonConfig: { ...this.state.commonConfig, scale: scaleId } 
            });
        });
        
        this.delegateClick('.service-tab', (event, element) => {
            const serviceId = element.dataset.serviceId;
            if (serviceId && this.ui.activateTab) this.ui.activateTab(serviceId);
        });
        
        this.setupNavigationListeners();
        this.setupFormListeners();
    }

    setupNavigationListeners() {
        // Navigation Mapping
        const navMap = [
            { id: '#services-continue', next: 'scope', validate: () => this.state.selectedServices.length > 0, msg: 'Please select at least one service.' },
            { id: '#scope-continue', next: 'details', validate: () => this.state.validateStep('scope'), msg: 'Please select industry and business scale.' },
            { id: '#details-continue', next: 'review', validate: () => this.state.validateStep('details'), msg: 'Please configure all services.' },
            { id: '#review-continue', next: 'contact' }
        ];

        navMap.forEach(nav => {
            this.onClick(nav.id, () => {
                if (!nav.validate || nav.validate()) {
                    this.state.update({ currentStep: nav.next });
                    if (this.ui.showStep) this.ui.showStep(nav.next);
                } else {
                    alert(nav.msg);
                }
            });
        });

        // Back buttons
        const backMap = { '#scope-back': 'services', '#details-back': 'scope', '#review-back': 'details', '#contact-back': 'review' };
        Object.entries(backMap).forEach(([id, prev]) => {
            this.onClick(id, () => {
                this.state.update({ currentStep: prev });
                if (this.ui.showStep) this.ui.showStep(prev);
            });
        });
    }

    setupFormListeners() {
        this.onClick('#video-option', () => {
            const currentWantsVideo = this.state.preferences.wantsVideo;
            this.state.update({
                preferences: { ...this.state.preferences, wantsVideo: !currentWantsVideo }
            });
            const checkbox = document.getElementById('video-checkbox');
            if (checkbox) checkbox.classList.toggle('checked', !currentWantsVideo);
        });
        
        const quoteForm = document.getElementById('quote-form');
        if (quoteForm) {
            quoteForm.addEventListener('submit', (e) => this.handleQuoteSubmission(e));
        }
    }

    // ==================== QUOTE SUBMISSION ====================
    async handleQuoteSubmission(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        
        const contactData = {
            firstName: formData.get('firstName') || '',
            lastName: formData.get('lastName') || '',
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            company: formData.get('company') || '',
            projectDescription: formData.get('projectDescription') || ''
        };
        
        // Validate with GHL module
        const errors = this.ghl.validateContactData(contactData);
        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }
        
        const quoteData = this.calculator.calculateTotalQuote(this.state);
        
        // Safety guard for loading UI
        if (this.ui && typeof this.ui.showLoading === 'function') {
            this.ui.showLoading(true);
        }
        
        try {
            const result = await this.ghl.submitQuote(contactData, quoteData, this.state);
            if (result.success) {
                this.showSuccessScreen();
                setTimeout(() => this.state.reset(), 3000);
            } else {
                throw new Error(result.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Quote submission error:', error);
            this.showErrorScreen(error);
        } finally {
            if (this.ui && typeof this.ui.showLoading === 'function') {
                this.ui.showLoading(false);
            }
        }
    }

    // ==================== UI UPDATES ====================
    showSuccessScreen() {
        const contactBody = document.querySelector('#step-contact .step-body');
        if (!contactBody) return;
        
        contactBody.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <div style="width: 5rem; height: 5rem; border-radius: 9999px; background: var(--accent-gold); 
                     display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; 
                     font-size: 2rem; color: var(--accent-primary); box-shadow: var(--shadow-glow);">✓</div>
                <h2 style="font-size: 2rem; font-weight: 900; margin-bottom: .75rem; color: var(--accent-primary);">Thank You!</h2>
                <p style="color: var(--text-secondary); max-width: 32rem; margin: 0 auto; font-size: 1.125rem;">
                    Your quote request has been submitted successfully. Our team will reach out within 24 hours.
                </p>
                ${this.state.preferences.wantsVideo ? `
                    <div style="margin-top: 2rem; padding: 1rem; background: rgba(212, 175, 55, 0.1); 
                         border-radius: 8px; border-left: 3px solid var(--accent-gold);">
                        <p>🎬 A personalized video walkthrough will be sent to your email soon!</p>
                    </div>` : ''}
            </div>`;
    }

    showErrorScreen(error) {
        const contactBody = document.querySelector('#step-contact .step-body');
        if (!contactBody) return;
        contactBody.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <h2>Something Went Wrong</h2>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
            </div>`;
    }

    // ==================== ANALYTICS ====================
    trackAnalytics(state) {
        if (this.lastStep !== state.currentStep) {
            this.lastStep = state.currentStep;
            if (typeof gtag !== 'undefined') {
                gtag('event', 'step_change', { step: state.currentStep });
            }
        }
        if (JSON.stringify(this.lastServices) !== JSON.stringify(state.selectedServices)) {
            this.lastServices = [...state.selectedServices];
        }
    }

    // ==================== HELPERS ====================
    delegateClick(selector, handler) {
        document.addEventListener('click', (event) => {
            const element = event.target.closest(selector);
            if (element) handler(event, element);
        });
    }

    onClick(selector, handler) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener('click', handler);
            this.eventHandlers.set(selector, handler);
        }
    }

    getState() { return this.state.getSnapshot(); }
    reset() { this.state.reset(); }
}

// ==================== RUN ====================
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.DEBUG_MODE = true;
    }
    
    window.serviceEstimator = new ServiceEstimatorApp();
    window.serviceEstimator.init().catch(err => console.error(err));
    
    window.resetEstimator = () => window.serviceEstimator.reset();
});