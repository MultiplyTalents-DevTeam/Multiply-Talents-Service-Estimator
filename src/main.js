/**
 * MAIN MODULE - Orchestration
 * Initializes everything and ties all modules together
 */

class ServiceEstimatorApp {
    constructor() {
        // Initialize modules
        this.state = estimatorState;
        this.ui = uiHandler;
        this.calculator = calculator;
        this.ghl = ghlIntegration;
        
        // App state
        this.isInitialized = false;
        this.eventHandlers = new Map();
        
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
            // 1. Wait for GHL DOM to be ready
            await this.waitForGHLDom();
            
            // 2. Set up state observers
            this.setupStateObservers();
            
            // 3. Set up event listeners
            this.setupEventListeners();
            
            // 4. Initial UI render
            this.ui.updateUI();
            
            // 5. Show current step
            this.ui.showStep(this.state.currentStep);
            
            // 6. Mark as initialized
            this.isInitialized = true;
            
            // 7. Retry any failed GHL submissions
            this.ghl.retryFailedSubmissions().then(count => {
                if (count > 0) {
                    console.log(`Retried ${count} failed submissions`);
                }
            });
            
            console.log('Service Estimator initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize estimator:', error);
            this.showErrorScreen(error);
        }
    }

    // ==================== GHL COMPATIBILITY ====================
    setupGHLCompatibility() {
        // Use MutationObserver to handle GHL's dynamic DOM
        if (typeof MutationObserver !== 'undefined') {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        // Re-cache elements if DOM changes
                        this.ui.cacheElements();
                    }
                });
            });
        }
        
        // Use unique namespace to avoid conflicts
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
            this.ui.updateUI();
        });
        
        // Subscribe to specific state changes for analytics
        this.state.subscribe((state) => {
            this.trackAnalytics(state);
        });
    }

    // ==================== EVENT HANDLING ====================
    setupEventListeners() {
        // Service selection
        this.delegateClick('.service-card', (event, element) => {
            const serviceId = element.dataset.serviceId;
            if (serviceId) {
                this.state.toggleService(serviceId);
            }
        });
        
        // Industry selection
        this.delegateClick('[data-industry-id]', (event, element) => {
            const industryId = element.dataset.industryId;
            this.state.update({ 
                commonConfig: { 
                    ...this.state.commonConfig, 
                    industry: industryId 
                } 
            });
        });
        
        // Scale selection
        this.delegateClick('[data-scale-id]', (event, element) => {
            const scaleId = element.dataset.scaleId;
            this.state.update({ 
                commonConfig: { 
                    ...this.state.commonConfig, 
                    scale: scaleId 
                } 
            });
        });
        
        // Service tabs
        this.delegateClick('.service-tab', (event, element) => {
            const serviceId = element.dataset.serviceId;
            if (serviceId) {
                this.ui.activateTab(serviceId);
            }
        });
        
        // Navigation buttons
        this.setupNavigationListeners();
        
        // Form submission
        this.setupFormListeners();
    }

    setupNavigationListeners() {
        // Services → Scope
        this.onClick('#services-continue', () => {
            if (this.state.selectedServices.length > 0) {
                this.state.update({ currentStep: 'scope' });
                this.ui.showStep('scope');
            }
        });
        
        // Scope → Details
        this.onClick('#scope-continue', () => {
            if (this.state.validateStep('scope')) {
                this.state.update({ currentStep: 'details' });
                this.ui.showStep('details');
            } else {
                alert('Please select both industry and business scale to continue.');
            }
        });
        
        // Details → Review
        this.onClick('#details-continue', () => {
            if (this.state.validateStep('details')) {
                this.state.update({ currentStep: 'review' });
                this.ui.showStep('review');
            } else {
                alert('Please configure all services before continuing.');
            }
        });
        
        // Review → Contact
        this.onClick('#review-continue', () => {
            this.state.update({ currentStep: 'contact' });
            this.ui.showStep('contact');
        });
        
        // Back buttons
        this.onClick('#scope-back', () => {
            this.state.update({ currentStep: 'services' });
            this.ui.showStep('services');
        });
        
        this.onClick('#details-back', () => {
            this.state.update({ currentStep: 'scope' });
            this.ui.showStep('scope');
        });
        
        this.onClick('#review-back', () => {
            this.state.update({ currentStep: 'details' });
            this.ui.showStep('details');
        });
        
        this.onClick('#contact-back', () => {
            this.state.update({ currentStep: 'review' });
            this.ui.showStep('review');
        });
    }

    setupFormListeners() {
        // Video option toggle
        this.onClick('#video-option', () => {
            this.state.update({
                preferences: {
                    ...this.state.preferences,
                    wantsVideo: !this.state.preferences.wantsVideo
                }
            });
            
            // Update checkbox UI
            const checkbox = document.getElementById('video-checkbox');
            if (checkbox) {
                checkbox.classList.toggle('checked', this.state.preferences.wantsVideo);
            }
        });
        
        // Quote form submission
        const quoteForm = document.getElementById('quote-form');
        if (quoteForm) {
            quoteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleQuoteSubmission(e);
            });
        }
    }

    // ==================== QUOTE SUBMISSION ====================
    async handleQuoteSubmission(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        // Extract contact data
        const contactData = {
            firstName: formData.get('firstName') || '',
            lastName: formData.get('lastName') || '',
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            company: formData.get('company') || '',
            projectDescription: formData.get('projectDescription') || ''
        };
        
        // Validate
        const errors = this.ghl.validateContactData(contactData);
        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }
        
        // Calculate quote
        const quoteData = this.calculator.calculateTotalQuote(this.state);
        
        // Show loading
        this.ui.showLoading(true);
        
        try {
            // Submit to GHL
            const result = await this.ghl.submitQuote(contactData, quoteData, this.state);
            
            if (result.success) {
                // Show success
                this.showSuccessScreen();
                
                // Reset state after successful submission
                setTimeout(() => {
                    this.state.reset();
                }, 3000);
            } else {
                throw new Error(result.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Quote submission error:', error);
            this.showErrorScreen(error);
        } finally {
            this.ui.showLoading(false);
        }
    }

    // ==================== UI UPDATES ====================
    showSuccessScreen() {
        const contactBody = document.querySelector('#step-contact .step-body');
        if (contactBody) {
            contactBody.innerHTML = `
                <div style="padding: 3rem; text-align: center;">
                    <div style="width: 5rem; height: 5rem; border-radius: 9999px; background: var(--accent-gold); 
                         display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; 
                         font-size: 2rem; color: var(--accent-primary); box-shadow: var(--shadow-glow); 
                         animation: pulse 2s ease-in-out infinite;">✓</div>
                    <h2 style="font-size: 2rem; font-weight: 900; margin-bottom: .75rem; color: var(--accent-primary);">
                        Thank You!
                    </h2>
                    <p style="color: var(--text-secondary); max-width: 32rem; margin: 0 auto; font-size: 1.125rem; line-height: 1.6;">
                        Your quote request has been submitted successfully. Our team will review your requirements 
                        and reach out within 24 hours.
                    </p>
                    ${this.state.preferences.wantsVideo ? `
                        <div style="margin-top: 2rem; padding: 1rem; background: var(--accent-gold-light); 
                             border-radius: var(--radius-md); border-left: 3px solid var(--accent-gold);">
                            <p style="color: var(--text-primary); font-weight: 600;">
                                🎬 A personalized video walkthrough will be sent to your email within 2 hours.
                            </p>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    showErrorScreen(error) {
        const contactBody = document.querySelector('#step-contact .step-body');
        if (contactBody) {
            contactBody.innerHTML = `
                <div style="padding: 3rem; text-align: center;">
                    <div style="width: 5rem; height: 5rem; border-radius: 9999px; background: #ef4444; 
                         display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; 
                         font-size: 2rem; color: white;">!</div>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: .75rem; color: var(--text-primary);">
                        Something Went Wrong
                    </h2>
                    <p style="color: var(--text-secondary); max-width: 32rem; margin: 0 auto; font-size: 1rem; line-height: 1.6;">
                        We couldn't submit your quote request, but don't worry - your information has been saved.
                    </p>
                    <div style="margin-top: 2rem;">
                        <button class="btn btn-primary" onclick="location.reload()">
                            Try Again
                        </button>
                        <button class="btn btn-ghost" onclick="window.__MT_ESTIMATOR.modules.state.reset()">
                            Start Over
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // ==================== ANALYTICS ====================
    trackAnalytics(state) {
        // Track step changes
        if (this.lastStep !== state.currentStep) {
            console.log(`Step changed: ${this.lastStep} → ${state.currentStep}`);
            this.lastStep = state.currentStep;
            
            // Send to analytics (Google Analytics, etc.)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'step_change', {
                    step: state.currentStep,
                    step_number: CONFIG.STEPS.findIndex(s => s.id === state.currentStep) + 1
                });
            }
        }
        
        // Track service selections
        if (JSON.stringify(this.lastServices) !== JSON.stringify(state.selectedServices)) {
            console.log('Services updated:', state.selectedServices);
            this.lastServices = [...state.selectedServices];
        }
    }

    // ==================== EVENT DELEGATION ====================
    delegateClick(selector, handler) {
        document.addEventListener('click', (event) => {
            const element = event.target.closest(selector);
            if (element) {
                handler(event, element);
            }
        });
    }

    onClick(selector, handler) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener('click', handler);
            this.eventHandlers.set(selector, handler);
        }
    }

    // ==================== PUBLIC API ====================
    getState() {
        return this.state.getSnapshot();
    }

    reset() {
        this.state.reset();
    }

    goToStep(stepId) {
        if (CONFIG.STEPS.some(s => s.id === stepId)) {
            this.state.update({ currentStep: stepId });
            this.ui.showStep(stepId);
            return true;
        }
        return false;
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Enable debug mode in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.DEBUG_MODE = true;
        console.log('🚀 Service Estimator Debug Mode Enabled');
    }
    
    // Create and initialize the app
    window.serviceEstimator = new ServiceEstimatorApp();
    
    // Auto-initialize
    window.serviceEstimator.init().catch(error => {
        console.error('Failed to initialize estimator:', error);
    });
    
    // Make reset function globally available
    window.resetEstimator = () => {
        window.serviceEstimator.reset();
    };
    
    // Expose for debugging
    if (window.DEBUG_MODE) {
        console.log('Service Estimator loaded. Use window.serviceEstimator for debugging.');
    }
});